import uuid
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.ai.agent import run_sales_agent
from app.core.security.main import get_current_user
from app.core.deps import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    lead_id: Optional[str] = None
    lead_context: Optional[Dict[str, Any]] = None
    include_context: Optional[bool] = None


class ChatResponse(BaseModel):
    message: str
    tools_used: List[dict]
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    payload: ChatRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Chat with the AI Sales Agent."""

    try:
        body = await request.json()
        logger.info(f"AI Chat request body: {body}")
    except Exception as e:
        logger.warning(f"AI Chat could not parse request body for logging: {e}")

    user_id = getattr(current_user, "id", None) or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User-Kontext fehlt")

    session_id = payload.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        db.table("ai_chat_sessions").insert(
            {
                "id": session_id,
                "user_id": user_id,
            }
        ).execute()

    # If the frontend sends conversation_history, prefer that; otherwise fall back to stored history
    if payload.conversation_history:
        message_history = payload.conversation_history
    else:
        history = (
            db.table("ai_chat_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        message_history = (
            [{"role": m.get("role"), "content": m.get("content")} for m in history.data]
            if history and history.data
            else []
        )

    result = await run_sales_agent(
        message=payload.message,
        user_id=user_id,
        db=db,
        session_id=session_id,
        message_history=message_history,
    )

    return ChatResponse(
        message=result["message"],
        tools_used=result["tools_used"],
        session_id=session_id,
    )

