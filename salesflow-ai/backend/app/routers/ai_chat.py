from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.ai.agent import run_sales_agent
from app.core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    tools_used: List[dict]
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Chat with the AI Sales Agent."""

    user_id = getattr(current_user, "id", None) or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User-Kontext fehlt")

    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        db.table("ai_chat_sessions").insert(
            {
                "id": session_id,
                "user_id": user_id,
            }
        ).execute()

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
        message=request.message,
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

