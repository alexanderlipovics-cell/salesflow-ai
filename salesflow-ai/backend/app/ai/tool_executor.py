from typing import Any, Dict
import json
from datetime import datetime, timedelta, timezone
import os
import logging

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
            "create_followup": self._create_follow_up,
            "create_follow_up": self._create_follow_up,
            "log_interaction": self._log_interaction,
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
        """Query follow-ups and tasks."""

        query = self.db.table("lead_tasks").select(
            "id, title, description, due_date, priority, status, type, "
            "lead_id, leads(name, company)"
        ).eq("user_id", self.user_id).eq("status", "pending")

        now = datetime.now()

        if timeframe == "today":
            query = query.gte("due_date", now.date().isoformat())
            query = query.lt("due_date", (now.date() + timedelta(days=1)).isoformat())
        elif timeframe == "tomorrow":
            tomorrow = now.date() + timedelta(days=1)
            query = query.gte("due_date", tomorrow.isoformat())
            query = query.lt("due_date", (tomorrow + timedelta(days=1)).isoformat())
        elif timeframe == "this_week":
            week_end = now.date() + timedelta(days=(6 - now.weekday()))
            query = query.lte("due_date", week_end.isoformat())
        elif timeframe == "overdue":
            query = query.lt("due_date", now.date().isoformat())

        if priority != "all":
            query = query.eq("priority", priority)

        query = query.order("due_date").limit(limit)

        result = query.execute()

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
        """Create a new task/follow-up."""

        resolved_lead_id = lead_id
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

        now = datetime.now()
        if due_date == "tomorrow":
            due = now + timedelta(days=1)
        elif due_date == "next_week":
            due = now + timedelta(days=7)
        elif due_date:
            try:
                due = datetime.fromisoformat(due_date)
            except Exception:  # noqa: BLE001
                due = now + timedelta(days=1)
        else:
            due = now + timedelta(days=1)

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
        """Erstellt ein Follow-up mit minimalen Angaben und legt es in lead_tasks an."""
        try:
            def _next_weekday(target_weekday: int, now_dt: datetime) -> datetime:
                """Get next occurrence of weekday (0=Mon)."""
                days_ahead = (target_weekday - now_dt.weekday() + 7) % 7
                days_ahead = 7 if days_ahead == 0 else days_ahead
                return now_dt + timedelta(days=days_ahead)

            due_date_str = (due_date or "").lower()
            now = datetime.now(timezone.utc)

            # Relative / keyword parsing
            if "tomorrow" in due_date_str or "morgen" in due_date_str:
                parsed_due = now + timedelta(days=1)
            elif "3 day" in due_date_str or "3 tag" in due_date_str or "3 tage" in due_date_str or "in 3 tagen" in due_date_str:
                parsed_due = now + timedelta(days=3)
            elif "week" in due_date_str or "woche" in due_date_str or "nächste" in due_date_str or "next week" in due_date_str:
                parsed_due = now + timedelta(days=7)
            elif "montag" in due_date_str:
                parsed_due = _next_weekday(0, now)
            elif "dienstag" in due_date_str:
                parsed_due = _next_weekday(1, now)
            elif "mittwoch" in due_date_str:
                parsed_due = _next_weekday(2, now)
            elif "donnerstag" in due_date_str:
                parsed_due = _next_weekday(3, now)
            elif "freitag" in due_date_str:
                parsed_due = _next_weekday(4, now)
            elif "samstag" in due_date_str:
                parsed_due = _next_weekday(5, now)
            elif "sonntag" in due_date_str:
                parsed_due = _next_weekday(6, now)
            else:
                try:
                    parsed_due = datetime.fromisoformat(due_date_str)
                except Exception:
                    parsed_due = now + timedelta(days=1)

            lead_id = None
            resolved_name = lead_name
            result = (
                self.db.table("leads")
                .select("id, name")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{lead_name}%")
                .limit(1)
                .execute()
            )

            if result and result.data:
                lead_id = result.data[0]["id"]
                resolved_name = result.data[0]["name"]

            task_data = {
                "lead_id": lead_id,
                "user_id": self.user_id,
                "task_type": "follow_up",
                "status": "open",
                "template_key": channel or "whatsapp",
                "due_at": parsed_due.isoformat(),
                "note": message or f"Follow-up für {resolved_name}",
            }

            insert_result = self.db.table("lead_tasks").insert(task_data).execute()

            if not insert_result or not insert_result.data:
                return {"success": False, "error": "Follow-up konnte nicht erstellt werden"}

            weekday_names = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
            weekday_label = weekday_names[parsed_due.weekday()]
            date_str = parsed_due.strftime("%d.%m.%Y")
            return {
                "success": True,
                "message": f"✅ Follow-up für {resolved_name} am {weekday_label}, den {date_str}, geplant!",
            }
        except Exception as e:  # noqa: BLE001
            logger.error(f"Create follow-up FAILED: {type(e).__name__}: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    async def _log_interaction(
        self,
        interaction_type: str,
        lead_id: str = None,
        lead_name: str = None,
        outcome: str = None,
        notes: str = None,
    ) -> dict:
        """Log an interaction with a lead."""

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

        self.db.table("lead_interactions").insert(
            {
                "user_id": self.user_id,
                "lead_id": resolved_lead_id,
                "type": interaction_type,
                "outcome": outcome,
                "notes": notes,
                "created_at": datetime.now().isoformat(),
            }
        ).execute()

        if resolved_lead_id:
            self.db.table("leads").update(
                {"last_contact": datetime.now().isoformat()}
            ).eq("id", resolved_lead_id).execute()

        return {
            "success": True,
            "message": f"✅ {interaction_type.capitalize()} geloggt",
        }

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

