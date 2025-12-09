# backend/app/routers/privacy.py

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.consent_service import ConsentService

router = APIRouter(
    prefix="/privacy",
    tags=["privacy"],
)

@router.get("/export")
async def export_my_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    data = await service.request_data_export(user_id=str(current_user["id"]))
    return data

@router.post("/delete")
async def request_deletion(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    ok = await service.request_data_deletion(user_id=str(current_user["id"]))
    return {"success": ok}

@router.post("/restrict")
async def restrict_processing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    ok = await service.restrict_processing(user_id=str(current_user["id"]))
    return {"success": ok}

@router.get("/compliance")
async def compliance_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    service = ConsentService(db)
    status = await service.check_compliance_status(user_id=str(current_user["id"]))
    return status
