"""
Custom Exceptions for Al Sales Systems.

Hierarchical exception system with HTTP status code mapping.
"""
from enum import Enum
from typing import Any, Optional


class ErrorCode(str, Enum):
    """Application error codes for client consumption."""
    # General
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    
    # Auth
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    
    # Resource
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    CONFLICT = "CONFLICT"
    
    # Business Logic
    INVALID_STATE = "INVALID_STATE"
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Database
    DATABASE_ERROR = "DATABASE_ERROR"
    CONNECTION_ERROR = "CONNECTION_ERROR"
    QUERY_TIMEOUT = "QUERY_TIMEOUT"


class SalesFlowException(Exception):
    """Base exception for all Al Sales Systems errors."""
    
    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        details: Optional[dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for API response."""
        return {
            "error": self.code.value,
            "message": self.message,
            "details": self.details
        }
    
    def get_status_code(self) -> int:
        """Get HTTP status code for this exception."""
        return 500


# ============= Authentication Errors (401, 403) =============

class AuthenticationError(SalesFlowException):
    """User is not authenticated."""
    
    def __init__(self, message: str = "Authentication required", details: dict = None):
        super().__init__(message, ErrorCode.UNAUTHORIZED, details)
    
    def get_status_code(self) -> int:
        return 401


class TokenExpiredError(AuthenticationError):
    """Authentication token has expired."""
    
    def __init__(self, message: str = "Token has expired", details: dict = None):
        super().__init__(message, details)
        self.code = ErrorCode.TOKEN_EXPIRED


class TokenInvalidError(AuthenticationError):
    """Authentication token is invalid."""
    
    def __init__(self, message: str = "Invalid token", details: dict = None):
        super().__init__(message, details)
        self.code = ErrorCode.TOKEN_INVALID


class PermissionError(SalesFlowException):
    """User does not have permission for this action."""
    
    def __init__(self, message: str = "Permission denied", details: dict = None):
        super().__init__(message, ErrorCode.FORBIDDEN, details)
    
    def get_status_code(self) -> int:
        return 403


# ============= Resource Errors (400, 404, 409) =============

class NotFoundError(SalesFlowException):
    """Requested resource was not found."""
    
    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: str = None,
        resource_id: str = None
    ):
        details = {}
        if resource_type:
            details["resource_type"] = resource_type
        if resource_id:
            details["resource_id"] = resource_id
        super().__init__(message, ErrorCode.NOT_FOUND, details)
    
    def get_status_code(self) -> int:
        return 404


class ValidationError(SalesFlowException):
    """Input validation failed."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field_errors: dict[str, list[str]] = None
    ):
        details = {"field_errors": field_errors} if field_errors else {}
        super().__init__(message, ErrorCode.VALIDATION_ERROR, details)
    
    def get_status_code(self) -> int:
        return 400


class ConflictError(SalesFlowException):
    """Resource conflict (e.g., duplicate key)."""
    
    def __init__(
        self,
        message: str = "Resource conflict",
        conflicting_field: str = None
    ):
        details = {"conflicting_field": conflicting_field} if conflicting_field else {}
        super().__init__(message, ErrorCode.CONFLICT, details)
    
    def get_status_code(self) -> int:
        return 409


class AlreadyExistsError(ConflictError):
    """Resource already exists."""
    
    def __init__(self, message: str = "Resource already exists", field: str = None):
        super().__init__(message, field)
        self.code = ErrorCode.ALREADY_EXISTS


# ============= Business Logic Errors (422) =============

class BusinessRuleViolation(SalesFlowException):
    """A business rule was violated."""
    
    def __init__(self, message: str, rule: str = None, details: dict = None):
        full_details = details or {}
        if rule:
            full_details["rule"] = rule
        super().__init__(message, ErrorCode.BUSINESS_RULE_VIOLATION, full_details)
    
    def get_status_code(self) -> int:
        return 422


class InvalidStateError(SalesFlowException):
    """Operation not allowed in current state."""
    
    def __init__(
        self,
        message: str,
        current_state: str = None,
        allowed_states: list[str] = None
    ):
        details = {}
        if current_state:
            details["current_state"] = current_state
        if allowed_states:
            details["allowed_states"] = allowed_states
        super().__init__(message, ErrorCode.INVALID_STATE, details)
    
    def get_status_code(self) -> int:
        return 422


class RateLimitExceededError(SalesFlowException):
    """Rate limit has been exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = None
    ):
        details = {"retry_after": retry_after} if retry_after else {}
        super().__init__(message, ErrorCode.RATE_LIMIT_EXCEEDED, details)
    
    def get_status_code(self) -> int:
        return 429


# ============= Database Errors (500, 503) =============

class DatabaseError(SalesFlowException):
    """Database operation failed."""
    
    def __init__(self, message: str = "Database error", details: dict = None):
        super().__init__(message, ErrorCode.DATABASE_ERROR, details)
    
    def get_status_code(self) -> int:
        return 500


class ConnectionError(DatabaseError):
    """Database connection failed."""
    
    def __init__(self, message: str = "Database connection failed"):
        super().__init__(message)
        self.code = ErrorCode.CONNECTION_ERROR
    
    def get_status_code(self) -> int:
        return 503


class QueryTimeoutError(DatabaseError):
    """Database query timed out."""
    
    def __init__(self, message: str = "Query timed out", query_time_ms: float = None):
        details = {"query_time_ms": query_time_ms} if query_time_ms else {}
        super().__init__(message, details)
        self.code = ErrorCode.QUERY_TIMEOUT
    
    def get_status_code(self) -> int:
        return 504


# ============= Helper Functions =============

def get_status_code(exception: Exception) -> int:
    """Get HTTP status code for any exception."""
    if isinstance(exception, SalesFlowException):
        return exception.get_status_code()
    return 500


def exception_to_dict(exception: Exception) -> dict[str, Any]:
    """Convert any exception to dictionary for API response."""
    if isinstance(exception, SalesFlowException):
        return exception.to_dict()
    return {
        "error": ErrorCode.INTERNAL_ERROR.value,
        "message": str(exception),
        "details": {}
    }


__all__ = [
    "ErrorCode",
    "SalesFlowException",
    "AuthenticationError",
    "TokenExpiredError",
    "TokenInvalidError",
    "PermissionError",
    "NotFoundError",
    "ValidationError",
    "ConflictError",
    "AlreadyExistsError",
    "BusinessRuleViolation",
    "InvalidStateError",
    "RateLimitExceededError",
    "DatabaseError",
    "ConnectionError",
    "QueryTimeoutError",
    "get_status_code",
    "exception_to_dict",
]

