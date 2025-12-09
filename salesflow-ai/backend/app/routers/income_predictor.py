from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import get_current_user
from ..core.deps import get_supabase

router = APIRouter(prefix="/income-predictor", tags=["income-predictor"])


class Recommendation(BaseModel):
    type: str
    message: str
    impact: str
    potential_increase: Optional[float] = None


class PredictionResult(BaseModel):
    current_monthly_income: float
    predicted_30_days: float
    predicted_60_days: float
    predicted_90_days: float

    contacts_per_day: float
    conversion_rate: float
    avg_deal_value: float

    recommendations: List[Recommendation]
    confidence: float


class Scenario(BaseModel):
    name: str
    contacts_day: float
    conversion: float
    monthly: float
    yearly: float


@router.get("/predict", response_model=PredictionResult)
async def predict_income(current_user=Depends(get_current_user)):
    """Predict future income based on current activity."""
    supabase = get_supabase()

    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()

    leads = (
        supabase.table("leads")
        .select("id, created_at, temperature, deal_value")
        .eq("user_id", str(current_user["id"]))
        .gte("created_at", thirty_days_ago)
        .execute()
    )

    leads_data = leads.data or []
    total_leads = len(leads_data)

    income = (
        supabase.table("finance_transactions")
        .select("amount")
        .eq("user_id", str(current_user["id"]))
        .eq("tx_type", "income")
        .gte("date", thirty_days_ago)
        .execute()
    )

    income_data = income.data or []
    total_income = sum(float(t["amount"]) for t in income_data)

    days_active = 30
    contacts_per_day = total_leads / days_active if days_active > 0 else 0

    hot_leads = len([l for l in leads_data if l.get("temperature") == "hot"])
    deals_closed = len(income_data)

    if total_leads > 0 and deals_closed > 0:
        conversion_rate = (deals_closed / total_leads) * 100
    elif total_leads > 0:
        conversion_rate = 5
    else:
        conversion_rate = 5

    if deals_closed > 0:
        avg_deal = total_income / deals_closed
    else:
        deal_values = [
            l.get("deal_value") or 0 for l in leads_data if l.get("deal_value")
        ]
        avg_deal = sum(deal_values) / len(deal_values) if deal_values else 150

    daily_potential = contacts_per_day * (conversion_rate / 100) * avg_deal

    predicted_30 = daily_potential * 30
    predicted_60 = daily_potential * 60 * 1.1
    predicted_90 = daily_potential * 90 * 1.2

    recommendations: List[Recommendation] = []

    if contacts_per_day < 5:
        increase = (10 - contacts_per_day) * (conversion_rate / 100) * avg_deal * 30
        recommendations.append(
            Recommendation(
                type="activity",
                message="Erhöhe deine Kontakte auf 10/Tag",
                impact="high",
                potential_increase=increase,
            )
        )
    if 5 <= contacts_per_day < 10:
        increase = (15 - contacts_per_day) * (conversion_rate / 100) * avg_deal * 30
        recommendations.append(
            Recommendation(
                type="activity",
                message="Steigere auf 15 Kontakte/Tag für schnelleres Wachstum",
                impact="medium",
                potential_increase=increase,
            )
        )

    if conversion_rate < 10:
        increase = predicted_30 * 0.5
        recommendations.append(
            Recommendation(
                type="conversion",
                message="Verbessere dein Follow-up – Conversion verdoppeln = Einkommen verdoppeln",
                impact="high",
                potential_increase=increase,
            )
        )

    if avg_deal < 200:
        increase = contacts_per_day * (conversion_rate / 100) * (200 - avg_deal) * 30
        recommendations.append(
            Recommendation(
                type="value",
                message="Fokussiere auf höherwertige Deals (€200+)",
                impact="medium",
                potential_increase=increase,
            )
        )

    if total_leads > 0 and hot_leads < total_leads * 0.2:
        recommendations.append(
            Recommendation(
                type="quality",
                message=f"Nur {int(hot_leads / total_leads * 100)}% Hot Leads – qualifiziere Leads besser",
                impact="medium",
                potential_increase=None,
            )
        )

    if not recommendations:
        recommendations.append(
            Recommendation(
                type="keep_going",
                message="Du bist auf gutem Weg! Bleib dran und halte das Tempo.",
                impact="positive",
                potential_increase=None,
            )
        )

    confidence = min(
        0.95, 0.3 + (total_leads / 100) * 0.3 + (deals_closed / 10) * 0.4
    )
    confidence = max(0.2, confidence)

    return PredictionResult(
        current_monthly_income=round(total_income, 2),
        predicted_30_days=round(predicted_30, 2),
        predicted_60_days=round(predicted_60, 2),
        predicted_90_days=round(predicted_90, 2),
        contacts_per_day=round(contacts_per_day, 1),
        conversion_rate=round(conversion_rate, 1),
        avg_deal_value=round(avg_deal, 2),
        recommendations=recommendations,
        confidence=round(confidence, 2),
    )


@router.get("/scenarios")
async def get_scenarios(current_user=Depends(get_current_user)):
    """Get what-if scenarios for motivation."""
    prediction = await predict_income(current_user)

    base_daily = (
        prediction.contacts_per_day
        * (prediction.conversion_rate / 100)
        * prediction.avg_deal_value
    )

    scenarios = [
        Scenario(
            name="Aktuell",
            contacts_day=prediction.contacts_per_day,
            conversion=prediction.conversion_rate,
            monthly=base_daily * 30,
            yearly=base_daily * 30 * 12,
        ),
        Scenario(
            name="Doppelte Aktivität",
            contacts_day=prediction.contacts_per_day * 2,
            conversion=prediction.conversion_rate,
            monthly=base_daily * 2 * 30,
            yearly=base_daily * 2 * 30 * 12,
        ),
        Scenario(
            name="Bessere Conversion (+50%)",
            contacts_day=prediction.contacts_per_day,
            conversion=min(prediction.conversion_rate * 1.5, 30),
            monthly=base_daily * 1.5 * 30,
            yearly=base_daily * 1.5 * 30 * 12,
        ),
        Scenario(
            name="Power Mode 🔥",
            contacts_day=max(prediction.contacts_per_day * 2, 15),
            conversion=min(prediction.conversion_rate * 1.5, 25),
            monthly=base_daily * 3 * 30,
            yearly=base_daily * 3 * 30 * 12,
        ),
    ]

    return {"scenarios": [s.dict() for s in scenarios]}


@router.get("/history")
async def get_income_history(months: int = 6, current_user=Depends(get_current_user)):
    """Get income history for charts."""
    supabase = get_supabase()

    history = []

    for i in range(months):
        month_start = date.today().replace(day=1) - timedelta(days=30 * i)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(
            days=1
        )

        income = (
            supabase.table("finance_transactions")
            .select("amount")
            .eq("user_id", str(current_user["id"]))
            .eq("tx_type", "income")
            .gte("date", month_start.isoformat())
            .lte("date", month_end.isoformat())
            .execute()
        )

        total = sum(float(t["amount"]) for t in (income.data or []))

        history.append({"month": month_start.strftime("%b %Y"), "income": total})

    history.reverse()
    return {"history": history}

