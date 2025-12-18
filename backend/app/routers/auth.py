"""
Authentication router for SalesFlow AI Backend.
Handles login, signup, token refresh, password reset, and user profile.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import logging
import secrets
import os
import resend

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase import Client, create_client

logger = logging.getLogger(__name__)

from ..core.security import (
    create_token_pair,
    get_current_active_user,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from ..core.deps import get_supabase
from ..schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    SignupRequest,
    SignupResponse,
    UserProfile,
    UserProfileUpdate,
)


def get_auth_client() -> Client:
    """
    Erstellt einen Supabase Client für Auth-Operationen.
    Verwendet ANON_KEY für normale Auth-Operationen.
    """
    url = os.getenv("SUPABASE_URL")
    # Für Auth-Operationen verwenden wir ANON_KEY (nicht Service Role Key)
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL and SUPABASE_ANON_KEY must be set for authentication"
        )
    
    return create_client(url, key)

router = APIRouter(prefix="/auth", tags=["authentication"])
resend.api_key = os.getenv("RESEND_API_KEY")


@router.post("/signup", response_model=SignupResponse)
async def signup(
    user_data: SignupRequest,
    supabase: Client = Depends(get_supabase),
) -> SignupResponse:
    """
    Create a new user account using Supabase Auth.

    - Creates user in Supabase Auth
    - Creates user profile in users table
    - Returns JWT tokens
    """
    # Erstelle Auth-Client für Supabase Auth
    auth_client = get_auth_client()
    
    try:
        # Erstelle User über Supabase Auth
        auth_response = auth_client.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "first_name": user_data.first_name,
                    "last_name": user_data.last_name,
                    "company": user_data.company or "",
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account",
            )
        
        user_id = auth_response.user.id
        user_email = auth_response.user.email or user_data.email
        
        # Erstelle/Update User-Daten in users Tabelle (für Zusatzdaten)
        try:
            user_data_dict = {
                "id": user_id,
                "email": user_email,
                "first_name": user_data.first_name,
                "last_name": user_data.last_name,
                "is_active": True,
                "is_verified": auth_response.user.email_confirmed_at is not None,
                "role": "user",
            }
            
            if user_data.company:
                user_data_dict["company"] = user_data.company
            
            # Upsert statt Insert (falls User bereits existiert)
            result = supabase.table("users").upsert(user_data_dict).execute()
            
            if result and result.data:
                user = result.data[0]
            else:
                # Fallback: Verwende Auth-User Daten
                user = user_data_dict
        except Exception as e:
            logger.warning(f"Could not create user profile for {user_id}: {e}")
            # Verwende Auth-User Daten als Fallback
            user = {
                "id": user_id,
                "email": user_email,
                "first_name": user_data.first_name,
                "last_name": user_data.last_name,
                "role": "user",
                "is_verified": auth_response.user.email_confirmed_at is not None,
            }

        # Create profile entry in profiles table
        try:
            full_name = f"{user_data.first_name} {user_data.last_name}".strip()
            profile_data = {
                "id": user_id,
                "first_name": user_data.first_name,
                "last_name": user_data.last_name,
                "full_name": full_name,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            supabase.table("profiles").upsert(profile_data).execute()
            logger.info(f"Profile created/updated for user {user_id}")
        except Exception as e:
            logger.warning(f"Could not create profile for user {user_id}: {e}")

        # Create tokens
        tokens = create_token_pair(user_id, user_email)
        
        logger.debug(f"Signup: Token pair created. Type: {type(tokens)}")

        return SignupResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=user["id"],
                email=user.get("email", user_email),
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                role=user.get("role", "user"),
                is_verified=user.get("is_verified", False),
            ),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup failed for email {user_data.email}: {str(e)}")
        # Prüfe ob Email bereits existiert
        if "already registered" in str(e).lower() or "email" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user account: {str(e)}",
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: Client = Depends(get_supabase),
) -> LoginResponse:
    """
    Authenticate user with email and password using Supabase Auth API.

    Returns JWT access and refresh tokens.
    """
    # Case-insensitive email
    email_lower = form_data.username.lower()
    password = form_data.password
    
    # Supabase Auth API für Login nutzen
    auth_client = get_auth_client()
    try:
        auth_response = auth_client.auth.sign_in_with_password({
            "email": email_lower,
            "password": password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = auth_response.user.id
        
        # User-Daten aus users Tabelle holen (falls vorhanden)
        user_result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        
        # Falls User in auth.users existiert aber nicht in users Tabelle
        # Verwende auth.users Daten als Fallback
        if not user_result or not user_result.data:
            # User existiert in auth.users aber nicht in users - verwende auth.users Daten
            auth_user = auth_response.user
            user_email = auth_user.email or email_lower
            user_data = {
                "id": user_id,
                "email": user_email,
                "first_name": auth_user.user_metadata.get("first_name") if auth_user.user_metadata else None,
                "last_name": auth_user.user_metadata.get("last_name") if auth_user.user_metadata else None,
                "role": "user",
                "is_verified": auth_user.email_confirmed_at is not None,
            }
        else:
            user_data = user_result.data
            
            # Prüfe ob Account aktiv ist
            if not user_data.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account is deactivated",
                )

        # Create tokens mit unseren JWT Claims
        tokens = create_token_pair(user_id, user_data.get("email", email_lower))
        
        # Debug: Log token creation
        logger.debug(f"Login: Token pair created. Type: {type(tokens)}")

        return LoginResponse(
            access_token=tokens["access_token"],  # create_token_pair from main.py returns Dict[str, str]
            refresh_token=tokens["refresh_token"],  # create_token_pair from main.py returns Dict[str, str]
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=user_data["id"],
                email=user_data.get("email", email_lower),
                first_name=user_data.get("first_name"),
                last_name=user_data.get("last_name"),
                role=user_data.get("role", "user"),
                is_verified=user_data.get("is_verified", False),
            ),
        )
        
    except HTTPException:
        # HTTPExceptions weiterwerfen
        raise
    except Exception as e:
        # Alle anderen Fehler als Invalid credentials behandeln
        logger.warning(f"Login failed for email {email_lower}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    token_data: RefreshTokenRequest,
    supabase: Client = Depends(get_supabase),
) -> LoginResponse:
    """
    Refresh access token using refresh token.

    Returns new JWT access and refresh tokens.
    """
    try:
        payload = verify_refresh_token(token_data.refresh_token)
        user_id: str = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        # Find user in Supabase
        result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        
        # Prüfe auf None oder fehlende data-Attribute
        if not result or not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        user = result.data
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        tokens = create_token_pair(user["id"], user["email"])
        
        # Debug: Log token creation
        logger.debug(f"Refresh: Token pair created. Type: {type(tokens)}")

        return LoginResponse(
            access_token=tokens["access_token"],  # create_token_pair from main.py returns Dict[str, str]
            refresh_token=tokens["refresh_token"],  # create_token_pair from main.py returns Dict[str, str]
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=user["id"],
                email=user["email"],
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                role=user.get("role", "user"),
                is_verified=user.get("is_verified", False),
            ),
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout")
async def logout() -> Dict[str, str]:
    """
    Logout endpoint (client-side token removal).
    In a real implementation, you might want to blacklist tokens.
    """
    return {"message": "Successfully logged out"}


@router.post("/request-password-reset")
async def request_password_reset(
    data: dict,
    supabase: Client = Depends(get_supabase),
) -> Dict[str, str]:
    """
    Request password reset.
    In production, this would send an email with reset link.
    """
    email = (data or {}).get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email erforderlich")

    result = supabase.table("users").select("id").eq("email", email).maybe_single().execute()
    if result and result.data:
        user_id = result.data["id"]
        token = secrets.token_urlsafe(32)
        try:
            supabase.table("password_reset_tokens").insert(
                {"user_id": user_id, "token": token, "created_at": datetime.utcnow().isoformat()}
            ).execute()
            reset_link = f"https://aura-os-topaz.vercel.app/reset-password?token={token}"
            try:
                resend.Emails.send(
                    {
                        "from": "onboarding@resend.dev",
                        "to": [email],
                        "subject": "Passwort zurücksetzen - Al Sales Systems",
                        "html": f"<p>Klicke hier: <a href='{reset_link}'>{reset_link}</a></p>",
                    }
                )
            except Exception as e:
                logger.error(f"Email failed: {e}")
        except Exception as e:
            logger.error(f"Failed to store password reset token: {e}")

    return {"message": "If an account with this email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: dict, supabase: Client = Depends(get_supabase)) -> Dict[str, str]:
    """
    Reset password using token via Supabase Auth.
    
    Validiert custom token und ändert Passwort über Supabase Auth Admin API.
    """
    token = data.get("token")
    new_password = data.get("password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token und Passwort erforderlich")
    
    try:
        # Validiere custom token
        token_result = (
            supabase.table("password_reset_tokens").select("*").eq("token", token).maybe_single().execute()
        )

        if not token_result or not token_result.data:
            raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Token")

        token_row = token_result.data
        created_at = token_row.get("created_at")

        try:
            token_time = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
        except Exception:
            token_time = datetime.utcnow()

        if datetime.now(timezone.utc) - token_time > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Token abgelaufen. Bitte fordere einen neuen an.")

        user_id = token_row.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Token ungültig (kein User).")

        # Ändere Passwort über Supabase Auth Admin API (Service Role Key)
        # Der supabase Client hat bereits Service Role Key
        try:
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
        except Exception as e:
            logger.error(f"Failed to update password via Supabase Auth: {e}")
            raise HTTPException(
                status_code=500,
                detail="Fehler beim Zurücksetzen des Passworts. Bitte versuche es erneut oder kontaktiere den Support."
            )

        # Lösche Token
        supabase.table("password_reset_tokens").delete().eq("token", token).execute()

        return {"message": "Passwort erfolgreich geändert"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Fehler beim Zurücksetzen des Passworts: {str(e)}"
        )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
    """
    Get current user profile.
    """
    # Debug: Log Authorization header
    auth_header = request.headers.get("Authorization")
    logger.debug(f"/me endpoint: Auth header present: {auth_header is not None}")
    if auth_header:
        logger.debug(f"/me endpoint: Auth header (first 50 chars): {auth_header[:50]}...")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            logger.debug(f"/me endpoint: Token (first 50 chars): {token[:50]}...")
    
    # Debug: Log current_user payload
    logger.debug(f"/me endpoint: current_user payload: {current_user}")
    
    user_id = current_user.get("sub")
    if not user_id:
        logger.warning(f"/me endpoint: User ID not found in token. Payload: {current_user}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    # Fetch user from Supabase
    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    
    # Prüfe auf None oder fehlende data-Attribute
    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user = result.data
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user.get("name"),
        full_name=user.get("full_name"),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        role=user.get("role", "user"),
        is_verified=user.get("is_verified", False),
        company=user.get("company"),
        phone=user.get("phone"),
        avatar_url=user.get("avatar_url"),
    )


@router.patch("/me", response_model=UserProfile)
async def update_current_user_profile(
    user_update: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
    """
    Update current user profile.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    update_data = user_update.dict(exclude_unset=True)

    # Don't allow email changes for now
    if "email" in update_data:
        del update_data["email"]

    # Convert empty strings to None for optional fields
    for key in ["first_name", "last_name", "company", "phone", "avatar_url"]:
        if key in update_data and update_data[key] == "":
            update_data[key] = None

    # Update user in Supabase
    if update_data:
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        
        # Prüfe auf None oder fehlende data-Attribute
        if not result or not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        user = result.data[0]
    else:
        # No updates, just fetch current user
        result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        # Prüfe auf None oder fehlende data-Attribute
        if not result or not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = result.data

    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user.get("name"),
        full_name=user.get("full_name"),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        role=user.get("role", "user"),
        is_verified=user.get("is_verified", False),
        company=user.get("company"),
        phone=user.get("phone"),
        avatar_url=user.get("avatar_url"),
    )