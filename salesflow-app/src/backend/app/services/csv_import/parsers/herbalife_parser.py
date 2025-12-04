"""
╔════════════════════════════════════════════════════════════════════════════╗
║  Herbalife Parser für SalesFlow AI                                        ║
║  Basierend auf dem "Sales & Marketing Plan" 2025                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Stair-Step Breakaway System
- Supervisor-Qualifikation (3 Wege)
- Re-Qualifikation Tracking (KRITISCH!)
- Royalty Overrides (5-3-1)
- TAB Team (Production Bonus)
- 10 Retail Customers Rule
- 70% Rule Compliance
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, date


class HerbalifeLevel(Enum):
    """Herbalife Level-Hierarchie 2025"""
    
    UNKNOWN = ("unknown", "Unbekannt", 0, 0.00)
    DISTRIBUTOR = ("distributor", "Distributor", 1, 0.25)
    SENIOR_CONSULTANT = ("senior_consultant", "Senior Consultant", 2, 0.35)
    SUCCESS_BUILDER = ("success_builder", "Success Builder", 3, 0.42)
    QUALIFIED_PRODUCER = ("qualified_producer", "Qualified Producer", 4, 0.42)
    SUPERVISOR = ("supervisor", "Supervisor", 5, 0.50)
    
    # TAB Team Levels
    WORLD_TEAM = ("world_team", "World Team", 6, 0.50)
    GET_TEAM = ("get_team", "Global Expansion Team", 7, 0.50)
    MILLIONAIRE_TEAM = ("millionaire_team", "Millionaire Team", 8, 0.50)
    PRESIDENTS_TEAM = ("presidents_team", "President's Team", 9, 0.50)
    PRESIDENTS_20K = ("presidents_20k", "President's Team 20K", 10, 0.50)
    PRESIDENTS_30K = ("presidents_30k", "President's Team 30K", 11, 0.50)
    PRESIDENTS_50K = ("presidents_50k", "President's Team 50K", 12, 0.50)
    CHAIRMANS_CLUB = ("chairmans_club", "Chairman's Club", 13, 0.50)
    FOUNDERS_CIRCLE = ("founders_circle", "Founder's Circle", 14, 0.50)
    
    def __init__(self, id: str, display_name: str, level: int, discount: float):
        self.id = id
        self.display_name = display_name
        self.level = level
        self.discount = discount


# Supervisor-Qualifikation Optionen
SUPERVISOR_QUALIFICATION = {
    "one_month": {
        "vp_required": 4000,
        "unencumbered_min": 1000,
        "months": 1,
        "description": "4.000 VP in einem Monat (min. 1.000 unbelastet)"
    },
    "two_month": {
        "vp_per_month": 2500,
        "unencumbered_min": 1000,
        "months": 2,
        "description": "2.500 VP in zwei aufeinanderfolgenden Monaten"
    },
    "cumulative": {
        "vp_total": 4000,
        "ppv_min": 2000,
        "months": 12,
        "description": "4.000 VP in 12 Monaten (min. 2.000 PPV)"
    }
}

# Re-Qualifikation (Jährlich!)
REQUALIFICATION_REQUIREMENTS = {
    "annual_vp": 4000,
    "deadline_month": 1,  # Januar
    "deadline_day": 31,
    "consequence": "Rückstufung auf Qualified Producer + Verlust der Downline"
}

# Royalty Override Struktur (5-3-1)
ROYALTY_OVERRIDES = {
    "max_levels": 3,
    "max_percentage": 0.05,  # 5%
    "requirements": {
        "full_royalty": {"tv_min": 2500, "percentage": 0.05},
        "partial_royalty": {"tv_min": 1000, "percentage": 0.03},
        "minimum_royalty": {"tv_min": 500, "percentage": 0.01},
        "no_royalty": {"tv_min": 0, "percentage": 0.00},
    }
}

# TAB Team Requirements
TAB_TEAM_REQUIREMENTS = {
    HerbalifeLevel.GET_TEAM: {
        "ro_points": 1000,
        "approx_ov": 20000,
        "production_bonus": 0.02,
        "waiting_months": 0
    },
    HerbalifeLevel.MILLIONAIRE_TEAM: {
        "ro_points": 4000,
        "approx_ov": 80000,
        "production_bonus": 0.04,
        "waiting_months": 2
    },
    HerbalifeLevel.PRESIDENTS_TEAM: {
        "ro_points": 10000,
        "approx_ov": 200000,
        "production_bonus": 0.06,
        "waiting_months": 3
    },
    HerbalifeLevel.PRESIDENTS_20K: {
        "ro_points": 20000,
        "production_bonus": 0.065
    },
    HerbalifeLevel.PRESIDENTS_30K: {
        "ro_points": 30000,
        "production_bonus": 0.065
    },
    HerbalifeLevel.PRESIDENTS_50K: {
        "ro_points": 50000,
        "production_bonus": 0.07
    },
}

# Compliance Requirements
COMPLIANCE_RULES = {
    "retail_customers_min": 10,  # 10 Retail Customers Rule
    "sold_percentage_min": 0.70,  # 70% Rule
}


@dataclass
class HerbalifeContact:
    """Strukturierter Herbalife Kontakt"""
    
    # Basis-Info
    distributor_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Level & Status
    level: HerbalifeLevel = HerbalifeLevel.UNKNOWN
    is_supervisor: bool = False
    
    # Volumen
    vp: float = 0.0  # Volume Points
    ppv: float = 0.0  # Personally Purchased Volume
    tv: float = 0.0  # Total Volume
    ro: float = 0.0  # Royalty Override Points
    
    # Supervisor Qualifikation
    supervisor_since: Optional[datetime] = None
    qualification_method: Optional[str] = None  # one_month, two_month, cumulative
    
    # Re-Qualifikation (KRITISCH!)
    requalification_deadline: Optional[date] = None
    annual_vp_accumulated: float = 0.0
    requalification_at_risk: bool = False
    
    # TAB Team
    tab_team_level: Optional[HerbalifeLevel] = None
    production_bonus_rate: float = 0.0
    
    # Compliance
    retail_customers_count: int = 0
    retail_compliant: bool = False
    sold_percentage: float = 0.0
    
    # Struktur
    sponsor_id: Optional[str] = None
    first_line_supervisors: int = 0
    
    # Nutrition Club (DACH relevant)
    has_nutrition_club: bool = False
    club_compliant: bool = False  # Geschlossener Club?
    
    # Discount
    current_discount: float = 0.25


class HerbalifeParser:
    """Parser für Herbalife CSV-Exporte"""
    
    # Level-Aliase für Normalisierung
    LEVEL_ALIASES = {
        # Englisch
        "distributor": HerbalifeLevel.DISTRIBUTOR,
        "dist": HerbalifeLevel.DISTRIBUTOR,
        "member": HerbalifeLevel.DISTRIBUTOR,
        "senior consultant": HerbalifeLevel.SENIOR_CONSULTANT,
        "sc": HerbalifeLevel.SENIOR_CONSULTANT,
        "success builder": HerbalifeLevel.SUCCESS_BUILDER,
        "sb": HerbalifeLevel.SUCCESS_BUILDER,
        "qualified producer": HerbalifeLevel.QUALIFIED_PRODUCER,
        "qp": HerbalifeLevel.QUALIFIED_PRODUCER,
        "supervisor": HerbalifeLevel.SUPERVISOR,
        "sup": HerbalifeLevel.SUPERVISOR,
        "spv": HerbalifeLevel.SUPERVISOR,
        "world team": HerbalifeLevel.WORLD_TEAM,
        "wt": HerbalifeLevel.WORLD_TEAM,
        "global expansion team": HerbalifeLevel.GET_TEAM,
        "get team": HerbalifeLevel.GET_TEAM,
        "get": HerbalifeLevel.GET_TEAM,
        "millionaire team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "mill team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "mt": HerbalifeLevel.MILLIONAIRE_TEAM,
        "president's team": HerbalifeLevel.PRESIDENTS_TEAM,
        "presidents team": HerbalifeLevel.PRESIDENTS_TEAM,
        "pt": HerbalifeLevel.PRESIDENTS_TEAM,
        "chairman's club": HerbalifeLevel.CHAIRMANS_CLUB,
        "chairmans club": HerbalifeLevel.CHAIRMANS_CLUB,
        "founder's circle": HerbalifeLevel.FOUNDERS_CIRCLE,
        "founders circle": HerbalifeLevel.FOUNDERS_CIRCLE,
        
        # Deutsch
        "berater": HerbalifeLevel.DISTRIBUTOR,
        "vertriebspartner": HerbalifeLevel.DISTRIBUTOR,
        "senior berater": HerbalifeLevel.SENIOR_CONSULTANT,
        "qualifizierter produzent": HerbalifeLevel.QUALIFIED_PRODUCER,
        "betreuer": HerbalifeLevel.SUPERVISOR,
        "millionärs-team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "präsidenten-team": HerbalifeLevel.PRESIDENTS_TEAM,
    }
    
    def __init__(self):
        self.company_id = "herbalife"
        self.company_name = "Herbalife"
    
    def normalize_level(self, level_str: str) -> HerbalifeLevel:
        """Normalisiert Level-String zu HerbalifeLevel Enum"""
        if not level_str:
            return HerbalifeLevel.UNKNOWN
        
        normalized = level_str.lower().strip()
        return self.LEVEL_ALIASES.get(normalized, HerbalifeLevel.UNKNOWN)
    
    def parse_row(self, row: Dict[str, Any], field_mapping: Dict[str, str]) -> HerbalifeContact:
        """Parst eine CSV-Zeile zu HerbalifeContact"""
        
        def get_value(key: str, default=None):
            mapped_key = field_mapping.get(key, key)
            return row.get(mapped_key, default)
        
        def get_float(key: str, default=0.0) -> float:
            val = get_value(key)
            if val is None or val == "":
                return default
            try:
                if isinstance(val, str):
                    val = val.replace(".", "").replace(",", ".")
                return float(val)
            except (ValueError, TypeError):
                return default
        
        def get_int(key: str, default=0) -> int:
            return int(get_float(key, default))
        
        def get_bool(key: str, default=False) -> bool:
            val = get_value(key)
            if val is None:
                return default
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                return val.lower() in ("true", "yes", "ja", "1", "aktiv", "active")
            return bool(val)
        
        level = self.normalize_level(str(get_value("level", "")))
        
        contact = HerbalifeContact(
            distributor_id=str(get_value("distributor_id", "")),
            first_name=str(get_value("first_name", "")),
            last_name=str(get_value("last_name", "")),
            email=get_value("email"),
            phone=get_value("phone"),
            level=level,
            is_supervisor=level.level >= HerbalifeLevel.SUPERVISOR.level,
            vp=get_float("vp"),
            ppv=get_float("ppv"),
            tv=get_float("tv"),
            ro=get_float("ro"),
            retail_customers_count=get_int("retail_customers"),
            sold_percentage=get_float("sold_percentage", 0.70),
            sponsor_id=get_value("sponsor_id"),
            first_line_supervisors=get_int("first_line_supervisors"),
            has_nutrition_club=get_bool("nutrition_club"),
            current_discount=level.discount,
        )
        
        # Berechne abgeleitete Werte
        contact = self._calculate_derived_values(contact)
        
        return contact
    
    def _calculate_derived_values(self, contact: HerbalifeContact) -> HerbalifeContact:
        """Berechnet abgeleitete Werte"""
        
        # Re-Qualifikation Check (KRITISCH!)
        if contact.is_supervisor:
            today = date.today()
            deadline = date(today.year + 1, 1, 31)
            contact.requalification_deadline = deadline
            
            # Risiko-Berechnung
            days_remaining = (deadline - today).days
            vp_remaining = max(0, REQUALIFICATION_REQUIREMENTS["annual_vp"] - contact.annual_vp_accumulated)
            
            # At Risk wenn: < 90 Tage und < 50% des Ziels
            if days_remaining < 90 and contact.annual_vp_accumulated < 2000:
                contact.requalification_at_risk = True
        
        # Retail Compliance
        contact.retail_compliant = (
            contact.retail_customers_count >= COMPLIANCE_RULES["retail_customers_min"] and
            contact.sold_percentage >= COMPLIANCE_RULES["sold_percentage_min"]
        )
        
        # TAB Team Level bestimmen
        if contact.ro >= 50000:
            contact.tab_team_level = HerbalifeLevel.PRESIDENTS_50K
            contact.production_bonus_rate = 0.07
        elif contact.ro >= 30000:
            contact.tab_team_level = HerbalifeLevel.PRESIDENTS_30K
            contact.production_bonus_rate = 0.065
        elif contact.ro >= 20000:
            contact.tab_team_level = HerbalifeLevel.PRESIDENTS_20K
            contact.production_bonus_rate = 0.065
        elif contact.ro >= 10000:
            contact.tab_team_level = HerbalifeLevel.PRESIDENTS_TEAM
            contact.production_bonus_rate = 0.06
        elif contact.ro >= 4000:
            contact.tab_team_level = HerbalifeLevel.MILLIONAIRE_TEAM
            contact.production_bonus_rate = 0.04
        elif contact.ro >= 1000:
            contact.tab_team_level = HerbalifeLevel.GET_TEAM
            contact.production_bonus_rate = 0.02
        
        return contact
    
    def calculate_royalty_override(self, tv: float, level: int = 1) -> Dict[str, Any]:
        """Berechnet Royalty Override für eine Ebene"""
        if level > ROYALTY_OVERRIDES["max_levels"]:
            return {"percentage": 0, "reason": "Über Maximum (3 Ebenen)"}
        
        reqs = ROYALTY_OVERRIDES["requirements"]
        
        if tv >= reqs["full_royalty"]["tv_min"]:
            return {"percentage": 0.05, "reason": "Volle Royalty (5%)"}
        elif tv >= reqs["partial_royalty"]["tv_min"]:
            return {"percentage": 0.03, "reason": "Teilweise Royalty (3%)"}
        elif tv >= reqs["minimum_royalty"]["tv_min"]:
            return {"percentage": 0.01, "reason": "Minimale Royalty (1%)"}
        else:
            return {"percentage": 0, "reason": "Keine Royalty (TV < 500)"}
    
    def check_supervisor_qualification(
        self, 
        vp_month1: float, 
        vp_month2: float = 0, 
        ppv: float = 0,
        unencumbered: float = 0
    ) -> Dict[str, Any]:
        """Prüft Supervisor-Qualifikation"""
        
        results = {
            "one_month": False,
            "two_month": False,
            "cumulative": False,
            "best_path": None,
            "remaining": {}
        }
        
        # Ein-Monats-Qualifikation
        if vp_month1 >= 4000 and unencumbered >= 1000:
            results["one_month"] = True
            results["best_path"] = "one_month"
        else:
            results["remaining"]["one_month"] = {
                "vp_needed": max(0, 4000 - vp_month1),
                "unencumbered_needed": max(0, 1000 - unencumbered)
            }
        
        # Zwei-Monats-Qualifikation
        if vp_month1 >= 2500 and vp_month2 >= 2500:
            results["two_month"] = True
            if not results["best_path"]:
                results["best_path"] = "two_month"
        else:
            results["remaining"]["two_month"] = {
                "month1_needed": max(0, 2500 - vp_month1),
                "month2_needed": max(0, 2500 - vp_month2)
            }
        
        return results
    
    def calculate_requalification_status(
        self, 
        annual_vp: float, 
        current_date: date = None
    ) -> Dict[str, Any]:
        """Berechnet Re-Qualifikations-Status"""
        
        if current_date is None:
            current_date = date.today()
        
        deadline = date(current_date.year + 1 if current_date.month > 1 else current_date.year, 1, 31)
        days_remaining = (deadline - current_date).days
        vp_remaining = max(0, 4000 - annual_vp)
        
        # Berechne benötigte VP pro Monat
        months_remaining = max(1, days_remaining // 30)
        vp_per_month_needed = vp_remaining / months_remaining if months_remaining > 0 else vp_remaining
        
        status = {
            "deadline": deadline.isoformat(),
            "days_remaining": days_remaining,
            "annual_vp": annual_vp,
            "vp_remaining": vp_remaining,
            "vp_per_month_needed": round(vp_per_month_needed, 2),
            "on_track": annual_vp >= (4000 * (1 - days_remaining / 365)),
            "risk_level": "low"
        }
        
        # Risiko-Einstufung
        if vp_remaining == 0:
            status["risk_level"] = "qualified"
        elif days_remaining < 30 and vp_remaining > 1000:
            status["risk_level"] = "critical"
        elif days_remaining < 90 and vp_remaining > 2000:
            status["risk_level"] = "high"
        elif not status["on_track"]:
            status["risk_level"] = "medium"
        
        return status
    
    def to_salesflow_contact(self, contact: HerbalifeContact) -> Dict[str, Any]:
        """Konvertiert zu SalesFlow Contact Format"""
        
        # Re-Qual Status berechnen
        requal_status = None
        if contact.is_supervisor:
            requal_status = self.calculate_requalification_status(contact.annual_vp_accumulated)
        
        return {
            "external_id": contact.distributor_id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "company": "Herbalife",
            "source": "mlm_import",
            "mlm_data": {
                "company": "herbalife",
                "level": contact.level.id,
                "level_display": contact.level.display_name,
                "level_number": contact.level.level,
                "is_supervisor": contact.is_supervisor,
                "vp": contact.vp,
                "ppv": contact.ppv,
                "tv": contact.tv,
                "ro": contact.ro,
                "current_discount": contact.current_discount,
                "sponsor_id": contact.sponsor_id,
                "first_line_supervisors": contact.first_line_supervisors,
                # TAB Team
                "tab_team_level": contact.tab_team_level.id if contact.tab_team_level else None,
                "production_bonus_rate": contact.production_bonus_rate,
                # Re-Qualifikation (KRITISCH!)
                "requalification_deadline": contact.requalification_deadline.isoformat() if contact.requalification_deadline else None,
                "annual_vp_accumulated": contact.annual_vp_accumulated,
                "requalification_at_risk": contact.requalification_at_risk,
                "requalification_status": requal_status,
                # Compliance
                "retail_customers_count": contact.retail_customers_count,
                "retail_compliant": contact.retail_compliant,
                "sold_percentage": contact.sold_percentage,
                # Nutrition Club
                "has_nutrition_club": contact.has_nutrition_club,
                "club_compliant": contact.club_compliant,
            },
            "tags": self._generate_tags(contact),
            "score": self._calculate_lead_score(contact),
            "alerts": self._generate_alerts(contact),
        }
    
    def _generate_tags(self, contact: HerbalifeContact) -> List[str]:
        """Generiert automatische Tags"""
        tags = ["Herbalife"]
        
        # Level-Tag
        if contact.level != HerbalifeLevel.UNKNOWN:
            tags.append(f"Level: {contact.level.display_name}")
        
        # Supervisor Status
        if contact.is_supervisor:
            tags.append("Supervisor")
        
        # TAB Team
        if contact.tab_team_level:
            tags.append(f"TAB: {contact.tab_team_level.display_name}")
        
        # Re-Qual Risk
        if contact.requalification_at_risk:
            tags.append("⚠️ Re-Qual Risiko")
        
        # Compliance
        if not contact.retail_compliant:
            tags.append("❌ Retail Compliance")
        
        # Nutrition Club
        if contact.has_nutrition_club:
            tags.append("🏠 Nutrition Club")
        
        return tags
    
    def _calculate_lead_score(self, contact: HerbalifeContact) -> int:
        """Berechnet Lead Score (0-100)"""
        score = 50  # Basis
        
        # Level-Bonus
        score += min(contact.level.level * 3, 30)
        
        # Supervisor Bonus
        if contact.is_supervisor:
            score += 10
        
        # TAB Team Bonus
        if contact.tab_team_level:
            score += 5
        
        # Compliance Malus
        if not contact.retail_compliant:
            score -= 10
        
        # Re-Qual Risk Malus
        if contact.requalification_at_risk:
            score -= 15
        
        return min(100, max(0, score))
    
    def _generate_alerts(self, contact: HerbalifeContact) -> List[Dict[str, Any]]:
        """Generiert Alerts für wichtige Status"""
        alerts = []
        
        # Re-Qualifikation Alert
        if contact.requalification_at_risk:
            requal = self.calculate_requalification_status(contact.annual_vp_accumulated)
            alerts.append({
                "type": "requalification_warning",
                "severity": requal["risk_level"],
                "title": "Re-Qualifikation gefährdet!",
                "message": f"Noch {requal['vp_remaining']} VP nötig bis {requal['deadline']}",
                "action": "supervisor_requalification"
            })
        
        # Retail Compliance Alert
        if contact.is_supervisor and not contact.retail_compliant:
            alerts.append({
                "type": "compliance_warning",
                "severity": "high",
                "title": "Retail Compliance fehlt",
                "message": f"Nur {contact.retail_customers_count}/10 Retail-Kunden",
                "action": "add_retail_customers"
            })
        
        # TAB Opportunity
        if contact.is_supervisor and not contact.tab_team_level and contact.ro >= 500:
            alerts.append({
                "type": "opportunity",
                "severity": "info",
                "title": "GET Team möglich",
                "message": f"Noch {max(0, 1000 - contact.ro)} RO-Punkte bis GET Team",
                "action": "tab_team_qualification"
            })
        
        return alerts


# Field Mapping für Herbalife
HERBALIFE_FIELD_MAPPING = {
    # Englisch
    "distributor_id": ["distributor id", "id", "member id", "herbalife id", "dist id"],
    "first_name": ["first name", "firstname", "first_name", "vorname"],
    "last_name": ["last name", "lastname", "last_name", "nachname", "surname"],
    "email": ["email", "e-mail", "email address"],
    "phone": ["phone", "telephone", "phone number", "telefon", "tel", "mobile"],
    "level": ["level", "status", "rank", "stufe", "rang"],
    "vp": ["vp", "volume points", "volumenpunkte"],
    "ppv": ["ppv", "personally purchased volume", "persönlich gekaufte punkte"],
    "tv": ["tv", "total volume", "gesamtvolumen"],
    "ro": ["ro", "royalty points", "royalty override points"],
    "retail_customers": ["retail customers", "customers", "kunden", "endkunden"],
    "sold_percentage": ["sold %", "sold percentage", "verkauft %"],
    "sponsor_id": ["sponsor id", "sponsor", "upline", "upline id"],
    "first_line_supervisors": ["first line", "first line supervisors", "erstlinie", "fl supervisors"],
    "nutrition_club": ["nutrition club", "nc", "club"],
}


def get_field_mapping(headers: List[str]) -> Dict[str, str]:
    """Erstellt Field Mapping basierend auf CSV-Headers"""
    mapping = {}
    
    for header in headers:
        header_lower = header.lower().strip()
        
        for field_name, aliases in HERBALIFE_FIELD_MAPPING.items():
            if header_lower in [a.lower() for a in aliases]:
                mapping[field_name] = header
                break
    
    return mapping


# Export für SalesFlow Integration
__all__ = [
    "HerbalifeLevel",
    "HerbalifeContact",
    "HerbalifeParser",
    "HERBALIFE_FIELD_MAPPING",
    "get_field_mapping",
    "SUPERVISOR_QUALIFICATION",
    "REQUALIFICATION_REQUIREMENTS",
    "ROYALTY_OVERRIDES",
    "TAB_TEAM_REQUIREMENTS",
    "COMPLIANCE_RULES",
]

