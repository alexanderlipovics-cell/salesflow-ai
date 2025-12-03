"""
Demo Analytics Endpoints - No Auth, No Database
Returns mock data for testing
"""
from fastapi import APIRouter
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
import random

router = APIRouter(
    prefix="/api/analytics/dashboard",
    tags=["Analytics Dashboard Demo"],
)


# Response Models
class TodayOverview(BaseModel):
    open_tasks: int
    overdue_tasks: int
    completed_today: int
    contacts_today: int
    hot_leads: int
    streak_active: bool
    streak_days: int


class TodayTask(BaseModel):
    task_id: str
    task_type: str
    contact_name: str
    due_at: str
    priority_score: int
    last_contact: str | None


class WeekOverview(BaseModel):
    total_contacts: int
    new_leads: int
    conversions: int
    conversion_rate: float
    avg_response_time_hours: float
    top_channel: str


class WeekTimeseries(BaseModel):
    date: str
    contacts: int
    conversions: int
    response_rate: float


@router.get("/today/overview")
async def get_today_overview():
    """Demo: Today's overview"""
    return TodayOverview(
        open_tasks=12,
        overdue_tasks=3,
        completed_today=8,
        contacts_today=15,
        hot_leads=5,
        streak_active=True,
        streak_days=7,
    )


@router.get("/today/tasks", response_model=List[TodayTask])
async def get_today_tasks():
    """Demo: Today's tasks"""
    return [
        TodayTask(
            task_id="task_1",
            task_type="follow_up",
            contact_name="Max Mustermann",
            due_at=datetime.now().isoformat(),
            priority_score=95,
            last_contact=(datetime.now() - timedelta(days=2)).isoformat(),
        ),
        TodayTask(
            task_id="task_2",
            task_type="hunter",
            contact_name="Anna Schmidt",
            due_at=datetime.now().isoformat(),
            priority_score=87,
            last_contact=None,
        ),
    ]


@router.get("/week/overview")
async def get_week_overview():
    """Demo: Week overview"""
    return WeekOverview(
        total_contacts=156,
        new_leads=42,
        conversions=18,
        conversion_rate=11.5,
        avg_response_time_hours=2.3,
        top_channel="WhatsApp",
    )


@router.get("/week/timeseries", response_model=List[WeekTimeseries])
async def get_week_timeseries():
    """Demo: Week timeseries data"""
    result = []
    for i in range(7):
        date = datetime.now() - timedelta(days=6 - i)
        result.append(
            WeekTimeseries(
                date=date.strftime("%Y-%m-%d"),
                contacts=random.randint(15, 35),
                conversions=random.randint(1, 5),
                response_rate=random.uniform(0.15, 0.35),
            )
        )
    return result


@router.get("/complete")
async def get_complete_dashboard():
    """Demo: Complete dashboard data"""
    return {
        "today_overview": {
            "open_tasks": 12,
            "overdue_tasks": 3,
            "completed_today": 8,
            "contacts_today": 15,
            "hot_leads": 5,
            "streak_active": True,
            "streak_days": 7,
        },
        "week_overview": {
            "total_contacts": 156,
            "new_leads": 42,
            "conversions": 18,
            "conversion_rate": 11.5,
            "avg_response_time_hours": 2.3,
            "top_channel": "WhatsApp",
        },
        "week_timeseries": [
            {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), 
             "contacts": random.randint(15, 35),
             "conversions": random.randint(1, 5),
             "response_rate": random.uniform(0.15, 0.35)}
            for i in range(7)
        ],
        "top_templates": [
            {"template_id": "tpl_1", "template_name": "Warm Intro", "usage_30d": 42},
            {"template_id": "tpl_2", "template_name": "Value First", "usage_30d": 38},
        ],
    }


@router.get("/health")
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "service": "analytics-dashboard-demo",
        "timestamp": datetime.utcnow().isoformat(),
    }

