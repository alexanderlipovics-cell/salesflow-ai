# backend/app/routers/conversations.py

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user_dict
from app.services.conversation_service import ConversationMemoryService

router = APIRouter(
    prefix="/conversations",
    tags=["conversations"],
    dependencies=[Depends(get_current_user_dict)]
)

@router.get("/{conversation_id}/memory")
async def get_conversation_memory(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict),
):
    service = ConversationMemoryService(db=db)
    # hier hole ich einfach die letzten N für diese conversation_id
    memories = await service.retrieve_context(
        user_id=current_user["user_id"],
        lead_id=None,
        query=None,
        top_k=20,
    )
    return [
        {
            "id": m.id,
            "content": m.content,
            "metadata": m.metadata,
            "created_at": m.created_at,
        }
        for m in memories
        if m.conversation_id == conversation_id
    ]
