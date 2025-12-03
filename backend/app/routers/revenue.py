"""
Revenue Router
API endpoints for Revenue Intelligence System
Dashboard, At-Risk Alerts, Forecasting, Predictions
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from supabase import create_client
from services.revenue_engine import revenue_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/revenue", tags=["Revenue Intelligence"])

# Initialize Supabase client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class DealUpdate(BaseModel):
    """Model for updating deal financial data"""
    deal_value: Optional[float] = Field(None, ge=0, description="Deal value")
    expected_close_date: Optional[str] = Field(None, description="Expected close date (ISO format)")
    win_probability: Optional[int] = Field(None, ge=0, le=100, description="Win probability 0-100")
    deal_stage: Optional[str] = Field(None, description="Deal stage")
    currency: Optional[str] = Field(None, description="Currency code (e.g. EUR, USD)")

class ScenarioInput(BaseModel):
    """Model for scenario calculator"""
    win_rate_increase: float = Field(0.0, ge=-1.0, le=1.0, description="Win rate change (-1.0 to +1.0)")
    deal_size_increase: float = Field(0.0, ge=-1.0, le=1.0, description="Deal size change (-1.0 to +1.0)")
    pipeline_growth: float = Field(0.0, ge=-1.0, le=1.0, description="Pipeline growth (-1.0 to +1.0)")

class DealValuePredictionInput(BaseModel):
    """Model for deal value prediction"""
    product_plan: str = Field(..., description="Product plan (Starter, Professional, Enterprise)")
    num_users_planned: int = Field(..., ge=1, description="Number of users planned")
    base_list_price_per_user: float = Field(..., ge=0, description="Base price per user")
    discount_pct: float = Field(0.0, ge=0.0, le=1.0, description="Discount percentage (0-1)")
    billing_cycle: str = Field("annual", description="monthly, quarterly, annual")
    contract_term_months: int = Field(12, ge=1, description="Contract term in months")
    industry: str = Field("default", description="Industry vertical")
    deal_stage: str = Field("discovery", description="Current deal stage")
    similar_closed_deals_avg_acv: float = Field(0, ge=0, description="Historical average ACV")
    expansion_potential_factor: float = Field(1.0, ge=1.0, le=3.0, description="Expansion potential (1-3)")

class CloseProbabilityInput(BaseModel):
    """Model for close probability calculation"""
    deal_stage: str = Field(..., description="Current deal stage")
    days_in_stage: int = Field(0, ge=0, description="Days in current stage")
    lead_score: int = Field(50, ge=0, le=100, description="Lead engagement score")
    num_interactions: int = Field(0, ge=0, description="Number of interactions")
    num_objections_handled: int = Field(0, ge=0, description="Objections handled")
    champion_identified: bool = Field(False, description="Champion identified?")
    budget_confirmed: bool = Field(False, description="Budget confirmed?")
    decision_maker_engaged: bool = Field(False, description="Decision maker engaged?")
    competitors_mentioned: int = Field(0, ge=0, description="Number of competitors")

class ChurnRiskInput(BaseModel):
    """Model for churn risk calculation"""
    account_id: str
    days_since_last_login: int = Field(0, ge=0)
    support_tickets_last_30d: int = Field(0, ge=0)
    usage_trend: str = Field("stable", description="increasing, stable, decreasing")
    payment_issues_count: int = Field(0, ge=0)
    nps_score: int = Field(0, ge=-100, le=100)
    engagement_score: int = Field(50, ge=0, le=100)
    feature_adoption_rate: float = Field(0.5, ge=0.0, le=1.0)

class ExpansionScoreInput(BaseModel):
    """Model for expansion opportunity scoring"""
    account_id: str
    current_mrr: float = Field(..., ge=0)
    current_plan: str
    num_active_users: int = Field(1, ge=1)
    license_utilization_pct: float = Field(0.5, ge=0.0, le=1.0)
    days_as_customer: int = Field(0, ge=0)
    nps_score: int = Field(0, ge=-100, le=100)
    engagement_score: int = Field(50, ge=0, le=100)

# ============================================================================
# MAIN ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_revenue_dashboard():
    """
    Main Revenue Dashboard
    
    Returns:
    - KPIs (total pipeline, weighted forecast, avg deal size)
    - Pipeline by stage
    - Monthly forecast
    - At-risk count
    """
    try:
        logger.info("📊 Fetching revenue dashboard")
        
        # Get pipeline summary
        pipeline = supabase.table('revenue_pipeline_summary').select('*').execute()
        
        # Get monthly forecast
        forecast = supabase.table('revenue_forecast_monthly').select('*').limit(6).execute()
        
        # Calculate KPIs
        total_pipeline = sum(stage.get('total_value', 0) for stage in pipeline.data)
        deal_count = sum(stage.get('count', 0) for stage in pipeline.data)
        avg_deal_size = total_pipeline / deal_count if deal_count > 0 else 0
        
        # Weighted forecast for next 3 months
        weighted_forecast = sum(
            m.get('weighted_forecast', 0) 
            for m in (forecast.data[:3] if forecast.data else [])
        )
        
        # Get at-risk count
        at_risk = supabase.table('at_risk_deals').select('id', count='exact').execute()
        at_risk_count = at_risk.count if hasattr(at_risk, 'count') else 0
        
        return {
            "kpis": {
                "total_pipeline": round(total_pipeline, 2),
                "deal_count": deal_count,
                "avg_deal_size": round(avg_deal_size, 2),
                "weighted_forecast_90d": round(weighted_forecast, 2),
                "at_risk_deals": at_risk_count
            },
            "pipeline_by_stage": pipeline.data,
            "monthly_forecast": forecast.data,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")


@router.get("/alerts/at-risk", response_model=Dict[str, Any])
async def get_at_risk_alerts(
    min_deal_value: float = Query(1000, ge=0, description="Minimum deal value")
):
    """
    Get deals needing immediate attention
    
    Returns deals with health_score < 50 and deal_value >= min_deal_value
    """
    try:
        logger.info(f"⚠️  Fetching at-risk deals (min: {min_deal_value})")
        
        deals = await revenue_engine.get_at_risk_deals(min_deal_value=min_deal_value)
        
        return {
            "count": len(deals),
            "deals": deals,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching at-risk alerts: {e}")
        raise HTTPException(status_code=500, detail=f"At-risk alerts error: {str(e)}")


@router.post("/scenario-calculator", response_model=Dict[str, Any])
async def calculate_scenario(payload: ScenarioInput):
    """
    What-If Scenario Calculator
    
    Input:
    - win_rate_increase: Change in win rate (-100% to +100%)
    - deal_size_increase: Change in avg deal size
    - pipeline_growth: Change in pipeline volume
    
    Returns:
    - Baseline forecast
    - Projected forecast with changes
    - Delta
    """
    try:
        logger.info(f"🔮 Calculating scenario: {payload.dict()}")
        
        # Get current pipeline
        pipeline = supabase.table('revenue_pipeline_summary').select('*').execute()
        current_pipeline = sum(stage.get('total_value', 0) for stage in pipeline.data)
        
        if current_pipeline == 0:
            return {
                "error": "No pipeline data available",
                "baseline": {"pipeline": 0, "forecast": 0},
                "projected": {"pipeline": 0, "forecast": 0},
                "delta": {"value": 0, "percent": 0}
            }
        
        result = revenue_engine.calculate_scenario(
            current_pipeline=current_pipeline,
            inputs=payload.dict()
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error calculating scenario: {e}")
        raise HTTPException(status_code=500, detail=f"Scenario calculation error: {str(e)}")


@router.patch("/deals/{lead_id}", response_model=Dict[str, Any])
async def update_deal(lead_id: str, payload: DealUpdate):
    """
    Update financial data for a deal
    
    Updates deal_value, expected_close_date, win_probability, etc.
    """
    try:
        logger.info(f"💰 Updating deal {lead_id}")
        
        # Build update dict (only include non-None values)
        update_data = {}
        if payload.deal_value is not None:
            update_data['deal_value'] = payload.deal_value
        if payload.expected_close_date:
            update_data['expected_close_date'] = payload.expected_close_date
        if payload.win_probability is not None:
            update_data['win_probability'] = payload.win_probability
        if payload.deal_stage:
            update_data['deal_stage'] = payload.deal_stage
        if payload.currency:
            update_data['currency'] = payload.currency
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        # Update lead
        result = supabase.table('leads').update(update_data).eq('id', lead_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return {
            "status": "updated",
            "deal": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating deal: {e}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


# ============================================================================
# PREDICTION ENDPOINTS (Framework-based)
# ============================================================================

@router.post("/predict/deal-value", response_model=Dict[str, Any])
async def predict_deal_value(payload: DealValuePredictionInput):
    """
    Predict deal value using framework model
    
    Takes product details, pricing, and context to predict expected deal value
    """
    try:
        logger.info("🔮 Predicting deal value")
        
        result = revenue_engine.predict_deal_value(payload.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error predicting deal value: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.post("/predict/close-probability", response_model=Dict[str, Any])
async def predict_close_probability(payload: CloseProbabilityInput):
    """
    Calculate close probability using framework
    
    Analyzes deal stage, engagement, qualification, and competition
    """
    try:
        logger.info("🎯 Calculating close probability")
        
        result = revenue_engine.calculate_close_probability(payload.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error calculating probability: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@router.post("/accounts/churn-risk", response_model=Dict[str, Any])
async def calculate_churn_risk(payload: ChurnRiskInput):
    """
    Calculate churn risk for an account
    
    Analyzes usage, support, payment, and sentiment signals
    """
    try:
        logger.info(f"⚠️  Calculating churn risk for {payload.account_id}")
        
        result = revenue_engine.calculate_churn_risk(payload.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error calculating churn risk: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@router.post("/accounts/expansion-score", response_model=Dict[str, Any])
async def calculate_expansion_score(payload: ExpansionScoreInput):
    """
    Calculate expansion opportunity score for an account
    
    Identifies upsell/cross-sell opportunities and estimates value
    """
    try:
        logger.info(f"📈 Calculating expansion score for {payload.account_id}")
        
        result = revenue_engine.calculate_expansion_score(payload.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error calculating expansion score: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


# ============================================================================
# ANALYTICS & INSIGHTS
# ============================================================================

@router.get("/forecast/monthly", response_model=Dict[str, Any])
async def get_monthly_forecast(
    months: int = Query(6, ge=1, le=12, description="Number of months to forecast")
):
    """
    Get monthly revenue forecast
    
    Returns weighted pipeline forecast by month
    """
    try:
        logger.info(f"📅 Fetching {months}-month forecast")
        
        result = supabase.table('revenue_forecast_monthly').select('*').limit(months).execute()
        
        return {
            "forecast": result.data,
            "period_months": months
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@router.get("/won-deals/summary", response_model=Dict[str, Any])
async def get_won_deals_summary(
    months: int = Query(6, ge=1, le=12, description="Number of months")
):
    """
    Get historical won deals summary
    
    Returns closed won deals by month with revenue and metrics
    """
    try:
        logger.info(f"🏆 Fetching won deals summary ({months} months)")
        
        result = supabase.table('won_deals_summary').select('*').limit(months).execute()
        
        return {
            "summary": result.data,
            "period_months": months
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching won deals: {e}")
        raise HTTPException(status_code=500, detail=f"Summary error: {str(e)}")


@router.get("/health-check", response_model=Dict[str, Any])
async def health_check():
    """
    Health check for Revenue Intelligence System
    
    Verifies database views and framework availability
    """
    try:
        # Check views
        pipeline = supabase.table('revenue_pipeline_summary').select('count', count='exact').execute()
        forecast = supabase.table('revenue_forecast_monthly').select('count', count='exact').execute()
        at_risk = supabase.table('at_risk_deals').select('count', count='exact').execute()
        
        # Check framework
        framework_loaded = len(revenue_engine.framework) > 0
        
        return {
            "status": "healthy",
            "views": {
                "pipeline_summary": "available",
                "monthly_forecast": "available",
                "at_risk_deals": "available"
            },
            "framework": "loaded" if framework_loaded else "missing",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

