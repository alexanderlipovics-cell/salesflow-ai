"""
Service Factory and Dependencies for SalesFlow AI.

Provides dependency injection for FastAPI routes.
"""
from functools import lru_cache
from typing import Optional
from uuid import UUID
import logging

from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.base import ServiceContext
from app.services.lead_service import LeadService
from app.services.contact_service import ContactService
from app.services.deal_service import DealService
from app.services.copilot_service import CopilotService
from app.core.exceptions import AuthenticationError, TokenExpiredError

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)


class ServiceFactory:
    """Factory for creating and managing service instances."""
    
    def __init__(self):
        self._lead_repo = None
        self._contact_repo = None
        self._deal_repo = None
        self._campaign_repo = None
        self._step_repo = None
        self._message_repo = None
        self._event_publisher = None
        self._ai_client = None
        
        # Cached service instances
        self._lead_service: Optional[LeadService] = None
        self._contact_service: Optional[ContactService] = None
        self._deal_service: Optional[DealService] = None
        self._copilot_service: Optional[CopilotService] = None
    
    def init_repositories(
        self,
        lead_repo=None,
        contact_repo=None,
        deal_repo=None,
        campaign_repo=None,
        step_repo=None,
        message_repo=None,
        event_publisher=None,
        ai_client=None
    ):
        """Initialize repositories. Call this at application startup."""
        self._lead_repo = lead_repo
        self._contact_repo = contact_repo
        self._deal_repo = deal_repo
        self._campaign_repo = campaign_repo
        self._step_repo = step_repo
        self._message_repo = message_repo
        self._event_publisher = event_publisher
        self._ai_client = ai_client
        
        # Clear cached services
        self._lead_service = None
        self._contact_service = None
        self._deal_service = None
        self._copilot_service = None
        
        logger.info("Service factory initialized with repositories")
    
    @property
    def lead_service(self) -> LeadService:
        """Get or create LeadService instance."""
        if self._lead_service is None:
            self._lead_service = LeadService(
                lead_repo=self._lead_repo,
                contact_repo=self._contact_repo,
                event_publisher=self._event_publisher
            )
        return self._lead_service
    
    @property
    def contact_service(self) -> ContactService:
        """Get or create ContactService instance."""
        if self._contact_service is None:
            self._contact_service = ContactService(
                contact_repo=self._contact_repo,
                lead_repo=self._lead_repo,
                event_publisher=self._event_publisher
            )
        return self._contact_service
    
    @property
    def deal_service(self) -> DealService:
        """Get or create DealService instance."""
        if self._deal_service is None:
            self._deal_service = DealService(
                deal_repo=self._deal_repo,
                lead_repo=self._lead_repo,
                event_publisher=self._event_publisher
            )
        return self._deal_service
    
    @property
    def copilot_service(self) -> CopilotService:
        """Get or create CopilotService instance."""
        if self._copilot_service is None:
            self._copilot_service = CopilotService(
                lead_repo=self._lead_repo,
                contact_repo=self._contact_repo,
                deal_repo=self._deal_repo,
                message_repo=self._message_repo,
                ai_client=self._ai_client,
                event_publisher=self._event_publisher
            )
        return self._copilot_service


# Global factory instance
service_factory = ServiceFactory()


def init_services(
    lead_repo=None,
    contact_repo=None,
    deal_repo=None,
    campaign_repo=None,
    step_repo=None,
    message_repo=None,
    event_publisher=None,
    ai_client=None
):
    """Initialize services at application startup."""
    service_factory.init_repositories(
        lead_repo=lead_repo,
        contact_repo=contact_repo,
        deal_repo=deal_repo,
        campaign_repo=campaign_repo,
        step_repo=step_repo,
        message_repo=message_repo,
        event_publisher=event_publisher,
        ai_client=ai_client
    )


# ============= Auth Dependencies =============

async def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    
    Replace with actual JWT validation logic.
    """
    # Import here to avoid circular imports
    from app.config import get_settings
    
    settings = get_settings()
    
    try:
        # Try real JWT validation if available
        from jose import jwt, JWTError
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except ImportError:
        # Fallback to mock if jose not installed
        pass
    except Exception as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")
    
    # Mock implementation for development
    return {
        "sub": "00000000-0000-0000-0000-000000000001",
        "role": "user",
        "org_id": "00000000-0000-0000-0000-000000000002",
        "exp": 9999999999
    }


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Get current user from JWT token."""
    if not credentials:
        raise AuthenticationError("No credentials provided")
    
    token = credentials.credentials
    
    try:
        payload = await decode_token(token)
    except AuthenticationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Could not validate credentials: {str(e)}")
    
    return {
        "id": UUID(payload["sub"]),
        "role": payload.get("role", "user"),
        "organization_id": UUID(payload["org_id"]) if payload.get("org_id") else None
    }


async def get_service_context(
    request: Request,
    current_user: dict = Depends(get_current_user)
) -> ServiceContext:
    """Build service context from request and user."""
    return ServiceContext(
        user_id=current_user["id"],
        user_role=current_user["role"],
        organization_id=current_user.get("organization_id"),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=request.headers.get("x-request-id")
    )


# ============= Service Dependencies =============

def get_lead_service() -> LeadService:
    """Dependency for LeadService."""
    return service_factory.lead_service


def get_contact_service() -> ContactService:
    """Dependency for ContactService."""
    return service_factory.contact_service


def get_deal_service() -> DealService:
    """Dependency for DealService."""
    return service_factory.deal_service


def get_copilot_service() -> CopilotService:
    """Dependency for CopilotService."""
    return service_factory.copilot_service


# ============= Optional: Admin-only dependency =============

async def get_admin_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Ensure user is admin."""
    if current_user["role"] != "admin":
        from app.core.exceptions import PermissionError
        raise PermissionError("Admin access required")
    return current_user


async def get_admin_context(
    request: Request,
    admin_user: dict = Depends(get_admin_user)
) -> ServiceContext:
    """Build service context for admin operations."""
    return ServiceContext(
        user_id=admin_user["id"],
        user_role="admin",
        organization_id=admin_user.get("organization_id"),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=request.headers.get("x-request-id")
    )


__all__ = [
    # Factory
    "ServiceFactory",
    "service_factory",
    "init_services",
    
    # Auth Dependencies
    "decode_token",
    "get_current_user",
    "get_service_context",
    "get_admin_user",
    "get_admin_context",
    
    # Service Dependencies
    "get_lead_service",
    "get_contact_service",
    "get_deal_service",
    "get_copilot_service",
    
    # Services
    "LeadService",
    "ContactService",
    "DealService",
    "CopilotService",
    
    # Context
    "ServiceContext",
]
