# backend/app/routers/lead_suggestions.py

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user_dict
from app.services.smart_suggestions import SmartSuggestionEngine

router = APIRouter(
    prefix="/leads",
    tags=["leads"],
    dependencies=[Depends(get_current_user_dict)]
)

@router.get("/{lead_id}/suggestions")
async def get_lead_suggestions(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict),
):
    engine = SmartSuggestionEngine(db=db)
    result = await engine.suggest_next_action(lead_id=lead_id)
    return result
