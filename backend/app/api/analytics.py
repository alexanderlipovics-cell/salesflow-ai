"""
Legacy Analytics Endpoints
Compatible with frontend analyticsApi.ts
"""
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/analytics",
    tags=["Legacy Analytics"],
)


# Response Models
class TemplatePartnerStat(BaseModel):
    template_id: str
    template_name: str
    partner_conversions_30d: int


class CompanyFunnelSpeed(BaseModel):
    company_id: str | None
    company_name: str
    leads_with_partner: int
    avg_days_to_partner: float
    min_days_to_partner: float
    max_days_to_partner: float


class SegmentPartnerPerformance(BaseModel):
    segment_id: str
    segment_name: str
    leads_in_segment: int
    partner_conversions: int
    partner_conversion_rate_pct: float


class RepLeaderboardEntry(BaseModel):
    user_id: str
    name: str
    current_streak: int
    contacts_30d: int
    conversions_30d: int
    conversion_rate_30d_pct: float


class TodayCockpitItem(BaseModel):
    contact_id: str
    contact_name: str | None
    next_action_type: str | None
    next_action_at: str
    last_contact_at: str | None
    status: str
    lead_score: int


@router.get("/templates/top-partner", response_model=List[TemplatePartnerStat])
async def get_top_templates():
    """Demo data for top templates"""
    return [
        {
            "template_id": "tpl_1",
            "template_name": "Warm Intro Follow-up",
            "partner_conversions_30d": 24,
        },
        {
            "template_id": "tpl_2",
            "template_name": "Value-First Approach",
            "partner_conversions_30d": 18,
        },
        {
            "template_id": "tpl_3",
            "template_name": "Event Invitation",
            "partner_conversions_30d": 15,
        },
    ]


@router.get("/companies/funnel-speed", response_model=List[CompanyFunnelSpeed])
async def get_funnel_speed():
    """Demo data for funnel speed"""
    return [
        {
            "company_id": "comp_1",
            "company_name": "Network Pro GmbH",
            "leads_with_partner": 45,
            "avg_days_to_partner": 21.5,
            "min_days_to_partner": 7.0,
            "max_days_to_partner": 45.0,
        },
        {
            "company_id": "comp_2",
            "company_name": "Immo Success AG",
            "leads_with_partner": 32,
            "avg_days_to_partner": 35.2,
            "min_days_to_partner": 14.0,
            "max_days_to_partner": 60.0,
        },
    ]


@router.get("/segments/partner-performance", response_model=List[SegmentPartnerPerformance])
async def get_segment_performance():
    """Demo data for segment performance"""
    return [
        {
            "segment_id": "seg_warm",
            "segment_name": "Warm Leads",
            "leads_in_segment": 120,
            "partner_conversions": 35,
            "partner_conversion_rate_pct": 29.2,
        },
        {
            "segment_id": "seg_cold",
            "segment_name": "Cold Outreach",
            "leads_in_segment": 250,
            "partner_conversions": 18,
            "partner_conversion_rate_pct": 7.2,
        },
        {
            "segment_id": "seg_referral",
            "segment_name": "Referrals",
            "leads_in_segment": 80,
            "partner_conversions": 42,
            "partner_conversion_rate_pct": 52.5,
        },
    ]


@router.get("/reps/leaderboard", response_model=List[RepLeaderboardEntry])
async def get_rep_leaderboard():
    """Demo data for rep leaderboard"""
    return [
        {
            "user_id": "user_1",
            "name": "Sarah Schmidt",
            "current_streak": 12,
            "contacts_30d": 145,
            "conversions_30d": 28,
            "conversion_rate_30d_pct": 19.3,
        },
        {
            "user_id": "user_2",
            "name": "Michael Weber",
            "current_streak": 8,
            "contacts_30d": 132,
            "conversions_30d": 22,
            "conversion_rate_30d_pct": 16.7,
        },
        {
            "user_id": "user_3",
            "name": "Julia Müller",
            "current_streak": 15,
            "contacts_30d": 98,
            "conversions_30d": 31,
            "conversion_rate_30d_pct": 31.6,
        },
    ]


@router.get("/today-cockpit", response_model=List[TodayCockpitItem])
async def get_today_cockpit():
    """Demo data for today cockpit"""
    return [
        {
            "contact_id": "lead_1",
            "contact_name": "Max Mustermann",
            "next_action_type": "follow_up",
            "next_action_at": "2025-11-30T14:00:00Z",
            "last_contact_at": "2025-11-28T10:30:00Z",
            "status": "warm",
            "lead_score": 85,
        },
        {
            "contact_id": "lead_2",
            "contact_name": "Anna Schmidt",
            "next_action_type": "call",
            "next_action_at": "2025-11-30T16:00:00Z",
            "last_contact_at": "2025-11-29T15:00:00Z",
            "status": "hot",
            "lead_score": 92,
        },
    ]
