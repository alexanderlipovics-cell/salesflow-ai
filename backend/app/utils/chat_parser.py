"""
Chat Export Parser für WhatsApp/Instagram Chat-Verläufe.
Erkennt Datum, Sender, Richtung (inbound/outbound), Nachrichteninhalt und Messenger-Kanal.
"""

import re
from typing import List, Dict, Optional
from datetime import datetime


def detect_channel(text: str) -> str:
    """
    Erkennt den Messenger anhand typischer Muster.
    
    Args:
        text: Roher Chat-Export Text
        
    Returns:
        'whatsapp', 'instagram', 'facebook', 'linkedin', 'telegram', 'sms', 'unknown'
    """
    text_lower = text.lower()
    
    # WhatsApp Patterns
    whatsapp_patterns = [
        'ende-zu-ende-verschlüsselung',
        'du hast folgendes gesendet',
        'nachrichten und anrufe sind',
        'dieser nachricht wurde gelöscht',
        'medien ausgelassen',
        'whatsapp',
        'wa.me',
        'chat mit',
        'verschlüsselt'
    ]
    if any(p in text_lower for p in whatsapp_patterns):
        return 'whatsapp'
    
    # Instagram Patterns
    instagram_patterns = [
        'hat auf deine story reagiert',
        'hat deine nachricht mit',
        'auf instagram',
        'story erwähnt',
        'hat ein foto gesendet',
        'reel geteilt',
        'instagram',
        'ig:',
        '@',
        'dm',
        'direct message'
    ]
    if any(p in text_lower for p in instagram_patterns):
        return 'instagram'
    
    # Facebook Messenger Patterns
    facebook_patterns = [
        'messenger',
        'auf facebook',
        'hat mit daumen reagiert',
        'videochat',
        'facebook messenger',
        'fb messenger'
    ]
    if any(p in text_lower for p in facebook_patterns):
        return 'facebook'
    
    # LinkedIn Patterns
    linkedin_patterns = [
        'linkedin',
        'vernetzt',
        'position bei',
        'inmail',
        'linkedin message',
        'connection request'
    ]
    if any(p in text_lower for p in linkedin_patterns):
        return 'linkedin'
    
    # Telegram Patterns
    telegram_patterns = [
        'forwarded from',
        'reply to',
        'telegram',
        'tg:',
        't.me'
    ]
    if any(p in text_lower for p in telegram_patterns):
        return 'telegram'
    
    # SMS Patterns (sehr kurz, nur Text, keine Features)
    if len(text.split('\n')) < 5 and ':' in text and not any(
        p in text_lower for p in ['http', 'www', 'instagram', 'facebook', 'linkedin', 'whatsapp']
    ):
        return 'sms'
    
    return 'unknown'


def _parse_messages(text: str, channel: str = 'unknown') -> List[Dict]:
    """
    Interne Funktion: Parst Nachrichten aus Chat-Export.
    Wird von parse_chat_export() verwendet.
    """
    """
    Interne Funktion: Parst Nachrichten aus Chat-Export.
    
    Args:
        text: Roher Chat-Export Text
        channel: Erkanntes Channel (für bessere Parsing-Logik)
        
    Returns:
        Liste von Nachrichten-Dicts mit:
        - direction: 'outbound' oder 'inbound'
        - date: ISO-Format Datum oder None
        - sender: Name des Senders (bei inbound)
        - content: Nachrichteninhalt
    """
    messages = []
    lines = text.split('\n')
    current_message = None
    
    # Datum-Pattern: "28.11.2025, 16:22" oder "28.11.2025, 16:22 Uhr"
    date_pattern = r'(\d{1,2}\.\d{1,2}\.\d{2,4}),?\s*(\d{1,2}:\d{2})(?:\s*Uhr)?'
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        # Check for date
        date_match = re.search(date_pattern, line_stripped)
        parsed_date = None
        if date_match:
            date_str = f"{date_match.group(1)}, {date_match.group(2)}"
            try:
                # Versuche verschiedene Datumsformate
                for fmt in ["%d.%m.%Y, %H:%M", "%d.%m.%y, %H:%M", "%d.%m.%Y, %H:%M", "%d.%m.%y, %H:%M"]:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        # Wenn Jahr 2-stellig und < 50, dann 20xx, sonst 19xx
                        if fmt.endswith("%y"):
                            year = parsed_date.year
                            if year < 50:
                                parsed_date = parsed_date.replace(year=2000 + year)
                            else:
                                parsed_date = parsed_date.replace(year=1900 + year)
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
        
        # Check for outbound (verschiedene Formate)
        outbound_indicators = [
            "Du hast Folgendes gesendet:",
            "Du hast gesendet:",
            "Du:",
            "Du schreibst:",
            "Gesendet:",
        ]
        
        is_outbound = any(indicator in line_stripped for indicator in outbound_indicators)
        
        if is_outbound:
            # Speichere vorherige Nachricht
            if current_message:
                messages.append(current_message)
            
            # Neue outbound Nachricht
            content_start = line_stripped
            for indicator in outbound_indicators:
                if indicator in content_start:
                    content_start = content_start.split(indicator, 1)[-1].strip()
                    break
            
            current_message = {
                'direction': 'outbound',
                'date': parsed_date.isoformat() if parsed_date else None,
                'sender': None,
                'content': content_start if content_start else ''
            }
            continue
        
        # Check for inbound (Name gefolgt von Doppelpunkt oder Zeilenumbruch)
        # Pattern: "Name:" oder "Name\n" (nächste Zeile ist Inhalt)
        if ':' in line_stripped and not line_stripped.startswith('http'):
            name_part = line_stripped.split(':', 1)[0].strip()
            content_part = line_stripped.split(':', 1)[1].strip() if ':' in line_stripped else ''
            
            # Prüfe ob es wie ein Name aussieht (nicht zu lang, keine URLs, keine Zahlen am Anfang)
            if (len(name_part) < 50 and 
                not name_part.startswith('http') and 
                not re.match(r'^\d+', name_part) and
                not any(char.isdigit() for char in name_part[:3])):
                
                # Speichere vorherige Nachricht
                if current_message:
                    messages.append(current_message)
                
                # Neue inbound Nachricht
                current_message = {
                    'direction': 'inbound',
                    'date': parsed_date.isoformat() if parsed_date else None,
                    'sender': name_part,
                    'content': content_part
                }
                continue
        
        # Wenn wir eine aktuelle Nachricht haben, füge Zeile zum Content hinzu
        if current_message:
            if line_stripped:
                if current_message['content']:
                    current_message['content'] += ' ' + line_stripped
                else:
                    current_message['content'] = line_stripped
    
    # Letzte Nachricht hinzufügen
    if current_message:
        messages.append(current_message)
    
    return messages


def parse_chat_export(text: str) -> Dict:
    """
    Parsed WhatsApp/Instagram Chat-Exports und erkennt automatisch den Messenger-Kanal.
    
    Erkennt:
    - "Du hast Folgendes gesendet:" → outbound
    - "[Name]:" oder "[Name]\n" → inbound
    - Datum-Patterns: "28.11.2025, 16:22" oder "28.11.2025, 16:22 Uhr"
    - Messenger-Kanal: WhatsApp, Instagram, Facebook, LinkedIn, Telegram, SMS
    
    Args:
        text: Roher Chat-Export Text
        
    Returns:
        Dict mit:
        - channel: 'whatsapp', 'instagram', 'facebook', 'linkedin', 'telegram', 'sms', 'unknown'
        - messages: Liste von Nachrichten-Dicts
        - message_count: Anzahl der Nachrichten
        - has_outbound: bool (ob outbound Nachrichten vorhanden)
        - has_inbound: bool (ob inbound Nachrichten vorhanden)
        - last_message_date: ISO-Format oder None
    """
    channel = detect_channel(text)
    messages = _parse_messages(text, channel)
    
    # Letztes Datum finden
    dates = [msg.get('date') for msg in messages if msg.get('date')]
    last_message_date = max(dates) if dates else None
    
    return {
        'channel': channel,
        'messages': messages,
        'message_count': len(messages),
        'has_outbound': any(m.get('direction') == 'outbound' for m in messages),
        'has_inbound': any(m.get('direction') == 'inbound' for m in messages),
        'last_message_date': last_message_date,
    }


def extract_lead_name(text: str) -> Optional[str]:
    """
    Extrahiert den Lead-Namen aus dem Text.
    Versucht die erste Zeile oder den ersten Namen im Text zu finden.
    
    Args:
        text: Roher Text
        
    Returns:
        Lead-Name oder None
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    if not lines:
        return None
    
    # Erste Zeile als Name versuchen
    first_line = lines[0]
    
    # Entferne Datum-Patterns
    first_line = re.sub(r'\d{1,2}\.\d{1,2}\.\d{2,4},?\s*\d{1,2}:\d{2}', '', first_line).strip()
    
    # Entferne häufige Präfixe
    prefixes = [
        "Du hast Folgendes gesendet:",
        "Du hast gesendet:",
        "Du:",
        "Gesendet:",
    ]
    for prefix in prefixes:
        if prefix in first_line:
            first_line = first_line.split(prefix, 1)[-1].strip()
    
    # Wenn die erste Zeile wie ein Name aussieht (nicht zu lang, kein Doppelpunkt am Ende)
    if len(first_line) < 100 and not first_line.endswith(':'):
        # Prüfe ob es ein Name sein könnte (keine URLs, keine Zahlen am Anfang)
        if not first_line.startswith('http') and not re.match(r'^\d+', first_line):
            return first_line
    
    # Suche nach Namen-Pattern (z.B. "Max Mustermann" oder "Alexandra Pereni")
    name_pattern = r'^([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)'
    for line in lines[:5]:  # Nur erste 5 Zeilen prüfen
        match = re.search(name_pattern, line)
        if match:
            return match.group(1)
    
    return None


def analyze_conversation(messages: List[Dict]) -> Dict:
    """
    Analysiert einen Chat-Verlauf und gibt Metadaten zurück.
    
    Args:
        messages: Liste von Nachrichten-Dicts
        
    Returns:
        Dict mit:
        - has_sent_message: bool (ob outbound Nachrichten vorhanden)
        - has_response: bool (ob inbound Nachrichten vorhanden)
        - last_message_date: ISO-Format oder None
        - message_count: int
        - last_outbound_date: ISO-Format oder None
    """
    has_sent_message = any(msg.get('direction') == 'outbound' for msg in messages)
    has_response = any(msg.get('direction') == 'inbound' for msg in messages)
    
    # Letztes Datum finden
    dates = [msg.get('date') for msg in messages if msg.get('date')]
    last_message_date = max(dates) if dates else None
    
    # Letztes outbound Datum
    outbound_dates = [msg.get('date') for msg in messages 
                     if msg.get('direction') == 'outbound' and msg.get('date')]
    last_outbound_date = max(outbound_dates) if outbound_dates else None
    
    return {
        'has_sent_message': has_sent_message,
        'has_response': has_response,
        'last_message_date': last_message_date,
        'last_outbound_date': last_outbound_date,
        'message_count': len(messages),
        'outbound_count': sum(1 for msg in messages if msg.get('direction') == 'outbound'),
        'inbound_count': sum(1 for msg in messages if msg.get('direction') == 'inbound'),
    }

