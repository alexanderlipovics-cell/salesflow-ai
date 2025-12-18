# backend/app/conversations/router_logic.py

from sqlalchemy.orm import Session
from typing import Dict
import logging

from app.conversations.memory.manager import HybridMemoryManager
from app.models.conversation_extended import ChannelIdentity
from app.conversations.channels.whatsapp import WhatsAppChannel
from app.conversations.channels.base import StandardMessage

logger = logging.getLogger(__name__)


async def handle_incoming_webhook(channel_type: str, payload: dict, db: Session):
    """
    Zentraler Entry Point.
    """
    # 1. Adapter auswählen
    if channel_type == "whatsapp":
        channel = WhatsAppChannel()
    else:
        raise ValueError(f"Unsupported channel type: {channel_type}")
    
    # 2. Nachricht normalisieren
    std_msg = await channel.normalize_webhook(payload)
    identifier = std_msg.metadata.get("source_phone")  # oder email, etc.
    
    if not identifier:
        logger.warning("No identifier found in webhook payload", channel_type=channel_type)
        return {"status": "error", "message": "No identifier found"}
    
    # 3. IDENTIY RESOLUTION (Stitching)
    # Finden wir den Lead anhand der Nummer?
    identity = db.query(ChannelIdentity).filter_by(
        channel_type=channel_type, 
        identifier=identifier
    ).first()
    
    if not identity:
        # Neuer Lead? Oder unbekannter Channel für existierenden Lead?
        # Hier könnte Logik für "Unbekannter Lead" stehen
        logger.info("Unbekannte Identität - Lead Creation Flow starten", identifier=identifier)
        return {"status": "unknown_identity", "identifier": identifier}
        
    lead_id = str(identity.lead_id)
    
    # 4. MEMORY UPDATE
    memory = HybridMemoryManager(db)
    await memory.add_message(lead_id, std_msg.content, "inbound", channel_type)
    
    # 5. CONTEXT LADEN (Cross-Channel!)
    # Lädt auch alte Emails oder LinkedIn Nachrichten, da lead_id gleich ist
    context = await memory.get_smart_context(lead_id)
    
    # 6. AI ANTWORT GENERIEREN
    # ai_response = await ai_service.generate(context, std_msg.content)
    
    # 7. ANTWORT SENDEN
    # await channel.send(identifier, StandardMessage(content=ai_response))
    # await memory.add_message(lead_id, ai_response, "outbound", channel_type)
    
    return {"status": "processed", "lead_id": lead_id, "context_loaded": True}

