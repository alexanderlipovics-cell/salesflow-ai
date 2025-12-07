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
from contextlib import asynccontextmanager
import logging
import sys

# Initialize Sentry (must be first)
from .core import sentry

# Logging Setup (ohne request_id da das nur mit Middleware funktioniert)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Event Handler registrieren (beim Import)
# Dies muss VOR der App-Erstellung passieren, damit Handler registriert sind
try:
    from .events.handlers import lead_handlers  # noqa: F401
    logging.info("Event handlers imported and registered")
except ImportError as e:
    logging.warning(f"Could not import event handlers: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager für Startup/Shutdown Events."""
    # Startup
    logging.info("🚀 SalesFlow AI starting up...")
    
    # Event Handler sind bereits beim Import registriert
    # Hier könnten weitere Startup-Tasks laufen:
    # - Health Checks
    # - Cache Warming
    # - Background Tasks starten
    
    yield
    
    # Shutdown
    logging.info("🛑 SalesFlow AI shutting down...")


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
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": {}
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
# Erlaubt Frontend-Origins (Vercel + localhost). Previews über Regex *.vercel.app.
allowed_origins = [
    # Production Vercel Domains
    "https://aura-os-git-main-sales-flow-ais-projects.vercel.app",
    "https://aura-os-topaz.vercel.app",
    "https://aura-3e8tbi4ny-sales-flow-ais-projects.vercel.app",
    "https://aura-n92sibt17-sales-flow-ais-projects.vercel.app",
    # Localhost Development
    "http://localhost:3000",
    "http://localhost:8000",
    # Vite Development Server (verschiedene Ports)
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    # Alternative localhost-Formate
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8003",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # alle Vercel-Previews (inkl. git-main, git-*, etc.)
    allow_credentials=True,
    allow_methods=["*"],        # OPTIONS wird automatisch gehandhabt
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request Context Filter für Logging (fügt request_id zu Logs hinzu)
for handler in logging.root.handlers:
    handler.addFilter(RequestContextFilter())

# Router importieren (aus app/routers/)
from .routers.auth import router as auth_router  # JWT Authentication
from .routers.leads import router as leads_router
from .routers.copilot import router as copilot_router
from .routers.chat import router as chat_router
# from .routers.autopilot import router as autopilot_router  # Temporär deaktiviert, Autopilot unvollständig
from .routers.analytics import router as analytics_router
from .routers.analytics_extended import router as analytics_extended_router
from .routers.zero_input_crm import router as zero_input_crm_router
from .routers.channel_webhooks import router as webhooks_router
from .routers.collective_intelligence import router as ci_router
from .routers.lead_generation import router as lead_gen_router  # Non Plus Ultra Lead Generation
from .routers.idps import router as idps_router  # IDPS: Intelligent DM Persistence System
from .routers.chat_import import router as chat_import_router  # 🆕 Chat Import für Networker
from .routers.screenshot_import import router as screenshot_router  # 🆕 Screenshot-to-Lead Magic
from .routers.followups import router as followups_router  # 🆕 GPT Follow-Up Engine
from .routers.team_templates import router as team_templates_router  # 🆕 Team Duplikation
from .routers.lead_hunter import router as lead_hunter_router  # 🆕 Lead Hunter für Networker
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
from .routers.closing_coach import router as closing_coach_router  # 🎯 Closing Coach
from .routers.cold_call_assistant import router as cold_call_router  # 📞 Kaltakquise-Assistent
from .routers.vision import router as vision_router  # 🤖 Claude Vision für Screenshots
from .routers.performance_insights import router as performance_insights_router  # 📈 Performance Insights
from .routers.gamification import router as gamification_router  # 🏆 Gamification
from .routers.lead_qualifier import router as lead_qualifier_router  # 🧠 AI Lead Qualifier
from .routers.lead_discovery import router as lead_discovery_router  # 🔍 Lead Discovery Engine

# Router registrieren
app.include_router(auth_router, prefix="/api")  # Authentication (public endpoints)
app.include_router(leads_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
# app.include_router(autopilot_router, prefix="/api")  # deaktiviert bis Autopilot stabil ist
app.include_router(analytics_router, prefix="/api")
app.include_router(analytics_extended_router, prefix="/api")  # Extended Analytics & Monitoring
app.include_router(zero_input_crm_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(ci_router)  # Collective Intelligence (Non Plus Ultra)
app.include_router(lead_gen_router, prefix="/api")  # Non Plus Ultra Lead Generation System
app.include_router(idps_router, prefix="/api")  # IDPS: Intelligent DM Persistence System
app.include_router(chat_import_router, prefix="/api")  # 🆕 Chat Import für Networker
app.include_router(screenshot_router, prefix="/api")  # 🆕 Screenshot-to-Lead Magic (GPT-4o Vision)
app.include_router(followups_router, prefix="/api")  # 🆕 GPT Follow-Up Engine
app.include_router(team_templates_router, prefix="/api")  # 🆕 Team Duplikation System
app.include_router(lead_hunter_router, prefix="/api")  # 🆕 Lead Hunter für Networker
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
app.include_router(closing_coach_router, prefix="/api")  # 🎯 Closing Coach
app.include_router(cold_call_router, prefix="/api")  # 📞 Kaltakquise-Assistent
app.include_router(performance_insights_router, prefix="/api")  # 📈 Performance Insights
app.include_router(gamification_router, prefix="/api")  # 🏆 Gamification
app.include_router(lead_qualifier_router)  # 🧠 AI Lead Qualifier (hat bereits /api/lead-qualifier prefix)
app.include_router(lead_discovery_router)  # 🔍 Lead Discovery Engine (hat bereits /api/lead-discovery prefix)
app.include_router(vision_router, prefix="/api")  # 🤖 Claude Vision für Screenshots


# Health check und root sind jetzt am Anfang der Datei definiert
