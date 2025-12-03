"""
Company Knowledge Service

Lädt und formatiert das Vertriebs-Wissen aus der Datenbank für die Nutzung
in KI-Prompts (Chat, Objection Brain, Follow-ups, etc.).
"""

from typing import Optional
import os
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Erstellt Supabase Client aus Umgebungsvariablen"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise RuntimeError("Supabase Konfiguration fehlt (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
    
    return create_client(url, key)


async def get_company_knowledge_summary(user_id: Optional[str]) -> str:
    """
    Liefert einen kompakten Text, der in KI-Prompts verwendet werden kann.
    
    Wenn kein user_id vorhanden oder kein Wissen gepflegt ist, 
    wird ein neutraler Hinweis zurückgegeben.
    
    Args:
        user_id: Die User-ID (UUID) für die das Wissen abgefragt werden soll
        
    Returns:
        Formatierter String mit Company Knowledge oder Fallback-Text
    """
    if not user_id:
        return (
            "Es wurden noch keine spezifischen Firmen-Informationen hinterlegt. "
            "Du darfst keine konkreten Versprechen machen, sondern solltest allgemein bleiben."
        )
    
    try:
        supabase = get_supabase_client()
        
        # Neuesten Eintrag für diesen User holen
        response = supabase.table("sales_company_knowledge") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if not response.data or len(response.data) == 0:
            return (
                "Es wurden noch keine spezifischen Firmen-Informationen hinterlegt. "
                "Du darfst keine konkreten Versprechen machen, sondern solltest allgemein bleiben."
            )
        
        knowledge = response.data[0]
        
        # Kompakte Zusammenfassung bauen
        parts = []
        
        if knowledge.get("company_name"):
            parts.append(f"Firma: {knowledge['company_name']}")
        
        if knowledge.get("vision"):
            parts.append(f"Vision: {knowledge['vision']}")
        
        if knowledge.get("target_audience"):
            parts.append(f"Zielgruppe: {knowledge['target_audience']}")
        
        if knowledge.get("products"):
            parts.append(f"Produkte: {knowledge['products']}")
        
        if knowledge.get("pricing"):
            parts.append(f"Preismodell: {knowledge['pricing']}")
        
        if knowledge.get("usps"):
            parts.append(f"USPs: {knowledge['usps']}")
        
        if knowledge.get("legal_disclaimers"):
            parts.append(f"Rechtliche Hinweise: {knowledge['legal_disclaimers']}")
        
        if knowledge.get("communication_style"):
            parts.append(f"Kommunikationsstil: {knowledge['communication_style']}")
        
        if knowledge.get("no_go_phrases"):
            parts.append(f"No-Gos/Tabu-Sätze: {knowledge['no_go_phrases']}")
        
        if not parts:
            return (
                "Es wurden noch keine spezifischen Firmen-Informationen hinterlegt. "
                "Du darfst keine konkreten Versprechen machen, sondern solltest allgemein bleiben."
            )
        
        summary = "; ".join(parts)
        return summary
        
    except Exception as e:
        print(f"Fehler beim Laden von Company Knowledge: {e}")
        return (
            "Firmen-Informationen konnten nicht geladen werden. "
            "Bitte formuliere allgemein und ohne rechtlich riskante Versprechen."
        )

