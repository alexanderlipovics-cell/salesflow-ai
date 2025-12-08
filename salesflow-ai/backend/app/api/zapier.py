from datetime import datetime
import hashlib
import secrets
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/zapier", tags=["zapier"])
supabase = get_supabase_client()


# === Models ===
class WebhookSubscription(BaseModel):
    trigger_type: str  # new_lead, lead_status_changed, deal_won, task_completed, new_activity
    target_url: str


class WebhookResponse(BaseModel):
    id: str
    trigger_type: str
    target_url: str
    is_active: bool


class APIKeyResponse(BaseModel):
    api_key: str  # Only shown once on creation
    key_prefix: str
    name: str
    scopes: List[str]


def _extract_user_id(current_user: Any) -> str:
    """Pull the user id from JWT payload or legacy structures."""
    user_id = None
    if isinstance(current_user, dict):
        user_id = (
            current_user.get("sub")
            or current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("team_member_id")
        )
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")
    return str(user_id)


# === Authentication ===
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verify Zapier API key via SHA256 hash lookup."""
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    result = supabase.table("api_keys").select("*").eq("key_hash", key_hash).maybe_single().execute()

    if not result or not result.data:
        raise HTTPException(status_code=401, detail="Invalid API key")

    supabase.table("api_keys").update({"last_used_at": datetime.utcnow().isoformat()}).eq(
        "id", result.data["id"]
    ).execute()

    return result.data


# === API Key Management ===
@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(name: str = "Zapier", current_user=Depends(get_current_user)):
    """Generate new API key for Zapier."""
    user_id = _extract_user_id(current_user)
    raw_key = f"sf_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    supabase.table("api_keys").insert(
        {
            "user_id": user_id,
            "key_hash": key_hash,
            "key_prefix": key_prefix,
            "name": name,
            "scopes": ["leads:read", "leads:write", "deals:read", "deals:write", "contacts:read"],
        }
    ).execute()

    return {
        "api_key": raw_key,
        "key_prefix": key_prefix,
        "name": name,
        "scopes": ["leads:read", "leads:write", "deals:read", "deals:write", "contacts:read"],
    }


@router.get("/api-keys")
async def list_api_keys(current_user=Depends(get_current_user)):
    """List all API keys (without revealing full key)."""
    user_id = _extract_user_id(current_user)
    result = (
        supabase.table("api_keys")
        .select("id, key_prefix, name, scopes, created_at, last_used_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str, current_user=Depends(get_current_user)):
    """Revoke an API key for the authenticated user."""
    user_id = _extract_user_id(current_user)
    supabase.table("api_keys").delete().eq("id", key_id).eq("user_id", user_id).execute()
    return {"success": True}


# === Webhook Subscriptions (for Zapier triggers) ===
@router.post("/webhooks/subscribe")
async def subscribe_webhook(subscription: WebhookSubscription, api_key=Depends(verify_api_key)):
    """Subscribe to a trigger event (called by Zapier)."""
    result = (
        supabase.table("zapier_webhooks")
        .insert(
            {
                "user_id": api_key["user_id"],
                "trigger_type": subscription.trigger_type,
                "target_url": subscription.target_url,
            }
        )
        .execute()
    )
    return {"id": result.data[0]["id"]} if result and result.data else {"id": None}


@router.delete("/webhooks/{webhook_id}")
async def unsubscribe_webhook(webhook_id: str, api_key=Depends(verify_api_key)):
    """Unsubscribe from trigger (called by Zapier)."""
    supabase.table("zapier_webhooks").delete().eq("id", webhook_id).eq("user_id", api_key["user_id"]).execute()
    return {"success": True}


# === Trigger Sample Data (for Zapier setup) ===
@router.get("/triggers/{trigger_type}/sample")
async def get_trigger_sample(trigger_type: str, api_key=Depends(verify_api_key)):
    """Return sample data for Zapier trigger setup."""
    samples: Dict[str, Dict[str, Any]] = {
        "new_lead": {
            "id": "lead_123",
            "first_name": "Max",
            "last_name": "Mustermann",
            "email": "max@example.com",
            "phone": "+49123456789",
            "source": "instagram",
            "status": "new",
            "created_at": "2025-12-08T10:00:00Z",
        },
        "lead_status_changed": {
            "id": "lead_123",
            "first_name": "Max",
            "last_name": "Mustermann",
            "old_status": "new",
            "new_status": "qualified",
            "changed_at": "2025-12-08T10:00:00Z",
        },
        "deal_won": {
            "id": "deal_456",
            "lead_id": "lead_123",
            "lead_name": "Max Mustermann",
            "value": 299.00,
            "currency": "EUR",
            "product": "Starter Kit",
            "won_at": "2025-12-08T10:00:00Z",
        },
        "task_completed": {
            "id": "task_789",
            "title": "Follow-up Call",
            "lead_id": "lead_123",
            "lead_name": "Max Mustermann",
            "completed_at": "2025-12-08T10:00:00Z",
        },
    }
    return [samples.get(trigger_type, {})]


# === Actions (Zapier calls these) ===
@router.post("/actions/create-lead")
async def create_lead_action(data: Dict[str, Any], api_key=Depends(verify_api_key)):
    """Create a new lead (Zapier action)."""
    lead_data = {
        "user_id": api_key["user_id"],
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "source": data.get("source", "zapier"),
        "status": "new",
        "notes": data.get("notes"),
    }
    result = supabase.table("leads").insert(lead_data).execute()
    return result.data[0] if result and result.data else {"error": "Lead konnte nicht erstellt werden"}


@router.post("/actions/update-lead/{lead_id}")
async def update_lead_action(lead_id: str, data: Dict[str, Any], api_key=Depends(verify_api_key)):
    """Update existing lead (Zapier action)."""
    result = (
        supabase.table("leads")
        .update(data)
        .eq("id", lead_id)
        .eq("user_id", api_key["user_id"])
        .execute()
    )
    return result.data[0] if result and result.data else {"error": "Lead not found"}


@router.post("/actions/create-task")
async def create_task_action(data: Dict[str, Any], api_key=Depends(verify_api_key)):
    """Create a task (Zapier action)."""
    task_data = {
        "user_id": api_key["user_id"],
        "lead_id": data.get("lead_id"),
        "title": data.get("title"),
        "description": data.get("description"),
        "due_date": data.get("due_date"),
        "priority": data.get("priority", "medium"),
    }
    result = supabase.table("tasks").insert(task_data).execute()
    return result.data[0] if result and result.data else {"error": "Task konnte nicht erstellt werden"}


@router.post("/actions/add-activity")
async def add_activity_action(data: Dict[str, Any], api_key=Depends(verify_api_key)):
    """Log an activity (Zapier action)."""
    activity_data = {
        "user_id": api_key["user_id"],
        "lead_id": data.get("lead_id"),
        "type": data.get("type", "note"),
        "content": data.get("content"),
        "metadata": data.get("metadata", {}),
    }
    result = supabase.table("activities").insert(activity_data).execute()
    return result.data[0] if result and result.data else {"error": "Aktivität konnte nicht erstellt werden"}


# === Webhook Dispatcher (called internally when events happen) ===
async def dispatch_webhook(user_id: str, trigger_type: str, payload: Dict[str, Any]):
    """Send webhook to all subscribed URLs and log delivery."""
    webhooks = (
        supabase.table("zapier_webhooks")
        .select("*")
        .eq("user_id", user_id)
        .eq("trigger_type", trigger_type)
        .eq("is_active", True)
        .execute()
    )

    if not webhooks or not webhooks.data:
        return

    async with httpx.AsyncClient() as client:
        for webhook in webhooks.data:
            try:
                response = await client.post(webhook["target_url"], json=payload, timeout=30.0)
                supabase.table("webhook_logs").insert(
                    {
                        "webhook_id": webhook["id"],
                        "payload": payload,
                        "response_status": response.status_code,
                        "response_body": response.text[:500],
                    }
                ).execute()

                supabase.table("zapier_webhooks").update(
                    {"last_triggered_at": datetime.utcnow().isoformat()}
                ).eq("id", webhook["id"]).execute()
            except Exception as exc:  # noqa: BLE001
                supabase.table("webhook_logs").insert(
                    {
                        "webhook_id": webhook["id"],
                        "payload": payload,
                        "response_status": 0,
                        "response_body": str(exc),
                    }
                ).execute()

