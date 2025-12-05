"""
Base Service Layer for SalesFlow AI.

Provides common functionality for all services including:
- Permission checking
- Audit logging
- Transaction management
- Event publishing
"""
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from functools import wraps
from typing import Any, Callable, Generic, Optional, TypeVar
from uuid import UUID
import logging
import time

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class AuditAction(str, Enum):
    """Audit log action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    IMPORT = "import"
    ASSIGN = "assign"
    UNASSIGN = "unassign"
    STATUS_CHANGE = "status_change"
    PERMISSION_CHECK = "permission_check"


class AuditLog(BaseModel):
    """Audit log entry."""
    timestamp: datetime
    user_id: UUID
    action: AuditAction
    resource_type: str
    resource_id: Optional[UUID] = None
    details: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    duration_ms: Optional[float] = None


class ServiceContext(BaseModel):
    """Context passed to service methods."""
    user_id: UUID
    user_role: str
    organization_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    
    class Config:
        frozen = True


class PermissionChecker:
    """
    Permission checking utilities.
    
    Supports role-based and resource-based permissions.
    """
    
    # Role hierarchy (higher roles inherit lower role permissions)
    ROLE_HIERARCHY = {
        "admin": ["manager", "user", "viewer"],
        "manager": ["user", "viewer"],
        "user": ["viewer"],
        "viewer": []
    }
    
    # Resource permissions by role
    RESOURCE_PERMISSIONS = {
        "leads": {
            "admin": ["create", "read", "update", "delete", "assign", "export", "import"],
            "manager": ["create", "read", "update", "delete", "assign", "export"],
            "user": ["create", "read", "update"],
            "viewer": ["read"]
        },
        "contacts": {
            "admin": ["create", "read", "update", "delete", "merge", "export"],
            "manager": ["create", "read", "update", "delete", "merge"],
            "user": ["create", "read", "update"],
            "viewer": ["read"]
        },
        "deals": {
            "admin": ["create", "read", "update", "delete", "close", "export"],
            "manager": ["create", "read", "update", "delete", "close"],
            "user": ["create", "read", "update"],
            "viewer": ["read"]
        },
        "campaigns": {
            "admin": ["create", "read", "update", "delete", "activate", "pause"],
            "manager": ["create", "read", "update", "activate", "pause"],
            "user": ["read"],
            "viewer": ["read"]
        },
        "analytics": {
            "admin": ["read", "export"],
            "manager": ["read", "export"],
            "user": ["read"],
            "viewer": ["read"]
        }
    }
    
    @classmethod
    def has_permission(cls, role: str, resource: str, action: str) -> bool:
        """Check if role has permission for action on resource."""
        if resource not in cls.RESOURCE_PERMISSIONS:
            return False
        
        permissions = cls.RESOURCE_PERMISSIONS[resource]
        
        # Check direct role permission
        if role in permissions and action in permissions[role]:
            return True
        
        # Check inherited permissions
        inherited_roles = cls.ROLE_HIERARCHY.get(role, [])
        for inherited_role in inherited_roles:
            if inherited_role in permissions and action in permissions[inherited_role]:
                return True
        
        return False
    
    @classmethod
    def can_access_resource(
        cls,
        user_id: UUID,
        user_role: str,
        resource_owner_id: Optional[UUID],
        resource: str,
        action: str
    ) -> bool:
        """
        Check if user can access a specific resource.
        
        Admins/managers can access all resources.
        Users can only access their own resources.
        """
        if not cls.has_permission(user_role, resource, action):
            return False
        
        # Admins and managers can access all resources
        if user_role in ["admin", "manager"]:
            return True
        
        # Users can only access their own resources or unassigned ones
        if resource_owner_id is None:
            return True
        
        return user_id == resource_owner_id


def audit_log(action: AuditAction, resource_type: str):
    """Decorator to log service method calls for audit trail."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(self, ctx: ServiceContext, *args, **kwargs):
            start_time = time.time()
            resource_id = kwargs.get("resource_id") or (args[0] if args else None)
            
            try:
                result = await func(self, ctx, *args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                if resource_id is None and hasattr(result, "id"):
                    resource_id = result.id
                
                logger.info(
                    f"AUDIT: {action.value} {resource_type} "
                    f"by user {ctx.user_id} "
                    f"(resource: {resource_id}, {duration_ms:.2f}ms)"
                )
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.warning(
                    f"AUDIT FAILED: {action.value} {resource_type} "
                    f"by user {ctx.user_id} (error: {str(e)}, {duration_ms:.2f}ms)"
                )
                raise
        return wrapper
    return decorator


def require_permission(resource: str, action: str):
    """Decorator to check permissions before executing service method."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(self, ctx: ServiceContext, *args, **kwargs):
            if not PermissionChecker.has_permission(ctx.user_role, resource, action):
                from app.core.exceptions import PermissionError
                raise PermissionError(
                    f"User role '{ctx.user_role}' does not have '{action}' "
                    f"permission for '{resource}'"
                )
            return await func(self, ctx, *args, **kwargs)
        return wrapper
    return decorator


class BaseService(ABC, Generic[T]):
    """Abstract base service class."""
    
    def __init__(self, repository):
        self._repo = repository
    
    @property
    def repo(self):
        return self._repo
    
    async def _check_resource_access(
        self,
        ctx: ServiceContext,
        resource_owner_id: Optional[UUID],
        resource: str,
        action: str
    ) -> bool:
        return PermissionChecker.can_access_resource(
            user_id=ctx.user_id,
            user_role=ctx.user_role,
            resource_owner_id=resource_owner_id,
            resource=resource,
            action=action
        )
    
    async def _ensure_resource_access(
        self,
        ctx: ServiceContext,
        resource_owner_id: Optional[UUID],
        resource: str,
        action: str
    ) -> None:
        if not await self._check_resource_access(ctx, resource_owner_id, resource, action):
            from app.core.exceptions import PermissionError
            raise PermissionError(f"User {ctx.user_id} cannot {action} this {resource}")


class ServiceResult(BaseModel, Generic[T]):
    """Wrapper for service operation results."""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    errors: Optional[list[str]] = None
    metadata: Optional[dict[str, Any]] = None
    
    @classmethod
    def ok(cls, data: Any, message: str = None, metadata: dict = None) -> "ServiceResult":
        return cls(success=True, data=data, message=message, metadata=metadata)
    
    @classmethod
    def error(cls, message: str, errors: list[str] = None) -> "ServiceResult":
        return cls(success=False, message=message, errors=errors)


__all__ = [
    "AuditAction",
    "AuditLog",
    "ServiceContext",
    "PermissionChecker",
    "audit_log",
    "require_permission",
    "BaseService",
    "ServiceResult",
]

