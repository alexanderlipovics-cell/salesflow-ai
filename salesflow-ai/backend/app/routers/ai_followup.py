from uuid import UUID
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.services.followup_engine import FollowUpEngine
from app.routers.followups import get_engine

router = APIRouter(prefix="/ai", tags=["AI"])


class GenerateFollowupRequest(BaseModel):
    lead_id: UUID
    context: Optional[Any] = None
    follow_up_type: Optional[str] = None


class GenerateFollowupResponse(BaseModel):
    message: str
    suggested_channel: Optional[str] = None
    lead_id: UUID


@router.post("/generate-followup", response_model=GenerateFollowupResponse)
async def generate_followup_message(
    body: GenerateFollowupRequest,
    engine: FollowUpEngine = Depends(get_engine),
    current_user=Depends(get_current_user),
):
    """
    Generiert eine Follow-up Nachricht für einen Lead.
    Wird von Magic Send genutzt, um Vorschau + Kanal-Empfehlung zu liefern.
    """
    try:
        ai_message = await engine.generate_message(
            lead_id=body.lead_id,
            context={
                "context": body.context,
                "follow_up_type": body.follow_up_type,
                "user_id": getattr(current_user, "id", None) or current_user.get("user_id"),
            },
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"AI konnte keine Nachricht generieren: {exc}") from exc

    if not ai_message:
        raise HTTPException(status_code=404, detail="Keine Nachricht generiert")

    suggested_channel = getattr(ai_message.channel, "value", None) or str(ai_message.channel)

    return GenerateFollowupResponse(
        message=ai_message.content,
        suggested_channel=suggested_channel,
        lead_id=ai_message.lead_id,
    )

