"""
Contact Status Detection Utility

Erkennt aus User-Nachrichten ob Leads bereits kontaktiert wurden.
Verhindert, dass CHIEF bereits kontaktierte Leads als "never_contacted" markiert.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def detect_contact_status_from_context(message: str) -> Dict[str, Any]:
    """
    Erkennt aus User-Nachricht ob Leads bereits kontaktiert wurden.
    
    Args:
        message: User-Nachricht die den Kontext enthält
        
    Returns:
        Dict mit:
        - contact_status: 'awaiting_reply' oder 'never_contacted'
        - contact_count: Anzahl der Kontakte (1, 2, etc.)
        - last_contact_date: ISO Datum des letzten Kontakts
        - awaiting_reply_since: Seit wann auf Antwort gewartet wird
        - needs_followup: True wenn Follow-up geplant werden soll
    """
    if not message:
        return _default_never_contacted()
    
    message_lower = message.lower()
    
    # ========================================================================
    # KEYWORDS: Bereits kontaktiert
    # ========================================================================
    
    already_contacted_keywords = [
        'erstnachricht bekommen', 'erstnachricht gesendet', 'erstnachricht verschickt',
        'schon geschrieben', 'schon kontaktiert', 'bereits angeschrieben',
        'nachricht geschickt', 'nachricht gesendet', 'nachricht verschickt',
        'schon gesendet', 'haben nachricht', 'warten auf antwort', 'keine antwort',
        'first message', 'already contacted', 'schon eine nachricht',
        'hab geschrieben', 'hab ihr geschrieben', 'hab ihm geschrieben',
        'dm verschickt', 'email rausgeschickt', 'whatsapp verschickt',
        'hab kontaktiert', 'kontaktiert', 'geschrieben',
        'haben schon', 'hatten schon', 'bekommen haben',
        'warten auf', 'keine rückmeldung', 'noch keine antwort',
        'schon angeschrieben', 'bereits geschrieben', 'bereits kontaktiert',
    ]
    
    for keyword in already_contacted_keywords:
        if keyword in message_lower:
            # Versuche Kontaktanzahl zu extrahieren
            contact_count = _extract_contact_count(message_lower, keyword)
            
            return {
                'contact_status': 'awaiting_reply',
                'contact_count': contact_count,
                'last_contact_date': datetime.utcnow().isoformat(),
                'awaiting_reply_since': datetime.utcnow().isoformat(),
                'needs_followup': True,
                'detected_reason': f'Keyword gefunden: "{keyword}"',
            }
    
    # ========================================================================
    # KEYWORDS: Follow-up nötig
    # ========================================================================
    
    followup_keywords = [
        'follow-up', 'followup', 'nachhaken', 'nochmal schreiben',
        'zweite nachricht', 'dritte nachricht', 'weitere nachricht',
        'nochmal anschreiben', 'erneut kontaktieren', 'wieder anschreiben',
        'follow up', 'nachfassen', 'nochmal nachfragen',
    ]
    
    for keyword in followup_keywords:
        if keyword in message_lower:
            # Versuche Kontaktanzahl zu extrahieren
            contact_count = _extract_contact_count(message_lower, keyword)
            if contact_count == 1:
                contact_count = 2  # Follow-up = mindestens 2. Kontakt
            
            return {
                'contact_status': 'awaiting_reply',
                'contact_count': contact_count,
                'last_contact_date': datetime.utcnow().isoformat(),
                'awaiting_reply_since': datetime.utcnow().isoformat(),
                'needs_followup': True,
                'detected_reason': f'Follow-up Keyword gefunden: "{keyword}"',
            }
    
    # ========================================================================
    # KEYWORDS: Noch nicht kontaktiert (explizit)
    # ========================================================================
    
    not_contacted_keywords = [
        'noch nicht', 'noch nie', 'neue leads', 'noch nicht angeschrieben',
        'noch nicht kontaktiert', 'noch nicht geschrieben', 'erstkontakt',
        'neue kontakte', 'noch nicht erreicht',
    ]
    
    for keyword in not_contacted_keywords:
        if keyword in message_lower:
            return _default_never_contacted()
    
    # ========================================================================
    # DEFAULT: Noch nie kontaktiert
    # ========================================================================
    
    return _default_never_contacted()


def _extract_contact_count(message_lower: str, keyword: str) -> int:
    """
    Versucht die Kontaktanzahl aus der Nachricht zu extrahieren.
    
    Beispiele:
    - "zweite nachricht" → 2
    - "dritte nachricht" → 3
    - "schon 2 mal geschrieben" → 2
    """
    # Zahlen in der Nähe des Keywords suchen
    keyword_pos = message_lower.find(keyword)
    if keyword_pos == -1:
        return 1
    
    # Suche nach Zahlenwörtern
    number_words = {
        'erste': 1, 'zweite': 2, 'dritte': 3, 'vierte': 4, 'fünfte': 5,
        'ersten': 1, 'zweiten': 2, 'dritten': 3, 'vierten': 4, 'fünften': 5,
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    }
    
    # Prüfe 20 Zeichen vor und nach dem Keyword
    context_start = max(0, keyword_pos - 20)
    context_end = min(len(message_lower), keyword_pos + len(keyword) + 20)
    context = message_lower[context_start:context_end]
    
    for word, num in number_words.items():
        if word in context:
            return num
    
    # Prüfe nach Zahlen (1, 2, 3, etc.)
    import re
    numbers = re.findall(r'\b(\d+)\s*(mal|times|nachricht|message|kontakt)', context)
    if numbers:
        try:
            return int(numbers[0][0])
        except:
            pass
    
    return 1  # Default: 1. Kontakt


def _default_never_contacted() -> Dict[str, Any]:
    """Gibt Standard-Werte für noch nicht kontaktiert zurück."""
    return {
        'contact_status': 'never_contacted',
        'contact_count': 0,
        'last_contact_date': None,
        'awaiting_reply_since': None,
        'needs_followup': False,
        'detected_reason': 'Keine Kontakt-Keywords gefunden',
    }


def should_schedule_followup(status_info: Dict[str, Any], days: int = 2) -> bool:
    """
    Prüft ob ein Follow-up geplant werden soll.
    
    Args:
        status_info: Ergebnis von detect_contact_status_from_context
        days: Anzahl Tage bis zum Follow-up
        
    Returns:
        True wenn Follow-up geplant werden soll
    """
    return status_info.get('needs_followup', False) and status_info.get('contact_status') == 'awaiting_reply'


def get_followup_delay_days(status_info: Dict[str, Any]) -> int:
    """
    Bestimmt die Verzögerung für Follow-up basierend auf Kontaktanzahl.
    
    Args:
        status_info: Ergebnis von detect_contact_status_from_context
        
    Returns:
        Anzahl Tage bis zum Follow-up
    """
    contact_count = status_info.get('contact_count', 1)
    
    # Follow-up Timing basierend auf Kontaktanzahl
    if contact_count == 1:
        return 2  # 1. Follow-up nach 2 Tagen
    elif contact_count == 2:
        return 3  # 2. Follow-up nach 3 Tagen
    elif contact_count == 3:
        return 5  # 3. Follow-up nach 5 Tagen
    else:
        return 7  # Weitere Follow-ups nach 7 Tagen


__all__ = [
    'detect_contact_status_from_context',
    'should_schedule_followup',
    'get_followup_delay_days',
]

