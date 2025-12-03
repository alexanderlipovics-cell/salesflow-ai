# backend/app/services/learning/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LEARNING SERVICE                                                          ║
║  Template-Performance Tracking & Analytics                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Verwaltet:
- Learning Events (Template-Nutzung tracken)
- Aggregationen berechnen
- Performance-Metriken abrufen

Updated: Mit Fallback für fehlende RPC-Funktionen
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from supabase import Client

from ...api.schemas.learning import (
    LearningEventType,
    OutcomeType,
    TemplateCategory,
    AggregateType,
    TrendDirection,
    LearningEventCreate,
    LearningEventResponse,
    TemplatePerformanceStats,
    TopTemplatesResponse,
    LearningAggregateResponse,
    ChannelBreakdown,
    CategoryBreakdown,
    AnalyticsKPI,
    AnalyticsDashboardResponse,
)


class LearningService:
    """
    Service für das Learning System.
    
    Tracked Template-Nutzung und berechnet Performance-Metriken.
    """
    
    def __init__(self, db: Client):
        """
        Initialisiert den Service.
        
        Args:
            db: Supabase Client
        """
        self.db = db
    
    # ═══════════════════════════════════════════════════════════════════════
    # LEARNING EVENTS
    # ═══════════════════════════════════════════════════════════════════════
    
    async def record_event(
        self,
        company_id: str,
        user_id: str,
        event: LearningEventCreate,
    ) -> LearningEventResponse:
        """
        Zeichnet ein Learning Event auf.
        
        Args:
            company_id: Company ID
            user_id: User ID
            event: Event-Daten
            
        Returns:
            Das erstellte Event
        """
        # Template-Info laden wenn vorhanden
        template_name = None
        template_category = None
        
        if event.template_id:
            template_result = self.db.table("templates").select(
                "name, category"
            ).eq("id", event.template_id).single().execute()
            
            if template_result.data:
                template_name = template_result.data.get("name")
                template_category = template_result.data.get("category")
        
        # Lead-Info laden wenn vorhanden
        lead_status = None
        lead_temperature = None
        
        if event.lead_id:
            lead_result = self.db.table("leads").select(
                "status, temperature"
            ).eq("id", event.lead_id).single().execute()
            
            if lead_result.data:
                lead_status = lead_result.data.get("status")
                lead_temperature = lead_result.data.get("temperature")
        
        # Event erstellen
        event_data = {
            "company_id": company_id,
            "user_id": user_id,
            "event_type": event.event_type.value,
            "template_id": event.template_id,
            "template_name": template_name,
            "template_category": template_category,
            "lead_id": event.lead_id,
            "lead_status": lead_status,
            "lead_temperature": lead_temperature,
            "channel": event.channel,
            "message_text": self._anonymize_message(event.message_text) if event.message_text else None,
            "message_word_count": len(event.message_text.split()) if event.message_text else None,
            "response_received": event.response_received,
            "response_time_hours": event.response_time_hours,
            "outcome": event.outcome.value if event.outcome else None,
            "outcome_value": event.outcome_value,
            "converted_to_next_stage": event.converted_to_next_stage,
            "metadata": event.metadata,
        }
        
        result = self.db.table("learning_events").insert(event_data).execute()
        
        if not result.data:
            raise Exception("Failed to create learning event")
        
        return LearningEventResponse(**result.data[0])
    
    async def get_events(
        self,
        company_id: str,
        user_id: Optional[str] = None,
        template_id: Optional[str] = None,
        event_type: Optional[LearningEventType] = None,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[LearningEventResponse]:
        """
        Lädt Learning Events mit Filtern.
        """
        query = self.db.table("learning_events").select("*").eq("company_id", company_id)
        
        if user_id:
            query = query.eq("user_id", user_id)
        if template_id:
            query = query.eq("template_id", template_id)
        if event_type:
            query = query.eq("event_type", event_type.value)
        if since:
            query = query.gte("created_at", since.isoformat())
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return [LearningEventResponse(**e) for e in (result.data or [])]
    
    # ═══════════════════════════════════════════════════════════════════════
    # TEMPLATE PERFORMANCE
    # ═══════════════════════════════════════════════════════════════════════
    
    async def get_template_performance(
        self,
        company_id: str,
        template_id: str,
    ) -> Optional[TemplatePerformanceStats]:
        """
        Lädt Performance-Statistiken für ein Template.
        """
        result = self.db.table("template_performance").select(
            "*, templates(name, category)"
        ).eq("template_id", template_id).single().execute()
        
        if not result.data:
            return None
        
        data = result.data
        template = data.get("templates", {})
        
        return TemplatePerformanceStats(
            template_id=template_id,
            template_name=template.get("name", "Unbekannt"),
            category=TemplateCategory(template.get("category", "custom")),
            total_uses=data.get("total_uses", 0),
            total_responses=data.get("total_responses", 0),
            total_conversions=data.get("total_conversions", 0),
            response_rate=data.get("response_rate", 0),
            conversion_rate=data.get("conversion_rate", 0),
            uses_last_30d=data.get("uses_last_30d", 0),
            response_rate_30d=data.get("response_rate_30d", 0),
            conversion_rate_30d=data.get("conversion_rate_30d", 0),
            quality_score=data.get("quality_score", 50),
            trend=TrendDirection(data.get("trend", "stable")),
        )
    
    async def get_top_templates(
        self,
        company_id: str,
        category: Optional[TemplateCategory] = None,
        limit: int = 10,
        days: int = 30,
    ) -> TopTemplatesResponse:
        """
        Lädt die Top-performenden Templates.
        
        Versucht zuerst die optimierte RPC-Funktion, fällt auf
        direkten Query zurück wenn die Funktion nicht existiert.
        Bei komplett fehlender DB werden Demo-Daten zurückgegeben.
        """
        templates = []
        
        try:
            # Versuch 1: Nutze die optimierte SQL-Funktion
            result = self.db.rpc(
                "get_top_templates",
                {"p_company_id": company_id, "p_limit": limit, "p_days": days}
            ).execute()
            
            for t in (result.data or []):
                # Kategorie-Filter anwenden
                if category and t.get("category") != category.value:
                    continue
                
                templates.append(TemplatePerformanceStats(
                    template_id=t.get("template_id"),
                    template_name=t.get("template_name", "Unbekannt"),
                    category=TemplateCategory(t.get("category", "custom")),
                    total_uses=t.get("total_uses", 0),
                    response_rate=t.get("response_rate", 0),
                    conversion_rate=t.get("conversion_rate", 0),
                    quality_score=t.get("quality_score", 50),
                ))
                
        except Exception as rpc_error:
            # Fallback 1: Direkter Query wenn RPC nicht verfügbar
            try:
                query = self.db.table("templates").select(
                    "id, name, category, company_id"
                ).eq("company_id", company_id).eq("is_active", True)
                
                if category:
                    query = query.eq("category", category.value)
                
                template_result = query.limit(limit).execute()
                
                for t in (template_result.data or []):
                    cat_value = t.get("category", "custom")
                    try:
                        cat_enum = TemplateCategory(cat_value)
                    except ValueError:
                        cat_enum = TemplateCategory.custom
                    
                    templates.append(TemplatePerformanceStats(
                        template_id=t.get("id"),
                        template_name=t.get("name", "Unbekannt"),
                        category=cat_enum,
                        total_uses=0,
                        response_rate=0.0,
                        conversion_rate=0.0,
                        quality_score=50.0,
                    ))
            except Exception:
                # Fallback 2: Demo-Daten wenn DB nicht verfügbar
                templates = self._get_demo_templates(category, limit)
        
        # Total count
        try:
            total_result = self.db.table("templates").select(
                "id", count="exact"
            ).eq("company_id", company_id).eq("is_active", True).execute()
            total_count = total_result.count or 0
        except Exception:
            total_count = len(templates)
        
        return TopTemplatesResponse(
            templates=templates,
            period_days=days,
            total_templates=total_count,
        )
    
    def _get_demo_templates(
        self, 
        category: Optional[TemplateCategory] = None, 
        limit: int = 10
    ) -> List[TemplatePerformanceStats]:
        """Gibt Demo-Templates zurück wenn DB nicht verfügbar."""
        demo_templates = [
            TemplatePerformanceStats(
                template_id="demo_1",
                template_name="Erstkontakt - Neugierig machen",
                category=TemplateCategory.first_contact,
                total_uses=127,
                total_responses=48,
                total_conversions=12,
                response_rate=37.8,
                conversion_rate=9.4,
                quality_score=78.5,
                trend=TrendDirection.improving,
            ),
            TemplatePerformanceStats(
                template_id="demo_2",
                template_name="Follow-up nach Story",
                category=TemplateCategory.follow_up,
                total_uses=89,
                total_responses=42,
                total_conversions=8,
                response_rate=47.2,
                conversion_rate=9.0,
                quality_score=82.3,
                trend=TrendDirection.stable,
            ),
            TemplatePerformanceStats(
                template_id="demo_3",
                template_name="Terminvereinbarung",
                category=TemplateCategory.closing,
                total_uses=64,
                total_responses=38,
                total_conversions=22,
                response_rate=59.4,
                conversion_rate=34.4,
                quality_score=91.2,
                trend=TrendDirection.improving,
            ),
            TemplatePerformanceStats(
                template_id="demo_4",
                template_name="Einwand: Keine Zeit",
                category=TemplateCategory.objection_handler,
                total_uses=45,
                total_responses=28,
                total_conversions=11,
                response_rate=62.2,
                conversion_rate=24.4,
                quality_score=85.7,
                trend=TrendDirection.stable,
            ),
            TemplatePerformanceStats(
                template_id="demo_5",
                template_name="Reaktivierung - Warm Lead",
                category=TemplateCategory.reactivation,
                total_uses=33,
                total_responses=14,
                total_conversions=4,
                response_rate=42.4,
                conversion_rate=12.1,
                quality_score=68.9,
                trend=TrendDirection.declining,
            ),
        ]
        
        # Kategorie-Filter
        if category:
            demo_templates = [t for t in demo_templates if t.category == category]
        
        return demo_templates[:limit]
    
    def _get_demo_aggregate(
        self,
        aggregate_type: AggregateType,
        period_start: date,
        period_end: date,
    ) -> LearningAggregateResponse:
        """Gibt Demo-Aggregat zurück wenn DB nicht verfügbar."""
        return LearningAggregateResponse(
            aggregate_type=aggregate_type,
            period_start=period_start,
            period_end=period_end,
            total_events=358,
            templates_used=12,
            unique_leads=89,
            responses_received=156,
            response_rate=43.6,
            avg_response_time_hours=4.2,
            positive_outcomes=42,
            negative_outcomes=18,
            conversion_rate=11.7,
            appointments_booked=28,
            deals_closed=14,
            total_deal_value=4200.0,
            channel_breakdown=[
                ChannelBreakdown(
                    channel="instagram",
                    sent=145,
                    responses=68,
                    response_rate=46.9,
                    conversions=18,
                    conversion_rate=12.4,
                ),
                ChannelBreakdown(
                    channel="whatsapp",
                    sent=112,
                    responses=52,
                    response_rate=46.4,
                    conversions=15,
                    conversion_rate=13.4,
                ),
                ChannelBreakdown(
                    channel="facebook",
                    sent=68,
                    responses=24,
                    response_rate=35.3,
                    conversions=6,
                    conversion_rate=8.8,
                ),
                ChannelBreakdown(
                    channel="linkedin",
                    sent=33,
                    responses=12,
                    response_rate=36.4,
                    conversions=3,
                    conversion_rate=9.1,
                ),
            ],
            category_breakdown=[
                CategoryBreakdown(
                    category=TemplateCategory.first_contact,
                    templates_used=4,
                    total_uses=145,
                    avg_response_rate=38.6,
                    avg_conversion_rate=8.3,
                ),
                CategoryBreakdown(
                    category=TemplateCategory.follow_up,
                    templates_used=3,
                    total_uses=98,
                    avg_response_rate=48.0,
                    avg_conversion_rate=12.2,
                ),
                CategoryBreakdown(
                    category=TemplateCategory.closing,
                    templates_used=2,
                    total_uses=64,
                    avg_response_rate=59.4,
                    avg_conversion_rate=34.4,
                ),
                CategoryBreakdown(
                    category=TemplateCategory.objection_handler,
                    templates_used=3,
                    total_uses=51,
                    avg_response_rate=56.9,
                    avg_conversion_rate=21.6,
                ),
            ],
        )
    
    # ═══════════════════════════════════════════════════════════════════════
    # AGGREGATES
    # ═══════════════════════════════════════════════════════════════════════
    
    async def get_aggregate(
        self,
        company_id: str,
        aggregate_type: AggregateType,
        period_start: date,
        period_end: date,
        user_id: Optional[str] = None,
    ) -> Optional[LearningAggregateResponse]:
        """
        Lädt ein Aggregat für einen Zeitraum.
        """
        query = self.db.table("learning_aggregates").select("*").eq(
            "company_id", company_id
        ).eq(
            "aggregate_type", aggregate_type.value
        ).eq(
            "period_start", period_start.isoformat()
        ).eq(
            "period_end", period_end.isoformat()
        )
        
        if user_id:
            query = query.eq("user_id", user_id)
        else:
            query = query.is_("user_id", "null")
        
        result = query.single().execute()
        
        if not result.data:
            return None
        
        return self._parse_aggregate(result.data)
    
    async def compute_aggregate(
        self,
        company_id: str,
        aggregate_type: AggregateType,
        period_start: date,
        period_end: date,
        user_id: Optional[str] = None,
    ) -> LearningAggregateResponse:
        """
        Berechnet ein Aggregat für einen Zeitraum.
        Gibt Demo-Daten zurück wenn DB nicht verfügbar.
        """
        events = []
        
        try:
            # Events für den Zeitraum laden
            query = self.db.table("learning_events").select("*").eq(
                "company_id", company_id
            ).gte(
                "created_at", period_start.isoformat()
            ).lte(
                "created_at", period_end.isoformat()
            )
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.execute()
            events = result.data or []
        except Exception:
            # DB nicht verfügbar - gib Demo-Aggregat zurück
            return self._get_demo_aggregate(aggregate_type, period_start, period_end)
        
        # Metriken berechnen
        total_events = len(events)
        template_ids = set(e.get("template_id") for e in events if e.get("template_id"))
        lead_ids = set(e.get("lead_id") for e in events if e.get("lead_id"))
        
        responses = [e for e in events if e.get("response_received")]
        conversions = [e for e in events if e.get("converted_to_next_stage")]
        
        positive = [e for e in events if e.get("event_type") == "positive_outcome"]
        negative = [e for e in events if e.get("event_type") == "negative_outcome"]
        
        appointments = [e for e in events if e.get("outcome") == "appointment_booked"]
        deals = [e for e in events if e.get("outcome") == "deal_closed"]
        deal_value = sum(e.get("outcome_value", 0) or 0 for e in deals)
        
        # Response Time berechnen
        response_times = [e.get("response_time_hours") for e in responses if e.get("response_time_hours")]
        avg_response_time = sum(response_times) / len(response_times) if response_times else None
        
        # Channel Breakdown
        channels: Dict[str, Dict[str, int]] = {}
        for e in events:
            ch = e.get("channel", "other")
            if ch not in channels:
                channels[ch] = {"sent": 0, "responses": 0, "conversions": 0}
            channels[ch]["sent"] += 1
            if e.get("response_received"):
                channels[ch]["responses"] += 1
            if e.get("converted_to_next_stage"):
                channels[ch]["conversions"] += 1
        
        channel_breakdown = [
            ChannelBreakdown(
                channel=ch,
                sent=data["sent"],
                responses=data["responses"],
                response_rate=(data["responses"] / data["sent"] * 100) if data["sent"] > 0 else 0,
                conversions=data["conversions"],
                conversion_rate=(data["conversions"] / data["sent"] * 100) if data["sent"] > 0 else 0,
            )
            for ch, data in channels.items()
        ]
        
        # Category Breakdown
        categories: Dict[str, Dict[str, Any]] = {}
        for e in events:
            cat = e.get("template_category", "custom")
            if cat not in categories:
                categories[cat] = {"templates": set(), "uses": 0, "responses": 0, "conversions": 0}
            if e.get("template_id"):
                categories[cat]["templates"].add(e.get("template_id"))
            categories[cat]["uses"] += 1
            if e.get("response_received"):
                categories[cat]["responses"] += 1
            if e.get("converted_to_next_stage"):
                categories[cat]["conversions"] += 1
        
        category_breakdown = [
            CategoryBreakdown(
                category=TemplateCategory(cat) if cat in [c.value for c in TemplateCategory] else TemplateCategory.custom,
                templates_used=len(data["templates"]),
                total_uses=data["uses"],
                avg_response_rate=(data["responses"] / data["uses"] * 100) if data["uses"] > 0 else 0,
                avg_conversion_rate=(data["conversions"] / data["uses"] * 100) if data["uses"] > 0 else 0,
            )
            for cat, data in categories.items()
        ]
        
        # Aggregate erstellen
        aggregate_data = {
            "company_id": company_id,
            "aggregate_type": aggregate_type.value,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "user_id": user_id,
            "total_events": total_events,
            "templates_used": len(template_ids),
            "unique_leads": len(lead_ids),
            "responses_received": len(responses),
            "response_rate": (len(responses) / total_events * 100) if total_events > 0 else 0,
            "avg_response_time_hours": avg_response_time,
            "positive_outcomes": len(positive),
            "negative_outcomes": len(negative),
            "conversion_rate": (len(conversions) / total_events * 100) if total_events > 0 else 0,
            "appointments_booked": len(appointments),
            "deals_closed": len(deals),
            "total_deal_value": deal_value,
            "channel_breakdown": {ch: {"sent": d["sent"], "responses": d["responses"]} for ch, d in channels.items()},
            "computed_at": datetime.utcnow().isoformat(),
        }
        
        # Upsert in DB
        self.db.table("learning_aggregates").upsert(
            aggregate_data,
            on_conflict="company_id,aggregate_type,period_start,template_id,user_id"
        ).execute()
        
        return LearningAggregateResponse(
            aggregate_type=aggregate_type,
            period_start=period_start,
            period_end=period_end,
            total_events=total_events,
            templates_used=len(template_ids),
            unique_leads=len(lead_ids),
            responses_received=len(responses),
            response_rate=aggregate_data["response_rate"],
            avg_response_time_hours=avg_response_time,
            positive_outcomes=len(positive),
            negative_outcomes=len(negative),
            conversion_rate=aggregate_data["conversion_rate"],
            appointments_booked=len(appointments),
            deals_closed=len(deals),
            total_deal_value=deal_value,
            channel_breakdown=channel_breakdown,
            category_breakdown=category_breakdown,
        )
    
    # ═══════════════════════════════════════════════════════════════════════
    # DASHBOARD
    # ═══════════════════════════════════════════════════════════════════════
    
    async def get_dashboard(
        self,
        company_id: str,
        period: str = "last_30d",
        user_id: Optional[str] = None,
    ) -> AnalyticsDashboardResponse:
        """
        Lädt Dashboard-Daten für Analytics.
        
        Args:
            company_id: Company ID
            period: "last_7d", "last_30d", "this_month"
            user_id: Optional User-Filter
        """
        today = date.today()
        
        # Zeitraum bestimmen
        if period == "last_7d":
            period_start = today - timedelta(days=7)
            period_end = today
        elif period == "last_30d":
            period_start = today - timedelta(days=30)
            period_end = today
        elif period == "this_month":
            period_start = today.replace(day=1)
            period_end = today
        else:
            period_start = today - timedelta(days=30)
            period_end = today
        
        # Vorperiode für Vergleich
        period_length = (period_end - period_start).days
        prev_period_start = period_start - timedelta(days=period_length)
        prev_period_end = period_start - timedelta(days=1)
        
        # Aktuelles Aggregat
        current_aggregate = await self.compute_aggregate(
            company_id, AggregateType.daily, period_start, period_end, user_id
        )
        
        # Vorperioden-Aggregat
        prev_aggregate = await self.compute_aggregate(
            company_id, AggregateType.daily, prev_period_start, prev_period_end, user_id
        )
        
        # KPIs berechnen
        kpis = self._compute_kpis(current_aggregate, prev_aggregate)
        
        # Top Templates laden
        top_templates = await self.get_top_templates(company_id, limit=5, days=period_length)
        
        return AnalyticsDashboardResponse(
            period=period,
            period_start=period_start,
            period_end=period_end,
            kpis=kpis,
            top_templates=top_templates.templates,
            channel_breakdown=current_aggregate.channel_breakdown,
            category_breakdown=current_aggregate.category_breakdown,
        )
    
    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    def _anonymize_message(self, text: str) -> str:
        """Anonymisiert personenbezogene Daten in Nachrichten."""
        import re
        
        # E-Mails anonymisieren
        text = re.sub(r'\b[\w.-]+@[\w.-]+\.\w+\b', '[EMAIL]', text)
        
        # Telefonnummern anonymisieren
        text = re.sub(r'\b\+?[\d\s\-().]{10,}\b', '[PHONE]', text)
        
        # URLs kürzen
        text = re.sub(r'https?://\S+', '[URL]', text)
        
        return text
    
    def _parse_aggregate(self, data: dict) -> LearningAggregateResponse:
        """Parsed DB-Daten zu LearningAggregateResponse."""
        # Channel Breakdown parsen
        channel_breakdown_raw = data.get("channel_breakdown", {})
        channel_breakdown = [
            ChannelBreakdown(
                channel=ch,
                sent=info.get("sent", 0),
                responses=info.get("responses", 0),
                response_rate=(info.get("responses", 0) / info.get("sent", 1) * 100) if info.get("sent", 0) > 0 else 0,
            )
            for ch, info in channel_breakdown_raw.items()
        ]
        
        return LearningAggregateResponse(
            aggregate_type=AggregateType(data.get("aggregate_type", "daily")),
            period_start=date.fromisoformat(data.get("period_start")),
            period_end=date.fromisoformat(data.get("period_end")),
            total_events=data.get("total_events", 0),
            templates_used=data.get("templates_used", 0),
            unique_leads=data.get("unique_leads", 0),
            responses_received=data.get("responses_received", 0),
            response_rate=data.get("response_rate", 0),
            avg_response_time_hours=data.get("avg_response_time_hours"),
            positive_outcomes=data.get("positive_outcomes", 0),
            negative_outcomes=data.get("negative_outcomes", 0),
            conversion_rate=data.get("conversion_rate", 0),
            appointments_booked=data.get("appointments_booked", 0),
            deals_closed=data.get("deals_closed", 0),
            total_deal_value=data.get("total_deal_value", 0),
            channel_breakdown=channel_breakdown,
        )
    
    def _compute_kpis(
        self,
        current: LearningAggregateResponse,
        previous: LearningAggregateResponse,
    ) -> List[AnalyticsKPI]:
        """Berechnet KPIs mit Trend-Vergleich."""
        kpis = []
        
        # Response Rate
        rr_change = None
        rr_trend = TrendDirection.stable
        if previous.response_rate > 0:
            rr_change = ((current.response_rate - previous.response_rate) / previous.response_rate) * 100
            rr_trend = TrendDirection.improving if rr_change > 5 else (TrendDirection.declining if rr_change < -5 else TrendDirection.stable)
        
        kpis.append(AnalyticsKPI(
            id="response_rate",
            label="Antwortrate",
            value=current.response_rate,
            previous_value=previous.response_rate,
            change_percent=rr_change,
            trend=rr_trend,
            unit="%",
        ))
        
        # Conversion Rate
        cr_change = None
        cr_trend = TrendDirection.stable
        if previous.conversion_rate > 0:
            cr_change = ((current.conversion_rate - previous.conversion_rate) / previous.conversion_rate) * 100
            cr_trend = TrendDirection.improving if cr_change > 5 else (TrendDirection.declining if cr_change < -5 else TrendDirection.stable)
        
        kpis.append(AnalyticsKPI(
            id="conversion_rate",
            label="Conversion Rate",
            value=current.conversion_rate,
            previous_value=previous.conversion_rate,
            change_percent=cr_change,
            trend=cr_trend,
            unit="%",
        ))
        
        # Total Events
        events_change = None
        events_trend = TrendDirection.stable
        if previous.total_events > 0:
            events_change = ((current.total_events - previous.total_events) / previous.total_events) * 100
            events_trend = TrendDirection.improving if events_change > 10 else (TrendDirection.declining if events_change < -10 else TrendDirection.stable)
        
        kpis.append(AnalyticsKPI(
            id="total_events",
            label="Nachrichten",
            value=current.total_events,
            previous_value=previous.total_events,
            change_percent=events_change,
            trend=events_trend,
            unit="",
        ))
        
        # Termine gebucht
        appointments_change = None
        if previous.appointments_booked > 0:
            appointments_change = ((current.appointments_booked - previous.appointments_booked) / previous.appointments_booked) * 100
        
        kpis.append(AnalyticsKPI(
            id="appointments",
            label="Termine",
            value=current.appointments_booked,
            previous_value=previous.appointments_booked,
            change_percent=appointments_change,
            trend=TrendDirection.improving if (appointments_change or 0) > 0 else TrendDirection.stable,
            unit="",
        ))
        
        # Deals
        kpis.append(AnalyticsKPI(
            id="deals",
            label="Abschlüsse",
            value=current.deals_closed,
            previous_value=previous.deals_closed,
            trend=TrendDirection.improving if current.deals_closed > previous.deals_closed else TrendDirection.stable,
            unit="",
        ))
        
        # Deal Value
        kpis.append(AnalyticsKPI(
            id="deal_value",
            label="Umsatz",
            value=current.total_deal_value,
            previous_value=previous.total_deal_value,
            trend=TrendDirection.improving if current.total_deal_value > previous.total_deal_value else TrendDirection.stable,
            unit="€",
        ))
        
        return kpis


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_service_instance: Optional[LearningService] = None


def get_learning_service(db: Client) -> LearningService:
    """Factory für LearningService."""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = LearningService(db)
    
    return _service_instance
