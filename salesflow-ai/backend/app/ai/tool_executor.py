from typing import Any, Dict, List, Optional
import json
from datetime import datetime, timedelta, timezone
import os
import logging
import uuid

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
            "get_lead_details": self._get_lead_details,
            "query_follow_ups": self._query_follow_ups,
            "get_followup_suggestions": self._get_followup_suggestions,
            "start_followup_flow": self._start_followup_flow,
            "get_followup_stats": self._get_followup_stats,
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
            "log_interaction": self._log_interaction,
            "generate_customer_protocol": self._generate_customer_protocol,
            "update_lead_status": self._update_lead_status,
            "start_power_hour": self._start_power_hour,
        }

        if tool_name not in executor_map:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            logger.info(f"Executing tool: {tool_name} with args: {arguments}")
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
        limit: int = 10,
        order_by: str = "last_contact",
    ) -> dict:
        """Query leads with filters."""

        query = self.db.table("leads").select(
            "id, name, email, phone, company, status, temperature, created_at, tags"
        ).eq("user_id", self.user_id)

        if status:
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

        return {
            "count": len(result.data) if result and result.data else 0,
            "leads": result.data if result else [],
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
            .select("*, lead_interactions(*), lead_tasks(*)")
            .eq("id", resolved_lead_id)
            .single()
            .execute()
        )

        return lead.data if lead else {}

    async def _query_follow_ups(
        self,
        timeframe: str = "today",
        priority: str = "all",
        limit: int = 10,
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

        if timeframe == "today":
            query = query.gte("due_at", start_of_day.isoformat()).lte("due_at", end_of_day.isoformat())
        elif timeframe == "tomorrow":
            tomorrow_start = (start_of_day + timedelta(days=1)).isoformat()
            tomorrow_end = (end_of_day + timedelta(days=1)).isoformat()
            query = query.gte("due_at", tomorrow_start).lte("due_at", tomorrow_end)
        elif timeframe == "this_week":
            week_end = end_of_day + timedelta(days=(6 - now.weekday()))
            query = query.lte("due_at", week_end.isoformat())
        elif timeframe == "overdue":
            query = query.lt("due_at", now.isoformat())

        if priority != "all":
            query = query.eq("priority", priority)

        result = query.order("due_at").limit(limit).execute()

        return {
            "count": len(result.data) if result and result.data else 0,
            "follow_ups": result.data if result else [],
        }

    async def _get_followup_suggestions(self, limit: int = 10, status: str = "pending") -> Any:
        """Hole fällige Follow-up Vorschläge (Supabase)."""
        now = datetime.utcnow().isoformat()

        result = (
            self.db.table("followup_suggestions")
            .select("*, leads(name, company, phone, email)")
            .eq("user_id", self.user_id)
            .eq("status", status)
            .lte("due_at", now)
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
            snippet = (s.get("suggested_message") or "").strip()
            if len(snippet) > 60:
                snippet = snippet[:60] + "..."
            response += f"   💬 _{snippet}_\n\n"

        response += "\nSoll ich eine Nachricht vorbereiten oder einen überspringen?"
        return response

    async def _start_followup_flow(self, lead_id: str, flow: str) -> Any:
        """Startet Follow-up Flow und setzt nächste Stage."""
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
        ).eq("id", lead_id).eq("user_id", self.user_id).execute()

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

        if lead_id or lead_name:
            lead_data = await self._get_lead_details(lead_id=lead_id, lead_name=lead_name)
            if lead_data and not lead_data.get("error"):
                lead_context = f"""
                Lead: {lead_data.get('name')}
                Firma: {lead_data.get('company')}
                Letzter Kontakt: {lead_data.get('last_contact')}
                Status: {lead_data.get('status')}
                """

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

    # ─────────────────────────────────────────────────────────
    # ACTIONS
    # ─────────────────────────────────────────────────────────

    async def _create_lead(
        self,
        name: str,
        phone: str = None,
        email: str = None,
        notes: str = None,
    ) -> dict:
        """Erstellt einen Lead - nur Name required."""
        try:
            lead_data = {
                "user_id": self.user_id,
                "name": name,
                "phone": phone,
                "email": email,
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

            response = f"✅ Lead **{name}** erstellt!"

            if phone:
                response += f"\n📱 Telefon: {phone}"
            if email:
                response += f"\n📧 Email: {email}"

            if phone:
                response += "\n\nSoll ich eine WhatsApp-Nachricht vorbereiten?"
            elif not phone and not email:
                response += "\n\nHast du eine Telefonnummer oder Email? Dann kann ich dir eine Nachricht vorbereiten."

            return {
                "success": True,
                "lead_id": lead.get("id"),
                "message": response,
            }
        except Exception as e:  # noqa: BLE001
            logger.error(f"Create lead error: {e}")
            return {"success": False, "error": str(e)}

    def _parse_due_datetime(self, due_date: str | None) -> datetime:
        """Parst relative Angaben wie 'tomorrow', 'next_week' oder ISO-Strings."""
        now = datetime.now(timezone.utc)
        due_date_str = (due_date or "").lower()

        def _next_weekday(target_weekday: int, now_dt: datetime) -> datetime:
            """Get next occurrence of weekday (0=Mon)."""
            days_ahead = (target_weekday - now_dt.weekday() + 7) % 7
            days_ahead = 7 if days_ahead == 0 else days_ahead
            return now_dt + timedelta(days=days_ahead)

        if "tomorrow" in due_date_str or "morgen" in due_date_str:
            return now + timedelta(days=1)
        if "3 day" in due_date_str or "3 tag" in due_date_str or "3 tage" in due_date_str or "in 3 tagen" in due_date_str:
            return now + timedelta(days=3)
        if "week" in due_date_str or "woche" in due_date_str or "nächste" in due_date_str or "next week" in due_date_str:
            return now + timedelta(days=7)
        weekday_map = {
            "montag": 0,
            "dienstag": 1,
            "mittwoch": 2,
            "donnerstag": 3,
            "freitag": 4,
            "samstag": 5,
            "sonntag": 6,
        }
        for key, value in weekday_map.items():
            if key in due_date_str:
                return _next_weekday(value, now)

        if due_date_str in {"next_week"}:
            return now + timedelta(days=7)
        if due_date_str:
            try:
                return datetime.fromisoformat(due_date_str)
            except Exception:
                return now + timedelta(days=1)
        return now + timedelta(days=1)

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

    async def _log_interaction(
        self,
        lead_name_or_id: str,
        interaction_type: str,
        summary: str,
        tags: Optional[List[str]] = None,
        key_facts: Optional[Dict[str, Any]] = None,
        outcome: str = "neutral",
        next_steps: Optional[List[str]] = None,
        lead_updates: Optional[Dict[str, Any]] = None,
        create_followup: bool = True,
        followup_days: int = 3,
    ) -> str:
        """Speichert eine Interaktion und aktualisiert den Lead."""
        print(f"[DEBUG] log_interaction called with lead='{lead_name_or_id}', type='{interaction_type}'")

        lead = await self._find_lead_by_name_or_id(lead_name_or_id)
        lead_was_created = False
        if not lead:
            new_lead_data = {
                "id": str(uuid.uuid4()),
                "user_id": self.user_id,
                "name": lead_name_or_id,
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
            "next_steps": next_steps or [],
            "raw_notes": summary,
        }

        interaction_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(self.user_id),
            "lead_id": str(lead["id"]),
            "interaction_type": interaction_type or "meeting",
            "channel": interaction_type or "meeting",
            "summary": summary or "",
            "details": details,
            "outcome": outcome or "neutral",
            "logged_by": "chief",
            "source": "chief",
            "interaction_at": now.isoformat() + "Z",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
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

        if tags:
            existing_tags = lead.get("tags") or []
            if isinstance(existing_tags, str):
                existing_tags = []
            merged_tags = list({*existing_tags, *tags})
            lead_update_data["tags"] = merged_tags

        self.db.table("leads").update(lead_update_data).eq("id", lead["id"]).execute()

        if create_followup and outcome in {"positive", "follow_up_needed"}:
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
            .eq("user_id", self.user_id)
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

        self.db.table("leads").update(update_data).eq("id", resolved_lead_id).execute()

        return {
            "success": True,
            "message": f"✅ Status auf '{new_status}' geändert",
        }

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

