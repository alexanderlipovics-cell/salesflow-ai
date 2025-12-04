"""
╔════════════════════════════════════════════════════════════════════════════╗
║  REFERRAL SERVICE                                                          ║
║  Empfehlungs-Maschine - Referral Reminder nach Sales                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from referral_service import ReferralService
    
    service = ReferralService(db)
    should_ask = service.should_ask_for_referral(contact)
    script = service.generate_referral_script(contact, product="doTERRA Öle")
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from supabase import Client
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# REFERRAL SCRIPTS TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

REFERRAL_SCRIPTS = {
    "after_sale": (
        "Hey {name}! 😊\n\n"
        "Ich freue mich riesig, dass du mit {product} so zufrieden bist! "
        "Das macht mich wirklich glücklich.\n\n"
        "Eine Frage: Kennst du noch jemanden, der von {product} profitieren könnte? "
        "Vielleicht jemand, der auch {benefit} sucht?\n\n"
        "Falls ja, würde ich mich riesig freuen, wenn du mir einen Tipp gibst. "
        "Kein Stress - nur wenn du jemanden kennst! 😊\n\n"
        "Herzliche Grüße,\n{user_name}"
    ),
    
    "follow_up": (
        "Hey {name}! 😊\n\n"
        "Wie läuft es denn so mit {product}? Bist du zufrieden?\n\n"
        "Falls du begeistert bist - eine Empfehlung wäre super! "
        "Kennst du jemanden, der auch {benefit} brauchen könnte?\n\n"
        "Kein Druck, nur wenn du magst! 😊\n\n"
        "Liebe Grüße,\n{user_name}"
    ),
    
    "specific_ask": (
        "Hey {name}! 😊\n\n"
        "Du hattest mal erwähnt, dass {referral_name} auch {problem} hat. "
        "Darf ich mich bei ihm/ihr melden und {product} vorstellen?\n\n"
        "Falls du magst, kannst du mich auch gerne vorstellen. "
        "Wie würdest du das am liebsten machen?\n\n"
        "Herzliche Grüße,\n{user_name}"
    ),
    
    "soft_ask": (
        "Hey {name}! 😊\n\n"
        "Kurze Frage: Falls du jemanden kennst, der auch Interesse an {product} hätte, "
        "würde ich mich riesig über einen Tipp freuen.\n\n"
        "Aber wirklich nur, wenn du jemanden kennst - kein Stress! 😊\n\n"
        "Liebe Grüße,\n{user_name}"
    ),
}


# ═══════════════════════════════════════════════════════════════════════════
# REFERRAL SERVICE
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ReferralScript:
    """Ein generiertes Referral-Skript"""
    script: str
    script_type: str  # "after_sale", "follow_up", "specific_ask", "soft_ask"
    timing_suggestion: str
    follow_up_days: int
    confidence_score: float  # 0-1
    reasoning: Optional[str] = None


class ReferralService:
    """
    Service für Referral/Empfehlungs-Management
    
    Usage:
        service = ReferralService(db)
        should_ask = service.should_ask_for_referral(contact)
        script = service.generate_referral_script(contact, product="doTERRA Öle")
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    def should_ask_for_referral(self, contact: Dict[str, Any]) -> bool:
        """
        Prüft ob nach Referral gefragt werden sollte
        
        Kriterien:
        - Kürzlich gekauft (innerhalb 30 Tagen)
        - Status "won" oder "customer"
        - Noch nicht gefragt (oder > 90 Tage her)
        - Zufriedenheit vorhanden (falls erfasst)
        
        Args:
            contact: Kontakt-Daten
            
        Returns:
            True wenn Referral-Frage angebracht ist
        """
        # Prüfe ob Kontakt Kunde ist
        pipeline_stage = contact.get("pipeline_stage", "").lower()
        contact_type = contact.get("contact_type", "").lower()
        
        is_customer = (
            pipeline_stage in ("won", "customer", "client") or
            contact_type in ("customer", "client")
        )
        
        if not is_customer:
            return False
        
        # Prüfe letztes Kaufdatum
        last_purchase = contact.get("last_purchase_date")
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            
            days_since_purchase = (date.today() - last_purchase).days
            
            # Zu alt (> 90 Tage) = nicht mehr relevant
            if days_since_purchase > 90:
                return False
            
            # Optimal: 3-30 Tage nach Kauf
            if 3 <= days_since_purchase <= 30:
                return True
        
        # Prüfe ob bereits gefragt wurde
        last_referral_ask = contact.get("last_referral_ask_date")
        if last_referral_ask:
            if isinstance(last_referral_ask, str):
                last_referral_ask = datetime.fromisoformat(last_referral_ask).date()
            
            days_since_ask = (date.today() - last_referral_ask).days
            
            # Nicht zu oft fragen (min. 90 Tage Abstand)
            if days_since_ask < 90:
                return False
        
        # Prüfe Zufriedenheit (falls erfasst)
        satisfaction_score = contact.get("satisfaction_score")
        if satisfaction_score is not None:
            # Nur bei hoher Zufriedenheit (>= 4 von 5)
            if satisfaction_score < 4:
                return False
        
        # Prüfe ob Kontakt aktiv ist
        last_contact = contact.get("last_contact_date")
        if last_contact:
            if isinstance(last_contact, str):
                last_contact = datetime.fromisoformat(last_contact).date()
            
            days_since_contact = (date.today() - last_contact).days
            
            # Zu lange inaktiv (> 60 Tage) = nicht fragen
            if days_since_contact > 60:
                return False
        
        return True
    
    def generate_referral_script(
        self, 
        contact: Dict[str, Any], 
        product: Optional[str] = None,
        script_type: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> ReferralScript:
        """
        Generiert ein Referral-Skript für einen Kontakt
        
        Args:
            contact: Kontakt-Daten
            product: Produktname (optional)
            script_type: Art des Skripts (optional, wird automatisch gewählt)
            user_name: Name des Users (optional)
            
        Returns:
            ReferralScript mit Skript und Metadaten
        """
        # Bestimme Script-Typ wenn nicht gegeben
        if not script_type:
            script_type = self._determine_script_type(contact)
        
        # Hole Template
        template = REFERRAL_SCRIPTS.get(script_type, REFERRAL_SCRIPTS["soft_ask"])
        
        # Bereite Variablen vor
        name = contact.get("first_name") or contact.get("name", "du")
        product_name = product or contact.get("last_product", "unserem Produkt")
        benefit = contact.get("primary_benefit") or "einer Lösung für sein/ihr Anliegen"
        referral_name = contact.get("referral_name") or "jemand"
        problem = contact.get("referral_problem") or "ein ähnliches Anliegen"
        user_display_name = user_name or "Dein Name"
        
        # Ersetze Platzhalter
        script = template.format(
            name=name,
            product=product_name,
            benefit=benefit,
            referral_name=referral_name,
            problem=problem,
            user_name=user_display_name,
        )
        
        # Bestimme Timing
        last_purchase = contact.get("last_purchase_date")
        timing_suggestion = "Sofort"
        follow_up_days = 7
        
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            
            days_since = (date.today() - last_purchase).days
            
            if days_since < 7:
                timing_suggestion = "Optimal: Jetzt (3-7 Tage nach Kauf)"
                follow_up_days = 7
            elif days_since < 30:
                timing_suggestion = "Gut: Innerhalb der nächsten Woche"
                follow_up_days = 14
            else:
                timing_suggestion = "Noch möglich: Innerhalb der nächsten 2 Wochen"
                follow_up_days = 30
        
        # Berechne Confidence Score
        confidence = self._calculate_confidence(contact, script_type)
        
        return ReferralScript(
            script=script,
            script_type=script_type,
            timing_suggestion=timing_suggestion,
            follow_up_days=follow_up_days,
            confidence_score=confidence,
            reasoning=self._get_reasoning(contact, script_type),
        )
    
    def _determine_script_type(self, contact: Dict[str, Any]) -> str:
        """Bestimmt den besten Script-Typ basierend auf Kontakt"""
        
        last_purchase = contact.get("last_purchase_date")
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            
            days_since = (date.today() - last_purchase).days
            
            # Sehr frisch (< 7 Tage) = after_sale
            if days_since < 7:
                return "after_sale"
            # 7-30 Tage = follow_up
            elif days_since < 30:
                return "follow_up"
        
        # Spezifischer Name erwähnt = specific_ask
        if contact.get("referral_name"):
            return "specific_ask"
        
        # Default = soft_ask
        return "soft_ask"
    
    def _calculate_confidence(self, contact: Dict[str, Any], script_type: str) -> float:
        """Berechnet Confidence Score (0-1) für Referral-Erfolg"""
        score = 0.5  # Base score
        
        # +0.2 wenn kürzlich gekauft
        last_purchase = contact.get("last_purchase_date")
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            days_since = (date.today() - last_purchase).days
            if days_since < 7:
                score += 0.2
            elif days_since < 30:
                score += 0.1
        
        # +0.15 wenn hohe Zufriedenheit
        satisfaction = contact.get("satisfaction_score")
        if satisfaction and satisfaction >= 4:
            score += 0.15
        
        # +0.1 wenn aktiv (letzter Kontakt < 30 Tage)
        last_contact = contact.get("last_contact_date")
        if last_contact:
            if isinstance(last_contact, str):
                last_contact = datetime.fromisoformat(last_contact).date()
            days_since = (date.today() - last_contact).days
            if days_since < 30:
                score += 0.1
        
        # +0.05 wenn spezifischer Name erwähnt
        if contact.get("referral_name"):
            score += 0.05
        
        return min(1.0, score)
    
    def _get_reasoning(self, contact: Dict[str, Any], script_type: str) -> str:
        """Gibt Begründung für Script-Auswahl zurück"""
        reasons = []
        
        last_purchase = contact.get("last_purchase_date")
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            days_since = (date.today() - last_purchase).days
            reasons.append(f"Kauf vor {days_since} Tagen")
        
        satisfaction = contact.get("satisfaction_score")
        if satisfaction:
            reasons.append(f"Zufriedenheit: {satisfaction}/5")
        
        if contact.get("referral_name"):
            reasons.append("Spezifischer Name erwähnt")
        
        return " | ".join(reasons) if reasons else "Standard-Referral"
    
    def track_referral_request(
        self, 
        contact_id: str, 
        asked: bool, 
        result: Optional[str] = None,
        script_type: Optional[str] = None
    ) -> bool:
        """
        Speichert ob nach Referral gefragt wurde und Ergebnis
        
        Args:
            contact_id: Kontakt ID
            asked: Wurde gefragt?
            result: Ergebnis ("yes", "no", "maybe", "later")
            script_type: Verwendetes Script
            
        Returns:
            True wenn erfolgreich gespeichert
        """
        try:
            update_data = {
                "last_referral_ask_date": datetime.utcnow().isoformat(),
                "referral_asked": asked,
            }
            
            if result:
                update_data["last_referral_result"] = result
            
            if script_type:
                update_data["last_referral_script_type"] = script_type
            
            # Update Contact
            self.db.table("contacts").update(update_data).eq("id", contact_id).execute()
            
            # Log Referral Request
            self.db.table("referral_requests").insert({
                "contact_id": contact_id,
                "asked_at": datetime.utcnow().isoformat(),
                "script_type": script_type,
                "result": result,
            }).execute()
            
            return True
        except Exception as e:
            logger.error(f"Error tracking referral request: {e}")
            return False
    
    def get_pending_referrals(
        self, 
        user_id: str, 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Gibt Kontakte zurück, wo Referral-Frage ansteht
        
        Args:
            user_id: User ID
            limit: Max. Anzahl Kontakte
            
        Returns:
            Liste von Kontakten mit Referral-Status
        """
        try:
            # Hole alle Kontakte des Users
            result = self.db.table("contacts").select("*").eq(
                "user_id", user_id
            ).execute()
            
            contacts = result.data if result.data else []
            
            # Filtere Kontakte die für Referral in Frage kommen
            pending = []
            for contact in contacts:
                if self.should_ask_for_referral(contact):
                    # Berechne Priority Score
                    priority_score = self._calculate_priority_score(contact)
                    
                    pending.append({
                        **contact,
                        "referral_priority": priority_score,
                        "referral_ready": True,
                    })
            
            # Sortiere nach Priority
            pending.sort(key=lambda x: x.get("referral_priority", 0), reverse=True)
            
            return pending[:limit]
        except Exception as e:
            logger.error(f"Error getting pending referrals: {e}")
            return []
    
    def _calculate_priority_score(self, contact: Dict[str, Any]) -> float:
        """Berechnet Priority Score für Referral (höher = wichtiger)"""
        score = 0.0
        
        # Kürzlich gekauft = höhere Priority
        last_purchase = contact.get("last_purchase_date")
        if last_purchase:
            if isinstance(last_purchase, str):
                last_purchase = datetime.fromisoformat(last_purchase).date()
            days_since = (date.today() - last_purchase).days
            
            if days_since < 7:
                score += 100
            elif days_since < 14:
                score += 80
            elif days_since < 30:
                score += 60
            elif days_since < 60:
                score += 40
        
        # Hohe Zufriedenheit = höhere Priority
        satisfaction = contact.get("satisfaction_score")
        if satisfaction:
            score += satisfaction * 10
        
        # Aktiv = höhere Priority
        last_contact = contact.get("last_contact_date")
        if last_contact:
            if isinstance(last_contact, str):
                last_contact = datetime.fromisoformat(last_contact).date()
            days_since = (date.today() - last_contact).days
            if days_since < 7:
                score += 20
            elif days_since < 30:
                score += 10
        
        return score


# ═══════════════════════════════════════════════════════════════════════════
# EXPORT
# ═══════════════════════════════════════════════════════════════════════════

__all__ = [
    "ReferralService",
    "ReferralScript",
    "REFERRAL_SCRIPTS",
]

