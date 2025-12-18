"""
Smart Contact Detection Utility

Prüft ob erkannte Kontaktdaten (Telefon, Email) zum User oder zum Lead gehören.
Verhindert, dass User's eigene Kontaktdaten fälschlicherweise beim Lead gespeichert werden.
"""

import re
from typing import Optional, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    """Normalisiert Telefonnummer (entfernt Leerzeichen, Bindestriche, etc.)"""
    if not phone:
        return ""
    return re.sub(r'[^\d+]', '', phone)


def normalize_email(email: str) -> str:
    """Normalisiert Email (lowercase, trim)"""
    if not email:
        return ""
    return email.lower().strip()


async def should_save_contact_to_lead(
    detected_contact: str,
    contact_type: str,  # "phone" or "email"
    user_profile: Dict[str, Any],
    message_context: str = "",
) -> Tuple[Optional[bool], str]:
    """
    Prüft ob ein Kontakt beim Lead gespeichert werden soll.
    
    Args:
        detected_contact: Die erkannte Kontaktinformation (Telefon oder Email)
        contact_type: "phone" oder "email"
        user_profile: User-Profil mit phone/email Feldern
        message_context: Der Kontext der Nachricht (für Analyse)
    
    Returns:
        Tuple[Optional[bool], str]:
        - (True, reason): Sollte beim Lead gespeichert werden
        - (False, reason): Sollte NICHT beim Lead gespeichert werden (User's eigener Kontakt)
        - (None, reason): Unsicher - User sollte gefragt werden
    """
    
    if not detected_contact:
        return False, "empty_contact"
    
    message_lower = message_context.lower() if message_context else ""
    
    # ========================================================================
    # CHECK 1: Ist es die User's eigene Nummer/Email?
    # ========================================================================
    
    if contact_type == "phone":
        user_phone = user_profile.get("phone") or user_profile.get("mobile") or user_profile.get("telefon")
        if user_phone:
            user_phone_clean = normalize_phone(user_phone)
            detected_clean = normalize_phone(detected_contact)
            
            # Exakte Übereinstimmung
            if user_phone_clean == detected_clean:
                logger.info(f"Contact detection: Phone matches user's own number")
                return False, "user_own_contact"
            
            # Teilübereinstimmung (z.B. User hat "+49 660 123456", erkannt wurde "0660 123456")
            if user_phone_clean and detected_clean:
                # Entferne Ländercode für Vergleich
                user_digits = re.sub(r'^\+?\d{1,3}', '', user_phone_clean)
                detected_digits = re.sub(r'^\+?\d{1,3}', '', detected_clean)
                
                if user_digits and detected_digits and user_digits == detected_digits:
                    logger.info(f"Contact detection: Phone matches user's own number (without country code)")
                    return False, "user_own_contact"
                
                # Prüfe ob User-Nummer in erkannte Nummer enthalten ist (oder umgekehrt)
                if len(user_digits) >= 6 and (user_digits in detected_digits or detected_digits in user_digits):
                    logger.info(f"Contact detection: Phone likely matches user's own number (partial match)")
                    return False, "user_own_contact"
    
    elif contact_type == "email":
        user_email = user_profile.get("email")
        if user_email:
            user_email_normalized = normalize_email(user_email)
            detected_normalized = normalize_email(detected_contact)
            
            if user_email_normalized == detected_normalized:
                logger.info(f"Contact detection: Email matches user's own email")
                return False, "user_own_contact"
    
    # ========================================================================
    # CHECK 2: Kontext-Analyse - User-Kontext Keywords
    # ========================================================================
    
    user_context_keywords = [
        "meine", "mich", "mir", "ich", "my", "me", "mein",
        "ruf mich an", "call me", "kontaktiere mich", "contact me",
        "meine nummer", "my number", "meine email", "my email",
        "erreichst mich", "reach me", "findest mich", "find me"
    ]
    
    # Prüfe ob User-Kontext-Keywords in der Nähe der Kontaktinfo sind
    # (z.B. "Ruf mich an: 0660 123456")
    for keyword in user_context_keywords:
        if keyword in message_lower:
            # Prüfe ob die Kontaktinfo in der Nähe des Keywords ist
            keyword_pos = message_lower.find(keyword)
            contact_pos = message_lower.find(detected_contact.lower())
            
            # Wenn Kontaktinfo innerhalb von 50 Zeichen nach dem Keyword kommt
            if contact_pos != -1 and keyword_pos != -1:
                distance = contact_pos - keyword_pos
                if 0 <= distance <= 50:
                    logger.info(f"Contact detection: Context suggests user's own contact (keyword: {keyword})")
                    return False, "context_suggests_user_contact"
    
    # ========================================================================
    # CHECK 3: Lead-Kontext Keywords
    # ========================================================================
    
    lead_context_keywords = [
        "seine", "ihre", "vom lead", "vom kunden", "vom kontakt",
        "erreichbar unter", "kontakt", "telefon", "email",
        "rufnummer", "handynummer", "mobilnummer",
        "his", "her", "their", "lead's", "customer's",
        "contact number", "phone number", "reachable at"
    ]
    
    for keyword in lead_context_keywords:
        if keyword in message_lower:
            keyword_pos = message_lower.find(keyword)
            contact_pos = message_lower.find(detected_contact.lower())
            
            # Wenn Kontaktinfo in der Nähe des Lead-Keywords ist
            if contact_pos != -1 and keyword_pos != -1:
                distance = abs(contact_pos - keyword_pos)
                if distance <= 50:
                    logger.info(f"Contact detection: Context suggests lead's contact (keyword: {keyword})")
                    return True, "context_suggests_lead_contact"
    
    # ========================================================================
    # CHECK 4: Strukturelle Hinweise
    # ========================================================================
    
    # Wenn die Nachricht eine Anweisung enthält (z.B. "Sag ihm...", "Tell him...")
    instruction_patterns = [
        r"sag\s+(ihm|ihr|dem|der)",
        r"tell\s+(him|her|them)",
        r"schreib\s+(ihm|ihr|dem|der)",
        r"write\s+(to\s+)?(him|her|them)",
        r"kontaktiere\s+(ihn|sie|den|die)",
        r"contact\s+(him|her|them)"
    ]
    
    for pattern in instruction_patterns:
        if re.search(pattern, message_lower, re.IGNORECASE):
            # Wenn Kontaktinfo nach der Anweisung kommt, ist es wahrscheinlich User's Kontakt
            match = re.search(pattern, message_lower, re.IGNORECASE)
            if match:
                instruction_end = match.end()
                contact_pos = message_lower.find(detected_contact.lower())
                
                if contact_pos != -1 and contact_pos > instruction_end and contact_pos - instruction_end <= 100:
                    logger.info(f"Contact detection: Instruction pattern suggests user's contact")
                    return False, "instruction_suggests_user_contact"
    
    # ========================================================================
    # DEFAULT: Unsicher - User sollte gefragt werden
    # ========================================================================
    
    logger.info(f"Contact detection: Uncertain - should ask user")
    return None, "ask_user"


async def get_user_profile_for_detection(
    db,
    user_id: str,
) -> Dict[str, Any]:
    """
    Holt User-Profil Daten für Contact Detection.
    
    Lädt phone, email und andere relevante Felder aus verschiedenen Tabellen.
    """
    try:
        # Versuche aus user_profiles oder users Tabelle
        result = db.table("user_profiles").select("phone, email, mobile, telefon").eq("user_id", user_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        # Fallback: Versuche aus users Tabelle
        result = db.table("users").select("phone, email").eq("id", user_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        # Fallback: Versuche aus auth.users (Supabase)
        # (Dies erfordert spezielle Berechtigungen)
        return {}
        
    except Exception as e:
        logger.warning(f"Could not fetch user profile for contact detection: {e}")
        return {}

