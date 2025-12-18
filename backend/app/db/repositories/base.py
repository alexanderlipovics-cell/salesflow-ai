"""
SalesFlow AI - Base Repository
Abstract base class implementing common CRUD operations with error handling.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from uuid import UUID
import logging
import time
import functools

from supabase import Client
from pydantic import BaseModel
from postgrest.exceptions import APIError

from app.core.exceptions import (
    DatabaseError,
    NotFoundError,
    ValidationError,
    ConflictError,
)


# Type variable for Pydantic models
T = TypeVar("T", bound=BaseModel)

# Configure logger
logger = logging.getLogger(__name__)

# Configuration
SLOW_QUERY_THRESHOLD_MS = 500  # Warn if query takes longer than 500ms


# ─────────────────────────────────────────────────────────────────────────────
# Decorators
# ─────────────────────────────────────────────────────────────────────────────

def log_query(operation: str):
    """
    Decorator to log database operations with timing.
    
    Logs:
        - Operation start
        - Success with duration
        - Errors with stack trace
        - Slow query warnings
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            start_time = time.perf_counter()
            operation_id = f"{self.table_name}.{operation}"
            
            # Log operation start at DEBUG level
            logger.debug(
                f"DB Operation Start: {operation_id}",
                extra={
                    "table": self.table_name,
                    "operation": operation,
                    "args": str(args)[:200],  # Truncate for safety
                }
            )
            
            try:
                result = await func(self, *args, **kwargs)
                
                # Calculate duration
                duration_ms = (time.perf_counter() - start_time) * 1000
                
                # Log success
                log_data = {
                    "table": self.table_name,
                    "operation": operation,
                    "duration_ms": round(duration_ms, 2),
                    "success": True,
                }
                
                # Warn on slow queries
                if duration_ms > SLOW_QUERY_THRESHOLD_MS:
                    logger.warning(
                        f"Slow Query: {operation_id} took {duration_ms:.2f}ms",
                        extra=log_data
                    )
                else:
                    logger.debug(
                        f"DB Operation Complete: {operation_id} ({duration_ms:.2f}ms)",
                        extra=log_data
                    )
                
                return result
                
            except Exception as e:
                duration_ms = (time.perf_counter() - start_time) * 1000
                
                logger.error(
                    f"DB Operation Failed: {operation_id} - {str(e)}",
                    extra={
                        "table": self.table_name,
                        "operation": operation,
                        "duration_ms": round(duration_ms, 2),
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# Pagination & Filtering
# ─────────────────────────────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    """Parameters for paginated queries."""
    page: int = 1
    page_size: int = 20
    max_page_size: int = 100
    
    @property
    def offset(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * min(self.page_size, self.max_page_size)
    
    @property
    def limit(self) -> int:
        """Get capped page size."""
        return min(self.page_size, self.max_page_size)


class PaginatedResult(BaseModel, Generic[T]):
    """Container for paginated query results."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class FilterOperator:
    """Supported filter operators for queries."""
    EQ = "eq"           # equals
    NEQ = "neq"         # not equals
    GT = "gt"           # greater than
    GTE = "gte"         # greater than or equal
    LT = "lt"           # less than
    LTE = "lte"         # less than or equal
    LIKE = "like"       # pattern match (case sensitive)
    ILIKE = "ilike"     # pattern match (case insensitive)
    IN = "in"           # in list
    IS = "is"           # is null/not null
    CONTAINS = "cs"     # array contains
    OVERLAPS = "ov"     # arrays overlap


class QueryFilter(BaseModel):
    """Single filter condition."""
    field: str
    operator: str = FilterOperator.EQ
    value: Any
    
    def apply(self, query):
        """Apply this filter to a Supabase query."""
        op = self.operator
        
        if op == FilterOperator.EQ:
            return query.eq(self.field, self.value)
        elif op == FilterOperator.NEQ:
            return query.neq(self.field, self.value)
        elif op == FilterOperator.GT:
            return query.gt(self.field, self.value)
        elif op == FilterOperator.GTE:
            return query.gte(self.field, self.value)
        elif op == FilterOperator.LT:
            return query.lt(self.field, self.value)
        elif op == FilterOperator.LTE:
            return query.lte(self.field, self.value)
        elif op == FilterOperator.LIKE:
            return query.like(self.field, self.value)
        elif op == FilterOperator.ILIKE:
            return query.ilike(self.field, self.value)
        elif op == FilterOperator.IN:
            return query.in_(self.field, self.value)
        elif op == FilterOperator.IS:
            return query.is_(self.field, self.value)
        elif op == FilterOperator.CONTAINS:
            return query.contains(self.field, self.value)
        elif op == FilterOperator.OVERLAPS:
            return query.overlaps(self.field, self.value)
        else:
            raise ValidationError(f"Unknown filter operator: {op}")


class SortOrder(BaseModel):
    """Sorting configuration."""
    field: str
    ascending: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Base Repository
# ─────────────────────────────────────────────────────────────────────────────

class BaseRepository(ABC, Generic[T]):
    """
    Abstract base repository implementing common CRUD operations.
    
    This class provides:
        - Standard CRUD operations with error handling
        - Pagination support
        - Filtering and sorting
        - Soft delete support
        - Query logging with performance tracking
    
    Subclasses must define:
        - table_name: Name of the database table
        - model_class: Pydantic model for the entity
    
    Example:
        class LeadRepository(BaseRepository[Lead]):
            table_name = "leads"
            model_class = Lead
    """
    
    # Abstract properties to be defined by subclasses
    table_name: str = ""
    model_class: Type[T] = None  # type: ignore
    
    # Configuration
    soft_delete: bool = True  # Use soft delete by default
    soft_delete_field: str = "deleted_at"
    created_at_field: str = "created_at"
    updated_at_field: str = "updated_at"
    
    def __init__(self, supabase: Client):
        """
        Initialize repository with Supabase client.
        
        Args:
            supabase: Authenticated Supabase client instance.
        """
        self.db = supabase
        
        if not self.table_name:
            raise ValueError(f"{self.__class__.__name__} must define table_name")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Helper Methods
    # ─────────────────────────────────────────────────────────────────────────
    
    def _handle_api_error(self, error: APIError, operation: str) -> None:
        """
        Convert Supabase API errors to application exceptions.
        
        Args:
            error: The APIError from Supabase.
            operation: Name of the operation that failed.
            
        Raises:
            ConflictError: For unique constraint violations.
            ValidationError: For check constraint violations.
            DatabaseError: For other database errors.
        """
        error_msg = str(error)
        error_code = getattr(error, 'code', None)
        
        # Check for unique constraint violation
        if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
            # Try to extract field name
            field = None
            if "unique constraint" in error_msg.lower():
                # Extract constraint name and map to field
                parts = error_msg.split('"')
                if len(parts) >= 2:
                    field = parts[1].replace(f"{self.table_name}_", "").replace("_key", "")
            
            raise ConflictError(
                message=f"Duplicate value for {field or 'field'}",
                field=field
            )
        
        # Check for foreign key violation
        if "foreign key" in error_msg.lower():
            raise ValidationError(
                message="Referenced record does not exist",
                field=None
            )
        
        # Check for check constraint violation
        if "check constraint" in error_msg.lower():
            raise ValidationError(
                message="Value violates check constraint",
                field=None
            )
        
        # Generic database error
        raise DatabaseError(
            message=f"Database operation '{operation}' failed",
            original_error=error
        )
    
    def _base_query(self, include_deleted: bool = False):
        """
        Get base query with soft delete filter applied.
        
        Args:
            include_deleted: If True, include soft-deleted records.
            
        Returns:
            Supabase query builder.
        """
        query = self.db.table(self.table_name).select("*")
        
        if self.soft_delete and not include_deleted:
            query = query.is_(self.soft_delete_field, "null")
        
        return query
    
    def _apply_filters(self, query, filters: Optional[List[QueryFilter]] = None):
        """Apply list of filters to query."""
        if filters:
            for f in filters:
                query = f.apply(query)
        return query
    
    def _apply_sorting(
        self,
        query,
        sort: Optional[List[SortOrder]] = None,
        default_sort: Optional[str] = None
    ):
        """Apply sorting to query."""
        if sort:
            for s in sort:
                query = query.order(s.field, desc=not s.ascending)
        elif default_sort:
            query = query.order(default_sort, desc=True)
        return query
    
    def _add_timestamps(
        self,
        data: Dict[str, Any],
        is_create: bool = True
    ) -> Dict[str, Any]:
        """Add created_at/updated_at timestamps to data."""
        now = datetime.now(timezone.utc).isoformat()
        
        if is_create:
            data[self.created_at_field] = now
        data[self.updated_at_field] = now
        
        return data
    
    def _to_model(self, data: Dict[str, Any]) -> T:
        """Convert database record to Pydantic model."""
        if self.model_class:
            return self.model_class.model_validate(data)
        return data  # type: ignore
    
    def _to_model_list(self, data: List[Dict[str, Any]]) -> List[T]:
        """Convert list of database records to Pydantic models."""
        return [self._to_model(item) for item in data]
    
    # ─────────────────────────────────────────────────────────────────────────
    # CRUD Operations
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("get_by_id")
    async def get_by_id(
        self,
        id: UUID | str,
        include_deleted: bool = False
    ) -> Optional[T]:
        """
        Retrieve a single record by ID.
        
        Args:
            id: The unique identifier of the record.
            include_deleted: If True, include soft-deleted records.
            
        Returns:
            The record if found, None otherwise.
            
        Raises:
            DatabaseError: If query fails.
        """
        try:
            query = self._base_query(include_deleted)
            result = query.eq("id", str(id)).execute()
            
            if result.data:
                return self._to_model(result.data[0])
            return None
            
        except APIError as e:
            self._handle_api_error(e, "get_by_id")
    
    @log_query("get_by_id_or_fail")
    async def get_by_id_or_fail(
        self,
        id: UUID | str,
        include_deleted: bool = False
    ) -> T:
        """
        Retrieve a single record by ID, raising error if not found.
        
        Args:
            id: The unique identifier of the record.
            include_deleted: If True, include soft-deleted records.
            
        Returns:
            The record.
            
        Raises:
            NotFoundError: If record doesn't exist.
            DatabaseError: If query fails.
        """
        result = await self.get_by_id(id, include_deleted)
        
        if result is None:
            raise NotFoundError(
                resource_type=self.table_name.rstrip("s").title(),
                resource_id=id
            )
        
        return result
    
    @log_query("get_all")
    async def get_all(
        self,
        filters: Optional[List[QueryFilter]] = None,
        sort: Optional[List[SortOrder]] = None,
        pagination: Optional[PaginationParams] = None,
        include_deleted: bool = False
    ) -> List[T] | PaginatedResult[T]:
        """
        Retrieve multiple records with optional filtering, sorting, and pagination.
        
        Args:
            filters: List of filter conditions to apply.
            sort: List of sort orders to apply.
            pagination: Pagination parameters.
            include_deleted: If True, include soft-deleted records.
            
        Returns:
            List of records, or PaginatedResult if pagination is provided.
            
        Raises:
            DatabaseError: If query fails.
        """
        try:
            query = self._base_query(include_deleted)
            query = self._apply_filters(query, filters)
            query = self._apply_sorting(query, sort, self.created_at_field)
            
            if pagination:
                # Get total count first
                count_query = self._base_query(include_deleted)
                count_query = self._apply_filters(count_query, filters)
                count_result = count_query.execute()
                total = len(count_result.data) if count_result.data else 0
                
                # Apply pagination
                query = query.range(
                    pagination.offset,
                    pagination.offset + pagination.limit - 1
                )
                
                result = query.execute()
                items = self._to_model_list(result.data or [])
                
                total_pages = (total + pagination.limit - 1) // pagination.limit
                
                return PaginatedResult(
                    items=items,
                    total=total,
                    page=pagination.page,
                    page_size=pagination.limit,
                    total_pages=total_pages,
                    has_next=pagination.page < total_pages,
                    has_previous=pagination.page > 1
                )
            
            result = query.execute()
            return self._to_model_list(result.data or [])
            
        except APIError as e:
            self._handle_api_error(e, "get_all")
    
    @log_query("create")
    async def create(self, data: Dict[str, Any]) -> T:
        """
        Create a new record.
        
        Args:
            data: Dictionary of field values for the new record.
            
        Returns:
            The created record.
            
        Raises:
            ValidationError: If data is invalid.
            ConflictError: If unique constraint is violated.
            DatabaseError: If insert fails.
        """
        try:
            # Add timestamps
            data = self._add_timestamps(data.copy(), is_create=True)
            
            # Validate with model if available
            if self.model_class:
                try:
                    self.model_class.model_validate(data)
                except Exception as e:
                    raise ValidationError(message=str(e))
            
            result = self.db.table(self.table_name).insert(data).execute()
            
            if not result.data:
                raise DatabaseError("Insert returned no data")
            
            return self._to_model(result.data[0])
            
        except APIError as e:
            self._handle_api_error(e, "create")
    
    @log_query("create_many")
    async def create_many(self, items: List[Dict[str, Any]]) -> List[T]:
        """
        Create multiple records in a single operation.
        
        Args:
            items: List of dictionaries with field values.
            
        Returns:
            List of created records.
            
        Raises:
            ValidationError: If any data is invalid.
            ConflictError: If unique constraint is violated.
            DatabaseError: If insert fails.
        """
        try:
            # Add timestamps to all items
            items = [
                self._add_timestamps(item.copy(), is_create=True)
                for item in items
            ]
            
            result = self.db.table(self.table_name).insert(items).execute()
            
            return self._to_model_list(result.data or [])
            
        except APIError as e:
            self._handle_api_error(e, "create_many")
    
    @log_query("update")
    async def update(
        self,
        id: UUID | str,
        data: Dict[str, Any],
        partial: bool = True
    ) -> T:
        """
        Update an existing record.
        
        Args:
            id: The unique identifier of the record.
            data: Dictionary of fields to update.
            partial: If True, only update provided fields.
            
        Returns:
            The updated record.
            
        Raises:
            NotFoundError: If record doesn't exist.
            ValidationError: If data is invalid.
            ConflictError: If unique constraint is violated.
            DatabaseError: If update fails.
        """
        try:
            # Verify record exists
            existing = await self.get_by_id(id)
            if existing is None:
                raise NotFoundError(
                    resource_type=self.table_name.rstrip("s").title(),
                    resource_id=id
                )
            
            # Don't allow updating id, created_at
            data = data.copy()
            data.pop("id", None)
            data.pop(self.created_at_field, None)
            
            # Add updated_at timestamp
            data = self._add_timestamps(data, is_create=False)
            
            result = self.db.table(self.table_name).update(data).eq(
                "id", str(id)
            ).execute()
            
            if not result.data:
                raise DatabaseError("Update returned no data")
            
            return self._to_model(result.data[0])
            
        except APIError as e:
            self._handle_api_error(e, "update")
    
    @log_query("delete")
    async def delete(self, id: UUID | str, hard: bool = False) -> bool:
        """
        Delete a record (soft delete by default).
        
        Args:
            id: The unique identifier of the record.
            hard: If True, permanently delete the record.
            
        Returns:
            True if deletion was successful.
            
        Raises:
            NotFoundError: If record doesn't exist.
            DatabaseError: If delete fails.
        """
        try:
            # Verify record exists
            existing = await self.get_by_id(id)
            if existing is None:
                raise NotFoundError(
                    resource_type=self.table_name.rstrip("s").title(),
                    resource_id=id
                )
            
            if self.soft_delete and not hard:
                # Soft delete
                result = self.db.table(self.table_name).update({
                    self.soft_delete_field: datetime.now(timezone.utc).isoformat()
                }).eq("id", str(id)).execute()
            else:
                # Hard delete
                result = self.db.table(self.table_name).delete().eq(
                    "id", str(id)
                ).execute()
            
            return True
            
        except APIError as e:
            self._handle_api_error(e, "delete")
    
    @log_query("restore")
    async def restore(self, id: UUID | str) -> T:
        """
        Restore a soft-deleted record.
        
        Args:
            id: The unique identifier of the record.
            
        Returns:
            The restored record.
            
        Raises:
            NotFoundError: If record doesn't exist.
            InvalidStateError: If record is not deleted.
            DatabaseError: If restore fails.
        """
        if not self.soft_delete:
            raise ValidationError("This repository does not support soft delete")
        
        try:
            # Get including deleted
            existing = await self.get_by_id(id, include_deleted=True)
            if existing is None:
                raise NotFoundError(
                    resource_type=self.table_name.rstrip("s").title(),
                    resource_id=id
                )
            
            result = self.db.table(self.table_name).update({
                self.soft_delete_field: None,
                self.updated_at_field: datetime.now(timezone.utc).isoformat()
            }).eq("id", str(id)).execute()
            
            return self._to_model(result.data[0])
            
        except APIError as e:
            self._handle_api_error(e, "restore")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Convenience Methods
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_query("exists")
    async def exists(self, id: UUID | str) -> bool:
        """Check if a record exists."""
        result = await self.get_by_id(id)
        return result is not None
    
    @log_query("count")
    async def count(
        self,
        filters: Optional[List[QueryFilter]] = None,
        include_deleted: bool = False
    ) -> int:
        """Count records matching filters."""
        try:
            query = self._base_query(include_deleted)
            query = self._apply_filters(query, filters)
            result = query.execute()
            return len(result.data) if result.data else 0
        except APIError as e:
            self._handle_api_error(e, "count")
    
    @log_query("get_by_field")
    async def get_by_field(
        self,
        field: str,
        value: Any,
        include_deleted: bool = False
    ) -> Optional[T]:
        """Get single record by field value."""
        try:
            query = self._base_query(include_deleted)
            result = query.eq(field, value).limit(1).execute()
            
            if result.data:
                return self._to_model(result.data[0])
            return None
        except APIError as e:
            self._handle_api_error(e, "get_by_field")
    
    @log_query("get_many_by_field")
    async def get_many_by_field(
        self,
        field: str,
        value: Any,
        include_deleted: bool = False
    ) -> List[T]:
        """Get multiple records by field value."""
        try:
            query = self._base_query(include_deleted)
            result = query.eq(field, value).execute()
            return self._to_model_list(result.data or [])
        except APIError as e:
            self._handle_api_error(e, "get_many_by_field")
    
    @log_query("get_by_ids")
    async def get_by_ids(
        self,
        ids: List[UUID | str],
        include_deleted: bool = False
    ) -> List[T]:
        """Get multiple records by their IDs."""
        try:
            str_ids = [str(id) for id in ids]
            query = self._base_query(include_deleted)
            result = query.in_("id", str_ids).execute()
            return self._to_model_list(result.data or [])
        except APIError as e:
            self._handle_api_error(e, "get_by_ids")


__all__ = [
    "BaseRepository",
    "PaginationParams",
    "PaginatedResult",
    "FilterOperator",
    "QueryFilter",
    "SortOrder",
    "log_query",
    "SLOW_QUERY_THRESHOLD_MS",
]

