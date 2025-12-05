"""
SalesFlow AI - Custom Exception Classes
Structured error handling for the application.
"""

from typing import Any, Dict, Optional
from uuid import UUID


class SalesFlowException(Exception):
    """
    Base exception for all SalesFlow application errors.
    
    Attributes:
        message: Human-readable error description.
        code: Machine-readable error code.
        details: Additional context about the error.
    """
    
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }


# ─────────────────────────────────────────────────────────────────────────────
# Database Exceptions (5xx-level or specific DB issues)
# ─────────────────────────────────────────────────────────────────────────────

class DatabaseError(SalesFlowException):
    """
    Raised when a database operation fails unexpectedly.
    
    Examples:
        - Connection timeout
        - Query execution failure
        - Transaction rollback
    """
    
    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None
    ):
        self.original_error = original_error
        if original_error and not details:
            details = {"original_error": str(original_error)}
        super().__init__(message, code="DATABASE_ERROR", details=details)


class ConnectionError(DatabaseError):
    """
    Raised when database connection cannot be established.
    """
    
    def __init__(
        self,
        message: str = "Could not connect to database",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, details)
        self.code = "CONNECTION_ERROR"


class QueryTimeoutError(DatabaseError):
    """
    Raised when a query exceeds the timeout threshold.
    """
    
    def __init__(
        self,
        message: str = "Query timed out",
        query_time_ms: Optional[float] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        if query_time_ms:
            details["query_time_ms"] = query_time_ms
        super().__init__(message, details)
        self.code = "QUERY_TIMEOUT"


# ─────────────────────────────────────────────────────────────────────────────
# Resource Exceptions (4xx-level client errors)
# ─────────────────────────────────────────────────────────────────────────────

class NotFoundError(SalesFlowException):
    """
    Raised when a requested resource does not exist (404).
    
    Args:
        resource_type: Type of resource (e.g., "Lead", "Contact").
        resource_id: ID of the missing resource.
    """
    
    def __init__(
        self,
        resource_type: str,
        resource_id: Optional[str | UUID] = None,
        message: Optional[str] = None
    ):
        self.resource_type = resource_type
        self.resource_id = str(resource_id) if resource_id else None
        
        if not message:
            if resource_id:
                message = f"{resource_type} with ID '{resource_id}' not found"
            else:
                message = f"{resource_type} not found"
        
        super().__init__(
            message=message,
            code="NOT_FOUND",
            details={
                "resource_type": resource_type,
                "resource_id": self.resource_id
            }
        )


class ValidationError(SalesFlowException):
    """
    Raised when input data fails validation (400).
    
    Args:
        message: Description of validation failure.
        field: Specific field that failed validation.
        errors: List of validation errors for multiple fields.
    """
    
    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        errors: Optional[list[Dict[str, str]]] = None
    ):
        details: Dict[str, Any] = {}
        if field:
            details["field"] = field
        if errors:
            details["errors"] = errors
        
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details=details
        )


class ConflictError(SalesFlowException):
    """
    Raised when operation conflicts with existing data (409).
    
    Examples:
        - Duplicate email address
        - Unique constraint violation
        - Concurrent update conflict
    """
    
    def __init__(
        self,
        message: str = "Resource conflict",
        field: Optional[str] = None,
        existing_value: Optional[Any] = None
    ):
        details: Dict[str, Any] = {}
        if field:
            details["field"] = field
        if existing_value:
            details["existing_value"] = str(existing_value)
        
        super().__init__(
            message=message,
            code="CONFLICT",
            details=details
        )


class PermissionError(SalesFlowException):
    """
    Raised when user lacks permission for operation (403).
    
    Args:
        action: The attempted action (e.g., "delete", "update").
        resource_type: Type of resource being accessed.
    """
    
    def __init__(
        self,
        message: str = "Permission denied",
        action: Optional[str] = None,
        resource_type: Optional[str] = None
    ):
        details: Dict[str, Any] = {}
        if action:
            details["action"] = action
        if resource_type:
            details["resource_type"] = resource_type
        
        super().__init__(
            message=message,
            code="PERMISSION_DENIED",
            details=details
        )


class RateLimitError(SalesFlowException):
    """
    Raised when rate limit is exceeded (429).
    """
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after_seconds: Optional[int] = None
    ):
        details: Dict[str, Any] = {}
        if retry_after_seconds:
            details["retry_after_seconds"] = retry_after_seconds
        
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            details=details
        )


# ─────────────────────────────────────────────────────────────────────────────
# Business Logic Exceptions
# ─────────────────────────────────────────────────────────────────────────────

class BusinessRuleViolation(SalesFlowException):
    """
    Raised when a business rule is violated.
    
    Examples:
        - Cannot delete lead with active deals
        - Cannot assign more than X leads to one user
    """
    
    def __init__(
        self,
        rule: str,
        message: Optional[str] = None
    ):
        if not message:
            message = f"Business rule violated: {rule}"
        
        super().__init__(
            message=message,
            code="BUSINESS_RULE_VIOLATION",
            details={"rule": rule}
        )


class InvalidStateError(SalesFlowException):
    """
    Raised when resource is in invalid state for operation.
    
    Examples:
        - Cannot send message to archived lead
        - Cannot update closed deal
    """
    
    def __init__(
        self,
        message: str,
        current_state: Optional[str] = None,
        required_state: Optional[str] = None
    ):
        details: Dict[str, Any] = {}
        if current_state:
            details["current_state"] = current_state
        if required_state:
            details["required_state"] = required_state
        
        super().__init__(
            message=message,
            code="INVALID_STATE",
            details=details
        )


# ─────────────────────────────────────────────────────────────────────────────
# Exception Mapping for HTTP Responses
# ─────────────────────────────────────────────────────────────────────────────

EXCEPTION_STATUS_CODES = {
    NotFoundError: 404,
    ValidationError: 400,
    ConflictError: 409,
    PermissionError: 403,
    RateLimitError: 429,
    BusinessRuleViolation: 422,
    InvalidStateError: 422,
    DatabaseError: 500,
    ConnectionError: 503,
    QueryTimeoutError: 504,
    SalesFlowException: 500,
}


def get_status_code(exception: SalesFlowException) -> int:
    """
    Get HTTP status code for an exception.
    
    Args:
        exception: The exception to map.
        
    Returns:
        Appropriate HTTP status code.
    """
    for exc_type, status_code in EXCEPTION_STATUS_CODES.items():
        if isinstance(exception, exc_type):
            return status_code
    return 500
