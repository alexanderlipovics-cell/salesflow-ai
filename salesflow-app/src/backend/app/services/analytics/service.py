"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS SERVICE                                                         ║
║  Performance Analytics für Templates, Channels und Time Series             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Optional, Dict
from datetime import date, timedelta, datetime

from supabase import Client

from ...api.schemas.analytics import (
    TemplateAnalyticsQuery,
    TemplateAnalyticsEntry,
    TemplateAnalyticsResponse,
    ChannelAnalyticsQuery,
    ChannelAnalyticsEntry,
    ChannelAnalyticsResponse,
    TimeSeriesQuery,
    TimeSeriesDataPoint,
    TimeSeriesResponse,
    PerformanceSummary,
    DashboardMetric,
    DashboardMetricsResponse,
    ConfidenceLevel,
    AggGranularity,
)


# Thresholds für Confidence Level
MIN_SENDS_FOR_CONFIDENCE = 20
MIN_SENDS_FOR_HIGH_CONFIDENCE = 50


class AnalyticsService:
    """
    Service für Analytics-Abfragen.
    
    Bietet:
    - Template Analytics (Performance pro Template)
    - Channel Analytics (Performance pro Kanal)
    - Time Series (Trends über Zeit)
    - Dashboard Metrics (Aggregierte KPIs)
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # TEMPLATE ANALYTICS
    # =========================================================================
    
    def get_template_analytics(
        self,
        company_id: str,
        query: TemplateAnalyticsQuery,
    ) -> TemplateAnalyticsResponse:
        """
        Holt Template-Performance Analytics.
        
        Sortiert nach Win-Rate (default) oder anderen Kriterien.
        """
        # Build query
        db_query = self.db.table("learning_aggregates").select(
            "template_id, channel, vertical_id, "
            "events_suggested, events_sent, events_edited, "
            "events_replied, events_positive_reply, events_negative_reply, "
            "events_no_reply, events_deal_won, events_deal_lost, events_call_booked"
        ).eq("company_id", company_id)
        
        if query.from_date:
            db_query = db_query.gte("period_start", query.from_date.isoformat())
        if query.to_date:
            db_query = db_query.lte("period_start", query.to_date.isoformat())
        if query.vertical_id:
            db_query = db_query.eq("vertical_id", query.vertical_id)
        if query.channel:
            db_query = db_query.eq("channel", query.channel)
        
        result = db_query.execute()
        
        if not result.data:
            return TemplateAnalyticsResponse(
                from_date=query.from_date,
                to_date=query.to_date,
                vertical_id=query.vertical_id,
                channel=query.channel,
            )
        
        # Gruppiere nach Template
        template_data: Dict[str, Dict] = {}
        for row in result.data:
            tid = row.get("template_id") or "__no_template__"
            
            if tid not in template_data:
                template_data[tid] = {
                    "template_id": tid if tid != "__no_template__" else None,
                    "channel": row.get("channel"),
                    "vertical_id": row.get("vertical_id"),
                    "events_suggested": 0,
                    "events_sent": 0,
                    "events_edited": 0,
                    "events_replied": 0,
                    "events_positive_reply": 0,
                    "events_negative_reply": 0,
                    "events_no_reply": 0,
                    "events_deal_won": 0,
                    "events_deal_lost": 0,
                    "events_call_booked": 0,
                }
            
            for key in ["events_suggested", "events_sent", "events_edited",
                       "events_replied", "events_positive_reply", "events_negative_reply",
                       "events_no_reply", "events_deal_won", "events_deal_lost", 
                       "events_call_booked"]:
                template_data[tid][key] += row.get(key, 0)
        
        # Hole Template-Namen
        template_ids = [tid for tid in template_data.keys() if tid != "__no_template__"]
        template_names = {}
        if template_ids:
            names_result = self.db.table("message_templates").select(
                "id, name, category"
            ).in_("id", template_ids).execute()
            if names_result.data:
                for t in names_result.data:
                    template_names[t["id"]] = {
                        "name": t.get("name"),
                        "category": t.get("category"),
                    }
        
        # Berechne Rates und filtere nach min_sends
        entries = []
        total_sent = 0
        total_replied = 0
        total_positive = 0
        total_deals = 0
        
        for tid, data in template_data.items():
            sent = data["events_sent"]
            
            if query.min_sends > 0 and sent < query.min_sends:
                continue
            
            total_sent += sent
            total_replied += data["events_replied"]
            total_positive += data["events_positive_reply"]
            total_deals += data["events_deal_won"]
            
            suggested = data["events_suggested"] or 1
            
            reply_rate = data["events_replied"] / sent if sent > 0 else None
            positive_rate = data["events_positive_reply"] / sent if sent > 0 else None
            win_rate = data["events_deal_won"] / sent if sent > 0 else None
            edit_rate = data["events_edited"] / suggested if suggested > 0 else None
            
            has_enough = sent >= MIN_SENDS_FOR_CONFIDENCE
            confidence = (
                ConfidenceLevel.high if sent >= MIN_SENDS_FOR_HIGH_CONFIDENCE
                else ConfidenceLevel.medium if sent >= MIN_SENDS_FOR_CONFIDENCE
                else ConfidenceLevel.low
            )
            
            template_info = template_names.get(tid, {})
            
            entries.append(TemplateAnalyticsEntry(
                template_id=data["template_id"],
                template_name=template_info.get("name"),
                channel=data["channel"],
                vertical_id=data["vertical_id"],
                category=template_info.get("category"),
                events_suggested=data["events_suggested"],
                events_sent=sent,
                events_edited=data["events_edited"],
                events_replied=data["events_replied"],
                events_positive_reply=data["events_positive_reply"],
                events_negative_reply=data["events_negative_reply"],
                events_no_reply=data["events_no_reply"],
                events_deal_won=data["events_deal_won"],
                events_deal_lost=data["events_deal_lost"],
                events_call_booked=data["events_call_booked"],
                reply_rate=reply_rate,
                positive_reply_rate=positive_rate,
                win_rate=win_rate,
                edit_rate=edit_rate,
                has_enough_data=has_enough,
                confidence=confidence,
            ))
        
        # Sortiere nach query.sort_by
        sort_key = query.sort_by.value
        entries.sort(
            key=lambda x: (getattr(x, sort_key, 0) or 0, x.events_sent),
            reverse=True
        )
        
        # Limit
        entries = entries[:query.limit]
        
        return TemplateAnalyticsResponse(
            from_date=query.from_date,
            to_date=query.to_date,
            vertical_id=query.vertical_id,
            channel=query.channel,
            total_templates=len(entries),
            total_sent=total_sent,
            total_replied=total_replied,
            total_positive=total_positive,
            total_deals=total_deals,
            overall_reply_rate=total_replied / total_sent if total_sent > 0 else None,
            overall_positive_rate=total_positive / total_sent if total_sent > 0 else None,
            overall_win_rate=total_deals / total_sent if total_sent > 0 else None,
            results=entries,
        )
    
    # =========================================================================
    # CHANNEL ANALYTICS
    # =========================================================================
    
    def get_channel_analytics(
        self,
        company_id: str,
        query: ChannelAnalyticsQuery,
    ) -> ChannelAnalyticsResponse:
        """
        Holt Channel-Performance Analytics.
        """
        db_query = self.db.table("learning_aggregates").select(
            "channel, events_sent, events_replied, events_positive_reply, "
            "events_deal_won, events_call_booked"
        ).eq("company_id", company_id).not_.is_("channel", "null").neq("channel", "__null__")
        
        if query.from_date:
            db_query = db_query.gte("period_start", query.from_date.isoformat())
        if query.to_date:
            db_query = db_query.lte("period_start", query.to_date.isoformat())
        if query.vertical_id:
            db_query = db_query.eq("vertical_id", query.vertical_id)
        
        result = db_query.execute()
        
        if not result.data:
            return ChannelAnalyticsResponse(
                from_date=query.from_date,
                to_date=query.to_date,
                vertical_id=query.vertical_id,
            )
        
        # Gruppiere nach Channel
        channels: Dict[str, Dict] = {}
        for row in result.data:
            ch = row.get("channel", "unknown")
            
            if ch not in channels:
                channels[ch] = {
                    "events_sent": 0,
                    "events_replied": 0,
                    "events_positive_reply": 0,
                    "events_deal_won": 0,
                    "events_call_booked": 0,
                }
            
            for key in channels[ch]:
                channels[ch][key] += row.get(key, 0)
        
        # Berechne Durchschnitte für Vergleich
        total_sent = sum(c["events_sent"] for c in channels.values())
        total_replied = sum(c["events_replied"] for c in channels.values())
        total_won = sum(c["events_deal_won"] for c in channels.values())
        avg_reply_rate = total_replied / total_sent if total_sent > 0 else 0
        avg_win_rate = total_won / total_sent if total_sent > 0 else 0
        
        # Baue Entries
        entries = []
        best_reply = None
        best_win = None
        best_reply_rate = -1
        best_win_rate = -1
        
        for ch, data in channels.items():
            sent = data["events_sent"]
            
            reply_rate = data["events_replied"] / sent if sent > 0 else None
            positive_rate = data["events_positive_reply"] / sent if sent > 0 else None
            win_rate = data["events_deal_won"] / sent if sent > 0 else None
            
            # Track best channels
            if reply_rate and reply_rate > best_reply_rate:
                best_reply_rate = reply_rate
                best_reply = ch
            if win_rate and win_rate > best_win_rate:
                best_win_rate = win_rate
                best_win = ch
            
            entries.append(ChannelAnalyticsEntry(
                channel=ch,
                events_sent=sent,
                events_replied=data["events_replied"],
                events_positive_reply=data["events_positive_reply"],
                events_deal_won=data["events_deal_won"],
                events_call_booked=data["events_call_booked"],
                reply_rate=reply_rate,
                positive_reply_rate=positive_rate,
                win_rate=win_rate,
                reply_rate_vs_avg=(reply_rate - avg_reply_rate) if reply_rate else None,
                win_rate_vs_avg=(win_rate - avg_win_rate) if win_rate else None,
            ))
        
        # Sortiere nach events_sent
        entries.sort(key=lambda x: x.events_sent, reverse=True)
        
        return ChannelAnalyticsResponse(
            from_date=query.from_date,
            to_date=query.to_date,
            vertical_id=query.vertical_id,
            best_channel_reply_rate=best_reply,
            best_channel_win_rate=best_win,
            results=entries,
        )
    
    # =========================================================================
    # TIME SERIES
    # =========================================================================
    
    def get_time_series(
        self,
        company_id: str,
        query: TimeSeriesQuery,
    ) -> TimeSeriesResponse:
        """
        Holt Time Series Analytics.
        """
        # Default: Letzte 30 Tage
        to_date = query.to_date or date.today()
        from_date = query.from_date or (to_date - timedelta(days=30))
        
        db_query = self.db.table("learning_aggregates").select(
            "period_start, events_sent, events_replied, "
            "events_positive_reply, events_deal_won"
        ).eq("company_id", company_id).eq(
            "agg_granularity", query.granularity.value
        ).gte("period_start", from_date.isoformat()).lte(
            "period_start", to_date.isoformat()
        ).order("period_start")
        
        if query.vertical_id:
            db_query = db_query.eq("vertical_id", query.vertical_id)
        if query.channel:
            db_query = db_query.eq("channel", query.channel)
        if query.template_id:
            db_query = db_query.eq("template_id", query.template_id)
        
        result = db_query.execute()
        
        # Gruppiere nach Periode
        periods: Dict[str, Dict] = {}
        for row in result.data or []:
            period = row.get("period_start")
            if not period:
                continue
                
            if period not in periods:
                periods[period] = {
                    "events_sent": 0,
                    "events_replied": 0,
                    "events_positive_reply": 0,
                    "events_deal_won": 0,
                }
            
            for key in periods[period]:
                periods[period][key] += row.get(key, 0)
        
        # Baue Datenpunkte
        data_points = []
        for period, data in sorted(periods.items()):
            sent = data["events_sent"]
            data_points.append(TimeSeriesDataPoint(
                period=period,
                events_sent=sent,
                events_replied=data["events_replied"],
                events_positive_reply=data["events_positive_reply"],
                events_deal_won=data["events_deal_won"],
                reply_rate=data["events_replied"] / sent if sent > 0 else None,
                positive_reply_rate=data["events_positive_reply"] / sent if sent > 0 else None,
                win_rate=data["events_deal_won"] / sent if sent > 0 else None,
            ))
        
        # Berechne Trends (simpel: letzte Hälfte vs. erste Hälfte)
        trend_reply = None
        trend_win = None
        if len(data_points) >= 4:
            mid = len(data_points) // 2
            first_half = data_points[:mid]
            second_half = data_points[mid:]
            
            first_reply_rates = [p.reply_rate for p in first_half if p.reply_rate is not None]
            second_reply_rates = [p.reply_rate for p in second_half if p.reply_rate is not None]
            
            if first_reply_rates and second_reply_rates:
                avg_first = sum(first_reply_rates) / len(first_reply_rates)
                avg_second = sum(second_reply_rates) / len(second_reply_rates)
                trend_reply = avg_second - avg_first
            
            first_win_rates = [p.win_rate for p in first_half if p.win_rate is not None]
            second_win_rates = [p.win_rate for p in second_half if p.win_rate is not None]
            
            if first_win_rates and second_win_rates:
                avg_first = sum(first_win_rates) / len(first_win_rates)
                avg_second = sum(second_win_rates) / len(second_win_rates)
                trend_win = avg_second - avg_first
        
        return TimeSeriesResponse(
            from_date=from_date,
            to_date=to_date,
            granularity=query.granularity,
            data=data_points,
            trend_reply_rate=trend_reply,
            trend_win_rate=trend_win,
        )
    
    # =========================================================================
    # PERFORMANCE SUMMARY
    # =========================================================================
    
    def get_performance_summary(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        compare_previous: bool = True,
    ) -> PerformanceSummary:
        """
        Holt Performance Summary mit optionalem Periodenvergleich.
        """
        # Default: Letzte 30 Tage
        to_date = to_date or date.today()
        from_date = from_date or (to_date - timedelta(days=30))
        period_days = (to_date - from_date).days
        
        # Aktuelle Periode
        current = self._get_period_totals(company_id, from_date, to_date)
        
        # Vorherige Periode (für Vergleich)
        prev_from = from_date - timedelta(days=period_days)
        prev_to = from_date - timedelta(days=1)
        previous = None
        if compare_previous:
            previous = self._get_period_totals(company_id, prev_from, prev_to)
        
        # Berechne Changes
        sent_change = None
        reply_change = None
        win_change = None
        
        if previous:
            if previous["sent"] > 0:
                sent_change = (current["sent"] - previous["sent"]) / previous["sent"]
            if previous["reply_rate"]:
                reply_change = current.get("reply_rate", 0) - previous["reply_rate"]
            if previous["win_rate"]:
                win_change = current.get("win_rate", 0) - previous["win_rate"]
        
        # Best Channel & Template
        channel_result = self.get_channel_analytics(
            company_id, ChannelAnalyticsQuery(from_date=from_date, to_date=to_date)
        )
        template_result = self.get_template_analytics(
            company_id, TemplateAnalyticsQuery(from_date=from_date, to_date=to_date, limit=1)
        )
        
        best_template_id = None
        best_template_name = None
        if template_result.results:
            best_template_id = template_result.results[0].template_id
            best_template_name = template_result.results[0].template_name
        
        return PerformanceSummary(
            period_start=from_date,
            period_end=to_date,
            total_sent=current["sent"],
            total_replied=current["replied"],
            total_positive=current["positive"],
            total_deals=current["won"],
            reply_rate=current.get("reply_rate"),
            positive_rate=current.get("positive_rate"),
            win_rate=current.get("win_rate"),
            sent_change=sent_change,
            reply_rate_change=reply_change,
            win_rate_change=win_change,
            best_channel=channel_result.best_channel_win_rate,
            best_template_id=best_template_id,
            best_template_name=best_template_name,
        )
    
    def _get_period_totals(
        self,
        company_id: str,
        from_date: date,
        to_date: date,
    ) -> Dict:
        """Holt Totals für eine Periode."""
        result = self.db.table("learning_aggregates").select(
            "events_sent, events_replied, events_positive_reply, events_deal_won"
        ).eq("company_id", company_id).gte(
            "period_start", from_date.isoformat()
        ).lte("period_start", to_date.isoformat()).execute()
        
        totals = {"sent": 0, "replied": 0, "positive": 0, "won": 0}
        for row in result.data or []:
            totals["sent"] += row.get("events_sent", 0)
            totals["replied"] += row.get("events_replied", 0)
            totals["positive"] += row.get("events_positive_reply", 0)
            totals["won"] += row.get("events_deal_won", 0)
        
        sent = totals["sent"]
        totals["reply_rate"] = totals["replied"] / sent if sent > 0 else None
        totals["positive_rate"] = totals["positive"] / sent if sent > 0 else None
        totals["win_rate"] = totals["won"] / sent if sent > 0 else None
        
        return totals
    
    # =========================================================================
    # DASHBOARD METRICS
    # =========================================================================
    
    def get_dashboard_metrics(
        self,
        company_id: str,
        days: int = 30,
    ) -> DashboardMetricsResponse:
        """
        Holt alle Dashboard-Metriken auf einen Blick.
        """
        to_date = date.today()
        from_date = to_date - timedelta(days=days)
        
        summary = self.get_performance_summary(
            company_id, from_date, to_date, compare_previous=True
        )
        
        def format_rate(rate: Optional[float]) -> str:
            if rate is None:
                return "-"
            return f"{rate * 100:.1f}%"
        
        def get_trend(change: Optional[float]) -> Optional[str]:
            if change is None:
                return None
            if change > 0.01:
                return "up"
            if change < -0.01:
                return "down"
            return "stable"
        
        return DashboardMetricsResponse(
            period_label=f"Letzte {days} Tage",
            messages_sent=DashboardMetric(
                label="Nachrichten gesendet",
                value=float(summary.total_sent),
                formatted_value=str(summary.total_sent),
                change_vs_previous=summary.sent_change,
                trend=get_trend(summary.sent_change),
            ),
            reply_rate=DashboardMetric(
                label="Reply-Rate",
                value=summary.reply_rate or 0,
                formatted_value=format_rate(summary.reply_rate),
                change_vs_previous=summary.reply_rate_change,
                trend=get_trend(summary.reply_rate_change),
            ),
            positive_rate=DashboardMetric(
                label="Positive Replies",
                value=summary.positive_rate or 0,
                formatted_value=format_rate(summary.positive_rate),
                change_vs_previous=None,
                trend=None,
            ),
            win_rate=DashboardMetric(
                label="Win-Rate",
                value=summary.win_rate or 0,
                formatted_value=format_rate(summary.win_rate),
                change_vs_previous=summary.win_rate_change,
                trend=get_trend(summary.win_rate_change),
            ),
            deals_closed=DashboardMetric(
                label="Abschlüsse",
                value=float(summary.total_deals),
                formatted_value=str(summary.total_deals),
                change_vs_previous=None,
                trend=None,
            ),
            top_channel=summary.best_channel,
            top_template=summary.best_template_name,
        )

