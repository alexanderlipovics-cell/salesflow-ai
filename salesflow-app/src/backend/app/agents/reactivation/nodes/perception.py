"""
Reactivation Agent - Perception Node

Erster Node im Graph: Lädt Lead-Basisdaten und Kontext.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from ..state import ReactivationState, LeadContext

logger = logging.getLogger(__name__)


async def run(state: ReactivationState) -> dict:
    """
    Perception Node: Lädt Lead-Daten und erstellt Kontext.
    
    Aufgaben:
    1. Lead-Basisdaten aus CRM laden
    2. Interaktionshistorie aggregieren
    3. Persona-Type bestimmen (für Tonalität)
    4. Consent-Status prüfen (DSGVO)
    
    Input State:
    - lead_id: UUID des Leads
    - user_id: UUID des Users
    
    Output:
    - lead_context: LeadContext mit allen relevanten Daten
    """
    lead_id = state.get("lead_id")
    user_id = state.get("user_id")
    run_id = state.get("run_id", "unknown")
    
    logger.info(f"[{run_id}] Perception: Loading lead {lead_id}")
    
    try:
        # TODO: Echte Supabase-Abfrage implementieren
        # Hier Placeholder für die Struktur
        
        lead_context = await _load_lead_context(lead_id, user_id)
        
        if not lead_context:
            logger.error(f"[{run_id}] Lead {lead_id} not found")
            return {
                "error": f"Lead {lead_id} nicht gefunden",
                "lead_context": None,
            }
        
        logger.info(
            f"[{run_id}] Perception complete: "
            f"{lead_context.get('name')} @ {lead_context.get('company')} "
            f"(dormant: {lead_context.get('days_dormant')} days)"
        )
        
        return {
            "lead_context": lead_context,
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Perception failed: {e}")
        return {
            "error": str(e),
            "lead_context": None,
        }


async def _load_lead_context(
    lead_id: str,
    user_id: str
) -> Optional[LeadContext]:
    """
    Lädt Lead-Kontext aus Supabase.
    
    Queries:
    1. leads Tabelle für Basisdaten
    2. interactions Tabelle für Historie
    3. consents Tabelle für DSGVO-Status
    """
    # TODO: Implementiere Supabase-Queries
    # Placeholder für Struktur:
    
    from ....db.supabase import get_supabase
    
    supabase = get_supabase()
    
    # 1. Lead-Basisdaten
    lead_response = await supabase.from_("leads")\
        .select("*")\
        .eq("id", lead_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()
    
    if not lead_response.data:
        return None
    
    lead = lead_response.data
    
    # 2. Letzte Interaktion
    last_interaction = await supabase.from_("interactions")\
        .select("*")\
        .eq("lead_id", lead_id)\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
    
    # 3. Interaktions-Count
    interaction_count_response = await supabase.from_("interactions")\
        .select("count", count="exact")\
        .eq("lead_id", lead_id)\
        .execute()
    
    interaction_count = interaction_count_response.count or 0
    
    # 4. Days Dormant berechnen
    last_contact = lead.get("last_contact_at")
    if last_contact:
        last_contact_dt = datetime.fromisoformat(last_contact.replace("Z", "+00:00"))
        days_dormant = (datetime.now(last_contact_dt.tzinfo) - last_contact_dt).days
    else:
        days_dormant = 999  # Sehr lange her
    
    # 5. Persona Type bestimmen (Heuristik)
    persona_type = _determine_persona_type(lead)
    
    # 6. Formality basierend auf Persona
    formality = _determine_formality(persona_type, lead)
    
    # Kontext zusammenstellen
    return LeadContext(
        lead_id=lead_id,
        name=lead.get("name", "Unbekannt"),
        company=lead.get("company", ""),
        email=lead.get("email"),
        linkedin_url=lead.get("linkedin_url"),
        
        last_interaction_summary=_summarize_interaction(
            last_interaction.data[0] if last_interaction.data else None
        ),
        interaction_count=interaction_count,
        days_dormant=days_dormant,
        
        persona_type=persona_type,
        preferred_formality=formality,
        preferred_channel=_determine_channel(lead),
        
        top_pain_points=lead.get("pain_points", [])[:3],
        previous_objections=lead.get("objections", [])[:3],
        deal_value_estimate=lead.get("deal_value"),
        
        has_email_consent=lead.get("email_consent", False),
        has_linkedin_connection=lead.get("linkedin_connected", False),
    )


def _determine_persona_type(lead: dict) -> str:
    """
    Bestimmt den Persona-Typ basierend auf Unternehmensgröße/Signalen.
    """
    company_size = lead.get("company_size", 0)
    
    if company_size > 250:
        return "corporate"
    elif company_size > 10:
        return "startup"
    elif company_size > 0:
        return "solopreneur"
    
    # Fallback auf Tags/Notes
    tags = lead.get("tags", [])
    if "enterprise" in tags or "konzern" in tags:
        return "corporate"
    elif "startup" in tags or "gruender" in tags:
        return "startup"
    
    return "unknown"


def _determine_formality(persona_type: str, lead: dict) -> str:
    """
    Bestimmt die Anrede (Sie vs Du) basierend auf Persona.
    
    DACH-Regel:
    - Corporate: IMMER "Sie"
    - Startup: Meist "Du" (aber prüfe Branche)
    - Solopreneur: Kontextabhängig
    """
    # Explizite Einstellung im Lead?
    if lead.get("preferred_formality"):
        return lead["preferred_formality"]
    
    # Persona-basiert
    if persona_type == "corporate":
        return "Sie"
    elif persona_type == "startup":
        # Tech-Startups: Du
        # Finance/Legal Startups: Sie
        industry = lead.get("industry", "").lower()
        if any(i in industry for i in ["finance", "legal", "versicherung", "bank"]):
            return "Sie"
        return "Du"
    elif persona_type == "solopreneur":
        # Coaches etc. meist Du
        return "Du"
    
    # Default: Sie (sicherer im DACH-Raum)
    return "Sie"


def _determine_channel(lead: dict) -> str:
    """
    Bestimmt den bevorzugten Kanal.
    """
    if lead.get("preferred_channel"):
        return lead["preferred_channel"]
    
    # LinkedIn-Verbindung vorhanden?
    if lead.get("linkedin_connected"):
        return "linkedin"
    
    # Email-Consent vorhanden?
    if lead.get("email_consent"):
        return "email"
    
    return "unknown"


def _summarize_interaction(interaction: Optional[dict]) -> str:
    """
    Erstellt eine kurze Zusammenfassung der letzten Interaktion.
    """
    if not interaction:
        return "Keine vorherigen Interaktionen gefunden."
    
    interaction_type = interaction.get("type", "Kontakt")
    content = interaction.get("content", "")[:200]
    date = interaction.get("created_at", "")[:10]
    
    return f"[{date}] {interaction_type}: {content}..."

