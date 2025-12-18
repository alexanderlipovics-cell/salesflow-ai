"""
Sales Flow AI - Predictive Scoring Engine (P-Score)

Berechnet prädiktive Lead-Scores basierend auf:
- Message Events (Anzahl, Richtung, Timing)
- Lead-Daten (Stage, letzte Aktivität)
- Engagement-Patterns

Version 1.0 - Heuristischer Ansatz
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from uuid import UUID
import logging

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# SCORING CONFIGURATION
# ============================================================================

# Score-Gewichtungen für V1 (heuristisch)
SCORE_CONFIG = {
    "base_score": 20,
    "inbound_7d_bonus": 10,        # +10 wenn >= 1 inbound in 7 Tagen
    "inbound_per_event": 10,       # +10 pro zusätzlichem inbound Event
    "max_inbound_bonus": 60,       # Max. Bonus aus inbound Events
    "outbound_only_cap": 40,       # Max. Score wenn nur outbound
    "trend_threshold": 5,          # Differenz für up/down Trend
    "recent_days": 14,             # Zeitfenster für Analyse
    "hot_lead_days": 7,            # Zeitfenster für "heiße" Leads
}


# ============================================================================
# CORE SCORING FUNCTIONS
# ============================================================================


async def calculate_p_score_for_lead(
    db: Client,
    lead_id: str,
    user_id: Optional[str] = None,
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Berechnet einen P-Score (0-100) und Trend für einen Lead.
    
    V1 Heuristik:
    - Basis-Score: 20
    - +10 wenn >= 1 inbound Nachricht in 7 Tagen
    - +10 pro zusätzlichem inbound Event (bis max. 60)
    - Max. 40 wenn nur outbound Events vorhanden
    
    Args:
        db: Supabase Client
        lead_id: UUID des Leads
        user_id: Optional - User ID für zusätzliche Filterung
        
    Returns:
        Tuple[float, str, dict]: (score, trend, factors)
    """
    logger.info(f"Calculating P-Score for lead: {lead_id}")
    
    factors: Dict[str, Any] = {
        "base_score": SCORE_CONFIG["base_score"],
        "inbound_events_7d": 0,
        "inbound_events_14d": 0,
        "outbound_events_14d": 0,
        "has_recent_activity": False,
        "bonuses": [],
        "penalties": [],
    }
    
    try:
        # 1. Lead-Daten holen
        lead_result = db.table("leads").select("*").eq("id", lead_id).execute()
        
        if not lead_result.data:
            logger.warning(f"Lead not found: {lead_id}")
            return 0.0, "flat", {"error": "Lead not found"}
        
        lead = lead_result.data[0]
        old_score = lead.get("p_score")
        
        # 2. Message Events für diesen Lead holen (letzte 14 Tage)
        cutoff_14d = (datetime.utcnow() - timedelta(days=SCORE_CONFIG["recent_days"])).isoformat()
        cutoff_7d = (datetime.utcnow() - timedelta(days=SCORE_CONFIG["hot_lead_days"])).isoformat()
        
        # Events via contact_id oder user_id
        events_query = db.table("message_events").select("*").gte("created_at", cutoff_14d)
        
        # Wenn wir eine user_id haben, filtern wir danach
        if user_id:
            events_query = events_query.eq("user_id", user_id)
        
        events_result = events_query.execute()
        all_events = events_result.data or []
        
        # 3. Events analysieren
        inbound_7d = 0
        inbound_14d = 0
        outbound_14d = 0
        
        for event in all_events:
            event_time = event.get("created_at", "")
            direction = event.get("direction", "")
            
            if direction == "inbound":
                inbound_14d += 1
                if event_time >= cutoff_7d:
                    inbound_7d += 1
            elif direction == "outbound":
                outbound_14d += 1
        
        factors["inbound_events_7d"] = inbound_7d
        factors["inbound_events_14d"] = inbound_14d
        factors["outbound_events_14d"] = outbound_14d
        factors["has_recent_activity"] = (inbound_7d + outbound_14d) > 0
        
        # 4. Score berechnen
        score = float(SCORE_CONFIG["base_score"])
        
        # Bonus für Inbound in 7 Tagen
        if inbound_7d >= 1:
            bonus = SCORE_CONFIG["inbound_7d_bonus"]
            score += bonus
            factors["bonuses"].append(f"+{bonus} für inbound in 7d")
        
        # Bonus pro zusätzlichem Inbound Event
        if inbound_14d > 1:
            additional_events = inbound_14d - 1
            inbound_bonus = min(
                additional_events * SCORE_CONFIG["inbound_per_event"],
                SCORE_CONFIG["max_inbound_bonus"]
            )
            score += inbound_bonus
            factors["bonuses"].append(f"+{inbound_bonus} für {additional_events} extra inbound Events")
        
        # Penalty: Nur Outbound, keine Inbound
        if outbound_14d > 0 and inbound_14d == 0:
            score = min(score, SCORE_CONFIG["outbound_only_cap"])
            factors["penalties"].append(f"Cap bei {SCORE_CONFIG['outbound_only_cap']} (nur outbound)")
        
        # Lead-Stage berücksichtigen (wenn vorhanden)
        status = lead.get("status", "").upper()
        if status in ["INTERESTED", "QUALIFIED", "PROPOSAL"]:
            bonus = 15
            score += bonus
            factors["bonuses"].append(f"+{bonus} für Status {status}")
        elif status in ["GHOSTING", "LOST", "INACTIVE"]:
            penalty = 20
            score -= penalty
            factors["penalties"].append(f"-{penalty} für Status {status}")
        
        # Temperatur-Einfluss (manueller Score)
        temperature = lead.get("temperature", 50)
        if temperature >= 80:
            score += 10
            factors["bonuses"].append("+10 für hohe Temperatur")
        elif temperature <= 20:
            score -= 10
            factors["penalties"].append("-10 für niedrige Temperatur")
        
        # Score auf 0-100 begrenzen
        score = max(0, min(100, score))
        
        # 5. Trend bestimmen
        trend = "flat"
        if old_score is not None:
            diff = score - old_score
            if diff >= SCORE_CONFIG["trend_threshold"]:
                trend = "up"
            elif diff <= -SCORE_CONFIG["trend_threshold"]:
                trend = "down"
        
        factors["old_score"] = old_score
        factors["new_score"] = score
        factors["diff"] = score - (old_score or 0)
        
        logger.info(f"P-Score calculated: lead={lead_id}, score={score}, trend={trend}")
        return score, trend, factors
        
    except Exception as e:
        logger.exception(f"Error calculating P-Score for lead {lead_id}: {e}")
        return 0.0, "flat", {"error": str(e)}


async def recalc_p_scores_for_user(
    db: Client,
    user_id: str,
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Berechnet P-Scores für bis zu `limit` aktive Leads eines Users neu.
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        limit: Max. Anzahl Leads (default: 100)
        
    Returns:
        dict: Summary mit Statistiken
    """
    logger.info(f"Recalculating P-Scores for user: {user_id}, limit={limit}")
    start_time = datetime.utcnow()
    
    summary = {
        "total_leads": 0,
        "leads_scored": 0,
        "avg_score": None,
        "score_distribution": {"hot": 0, "warm": 0, "cold": 0},
        "duration_ms": 0,
        "errors": [],
    }
    
    try:
        # 1. Leads holen (alle, da wir keinen owner_id haben in der einfachen leads-Tabelle)
        # In einer erweiterten Version würde man hier nach user_id filtern
        leads_result = (
            db.table("leads")
            .select("id, name, status")
            .limit(limit)
            .execute()
        )
        
        leads = leads_result.data or []
        summary["total_leads"] = len(leads)
        
        if not leads:
            logger.info("No leads found to score")
            return summary
        
        # 2. Jeden Lead scoren und updaten
        scores = []
        now = datetime.utcnow().isoformat()
        
        for lead in leads:
            lead_id = lead["id"]
            try:
                score, trend, factors = await calculate_p_score_for_lead(
                    db=db,
                    lead_id=lead_id,
                    user_id=user_id,
                )
                
                # Update in DB
                db.table("leads").update({
                    "p_score": score,
                    "p_score_trend": trend,
                    "last_scored_at": now,
                }).eq("id", lead_id).execute()
                
                scores.append(score)
                summary["leads_scored"] += 1
                
                # Distribution
                if score >= 80:
                    summary["score_distribution"]["hot"] += 1
                elif score >= 50:
                    summary["score_distribution"]["warm"] += 1
                else:
                    summary["score_distribution"]["cold"] += 1
                    
            except Exception as e:
                error_msg = f"Lead {lead_id}: {str(e)}"
                summary["errors"].append(error_msg)
                logger.error(error_msg)
        
        # 3. Statistiken berechnen
        if scores:
            summary["avg_score"] = round(sum(scores) / len(scores), 2)
        
        duration = datetime.utcnow() - start_time
        summary["duration_ms"] = int(duration.total_seconds() * 1000)
        
        logger.info(
            f"P-Score recalc complete: scored={summary['leads_scored']}, "
            f"avg={summary['avg_score']}, duration={summary['duration_ms']}ms"
        )
        
        return summary
        
    except Exception as e:
        logger.exception(f"Error in recalc_p_scores_for_user: {e}")
        summary["errors"].append(str(e))
        return summary


async def get_hot_leads(
    db: Client,
    user_id: Optional[str] = None,
    min_score: float = 75,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Holt die heißesten Leads basierend auf P-Score.
    
    Args:
        db: Supabase Client
        user_id: Optional User ID Filter
        min_score: Minimum P-Score (default: 75)
        limit: Max. Anzahl (default: 20)
        
    Returns:
        List[dict]: Liste der Hot Leads
    """
    try:
        query = (
            db.table("leads")
            .select("*")
            .gte("p_score", min_score)
            .order("p_score", desc=True)
            .limit(limit)
        )
        
        result = query.execute()
        return result.data or []
        
    except Exception as e:
        logger.exception(f"Error getting hot leads: {e}")
        return []


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "calculate_p_score_for_lead",
    "recalc_p_scores_for_user",
    "get_hot_leads",
    "SCORE_CONFIG",
]

