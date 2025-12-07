"""
SalesFlow AI - Conversation Webhook Router
==========================================

Zentraler Router für eingehende Nachrichten von allen Kanälen.
Integriert mit Conversation Engine 2.0 für Cross-Channel Context.
"""

from __future__ import annotations

import logging
from typing import Dict, Any

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.conversations.router_logic import handle_incoming_webhook

router = APIRouter(prefix="/webhooks/conversations", tags=["conversations"])
logger = logging.getLogger(__name__)


@router.post("/{channel_type}")
async def incoming_conversation_webhook(
    channel_type: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Zentraler Webhook-Endpoint für alle Kanäle.
    
    Unterstützte Kanäle:
    - whatsapp
    - linkedin (coming soon)
    - instagram (coming soon)
    - email (coming soon)
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error("Invalid JSON payload", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    logger.info(
        "Incoming webhook",
        channel_type=channel_type,
        payload_keys=list(payload.keys()) if isinstance(payload, dict) else "non-dict"
    )
    
    try:
        result = await handle_incoming_webhook(
            channel_type=channel_type,
            payload=payload,
            db=db
        )
        return result
    except ValueError as e:
        logger.warning("Webhook processing error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error processing webhook", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def webhook_health():
    """Health check für Webhook-System."""
    return {
        "status": "ok",
        "service": "conversation_webhooks",
        "supported_channels": ["whatsapp"]
    }

