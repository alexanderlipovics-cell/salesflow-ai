import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.webhook_security import (
    verify_facebook_signature,
    enforce_rate_limit,
    enforce_ip_whitelist,
)
from app.services.lead_processing_service import (
    IngestedLead,
    LeadProcessingService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/webhooks/facebook",
    tags=["webhooks", "facebook"],
)

# ---------- VERIFY ENDPOINT (für Facebook Setup) ----------

@router.get("", response_class=PlainTextResponse)
async def verify_facebook_webhook(
    hub_mode: str,
    hub_verify_token: str,
    hub_challenge: str,
):
    """
    Wird von Facebook beim Anlegen des Webhooks aufgerufen.
    """
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.facebook_verify_token
    ):
        return hub_challenge
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid verify token",
    )

# ---------- EVENT ENDPOINT ----------

@router.post("")
async def handle_facebook_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    client_ip = request.client.host if request.client else "0.0.0.0"
    enforce_rate_limit(client_ip, key_prefix="facebook_webhook")
    enforce_ip_whitelist(client_ip, allowed_cidrs=settings.facebook_webhook_ip_whitelist)

    verify_facebook_signature(raw_body, request, settings.facebook_app_secret)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.exception("Invalid JSON payload from Facebook")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON",
        )

    logger.info("Received Facebook webhook payload: %s", payload)

    entry_list: list[dict[str, Any]] = payload.get("entry", [])
    service = LeadProcessingService(db=db)

    for entry in entry_list:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            leadgen_id = value.get("leadgen_id")
            form_id = value.get("form_id")
            page_id = value.get("page_id")
            if not leadgen_id:
                continue

            try:
                lead_data = await _fetch_facebook_lead(leadgen_id)
                ingested = _map_facebook_lead_to_ingested(
                    leadgen_id=leadgen_id,
                    page_id=page_id,
                    form_id=form_id,
                    raw_lead=lead_data,
                )
                service.process_ingested_lead(ingested)
            except Exception:
                logger.exception("Failed to process facebook lead %s", leadgen_id)

    return {"status": "ok"}

# ---------- Helper: Facebook API ----------

async def _fetch_facebook_lead(leadgen_id: str) -> dict[str, Any]:
    """
    Holt Lead-Daten aus der Graph API.
    PAGE_ACCESS_TOKEN muss die Lead-Gen-Permission haben.
    """
    url = f"https://graph.facebook.com/v18.0/{leadgen_id}"
    params = {
        "access_token": settings.facebook_page_access_token,
        "fields": "created_time,field_data,ad_id,form_id",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        if resp.status_code >= 400:
            logger.error(
                "Error fetching facebook lead %s: %s %s",
                leadgen_id,
                resp.status_code,
                resp.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error fetching Facebook lead data",
            )
        return resp.json()

def _map_facebook_lead_to_ingested(
    leadgen_id: str,
    page_id: str | None,
    form_id: str | None,
    raw_lead: dict[str, Any],
) -> IngestedLead:
    field_data = raw_lead.get("field_data", []) or []
    field_map: dict[str, Any] = {}
    for field in field_data:
        name = field.get("name")
        values = field.get("values") or []
        if not name:
            continue
        field_map[name] = values[0] if values else None

    email = field_map.get("email") or field_map.get("email_address")
    phone = field_map.get("phone_number") or field_map.get("phone")
    full_name = field_map.get("full_name") or field_map.get("name")
    first_name = field_map.get("first_name")
    last_name = field_map.get("last_name")
    campaign_name = raw_lead.get("ad_id")  # oder über Ads-API verfeinern

    created_time_str = raw_lead.get("created_time")
    if created_time_str:
        received_at = datetime.fromisoformat(created_time_str.replace("Z", "+00:00"))
    else:
        received_at = datetime.now(tz=timezone.utc)

    return IngestedLead(
        source="facebook",
        external_id=leadgen_id,
        campaign_name=campaign_name,
        form_name=str(form_id) if form_id else None,
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        message=None,
        company=None,
        job_title=None,
        industry=None,
        raw_payload={
            "lead": raw_lead,
            "page_id": page_id,
        },
        received_at=received_at,
    )
