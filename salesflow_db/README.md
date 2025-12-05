# SalesFlow AI - Repository Pattern Implementation

Clean database abstraction layer with comprehensive error handling, logging, and testing.

## Features

- ✅ **BaseRepository** with full CRUD operations
- ✅ **Soft Delete** support
- ✅ **Pagination & Filtering** with flexible operators
- ✅ **Custom Exceptions** with HTTP status mapping
- ✅ **Query Logging** with slow query warnings
- ✅ **Type Safety** with Pydantic models
- ✅ **Comprehensive Tests** with mocked Supabase

## Project Structure

```
salesflow_db/
├── app/
│   ├── core/
│   │   └── exceptions.py      # Custom exception classes
│   └── db/
│       └── repositories/
│           ├── __init__.py    # Factory & dependencies
│           ├── base.py        # BaseRepository
│           ├── leads.py       # LeadRepository
│           ├── contacts.py    # ContactRepository
│           └── message_events.py
├── migrations/
│   └── 002_repository_tables.sql
└── tests/
    └── db/
        └── test_repositories.py
```

## Quick Start

### 1. Run Migration

Execute `migrations/002_repository_tables.sql` in Supabase SQL Editor.

### 2. Initialize Repositories

```python
from supabase import create_client
from app.db.repositories import init_repositories

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
factory = init_repositories(supabase)
```

### 3. Use in FastAPI

```python
from fastapi import Depends
from app.db.repositories import get_lead_repository
from app.db.repositories.leads import LeadRepository

@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: UUID,
    repo: LeadRepository = Depends(get_lead_repository)
):
    return await repo.get_by_id_or_fail(lead_id)
```

---

## BaseRepository API

All repositories inherit these operations:

### Read Operations

```python
# Get by ID (returns None if not found)
lead = await repo.get_by_id(lead_id)

# Get by ID (raises NotFoundError if not found)
lead = await repo.get_by_id_or_fail(lead_id)

# Get all (with optional filters, sorting, pagination)
leads = await repo.get_all(
    filters=[QueryFilter(field="status", value="new")],
    sort=[SortOrder(field="created_at", ascending=False)],
    pagination=PaginationParams(page=1, page_size=20)
)

# Check existence
exists = await repo.exists(lead_id)

# Count records
count = await repo.count(filters=[...])

# Get by field value
lead = await repo.get_by_field("email", "test@example.com")
leads = await repo.get_many_by_field("status", "new")

# Get multiple by IDs
leads = await repo.get_by_ids([id1, id2, id3])
```

### Write Operations

```python
# Create
lead = await repo.create({"email": "new@example.com", ...})

# Create many
leads = await repo.create_many([{...}, {...}])

# Update (partial by default)
lead = await repo.update(lead_id, {"status": "contacted"})

# Delete (soft by default)
success = await repo.delete(lead_id)

# Hard delete
success = await repo.delete(lead_id, hard=True)

# Restore soft-deleted
lead = await repo.restore(lead_id)
```

---

## Filtering

### Available Operators

```python
from app.db.repositories.base import QueryFilter, FilterOperator

filters = [
    QueryFilter(field="status", operator=FilterOperator.EQ, value="new"),
    QueryFilter(field="score", operator=FilterOperator.GTE, value=50),
    QueryFilter(field="status", operator=FilterOperator.IN, value=["new", "contacted"]),
    QueryFilter(field="email", operator=FilterOperator.ILIKE, value="%@gmail.com"),
    QueryFilter(field="deleted_at", operator=FilterOperator.IS, value="null"),
    QueryFilter(field="tags", operator=FilterOperator.CONTAINS, value=["hot"]),
]
```

| Operator | Description |
|----------|-------------|
| `EQ` | Equals |
| `NEQ` | Not equals |
| `GT` | Greater than |
| `GTE` | Greater than or equal |
| `LT` | Less than |
| `LTE` | Less than or equal |
| `LIKE` | Pattern match (case sensitive) |
| `ILIKE` | Pattern match (case insensitive) |
| `IN` | Value in list |
| `IS` | Is null/not null |
| `CONTAINS` | Array contains |
| `OVERLAPS` | Arrays overlap |

---

## Pagination

```python
from app.db.repositories.base import PaginationParams, PaginatedResult

pagination = PaginationParams(
    page=1,
    page_size=20,
    max_page_size=100  # Cap to prevent abuse
)

result: PaginatedResult = await repo.get_all(pagination=pagination)

print(result.items)         # List of entities
print(result.total)         # Total count
print(result.page)          # Current page
print(result.total_pages)   # Total pages
print(result.has_next)      # Has next page?
print(result.has_previous)  # Has previous page?
```

---

## Error Handling

### Exception Hierarchy

```
SalesFlowException (base)
├── DatabaseError (500)
│   ├── ConnectionError (503)
│   └── QueryTimeoutError (504)
├── NotFoundError (404)
├── ValidationError (400)
├── ConflictError (409)
├── PermissionError (403)
├── RateLimitError (429)
├── BusinessRuleViolation (422)
└── InvalidStateError (422)
```

### Usage in Routers

```python
from fastapi import HTTPException
from app.core.exceptions import NotFoundError, ConflictError, get_status_code

@router.post("/leads")
async def create_lead(data: LeadCreate, repo: LeadRepository = Depends(...)):
    try:
        return await repo.create(data)
    except ConflictError as e:
        raise HTTPException(
            status_code=get_status_code(e),
            detail=e.to_dict()
        )
```

### Global Exception Handler

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import SalesFlowException, get_status_code

app = FastAPI()

@app.exception_handler(SalesFlowException)
async def salesflow_exception_handler(request: Request, exc: SalesFlowException):
    return JSONResponse(
        status_code=get_status_code(exc),
        content=exc.to_dict()
    )
```

---

## LeadRepository Examples

### Business Operations

```python
from app.db.repositories.leads import LeadRepository, LeadStatus

# Create lead (validates email uniqueness)
lead = await repo.create(LeadCreate(
    email="new@example.com",
    first_name="John",
    last_name="Doe"
))

# Status transitions (validates allowed transitions)
lead = await repo.update(lead.id, {"status": "contacted"})

# Business methods
lead = await repo.mark_contacted(lead.id, next_follow_up=datetime(...))
lead = await repo.update_score(lead.id, 75)
lead = await repo.add_tags(lead.id, ["hot", "enterprise"])
lead = await repo.assign(lead.id, user_id)
lead = await repo.convert_to_won(lead.id, final_value=10000)

# Search
results = await repo.search(LeadSearchParams(
    status=[LeadStatus.NEW, LeadStatus.CONTACTED],
    priority=[LeadPriority.HIGH],
    min_score=50
))

# Get leads needing follow-up
leads = await repo.get_needs_follow_up(days_overdue=2)

# Statistics
stats = await repo.get_statistics()
pipeline_value = await repo.get_pipeline_value()
```

---

## Logging

All database operations are logged with timing:

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Output:
# DEBUG - DB Operation Start: leads.get_by_id
# DEBUG - DB Operation Complete: leads.get_by_id (12.34ms)

# Slow query warning (>500ms):
# WARNING - Slow Query: leads.get_all took 523.45ms
```

Configure slow query threshold:

```python
from app.db.repositories.base import SLOW_QUERY_THRESHOLD_MS
SLOW_QUERY_THRESHOLD_MS = 1000  # 1 second
```

---

## Testing

### Run Tests

```bash
pytest tests/db/test_repositories.py -v
```

### Mock Repository in Tests

```python
from unittest.mock import MagicMock

@pytest.fixture
def mock_repo():
    mock_supabase = MagicMock()
    return LeadRepository(mock_supabase)

@pytest.mark.asyncio
async def test_get_lead(mock_repo, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{
        "id": "...",
        "email": "test@example.com",
        ...
    }]
    
    result = await mock_repo.get_by_id("...")
    assert result.email == "test@example.com"
```

---

## Best Practices

1. **Always use repositories** - Never access Supabase directly in routers
2. **Use type hints** - Leverage Pydantic models for validation
3. **Handle exceptions** - Wrap repository calls in try/except
4. **Use transactions** - For multi-table operations (coming soon)
5. **Log appropriately** - DEBUG for operations, WARNING for slow queries
6. **Test thoroughly** - Mock Supabase for unit tests

---

## Migration from Direct Supabase

### Before (in router):

```python
@router.get("/leads")
def get_leads():
    db = get_supabase()
    result = db.table("leads").select("*").execute()
    return result.data  # No error handling, no typing
```

### After (with repository):

```python
@router.get("/leads")
async def get_leads(
    repo: LeadRepository = Depends(get_lead_repository)
) -> List[Lead]:
    return await repo.get_all()  # Typed, logged, error-handled
```

---

## License

MIT License - SalesFlow AI
