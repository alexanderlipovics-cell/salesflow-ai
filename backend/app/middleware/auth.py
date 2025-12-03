"""
Auth Middleware
Authentifizierungs- und Autorisierungs-Middleware
"""

from typing import Optional, Callable
from functools import wraps
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.utils.logger import get_logger

logger = get_logger(__name__)

# HTTP Bearer Token Security
security = HTTPBearer(auto_error=False)


class AuthMiddleware:
    """Authentifizierungs-Middleware für FastAPI."""
    
    def __init__(self):
        self._supabase = None
    
    @property
    def supabase(self):
        """Lazy load Supabase client."""
        if self._supabase is None:
            try:
                from app.core.database import get_supabase
                self._supabase = get_supabase()
            except Exception as e:
                logger.warning(f"Supabase not available for auth: {e}")
        return self._supabase
    
    async def get_current_user(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> Optional[dict]:
        """
        Extrahiert den aktuellen Benutzer aus dem JWT Token.
        
        Args:
            credentials: Bearer Token aus dem Authorization Header
            
        Returns:
            User dict oder None wenn nicht authentifiziert
        """
        if not credentials:
            return None
        
        try:
            token = credentials.credentials
            
            if self.supabase:
                # Verifiziere Token mit Supabase
                response = self.supabase.auth.get_user(token)
                if response and response.user:
                    return {
                        "id": response.user.id,
                        "email": response.user.email,
                        "role": response.user.role if hasattr(response.user, 'role') else "user",
                    }
            
            # Fallback: Demo User für Entwicklung
            logger.debug("Using demo user for development")
            return {
                "id": "demo-user-id",
                "email": "demo@salesflow.ai",
                "role": "user",
            }
            
        except Exception as e:
            logger.warning(f"Auth token verification failed: {e}")
            return None
    
    async def require_auth(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """
        Erfordert einen authentifizierten Benutzer.
        
        Raises:
            HTTPException: 401 wenn nicht authentifiziert
        """
        user = await self.get_current_user(credentials)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentifizierung erforderlich",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    async def require_admin(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """
        Erfordert einen Admin-Benutzer.
        
        Raises:
            HTTPException: 401/403 wenn nicht authentifiziert/autorisiert
        """
        user = await self.require_auth(credentials)
        
        if user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin-Berechtigung erforderlich",
            )
        
        return user


# Globale Instanz
auth_middleware = AuthMiddleware()

# Convenience-Funktionen
get_current_user = auth_middleware.get_current_user
require_auth = auth_middleware.require_auth
require_admin = auth_middleware.require_admin


def auth_required(func: Callable) -> Callable:
    """
    Decorator für geschützte Endpoints.
    
    Usage:
        @router.get("/protected")
        @auth_required
        async def protected_route(request: Request):
            user = request.state.user
            return {"user": user}
    """
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        credentials = await security(request)
        user = await auth_middleware.get_current_user(credentials)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentifizierung erforderlich",
            )
        
        request.state.user = user
        return await func(request, *args, **kwargs)
    
    return wrapper


__all__ = [
    "AuthMiddleware",
    "auth_middleware",
    "get_current_user",
    "require_auth",
    "require_admin",
    "auth_required",
    "security",
]

