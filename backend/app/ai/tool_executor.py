from typing import Any, Dict, List, Optional
import json
from datetime import datetime, timedelta, timezone
import os
import logging
import uuid
import httpx

logger = logging.getLogger(__name__)


class ToolExecutor:
    def __init__(self, db, user_id: str, user_context: dict):
        self.db = db
        self.user_id = user_id
        self.user_context = user_context

    async def execute(self, tool_name: str, arguments: dict) -> Any:
        """Execute a tool and return the result."""

        executor_map = {
            "query_leads": self._query_leads,
            "get_leads": self._query_leads,  # alias for legacy prompt wording
            "get_lead_details": self._get_lead_details,
            "query_follow_ups": self._query_follow_ups,
            "get_followup_suggestions": self._get_followup_suggestions,
            "start_followup_flow": self._start_followup_flow,
            "get_followup_stats": self._get_followup_stats,
            "bulk_create_followups": self._bulk_create_followups,
            "get_performance_stats": self._get_performance_stats,
            "get_commission_status": self._get_commission_status,
            "get_churn_risks": self._get_churn_risks,
            "get_objection_scripts": self._get_objection_scripts,
            "get_calendar_events": self._get_calendar_events,
            "web_search": self._web_search,
            "search_nearby_places": self._search_nearby_places,
            "write_message": self._write_message,
            "handle_objection": self._handle_objection,
            "create_lead": self._create_lead,
            "create_task": self._create_task,
            "create_followup": self._create_followup_suggestion,
            "create_follow_up": self._create_followup_suggestion,
            "update_follow_up": self._update_followup_suggestion,
            "log_interaction": self._log_interaction,
            "generate_customer_protocol": self._generate_customer_protocol,
            "update_lead_status": self._update_lead_status,
            "start_power_hour": self._start_power_hour,
            "get_lead_history": self._get_lead_history,
            "get_today_summary": self._get_today_summary,
            "quick_update_lead": self._quick_update_lead,
            "search_by_tag": self._search_by_tag,
            "get_pipeline_stats": self._get_pipeline_stats,
            "research_company": self._research_company,
            "schedule_meeting": self._schedule_meeting,
            "prepare_message": self._prepare_message,
            "save_user_knowledge": self._save_user_knowledge,
            "save_user_preference": self._save_user_preference,
            "convert_to_customer": self._convert_to_customer,
            "generate_sequence_messages": self._generate_sequence_messages,
            "update_lead_stage": self._update_lead_stage,
            "log_message_sent": self._log_message_sent,
        }

        if tool_name not in executor_map:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            logger.info(f"Executing tool: {tool_name} with args: {arguments}, user_id={self.user_id}")
            result = await executor_map[tool_name](**arguments)
            logger.info(f"Tool {tool_name} result: {result}")
            return result
        except Exception as e:  # noqa: BLE001
            return {"error": str(e)}

    # ─────────────────────────────────────────────────────────
    # DATABASE QUERIES
    # ─────────────────────────────────────────────────────────

    async def _query_leads(
        self,
        status: str = None,
        inactive_days: int = None,  # deprecated
        company: str = None,
        tag: str = None,
        hot_only: bool = False,
        limit: int = 50,
        order_by: str = "last_contact",
    ) -> dict:
        """Query leads with filters."""

        logger.info(
            "query_leads start",
            extra={
                "user_id": self.user_id,
                "status": status,
                "company": company,
                "tag": tag,
                "hot_only": hot_only,
                "limit": limit,
                "order_by": order_by,
            },
        )

        query = (
            self.db.table("leads")
            .select("id, name, email, phone, company, status, temperature, created_at, tags")
            .eq("user_id", self.user_id)
        )

        if status:
            skip_filter_keywords = ["all", "alle", "any", "meine", "show", "zeig", ""]
            if status.lower() not in skip_filter_keywords:
                query = query.eq("status", status)

        if company:
            query = query.ilike("company", f"%{company}%")

        if hot_only:
            query = query.gte("temperature", 70)

        if order_by == "score":
            query = query.order("temperature", desc=True)
        elif order_by == "last_contact":
            query = query.order("created_at", desc=True)
        elif order_by == "created_at":
            query = query.order("created_at", desc=True)

        query = query.limit(limit)

        result = query.execute()
        leads_data = result.data if result else []
        count = len(leads_data) if leads_data else 0

        logger.info(
            "query_leads done",
            extra={"user_id": self.user_id, "count": count},
        )

        return {"count": count, "leads": leads_data or []}

    async def _bulk_create_followups(self, args: dict) -> dict:
        """Erstellt Follow-ups für alle/gefilterte Leads."""
        from datetime import datetime, timedelta

        status_filter = args.get("status_filter", "") or ""
        days = args.get("days_until_due", 1) or 1
        priority = args.get("priority", "medium") or "medium"

        query = self.db.table("leads").select("id, name, status").eq("user_id", self.user_id)
        if status_filter:
            query = query.eq("status", status_filter)

        leads_result = query.execute()
        leads = leads_result.data if leads_result and leads_result.data else []

        if not leads:
            return {"success": False, "message": "Keine Leads gefunden", "created": 0}

        due_date = (datetime.now() + timedelta(days=days)).isoformat()
        created = 0
        skipped = 0

        for lead in leads:
            existing = (
                self.db.table("followup_suggestions")
                .select("id")
                .eq("lead_id", lead["id"])
                .eq("status", "pending")
                .execute()
            )

            if existing and existing.data:
                skipped += 1
                continue

            try:
                self.db.table("followup_suggestions").insert(
                    {
                        "user_id": self.user_id,
                        "lead_id": lead["id"],
                        "due_at": due_date,
                        "priority": priority,
                        "type": "follow_up",
                        "status": "pending",
                        "suggested_action": f"Follow-up mit {lead.get('name') or 'Lead'}",
                    }
                ).execute()
                created += 1
            except Exception as e:
                logger.error(f"Error creating followup for {lead.get('name')}: {e}", exc_info=True)

        return {
            "success": True,
            "created": created,
            "skipped": skipped,
            "total_leads": len(leads),
            "message": f"✅ {created} Follow-ups erstellt! ({skipped} bereits vorhanden)",
        }

    async def _get_lead_details(
        self,
        lead_id: str = None,
        lead_name: str = None,
    ) -> dict:
        """Get detailed info about a specific lead."""

        resolved_lead_id = lead_id
        if lead_name and not resolved_lead_id:
            search = (
            self.db.table("leads")
                .select("id")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{lead_name}%")
                .limit(1)
                .execute()
            )

            if search.data:
                resolved_lead_id = search.data[0]["id"]
            else:
                return {"error": f"Lead '{lead_name}' nicht gefunden"}

        lead = (
            self.db.table("leads")
            .select("*")
            .eq("id", resolved_lead_id)
            .single()
            .execute()
        )

        return lead.data if lead else {}

    async def _query_follow_ups(
        self,
        timeframe: str = "today",
        priority: str = "all",
        limit: int = None,  # ← War: limit: int = 10
    ) -> dict:
        """Query follow-ups from the unified followup_suggestions table."""

        now = datetime.utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)

        query = (
            self.db.table("followup_suggestions")
            .select(
                "id, title, due_at, priority, status, channel, flow, stage, template_key, "
                "lead_id, suggested_message, leads(name, company)"
            )
            .eq("user_id", self.user_id)
            .eq("status", "pending")
        )

        # Auto-determine limit based on timeframe
        if limit is None:
            if timeframe in ("all", "next_week", "this_week"):
                limit = 100
            else:
                limit = 20

        if timeframe == "today":
            query = query.gte("due_at", start_of_day.isoformat()).lte("due_at", end_of_day.isoformat())
        elif timeframe == "tomorrow":
            tomorrow_start = (start_of_day + timedelta(days=1)).isoformat()
            tomorrow_end = (end_of_day + timedelta(days=1)).isoformat()
            query = query.gte("due_at", tomorrow_start).lte("due_at", tomorrow_end)
        elif timeframe == "this_week":
            week_end = end_of_day + timedelta(days=(6 - now.weekday()))
            query = query.lte("due_at", week_end.isoformat())
        elif timeframe == "next_week":
            next_week_start = start_of_day + timedelta(days=(7 - now.weekday()))
            next_week_end = next_week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
            query = query.gte("due_at", next_week_start.isoformat()).lte("due_at", next_week_end.isoformat())
        elif timeframe == "overdue":
            query = query.lt("due_at", now.isoformat())
        # timeframe == "all" → no date filter

        if priority != "all":
            query = query.eq("priority", priority)

        result = query.order("due_at").limit(limit).execute()

        return {
            "count": len(result.data) if result and result.data else 0,
            "follow_ups": result.data if result else [],
        }

    async def _get_followup_suggestions(self, limit: int = 50, status: str = "pending") -> Any:
        """Hole fällige Follow-up Vorschläge (nächste 7 Tage)."""
        end_of_range = (datetime.utcnow() + timedelta(days=7)).isoformat()

        result = (
            self.db.table("followup_suggestions")
            .select("*, leads(name, company, phone, email)")
            .eq("user_id", self.user_id)
            .eq("status", status)
            .lte("due_at", end_of_range)
            .order("due_at")
            .limit(limit)
            .execute()
        )

        if not result.data:
            return "🎉 Keine Follow-ups fällig! Du bist auf dem neuesten Stand."

        suggestions = result.data
        response = f"📋 **{len(suggestions)} Follow-ups fällig:**\n\n"

        for i, s in enumerate(suggestions, 1):
            lead = s.get("leads", {}) or {}
            response += f"{i}. **{lead.get('name', 'Unbekannt')}**"
            if lead.get("company"):
                response += f" ({lead['company']})"
            response += f"\n   📝 {s.get('reason', 'Follow-up')}\n"
            
            # Zeige previous_message wenn vorhanden (für Kontext)
            previous_msg = s.get("previous_message")
            previous_type = s.get("previous_message_type")
            if previous_msg:
                msg_preview = previous_msg[:80] + "..." if len(previous_msg) > 80 else previous_msg
                response += f"   📨 Letzte Nachricht ({previous_type or 'generic'}): _{msg_preview}_\n"
            
            snippet = (s.get("suggested_message") or "").strip()
            if len(snippet) > 60:
                snippet = snippet[:60] + "..."
            response += f"   💬 _{snippet}_\n\n"

        response += "\nSoll ich eine Nachricht vorbereiten oder einen überspringen?"
        return response

    async def _start_followup_flow(self, lead_id: str, flow: str) -> Any:
        """Startet Follow-up Flow und setzt nächste Stage."""

        # Name → ID Auflösung
        actual_lead_id = lead_id
        try:
            uuid.UUID(lead_id)  # Test ob gültige UUID
        except ValueError:
            # lead_id ist ein Name, Lead suchen
            result = self.db.from_("leads") \
                .select("id") \
                .eq("user_id", self.user_id) \
                .ilike("name", f"%{lead_id}%") \
                .limit(1) \
                .execute()

            if not result.data:
                return {"success": False, "error": f"Lead '{lead_id}' nicht gefunden"}
            actual_lead_id = result.data[0]["id"]

        rule = (
            self.db.table("followup_rules")
            .select("*")
            .eq("flow", flow)
            .eq("stage", 0)
            .single()
            .execute()
        )

        if not rule.data:
            return {"error": f"Flow '{flow}' nicht gefunden"}

        next_followup = datetime.utcnow() + timedelta(days=rule.data["wait_days"])

        self.db.table("leads").update(
            {
                "flow": flow,
                "follow_up_stage": 0,
                "next_follow_up_at": next_followup.isoformat(),
                "last_outreach_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", actual_lead_id).eq("user_id", self.user_id).execute()

        return {
            "success": True,
            "message": f"Flow '{flow}' gestartet",
            "next_followup_at": next_followup.isoformat(),
        }

    async def _get_followup_stats(self) -> Any:
        """Holt Follow-up Statistiken."""
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

        pending = (
            self.db.table("followup_suggestions")
            .select("id", count="exact")
            .eq("user_id", self.user_id)
            .eq("status", "pending")
            .execute()
        )

        sent = (
            self.db.table("followup_suggestions")
            .select("id", count="exact")
            .eq("user_id", self.user_id)
            .eq("status", "sent")
            .gte("sent_at", week_ago)
            .execute()
        )

        in_flow = (
            self.db.table("leads")
            .select("id", count="exact")
            .eq("user_id", self.user_id)
            .not_.is_("flow", "null")
            .execute()
        )

        return (
            f"📊 **Follow-up Statistiken:**\n\n"
            f"• **{pending.count or 0}** Follow-ups offen\n"
            f"• **{sent.count or 0}** diese Woche gesendet\n"
            f"• **{in_flow.count or 0}** Leads in aktiven Flows\n\n"
            f"Frag mich nach den offenen Follow-ups um loszulegen!"
        )

    async def _get_performance_stats(
        self,
        period: str = "this_month",
        metrics: list = None,  # noqa: ARG002
    ) -> dict:
        """Get user performance statistics."""

        now = datetime.now()

        if period == "today":
            start = now.replace(hour=0, minute=0, second=0)
        elif period == "yesterday":
            start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0)
            now = now.replace(hour=0, minute=0, second=0)
        elif period == "this_week":
            start = now - timedelta(days=now.weekday())
        elif period == "last_week":
            start = now - timedelta(days=now.weekday() + 7)
            now = now - timedelta(days=now.weekday())
        elif period == "this_month":
            start = now.replace(day=1)
        elif period == "last_month":
            start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
            now = now.replace(day=1)
        else:
            start = now.replace(day=1)

        interactions = (
            self.db.table("lead_interactions")
            .select("type, outcome, created_at")
            .eq("user_id", self.user_id)
            .gte("created_at", start.isoformat())
            .execute()
        )

        deals = (
            self.db.table("deals")
            .select("status, value, closed_at")
            .eq("user_id", self.user_id)
            .gte("closed_at", start.isoformat())
            .execute()
        )

        interactions_data = interactions.data if interactions else []
        deals_data = deals.data if deals else []

        stats = {
            "period": period,
            "calls": len([i for i in interactions_data if i.get("type") == "call"]),
            "meetings": len([i for i in interactions_data if i.get("type") == "meeting"]),
            "emails": len([i for i in interactions_data if i.get("type") == "email"]),
            "deals_won": len([d for d in deals_data if d.get("status") == "won"]),
            "deals_lost": len([d for d in deals_data if d.get("status") == "lost"]),
            "revenue": sum([d.get("value") or 0 for d in deals_data if d.get("status") == "won"]),
            "total_activities": len(interactions_data),
        }

        total_deals = stats["deals_won"] + stats["deals_lost"]
        stats["conversion_rate"] = (stats["deals_won"] / total_deals * 100) if total_deals > 0 else 0

        return stats

    async def _get_commission_status(self, period: str = "this_month") -> dict:
        """Get commission status and goal progress."""

        user = (
            self.db.table("profiles")
            .select("monthly_revenue_goal")
            .eq("id", self.user_id)
            .single()
            .execute()
        )

        goal = user.data.get("monthly_revenue_goal", 0) if user and user.data else 0

        stats = await self._get_performance_stats(period=period)
        current = stats["revenue"]

        return {
            "period": period,
            "current_revenue": current,
            "goal": goal,
            "percentage": (current / goal * 100) if goal > 0 else 0,
            "remaining": max(0, goal - current),
        }

    async def _get_churn_risks(
        self,
        risk_level: str = "all",
        limit: int = 5,
    ) -> dict:
        """Get leads/customers at risk of churning."""

        cutoff_high = datetime.now() - timedelta(days=60)
        cutoff_medium = datetime.now() - timedelta(days=30)

        query = (
            self.db.table("leads")
            .select("id, name, company, status, last_contact, score")
            .eq("user_id", self.user_id)
            .eq("status", "won")
        )

        if risk_level == "high":
            query = query.lt("last_contact", cutoff_high.isoformat())
        elif risk_level == "medium":
            query = query.lt("last_contact", cutoff_medium.isoformat())
            query = query.gte("last_contact", cutoff_high.isoformat())
        else:
            query = query.lt("last_contact", cutoff_medium.isoformat())

        query = query.order("last_contact").limit(limit)

        result = query.execute()
        leads = result.data if result else []

        for lead in leads:
            last_contact = (
                datetime.fromisoformat(lead["last_contact"])
                if lead.get("last_contact")
                else None
            )
            if last_contact:
                days_since = (datetime.now() - last_contact).days
                lead["days_since_contact"] = days_since
                lead["risk_level"] = "high" if days_since > 60 else "medium"

        return {
            "count": len(leads),
            "at_risk_customers": leads,
        }

    async def _get_objection_scripts(
        self,
        objection_type: str = None,
        category: str = None,
        limit: int = 3,
    ) -> dict:
        """Get objection handling scripts."""

        query = self.db.table("objections").select(
            "id, title, objection, response, category, tags"
        )

        if category:
            query = query.eq("category", category)

        if objection_type:
            query = query.or_(
                f"title.ilike.%{objection_type}%,"
                f"objection.ilike.%{objection_type}%,"
                f"tags.cs.{{{objection_type}}}"
            )

        query = query.limit(limit)

        result = query.execute()

        return {
            "count": len(result.data) if result and result.data else 0,
            "scripts": result.data if result else [],
        }

    async def _get_calendar_events(self, timeframe: str = "today") -> dict:
        """Get calendar events."""

        now = datetime.now()

        if timeframe == "today":
            start = now.replace(hour=0, minute=0, second=0)
            end = now.replace(hour=23, minute=59, second=59)
        elif timeframe == "tomorrow":
            start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0)
            end = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
        elif timeframe == "this_week":
            start = now
            end = now + timedelta(days=(6 - now.weekday()))
        else:
            start = now
            end = now + timedelta(days=7)

        result = (
            self.db.table("calendar_events")
            .select("id, title, start_time, end_time, location, description, lead_id, leads(name)")
            .eq("user_id", self.user_id)
            .gte("start_time", start.isoformat())
            .lte("start_time", end.isoformat())
            .order("start_time")
            .execute()
        )

        return {
            "count": len(result.data) if result and result.data else 0,
            "events": result.data if result else [],
        }

    # ─────────────────────────────────────────────────────────
    # EXTERNAL DATA
    # ─────────────────────────────────────────────────────────

    async def _web_search(self, query: str, count: int = 10) -> dict:
        """Search the web for current information (Brave Search)."""
        logger.info("=== WEB_SEARCH TOOL CALLED ===")
        logger.info(f"Args received: query={query}, count={count}")
        try:
            from app.ai.tools.web_search import web_search as ws_func
            logger.info("web_search function imported successfully")
            logger.info(f"Calling web_search with query='{query}', count={count}")
            result = await ws_func(query=query, count=count)
            logger.info(f"web_search returned: {result}")
            if not result.get("success", False):
                return {"error": result.get("error", "Web search fehlgeschlagen"), "results": result.get("results", [])}
            return result
        except ImportError as e:
            logger.error(f"Failed to import web_search: {e}")
            return {"success": False, "error": f"Import error: {e}", "results": []}
        except Exception as e:  # noqa: BLE001
            logger.error(f"web_search exception: {type(e).__name__}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e), "results": []}

    async def _search_nearby_places(
        self,
        location: str,
        latitude: float = None,
        longitude: float = None,
        type: str = "cafe",
        radius_meters: int = 1000,
    ) -> dict:
        """Search for nearby places."""

        return {
            "location": location,
            "type": type,
            "places": [],
            "note": "Places API noch nicht konfiguriert",
        }

    # ─────────────────────────────────────────────────────────
    # CONTENT GENERATION (uses nested AI call)
    # ─────────────────────────────────────────────────────────

    async def _write_message(
        self,
        message_type: str,
        channel: str,
        lead_id: str = None,
        lead_name: str = None,
        context: str = None,  # noqa: ARG002
        tone: str = "friendly",
    ) -> dict:
        """Generate a message using AI."""

        lead_context = ""
        lead_data = None
        interaction_context = ""

        if lead_id or lead_name:
            lead_data = await self._get_lead_details(lead_id=lead_id, lead_name=lead_name)
            if lead_data and not lead_data.get("error"):
                lead_context = f"""
                Lead: {lead_data.get('name')}
                Firma: {lead_data.get('company')}
                Letzter Kontakt: {lead_data.get('last_contact')}
                Status: {lead_data.get('status')}
                """
                try:
                    interactions = (
                        self.db.table("lead_interactions")
                        .select("*")
                        .eq("lead_id", lead_data.get("id"))
                        .order("created_at", desc=True)
                        .limit(10)
                        .execute()
                    )
                    items = interactions.data or []
                    if items:
                        interaction_context = "\n".join(
                            [
                                f"- {i.get('created_at')}: {i.get('interaction_type')} - {i.get('raw_notes') or i.get('summary') or ''}"
                                for i in items
                            ]
                        )
                except Exception as exc:
                    logger.debug(f"Could not load interactions for message: {exc}")

        channel_guidelines = {
            "whatsapp": "Maximal 2-3 kurze Sätze. Casual, mit Emoji wenn passend.",
            "email": "Professionell aber warm. Betreffzeile + kurzer Body.",
            "linkedin": "Professionell, keine Emojis. 2-4 Sätze.",
            "instagram": "Casual, kurz, kann Emoji haben.",
            "sms": "Sehr kurz, maximal 160 Zeichen.",
        }

        type_guidelines = {
            "followup": "Beziehe dich auf vorheriges Gespräch. Frage nach Status/Interesse.",
            "reactivation": "Freundlich wieder melden nach längerer Pause. Neuen Anlass nennen.",
            "delay": "Entschuldige Verspätung. Nenne Grund wenn context vorhanden. Kurz!",
            "cold_outreach": "Persönlicher Hook, Value Proposition, klarer CTA.",
            "after_meeting": "Bedanke dich, fasse Key Points zusammen, nächster Schritt.",
            "proposal": "Beziehe dich auf Gespräch, hier ist das Angebot.",
            "closing": "Letzte Überzeugung, handle mögliche Einwände, klarer CTA.",
            "thank_you": "Aufrichtig bedanken, positiv in Zukunft blicken.",
        }

        return {
            "message_type": message_type,
            "channel": channel,
            "lead": lead_data.get("name") if lead_data else None,
            "message": f"[AI generiert Nachricht basierend auf: {message_type}, {channel}, {tone}]",
            "guidelines_used": {
                "channel": channel_guidelines.get(channel),
                "type": type_guidelines.get(message_type),
            },
            "lead_context": lead_context.strip(),
            "interaction_context": interaction_context,
            "note": "Implementiere OpenAI Call für echte Nachrichtengenerierung",
        }

    async def _handle_objection(
        self,
        objection: str,
        lead_id: str = None,  # noqa: ARG002
        product: str = None,  # noqa: ARG002
        previous_context: str = None,  # noqa: ARG002
    ) -> dict:
        """Generate a response to an objection."""

        scripts = await self._get_objection_scripts(objection_type=objection)

        return {
            "objection": objection,
            "existing_scripts": scripts.get("scripts", []),
            "ai_response": f"[AI generiert spezifische Antwort auf: {objection}]",
            "note": "Implementiere OpenAI Call für personalisierte Einwandbehandlung",
        }

    async def _save_user_knowledge(self, category: str, content: str) -> dict:
        """Speichert persistente User-Infos in user_knowledge."""
        now = datetime.utcnow().isoformat()
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "category": category,
            "content": content,
            "created_at": now,
        }

        try:
            self.db.table("user_knowledge").insert(entry).execute()
            return {
                "success": True,
                "message": f"✅ Dauerhaft gespeichert: {content}",
                "category": category,
            }
        except Exception as insert_error:  # noqa: BLE001
            logger.warning("user_knowledge insert failed, trying fallback upsert: %s", insert_error)

        # Fallback: Versuch als Upsert (z.B. wenn user_id unique ist oder preferences-Array genutzt wird)
        try:
            existing = (
                self.db.table("user_knowledge")
                .select("*")
                .eq("user_id", self.user_id)
                .maybe_single()
                .execute()
            )

            data = existing.data if existing else None
            if data and isinstance(data, dict):
                preferences = data.get("preferences") or []
                if not isinstance(preferences, list):
                    preferences = []

                preferences.append(
                    {
                        "id": entry["id"],
                        "category": category,
                        "content": content,
                        "created_at": now,
                    }
                )

                self.db.table("user_knowledge").update({"preferences": preferences}).eq(
                    "user_id", self.user_id
                ).execute()

                return {
                    "success": True,
                    "message": f"✅ Dauerhaft gespeichert: {content}",
                    "category": category,
                    "stored_in": "preferences",
                }

            # Wenn kein Datensatz existiert: Upsert anlegen
            self.db.table("user_knowledge").upsert(entry, on_conflict="user_id").execute()
            return {
                "success": True,
                "message": f"✅ Dauerhaft gespeichert: {content}",
                "category": category,
            }
        except Exception as e:  # noqa: BLE001
            logger.error("save_user_knowledge failed: %s", e, exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "message": "❌ Konnte nicht speichern",
            }

    async def _save_user_preference(self, category: str, key: str, value: str) -> dict:
        """Speichert eine User-Präferenz in user_preferences Tabelle"""
        try:
            user_id = self.user_id
            now = datetime.utcnow().isoformat()
            
            # Upsert in user_preferences Tabelle
            result = self.db.table("user_preferences").upsert({
                "user_id": user_id,
                "category": category,
                "key": key,
                "value": value,
                "updated_at": now
            }, on_conflict="user_id,category,key").execute()
            
            return {
                "success": True,
                "message": f"✅ Gemerkt! {key}: {value}"
            }
        except Exception as e:
            logger.error(f"save_user_preference failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "❌ Konnte Präferenz nicht speichern"
            }

    # ─────────────────────────────────────────────────────────
    # ACTIONS
    # ─────────────────────────────────────────────────────────

    async def _create_lead(
        self,
        name: str,
        phone: str = None,
        email: str = None,
        instagram: str = None,
        facebook: str = None,
        linkedin: str = None,
        whatsapp: str = None,
        notes: str = None,
    ) -> dict:
        """Erstellt einen Lead - nur Name required. Unterstützt Social Media Handles."""
        try:
            # Extract handles from URLs if needed
            instagram_handle = None
            if instagram:
                instagram_handle = instagram.replace("https://instagram.com/", "").replace("http://instagram.com/", "").replace("instagram.com/", "").replace("@", "").strip()
            
            facebook_url = None
            if facebook:
                if "facebook.com" in facebook:
                    facebook_url = facebook
                else:
                    facebook_url = f"https://facebook.com/{facebook}"
            
            linkedin_handle = None
            if linkedin:
                linkedin_handle = linkedin.replace("https://linkedin.com/in/", "").replace("http://linkedin.com/in/", "").replace("linkedin.com/in/", "").strip()
            
            whatsapp_phone = None
            if whatsapp:
                whatsapp_phone = whatsapp.replace(" ", "").replace("-", "").strip()
            
            email_normalized = email.strip().lower() if email else None
            
            lead_data = {
                "user_id": self.user_id,
                "name": name,
                "phone": phone,
                "email": email_normalized,
                "instagram": instagram_handle,
                "facebook": facebook_url,
                "linkedin": linkedin_handle,
                "whatsapp": whatsapp_phone,
                "notes": notes,
                "status": "new",
                "temperature": "cold",
                "source": "ai_chat",
            }

            lead_data = {k: v for k, v in lead_data.items() if v is not None}

            result = self.db.table("leads").insert(lead_data).execute()
            lead = result.data[0] if result and result.data else None

            if not lead:
                return {"success": False, "error": "Lead konnte nicht erstellt werden"}

            lead_id = lead.get("id")
            website = lead.get("website")

            # === AUTO FOLLOW-UP IM HINTERGRUND ERSTELLEN ===
            # Damit der Lead nicht vergessen wird falls keine Antwort kommt
            try:
                followup_date = datetime.now(timezone.utc) + timedelta(days=3)
                self.db.table("followup_suggestions").insert({
                    "id": str(uuid.uuid4()),
                    "user_id": self.user_id,
                    "lead_id": lead_id,
                    "flow": "ERSTKONTAKT",
                    "stage": 0,
                    "template_key": "FIRST_CONTACT_FOLLOWUP",
                    "channel": "WHATSAPP" if phone else "EMAIL",
                    "suggested_message": f"Hey {name.split()[0] if name else 'du'}, ich wollte nochmal kurz nachhaken - hast du meine Nachricht gesehen? 🙂",
                    "reason": "Auto-Follow-up nach Erstkontakt",
                    "due_at": followup_date.isoformat(),
                    "status": "pending",
                    "title": f"Follow-up: {name}",
                    "priority": "medium",
                    "source": "auto_create",
                    "created_at": datetime.utcnow().isoformat(),
                }).execute()
            except Exception as e:
                logger.warning(f"Auto-followup creation failed: {e}")

            # === SUGGESTED ACTIONS: ERSTKONTAKT ZUERST ===
            preferred_channel = "whatsapp" if phone else "instagram" if not email else "email"

            actions = [
                {
                    "action": "prepare_message",
                    "label": "💬 Erstkontakt-Nachricht schreiben",
                    "params": {"lead_name": name, "channel": preferred_channel},
                },
            ]

            # Nur Research anbieten wenn kein direkter Kontakt möglich
            if not phone and not email:
                actions.append({
                    "action": "research_company", 
                    "label": "🔍 Mehr über diesen Kontakt erfahren",
                    "params": {"company_name": name},
                })

            actions = [a for a in actions if a]

            return {
                "success": True,
                "lead_id": lead_id,
                "lead_name": name,
                "has_email": bool(email),
                "has_phone": bool(phone),
                "has_website": bool(website),
                "message": f"✅ Lead **{name}** erstellt!",
                "auto_followup": "📅 Auto-Follow-up in 3 Tagen angelegt",
                "suggested_actions": actions,
                "next_step_hint": "Soll ich eine Erstkontakt-Nachricht vorbereiten?",
            }
        except Exception as e:  # noqa: BLE001
            logger.error(f"Create lead error: {e}")
            return {"success": False, "error": str(e)}

    def _parse_due_datetime(self, due_date: str | None) -> datetime:
        """
        Parst relative Angaben wie 'tomorrow', 'next_week' oder ISO-Strings.
        
        Verhalten:
        - Relative Daten (z.B. "3 days", "in 3 Tagen") → Zukunft
        - Spezifische Daten ohne Jahr (z.B. "05.12") → aktuelles Jahr verwenden
        - Warnung wenn Datum in Vergangenheit liegt (aber Datum wird beibehalten)
        """
        import re
        from datetime import date as date_type

        now = datetime.now(timezone.utc)
        today = now.date()
        due_date_str = (due_date or "").strip()
        original_due_date_str = due_date_str  # Für Logging

        def parse_and_validate_date(due_date_str: str) -> date_type:
            """Parst Datum mit verbesserter Logik für mehrdeutige Daten"""
            parsed_date = None
            year_explicitly_given = False

            if not due_date_str:
                return today + timedelta(days=3)  # Default

            due_lower = due_date_str.lower().strip()

            # Relative Daten → IMMER Zukunft
            if due_lower in ['heute', 'today']:
                parsed_date = today
            elif due_lower in ['morgen', 'tomorrow']:
                parsed_date = today + timedelta(days=1)
            elif due_lower in ['übermorgen']:
                parsed_date = today + timedelta(days=2)
            elif 'in' in due_lower or 'tag' in due_lower or 'day' in due_lower:
                # "in 3 days", "in 3 Tagen"
                match = re.search(r'in\s+(\d+)\s+(?:day|tag)', due_lower)
                if match:
                    parsed_date = today + timedelta(days=int(match.group(1)))
                # "in einer Woche", "in 1 week"
                match = re.search(r'in\s+(?:einer?|1)\s+(?:woche|week)', due_lower)
                if match:
                    parsed_date = today + timedelta(weeks=1)
                # "in 2 Wochen"
                match = re.search(r'in\s+(\d+)\s+(?:wochen|weeks)', due_lower)
                if match:
                    parsed_date = today + timedelta(weeks=int(match.group(1)))
                # "3 Tage", "3 days" (ohne "in")
                if not parsed_date:
                    match = re.search(r'(\d+)\s+(?:tag|day)', due_lower)
                    if match:
                        parsed_date = today + timedelta(days=int(match.group(1)))

            # Absolute Daten parsen
            if not parsed_date:
                # Prüfe ob Jahr explizit angegeben wurde
                formats_with_year = ["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"]
                formats_without_year = ["%d.%m.%y"]  # 2-stelliges Jahr
                
                # Versuche zuerst Formate mit vollem Jahr
                for fmt in formats_with_year:
                    try:
                        parsed_date = datetime.strptime(due_date_str.strip(), fmt).date()
                        year_explicitly_given = True
                        break
                    except:
                        pass
                
                # Dann Formate mit 2-stelligem Jahr
                if not parsed_date:
                    for fmt in formats_without_year:
                        try:
                            parsed_date = datetime.strptime(due_date_str.strip(), fmt).date()
                            # Wenn Jahr 2-stellig, normalisiere es
                            if parsed_date.year < 50:
                                parsed_date = parsed_date.replace(year=2000 + parsed_date.year)
                            else:
                                parsed_date = parsed_date.replace(year=1900 + parsed_date.year)
                            year_explicitly_given = True
                            break
                        except:
                            pass
                
                # Zuletzt: Format ohne Jahr (z.B. "05.12")
                if not parsed_date:
                    for fmt in ["%d.%m", "%d/%m"]:
                        try:
                            # Füge aktuelles Jahr hinzu
                            temp_date = datetime.strptime(due_date_str.strip(), fmt).date()
                            parsed_date = temp_date.replace(year=today.year)
                            year_explicitly_given = False  # Jahr wurde NICHT explizit angegeben
                            break
                        except:
                            pass

            # Wenn Datum in Vergangenheit liegt
            if parsed_date and parsed_date < today:
                if not year_explicitly_given:
                    # Jahr wurde NICHT explizit angegeben → Warnung aber Datum beibehalten
                    logger.warning(
                        f"Follow-up date '{original_due_date_str}' parsed as {parsed_date} "
                        f"(current year) is in the past. Using it anyway (might be for notes/history)."
                    )
                    # Datum beibehalten (für Notizen/History)
                    return parsed_date
                else:
                    # Jahr wurde explizit angegeben → könnte nächstes Jahr meinen
                    if parsed_date.year == today.year:
                        # Versuche nächstes Jahr
                        next_year_date = parsed_date.replace(year=today.year + 1)
                        if next_year_date >= today:
                            logger.info(
                                f"Follow-up date '{original_due_date_str}' was in the past, "
                                f"assuming next year: {next_year_date}"
                            )
                            return next_year_date
                    # Sonst: Default auf morgen
                    logger.warning(
                        f"Follow-up date '{original_due_date_str}' ({parsed_date}) is in the past "
                        f"and year was explicitly given. Defaulting to tomorrow."
                    )
                    return today + timedelta(days=1)

            # Fallback
            return parsed_date or (today + timedelta(days=3))

        # Verwende die Validierung und konvertiere zu datetime
        validated_date = parse_and_validate_date(due_date_str)
        return datetime.combine(validated_date, datetime.min.time(), tzinfo=timezone.utc)

    async def _find_lead_by_name_or_id(self, name_or_id: str) -> Optional[dict]:
        """Findet Lead by UUID oder fuzzy Name (case-insensitive)."""
        if not name_or_id:
            return None

        # Versuch als UUID
        try:
            uuid.UUID(name_or_id)
            result = (
                self.db.table("leads")
                .select("*")
                .eq("id", name_or_id)
                .eq("user_id", self.user_id)
                .single()
                .execute()
            )
            if result.data:
                return result.data
        except ValueError:
            pass

        # Fuzzy Name-Suche
        result = (
            self.db.table("leads")
            .select("*")
            .eq("user_id", self.user_id)
            .ilike("name", f"%{name_or_id}%")
            .execute()
        )

        if result.data and len(result.data) == 1:
            return result.data[0]

        if result.data and len(result.data) > 1:
            for lead in result.data:
                if (lead.get("name") or "").lower() == name_or_id.lower():
                    return lead
            return result.data[0]

        return None

    def _resolve_lead(self, lead_id: str = None, lead_name: str = None) -> tuple[str | None, str | None]:
        """Findet Lead anhand ID oder Name."""
        resolved_lead_id = lead_id
        resolved_lead_name = lead_name

        if lead_name and not resolved_lead_id:
            search = (
                self.db.table("leads")
                .select("id, name")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{lead_name}%")
                .limit(1)
                .execute()
            )

            if search.data:
                resolved_lead_id = search.data[0]["id"]
                resolved_lead_name = search.data[0]["name"]

        return resolved_lead_id, resolved_lead_name

    async def _create_task(
        self,
        title: str,
        lead_id: str = None,
        lead_name: str = None,
        description: str = None,
        due_date: str = None,
        priority: str = "medium",
        type: str = "followup",
    ) -> dict:
        """Create a new task or follow-up (writes follow-ups to followup_suggestions)."""

        resolved_lead_id, resolved_lead_name = self._resolve_lead(lead_id, lead_name)
        due = self._parse_due_datetime(due_date)

        followup_type = (type or "followup").replace("-", "_")
        if followup_type in {"followup", "follow_up"}:
            return await self._insert_followup_suggestion(
                lead_id=resolved_lead_id,
                lead_name=resolved_lead_name or lead_name,
                message=description or title,
                channel="WHATSAPP",
                due_at=due,
                flow="MANUAL",
                reason=description or "Follow-up von CHIEF erstellt",
                title=title,
                priority=priority,
                source="chief",
            )

        try:
            result = (
                self.db.table("lead_tasks")
                .insert(
                    {
                        "user_id": self.user_id,
                        "lead_id": resolved_lead_id,
                        "title": title,
                        "description": description,
                        "due_date": due.isoformat(),
                        "priority": priority,
                        "type": type,
                        "status": "pending",
                    }
                )
                .execute()
            )

            return {
                "success": True,
                "task_id": result.data[0]["id"] if result and result.data else None,
                "message": f"✅ Task '{title}' erstellt für {due.strftime('%d.%m.%Y')}",
            }
        except Exception as e:  # noqa: BLE001
            return {
                "success": False,
                "error": str(e),
            }

    async def _create_follow_up(
        self,
        lead_name: str,
        due_date: str,
        channel: str = "whatsapp",
        message: str = None,
    ) -> dict:
        """Erstellt einen Follow-up Vorschlag in followup_suggestions."""
        return await self._create_followup_suggestion(
            lead_name=lead_name,
            due_date=due_date,
            channel=channel,
            message=message,
        )

    async def _create_followup_suggestion(
        self,
        lead_id: str = None,
        lead_name: str = None,
        message: str = None,
        channel: str = "WHATSAPP",
        due_date: str = None,
        due_in_days: int = None,
        flow: str = "MANUAL",
        reason: str = None,
        title: str = None,
        priority: str = "medium",
    ) -> dict:
        """Unified helper for CHIEF follow-ups (writes to followup_suggestions)."""
        try:
            resolved_lead_id, resolved_lead_name = self._resolve_lead(lead_id, lead_name)
            if not resolved_lead_id:
                return {"success": False, "error": "Lead nicht gefunden"}

            # CHECK FOR EXISTING PENDING FOLLOW-UP (Duplicate Prevention)
            existing = (
                self.db.table("followup_suggestions")
                .select("id, due_at, suggested_message, title")
                .eq("lead_id", resolved_lead_id)
                .eq("user_id", self.user_id)
                .eq("status", "pending")
                .execute()
            )

            if existing.data and len(existing.data) > 0:
                existing_fu = existing.data[0]
                due_at_str = existing_fu.get("due_at", "")
                if due_at_str:
                    try:
                        due_at_dt = datetime.fromisoformat(due_at_str.replace("Z", "+00:00"))
                        due_at_formatted = due_at_dt.strftime("%d.%m.%Y")
                    except Exception:
                        due_at_formatted = due_at_str[:10] if len(due_at_str) >= 10 else due_at_str
                else:
                    due_at_formatted = "unbekannt"
                
                return {
                    "success": False,
                    "error": f"⚠️ Follow-up für {resolved_lead_name or 'Lead'} existiert bereits (fällig: {due_at_formatted}). Verwende 'update_follow_up' um es zu ändern.",
                    "existing_id": existing_fu["id"],
                    "existing_due_at": due_at_formatted,
                }

            if due_in_days is not None:
                due_at_dt = datetime.now(timezone.utc) + timedelta(days=due_in_days)
            else:
                due_at_dt = self._parse_due_datetime(due_date)

            return await self._insert_followup_suggestion(
                lead_id=resolved_lead_id,
                lead_name=resolved_lead_name or lead_name,
                message=message or f"Follow-up für {resolved_lead_name or 'Lead'}",
                channel=channel,
                due_at=due_at_dt,
                flow=flow or "MANUAL",
                reason=reason or "Von CHIEF erstellt",
                title=title or f"Follow-up {resolved_lead_name or 'Lead'}",
                priority=priority or "medium",
                source="chief",
            )
        except Exception as e:  # noqa: BLE001
            logger.error(f"Create follow-up FAILED: {type(e).__name__}: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    async def _get_last_message_for_lead(self, lead_id: str) -> tuple[str | None, str]:
        """Holt die letzte gesendete Nachricht für einen Lead.
        
        Returns:
            tuple: (message_content, message_type)
            message_type: 'first_contact', 'product_info', 'follow_up', 'objection_handling', 'generic'
        """
        try:
            # Suche in lead_interactions nach der letzten gesendeten Nachricht
            interactions = (
                self.db.table("lead_interactions")
                .select("raw_notes, notes, interaction_type, channel")
                .eq("lead_id", lead_id)
                .eq("user_id", self.user_id)
                .in_("interaction_type", ["message_prepared", "message_sent", "whatsapp_sent", "email_sent"])
                .order("interaction_at", desc=True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            
            if interactions.data and len(interactions.data) > 0:
                last_interaction = interactions.data[0]
                message_content = last_interaction.get("raw_notes") or last_interaction.get("notes") or ""
                
                # Bestimme message_type basierend auf interaction_type und Inhalt
                interaction_type = last_interaction.get("interaction_type", "").lower()
                content_lower = message_content.lower()
                
                if "first_contact" in interaction_type or "erstkontakt" in content_lower or "erstmalig" in content_lower:
                    message_type = "first_contact"
                elif "product" in content_lower or "produkt" in content_lower or "angebot" in content_lower:
                    message_type = "product_info"
                elif "einwand" in content_lower or "objection" in content_lower:
                    message_type = "objection_handling"
                elif "follow" in interaction_type or "nachfass" in content_lower:
                    message_type = "follow_up"
                else:
                    message_type = "generic"
                
                return (message_content[:500] if message_content else None, message_type)
            
            return (None, "first_contact")
        except Exception as e:  # noqa: BLE001
            logger.debug(f"Could not load last message for lead {lead_id}: {e}")
            return (None, "first_contact")

    async def _insert_followup_suggestion(
        self,
        *,
        lead_id: str,
        lead_name: str | None,
        message: str,
        channel: str,
        due_at: datetime,
        flow: str,
        reason: str,
        title: str,
        priority: str,
        source: str = "system",
        template_key: str | None = None,
    ) -> dict:
        """Low-level insertion helper into followup_suggestions."""
        if not lead_id:
            return {"success": False, "error": "Lead ID fehlt"}

        channel_value = (channel or "WHATSAPP").upper()
        template = template_key or "CHIEF_GENERATED"

        # Hole letzte Nachricht für diesen Lead
        previous_message, previous_message_type = await self._get_last_message_for_lead(lead_id)

        data = {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "lead_id": lead_id,
            "flow": flow or "MANUAL",
            "stage": 0,
            "template_key": template,
            "channel": channel_value,
            "suggested_message": message,
            "reason": reason,
            "due_at": due_at.isoformat() if isinstance(due_at, datetime) else due_at,
            "status": "pending",
            "title": title,
            "priority": priority or "medium",
            "task_type": "follow_up",
            "source": source,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": self.user_id,
            "previous_message": previous_message,
            "previous_message_type": previous_message_type,
        }

        result = self.db.table("followup_suggestions").insert(data).execute()

        if not result or not result.data:
            return {"success": False, "error": "Follow-up konnte nicht erstellt werden"}

        date_str = due_at.strftime("%d.%m.%Y") if isinstance(due_at, datetime) else due_at
        return {
            "success": True,
            "suggestion_id": result.data[0]["id"],
            "message": f"✅ Follow-up für {lead_name or 'Lead'} am {date_str} geplant!",
        }

    async def _log_interaction(self, params: dict) -> str:
        """Speichert eine Interaktion und aktualisiert den Lead."""
        lead_name_or_id = params.get("lead_name") or params.get("lead_name_or_id")
        lead_id = params.get("lead_id")
        interaction_type = params.get("type") or params.get("interaction_type") or "meeting"
        notes = params.get("notes") or params.get("summary") or ""
        tags: Optional[List[str]] = params.get("tags") or []
        key_facts: Optional[Dict[str, Any]] = params.get("key_facts") or {}
        outcome: str = params.get("outcome") or params.get("sentiment") or "neutral"
        next_steps_param = params.get("next_steps") or []
        lead_updates: Optional[Dict[str, Any]] = params.get("lead_updates") or {}
        create_followup: bool = params.get("create_followup", False)
        followup_days: int = params.get("followup_days", 3)
        objections = params.get("objections") or []
        budget_mentioned = params.get("budget")
        timeline_mentioned = params.get("timeline")
        sentiment = params.get("sentiment") or outcome or "neutral"

        print(f"[DEBUG] log_interaction called with lead='{lead_name_or_id or lead_id}', type='{interaction_type}'")

        lead = None
        if lead_id:
            lead = await self._find_lead_by_name_or_id(lead_id)
        if not lead and lead_name_or_id:
            lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        lead_was_created = False
        if not lead:
            new_lead_data = {
                "id": str(uuid.uuid4()),
                "user_id": self.user_id,
                "name": lead_name_or_id or "Unbekannt",
                "status": "contacted",
                "created_at": datetime.utcnow().isoformat(),
            }
            if lead_updates:
                new_lead_data.update(lead_updates)

            result = self.db.table("leads").insert(new_lead_data).execute()
            lead = result.data[0] if result and result.data else None
            lead_was_created = True
            if not lead:
                return json.dumps(
                    {
                        "success": False,
                        "error": f"Lead '{lead_name_or_id}' konnte nicht angelegt werden",
                        "action_needed": "ask_create_lead",
                    }
                )

        now = datetime.utcnow()
        details = {
            "tags": tags or [],
            "key_facts": key_facts or {},
            "next_steps": next_steps_param if isinstance(next_steps_param, list) else [next_steps_param] if next_steps_param else [],
            "raw_notes": notes,
            "objections": objections if isinstance(objections, list) else [],
            "budget_mentioned": budget_mentioned,
            "timeline_mentioned": timeline_mentioned,
        }

        interaction_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(self.user_id),
            "lead_id": str(lead["id"]),
            "interaction_type": interaction_type or "meeting",
            "channel": interaction_type or "meeting",
            "summary": notes[:500] if notes else "",
            "details": details,
            "outcome": outcome or "neutral",
            "logged_by": "chief",
            "source": "chief",
            "interaction_at": now.isoformat() + "Z",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "raw_notes": notes,
            "sentiment": sentiment,
            "key_facts": key_facts if isinstance(key_facts, (list, dict)) else {},
            "objections": objections if isinstance(objections, list) else [],
            "budget_mentioned": budget_mentioned,
            "timeline_mentioned": timeline_mentioned,
        }

        print(f"[DEBUG] Inserting interaction: lead_id={interaction_data['lead_id']}, user_id={interaction_data['user_id']}")
        try:
            result = self.db.table("lead_interactions").insert(interaction_data).execute()
            print(f"[DEBUG] lead_interactions insert SUCCESS: {result.data}")
        except Exception as e:  # noqa: BLE001
            print(f"[ERROR] lead_interactions insert FAILED: {e}")
            print(f"[ERROR] Data was: {interaction_data}")

        lead_update_data = {
            "last_contact_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        if lead_updates:
            lead_update_data.update(lead_updates)

        if notes:
            existing_notes = lead.get("notes") or ""
            combined_notes = (existing_notes + "\n" + notes).strip() if existing_notes else notes
            lead_update_data.setdefault("notes", combined_notes)

        if tags:
            existing_tags = lead.get("tags") or []
            if isinstance(existing_tags, str):
                existing_tags = []
            merged_tags = list({*existing_tags, *tags})
            lead_update_data["tags"] = merged_tags

        self.db.table("leads").update(lead_update_data).eq("id", lead["id"]).execute()

        # Temperature tweak based on sentiment
        try:
            if sentiment in {"positiv", "positive"}:
                temperature = (lead.get("temperature") or 50) + 5
                self.db.table("leads").update({"temperature": min(100, temperature)}).eq("id", lead["id"]).execute()
            elif sentiment in {"negativ", "negative"}:
                temperature = (lead.get("temperature") or 50) - 5
                self.db.table("leads").update({"temperature": max(0, temperature)}).eq("id", lead["id"]).execute()
        except Exception as exc:
            logger.debug(f"Could not adjust temperature: {exc}")

        if create_followup and outcome in {"positive", "positiv", "follow_up_needed"}:
            try:
                await self._insert_followup_suggestion(
                    lead_id=lead["id"],
                    lead_name=lead.get("name"),
                    message=f"Follow-up nach {interaction_type} mit {lead.get('name') or 'Lead'}",
                    channel="WHATSAPP",
                    due_at=datetime.utcnow() + timedelta(days=followup_days or 3),
                    flow="MANUAL",
                    reason=f"Automatisch nach {interaction_type} erstellt",
                    title=f"Follow-up nach {interaction_type}",
                    priority="medium",
                    source="chief",
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Auto-followup creation failed: %s", exc, exc_info=True)

        return json.dumps(
            {
                "success": True,
                "lead_name": lead.get("name"),
                "lead_id": lead.get("id"),
                "interaction_saved": True,
                "lead_created": lead_was_created,
                "tags_added": tags or [],
                "lead_updated": bool(lead_updates),
                "outcome": outcome or "neutral",
            }
        )

    async def _generate_customer_protocol(
        self,
        lead_name_or_id: str,
        include_last_n_interactions: int = 1,
        tone: str = "friendly",
        include_next_steps: bool = True,
        custom_points: Optional[List[str]] = None,
    ) -> str:
        """Aggregiert Interaktionen für ein Kunden-Protokoll."""

        lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        if not lead:
            return json.dumps(
                {"success": False, "error": f"Lead '{lead_name_or_id}' nicht gefunden"}
            )

        interactions_result = (
            self.db.table("lead_interactions")
            .select("*")
            .eq("lead_id", lead["id"])
            .order("interaction_at", desc=True)
            .limit(include_last_n_interactions or 1)
            .execute()
        )

        interactions = interactions_result.data or []
        if not interactions:
            return json.dumps(
                {
                    "success": False,
                    "error": f"Keine Gesprächsnotizen für {lead.get('name')} gefunden",
                    "hint": "Erst ein Gespräch protokollieren bevor ein Protokoll erstellt werden kann",
                }
            )

        user_result = (
            self.db.table("profiles")
            .select("full_name, first_name, email")
            .eq("id", self.user_id)
            .single()
            .execute()
        )
        user = user_result.data or {}
        user_name = user.get("full_name") or user.get("first_name") or (user.get("email") or "").split("@")[0]

        all_key_facts: Dict[str, Any] = {}
        all_next_steps: List[str] = []
        all_tags: List[str] = []

        normalized_interactions = []
        for interaction in interactions:
            details = interaction.get("details") or {}
            if isinstance(details, str):
                try:
                    details = json.loads(details)
                except Exception:
                    details = {}

            all_key_facts.update(details.get("key_facts", {}) or {})
            all_next_steps.extend(details.get("next_steps", []) or [])
            all_tags.extend(details.get("tags", []) or [])

            normalized_interactions.append(
                {
                    "type": interaction.get("interaction_type"),
                    "summary": interaction.get("summary"),
                    "outcome": interaction.get("outcome"),
                    "date": interaction.get("interaction_at"),
                    "details": details,
                }
            )

        all_next_steps = list(dict.fromkeys(all_next_steps))
        all_tags = list(set(all_tags))

        return json.dumps(
            {
                "success": True,
                "lead": {
                    "name": lead.get("name"),
                    "first_name": lead.get("first_name") or (lead.get("name") or "").split()[0],
                    "email": lead.get("email"),
                    "company": lead.get("company"),
                },
                "interactions": normalized_interactions,
                "aggregated": {
                    "key_facts": all_key_facts,
                    "next_steps": all_next_steps if include_next_steps else [],
                    "tags": all_tags,
                },
                "custom_points": custom_points or [],
                "tone": tone,
                "user_name": user_name,
                "protocol_type": "customer",
            }
        )

    async def _update_lead_status(
        self,
        new_status: str,
        lead_id: str = None,
        lead_name: str = None,
        reason: str = None,
        customer_type: str = None,
        customer_value: float = None,
    ) -> dict:
        """Update a lead's status."""

        resolved_lead_id = lead_id
        if lead_name and not resolved_lead_id:
            search = (
                self.db.table("leads")
                .select("id, name, status")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{lead_name}%")
                .limit(1)
                .execute()
            )

            if search.data:
                resolved_lead_id = search.data[0]["id"]
            else:
                return {"error": f"Lead '{lead_name}' nicht gefunden"}

        update_data = {"status": new_status}
        if reason:
            update_data["status_reason"] = reason

        if new_status in ["won", "lost"]:
            update_data["closed_at"] = datetime.now().isoformat()
        if new_status == "won":
            update_data["customer_since"] = datetime.now().isoformat()
            if customer_type:
                update_data["customer_type"] = customer_type
            if customer_value is not None:
                try:
                    update_data["customer_value"] = float(customer_value)
                except Exception:
                    pass

        self.db.table("leads").update(update_data).eq("id", resolved_lead_id).execute()

        return {
            "success": True,
            "message": f"✅ Status auf '{new_status}' geändert",
        }

    async def _convert_to_customer(
        self,
        lead_id: str = None,
        lead_name: str = None,
        customer_type: str = "kunde",
        initial_value: float = None,
    ) -> dict:
        """Konvertiert Lead zu Kunde (status=won)."""

        resolved_lead_id = lead_id
        if lead_name and not resolved_lead_id:
            search = (
                self.db.table("leads")
                .select("id")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{lead_name}%")
                .limit(1)
                .execute()
            )
            if search.data:
                resolved_lead_id = search.data[0]["id"]
            else:
                return {"error": f"Lead '{lead_name}' nicht gefunden"}

        if not resolved_lead_id:
            return {"error": "lead_id oder lead_name benötigt"}

        update_data = {
            "status": "won",
            "customer_since": datetime.now().isoformat(),
            "customer_type": customer_type or "kunde",
            "closed_at": datetime.now().isoformat(),
        }
        if initial_value is not None:
            try:
                update_data["customer_value"] = float(initial_value)
                update_data["orders_count"] = 1
                update_data["last_order_at"] = datetime.now().isoformat()
            except Exception:
                pass

        self.db.table("leads").update(update_data).eq("id", resolved_lead_id).execute()

        return {
            "success": True,
            "message": "✅ Lead wurde zum Kunden konvertiert",
            "lead_id": resolved_lead_id,
            "customer_type": update_data.get("customer_type"),
            "customer_value": update_data.get("customer_value"),
        }

    async def _generate_sequence_messages(
        self,
        lead_id: str = None,
        lead_name: str = None,
    ) -> str:
        """Generiert personalisierte Nachrichten für Follow-up Sequenzen."""

        resolved_lead_id = lead_id
        lead = None

        if resolved_lead_id:
            lead = (
                self.db.table("leads")
                .select("*")
                .eq("id", resolved_lead_id)
                .eq("user_id", self.user_id)
                .single()
                .execute()
            )
        elif lead_name:
            lead = (
                self.db.table("leads")
                .select("*")
                .ilike("name", f"%{lead_name}%")
                .eq("user_id", self.user_id)
                .limit(1)
                .execute()
            )
            if lead and lead.data:
                resolved_lead_id = lead.data[0]["id"] if isinstance(lead.data, list) else lead.data.get("id")

        if not lead or not lead.data or not resolved_lead_id:
            return "Lead nicht gefunden"

        lead_data = lead.data[0] if isinstance(lead.data, list) else lead.data

        followups = (
            self.db.table("followup_suggestions")
            .select("*")
            .eq("lead_id", resolved_lead_id)
            .eq("status", "pending")
            .order("due_at")
            .execute()
        )

        if not followups or not followups.data:
            return "Keine offenen Follow-ups für diesen Lead"

        messages_generated: List[str] = []
        for i, fu in enumerate(followups.data, 1):
            if i == 1:
                message = (
                    f"Hey {lead_data.get('name', 'du')}, ich wollte nochmal kurz nachhaken – "
                    "hast du dir das Thema schon ansehen können? 🙂"
                )
            elif i == 2:
                message = (
                    f"Hi {lead_data.get('name', 'du')}, kurze Frage: Ist das Thema noch relevant für dich? "
                    "Hatte gerade ein gutes Gespräch mit jemandem in ähnlicher Situation."
                )
            else:
                message = (
                    f"Hey {lead_data.get('name', 'du')}, ich räume gerade meine Liste auf – "
                    "soll ich das Thema bei dir noch offen halten oder können wir die Akte erstmal schließen?"
                )

            self.db.table("followup_suggestions").update({"message": message}).eq("id", fu["id"]).execute()
            messages_generated.append(f"Follow-up #{i}: {message[:50]}...")

        return f"✅ {len(messages_generated)} Nachrichten generiert:\n" + "\n".join(messages_generated)

    async def _update_lead_stage(
        self,
        lead_name: str,
        new_stage: int,
        sentiment: str = None,
        objection: str = None,
    ) -> dict:
        """Aktualisiert Sales-Stage + Sentiment/Objection für einen Lead."""
        if not lead_name:
            return {"error": "lead_name erforderlich"}
        try:
            match = (
                self.db.table("leads")
                .select("id, name, sales_stage")
                .ilike("name", f"%{lead_name}%")
                .eq("user_id", self.user_id)
                .limit(1)
                .execute()
            )
            if not match or not match.data:
                return {"error": f"Lead '{lead_name}' nicht gefunden"}
            lead = match.data[0] if isinstance(match.data, list) else match.data
            update_data = {"sales_stage": new_stage}
            if sentiment:
                update_data["sentiment"] = sentiment
            if objection:
                update_data["last_objection"] = objection
            if new_stage == 0:
                update_data["disqualified"] = True
                update_data["disqualify_reason"] = objection or "disqualified via CAS"
            self.db.table("leads").update(update_data).eq("id", lead["id"]).execute()

            # Optionale Interaktions-Log
            try:
                self.db.table("lead_interactions").insert(
                    {
                        "user_id": self.user_id,
                        "lead_id": lead["id"],
                        "interaction_type": "cas_stage_update",
                        "raw_notes": f"Stage -> {new_stage}; sentiment={sentiment or 'n/a'}; objection={objection or ''}",
                    }
                ).execute()
            except Exception:
                pass

            return {
                "success": True,
                "lead_id": lead["id"],
                "sales_stage": new_stage,
                "sentiment": sentiment,
                "objection": objection,
            }
        except Exception as e:
            return {"error": str(e)}

    async def _start_power_hour(
        self,
        duration_minutes: int = 60,
        goal_calls: int = None,
        goal_contacts: int = None,
    ) -> dict:
        """Start a Power Hour session."""

        session = (
            self.db.table("power_hour_sessions")
            .insert(
                {
                    "user_id": self.user_id,
                    "started_at": datetime.now().isoformat(),
                    "duration_minutes": duration_minutes,
                    "goal_calls": goal_calls or 20,
                    "goal_contacts": goal_contacts or 5,
                    "status": "active",
                }
            )
            .execute()
        )

        return {
            "success": True,
            "session_id": session.data[0]["id"] if session and session.data else None,
            "message": f"⚡ Power Hour gestartet! {duration_minutes} Minuten, Ziel: {goal_calls or 20} Anrufe",
            "goals": {
                "calls": goal_calls or 20,
                "contacts": goal_contacts or 5,
                "duration": duration_minutes,
            },
        }

    # ═══════════════════════════════════════════════════════════
    # QUICK WIN TOOLS
    # ═══════════════════════════════════════════════════════════

    async def _get_lead_history(
        self,
        lead_name_or_id: str,
        limit: int = 20,
    ) -> dict:
        """Hole komplette Interaktionshistorie eines Leads."""
        lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        if not lead:
            return {"error": f"Lead '{lead_name_or_id}' nicht gefunden"}

        interactions = (
            self.db.table("lead_interactions")
            .select("*")
            .eq("lead_id", lead["id"])
            .order("interaction_at", desc=True)
            .limit(limit)
            .execute()
        )

        followups = (
            self.db.table("followup_suggestions")
            .select("id, title, due_at, status, channel, suggested_message")
            .eq("lead_id", lead["id"])
            .order("due_at", desc=True)
            .limit(10)
            .execute()
        )

        return {
            "lead": {
                "id": lead.get("id"),
                "name": lead.get("name"),
                "company": lead.get("company"),
                "status": lead.get("status"),
                "temperature": lead.get("temperature"),
                "tags": lead.get("tags", []),
            },
            "interactions": interactions.data if interactions else [],
            "followups": followups.data if followups else [],
            "total_interactions": len(interactions.data) if interactions else 0,
        }

    async def _get_today_summary(self) -> dict:
        """Tagesübersicht: Follow-ups, Meetings, Hot Leads."""
        now = datetime.utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)

        # Heutige Follow-ups
        followups = (
            self.db.table("followup_suggestions")
            .select("id, title, due_at, channel, lead_id, leads(name)")
            .eq("user_id", self.user_id)
            .eq("status", "pending")
            .gte("due_at", start_of_day.isoformat())
            .lte("due_at", end_of_day.isoformat())
            .order("due_at")
            .execute()
        )

        # Überfällige
        overdue = (
            self.db.table("followup_suggestions")
            .select("id", count="exact")
            .eq("user_id", self.user_id)
            .eq("status", "pending")
            .lt("due_at", start_of_day.isoformat())
            .execute()
        )

        # Hot Leads
        hot_leads = (
            self.db.table("leads")
            .select("id, name, company, status")
            .eq("user_id", self.user_id)
            .eq("temperature", "hot")
            .not_.in_("status", ["won", "lost"])
            .limit(5)
            .execute()
        )

        # Heutige Meetings (falls calendar_events existiert)
        meetings = []
        try:
            meetings_result = (
                self.db.table("calendar_events")
                .select("id, title, start_time, lead_id, leads(name)")
                .eq("user_id", self.user_id)
                .gte("start_time", start_of_day.isoformat())
                .lte("start_time", end_of_day.isoformat())
                .order("start_time")
                .execute()
            )
            meetings = meetings_result.data if meetings_result else []
        except Exception:
            pass

        return {
            "date": now.strftime("%d.%m.%Y"),
            "followups_today": len(followups.data) if followups else 0,
            "followups": followups.data if followups else [],
            "overdue_count": overdue.count if overdue else 0,
            "hot_leads": hot_leads.data if hot_leads else [],
            "meetings_today": len(meetings),
            "meetings": meetings,
        }

    async def _quick_update_lead(
        self,
        lead_name_or_id: str,
        status: str = None,
        temperature: str = None,
        add_tags: list = None,
        remove_tags: list = None,
        notes: str = None,
        instagram: str = None,
        facebook: str = None,
        linkedin: str = None,
        whatsapp: str = None,
        email: str = None,
    ) -> dict:
        """Schnelles Lead-Update."""
        lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        if not lead:
            return {"error": f"Lead '{lead_name_or_id}' nicht gefunden"}

        update_data = {"updated_at": datetime.utcnow().isoformat()}
        changes = []

        if status:
            update_data["status"] = status
            changes.append(f"Status → {status}")
            if status in ["won", "lost"]:
                update_data["closed_at"] = datetime.utcnow().isoformat()

        if temperature:
            update_data["temperature"] = temperature
            changes.append(f"Temperatur → {temperature}")

        if add_tags or remove_tags:
            existing_tags = lead.get("tags") or []
            if isinstance(existing_tags, str):
                existing_tags = []

            if add_tags:
                existing_tags = list(set(existing_tags + add_tags))
                changes.append(f"Tags hinzugefügt: {', '.join(add_tags)}")

            if remove_tags:
                existing_tags = [t for t in existing_tags if t not in remove_tags]
                changes.append(f"Tags entfernt: {', '.join(remove_tags)}")

            update_data["tags"] = existing_tags

        if notes:
            existing_notes = lead.get("notes") or ""
            timestamp = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
            update_data["notes"] = f"{existing_notes}\n\n[{timestamp}] {notes}".strip()
            changes.append("Notiz hinzugefügt")

        # Social Media & Contact Info
        if instagram:
            # Extract handle from URL if needed
            handle = instagram.replace("https://instagram.com/", "").replace("http://instagram.com/", "").replace("instagram.com/", "").replace("@", "").strip()
            update_data["instagram"] = handle
            changes.append(f"Instagram → @{handle}")

        if facebook:
            # Keep full URL or extract username
            if "facebook.com" in facebook:
                update_data["facebook"] = facebook
            else:
                update_data["facebook"] = f"https://facebook.com/{facebook}"
            changes.append(f"Facebook → {update_data['facebook']}")

        if linkedin:
            # Extract username from URL if needed
            username = linkedin.replace("https://linkedin.com/in/", "").replace("http://linkedin.com/in/", "").replace("linkedin.com/in/", "").strip()
            update_data["linkedin"] = username
            changes.append(f"LinkedIn → {username}")

        if whatsapp:
            # Normalize phone number
            phone = whatsapp.replace(" ", "").replace("-", "").strip()
            update_data["whatsapp"] = phone
            changes.append(f"WhatsApp → {phone}")

        if email:
            update_data["email"] = email.strip().lower()
            changes.append(f"Email → {email}")

        if len(update_data) > 1:  # mehr als nur updated_at
            self.db.table("leads").update(update_data).eq("id", lead["id"]).execute()

        return {
            "success": True,
            "lead_name": lead.get("name"),
            "changes": changes,
            "message": f"✅ {lead.get('name')} aktualisiert: {', '.join(changes)}" if changes else "Keine Änderungen",
        }

    async def _search_by_tag(
        self,
        tags: list,
        match_all: bool = False,
        status: str = "all",
        limit: int = 20,
    ) -> dict:
        """Suche Leads nach Tags."""
        query = (
            self.db.table("leads")
            .select("id, name, company, status, temperature, tags, last_contact_at")
            .eq("user_id", self.user_id)
        )

        if status != "all":
            query = query.eq("status", status)

        # Tag-Filter: Supabase unterstützt contains für Arrays
        if match_all:
            # Alle Tags müssen vorhanden sein
            query = query.contains("tags", tags)
        else:
            # Mindestens ein Tag (OR) - wir müssen einzeln filtern
            query = query.overlaps("tags", tags)

        result = query.order("last_contact_at", desc=True).limit(limit).execute()

        return {
            "searched_tags": tags,
            "match_mode": "ALL" if match_all else "ANY",
            "count": len(result.data) if result else 0,
            "leads": result.data if result else [],
        }

    async def _get_pipeline_stats(self, include_values: bool = True) -> dict:
        """Pipeline-Statistiken pro Stage."""
        stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]

        pipeline = {}
        total_value = 0
        total_leads = 0

        for stage in stages:
            query = (
                self.db.table("leads")
                .select("id, deal_value", count="exact")
                .eq("user_id", self.user_id)
                .eq("status", stage)
            )
            result = query.execute()

            count = result.count if result else 0
            value = sum([l.get("deal_value") or 0 for l in (result.data or [])]) if include_values else 0

            pipeline[stage] = {
                "count": count,
                "value": value if include_values else None,
            }

            if stage not in ["won", "lost"]:
                total_leads += count
                total_value += value

        # Conversion Rate
        won_count = pipeline.get("won", {}).get("count", 0)
        lost_count = pipeline.get("lost", {}).get("count", 0)
        closed_total = won_count + lost_count
        win_rate = round((won_count / closed_total * 100), 1) if closed_total > 0 else 0

        return {
            "pipeline": pipeline,
            "summary": {
                "active_leads": total_leads,
                "pipeline_value": total_value if include_values else None,
                "win_rate": win_rate,
                "won_this_period": won_count,
                "lost_this_period": lost_count,
            }
        }

    # ═══════════════════════════════════════════════════════════
    # GOOGLE INTEGRATIONS
    # ═══════════════════════════════════════════════════════════

    async def _research_company(
        self,
        company_name: str,
        location: str = None,
    ) -> dict:
        """Recherchiere Firma via Google Places API."""
        api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not api_key:
            return {"error": "Google Places API nicht konfiguriert", "hint": "GOOGLE_PLACES_API_KEY in Environment setzen"}

        query = f"{company_name} {location}" if location else company_name

        try:
            async with httpx.AsyncClient() as client:
                # Text Search für Firmeninfos
                search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
                search_resp = await client.get(search_url, params={
                    "query": query,
                    "key": api_key,
                })
                search_data = search_resp.json()

                if search_data.get("status") != "OK" or not search_data.get("results"):
                    return {
                        "found": False,
                        "company_name": company_name,
                        "message": f"Keine Ergebnisse für '{company_name}' gefunden"
                    }

                place = search_data["results"][0]
                place_id = place.get("place_id")

                # Details abrufen
                details = {}
                if place_id:
                    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
                    details_resp = await client.get(details_url, params={
                        "place_id": place_id,
                        "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,reviews,types",
                        "key": api_key,
                    })
                    details_data = details_resp.json()
                    if details_data.get("status") == "OK":
                        details = details_data.get("result", {})

                return {
                    "found": True,
                    "company": {
                        "name": details.get("name") or place.get("name"),
                        "address": details.get("formatted_address") or place.get("formatted_address"),
                        "phone": details.get("formatted_phone_number"),
                        "website": details.get("website"),
                        "rating": details.get("rating"),
                        "total_reviews": details.get("user_ratings_total"),
                        "types": details.get("types", [])[:5],
                        "opening_hours": details.get("opening_hours", {}).get("weekday_text", []),
                    },
                    "top_reviews": [
                        {"text": r.get("text", "")[:200], "rating": r.get("rating")}
                        for r in (details.get("reviews") or [])[:3]
                    ],
                }

        except Exception as e:
            logger.error(f"Google Places error: {e}")
            return {"error": str(e), "found": False}

    async def _schedule_meeting(
        self,
        title: str,
        date: str,
        time: str,
        lead_name_or_id: str = None,
        duration_minutes: int = 30,
        location: str = None,
        notes: str = None,
    ) -> dict:
        """Plant Meeting - speichert in DB."""

        # Parse date/time
        meeting_datetime = self._parse_meeting_datetime(date, time)

        # Lead auflösen
        lead = None
        lead_id = None
        if lead_name_or_id:
            lead = await self._find_lead_by_name_or_id(lead_name_or_id)
            lead_id = lead.get("id") if lead else None

        # In DB speichern
        event_data = {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "lead_id": lead_id,
            "title": title,
            "start_time": meeting_datetime.isoformat(),
            "end_time": (meeting_datetime + timedelta(minutes=duration_minutes)).isoformat(),
            "location": location,
            "description": notes,
            "status": "scheduled",
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            self.db.table("calendar_events").insert(event_data).execute()

            return {
                "success": True,
                "event_id": event_data["id"],
                "title": title,
                "datetime": meeting_datetime.strftime("%d.%m.%Y um %H:%M"),
                "duration": f"{duration_minutes} Minuten",
                "lead": lead.get("name") if lead else None,
                "location": location,
                "message": f"✅ Meeting '{title}' am {meeting_datetime.strftime('%d.%m.%Y um %H:%M Uhr')} geplant!"
            }
        except Exception as e:
            logger.error(f"Schedule meeting error: {e}")
            return {"success": False, "error": str(e)}

    def _parse_meeting_datetime(self, date_str: str, time_str: str) -> datetime:
        """Parst Datum und Zeit für Meetings."""
        now = datetime.now(timezone.utc)
        date_lower = (date_str or "").lower()

        # Datum parsen
        if "today" in date_lower or "heute" in date_lower:
            target_date = now.date()
        elif "tomorrow" in date_lower or "morgen" in date_lower:
            target_date = (now + timedelta(days=1)).date()
        elif "next" in date_lower or "nächst" in date_lower:
            weekdays = {
                "monday": 0, "montag": 0,
                "tuesday": 1, "dienstag": 1,
                "wednesday": 2, "mittwoch": 2,
                "thursday": 3, "donnerstag": 3,
                "friday": 4, "freitag": 4,
                "saturday": 5, "samstag": 5,
                "sunday": 6, "sonntag": 6,
            }
            for day_name, day_num in weekdays.items():
                if day_name in date_lower:
                    days_ahead = (day_num - now.weekday() + 7) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    target_date = (now + timedelta(days=days_ahead)).date()
                    break
            else:
                target_date = (now + timedelta(days=7)).date()
        else:
            try:
                target_date = datetime.fromisoformat(date_str).date()
            except Exception:
                target_date = (now + timedelta(days=1)).date()

        # Zeit parsen
        time_lower = (time_str or "").lower().replace(" ", "").replace("uhr", "")
        try:
            if "pm" in time_lower:
                hour = int(time_lower.replace("pm", "").replace(":", "")[:2])
                if hour < 12:
                    hour += 12
                minute = 0
            elif "am" in time_lower:
                hour = int(time_lower.replace("am", "").replace(":", "")[:2])
                minute = 0
            elif ":" in time_str:
                parts = time_str.replace("Uhr", "").replace("uhr", "").strip().split(":")
                hour = int(parts[0])
                minute = int(parts[1]) if len(parts) > 1 else 0
            else:
                hour = int(time_str.replace("Uhr", "").replace("uhr", "").strip())
                minute = 0
        except Exception:
            hour, minute = 10, 0

        return datetime(target_date.year, target_date.month, target_date.day, hour, minute, tzinfo=timezone.utc)

    async def _prepare_message(
        self,
        lead_name_or_id: str,
        channel: str,
        message: str,
        subject: str = None,
    ) -> dict:
        """Bereitet Nachricht vor und gibt Deep Link zurück."""
        from urllib.parse import quote, quote_plus

        # Lead finden
        lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        if not lead:
            return {
                "success": False,
                "error": f"Lead '{lead_name_or_id}' nicht gefunden"
            }

        channel = channel.lower()
        deep_link = None
        contact_info = None

        if channel == "email":
            email = lead.get("email")
            if not email:
                return {"success": False, "error": "Keine Email-Adresse beim Lead hinterlegt", "lead_name": lead.get("name")}
            contact_info = email
            subject_encoded = quote(subject or "Nachricht")
            body_encoded = quote(message)
            deep_link = f"mailto:{email}?subject={subject_encoded}&body={body_encoded}"

        elif channel == "whatsapp":
            phone = lead.get("phone") or lead.get("mobile") or lead.get("telefon")
            if not phone:
                return {"success": False, "error": "Keine Telefonnummer beim Lead hinterlegt", "lead_name": lead.get("name")}
            # Nummer bereinigen (nur Zahlen, mit Ländervorwahl)
            clean_phone = ''.join(filter(str.isdigit, str(phone)))
            if clean_phone.startswith('0'):
                clean_phone = '43' + clean_phone[1:]  # Österreich default
            contact_info = phone
            message_encoded = quote_plus(message)
            deep_link = f"https://wa.me/{clean_phone}?text={message_encoded}"

        elif channel == "instagram":
            instagram = lead.get("instagram") or lead.get("instagram_handle") or lead.get("ig")
            if not instagram:
                return {"success": False, "error": "Kein Instagram-Handle beim Lead hinterlegt", "lead_name": lead.get("name")}
            # @ entfernen falls vorhanden, URL-Teile entfernen
            handle = str(instagram).lstrip('@').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '').split('/')[0].split('?')[0]
            contact_info = f"@{handle}"
            deep_link = f"https://instagram.com/{handle}"

        elif channel == "linkedin":
            linkedin = lead.get("linkedin") or lead.get("linkedin_url") or lead.get("li")
            if not linkedin:
                return {"success": False, "error": "Kein LinkedIn-Profil beim Lead hinterlegt", "lead_name": lead.get("name")}
            # Falls nur Username, URL bauen
            if not str(linkedin).startswith('http'):
                linkedin = f"https://linkedin.com/in/{linkedin}"
            contact_info = linkedin
            deep_link = linkedin

        else:
            return {"success": False, "error": f"Unbekannter Kanal: {channel}. Nutze: email, whatsapp, instagram, linkedin"}

        # Bisherige Interaktionen laden
        interaction_context = ""
        try:
            interactions = (
                self.db.table("lead_interactions")
                .select("*")
                .eq("lead_id", lead.get("id"))
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )
            items = interactions.data or []
            if items:
                interaction_context = "\n".join(
                    [
                        f"- {i.get('created_at')}: {i.get('interaction_type')} - {i.get('raw_notes') or i.get('summary') or ''}"
                        for i in items
                    ]
                )
        except Exception as exc:
            logger.debug(f"Could not load interactions for prepare_message: {exc}")

        # Interaktion loggen (non-blocking)
        try:
            self.db.table("lead_interactions").insert({
                "id": str(uuid.uuid4()),
                "lead_id": lead.get("id"),
                "user_id": self.user_id,
                "interaction_type": "message_prepared",
                "channel": channel,
                "notes": f"Nachricht vorbereitet: {message[:100]}",
                "interaction_at": datetime.utcnow().isoformat(),
                "raw_notes": message[:500],
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log interaction: {e}")

        channel_emoji = {"email": "📧", "whatsapp": "💬", "instagram": "📸", "linkedin": "💼"}.get(channel, "📨")
        channel_name = {"email": "Email", "whatsapp": "WhatsApp", "instagram": "Instagram DM", "linkedin": "LinkedIn"}.get(channel, channel)

        return {
            "success": True,
            "channel": channel,
            "channel_name": channel_name,
            "lead_id": lead.get("id"),  # Lead-ID für Frontend
            "lead_name": lead.get("name"),
            "contact_info": contact_info,
            "message_preview": message[:200] + "..." if len(message) > 200 else message,
            "deep_link": deep_link,
            "message": f"{channel_emoji} **Nachricht für {lead.get('name')} via {channel_name} bereit!**\n\nAn: {contact_info}\n\n> {message[:150]}{'...' if len(message) > 150 else ''}\n\n👆 Klicke auf **Senden** um {channel_name} zu öffnen.",
            "interaction_context": interaction_context,
        }

    async def _log_message_sent(
        self,
        lead_name_or_id: str,
        message: str,
        channel: str = "instagram",
        lead_id: str = None,
    ) -> dict:
        """
        Protokolliert dass eine Nachricht gesendet wurde und setzt Lead-Status auf "contacted".
        Wird automatisch aufgerufen wenn User sagt "Erstnachricht verschickt/gesendet" oder ähnlich.
        """
        try:
            # Lead finden
            if lead_id:
                lead = (
                    self.db.table("leads")
                    .select("*")
                    .eq("id", lead_id)
                    .eq("user_id", self.user_id)
                    .single()
                    .execute()
                )
                lead = lead.data if lead.data else None
            else:
                lead = await self._find_lead_by_name_or_id(lead_name_or_id)
            
            if not lead:
                return {
                    "success": False,
                    "error": f"Lead '{lead_name_or_id}' nicht gefunden"
                }
            
            lead_id = lead.get("id")
            now = datetime.utcnow()
            
            # 1. Lead-Status auf "contacted" setzen
            self.db.table("leads").update({
                "status": "contacted",
                "last_contact": now.isoformat(),
                "last_outreach_at": now.isoformat(),
            }).eq("id", lead_id).eq("user_id", self.user_id).execute()
            
            # 2. Interaktion loggen
            try:
                self.db.table("lead_interactions").insert({
                    "id": str(uuid.uuid4()),
                    "lead_id": lead_id,
                    "user_id": self.user_id,
                    "interaction_type": "message_sent",
                    "channel": channel.lower(),
                    "notes": f"Nachricht gesendet via {channel}",
                    "interaction_at": now.isoformat(),
                    "raw_notes": message[:500],
                }).execute()
            except Exception as e:
                logger.warning(f"Could not log interaction: {e}")
            
            # 3. Follow-up für 3 Tage später erstellen (falls noch keins existiert)
            try:
                existing_followup = (
                    self.db.table("followup_suggestions")
                    .select("id")
                    .eq("lead_id", lead_id)
                    .eq("user_id", self.user_id)
                    .eq("status", "pending")
                    .limit(1)
                    .execute()
                )
                
                if not existing_followup.data:
                    followup_date = now + timedelta(days=3)
                    self.db.table("followup_suggestions").insert({
                        "id": str(uuid.uuid4()),
                        "user_id": self.user_id,
                        "lead_id": lead_id,
                        "flow": "ERSTKONTAKT",
                        "stage": 1,
                        "template_key": "FIRST_CONTACT_FOLLOWUP",
                        "channel": channel.upper(),
                        "suggested_message": f"Hey {lead.get('name', '').split()[0] if lead.get('name') else 'du'}, ich wollte nochmal kurz nachhaken - hast du meine Nachricht gesehen? 🙂",
                        "reason": "Auto-Follow-up nach Erstnachricht",
                        "due_at": followup_date.isoformat(),
                        "status": "pending",
                        "title": f"Follow-up: {lead.get('name', 'Lead')}",
                        "priority": "medium",
                        "source": "auto_after_message_sent",
                        "created_at": now.isoformat(),
                    }).execute()
            except Exception as e:
                logger.warning(f"Could not create follow-up: {e}")
            
            return {
                "success": True,
                "lead_id": lead_id,
                "lead_name": lead.get("name"),
                "status_updated": "contacted",
                "message": f"✅ Nachricht für {lead.get('name')} protokolliert! Status auf 'contacted' gesetzt.",
            }
        except Exception as e:
            logger.error(f"Error in log_message_sent: {e}")
            return {
                "success": False,
                "error": str(e)
            }


