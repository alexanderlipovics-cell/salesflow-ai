"""
Analytics Router - Team Performance & Metrics
Tracks objection handling, follow-ups, conversions and team performance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from supabase import Client
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# Initialize Supabase client
try:
    supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
except Exception as e:
    logger.warning(f"Supabase not configured: {repr(e)}")
    supabase = None

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class ObjectionStats(BaseModel):
    """Objection handling statistics"""
    total_objections: int
    handled_successfully: int
    success_rate: float
    most_common_objections: List[Dict[str, Any]]
    objections_by_category: Dict[str, int]

class TeamPerformance(BaseModel):
    """Team-wide performance metrics"""
    total_users: int
    active_users_today: int
    total_leads_processed: int
    total_objections_handled: int
    avg_response_time: float
    top_performers: List[Dict[str, Any]]

class UserActivity(BaseModel):
    """Individual user activity"""
    user_id: str
    leads_today: int
    objections_handled: int
    follow_ups_sent: int
    conversion_rate: float
    last_active: datetime

class ConversionMetrics(BaseModel):
    """Conversion funnel metrics"""
    leads_contacted: int
    objections_encountered: int
    objections_resolved: int
    deals_closed: int
    conversion_rate: float
    avg_deal_size: Optional[float]

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/team-performance", response_model=TeamPerformance)
async def get_team_performance(
    days: int = Query(default=7, ge=1, le=90)
):
    """
    Get team-wide performance metrics for the last N days.
    
    Args:
        days: Number of days to analyze (default: 7)
    
    Returns:
        TeamPerformance metrics
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        date_from = datetime.utcnow() - timedelta(days=days)
        
        # Mock data for now - replace with actual queries
        return TeamPerformance(
            total_users=15,
            active_users_today=12,
            total_leads_processed=245,
            total_objections_handled=89,
            avg_response_time=2.5,
            top_performers=[
                {"name": "Max M.", "deals": 23, "conversion_rate": 0.34},
                {"name": "Sarah K.", "deals": 19, "conversion_rate": 0.31},
                {"name": "Tom B.", "deals": 17, "conversion_rate": 0.28}
            ]
        )
    except Exception as e:
        logger.error(f"Error fetching team performance: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team performance")

@router.get("/objection-stats", response_model=ObjectionStats)
async def get_objection_stats(
    days: int = Query(default=30, ge=1, le=365),
    industry: Optional[str] = None
):
    """
    Get objection handling statistics.
    
    Args:
        days: Number of days to analyze
        industry: Filter by industry (optional)
    
    Returns:
        ObjectionStats with handling success rates
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        date_from = datetime.utcnow() - timedelta(days=days)
        
        # Query objection library for statistics
        query = supabase.table('objection_library').select('*')
        
        if industry:
            query = query.contains('industry', [industry])
        
        result = query.execute()
        
        if not result.data:
            return ObjectionStats(
                total_objections=0,
                handled_successfully=0,
                success_rate=0.0,
                most_common_objections=[],
                objections_by_category={}
            )
        
        # Calculate statistics
        objections = result.data
        total = len(objections)
        
        # Group by category
        category_counts = {}
        for obj in objections:
            cat = obj.get('category', 'Unknown')
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Get most common (top 5 by frequency_score)
        sorted_objections = sorted(
            objections,
            key=lambda x: x.get('frequency_score', 0),
            reverse=True
        )[:5]
        
        most_common = [
            {
                "objection": obj.get('objection_text_de', obj.get('objection_text', '')),
                "category": obj['category'],
                "frequency_score": obj.get('frequency_score', 0)
            }
            for obj in sorted_objections
        ]
        
        return ObjectionStats(
            total_objections=total,
            handled_successfully=int(total * 0.78),  # Mock success rate
            success_rate=0.78,
            most_common_objections=most_common,
            objections_by_category=category_counts
        )
        
    except Exception as e:
        logger.error(f"Error fetching objection stats: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch objection statistics")

@router.get("/user-activity/{user_id}", response_model=UserActivity)
async def get_user_activity(user_id: str):
    """
    Get activity metrics for a specific user.
    
    Args:
        user_id: User ID to fetch activity for
    
    Returns:
        UserActivity metrics
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Mock data - replace with actual user activity queries
        return UserActivity(
            user_id=user_id,
            leads_today=23,
            objections_handled=8,
            follow_ups_sent=15,
            conversion_rate=0.32,
            last_active=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Error fetching user activity: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user activity")

@router.get("/conversion-metrics", response_model=ConversionMetrics)
async def get_conversion_metrics(
    days: int = Query(default=30, ge=1, le=365),
    user_id: Optional[str] = None
):
    """
    Get conversion funnel metrics.
    
    Args:
        days: Number of days to analyze
        user_id: Filter by specific user (optional)
    
    Returns:
        ConversionMetrics showing funnel performance
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Mock data - replace with actual conversion tracking
        return ConversionMetrics(
            leads_contacted=450,
            objections_encountered=189,
            objections_resolved=147,
            deals_closed=89,
            conversion_rate=0.198,
            avg_deal_size=2850.00
        )
    except Exception as e:
        logger.error(f"Error fetching conversion metrics: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversion metrics")

@router.get("/objection-trends")
async def get_objection_trends(
    days: int = Query(default=90, ge=7, le=365)
):
    """
    Get objection trends over time.
    
    Args:
        days: Number of days to analyze
    
    Returns:
        Time-series data of objection patterns
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Mock trend data - replace with actual time-series queries
        return {
            "period": f"last_{days}_days",
            "trends": [
                {"date": "2025-11-01", "objections": 45, "success_rate": 0.76},
                {"date": "2025-11-08", "objections": 52, "success_rate": 0.79},
                {"date": "2025-11-15", "objections": 48, "success_rate": 0.81},
                {"date": "2025-11-22", "objections": 55, "success_rate": 0.78},
                {"date": "2025-11-29", "objections": 51, "success_rate": 0.80}
            ],
            "top_rising_objections": [
                {"objection": "Das ist zu teuer", "increase_percent": 15.3},
                {"objection": "Keine Zeit", "increase_percent": 8.7}
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching objection trends: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch objection trends")

@router.get("/team-leaderboard")
async def get_team_leaderboard(
    metric: str = Query(default="deals", pattern="^(deals|conversion_rate|objections_handled)$"),
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Get team leaderboard ranked by specified metric.
    
    Args:
        metric: Metric to rank by (deals, conversion_rate, objections_handled)
        limit: Number of top performers to return
    
    Returns:
        Leaderboard with top performers
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Mock leaderboard - replace with actual user performance queries
        leaderboard = [
            {"rank": 1, "user": "Max M.", "deals": 89, "conversion_rate": 0.34, "objections_handled": 156},
            {"rank": 2, "user": "Sarah K.", "deals": 76, "conversion_rate": 0.31, "objections_handled": 143},
            {"rank": 3, "user": "Tom B.", "deals": 71, "conversion_rate": 0.28, "objections_handled": 138},
            {"rank": 4, "user": "Lisa W.", "deals": 65, "conversion_rate": 0.27, "objections_handled": 129},
            {"rank": 5, "user": "Jan S.", "deals": 58, "conversion_rate": 0.25, "objections_handled": 121}
        ]
        
        return {
            "metric": metric,
            "leaderboard": leaderboard[:limit]
        }
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")
