"""
SalesFlow AI - Conversion Funnel Tracking
==========================================

Comprehensive conversion funnel tracking from lead creation
to deal closure with stage-by-stage analytics.

Features:
- Multi-stage funnel tracking
- Conversion rate calculations
- Drop-off analysis
- Stage duration tracking
- Cohort analysis
- Channel attribution

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
import json

logger = logging.getLogger(__name__)


# =============================================================================
# FUNNEL STAGES
# =============================================================================

class FunnelStage(str, Enum):
    """Standard conversion funnel stages."""
    LEAD_CREATED = "lead_created"
    LEAD_QUALIFIED = "lead_qualified"
    FIRST_CONTACT = "first_contact"
    FIRST_RESPONSE = "first_response"
    ENGAGED = "engaged"
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_COMPLETED = "meeting_completed"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    DEAL_CLOSED_WON = "deal_closed_won"
    DEAL_CLOSED_LOST = "deal_closed_lost"
    CHURNED = "churned"


class LeadSource(str, Enum):
    """Lead acquisition sources."""
    ORGANIC = "organic"
    REFERRAL = "referral"
    PAID_ADS = "paid_ads"
    SOCIAL_MEDIA = "social_media"
    COLD_OUTREACH = "cold_outreach"
    INBOUND = "inbound"
    EVENT = "event"
    PARTNER = "partner"
    UNKNOWN = "unknown"


class Channel(str, Enum):
    """Communication channels."""
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    PHONE = "phone"
    SMS = "sms"
    INSTAGRAM = "instagram"
    IN_PERSON = "in_person"
    VIDEO_CALL = "video_call"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class FunnelEvent:
    """A single funnel event."""
    event_id: str
    lead_id: str
    tenant_id: str
    stage: FunnelStage
    timestamp: datetime
    previous_stage: Optional[FunnelStage] = None
    channel: Optional[Channel] = None
    source: Optional[LeadSource] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    duration_from_previous_seconds: Optional[int] = None


@dataclass
class LeadJourney:
    """Complete journey of a lead through the funnel."""
    lead_id: str
    tenant_id: str
    source: LeadSource
    created_at: datetime
    current_stage: FunnelStage
    stages: list[FunnelEvent] = field(default_factory=list)
    primary_channel: Optional[Channel] = None
    assigned_user_id: Optional[str] = None
    deal_value: Optional[float] = None
    is_converted: bool = False
    conversion_time_seconds: Optional[int] = None
    
    def time_in_stage(self, stage: FunnelStage) -> Optional[int]:
        """Get time spent in a specific stage in seconds."""
        for i, event in enumerate(self.stages):
            if event.stage == stage:
                if i + 1 < len(self.stages):
                    return int((self.stages[i + 1].timestamp - event.timestamp).total_seconds())
                else:
                    return int((datetime.utcnow() - event.timestamp).total_seconds())
        return None


@dataclass
class StageMetrics:
    """Metrics for a single funnel stage."""
    stage: FunnelStage
    total_entries: int
    total_exits: int
    conversion_rate: float  # Percentage moving to next stage
    drop_off_rate: float    # Percentage leaving funnel
    avg_time_in_stage_seconds: float
    median_time_in_stage_seconds: float
    by_source: dict[str, dict] = field(default_factory=dict)
    by_channel: dict[str, dict] = field(default_factory=dict)


@dataclass
class FunnelSnapshot:
    """Point-in-time snapshot of funnel metrics."""
    timestamp: datetime
    tenant_id: Optional[str]
    period_start: datetime
    period_end: datetime
    total_leads: int
    converted_leads: int
    overall_conversion_rate: float
    avg_conversion_time_seconds: float
    stage_metrics: dict[FunnelStage, StageMetrics]
    top_converting_sources: list[tuple[LeadSource, float]]
    top_converting_channels: list[tuple[Channel, float]]


@dataclass
class CohortAnalysis:
    """Cohort-based conversion analysis."""
    cohort_period: str  # e.g., "2024-W01", "2024-01"
    cohort_size: int
    conversion_by_day: dict[int, float]  # day -> conversion rate
    final_conversion_rate: float
    avg_conversion_time_seconds: float
    source_breakdown: dict[str, int]


# =============================================================================
# FUNNEL TRACKER
# =============================================================================

class FunnelTracker:
    """
    Tracks leads through the conversion funnel.
    
    Records stage transitions, calculates metrics,
    and provides funnel analytics.
    """
    
    # Define stage progression order
    STAGE_ORDER = [
        FunnelStage.LEAD_CREATED,
        FunnelStage.LEAD_QUALIFIED,
        FunnelStage.FIRST_CONTACT,
        FunnelStage.FIRST_RESPONSE,
        FunnelStage.ENGAGED,
        FunnelStage.MEETING_SCHEDULED,
        FunnelStage.MEETING_COMPLETED,
        FunnelStage.PROPOSAL_SENT,
        FunnelStage.NEGOTIATION,
        FunnelStage.DEAL_CLOSED_WON,
    ]
    
    TERMINAL_STAGES = [
        FunnelStage.DEAL_CLOSED_WON,
        FunnelStage.DEAL_CLOSED_LOST,
        FunnelStage.CHURNED,
    ]
    
    def __init__(self):
        self._journeys: dict[str, LeadJourney] = {}  # lead_id -> journey
        self._events: list[FunnelEvent] = []
        self._max_events = 1_000_000
    
    def record_stage_transition(
        self,
        lead_id: str,
        tenant_id: str,
        stage: FunnelStage,
        channel: Optional[Channel] = None,
        source: Optional[LeadSource] = None,
        metadata: Optional[dict] = None,
        timestamp: Optional[datetime] = None
    ) -> FunnelEvent:
        """
        Record a lead's transition to a new funnel stage.
        
        Args:
            lead_id: Unique lead identifier
            tenant_id: Tenant identifier
            stage: New funnel stage
            channel: Channel used for this transition
            source: Lead source (set on first event)
            metadata: Additional event data
            timestamp: Event timestamp (defaults to now)
        
        Returns:
            The created FunnelEvent
        """
        timestamp = timestamp or datetime.utcnow()
        
        # Get or create journey
        journey = self._journeys.get(lead_id)
        previous_stage = None
        duration_seconds = None
        
        if journey:
            previous_stage = journey.current_stage
            if journey.stages:
                last_event = journey.stages[-1]
                duration_seconds = int((timestamp - last_event.timestamp).total_seconds())
        else:
            journey = LeadJourney(
                lead_id=lead_id,
                tenant_id=tenant_id,
                source=source or LeadSource.UNKNOWN,
                created_at=timestamp,
                current_stage=stage
            )
            self._journeys[lead_id] = journey
        
        # Create event
        import uuid
        event = FunnelEvent(
            event_id=str(uuid.uuid4())[:8],
            lead_id=lead_id,
            tenant_id=tenant_id,
            stage=stage,
            timestamp=timestamp,
            previous_stage=previous_stage,
            channel=channel,
            source=source or journey.source,
            metadata=metadata or {},
            duration_from_previous_seconds=duration_seconds
        )
        
        # Update journey
        journey.current_stage = stage
        journey.stages.append(event)
        if channel:
            journey.primary_channel = channel
        
        # Check for conversion
        if stage == FunnelStage.DEAL_CLOSED_WON:
            journey.is_converted = True
            journey.conversion_time_seconds = int(
                (timestamp - journey.created_at).total_seconds()
            )
        
        # Store event
        self._events.append(event)
        self._trim_events()
        
        logger.debug(f"Recorded stage transition: {lead_id} -> {stage.value}")
        return event
    
    def get_journey(self, lead_id: str) -> Optional[LeadJourney]:
        """Get the journey for a specific lead."""
        return self._journeys.get(lead_id)
    
    def get_funnel_snapshot(
        self,
        tenant_id: Optional[str] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ) -> FunnelSnapshot:
        """
        Get comprehensive funnel metrics snapshot.
        
        Args:
            tenant_id: Filter by tenant (None for all)
            period_start: Start of analysis period
            period_end: End of analysis period
        
        Returns:
            Complete funnel snapshot with metrics
        """
        period_start = period_start or (datetime.utcnow() - timedelta(days=30))
        period_end = period_end or datetime.utcnow()
        
        # Filter journeys
        journeys = [
            j for j in self._journeys.values()
            if (not tenant_id or j.tenant_id == tenant_id)
            and period_start <= j.created_at <= period_end
        ]
        
        if not journeys:
            return self._empty_snapshot(tenant_id, period_start, period_end)
        
        # Calculate stage metrics
        stage_metrics = {}
        for stage in FunnelStage:
            stage_metrics[stage] = self._calculate_stage_metrics(
                journeys, stage
            )
        
        # Calculate overall metrics
        total_leads = len(journeys)
        converted_leads = sum(1 for j in journeys if j.is_converted)
        overall_conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        
        conversion_times = [
            j.conversion_time_seconds for j in journeys
            if j.conversion_time_seconds is not None
        ]
        avg_conversion_time = statistics.mean(conversion_times) if conversion_times else 0
        
        # Top sources and channels
        top_sources = self._get_top_converting_sources(journeys)
        top_channels = self._get_top_converting_channels(journeys)
        
        return FunnelSnapshot(
            timestamp=datetime.utcnow(),
            tenant_id=tenant_id,
            period_start=period_start,
            period_end=period_end,
            total_leads=total_leads,
            converted_leads=converted_leads,
            overall_conversion_rate=round(overall_conversion_rate, 2),
            avg_conversion_time_seconds=round(avg_conversion_time, 0),
            stage_metrics=stage_metrics,
            top_converting_sources=top_sources,
            top_converting_channels=top_channels
        )
    
    def get_stage_funnel(
        self,
        tenant_id: Optional[str] = None,
        period_days: int = 30
    ) -> dict[str, Any]:
        """
        Get simple funnel visualization data.
        
        Returns counts at each stage for funnel charts.
        """
        cutoff = datetime.utcnow() - timedelta(days=period_days)
        
        journeys = [
            j for j in self._journeys.values()
            if (not tenant_id or j.tenant_id == tenant_id)
            and j.created_at >= cutoff
        ]
        
        # Count leads that reached each stage
        stage_counts = {}
        for stage in self.STAGE_ORDER:
            count = sum(
                1 for j in journeys
                if any(e.stage == stage for e in j.stages)
            )
            stage_counts[stage.value] = count
        
        # Add terminal stages
        stage_counts[FunnelStage.DEAL_CLOSED_LOST.value] = sum(
            1 for j in journeys
            if j.current_stage == FunnelStage.DEAL_CLOSED_LOST
        )
        
        # Calculate conversion rates between stages
        conversion_rates = {}
        for i, stage in enumerate(self.STAGE_ORDER[:-1]):
            current = stage_counts[stage.value]
            next_stage = self.STAGE_ORDER[i + 1]
            next_count = stage_counts[next_stage.value]
            rate = (next_count / current * 100) if current > 0 else 0
            conversion_rates[f"{stage.value}_to_{next_stage.value}"] = round(rate, 1)
        
        return {
            "period_days": period_days,
            "total_leads": len(journeys),
            "stage_counts": stage_counts,
            "conversion_rates": conversion_rates,
            "funnel_data": [
                {"stage": stage.value, "count": stage_counts[stage.value]}
                for stage in self.STAGE_ORDER
            ]
        }
    
    def get_cohort_analysis(
        self,
        tenant_id: Optional[str] = None,
        cohort_type: str = "weekly",  # "daily", "weekly", "monthly"
        num_cohorts: int = 8
    ) -> list[CohortAnalysis]:
        """
        Perform cohort-based conversion analysis.
        
        Groups leads by their creation time and analyzes
        conversion patterns over time.
        """
        from datetime import date
        
        journeys = [
            j for j in self._journeys.values()
            if not tenant_id or j.tenant_id == tenant_id
        ]
        
        # Group by cohort period
        cohorts: dict[str, list[LeadJourney]] = defaultdict(list)
        
        for journey in journeys:
            if cohort_type == "daily":
                period = journey.created_at.strftime("%Y-%m-%d")
            elif cohort_type == "weekly":
                period = f"{journey.created_at.year}-W{journey.created_at.isocalendar()[1]:02d}"
            else:  # monthly
                period = journey.created_at.strftime("%Y-%m")
            
            cohorts[period].append(journey)
        
        # Sort and limit cohorts
        sorted_periods = sorted(cohorts.keys(), reverse=True)[:num_cohorts]
        
        results = []
        for period in reversed(sorted_periods):
            period_journeys = cohorts[period]
            
            # Calculate conversion by day since creation
            conversion_by_day: dict[int, float] = {}
            for days in [1, 3, 7, 14, 30, 60, 90]:
                converted_by_day = sum(
                    1 for j in period_journeys
                    if j.is_converted and j.conversion_time_seconds
                    and j.conversion_time_seconds <= days * 86400
                )
                rate = (converted_by_day / len(period_journeys) * 100) if period_journeys else 0
                conversion_by_day[days] = round(rate, 1)
            
            # Source breakdown
            source_breakdown = {}
            for j in period_journeys:
                source_breakdown[j.source.value] = source_breakdown.get(j.source.value, 0) + 1
            
            # Final conversion rate
            converted = sum(1 for j in period_journeys if j.is_converted)
            conversion_times = [
                j.conversion_time_seconds for j in period_journeys
                if j.conversion_time_seconds
            ]
            
            results.append(CohortAnalysis(
                cohort_period=period,
                cohort_size=len(period_journeys),
                conversion_by_day=conversion_by_day,
                final_conversion_rate=round(
                    converted / len(period_journeys) * 100 if period_journeys else 0, 1
                ),
                avg_conversion_time_seconds=round(
                    statistics.mean(conversion_times) if conversion_times else 0, 0
                ),
                source_breakdown=source_breakdown
            ))
        
        return results
    
    def get_drop_off_analysis(
        self,
        tenant_id: Optional[str] = None,
        period_days: int = 30
    ) -> dict[str, Any]:
        """
        Analyze where leads are dropping off in the funnel.
        
        Identifies bottlenecks and problem areas.
        """
        cutoff = datetime.utcnow() - timedelta(days=period_days)
        
        journeys = [
            j for j in self._journeys.values()
            if (not tenant_id or j.tenant_id == tenant_id)
            and j.created_at >= cutoff
            and j.current_stage in self.TERMINAL_STAGES
            or not any(e.stage in self.TERMINAL_STAGES for e in j.stages)
        ]
        
        # Find where non-converted leads stopped
        drop_off_points: dict[str, int] = defaultdict(int)
        
        for journey in journeys:
            if not journey.is_converted and journey.current_stage not in self.TERMINAL_STAGES:
                drop_off_points[journey.current_stage.value] += 1
        
        # Calculate drop-off rates
        total_dropped = sum(drop_off_points.values())
        drop_off_rates = {
            stage: round(count / total_dropped * 100, 1) if total_dropped > 0 else 0
            for stage, count in drop_off_points.items()
        }
        
        # Time analysis - leads stuck too long
        stuck_leads = []
        for journey in journeys:
            if not journey.is_converted:
                time_in_current = journey.time_in_stage(journey.current_stage)
                if time_in_current and time_in_current > 7 * 86400:  # > 7 days
                    stuck_leads.append({
                        "lead_id": journey.lead_id,
                        "stage": journey.current_stage.value,
                        "days_stuck": time_in_current // 86400
                    })
        
        return {
            "period_days": period_days,
            "total_dropped": total_dropped,
            "drop_off_points": dict(drop_off_points),
            "drop_off_rates": drop_off_rates,
            "worst_stage": max(drop_off_rates, key=drop_off_rates.get) if drop_off_rates else None,
            "stuck_leads": sorted(stuck_leads, key=lambda x: x["days_stuck"], reverse=True)[:20]
        }
    
    def _calculate_stage_metrics(
        self,
        journeys: list[LeadJourney],
        stage: FunnelStage
    ) -> StageMetrics:
        """Calculate metrics for a single stage."""
        entries = 0
        exits = 0
        times_in_stage = []
        by_source: dict[str, dict] = defaultdict(lambda: {"entries": 0, "exits": 0})
        by_channel: dict[str, dict] = defaultdict(lambda: {"entries": 0, "exits": 0})
        
        for journey in journeys:
            stage_events = [e for e in journey.stages if e.stage == stage]
            
            if stage_events:
                entries += 1
                event = stage_events[0]
                
                # Track by source
                by_source[journey.source.value]["entries"] += 1
                
                # Track by channel
                if event.channel:
                    by_channel[event.channel.value]["entries"] += 1
                
                # Calculate time in stage
                time_in = journey.time_in_stage(stage)
                if time_in:
                    times_in_stage.append(time_in)
                
                # Check if exited to next stage
                stage_idx = next(
                    (i for i, e in enumerate(journey.stages) if e.stage == stage),
                    None
                )
                if stage_idx is not None and stage_idx + 1 < len(journey.stages):
                    exits += 1
                    by_source[journey.source.value]["exits"] += 1
                    if event.channel:
                        by_channel[event.channel.value]["exits"] += 1
        
        conversion_rate = (exits / entries * 100) if entries > 0 else 0
        drop_off_rate = 100 - conversion_rate if entries > 0 else 0
        
        return StageMetrics(
            stage=stage,
            total_entries=entries,
            total_exits=exits,
            conversion_rate=round(conversion_rate, 2),
            drop_off_rate=round(drop_off_rate, 2),
            avg_time_in_stage_seconds=round(
                statistics.mean(times_in_stage) if times_in_stage else 0, 0
            ),
            median_time_in_stage_seconds=round(
                statistics.median(times_in_stage) if times_in_stage else 0, 0
            ),
            by_source=dict(by_source),
            by_channel=dict(by_channel)
        )
    
    def _get_top_converting_sources(
        self,
        journeys: list[LeadJourney],
        limit: int = 5
    ) -> list[tuple[LeadSource, float]]:
        """Get sources with highest conversion rates."""
        source_stats: dict[LeadSource, dict] = defaultdict(lambda: {"total": 0, "converted": 0})
        
        for journey in journeys:
            source_stats[journey.source]["total"] += 1
            if journey.is_converted:
                source_stats[journey.source]["converted"] += 1
        
        source_rates = [
            (source, stats["converted"] / stats["total"] * 100 if stats["total"] > 0 else 0)
            for source, stats in source_stats.items()
        ]
        
        return sorted(source_rates, key=lambda x: x[1], reverse=True)[:limit]
    
    def _get_top_converting_channels(
        self,
        journeys: list[LeadJourney],
        limit: int = 5
    ) -> list[tuple[Channel, float]]:
        """Get channels with highest conversion rates."""
        channel_stats: dict[Channel, dict] = defaultdict(lambda: {"total": 0, "converted": 0})
        
        for journey in journeys:
            if journey.primary_channel:
                channel_stats[journey.primary_channel]["total"] += 1
                if journey.is_converted:
                    channel_stats[journey.primary_channel]["converted"] += 1
        
        channel_rates = [
            (channel, stats["converted"] / stats["total"] * 100 if stats["total"] > 0 else 0)
            for channel, stats in channel_stats.items()
        ]
        
        return sorted(channel_rates, key=lambda x: x[1], reverse=True)[:limit]
    
    def _empty_snapshot(
        self,
        tenant_id: Optional[str],
        period_start: datetime,
        period_end: datetime
    ) -> FunnelSnapshot:
        """Create empty snapshot when no data available."""
        return FunnelSnapshot(
            timestamp=datetime.utcnow(),
            tenant_id=tenant_id,
            period_start=period_start,
            period_end=period_end,
            total_leads=0,
            converted_leads=0,
            overall_conversion_rate=0,
            avg_conversion_time_seconds=0,
            stage_metrics={},
            top_converting_sources=[],
            top_converting_channels=[]
        )
    
    def _trim_events(self) -> None:
        """Trim events to prevent memory bloat."""
        if len(self._events) > self._max_events:
            self._events = self._events[-self._max_events:]


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_funnel_tracker() -> FunnelTracker:
    """
    Create funnel tracker instance.
    
    Example:
        tracker = create_funnel_tracker()
        
        # Record lead creation
        tracker.record_stage_transition(
            lead_id="lead-123",
            tenant_id="tenant-1",
            stage=FunnelStage.LEAD_CREATED,
            source=LeadSource.PAID_ADS,
            channel=Channel.LINKEDIN
        )
        
        # Record progression
        tracker.record_stage_transition(
            lead_id="lead-123",
            tenant_id="tenant-1",
            stage=FunnelStage.FIRST_CONTACT,
            channel=Channel.WHATSAPP
        )
        
        # Get funnel snapshot
        snapshot = tracker.get_funnel_snapshot(tenant_id="tenant-1")
        print(f"Conversion rate: {snapshot.overall_conversion_rate}%")
    """
    return FunnelTracker()
