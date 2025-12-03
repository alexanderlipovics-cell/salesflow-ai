"""
Search API: Full-text search, history, suggestions und gespeicherte Filter.
"""
from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime
from typing import Any, Deque, Dict, List, Literal, Optional
from uuid import UUID
import time

from databases import Database
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.auth_helper import get_current_user_id
from app.db import get_db_connection

router = APIRouter(prefix="/api/search", tags=["Search"])

# ---------------------------------------------------------------------------
# Rate limiting (simple in-memory token bucket)
# ---------------------------------------------------------------------------
SEARCH_RATE_LIMIT = 40
SEARCH_RATE_WINDOW_SECONDS = 60
_search_requests: Dict[str, Deque[float]] = defaultdict(deque)


async def search_rate_limiter(user_id: str = Depends(get_current_user_id)) -> None:
    now = time.monotonic()
    bucket = _search_requests[user_id]

    while bucket and now - bucket[0] > SEARCH_RATE_WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= SEARCH_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Zu viele Suchanfragen. Bitte kurz warten.",
        )

    bucket.append(now)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class AdvancedFilters(BaseModel):
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    next_action_after: Optional[datetime] = None
    next_action_before: Optional[datetime] = None
    statuses: Optional[List[str]] = None
    lifecycle_stages: Optional[List[str]] = None
    lead_sources: Optional[List[str]] = None
    lead_score_min: Optional[int] = Field(default=None, ge=0, le=100)
    lead_score_max: Optional[int] = Field(default=None, ge=0, le=100)
    last_contact_days: Optional[int] = Field(default=None, ge=1, le=365)
    total_interactions_min: Optional[int] = Field(default=None, ge=0)
    custom_fields: Optional[Dict[str, Any]] = None
    tags_all: Optional[List[str]] = None
    tags_any: Optional[List[str]] = None
    tags_none: Optional[List[str]] = None


SortField = Literal["relevance", "created_at", "lead_score", "next_action"]
SortOrder = Literal["asc", "desc"]


class SearchQuery(BaseModel):
    workspace_id: UUID
    query: str = Field(..., min_length=1)
    filters: Optional[AdvancedFilters] = None
    sort_by: SortField = "relevance"
    sort_order: SortOrder = "desc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class SearchResult(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    lead_score: Optional[int] = None
    rank: float
    headline: Optional[str] = None
    matched_fields: List[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    page_size: int


class SearchHistoryPayload(BaseModel):
    workspace_id: UUID
    query: str = Field(..., min_length=1)
    results_count: int = Field(default=0, ge=0)
    clicked_result_id: Optional[UUID] = None


class SearchHistoryEntry(BaseModel):
    id: UUID
    query: str
    results_count: int
    searched_at: datetime


class SearchHistoryResponse(BaseModel):
    history: List[SearchHistoryEntry]


class SavedSearchPayload(BaseModel):
    workspace_id: UUID
    name: str = Field(..., min_length=1, max_length=60)
    query: str = Field(..., min_length=1)
    filters: Optional[AdvancedFilters] = None
    sort_by: SortField = "relevance"
    sort_order: SortOrder = "desc"


class SavedSearch(BaseModel):
    id: UUID
    name: str
    query: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    sort_by: SortField = "relevance"
    sort_order: SortOrder = "desc"
    created_at: datetime


class SavedSearchResponse(BaseModel):
    searches: List[SavedSearch]


class SuggestionsResponse(BaseModel):
    suggestions: List[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _filters_to_payload(filters: Optional[AdvancedFilters]) -> Dict[str, Any]:
    if not filters:
        return {}
    payload = filters.model_dump(exclude_none=True)
    return payload


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=SearchResponse,
    dependencies=[Depends(search_rate_limiter)],
)
async def search_contacts_endpoint(
    search_query: SearchQuery,
    db: Database = Depends(get_db_connection),
) -> SearchResponse:
    """
    Global Search über Kontakte + Notizen mit Ranking & Highlighting.
    """
    params = {
        "workspace_id": search_query.workspace_id,
        "query": search_query.query,
        "filters": _filters_to_payload(search_query.filters),
        "sort_by": search_query.sort_by,
        "sort_order": search_query.sort_order,
        "page": search_query.page,
        "page_size": search_query.page_size,
    }

    rows = await db.fetch_all(
        """
        SELECT *
        FROM search_contacts(
          :workspace_id,
          :query,
          :filters::jsonb,
          :sort_by,
          :sort_order,
          :page,
          :page_size
        )
        """,
        params,
    )

    total = rows[0]["total_count"] if rows else 0
    results = [
        SearchResult(
            **{
                **row,
                "matched_fields": row.get("matched_fields") or [],
            }
        )
        for row in rows
    ]

    return SearchResponse(
        results=results,
        total=int(total),
        page=search_query.page,
        page_size=search_query.page_size,
    )


@router.post("/history", status_code=status.HTTP_201_CREATED)
async def log_search_history(
    payload: SearchHistoryPayload,
    db: Database = Depends(get_db_connection),
    user_id: str = Depends(get_current_user_id),
) -> Dict[str, str]:
    await db.execute(
        """
        INSERT INTO public.search_history (workspace_id, user_id, query, results_count, clicked_result_id)
        VALUES (:workspace_id, :user_id, :query, :results_count, :clicked_result_id)
        """,
        {
            "workspace_id": payload.workspace_id,
            "user_id": user_id,
            "query": payload.query,
            "results_count": payload.results_count,
            "clicked_result_id": payload.clicked_result_id,
        },
    )
    return {"status": "logged"}


@router.get("/history", response_model=SearchHistoryResponse)
async def get_search_history(
    limit: int = Query(10, ge=1, le=50),
    workspace_id: Optional[UUID] = None,
    db: Database = Depends(get_db_connection),
    user_id: str = Depends(get_current_user_id),
) -> SearchHistoryResponse:
    rows = await db.fetch_all(
        """
        SELECT id, query, results_count, searched_at
        FROM public.search_history
        WHERE user_id = :user_id
          AND (:workspace_id::uuid IS NULL OR workspace_id = :workspace_id::uuid)
        ORDER BY searched_at DESC
        LIMIT :limit
        """,
        {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "limit": limit,
        },
    )
    history = [SearchHistoryEntry(**row) for row in rows]
    return SearchHistoryResponse(history=history)


@router.post("/saved", response_model=SavedSearch, status_code=status.HTTP_201_CREATED)
async def create_saved_search(
    payload: SavedSearchPayload,
    db: Database = Depends(get_db_connection),
    user_id: str = Depends(get_current_user_id),
) -> SavedSearch:
    filters = _filters_to_payload(payload.filters)

    row = await db.fetch_one(
        """
        INSERT INTO public.saved_searches (
          workspace_id,
          user_id,
          name,
          query,
          filters,
          sort_by,
          sort_order
        ) VALUES (
          :workspace_id,
          :user_id,
          :name,
          :query,
          :filters::jsonb,
          :sort_by,
          :sort_order
        )
        RETURNING *
        """,
        {
            "workspace_id": payload.workspace_id,
            "user_id": user_id,
            "name": payload.name,
            "query": payload.query,
            "filters": filters,
            "sort_by": payload.sort_by,
            "sort_order": payload.sort_order,
        },
    )

    if not row:
        raise HTTPException(status_code=500, detail="Speichern fehlgeschlagen.")

    data = dict(row)
    data["filters"] = data.get("filters") or {}
    return SavedSearch(**data)


@router.get("/saved", response_model=SavedSearchResponse)
async def list_saved_searches(
    workspace_id: UUID = Query(...),
    db: Database = Depends(get_db_connection),
    user_id: str = Depends(get_current_user_id),
) -> SavedSearchResponse:
    rows = await db.fetch_all(
        """
        SELECT *
        FROM public.saved_searches
        WHERE workspace_id = :workspace_id
          AND user_id = :user_id
        ORDER BY created_at DESC
        """,
        {
            "workspace_id": workspace_id,
            "user_id": user_id,
        },
    )

    searches = []
    for row in rows:
        data = dict(row)
        data["filters"] = data.get("filters") or {}
        searches.append(SavedSearch(**data))
    return SavedSearchResponse(searches=searches)


@router.delete("/saved/{saved_search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_search(
    saved_search_id: UUID,
    db: Database = Depends(get_db_connection),
    user_id: str = Depends(get_current_user_id),
) -> None:
    row = await db.fetch_one(
        """
        DELETE FROM public.saved_searches
        WHERE id = :id AND user_id = :user_id
        RETURNING id
        """,
        {"id": saved_search_id, "user_id": user_id},
    )

    if not row:
        raise HTTPException(status_code=404, detail="Gespeicherte Suche nicht gefunden.")


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    workspace_id: UUID = Query(...),
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=10),
    db: Database = Depends(get_db_connection),
) -> SuggestionsResponse:
    rows = await db.fetch_all(
        """
        SELECT query
        FROM (
          SELECT
            query,
            COUNT(*) AS frequency,
            MAX(searched_at) AS last_used
          FROM public.search_history
          WHERE workspace_id = :workspace_id
            AND query ILIKE :pattern
          GROUP BY query
        ) ranked
        ORDER BY frequency DESC, last_used DESC
        LIMIT :limit
        """,
        {
            "workspace_id": workspace_id,
            "pattern": f"%{q}%",
            "limit": limit,
        },
    )
    suggestions = [row["query"] for row in rows]
    return SuggestionsResponse(suggestions=suggestions)

