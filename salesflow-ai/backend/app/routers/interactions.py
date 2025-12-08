"""
Interactions Router - Track user interactions for analytics and AI learning
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from ..core.security import get_current_active_user
from ..db.session import get_db

router = APIRouter(
    prefix="/interactions",
    tags=["interactions"],
    dependencies=[Depends(get_current_active_user)]
)

logger = logging.getLogger(__name__)

class InteractionCreate(BaseModel):
    type: str  # whatsapp_opened, email_opened, call_made, etc.
    phone: Optional[str] = None
    message: Optional[str] = None
    email: Optional[str] = None
    lead_id: Optional[str] = None
    contact_id: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("")
async def create_interaction(
    interaction: InteractionCreate,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Log a user interaction for analytics and AI learning.
    """
    try:
        # Get user ID
        user_id = getattr(current_user, 'id', None) or current_user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Prepare interaction data
        interaction_data = {
            "user_id": user_id,
            "type": interaction.type,
            "created_at": interaction.timestamp or datetime.now().isoformat(),
            "metadata": interaction.metadata or {}
        }

        # Add optional fields
        if interaction.phone:
            interaction_data["phone"] = interaction.phone
        if interaction.message:
            interaction_data["message"] = interaction.message
        if interaction.email:
            interaction_data["email"] = interaction.email
        if interaction.lead_id:
            interaction_data["lead_id"] = interaction.lead_id
        if interaction.contact_id:
            interaction_data["contact_id"] = interaction.contact_id

        # Insert into database
        result = db.table("interactions").insert(interaction_data).execute()

        logger.info(f"Logged interaction: {interaction.type} for user {user_id}")

        return {
            "success": True,
            "interaction_id": result.data[0]["id"] if result.data else None
        }

    except Exception as e:
        logger.exception(f"Error creating interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_interactions(
    type_filter: Optional[str] = None,
    limit: int = 50,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Get user interactions, optionally filtered by type.
    """
    try:
        user_id = getattr(current_user, 'id', None) or current_user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        query = db.table("interactions").select("*").eq("user_id", user_id)

        if type_filter:
            query = query.eq("type", type_filter)

        result = query.order("created_at", desc=True).limit(limit).execute()

        return {
            "interactions": result.data,
            "count": len(result.data)
        }

    except Exception as e:
        logger.exception(f"Error getting interactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
