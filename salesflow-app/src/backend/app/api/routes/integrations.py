"""
╔════════════════════════════════════════════════════════════════════════════╗
║  INTEGRATIONS API ROUTES                                                   ║
║  External Service Integration Layer                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Namespace: /api/v1/integrations/*

Current Integrations (Phase 1):
- Gmail / Google Workspace
- Outlook / Microsoft 365
- HubSpot CRM
- Pipedrive CRM
- Calendly

Future Integrations:
- Salesforce
- Zendesk
- Intercom
- Slack
- Zapier

Endpoints:
- GET /integrations - List available integrations
- GET /integrations/{provider}/status - Check integration status
- POST /integrations/{provider}/connect - Initiate OAuth flow
- DELETE /integrations/{provider}/disconnect - Remove integration
- POST /integrations/{provider}/sync - Trigger sync
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.features import check_feature, Feature

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class IntegrationProvider(str, Enum):
    """Available integration providers."""
    GMAIL = "gmail"
    OUTLOOK = "outlook"
    HUBSPOT = "hubspot"
    PIPEDRIVE = "pipedrive"
    CALENDLY = "calendly"
    SALESFORCE = "salesforce"
    SLACK = "slack"
    ZAPIER = "zapier"


class IntegrationStatus(str, Enum):
    """Integration connection status."""
    NOT_CONNECTED = "not_connected"
    PENDING = "pending"
    CONNECTED = "connected"
    ERROR = "error"
    EXPIRED = "expired"


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION CATALOG
# ═══════════════════════════════════════════════════════════════════════════════

INTEGRATION_CATALOG = {
    IntegrationProvider.GMAIL: {
        "name": "Gmail",
        "description": "E-Mail senden und empfangen via Gmail",
        "icon": "📧",
        "category": "email",
        "features": ["send_email", "receive_email", "track_opens"],
        "required_plan": "starter",
        "oauth_provider": "google",
        "status": "available",
    },
    IntegrationProvider.OUTLOOK: {
        "name": "Microsoft Outlook",
        "description": "E-Mail via Outlook/Office 365",
        "icon": "📬",
        "category": "email",
        "features": ["send_email", "receive_email", "calendar_sync"],
        "required_plan": "starter",
        "oauth_provider": "microsoft",
        "status": "available",
    },
    IntegrationProvider.HUBSPOT: {
        "name": "HubSpot CRM",
        "description": "Leads und Deals mit HubSpot synchronisieren",
        "icon": "🧡",
        "category": "crm",
        "features": ["sync_contacts", "sync_deals", "activity_logging"],
        "required_plan": "pro",
        "oauth_provider": "hubspot",
        "status": "available",
    },
    IntegrationProvider.PIPEDRIVE: {
        "name": "Pipedrive",
        "description": "Pipedrive CRM Integration",
        "icon": "🔵",
        "category": "crm",
        "features": ["sync_contacts", "sync_deals", "activity_logging"],
        "required_plan": "pro",
        "oauth_provider": "pipedrive",
        "status": "available",
    },
    IntegrationProvider.CALENDLY: {
        "name": "Calendly",
        "description": "Terminbuchung über Calendly",
        "icon": "📅",
        "category": "scheduling",
        "features": ["schedule_meetings", "sync_availability"],
        "required_plan": "starter",
        "oauth_provider": "calendly",
        "status": "available",
    },
    IntegrationProvider.SALESFORCE: {
        "name": "Salesforce",
        "description": "Salesforce CRM Integration (Enterprise)",
        "icon": "☁️",
        "category": "crm",
        "features": ["sync_contacts", "sync_deals", "full_sync"],
        "required_plan": "enterprise",
        "oauth_provider": "salesforce",
        "status": "coming_soon",
    },
    IntegrationProvider.SLACK: {
        "name": "Slack",
        "description": "Benachrichtigungen in Slack erhalten",
        "icon": "💬",
        "category": "communication",
        "features": ["notifications", "activity_updates"],
        "required_plan": "team",
        "oauth_provider": "slack",
        "status": "coming_soon",
    },
    IntegrationProvider.ZAPIER: {
        "name": "Zapier",
        "description": "Verbinde Sales Flow AI mit 5000+ Apps",
        "icon": "⚡",
        "category": "automation",
        "features": ["triggers", "actions", "custom_workflows"],
        "required_plan": "enterprise",
        "oauth_provider": "zapier",
        "status": "coming_soon",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class IntegrationInfo(BaseModel):
    """Integration information."""
    id: str
    name: str
    description: str
    icon: str
    category: str
    features: List[str]
    required_plan: str
    status: str


class IntegrationStatusResponse(BaseModel):
    """Integration status response."""
    provider: str
    status: str
    connected_at: Optional[str]
    last_sync: Optional[str]
    error_message: Optional[str]
    account_info: Optional[Dict[str, Any]]


class ConnectRequest(BaseModel):
    """OAuth connection request."""
    redirect_uri: str = Field(..., description="Where to redirect after OAuth")


class ConnectResponse(BaseModel):
    """OAuth connection response."""
    auth_url: str
    state: str


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=Dict[str, Any])
async def list_integrations(
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all available integrations.
    
    Shows which integrations are available, connected, and coming soon.
    """
    db = get_supabase()
    
    # Get user's connected integrations
    connected = db.table("user_integrations").select(
        "provider, status, connected_at"
    ).eq("user_id", str(current_user.id)).execute()
    
    connected_map = {
        item["provider"]: item for item in (connected.data or [])
    }
    
    integrations = []
    for provider, info in INTEGRATION_CATALOG.items():
        if category and info["category"] != category:
            continue
        
        connection = connected_map.get(provider.value, {})
        
        integrations.append({
            "id": provider.value,
            "name": info["name"],
            "description": info["description"],
            "icon": info["icon"],
            "category": info["category"],
            "features": info["features"],
            "required_plan": info["required_plan"],
            "availability": info["status"],
            "is_connected": connection.get("status") == "connected",
            "connected_at": connection.get("connected_at"),
        })
    
    categories = list(set(i["category"] for i in INTEGRATION_CATALOG.values()))
    
    return {
        "integrations": integrations,
        "categories": categories,
        "connected_count": sum(1 for i in integrations if i["is_connected"]),
    }


@router.get("/{provider}/status", response_model=IntegrationStatusResponse)
async def get_integration_status(
    provider: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get status of a specific integration.
    
    Returns connection status, last sync time, and any errors.
    """
    try:
        integration = IntegrationProvider(provider)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    
    db = get_supabase()
    
    result = db.table("user_integrations").select("*").eq(
        "user_id", str(current_user.id)
    ).eq("provider", provider).single().execute()
    
    if not result.data:
        return IntegrationStatusResponse(
            provider=provider,
            status=IntegrationStatus.NOT_CONNECTED.value,
            connected_at=None,
            last_sync=None,
            error_message=None,
            account_info=None,
        )
    
    data = result.data
    
    return IntegrationStatusResponse(
        provider=provider,
        status=data.get("status", "unknown"),
        connected_at=data.get("connected_at"),
        last_sync=data.get("last_sync_at"),
        error_message=data.get("error_message"),
        account_info=data.get("account_info"),
    )


@router.post("/{provider}/connect", response_model=ConnectResponse)
async def connect_integration(
    provider: str,
    request: ConnectRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Initiate OAuth connection for an integration.
    
    Returns the authorization URL to redirect the user to.
    """
    try:
        integration = IntegrationProvider(provider)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    
    info = INTEGRATION_CATALOG[integration]
    
    # Check if available
    if info["status"] == "coming_soon":
        raise HTTPException(
            status_code=400,
            detail=f"{info['name']} integration is coming soon"
        )
    
    # Check plan access
    has_api = await check_feature(str(current_user.id), Feature.API_ACCESS)
    if info["required_plan"] == "enterprise" and not has_api:
        raise HTTPException(
            status_code=403,
            detail=f"{info['name']} requires Enterprise plan"
        )
    
    # TODO: Implement actual OAuth flow
    # For now, return placeholder
    import uuid
    state = str(uuid.uuid4())
    
    # Store state in database for verification
    db = get_supabase()
    db.table("oauth_states").insert({
        "state": state,
        "user_id": str(current_user.id),
        "provider": provider,
        "redirect_uri": request.redirect_uri,
    }).execute()
    
    # Generate auth URL (placeholder)
    auth_url = f"https://oauth.{provider}.com/authorize?state={state}&redirect_uri={request.redirect_uri}"
    
    return ConnectResponse(
        auth_url=auth_url,
        state=state,
    )


@router.delete("/{provider}/disconnect", response_model=Dict[str, Any])
async def disconnect_integration(
    provider: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Disconnect an integration.
    
    Removes OAuth tokens and clears synced data.
    """
    try:
        integration = IntegrationProvider(provider)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    
    db = get_supabase()
    
    # Delete integration record
    result = db.table("user_integrations").delete().eq(
        "user_id", str(current_user.id)
    ).eq("provider", provider).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"No active connection for {provider}"
        )
    
    return {
        "success": True,
        "message": f"Disconnected from {INTEGRATION_CATALOG[integration]['name']}",
    }


@router.post("/{provider}/sync", response_model=Dict[str, Any])
async def trigger_sync(
    provider: str,
    full_sync: bool = Query(False, description="Force full sync"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Trigger a sync with an integration.
    
    By default does incremental sync. Use full_sync=true for complete refresh.
    """
    try:
        integration = IntegrationProvider(provider)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    
    db = get_supabase()
    
    # Check if connected
    status = db.table("user_integrations").select("status").eq(
        "user_id", str(current_user.id)
    ).eq("provider", provider).single().execute()
    
    if not status.data or status.data.get("status") != "connected":
        raise HTTPException(
            status_code=400,
            detail=f"Not connected to {provider}. Please connect first."
        )
    
    # Create sync job
    from ...services.jobs import JobService, JobType
    
    job_service = JobService()
    job = await job_service.create_job(
        job_type=JobType.PROCESS_WEBHOOK,  # Reuse webhook handler
        payload={
            "webhook_type": f"{provider}_sync",
            "provider": provider,
            "full_sync": full_sync,
        },
        user_id=str(current_user.id),
        job_name=f"Sync: {INTEGRATION_CATALOG[integration]['name']}",
    )
    
    return {
        "success": True,
        "job_id": job.id,
        "message": f"{'Full' if full_sync else 'Incremental'} sync started for {INTEGRATION_CATALOG[integration]['name']}",
    }


@router.get("/categories", response_model=Dict[str, Any])
async def list_categories(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all integration categories.
    """
    categories = {}
    
    for provider, info in INTEGRATION_CATALOG.items():
        cat = info["category"]
        if cat not in categories:
            categories[cat] = {
                "id": cat,
                "name": cat.replace("_", " ").title(),
                "count": 0,
                "integrations": [],
            }
        categories[cat]["count"] += 1
        categories[cat]["integrations"].append(provider.value)
    
    return {
        "categories": list(categories.values()),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# OAUTH CALLBACK (for internal use)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{provider}/callback", include_in_schema=False)
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
):
    """
    OAuth callback handler.
    
    This endpoint receives the OAuth code and exchanges it for tokens.
    """
    db = get_supabase()
    
    # Verify state
    state_record = db.table("oauth_states").select("*").eq(
        "state", state
    ).single().execute()
    
    if not state_record.data:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    user_id = state_record.data["user_id"]
    redirect_uri = state_record.data["redirect_uri"]
    
    # TODO: Exchange code for tokens
    # This would call the provider's token endpoint
    
    # Store tokens
    db.table("user_integrations").upsert({
        "user_id": user_id,
        "provider": provider,
        "status": "connected",
        "connected_at": "now()",
        # "access_token": encrypted_token,
        # "refresh_token": encrypted_refresh,
    }).execute()
    
    # Clean up state
    db.table("oauth_states").delete().eq("state", state).execute()
    
    # Redirect back to app
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{redirect_uri}?success=true&provider={provider}")

