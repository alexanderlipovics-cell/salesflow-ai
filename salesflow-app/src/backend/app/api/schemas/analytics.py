"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS SCHEMAS                                                         ║
║  Pydantic Models für Template & Channel Analytics                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date, datetime
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class ConfidenceLevel(str, Enum):
    """Confidence Level basierend auf Sample Size."""
    low = "low"         # < 20 sends
    medium = "medium"   # 20-49 sends
    high = "high"       # >= 50 sends


class AggGranularity(str, Enum):
    """Aggregations-Granularität."""
    day = "day"
    week = "week"
    month = "month"


class SortField(str, Enum):
    """Sortieroptionen für Analytics."""
    events_sent = "events_sent"
    reply_rate = "reply_rate"
    positive_reply_rate = "positive_reply_rate"
    win_rate = "win_rate"


# ═══════════════════════════════════════════════════════════════════════════
# TEMPLATE ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

class TemplateAnalyticsQuery(BaseModel):
    """Query-Parameter für Template Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    vertical_id: Optional[str] = None
    channel: Optional[str] = None
    category: Optional[str] = None  # 'cold_outreach', 'followup', etc.
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: SortField = SortField.win_rate
    min_sends: int = Field(default=1, ge=0, description="Minimum sends für Filter")


class TemplateAnalyticsEntry(BaseModel):
    """Analytics-Eintrag für ein Template."""
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    category: Optional[str] = None
    
    # Counters
    events_suggested: int = 0
    events_sent: int = 0
    events_edited: int = 0
    events_replied: int = 0
    events_positive_reply: int = 0
    events_negative_reply: int = 0
    events_no_reply: int = 0
    events_deal_won: int = 0
    events_deal_lost: int = 0
    events_call_booked: int = 0
    
    # Rates (als Dezimalzahl, z.B. 0.25 = 25%)
    reply_rate: Optional[float] = Field(None, ge=0, le=1)
    positive_reply_rate: Optional[float] = Field(None, ge=0, le=1)
    win_rate: Optional[float] = Field(None, ge=0, le=1)
    edit_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Confidence
    has_enough_data: bool = False  # >= 20 sends
    confidence: ConfidenceLevel = ConfidenceLevel.low


class TemplateAnalyticsResponse(BaseModel):
    """Response für Template Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    vertical_id: Optional[str] = None
    channel: Optional[str] = None
    
    # Totals
    total_templates: int = 0
    total_sent: int = 0
    total_replied: int = 0
    total_positive: int = 0
    total_deals: int = 0
    
    # Overall Rates
    overall_reply_rate: Optional[float] = None
    overall_positive_rate: Optional[float] = None
    overall_win_rate: Optional[float] = None
    
    # Results
    results: List[TemplateAnalyticsEntry] = Field(default_factory=list)
    
    # Meta
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════
# CHANNEL ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

class ChannelAnalyticsQuery(BaseModel):
    """Query-Parameter für Channel Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    vertical_id: Optional[str] = None


class ChannelAnalyticsEntry(BaseModel):
    """Analytics-Eintrag für einen Channel."""
    channel: str
    
    events_sent: int = 0
    events_replied: int = 0
    events_positive_reply: int = 0
    events_deal_won: int = 0
    events_call_booked: int = 0
    
    reply_rate: Optional[float] = Field(None, ge=0, le=1)
    positive_reply_rate: Optional[float] = Field(None, ge=0, le=1)
    win_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Vergleich
    reply_rate_vs_avg: Optional[float] = None  # +0.05 = 5% besser als Durchschnitt
    win_rate_vs_avg: Optional[float] = None


class ChannelAnalyticsResponse(BaseModel):
    """Response für Channel Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    vertical_id: Optional[str] = None
    
    # Best Channel
    best_channel_reply_rate: Optional[str] = None
    best_channel_win_rate: Optional[str] = None
    
    results: List[ChannelAnalyticsEntry] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════
# TIME SERIES ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

class TimeSeriesQuery(BaseModel):
    """Query für Time Series Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    granularity: AggGranularity = AggGranularity.day
    vertical_id: Optional[str] = None
    channel: Optional[str] = None
    template_id: Optional[str] = None


class TimeSeriesDataPoint(BaseModel):
    """Ein Datenpunkt in der Time Series."""
    period: str  # ISO date string
    
    events_sent: int = 0
    events_replied: int = 0
    events_positive_reply: int = 0
    events_deal_won: int = 0
    
    reply_rate: Optional[float] = None
    positive_reply_rate: Optional[float] = None
    win_rate: Optional[float] = None


class TimeSeriesResponse(BaseModel):
    """Response für Time Series Analytics."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    granularity: AggGranularity = AggGranularity.day
    
    data: List[TimeSeriesDataPoint] = Field(default_factory=list)
    
    # Trends
    trend_reply_rate: Optional[float] = None  # Positive = steigend
    trend_win_rate: Optional[float] = None
    
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════
# PERFORMANCE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

class PerformanceSummaryQuery(BaseModel):
    """Query für Performance Summary."""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    compare_previous: bool = True  # Mit Vorperiode vergleichen


class PerformanceSummary(BaseModel):
    """Zusammenfassung der Performance."""
    period_start: date
    period_end: date
    
    # Current Period
    total_sent: int = 0
    total_replied: int = 0
    total_positive: int = 0
    total_deals: int = 0
    
    reply_rate: Optional[float] = None
    positive_rate: Optional[float] = None
    win_rate: Optional[float] = None
    
    # vs Previous Period
    sent_change: Optional[float] = None  # +0.15 = 15% mehr
    reply_rate_change: Optional[float] = None
    win_rate_change: Optional[float] = None
    
    # Top Insights
    best_channel: Optional[str] = None
    best_template_id: Optional[str] = None
    best_template_name: Optional[str] = None
    
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD METRICS
# ═══════════════════════════════════════════════════════════════════════════

class DashboardMetric(BaseModel):
    """Eine einzelne Dashboard-Metrik."""
    label: str
    value: float
    formatted_value: str  # z.B. "24.5%"
    change_vs_previous: Optional[float] = None
    trend: Optional[str] = None  # 'up', 'down', 'stable'


class DashboardMetricsResponse(BaseModel):
    """Alle Dashboard-Metriken auf einen Blick."""
    period_label: str  # z.B. "Letzte 30 Tage"
    
    messages_sent: DashboardMetric
    reply_rate: DashboardMetric
    positive_rate: DashboardMetric
    win_rate: DashboardMetric
    deals_closed: DashboardMetric
    
    # Quick Insights
    top_channel: Optional[str] = None
    top_template: Optional[str] = None
    
    generated_at: datetime = Field(default_factory=datetime.utcnow)

