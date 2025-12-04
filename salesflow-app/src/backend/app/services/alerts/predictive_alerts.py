"""
SalesFlow AI - Predictive Alerts System
========================================
Intelligente Vorhersagen für MLM-Kontakte:
- Rang-Verlust Warnung
- Churn/Inaktivität-Risiko
- Re-Qualifikation Deadlines (Herbalife)
- Team-Gesundheit
- Opportunity Alerts

Usage:
    from predictive_alerts import PredictiveAlertEngine
    
    engine = PredictiveAlertEngine(company="herbalife")
    alerts = engine.analyze_contact(contact_data)
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
import math


class AlertType(Enum):
    """Arten von Alerts"""
    RANK_LOSS = "rank_loss"
    REQUALIFICATION = "requalification"
    CHURN_RISK = "churn_risk"
    INACTIVITY = "inactivity"
    OPPORTUNITY = "opportunity"
    TEAM_HEALTH = "team_health"
    COMPLIANCE = "compliance"
    MILESTONE = "milestone"


class AlertSeverity(Enum):
    """Schweregrade"""
    INFO = "info"
    WARNING = "warning"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PredictiveAlert:
    """Ein einzelner Alert"""
    type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    action_required: bool = False
    suggested_action: Optional[str] = None
    deadline: Optional[date] = None
    confidence: float = 0.0  # 0-1
    data: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "title": self.title,
            "message": self.message,
            "contact_id": self.contact_id,
            "contact_name": self.contact_name,
            "action_required": self.action_required,
            "suggested_action": self.suggested_action,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "confidence": self.confidence,
            "data": self.data,
        }


# =============================================================================
# COMPANY-SPECIFIC CONFIGURATIONS
# =============================================================================

COMPANY_CONFIGS = {
    "herbalife": {
        "has_requalification": True,
        "requalification_deadline": "january_31",
        "requalification_vp": 4000,
        "inactivity_threshold_days": 30,
        "churn_risk_factors": [
            {"factor": "vp_decline", "weight": 0.3},
            {"factor": "days_inactive", "weight": 0.25},
            {"factor": "team_decline", "weight": 0.2},
            {"factor": "no_retail_customers", "weight": 0.15},
            {"factor": "missed_events", "weight": 0.1},
        ],
    },
    "doterra": {
        "has_requalification": False,
        "inactivity_threshold_days": 30,
        "lrp_required_pv": 100,
        "churn_risk_factors": [
            {"factor": "lrp_inactive", "weight": 0.35},
            {"factor": "pv_decline", "weight": 0.25},
            {"factor": "days_inactive", "weight": 0.2},
            {"factor": "no_orders_90_days", "weight": 0.2},
        ],
    },
    "zinzino": {
        "has_requalification": False,
        "inactivity_threshold_days": 30,
        "subscription_required": True,
        "churn_risk_factors": [
            {"factor": "subscription_inactive", "weight": 0.35},
            {"factor": "credits_decline", "weight": 0.25},
            {"factor": "days_inactive", "weight": 0.2},
            {"factor": "team_decline", "weight": 0.2},
        ],
    },
    "pm-international": {
        "has_requalification": False,
        "inactivity_threshold_days": 30,
        "autoship_required": True,
        "churn_risk_factors": [
            {"factor": "autoship_inactive", "weight": 0.35},
            {"factor": "points_decline", "weight": 0.25},
            {"factor": "days_inactive", "weight": 0.2},
            {"factor": "gv_decline", "weight": 0.2},
        ],
    },
}


# =============================================================================
# RANK REQUIREMENTS (für Rang-Verlust Vorhersage)
# =============================================================================

RANK_REQUIREMENTS = {
    "herbalife": {
        "supervisor": {"tv_min": 2500, "annual_vp": 4000},
        "world_team": {"ro_min": 500},
        "get_team": {"ro_min": 1000},
        "millionaire_team": {"ro_min": 4000},
        "presidents_team": {"ro_min": 10000},
    },
    "doterra": {
        "manager": {"ov_min": 500},
        "director": {"ov_min": 1000},
        "executive": {"ov_min": 2000},
        "elite": {"ov_min": 3000},
        "premier": {"ov_min": 5000, "legs_min": 2},
        "silver": {"legs_min": 3, "leg_rank": "elite"},
        "gold": {"legs_min": 3, "leg_rank": "premier"},
    },
    "zinzino": {
        "partner": {"credits_min": 0},
        "manager": {"credits_min": 100},
        "director": {"team_credits_min": 500},
        "crown": {"team_credits_min": 5000},
    },
    "pm-international": {
        "teampartner": {"points_min": 0},
        "manager": {"gv_min": 400},
        "senior_manager": {"gv_min": 1200},
        "executive_manager": {"gv_min": 4000},
        "international_manager": {"gv_min": 12500},
    },
}


# =============================================================================
# PREDICTIVE ALERT ENGINE
# =============================================================================

class PredictiveAlertEngine:
    """
    Engine für intelligente Vorhersage-Alerts
    
    Usage:
        engine = PredictiveAlertEngine(company="herbalife")
        alerts = engine.analyze_contact(contact_data)
    """
    
    def __init__(self, company: str):
        self.company = company.lower()
        self.config = COMPANY_CONFIGS.get(self.company, {})
        self.rank_requirements = RANK_REQUIREMENTS.get(self.company, {})
    
    def analyze_contact(self, contact: Dict[str, Any]) -> List[PredictiveAlert]:
        """
        Analysiert einen Kontakt und generiert Alerts
        
        Args:
            contact: Kontaktdaten mit MLM-Feldern
            
        Returns:
            Liste von PredictiveAlert
        """
        alerts = []
        
        # 1. Re-Qualifikation Check (Herbalife)
        if self.config.get("has_requalification"):
            requal_alert = self._check_requalification(contact)
            if requal_alert:
                alerts.append(requal_alert)
        
        # 2. Rang-Verlust Risiko
        rank_alerts = self._check_rank_risk(contact)
        alerts.extend(rank_alerts)
        
        # 3. Churn/Inaktivität Risiko
        churn_alert = self._check_churn_risk(contact)
        if churn_alert:
            alerts.append(churn_alert)
        
        # 4. Inaktivität
        inactivity_alert = self._check_inactivity(contact)
        if inactivity_alert:
            alerts.append(inactivity_alert)
        
        # 5. Opportunities
        opportunity_alerts = self._check_opportunities(contact)
        alerts.extend(opportunity_alerts)
        
        # 6. Subscription/LRP/Autoship Status
        subscription_alert = self._check_subscription_status(contact)
        if subscription_alert:
            alerts.append(subscription_alert)
        
        # Sortiere nach Severity
        severity_order = {
            AlertSeverity.CRITICAL: 0,
            AlertSeverity.HIGH: 1,
            AlertSeverity.WARNING: 2,
            AlertSeverity.INFO: 3,
        }
        alerts.sort(key=lambda a: severity_order.get(a.severity, 99))
        
        return alerts
    
    def _check_requalification(self, contact: Dict[str, Any]) -> Optional[PredictiveAlert]:
        """Prüft Re-Qualifikation Status (Herbalife)"""
        
        if not contact.get("is_supervisor"):
            return None
        
        annual_vp = contact.get("annual_vp_accumulated", 0)
        required_vp = self.config.get("requalification_vp", 4000)
        
        # Berechne Deadline
        today = date.today()
        if today.month == 1:
            deadline = date(today.year, 1, 31)
        else:
            deadline = date(today.year + 1, 1, 31)
        
        days_remaining = (deadline - today).days
        vp_remaining = max(0, required_vp - annual_vp)
        
        if vp_remaining == 0:
            return None  # Bereits qualifiziert
        
        # Berechne Severity basierend auf Risiko
        if days_remaining <= 7 and vp_remaining > 500:
            severity = AlertSeverity.CRITICAL
            title = "🚨 RE-QUALIFIKATION KRITISCH!"
        elif days_remaining <= 30 and vp_remaining > 1000:
            severity = AlertSeverity.CRITICAL
            title = "⚠️ Re-Qualifikation gefährdet"
        elif days_remaining <= 60 and vp_remaining > 2000:
            severity = AlertSeverity.HIGH
            title = "Re-Qualifikation: Handeln erforderlich"
        elif days_remaining <= 90:
            severity = AlertSeverity.WARNING
            title = "Re-Qualifikation: Aufmerksamkeit nötig"
        else:
            severity = AlertSeverity.INFO
            title = "Re-Qualifikation Status"
        
        # Berechne benötigte VP pro Monat
        months_remaining = max(1, days_remaining // 30)
        vp_per_month = math.ceil(vp_remaining / months_remaining)
        
        return PredictiveAlert(
            type=AlertType.REQUALIFICATION,
            severity=severity,
            title=title,
            message=(
                f"Noch {vp_remaining:,.0f} VP bis {deadline.strftime('%d.%m.%Y')} "
                f"({days_remaining} Tage). "
                f"Benötigt: {vp_per_month:,.0f} VP/Monat"
            ),
            contact_id=contact.get("id"),
            contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
            action_required=severity in (AlertSeverity.CRITICAL, AlertSeverity.HIGH),
            suggested_action=(
                "Kontaktiere den Partner SOFORT und erstelle einen Aktionsplan. "
                "Bei Versäumnis verliert er den Supervisor-Status UND seine komplette Downline!"
            ) if severity == AlertSeverity.CRITICAL else (
                f"Plane {vp_per_month:,.0f} VP pro Monat ein. "
                "Fokussiere auf Retail-Verkäufe und Team-Aktivierung."
            ),
            deadline=deadline,
            confidence=0.95,
            data={
                "annual_vp": annual_vp,
                "required_vp": required_vp,
                "vp_remaining": vp_remaining,
                "days_remaining": days_remaining,
                "vp_per_month_needed": vp_per_month,
            }
        )
    
    def _check_rank_risk(self, contact: Dict[str, Any]) -> List[PredictiveAlert]:
        """Prüft Risiko für Rang-Verlust"""
        alerts = []
        
        current_rank = contact.get("rank", "").lower()
        if not current_rank or current_rank not in self.rank_requirements:
            return alerts
        
        requirements = self.rank_requirements[current_rank]
        
        # Prüfe verschiedene Metriken
        metrics_to_check = {
            "ov_min": ("ov", "OV"),
            "tv_min": ("tv", "TV"),
            "gv_min": ("gv", "GV"),
            "credits_min": ("credits", "Credits"),
            "team_credits_min": ("team_credits", "Team Credits"),
            "points_min": ("volume_points", "Punkte"),
            "legs_min": ("legs", "Beine"),
            "ro_min": ("ro", "RO-Punkte"),
        }
        
        for req_key, (field_name, display_name) in metrics_to_check.items():
            if req_key not in requirements:
                continue
            
            required = requirements[req_key]
            current = contact.get(field_name, 0)
            
            if current < required:
                deficit = required - current
                percentage = (current / required * 100) if required > 0 else 0
                
                if percentage < 50:
                    severity = AlertSeverity.CRITICAL
                elif percentage < 75:
                    severity = AlertSeverity.HIGH
                elif percentage < 90:
                    severity = AlertSeverity.WARNING
                else:
                    severity = AlertSeverity.INFO
                
                alerts.append(PredictiveAlert(
                    type=AlertType.RANK_LOSS,
                    severity=severity,
                    title=f"Rang-Verlust Risiko: {current_rank.title()}",
                    message=(
                        f"{display_name}: {current:,.0f} von {required:,.0f} "
                        f"({percentage:.0f}%). Noch {deficit:,.0f} benötigt."
                    ),
                    contact_id=contact.get("id"),
                    contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                    action_required=severity in (AlertSeverity.CRITICAL, AlertSeverity.HIGH),
                    suggested_action=f"Erhöhe {display_name} um {deficit:,.0f} bis Monatsende.",
                    confidence=0.85,
                    data={
                        "metric": field_name,
                        "current": current,
                        "required": required,
                        "deficit": deficit,
                        "percentage": percentage,
                    }
                ))
        
        return alerts
    
    def _check_churn_risk(self, contact: Dict[str, Any]) -> Optional[PredictiveAlert]:
        """Berechnet Churn-Risiko basierend auf mehreren Faktoren"""
        
        churn_factors = self.config.get("churn_risk_factors", [])
        if not churn_factors:
            return None
        
        risk_score = 0.0
        risk_details = []
        
        for factor_config in churn_factors:
            factor = factor_config["factor"]
            weight = factor_config["weight"]
            
            factor_score = self._calculate_factor_score(factor, contact)
            weighted_score = factor_score * weight
            risk_score += weighted_score
            
            if factor_score > 0.5:
                risk_details.append(f"{factor}: {factor_score:.0%}")
        
        # Normalisiere auf 0-100
        risk_score = min(100, risk_score * 100)
        
        if risk_score < 25:
            return None
        elif risk_score < 50:
            severity = AlertSeverity.INFO
            title = "Leichtes Churn-Risiko"
        elif risk_score < 70:
            severity = AlertSeverity.WARNING
            title = "Mittleres Churn-Risiko"
        elif risk_score < 85:
            severity = AlertSeverity.HIGH
            title = "Hohes Churn-Risiko"
        else:
            severity = AlertSeverity.CRITICAL
            title = "🚨 KRITISCHES Churn-Risiko"
        
        return PredictiveAlert(
            type=AlertType.CHURN_RISK,
            severity=severity,
            title=title,
            message=f"Churn-Wahrscheinlichkeit: {risk_score:.0f}%",
            contact_id=contact.get("id"),
            contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
            action_required=severity in (AlertSeverity.CRITICAL, AlertSeverity.HIGH),
            suggested_action=(
                "Sofort persönlich kontaktieren! Finde heraus, was los ist. "
                "Biete Unterstützung an und reaktiviere die Beziehung."
            ),
            confidence=risk_score / 100,
            data={
                "risk_score": risk_score,
                "risk_factors": risk_details,
            }
        )
    
    def _calculate_factor_score(self, factor: str, contact: Dict[str, Any]) -> float:
        """Berechnet Score für einen einzelnen Churn-Faktor (0-1)"""
        
        if factor == "vp_decline" or factor == "pv_decline":
            current = contact.get("vp", contact.get("pv", 0))
            previous = contact.get("vp_last_month", contact.get("pv_last_month", current))
            if previous > 0:
                decline = (previous - current) / previous
                return max(0, min(1, decline))
        
        elif factor == "days_inactive":
            last_activity = contact.get("last_activity_date")
            if last_activity:
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity).date()
                days = (date.today() - last_activity).days
                # 30 Tage = 0.5, 60 Tage = 1.0
                return min(1, days / 60)
        
        elif factor == "lrp_inactive":
            return 0.0 if contact.get("lrp_active", True) else 1.0
        
        elif factor == "subscription_inactive":
            return 0.0 if contact.get("subscription_active", True) else 1.0
        
        elif factor == "autoship_inactive":
            return 0.0 if contact.get("subscription_active", True) else 1.0
        
        elif factor == "team_decline" or factor == "gv_decline":
            current = contact.get("tv", contact.get("gv", contact.get("team_credits", 0)))
            previous = contact.get("tv_last_month", contact.get("gv_last_month", current))
            if previous > 0:
                decline = (previous - current) / previous
                return max(0, min(1, decline))
        
        elif factor == "no_retail_customers":
            customers = contact.get("retail_customers_count", 0)
            return 1.0 if customers < 5 else (0.5 if customers < 10 else 0.0)
        
        elif factor == "credits_decline" or factor == "points_decline":
            current = contact.get("credits", contact.get("volume_points", 0))
            previous = contact.get("credits_last_month", contact.get("points_last_month", current))
            if previous > 0:
                decline = (previous - current) / previous
                return max(0, min(1, decline))
        
        return 0.0
    
    def _check_inactivity(self, contact: Dict[str, Any]) -> Optional[PredictiveAlert]:
        """Prüft auf Inaktivität"""
        
        last_activity = contact.get("last_activity_date")
        if not last_activity:
            return None
        
        if isinstance(last_activity, str):
            last_activity = datetime.fromisoformat(last_activity).date()
        
        days_inactive = (date.today() - last_activity).days
        threshold = self.config.get("inactivity_threshold_days", 30)
        
        if days_inactive < threshold:
            return None
        
        if days_inactive >= 90:
            severity = AlertSeverity.CRITICAL
            title = "🔴 Lange inaktiv"
        elif days_inactive >= 60:
            severity = AlertSeverity.HIGH
            title = "Inaktiv seit 2 Monaten"
        else:
            severity = AlertSeverity.WARNING
            title = "Inaktivität festgestellt"
        
        return PredictiveAlert(
            type=AlertType.INACTIVITY,
            severity=severity,
            title=title,
            message=f"Letzte Aktivität vor {days_inactive} Tagen",
            contact_id=contact.get("id"),
            contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
            action_required=True,
            suggested_action=(
                "Reaktivierungs-Nachricht senden. "
                "Frage nach dem Grund und biete Hilfe an."
            ),
            confidence=0.9,
            data={"days_inactive": days_inactive}
        )
    
    def _check_opportunities(self, contact: Dict[str, Any]) -> List[PredictiveAlert]:
        """Prüft auf Opportunities (positive Alerts)"""
        alerts = []
        
        # Kurz vor nächstem Rang?
        current_rank = contact.get("rank", "").lower()
        rank_order = list(self.rank_requirements.keys())
        
        if current_rank in rank_order:
            current_index = rank_order.index(current_rank)
            if current_index < len(rank_order) - 1:
                next_rank = rank_order[current_index + 1]
                next_reqs = self.rank_requirements[next_rank]
                
                # Prüfe wie nah am nächsten Rang
                close_to_next = self._check_close_to_rank(contact, next_reqs)
                if close_to_next:
                    alerts.append(PredictiveAlert(
                        type=AlertType.OPPORTUNITY,
                        severity=AlertSeverity.INFO,
                        title=f"🎯 Nah am {next_rank.title()} Rang!",
                        message=close_to_next["message"],
                        contact_id=contact.get("id"),
                        contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                        suggested_action=close_to_next["action"],
                        confidence=0.8,
                        data=close_to_next["data"]
                    ))
        
        return alerts
    
    def _check_close_to_rank(
        self, 
        contact: Dict[str, Any], 
        requirements: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Prüft ob Kontakt nah am nächsten Rang ist"""
        
        metrics = {
            "ov_min": "ov",
            "tv_min": "tv",
            "gv_min": "gv",
            "credits_min": "credits",
            "points_min": "volume_points",
        }
        
        for req_key, field_name in metrics.items():
            if req_key not in requirements:
                continue
            
            required = requirements[req_key]
            current = contact.get(field_name, 0)
            
            if current >= required * 0.8 and current < required:
                remaining = required - current
                percentage = current / required * 100
                
                return {
                    "message": f"Nur noch {remaining:,.0f} {field_name.upper()} bis zum Aufstieg ({percentage:.0f}% erreicht)",
                    "action": f"Push für die letzten {remaining:,.0f} {field_name.upper()}!",
                    "data": {"current": current, "required": required, "remaining": remaining}
                }
        
        return None
    
    def _check_subscription_status(self, contact: Dict[str, Any]) -> Optional[PredictiveAlert]:
        """Prüft Subscription/LRP/Autoship Status"""
        
        # doTERRA LRP
        if self.company == "doterra":
            if not contact.get("lrp_active", True):
                return PredictiveAlert(
                    type=AlertType.INACTIVITY,
                    severity=AlertSeverity.WARNING,
                    title="LRP nicht aktiv",
                    message="Kein aktives Loyalty Rewards Program",
                    contact_id=contact.get("id"),
                    contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                    action_required=True,
                    suggested_action="LRP reaktivieren für kontinuierliches Einkommen",
                    confidence=0.95,
                )
        
        # Zinzino/PM Subscription
        if self.company in ("zinzino", "pm-international"):
            if not contact.get("subscription_active", True):
                return PredictiveAlert(
                    type=AlertType.INACTIVITY,
                    severity=AlertSeverity.WARNING,
                    title="Abo nicht aktiv",
                    message="Kein aktives Autoship/Abonnement",
                    contact_id=contact.get("id"),
                    contact_name=f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                    action_required=True,
                    suggested_action="Abo reaktivieren",
                    confidence=0.95,
                )
        
        return None


# =============================================================================
# BATCH ANALYSIS
# =============================================================================

def analyze_team(
    contacts: List[Dict[str, Any]], 
    company: str
) -> Dict[str, Any]:
    """
    Analysiert ein ganzes Team und gibt zusammengefasste Alerts zurück
    
    Returns:
        {
            "total_contacts": int,
            "alerts_by_severity": {...},
            "critical_alerts": [...],
            "at_risk_contacts": [...],
            "opportunities": [...]
        }
    """
    engine = PredictiveAlertEngine(company)
    
    all_alerts = []
    at_risk = []
    opportunities = []
    
    for contact in contacts:
        alerts = engine.analyze_contact(contact)
        all_alerts.extend(alerts)
        
        # Sammle kritische Kontakte
        critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
        if critical_alerts:
            at_risk.append({
                "contact": contact,
                "alerts": critical_alerts
            })
        
        # Sammle Opportunities
        opp_alerts = [a for a in alerts if a.type == AlertType.OPPORTUNITY]
        if opp_alerts:
            opportunities.append({
                "contact": contact,
                "opportunities": opp_alerts
            })
    
    # Gruppiere nach Severity
    alerts_by_severity = {
        "critical": len([a for a in all_alerts if a.severity == AlertSeverity.CRITICAL]),
        "high": len([a for a in all_alerts if a.severity == AlertSeverity.HIGH]),
        "warning": len([a for a in all_alerts if a.severity == AlertSeverity.WARNING]),
        "info": len([a for a in all_alerts if a.severity == AlertSeverity.INFO]),
    }
    
    return {
        "total_contacts": len(contacts),
        "total_alerts": len(all_alerts),
        "alerts_by_severity": alerts_by_severity,
        "critical_alerts": [a.to_dict() for a in all_alerts if a.severity == AlertSeverity.CRITICAL][:10],
        "at_risk_contacts": at_risk[:10],
        "opportunities": opportunities[:10],
    }


# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    "PredictiveAlertEngine",
    "PredictiveAlert",
    "AlertType",
    "AlertSeverity",
    "analyze_team",
    "COMPANY_CONFIGS",
    "RANK_REQUIREMENTS",
]

