"""
Chat Import Service - Extrahiert Leads aus kopierten Chat-Verläufen

Networker kopieren WhatsApp/Telegram/Instagram Chats und wir extrahieren:
- Namen
- Telefonnummern
- Letzte Nachrichten
- Sentiment (interessiert/neutral/kalt)
- Vorgeschlagene nächste Aktion
"""

import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ChatPlatform(str, Enum):
    """Erkannte Chat-Plattformen"""
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    SMS = "sms"
    UNKNOWN = "unknown"


class LeadSentiment(str, Enum):
    """Sentiment-Analyse des Leads"""
    HOT = "hot"         # Sehr interessiert
    WARM = "warm"       # Offen/Neugierig
    NEUTRAL = "neutral" # Unklar
    COLD = "cold"       # Desinteressiert
    GHOST = "ghost"     # Keine Antwort


class SuggestedAction(str, Enum):
    """Vorgeschlagene nächste Aktion"""
    IMMEDIATE_FOLLOWUP = "immediate_followup"  # Sofort antworten
    SEND_INFO = "send_info"                    # Mehr Infos senden
    SCHEDULE_CALL = "schedule_call"            # Call anbieten
    WAIT_AND_SEE = "wait_and_see"              # Abwarten
    REACTIVATE = "reactivate"                  # Reaktivierung
    ARCHIVE = "archive"                        # Archivieren


@dataclass
class ExtractedLead:
    """Ein aus dem Chat extrahierter Lead"""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    platform: ChatPlatform = ChatPlatform.UNKNOWN
    last_message: Optional[str] = None
    last_message_date: Optional[datetime] = None
    message_count: int = 0
    is_incoming: bool = True  # True = Lead hat geschrieben
    sentiment: LeadSentiment = LeadSentiment.NEUTRAL
    suggested_action: SuggestedAction = SuggestedAction.WAIT_AND_SEE
    confidence_score: float = 0.5
    raw_data: Optional[str] = None


class ChatImportService:
    """
    Service zum Importieren und Parsen von Chat-Verläufen.
    
    Unterstützte Formate:
    - WhatsApp Export (Standard-Format)
    - Instagram DM Copy
    - Telegram Export
    - Einfache Kontakt-Listen (Name, Telefon)
    """
    
    # WhatsApp Message Pattern: [DD.MM.YY, HH:MM:SS] Name: Message
    WHATSAPP_PATTERN = re.compile(
        r'\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–]?\s*([^:]+):\s*(.+)',
        re.MULTILINE
    )
    
    # Telefonnummer Pattern
    PHONE_PATTERN = re.compile(
        r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,10}'
    )
    
    # Email Pattern
    EMAIL_PATTERN = re.compile(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    )
    
    # Positive Sentiment Keywords (Deutsch)
    POSITIVE_KEYWORDS = [
        'interessiert', 'spannend', 'erzähl', 'mehr', 'klingt gut',
        'wann', 'wie', 'treffen', 'call', 'telefonieren', 'super',
        'gerne', 'ja', 'ok', 'perfekt', 'top', 'cool', 'nice',
        'neugierig', 'hört sich gut an', 'bin dabei', 'warum nicht',
        'lass uns', 'zeig mir', 'schick mal', 'info', 'details',
        '👍', '🔥', '💪', '✅', '😊', '🙌', '❤️'
    ]
    
    # Negative Sentiment Keywords (Deutsch)
    NEGATIVE_KEYWORDS = [
        'kein interesse', 'keine zeit', 'nein', 'nicht',
        'lass mich', 'nerv', 'spam', 'aufhören', 'blockier',
        'mlm', 'pyramide', 'scam', 'betrug', 'abzocke',
        'bitte nicht', 'hör auf', 'niemals', 'vergiss es',
        '👎', '🙄', '😤', '❌', '🚫'
    ]
    
    # Objection Keywords
    OBJECTION_KEYWORDS = [
        'keine zeit', 'kein geld', 'muss überlegen', 'später',
        'nicht jetzt', 'bin busy', 'vielleicht', 'mal sehen',
        'weiß nicht', 'unsicher', 'überleg', 'partner fragen',
        'frau fragen', 'mann fragen'
    ]
    
    def __init__(self):
        """Initialisiert den Chat Import Service"""
        pass
    
    def detect_platform(self, raw_text: str) -> ChatPlatform:
        """
        Erkennt die Chat-Plattform basierend auf dem Format.
        
        Args:
            raw_text: Der rohe Chat-Text
            
        Returns:
            Die erkannte Plattform
        """
        text_lower = raw_text.lower()
        
        # WhatsApp Indikatoren
        if any(x in text_lower for x in ['whatsapp', 'end-to-end', '[', '] -']):
            return ChatPlatform.WHATSAPP
        
        # WhatsApp Format Check
        if self.WHATSAPP_PATTERN.search(raw_text):
            return ChatPlatform.WHATSAPP
        
        # Telegram Indikatoren
        if 'telegram' in text_lower or 'exported from' in text_lower:
            return ChatPlatform.TELEGRAM
        
        # Instagram Indikatoren
        if any(x in text_lower for x in ['instagram', '@', 'liked a message', 'reacted']):
            return ChatPlatform.INSTAGRAM
        
        # Facebook Messenger
        if any(x in text_lower for x in ['messenger', 'facebook']):
            return ChatPlatform.FACEBOOK
        
        return ChatPlatform.UNKNOWN
    
    def parse_whatsapp_chat(self, raw_text: str) -> List[Dict[str, Any]]:
        """
        Parst einen WhatsApp Chat Export.
        
        Args:
            raw_text: Der exportierte Chat-Text
            
        Returns:
            Liste von Nachrichten mit Metadaten
        """
        messages = []
        matches = self.WHATSAPP_PATTERN.findall(raw_text)
        
        for match in matches:
            date_str, time_str, sender, content = match
            
            # Datum parsen
            try:
                # Versuche verschiedene Datums-Formate
                for fmt in ['%d.%m.%y', '%d.%m.%Y', '%d/%m/%y', '%d/%m/%Y']:
                    try:
                        date = datetime.strptime(date_str.strip(), fmt)
                        break
                    except ValueError:
                        continue
                else:
                    date = datetime.now()
            except Exception:
                date = datetime.now()
            
            messages.append({
                'date': date,
                'time': time_str.strip(),
                'sender': sender.strip(),
                'content': content.strip(),
            })
        
        return messages
    
    def extract_contacts_from_messages(
        self,
        messages: List[Dict[str, Any]],
        my_name: Optional[str] = None
    ) -> Dict[str, ExtractedLead]:
        """
        Extrahiert einzigartige Kontakte aus Nachrichten.
        
        Args:
            messages: Liste von geparsten Nachrichten
            my_name: Der eigene Name (um sich selbst auszuschließen)
            
        Returns:
            Dict von Namen zu ExtractedLead
        """
        contacts: Dict[str, ExtractedLead] = {}
        
        for msg in messages:
            sender = msg['sender']
            
            # Eigene Nachrichten überspringen
            if my_name and sender.lower() == my_name.lower():
                continue
            
            # System-Nachrichten überspringen
            if any(x in sender.lower() for x in ['system', 'info', 'notification']):
                continue
            
            # Kontakt erstellen oder aktualisieren
            if sender not in contacts:
                contacts[sender] = ExtractedLead(
                    name=sender,
                    platform=ChatPlatform.WHATSAPP,
                    message_count=0,
                )
            
            lead = contacts[sender]
            lead.message_count += 1
            
            # Letzte Nachricht aktualisieren
            if not lead.last_message_date or msg['date'] > lead.last_message_date:
                lead.last_message = msg['content']
                lead.last_message_date = msg['date']
                lead.is_incoming = True
            
            # Telefonnummer extrahieren
            if not lead.phone:
                phone_match = self.PHONE_PATTERN.search(msg['content'])
                if phone_match:
                    lead.phone = phone_match.group()
            
            # Email extrahieren
            if not lead.email:
                email_match = self.EMAIL_PATTERN.search(msg['content'])
                if email_match:
                    lead.email = email_match.group()
        
        return contacts
    
    def analyze_sentiment(self, lead: ExtractedLead) -> ExtractedLead:
        """
        Analysiert das Sentiment eines Leads basierend auf den Nachrichten.
        
        Args:
            lead: Der zu analysierende Lead
            
        Returns:
            Lead mit aktualisiertem Sentiment
        """
        if not lead.last_message:
            lead.sentiment = LeadSentiment.NEUTRAL
            return lead
        
        message_lower = lead.last_message.lower()
        
        # Positive Keywords zählen
        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in message_lower)
        
        # Negative Keywords zählen
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in message_lower)
        
        # Objection Keywords zählen
        objection_count = sum(1 for kw in self.OBJECTION_KEYWORDS if kw in message_lower)
        
        # Ghost Detection: Alte letzte Nachricht vom Lead
        if lead.last_message_date:
            days_since = (datetime.now() - lead.last_message_date).days
            if days_since > 7 and lead.is_incoming:
                lead.sentiment = LeadSentiment.GHOST
                lead.confidence_score = 0.8
                return lead
        
        # Sentiment bestimmen
        if negative_count > positive_count:
            lead.sentiment = LeadSentiment.COLD
            lead.confidence_score = min(0.9, 0.5 + negative_count * 0.1)
        elif positive_count > 2:
            lead.sentiment = LeadSentiment.HOT
            lead.confidence_score = min(0.95, 0.6 + positive_count * 0.1)
        elif positive_count > 0:
            lead.sentiment = LeadSentiment.WARM
            lead.confidence_score = 0.7
        elif objection_count > 0:
            lead.sentiment = LeadSentiment.WARM
            lead.confidence_score = 0.6
        else:
            lead.sentiment = LeadSentiment.NEUTRAL
            lead.confidence_score = 0.5
        
        return lead
    
    def suggest_action(self, lead: ExtractedLead) -> ExtractedLead:
        """
        Schlägt die beste nächste Aktion für einen Lead vor.
        
        Args:
            lead: Der Lead
            
        Returns:
            Lead mit vorgeschlagener Aktion
        """
        # Basierend auf Sentiment und Zeit
        if lead.sentiment == LeadSentiment.HOT:
            lead.suggested_action = SuggestedAction.SCHEDULE_CALL
        elif lead.sentiment == LeadSentiment.WARM:
            lead.suggested_action = SuggestedAction.SEND_INFO
        elif lead.sentiment == LeadSentiment.GHOST:
            lead.suggested_action = SuggestedAction.REACTIVATE
        elif lead.sentiment == LeadSentiment.COLD:
            lead.suggested_action = SuggestedAction.ARCHIVE
        else:
            # Neutral - abhängig von der Zeit seit letzter Nachricht
            if lead.last_message_date:
                days_since = (datetime.now() - lead.last_message_date).days
                if days_since < 1:
                    lead.suggested_action = SuggestedAction.IMMEDIATE_FOLLOWUP
                elif days_since < 3:
                    lead.suggested_action = SuggestedAction.SEND_INFO
                else:
                    lead.suggested_action = SuggestedAction.WAIT_AND_SEE
            else:
                lead.suggested_action = SuggestedAction.SEND_INFO
        
        return lead
    
    def parse_simple_list(self, raw_text: str) -> List[ExtractedLead]:
        """
        Parst eine einfache Kontakt-Liste (z.B. Copy-Paste aus Excel).
        
        Unterstützte Formate:
        - "Name, Telefon"
        - "Name | Telefon"
        - "Name\\tTelefon"
        - "Name - Telefon"
        
        Args:
            raw_text: Der rohe Text
            
        Returns:
            Liste von extrahierten Leads
        """
        leads = []
        lines = raw_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Verschiedene Trennzeichen versuchen
            parts = None
            for separator in [',', '|', '\t', ' - ', ';']:
                if separator in line:
                    parts = [p.strip() for p in line.split(separator)]
                    break
            
            if not parts:
                # Nur Name oder einzelnes Element
                parts = [line]
            
            # Lead erstellen
            lead = ExtractedLead(
                name=parts[0] if parts else "Unbekannt",
                platform=ChatPlatform.UNKNOWN,
            )
            
            # Telefon und Email suchen
            for part in parts[1:]:
                if self.PHONE_PATTERN.match(part):
                    lead.phone = part
                elif self.EMAIL_PATTERN.match(part):
                    lead.email = part
            
            # Sentiment auf Neutral setzen (keine Historie)
            lead.sentiment = LeadSentiment.NEUTRAL
            lead.suggested_action = SuggestedAction.SEND_INFO
            lead.confidence_score = 0.5
            
            leads.append(lead)
        
        return leads
    
    def import_chat(
        self,
        raw_text: str,
        my_name: Optional[str] = None
    ) -> List[ExtractedLead]:
        """
        Haupt-Import-Funktion: Erkennt Format und extrahiert Leads.
        
        Args:
            raw_text: Der zu importierende Text
            my_name: Der eigene Name (optional, für WhatsApp)
            
        Returns:
            Liste von extrahierten und analysierten Leads
        """
        logger.info(f"Importiere Chat mit {len(raw_text)} Zeichen")
        
        # Plattform erkennen
        platform = self.detect_platform(raw_text)
        logger.info(f"Erkannte Plattform: {platform}")
        
        leads: List[ExtractedLead] = []
        
        if platform == ChatPlatform.WHATSAPP:
            # WhatsApp Chat parsen
            messages = self.parse_whatsapp_chat(raw_text)
            logger.info(f"Gefunden: {len(messages)} Nachrichten")
            
            contacts = self.extract_contacts_from_messages(messages, my_name)
            leads = list(contacts.values())
        else:
            # Als einfache Liste behandeln
            leads = self.parse_simple_list(raw_text)
        
        # Jeden Lead analysieren
        for lead in leads:
            lead.platform = platform
            lead = self.analyze_sentiment(lead)
            lead = self.suggest_action(lead)
        
        # Nach Priorität sortieren (Hot zuerst)
        sentiment_order = {
            LeadSentiment.HOT: 0,
            LeadSentiment.WARM: 1,
            LeadSentiment.NEUTRAL: 2,
            LeadSentiment.GHOST: 3,
            LeadSentiment.COLD: 4,
        }
        leads.sort(key=lambda l: sentiment_order.get(l.sentiment, 99))
        
        logger.info(f"Extrahiert: {len(leads)} Leads")
        return leads
    
    def to_lead_create_data(self, extracted: ExtractedLead) -> Dict[str, Any]:
        """
        Konvertiert einen ExtractedLead in Lead-Create-Daten für die API.
        
        Args:
            extracted: Der extrahierte Lead
            
        Returns:
            Dict für Lead-Erstellung
        """
        # Name aufteilen
        name_parts = extracted.name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # MLM Interest Type basierend auf Sentiment
        mlm_interest = "none"
        if extracted.sentiment in [LeadSentiment.HOT, LeadSentiment.WARM]:
            mlm_interest = "business"
        
        # Lead Tier basierend auf Sentiment
        lead_tier = "cold"
        if extracted.sentiment == LeadSentiment.HOT:
            lead_tier = "hot"
        elif extracted.sentiment == LeadSentiment.WARM:
            lead_tier = "warm"
        
        return {
            "first_name": first_name,
            "last_name": last_name,
            "phone": extracted.phone,
            "email": extracted.email,
            "source": f"chat_import_{extracted.platform.value}",
            "notes": f"Importiert aus {extracted.platform.value}. Letzte Nachricht: {extracted.last_message or 'N/A'}",
            "mlm_interest_type": mlm_interest,
            "lead_tier": lead_tier,
            "lead_score": int(extracted.confidence_score * 100),
            "tags": [
                f"import:{extracted.platform.value}",
                f"sentiment:{extracted.sentiment.value}",
            ],
            "custom_fields": {
                "import_platform": extracted.platform.value,
                "import_date": datetime.now().isoformat(),
                "suggested_action": extracted.suggested_action.value,
                "message_count": extracted.message_count,
                "last_message_date": extracted.last_message_date.isoformat() if extracted.last_message_date else None,
            }
        }


# Singleton Instance
_chat_import_service: Optional[ChatImportService] = None


def get_chat_import_service() -> ChatImportService:
    """Gibt die Chat Import Service Instanz zurück"""
    global _chat_import_service
    if _chat_import_service is None:
        _chat_import_service = ChatImportService()
    return _chat_import_service


__all__ = [
    "ChatImportService",
    "get_chat_import_service",
    "ChatPlatform",
    "LeadSentiment", 
    "SuggestedAction",
    "ExtractedLead",
]

