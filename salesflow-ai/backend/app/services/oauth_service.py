"""
Sales Flow AI - OAuth Service

Handles OAuth 2.0 flows for:
- Google (Gmail, Calendar)
- WhatsApp Business API
- LinkedIn, Facebook, etc.

Includes:
- Token management (refresh, revoke)
- Webhook subscription management
- Gmail Push Notifications (Watch API)
- WhatsApp Business webhook handling
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx
from supabase import Client

from ..config import get_settings
from ..schemas.oauth import (
    ConnectionStatus,
    GoogleOAuthScopes,
    OAuthProvider,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# CONFIGURATION
# ============================================================================

# OAuth Endpoints
OAUTH_ENDPOINTS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "revoke": "https://oauth2.googleapis.com/revoke",
        "userinfo": "https://www.googleapis.com/oauth2/v2/userinfo",
    },
    "microsoft": {
        "authorize": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    },
}

# Gmail API Endpoints
GMAIL_API = "https://gmail.googleapis.com/gmail/v1"
GMAIL_PUSH_TOPIC = "projects/salesflow-ai/topics/gmail-push"  # Muss in GCP erstellt werden


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def generate_state_token() -> str:
    """Generiert einen sicheren State-Token für CSRF-Schutz."""
    return secrets.token_urlsafe(32)


def hash_payload(payload: Dict) -> str:
    """Erstellt einen SHA256-Hash eines Payloads (für Deduplizierung)."""
    import json
    payload_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(payload_str.encode()).hexdigest()


def verify_google_webhook_token(token: str, expected: str) -> bool:
    """Verifiziert einen Google Webhook Token."""
    return hmac.compare_digest(token, expected)


def verify_meta_webhook_signature(
    payload: bytes,
    signature: str,
    app_secret: str,
) -> bool:
    """Verifiziert die Signatur eines Meta (WhatsApp/Instagram) Webhooks."""
    expected = "sha256=" + hmac.new(
        app_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


# ============================================================================
# OAUTH FLOW FUNCTIONS
# ============================================================================


async def initiate_oauth_flow(
    db: Client,
    user_id: str,
    provider: str,
    redirect_uri: str,
    scopes: Optional[List[str]] = None,
) -> Tuple[str, str]:
    """
    Initiiert einen OAuth-Flow.
    
    Returns:
        Tuple[authorization_url, state_token]
    """
    logger.info(f"Initiating OAuth flow: provider={provider}, user={user_id}")
    
    # State-Token generieren und speichern
    state = generate_state_token()
    
    # State temporär speichern (könnte auch Redis sein)
    # Hier nutzen wir Supabase
    db.table("oauth_tokens").upsert({
        "user_id": user_id,
        "provider": provider,
        "access_token": f"pending:{state}",  # Temporär
        "is_valid": False,
        "updated_at": datetime.utcnow().isoformat(),
    }).execute()
    
    if provider == "google":
        # Google OAuth URL bauen
        scopes = scopes or GoogleOAuthScopes.DEFAULT
        params = {
            "client_id": settings.google_client_id if hasattr(settings, 'google_client_id') else "",
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": "offline",  # Für Refresh Token
            "prompt": "consent",  # Immer Consent zeigen für Refresh Token
        }
        auth_url = f"{OAUTH_ENDPOINTS['google']['authorize']}?{urlencode(params)}"
        
    elif provider == "microsoft":
        scopes = scopes or ["https://graph.microsoft.com/Mail.Read", "https://graph.microsoft.com/Mail.Send"]
        params = {
            "client_id": settings.microsoft_client_id if hasattr(settings, 'microsoft_client_id') else "",
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
        }
        auth_url = f"{OAUTH_ENDPOINTS['microsoft']['authorize']}?{urlencode(params)}"
        
    else:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    return auth_url, state


async def complete_oauth_flow(
    db: Client,
    user_id: str,
    provider: str,
    code: str,
    state: str,
    redirect_uri: str,
) -> Dict[str, Any]:
    """
    Komplettiert einen OAuth-Flow nach dem Callback.
    
    Returns:
        Dict mit Token-Infos (ohne sensitive Daten)
    """
    logger.info(f"Completing OAuth flow: provider={provider}, user={user_id}")
    
    # State verifizieren
    existing = db.table("oauth_tokens").select("*").eq(
        "user_id", user_id
    ).eq("provider", provider).single().execute()
    
    if not existing.data or not existing.data.get("access_token", "").startswith(f"pending:{state}"):
        raise ValueError("Invalid or expired state token")
    
    # Token von Provider holen
    if provider == "google":
        token_data = await _exchange_google_code(code, redirect_uri)
    elif provider == "microsoft":
        token_data = await _exchange_microsoft_code(code, redirect_uri)
    else:
        raise ValueError(f"Unsupported provider: {provider}")
    
    # User-Info holen
    user_info = {}
    if provider == "google" and token_data.get("access_token"):
        user_info = await _get_google_userinfo(token_data["access_token"])
    
    # Token in DB speichern
    expires_at = None
    if token_data.get("expires_in"):
        expires_at = (datetime.utcnow() + timedelta(seconds=token_data["expires_in"])).isoformat()
    
    db.table("oauth_tokens").update({
        "access_token": token_data.get("access_token"),
        "refresh_token": token_data.get("refresh_token"),
        "token_type": token_data.get("token_type", "Bearer"),
        "expires_at": expires_at,
        "scopes": token_data.get("scope", "").split(" ") if token_data.get("scope") else [],
        "provider_user_id": user_info.get("id"),
        "provider_email": user_info.get("email"),
        "is_valid": True,
        "last_refresh_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", user_id).eq("provider", provider).execute()
    
    logger.info(f"OAuth flow completed: provider={provider}, email={user_info.get('email')}")
    
    return {
        "provider": provider,
        "email": user_info.get("email"),
        "connected": True,
    }


async def _exchange_google_code(code: str, redirect_uri: str) -> Dict[str, Any]:
    """Tauscht Google Auth Code gegen Tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OAUTH_ENDPOINTS["google"]["token"],
            data={
                "code": code,
                "client_id": getattr(settings, 'google_client_id', ''),
                "client_secret": getattr(settings, 'google_client_secret', ''),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def _exchange_microsoft_code(code: str, redirect_uri: str) -> Dict[str, Any]:
    """Tauscht Microsoft Auth Code gegen Tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OAUTH_ENDPOINTS["microsoft"]["token"],
            data={
                "code": code,
                "client_id": getattr(settings, 'microsoft_client_id', ''),
                "client_secret": getattr(settings, 'microsoft_client_secret', ''),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def _get_google_userinfo(access_token: str) -> Dict[str, Any]:
    """Holt Google User-Info."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            OAUTH_ENDPOINTS["google"]["userinfo"],
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code == 200:
            return response.json()
    return {}


async def refresh_oauth_token(
    db: Client,
    user_id: str,
    provider: str,
) -> Optional[str]:
    """
    Refresht einen OAuth-Token.
    
    Returns:
        Neuer Access Token oder None bei Fehler
    """
    logger.info(f"Refreshing OAuth token: provider={provider}, user={user_id}")
    
    # Aktuellen Token laden
    result = db.table("oauth_tokens").select("*").eq(
        "user_id", user_id
    ).eq("provider", provider).single().execute()
    
    if not result.data or not result.data.get("refresh_token"):
        logger.warning("No refresh token found")
        return None
    
    refresh_token = result.data["refresh_token"]
    
    try:
        if provider == "google":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    OAUTH_ENDPOINTS["google"]["token"],
                    data={
                        "refresh_token": refresh_token,
                        "client_id": getattr(settings, 'google_client_id', ''),
                        "client_secret": getattr(settings, 'google_client_secret', ''),
                        "grant_type": "refresh_token",
                    },
                )
                response.raise_for_status()
                token_data = response.json()
        else:
            logger.warning(f"Refresh not implemented for {provider}")
            return None
        
        # Token aktualisieren
        new_access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 3600)
        
        db.table("oauth_tokens").update({
            "access_token": new_access_token,
            "expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
            "last_refresh_at": datetime.utcnow().isoformat(),
            "refresh_error_count": 0,
            "last_error": None,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("user_id", user_id).eq("provider", provider).execute()
        
        logger.info("Token refreshed successfully")
        return new_access_token
        
    except Exception as e:
        logger.exception(f"Error refreshing token: {e}")
        
        # Fehler tracken
        db.table("oauth_tokens").update({
            "refresh_error_count": result.data.get("refresh_error_count", 0) + 1,
            "last_error": str(e),
            "last_error_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("user_id", user_id).eq("provider", provider).execute()
        
        return None


async def revoke_oauth_token(
    db: Client,
    user_id: str,
    provider: str,
) -> bool:
    """
    Widerruft einen OAuth-Token.
    """
    logger.info(f"Revoking OAuth token: provider={provider}, user={user_id}")
    
    result = db.table("oauth_tokens").select("access_token").eq(
        "user_id", user_id
    ).eq("provider", provider).single().execute()
    
    if not result.data:
        return False
    
    access_token = result.data.get("access_token")
    
    # Bei Google: Token beim Provider widerrufen
    if provider == "google" and access_token:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    OAUTH_ENDPOINTS["google"]["revoke"],
                    params={"token": access_token},
                )
        except Exception as e:
            logger.warning(f"Error revoking at provider: {e}")
    
    # In DB als widerrufen markieren
    db.rpc("revoke_oauth_token", {
        "p_user_id": user_id,
        "p_provider": provider,
    }).execute()
    
    return True


# ============================================================================
# GMAIL PUSH NOTIFICATIONS
# ============================================================================


async def setup_gmail_watch(
    db: Client,
    user_id: str,
    labels: List[str] = ["INBOX"],
) -> Dict[str, Any]:
    """
    Richtet Gmail Push Notifications ein (Watch API).
    
    Returns:
        Dict mit historyId und expiration
    """
    logger.info(f"Setting up Gmail watch: user={user_id}, labels={labels}")
    
    # Token holen
    token_result = db.table("oauth_tokens").select("access_token").eq(
        "user_id", user_id
    ).eq("provider", "google").single().execute()
    
    if not token_result.data or not token_result.data.get("access_token"):
        raise ValueError("No valid Google token found")
    
    access_token = token_result.data["access_token"]
    
    # Gmail Watch API aufrufen
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GMAIL_API}/users/me/watch",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "topicName": GMAIL_PUSH_TOPIC,
                "labelIds": labels,
            },
        )
        response.raise_for_status()
        watch_data = response.json()
    
    history_id = watch_data.get("historyId")
    expiration = watch_data.get("expiration")
    
    # Webhook-Subscription speichern
    db.table("webhook_subscriptions").upsert({
        "user_id": user_id,
        "provider": "google",
        "resource_type": "gmail_inbox",
        "webhook_url": f"https://your-domain.com/api/webhooks/gmail",  # Muss konfiguriert werden
        "google_history_id": history_id,
        "google_expiration": datetime.fromtimestamp(int(expiration) / 1000).isoformat() if expiration else None,
        "is_active": True,
        "updated_at": datetime.utcnow().isoformat(),
    }).execute()
    
    # Email Sync State aktualisieren
    db.table("email_sync_state").upsert({
        "user_id": user_id,
        "gmail_history_id": history_id,
        "sync_labels": labels,
        "sync_enabled": True,
        "updated_at": datetime.utcnow().isoformat(),
    }).execute()
    
    logger.info(f"Gmail watch set up: historyId={history_id}")
    
    return {
        "history_id": history_id,
        "expiration": expiration,
    }


async def process_gmail_push_notification(
    db: Client,
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Verarbeitet eine Gmail Push Notification.
    
    Der Payload enthält nur historyId - wir müssen dann
    die neuen Nachrichten selbst abrufen.
    """
    import base64
    import json
    
    logger.info("Processing Gmail push notification")
    
    # Payload dekodieren (Base64)
    message_data = data.get("message", {}).get("data", "")
    if message_data:
        decoded = json.loads(base64.b64decode(message_data))
        email_address = decoded.get("emailAddress")
        history_id = decoded.get("historyId")
    else:
        return {"error": "No message data"}
    
    # User anhand der E-Mail finden
    user_result = db.table("oauth_tokens").select("user_id").eq(
        "provider", "google"
    ).eq("provider_email", email_address).single().execute()
    
    if not user_result.data:
        logger.warning(f"No user found for email: {email_address}")
        return {"error": "User not found"}
    
    user_id = user_result.data["user_id"]
    
    # Neue Nachrichten abrufen
    new_messages = await fetch_gmail_history(db, user_id, history_id)
    
    # In Realtime Queue einfügen
    for msg in new_messages:
        db.table("realtime_message_queue").insert({
            "user_id": user_id,
            "channel": "email",
            "direction": "inbound",
            "from_address": msg.get("from", ""),
            "to_address": msg.get("to", ""),
            "subject": msg.get("subject"),
            "body": msg.get("snippet", ""),
            "provider_message_id": msg.get("id"),
            "provider_thread_id": msg.get("threadId"),
            "status": "pending",
        }).execute()
    
    return {
        "processed": len(new_messages),
        "history_id": history_id,
    }


async def fetch_gmail_history(
    db: Client,
    user_id: str,
    start_history_id: str,
) -> List[Dict[str, Any]]:
    """
    Ruft neue Gmail-Nachrichten seit einem historyId ab.
    """
    # Token holen
    token_result = db.table("oauth_tokens").select("access_token").eq(
        "user_id", user_id
    ).eq("provider", "google").single().execute()
    
    if not token_result.data:
        return []
    
    access_token = token_result.data["access_token"]
    
    # Letzte bekannte historyId laden
    sync_state = db.table("email_sync_state").select("gmail_history_id").eq(
        "user_id", user_id
    ).single().execute()
    
    last_history_id = sync_state.data.get("gmail_history_id") if sync_state.data else None
    
    messages = []
    
    try:
        async with httpx.AsyncClient() as client:
            # History abrufen
            response = await client.get(
                f"{GMAIL_API}/users/me/history",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "startHistoryId": last_history_id or start_history_id,
                    "historyTypes": ["messageAdded"],
                },
            )
            
            if response.status_code == 200:
                history_data = response.json()
                
                for history in history_data.get("history", []):
                    for msg_added in history.get("messagesAdded", []):
                        msg_id = msg_added.get("message", {}).get("id")
                        if msg_id:
                            # Nachricht-Details abrufen
                            msg_response = await client.get(
                                f"{GMAIL_API}/users/me/messages/{msg_id}",
                                headers={"Authorization": f"Bearer {access_token}"},
                                params={"format": "metadata", "metadataHeaders": ["From", "To", "Subject"]},
                            )
                            if msg_response.status_code == 200:
                                msg_data = msg_response.json()
                                headers = {h["name"]: h["value"] for h in msg_data.get("payload", {}).get("headers", [])}
                                messages.append({
                                    "id": msg_id,
                                    "threadId": msg_data.get("threadId"),
                                    "from": headers.get("From", ""),
                                    "to": headers.get("To", ""),
                                    "subject": headers.get("Subject"),
                                    "snippet": msg_data.get("snippet", ""),
                                })
                
                # Neue historyId speichern
                new_history_id = history_data.get("historyId")
                if new_history_id:
                    db.table("email_sync_state").update({
                        "gmail_history_id": new_history_id,
                        "last_incremental_sync_at": datetime.utcnow().isoformat(),
                    }).eq("user_id", user_id).execute()
                    
    except Exception as e:
        logger.exception(f"Error fetching Gmail history: {e}")
    
    return messages


# ============================================================================
# WHATSAPP BUSINESS API
# ============================================================================


async def setup_whatsapp_webhook(
    db: Client,
    user_id: str,
    verify_token: str,
) -> Dict[str, Any]:
    """
    Richtet WhatsApp Business Webhook ein.
    
    Der Verify-Token wird für die Webhook-Verifizierung benötigt.
    """
    logger.info(f"Setting up WhatsApp webhook: user={user_id}")
    
    # Config aktualisieren
    db.table("whatsapp_business_config").upsert({
        "user_id": user_id,
        "webhook_verify_token": verify_token,
        "webhook_registered": True,
        "updated_at": datetime.utcnow().isoformat(),
    }).execute()
    
    return {
        "success": True,
        "verify_token": verify_token,
        "webhook_url": f"https://your-domain.com/api/webhooks/whatsapp",
    }


async def verify_whatsapp_webhook(
    mode: str,
    token: str,
    challenge: str,
    expected_token: str,
) -> Optional[str]:
    """
    Verifiziert einen WhatsApp Webhook (GET Request von Meta).
    
    Returns:
        Challenge-String bei Erfolg, None bei Fehler
    """
    if mode == "subscribe" and token == expected_token:
        return challenge
    return None


async def process_whatsapp_webhook(
    db: Client,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Verarbeitet eingehende WhatsApp-Nachrichten.
    """
    logger.info("Processing WhatsApp webhook")
    
    processed = 0
    
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") == "messages":
                value = change.get("value", {})
                
                # Phone Number ID extrahieren
                phone_number_id = value.get("metadata", {}).get("phone_number_id")
                
                # User anhand der Phone Number ID finden
                config_result = db.table("whatsapp_business_config").select("user_id").eq(
                    "phone_number_id", phone_number_id
                ).single().execute()
                
                if not config_result.data:
                    logger.warning(f"No config found for phone_number_id: {phone_number_id}")
                    continue
                
                user_id = config_result.data["user_id"]
                
                # Nachrichten verarbeiten
                for message in value.get("messages", []):
                    msg_type = message.get("type")
                    from_number = message.get("from")
                    msg_id = message.get("id")
                    timestamp = message.get("timestamp")
                    
                    # Text extrahieren
                    text = ""
                    if msg_type == "text":
                        text = message.get("text", {}).get("body", "")
                    elif msg_type == "interactive":
                        text = message.get("interactive", {}).get("button_reply", {}).get("title", "")
                    
                    if text:
                        # In Queue einfügen
                        db.table("realtime_message_queue").insert({
                            "user_id": user_id,
                            "channel": "whatsapp",
                            "direction": "inbound",
                            "from_address": from_number,
                            "to_address": phone_number_id,
                            "body": text,
                            "provider_message_id": msg_id,
                            "status": "pending",
                            "received_at": datetime.fromtimestamp(int(timestamp)).isoformat() if timestamp else None,
                        }).execute()
                        processed += 1
    
    return {"processed": processed}


async def send_whatsapp_message(
    db: Client,
    user_id: str,
    to_phone: str,
    text: str,
    template_name: Optional[str] = None,
    template_params: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Sendet eine WhatsApp-Nachricht über die Business API.
    """
    logger.info(f"Sending WhatsApp message: user={user_id}, to={to_phone}")
    
    # Config laden
    config_result = db.table("whatsapp_business_config").select("*").eq(
        "user_id", user_id
    ).single().execute()
    
    if not config_result.data:
        raise ValueError("WhatsApp Business not configured")
    
    config = config_result.data
    
    if not config.get("access_token") or not config.get("phone_number_id"):
        raise ValueError("WhatsApp credentials missing")
    
    # Message bauen
    if template_name:
        # Template-Nachricht (für außerhalb des 24h-Fensters)
        message_data = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "de"},
                "components": [],
            },
        }
        if template_params:
            message_data["template"]["components"].append({
                "type": "body",
                "parameters": [{"type": "text", "text": v} for v in template_params.values()],
            })
    else:
        # Text-Nachricht (nur innerhalb 24h-Fenster)
        message_data = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "text",
            "text": {"body": text},
        }
    
    # Nachricht senden
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://graph.facebook.com/v18.0/{config['phone_number_id']}/messages",
            headers={
                "Authorization": f"Bearer {config['access_token']}",
                "Content-Type": "application/json",
            },
            json=message_data,
        )
        response.raise_for_status()
        result = response.json()
    
    message_id = result.get("messages", [{}])[0].get("id")
    
    # Counter erhöhen
    db.table("whatsapp_business_config").update({
        "messages_sent_today": config.get("messages_sent_today", 0) + 1,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", user_id).execute()
    
    return {
        "success": True,
        "message_id": message_id,
    }


# ============================================================================
# CONNECTION STATUS
# ============================================================================


async def get_oauth_connections_status(
    db: Client,
    user_id: str,
) -> List[Dict[str, Any]]:
    """
    Holt den Status aller OAuth-Verbindungen eines Users.
    """
    result = db.table("v_oauth_connections").select("*").eq("user_id", user_id).execute()
    
    # Alle unterstützten Provider
    all_providers = ["google", "microsoft", "whatsapp_business", "linkedin", "facebook"]
    connected_providers = {r["provider"]: r for r in (result.data or [])}
    
    connections = []
    for provider in all_providers:
        if provider in connected_providers:
            conn = connected_providers[provider]
            connections.append({
                "provider": provider,
                "is_connected": conn.get("is_valid", False),
                "provider_email": conn.get("provider_email"),
                "connection_status": conn.get("connection_status", "unknown"),
                "expires_at": conn.get("expires_at"),
                "webhook_active": conn.get("webhook_active", False),
                "error_count": conn.get("refresh_error_count", 0),
            })
        else:
            connections.append({
                "provider": provider,
                "is_connected": False,
                "connection_status": "disconnected",
            })
    
    return connections


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "initiate_oauth_flow",
    "complete_oauth_flow",
    "refresh_oauth_token",
    "revoke_oauth_token",
    "setup_gmail_watch",
    "process_gmail_push_notification",
    "fetch_gmail_history",
    "setup_whatsapp_webhook",
    "verify_whatsapp_webhook",
    "process_whatsapp_webhook",
    "send_whatsapp_message",
    "get_oauth_connections_status",
]


