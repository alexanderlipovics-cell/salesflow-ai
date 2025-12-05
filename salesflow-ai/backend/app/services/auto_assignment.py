"""
Sales Flow AI - Non Plus Ultra Auto-Assignment Service

Intelligente Verkäufer-Zuweisung:
- Score-basiertes Matching
- Kapazitäts-Management
- Sprach- und Regionen-Matching
- Performance-basierte Zuweisung
- SLA Tracking

Version 1.0
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

ASSIGNMENT_CONFIG = {
    # Matching Gewichtungen
    "weights": {
        "capacity": 0.25,        # Verfügbare Kapazität
        "specialization": 0.30,  # Fachgebiet-Match
        "performance": 0.25,     # Historische Performance
        "language": 0.10,        # Sprachkenntnisse
        "region": 0.10,          # Regionen-Match
    },
    
    # SLA Settings
    "sla": {
        "hot_lead_hours": 4,     # Hot Leads: 4 Stunden
        "warm_lead_hours": 24,   # Warm Leads: 24 Stunden
        "cold_lead_hours": 72,   # Cold Leads: 72 Stunden
    },
    
    # Kapazitäts-Defaults
    "default_max_leads_per_day": 10,
    "capacity_buffer": 0.8,  # 80% Auslastung ist Maximum
    
    # Round Robin Fallback
    "use_round_robin_fallback": True,
}


# ============================================================================
# ENUMS
# ============================================================================

class AssignmentMethod(str, Enum):
    """Zuweisungsmethoden"""
    AUTO = "auto"
    MANUAL = "manual"
    ROUND_ROBIN = "round_robin"
    SCORE_BASED = "score_based"


class AssignmentStatus(str, Enum):
    """Zuweisungs-Status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    TRANSFERRED = "transferred"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class SalesRepScore:
    """Bewertung eines Sales Reps für einen Lead"""
    user_id: str
    total_score: float = 0.0
    capacity_score: float = 0.0
    specialization_score: float = 0.0
    performance_score: float = 0.0
    language_score: float = 0.0
    region_score: float = 0.0
    reasons: List[str] = field(default_factory=list)


@dataclass
class AssignmentResult:
    """Ergebnis einer Zuweisung"""
    success: bool
    lead_id: str
    assigned_to: Optional[str] = None
    assignment_id: Optional[str] = None
    method: str = AssignmentMethod.AUTO.value
    score: float = 0.0
    reasons: List[str] = field(default_factory=list)
    sla_hours: int = 24
    error: Optional[str] = None


# ============================================================================
# AUTO-ASSIGNMENT SERVICE
# ============================================================================

class AutoAssignmentService:
    """
    Non Plus Ultra Auto-Assignment Service
    
    Weist Leads automatisch dem optimalen Verkäufer zu:
    1. Kapazitäts-Check
    2. Spezialisierungs-Match
    3. Performance-Analyse
    4. Sprach-/Regionen-Match
    5. SLA-basierte Priorisierung
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.config = ASSIGNMENT_CONFIG
    
    # ========================================================================
    # MAIN ASSIGNMENT FLOW
    # ========================================================================
    
    async def assign_lead(
        self,
        lead_id: str,
        force_user_id: Optional[str] = None,
        method: AssignmentMethod = AssignmentMethod.AUTO,
    ) -> AssignmentResult:
        """
        Weist einen Lead zu.
        
        Args:
            lead_id: UUID des Leads
            force_user_id: Optional - Erzwinge Zuweisung an bestimmten User
            method: Zuweisungsmethode
            
        Returns:
            AssignmentResult mit Zuweisungsdetails
        """
        logger.info(f"Assigning lead: {lead_id}, method: {method}")
        
        result = AssignmentResult(success=False, lead_id=lead_id, method=method.value)
        
        try:
            # 1. Lead-Daten holen
            lead = await self._get_lead_with_scores(lead_id)
            if not lead:
                result.error = "Lead not found"
                return result
            
            # 2. SLA basierend auf Lead-Temperatur bestimmen
            result.sla_hours = self._determine_sla(lead)
            
            # 3. Verfügbare Sales Reps holen
            if force_user_id:
                assigned_user = force_user_id
                result.method = AssignmentMethod.MANUAL.value
                result.reasons.append(f"Manuell zugewiesen an {force_user_id}")
            else:
                # Optimalen Sales Rep finden
                best_match = await self._find_best_match(lead)
                
                if best_match:
                    assigned_user = best_match.user_id
                    result.score = best_match.total_score
                    result.reasons = best_match.reasons
                elif self.config["use_round_robin_fallback"]:
                    # Round Robin Fallback
                    assigned_user = await self._round_robin_assignment()
                    result.method = AssignmentMethod.ROUND_ROBIN.value
                    result.reasons.append("Round Robin Fallback - kein optimaler Match")
                else:
                    result.error = "Kein verfügbarer Sales Rep gefunden"
                    return result
            
            if not assigned_user:
                result.error = "Kein Sales Rep verfügbar"
                return result
            
            # 4. Zuweisung erstellen
            assignment_id = await self._create_assignment(
                lead_id=lead_id,
                user_id=assigned_user,
                method=result.method,
                score=result.score,
                reasons=result.reasons,
                sla_hours=result.sla_hours,
            )
            
            # 5. Lead aktualisieren
            await self._update_lead_assignment(lead_id, assigned_user)
            
            # 6. Sales Rep Kapazität aktualisieren
            await self._update_rep_capacity(assigned_user, increment=True)
            
            result.success = True
            result.assigned_to = assigned_user
            result.assignment_id = assignment_id
            
            logger.info(f"Lead {lead_id} assigned to {assigned_user} (score: {result.score:.2f})")
            
        except Exception as e:
            logger.exception(f"Assignment error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # LEAD DATA
    # ========================================================================
    
    async def _get_lead_with_scores(self, lead_id: str) -> Optional[Dict]:
        """Holt Lead mit allen Scores"""
        try:
            # Lead Basisdaten
            lead_result = self.db.table("leads").select("*").eq("id", lead_id).execute()
            if not lead_result.data:
                return None
            
            lead = lead_result.data[0]
            
            # Enrichment-Daten
            enrichment_result = (
                self.db.table("lead_enrichments")
                .select("company_industry, company_size_range, company_country")
                .eq("lead_id", lead_id)
                .execute()
            )
            if enrichment_result.data:
                lead["enrichment"] = enrichment_result.data[0]
            
            # Verification-Daten
            verification_result = (
                self.db.table("lead_verifications")
                .select("v_score")
                .eq("lead_id", lead_id)
                .execute()
            )
            if verification_result.data:
                lead["v_score"] = verification_result.data[0].get("v_score", 0)
            
            return lead
            
        except Exception as e:
            logger.exception(f"Error getting lead: {e}")
            return None
    
    def _determine_sla(self, lead: Dict) -> int:
        """Bestimmt SLA basierend auf Lead-Score"""
        p_score = lead.get("p_score", 50)
        
        if p_score >= 80:
            return self.config["sla"]["hot_lead_hours"]
        elif p_score >= 50:
            return self.config["sla"]["warm_lead_hours"]
        else:
            return self.config["sla"]["cold_lead_hours"]
    
    # ========================================================================
    # MATCHING ALGORITHM
    # ========================================================================
    
    async def _find_best_match(self, lead: Dict) -> Optional[SalesRepScore]:
        """Findet den optimalen Sales Rep für einen Lead"""
        
        # Verfügbare Sales Reps holen
        reps = await self._get_available_reps()
        
        if not reps:
            logger.warning("No available sales reps found")
            return None
        
        # Jeden Rep bewerten
        scores: List[SalesRepScore] = []
        
        for rep in reps:
            score = await self._calculate_rep_score(rep, lead)
            scores.append(score)
        
        # Nach Score sortieren
        scores.sort(key=lambda x: x.total_score, reverse=True)
        
        # Besten zurückgeben (falls Score > 0)
        if scores and scores[0].total_score > 0:
            return scores[0]
        
        return None
    
    async def _get_available_reps(self) -> List[Dict]:
        """Holt verfügbare Sales Reps"""
        try:
            result = (
                self.db.table("sales_rep_profiles")
                .select("*")
                .eq("is_available", True)
                .execute()
            )
            
            reps = result.data or []
            
            # Kapazitäts-Filter
            available_reps = []
            for rep in reps:
                max_leads = rep.get("max_leads_per_day", self.config["default_max_leads_per_day"])
                current = rep.get("current_lead_count", 0)
                threshold = max_leads * self.config["capacity_buffer"]
                
                if current < threshold:
                    available_reps.append(rep)
            
            return available_reps
            
        except Exception as e:
            logger.exception(f"Error getting available reps: {e}")
            return []
    
    async def _calculate_rep_score(self, rep: Dict, lead: Dict) -> SalesRepScore:
        """Berechnet Match-Score zwischen Rep und Lead"""
        score = SalesRepScore(user_id=rep.get("user_id"))
        weights = self.config["weights"]
        
        # 1. Kapazitäts-Score (0-100)
        score.capacity_score = self._calculate_capacity_score(rep)
        score.reasons.append(f"Kapazität: {score.capacity_score:.0f}%")
        
        # 2. Spezialisierungs-Score (0-100)
        score.specialization_score = self._calculate_specialization_score(rep, lead)
        if score.specialization_score > 50:
            score.reasons.append(f"Spezialisierung passt: {score.specialization_score:.0f}%")
        
        # 3. Performance-Score (0-100)
        score.performance_score = self._calculate_performance_score(rep)
        if score.performance_score > 70:
            score.reasons.append(f"Hohe Performance: {score.performance_score:.0f}%")
        
        # 4. Sprach-Score (0-100)
        score.language_score = self._calculate_language_score(rep, lead)
        
        # 5. Regionen-Score (0-100)
        score.region_score = self._calculate_region_score(rep, lead)
        if score.region_score > 80:
            score.reasons.append("Region passt")
        
        # Gewichteter Gesamtscore
        score.total_score = (
            score.capacity_score * weights["capacity"] +
            score.specialization_score * weights["specialization"] +
            score.performance_score * weights["performance"] +
            score.language_score * weights["language"] +
            score.region_score * weights["region"]
        )
        
        return score
    
    def _calculate_capacity_score(self, rep: Dict) -> float:
        """Berechnet Kapazitäts-Score"""
        max_leads = rep.get("max_leads_per_day", self.config["default_max_leads_per_day"])
        current = rep.get("current_lead_count", 0)
        
        if max_leads <= 0:
            return 0
        
        utilization = current / max_leads
        # Je weniger ausgelastet, desto besser
        return max(0, (1 - utilization) * 100)
    
    def _calculate_specialization_score(self, rep: Dict, lead: Dict) -> float:
        """Berechnet Spezialisierungs-Match"""
        score = 50  # Basis-Score
        
        specializations = rep.get("specializations", [])
        if not specializations:
            return score
        
        lead_industry = lead.get("enrichment", {}).get("company_industry", "").lower()
        lead_size = lead.get("enrichment", {}).get("company_size_range", "")
        
        for spec in specializations:
            spec_type = spec.get("type", "")
            spec_value = str(spec.get("value", "")).lower()
            exp_level = spec.get("experience_level", "intermediate")
            
            # Experience Multiplier
            exp_multiplier = {"expert": 1.5, "intermediate": 1.0, "beginner": 0.5}.get(exp_level, 1.0)
            
            if spec_type == "industry" and spec_value in lead_industry:
                score += 25 * exp_multiplier
            elif spec_type == "company_size" and spec_value == lead_size:
                score += 15 * exp_multiplier
        
        return min(100, score)
    
    def _calculate_performance_score(self, rep: Dict) -> float:
        """Berechnet Performance-Score"""
        conversion_rate = rep.get("avg_conversion_rate", 0) or 0
        response_time = rep.get("avg_response_time_hours", 24) or 24
        
        # Conversion Score (0-50)
        conversion_score = min(50, conversion_rate * 200)  # 25% Rate = 50 Punkte
        
        # Response Time Score (0-50)
        # < 1h = 50, < 4h = 40, < 12h = 30, < 24h = 20, sonst 10
        if response_time < 1:
            time_score = 50
        elif response_time < 4:
            time_score = 40
        elif response_time < 12:
            time_score = 30
        elif response_time < 24:
            time_score = 20
        else:
            time_score = 10
        
        return conversion_score + time_score
    
    def _calculate_language_score(self, rep: Dict, lead: Dict) -> float:
        """Berechnet Sprach-Match"""
        rep_languages = rep.get("languages", ["de"])
        
        # Lead-Sprache aus Land ableiten
        lead_country = lead.get("enrichment", {}).get("company_country", "Germany")
        
        country_language_map = {
            "Germany": "de",
            "Deutschland": "de",
            "Austria": "de",
            "Österreich": "de",
            "Switzerland": "de",
            "Schweiz": "de",
            "USA": "en",
            "United States": "en",
            "UK": "en",
            "United Kingdom": "en",
            "France": "fr",
            "Frankreich": "fr",
        }
        
        required_language = country_language_map.get(lead_country, "de")
        
        if required_language in rep_languages:
            return 100
        elif "en" in rep_languages:  # Englisch als Fallback
            return 60
        
        return 20
    
    def _calculate_region_score(self, rep: Dict, lead: Dict) -> float:
        """Berechnet Regionen-Match"""
        rep_regions = rep.get("regions", ["DACH"])
        lead_country = lead.get("enrichment", {}).get("company_country", "Germany")
        
        # Region-Mapping
        country_region_map = {
            "Germany": "DACH",
            "Deutschland": "DACH",
            "Austria": "DACH",
            "Österreich": "DACH",
            "Switzerland": "DACH",
            "Schweiz": "DACH",
            "USA": "NA",
            "United States": "NA",
            "Canada": "NA",
            "UK": "UK",
            "United Kingdom": "UK",
            "France": "EU",
            "Italy": "EU",
            "Spain": "EU",
            "Netherlands": "EU",
        }
        
        lead_region = country_region_map.get(lead_country, "EU")
        
        if lead_region in rep_regions:
            return 100
        elif "GLOBAL" in rep_regions:
            return 80
        
        return 30
    
    # ========================================================================
    # ROUND ROBIN
    # ========================================================================
    
    async def _round_robin_assignment(self) -> Optional[str]:
        """Round Robin Zuweisung als Fallback"""
        try:
            # Rep mit wenigsten aktuellen Leads
            result = (
                self.db.table("sales_rep_profiles")
                .select("user_id, current_lead_count")
                .eq("is_available", True)
                .order("current_lead_count")
                .limit(1)
                .execute()
            )
            
            if result.data:
                return result.data[0]["user_id"]
                
        except Exception as e:
            logger.exception(f"Round robin error: {e}")
        
        return None
    
    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================
    
    async def _create_assignment(
        self,
        lead_id: str,
        user_id: str,
        method: str,
        score: float,
        reasons: List[str],
        sla_hours: int,
    ) -> str:
        """Erstellt Assignment-Eintrag"""
        data = {
            "lead_id": lead_id,
            "assigned_to": user_id,
            "assignment_method": method,
            "assignment_score": score,
            "assignment_reasons": reasons,
            "status": AssignmentStatus.PENDING.value,
            "sla_first_contact_hours": sla_hours,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        result = self.db.table("lead_assignments").insert(data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to create assignment")
    
    async def _update_lead_assignment(self, lead_id: str, user_id: str) -> None:
        """Aktualisiert Lead mit Zuweisung"""
        self.db.table("leads").update({
            "owner_id": user_id,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", lead_id).execute()
    
    async def _update_rep_capacity(self, user_id: str, increment: bool = True) -> None:
        """Aktualisiert Rep Kapazität"""
        try:
            result = (
                self.db.table("sales_rep_profiles")
                .select("current_lead_count")
                .eq("user_id", user_id)
                .execute()
            )
            
            if result.data:
                current = result.data[0].get("current_lead_count", 0)
                new_count = current + 1 if increment else max(0, current - 1)
                
                self.db.table("sales_rep_profiles").update({
                    "current_lead_count": new_count,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("user_id", user_id).execute()
                
        except Exception as e:
            logger.warning(f"Could not update rep capacity: {e}")
    
    # ========================================================================
    # ASSIGNMENT MANAGEMENT
    # ========================================================================
    
    async def accept_assignment(self, assignment_id: str, user_id: str) -> bool:
        """Akzeptiert eine Zuweisung"""
        try:
            self.db.table("lead_assignments").update({
                "status": AssignmentStatus.ACCEPTED.value,
                "accepted_at": datetime.utcnow().isoformat(),
            }).eq("id", assignment_id).eq("assigned_to", user_id).execute()
            
            return True
        except Exception as e:
            logger.exception(f"Accept assignment error: {e}")
            return False
    
    async def reject_assignment(
        self, 
        assignment_id: str, 
        user_id: str, 
        reason: str,
        reassign: bool = True,
    ) -> AssignmentResult:
        """Lehnt eine Zuweisung ab und weist ggf. neu zu"""
        result = AssignmentResult(success=False, lead_id="")
        
        try:
            # Assignment aktualisieren
            self.db.table("lead_assignments").update({
                "status": AssignmentStatus.REJECTED.value,
                "rejected_at": datetime.utcnow().isoformat(),
                "rejection_reason": reason,
            }).eq("id", assignment_id).eq("assigned_to", user_id).execute()
            
            # Kapazität zurückgeben
            await self._update_rep_capacity(user_id, increment=False)
            
            # Lead ID holen
            assignment = (
                self.db.table("lead_assignments")
                .select("lead_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if assignment.data:
                lead_id = assignment.data[0]["lead_id"]
                result.lead_id = lead_id
                
                # Neu zuweisen falls gewünscht
                if reassign:
                    new_result = await self.assign_lead(lead_id)
                    return new_result
                    
            result.success = True
            
        except Exception as e:
            logger.exception(f"Reject assignment error: {e}")
            result.error = str(e)
        
        return result
    
    async def transfer_assignment(
        self,
        assignment_id: str,
        from_user_id: str,
        to_user_id: str,
        reason: str,
    ) -> AssignmentResult:
        """Überträgt eine Zuweisung an anderen Rep"""
        result = AssignmentResult(success=False, lead_id="")
        
        try:
            # Assignment holen
            assignment = (
                self.db.table("lead_assignments")
                .select("lead_id")
                .eq("id", assignment_id)
                .execute()
            )
            
            if not assignment.data:
                result.error = "Assignment not found"
                return result
            
            lead_id = assignment.data[0]["lead_id"]
            result.lead_id = lead_id
            
            # Altes Assignment aktualisieren
            self.db.table("lead_assignments").update({
                "status": AssignmentStatus.TRANSFERRED.value,
                "transferred_to": to_user_id,
                "transferred_at": datetime.utcnow().isoformat(),
                "transfer_reason": reason,
            }).eq("id", assignment_id).execute()
            
            # Kapazitäten aktualisieren
            await self._update_rep_capacity(from_user_id, increment=False)
            await self._update_rep_capacity(to_user_id, increment=True)
            
            # Neues Assignment erstellen
            new_assignment_id = await self._create_assignment(
                lead_id=lead_id,
                user_id=to_user_id,
                method=AssignmentMethod.MANUAL.value,
                score=0,
                reasons=[f"Transfer von {from_user_id}: {reason}"],
                sla_hours=24,
            )
            
            # Lead aktualisieren
            await self._update_lead_assignment(lead_id, to_user_id)
            
            result.success = True
            result.assigned_to = to_user_id
            result.assignment_id = new_assignment_id
            
        except Exception as e:
            logger.exception(f"Transfer error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # SLA MONITORING
    # ========================================================================
    
    async def get_sla_breaches(self) -> List[Dict]:
        """Holt Zuweisungen mit SLA-Verletzung"""
        try:
            now = datetime.utcnow()
            
            result = (
                self.db.table("lead_assignments")
                .select("*, leads(name, email, p_score)")
                .eq("status", AssignmentStatus.PENDING.value)
                .is_("first_contact_at", "null")
                .execute()
            )
            
            breaches = []
            for assignment in (result.data or []):
                created_at = datetime.fromisoformat(
                    assignment["created_at"].replace("Z", "+00:00")
                )
                sla_hours = assignment.get("sla_first_contact_hours", 24)
                deadline = created_at + timedelta(hours=sla_hours)
                
                if now.replace(tzinfo=created_at.tzinfo) > deadline:
                    assignment["sla_breached"] = True
                    assignment["hours_overdue"] = (
                        now.replace(tzinfo=created_at.tzinfo) - deadline
                    ).total_seconds() / 3600
                    breaches.append(assignment)
                    
                    # Flag in DB setzen
                    self.db.table("lead_assignments").update({
                        "sla_breached": True
                    }).eq("id", assignment["id"]).execute()
            
            return breaches
            
        except Exception as e:
            logger.exception(f"SLA check error: {e}")
            return []
    
    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================
    
    async def assign_unassigned_leads(self, limit: int = 50) -> Dict[str, Any]:
        """Weist alle unzugewiesenen Leads zu"""
        logger.info(f"Assigning unassigned leads, limit: {limit}")
        
        stats = {
            "total": 0,
            "assigned": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            # Unzugewiesene Leads holen
            leads_result = (
                self.db.table("leads")
                .select("id")
                .is_("owner_id", "null")
                .order("p_score", desc=True)
                .limit(limit)
                .execute()
            )
            
            leads = leads_result.data or []
            stats["total"] = len(leads)
            
            for lead in leads:
                result = await self.assign_lead(lead["id"])
                
                if result.success:
                    stats["assigned"] += 1
                else:
                    stats["failed"] += 1
                    stats["errors"].append({
                        "lead_id": lead["id"],
                        "error": result.error
                    })
            
            logger.info(f"Batch assignment complete: {stats['assigned']}/{stats['total']} assigned")
            
        except Exception as e:
            logger.exception(f"Batch assignment error: {e}")
            stats["errors"].append({"error": str(e)})
        
        return stats


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_auto_assignment_service(db: Client) -> AutoAssignmentService:
    """Factory für AutoAssignmentService"""
    return AutoAssignmentService(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "AutoAssignmentService",
    "create_auto_assignment_service",
    "AssignmentResult",
    "SalesRepScore",
    "AssignmentMethod",
    "AssignmentStatus",
    "ASSIGNMENT_CONFIG",
]

