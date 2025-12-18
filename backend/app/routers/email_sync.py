import base64
import os
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import List, Optional

import httpx
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


router = APIRouter(tags=["emails"])  # KEIN Prefix hier - wird in main.py gesetzt

# Separate router for /email-accounts endpoint (frontend compatibility)
email_accounts_router = APIRouter(tags=["emails"])  # KEIN Prefix hier - wird in main.py gesetzt

# OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = (
    "https://www.googleapis.com/auth/gmail.readonly "
    "https://www.googleapis.com/auth/gmail.send "
    "https://www.googleapis.com/auth/gmail.modify"
)

MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MICROSOFT_SCOPES = "Mail.ReadWrite Mail.Send offline_access"


def _extract_user_id(current_user) -> str:
    """
    Extrahiere User-ID unabhängig von Struktur.
    Prüft 'sub' (JWT standard) zuerst, dann 'id', dann 'user_id'.
    """
    if current_user is None:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext")
    if isinstance(current_user, dict):
        # JWT Standard: 'sub' zuerst prüfen
        user_id = (
            current_user.get("sub")
            or current_user.get("id")
            or current_user.get("user_id")
            or current_user.get("team_member_id")
        )
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Keine Benutzer-ID gefunden")
    return str(user_id)


def _parse_email_address(raw: Optional[str]) -> str:
    """Extrahiert E-Mail-Adresse aus 'Name <mail>' Strings."""
    if not raw:
        return ""
    if "<" in raw and ">" in raw:
        return raw.split("<")[-1].split(">")[0].strip()
    return raw.strip()


# --- OAuth Flow ---
@router.get("/connect/gmail")
async def connect_gmail(current_user=Depends(get_current_active_user)):
    """Generiert Gmail OAuth URL."""
    user_id = _extract_user_id(current_user)
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://salesflow-ai.onrender.com/api/auth/google/callback",
    )

    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Gmail OAuth nicht konfiguriert")

    auth_url = (
        f"{GOOGLE_AUTH_URL}?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={GOOGLE_SCOPES}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={user_id}"
    )
    return {"auth_url": auth_url}


@router.get("/connect/outlook")
async def connect_outlook(current_user=Depends(get_current_active_user)):
    """Generiert Outlook OAuth URL."""
    user_id = _extract_user_id(current_user)
    client_id = os.getenv("MICROSOFT_CLIENT_ID")
    redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI")

    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Outlook OAuth nicht konfiguriert")

    auth_url = (
        f"{MICROSOFT_AUTH_URL}?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={MICROSOFT_SCOPES}&"
        f"state={user_id}"
    )
    return {"auth_url": auth_url}


@router.get("/callback/gmail")
async def gmail_callback(code: str, state: str):
    """Handle Gmail OAuth Callback."""
    user_id = state
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://salesflow-ai.onrender.com/api/auth/google/callback",
    )

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=30,
        )
        token_response.raise_for_status()
        tokens = token_response.json()

        profile_response = await client.get(
            "https://www.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            timeout=30,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()

    expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

    supabase = get_supabase_client()
    supabase.table("email_accounts").upsert(
        {
            "user_id": user_id,
            "provider": "gmail",
            "email": profile.get("emailAddress"),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "token_expires_at": expires_at.isoformat(),
            "sync_enabled": True,
        }
    ).execute()

    frontend_url = os.getenv("FRONTEND_URL", "https://alsales.ai")
    return RedirectResponse(f"{frontend_url}/settings/email?connected=gmail")


@router.get("/callback/outlook")
async def outlook_callback(code: str, state: str):
    """Handle Outlook OAuth Callback."""
    user_id = state
    client_id = os.getenv("MICROSOFT_CLIENT_ID")
    client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
    redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI")

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            MICROSOFT_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=30,
        )
        token_response.raise_for_status()
        tokens = token_response.json()

        profile_response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            timeout=30,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()

    expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

    supabase = get_supabase_client()
    supabase.table("email_accounts").upsert(
        {
            "user_id": user_id,
            "provider": "outlook",
            "email": profile.get("mail") or profile.get("userPrincipalName"),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "token_expires_at": expires_at.isoformat(),
            "sync_enabled": True,
        }
    ).execute()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/settings/email?connected=outlook")


# --- Email Accounts ---
@router.get("/accounts")
async def list_email_accounts(request: Request, current_user=Depends(get_current_active_user)):
    """List email accounts for current user."""
    # Debug-Logging
    auth_header = request.headers.get("Authorization")
    logger.info(f"[EMAIL DEBUG] GET /accounts - Auth header present: {bool(auth_header)}")
    logger.info(f"[EMAIL DEBUG] GET /accounts - Current user: {current_user}")
    
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)
    logger.info(f"[EMAIL DEBUG] GET /accounts - Extracted user_id: {user_id}")

    result = (
        supabase.table("email_accounts")
        .select("id, provider, email, sync_enabled, last_sync_at, created_at")
        .eq("user_id", user_id)
        .execute()
    )
    return {"accounts": result.data or []}


@email_accounts_router.get("")
async def list_email_accounts_alias(request: Request, current_user=Depends(get_current_active_user)):
    """Alias endpoint for /email-accounts (frontend compatibility)."""
    # Debug-Logging
    auth_header = request.headers.get("Authorization")
    logger.info(f"[EMAIL DEBUG] GET /email-accounts - Auth header present: {bool(auth_header)}")
    logger.info(f"[EMAIL DEBUG] GET /email-accounts - Current user: {current_user}")
    
    return await list_email_accounts(request, current_user)




@router.delete("/accounts/{account_id}")
async def disconnect_email_account(account_id: str, current_user=Depends(get_current_active_user)):
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    supabase.table("email_accounts").delete().eq("id", account_id).eq("user_id", user_id).execute()
    return {"success": True}


# --- Email Sync ---
@router.post("/sync")
async def sync_emails(background_tasks: BackgroundTasks, current_user=Depends(get_current_active_user)):
    user_id = _extract_user_id(current_user)
    background_tasks.add_task(sync_user_emails, user_id)
    return {"message": "Sync gestartet"}


async def sync_user_emails(user_id: str):
    supabase = get_supabase_client()
    accounts = (
        supabase.table("email_accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("sync_enabled", True)
        .execute()
    )

    for account in accounts.data or []:
        if account.get("provider") == "gmail":
            await sync_gmail_emails(account, user_id)
        elif account.get("provider") == "outlook":
            await sync_outlook_emails(account, user_id)

        supabase.table("email_accounts").update({"last_sync_at": datetime.utcnow().isoformat()}).eq(
            "id", account["id"]
        ).execute()


async def sync_gmail_emails(account: dict, user_id: str):
    supabase = get_supabase_client()
    access_token = account.get("access_token")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"maxResults": 50, "q": "newer_than:7d"},
            timeout=30,
        )
        response.raise_for_status()
        messages = response.json().get("messages", [])

        for msg in messages:
            existing = supabase.table("emails").select("id").eq("message_id", msg["id"]).execute()
            if existing.data:
                continue

            msg_response = await client.get(
                f"https://www.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": "full"},
                timeout=30,
            )
            msg_response.raise_for_status()
            full_msg = msg_response.json()
            headers = {h["name"]: h["value"] for h in full_msg.get("payload", {}).get("headers", [])}

            from_email = _parse_email_address(headers.get("From"))
            direction = "outbound" if account.get("email", "").lower() in from_email.lower() else "inbound"
            contact_email = (
                from_email if direction == "inbound" else _parse_email_address(headers.get("To", ""))
            )

            lead = (
                supabase.table("leads")
                .select("id")
                .eq("user_id", user_id)
                .ilike("email", f"%{contact_email}%")
                .execute()
            )

            supabase.table("emails").insert(
                {
                    "user_id": user_id,
                    "email_account_id": account["id"],
                    "lead_id": lead.data[0]["id"] if lead.data else None,
                    "message_id": msg["id"],
                    "thread_id": full_msg.get("threadId"),
                    "direction": direction,
                    "from_email": headers.get("From", ""),
                    "to_emails": [headers.get("To", "")],
                    "subject": headers.get("Subject", ""),
                    "snippet": full_msg.get("snippet", ""),
                    "received_at": datetime.utcnow().isoformat(),
                }
            ).execute()


async def sync_outlook_emails(account: dict, user_id: str):
    supabase = get_supabase_client()
    access_token = account.get("access_token")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"$top": 50, "$orderby": "receivedDateTime desc"},
            timeout=30,
        )
        response.raise_for_status()
        messages = response.json().get("value", [])

        for msg in messages:
            existing = supabase.table("emails").select("id").eq("message_id", msg["id"]).execute()
            if existing.data:
                continue

            from_email = msg.get("from", {}).get("emailAddress", {}).get("address", "")
            direction = "outbound" if account.get("email", "").lower() == from_email.lower() else "inbound"
            contact_email = (
                from_email
                if direction == "inbound"
                else msg.get("toRecipients", [{}])[0].get("emailAddress", {}).get("address", "")
            )

            lead = (
                supabase.table("leads")
                .select("id")
                .eq("user_id", user_id)
                .ilike("email", f"%{contact_email}%")
                .execute()
            )

            supabase.table("emails").insert(
                {
                    "user_id": user_id,
                    "email_account_id": account["id"],
                    "lead_id": lead.data[0]["id"] if lead.data else None,
                    "message_id": msg["id"],
                    "thread_id": msg.get("conversationId"),
                    "direction": direction,
                    "from_email": from_email,
                    "to_emails": [
                        r.get("emailAddress", {}).get("address") for r in msg.get("toRecipients", [])
                    ],
                    "subject": msg.get("subject", ""),
                    "body_html": msg.get("body", {}).get("content", ""),
                    "snippet": msg.get("bodyPreview", ""),
                    "is_read": msg.get("isRead", False),
                    "received_at": msg.get("receivedDateTime"),
                }
            ).execute()


# --- Test Endpoint (No Auth) ---
@router.get("/test-no-auth")
async def test_no_auth():
    """Test endpoint ohne Auth - zum Debuggen"""
    return {"status": "ok", "message": "No auth required", "endpoint": "/api/emails/test-no-auth"}


# --- Get Emails ---
@router.get("/")
async def list_emails(
    request: Request,
    lead_id: Optional[str] = Query(default=None, alias="lead_id"),
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_active_user),
):
    # Debug-Logging
    auth_header = request.headers.get("Authorization")
    logger.info(f"[EMAIL DEBUG] GET / - Auth header present: {bool(auth_header)}")
    logger.info(f"[EMAIL DEBUG] GET / - Auth header (first 50 chars): {auth_header[:50] if auth_header else 'None'}...")
    logger.info(f"[EMAIL DEBUG] GET / - Current user type: {type(current_user)}")
    logger.info(f"[EMAIL DEBUG] GET / - Current user: {current_user}")
    
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)
    logger.info(f"[EMAIL DEBUG] GET / - Extracted user_id: {user_id}")

    query = (
        supabase.table("emails")
        .select("*, leads(id, name, company, email)")
        .eq("user_id", user_id)
        .order("received_at", desc=True)
    )

    if lead_id:
        query = query.eq("lead_id", lead_id)

    result = query.range(offset, offset + limit - 1).execute()
    return {"emails": result.data or []}


@router.get("/{email_id}")
async def get_email(email_id: str, current_user=Depends(get_current_active_user)):
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("emails")
        .select("*, leads(id, name, company, email)")
        .eq("id", email_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Email nicht gefunden")

    return result.data


# --- Send Email ---
class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body_html: str
    lead_id: Optional[str] = None
    account_id: Optional[str] = None
    track_opens: bool = True


@router.post("/send")
async def send_email(request: SendEmailRequest, current_user=Depends(get_current_active_user)):
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    if request.account_id:
        account_resp = (
            supabase.table("email_accounts")
            .select("*")
            .eq("id", request.account_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        account = account_resp.data
    else:
        account_resp = (
            supabase.table("email_accounts").select("*").eq("user_id", user_id).limit(1).execute()
        )
        account = account_resp.data[0] if account_resp.data else None

    if not account:
        raise HTTPException(status_code=400, detail="Kein E-Mail-Konto verbunden")

    body_html = request.body_html
    tracking_id = None
    if request.track_opens:
        tracking_id = str(uuid.uuid4())
        tracking_url = f"{os.getenv('API_URL', '')}/api/emails/track/{tracking_id}"
        body_html += f'<img src="{tracking_url}" width="1" height="1" style="display:none;" />'

    if account.get("provider") == "gmail":
        message_id = await send_gmail_email(account, request.to, request.subject, body_html)
    else:
        message_id = await send_outlook_email(account, request.to, request.subject, body_html)

    email_record = (
        supabase.table("emails")
        .insert(
            {
                "user_id": user_id,
                "email_account_id": account["id"],
                "lead_id": request.lead_id,
                "message_id": message_id,
                "direction": "outbound",
                "from_email": account.get("email"),
                "to_emails": [request.to],
                "subject": request.subject,
                "body_html": body_html,
                "sent_at": datetime.utcnow().isoformat(),
            }
        )
        .execute()
    )

    if request.track_opens and tracking_id and email_record.data:
        supabase.table("email_tracking").insert(
            {"email_id": email_record.data[0]["id"], "tracking_id": tracking_id}
        ).execute()

    return {"success": True, "email_id": email_record.data[0]["id"] if email_record.data else None}


async def send_gmail_email(account: dict, to: str, subject: str, body_html: str) -> str:
    message = MIMEText(body_html, "html")
    message["to"] = to
    message["from"] = account.get("email")
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {account.get('access_token')}"},
            json={"raw": raw},
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get("id")


async def send_outlook_email(account: dict, to: str, subject: str, body_html: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers={
                "Authorization": f"Bearer {account.get('access_token')}",
                "Content-Type": "application/json",
            },
            json={
                "message": {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": body_html},
                    "toRecipients": [{"emailAddress": {"address": to}}],
                }
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.headers.get("request-id", str(uuid.uuid4()))


# --- Tracking ---
@router.get("/track/{tracking_id}")
async def track_email_open(tracking_id: str):
    supabase = get_supabase_client()

    tracking = (
        supabase.table("email_tracking").select("email_id").eq("tracking_id", tracking_id).single().execute()
    )

    if tracking.data:
        email_id = tracking.data.get("email_id")
        if email_id:
            current_email = (
                supabase.table("emails").select("open_count").eq("id", email_id).single().execute()
            )
            current_count = (current_email.data or {}).get("open_count", 0) if current_email.data else 0
            supabase.table("emails").update(
                {"open_count": current_count + 1, "opened_at": datetime.utcnow().isoformat()}
            ).eq("id", email_id).execute()

        supabase.table("email_tracking").update(
            {"opened_at": datetime.utcnow().isoformat()}
        ).eq("tracking_id", tracking_id).execute()

    pixel = (
        b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00"
        b"\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02"
        b"\x44\x01\x00\x3b"
    )
    return Response(content=pixel, media_type="image/gif")


# --- Templates ---
@router.get("/templates")
async def list_templates(current_user=Depends(get_current_active_user)):
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("email_templates")
        .select("*")
        .eq("user_id", user_id)
        .order("usage_count", desc=True)
        .execute()
    )
    return {"templates": result.data or []}


class CreateTemplateRequest(BaseModel):
    name: str
    subject: str
    body_html: str
    variables: Optional[List[dict]] = None


@router.post("/templates")
async def create_template(request: CreateTemplateRequest, current_user=Depends(get_current_active_user)):
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    result = (
        supabase.table("email_templates")
        .insert(
            {
                "user_id": user_id,
                "name": request.name,
                "subject": request.subject,
                "body_html": request.body_html,
                "variables": request.variables or [{"name": "name"}, {"name": "company"}],
            }
        )
        .execute()
    )
    return result.data[0] if result.data else {}

