# ═══════════════════════════════════════════════════════════════════════════════
# KRITISCH: Proxy-Umgebungsvariablen deaktivieren - MUSS ERSTE ZEILEN SEIN!
# ═══════════════════════════════════════════════════════════════════════════════
# httpx (von supabase-py verwendet) liest automatisch HTTP_PROXY/HTTPS_PROXY
# Umgebungsvariablen beim Import. Dies führt zu Fehlern bei Render-Deployments.
# Lösung: Deaktiviere Proxy-Umgebungsvariablen VOR ALLEN anderen Imports.
import os
for var in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    os.environ.pop(var, None)
os.environ["NO_PROXY"] = "*"

# Jetzt können andere Imports erfolgen
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from contextlib import asynccontextmanager
import logging
import sys
import traceback
import uuid

# Initialize Sentry (must be first)
from .core import sentry

# Logging Setup (ohne request_id da das nur mit Middleware funktioniert)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("salesflow")

# Event Handler registrieren (beim Import)
# Dies muss VOR der App-Erstellung passieren, damit Handler registriert sind
try:
    from .events.handlers import lead_handlers  # noqa: F401
    logging.info("Event handlers imported and registered")
except ImportError as e:
    logging.warning(f"Could not import event handlers: {e}")


scheduler = AsyncIOScheduler()


async def scheduled_followup_generation():
    """Background task to generate follow-up suggestions for all users."""
    from app.supabase_client import get_supabase_client
    from datetime import datetime, timezone
    import uuid

    try:
        supabase = get_supabase_client()
        print(f"[Scheduler] Starting follow-up generation at {datetime.now()}")

        # Get all unique user_ids with active flows
        result = supabase.table("leads").select("user_id").not_.is_("flow", "null").execute()
        user_ids = list(set([lead["user_id"] for lead in result.data if lead.get("user_id")]))

        suggestions_created = 0

        for user_id in user_ids:
            try:
                # Find leads with due follow-ups for this user
                leads_result = supabase.table("leads").select("*").eq(
                    "user_id", user_id
                ).not_.is_("flow", "null").lte(
                    "next_follow_up_at", datetime.now(timezone.utc).isoformat()
                ).or_("do_not_contact.is.null,do_not_contact.eq.false").execute()

                for lead in leads_result.data:
                    # Check if suggestion already exists
                    existing = supabase.table("followup_suggestions").select("id").eq(
                        "lead_id", lead["id"]
                    ).eq("status", "pending").execute()

                    if existing.data:
                        continue  # Skip, already has pending suggestion

                    # Get rule for current stage
                    rule_result = supabase.table("followup_rules").select("*").eq(
                        "flow", lead["flow"]
                    ).eq("stage", lead.get("follow_up_stage", 0)).execute()

                    if not rule_result.data:
                        continue

                    rule = rule_result.data[0]

                    if not rule.get("template_key"):
                        continue

                    # Get template
                    template_result = supabase.table("message_templates").select("*").eq(
                        "step_key", rule["template_key"]
                    ).execute()

                    if not template_result.data:
                        continue

                    template = template_result.data[0]

                    # Personalize message
                    lead_name = lead.get("name", "").split()[0] if lead.get("name") else ""
                    message = template["template_text"].replace("{name}", lead_name)
                    if "{company}" in message:
                        message = message.replace("{company}", lead.get("company", ""))

                    # Calculate days since last contact
                    days_waiting = 0
                    if lead.get("last_outreach_at"):
                        try:
                            last_outreach = datetime.fromisoformat(lead["last_outreach_at"].replace("Z", "+00:00"))
                            days_waiting = (datetime.now(timezone.utc) - last_outreach).days
                        except Exception:
                            pass

                    # Create suggestion
                    supabase.table("followup_suggestions").insert({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "lead_id": lead["id"],
                        "flow": lead["flow"],
                        "stage": lead.get("follow_up_stage", 0),
                        "template_key": rule["template_key"],
                        "channel": lead.get("preferred_channel", "WHATSAPP"),
                        "suggested_message": message,
                        "reason": f"Keine Antwort seit {days_waiting} Tagen" if days_waiting > 0 else "Follow-up fällig",
                        "due_at": datetime.now(timezone.utc).isoformat(),
                        "status": "pending"
                    }).execute()

                    suggestions_created += 1

            except Exception as e:
                print(f"[Scheduler] Error for user {user_id}: {e}")

        print(f"[Scheduler] Generated {suggestions_created} suggestions for {len(user_ids)} users")

    except Exception as e:
        print(f"[Scheduler] Error in scheduled_followup_generation: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager für Startup/Shutdown Events."""
    logging.info("🚀 SalesFlow AI starting up...")

    # Bestehenden Scheduler aus Services starten (andere Background-Jobs)
    from .services.scheduler import setup_scheduler, shutdown_scheduler
    setup_scheduler()
    logging.info("📅 Background scheduler started")

    # Follow-up Generator Scheduler starten
    scheduler.add_job(
        scheduled_followup_generation,
        trigger=IntervalTrigger(minutes=15),
        id="followup_generation",
        name="Generate follow-up suggestions",
        replace_existing=True
    )
    scheduler.start()
    print("[Scheduler] Background scheduler started - running every 15 minutes")

    yield

    logging.info("🛑 SalesFlow AI shutting down...")
    shutdown_scheduler()
    logging.info("📅 Background scheduler stopped")

    scheduler.shutdown()
    print("[Scheduler] Background scheduler stopped")


# App erstellen
app = FastAPI(
    title="SalesFlow AI API",
    description="Backend für SalesFlow AI - Network Marketing CRM",
    version="2.0.0",
    lifespan=lifespan
)

# EARLY Health Check (vor allen Imports)
@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}

@app.get("/")
async def root():
    return {"status": "ok", "app": "SalesFlow AI", "version": "2.0.0"}

# ============= Exception Handlers =============
from .core.exceptions import SalesFlowException, exception_to_dict, get_status_code

@app.exception_handler(SalesFlowException)
async def salesflow_exception_handler(request: Request, exc: SalesFlowException):
    """Handle all SalesFlow custom exceptions."""
    return JSONResponse(
        status_code=exc.get_status_code(),
        content=exc.to_dict()
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return safe response."""
    error_id = str(uuid.uuid4())[:8]

    logger.error(
        f"[{error_id}] Unhandled error on {request.method} {request.url.path}: "
        f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Ein unerwarteter Fehler ist aufgetreten",
            "error_id": error_id,
            "hint": "Bitte versuche es erneut oder kontaktiere den Support"
        }
    )

# ============= Middleware (Reihenfolge wichtig!) =============
from .middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    RequestIdMiddleware,
    get_development_config,
    RequestContextFilter,
)
from .config import get_settings

settings = get_settings()

# 1. Request ID Middleware (zuerst, damit alle Logs die ID haben)
app.add_middleware(
    RequestIdMiddleware,
    log_requests=True,
    include_timing=True,
    exclude_paths=["/health", "/docs", "/openapi.json", "/redoc"]
)

# 2. Security Headers Middleware
app.add_middleware(
    SecurityHeadersMiddleware,
    config=get_development_config(),  # In Production: get_production_config()
    exclude_paths=["/docs", "/openapi.json", "/redoc"]
)

# 3. Rate Limiting Middleware (deaktiviert / fehlerhaftes Argument entfernt)
# app.add_middleware(
#     RateLimitMiddleware,
#     enabled=False,  # Temporär deaktiviert, um Auth-Calls nicht zu drosseln
#     default_window=60,  # Sekunden pro Fenster
#     exclude_paths=[
#         "/health",
#         "/docs",
#         "/openapi.json",
#         "/redoc",
#         "/api/auth/signup",  # Signup darf nicht gedrosselt werden
#         "/api/auth/login",   # Login auch nicht drosseln
#         "/api/auth/refresh", # Refresh nicht drosseln
#         "/api/auth/me",      # Me nicht drosseln
#     ]
# )

# 4. CORS Middleware
# Erlaubt Frontend-Origins (Vercel + localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://salesflow-system.com",
        "https://www.salesflow-system.com",
        "https://aura-os-topaz.vercel.app",
        "https://aura-os-git-main-sales-flow-ais-projects.vercel.app",
        "https://aura-4kej8wk1c-sales-flow-ais-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# Request-Timing Middleware
@app.middleware("http")
async def add_timing(request: Request, call_next):
    import time

    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    response.headers["X-Response-Time"] = f"{duration:.3f}s"

    if duration > 2.0:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} took {duration:.2f}s"
        )

    return response

# Request Context Filter für Logging (fügt request_id zu Logs hinzu)
for handler in logging.root.handlers:
    handler.addFilter(RequestContextFilter())

# Router importieren (aus app/routers/)
from .routers.auth import router as auth_router  # JWT Authentication
from .routers.leads import router as leads_router
from .routers.copilot import router as copilot_router
from .routers.chat import router as chat_router
from .routers.ai_chat import router as ai_chat_router
from .routers import google_auth, emails
# from .routers.autopilot import router as autopilot_router  # Temporär deaktiviert, Autopilot unvollständig
from .routers.analytics import router as analytics_router
from .routers.analytics_extended import router as analytics_extended_router
from .routers.zero_input_crm import router as zero_input_crm_router
from .routers.channel_webhooks import router as webhooks_router
from .routers.collective_intelligence import router as ci_router
from .routers.lead_generation import router as lead_gen_router  # Non Plus Ultra Lead Generation
from .routers.ai_followup import router as ai_followup_router  # 🧠 Magic Send Follow-up
from .routers.idps import router as idps_router  # IDPS: Intelligent DM Persistence System
from .routers.chat_import import router as chat_import_router  # 🆕 Chat Import für Networker
from .routers.screenshot_import import router as screenshot_router  # 🆕 Screenshot-to-Lead Magic
from .routers.followups import router as followups_router, router_v2 as followups_router_v2  # 🆕 GPT Follow-Up Engine
from .routers.sequences import router as sequences_router  # 🆕 Follow-up Sequenzen
from .routers.team_templates import router as team_templates_router  # 🆕 Team Duplikation
from .routers.lead_hunter import router as lead_hunter_router  # 🆕 Lead Hunter für Networker
from .routers.hunter_board import router as hunter_board_router  # 🆕 Hunter Board Intelligence
from .routers.onboarding import router as onboarding_router  # 🆕 Magic Onboarding System
from .routers.compensation import router as compensation_router  # 🆕 Provisionsberechnung
from .routers.ad_webhooks import router as ad_webhooks_router  # 🆕 Ad Platform Webhooks (Facebook, LinkedIn, Instagram)
from .routers.facebook_webhook import router as facebook_webhook_router  # 🆕 Facebook Lead Ads Webhook
from .routers.linkedin_webhook import router as linkedin_webhook_router  # 🆕 LinkedIn Lead Gen Webhook
from .routers.instagram_webhook import router as instagram_webhook_router  # 🆕 Instagram DM Webhook
from .routers.conversations import router as conversations_router  # 🆕 Conversation Memory
from .routers.conversation_webhooks import router as conversation_webhooks_router  # 🆕 Conversation Engine 2.0 Webhooks
from .domain.leads.api import router as domain_leads_router  # 🆕 Domain Architecture - Leads
from .routers.events import router as events_router  # 🆕 Event Management API
from .routers.lead_suggestions import router as lead_suggestions_router  # 🆕 Smart Suggestions
from .routers.ops_deployments import router as ops_deployments_router  # 🆕 AI Ops Deployment Management
from .routers.consent import router as consent_router  # 🛡️ GDPR Consent Management
from .routers.privacy import router as privacy_router  # 🛡️ GDPR Privacy Operations
from .routers.user_learning import router as user_learning_router  # 🧠 User Learning & Personalization
from .routers.genealogy import router as genealogy_router  # 🌳 Genealogy Tree & Downline
from .routers.commissions import router as commissions_router  # 💰 Provisions-Tracker & Rechnungsgenerator
from .routers.network import router as network_router  # 🧭 Network Dashboard & Team
from .routers.knowledge import router as knowledge_router  # 🧠 User Business Knowledge
from .routers.settings import router as settings_router  # ⚙️ User Settings (Vertical/Plan)
from .routers.closing_coach import router as closing_coach_router  # 🎯 Closing Coach
from .routers.power_hour import router as power_hour_router  # ⚡ Power Hour Sprint
from .routers.objections import router as objections_router  # 🧠 Objection Handling
from .routers.competitors import router as competitors_router  # 🛡️ Competitor Battle Cards
from .routers.cold_call_assistant import router as cold_call_router  # 📞 Kaltakquise-Assistent
from .routers.vision import router as vision_router  # 🤖 Claude Vision für Screenshots
from .routers.smart_import import router as smart_import_router  # 🧠 Smart Chat Import
from .routers.csv_import import router as csv_import_router  # 🧠 CSV/VCF Import
from .routers.magic_send import router as magic_send_router  # 🔗 Magic Send Deep Links
from .routers.notifications import router as notifications_router  # 🔔 Background Notifications
from .routers.stakeholder import router as stakeholder_router  # 🧭 Stakeholder Mapping
from .routers.finance import router as finance_router  # 💰 Finance Module
from .routers.performance_insights import router as performance_insights_router  # 📈 Performance Insights
from .routers.push import router as push_router  # 📱 Push Notifications
from .routers.income_predictor import router as income_predictor_router  # 📈 Income Predictor
from .routers.gamification import router as gamification_router  # 🏆 Gamification
from .routers.lead_qualifier import router as lead_qualifier_router  # 🧠 AI Lead Qualifier
from .routers.lead_discovery import router as lead_discovery_router  # 🔍 Lead Discovery Engine
from .routers.lead_analysis import router as lead_analysis_router  # 🧠 Lead Deep Scan Intelligence
from .routers.meeting_prep import router as meeting_prep_router  # 🧠 Meeting Prep
from .routers.voice import router as voice_router  # 🗣️ Voice Transcription
from .routers.proposals import router as proposals_router  # 📄 Angebots-PDFs
from .routers.email_sync import router as email_sync_router  # 📧 Email Sync & Tracking
from .routers.interactions import router as interactions_router  # 📊 User Interactions Tracking
from .routers.dashboard import router as dashboard_router  # 📊 Dashboard Data
from .api.zapier import router as zapier_router  # 🔌 Zapier Integration
from .routers.ai_usage import router as ai_usage_router  # 🧾 AI Usage Limits
from .routers.stubs import router as stubs_router  # Temporary stub endpoints
from .routers.inbox import router as inbox_router  # 📨 Approval Inbox

# Router registrieren
app.include_router(auth_router, prefix="/api")  # Authentication (public endpoints)
app.include_router(leads_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(ai_chat_router)
app.include_router(google_auth.router)
app.include_router(emails.router)
# app.include_router(autopilot_router, prefix="/api")  # deaktiviert bis Autopilot stabil ist
app.include_router(analytics_router, prefix="/api")
app.include_router(analytics_extended_router, prefix="/api")  # Extended Analytics & Monitoring
app.include_router(zero_input_crm_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(ci_router)  # Collective Intelligence (Non Plus Ultra)
app.include_router(ai_followup_router, prefix="/api")  # 🧠 Magic Send Follow-up
app.include_router(lead_gen_router, prefix="/api")  # Non Plus Ultra Lead Generation System
app.include_router(idps_router, prefix="/api")  # IDPS: Intelligent DM Persistence System
app.include_router(chat_import_router, prefix="/api")  # 🆕 Chat Import für Networker
app.include_router(screenshot_router, prefix="/api")  # 🆕 Screenshot-to-Lead Magic (GPT-4o Vision)
app.include_router(followups_router, prefix="/api")  # 🆕 GPT Follow-Up Engine
app.include_router(followups_router_v2, prefix="/api")  # 🆕 Follow-Up Suggestions V2
app.include_router(sequences_router, prefix="/api")  # 🆕 Follow-up Sequenzen
app.include_router(team_templates_router, prefix="/api")  # 🆕 Team Duplikation System
app.include_router(lead_hunter_router, prefix="/api")  # 🆕 Lead Hunter für Networker
app.include_router(hunter_board_router, prefix="/api")  # 🆕 Hunter Board Intelligence
app.include_router(onboarding_router, prefix="/api")  # 🆕 Magic Onboarding System
app.include_router(compensation_router, prefix="/api")  # 🆕 Provisionsberechnung für MLM
app.include_router(ad_webhooks_router, prefix="/api")  # 🆕 Ad Platform Webhooks (Facebook, LinkedIn, Instagram)
app.include_router(facebook_webhook_router)  # 🆕 Facebook Lead Ads Webhook
app.include_router(linkedin_webhook_router)  # 🆕 LinkedIn Lead Gen Webhook
app.include_router(instagram_webhook_router)  # 🆕 Instagram DM Webhook
app.include_router(conversations_router, prefix="/api")  # 🆕 Conversation Memory
app.include_router(conversation_webhooks_router)  # 🆕 Conversation Engine 2.0 Webhooks
app.include_router(domain_leads_router, prefix="/api")  # 🆕 Domain Architecture - Leads
app.include_router(events_router, prefix="/api")  # 🆕 Event Management API
app.include_router(lead_suggestions_router, prefix="/api")  # 🆕 Smart Suggestions
app.include_router(ops_deployments_router, prefix="/api")  # 🆕 AI Ops Deployment Management
app.include_router(consent_router, prefix="/api")  # 🛡️ GDPR Consent Management
app.include_router(privacy_router, prefix="/api")  # 🛡️ GDPR Privacy Operations
app.include_router(user_learning_router, prefix="/api")  # 🧠 User Learning & Personalization
app.include_router(genealogy_router, prefix="/api")  # 🌳 Genealogy Tree & Downline
app.include_router(commissions_router, prefix="/api")  # 💰 Provisions-Tracker & Rechnungsgenerator
app.include_router(network_router, prefix="/api")  # 🧭 Network Dashboard & Team
app.include_router(knowledge_router, prefix="/api")  # 🧠 User Business Knowledge
app.include_router(settings_router, prefix="/api")  # ⚙️ User Settings (Vertical/Plan)
app.include_router(meeting_prep_router, prefix="/api")  # 🧠 Meeting Prep
app.include_router(closing_coach_router, prefix="/api")  # 🎯 Closing Coach
app.include_router(power_hour_router, prefix="/api")  # ⚡ Power Hour Sprint
app.include_router(objections_router, prefix="/api")  # 🧠 Objection Handling
app.include_router(competitors_router, prefix="/api")  # 🛡️ Competitor Battle Cards
app.include_router(cold_call_router, prefix="/api")  # 📞 Kaltakquise-Assistent
app.include_router(performance_insights_router, prefix="/api")  # 📈 Performance Insights
app.include_router(push_router)  # 📱 Push Notifications (has own prefix)
app.include_router(gamification_router, prefix="/api")  # 🏆 Gamification
app.include_router(lead_qualifier_router)  # 🧠 AI Lead Qualifier (hat bereits /api/lead-qualifier prefix)
app.include_router(lead_discovery_router)  # 🔍 Lead Discovery Engine (hat bereits /api/lead-discovery prefix)
app.include_router(lead_analysis_router, prefix="/api")  # 🧠 Lead Deep Scan Intelligence
app.include_router(vision_router, prefix="/api")  # 🤖 Claude Vision für Screenshots
app.include_router(smart_import_router, prefix="/api")  # 🧠 Smart Chat Import
app.include_router(csv_import_router, prefix="/api")  # 🧠 CSV/VCF Import
app.include_router(finance_router, prefix="/api")  # 💰 Finance Module
app.include_router(income_predictor_router, prefix="/api")  # 📈 Income Predictor
app.include_router(magic_send_router, prefix="/api")  # 🔗 Magic Send Deep Links
app.include_router(notifications_router)  # 🔔 Background Notifications (has own prefix)
app.include_router(stakeholder_router, prefix="/api")  # 🧭 Stakeholder Mapping
app.include_router(voice_router, prefix="/api/voice")  # 🗣️ Voice Transcription
app.include_router(proposals_router, prefix="/api")  # 📄 Angebots-PDFs
app.include_router(email_sync_router, prefix="/api")  # 📧 Email Sync & Tracking
app.include_router(interactions_router, prefix="/api")  # 📊 User Interactions Tracking
app.include_router(dashboard_router, prefix="/api")  # 📊 Dashboard Data
app.include_router(zapier_router)  # 🔌 Zapier Integration (Router bringt eigenes Prefix mit)
app.include_router(ai_usage_router)  # 🧾 AI Usage Status
app.include_router(stubs_router)  # Temporary stub endpoints
app.include_router(inbox_router)  # 📨 Approval Inbox (hat eigenes /api/inbox Prefix)


# Health check und root sind jetzt am Anfang der Datei definiert
