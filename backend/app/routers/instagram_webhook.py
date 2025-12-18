"""
Instagram Webhook Router
Handles Instagram/Meta webhook verification and incoming DM events.
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import PlainTextResponse
from app.supabase_client import get_supabase_client
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Verify token from environment or default
VERIFY_TOKEN = os.getenv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN", "salesflow_instagram_2024")


@router.get("/instagram")
async def verify_webhook(request: Request):
    """
    Webhook verification for Instagram/Meta.
    
    Instagram sends a GET request with:
    - hub.mode: "subscribe"
    - hub.challenge: Random string to echo back
    - hub.verify_token: Token we configured
    
    We must return the hub.challenge if verification succeeds.
    
    Note: Query params with dots (hub.mode, hub.challenge, hub.verify_token) 
    must be parsed manually from request.query_params.
    """
    # Parse query params manually because they have dots in names
    hub_mode = request.query_params.get("hub.mode")
    hub_challenge = request.query_params.get("hub.challenge")
    hub_verify_token = request.query_params.get("hub.verify_token")
    
    logger.info(f"Instagram webhook verification: mode={hub_mode}, challenge={hub_challenge}, token={hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("Instagram webhook verified successfully!")
        # WICHTIG: Nur den challenge-String zurückgeben, nichts anderes!
        return PlainTextResponse(content=hub_challenge, status_code=200)
    
    logger.warning(
        f"Instagram webhook verification failed: mode={hub_mode}, "
        f"expected_token={VERIFY_TOKEN}, received_token={hub_verify_token}"
    )
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/instagram")
async def receive_instagram_webhook(request: Request):
    """
    Receive and process Instagram DM events.
    
    Instagram sends POST requests with webhook events containing:
    - Object type (e.g., "instagram")
    - Entry array with messaging events
    - Sender info, message content, timestamps
    """
    try:
        body = await request.json()
        logger.info(f"Instagram webhook received: {body}")
        
        # Process each entry
        for entry in body.get("entry", []):
            # Handle messaging events (DMs)
            if "messaging" in entry:
                for event in entry["messaging"]:
                    await process_dm_event(event)
            
            # Handle changes (alternative format)
            if "changes" in entry:
                for change in entry["changes"]:
                    if change.get("field") == "messages":
                        await process_dm_event(change.get("value", {}))
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing Instagram webhook: {e}", exc_info=True)
        # Return 200 to prevent Instagram from retrying
        return {"status": "error", "message": str(e)}


async def process_dm_event(event: dict):
    """Process a single DM event"""
    try:
        sender = event.get("sender", {})
        recipient = event.get("recipient", {})
        message_data = event.get("message", {})
        
        sender_id = sender.get("id")
        recipient_id = recipient.get("id")
        message_text = message_data.get("text", "")
        message_id = message_data.get("mid", "")
        timestamp = event.get("timestamp")
        
        if not sender_id or not message_text:
            logger.warning(f"Incomplete DM event: sender_id={sender_id}, has_text={bool(message_text)}")
            return
        
        logger.info(f"Processing DM from {sender_id}: {message_text[:50]}...")
        
        supabase = get_supabase_client()
        
        # 1. Check if lead exists with this Instagram ID
        try:
            lead_response = supabase.table("leads").select("*").eq("instagram", sender_id).limit(1).execute()
            
            lead_id = None
            user_id = None
            
            if lead_response.data and len(lead_response.data) > 0:
                # Update existing lead
                lead = lead_response.data[0]
                lead_id = lead.get("id")
                user_id = lead.get("user_id")
                
                # Update last_contact
                supabase.table("leads").update({
                    "last_contact": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", lead_id).execute()
                
                logger.info(f"Updated existing lead: {lead.get('name', 'Unknown')} (ID: {lead_id})")
            else:
                # New Instagram contact - log for manual processing
                # TODO: Create lead automatically if we can determine user_id from recipient_id
                # For now, we'll store the message and link it later
                logger.info(f"New Instagram contact: {sender_id} - message will be stored but lead needs manual creation")
        except Exception as e:
            logger.warning(f"Error checking/updating lead: {e}")
        
        # 2. Store message in instagram_messages table
        try:
            message_record = {
                "instagram_sender_id": sender_id,
                "instagram_recipient_id": recipient_id,
                "message_id": message_id,
                "message_text": message_text,
                "timestamp": str(timestamp) if timestamp else None,
                "direction": "inbound",
                "processed": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Link to lead if found
            if lead_id:
                message_record["lead_id"] = lead_id
            if user_id:
                message_record["user_id"] = user_id
            
            result = supabase.table("instagram_messages").insert(message_record).execute()
            
            if result.data:
                logger.info(f"Stored Instagram message: {message_id} (lead_id={lead_id})")
            else:
                logger.warning(f"Failed to store Instagram message: {message_id}")
                
        except Exception as e:
            # Table might not exist yet - log but don't fail
            logger.warning(f"Could not store message (table may not exist): {e}")
        
    except Exception as e:
        logger.error(f"Error processing DM event: {e}", exc_info=True)
