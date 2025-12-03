"""FastAPI application bootstrap."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import router as legacy_router
# from app.api.v1 import coaching  # TEMPORÄR DEAKTIVIERT - CoachingInput fehlt
from app.config import get_settings
from app.middleware.body_cache import BodyCacheMiddleware
from app.middleware.workspace_extractor import WorkspaceExtractorMiddleware
from app.services.cache_service import cache_service
from app.utils.logger import get_logger
from app.utils.rate_limit import limiter

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup/shutdown hooks."""

    logger.info(
        "Starte Sales Flow AI Backend",
        extra={"environment": settings.ENVIRONMENT, "version": settings.APP_VERSION},
    )
    await cache_service.connect()
    yield
    logger.info("Stoppe Sales Flow AI Backend")
    await cache_service.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# HINWEIS: BaseHTTPMiddleware hat Kompatibilitätsprobleme mit Starlette 0.32+
# app.add_middleware(WorkspaceExtractorMiddleware)  # Temporär deaktiviert
# app.add_middleware(BodyCacheMiddleware)  # Temporär deaktiviert


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate-limit errors in a structured way."""

    client = request.client.host if request.client else "unknown"
    logger.warning(
        "Rate Limit überschritten",
        extra={"client": client, "path": str(request.url.path)},
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": getattr(exc, "detail", "60"),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for observability."""

    logger.error(
        "Unhandled Exception",
        extra={"error": str(exc), "path": str(request.url.path)},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root() -> dict:
    """Basic availability endpoint."""

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health")
async def health_check():
    """Health endpoint for readiness probes."""

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# app.include_router(
#     coaching.router,
#     prefix=f"{settings.API_V1_PREFIX}/coaching",
#     tags=["coaching"],
# )

# ═══════════════════════════════════════════════════════════════════════════
# PREMIUM FEATURES ROUTERS
# ═══════════════════════════════════════════════════════════════════════════

# Intelligent Chat (Premium)
try:
    from app.routers import intelligent_chat
    app.include_router(
        intelligent_chat.router,
        prefix="/api/intelligent-chat",
        tags=["intelligent-chat", "premium"]
    )
except ImportError:
    logger.warning("Intelligent Chat router not available")

# Predictive AI (Premium)
try:
    from app.routers import predictive_ai
    app.include_router(
        predictive_ai.router,
        prefix="/api/predictive-ai",
        tags=["predictive-ai", "premium"]
    )
except ImportError:
    logger.warning("Predictive AI router not available")

# Knowledge RAG (Starter+)
try:
    from app.routers import knowledge_rag
    app.include_router(
        knowledge_rag.router,
        prefix="/api/knowledge",
        tags=["knowledge", "rag", "starter"]
    )
except ImportError:
    logger.warning("Knowledge RAG router not available")

# Lead Generation (Premium)
try:
    from app.routers import lead_generation
    app.include_router(
        lead_generation.router,
        prefix="/api/lead-gen",
        tags=["lead-generation", "premium"]
    )
except ImportError:
    logger.warning("Lead Generation router not available")

# Video Conferencing (Zoom, Teams, Google Meet)
try:
    from app.routers import video_meetings, video_webhooks, integrations
    app.include_router(
        video_meetings.router,
        tags=["video-meetings"]
    )
    app.include_router(
        video_webhooks.router,
        tags=["webhooks"]
    )
    app.include_router(
        integrations.router,
        tags=["integrations"]
    )
    logger.info("Video Conferencing routes loaded successfully")
except Exception as e:
    logger.warning(f"Video Conferencing routers not available: {e}")

# Follow-up Engine (Automatic Follow-ups)
try:
    from app.routers import followups
    app.include_router(
        followups.router,
        tags=["follow-ups", "automation"]
    )
    logger.info("Follow-up Engine routes loaded successfully ✅")
except ImportError as e:
    logger.warning(f"Follow-up Engine router not available: {e}")

# Auto-Reminder Trigger System
try:
    from app.routers import auto_reminders
    app.include_router(
        auto_reminders.router,
        tags=["auto-reminders", "automation"]
    )
    logger.info("Auto-Reminder Trigger System loaded successfully ✅")
except ImportError as e:
    logger.warning(f"Auto-Reminder router not available: {e}")

# Internationalization (i18n)
try:
    from app.routers import i18n
    app.include_router(
        i18n.router,
        tags=["i18n", "translations"]
    )
    logger.info("i18n System loaded successfully 🌍✅")
except ImportError as e:
    logger.warning(f"i18n router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# KI PROMPTS & INTELLIGENCE ROUTERS
# ═══════════════════════════════════════════════════════════════════════════

# AI Prompts - KI System Prompts
try:
    from app.routers import ai_prompts
    app.include_router(ai_prompts.router, tags=["ai-prompts"])
    logger.info("AI Prompts System loaded ✅")
except ImportError as e:
    logger.warning(f"AI Prompts router not available: {e}")

# Chat - KI Chat Assistant
try:
    from app.routers import chat
    app.include_router(chat.router, prefix="/api/chat", tags=["chat", "ai"])
    logger.info("Chat System loaded ✅")
except ImportError as e:
    logger.warning(f"Chat router not available: {e}")

# Objection Brain - Einwand-Coach
try:
    from app.routers import objection_brain
    app.include_router(objection_brain.router, prefix="/api/objection-brain", tags=["objection-brain", "ai"])
    logger.info("Objection Brain loaded 🧠✅")
except ImportError as e:
    logger.warning(f"Objection Brain router not available: {e}")

# Next Best Actions - Task-Priorisierung
try:
    from app.routers import next_best_actions
    app.include_router(next_best_actions.router, prefix="/api/next-best-actions", tags=["next-best-actions", "ai"])
    logger.info("Next Best Actions loaded 🎯✅")
except ImportError as e:
    logger.warning(f"Next Best Actions router not available: {e}")

# KI Intelligence - Advanced KI Features
try:
    from app.routers import ki_intelligence
    app.include_router(ki_intelligence.router, prefix="/api/ki", tags=["ki-intelligence", "ai"])
    logger.info("KI Intelligence loaded 🤖✅")
except ImportError as e:
    logger.warning(f"KI Intelligence router not available: {e}")

# Squad Coach - Team Coaching
try:
    from app.routers import squad_coach
    app.include_router(squad_coach.router, tags=["squad-coaching", "ai"])
    logger.info("Squad Coach loaded 👥✅")
except ImportError as e:
    logger.warning(f"Squad Coach router not available: {e}")

# CHIEF AI Coach - RAG Memory System
try:
    from app.routers import ai
    app.include_router(ai.router, tags=["ai", "chief", "rag"])
    logger.info("CHIEF AI Coach loaded 🤖🧠✅")
except Exception as e:
    logger.warning(f"AI router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# SALES CONTENT ROUTERS
# ═══════════════════════════════════════════════════════════════════════════

# Playbooks - Sales Playbooks
try:
    from app.routers import playbooks
    app.include_router(playbooks.router, tags=["playbooks"])
    logger.info("Playbooks loaded 📚✅")
except ImportError as e:
    logger.warning(f"Playbooks router not available: {e}")

# Templates - Message Templates
try:
    from app.routers import templates
    app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
    logger.info("Templates loaded 📝✅")
except ImportError as e:
    logger.warning(f"Templates router not available: {e}")

# Objections - Einwand-Datenbank
try:
    from app.routers import objections
    app.include_router(objections.router, prefix="/api/objections", tags=["objections"])
    logger.info("Objections DB loaded 💬✅")
except ImportError as e:
    logger.warning(f"Objections router not available: {e}")

# Sequences - Follow-up Sequences
try:
    from app.routers import sequences
    app.include_router(sequences.router, prefix="/api/sequences", tags=["sequences"])
    logger.info("Sequences loaded 🔄✅")
except ImportError as e:
    logger.warning(f"Sequences router not available: {e}")

# Knowledge Base - Company Knowledge
try:
    from app.routers import knowledge_base
    app.include_router(knowledge_base.router, prefix="/api/knowledge-base", tags=["knowledge-base"])
    logger.info("Knowledge Base loaded 📖✅")
except ImportError as e:
    logger.warning(f"Knowledge Base router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# CRM & LEADS ROUTERS
# ═══════════════════════════════════════════════════════════════════════════

# Leads - Lead Management
try:
    from app.routers import leads
    app.include_router(leads.router, tags=["leads", "crm"])
    logger.info("Leads loaded 👤✅")
except ImportError as e:
    logger.warning(f"Leads router not available: {e}")

# Messages - Message Management
try:
    from app.routers import messages
    app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
    logger.info("Messages loaded 💬✅")
except ImportError as e:
    logger.warning(f"Messages router not available: {e}")

# Analytics - Dashboard Analytics
try:
    from app.routers import analytics
    app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
    logger.info("Analytics loaded 📊✅")
except ImportError as e:
    logger.warning(f"Analytics router not available: {e}")

# Speed Hunter - Gamification
try:
    from app.routers import speed_hunter
    app.include_router(speed_hunter.router, prefix="/api/speed-hunter", tags=["gamification"])
    logger.info("Speed Hunter loaded 🏆✅")
except ImportError as e:
    logger.warning(f"Speed Hunter router not available: {e}")

# Notifications
try:
    from app.routers import notifications
    app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
    logger.info("Notifications loaded 🔔✅")
except ImportError as e:
    logger.warning(f"Notifications router not available: {e}")

# Daily Flow - Tägliche Aktivitäten & Planung
try:
    from app.routers import daily_flow
    app.include_router(daily_flow.router, tags=["daily-flow"])
    logger.info("Daily Flow loaded 🎯✅")
except ImportError as e:
    logger.warning(f"Daily Flow router not available: {e}")

# Contact Plans - Chat Import System
try:
    from app.routers import contact_plans
    app.include_router(contact_plans.router, tags=["contact-plans", "chat-import"])
    logger.info("Contact Plans loaded 📋✅")
except ImportError as e:
    logger.warning(f"Contact Plans router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# MOBILE API BRIDGE
# ═══════════════════════════════════════════════════════════════════════════

# Mobile API - React Native App Bridge
try:
    from app.routers import mobile_api
    app.include_router(mobile_api.router, tags=["mobile-api"])
    logger.info("Mobile API Bridge loaded 📱✅")
except ImportError as e:
    logger.warning(f"Mobile API router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# AUTONOMOUS BRAIN & AUTOPILOT
# ═══════════════════════════════════════════════════════════════════════════

# Autonomous Brain - KI-Agent-Steuerung
try:
    from app.routers import autonomous_brain
    app.include_router(autonomous_brain.router, tags=["autonomous-brain"])
    logger.info("Autonomous Brain loaded 🧠✅")
except ImportError as e:
    logger.warning(f"Autonomous Brain router not available: {e}")

# Autopilot - Auto-Reply System
try:
    from app.routers import autopilot
    app.include_router(autopilot.router, tags=["autopilot"])
    logger.info("Autopilot System loaded 🤖✅")
except ImportError as e:
    logger.warning(f"Autopilot router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# CUSTOMER SUCCESS & RETENTION
# ═══════════════════════════════════════════════════════════════════════════

# Customer Retention - Kundenbindung
try:
    from app.routers import retention
    app.include_router(retention.router, tags=["retention", "customer-success"])
    logger.info("Customer Retention loaded 🤝✅")
except ImportError as e:
    logger.warning(f"Retention router not available: {e}")

# Live Assist - Echtzeit-Verkaufsassistenz
try:
    from app.routers import live_assist
    app.include_router(live_assist.router, tags=["live-assist", "coaching"])
    logger.info("Live Assist loaded 💬✅")
except ImportError as e:
    logger.warning(f"Live Assist router not available: {e}")

# ═══════════════════════════════════════════════════════════════════════════
# BILLING & SUBSCRIPTION
# ═══════════════════════════════════════════════════════════════════════════

# Billing - Abonnement-Verwaltung
try:
    from app.routers import billing
    app.include_router(billing.router, tags=["billing", "subscription"])
    logger.info("Billing loaded 💳✅")
except ImportError as e:
    logger.warning(f"Billing router not available: {e}")

logger.info("="*60)
logger.info("🚀 SALES FLOW AI - ALL SYSTEMS ACTIVE 🚀")
logger.info("="*60)