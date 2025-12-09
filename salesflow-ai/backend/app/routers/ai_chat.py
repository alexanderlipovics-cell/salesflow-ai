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
    message: Optional[str] = None
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
    current_user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Chat with the AI Sales Agent."""

    try:
        body = await request.json()
        logger.info(f"AI Chat request body: {body}")

        # Extract message (allow fallback key names)
        message = body.get("message") or body.get("prompt")
        if not message:
            raise HTTPException(status_code=400, detail="No message provided")

        session_id = body.get("session_id") or body.get("sessionId")
    logger.info(f"AI Chat current_user: {current_user}")
    user_id = (
        current_user.get("sub")
        or current_user.get("id")
        or current_user.get("user_id")
    )
        if not user_id:
            raise HTTPException(status_code=400, detail="User-Kontext fehlt")

        if not session_id:
            session_id = str(uuid.uuid4())
            db.table("ai_chat_sessions").insert(
                {
                    "id": session_id,
                    "user_id": user_id,
                }
            ).execute()

        conversation_history = body.get("conversation_history") or body.get("messages") or body.get("history")
        if conversation_history and not isinstance(conversation_history, list):
            logger.warning("conversation_history provided but not a list; ignoring")
            conversation_history = None

        if conversation_history:
            message_history = conversation_history
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
            message=message,
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

