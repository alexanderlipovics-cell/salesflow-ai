"""
Sales Flow AI - Deals Router

Pipeline management with stages, values, and forecasting
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.crm import (
    Deal,
    DealCreate,
    DealUpdate,
    DealListItem,
    DealsResponse,
    DealStage,
)

router = APIRouter(prefix="/deals", tags=["Deals"])


# ============================================================================
# LIST & SEARCH
# ============================================================================


@router.get("", response_model=DealsResponse)
async def list_deals(
    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    # Filters
    search: Optional[str] = None,
    stage: Optional[List[DealStage]] = Query(None),
    pipeline: Optional[str] = None,
    owner_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    closing_this_month: Optional[bool] = None,
    open_only: bool = True,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """List deals with filtering and pagination."""

    org_id = current_user["org_id"]

    query = supabase.table("deals").select(
        "id, title, value, stage, probability, weighted_value, expected_close_date, "
        "contact_id, owner_id, stage_entered_at, closed_at",
        count="exact",
    ).eq("org_id", org_id)

    # Only open deals by default
    if open_only:
        query = query.is_("closed_at", "null")

    if search:
        query = query.ilike("title", f"%{search}%")

    if stage:
        query = query.in_("stage", [s.value for s in stage])

    if pipeline:
        query = query.eq("pipeline", pipeline)

    if owner_id:
        query = query.eq("owner_id", str(owner_id))

    if contact_id:
        query = query.eq("contact_id", str(contact_id))

    if min_value is not None:
        query = query.gte("value", min_value)

    if max_value is not None:
        query = query.lte("value", max_value)

    if closing_this_month:
        today = date.today()
        first = today.replace(day=1)
        if today.month == 12:
            last = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            last = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

        query = query.gte("expected_close_date", first.isoformat())
        query = query.lte("expected_close_date", last.isoformat())

    query = query.order(sort_by, desc=(sort_order == "desc"))

    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()

    total = result.count or 0
    pages = (total + per_page - 1) // per_page if total > 0 else 0

    # Get contact names
    contact_ids = [d["contact_id"] for d in result.data if d.get("contact_id")]
    contact_names = {}
    if contact_ids:
        contacts = (
            supabase.table("contacts")
            .select("id, name")
            .in_("id", contact_ids)
            .execute()
        )
        contact_names = {c["id"]: c["name"] for c in contacts.data}

    items = []
    for deal in result.data:
        deal["contact_name"] = contact_names.get(deal.get("contact_id"))
        items.append(DealListItem(**deal))

    return DealsResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/pipeline")
async def get_pipeline_view(
    pipeline: str = Query("default"),
    owner_id: Optional[UUID] = None,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get deals grouped by stage for Kanban board."""

    org_id = current_user["org_id"]

    query = (
        supabase.table("deals")
        .select(
            "id, title, value, stage, probability, weighted_value, expected_close_date, "
            "contact_id, owner_id, stage_entered_at, notes"
        )
        .eq("org_id", org_id)
        .eq("pipeline", pipeline)
        .is_("closed_at", "null")
    )

    if owner_id:
        query = query.eq("owner_id", str(owner_id))

    result = query.order("stage_entered_at").execute()

    # Get contact names
    contact_ids = list(
        set(d["contact_id"] for d in result.data if d.get("contact_id"))
    )
    contact_names = {}
    if contact_ids:
        contacts = (
            supabase.table("contacts")
            .select("id, name, company")
            .in_("id", contact_ids)
            .execute()
        )
        contact_names = {
            c["id"]: {"name": c["name"], "company": c.get("company")} for c in contacts.data
        }

    # Define stage order
    stage_order = ["new", "qualified", "meeting", "proposal", "negotiation"]
    stages = {stage: [] for stage in stage_order}

    for deal in result.data:
        stage = deal["stage"]
        if stage in stages:
            contact_info = contact_names.get(deal.get("contact_id"), {})
            deal["contact_name"] = contact_info.get("name")
            deal["contact_company"] = contact_info.get("company")
            stages[stage].append(deal)

    # Calculate totals
    totals = {
        "total_value": sum(float(d["value"]) for d in result.data),
        "weighted_value": sum(float(d["weighted_value"]) for d in result.data),
        "deal_count": len(result.data),
    }

    stage_totals = {}
    for stage, deals in stages.items():
        stage_totals[stage] = {
            "count": len(deals),
            "value": sum(float(d["value"]) for d in deals),
            "weighted": sum(float(d["weighted_value"]) for d in deals),
        }

    return {
        "pipeline": pipeline,
        "stages": stages,
        "stage_order": stage_order,
        "stage_totals": stage_totals,
        "totals": totals,
    }


@router.get("/forecast")
async def get_forecast(
    months: int = Query(3, ge=1, le=12),
    pipeline: str = Query("default"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get deal forecast for upcoming months."""

    org_id = current_user["org_id"]

    today = date.today()
    end_date = today + timedelta(days=months * 30)

    result = (
        supabase.table("deals")
        .select(
            "id, title, value, weighted_value, expected_close_date, stage, probability"
        )
        .eq("org_id", org_id)
        .eq("pipeline", pipeline)
        .is_("closed_at", "null")
        .gte("expected_close_date", today.isoformat())
        .lte("expected_close_date", end_date.isoformat())
        .execute()
    )

    # Group by month
    forecast = {}
    for deal in result.data:
        if deal.get("expected_close_date"):
            month_key = deal["expected_close_date"][:7]  # YYYY-MM
            if month_key not in forecast:
                forecast[month_key] = {
                    "month": month_key,
                    "deals": [],
                    "total_value": 0,
                    "weighted_value": 0,
                    "count": 0,
                }
            forecast[month_key]["deals"].append(deal)
            forecast[month_key]["total_value"] += float(deal["value"])
            forecast[month_key]["weighted_value"] += float(deal["weighted_value"])
            forecast[month_key]["count"] += 1

    # Sort by month
    sorted_forecast = sorted(forecast.values(), key=lambda x: x["month"])

    return {
        "forecast": sorted_forecast,
        "summary": {
            "total_deals": len(result.data),
            "total_value": sum(float(d["value"]) for d in result.data),
            "weighted_value": sum(float(d["weighted_value"]) for d in result.data),
        },
    }


# ============================================================================
# CRUD
# ============================================================================


@router.post("", response_model=Deal, status_code=status.HTTP_201_CREATED)
async def create_deal(
    deal: DealCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create a new deal."""

    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    data = deal.model_dump(exclude_none=True)
    data["org_id"] = org_id
    data["created_by"] = user_id
    data["owner_id"] = str(data.get("owner_id") or user_id)

    # Convert types
    if "stage" in data:
        data["stage"] = data["stage"].value if hasattr(data["stage"], "value") else data["stage"]
    if "value" in data:
        data["value"] = float(data["value"])
    if "recurring_value" in data and data["recurring_value"]:
        data["recurring_value"] = float(data["recurring_value"])
    if "contact_id" in data and data["contact_id"]:
        data["contact_id"] = str(data["contact_id"])
    if "expected_close_date" in data and data["expected_close_date"]:
        data["expected_close_date"] = data["expected_close_date"].isoformat()

    result = supabase.table("deals").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create deal")

    # Log activity if contact linked
    if data.get("contact_id"):
        supabase.table("activities").insert(
            {
                "org_id": org_id,
                "contact_id": data["contact_id"],
                "deal_id": result.data[0]["id"],
                "user_id": user_id,
                "type": "stage_change",
                "metadata": {"to": data.get("stage", "new"), "action": "deal_created"},
            }
        ).execute()

    return Deal(**result.data[0])


@router.get("/{deal_id}", response_model=Deal)
async def get_deal(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get a single deal."""

    org_id = current_user["org_id"]

    result = (
        supabase.table("deals")
        .select("*")
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    return Deal(**result.data)


@router.patch("/{deal_id}", response_model=Deal)
async def update_deal(
    deal_id: UUID,
    deal: DealUpdate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update a deal."""

    org_id = current_user["org_id"]

    # Check exists
    existing = (
        supabase.table("deals")
        .select("id, stage, contact_id")
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    data = deal.model_dump(exclude_none=True)

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Convert types
    if "stage" in data:
        data["stage"] = data["stage"].value if hasattr(data["stage"], "value") else data["stage"]
    if "value" in data:
        data["value"] = float(data["value"])
    if "contact_id" in data and data["contact_id"]:
        data["contact_id"] = str(data["contact_id"])
    if "owner_id" in data and data["owner_id"]:
        data["owner_id"] = str(data["owner_id"])
    if "expected_close_date" in data and data["expected_close_date"]:
        data["expected_close_date"] = data["expected_close_date"].isoformat()

    result = (
        supabase.table("deals")
        .update(data)
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update deal")

    return Deal(**result.data[0])


@router.post("/{deal_id}/move")
async def move_deal_stage(
    deal_id: UUID,
    stage: DealStage,
    lost_reason: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Move deal to a different stage (optimized for drag & drop)."""

    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    existing = (
        supabase.table("deals")
        .select("id, stage, contact_id")
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    old_stage = existing.data["stage"]
    new_stage = stage.value

    update_data = {"stage": new_stage}

    # Handle won/lost
    if new_stage == "won":
        update_data["won"] = True
        update_data["closed_at"] = datetime.utcnow().isoformat()
    elif new_stage == "lost":
        update_data["won"] = False
        update_data["closed_at"] = datetime.utcnow().isoformat()
        if lost_reason:
            update_data["lost_reason"] = lost_reason

    supabase.table("deals").update(update_data).eq("id", str(deal_id)).execute()

    # Optional activity log for moves
    if existing.data.get("contact_id"):
        supabase.table("activities").insert(
            {
                "org_id": org_id,
                "contact_id": existing.data["contact_id"],
                "deal_id": str(deal_id),
                "user_id": user_id,
                "type": "stage_change",
                "metadata": {"from": old_stage, "to": new_stage},
            }
        ).execute()

    return {
        "success": True,
        "deal_id": str(deal_id),
        "from_stage": old_stage,
        "to_stage": new_stage,
    }


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete a deal."""

    org_id = current_user["org_id"]

    result = (
        supabase.table("deals")
        .delete()
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    return None


# ============================================================================
# STATISTICS
# ============================================================================


@router.get("/stats/summary")
async def get_deals_summary(
    pipeline: str = Query("default"),
    period_days: int = Query(30, ge=1, le=365),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Get deal statistics summary."""

    org_id = current_user["org_id"]

    start_date = (datetime.utcnow() - timedelta(days=period_days)).isoformat()

    # Open deals
    open_deals = (
        supabase.table("deals")
        .select("id, value, weighted_value, stage", count="exact")
        .eq("org_id", org_id)
        .eq("pipeline", pipeline)
        .is_("closed_at", "null")
        .execute()
    )

    # Won deals in period
    won_deals = (
        supabase.table("deals")
        .select("id, value", count="exact")
        .eq("org_id", org_id)
        .eq("pipeline", pipeline)
        .eq("won", True)
        .gte("closed_at", start_date)
        .execute()
    )

    # Lost deals in period
    lost_deals = (
        supabase.table("deals")
        .select("id, value", count="exact")
        .eq("org_id", org_id)
        .eq("pipeline", pipeline)
        .eq("won", False)
        .gte("closed_at", start_date)
        .execute()
    )

    open_value = sum(float(d["value"]) for d in open_deals.data)
    weighted_value = sum(float(d["weighted_value"]) for d in open_deals.data)
    won_value = sum(float(d["value"]) for d in won_deals.data)
    lost_value = sum(float(d["value"]) for d in lost_deals.data)

    won_count = won_deals.count or 0
    lost_count = lost_deals.count or 0
    total_closed = won_count + lost_count
    win_rate = (won_count / total_closed * 100) if total_closed > 0 else 0

    return {
        "pipeline": pipeline,
        "period_days": period_days,
        "open": {
            "count": open_deals.count or 0,
            "value": open_value,
            "weighted_value": weighted_value,
        },
        "won": {
            "count": won_count,
            "value": won_value,
        },
        "lost": {
            "count": lost_count,
            "value": lost_value,
        },
        "win_rate": round(win_rate, 1),
        "avg_deal_value": round(won_value / won_count, 2) if won_count > 0 else 0,
    }
"""
Deals router providing CRUD endpoints, filtering and lightweight pipeline data.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.schemas.crm import (
    Deal,
    DealCreate,
    DealFilter,
    DealListItem,
    DealStage,
    DealUpdate,
    DealsResponse,
)

router = APIRouter(prefix="/deals", tags=["Deals"])


# ============================================================================
# HELPERS
# ============================================================================


def _decimal_to_str(value: Decimal | float | int | None) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return str(value)
    return str(Decimal(str(value)))


def _calculate_weighted_value(
    value: Decimal | float | int | None, probability: int | None
) -> str:
    if value is None:
        return "0"
    probability = probability if probability is not None else 0
    percentage = Decimal(probability) / Decimal(100)
    return str((Decimal(str(value)) * percentage).quantize(Decimal("0.01")))


def apply_deal_filters(query, filters: DealFilter):
    if filters.search:
        query = query.or_(
            f"title.ilike.%{filters.search}%,"
            f"description.ilike.%{filters.search}%,"
            f"notes.ilike.%{filters.search}%"
        )

    if filters.stage:
        query = query.in_("stage", [stage.value for stage in filters.stage])

    if filters.pipeline:
        query = query.eq("pipeline", filters.pipeline)

    if filters.owner_id:
        query = query.eq("owner_id", str(filters.owner_id))

    if filters.contact_id:
        query = query.eq("contact_id", str(filters.contact_id))

    if filters.min_value is not None:
        query = query.gte("value", _decimal_to_str(filters.min_value))

    if filters.max_value is not None:
        query = query.lte("value", _decimal_to_str(filters.max_value))

    if filters.closing_this_month:
        now = datetime.utcnow()
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (start + timedelta(days=32)).replace(day=1)
        query = query.gte("expected_close_date", start.date().isoformat())
        query = query.lt("expected_close_date", next_month.date().isoformat())

    if filters.created_after:
        query = query.gte("created_at", filters.created_after.isoformat())

    return query


def _enrich_with_contact_names(
    supabase: Client, deals: List[dict]
) -> List[dict]:
    contact_ids = {
        item.get("contact_id")
        for item in deals
        if item.get("contact_id")
    }

    if not contact_ids:
        return deals

    response = (
        supabase.table("contacts")
        .select("id, name")
        .in_("id", list(contact_ids))
        .execute()
    )

    name_map = {
        row["id"]: row.get("name")
        for row in (response.data or [])
    }

    for item in deals:
        contact_id = item.get("contact_id")
        if contact_id and contact_id in name_map:
            item["contact_name"] = name_map[contact_id]

    return deals


# ============================================================================
# ROUTES
# ============================================================================


@router.get("", response_model=DealsResponse)
async def list_deals(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query(
        "created_at",
        regex="^(created_at|updated_at|value|stage|probability|expected_close_date|stage_entered_at)$",
    ),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    search: Optional[str] = None,
    stage: Optional[List[DealStage]] = Query(None),
    pipeline: Optional[str] = None,
    owner_id: Optional[UUID] = None,
    contact_id: Optional[UUID] = None,
    min_value: Optional[Decimal] = Query(None, ge=0),
    max_value: Optional[Decimal] = Query(None, ge=0),
    closing_this_month: Optional[bool] = None,
    created_after: Optional[datetime] = None,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """List deals with filters and pagination."""

    org_id = current_user["org_id"]
    filters = DealFilter(
        search=search,
        stage=stage,
        pipeline=pipeline,
        owner_id=owner_id,
        contact_id=contact_id,
        min_value=min_value,
        max_value=max_value,
        closing_this_month=closing_this_month,
        created_after=created_after,
    )

    query = (
        supabase.table("deals")
        .select("*", count="exact")
        .eq("org_id", org_id)
    )

    query = apply_deal_filters(query, filters)
    query = query.order(sort_by, desc=(sort_order == "desc"))

    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()
    total = result.count or 0
    pages = (total + per_page - 1) // per_page
    data = _enrich_with_contact_names(supabase, result.data or [])

    return DealsResponse(
        items=[DealListItem(**item) for item in data],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("", response_model=Deal, status_code=status.HTTP_201_CREATED)
async def create_deal(
    deal: DealCreate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create a new deal."""

    org_id = current_user["org_id"]
    user_id = current_user["team_member_id"]

    data = deal.model_dump(exclude_none=True)
    data["org_id"] = org_id
    data["created_by"] = user_id
    data["stage_entered_at"] = datetime.utcnow().isoformat()
    data["weighted_value"] = _calculate_weighted_value(
        data.get("value"), data.get("probability")
    )

    if "stage" in data and hasattr(data["stage"], "value"):
        data["stage"] = data["stage"].value

    if "contact_id" in data and data["contact_id"]:
        data["contact_id"] = str(data["contact_id"])

    if "owner_id" in data and data["owner_id"]:
        data["owner_id"] = str(data["owner_id"])

    for field in ["value", "recurring_value"]:
        if field in data:
            data[field] = _decimal_to_str(data[field])

    if data.get("expected_close_date"):
        data["expected_close_date"] = data["expected_close_date"].isoformat()

    result = supabase.table("deals").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create deal")

    return Deal(**result.data[0])


@router.get("/{deal_id}", response_model=Deal)
async def get_deal(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Fetch a single deal by ID."""

    org_id = current_user["org_id"]
    result = (
        supabase.table("deals")
        .select("*")
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    return Deal(**result.data)


@router.patch("/{deal_id}", response_model=Deal)
async def update_deal(
    deal_id: UUID,
    deal: DealUpdate,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update deal fields."""

    org_id = current_user["org_id"]

    existing = (
        supabase.table("deals")
        .select("stage, value, probability")
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    data = deal.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    previous_stage = existing.data.get("stage")

    if "stage" in data and data["stage"]:
        data["stage"] = data["stage"].value if hasattr(data["stage"], "value") else data["stage"]
        if data["stage"] != previous_stage:
            data["stage_entered_at"] = datetime.utcnow().isoformat()

    for key in ["contact_id", "owner_id"]:
        if key in data and data[key]:
            data[key] = str(data[key])

    for field in ["value", "recurring_value"]:
        if field in data:
            data[field] = _decimal_to_str(data[field])

    if data.get("expected_close_date"):
        data["expected_close_date"] = data["expected_close_date"].isoformat()

    if "probability" in data or "value" in data:
        current_value = data.get("value", existing.data.get("value"))
        current_probability = data.get("probability", existing.data.get("probability"))
        data["weighted_value"] = _calculate_weighted_value(current_value, current_probability)

    data["updated_at"] = datetime.utcnow().isoformat()

    result = (
        supabase.table("deals")
        .update(data)
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update deal")

    return Deal(**result.data[0])


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Delete a deal."""

    org_id = current_user["org_id"]

    result = (
        supabase.table("deals")
        .delete()
        .eq("id", str(deal_id))
        .eq("org_id", org_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    return None

