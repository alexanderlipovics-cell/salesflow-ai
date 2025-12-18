"""
Tasks router with CRUD, filtering and context lookups for contacts & deals.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.crm import (
    Task,
    TaskCreate,
    TaskFilter,
    TaskPriority,
    TaskStatus,
    TaskType,
    TaskUpdate,
    TaskWithContext,
    TasksResponse,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ============================================================================
# HELPERS
# ============================================================================


def apply_task_filters(query, filters: TaskFilter):
    if filters.status:
        query = query.in_("status", [status.value for status in filters.status])

    if filters.type:
        query = query.in_("type", [task_type.value for task_type in filters.type])

    if filters.priority:
        query = query.in_("priority", [priority.value for priority in filters.priority])

    if filters.assigned_to:
        query = query.eq("assigned_to", str(filters.assigned_to))

    if filters.contact_id:
        query = query.eq("contact_id", str(filters.contact_id))

    if filters.deal_id:
        query = query.eq("deal_id", str(filters.deal_id))

    now_iso = datetime.utcnow().isoformat()
    if filters.overdue:
        query = query.lt("due_at", now_iso)

    if filters.due_before:
        query = query.lt("due_at", filters.due_before.isoformat())

    if filters.due_after:
        query = query.gte("due_at", filters.due_after.isoformat())

    if filters.due_today:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        query = query.gte("due_at", today.isoformat()).lt("due_at", tomorrow.isoformat())

    return query


def _fetch_names(
    supabase: Client, table: str, ids: List[str], field: str
) -> Dict[str, str]:
    if not ids:
        return {}

    response = (
        supabase.table(table)
        .select(f"id, {field}")
        .in_("id", ids)
        .execute()
    )

    return {
        row["id"]: row.get(field)
        for row in (response.data or [])
    }


def _enrich_tasks_with_context(
    supabase: Client, tasks: List[dict]
) -> List[TaskWithContext]:
    contact_ids = {
        task.get("contact_id")
        for task in tasks
        if task.get("contact_id")
    }
    deal_ids = {
        task.get("deal_id")
        for task in tasks
        if task.get("deal_id")
    }

    contact_map = _fetch_names(supabase, "contacts", list(contact_ids), "name")
    deal_map = _fetch_names(supabase, "deals", list(deal_ids), "title")

    enriched = []
    for task in tasks:
        payload = dict(task)
        cid = payload.get("contact_id")
        did = payload.get("deal_id")
        if cid and cid in contact_map:
            payload["contact_name"] = contact_map[cid]
        if did and did in deal_map:
            payload["deal_title"] = deal_map[did]
        enriched.append(TaskWithContext(**payload))

    return enriched


def _serialize_task_payload(data: dict) -> dict:
    payload = data.copy()

    for enum_field in ["type", "priority", "status"]:
        if enum_field in payload and hasattr(payload[enum_field], "value"):
            payload[enum_field] = payload[enum_field].value

    for uuid_field in ["contact_id", "deal_id", "assigned_to", "created_by"]:
        if uuid_field in payload and payload[uuid_field]:
            payload[uuid_field] = str(payload[uuid_field])

    if "due_at" in payload and payload["due_at"]:
        payload["due_at"] = payload["due_at"].isoformat()

    return payload


# ============================================================================
# ROUTES
# ============================================================================


@router.get("", response_model=TasksResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("due_at", regex="^(due_at|priority|created_at|updated_at|status)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    status: Optional[List[TaskStatus]] = Query(None),
    task_types: Optional[List[TaskType]] = Query(None, alias="type"),
    priority: Optional[List[TaskPriority]] = Query(None),
    assigned_to: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    deal_id: Optional[UUID] = None,
    due_today: Optional[bool] = None,
    overdue: Optional[bool] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """List tasks with pagination and filtering."""

    org_id = current_user["org_id"]
    filters = TaskFilter(
        status=status,
        type=task_types,
        priority=priority,
        assigned_to=assigned_to,
        contact_id=contact_id,
        deal_id=deal_id,
        due_today=due_today,
        overdue=overdue,
        due_before=due_before,
        due_after=due_after,
    )

    query = (
        supabase.table("tasks")
        .select("*", count="exact")
        .eq("org_id", org_id)
    )

    query = apply_task_filters(query, filters)
    query = query.order(sort_by, desc=(sort_order == "desc"))

    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()
    total = result.count or 0
    pages = (total + per_page - 1) // per_page

    data = result.data or []

    # Apply overdue filter client-side to remove completed tasks if needed
    if overdue:
        data = [
            row
            for row in data
            if row.get("status") not in {TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value}
        ]

    items = _enrich_tasks_with_context(supabase, data)

    return TasksResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create a new task."""

    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    data = task.model_dump(exclude_none=True)
    data["org_id"] = org_id
    data["created_by"] = user_id
    data.setdefault("status", TaskStatus.PENDING)

    payload = _serialize_task_payload(data)

    result = supabase.table("tasks").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create task")

    return Task(**result.data[0])


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get a single task."""

    org_id = current_user["org_id"]
    result = (
        supabase.table("tasks")
        .select("*")
        .eq("id", str(task_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")

    return Task(**result.data)


@router.patch("/{task_id}", response_model=Task)
async def update_task(
    task_id: UUID,
    task: TaskUpdate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update a task."""

    org_id = current_user["org_id"]

    existing = (
        supabase.table("tasks")
        .select("id")
        .eq("id", str(task_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")

    data = task.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    data["updated_at"] = datetime.utcnow().isoformat()
    payload = _serialize_task_payload(data)

    result = (
        supabase.table("tasks")
        .update(payload)
        .eq("id", str(task_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update task")

    return Task(**result.data[0])


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete a task."""

    org_id = current_user["org_id"]
    result = (
        supabase.table("tasks")
        .delete()
        .eq("id", str(task_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")

    return None

