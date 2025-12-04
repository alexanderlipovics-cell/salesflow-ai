"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CAMPAIGN SERVICE                                                           ║
║  Service für systematisches Outreach mit Templates                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import logging
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass

from ..llm_client import LLMClient, get_llm_client
from .campaign_templates import CAMPAIGN_TEMPLATES, SEQUENCES

logger = logging.getLogger(__name__)

# =============================================================================
# TYPES
# =============================================================================

IndustryType = Literal["immobilien", "mlm_leader", "hotel"]
ChannelType = Literal["email", "linkedin", "whatsapp", "instagram_dm"]
CampaignType = Literal["cold_outreach", "follow_up_sequence", "reactivation"]

@dataclass
class OutreachMessage:
    """Eine Outreach-Nachricht."""
    type: str
    subject: Optional[str]
    body: str
    channel: str
    confidence: float = 0.0


# =============================================================================
# CAMPAIGN SERVICE
# =============================================================================

class CampaignService:
    """
    Service für systematisches Outreach mit Campaign Templates.
    
    Usage:
        service = CampaignService()
        message = await service.generate_outreach(
            industry="immobilien",
            channel="email",
            contact_name="Max Mustermann",
            company_name="Mustermann GmbH"
        )
    """
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm = llm_client or get_llm_client()
    
    async def generate_outreach(
        self,
        industry: IndustryType,
        channel: ChannelType,
        contact_name: str,
        company_name: str,
        campaign_type: CampaignType = "cold_outreach",
        personalize: bool = True,
        additional_context: Optional[Dict] = None,
    ) -> OutreachMessage:
        """
        Generiert eine personalisierte Outreach-Nachricht basierend auf Template.
        
        Args:
            industry: Branche (immobilien, mlm_leader, hotel)
            channel: Kanal (email, linkedin, whatsapp, instagram_dm)
            contact_name: Name des Kontakts
            company_name: Name des Unternehmens
            campaign_type: Typ der Campaign (cold_outreach, follow_up_sequence, reactivation)
            personalize: Ob die Nachricht mit AI personalisiert werden soll
            additional_context: Zusätzlicher Kontext (z.B. your_name, topic, etc.)
            
        Returns:
            OutreachMessage mit subject, body, channel, confidence
        """
        # Template auswählen
        template_config = CAMPAIGN_TEMPLATES.get(campaign_type, {}).get(industry, {}).get(channel)
        
        if not template_config:
            logger.warning(f"No template found for {campaign_type}/{industry}/{channel}")
            # Fallback
            return OutreachMessage(
                type=campaign_type,
                subject="Kurze Frage...",
                body=f"Hallo {contact_name}, ich wollte mich kurz melden.",
                channel=channel,
                confidence=0.3,
            )
        
        # Template-Text holen
        if isinstance(template_config, dict):
            template_body = template_config.get("body", "")
            template_subject = template_config.get("subject")
        else:
            template_body = template_config
            template_subject = None
        
        # Basis-Variablen für Template-Formatierung
        template_vars = {
            "contact_name": contact_name,
            "company_name": company_name,
            "your_name": additional_context.get("your_name", "Dein Name") if additional_context else "Dein Name",
        }
        
        # Zusätzliche Variablen aus context
        if additional_context:
            template_vars.update(additional_context)
        
        # Template formatieren
        try:
            formatted_body = template_body.format(**template_vars)
            formatted_subject = template_subject.format(**template_vars) if template_subject else None
        except KeyError as e:
            logger.error(f"Missing template variable: {e}")
            formatted_body = template_body  # Fallback ohne Formatierung
            formatted_subject = template_subject
        
        # Personalisierung mit AI (optional)
        if personalize:
            try:
                personalized = await self._personalize_message(
                    formatted_body,
                    contact_name,
                    company_name,
                    industry,
                    channel,
                    additional_context,
                )
                formatted_body = personalized
                
                # Subject auch personalisieren falls vorhanden
                if formatted_subject:
                    personalized_subject = await self._personalize_subject(
                        formatted_subject,
                        contact_name,
                        company_name,
                        industry,
                        additional_context,
                    )
                    formatted_subject = personalized_subject
            except Exception as e:
                logger.error(f"Error personalizing message: {e}")
                # Verwende unpersonalisiertes Template als Fallback
        
        # Confidence berechnen
        confidence = self._calculate_confidence(campaign_type, industry, channel, personalize)
        
        return OutreachMessage(
            type=campaign_type,
            subject=formatted_subject,
            body=formatted_body,
            channel=channel,
            confidence=confidence,
        )
    
    async def _personalize_message(
        self,
        base_message: str,
        contact_name: str,
        company_name: str,
        industry: str,
        channel: str,
        additional_context: Optional[Dict],
    ) -> str:
        """Personalisierte Version der Nachricht mit AI generieren."""
        system_prompt = """Du bist ein Experte für personalisierte Sales-Nachrichten.
Deine Aufgabe ist es, eine gegebene Nachricht noch persönlicher und relevanter zu machen, ohne die Kernaussage zu ändern.

WICHTIG:
- Behalte die Struktur und den Ton bei
- Mache die Nachricht persönlicher und relevanter
- Verwende natürliche Sprache
- Keine langen Erklärungen - nur die Nachricht selbst"""
        
        context_parts = [
            f"Kontaktname: {contact_name}",
            f"Unternehmen: {company_name}",
            f"Branche: {industry}",
            f"Kanal: {channel}",
        ]
        
        if additional_context:
            for key, value in additional_context.items():
                if key != "your_name":  # your_name bereits oben
                    context_parts.append(f"{key}: {value}")
        
        context = "\n".join(context_parts)
        
        user_prompt = f"""Personalisiere folgende Nachricht für den Kontakt:

{context}

Original-Nachricht:
{base_message}

Personalisierte Version (nur die Nachricht, keine Erklärungen):"""
        
        try:
            personalized = await self.llm.generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                temperature=0.7,
                max_tokens=300,
            )
            
            # Cleanup
            personalized = personalized.strip()
            if personalized.startswith('"') and personalized.endswith('"'):
                personalized = personalized[1:-1]
            
            return personalized
        except Exception as e:
            logger.error(f"Error in AI personalization: {e}")
            return base_message  # Fallback auf Original
    
    async def _personalize_subject(
        self,
        base_subject: str,
        contact_name: str,
        company_name: str,
        industry: str,
        additional_context: Optional[Dict],
    ) -> str:
        """Personalisierte Version des Email-Subjects."""
        system_prompt = """Du bist ein Experte für E-Mail-Marketing.
Erstelle einen ansprechenden, personalisierten E-Mail-Betreff, der Aufmerksamkeit erregt.

WICHTIG:
- Max. 50 Zeichen
- Prägnant und ansprechend
- Keine langen Erklärungen - nur der Betreff"""
        
        user_prompt = f"""Personalisiere folgenden E-Mail-Betreff:

Original: {base_subject}
Kontakt: {contact_name}
Unternehmen: {company_name}

Personalisierter Betreff (nur der Betreff selbst):"""
        
        try:
            personalized = await self.llm.generate(
                system_prompt=system_prompt,
                user_message=user_prompt,
                temperature=0.5,
                max_tokens=30,
            )
            
            personalized = personalized.strip().replace('"', '').replace("'", "")
            # Nur erste Zeile nehmen
            personalized = personalized.split('\n')[0]
            if len(personalized) > 50:
                personalized = personalized[:47] + "..."
            
            return personalized
        except Exception as e:
            logger.error(f"Error personalizing subject: {e}")
            return base_subject
    
    def _calculate_confidence(
        self,
        campaign_type: str,
        industry: str,
        channel: str,
        personalized: bool,
    ) -> float:
        """Berechnet Confidence-Score für die Nachricht."""
        base_confidence = 0.6
        
        # Höhere Confidence für bestimmte Campaign-Types
        if campaign_type == "cold_outreach":
            base_confidence = 0.65
        elif campaign_type == "follow_up_sequence":
            base_confidence = 0.7
        
        # Höhere Confidence für Email (mehr Raum für Personalisierung)
        if channel == "email":
            base_confidence += 0.1
        
        # Höhere Confidence wenn personalisiert
        if personalized:
            base_confidence += 0.15
        
        return min(0.95, round(base_confidence, 2))
    
    async def get_sequence(self, sequence_type: str) -> List[Dict]:
        """
        Gibt eine Sequenz von Messages mit Timing zurück.
        
        Args:
            sequence_type: Typ der Sequenz (z.B. "cold_outreach", "warm_introduction")
            
        Returns:
            Liste von Message-Definitionen mit day, type, channel, description
        """
        sequence = SEQUENCES.get(sequence_type, [])
        return sequence

