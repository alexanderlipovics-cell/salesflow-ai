# backend/app/domain/leads/api.py

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, UploadFile, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_async_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.domain.shared.types import RequestContext
from app.domain.leads.service import LeadService
from app.domain.leads.repository import LeadRepository
from app.ai.scenarios import ScenarioId
from app.domain.ai_orchestrator.service import DomainAIService

router = APIRouter(prefix="/domain/leads", tags=["Leads"])


class ChatImportPayload(BaseModel):
    messages: List[Dict[str, Any]]
    channel: str


@router.get("")
async def list_leads(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    repo = LeadRepository(db)
    leads = await repo.list_recent(tenant_id=current_user.tenant_id, limit=50)
    return [
        {
            "id": str(l.id),
            "full_name": l.full_name,
            "email": l.email,
            "phone": l.phone,
            "company": l.company,
            "is_confirmed": l.is_confirmed,
        }
        for l in leads
    ]


@router.post("/zero-input/screenshot")
async def screenshot_to_lead(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.ai_client import get_embedding  # Fallback, falls vision_extract nicht existiert

    ctx = RequestContext(
        tenant_id=current_user.tenant_id,
        user_id=current_user["id"],
        request_id=getattr(request.state, "request_id", None),
    )

    image_bytes = await file.read()
    # OCR Text extraction (vereinfacht - in Production würde man vision_extract nutzen)
    ocr_text = "Extracted text from image"  # Placeholder

    service = LeadService(db)
    lead = await service.create_lead_from_zero_input(
        ctx,
        source_type="screenshot",
        content={
            "ocr_text": ocr_text,
            "filename": file.filename,
            "content_type": file.content_type,
        },
    )
    return {"lead_id": str(lead.id), "is_confirmed": lead.is_confirmed}


@router.post("/zero-input/chat")
async def chat_to_lead(
    request: Request,
    payload: ChatImportPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    ctx = RequestContext(
        tenant_id=current_user.tenant_id,
        user_id=current_user["id"],
        request_id=getattr(request.state, "request_id", None),
    )
    service = LeadService(db)
    lead = await service.create_lead_from_zero_input(
        ctx,
        source_type=f"chat:{payload.channel}",
        content={"chat_messages": payload.messages, "channel": payload.channel},
    )
    return {"lead_id": str(lead.id), "is_confirmed": lead.is_confirmed}


# Beispiel: AI Follow-up + Price Objection Endpoints

class FollowupRequest(BaseModel):
    lead_name: str
    last_message: str
    channel: str


@router.post("/ai/followup/short")
async def generate_short_followup(
    request: Request,
    payload: FollowupRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    ctx = RequestContext(
        tenant_id=current_user.tenant_id,
        user_id=current_user["id"],
        request_id=getattr(request.state, "request_id", None),
    )
    ai = DomainAIService(db)
    text = await ai.run_text(
        tenant_id=ctx.tenant_id,
        scenario_id=ScenarioId.FOLLOWUP_SHORT_WHATSAPP,
        variables={
            "lead_name": payload.lead_name,
            "last_message": payload.last_message,
            "channel": payload.channel,
        },
        request_id=ctx.request_id,
    )
    return {"message": text}

