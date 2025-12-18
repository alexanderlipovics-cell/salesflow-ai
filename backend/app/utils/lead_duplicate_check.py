"""
Lead Duplicate Check Utility

Prüft ob ein Lead bereits existiert, bevor er gespeichert wird.
Verhindert Duplikate beim mehrfachen Speichern.
"""

import re
import logging
from typing import Optional, Tuple, Dict, Any

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


def normalize_instagram_username(username: str) -> str:
    """Normalisiert Instagram Username (entfernt @, lowercase)"""
    if not username:
        return ""
    # Entferne @ und führende/trailing Leerzeichen
    cleaned = username.replace('@', '').strip().lower()
    # Entferne instagram.com/ falls vorhanden
    cleaned = cleaned.replace('instagram.com/', '').replace('https://instagram.com/', '').replace('http://instagram.com/', '')
    return cleaned


async def find_existing_lead(
    db,
    user_id: str,
    lead_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Findet existierenden Lead basierend auf verschiedenen Kriterien.
    
    Prüfreihenfolge (Priorität):
    1. Instagram Username (höchste Priorität für Social Media Leads)
    2. Email
    3. Phone
    4. Name (Fallback, weniger zuverlässig)
    
    Returns:
        Existierender Lead oder None
    """
    if not user_id:
        logger.warning("No user_id provided for duplicate check")
        return None
    
    try:
        # ========================================================================
        # CHECK 1: Instagram Username (höchste Priorität für Social Media)
        # ========================================================================
        instagram_username = lead_data.get('instagram_username') or lead_data.get('instagram')
        if instagram_username:
            normalized_username = normalize_instagram_username(instagram_username)
            if normalized_username:
                result = (
                    db.table("leads")
                    .select("*")
                    .eq("user_id", user_id)
                    .or_(f"instagram_username.ilike.{normalized_username},instagram.ilike.{normalized_username}")
                    .limit(1)
                    .execute()
                )
                if result.data and len(result.data) > 0:
                    logger.info(f"Found existing lead by Instagram username: {normalized_username}")
                    return result.data[0]
        
        # ========================================================================
        # CHECK 2: Email
        # ========================================================================
        email = lead_data.get('email')
        if email:
            normalized_email = normalize_email(email)
            if normalized_email:
                result = (
                    db.table("leads")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("email", normalized_email)
                    .limit(1)
                    .execute()
                )
                if result.data and len(result.data) > 0:
                    logger.info(f"Found existing lead by email: {normalized_email}")
                    return result.data[0]
        
        # ========================================================================
        # CHECK 3: Phone
        # ========================================================================
        phone = lead_data.get('phone')
        if phone:
            normalized_phone = normalize_phone(phone)
            if normalized_phone and len(normalized_phone) >= 6:  # Mindestens 6 Ziffern
                result = (
                    db.table("leads")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("phone", normalized_phone)
                    .limit(1)
                    .execute()
                )
                if result.data and len(result.data) > 0:
                    logger.info(f"Found existing lead by phone: {normalized_phone}")
                    return result.data[0]
        
        # ========================================================================
        # CHECK 4: Name (Fallback, weniger zuverlässig)
        # ========================================================================
        name = lead_data.get('name')
        if name and len(name.strip()) >= 3:  # Mindestens 3 Zeichen
            # Case-insensitive Suche
            result = (
                db.table("leads")
                .select("*")
                .eq("user_id", user_id)
                .ilike("name", name.strip())
                .limit(1)
                .execute()
            )
            if result.data and len(result.data) > 0:
                # Zusätzliche Prüfung: Name sollte sehr ähnlich sein
                existing_name = result.data[0].get('name', '').strip().lower()
                new_name = name.strip().lower()
                # Exakte Übereinstimmung oder sehr ähnlich
                if existing_name == new_name or (len(existing_name) >= 5 and existing_name in new_name or new_name in existing_name):
                    logger.info(f"Found existing lead by name: {name}")
                    return result.data[0]
        
        return None
        
    except Exception as e:
        logger.error(f"Error checking for duplicate lead: {e}")
        return None


async def create_lead_if_not_exists(
    db,
    lead_data: Dict[str, Any],
    user_id: str,
) -> Tuple[Dict[str, Any], bool]:
    """
    Erstellt Lead nur wenn er nicht existiert.
    
    Args:
        db: Supabase Client
        lead_data: Lead-Daten für Erstellung
        user_id: User ID
    
    Returns:
        Tuple[lead, was_created]:
        - lead: Der Lead (neu erstellt oder existierend)
        - was_created: True wenn neu erstellt, False wenn bereits existiert
    """
    # Normalisiere Daten für Duplikat-Check
    normalized_data = lead_data.copy()
    
    # Normalisiere Email
    if normalized_data.get('email'):
        normalized_data['email'] = normalize_email(normalized_data['email'])
    
    # Normalisiere Phone
    if normalized_data.get('phone'):
        normalized_data['phone'] = normalize_phone(normalized_data['phone'])
    
    # Normalisiere Instagram Username
    if normalized_data.get('instagram_username'):
        normalized_data['instagram_username'] = normalize_instagram_username(normalized_data['instagram_username'])
    if normalized_data.get('instagram'):
        normalized_data['instagram'] = normalize_instagram_username(normalized_data['instagram'])
    
    # Prüfe auf Duplikat
    existing = await find_existing_lead(db, user_id, normalized_data)
    
    if existing:
        logger.info(f"Lead already exists: {existing.get('id')} - {existing.get('name')}")
        return existing, False
    
    # Lead existiert nicht → neu erstellen
    # Stelle sicher dass user_id gesetzt ist
    if 'user_id' not in lead_data:
        lead_data['user_id'] = user_id
    
    # Normalisierte Werte für Insert verwenden
    insert_data = normalized_data.copy()
    
    try:
        result = db.table("leads").insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Created new lead: {result.data[0].get('id')} - {result.data[0].get('name')}")
            return result.data[0], True
        else:
            raise Exception("Insert returned no data")
            
    except Exception as e:
        logger.error(f"Error creating lead: {e}")
        raise


async def bulk_create_leads_if_not_exists(
    db,
    leads_data: list[Dict[str, Any]],
    user_id: str,
) -> Dict[str, list]:
    """
    Erstellt mehrere Leads mit Duplikat-Check.
    
    Returns:
        {
            'created': [list of new leads],
            'already_exists': [list of existing leads],
            'failed': [list of errors]
        }
    """
    results = {
        'created': [],
        'already_exists': [],
        'failed': []
    }
    
    for idx, lead_data in enumerate(leads_data):
        try:
            lead, was_created = await create_lead_if_not_exists(
                db=db,
                lead_data=lead_data,
                user_id=user_id,
            )
            
            if was_created:
                results['created'].append(lead)
            else:
                results['already_exists'].append(lead)
                
        except Exception as e:
            logger.error(f"Error processing lead {idx + 1}: {e}")
            results['failed'].append({
                'index': idx + 1,
                'data': lead_data,
                'error': str(e)
            })
    
    return results

