import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.webhook_security import (
    verify_linkedin_signature,
    enforce_rate_limit,
    enforce_ip_whitelist,
)
from app.services.lead_processing_service import (
    IngestedLead,
    LeadProcessingService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/webhooks/linkedin",
    tags=["webhooks", "linkedin"],
)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

# Lead-Endpoint: bitte mit aktueller Doku abgleichen:
LINKEDIN_LEAD_URL_TEMPLATE = "https://api.linkedin.com/v2/leadForms/{lead_id}"

# ---------- OAuth2 Flow ----------

@router.get("/oauth/start")
async def linkedin_oauth_start():
    from urllib.parse import urlencode
    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": settings.linkedin_redirect_uri,
        "scope": "r_liteprofile r_emailaddress rw_organization_admin r_ads",
        "state": "csrf-token",  # TODO: echten CSRF-State speichern & prüfen
    }
    url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)

@router.get("/oauth/callback")
async def linkedin_oauth_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.linkedin_redirect_uri,
        "client_id": settings.linkedin_client_id,
        "client_secret": settings.linkedin_client_secret,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(LINKEDIN_TOKEN_URL, data=data)
        if resp.status_code >= 400:
            logger.error("LinkedIn token exchange failed: %s %s", resp.status_code, resp.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="LinkedIn token exchange failed",
            )
        token_data = resp.json()

    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")

    # TODO: Access-Token in einer Integration-Tabelle speichern
    logger.info("LinkedIn access token received (expires_in=%s)", expires_in)

    # store_linkedin_token(db, access_token, expires_in)

    return {"status": "ok"}

# ---------- Webhook Endpoint ----------

@router.post("")
async def handle_linkedin_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    client_ip = request.client.host if request.client else "0.0.0.0"
    enforce_rate_limit(client_ip, key_prefix="linkedin_webhook")
    enforce_ip_whitelist(client_ip, allowed_cidrs=settings.linkedin_webhook_ip_whitelist)

    verify_linkedin_signature(raw_body, request, settings.linkedin_client_secret)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.exception("Invalid JSON payload from LinkedIn")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON",
        )

    logger.info("Received LinkedIn webhook payload: %s", payload)

    service = LeadProcessingService(db=db)

    events: list[dict[str, Any]] = payload.get("events", [])
    for event in events:
        if event.get("eventType") != "LEAD_GENERATION":
            continue

        lead_id = event.get("object", {}).get("id")
        if not lead_id:
            continue

        try:
            lead_data = await _fetch_linkedin_lead(lead_id)
            ingested = _map_linkedin_lead_to_ingested(lead_id, lead_data)
            ingested = _apply_icp_matching(ingested)
            service.process_ingested_lead(ingested)
        except Exception:
            logger.exception("Failed to process linkedin lead %s", lead_id)

    return {"status": "ok"}

# ---------- Helper: LinkedIn API ----------

async def _get_linkedin_access_token() -> str:
    """
    Aktuell: aus Settings.
    Später: aus DB / Secret Store holen.
    """
    if not settings.linkedin_access_token:
        raise RuntimeError("LINKEDIN_ACCESS_TOKEN not configured")
    return settings.linkedin_access_token

async def _fetch_linkedin_lead(lead_id: str) -> dict[str, Any]:
    access_token = await _get_linkedin_access_token()
    url = LINKEDIN_LEAD_URL_TEMPLATE.format(lead_id=lead_id)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            logger.error(
                "Error fetching linkedin lead %s: %s %s",
                lead_id,
                resp.status_code,
                resp.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error fetching LinkedIn lead data",
            )
        return resp.json()

def _map_linkedin_lead_to_ingested(lead_id: str, raw_lead: dict[str, Any]) -> IngestedLead:
    created_at = datetime.now(tz=timezone.utc)
    created_at_raw = raw_lead.get("createdAt")
    if created_at_raw:
        # TODO: korrektes Format laut API parsen
        created_at = datetime.now(tz=timezone.utc)

    email = raw_lead.get("email")
    phone = raw_lead.get("phoneNumber")
    first_name = raw_lead.get("firstName")
    last_name = raw_lead.get("lastName")
    full_name = " ".join([p for p in [first_name, last_name] if p]).strip() or None

    company = raw_lead.get("companyName")
    job_title = raw_lead.get("jobTitle")
    industry = raw_lead.get("industry")
    campaign_name = raw_lead.get("campaignName")

    return IngestedLead(
        source="linkedin",
        external_id=lead_id,
        campaign_name=campaign_name,
        form_name=raw_lead.get("formName"),
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        message=None,
        company=company,
        job_title=job_title,
        industry=industry,
        raw_payload=raw_lead,
        received_at=created_at,
    )

def _apply_icp_matching(lead: IngestedLead) -> IngestedLead:
    """
    Simple ICP-Qualifikation.
    Später durch echtes Rule-Set / ML ersetzbar.
    """
    icp_match = False
    if lead.industry and lead.industry.lower() in ["financial services", "real estate"]:
        icp_match = True

    if lead.job_title and any(
        kw in lead.job_title.lower()
        for kw in ["founder", "ceo", "sales", "vertrieb"]
    ):
        icp_match = True

    lead.raw_payload["icp_match"] = icp_match
    return lead
