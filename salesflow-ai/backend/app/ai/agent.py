from datetime import datetime
import json
import os
import logging
import hashlib
import re
import itertools

from openai import AsyncOpenAI

from .tool_definitions import SALES_AGENT_TOOLS
from .tool_executor import ToolExecutor
from .system_prompt import build_system_prompt
from .model_router import ModelRouter, ModelTier
from .intent_detector import IntentDetector
from .cost_tracker import CostTracker
from ..services.ai_usage_service import AIUsageService
from ..services.collective_intelligence_engine import CollectiveIntelligenceEngine
from app.services.user_learning_service import UserLearningService
from ..services.activity_logger import ActivityLogger
import asyncio

logger = logging.getLogger(__name__)

client = None
router = ModelRouter()
_ = CollectiveIntelligenceEngine  # silence unused import warnings


def extract_names(message: str) -> list:
    """Extrahiert potenzielle Namen aus der Nachricht"""
    import re

    if not message:
        return []

    message_clean = message.lower()
    stop_words = [
        "was",
        "weißt",
        "weist",
        "du",
        "zu",
        "über",
        "lead",
        "kontakt",
        "kunde",
        "mein",
        "meine",
        "meinen",
        "der",
        "die",
        "das",
        "ein",
        "eine",
        "ist",
        "hat",
        "wie",
        "wer",
        "wo",
        "wann",
        "zeig",
        "mir",
        "info",
        "informationen",
        "details",
        "daten",
    ]

    words = message_clean.split()
    potential_names = [w for w in words if w not in stop_words and len(w) > 2]

    capitalized = re.findall(r"[A-ZÄÖÜ][a-zäöüß]+", message)

    all_names = potential_names + [n.lower() for n in capitalized]

    return list(set(all_names))


def determine_search_type(message: str, user_id: str, db) -> str:
    """Entscheidet, ob Lead-DB oder Web-Suche oder Knowledge genutzt wird."""
    message_lower = (message or "").lower()

    lead_keywords = ["lead", "kontakt", "kunde", "mein ", "meine ", "unser"]
    if any(kw in message_lower for kw in lead_keywords):
        return "leads_db"

    web_keywords = ["was ist", "erkläre", "wie funktioniert", "im web", "google", "suche nach"]
    if any(kw in message_lower for kw in web_keywords):
        return "web_search"

    potential_names = extract_names(message)
    for name in potential_names:
        lead = (
            db.table("leads")
            .select("id")
            .eq("user_id", user_id)
            .ilike("name", f"%{name}%")
            .limit(1)
            .execute()
        )
        if lead.data:
            return "leads_db"

    return "knowledge"


def fetch_lead_context(message: str, user_id: str, db) -> str:
    """Sucht Leads basierend auf Namen in der Nachricht."""
    print(f"DEBUG fetch_lead_context: message={message}, user_id={user_id}")
    names = extract_names(message)
    print(f"DEBUG extracted names: {names}")
    if not names:
        return ""

    leads_found = []
    for name in names:
        try:
            result = (
                db.table("leads")
                .select("*")
                .eq("user_id", user_id)
                .ilike("name", f"%{name}%")
                .execute()
            )
            count = len(result.data) if result and result.data else 0
            print(f"DEBUG query for '{name}': found {count} leads")
            if result.data:
                leads_found.extend(result.data)
        except Exception as e:
            print(f"DEBUG query for '{name}' failed: {e}")
            # still continue to next name
            continue

    if not leads_found:
        return ""

    context_parts: list[str] = []
    for lead in leads_found:
        parts: list[str] = []
        parts.append(f"Name: {lead.get('name', 'Unbekannt')}")
        if lead.get("email"):
            parts.append(f"Email: {lead.get('email')}")
        if lead.get("phone"):
            parts.append(f"Telefon: {lead.get('phone')}")
        if lead.get("company"):
            parts.append(f"Firma: {lead.get('company')}")
        if lead.get("status"):
            parts.append(f"Status: {lead.get('status')}")
        if lead.get("notes"):
            parts.append(f"Notizen: {lead.get('notes')}")
        if lead.get("whatsapp"):
            parts.append(f"WhatsApp: {lead.get('whatsapp')}")

        context_parts.append(" | ".join(parts))

    return "\n".join(context_parts)


def anonymize_message(message: str, lead_name: str = None, company: str = None, phone: str = None, email: str = None) -> str:
    """Replace PII with placeholders for learning."""
    result = message

    if lead_name:
        result = re.sub(re.escape(lead_name), "{{name}}", result, flags=re.IGNORECASE)
        first_name = lead_name.split()[0] if lead_name else ""
        if first_name:
            result = re.sub(r"\b" + re.escape(first_name) + r"\b", "{{name}}", result, flags=re.IGNORECASE)

    if company:
        result = re.sub(re.escape(company), "{{company}}", result, flags=re.IGNORECASE)
    if phone:
        result = re.sub(re.escape(phone), "{{phone}}", result, flags=re.IGNORECASE)
    if email:
        result = re.sub(re.escape(email), "{{email}}", result, flags=re.IGNORECASE)

    return result


async def find_similar_successes(db, vertical: str, step: int, channel: str, limit: int = 5) -> list:
    """Find similar messages that had positive outcomes."""
    try:
        result = (
            db.table("message_outcomes")
            .select("*")
            .eq("vertical", vertical)
            .gte("outcome_score", 5)
            .order("outcome_score", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.warning(f"Could not find similar successes: {e}")
        return []


async def log_message_outcome(
    db,
    user_id: str,
    lead_id: str,
    message: str,
    vertical: str,
    channel: str,
    step: int,
    outcome: str,
    lead_name: str = None,
    company: str = None,
):
    """Log message outcome for learning."""
    try:
        template = anonymize_message(message, lead_name, company)
        message_hash = hashlib.md5(template.encode()).hexdigest()

        score_map = {
            "sent": 1,
            "opened": 3,
            "responded": 10,
            "positive": 15,
            "booked": 25,
            "closed": 50,
            "no_response": -2,
            "negative": -5,
        }
        score = score_map.get(outcome, 0)

        db.table("message_outcomes").insert(
            {
                "user_id": user_id,
                "lead_id": lead_id,
                "message_template": template,
                "message_hash": message_hash,
                "vertical": vertical,
                "channel": channel,
                "sequence_step": step,
                "outcome": outcome,
                "outcome_score": score,
            }
        ).execute()

        logger.info(f"Logged outcome: {outcome} (score: {score}) for lead {lead_id}")
    except Exception as e:
        logger.error(f"Failed to log outcome: {e}")

def get_client():
    global client
    if client is None:
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client


async def extract_and_save_learnings(user_id: str, messages: list, response_text: str, db):
    """
    Extrahiert wichtige Fakten aus der Konversation und speichert sie in user_knowledge.
    Läuft bewusst defensiv und darf bei Fehlern nicht crashen.
    """
    try:
        convo_texts = []
        for m in messages or []:
            if not m:
                continue
            role = m.get("role") or ""
            content = m.get("content") or ""
            if content:
                convo_texts.append(f"{role}: {content}")
        if response_text:
            convo_texts.append(f"assistant: {response_text}")

        if not convo_texts:
            return

        prompt = (
            "Extrahiere nur dann Fakten über den User, wenn sie spezifisch und neu sind.\n"
            "Kategorien: personal (Name, Firma, Rolle, persönliche Details), "
            "preferences (Kommunikationsstil, Sprache, Formatierung), "
            "business (Produkte, Ziele, Herausforderungen, Strategien), "
            "contacts (erwähnte Leads/Partner/Kunden).\n"
            "Antwort-Format JSON: [{\"category\": \"personal|preferences|business|contacts\", \"content\": \"...\"}]\n"
            "Speichere keine allgemeinen Fragen, nichts Dupliziertes, keine trivialen Einmal-Infos."
        )

        client = get_client()
        completion = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "\n\n".join(convo_texts)},
            ],
            max_tokens=300,
            temperature=0.2,
        )
        content = completion.choices[0].message.content or ""
        try:
            data = json.loads(content)
            if not isinstance(data, list):
                return
        except Exception:
            logger.info("Learning extraction returned non-JSON, skipping")
            return

        allowed = {"personal", "preferences", "business", "contacts"}
        for item in data:
            if not isinstance(item, dict):
                continue
            category = (item.get("category") or "").strip().lower()
            text = (item.get("content") or "").strip()
            if category not in allowed or len(text) < 4:
                continue
            # Duplikate vermeiden
            exists = (
                db.table("user_knowledge")
                .select("id")
                .eq("user_id", user_id)
                .eq("category", category)
                .eq("content", text)
                .limit(1)
                .execute()
            )
            if exists.data:
                continue
            db.table("user_knowledge").insert(
                {
                    "user_id": user_id,
                    "category": category,
                    "content": text,
                }
            ).execute()
        logger.info("Learning extraction stored entries")
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning(f"extract_and_save_learnings failed: {exc}")

async def load_user_context_parallel(user_id: str, db):
    """Lädt User-Kontext parallel (Knowledge, Learning Profile, Revenue, Activities, Insights)."""

    async def fetch_knowledge():
        try:
            return await asyncio.to_thread(
                lambda: db.table("user_knowledge")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Could not load user knowledge: {exc}")
            return exc

    async def fetch_learning_profile():
        try:
            return await asyncio.to_thread(
                lambda: db.table("user_learning_profile")
                .select("*")
                .eq("user_id", user_id)
                .maybe_single()
                .execute()
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Could not load learning profile: {exc}")
            return exc

    async def fetch_revenue():
        try:
            start_of_month = datetime.now().replace(day=1)
            return await asyncio.to_thread(
                lambda: db.table("deals")
                .select("value")
                .eq("user_id", user_id)
                .eq("status", "won")
                .gte("closed_at", start_of_month.isoformat())
                .execute()
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Could not load revenue: {exc}")
            return exc

    async def fetch_recent_activities():
        try:
            activity_logger = ActivityLogger(db, user_id)
            return await activity_logger.get_recent(limit=10)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Could not load recent activities: {exc}")
            return exc

    async def fetch_learning_insights():
        try:
            learning_service = UserLearningService(db)
            return await learning_service.analyze_conversions(user_id, days_back=30)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Could not load learning insights: {exc}")
            return exc

    knowledge_result, learning_profile, revenue_result, recent_activities, learning_insights = await asyncio.gather(
        fetch_knowledge(),
        fetch_learning_profile(),
        fetch_revenue(),
        fetch_recent_activities(),
        fetch_learning_insights(),
        return_exceptions=True,
    )

    return {
        "knowledge_result": None if isinstance(knowledge_result, Exception) else knowledge_result,
        "learning_profile": None if isinstance(learning_profile, Exception) else learning_profile,
        "revenue_result": None if isinstance(revenue_result, Exception) else revenue_result,
        "recent_activities": [] if isinstance(recent_activities, Exception) else (recent_activities or []),
        "learning_insights": [] if isinstance(learning_insights, Exception) else (learning_insights or []),
    }


async def run_sales_agent(
    message: str,
    user_id: str,
    db,
    session_id: str = None,
    message_history: list = None,
) -> dict:
    """Run the sales agent with function calling."""

    # ⚡ POWER HOUR SESSION-AWARENESS
    # Prüfe ob eine aktive Power Hour Session existiert
    power_hour_session = None
    try:
        power_hour_result = await asyncio.to_thread(
            lambda: db.table("power_hour_sessions")
            .select("*")
            .eq("user_id", user_id)
            .is_("is_active", True)
            .maybe_single()
            .execute()
        )
        if power_hour_result and power_hour_result.data:
            power_hour_session = power_hour_result.data
    except Exception as e:
        logger.warning(f"Could not check for active Power Hour session: {e}")

    # Prüfe auf /stop oder /ende Commands zum Beenden der Power Hour
    message_lower = message.strip().lower()
    if power_hour_session and message_lower in ["/stop", "/ende", "stop", "ende", "fertig", "/fertig"]:
        try:
            # Power Hour Session beenden
            await asyncio.to_thread(
                lambda: db.table("power_hour_sessions")
                .update({"is_active": False, "ended_at": datetime.now().isoformat()})
                .eq("id", power_hour_session["id"])
                .execute()
            )
            
            # Berechne Dauer
            started = datetime.fromisoformat(power_hour_session["started_at"].replace("Z", "+00:00"))
            ended = datetime.now()
            actual_duration = (ended - started).total_seconds() // 60
            
            # Update duration
            await asyncio.to_thread(
                lambda: db.table("power_hour_sessions")
                .update({"actual_duration_minutes": int(actual_duration)})
                .eq("id", power_hour_session["id"])
                .execute()
            )
            
            contacts_made = power_hour_session.get("contacts_made", 0)
            messages_sent = power_hour_session.get("messages_sent", 0)
            
            summary = (
                f"🏁 POWER HOUR BEENDET!\n\n"
                f"⏱️ Zeit: {int(actual_duration)} Minuten\n"
                f"👥 {contacts_made} Kontakte erstellt\n"
                f"📝 {messages_sent} Nachrichten vorbereitet\n\n"
                f"🔥 Super Arbeit! Geh zu Leads und versende die Nachrichten!"
            )
            
            return {
                "message": summary,
                "tools_used": [],
                "session_id": session_id,
                "power_hour_ended": True,
            }
        except Exception as e:
            logger.error(f"Failed to end Power Hour session: {e}")
            # Continue with normal processing if ending fails

    profile_result = await asyncio.to_thread(
        lambda: db.table("profiles")
        .select("name, full_name, vertical, company_id, monthly_revenue_goal")
        .eq("id", user_id)
        .execute()
    )

    user_context = (
        profile_result.data[0]
        if profile_result and profile_result.data
        else {
            "name": None,
            "vertical": "mlm",
            "company_id": None,
            "monthly_revenue_goal": 0,
        }
    )

    if user_context.get("company_id"):
        company = await asyncio.to_thread(
            lambda: db.table("companies")
            .select("name, knowledge_base")
            .eq("id", user_context["company_id"])
            .single()
            .execute()
        )

        if company and company.data:
            user_context["company_name"] = company.data.get("name")
            user_context["company_knowledge"] = company.data.get("knowledge_base", "")

    context_data = await load_user_context_parallel(user_id, db)

    # User-uploaded knowledge base (products, docs, objections, scripts)
    knowledge_result = context_data.get("knowledge_result")
    records = knowledge_result.data if knowledge_result else []
    if records:
        if isinstance(records, dict):
            records = [records]

        context_parts: list[str] = []

        # Legacy Struktur (eine Zeile mit company/products/objections/documents)
        legacy = next(
            (
                r
                for r in records
                if isinstance(r, dict)
                and any(
                    key in r
                    for key in ["company_name", "company_description", "products", "custom_objections", "documents"]
                )
            ),
            None,
        )

        if legacy:
            if legacy.get("company_name"):
                context_parts.append(f"## Firma: {legacy['company_name']}")
                if legacy.get("company_description"):
                    context_parts.append(legacy["company_description"])

            if legacy.get("products"):
                context_parts.append("\n## Produkte:")
                for p in legacy["products"]:
                    if isinstance(p, dict):
                        context_parts.append(f"\n### {p.get('name', 'Produkt')}")
                        if p.get("description"):
                            context_parts.append(p["description"])
                        if p.get("price"):
                            context_parts.append(f"Preis: {p['price']}")
                        if p.get("benefits"):
                            context_parts.append(f"Vorteile: {', '.join(p['benefits'])}")
                        if p.get("objections"):
                            for obj in p["objections"]:
                                if isinstance(obj, dict):
                                    context_parts.append(
                                        f"- Einwand '{obj.get('objection', '')}': {obj.get('response', '')}"
                                    )
                                elif isinstance(obj, str):
                                    context_parts.append(f"- Einwand: {obj}")
                    elif isinstance(p, str):
                        context_parts.append(f"\n### {p}")

            if legacy.get("custom_objections"):
                context_parts.append("\n## Einwandbehandlung:")
                for obj in legacy["custom_objections"]:
                    context_parts.append(
                        f"- '{obj.get('objection', '')}' → {obj.get('response', '')}"
                    )

            if legacy.get("documents"):
                context_parts.append("\n## Dokumente:")
                for doc in legacy["documents"]:
                    context_parts.append(f"\n### {doc.get('filename')}")
                    content = (doc.get("content") or "")[:2000]
                    context_parts.append(content)

        # Neue, einfache Knowledge-Einträge (category + content)
        simple_entries = [
            r for r in records if isinstance(r, dict) and r.get("category") and r.get("content")
        ]
        
        # Trenne Präferenzen von anderen Knowledge-Einträgen
        preferences_entries = [e for e in simple_entries if e.get("category") == "preferences"]
        other_entries = [e for e in simple_entries if e.get("category") != "preferences"]
        
        if preferences_entries:
            context_parts.append("\n## USER-PRÄFERENZEN (IMMER BEACHTEN):")
            for item in preferences_entries:
                content = item.get("content", "")
                # Parse "key: value" Format
                if ":" in content:
                    key, value = content.split(":", 1)
                    context_parts.append(f"- {key.strip()}: {value.strip()}")
                else:
                    context_parts.append(f"- {content}")
        
        if other_entries:
            context_parts.append("\n## Persönliche Notizen & Wissen:")
            for item in other_entries:
                date_str = None
                created = item.get("created_at") or item.get("updated_at")
                if isinstance(created, str):
                    date_str = created.split("T")[0]
                line = f"- [{item.get('category')}] {item.get('content')}"
                if date_str:
                    line += f" ({date_str})"
                context_parts.append(line)

        if context_parts:
            user_context["user_knowledge"] = "\n".join(context_parts)

    # User learning profile (Präferenzen)
    learning_profile = context_data.get("learning_profile")
    lp = learning_profile.data if learning_profile else None
    if lp:
        user_context["learning_profile"] = (
            f"Kommunikationsstil: {lp.get('preferred_tone') or lp.get('tone') or 'professionell'}\n"
            f"Bevorzugte Nachrichtenlänge: {lp.get('avg_message_length', 'mittel')}\n"
            f"Emoji-Nutzung: {lp.get('emoji_usage_level', 'wenig')}\n"
            f"Sales-Stil: {lp.get('sales_style', 'beratend')}"
        )

    revenue = context_data.get("revenue_result")
    revenue_data = revenue.data if revenue else []
    user_context["current_revenue"] = sum([d.get("value") or 0 for d in revenue_data])

    # Activity & Learning Context
    learning_context = ""
    recent_activities = context_data.get("recent_activities") or []
    learning_insights = context_data.get("learning_insights") or []

    # Smart Routing: Lead vs Web vs Knowledge
    search_type = determine_search_type(message, user_id, db)
    lead_context_block = ""
    if search_type == "leads_db":
        try:
            lead_ctx = fetch_lead_context(message, user_id, db)
            if lead_ctx:
                lead_context_block = f"\n\nLead aus CRM:\n{lead_ctx}"
        except Exception as e:
            logger.warning(f"Could not fetch lead context: {e}")
    elif search_type == "web_search":
        lead_context_block = "\n\nWeb-Ergebnisse: (keine Live-Suche ausgeführt)"

    # Letzte Aktivitäten
    if recent_activities:
        learning_context += "\n\nLETZTE USER-AKTIVITÄTEN:\n"
        for act in recent_activities[:5]:
            learning_context += (
                f"- {act.get('action_type', 'unknown')} {act.get('entity_type', '')}: "
                f"{act.get('entity_name', act.get('entity_id', ''))}\n"
            )

    # Learning Insights
    if learning_insights:
        learning_context += "\n\nERKENNTNISSE AUS ERFOLGREICHEN CONVERSIONS:\n"
        for insight in learning_insights[:3]:
            try:
                confidence_pct = f"{insight.confidence:.0%}"
            except Exception:
                confidence_pct = str(insight.confidence)
            learning_context += f"- {insight.pattern_type}: {insight.successful_value} (Confidence: {confidence_pct})\n"

    system_prompt = build_system_prompt(user_context) + learning_context + lead_context_block

    # ⚡ POWER HOUR MODUS - Wenn aktiv, füge spezielle Anweisungen hinzu
    if power_hour_session:
        power_hour_instructions = """

═══════════════════════════════════════════════════════════════════════════════
⚡⚡⚡ POWER HOUR MODUS AKTIV ⚡⚡⚡
═══════════════════════════════════════════════════════════════════════════════

WICHTIG: Der User befindet sich in einer aktiven Power Hour Session!

REGELN IM POWER HOUR MODUS:
1. JEDE Eingabe des Users ist ein neuer Lead-Input
2. KEIN Smalltalk - nur Lead-Verarbeitung
3. Automatisch für jeden Input:
   - Lead erstellen (create_lead)
   - Personalisierte Erstnachricht generieren (prepare_message)
   - Follow-up erstellen (create_follow_up)
4. Kurze, prägnante Bestätigungen:
   "✅ [Name] erstellt | Nachricht vorbereitet | Follow-up in 3 Tagen"

INPUT-FORMATE ERKENNEN:
- Bild/Profil: Vision nutzen, Name/Username/Bio/Plattform extrahieren
- Text: Namen + Infos parsen (z.B. "Max Mustermann, Unternehmer aus Wien")
- Link: Plattform erkennen, Username extrahieren
- Sprachnachricht: Transkription (falls verfügbar) wie Text behandeln

BEISPIEL-ANTWORT:
✅ Max Mustermann (@max.mustermann) | Instagram
📝 'Hallo Max! Dein Profil über [Thema] hat mich angesprochen...'
📅 Follow-up: Montag, 20.01.2025
⏱️ 3 Leads | 12 Minuten

NICHT fragen, ob es ein Lead ist - BEHANDLE ES SOFORT ALS LEAD!

═══════════════════════════════════════════════════════════════════════════════
"""
        system_prompt = power_hour_instructions + system_prompt

    # Find similar successful messages for context
    similar_successes = []
    if user_context.get("vertical"):
        try:
            similar_successes = await find_similar_successes(
                db,
                vertical=user_context.get("vertical", "network"),
                step=user_context.get("sequence_step", 1),
                channel="whatsapp",
                limit=3,
            )
        except Exception as e:
            logger.warning(f"Similarity lookup failed: {e}")

    # Add to system prompt if we have examples
    if similar_successes:
        success_examples = "\n".join(
            [f"- {s['message_template']} (Score: {s['outcome_score']})" for s in similar_successes]
        )
        system_prompt += (
            f"\n\n## ERFOLGREICHE BEISPIELE AUS UNSERER DATENBANK:\n"
            f"{success_examples}\n\nNutze diese als Inspiration für deinen Stil."
        )

    messages = [{"role": "system", "content": system_prompt}]

    if message_history:
        messages.extend(message_history)

    messages.append({"role": "user", "content": message})

    tool_executor = ToolExecutor(db, user_id, user_context)
    client_instance = get_client()
    usage_service = AIUsageService(user_id)

    # Initialize AI services for model routing and cost tracking
    intent_detector = IntentDetector(client_instance)
    cost_tracker = CostTracker(db)

    # Step 1: Detect intent and route to appropriate model
    detected_intent, selected_model = await intent_detector.classify_with_fallback(message)
    logger.info(f"User {user_id}: Intent '{detected_intent}' -> Model {selected_model.value}")

    # Check limits before making request
    limits = await usage_service.check_limits()
    if limits["is_over_limit"]:
        limit_msg = (
            f"⚠️ Du hast dein monatliches Limit erreicht "
            f"({limits['tokens_used']:,} / {limits['tokens_limit']:,} Tokens). "
            f"Upgrade auf {('Pro' if limits['tier'] == 'basic' else 'Business')} für mehr."
        )
        return {
            "response": limit_msg,
            "message": limit_msg,
            "limit_reached": True,
            "tools_used": [],
            "session_id": session_id,
        }

    response = await client_instance.chat.completions.create(
        model=selected_model.value,
        messages=messages,
        tools=SALES_AGENT_TOOLS,
        tool_choice="auto",
    )

    assistant_message = response.choices[0].message
    tools_used = []

    # Track cost for initial response
    initial_input_tokens = response.usage.prompt_tokens if response.usage else 0
    initial_output_tokens = response.usage.completion_tokens if response.usage else 0

    await cost_tracker.log_usage(
        user_id=user_id,
        org_id=user_context.get("org_id"),
        model=selected_model.value,
        input_tokens=initial_input_tokens,
        output_tokens=initial_output_tokens,
        intent=detected_intent,
        session_id=session_id
    )

    if response.usage:
        await usage_service.track_usage(
            model=selected_model.value,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )

    while assistant_message.tool_calls:
        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_message.tool_calls
                ],
            }
        )

        for tool_call in assistant_message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments or "{}")

            result = await tool_executor.execute(tool_name, arguments)
            tools_used.append({"tool": tool_name, "args": arguments})

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                }
            )

        # Route follow-up calls (may use different model based on tool context)
        followup_model = router.route(message, detected_intent, assistant_message.tool_calls)
        if followup_model != selected_model:
            logger.info(f"Follow-up call routed to {followup_model.value} (was {selected_model.value})")

        response = await client_instance.chat.completions.create(
            model=followup_model.value,
            messages=messages,
            tools=SALES_AGENT_TOOLS,
            tool_choice="auto",
        )

        assistant_message = response.choices[0].message

        # Track cost for follow-up call
        followup_input_tokens = response.usage.prompt_tokens if response.usage else 0
        followup_output_tokens = response.usage.completion_tokens if response.usage else 0

        await cost_tracker.log_usage(
            user_id=user_id,
            org_id=user_context.get("org_id"),
            model=followup_model.value,
            input_tokens=followup_input_tokens,
            output_tokens=followup_output_tokens,
            intent=f"{detected_intent}_followup",
            session_id=session_id,
            tool_calls=assistant_message.tool_calls
        )

        if response.usage:
            await usage_service.track_usage(
                model=followup_model.value,
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
            )

    db.table("ai_chat_messages").insert(
        {
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": message,
        }
    ).execute()

    db.table("ai_chat_messages").insert(
        {
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": assistant_message.content,
            "tools_used": tools_used,
        }
    ).execute()

    return {
        "message": assistant_message.content,
        "tools_used": tools_used,
        "session_id": session_id,
    }

