"""
Sales Flow AI - Tasks Router
Follow-ups, reminders, and task management
"""

from datetime import datetime, date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.crm import (
    Task,
    TaskCreate,
    TaskUpdate,
    TaskWithContext,
    TasksResponse,
    TaskType,
    TaskPriority,
    TaskStatus,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ============================================================================
# LIST & SEARCH
# ============================================================================

@router.get("", response_model=TasksResponse)
async def list_tasks(
    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("due_at"),
    sort_order: str = Query("asc"),
    
    # Filters
    status: Optional[List[TaskStatus]] = Query(None),
    type: Optional[List[TaskType]] = Query(None),
    priority: Optional[List[TaskPriority]] = Query(None),
    assigned_to: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    deal_id: Optional[UUID] = None,
    due_today: Optional[bool] = None,
    overdue: Optional[bool] = None,
    
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """List tasks with filtering."""
    org_id = current_user["org_id"]
    
    query = supabase.table("tasks").select(
        "id, type, title, description, priority, due_at, status, "
        "contact_id, deal_id, assigned_to, completed_at, created_at",
        count="exact"
    ).eq("org_id", org_id)
    
    # Default: show only pending tasks
    if status:
        query = query.in_("status", [s.value for s in status])
    else:
        query = query.eq("status", "pending")
    
    if type:
        query = query.in_("type", [t.value for t in type])
    
    if priority:
        query = query.in_("priority", [p.value for p in priority])
    
    if assigned_to:
        query = query.eq("assigned_to", str(assigned_to))
    
    if contact_id:
        query = query.eq("contact_id", str(contact_id))
    
    if deal_id:
        query = query.eq("deal_id", str(deal_id))
    
    today = date.today()
    if due_today:
        query = query.gte("due_at", today.isoformat())
        query = query.lt("due_at", (today + timedelta(days=1)).isoformat())
    
    if overdue:
        query = query.lt("due_at", datetime.utcnow().isoformat())
        query = query.eq("status", "pending")
    
    query = query.order(sort_by, desc=(sort_order == "desc"))
    
    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)
    
    result = query.execute()
    
    total = result.count or 0
    pages = (total + per_page - 1) // per_page if total > 0 else 0
    
    # Get contact and deal names
    contact_ids = list(set(t["contact_id"] for t in result.data if t.get("contact_id")))
    deal_ids = list(set(t["deal_id"] for t in result.data if t.get("deal_id")))
    assigned_ids = list(set(t["assigned_to"] for t in result.data if t.get("assigned_to")))
    
    contact_names = {}
    deal_titles = {}
    member_names = {}
    
    if contact_ids:
        contacts = supabase.table("contacts").select("id, name").in_("id", contact_ids).execute()
        contact_names = {c["id"]: c["name"] for c in contacts.data}
    
    if deal_ids:
        deals = supabase.table("deals").select("id, title").in_("id", deal_ids).execute()
        deal_titles = {d["id"]: d["title"] for d in deals.data}
    
    if assigned_ids:
        members = supabase.table("team_members").select("id, name").in_("id", assigned_ids).execute()
        member_names = {m["id"]: m["name"] for m in members.data}
    
    items = []
    for task in result.data:
        task["contact_name"] = contact_names.get(task.get("contact_id"))
        task["deal_title"] = deal_titles.get(task.get("deal_id"))
        task["assigned_to_name"] = member_names.get(task.get("assigned_to"))
        items.append(TaskWithContext(**task))
    
    return TasksResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/my")
async def get_my_tasks(
    include_completed: bool = False,
    days_ahead: int = Query(7, ge=1, le=30),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's tasks (for Daily Command)."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]
    
    end_date = datetime.utcnow() + timedelta(days=days_ahead)
    
    query = supabase.table("tasks").select(
        "id, type, title, priority, due_at, status, contact_id, deal_id"
    ).eq("org_id", org_id).eq("assigned_to", user_id).lte("due_at", end_date.isoformat())
    
    if not include_completed:
        query = query.eq("status", "pending")
    
    result = query.order("due_at").execute()
    
    # Categorize
    now = datetime.utcnow()
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    overdue = []
    today_tasks = []
    upcoming = []
    
    for task in result.data:
        due = datetime.fromisoformat(task["due_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        task["is_overdue"] = due < now and task["status"] == "pending"
        
        if task["is_overdue"]:
            overdue.append(task)
        elif due <= today_end:
            today_tasks.append(task)
        else:
            upcoming.append(task)
    
    # Get contact names for context
    contact_ids = list(set(t["contact_id"] for t in result.data if t.get("contact_id")))
    contact_names = {}
    if contact_ids:
        contacts = supabase.table("contacts").select("id, name").in_("id", contact_ids).execute()
        contact_names = {c["id"]: c["name"] for c in contacts.data}
    
    for task in overdue + today_tasks + upcoming:
        task["contact_name"] = contact_names.get(task.get("contact_id"))
    
    return {
        "overdue": overdue,
        "today": today_tasks,
        "upcoming": upcoming,
        "summary": {
            "overdue_count": len(overdue),
            "today_count": len(today_tasks),
            "upcoming_count": len(upcoming),
            "total": len(result.data),
        }
    }


# ============================================================================
# CRUD
# ============================================================================

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
    data["assigned_to"] = str(data.get("assigned_to") or user_id)
    
    # Convert types
    if "type" in data:
        data["type"] = data["type"].value if hasattr(data["type"], "value") else data["type"]
    if "priority" in data:
        data["priority"] = data["priority"].value if hasattr(data["priority"], "value") else data["priority"]
    if "due_at" in data:
        data["due_at"] = data["due_at"].isoformat() if hasattr(data["due_at"], "isoformat") else data["due_at"]
    if "contact_id" in data and data["contact_id"]:
        data["contact_id"] = str(data["contact_id"])
    if "deal_id" in data and data["deal_id"]:
        data["deal_id"] = str(data["deal_id"])
    
    result = supabase.table("tasks").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create task")
    
    # Log activity if linked to contact
    if data.get("contact_id"):
        supabase.table("activities").insert({
            "org_id": org_id,
            "contact_id": data["contact_id"],
            "deal_id": data.get("deal_id"),
            "user_id": user_id,
            "type": "task_created",
            "subject": data["title"],
            "metadata": {"task_id": result.data[0]["id"], "task_type": data.get("type")},
        }).execute()
    
    return Task(**result.data[0])


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get a single task."""
    org_id = current_user["org_id"]
    
    result = supabase.table("tasks").select("*").eq(
        "id", str(task_id)
    ).eq("org_id", org_id).single().execute()
    
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
    
    existing = supabase.table("tasks").select("id").eq(
        "id", str(task_id)
    ).eq("org_id", org_id).single().execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    data = task.model_dump(exclude_none=True)
    
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Convert types
    for field in ["type", "priority", "status"]:
        if field in data and data[field]:
            data[field] = data[field].value if hasattr(data[field], "value") else data[field]
    
    if "due_at" in data and data["due_at"]:
        data["due_at"] = data["due_at"].isoformat() if hasattr(data["due_at"], "isoformat") else data["due_at"]
    
    for uuid_field in ["contact_id", "deal_id", "assigned_to"]:
        if uuid_field in data and data[uuid_field]:
            data[uuid_field] = str(data[uuid_field])
    
    result = supabase.table("tasks").update(data).eq(
        "id", str(task_id)
    ).eq("org_id", org_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update task")
    
    return Task(**result.data[0])


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mark task as completed."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]
    
    existing = supabase.table("tasks").select("id, contact_id, deal_id, title").eq(
        "id", str(task_id)
    ).eq("org_id", org_id).single().execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = supabase.table("tasks").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", str(task_id)).execute()
    
    # Log activity
    if existing.data.get("contact_id"):
        supabase.table("activities").insert({
            "org_id": org_id,
            "contact_id": existing.data["contact_id"],
            "deal_id": existing.data.get("deal_id"),
            "user_id": user_id,
            "type": "task_completed",
            "subject": existing.data["title"],
            "metadata": {"task_id": str(task_id)},
        }).execute()
    
    return {"success": True, "task_id": str(task_id), "status": "completed"}


@router.post("/{task_id}/snooze")
async def snooze_task(
    task_id: UUID,
    hours: int = Query(24, ge=1, le=168),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Snooze task for specified hours."""
    org_id = current_user["org_id"]
    
    existing = supabase.table("tasks").select("id, due_at").eq(
        "id", str(task_id)
    ).eq("org_id", org_id).single().execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_due = datetime.utcnow() + timedelta(hours=hours)
    
    result = supabase.table("tasks").update({
        "due_at": new_due.isoformat(),
        "status": "snoozed",
        "snoozed_until": new_due.isoformat(),
    }).eq("id", str(task_id)).execute()
    
    return {
        "success": True,
        "task_id": str(task_id),
        "new_due_at": new_due.isoformat(),
        "snoozed_hours": hours,
    }


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete a task."""
    org_id = current_user["org_id"]
    
    result = supabase.table("tasks").delete().eq(
        "id", str(task_id)
    ).eq("org_id", org_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return None


# ============================================================================
# BULK OPERATIONS
# ============================================================================

@router.post("/bulk/complete")
async def complete_tasks_bulk(
    task_ids: List[UUID],
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mark multiple tasks as completed."""
    org_id = current_user["org_id"]
    
    if len(task_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 tasks per request")
    
    result = supabase.table("tasks").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
    }).in_("id", [str(id) for id in task_ids]).eq("org_id", org_id).execute()
    
    return {"completed": len(result.data)}


@router.post("/quick")
async def create_quick_followup(
    contact_id: UUID,
    title: str = Query(..., min_length=1),
    days: int = Query(1, ge=1, le=30),
    type: TaskType = Query(TaskType.FOLLOWUP),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Quick create a follow-up task for a contact."""
    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]
    
    # Verify contact exists
    contact = supabase.table("contacts").select("id, name").eq(
        "id", str(contact_id)
    ).eq("org_id", org_id).single().execute()
    
    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    due_at = datetime.utcnow() + timedelta(days=days)
    
    result = supabase.table("tasks").insert({
        "org_id": org_id,
        "contact_id": str(contact_id),
        "assigned_to": user_id,
        "created_by": user_id,
        "type": type.value,
        "title": title,
        "priority": "normal",
        "due_at": due_at.isoformat(),
        "status": "pending",
    }).execute()
    
    # Update contact's next_followup_at
    supabase.table("contacts").update({
        "next_followup_at": due_at.isoformat()
    }).eq("id", str(contact_id)).execute()
    
    return {
        "success": True,
        "task": Task(**result.data[0]),
        "contact_name": contact.data["name"],
    }
