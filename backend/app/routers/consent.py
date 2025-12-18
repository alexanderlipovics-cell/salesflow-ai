# backend/app/routers/consent.py

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.consent_service import ConsentService

router = APIRouter(
    prefix="/consent",
    tags=["consent"],
)

class ConsentPayload(BaseModel):
    categories: Dict[str, bool]

@router.post("", status_code=201)
async def save_consent(
    payload: ConsentPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    ip = request.client.host if request.client else "0.0.0.0"
    ua = request.headers.get("user-agent", "unknown")

    record = await service.update_consent(
        user_id=str(current_user["id"]),
        consent_data=payload.categories,
        ip_address=ip,
        user_agent=ua,
    )

    return {
        "status": "ok",
        "user_id": str(current_user["id"]),
        "consent_version": record.consent_version,
        "created_at": record.created_at,
        "categories": record.consent_data,
    }

@router.get("")
async def get_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    record = await service.get_user_consent(user_id=str(current_user.id))

    if not record:
        return {"has_consent": False, "categories": {}}

    return {
        "has_consent": True,
        "consent_version": record.consent_version,
        "created_at": record.created_at,
        "categories": record.consent_data,
    }
