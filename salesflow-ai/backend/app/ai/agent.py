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

logger = logging.getLogger(__name__)

client = None
router = ModelRouter()
_ = CollectiveIntelligenceEngine  # silence unused import warnings


def extract_names(message: str) -> list[str]:
    """Einfache Heuristik um potenzielle Namen aus dem User-Text zu ziehen."""
    if not message:
        return []
    tokens = re.findall(r"\b[A-ZÄÖÜ][a-zäöüß]{2,}\b", message)
    blacklist = {"Hallo", "Hey", "Hi", "Und", "Oder", "Was", "Wie"}
    return [t for t in tokens if t not in blacklist]


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
    """Sucht Leads anhand extrahierter Namen und gibt kurzen Kontext zurück."""
    potential_names = extract_names(message)
    contexts: list[str] = []

    if not potential_names:
        return ""

    for name in itertools.islice(potential_names, 3):
        result = (
            db.table("leads")
            .select("id, name, email, phone, company, status, temperature, tags, notes")
            .eq("user_id", user_id)
            .ilike("name", f"%{name}%")
            .limit(1)
            .execute()
        )
        if result.data:
            lead = result.data[0]
            tags = ", ".join(lead.get("tags") or []) if lead.get("tags") else ""
            contexts.append(
                f"- {lead.get('name')} (Status: {lead.get('status')}, Temp: {lead.get('temperature')}) "
                f\"{f'Firma: {lead.get('company')}' if lead.get('company') else ''}\" " "
                f\"{f'Email: {lead.get('email')}' if lead.get('email') else ''}\" " "
                f\"{f'Phone: {lead.get('phone')}' if lead.get('phone') else ''}\" " "
                f\"{f'Tags: {tags}' if tags else ''}\"
            )

    return "\n".join(contexts)


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

async def run_sales_agent(
    message: str,
    user_id: str,
    db,
    session_id: str = None,
    message_history: list = None,
) -> dict:
    """Run the sales agent with function calling."""

    profile_result = (
        db.table("profiles")
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
        company = (
            db.table("companies")
            .select("name, knowledge_base")
            .eq("id", user_context["company_id"])
            .single()
            .execute()
        )

        if company.data:
            user_context["company_name"] = company.data.get("name")
            user_context["company_knowledge"] = company.data.get("knowledge_base", "")

    # User-uploaded knowledge base (products, docs, objections, scripts)
    try:
        knowledge_result = (
            db.table("user_knowledge")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if knowledge_result and knowledge_result.data:
            data = knowledge_result.data
            context_parts = []

            if data.get("company_name"):
                context_parts.append(f"## Firma: {data['company_name']}")
                if data.get("company_description"):
                    context_parts.append(data["company_description"])

            if data.get("products"):
                context_parts.append("\n## Produkte:")
                for p in data["products"]:
                    context_parts.append(f"\n### {p.get('name')}")
                    if p.get("description"):
                        context_parts.append(p["description"])
                    if p.get("price"):
                        context_parts.append(f"Preis: {p['price']}")
                    if p.get("benefits"):
                        context_parts.append(f"Vorteile: {', '.join(p['benefits'])}")
                    if p.get("objections"):
                        for obj in p["objections"]:
                            context_parts.append(
                                f"- Einwand '{obj.get('objection', '')}': {obj.get('response', '')}"
                            )

            if data.get("custom_objections"):
                context_parts.append("\n## Einwandbehandlung:")
                for obj in data["custom_objections"]:
                    context_parts.append(
                        f"- '{obj.get('objection', '')}' → {obj.get('response', '')}"
                    )

            if data.get("documents"):
                context_parts.append("\n## Dokumente:")
                for doc in data["documents"]:
                    context_parts.append(f"\n### {doc.get('filename')}")
                    content = (doc.get("content") or "")[:2000]
                    context_parts.append(content)

            user_context["user_knowledge"] = "\n".join(context_parts)
    except Exception as e:  # pragma: no cover - defensive
        logger.warning(f"Could not load user knowledge: {e}")

    start_of_month = datetime.now().replace(day=1)
    revenue = (
        db.table("deals")
        .select("value")
        .eq("user_id", user_id)
        .eq("status", "won")
        .gte("closed_at", start_of_month.isoformat())
        .execute()
    )

    revenue_data = revenue.data if revenue else []
    user_context["current_revenue"] = sum([d.get("value") or 0 for d in revenue_data])

    # Activity & Learning Context
    learning_context = ""
    try:
        activity_logger = ActivityLogger(db, user_id)
        recent_activities = await activity_logger.get_recent(limit=10)
    except Exception as e:
        recent_activities = []
        logger.warning(f"Could not load recent activities: {e}")

    try:
        learning_service = UserLearningService(db)
        learning_insights = await learning_service.analyze_conversions(user_id, days_back=30)
    except Exception as e:
        learning_insights = []
        logger.warning(f"Could not load learning insights: {e}")

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

