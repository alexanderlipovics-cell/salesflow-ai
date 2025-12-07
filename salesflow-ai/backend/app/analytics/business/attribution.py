"""
SalesFlow AI - Revenue Attribution Analytics
=============================================

Multi-touch attribution system for understanding which
features, channels, and actions drive revenue.

Features:
- Multi-touch attribution models
- Channel attribution
- Feature impact analysis
- AI cost vs revenue ROI
- Touch point tracking

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
from collections import defaultdict
import statistics
import math

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class AttributionModel(str, Enum):
    """Attribution model types."""
    FIRST_TOUCH = "first_touch"      # 100% credit to first touch
    LAST_TOUCH = "last_touch"        # 100% credit to last touch
    LINEAR = "linear"                # Equal credit to all touches
    TIME_DECAY = "time_decay"        # More credit to recent touches
    POSITION_BASED = "position_based"  # 40% first, 40% last, 20% middle
    DATA_DRIVEN = "data_driven"      # ML-based attribution


class TouchType(str, Enum):
    """Types of customer touchpoints."""
    AD_CLICK = "ad_click"
    ORGANIC_SEARCH = "organic_search"
    REFERRAL = "referral"
    EMAIL_OPEN = "email_open"
    EMAIL_CLICK = "email_click"
    WHATSAPP_MESSAGE = "whatsapp_message"
    LINKEDIN_MESSAGE = "linkedin_message"
    PHONE_CALL = "phone_call"
    MEETING = "meeting"
    WEBSITE_VISIT = "website_visit"
    AI_INTERACTION = "ai_interaction"
    SEQUENCE_STEP = "sequence_step"
    MANUAL_OUTREACH = "manual_outreach"


class FeatureCategory(str, Enum):
    """Feature categories for attribution."""
    AI_RESPONSE_GENERATION = "ai_response_generation"
    AI_LEAD_SCORING = "ai_lead_scoring"
    AI_SENTIMENT_ANALYSIS = "ai_sentiment_analysis"
    AUTOPILOT_SEQUENCE = "autopilot_sequence"
    SMART_SCHEDULING = "smart_scheduling"
    MULTI_CHANNEL_SYNC = "multi_channel_sync"
    CRM_AUTOMATION = "crm_automation"
    ANALYTICS_INSIGHTS = "analytics_insights"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TouchPoint:
    """A single customer touchpoint."""
    touch_id: str
    lead_id: str
    tenant_id: str
    touch_type: TouchType
    channel: str
    timestamp: datetime
    feature_used: Optional[FeatureCategory] = None
    ai_assisted: bool = False
    cost: float = 0.0  # Cost of this touchpoint (e.g., AI cost)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Conversion:
    """A conversion event with associated revenue."""
    conversion_id: str
    lead_id: str
    tenant_id: str
    timestamp: datetime
    revenue: float
    conversion_type: str  # "deal_closed", "subscription", etc.
    touchpoints: list[TouchPoint] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AttributionResult:
    """Attribution result for a single entity."""
    entity_type: str  # "channel", "feature", "touch_type"
    entity_value: str
    attributed_revenue: float
    attributed_conversions: float
    total_touches: int
    conversion_rate: float
    avg_revenue_per_touch: float
    roi: Optional[float] = None  # If cost data available
    total_cost: float = 0.0


@dataclass
class AttributionReport:
    """Complete attribution report."""
    model: AttributionModel
    period_start: datetime
    period_end: datetime
    tenant_id: Optional[str]
    total_revenue: float
    total_conversions: int
    by_channel: list[AttributionResult]
    by_feature: list[AttributionResult]
    by_touch_type: list[AttributionResult]
    top_conversion_paths: list[dict]
    ai_roi_summary: dict[str, Any]


@dataclass
class AIROIMetrics:
    """ROI metrics for AI features."""
    feature: FeatureCategory
    total_cost: float
    attributed_revenue: float
    roi_percentage: float
    conversions_assisted: int
    avg_cost_per_conversion: float
    touches_count: int


# =============================================================================
# ATTRIBUTION CALCULATOR
# =============================================================================

class AttributionCalculator:
    """
    Calculates attribution based on different models.
    
    Supports multiple attribution models and can
    calculate attribution at channel, feature, and touchpoint level.
    """
    
    def __init__(self, decay_half_life_days: float = 7.0):
        """
        Args:
            decay_half_life_days: Half-life for time decay model
        """
        self._decay_half_life = decay_half_life_days
    
    def calculate(
        self,
        conversion: Conversion,
        model: AttributionModel
    ) -> dict[str, float]:
        """
        Calculate attribution credits for a conversion.
        
        Returns:
            Dict mapping touch_id to credit (0-1)
        """
        touchpoints = sorted(conversion.touchpoints, key=lambda t: t.timestamp)
        
        if not touchpoints:
            return {}
        
        if model == AttributionModel.FIRST_TOUCH:
            return self._first_touch(touchpoints)
        elif model == AttributionModel.LAST_TOUCH:
            return self._last_touch(touchpoints)
        elif model == AttributionModel.LINEAR:
            return self._linear(touchpoints)
        elif model == AttributionModel.TIME_DECAY:
            return self._time_decay(touchpoints, conversion.timestamp)
        elif model == AttributionModel.POSITION_BASED:
            return self._position_based(touchpoints)
        else:
            return self._linear(touchpoints)  # Default fallback
    
    def _first_touch(self, touchpoints: list[TouchPoint]) -> dict[str, float]:
        """100% credit to first touchpoint."""
        return {touchpoints[0].touch_id: 1.0}
    
    def _last_touch(self, touchpoints: list[TouchPoint]) -> dict[str, float]:
        """100% credit to last touchpoint."""
        return {touchpoints[-1].touch_id: 1.0}
    
    def _linear(self, touchpoints: list[TouchPoint]) -> dict[str, float]:
        """Equal credit to all touchpoints."""
        credit = 1.0 / len(touchpoints)
        return {tp.touch_id: credit for tp in touchpoints}
    
    def _time_decay(
        self,
        touchpoints: list[TouchPoint],
        conversion_time: datetime
    ) -> dict[str, float]:
        """More credit to recent touchpoints using exponential decay."""
        credits = {}
        total_weight = 0
        
        for tp in touchpoints:
            days_before = (conversion_time - tp.timestamp).total_seconds() / 86400
            # Exponential decay: weight = 2^(-days/half_life)
            weight = math.pow(2, -days_before / self._decay_half_life)
            credits[tp.touch_id] = weight
            total_weight += weight
        
        # Normalize to sum to 1
        if total_weight > 0:
            credits = {k: v / total_weight for k, v in credits.items()}
        
        return credits
    
    def _position_based(self, touchpoints: list[TouchPoint]) -> dict[str, float]:
        """40% first, 40% last, 20% distributed among middle."""
        if len(touchpoints) == 1:
            return {touchpoints[0].touch_id: 1.0}
        
        if len(touchpoints) == 2:
            return {
                touchpoints[0].touch_id: 0.5,
                touchpoints[1].touch_id: 0.5
            }
        
        credits = {}
        credits[touchpoints[0].touch_id] = 0.4
        credits[touchpoints[-1].touch_id] = 0.4
        
        middle_count = len(touchpoints) - 2
        if middle_count > 0:
            middle_credit = 0.2 / middle_count
            for tp in touchpoints[1:-1]:
                credits[tp.touch_id] = middle_credit
        
        return credits


# =============================================================================
# ATTRIBUTION TRACKER
# =============================================================================

class AttributionTracker:
    """
    Tracks touchpoints and conversions for attribution analysis.
    
    Stores customer journey data and provides attribution reports.
    """
    
    def __init__(self):
        self._touchpoints: dict[str, list[TouchPoint]] = defaultdict(list)  # lead_id -> touches
        self._conversions: list[Conversion] = []
        self._calculator = AttributionCalculator()
        self._feature_costs: dict[str, float] = defaultdict(float)  # feature -> total cost
    
    def record_touchpoint(
        self,
        lead_id: str,
        tenant_id: str,
        touch_type: TouchType,
        channel: str,
        feature_used: Optional[FeatureCategory] = None,
        ai_assisted: bool = False,
        cost: float = 0.0,
        metadata: Optional[dict] = None,
        timestamp: Optional[datetime] = None
    ) -> TouchPoint:
        """
        Record a customer touchpoint.
        
        Args:
            lead_id: Lead identifier
            tenant_id: Tenant identifier
            touch_type: Type of touchpoint
            channel: Communication channel
            feature_used: SalesFlow feature used
            ai_assisted: Whether AI was involved
            cost: Cost of this touchpoint
            metadata: Additional data
            timestamp: When the touch occurred
        
        Returns:
            Created TouchPoint
        """
        import uuid
        
        touchpoint = TouchPoint(
            touch_id=str(uuid.uuid4())[:8],
            lead_id=lead_id,
            tenant_id=tenant_id,
            touch_type=touch_type,
            channel=channel,
            timestamp=timestamp or datetime.utcnow(),
            feature_used=feature_used,
            ai_assisted=ai_assisted,
            cost=cost,
            metadata=metadata or {}
        )
        
        self._touchpoints[lead_id].append(touchpoint)
        
        # Track feature costs
        if feature_used and cost > 0:
            self._feature_costs[feature_used.value] += cost
        
        logger.debug(f"Recorded touchpoint: {lead_id} - {touch_type.value}")
        return touchpoint
    
    def record_conversion(
        self,
        lead_id: str,
        tenant_id: str,
        revenue: float,
        conversion_type: str = "deal_closed",
        metadata: Optional[dict] = None,
        timestamp: Optional[datetime] = None
    ) -> Conversion:
        """
        Record a conversion event.
        
        Automatically associates prior touchpoints.
        """
        import uuid
        
        # Get touchpoints for this lead
        touchpoints = self._touchpoints.get(lead_id, [])
        
        conversion = Conversion(
            conversion_id=str(uuid.uuid4())[:8],
            lead_id=lead_id,
            tenant_id=tenant_id,
            timestamp=timestamp or datetime.utcnow(),
            revenue=revenue,
            conversion_type=conversion_type,
            touchpoints=touchpoints.copy(),
            metadata=metadata or {}
        )
        
        self._conversions.append(conversion)
        logger.info(f"Recorded conversion: {lead_id} - ${revenue}")
        return conversion
    
    def generate_report(
        self,
        model: AttributionModel = AttributionModel.LINEAR,
        tenant_id: Optional[str] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ) -> AttributionReport:
        """
        Generate comprehensive attribution report.
        
        Args:
            model: Attribution model to use
            tenant_id: Filter by tenant
            period_start: Start of period
            period_end: End of period
        
        Returns:
            Complete attribution report
        """
        period_start = period_start or (datetime.utcnow() - timedelta(days=30))
        period_end = period_end or datetime.utcnow()
        
        # Filter conversions
        conversions = [
            c for c in self._conversions
            if (not tenant_id or c.tenant_id == tenant_id)
            and period_start <= c.timestamp <= period_end
        ]
        
        if not conversions:
            return self._empty_report(model, tenant_id, period_start, period_end)
        
        # Calculate attributions
        channel_attr = defaultdict(lambda: {"revenue": 0, "conversions": 0, "touches": 0, "cost": 0})
        feature_attr = defaultdict(lambda: {"revenue": 0, "conversions": 0, "touches": 0, "cost": 0})
        touch_type_attr = defaultdict(lambda: {"revenue": 0, "conversions": 0, "touches": 0, "cost": 0})
        
        conversion_paths = []
        
        for conversion in conversions:
            credits = self._calculator.calculate(conversion, model)
            
            # Track conversion path
            path = [tp.touch_type.value for tp in sorted(conversion.touchpoints, key=lambda t: t.timestamp)]
            conversion_paths.append({
                "path": " → ".join(path),
                "revenue": conversion.revenue,
                "touches": len(path)
            })
            
            # Attribute to channels, features, and touch types
            for tp in conversion.touchpoints:
                credit = credits.get(tp.touch_id, 0)
                attributed_revenue = conversion.revenue * credit
                
                # Channel attribution
                channel_attr[tp.channel]["revenue"] += attributed_revenue
                channel_attr[tp.channel]["conversions"] += credit
                channel_attr[tp.channel]["touches"] += 1
                channel_attr[tp.channel]["cost"] += tp.cost
                
                # Feature attribution
                if tp.feature_used:
                    feature_attr[tp.feature_used.value]["revenue"] += attributed_revenue
                    feature_attr[tp.feature_used.value]["conversions"] += credit
                    feature_attr[tp.feature_used.value]["touches"] += 1
                    feature_attr[tp.feature_used.value]["cost"] += tp.cost
                
                # Touch type attribution
                touch_type_attr[tp.touch_type.value]["revenue"] += attributed_revenue
                touch_type_attr[tp.touch_type.value]["conversions"] += credit
                touch_type_attr[tp.touch_type.value]["touches"] += 1
                touch_type_attr[tp.touch_type.value]["cost"] += tp.cost
        
        # Build results
        by_channel = self._build_results("channel", channel_attr)
        by_feature = self._build_results("feature", feature_attr)
        by_touch_type = self._build_results("touch_type", touch_type_attr)
        
        # Top conversion paths
        path_counts = defaultdict(lambda: {"count": 0, "total_revenue": 0})
        for cp in conversion_paths:
            path_counts[cp["path"]]["count"] += 1
            path_counts[cp["path"]]["total_revenue"] += cp["revenue"]
        
        top_paths = sorted(
            [{"path": k, **v} for k, v in path_counts.items()],
            key=lambda x: x["total_revenue"],
            reverse=True
        )[:10]
        
        # AI ROI summary
        ai_roi = self._calculate_ai_roi(conversions, model)
        
        return AttributionReport(
            model=model,
            period_start=period_start,
            period_end=period_end,
            tenant_id=tenant_id,
            total_revenue=sum(c.revenue for c in conversions),
            total_conversions=len(conversions),
            by_channel=by_channel,
            by_feature=by_feature,
            by_touch_type=by_touch_type,
            top_conversion_paths=top_paths,
            ai_roi_summary=ai_roi
        )
    
    def get_channel_comparison(
        self,
        tenant_id: Optional[str] = None,
        period_days: int = 30
    ) -> dict[str, Any]:
        """Compare performance across channels."""
        report = self.generate_report(
            model=AttributionModel.LINEAR,
            tenant_id=tenant_id,
            period_start=datetime.utcnow() - timedelta(days=period_days)
        )
        
        channels = []
        for result in report.by_channel:
            channels.append({
                "channel": result.entity_value,
                "revenue": round(result.attributed_revenue, 2),
                "conversions": round(result.attributed_conversions, 2),
                "touches": result.total_touches,
                "conversion_rate": round(result.conversion_rate, 2),
                "revenue_per_touch": round(result.avg_revenue_per_touch, 2),
                "roi": round(result.roi, 2) if result.roi else None
            })
        
        return {
            "period_days": period_days,
            "total_revenue": report.total_revenue,
            "channels": sorted(channels, key=lambda x: x["revenue"], reverse=True)
        }
    
    def get_feature_impact(
        self,
        tenant_id: Optional[str] = None,
        period_days: int = 30
    ) -> dict[str, Any]:
        """Analyze impact of SalesFlow features on conversions."""
        report = self.generate_report(
            model=AttributionModel.TIME_DECAY,
            tenant_id=tenant_id,
            period_start=datetime.utcnow() - timedelta(days=period_days)
        )
        
        features = []
        for result in report.by_feature:
            features.append({
                "feature": result.entity_value,
                "attributed_revenue": round(result.attributed_revenue, 2),
                "conversions_assisted": round(result.attributed_conversions, 2),
                "total_uses": result.total_touches,
                "cost": round(result.total_cost, 2),
                "roi": round(result.roi, 2) if result.roi else None,
                "revenue_per_use": round(result.avg_revenue_per_touch, 2)
            })
        
        return {
            "period_days": period_days,
            "features": sorted(features, key=lambda x: x["attributed_revenue"], reverse=True),
            "ai_summary": report.ai_roi_summary
        }
    
    def get_ai_roi_analysis(
        self,
        tenant_id: Optional[str] = None,
        period_days: int = 30
    ) -> list[AIROIMetrics]:
        """Get detailed AI ROI analysis by feature."""
        period_start = datetime.utcnow() - timedelta(days=period_days)
        
        conversions = [
            c for c in self._conversions
            if (not tenant_id or c.tenant_id == tenant_id)
            and c.timestamp >= period_start
        ]
        
        # Group by AI feature
        feature_data: dict[str, dict] = defaultdict(lambda: {
            "cost": 0, "revenue": 0, "conversions": 0, "touches": 0
        })
        
        for conversion in conversions:
            credits = self._calculator.calculate(conversion, AttributionModel.TIME_DECAY)
            
            for tp in conversion.touchpoints:
                if tp.ai_assisted and tp.feature_used:
                    credit = credits.get(tp.touch_id, 0)
                    feature = tp.feature_used.value
                    feature_data[feature]["cost"] += tp.cost
                    feature_data[feature]["revenue"] += conversion.revenue * credit
                    feature_data[feature]["conversions"] += credit
                    feature_data[feature]["touches"] += 1
        
        results = []
        for feature_name, data in feature_data.items():
            roi = ((data["revenue"] - data["cost"]) / data["cost"] * 100) if data["cost"] > 0 else 0
            avg_cost = data["cost"] / data["conversions"] if data["conversions"] > 0 else 0
            
            try:
                feature = FeatureCategory(feature_name)
            except ValueError:
                continue
            
            results.append(AIROIMetrics(
                feature=feature,
                total_cost=round(data["cost"], 2),
                attributed_revenue=round(data["revenue"], 2),
                roi_percentage=round(roi, 1),
                conversions_assisted=round(data["conversions"], 1),
                avg_cost_per_conversion=round(avg_cost, 2),
                touches_count=data["touches"]
            ))
        
        return sorted(results, key=lambda x: x.attributed_revenue, reverse=True)
    
    def _build_results(
        self,
        entity_type: str,
        attr_data: dict[str, dict]
    ) -> list[AttributionResult]:
        """Build AttributionResult list from aggregated data."""
        results = []
        
        for entity, data in attr_data.items():
            conversion_rate = (data["conversions"] / data["touches"] * 100) if data["touches"] > 0 else 0
            avg_revenue = data["revenue"] / data["touches"] if data["touches"] > 0 else 0
            roi = ((data["revenue"] - data["cost"]) / data["cost"] * 100) if data["cost"] > 0 else None
            
            results.append(AttributionResult(
                entity_type=entity_type,
                entity_value=entity,
                attributed_revenue=round(data["revenue"], 2),
                attributed_conversions=round(data["conversions"], 2),
                total_touches=data["touches"],
                conversion_rate=round(conversion_rate, 2),
                avg_revenue_per_touch=round(avg_revenue, 2),
                roi=round(roi, 2) if roi is not None else None,
                total_cost=round(data["cost"], 2)
            ))
        
        return sorted(results, key=lambda x: x.attributed_revenue, reverse=True)
    
    def _calculate_ai_roi(
        self,
        conversions: list[Conversion],
        model: AttributionModel
    ) -> dict[str, Any]:
        """Calculate overall AI ROI summary."""
        ai_cost = 0
        ai_revenue = 0
        ai_conversions = 0
        non_ai_revenue = 0
        non_ai_conversions = 0
        
        for conversion in conversions:
            credits = self._calculator.calculate(conversion, model)
            
            for tp in conversion.touchpoints:
                credit = credits.get(tp.touch_id, 0)
                attributed_rev = conversion.revenue * credit
                
                if tp.ai_assisted:
                    ai_cost += tp.cost
                    ai_revenue += attributed_rev
                    ai_conversions += credit
                else:
                    non_ai_revenue += attributed_rev
                    non_ai_conversions += credit
        
        ai_roi = ((ai_revenue - ai_cost) / ai_cost * 100) if ai_cost > 0 else 0
        
        return {
            "ai_total_cost": round(ai_cost, 2),
            "ai_attributed_revenue": round(ai_revenue, 2),
            "ai_roi_percentage": round(ai_roi, 1),
            "ai_conversions_assisted": round(ai_conversions, 1),
            "non_ai_revenue": round(non_ai_revenue, 2),
            "non_ai_conversions": round(non_ai_conversions, 1),
            "ai_revenue_share": round(
                ai_revenue / (ai_revenue + non_ai_revenue) * 100
                if (ai_revenue + non_ai_revenue) > 0 else 0, 1
            )
        }
    
    def _empty_report(
        self,
        model: AttributionModel,
        tenant_id: Optional[str],
        period_start: datetime,
        period_end: datetime
    ) -> AttributionReport:
        """Create empty report when no data available."""
        return AttributionReport(
            model=model,
            period_start=period_start,
            period_end=period_end,
            tenant_id=tenant_id,
            total_revenue=0,
            total_conversions=0,
            by_channel=[],
            by_feature=[],
            by_touch_type=[],
            top_conversion_paths=[],
            ai_roi_summary={
                "ai_total_cost": 0,
                "ai_attributed_revenue": 0,
                "ai_roi_percentage": 0,
                "ai_conversions_assisted": 0
            }
        )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_attribution_tracker() -> AttributionTracker:
    """
    Create attribution tracker instance.
    
    Example:
        tracker = create_attribution_tracker()
        
        # Record touchpoints
        tracker.record_touchpoint(
            lead_id="lead-123",
            tenant_id="tenant-1",
            touch_type=TouchType.AD_CLICK,
            channel="facebook",
            cost=0.50
        )
        
        tracker.record_touchpoint(
            lead_id="lead-123",
            tenant_id="tenant-1",
            touch_type=TouchType.AI_INTERACTION,
            channel="whatsapp",
            feature_used=FeatureCategory.AI_RESPONSE_GENERATION,
            ai_assisted=True,
            cost=0.02
        )
        
        # Record conversion
        tracker.record_conversion(
            lead_id="lead-123",
            tenant_id="tenant-1",
            revenue=500.00
        )
        
        # Generate report
        report = tracker.generate_report(model=AttributionModel.TIME_DECAY)
        print(f"AI ROI: {report.ai_roi_summary['ai_roi_percentage']}%")
    """
    return AttributionTracker()
