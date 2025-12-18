# backend/app/services/smart_suggestions.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

# Lead/LeadIntent liegen mittlerweile im Domain-Modul. Fallback-Stub, falls nicht vorhanden.
try:
    from app.domain.leads.models import Lead  # neues Domain-Modell
except ImportError:  # pragma: no cover - Fallback
    class Lead:  # type: ignore
        pass

try:
    # LeadIntent existiert aktuell nicht im neuen Domain-Modul – Stub für Abwärtskompatibilität
    from app.domain.leads.intent import LeadIntent  # type: ignore  # pragma: no cover
except Exception:  # pragma: no cover - Fallback
    LeadIntent = None  # type: ignore

class SmartSuggestionEngine:
    """
    Predictive AI für nächste Sales-Schritte.
    Nutzt eine heuristisch-„ML-artige" Logik, die du später gegen ein echtes Modell tauschen kannst.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_lead_with_intents(self, lead_id: int) -> tuple[Lead, Optional[LeadIntent]]:
        lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise ValueError("Lead not found")

        last_intent: Optional[LeadIntent] = None
        if LeadIntent:
            last_intent = (
                self.db.query(LeadIntent)
                .filter(LeadIntent.lead_id == lead_id)
                .order_by(LeadIntent.created_at.desc())
                .first()
            )
        return lead, last_intent

    def _days_since(self, dt: Optional[datetime]) -> Optional[float]:
        if not dt:
            return None
        return (datetime.utcnow().replace(tzinfo=None) - dt.replace(tzinfo=None)).days

    def predict_conversion_probability(self, lead_data: Dict[str, Any]) -> float:
        """
        'ML-basierte' Heuristik:
        - P/I/E Scores
        - Tage seit letztem Kontakt
        - Status
        Ergebnis: 0.0–1.0
        """
        p = lead_data.get("p_score", 50)
        i = lead_data.get("i_score", 30)
        e = lead_data.get("e_score", 20)
        days = lead_data.get("days_since_last_activity", 7)
        status = (lead_data.get("status") or "").lower()

        base = (p * 0.4 + i * 0.4 + e * 0.2) / 100.0

        if isinstance(days, (int, float)):
            if days > 30:
                base *= 0.5
            elif days > 14:
                base *= 0.7
            elif days <= 3:
                base *= 1.1

        if "won" in status:
            base = 1.0
        elif "lost" in status:
            base = 0.05

        return max(0.0, min(1.0, base))

    async def suggest_next_action(self, lead_id: int) -> Dict[str, Any]:
        """
        Analysiert Lead-Historie und schlägt optimale nächste Aktion vor.
        Output ist für UI/API designed.
        """
        lead, last_intent = self._get_lead_with_intents(lead_id)

        days_since_last = self._days_since(getattr(lead, "last_activity_at", None))
        lead_data = {
            "p_score": getattr(last_intent, "p_score", 50) if last_intent else 50,
            "i_score": getattr(last_intent, "i_score", 30) if last_intent else 30,
            "e_score": getattr(last_intent, "e_score", 20) if last_intent else 20,
            "days_since_last_activity": days_since_last if days_since_last is not None else 999,
            "status": getattr(lead, "status", "new"),
        }

        conversion_prob = self.predict_conversion_probability(lead_data)

        # Simple Entscheidungslogik
        action_type = "follow_up"
        channel = "whatsapp"
        reason = "Standard Follow-Up"

        status = lead_data["status"].lower()
        if status in ["new", "open"]:
            action_type = "first_contact"
            reason = "Lead ist neu – starte mit einem persönlichen Erstkontakt."
        elif status in ["contacted"]:
            if days_since_last is not None and days_since_last > 7:
                action_type = "reactivation"
                reason = "Letzter Kontakt liegt über einer Woche zurück – Reaktivierungsnachricht senden."
        elif status in ["proposal_sent", "angebot"]:
            action_type = "closing"
            channel = "call"
            reason = "Angebot wurde gesendet – nächster Schritt ist ein Abschluss-Gespräch per Call."
        elif status in ["won"]:
            action_type = "upsell"
            channel = "call"
            reason = "Lead ist gewonnen – plane ein Upsell-/Referral-Gespräch."
        elif status in ["lost"]:
            action_type = "none"
            channel = "none"
            reason = "Lead ist verloren – aktuell keine Aktion nötig."

        if days_since_last is not None and days_since_last > 30:
            action_type = "cold_reactivation"
            reason = "Lead ist lange inaktiv – kurze, lockere Reaktivierungsnachricht senden."

        return {
            "lead_id": lead_id,
            "suggested_action": action_type,
            "channel": channel,
            "reason": reason,
            "conversion_probability": conversion_prob,
            "meta": {
                "p_score": lead_data["p_score"],
                "i_score": lead_data["i_score"],
                "e_score": lead_data["e_score"],
                "days_since_last_activity": days_since_last,
                "status": lead_data["status"],
            },
        }
