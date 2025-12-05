"""
SalesFlow AI - Repository Test Suite
Comprehensive tests for the repository layer.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4
from typing import Any, Dict, List

from app.db.repositories.base import (
    BaseRepository,
    QueryFilter,
    FilterOperator,
    SortOrder,
    PaginationParams,
    PaginatedResult,
)
from app.db.repositories.leads import (
    LeadRepository,
    Lead,
    LeadCreate,
    LeadUpdate,
    LeadStatus,
    LeadSource,
    LeadPriority,
    LeadSearchParams,
)
from app.db.repositories.contacts import (
    ContactRepository,
    Contact,
    ContactCreate,
    ContactType,
)
from app.db.repositories.message_events import (
    MessageEventRepository,
    MessageEvent,
    MessageEventCreate,
    MessageChannel,
    MessageDirection,
    MessageStatus,
)
from app.core.exceptions import (
    NotFoundError,
    ConflictError,
    ValidationError,
    DatabaseError,
    InvalidStateError,
)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_supabase():
    """Create mock Supabase client."""
    mock = MagicMock()
    
    # Setup chainable mock
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.select.return_value.is_.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = []
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    
    return mock


@pytest.fixture
def sample_lead_data() -> Dict[str, Any]:
    """Sample lead data for testing."""
    return {
        "id": str(uuid4()),
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "company": "Acme Inc",
        "status": LeadStatus.NEW.value,
        "source": LeadSource.WEBSITE.value,
        "priority": LeadPriority.MEDIUM.value,
        "score": 50,
        "tags": ["hot", "enterprise"],
        "custom_fields": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }


@pytest.fixture
def sample_contact_data() -> Dict[str, Any]:
    """Sample contact data for testing."""
    return {
        "id": str(uuid4()),
        "lead_id": str(uuid4()),
        "email": "contact@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "contact_type": ContactType.PRIMARY.value,
        "is_primary": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }


@pytest.fixture
def sample_message_data() -> Dict[str, Any]:
    """Sample message event data for testing."""
    return {
        "id": str(uuid4()),
        "lead_id": str(uuid4()),
        "channel": MessageChannel.EMAIL.value,
        "direction": MessageDirection.OUTBOUND.value,
        "status": MessageStatus.SENT.value,
        "subject": "Hello",
        "body": "Test message",
        "open_count": 0,
        "click_count": 0,
        "retry_count": 0,
        "metadata": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@pytest.fixture
def lead_repo(mock_supabase) -> LeadRepository:
    """Create LeadRepository with mock client."""
    return LeadRepository(mock_supabase)


@pytest.fixture
def contact_repo(mock_supabase) -> ContactRepository:
    """Create ContactRepository with mock client."""
    return ContactRepository(mock_supabase)


@pytest.fixture
def message_repo(mock_supabase) -> MessageEventRepository:
    """Create MessageEventRepository with mock client."""
    return MessageEventRepository(mock_supabase)


# ─────────────────────────────────────────────────────────────────────────────
# Base Repository Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestBaseRepository:
    """Tests for BaseRepository functionality."""
    
    @pytest.mark.asyncio
    async def test_get_by_id_found(self, lead_repo, mock_supabase, sample_lead_data):
        """Should return entity when found."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        result = await lead_repo.get_by_id(sample_lead_data["id"])
        
        assert result is not None
        assert result.email == sample_lead_data["email"]
    
    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, lead_repo, mock_supabase):
        """Should return None when entity not found."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = []
        
        result = await lead_repo.get_by_id(uuid4())
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_by_id_or_fail_raises(self, lead_repo, mock_supabase):
        """Should raise NotFoundError when entity not found."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = []
        
        with pytest.raises(NotFoundError) as exc_info:
            await lead_repo.get_by_id_or_fail(uuid4())
        
        assert "Lead" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_all_returns_list(self, lead_repo, mock_supabase, sample_lead_data):
        """Should return list of entities."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.order.return_value.execute.return_value.data = [
            sample_lead_data,
            {**sample_lead_data, "id": str(uuid4()), "email": "test2@example.com"}
        ]
        
        results = await lead_repo.get_all()
        
        assert len(results) == 2
    
    @pytest.mark.asyncio
    async def test_get_all_with_pagination(self, lead_repo, mock_supabase, sample_lead_data):
        """Should return paginated results."""
        # Mock count query
        mock_supabase.table.return_value.select.return_value.is_.return_value.execute.return_value.data = [
            sample_lead_data for _ in range(25)
        ]
        
        # Mock paginated query
        mock_supabase.table.return_value.select.return_value.is_.return_value.order.return_value.range.return_value.execute.return_value.data = [
            sample_lead_data for _ in range(10)
        ]
        
        pagination = PaginationParams(page=1, page_size=10)
        results = await lead_repo.get_all(pagination=pagination)
        
        assert isinstance(results, PaginatedResult)
        assert results.total == 25
        assert results.page == 1
        assert results.has_next is True
    
    @pytest.mark.asyncio
    async def test_create_success(self, lead_repo, mock_supabase, sample_lead_data):
        """Should create and return entity."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [sample_lead_data]
        
        create_data = LeadCreate(
            email="new@example.com",
            first_name="New",
            last_name="Lead"
        )
        
        result = await lead_repo.create(create_data)
        
        assert result is not None
        mock_supabase.table.return_value.insert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_success(self, lead_repo, mock_supabase, sample_lead_data):
        """Should update and return entity."""
        # Mock get_by_id
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        # Mock update
        updated_data = {**sample_lead_data, "first_name": "Updated"}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated_data]
        
        result = await lead_repo.update(sample_lead_data["id"], {"first_name": "Updated"})
        
        assert result.first_name == "Updated"
    
    @pytest.mark.asyncio
    async def test_update_not_found(self, lead_repo, mock_supabase):
        """Should raise NotFoundError when entity not found."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = []
        
        with pytest.raises(NotFoundError):
            await lead_repo.update(uuid4(), {"first_name": "Updated"})
    
    @pytest.mark.asyncio
    async def test_soft_delete(self, lead_repo, mock_supabase, sample_lead_data):
        """Should soft delete entity."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        result = await lead_repo.delete(sample_lead_data["id"])
        
        assert result is True
        # Verify it called update, not delete
        mock_supabase.table.return_value.update.assert_called()


# ─────────────────────────────────────────────────────────────────────────────
# Lead Repository Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestLeadRepository:
    """Tests for LeadRepository-specific functionality."""
    
    @pytest.mark.asyncio
    async def test_create_duplicate_email_raises(self, lead_repo, mock_supabase, sample_lead_data):
        """Should raise ConflictError for duplicate email."""
        # Mock: email exists
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.limit.return_value.execute.return_value.data = [sample_lead_data]
        
        create_data = LeadCreate(
            email=sample_lead_data["email"],
            first_name="Duplicate",
            last_name="Lead"
        )
        
        with pytest.raises(ConflictError) as exc_info:
            await lead_repo.create(create_data)
        
        assert "already exists" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_valid_status_transition(self, lead_repo, mock_supabase, sample_lead_data):
        """Should allow valid status transitions."""
        # Mock get_by_id returns NEW status lead
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        # Mock update
        updated = {**sample_lead_data, "status": LeadStatus.CONTACTED.value}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
        
        result = await lead_repo.update(
            sample_lead_data["id"],
            {"status": LeadStatus.CONTACTED.value}
        )
        
        assert result.status == LeadStatus.CONTACTED
    
    @pytest.mark.asyncio
    async def test_invalid_status_transition_raises(self, lead_repo, mock_supabase, sample_lead_data):
        """Should raise InvalidStateError for invalid status transitions."""
        # Lead is in NEW status
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        # Try to transition directly to WON (invalid)
        with pytest.raises(InvalidStateError):
            await lead_repo.update(
                sample_lead_data["id"],
                {"status": LeadStatus.WON.value}
            )
    
    @pytest.mark.asyncio
    async def test_get_by_email(self, lead_repo, mock_supabase, sample_lead_data):
        """Should find lead by email."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.limit.return_value.execute.return_value.data = [sample_lead_data]
        
        result = await lead_repo.get_by_email(sample_lead_data["email"])
        
        assert result is not None
        assert result.email == sample_lead_data["email"]
    
    @pytest.mark.asyncio
    async def test_update_score_valid(self, lead_repo, mock_supabase, sample_lead_data):
        """Should update score within valid range."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        updated = {**sample_lead_data, "score": 75}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
        
        result = await lead_repo.update_score(sample_lead_data["id"], 75)
        
        assert result.score == 75
    
    @pytest.mark.asyncio
    async def test_update_score_invalid_range(self, lead_repo, mock_supabase):
        """Should raise ValidationError for out-of-range score."""
        with pytest.raises(ValidationError):
            await lead_repo.update_score(uuid4(), 150)
    
    @pytest.mark.asyncio
    async def test_add_tags(self, lead_repo, mock_supabase, sample_lead_data):
        """Should add tags without duplicates."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [sample_lead_data]
        
        updated = {**sample_lead_data, "tags": ["hot", "enterprise", "new_tag"]}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
        
        result = await lead_repo.add_tags(sample_lead_data["id"], ["new_tag", "hot"])
        
        assert "new_tag" in result.tags
        assert result.tags.count("hot") == 1  # No duplicates
    
    @pytest.mark.asyncio
    async def test_search_with_filters(self, lead_repo, mock_supabase, sample_lead_data):
        """Should search with multiple filters."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.in_.return_value.in_.return_value.order.return_value.order.return_value.execute.return_value.data = [sample_lead_data]
        
        params = LeadSearchParams(
            status=[LeadStatus.NEW, LeadStatus.CONTACTED],
            priority=[LeadPriority.HIGH]
        )
        
        results = await lead_repo.search(params)
        
        assert len(results) == 1


# ─────────────────────────────────────────────────────────────────────────────
# Contact Repository Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestContactRepository:
    """Tests for ContactRepository-specific functionality."""
    
    @pytest.mark.asyncio
    async def test_create_sets_primary(self, contact_repo, mock_supabase, sample_contact_data):
        """Should handle primary contact setting."""
        # No existing contacts
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [sample_contact_data]
        
        create_data = ContactCreate(
            lead_id=UUID(sample_contact_data["lead_id"]),
            email="new@example.com",
            first_name="New",
            last_name="Contact",
            is_primary=True
        )
        
        result = await contact_repo.create(create_data)
        
        assert result.is_primary is True
    
    @pytest.mark.asyncio
    async def test_get_by_lead(self, contact_repo, mock_supabase, sample_contact_data):
        """Should get all contacts for a lead."""
        mock_supabase.table.return_value.select.return_value.is_.return_value.eq.return_value.execute.return_value.data = [
            sample_contact_data,
            {**sample_contact_data, "id": str(uuid4()), "is_primary": False}
        ]
        
        results = await contact_repo.get_by_lead(sample_contact_data["lead_id"])
        
        assert len(results) == 2


# ─────────────────────────────────────────────────────────────────────────────
# Message Event Repository Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestMessageEventRepository:
    """Tests for MessageEventRepository-specific functionality."""
    
    @pytest.mark.asyncio
    async def test_record_open(self, message_repo, mock_supabase, sample_message_data):
        """Should record message open and increment counter."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_message_data]
        
        updated = {**sample_message_data, "open_count": 1, "status": MessageStatus.OPENED.value}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
        
        result = await message_repo.record_open(sample_message_data["id"])
        
        assert result.open_count == 1
        assert result.status == MessageStatus.OPENED
    
    @pytest.mark.asyncio
    async def test_record_failure(self, message_repo, mock_supabase, sample_message_data):
        """Should record failure with error details."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_message_data]
        
        updated = {
            **sample_message_data,
            "status": MessageStatus.FAILED.value,
            "error_code": "BOUNCE",
            "error_message": "Invalid email",
            "retry_count": 1
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated]
        
        result = await message_repo.record_failure(
            sample_message_data["id"],
            error_code="BOUNCE",
            error_message="Invalid email"
        )
        
        assert result.status == MessageStatus.FAILED
        assert result.error_code == "BOUNCE"
        assert result.retry_count == 1
    
    @pytest.mark.asyncio
    async def test_mark_for_retry_max_exceeded(self, message_repo, mock_supabase, sample_message_data):
        """Should raise ValidationError when max retries exceeded."""
        sample_message_data["retry_count"] = 3
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_message_data]
        
        with pytest.raises(ValidationError) as exc_info:
            await message_repo.mark_for_retry(sample_message_data["id"])
        
        assert "retry" in str(exc_info.value).lower()


# ─────────────────────────────────────────────────────────────────────────────
# Filter and Pagination Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFiltersAndPagination:
    """Tests for filtering and pagination functionality."""
    
    def test_query_filter_apply_eq(self, mock_supabase):
        """Should apply equality filter."""
        query = mock_supabase.table("test").select("*")
        filter = QueryFilter(field="status", value="active")
        
        result = filter.apply(query)
        
        query.eq.assert_called_once_with("status", "active")
    
    def test_query_filter_apply_in(self, mock_supabase):
        """Should apply IN filter."""
        query = mock_supabase.table("test").select("*")
        filter = QueryFilter(
            field="status",
            operator=FilterOperator.IN,
            value=["active", "pending"]
        )
        
        result = filter.apply(query)
        
        query.in_.assert_called_once_with("status", ["active", "pending"])
    
    def test_pagination_params_offset(self):
        """Should calculate correct offset."""
        params = PaginationParams(page=3, page_size=20)
        
        assert params.offset == 40  # (3-1) * 20
    
    def test_pagination_params_max_limit(self):
        """Should cap page size at max."""
        params = PaginationParams(page=1, page_size=500, max_page_size=100)
        
        assert params.limit == 100


# ─────────────────────────────────────────────────────────────────────────────
# Exception Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestExceptions:
    """Tests for custom exception classes."""
    
    def test_not_found_error_message(self):
        """Should format error message correctly."""
        error = NotFoundError("Lead", "123")
        
        assert "Lead" in error.message
        assert "123" in error.message
        assert error.code == "NOT_FOUND"
    
    def test_conflict_error_details(self):
        """Should include field in details."""
        error = ConflictError(
            message="Email already exists",
            field="email",
            existing_value="test@example.com"
        )
        
        assert error.details["field"] == "email"
        assert error.details["existing_value"] == "test@example.com"
    
    def test_validation_error_with_multiple_errors(self):
        """Should handle multiple validation errors."""
        errors = [
            {"field": "email", "message": "Invalid format"},
            {"field": "password", "message": "Too short"}
        ]
        error = ValidationError(message="Validation failed", errors=errors)
        
        assert len(error.details["errors"]) == 2
    
    def test_exception_to_dict(self):
        """Should serialize exception to dict."""
        error = NotFoundError("Lead", "123")
        result = error.to_dict()
        
        assert "error" in result
        assert result["error"]["code"] == "NOT_FOUND"
        assert result["error"]["message"] == error.message


# ─────────────────────────────────────────────────────────────────────────────
# Run Tests
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
