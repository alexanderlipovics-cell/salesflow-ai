from datetime import datetime, timedelta
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.supabase_client import get_supabase_client
from app.core.security import get_current_active_user
from app.services.gmail_service import GmailService
from app.services.google_auth_service import google_auth_service

router = APIRouter(prefix="/api/emails", tags=["Emails"])


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    html: bool = False
    lead_id: Optional[str] = None
    thread_id: Optional[str] = None


def _extract_user_id(user: Any) -> str:
    if isinstance(user, dict):
        return str(user.get("id") or user.get("user_id") or user.get("sub"))
    if hasattr(user, "id"):
        return str(getattr(user, "id"))
    return str(user)


async def get_gmail_service(user=Depends(get_current_active_user)) -> GmailService:
    """Get authenticated Gmail service for user."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(user)

    result = (
        supabase.table("email_accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    account = result.data

    if account.get("token_expires_at"):
        expires_at = datetime.fromisoformat(account["token_expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.utcnow().replace(tzinfo=expires_at.tzinfo):
            if not account.get("refresh_token"):
                raise HTTPException(status_code=401, detail="Gmail token expired, please reconnect")

            tokens = await google_auth_service.refresh_access_token(account["refresh_token"])
            supabase.table("email_accounts").update(
                {
                    "access_token": tokens["access_token"],
                    "token_expires_at": (datetime.utcnow() + timedelta(seconds=tokens["expires_in"])).isoformat(),
                }
            ).eq("id", account["id"]).execute()

            return GmailService(tokens["access_token"])

    return GmailService(account["access_token"])


@router.get("/")
async def list_emails(
    user=Depends(get_current_active_user),
    gmail: GmailService = Depends(get_gmail_service),
    query: Optional[str] = Query(default=None),
    max_results: int = Query(default=20, le=100),
    page_token: Optional[str] = Query(default=None),
):
    """List emails from Gmail."""
    try:
        result = await gmail.list_messages(
            max_results=max_results,
            query=query,
            page_token=page_token,
        )

        emails = []
        for msg in result.get("messages", [])[:max_results]:
            full_msg = await gmail.get_message(msg["id"])
            parsed = GmailService.parse_message(full_msg)
            emails.append(parsed)

        return {"emails": emails, "next_page_token": result.get("nextPageToken")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{email_id}")
async def get_email(email_id: str, gmail: GmailService = Depends(get_gmail_service)):
    """Get a specific email."""
    try:
        message = await gmail.get_message(email_id)
        return GmailService.parse_message(message)
    except Exception:
        raise HTTPException(status_code=404, detail="Email not found")


@router.post("/send")
async def send_email(
    request: SendEmailRequest,
    user=Depends(get_current_active_user),
    gmail: GmailService = Depends(get_gmail_service),
):
    """Send an email via Gmail."""
    try:
        result = await gmail.send_message(
            to=request.to,
            subject=request.subject,
            body=request.body,
            html=request.html,
            thread_id=request.thread_id,
        )

        if request.lead_id:
            supabase = get_supabase_client()
            try:
                supabase.table("interactions").insert(
                    {
                        "user_id": _extract_user_id(user),
                        "lead_id": request.lead_id,
                        "type": "email_sent",
                        "channel": "email",
                        "notes": f"Subject: {request.subject}",
                        "created_at": datetime.utcnow().isoformat(),
                    }
                ).execute()

                supabase.table("leads").update({"last_contact_at": datetime.utcnow().isoformat()}).eq(
                    "id", request.lead_id
                ).execute()
            except Exception as log_error:
                print(f"[Emails] Logging interaction failed: {log_error}")

        return {"success": True, "message_id": result.get("id")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lead/{lead_id}")
async def get_emails_for_lead(
    lead_id: str,
    user=Depends(get_current_active_user),
    gmail: GmailService = Depends(get_gmail_service),
):
    """Get all emails related to a specific lead."""
    supabase = get_supabase_client()

    lead = supabase.table("leads").select("email").eq("id", lead_id).single().execute()

    if not lead.data or not lead.data.get("email"):
        return {"emails": []}

    lead_email = lead.data["email"]

    result = await gmail.list_messages(query=f"from:{lead_email} OR to:{lead_email}", max_results=50)

    emails = []
    for msg in result.get("messages", []):
        full_msg = await gmail.get_message(msg["id"])
        parsed = GmailService.parse_message(full_msg)
        emails.append(parsed)

    return {"emails": emails, "lead_email": lead_email}


@router.post("/{email_id}/read")
async def mark_as_read(email_id: str, gmail: GmailService = Depends(get_gmail_service)):
    """Mark an email as read."""
    await gmail.mark_as_read(email_id)
    return {"success": True}

