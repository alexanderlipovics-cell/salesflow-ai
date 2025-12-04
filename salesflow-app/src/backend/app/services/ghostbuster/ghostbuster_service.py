"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GHOSTBUSTER SERVICE                                                       ║
║  Re-Engagement Service für inaktive Kontakte                              ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, Literal
from dataclasses import dataclass
import logging

from ..llm_client import LLMClient, get_llm_client

logger = logging.getLogger(__name__)

# =============================================================================
# TYPES
# =============================================================================

TemplateType = Literal[
    "pattern_interrupt",
    "value_first",
    "social_proof",
    "direct_question",
    "breakup",
    "auto"
]

Channel = Literal["whatsapp", "email", "sms", "instagram", "linkedin"]


@dataclass
class ReEngagementResult:
    """Resultat einer Re-Engagement Generation."""
    subject: Optional[str] = None
    body: str = ""
    channel_suggestion: Channel = "whatsapp"
    template_type: str = ""
    confidence: float = 0.0


# =============================================================================
# TEMPLATES
# =============================================================================

TEMPLATE_SYSTEM_PROMPTS = {
    "pattern_interrupt": """Du bist ein Experte für Re-Engagement in Sales. 
Erstelle eine überraschende, auffällige Nachricht, die den Kontakt aus seiner Komfortzone holt und Aufmerksamkeit erregt.
Die Nachricht sollte:
- Unerwartet und überraschend sein
- Neugier wecken
- Keinen Druck ausüben
- Kurz und knackig sein (max. 2-3 Sätze)
- Personalisiert auf den Kontaktnamen und Kontext eingehen

TON: Freundlich, aber mit einem Hauch von Witz und Überraschung.""",

    "value_first": """Du bist ein Experte für Re-Engagement in Sales.
Erstelle eine Nachricht, die sofort Mehrwert bietet - ohne etwas zu verlangen.
Die Nachricht sollte:
- Einen konkreten, kostenlosen Mehrwert bieten (Tipp, Resource, Insight)
- Keine Verkaufsintention zeigen
- Zeigen, dass du an den Kontakt denkst
- Kurz und wertvoll sein (max. 3-4 Sätze)
- Personalisiert sein

TON: Wertschätzend, hilfsbereit, kein Verkaufsdruck.""",

    "social_proof": """Du bist ein Experte für Re-Engagement in Sales.
Erstelle eine Nachricht, die eine Erfolgsgeschichte oder Social Proof teilt.
Die Nachricht sollte:
- Eine relevante Erfolgsgeschichte/Erfolg teilen
- Zeigen, dass andere Erfolg haben
- Leicht neugierig machen ("Was wenn...")
- Keinen direkten Verkaufsdruck ausüben
- Kurz sein (max. 3-4 Sätze)
- Personalisiert sein

TON: Begeistert, inspirierend, aber nicht aufdringlich.""",

    "direct_question": """Du bist ein Experte für Re-Engagement in Sales.
Erstelle eine einfache Ja/Nein Frage, die leicht zu beantworten ist.
Die Nachricht sollte:
- Eine einfache, konkrete Frage stellen
- Leicht zu beantworten sein (Ja/Nein oder 1-2 Worte)
- Keinen Druck ausüben
- Zeigen, dass du Feedback wertschätzt
- Maximal 2-3 Sätze lang sein
- Personalisiert sein

TON: Offen, freundlich, respektvoll.""",

    "breakup": """Du bist ein Experte für Re-Engagement in Sales.
Erstelle eine "Letzte Chance" Nachricht - würdevolles Verabschieden mit offener Tür.
Die Nachricht sollte:
- Zeigen, dass du verstehst, wenn der Kontakt nicht interessiert ist
- Würdevoll sein - keine Bitterkeit
- Die Tür offen lassen für zukünftigen Kontakt
- Kurz und klar sein (max. 3-4 Sätze)
- Keinen Druck ausüben
- Personalisiert sein

TON: Respektvoll, erwachsen, verständnisvoll, aber offen für Zukunft."""
}

# =============================================================================
# TEMPLATE SELECTION LOGIC
# =============================================================================

def select_template(days_inactive: int, template_type: TemplateType = "auto") -> str:
    """Wählt das passende Template basierend auf Tagen inaktiv."""
    if template_type != "auto":
        return template_type
    
    # Automatische Auswahl basierend auf Tagen
    if days_inactive <= 7:
        return "pattern_interrupt"
    elif days_inactive <= 14:
        return "value_first"
    elif days_inactive <= 30:
        return "social_proof"
    elif days_inactive <= 60:
        return "direct_question"
    else:
        return "breakup"


# =============================================================================
# CHANNEL SUGGESTION
# =============================================================================

def suggest_channel(days_inactive: int, last_topic: str) -> Channel:
    """Schlägt den besten Kanal basierend auf Kontext vor."""
    # Für längere Inaktivität: persönlichere Kanäle
    if days_inactive > 30:
        return "whatsapp"
    elif days_inactive > 14:
        return "email"
    else:
        return "whatsapp"


# =============================================================================
# GHOSTBUSTER SERVICE
# =============================================================================

class GhostbusterService:
    """
    Service für Re-Engagement von inaktiven Kontakten.
    
    Usage:
        service = GhostbusterService()
        result = await service.generate_reengagement(
            contact_name="Max Mustermann",
            days_inactive=15,
            last_topic="Produktpräsentation",
            template_type="auto"
        )
    """
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm = llm_client or get_llm_client()
    
    async def generate_reengagement(
        self,
        contact_name: str,
        days_inactive: int,
        last_topic: str,
        template_type: TemplateType = "auto",
        additional_context: Optional[dict] = None,
    ) -> ReEngagementResult:
        """
        Generiert eine personalisierte Re-Engagement Nachricht.
        
        Args:
            contact_name: Name des Kontakts
            days_inactive: Tage seit letztem Kontakt
            last_topic: Letztes Gesprächsthema
            template_type: Template-Typ (oder "auto" für automatische Auswahl)
            additional_context: Zusätzlicher Kontext (z.B. Branche, Produkt)
            
        Returns:
            ReEngagementResult mit subject, body, channel_suggestion
        """
        # Template auswählen
        selected_template = select_template(days_inactive, template_type)
        
        # System Prompt holen
        system_prompt = TEMPLATE_SYSTEM_PROMPTS.get(
            selected_template,
            TEMPLATE_SYSTEM_PROMPTS["value_first"]
        )
        
        # User Prompt bauen
        context_parts = [
            f"Kontaktname: {contact_name}",
            f"Tage inaktiv: {days_inactive}",
            f"Letztes Thema: {last_topic}",
        ]
        
        if additional_context:
            for key, value in additional_context.items():
                context_parts.append(f"{key}: {value}")
        
        context = "\n".join(context_parts)
        
        user_prompt = f"""Erstelle eine Re-Engagement Nachricht mit folgenden Informationen:

{context}

WICHTIG:
- Schreibe NUR die Nachricht selbst (keine Erklärungen)
- Für WhatsApp/Instagram: Max. 2-3 Sätze, sehr kurz
- Für Email: Max. 4-5 Sätze
- Sei authentisch und persönlich
- Verwende den Kontaktnamen direkt
- Keine Emojis im ersten Satz (optional später)

Nachricht:"""
        
        # Nachricht generieren
        try:
            message = await self.llm.generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                temperature=0.8,  # Etwas kreativer
                max_tokens=200,
            )
            
            # Cleanup: Entferne mögliche Erklärungen oder Formatierung
            message = message.strip()
            # Entferne Anführungszeichen am Anfang/Ende falls vorhanden
            if message.startswith('"') and message.endswith('"'):
                message = message[1:-1]
            if message.startswith("'") and message.endswith("'"):
                message = message[1:-1]
            
            # Kanal-Vorschlag
            channel = suggest_channel(days_inactive, last_topic)
            
            # Subject für Email
            subject = None
            if channel == "email":
                subject = await self._generate_email_subject(contact_name, message, selected_template)
            
            # Confidence basierend auf Template und Tagen
            confidence = self._calculate_confidence(days_inactive, selected_template)
            
            return ReEngagementResult(
                subject=subject,
                body=message,
                channel_suggestion=channel,
                template_type=selected_template,
                confidence=confidence,
            )
            
        except Exception as e:
            logger.error(f"Fehler bei Re-Engagement Generation: {e}", exc_info=True)
            # Fallback Nachricht
            return ReEngagementResult(
                body=f"Hallo {contact_name}, ich hoffe es geht dir gut! Hast du Zeit für einen kurzen Austausch?",
                channel_suggestion="whatsapp",
                template_type=selected_template,
                confidence=0.3,
            )
    
    async def _generate_email_subject(
        self, contact_name: str, message: str, template_type: str
    ) -> str:
        """Generiert einen Email-Betreff."""
        try:
            prompt = f"""Erstelle einen kurzen, ansprechenden Email-Betreff für folgende Nachricht:

Nachricht:
{message}

Kontakt: {contact_name}
Template: {template_type}

WICHTIG:
- Max. 50 Zeichen
- Auffällig aber nicht spammy
- Personalisiert wenn möglich
- Keine Emojis

Betreff:"""
            
            subject = await self.llm.generate(
                system_prompt="Du bist ein Experte für effektive Email-Betreffzeilen in Sales.",
                user_message=prompt,
                temperature=0.7,
                max_tokens=20,
            )
            
            return subject.strip().strip('"').strip("'")
            
        except Exception:
            # Fallback
            return f"Kurzcheck - {contact_name}"
    
    def _calculate_confidence(self, days_inactive: int, template_type: str) -> float:
        """Berechnet Confidence-Score für die Nachricht."""
        # Je kürzer die Inaktivität, desto höher die Confidence
        base_confidence = max(0.3, 1.0 - (days_inactive / 100))
        
        # Template-Adjustments
        template_weights = {
            "pattern_interrupt": 0.85,
            "value_first": 0.80,
            "social_proof": 0.75,
            "direct_question": 0.70,
            "breakup": 0.50,
        }
        
        template_weight = template_weights.get(template_type, 0.70)
        
        return min(0.95, base_confidence * template_weight)


# =============================================================================
# HELPER
# =============================================================================

def get_ghostbuster_service() -> GhostbusterService:
    """Factory Function für GhostbusterService."""
    return GhostbusterService()

