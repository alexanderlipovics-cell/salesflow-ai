"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF CONTEXT SERVICE                                                     ║
║  Baut den Kontext für CHIEF basierend auf User-Daten                       ║
╚════════════════════════════════════════════════════════════════════════════╝

CHIEF kennt:
- Daily Flow Status (Ziele, Fortschritt, verbleibende Tasks)
- Aktuelle Leads (priorisiert nach Dringlichkeit)
- Vertical-Profile (MLM, Immobilien, etc.)
- Company Knowledge (Produkte, Skripte, etc.)
- Knowledge Context (Evidence Hub, RAG-basiert)
- Living OS Context (Regeln, Patterns, Team Broadcasts) [NEU]
"""

from typing import Any, Optional, List
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from supabase import Client

from ..core.config import settings
from .knowledge import KnowledgeService
from .analytics.chief_insights import ChiefTemplateInsightsService
from .analytics.top_templates import get_top_templates_service
from .living_os import OverrideService, CommandService, BroadcastService, CollectiveIntelligenceService
from ..config.prompts.chief_living_os import build_living_os_context_prompt
from ..config.prompts.chief_workflow import build_complete_workflow_context
from ..config.prompts.chief_company_mode import (
    build_company_mode_prompt,
    get_company_stories_context,
    get_product_context_for_chief,
    check_message_compliance,
)
from ..config.prompts.chief_v31_additions import (
    # Enums
    CompanyMode,
    ObjectionType,
    ClosingSituation,
    DISGType,
    # Dataclasses
    ComplianceRules,
    BrandVoice,
    UserGoal,
    DailyTargets,
    ObjectionAnalysis,
    PersonalityProfile,
    DealPostMortem,
    # Functions
    build_enterprise_prompt,
    calculate_daily_targets,
    build_goal_analysis,
    analyze_objection,
    get_killer_phrases,
    get_best_killer_phrase,
    detect_personality_type,
    adapt_message_to_personality,
    build_industry_module_prompt,
    analyze_lost_deal,
    detect_deal_at_risk,
    build_v31_context,
    # Static Data
    KILLER_PHRASES,
    DISG_PROFILES,
)


# ═══════════════════════════════════════════════════════════════════════════
# TYPE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DailyFlowStatus:
    """Status des täglichen Workflows."""
    date: str
    new_contacts: dict[str, Any]
    followups: dict[str, Any]
    reactivations: dict[str, Any]
    overall_percent: float
    is_on_track: bool


@dataclass
class SuggestedLead:
    """Ein vorgeschlagener Lead für Aktionen."""
    id: str
    name: str
    status: str
    reason: str
    priority: int = 0
    last_contact: Optional[str] = None
    next_action: Optional[str] = None


@dataclass
class VerticalProfile:
    """Profil des Verticals."""
    vertical_id: str
    vertical_label: str
    conversation_style: str
    terminology: dict[str, str] = None


@dataclass
class LivingOSContext:
    """Living OS Kontext mit Regeln, Patterns und Broadcasts."""
    rules: list[dict] = None
    patterns: list[dict] = None
    broadcasts: list[dict] = None
    collective_insights: list[dict] = None  # NEU: Von anderen lernen
    benchmark: dict = None  # NEU: Wo steht der User?
    formatted_prompt: str = ""


@dataclass
class StorybookContext:
    """Brand Storybook Kontext mit Stories, Products und Guardrails."""
    company_name: str = ""
    compliance_level: str = "standard"
    brand_config: dict = None
    stories: list[dict] = None
    products: list[dict] = None
    guardrails: list[dict] = None
    formatted_prompt: str = ""


@dataclass
class OutreachContext:
    """Social Media Outreach Kontext mit Ghost-Tracking."""
    total_ghosts: int = 0
    pending_followups: int = 0
    ghosts_by_platform: dict = None
    top_ghosts: list[dict] = None  # Die dringendsten Ghost-Kontakte
    platform_stats: dict = None  # Performance pro Plattform
    formatted_prompt: str = ""


@dataclass
class ChiefContext:
    """Vollständiger Kontext für CHIEF."""
    user_name: str
    company_id: str
    daily_flow_status: Optional[DailyFlowStatus]
    remaining_today: dict[str, int]
    suggested_leads: list[SuggestedLead]
    vertical_profile: VerticalProfile
    company_knowledge: Optional[dict] = None
    recent_wins: Optional[list[dict]] = None
    streak_days: int = 0
    skill_level: str = "advanced"  # rookie, advanced, pro
    living_os: Optional[LivingOSContext] = None  # Living OS Context
    storybook: Optional[StorybookContext] = None  # Brand Storybook Context
    outreach: Optional[OutreachContext] = None  # Social Media Outreach Context


# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

async def build_chief_context(
    db: Client,
    user_id: str,
    company_id: str,
    user_name: str = "User",
    include_leads: bool = True,
    max_leads: int = None,
    query: Optional[str] = None,
    include_knowledge: bool = True,
    include_templates: bool = True,
    include_living_os: bool = True,
    include_pending_actions: bool = True,
    include_finance: bool = True,
    include_storybook: bool = True,  # Brand Storybook Context
    include_outreach: bool = True,  # Social Media Outreach Context
) -> dict[str, Any]:
    """
    Baut den vollständigen Kontext für CHIEF.
    
    Args:
        db: Supabase Client
        user_id: User ID
        company_id: Company ID
        user_name: Name des Users für persönliche Ansprache
        include_leads: Leads im Kontext einbeziehen?
        max_leads: Maximale Anzahl vorgeschlagener Leads
        query: User-Query für Knowledge Context (RAG)
        include_knowledge: Knowledge Context einbeziehen?
        include_templates: Template Performance einbeziehen?
        include_living_os: Living OS Context einbeziehen? (Regeln, Patterns, Broadcasts)
        include_pending_actions: Pending Actions einbeziehen? (Zahlungen, Follow-ups)
        include_finance: Finance Summary einbeziehen? (Steuer-Reserve Warnung)
        include_storybook: Brand Storybook einbeziehen? (Stories, Products, Guardrails)
        include_outreach: Outreach Context einbeziehen? (Ghosts, Follow-ups)
        
    Returns:
        Context-Dictionary für CHIEF
    """
    max_leads = max_leads or settings.MAX_SUGGESTED_LEADS
    context = {}
    
    # 1. Daily Flow Status laden
    daily_status = await _get_daily_flow_status(db, user_id, company_id)
    if daily_status:
        context["daily_flow_status"] = daily_status
        context["remaining_today"] = _calculate_remaining(daily_status)
    
    # 2. Suggested Leads laden
    if include_leads:
        context["suggested_leads"] = await _get_suggested_leads(
            db, user_id, company_id, max_leads
        )
    
    # 3. Vertical Profile laden
    context["vertical_profile"] = await _get_vertical_profile(db, company_id)
    
    # 4. Company Knowledge (legacy, optional)
    context["company_knowledge"] = await _get_company_knowledge(db, company_id)
    
    # 5. Streak & Motivation
    context["streak_days"] = await _get_streak_days(db, user_id)
    context["recent_wins"] = await _get_recent_wins(db, user_id, limit=3)
    
    # 6. Knowledge Context (RAG-basiert)
    if include_knowledge and query:
        context["knowledge_context"] = await _get_knowledge_context(
            db, company_id, query
        )
    
    # 7. Template Performance Insights (NEU)
    if include_templates:
        context["template_insights"] = await _get_template_insights(
            db, company_id, limit=5
        )
    
    # 8. User Skill Level laden
    context["skill_level"] = await _get_user_skill_level(db, user_id)
    
    # 9. Living OS Context (NEU)
    if include_living_os:
        context["living_os"] = await _get_living_os_context(db, user_id)
    
    # 10. Pending Actions Context (NEU - für Zahlungsprüfungen etc.)
    if include_pending_actions:
        context["pending_actions"] = await _get_pending_actions_context(db, user_id)
    
    # 11. Finance Context (für Steuer-Warnungen etc.)
    if include_finance:
        context["finance_summary"] = await _get_finance_context(db, user_id)
    
    # 12. Brand Storybook Context (Stories, Products, Guardrails)
    if include_storybook:
        context["storybook"] = await _get_storybook_context(db, company_id)
    
    # 13. Outreach Context (Ghosts, Follow-ups, Plattform-Stats)
    if include_outreach:
        context["outreach"] = await _get_outreach_context(db, user_id)
    
    # 14. Meta
    context["user_name"] = user_name
    context["context_date"] = date.today().isoformat()
    
    return context


async def _get_user_skill_level(db: Client, user_id: str) -> str:
    """
    Lädt das Skill-Level des Users.
    
    Skill-Levels:
    - rookie: Einsteiger, braucht mehr Führung
    - advanced: Hat Erfahrung, will Best Practices
    - pro: Experte, will nur das Wesentliche
    
    Returns:
        Skill-Level String ("rookie", "advanced", "pro")
    """
    try:
        # Versuche aus user_settings zu laden
        result = db.table("user_settings").select(
            "skill_level"
        ).eq("user_id", user_id).single().execute()
        
        if result.data and result.data.get("skill_level"):
            return result.data["skill_level"]
        
        # Fallback: Versuche aus users Tabelle
        user_result = db.table("users").select(
            "skill_level"
        ).eq("id", user_id).single().execute()
        
        if user_result.data and user_result.data.get("skill_level"):
            return user_result.data["skill_level"]
        
    except Exception as e:
        print(f"Could not load skill level: {e}")
    
    # Default: Advanced (mittleres Level)
    return "advanced"


async def _get_template_insights(
    db: Client,
    company_id: str,
    limit: int = 5,
) -> dict:
    """
    Lädt Template Performance Insights für CHIEF.
    
    Gibt die besten und schlechtesten Templates zurück,
    damit CHIEF datenbasierte Empfehlungen geben kann.
    
    Args:
        db: Supabase Client
        company_id: Company ID
        limit: Anzahl Templates pro Kategorie
        
    Returns:
        Dict mit top_templates, worst_templates, channel_stats
    """
    try:
        template_service = get_top_templates_service(db)
        
        # Top Templates (beste Performance)
        top_templates = await template_service.get_top_templates(
            company_id=company_id,
            limit=limit,
            days=30,
        )
        
        # Worst Templates (Verbesserungsbedarf)
        worst_templates = await template_service.get_worst_templates(
            company_id=company_id,
            limit=3,
            days=30,
        )
        
        # Channel Stats aus learning_aggregates
        channel_stats = await _get_channel_stats(db, company_id)
        
        return {
            "top_templates": [
                {
                    "name": t.template_name,
                    "category": t.category.value if t.category else "custom",
                    "response_rate": round(t.response_rate_30d * 100, 1) if t.response_rate_30d else 0,
                    "conversion_rate": round(t.conversion_rate_30d * 100, 1) if t.conversion_rate_30d else 0,
                    "quality_score": t.quality_score,
                    "trend": t.trend.value if t.trend else "stable",
                    "uses_30d": t.uses_last_30d,
                }
                for t in top_templates
            ],
            "improvement_candidates": [
                {
                    "name": t.template_name,
                    "quality_score": t.quality_score,
                    "issue": _identify_template_issue(t),
                }
                for t in worst_templates
            ],
            "best_channel": channel_stats.get("best_channel"),
            "channel_comparison": channel_stats.get("channels", []),
        }
        
    except Exception as e:
        print(f"Error loading template insights: {e}")
        return {}


async def _get_channel_stats(db: Client, company_id: str) -> dict:
    """
    Lädt Channel-Performance-Statistiken.
    """
    try:
        # Aus learning_aggregates laden
        result = db.table("learning_aggregates").select(
            "channel, events_sent, reply_rate, win_rate"
        ).eq("company_id", company_id).eq("aggregate_type", "monthly").order(
            "period_start", desc=True
        ).limit(10).execute()
        
        if not result.data:
            return {}
        
        # Gruppieren nach Channel
        channel_data = {}
        for row in result.data:
            ch = row.get("channel")
            if not ch:
                continue
            if ch not in channel_data:
                channel_data[ch] = {
                    "channel": ch,
                    "events_sent": 0,
                    "reply_rate": 0,
                    "win_rate": 0,
                    "count": 0,
                }
            channel_data[ch]["events_sent"] += row.get("events_sent", 0)
            channel_data[ch]["reply_rate"] += row.get("reply_rate", 0) or 0
            channel_data[ch]["win_rate"] += row.get("win_rate", 0) or 0
            channel_data[ch]["count"] += 1
        
        # Durchschnitte berechnen
        channels = []
        for ch, data in channel_data.items():
            count = data["count"]
            if count > 0:
                channels.append({
                    "channel": ch,
                    "events_sent": data["events_sent"],
                    "reply_rate": round(data["reply_rate"] / count * 100, 1),
                    "win_rate": round(data["win_rate"] / count * 100, 1),
                })
        
        # Nach Win-Rate sortieren
        channels.sort(key=lambda x: x["win_rate"], reverse=True)
        
        return {
            "best_channel": channels[0]["channel"] if channels else None,
            "channels": channels[:5],
        }
        
    except Exception as e:
        print(f"Error loading channel stats: {e}")
        return {}


def _identify_template_issue(template) -> str:
    """
    Identifiziert das Hauptproblem eines Templates.
    """
    if template.response_rate_30d and template.response_rate_30d < 0.1:
        return "Niedrige Response-Rate (< 10%)"
    if template.conversion_rate_30d and template.conversion_rate_30d < 0.02:
        return "Niedrige Conversion-Rate (< 2%)"
    if template.trend and template.trend.value == "declining":
        return "Abnehmende Performance"
    if template.uses_last_30d < 10:
        return "Wenig genutzt"
    return "Optimierungspotenzial"


async def _get_knowledge_context(
    db: Client,
    company_id: str,
    query: str,
    max_items: int = 5,
    max_tokens: int = 1500,
) -> List[dict]:
    """
    Holt relevanten Knowledge Context für die User-Query.
    
    Args:
        db: Supabase Client
        company_id: Company ID
        query: User-Query
        max_items: Maximale Anzahl Items
        max_tokens: Maximale Token-Schätzung
        
    Returns:
        Liste von Knowledge Items als Dicts
    """
    try:
        # Get company slug
        company_result = db.table("companies").select(
            "slug, vertical_id"
        ).eq("id", company_id).single().execute()
        
        if not company_result.data:
            return []
        
        company_slug = company_result.data.get("slug")
        vertical_id = company_result.data.get("vertical_id", "network_marketing")
        
        # Use Knowledge Service
        knowledge_service = KnowledgeService(db)
        items = knowledge_service.get_context_for_chief(
            query=query,
            company_slug=company_slug,
            vertical_id=vertical_id,
            max_items=max_items,
            max_tokens=max_tokens,
        )
        
        # Convert to dicts for context
        return [
            {
                "id": item.id,
                "title": item.title,
                "content": item.content,
                "source": item.source,
                "type": item.type,
                "domain": item.domain,
                "compliance_level": item.compliance_level,
                "requires_disclaimer": item.requires_disclaimer,
                "disclaimer": item.disclaimer,
                "evidence_level": item.evidence_level,
                "relevance": item.relevance,
            }
            for item in items
        ]
        
    except Exception as e:
        print(f"Error getting knowledge context: {e}")
        return []


async def _get_storybook_context(db: Client, company_id: str) -> dict:
    """
    Lädt den Brand Storybook Kontext für CHIEF.
    
    Enthält:
    - Company Brand Config (Farben, Tagline, USPs)
    - Stories (Elevator Pitches, Produktgeschichten)
    - Products (Beschreibungen, Benefits, Einwände)
    - Guardrails (Compliance-Regeln)
    - Formatierter Company Mode Prompt
    
    Returns:
        Dict mit company_name, compliance_level, stories, products, guardrails, formatted_prompt
    """
    try:
        # Get company info
        company_result = db.table("companies").select(
            "id, name, compliance_level, brand_config, storybook_imported"
        ).eq("id", company_id).single().execute()
        
        if not company_result.data:
            return {
                "has_storybook": False,
                "company_name": "",
                "formatted_prompt": "",
            }
        
        company = company_result.data
        
        # Check if storybook was imported
        if not company.get("storybook_imported"):
            return {
                "has_storybook": False,
                "company_name": company.get("name", ""),
                "formatted_prompt": "",
            }
        
        # Get stories (top 5 most used)
        stories_result = db.table("company_stories").select(
            "id, title, story_type, audience, content_30s, content_1min, use_case, tags"
        ).eq("company_id", company_id).eq(
            "is_active", True
        ).order("times_used", desc=True).limit(5).execute()
        
        stories = stories_result.data or []
        
        # Get products
        products_result = db.table("company_products").select(
            "id, name, slug, category, tagline, description_short, key_benefits, how_to_explain, common_objections"
        ).eq("company_id", company_id).eq(
            "is_active", True
        ).order("sort_order").limit(10).execute()
        
        products = products_result.data or []
        
        # Get guardrails
        guardrails_result = db.table("company_guardrails").select(
            "id, rule_name, rule_description, severity, trigger_patterns, example_bad, example_good"
        ).eq("is_active", True).or_(
            f"company_id.eq.{company_id},company_id.is.null"
        ).order("severity", desc=True).execute()
        
        guardrails = guardrails_result.data or []
        
        # Build formatted prompt
        formatted_prompt = build_company_mode_prompt(
            company_name=company.get("name", "Unknown"),
            compliance_level=company.get("compliance_level", "standard"),
            guardrails=guardrails,
            products=products,
            brand_config=company.get("brand_config", {}),
        )
        
        return {
            "has_storybook": True,
            "company_name": company.get("name", ""),
            "compliance_level": company.get("compliance_level", "standard"),
            "brand_config": company.get("brand_config", {}),
            "stories": stories,
            "products": products,
            "guardrails": guardrails,
            "formatted_prompt": formatted_prompt,
        }
        
    except Exception as e:
        print(f"Error getting storybook context: {e}")
        return {
            "has_storybook": False,
            "company_name": "",
            "formatted_prompt": "",
        }


async def _get_outreach_context(db: Client, user_id: str) -> dict:
    """
    Lädt den Social Media Outreach Kontext für CHIEF.
    
    Enthält:
    - Ghost-Statistiken (Kontakte die gelesen aber nicht geantwortet haben)
    - Pending Follow-ups
    - Platform Performance
    - Formatierter Prompt für Outreach-Optimierung
    
    Returns:
        Dict mit ghosts, pending_followups, platform_stats, formatted_prompt
    """
    try:
        from datetime import timedelta
        
        now = datetime.utcnow()
        week_ago = (now - timedelta(days=7)).isoformat()
        
        # Get ghost count and details
        ghosts_result = db.table("outreach_messages").select(
            "id, contact_name, contact_handle, platform, seen_at, ghost_since, ghost_followup_count"
        ).eq("user_id", user_id).eq(
            "is_ghost", True
        ).is_("replied_at", "null").order(
            "seen_at"
        ).limit(10).execute()
        
        ghosts = ghosts_result.data or []
        
        # Get pending followups
        queue_result = db.table("ghost_followup_queue").select(
            "id, scheduled_for, priority"
        ).eq("user_id", user_id).eq(
            "status", "pending"
        ).lte("scheduled_for", now.isoformat()).execute()
        
        pending_followups = queue_result.data or []
        
        # Get platform stats (last 7 days)
        stats_result = db.table("outreach_messages").select(
            "platform, status"
        ).eq("user_id", user_id).gte(
            "sent_at", week_ago
        ).execute()
        
        # Aggregate platform stats
        platform_stats = {}
        for msg in (stats_result.data or []):
            p = msg.get("platform", "other")
            if p not in platform_stats:
                platform_stats[p] = {"sent": 0, "replied": 0, "ghosts": 0}
            platform_stats[p]["sent"] += 1
            if msg.get("status") in ["replied", "positive", "negative", "converted"]:
                platform_stats[p]["replied"] += 1
        
        # Count ghosts by platform
        ghosts_by_platform = {}
        for g in ghosts:
            p = g.get("platform", "other")
            ghosts_by_platform[p] = ghosts_by_platform.get(p, 0) + 1
        
        # Build formatted prompt
        prompt_parts = []
        
        if ghosts:
            prompt_parts.append("\n## 👻 Ghost-Situation (Outreach)")
            prompt_parts.append(f"- {len(ghosts)} Kontakte haben gelesen aber nicht geantwortet")
            if pending_followups:
                prompt_parts.append(f"- {len(pending_followups)} Follow-ups sind fällig")
            
            # Top 3 ghosts
            top_ghosts = ghosts[:3]
            if top_ghosts:
                prompt_parts.append("\nDringendste Ghosts:")
                for g in top_ghosts:
                    ghost_hours = 24
                    if g.get("seen_at"):
                        try:
                            seen_dt = datetime.fromisoformat(g["seen_at"].replace("Z", "+00:00"))
                            ghost_hours = int((now - seen_dt.replace(tzinfo=None)).total_seconds() / 3600)
                        except:
                            pass
                    prompt_parts.append(f"  - {g.get('contact_name')} ({g.get('platform')}): {ghost_hours}h ohne Antwort")
            
            prompt_parts.append("\n💡 Biete an, Follow-up Nachrichten für Ghosts zu generieren.")
        
        if platform_stats:
            prompt_parts.append("\n## Outreach Performance (7 Tage)")
            for platform, stats in platform_stats.items():
                reply_rate = round(stats["replied"] / stats["sent"] * 100, 1) if stats["sent"] > 0 else 0
                prompt_parts.append(f"- {platform}: {stats['sent']} gesendet, {reply_rate}% Antwortrate")
        
        formatted_prompt = "\n".join(prompt_parts)
        
        return {
            "total_ghosts": len(ghosts),
            "pending_followups": len(pending_followups),
            "ghosts_by_platform": ghosts_by_platform,
            "top_ghosts": [
                {
                    "id": g.get("id"),
                    "name": g.get("contact_name"),
                    "platform": g.get("platform"),
                    "handle": g.get("contact_handle"),
                }
                for g in ghosts[:5]
            ],
            "platform_stats": platform_stats,
            "formatted_prompt": formatted_prompt,
        }
        
    except Exception as e:
        print(f"Error getting outreach context: {e}")
        return {
            "total_ghosts": 0,
            "pending_followups": 0,
            "ghosts_by_platform": {},
            "top_ghosts": [],
            "platform_stats": {},
            "formatted_prompt": "",
        }


async def _get_living_os_context(db: Client, user_id: str) -> dict:
    """
    Lädt den Living OS Kontext für CHIEF.
    
    Enthält:
    - Aktive Regeln (persönlich + Team)
    - Erkannte Patterns
    - Team Broadcasts
    - Collective Insights (anonymisierte Learnings von anderen)
    - Benchmark (wo steht der User?)
    - Formatierter Prompt
    
    Returns:
        Dict mit rules, patterns, broadcasts, collective_insights, benchmark, formatted_prompt
    """
    try:
        command_service = CommandService(db)
        override_service = OverrideService(db)
        broadcast_service = BroadcastService(db)
        collective_service = CollectiveIntelligenceService(db)
        
        # Get rules
        rules = command_service.get_user_rules(user_id)
        
        # Get patterns
        patterns = override_service.get_user_patterns(user_id, "active")
        
        # Get broadcasts
        teams = broadcast_service.get_user_teams(user_id)
        broadcasts = []
        if teams:
            broadcasts = broadcast_service.get_morning_briefing_broadcasts(teams[0].get("id"))
        
        # NEU: Get collective insights (von anderen lernen)
        collective_insights = collective_service.get_insights_for_user(user_id, limit=3)
        
        # NEU: Get user benchmark
        benchmark = collective_service.get_user_benchmark(user_id)
        
        # Get skill level for prompt building
        skill_level = "advanced"
        try:
            result = db.table("user_settings").select(
                "skill_level"
            ).eq("user_id", user_id).single().execute()
            if result.data and result.data.get("skill_level"):
                skill_level = result.data["skill_level"]
        except Exception:
            pass
        
        # Build formatted prompt
        formatted_prompt = build_living_os_context_prompt(
            rules=rules,
            patterns=patterns,
            broadcasts=broadcasts,
            skill_level=skill_level,
        )
        
        # Append collective insights to prompt
        collective_prompt = collective_service.format_insights_for_prompt(collective_insights)
        if collective_prompt:
            formatted_prompt += "\n" + collective_prompt
        
        # Append benchmark to prompt
        benchmark_prompt = collective_service.format_benchmark_for_prompt(benchmark)
        if benchmark_prompt:
            formatted_prompt += "\n" + benchmark_prompt
        
        return {
            "rules": rules,
            "patterns": patterns,
            "broadcasts": broadcasts,
            "collective_insights": collective_insights,
            "benchmark": benchmark,
            "formatted_prompt": formatted_prompt,
            "skill_level": skill_level,
        }
        
    except Exception as e:
        print(f"Error getting Living OS context: {e}")
        return {
            "rules": [],
            "patterns": [],
            "broadcasts": [],
            "collective_insights": [],
            "benchmark": {},
            "formatted_prompt": "",
            "skill_level": "advanced",
        }


def format_context_for_llm(context: dict[str, Any]) -> str:
    """
    Formatiert den Kontext als String für den LLM System Prompt.
    
    Args:
        context: Context-Dictionary
        
    Returns:
        Formatierter String für System Prompt
    """
    if not context:
        return ""
    
    parts = []
    
    # User Greeting + Name für Unterschriften
    user_name = context.get("user_name", "User")
    parts.append(f"# Kontext für {user_name}")
    parts.append(f"**USER-NAME FÜR UNTERSCHRIFTEN: {user_name}**")
    parts.append(f"(Nutze '{user_name}' für alle Grußformeln und Unterschriften in Nachrichtenvorschlägen!)")
    parts.append(f"Datum: {context.get('context_date', date.today().isoformat())}")
    
    # Daily Flow Status
    if "daily_flow_status" in context:
        status = context["daily_flow_status"]
        parts.append("\n## Tagesfortschritt")
        parts.append(f"- Neue Kontakte: {status.get('new_contacts', {}).get('done', 0)} / {status.get('new_contacts', {}).get('target', 0)}")
        parts.append(f"- Follow-ups: {status.get('followups', {}).get('done', 0)} / {status.get('followups', {}).get('target', 0)}")
        parts.append(f"- Reaktivierungen: {status.get('reactivations', {}).get('done', 0)} / {status.get('reactivations', {}).get('target', 0)}")
        parts.append(f"- Gesamtfortschritt: {status.get('overall_percent', 0):.0f}%")
        parts.append(f"- Status: {'Im Plan ✅' if status.get('is_on_track') else 'Rückstand ⚠️'}")
    
    # Remaining Tasks
    if "remaining_today" in context:
        remaining = context["remaining_today"]
        parts.append("\n## Verbleibende Aufgaben heute")
        for key, value in remaining.items():
            if value > 0:
                parts.append(f"- {key}: {value}")
    
    # Suggested Leads
    if context.get("suggested_leads"):
        parts.append("\n## Vorgeschlagene Leads")
        for lead in context["suggested_leads"][:5]:
            parts.append(f"- {lead.get('name')} ({lead.get('status')}): {lead.get('reason')}")
    
    # Vertical Profile
    if "vertical_profile" in context:
        profile = context["vertical_profile"]
        parts.append(f"\n## Vertical: {profile.get('vertical_label', 'Unbekannt')}")
        parts.append(f"- Stil: {profile.get('conversation_style', 'professionell')}")
    
    # Streak
    if context.get("streak_days", 0) > 0:
        parts.append(f"\n## Streak: {context['streak_days']} Tage 🔥")
    
    # Recent Wins
    if context.get("recent_wins"):
        parts.append("\n## Letzte Erfolge")
        for win in context["recent_wins"]:
            parts.append(f"- {win.get('description', 'Erfolg')}")
    
    # Knowledge Context
    if context.get("knowledge_context"):
        parts.append("\n## Relevantes Wissen")
        for item in context["knowledge_context"][:5]:
            parts.append(f"### {item.get('title', 'Unbekannt')}")
            parts.append(f"- Type: {item.get('type', '-')} | Domain: {item.get('domain', '-')}")
            if item.get('evidence_level'):
                parts.append(f"- Evidence: {item['evidence_level']}")
            if item.get('compliance_level') == 'strict':
                parts.append(f"- ⚠️ Compliance: STRICT")
            content = item.get('content', '')[:300]
            parts.append(f"- Content: {content}...")
            if item.get('requires_disclaimer') and item.get('disclaimer'):
                parts.append(f"- Disclaimer: {item['disclaimer']}")
            parts.append("")
    
    # Template Performance Insights
    if context.get("template_insights"):
        insights = context["template_insights"]
        
        if insights.get("top_templates"):
            parts.append("\n## 🏆 Top-Performing Templates")
            for t in insights["top_templates"][:3]:
                trend_emoji = "📈" if t.get("trend") == "improving" else "📉" if t.get("trend") == "declining" else "➡️"
                parts.append(f"- **{t.get('name', 'Unbekannt')}** ({t.get('category', 'custom')})")
                parts.append(f"  Response: {t.get('response_rate', 0)}% | Conversion: {t.get('conversion_rate', 0)}% {trend_emoji}")
        
        if insights.get("improvement_candidates"):
            parts.append("\n## ⚠️ Templates mit Verbesserungspotenzial")
            for t in insights["improvement_candidates"][:2]:
                parts.append(f"- {t.get('name', 'Unbekannt')}: {t.get('issue', 'Prüfen')}")
        
        if insights.get("best_channel"):
            parts.append(f"\n## 📊 Bester Kanal: {insights['best_channel']}")
            if insights.get("channel_comparison"):
                for ch in insights["channel_comparison"][:3]:
                    parts.append(f"- {ch.get('channel', '-')}: {ch.get('reply_rate', 0)}% Reply, {ch.get('win_rate', 0)}% Win")
    
    # Living OS Context (Regeln, Patterns, Broadcasts)
    if context.get("living_os"):
        living_os = context["living_os"]
        
        # Der formatierte Prompt enthält alles
        if living_os.get("formatted_prompt"):
            parts.append("\n" + living_os["formatted_prompt"])
    
    # Brand Storybook Context (Stories, Products, Guardrails) [NEU]
    if context.get("storybook"):
        storybook = context["storybook"]
        
        if storybook.get("has_storybook") and storybook.get("formatted_prompt"):
            parts.append("\n" + storybook["formatted_prompt"])
        
        # Stories separat auflisten für schnellen Zugriff
        if storybook.get("stories"):
            parts.append("\n## 📖 Verfügbare Stories")
            for story in storybook["stories"][:3]:
                parts.append(f"- **{story.get('title', 'Story')}** ({story.get('story_type', '')}, {story.get('audience', '')})")
                if story.get('use_case'):
                    parts.append(f"  → {story['use_case']}")
    
    # Outreach Context (Ghosts, Follow-ups)
    if context.get("outreach"):
        outreach = context["outreach"]
        
        if outreach.get("formatted_prompt"):
            parts.append(outreach["formatted_prompt"])
    
    # Workflow Context (Pending Actions, Finance)
    pending_context = context.get("pending_actions")
    finance_context = context.get("finance_summary")
    
    if pending_context or finance_context:
        workflow_prompt = build_complete_workflow_context(
            pending_context=pending_context,
            finance_context=finance_context,
            include_coaching=pending_context and pending_context.get("has_urgent", False),
        )
        if workflow_prompt:
            parts.append("\n" + workflow_prompt)
    
    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE QUERIES
# ═══════════════════════════════════════════════════════════════════════════

async def _get_daily_flow_status(db: Client, user_id: str, company_id: str) -> Optional[dict]:
    """
    Lädt den Daily Flow Status aus der DB.
    
    Erwartet eine Tabelle `daily_flows` mit:
    - user_id, date, target_new_contacts, done_new_contacts,
    - target_followups, done_followups, target_reactivations, done_reactivations
    """
    today = date.today().isoformat()
    
    try:
        result = db.table("daily_flows").select("*").eq("user_id", user_id).eq("date", today).single().execute()
        
        if not result.data:
            # Fallback: Lade Targets aus User-Settings oder Company-Defaults
            return await _get_default_daily_targets(db, user_id, company_id)
        
        flow = result.data
        
        # Berechne Prozente
        new_contacts_target = flow.get("target_new_contacts", 8)
        new_contacts_done = flow.get("done_new_contacts", 0)
        followups_target = flow.get("target_followups", 6)
        followups_done = flow.get("done_followups", 0)
        reactivations_target = flow.get("target_reactivations", 2)
        reactivations_done = flow.get("done_reactivations", 0)
        
        total_target = new_contacts_target + followups_target + reactivations_target
        total_done = new_contacts_done + followups_done + reactivations_done
        
        overall_percent = (total_done / total_target * 100) if total_target > 0 else 0
        
        return {
            "date": today,
            "new_contacts": {
                "target": new_contacts_target,
                "done": new_contacts_done,
                "remaining": max(0, new_contacts_target - new_contacts_done),
                "percent": (new_contacts_done / new_contacts_target * 100) if new_contacts_target > 0 else 0,
            },
            "followups": {
                "target": followups_target,
                "done": followups_done,
                "remaining": max(0, followups_target - followups_done),
                "percent": (followups_done / followups_target * 100) if followups_target > 0 else 0,
            },
            "reactivations": {
                "target": reactivations_target,
                "done": reactivations_done,
                "remaining": max(0, reactivations_target - reactivations_done),
                "percent": (reactivations_done / reactivations_target * 100) if reactivations_target > 0 else 0,
            },
            "overall_percent": overall_percent,
            "is_on_track": overall_percent >= 50,  # Mehr als 50% = on track
        }
        
    except Exception as e:
        print(f"Error loading daily flow: {e}")
        return await _get_default_daily_targets(db, user_id, company_id)


async def _get_default_daily_targets(db: Client, user_id: str, company_id: str) -> dict:
    """Fallback: Default Targets wenn kein Daily Flow existiert."""
    # Versuche User-Settings zu laden
    try:
        result = db.table("user_settings").select("daily_targets").eq("user_id", user_id).single().execute()
        if result.data and result.data.get("daily_targets"):
            targets = result.data["daily_targets"]
            return {
                "date": date.today().isoformat(),
                "new_contacts": {"target": targets.get("new_contacts", 8), "done": 0, "remaining": targets.get("new_contacts", 8), "percent": 0},
                "followups": {"target": targets.get("followups", 6), "done": 0, "remaining": targets.get("followups", 6), "percent": 0},
                "reactivations": {"target": targets.get("reactivations", 2), "done": 0, "remaining": targets.get("reactivations", 2), "percent": 0},
                "overall_percent": 0,
                "is_on_track": False,
            }
    except Exception:
        pass
    
    # Absolute Fallback-Defaults
    return {
        "date": date.today().isoformat(),
        "new_contacts": {"target": 8, "done": 0, "remaining": 8, "percent": 0},
        "followups": {"target": 6, "done": 0, "remaining": 6, "percent": 0},
        "reactivations": {"target": 2, "done": 0, "remaining": 2, "percent": 0},
        "overall_percent": 0,
        "is_on_track": False,
    }


def _calculate_remaining(status: dict) -> dict[str, int]:
    """Berechnet verbleibende Tasks aus Status."""
    return {
        "new_contacts": status.get("new_contacts", {}).get("remaining", 0),
        "followups": status.get("followups", {}).get("remaining", 0),
        "reactivations": status.get("reactivations", {}).get("remaining", 0),
    }


async def _get_suggested_leads(
    db: Client,
    user_id: str,
    company_id: str,
    max_leads: int = 5
) -> list[dict]:
    """
    Lädt priorisierte Leads für Vorschläge.
    
    Priorisierung:
    1. Überfällige Follow-ups (due_date < today)
    2. Heute fällige Follow-ups
    3. Hot Leads ohne Aktivität (>3 Tage)
    4. Reaktivierungs-Kandidaten (>60 Tage)
    """
    today = date.today()
    three_days_ago = (today - timedelta(days=3)).isoformat()
    sixty_days_ago = (today - timedelta(days=60)).isoformat()
    
    suggested = []
    
    try:
        # 1. Überfällige Follow-ups
        overdue_result = db.table("follow_ups").select(
            "id, lead_id, due_date, message, leads(id, name, status)"
        ).eq("user_id", user_id).eq("completed", False).lt("due_date", today.isoformat()).order("due_date").limit(3).execute()
        
        for fu in (overdue_result.data or []):
            lead = fu.get("leads", {})
            if lead:
                days_overdue = (today - datetime.fromisoformat(fu["due_date"]).date()).days
                suggested.append({
                    "id": lead.get("id"),
                    "name": lead.get("name", "Unbekannt"),
                    "status": lead.get("status", "unknown"),
                    "reason": f"Überfälliges Follow-up ({days_overdue} Tage)",
                    "priority": 1,
                    "last_contact": fu.get("due_date"),
                    "next_action": "followup",
                })
        
        # 2. Heute fällige Follow-ups
        today_result = db.table("follow_ups").select(
            "id, lead_id, due_date, message, leads(id, name, status)"
        ).eq("user_id", user_id).eq("completed", False).eq("due_date", today.isoformat()).limit(3).execute()
        
        for fu in (today_result.data or []):
            lead = fu.get("leads", {})
            if lead and lead.get("id") not in [s["id"] for s in suggested]:
                suggested.append({
                    "id": lead.get("id"),
                    "name": lead.get("name", "Unbekannt"),
                    "status": lead.get("status", "unknown"),
                    "reason": "Follow-up heute fällig",
                    "priority": 2,
                    "last_contact": fu.get("due_date"),
                    "next_action": "followup",
                })
        
        # 3. Hot Leads ohne aktuelle Aktivität
        if len(suggested) < max_leads:
            hot_leads_result = db.table("leads").select(
                "id, name, status, last_contact"
            ).eq("user_id", user_id).in_("status", ["hot", "warm", "interested"]).lt("last_contact", three_days_ago).order("last_contact").limit(max_leads - len(suggested)).execute()
            
            for lead in (hot_leads_result.data or []):
                if lead.get("id") not in [s["id"] for s in suggested]:
                    days_since = (today - datetime.fromisoformat(lead["last_contact"]).date()).days if lead.get("last_contact") else 999
                    suggested.append({
                        "id": lead.get("id"),
                        "name": lead.get("name", "Unbekannt"),
                        "status": lead.get("status", "unknown"),
                        "reason": f"Kein Kontakt seit {days_since} Tagen",
                        "priority": 3,
                        "last_contact": lead.get("last_contact"),
                        "next_action": "followup",
                    })
        
        # 4. Reaktivierungs-Kandidaten
        if len(suggested) < max_leads:
            reactivation_result = db.table("leads").select(
                "id, name, status, last_contact"
            ).eq("user_id", user_id).in_("status", ["cold", "lost", "no_response"]).lt("last_contact", sixty_days_ago).order("last_contact").limit(max_leads - len(suggested)).execute()
            
            for lead in (reactivation_result.data or []):
                if lead.get("id") not in [s["id"] for s in suggested]:
                    suggested.append({
                        "id": lead.get("id"),
                        "name": lead.get("name", "Unbekannt"),
                        "status": lead.get("status", "cold"),
                        "reason": "Reaktivierung möglich",
                        "priority": 4,
                        "last_contact": lead.get("last_contact"),
                        "next_action": "reactivation",
                    })
        
    except Exception as e:
        print(f"Error loading suggested leads: {e}")
    
    # Sortiere nach Priorität
    return sorted(suggested, key=lambda x: x.get("priority", 99))[:max_leads]


async def _get_vertical_profile(db: Client, company_id: str) -> dict:
    """
    Lädt das Vertical-Profil der Company.
    """
    try:
        result = db.table("companies").select(
            "vertical_id, verticals(id, label, conversation_style, terminology)"
        ).eq("id", company_id).single().execute()
        
        if result.data:
            company = result.data
            vertical = company.get("verticals", {})
            
            return {
                "vertical_id": company.get("vertical_id", "network_marketing"),
                "vertical_label": vertical.get("label", "Network Marketing"),
                "conversation_style": vertical.get("conversation_style", "locker, direkt, motivierend"),
                "terminology": vertical.get("terminology", {}),
            }
    except Exception as e:
        print(f"Error loading vertical profile: {e}")
    
    # Fallback
    return {
        "vertical_id": "network_marketing",
        "vertical_label": "Network Marketing",
        "conversation_style": "locker, direkt, motivierend, Du-Ansprache",
        "terminology": {
            "lead": "Kontakt",
            "deal": "Abschluss",
            "primary_unit": "Kunde",
            "secondary_unit": "Partner",
        },
    }


async def _get_company_knowledge(db: Client, company_id: str) -> Optional[dict]:
    """
    Lädt Company-spezifisches Wissen für CHIEF.
    
    Erwartet Tabelle `company_knowledge` mit:
    - company_id, products, objections, scripts, usp, etc.
    """
    try:
        result = db.table("company_knowledge").select("*").eq("company_id", company_id).single().execute()
        
        if result.data:
            return {
                "products": result.data.get("products", []),
                "key_objections": result.data.get("objections", []),
                "scripts": result.data.get("scripts", {}),
                "usp": result.data.get("usp", ""),
                "faq": result.data.get("faq", []),
            }
    except Exception:
        pass
    
    return None


async def _get_streak_days(db: Client, user_id: str) -> int:
    """
    Berechnet die aktuelle Streak (Tage in Folge Ziele erreicht).
    """
    try:
        # Lade die letzten 30 Tage Daily Flows
        thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
        
        result = db.table("daily_flows").select(
            "date, done_new_contacts, done_followups, done_reactivations, target_new_contacts, target_followups, target_reactivations"
        ).eq("user_id", user_id).gte("date", thirty_days_ago).order("date", desc=True).execute()
        
        if not result.data:
            return 0
        
        streak = 0
        for flow in result.data:
            total_done = (flow.get("done_new_contacts", 0) + 
                         flow.get("done_followups", 0) + 
                         flow.get("done_reactivations", 0))
            total_target = (flow.get("target_new_contacts", 0) + 
                           flow.get("target_followups", 0) + 
                           flow.get("target_reactivations", 0))
            
            # Ziel erreicht wenn >= 80%
            if total_target > 0 and (total_done / total_target) >= 0.8:
                streak += 1
            else:
                break  # Streak unterbrochen
        
        return streak
        
    except Exception as e:
        print(f"Error calculating streak: {e}")
        return 0


async def _get_recent_wins(db: Client, user_id: str, limit: int = 3) -> list[dict]:
    """
    Lädt die letzten Erfolge/Wins des Users.
    
    Erwartet Tabelle `user_wins` oder extrahiert aus anderen Tabellen.
    """
    wins = []
    
    try:
        # Option 1: Dedizierte Wins-Tabelle
        result = db.table("user_wins").select(
            "type, description, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        if result.data:
            for win in result.data:
                wins.append({
                    "type": win.get("type", "achievement"),
                    "description": win.get("description", "Erfolg"),
                    "date": win.get("created_at", "")[:10],
                })
            return wins
        
    except Exception:
        pass
    
    try:
        # Option 2: Extrahiere Wins aus Leads (gewonnene Deals)
        seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
        
        result = db.table("leads").select(
            "name, status, updated_at"
        ).eq("user_id", user_id).eq("status", "won").gte("updated_at", seven_days_ago).order("updated_at", desc=True).limit(limit).execute()
        
        for lead in (result.data or []):
            wins.append({
                "type": "deal",
                "description": f"Neukunde {lead.get('name', 'Unbekannt')} gewonnen",
                "date": lead.get("updated_at", "")[:10],
            })
        
    except Exception as e:
        print(f"Error loading recent wins: {e}")
    
    return wins[:limit]


# ═══════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_system_prompt(context: dict[str, Any]) -> str:
    """
    Baut den System Prompt für CHIEF basierend auf dem Kontext.
    
    Dies ist der zentrale Prompt, der CHIEF's Persönlichkeit und
    Wissen über den aktuellen User-Status definiert.
    
    Args:
        context: Der von build_chief_context() gebaute Kontext
        
    Returns:
        Vollständiger System Prompt String
    """
    user_name = context.get("user_name", "User")
    vertical = context.get("vertical_profile", {})
    daily_status = context.get("daily_flow_status", {})
    remaining = context.get("remaining_today", {})
    suggested_leads = context.get("suggested_leads", [])
    streak = context.get("streak_days", 0)
    
    # Wochentag bestimmen
    weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    today = date.today()
    weekday = weekdays[today.weekday()]
    current_time = datetime.now().strftime("%H:%M")
    
    # Progress berechnen
    progress = daily_status.get("overall_percent", 0) if daily_status else 0
    
    # Leads formatieren
    leads_text = ""
    if suggested_leads:
        leads_lines = []
        for lead in suggested_leads[:5]:
            leads_lines.append(f"- {lead.get('name', 'Unbekannt')} ({lead.get('status', '')}): {lead.get('reason', '')}")
        leads_text = "\n".join(leads_lines)
    else:
        leads_text = "- Keine priorisierten Leads aktuell"
    
    # Remaining Tasks
    remaining_contacts = remaining.get("new_contacts", 0)
    remaining_followups = remaining.get("followups", 0)
    remaining_reactivations = remaining.get("reactivations", 0)
    
    # Streak Emoji
    streak_text = ""
    if streak > 0:
        streak_text = f"\n🔥 STREAK: {streak} Tage in Folge Ziele erreicht!"
    
    prompt = f"""Du bist CHIEF - der persönliche Sales-Coach und AI-Assistent von {user_name}.

═══════════════════════════════════════════════════════════════════════════
DEIN STIL
═══════════════════════════════════════════════════════════════════════════
- Locker, direkt, motivierend
- Du-Ansprache, nie Sie
- Kurze, knackige Sätze
- Konkrete Handlungsempfehlungen
- Emojis sparsam aber gezielt einsetzen
- Vertical-Stil: {vertical.get('conversation_style', 'professionell')}

═══════════════════════════════════════════════════════════════════════════
HEUTE - {weekday}, {current_time} Uhr
═══════════════════════════════════════════════════════════════════════════
📊 Tagesfortschritt: {progress:.0f}%

Noch zu erledigen:
- {remaining_contacts} neue Kontakte
- {remaining_followups} Follow-ups
- {remaining_reactivations} Reaktivierungen
{streak_text}

═══════════════════════════════════════════════════════════════════════════
LEADS ZUM ANSPRECHEN
═══════════════════════════════════════════════════════════════════════════
{leads_text}

═══════════════════════════════════════════════════════════════════════════
WICHTIGE REGELN
═══════════════════════════════════════════════════════════════════════════
1. Nutze IMMER die konkreten Zahlen und Daten von oben
2. Schlage konkrete nächste Schritte vor (mit Lead-Namen wenn relevant)
3. Erfinde KEINE Daten - wenn du etwas nicht weißt, sag es
4. Bei Einwand-Fragen: Gib konkrete, erprobte Antwort-Strategien
5. Motiviere, aber bleib realistisch - keine leeren Versprechen

═══════════════════════════════════════════════════════════════════════════
TERMINOLOGIE ({vertical.get('vertical_label', 'Vertrieb')})
═══════════════════════════════════════════════════════════════════════════
- Primär: {vertical.get('terminology', {}).get('primary_unit', 'Kunde')}
- Sekundär: {vertical.get('terminology', {}).get('secondary_unit', 'Partner')}
- Deal: {vertical.get('terminology', {}).get('deal', 'Abschluss')}"""

    return prompt


# ═══════════════════════════════════════════════════════════════════════════
# PENDING ACTIONS CONTEXT
# ═══════════════════════════════════════════════════════════════════════════

async def _get_pending_actions_context(db: Client, user_id: str) -> dict:
    """
    Lädt Pending Actions für CHIEF Context.
    
    Gibt Zusammenfassung der ausstehenden Aktionen:
    - Zahlungsprüfungen (high priority!)
    - Follow-ups
    - Überfällige Aktionen
    """
    try:
        today = date.today()
        
        # Hol alle pending actions für heute und früher
        result = db.table("lead_pending_actions").select(
            "id, action_type, action_reason, due_date, priority, suggested_message, lead_id"
        ).eq("user_id", user_id).eq(
            "status", "pending"
        ).lte("due_date", today.isoformat()).order(
            "priority"
        ).order("due_date").limit(20).execute()
        
        if not result.data:
            return {
                "total": 0,
                "payment_checks": 0,
                "follow_ups": 0,
                "overdue": 0,
                "actions": [],
            }
        
        actions = result.data
        
        # Zähle nach Typ
        payment_checks = [a for a in actions if a.get("action_type") == "check_payment"]
        follow_ups = [a for a in actions if a.get("action_type") == "follow_up"]
        overdue = [a for a in actions if a.get("due_date") < today.isoformat()]
        
        # Hole Lead-Namen für die ersten 5 Actions
        enriched_actions = []
        for action in actions[:5]:
            lead_id = action.get("lead_id")
            lead_name = "Unbekannt"
            
            if lead_id:
                lead_result = db.table("leads").select(
                    "first_name, last_name"
                ).eq("id", lead_id).single().execute()
                
                if lead_result.data:
                    lead_name = f"{lead_result.data.get('first_name', '')} {lead_result.data.get('last_name', '')}".strip()
            
            enriched_actions.append({
                "type": action.get("action_type"),
                "reason": action.get("action_reason"),
                "due": action.get("due_date"),
                "lead_name": lead_name,
                "priority": action.get("priority"),
                "message": action.get("suggested_message"),
            })
        
        return {
            "total": len(actions),
            "payment_checks": len(payment_checks),
            "follow_ups": len(follow_ups),
            "overdue": len(overdue),
            "high_priority": len([a for a in actions if a.get("priority") == 1]),
            "actions": enriched_actions,
            "has_urgent": len(payment_checks) > 0 or len(overdue) > 0,
        }
        
    except Exception as e:
        print(f"Error loading pending actions context: {e}")
        return {"total": 0, "payment_checks": 0, "follow_ups": 0, "overdue": 0, "actions": []}


# ═══════════════════════════════════════════════════════════════════════════
# FINANCE CONTEXT
# ═══════════════════════════════════════════════════════════════════════════

async def _get_finance_context(db: Client, user_id: str) -> dict:
    """
    Lädt Finance Summary für CHIEF Context.
    
    Gibt Überblick über:
    - Einnahmen/Ausgaben/Gewinn (YTD)
    - Steuer-Reserve Warnung
    - Fehlende Belege
    - Fahrtenbuch Status
    
    WICHTIG: Keine Steuerberatung! Nur allgemeine Infos.
    """
    try:
        today = date.today()
        year_start = date(today.year, 1, 1)
        
        # Transaktionen für aktuelles Jahr
        tx_result = db.table("finance_transactions").select(
            "amount, transaction_type"
        ).eq("user_id", user_id).gte(
            "transaction_date", year_start.isoformat()
        ).eq("status", "confirmed").execute()
        
        if not tx_result.data:
            return {
                "has_data": False,
                "message": "Noch keine Finanzdaten erfasst",
            }
        
        # Berechne Summen
        income = sum(t["amount"] for t in tx_result.data if t["transaction_type"] == "income")
        expenses = sum(t["amount"] for t in tx_result.data if t["transaction_type"] == "expense")
        profit = income - expenses
        
        # Steuer-Reserve (grobe Schätzung)
        # Hole Tax Profile
        profile_result = db.table("finance_tax_profiles").select(
            "reserve_percentage"
        ).eq("user_id", user_id).single().execute()
        
        reserve_pct = 25  # Default
        if profile_result.data:
            reserve_pct = profile_result.data.get("reserve_percentage", 25)
        
        estimated_reserve = profit * reserve_pct / 100 if profit > 0 else 0
        
        # Fehlende Belege (nur große Beträge)
        missing_result = db.table("finance_transactions").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq(
            "transaction_type", "expense"
        ).gte("amount", 50).is_(
            "document_url", "null"
        ).is_("receipt_url", "null").execute()
        
        missing_receipts = missing_result.count or 0
        
        # Fahrtenbuch
        mileage_result = db.table("finance_mileage_log").select(
            "distance_km"
        ).eq("user_id", user_id).gte(
            "date", year_start.isoformat()
        ).execute()
        
        total_km = sum(m.get("distance_km", 0) for m in (mileage_result.data or []))
        
        return {
            "has_data": True,
            "year": today.year,
            "income_ytd": round(income, 2),
            "expenses_ytd": round(expenses, 2),
            "profit_ytd": round(profit, 2),
            "estimated_reserve": round(estimated_reserve, 2),
            "reserve_percentage": reserve_pct,
            "missing_receipts": missing_receipts,
            "mileage_km_ytd": round(total_km, 0),
            "disclaimer": "Nur Schätzung, keine Steuerberatung!",
            # Warnungen
            "needs_attention": missing_receipts > 5 or (profit > 10000 and estimated_reserve > 2500),
        }
        
    except Exception as e:
        print(f"Error loading finance context: {e}")
        return {"has_data": False}


# ═══════════════════════════════════════════════════════════════════════════
# STORYBOOK HELPERS
# ═══════════════════════════════════════════════════════════════════════════

async def get_story_for_situation(
    db: Client,
    company_id: str,
    situation: str,  # 'intro', 'objection', 'close', 'product', 'why'
    audience: str = None,  # 'consumer', 'business_partner', 'skeptic'
) -> Optional[dict]:
    """
    Findet die beste Story für eine bestimmte Situation.
    
    Args:
        db: Supabase Client
        company_id: Company ID
        situation: Art der Situation (intro, objection, etc.)
        audience: Zielgruppe (optional)
        
    Returns:
        Die passende Story oder None
    """
    try:
        # Map situation to story_type
        situation_map = {
            "intro": "elevator_pitch",
            "objection": "objection_story",
            "product": "product_story",
            "why": "why_story",
            "founder": "founder_story",
            "science": "science_story",
            "success": "success_story",
        }
        
        story_type = situation_map.get(situation, "short_story")
        
        query = db.table("company_stories").select("*").eq(
            "company_id", company_id
        ).eq("story_type", story_type).eq("is_active", True)
        
        if audience:
            query = query.eq("audience", audience)
        
        result = query.order("times_used", desc=True).limit(1).execute()
        
        if result.data:
            return result.data[0]
        
        # Fallback: Irgendeine aktive Story
        fallback = db.table("company_stories").select("*").eq(
            "company_id", company_id
        ).eq("is_active", True).limit(1).execute()
        
        return fallback.data[0] if fallback.data else None
        
    except Exception as e:
        print(f"Error getting story for situation: {e}")
        return None


async def check_response_compliance(
    db: Client,
    company_id: str,
    response_text: str,
) -> dict:
    """
    Prüft eine CHIEF-Antwort auf Compliance-Verstöße.
    
    Sollte aufgerufen werden bevor eine Antwort an den User gesendet wird.
    
    Args:
        db: Supabase Client
        company_id: Company ID
        response_text: Der zu prüfende Text
        
    Returns:
        Dict mit compliant, violations, can_send
    """
    import re
    
    try:
        # Get guardrails
        guardrails_result = db.table("company_guardrails").select(
            "rule_name, rule_description, severity, trigger_patterns, example_good"
        ).eq("is_active", True).or_(
            f"company_id.eq.{company_id},company_id.is.null"
        ).execute()
        
        if not guardrails_result.data:
            return {"compliant": True, "violations": [], "can_send": True}
        
        violations = []
        
        for guardrail in guardrails_result.data:
            patterns = guardrail.get("trigger_patterns", [])
            if not patterns:
                continue
            
            for pattern in patterns:
                try:
                    if re.search(pattern, response_text, re.IGNORECASE):
                        violations.append({
                            "rule_name": guardrail["rule_name"],
                            "severity": guardrail["severity"],
                            "suggestion": guardrail.get("example_good"),
                        })
                        break  # One match per rule
                except re.error:
                    continue
        
        has_blockers = any(v["severity"] == "block" for v in violations)
        
        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "can_send": not has_blockers,
            "has_warnings": any(v["severity"] == "warn" for v in violations),
        }
        
    except Exception as e:
        print(f"Error checking compliance: {e}")
        return {"compliant": True, "violations": [], "can_send": True}


def get_product_context(
    storybook_context: dict,
    product_name: str,
) -> Optional[str]:
    """
    Extrahiert Produkt-Kontext aus dem Storybook für CHIEF.
    
    Args:
        storybook_context: Der Storybook-Kontext aus build_chief_context
        product_name: Name oder Slug des Produkts
        
    Returns:
        Formatierter Produkt-Kontext oder None
    """
    if not storybook_context or not storybook_context.get("products"):
        return None
    
    product_name_lower = product_name.lower()
    
    for product in storybook_context["products"]:
        if (product_name_lower in product.get("name", "").lower() or
            product_name_lower in product.get("slug", "").lower()):
            
            lines = [
                f"\n═══════════════════════════════════════════════════════════════════════════════",
                f"PRODUKT-INFO: {product['name']}",
                f"═══════════════════════════════════════════════════════════════════════════════",
            ]
            
            if product.get("tagline"):
                lines.append(f"Slogan: {product['tagline']}")
            
            if product.get("description_short"):
                lines.append(f"\n{product['description_short']}")
            
            if product.get("key_benefits"):
                lines.append("\nVorteile:")
                for b in product["key_benefits"][:4]:
                    lines.append(f"  • {b}")
            
            if product.get("how_to_explain"):
                lines.append(f"\n💡 So erklären: {product['how_to_explain']}")
            
            if product.get("common_objections"):
                lines.append("\n⚠️ Typische Einwände:")
                for o in product["common_objections"][:3]:
                    lines.append(f"  • {o}")
            
            return "\n".join(lines)
    
    return None


# ═══════════════════════════════════════════════════════════════════════════
# QUICK CONTEXT (für einfache Fälle)
# ═══════════════════════════════════════════════════════════════════════════

def build_quick_context(
    user_name: str = "User",
    vertical_id: str = "network_marketing",
) -> dict[str, Any]:
    """
    Baut einen schnellen Basis-Kontext ohne DB-Abfragen.
    
    Nützlich für Demo/Testing oder wenn keine DB verfügbar ist.
    """
    today = date.today()
    weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    
    # Default Targets
    default_targets = {
        "new_contacts": 8,
        "followups": 6,
        "reactivations": 2,
    }
    
    return {
        "user_name": user_name,
        "context_date": today.isoformat(),
        "day_of_week": weekdays[today.weekday()],
        "current_time": datetime.now().strftime("%H:%M"),
        "vertical_profile": {
            "vertical_id": vertical_id,
            "vertical_label": "Network Marketing" if vertical_id == "network_marketing" else vertical_id.replace("_", " ").title(),
            "conversation_style": "locker, direkt, motivierend",
            "terminology": {
                "primary_unit": "Kunde",
                "secondary_unit": "Partner",
                "deal": "Abschluss",
            },
        },
        "daily_flow_status": {
            "date": today.isoformat(),
            "new_contacts": {"target": 8, "done": 0, "remaining": 8, "percent": 0},
            "followups": {"target": 6, "done": 0, "remaining": 6, "percent": 0},
            "reactivations": {"target": 2, "done": 0, "remaining": 2, "percent": 0},
            "overall_percent": 0,
            "is_on_track": False,
        },
        "remaining_today": default_targets,
        "suggested_leads": [],
        "streak_days": 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# V3.1 ADDITIONS - AI SALES OPERATING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class V31Context:
    """V3.1 erweiterter Kontext für CHIEF."""
    company_mode: CompanyMode = CompanyMode.SOLO
    compliance_rules: Optional[ComplianceRules] = None
    brand_voice: Optional[BrandVoice] = None
    user_goal: Optional[UserGoal] = None
    daily_targets: Optional[DailyTargets] = None
    lead_personality: Optional[PersonalityProfile] = None
    industry_id: Optional[str] = None
    formatted_prompt: str = ""


async def build_chief_v31_context(
    db: Client,
    user_id: str,
    company_id: str,
    lead_id: Optional[str] = None,
    include_goals: bool = True,
    include_personality: bool = True,
) -> V31Context:
    """
    Baut den erweiterten V3.1 Kontext für CHIEF.
    
    Enthält:
    - Enterprise Mode (Compliance, Brand Voice)
    - Revenue Engineering (Goal-basierte Targets)
    - Personality Matching (DISG-Analyse)
    - Industry Module
    
    Args:
        db: Supabase Client
        user_id: User ID
        company_id: Company ID
        lead_id: Optional Lead ID für Personality Matching
        include_goals: Revenue Engineering aktivieren?
        include_personality: DISG-Matching aktivieren?
        
    Returns:
        V31Context mit allen v3.1 Features
    """
    context = V31Context()
    
    # 1. Company Mode & Compliance ermitteln
    context.company_mode, context.compliance_rules, context.brand_voice = await _get_company_v31_settings(
        db, company_id
    )
    
    # 2. User Goals laden
    if include_goals:
        context.user_goal = await _get_user_goals(db, user_id)
        if context.user_goal:
            context.daily_targets = calculate_daily_targets(context.user_goal)
    
    # 3. Lead Personality analysieren
    if include_personality and lead_id:
        context.lead_personality = await _analyze_lead_personality(db, lead_id)
    
    # 4. Industry Module laden
    context.industry_id = await _get_user_industry(db, user_id, company_id)
    
    # 5. Prompt zusammenbauen
    context.formatted_prompt = build_v31_context(
        company_mode=context.company_mode,
        compliance_rules=context.compliance_rules,
        brand_voice=context.brand_voice,
        user_goal=context.user_goal,
        industry_id=context.industry_id,
        personality=context.lead_personality,
    )
    
    return context


async def _get_company_v31_settings(
    db: Client,
    company_id: str,
) -> tuple[CompanyMode, Optional[ComplianceRules], Optional[BrandVoice]]:
    """
    Lädt V3.1 spezifische Company-Einstellungen.
    
    Returns:
        Tuple von (CompanyMode, ComplianceRules, BrandVoice)
    """
    mode = CompanyMode.SOLO
    compliance = None
    brand = None
    
    try:
        # Company Settings laden
        result = db.table("company_settings").select(
            "company_mode, compliance_rules, brand_voice"
        ).eq("company_id", company_id).single().execute()
        
        if result.data:
            # Mode
            mode_str = result.data.get("company_mode", "solo")
            if mode_str == "network_team":
                mode = CompanyMode.NETWORK_TEAM
            elif mode_str == "enterprise":
                mode = CompanyMode.ENTERPRISE
            
            # Compliance Rules
            if result.data.get("compliance_rules"):
                rules = result.data["compliance_rules"]
                compliance = ComplianceRules(
                    forbidden_words=rules.get("forbidden_words", []),
                    required_disclaimers=rules.get("required_disclaimers", {}),
                    max_income_claim=rules.get("max_income_claim"),
                    tone=rules.get("tone", "professional"),
                    allowed_languages=rules.get("allowed_languages", ["de"]),
                    approval_required_for=rules.get("approval_required_for", []),
                )
            
            # Brand Voice
            if result.data.get("brand_voice"):
                voice = result.data["brand_voice"]
                brand = BrandVoice(
                    personality=voice.get("personality", "Freundlich-professionell"),
                    forbidden_phrases=voice.get("forbidden_phrases", []),
                    preferred_phrases=voice.get("preferred_phrases", []),
                    emoji_policy=voice.get("emoji_policy", "minimal"),
                    formality=voice.get("formality", "Du"),
                    response_length=voice.get("response_length", "concise"),
                )
    
    except Exception as e:
        print(f"Could not load V3.1 company settings: {e}")
    
    return mode, compliance, brand


async def _get_user_goals(
    db: Client,
    user_id: str,
) -> Optional[UserGoal]:
    """
    Lädt User-Ziele für Revenue Engineering.
    """
    try:
        result = db.table("user_goals").select(
            "monthly_target, current_revenue, avg_deal_size, conversion_rates"
        ).eq("user_id", user_id).eq(
            "month", date.today().strftime("%Y-%m")
        ).single().execute()
        
        if result.data:
            # Days remaining in month
            today = date.today()
            last_day = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            days_remaining = (last_day - today).days + 1
            
            return UserGoal(
                monthly_target=result.data.get("monthly_target", 3000),
                days_remaining=days_remaining,
                current_revenue=result.data.get("current_revenue", 0),
                avg_deal_size=result.data.get("avg_deal_size", 100),
                conversion_rates=result.data.get("conversion_rates", {
                    "outreach_to_reply": 0.30,
                    "reply_to_meeting": 0.50,
                    "meeting_to_close": 0.25,
                }),
            )
    
    except Exception as e:
        print(f"Could not load user goals: {e}")
    
    return None


async def _analyze_lead_personality(
    db: Client,
    lead_id: str,
) -> Optional[PersonalityProfile]:
    """
    Analysiert Lead-Nachrichten und erkennt DISG-Typ.
    """
    try:
        # Lead-Nachrichten laden
        result = db.table("messages").select(
            "content"
        ).eq("lead_id", lead_id).eq(
            "direction", "inbound"
        ).order("created_at", desc=True).limit(10).execute()
        
        if result.data:
            messages = [m["content"] for m in result.data if m.get("content")]
            if messages:
                return detect_personality_type(messages)
    
    except Exception as e:
        print(f"Could not analyze lead personality: {e}")
    
    return None


async def _get_user_industry(
    db: Client,
    user_id: str,
    company_id: str,
) -> Optional[str]:
    """
    Ermittelt die Branche des Users/Company.
    """
    try:
        # Erst Company prüfen
        result = db.table("companies").select(
            "industry_id"
        ).eq("id", company_id).single().execute()
        
        if result.data and result.data.get("industry_id"):
            return result.data["industry_id"]
        
        # Dann User Settings prüfen
        result = db.table("user_settings").select(
            "industry_id"
        ).eq("user_id", user_id).single().execute()
        
        if result.data and result.data.get("industry_id"):
            return result.data["industry_id"]
    
    except Exception as e:
        print(f"Could not get industry: {e}")
    
    return "network_marketing"  # Default


# ═══════════════════════════════════════════════════════════════════════════
# V3.1 HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def get_closing_help(
    situation: ClosingSituation,
    context: Optional[dict] = None,
) -> dict:
    """
    Gibt Closing-Hilfe für eine Situation.
    
    Args:
        situation: Die aktuelle Closing-Situation
        context: Optional Kontext mit Lead-Infos
        
    Returns:
        Dict mit killer_phrase, alternatives, why
    """
    best_phrase = get_best_killer_phrase(situation, context)
    all_phrases = get_killer_phrases(situation)
    
    return {
        "recommended": best_phrase,
        "alternatives": all_phrases[1:3] if len(all_phrases) > 1 else [],
        "situation": situation.value,
    }


async def analyze_objection_with_context(
    db: Client,
    lead_id: str,
    objection_text: str,
) -> ObjectionAnalysis:
    """
    Analysiert einen Einwand mit vollem Lead-Kontext.
    
    Args:
        db: Supabase Client
        lead_id: Lead ID
        objection_text: Der Einwand-Text
        
    Returns:
        ObjectionAnalysis mit Empfehlungen
    """
    context = {}
    
    try:
        # Lead-Historie laden
        result = db.table("messages").select(
            "content, direction"
        ).eq("lead_id", lead_id).order("created_at", desc=True).limit(20).execute()
        
        if result.data:
            messages = result.data
            
            # Kontextsignale sammeln
            context["budget_mentioned"] = any(
                "budget" in m.get("content", "").lower() 
                for m in messages if m.get("direction") == "inbound"
            )
            context["asked_about_price"] = any(
                "preis" in m.get("content", "").lower() or "kosten" in m.get("content", "").lower()
                for m in messages if m.get("direction") == "inbound"
            )
            context["engagement_level"] = "high" if len([
                m for m in messages if m.get("direction") == "inbound"
            ]) > 5 else "medium"
    
    except Exception as e:
        print(f"Could not load lead context: {e}")
    
    return analyze_objection(objection_text, context)


async def check_deal_health(
    db: Client,
    lead_id: str,
) -> Optional[dict]:
    """
    Prüft ob ein Deal in Gefahr ist (Deal Medic).
    
    Returns:
        Dict mit warnings und intervention wenn Deal at risk, sonst None
    """
    try:
        result = db.table("messages").select(
            "content, direction, created_at"
        ).eq("lead_id", lead_id).order("created_at", desc=True).limit(10).execute()
        
        if result.data:
            conversation = [
                {"type": "lead" if m["direction"] == "inbound" else "user", "content": m["content"]}
                for m in result.data
            ]
            return detect_deal_at_risk(lead_id, conversation)
    
    except Exception as e:
        print(f"Could not check deal health: {e}")
    
    return None


async def get_deal_post_mortem(
    db: Client,
    lead_id: str,
    lead_name: str,
) -> DealPostMortem:
    """
    Erstellt Post-Mortem Analyse für einen verlorenen Deal.
    
    Args:
        db: Supabase Client
        lead_id: Lead ID
        lead_name: Name des Leads
        
    Returns:
        DealPostMortem mit Analyse und Learnings
    """
    conversation = []
    
    try:
        result = db.table("messages").select(
            "content, direction, created_at"
        ).eq("lead_id", lead_id).order("created_at").execute()
        
        if result.data:
            day = 1
            last_date = None
            for m in result.data:
                msg_date = m["created_at"][:10] if m.get("created_at") else None
                if msg_date and msg_date != last_date:
                    day += 1
                    last_date = msg_date
                
                conversation.append({
                    "type": "lead" if m["direction"] == "inbound" else "user",
                    "content": m.get("content", ""),
                    "day": day,
                })
    
    except Exception as e:
        print(f"Could not load deal history: {e}")
    
    return analyze_lost_deal(lead_name, conversation)


# ═══════════════════════════════════════════════════════════════════════════
# V3.2 AUTOPILOT CONTEXT
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AutopilotContext:
    """V3.2 Autopilot Kontext für CHIEF."""
    autonomy_level: str = "assistant"
    confidence_threshold: int = 90
    permissions: dict = None
    working_hours: dict = None
    formatted_prompt: str = ""
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = {}
        if self.working_hours is None:
            self.working_hours = {}


async def build_chief_autopilot_context(
    db: Client,
    user_id: str,
    lead_id: Optional[str] = None,
) -> AutopilotContext:
    """
    Baut den Autopilot-Kontext für CHIEF v3.2.
    
    Enthält:
    - Autopilot Settings (Autonomy Level, Permissions)
    - Lead Override (falls VIP oder spezielle Behandlung)
    - Active Stats (Pending Drafts, Actions heute)
    
    Args:
        db: Supabase Client
        user_id: User ID
        lead_id: Optional Lead ID für Override-Check
        
    Returns:
        AutopilotContext mit Settings und Stats
    """
    from ..config.prompts.chief_autopilot import (
        build_autopilot_system_prompt,
        AutopilotSettings,
        AutonomyLevel
    )
    
    context = AutopilotContext()
    
    try:
        # 1. Settings laden
        settings_result = db.table("autopilot_settings").select("*").eq(
            "user_id", user_id
        ).single().execute()
        
        if settings_result.data:
            s = settings_result.data
            context.autonomy_level = s.get("autonomy_level", "assistant")
            context.confidence_threshold = s.get("confidence_threshold", 90)
            context.permissions = {
                "auto_info_replies": s.get("auto_info_replies", True),
                "auto_simple_questions": s.get("auto_simple_questions", True),
                "auto_followups": s.get("auto_followups", True),
                "auto_scheduling": s.get("auto_scheduling", True),
                "auto_calendar_booking": s.get("auto_calendar_booking", False),
                "auto_price_replies": s.get("auto_price_replies", False),
                "auto_objection_handling": s.get("auto_objection_handling", False),
                "auto_closing": s.get("auto_closing", False),
            }
            context.working_hours = {
                "start": s.get("working_hours_start", "09:00"),
                "end": s.get("working_hours_end", "20:00"),
                "weekends": s.get("send_on_weekends", False),
            }
            
            # Settings Objekt für Prompt
            settings = AutopilotSettings(
                autonomy_level=AutonomyLevel(context.autonomy_level),
                confidence_threshold=context.confidence_threshold,
                auto_info_replies=context.permissions.get("auto_info_replies", True),
                auto_simple_questions=context.permissions.get("auto_simple_questions", True),
                auto_followups=context.permissions.get("auto_followups", True),
                auto_scheduling=context.permissions.get("auto_scheduling", True),
                auto_calendar_booking=context.permissions.get("auto_calendar_booking", False),
                auto_price_replies=context.permissions.get("auto_price_replies", False),
                auto_objection_handling=context.permissions.get("auto_objection_handling", False),
                auto_closing=context.permissions.get("auto_closing", False),
                working_hours_start=context.working_hours.get("start", "09:00"),
                working_hours_end=context.working_hours.get("end", "20:00"),
                send_on_weekends=context.working_hours.get("weekends", False),
            )
            
            # Prompt bauen
            context.formatted_prompt = build_autopilot_system_prompt(
                autonomy_level=AutonomyLevel(context.autonomy_level),
                settings=settings
            )
        
        # 2. Lead Override laden (falls lead_id gegeben)
        if lead_id:
            override_result = db.table("lead_autopilot_overrides").select("*").eq(
                "lead_id", lead_id
            ).single().execute()
            
            if override_result.data:
                override = override_result.data
                # Override in Context einbauen
                context.permissions["lead_override"] = {
                    "mode": override.get("mode", "normal"),
                    "is_vip": override.get("is_vip", False),
                    "reason": override.get("reason"),
                }
    
    except Exception as e:
        print(f"Could not build autopilot context: {e}")
    
    return context


async def get_autopilot_stats_for_context(
    db: Client,
    user_id: str,
) -> dict:
    """
    Lädt Autopilot-Stats für den CHIEF Kontext.
    
    Returns:
        Dict mit pending_drafts, actions_today, etc.
    """
    stats = {
        "pending_drafts": 0,
        "actions_today": 0,
        "auto_sent_today": 0,
        "human_needed_today": 0,
    }
    
    try:
        # Pending Drafts
        drafts = db.table("autopilot_drafts").select(
            "id", count="exact"
        ).eq(
            "user_id", user_id
        ).eq(
            "status", "pending"
        ).execute()
        stats["pending_drafts"] = drafts.count or 0
        
        # Actions heute
        today = datetime.now().date().isoformat()
        actions = db.table("autopilot_actions").select(
            "action"
        ).eq(
            "user_id", user_id
        ).gte(
            "created_at", today
        ).execute()
        
        if actions.data:
            stats["actions_today"] = len(actions.data)
            stats["auto_sent_today"] = sum(
                1 for a in actions.data if a["action"] == "auto_send"
            )
            stats["human_needed_today"] = sum(
                1 for a in actions.data if a["action"] == "human_needed"
            )
    
    except Exception as e:
        print(f"Could not load autopilot stats: {e}")
    
    return stats