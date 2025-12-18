from datetime import datetime, timedelta
import json
import os
import logging
import hashlib
import re
import itertools

from openai import AsyncOpenAI, RateLimitError, APIError
from groq import AsyncGroq

# Token-Schätzung für Groq Limit-Check
def estimate_tokens(text: str) -> int:
    """
    Schätzt Token-Anzahl grob (ca. 4 Zeichen pro Token).
    Einfache Heuristik für schnelle Prüfung ohne tiktoken Dependency.
    """
    if not text:
        return 0
    # Basis-Schätzung: 4 Zeichen pro Token
    return len(text) // 4

def estimate_message_tokens(messages: list) -> int:
    """
    Schätzt Token-Anzahl für eine Liste von Messages.
    Berücksichtigt vollständige Prompt-Länge (system_prompt + message + history).
    """
    total = 0
    for msg in messages:
        content = msg.get("content", "") if isinstance(msg, dict) else ""
        total += estimate_tokens(content)
        # Overhead für Role, Formatierung und JSON-Struktur (~15 Tokens pro Message)
        total += 15
    return total

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
from ..utils.chat_parser import parse_chat_export, extract_lead_name, analyze_conversation
import asyncio

logger = logging.getLogger(__name__)

# Groq Model String
GROQ_MODEL = "llama-3.3-70b-versatile"

def get_optimal_model(intent: str, needs_tools: bool, message: str) -> str:
    """
    Smart Model Routing für minimale Kosten.
    Mini ist gut genug für Nachrichten-Verbesserungen!
    
    Strategie:
    - Groq: Einfache Chats, Queries (30%)
    - gpt-4o-mini: Nachrichten + Verbesserungen + Tools (65%)
    - gpt-4o: NUR explizit strategische Anfragen (5%)
    """
    
    message_lower = message.lower()
    
    # Explizit strategische Anfragen → gpt-4o (nur ~5%)
    strategic_keywords = [
        'strategie', 'strategy', 'verkaufspsychologie',
        'closing technik', 'closing-technik', 'überzeugen',
        'profi', 'experte', 'psychologie', 'manipulation',
        'schwieriger kunde', 'hartnäckig', 'einwand behandlung',
        'verkaufspsychologie', 'verkaufstaktik', 'verkaufsstrategie',
        'schwierige situation', 'komplexe situation'
    ]
    is_strategic = any(kw in message_lower for kw in strategic_keywords)
    
    if is_strategic:
        logger.info(f"Using gpt-4o for strategic request: {message[:50]}...")
        return "gpt-4o"
    
    # Tool Calls → gpt-4o-mini (zuverlässig + günstig)
    if needs_tools:
        logger.info(f"Using gpt-4o-mini for tool calls")
        return "gpt-4o-mini"
    
    # Nachrichten schreiben/verbessern → gpt-4o-mini (gut genug!)
    if intent == "CONTENT":
        logger.info(f"Using gpt-4o-mini for content generation")
        return "gpt-4o-mini"
    
    # Einfache Chats, Queries → Groq (FREE!)
    if intent in ["CHAT", "QUERY"]:
        logger.info(f"Using Groq for simple {intent}")
        return "groq"
    
    # Default → Mini
    return "gpt-4o-mini"

# Simple Cache für User Profile (5 Minuten TTL)
_user_cache = {}

async def get_user_profile_cached(user_id: str, db):
    """Cached User Profile für 5 Minuten"""
    cache_key = f"profile_{user_id}"
    if cache_key in _user_cache:
        data, timestamp = _user_cache[cache_key]
        if datetime.now() - timestamp < timedelta(minutes=5):
            logger.debug(f"Using cached profile for user {user_id}")
            return data
    
    # Fetch from DB
    profile_result = await asyncio.to_thread(
        lambda: db.table("profiles")
        .select("name, full_name, vertical, company_id, monthly_revenue_goal")
        .eq("id", user_id)
        .execute()
    )
    
    data = (
        profile_result.data[0]
        if profile_result and profile_result.data
        else {
            "name": None,
            "vertical": "mlm",
            "company_id": None,
            "monthly_revenue_goal": 0,
        }
    )
    
    _user_cache[cache_key] = (data, datetime.now())
    return data


async def call_openai_with_fallback(client, model: str, messages: list, tools: list = None, tool_choice: str = "auto", **kwargs):
    """Call OpenAI with automatic retry and fallback to gpt-4o-mini on rate limit."""
    
    fallback_models = {
        "gpt-4o": "gpt-4o-mini",
        "gpt-4-turbo": "gpt-4o-mini",
        "gpt-4": "gpt-4o-mini",
    }
    
    current_model = model
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            params = {
                "model": current_model,
                "messages": messages,
                **kwargs
            }
            if tools:
                params["tools"] = tools
                params["tool_choice"] = tool_choice
            
            response = await client.chat.completions.create(**params)
            
            # Log wenn Fallback verwendet wurde
            if current_model != model:
                logger.info(f"Successfully used fallback model {current_model} instead of {model}")
            
            return response
            
        except RateLimitError as e:
            logger.warning(f"Rate limit hit for {current_model} (attempt {attempt + 1}/{max_retries}): {e}")
            
            # Fallback zu kleinerem Modell
            if current_model in fallback_models and attempt == 0:
                fallback = fallback_models[current_model]
                logger.info(f"Falling back from {current_model} to {fallback}")
                current_model = fallback
            else:
                # Warten und retry
                wait_time = min(30, 10 * (attempt + 1))
                logger.info(f"Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
                
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(5)
            else:
                raise
    
    # Letzter Versuch mit Mini-Modell
    logger.warning(f"All retries failed for {model}, final attempt with gpt-4o-mini")
    params = {
        "model": "gpt-4o-mini",
        "messages": messages,
        **kwargs
    }
    if tools:
        params["tools"] = tools
        params["tool_choice"] = tool_choice
    return await client.chat.completions.create(**params)

client = None
router = ModelRouter()
_ = CollectiveIntelligenceEngine  # silence unused import warnings


# Stoppwörter für Lead-Suche
STOPWORDS = {"mit", "und", "oder", "aber", "bitte", "immer", "noch", "schon", "auch", "nur", "mal", "gib", "mir", "eine", "der", "die", "das", "den", "dem", "des", "ein", "einer", "eines", "einen", "einem", "ist", "sind", "war", "waren", "wird", "werden", "hat", "haben", "hatte", "hatten", "kann", "können", "soll", "sollen", "muss", "müssen", "will", "wollen", "darf", "dürfen"}

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
    # Nur Wörter > 3 Buchstaben und keine Stoppwörter
    potential_names = [w for w in words if w not in stop_words and w not in STOPWORDS and len(w) > 3]

    capitalized = re.findall(r"[A-ZÄÖÜ][a-zäöüß]+", message)

    all_names = potential_names + [n.lower() for n in capitalized if n.lower() not in STOPWORDS]
    
    # Max 3 Queries für Performance
    return list(set(all_names))[:3]


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
            .eq("is_active", "true")
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

    # ⚡ POWER HOUR AUTO-FLOW: Automatische Verarbeitung von Chat-Verläufen
    if power_hour_session:
        try:
            # Prüfe ob Input ein Chat-Verlauf oder Name ist
            parsed_export = parse_chat_export(message)
            conversation_messages = parsed_export.get('messages', [])
            detected_channel = parsed_export.get('channel', 'unknown')
            lead_name = extract_lead_name(message)
            
            # Wenn Chat-Verlauf erkannt (mehrere Nachrichten) oder Name gefunden (aber nicht zu kurz)
            # Ignoriere sehr kurze Nachrichten die keine Leads sind (z.B. "ok", "ja", etc.)
            is_chat_export = len(conversation_messages) > 1  # Mehr als eine Nachricht = Chat-Verlauf
            is_name_input = lead_name and len(lead_name) > 2 and len(message.split('\n')) <= 5  # Name mit max 5 Zeilen
            
            if (is_chat_export or is_name_input) and lead_name:
                logger.info(f"Power Hour Auto-Flow: Verarbeite Lead '{lead_name}' mit Chat-Verlauf (Channel: {detected_channel})")
                
                # Analysiere Konversation
                conv_analysis = analyze_conversation(conversation_messages)
                has_sent_message = conv_analysis.get('has_sent_message', False) or parsed_export.get('has_outbound', False)
                has_response = conv_analysis.get('has_response', False) or parsed_export.get('has_inbound', False)
                last_message_date = conv_analysis.get('last_message_date') or parsed_export.get('last_message_date')
                
                # Tool Executor für Auto-Flow
                tool_executor = ToolExecutor(db, user_id, {})
                
                # 1. Prüfe ob Lead existiert
                existing_lead = await tool_executor._find_lead_by_name_or_id(lead_name)
                
                if existing_lead:
                    lead_id = existing_lead.get("id")
                    lead_status = existing_lead.get("status", "new")
                    is_new = False
                    
                    # Update Status wenn nötig
                    if has_sent_message and lead_status == "new":
                        await tool_executor._update_lead_status(lead_id, "contacted")
                        lead_status = "contacted"
                else:
                    # Erstelle neuen Lead mit Channel-Info
                    notes = f"Importiert aus Chat-Verlauf ({detected_channel}). Letzte Nachricht: {last_message_date}" if last_message_date else f"Importiert aus Power Hour ({detected_channel})"
                    create_result = await tool_executor._create_lead(
                        name=lead_name,
                        notes=notes
                    )
                    
                    # Speichere source_channel wenn Lead erstellt wurde
                    if create_result.get("success") and detected_channel != 'unknown':
                        try:
                            lead_id = create_result.get("lead_id")
                            # Versuche source_channel zu speichern (falls Spalte existiert)
                            await asyncio.to_thread(
                                lambda: db.table("leads")
                                .update({"source_channel": detected_channel})
                                .eq("id", lead_id)
                                .execute()
                            )
                        except Exception as e:
                            logger.debug(f"Could not save source_channel (column might not exist): {e}")
                    
                    if not create_result.get("success"):
                        logger.error(f"Failed to create lead in Power Hour Auto-Flow: {create_result}")
                        # Continue with normal processing
                    else:
                        lead_id = create_result.get("lead_id")
                        lead_status = "contacted" if has_sent_message else "new"
                        is_new = True
                        
                        # Update Status wenn Nachricht gesendet wurde
                        if has_sent_message:
                            await tool_executor._update_lead_status(lead_id, "contacted")
                            lead_status = "contacted"
                
                # 2. Erstelle Follow-up (3 Tage später)
                followup_date = datetime.now() + timedelta(days=3)
                followup_result = await tool_executor._create_followup_suggestion(
                    lead_id=lead_id,
                    due_date=followup_date.strftime("%Y-%m-%d"),
                    reason=f"Auto-Follow-up für {lead_name} nach Power Hour Import"
                )
                
                # 3. Bestimme Nachrichtentyp
                if not has_sent_message:
                    message_type = "first_contact"
                elif has_response:
                    message_type = "followup_after_response"
                else:
                    message_type = "followup_no_response"
                
                # 4. Generiere Nachricht
                # Nutze erkannten Channel oder Default
                channel = detected_channel if detected_channel != 'unknown' else "whatsapp"  # Default
                
                # Fallback: Prüfe Text für Channel-Hinweise
                if channel == 'unknown':
                    if "instagram" in message.lower() or "@" in message:
                        channel = "instagram"
                    elif "email" in message.lower() or ("@" in message and "." in message and "instagram" not in message.lower()):
                        channel = "email"
                    elif "linkedin" in message.lower():
                        channel = "linkedin"
                
                # Erstelle Kontext für Nachricht
                conversation_summary = ""
                if conversation_messages:
                    recent_messages = conversation_messages[-3:]  # Letzte 3 Nachrichten
                    conversation_summary = "\n".join([
                        f"{'Du' if msg.get('direction') == 'outbound' else msg.get('sender', 'Lead')}: {msg.get('content', '')[:100]}"
                        for msg in recent_messages
                    ])
                
                # Generiere Nachricht mit write_message Tool (besser für Power Hour)
                write_result = await tool_executor._write_message(
                    lead_id=lead_id,
                    lead_name=lead_name,
                    channel=channel,
                    message_type=message_type,
                    context=conversation_summary,
                    tone="friendly"
                )
                
                if write_result.get("success") and write_result.get("message"):
                    generated_message = write_result.get("message", "")
                else:
                    # Fallback: Nutze prepare_message Tool
                    prepare_result = await tool_executor._prepare_message(
                        lead_name_or_id=lead_id,
                        channel=channel,
                        message=""  # Wird von AI generiert
                    )
                    
                    if prepare_result.get("success"):
                        generated_message = prepare_result.get("message_preview", "") or prepare_result.get("message", "")
                    else:
                        # Finaler Fallback: Einfache Nachricht
                        first_name = lead_name.split()[0] if lead_name and " " in lead_name else lead_name or "du"
                        generated_message = f"Hey {first_name}! 🙂\n\nWollte kurz nachhaken - hast du Zeit gefunden für unser Gespräch?\n\nLg"
                
                # 5. Formatiere Response
                action_text = "erstellt" if is_new else "aktualisiert"
                status_text = {
                    'new': 'Neu',
                    'contacted': 'Kontaktiert',
                    'interested': 'Interessiert',
                    'qualified': 'Qualifiziert'
                }.get(lead_status, lead_status)
                
                followup_date_str = followup_date.strftime("%d.%m.%Y")
                
                response_message = f"""✅ Lead **{lead_name}** {action_text}!
📊 Status: {status_text}"""
                
                if has_sent_message and last_message_date:
                    try:
                        last_date = datetime.fromisoformat(last_message_date.replace("Z", "+00:00"))
                        response_message += f" (Nachricht am {last_date.strftime('%d.%m.%Y')})"
                    except:
                        pass
                
                response_message += f"""
📅 Follow-up für {followup_date_str} geplant

💬 **Deine nächste Nachricht:**

---
{generated_message}
---

📋 Kopieren und senden!"""
                
                # Update Power Hour Stats
                try:
                    await asyncio.to_thread(
                        lambda: db.table("power_hour_sessions")
                        .update({
                            "contacts_made": (power_hour_session.get("contacts_made", 0) or 0) + 1,
                            "messages_sent": (power_hour_session.get("messages_sent", 0) or 0) + 1
                        })
                        .eq("id", power_hour_session["id"])
                        .execute()
                    )
                except Exception as e:
                    logger.warning(f"Failed to update Power Hour stats: {e}")
                
                return {
                    "message": response_message,
                    "tools_used": ["create_lead", "create_followup", "prepare_message"],
                    "session_id": session_id,
                    "power_hour_auto_flow": True,
                }
        except Exception as e:
            logger.error(f"Power Hour Auto-Flow error: {e}", exc_info=True)
            # Continue with normal processing if auto-flow fails

    # Use cached profile
    user_context = await get_user_profile_cached(user_id, db)
    
    # Load MLM data if available
    try:
        mlm_data = await asyncio.to_thread(
            lambda: db.table("users")
            .select("mlm_company, mlm_rank, mlm_rank_data")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if mlm_data and mlm_data.data:
            user_context["mlm_company"] = mlm_data.data.get("mlm_company")
            user_context["mlm_rank"] = mlm_data.data.get("mlm_rank")
            user_context["mlm_rank_data"] = mlm_data.data.get("mlm_rank_data") or {}
    except Exception as e:
        logger.warning(f"Could not load MLM data: {e}")

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
   - Lead erstellen (create_lead) - wenn noch nicht vorhanden
   - Lead-Status auf "contacted" setzen (wenn Nachricht im Verlauf war)
   - Personalisierte Nachricht generieren (prepare_message)
   - Follow-up erstellen (create_follow_up) - 3 Tage später
4. Kurze, prägnante Bestätigungen:
   "✅ [Name] erstellt | Nachricht vorbereitet | Follow-up in 3 Tagen"

INPUT-FORMATE ERKENNEN:
- Bild/Profil: Vision nutzen, Name/Username/Bio/Plattform extrahieren
- Text: Namen + Infos parsen (z.B. "Max Mustermann, Unternehmer aus Wien")
- Link: Plattform erkennen, Username extrahieren
- Sprachnachricht: Transkription (falls verfügbar) wie Text behandeln
- Chat-Verlauf: WhatsApp/Instagram Export mit Datum und Nachrichten

CHAT-VERLAUF ERKENNEN:
Wenn User einen Chat-Verlauf schickt (mit Datum und "Du hast gesendet:" oder "[Name]:"):
1. Extrahiere Lead-Namen (erste Zeile oder aus Verlauf)
2. Parse Gesprächsverlauf (Datum, Sender, Richtung)
3. Prüfe ob Nachrichten gesendet wurden → Status "contacted" setzen
4. Prüfe ob Antworten kamen → Nachrichtentyp anpassen
5. Generiere passende Nachricht basierend auf Verlauf

NACHRICHTENTYPEN:
- Erstkontakt: Wenn noch keine Nachricht gesendet wurde
- Follow-up (keine Antwort): Wenn gesendet aber keine Antwort
- Follow-up (nach Antwort): Wenn Konversation läuft

BEISPIEL-ANTWORT (Chat-Verlauf):
✅ Lead **Alexandra Pereni** erstellt!
📊 Status: Kontaktiert (Nachricht am 04.12.2025)
📅 Follow-up für 07.12.2025 geplant

💬 **Deine nächste Nachricht:**

---
Hey Alexandra! 🙂
Wollte kurz nachhaken - hast du Zeit gefunden für unser Telefonat?
Würde mich freuen, dir mehr zu erzählen!
Lg Stefan
---

📋 Kopieren und senden!

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
        # Begrenze auf die letzten 5 Messages für Performance
        limited_history = message_history[-5:] if len(message_history) > 5 else message_history
        messages.extend(limited_history)

    messages.append({"role": "user", "content": message})

    tool_executor = ToolExecutor(db, user_id, user_context)
    client_instance = get_client()
    usage_service = AIUsageService(user_id)

    # Initialize AI services for model routing and cost tracking
    intent_detector = IntentDetector(client_instance)
    cost_tracker = CostTracker(db)

    # Step 1: Detect intent
    detected_intent, _ = await intent_detector.classify_with_fallback(message)
    
    # Step 1.5: Check if tools are needed (for smart routing)
    def needs_tools(message: str) -> bool:
        """
        Prüft ob die Nachricht Tools benötigt (Lead erstellen, Datenbank-Operationen, etc.)
        Nur spezifische Tool-Aufrufe werden als "needs_tools" erkannt.
        Einfache Content-Generierung (z.B. "schreib eine Nachricht") kann zu Groq.
        """
        message_lower = message.lower()
        # Tool-spezifische Keywords die definitiv Tools benötigen (DB-Operationen, Lead-Management)
        tool_keywords = [
            "erstelle lead", "create lead", "lead anlegen",
            "update lead", "lead aktualisieren", "lead ändern",
            "speicher lead", "save lead", "lösch lead", "delete lead", "entferne lead",
            "suche lead", "finde lead", "search lead",
            "zeig mir leads", "liste leads", "show leads", "list leads",
            "follow-up erstellen", "create follow-up",
            "prepare message",  # Tool-Aufruf für Nachricht mit Lead-Kontext
        ]
        return any(kw in message_lower for kw in tool_keywords)
    
    # Smart Model Routing
    optimal_model = get_optimal_model(detected_intent, needs_tools(message), message)
    
    # Convert to ModelTier for compatibility
    if optimal_model == "groq":
        selected_model = None  # Groq wird separat behandelt
    elif optimal_model == "gpt-4o":
        selected_model = ModelTier.STANDARD
    else:  # gpt-4o-mini
        selected_model = ModelTier.MINI
    
    logger.info(f"User {user_id}: Intent '{detected_intent}' -> Optimal Model: {optimal_model}")

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

    # Step 2: Groq Token Limit Check (wenn Groq gewählt wurde)
    GROQ_TOKEN_LIMIT = 10000  # Sicherheitspuffer (Groq Limit ist 12k)
    use_groq = False
    
    if optimal_model == "groq":
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                # Prüfe Token-Limit bevor Groq aufgerufen wird
                estimated_tokens = estimate_message_tokens(messages)
                
                if estimated_tokens > GROQ_TOKEN_LIMIT:
                    logger.info(
                        f"Message too long for Groq ({estimated_tokens} est. tokens > {GROQ_TOKEN_LIMIT} limit), "
                        f"falling back to gpt-4o-mini. Intent: {detected_intent}"
                    )
                    # Fallback zu Mini, NICHT zu gpt-4o!
                    optimal_model = "gpt-4o-mini"
                    selected_model = ModelTier.MINI
                else:
                    groq_client = AsyncGroq(api_key=groq_key)
                    use_groq = True
                    logger.info(
                        f"Using Groq for {detected_intent} intent (~{estimated_tokens} est. tokens): "
                        f"{message[:50]}..."
                    )
            except Exception as e:
                logger.warning(f"Groq client init failed: {e}, falling back to gpt-4o-mini")
                optimal_model = "gpt-4o-mini"
                selected_model = ModelTier.MINI
                use_groq = False
    
    if use_groq:
        # Groq für schnelle Antworten ohne Tools
        try:
            groq_response = await groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            # Convert Groq response to OpenAI-like format
            class GroqResponse:
                def __init__(self, groq_resp):
                    self.choices = [type('obj', (object,), {
                        'message': type('obj', (object,), {
                            'content': groq_resp.choices[0].message.content,
                            'tool_calls': None
                        })()
                    })()]
                    usage_obj = groq_resp.usage if hasattr(groq_resp, 'usage') and groq_resp.usage else None
                    self.usage = type('obj', (object,), {
                        'prompt_tokens': usage_obj.prompt_tokens if usage_obj else 0,
                        'completion_tokens': usage_obj.completion_tokens if usage_obj else 0
                    })()
            
            response = GroqResponse(groq_response)
            logger.info("Groq response successful")
        except Exception as e:
            logger.warning(f"Groq call failed: {e}, falling back to OpenAI")
            use_groq = False
    
    if not use_groq:
        # OpenAI für Tool-Calls oder komplexe Queries
        # Verwende optimal_model (kann "gpt-4o" oder "gpt-4o-mini" sein)
        model_to_use = optimal_model if optimal_model != "groq" else selected_model.value
        response = await call_openai_with_fallback(
            client_instance,
            model=model_to_use,
            messages=messages,
            tools=SALES_AGENT_TOOLS,
            tool_choice="auto",
        )

    assistant_message = response.choices[0].message
    tools_used = []

    # Track cost for initial response
    initial_input_tokens = response.usage.prompt_tokens if response.usage else 0
    initial_output_tokens = response.usage.completion_tokens if response.usage else 0
    
    # Model für Tracking (Groq oder OpenAI)
    model_for_tracking = GROQ_MODEL if use_groq else (optimal_model if optimal_model != "groq" else selected_model.value)

    await cost_tracker.log_usage(
        user_id=user_id,
        org_id=user_context.get("org_id"),
        model=model_for_tracking,
        input_tokens=initial_input_tokens,
        output_tokens=initial_output_tokens,
        intent=detected_intent,
        session_id=session_id
    )

    if response.usage:
        await usage_service.track_usage(
            model=model_for_tracking,
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

        # Route follow-up calls - nutze Smart Routing für Follow-ups
        # Follow-ups nach Tool-Calls sollten zu Mini gehen (nicht gpt-4o)
        followup_optimal = get_optimal_model(detected_intent, True, message)  # needs_tools=True für Follow-ups
        if followup_optimal == "groq":
            # Follow-ups nach Tool-Calls sollten nicht zu Groq gehen
            followup_optimal = "gpt-4o-mini"
        
        followup_model_value = followup_optimal if followup_optimal != "groq" else "gpt-4o-mini"
        followup_model = ModelTier.MINI if followup_model_value == "gpt-4o-mini" else ModelTier.STANDARD
        
        if followup_model_value != model_for_tracking:
            logger.info(f"Follow-up call routed to {followup_model_value} (was {model_for_tracking})")

        response = await call_openai_with_fallback(
            client_instance,
            model=followup_model_value,
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
            model=followup_model_value,
            input_tokens=followup_input_tokens,
            output_tokens=followup_output_tokens,
            intent=f"{detected_intent}_followup",
            session_id=session_id,
            tool_calls=assistant_message.tool_calls
        )

        if response.usage:
            await usage_service.track_usage(
                model=followup_model_value,
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

