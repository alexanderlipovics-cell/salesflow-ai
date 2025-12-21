"""
Intelligente Workflow Engine für Command Center
Analysiert Lead-Status und schlägt passende Aktionen vor
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any


def calculate_days_since(timestamp: Optional[str]) -> Optional[int]:
    if not timestamp:
        return None
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return (datetime.now(dt.tzinfo) - dt).days
    except:
        return None


def clean_message(message: Optional[str]) -> Optional[str]:
    """
    Bereinigt eine Nachricht und entfernt Erklärungen, Präfixe oder zusätzlichen Kontext.
    Gibt nur die reine Nachricht zurück.
    """
    if not message:
        return None
    
    # Entferne führende/abschließende Whitespace
    message = message.strip()
    
    # Teile bei Zeilenumbrüchen und nimm nur die erste Zeile
    message = message.split('\n')[0].strip()
    
    # Entferne mögliche Präfixe wie "Nachricht:", "Message:", etc.
    prefixes = ['Nachricht:', 'Message:', 'Suggested:', 'Vorschlag:', 'Icebreaker:', 'Eisbrecher:']
    for prefix in prefixes:
        if message.startswith(prefix):
            message = message[len(prefix):].strip()
    
    # Entferne mögliche Suffixe wie "(Erklärung)" oder "[Kontext]"
    # Entferne alles nach dem ersten Punkt, wenn es wie eine Erklärung aussieht
    if '.' in message:
        parts = message.split('.')
        # Wenn der erste Teil eine vollständige Nachricht ist, nimm nur diesen
        if len(parts[0]) > 20:  # Wenn der erste Teil lang genug ist
            message = parts[0].strip()
    
    return message if message else None


def detect_workflow_status(
    lead: Dict[str, Any],
    messages: List[Dict[str, Any]] = None,
    followups: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Analysiert Lead und bestimmt Workflow-Status"""
    
    messages = messages or []
    followups = followups or []
    
    # Basics
    status = lead.get('status', 'new')
    temperature = lead.get('temperature', 'cold')
    name = lead.get('name', 'Lead').split()[0]
    
    # Letzte Nachricht
    last_message = messages[-1] if messages else None
    last_msg_direction = last_message.get('direction') if last_message else None
    last_msg_content = last_message.get('content', '') if last_message else ''
    last_msg_channel = last_message.get('channel') if last_message else None
    
    # Tage seit Kontakt
    days_since = calculate_days_since(lead.get('last_contact_at'))
    
    # Pending Follow-ups
    pending_followups = [f for f in followups if f.get('status') == 'pending']
    
    # Bevorzugter Kanal
    channel = 'instagram' if lead.get('instagram_handle') else 'whatsapp' if lead.get('phone') else 'email'
    
    # === CASE DETECTION ===
    
    # Closed
    if status in ['won', 'lost']:
        return {'case': 'closed', 'priority': 'none', 'action': 'Abgeschlossen', 'buttons': [], 'urgency': 'none', 'channel': None, 'suggested_message': None}
    
    # HOT LEAD
    if temperature == 'hot':
        return {
            'case': 'hot_lead',
            'priority': 'critical',
            'action': '🔥 HOT - Sofort handeln!',
            'reason': f'{name} ist heiß! Schnell abschließen.',
            'suggested_message': clean_message(f"Hey {name}! Ich hab gerade Zeit - sollen wir kurz telefonieren?"),
            'buttons': ['call_now', 'book_meeting'],
            'urgency': 'immediate',
            'channel': 'phone'
        }
    
    # ANTWORT ERHALTEN
    if last_msg_direction == 'inbound':
        return {
            'case': 'response_received',
            'priority': 'high',
            'action': '💬 Antwort erhalten - Reagieren!',
            'reason': f'{name} hat geantwortet!',
            'suggested_message': clean_message(f"Danke für deine Nachricht! Lass uns kurz telefonieren."),
            'buttons': ['reply', 'call', 'book_meeting'],
            'urgency': 'today',
            'channel': last_msg_channel or channel,
            'last_message': last_msg_content
        }
    
    # FOLLOW-UP FÄLLIG
    if pending_followups:
        fu = pending_followups[0]
        # Stelle sicher, dass die Follow-up Nachricht nur die reine Nachricht ist
        fu_message = clean_message(fu.get('suggested_message') or fu.get('message') or f"Hey {name}! Wollte kurz nachfragen, wie läuft es?")
        return {
            'case': 'followup_due',
            'priority': 'medium',
            'action': f"📅 Follow-up fällig",
            'reason': fu.get('reason', 'Zeit zum Nachfassen'),
            'suggested_message': fu_message,
            'buttons': ['send_followup', 'snooze_1d', 'snooze_3d', 'skip'],
            'urgency': 'today',
            'channel': fu.get('channel') or channel,
            'followup_id': fu.get('id')
        }
    
    # WARTE AUF ANTWORT
    if last_msg_direction == 'outbound' and days_since and days_since < 7:
        return {
            'case': 'waiting',
            'priority': 'low',
            'action': f"⏳ Warte auf Antwort",
            'reason': f"Vor {days_since} Tag(en) kontaktiert",
            'suggested_message': None,
            'buttons': ['set_reminder', 'send_followup'],
            'urgency': 'none',
            'channel': None
        }
    
    # KALT GEWORDEN
    if days_since and days_since > 7:
        return {
            'case': 'gone_cold',
            'priority': 'medium',
            'action': '❄️ Re-Engagement nötig',
            'reason': f"Seit {days_since} Tagen kein Kontakt",
            'suggested_message': clean_message(f"Hey {name}! Lange nicht gehört - ist das Thema noch aktuell für dich?"),
            'buttons': ['reactivate', 'put_on_ice', 'mark_lost'],
            'urgency': 'this_week',
            'channel': channel
        }
    
    # QUALIFIZIERT
    if status == 'qualified':
        return {
            'case': 'qualified',
            'priority': 'high',
            'action': '🎯 Abschluss vorbereiten',
            'reason': f'{name} ist qualifiziert!',
            'suggested_message': clean_message(f"Hey {name}! Sollen wir einen Termin machen?"),
            'buttons': ['book_demo', 'send_offer', 'close_deal'],
            'urgency': 'this_week',
            'channel': 'phone'
        }
    
    # NEUER LEAD (Default)
    return {
        'case': 'new_lead',
        'priority': 'medium',
        'action': '👋 Erstkontakt nötig',
        'reason': 'Neuer Lead - Starte mit Eisbrecher!',
        'suggested_message': clean_message(f"Hey {name}! Ich hab gesehen dass du dich interessierst. Lass uns kurz telefonieren!"),
        'buttons': ['instagram', 'whatsapp', 'email', 'call'],
        'urgency': 'today',
        'channel': channel
    }

