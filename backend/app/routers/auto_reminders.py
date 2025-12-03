"""
Auto-Reminder Router

Provides API endpoints for managing automatic reminder triggers.

Features:
- Get pending reminders
- Mark reminders as completed
- Manually trigger reminder checks
- Manage reminder rules
- Get reminder statistics

Author: Sales Flow AI Team
Created: 2025-12-01
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from ..core.auth import get_current_user, get_current_workspace
from ..core.database import get_supabase

router = APIRouter(prefix="/api/auto-reminders", tags=["auto-reminders"])


# ============================================================================
# MODELS
# ============================================================================

class ReminderRule(BaseModel):
    """Reminder rule configuration"""
    id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    trigger_condition: str = Field(..., description="Condition that triggers reminder")
    days_after: int = Field(..., ge=0, le=365, description="Days after condition before reminder")
    priority: str = Field(..., pattern="^(low|medium|high|urgent)$")
    task_title_template: str = Field(..., min_length=1)
    task_description_template: Optional[str] = None
    is_active: bool = True


class PendingReminder(BaseModel):
    """Pending reminder information"""
    reminder_id: UUID
    lead_id: UUID
    lead_name: Optional[str]
    lead_status: Optional[str]
    task_id: Optional[UUID]
    task_title: Optional[str]
    task_priority: Optional[str]
    trigger_condition: str
    triggered_at: datetime
    due_date: Optional[datetime]
    days_overdue: int


class ReminderStats(BaseModel):
    """Reminder statistics"""
    total_active: int
    total_overdue: int
    by_priority: dict[str, int]
    by_condition: dict[str, int]
    avg_response_time_hours: Optional[float]


class ManualTriggerRequest(BaseModel):
    """Request to manually trigger reminder check"""
    lead_id: UUID


class ManualTriggerResponse(BaseModel):
    """Response from manual reminder trigger"""
    reminder_created: bool
    reminder_id: Optional[UUID]
    trigger_condition: Optional[str]
    task_id: Optional[UUID]
    message: str


class MarkCompletedRequest(BaseModel):
    """Request to mark reminder as completed"""
    reminder_id: UUID


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/pending", response_model=List[PendingReminder])
async def get_pending_reminders(
    limit: int = 50,
    workspace_id: UUID = Depends(get_current_workspace),
    supabase = Depends(get_supabase)
):
    """
    Get all pending reminders for the current workspace.
    
    Returns reminders sorted by due date and priority.
    """
    try:
        result = supabase.rpc(
            "get_pending_reminders",
            {
                "p_workspace_id": str(workspace_id),
                "p_limit": limit
            }
        ).execute()

        if result.data is None:
            return []

        return [PendingReminder(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending reminders: {str(e)}"
        )


@router.post("/check/{lead_id}", response_model=ManualTriggerResponse)
async def manually_trigger_reminder_check(
    lead_id: UUID,
    workspace_id: UUID = Depends(get_current_workspace),
    supabase = Depends(get_supabase)
):
    """
    Manually trigger a reminder check for a specific lead.
    
    Useful for testing or when you want to force a reminder check
    outside of the automatic trigger.
    """
    try:
        # Verify lead belongs to workspace
        lead_check = supabase.table("leads").select("id").eq(
            "id", str(lead_id)
        ).eq(
            "workspace_id", str(workspace_id)
        ).execute()

        if not lead_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found or does not belong to your workspace"
            )

        # Trigger reminder check
        result = supabase.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": str(lead_id),
                "p_workspace_id": str(workspace_id)
            }
        ).execute()

        if not result.data or len(result.data) == 0:
            return ManualTriggerResponse(
                reminder_created=False,
                message="No reminder conditions met for this lead"
            )

        reminder_data = result.data[0]
        
        if reminder_data["reminder_created"]:
            return ManualTriggerResponse(
                reminder_created=True,
                reminder_id=reminder_data["reminder_id"],
                trigger_condition=reminder_data["trigger_condition"],
                task_id=reminder_data["task_id"],
                message=f"Reminder created: {reminder_data['trigger_condition']}"
            )
        else:
            return ManualTriggerResponse(
                reminder_created=False,
                message="Reminder already exists or conditions not met"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger reminder check: {str(e)}"
        )


@router.post("/complete", status_code=status.HTTP_200_OK)
async def mark_reminder_completed(
    request: MarkCompletedRequest,
    workspace_id: UUID = Depends(get_current_workspace),
    supabase = Depends(get_supabase)
):
    """
    Mark a reminder as completed.
    
    This is typically called automatically when the associated task is completed,
    but can also be called manually.
    """
    try:
        # Verify reminder belongs to workspace
        reminder_check = supabase.table("auto_reminders").select(
            "id, lead_id"
        ).eq(
            "id", str(request.reminder_id)
        ).execute()

        if not reminder_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found"
            )

        # Verify lead belongs to workspace
        lead_id = reminder_check.data[0]["lead_id"]
        lead_check = supabase.table("leads").select("id").eq(
            "id", lead_id
        ).eq(
            "workspace_id", str(workspace_id)
        ).execute()

        if not lead_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this reminder"
            )

        # Mark as completed
        result = supabase.rpc(
            "mark_reminder_completed",
            {"p_reminder_id": str(request.reminder_id)}
        ).execute()

        if not result.data or not result.data[0]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found or already completed"
            )

        return {"success": True, "message": "Reminder marked as completed"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark reminder as completed: {str(e)}"
        )


@router.get("/stats", response_model=ReminderStats)
async def get_reminder_stats(
    workspace_id: UUID = Depends(get_current_workspace),
    supabase = Depends(get_supabase)
):
    """
    Get statistics about reminders for the current workspace.
    
    Returns counts by priority, condition, and average response time.
    """
    try:
        # Get all active reminders with details
        result = supabase.rpc(
            "get_pending_reminders",
            {
                "p_workspace_id": str(workspace_id),
                "p_limit": 1000
            }
        ).execute()

        if not result.data:
            return ReminderStats(
                total_active=0,
                total_overdue=0,
                by_priority={},
                by_condition={},
                avg_response_time_hours=None
            )

        reminders = result.data
        
        # Calculate stats
        total_active = len(reminders)
        total_overdue = sum(1 for r in reminders if r["days_overdue"] > 0)
        
        by_priority = {}
        by_condition = {}
        
        for reminder in reminders:
            # Count by priority
            priority = reminder.get("task_priority", "medium")
            by_priority[priority] = by_priority.get(priority, 0) + 1
            
            # Count by condition
            condition = reminder.get("trigger_condition", "unknown")
            by_condition[condition] = by_condition.get(condition, 0) + 1

        # Calculate average response time (for completed reminders)
        completed_reminders = supabase.table("auto_reminders").select(
            "triggered_at, completed_at"
        ).eq(
            "is_active", False
        ).not_.is_(
            "completed_at", "null"
        ).limit(100).execute()

        avg_response_time_hours = None
        if completed_reminders.data:
            total_hours = 0
            count = 0
            for reminder in completed_reminders.data:
                triggered = datetime.fromisoformat(reminder["triggered_at"].replace("Z", "+00:00"))
                completed = datetime.fromisoformat(reminder["completed_at"].replace("Z", "+00:00"))
                hours = (completed - triggered).total_seconds() / 3600
                total_hours += hours
                count += 1
            
            if count > 0:
                avg_response_time_hours = round(total_hours / count, 2)

        return ReminderStats(
            total_active=total_active,
            total_overdue=total_overdue,
            by_priority=by_priority,
            by_condition=by_condition,
            avg_response_time_hours=avg_response_time_hours
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reminder stats: {str(e)}"
        )


@router.get("/rules", response_model=List[ReminderRule])
async def get_reminder_rules(
    active_only: bool = True,
    supabase = Depends(get_supabase)
):
    """
    Get all reminder rules.
    
    By default, only returns active rules.
    """
    try:
        query = supabase.table("reminder_rules").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
        
        result = query.order("priority.desc", "days_after.asc").execute()

        if not result.data:
            return []

        return [ReminderRule(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reminder rules: {str(e)}"
        )


@router.post("/rules", response_model=ReminderRule, status_code=status.HTTP_201_CREATED)
async def create_reminder_rule(
    rule: ReminderRule,
    workspace_id: UUID = Depends(get_current_workspace),
    user_id: UUID = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Create a new reminder rule.
    
    Requires admin permissions.
    """
    try:
        # Verify user is admin
        user_check = supabase.table("workspace_users").select("role").eq(
            "user_id", str(user_id)
        ).eq(
            "workspace_id", str(workspace_id)
        ).execute()

        if not user_check.data or user_check.data[0]["role"] not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create reminder rules"
            )

        # Create rule
        rule_data = rule.dict(exclude={"id"}, exclude_none=True)
        
        result = supabase.table("reminder_rules").insert(rule_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create reminder rule"
            )

        return ReminderRule(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create reminder rule: {str(e)}"
        )


@router.put("/rules/{rule_id}", response_model=ReminderRule)
async def update_reminder_rule(
    rule_id: UUID,
    rule: ReminderRule,
    workspace_id: UUID = Depends(get_current_workspace),
    user_id: UUID = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Update an existing reminder rule.
    
    Requires admin permissions.
    """
    try:
        # Verify user is admin
        user_check = supabase.table("workspace_users").select("role").eq(
            "user_id", str(user_id)
        ).eq(
            "workspace_id", str(workspace_id)
        ).execute()

        if not user_check.data or user_check.data[0]["role"] not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update reminder rules"
            )

        # Update rule
        rule_data = rule.dict(exclude={"id"}, exclude_none=True)
        rule_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("reminder_rules").update(rule_data).eq(
            "id", str(rule_id)
        ).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder rule not found"
            )

        return ReminderRule(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update reminder rule: {str(e)}"
        )


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder_rule(
    rule_id: UUID,
    workspace_id: UUID = Depends(get_current_workspace),
    user_id: UUID = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Delete (deactivate) a reminder rule.
    
    Requires admin permissions.
    Rules are soft-deleted (is_active = false) to preserve history.
    """
    try:
        # Verify user is admin
        user_check = supabase.table("workspace_users").select("role").eq(
            "user_id", str(user_id)
        ).eq(
            "workspace_id", str(workspace_id)
        ).execute()

        if not user_check.data or user_check.data[0]["role"] not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete reminder rules"
            )

        # Soft delete (deactivate)
        result = supabase.table("reminder_rules").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", str(rule_id)).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder rule not found"
            )

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete reminder rule: {str(e)}"
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for auto-reminder system"""
    return {
        "status": "healthy",
        "service": "auto-reminders",
        "version": "1.0.0"
    }

