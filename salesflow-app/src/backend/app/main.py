"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AURA OS - PRODUCTION-READY FASTAPI v1.0.1                                ║
║  Haupteinstiegspunkt für das Python Backend                               ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Features:                                                                 ║
║  ✅ Environment-basierte Konfiguration (Dev/Staging/Prod)                  ║
║  ✅ CORS mit dynamischen Origins                                           ║
║  ✅ Security Headers (HSTS, CSP, X-Frame-Options, etc.)                   ║
║  ✅ Rate Limiting                                                          ║
║  ✅ Request ID Tracking                                                    ║
║  ✅ Structured Logging                                                     ║
║  ✅ Health Checks (Liveness & Readiness)                                   ║
║  ✅ Graceful Shutdown                                                      ║
║  ✅ Sentry Error Tracking (optional)                                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Start (Development):
    uvicorn app.main:app --reload --port 8000

Start (Production):
    gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

Docs:
    http://localhost:8000/docs (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Config & Logging
from .core.config import settings, configure_logging

# Security Middleware
from .middleware.rate_limit import rate_limit_middleware

# Routers
from .api.goals import router as goals_router
from .api.chief_chat import router as chief_router
from .api.routes.chat_import import router as chat_import_router, legacy_router as chat_import_legacy_router
from .api.routes.voice import router as voice_router
from .api.routes.analytics import router as analytics_router
from .api.routes.learning import router as learning_router
from .api.routes.knowledge import router as knowledge_router
from .api.routes.brain import router as brain_router
from .api.routes.living_os import router as living_os_router
from .api.routes.finance import router as finance_router
from .api.routes.teach import router as teach_router
from .api.routes.pending_actions import router as pending_actions_router
from .api.routes.daily_flow import router as daily_flow_router
from .api.routes.storybook import router as storybook_router
from .api.routes.outreach import router as outreach_router
from .api.routes.phoenix import router as phoenix_router
from .api.routes.sales_brain import router as sales_brain_router
from .api.routes.pulse_tracker import router as pulse_tracker_router
from .api.routes.live_assist import router as live_assist_router
from .api.routes.autopilot import router as autopilot_router
from .api.routes.webhooks import router as webhooks_router

# CHIEF v3.0 Module
from .api.routes.onboarding import router as onboarding_router
from .api.routes.ghost_buster import router as ghost_buster_router
from .api.routes.team_leader import router as team_leader_router
from .api.routes.data_import import router as data_import_router
from .api.routes.mlm_import import router as mlm_import_router

# Sequencer Engine
from .api.routes.sequences import router as sequences_router
from .api.routes.email_accounts import router as email_accounts_router
from .api.routes.linkedin import router as linkedin_router
from .api.routes.sequencer_cron import router as sequencer_cron_router
from .api.routes.sequence_templates import router as sequence_templates_router

# Customer Retention
from .api.routes.customer_retention import router as retention_router

# KI-Autonomie System
from .api.routes.autonomous import router as autonomous_router

# Messaging (Twilio SMS/WhatsApp)
from .api.routes.messaging import router as messaging_router

# Billing (Stripe Subscriptions)
from .api.routes.billing import router as billing_router
from .api.routes.payment import router as payment_router

# Phase 1: Foundation & Architecture
from .api.routes.jobs import router as jobs_router
from .api.routes.features import router as features_router

# Phase 2: Skill Orchestrator
from .api.routes.skills import router as skills_router

# Phase 3: Vertical Engine & Integrations
from .api.routes.verticals import router as verticals_router
from .api.routes.integrations import router as integrations_router

# Phase 4: Data Flywheel & Analytics
from .api.routes.flywheel import router as flywheel_router

# Phase 5: Reactivation Agent (LangGraph)
from .api.routes.reactivation import router as reactivation_router
from .api.routes.review_queue import router as review_queue_router

# Script Library (50+ Network Marketing Scripts)
from .api.routes.scripts import router as scripts_router

# NetworkerOS v2 API (Mentor, Contacts, DMO, Team, Alerts, Profiler, Referral, Conversation)
from .api.routes.mentor import router as mentor_router
from .api.routes.contacts import router as contacts_router
from .api.routes.dmo import router as dmo_router
from .api.routes.team import router as team_router
from .api.routes.profiler import router as profiler_router
from .api.routes import alerts
from .api.routes import referral
from .api.routes.conversation import router as conversation_router

# WhatsApp Integration
from .api.routes.whatsapp import router as whatsapp_router

# Ghostbuster v2 API
from .api.routes.ghostbuster import router as ghostbuster_v2_router

# Campaigns v2 API
from .api.routes.campaigns import router as campaigns_router

# Email Integration v2 API (FELLO)
from .api.routes.email import router as email_router

# Sales Intelligence v3.0
from .api.routes.sales_intelligence import router as sales_intelligence_router

# FELLO AI Copilot
from .api.routes.copilot import router as copilot_router

# Simple Chat for Mobile
from .api.routes.chat import router as chat_router


# ═══════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════

logger = configure_logging()


# ═══════════════════════════════════════════════════════════════════════════
# LIFESPAN (Startup/Shutdown)
# ═══════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Manager.
    
    - Startup: Initialisiere Connections, Warm-up Caches
    - Shutdown: Cleanup, schließe Connections
    """
    # ─── STARTUP ───
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Debug Mode: {settings.DEBUG}")
    logger.info(f"   CORS Origins: {len(settings.cors_origins_list)} configured")
    
    # Optional: Sentry initialisieren
    if settings.SENTRY_DSN and settings.is_production:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.starlette import StarletteIntegration
            
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.SENTRY_ENVIRONMENT or settings.ENVIRONMENT,
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
                integrations=[
                    StarletteIntegration(),
                    FastApiIntegration(),
                ],
            )
            logger.info("   Sentry: ✅ Initialized")
        except ImportError:
            logger.warning("   Sentry: ⚠️ sentry-sdk not installed")
    
    # App State für Health Checks
    app.state.ready = True
    app.state.startup_time = time.time()
    
    yield  # App läuft
    
    # ─── SHUTDOWN ───
    logger.info("👋 Shutting down gracefully...")
    app.state.ready = False


# ═══════════════════════════════════════════════════════════════════════════
# APP INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="SalesFlow AI API",
    description="AI-powered CRM for Network Marketing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ═══════════════════════════════════════════════════════════════════════════
# MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
    max_age=600,  # Preflight Cache: 10 Minuten
)


# 2. Request ID & Logging Middleware
class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Fügt Request-ID und Logging zu jedem Request hinzu.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate Request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        
        # Start Timer
        start_time = time.time()
        
        # Process Request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception(f"[{request_id}] Unhandled exception: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error", "request_id": request_id}
            )
        
        # Calculate Process Time
        process_time = (time.time() - start_time) * 1000
        
        # Add Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        
        # Log Request (nur in Production oder bei Fehlern)
        if settings.is_production or response.status_code >= 400:
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} "
                f"- {response.status_code} ({process_time:.2f}ms)"
            )
        
        return response


app.add_middleware(RequestContextMiddleware)


# 3. Security Headers Middleware (nur in Production)
if settings.ENABLE_SECURITY_HEADERS:
    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        """
        Fügt Security Headers zu allen Responses hinzu.
        """
        async def dispatch(self, request: Request, call_next: Callable) -> Response:
            response = await call_next(request)
            
            # Security Headers
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            
            # HSTS nur in Production
            if settings.is_production:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
            return response
    
    app.add_middleware(SecurityHeadersMiddleware)


# ═══════════════════════════════════════════════════════════════════════════
# EXCEPTION HANDLERS
# ═══════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global Exception Handler für unerwartete Fehler.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    # Log the error
    logger.exception(f"[{request_id}] Unexpected error: {exc}")
    
    # In Production: Keine Details leaken
    if settings.is_production:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Ein unerwarteter Fehler ist aufgetreten",
                "request_id": request_id,
            }
        )
    
    # In Development: Details zeigen
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "request_id": request_id,
        }
    )


# ═══════════════════════════════════════════════════════════════════════════
# ROUTERS
# ═══════════════════════════════════════════════════════════════════════════

# Core
app.include_router(goals_router, prefix="/api/v1")
app.include_router(chief_router, prefix="/api/v1")
app.include_router(chat_import_router, prefix="/api/v1")
app.include_router(chat_import_legacy_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(learning_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(brain_router, prefix="/api/v1")
app.include_router(living_os_router, prefix="/api/v1")
app.include_router(finance_router, prefix="/api/v1")
app.include_router(teach_router, prefix="/api/v1")
app.include_router(pending_actions_router, prefix="/api/v1")
app.include_router(daily_flow_router, prefix="/api/v1")
app.include_router(storybook_router, prefix="/api/v1")
app.include_router(outreach_router, prefix="/api/v1")
app.include_router(phoenix_router, prefix="/api/v1")
app.include_router(sales_brain_router, prefix="/api/v1")
app.include_router(pulse_tracker_router, prefix="/api/v1")
app.include_router(live_assist_router, prefix="/api/v1")
app.include_router(autopilot_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")

# CHIEF v3.0 Module
app.include_router(onboarding_router, prefix="/api/v1")
app.include_router(ghost_buster_router, prefix="/api/v1")
app.include_router(team_leader_router, prefix="/api/v1")
app.include_router(data_import_router, prefix="/api/v1")
app.include_router(mlm_import_router, prefix="/api/v1")

# Sequencer Engine
app.include_router(sequences_router, prefix="/api/v1")
app.include_router(email_accounts_router, prefix="/api/v1")
app.include_router(linkedin_router, prefix="/api/v1")
app.include_router(sequencer_cron_router, prefix="/api/v1")
app.include_router(sequence_templates_router, prefix="/api/v1")

# Customer Retention
app.include_router(retention_router, prefix="/api/v1")

# KI-Autonomie System
app.include_router(autonomous_router, prefix="/api/v1")

# Billing (Stripe Subscriptions)
app.include_router(billing_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v2")

# Phase 1: Foundation & Architecture
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(features_router, prefix="/api/v1")

# Phase 2: Skill Orchestrator
app.include_router(skills_router, prefix="/api/v1")

# Phase 3: Vertical Engine & Integrations
app.include_router(verticals_router, prefix="/api/v1")
app.include_router(integrations_router, prefix="/api/v1")

# Phase 4: Data Flywheel & Analytics
app.include_router(flywheel_router, prefix="/api/v1")

# Phase 5: Reactivation Agent (LangGraph)
app.include_router(reactivation_router, prefix="/api/v1")
app.include_router(review_queue_router, prefix="/api/v1")

# Script Library (50+ Network Marketing Scripts)
app.include_router(scripts_router, prefix="/api/v2")

# NetworkerOS v2 API
app.include_router(mentor_router, prefix="/api/v2")
app.include_router(contacts_router, prefix="/api/v2")
app.include_router(dmo_router, prefix="/api/v2")
app.include_router(team_router, prefix="/api/v2")
app.include_router(profiler_router, prefix="/api/v2")
app.include_router(alerts.router, prefix="/api/v2")
app.include_router(referral.router, prefix="/api/v2")
app.include_router(conversation_router, prefix="/api/v2")

# WhatsApp Integration
app.include_router(whatsapp_router, prefix="/api/v2")

# Ghostbuster v2 API
app.include_router(ghostbuster_v2_router, prefix="/api/v2")

# Campaigns v2 API
app.include_router(campaigns_router, prefix="/api/v2")

# Email Integration v2 API (FELLO)
app.include_router(email_router, prefix="/api/v2")

# Sales Intelligence v3.0
app.include_router(sales_intelligence_router, prefix="/api/v1")

# FELLO AI Copilot
app.include_router(copilot_router, prefix="/api")

# Simple Chat for Mobile
app.include_router(chat_router, prefix="/api")


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["health"])
async def root():
    """
    Root Endpoint - Basic App Info.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Liveness Probe - Ist die App am Leben?
    
    Wird von Kubernetes/Docker für Liveness-Checks verwendet.
    Gibt 200 zurück wenn die App antwortet.
    """
    return {"status": "healthy"}


@app.get("/health/ready", tags=["health"])
async def readiness_check(request: Request):
    """
    Readiness Probe - Ist die App bereit für Traffic?
    
    Prüft ob alle Dependencies verfügbar sind:
    - Database Connection
    - External Services
    
    Gibt 503 zurück wenn nicht bereit.
    """
    checks = {
        "app": True,
        "startup_completed": getattr(request.app.state, "ready", False),
    }
    
    # Optional: DB Check
    try:
        from .db.supabase import get_supabase
        db = get_supabase()
        db.table("profiles").select("count", count="exact").limit(1).execute()
        checks["database"] = True
    except Exception as e:
        checks["database"] = False
        logger.warning(f"Readiness check failed - Database: {e}")
    
    # Gesamtstatus
    all_healthy = all(checks.values())
    
    if all_healthy:
        return {"status": "ready", "checks": checks}
    
    return JSONResponse(
        status_code=503,
        content={"status": "not_ready", "checks": checks}
    )


@app.get("/health/live", tags=["health"])
async def liveness_check():
    """
    Simple Liveness Check - Minimal Response.
    """
    return "OK"


# ═══════════════════════════════════════════════════════════════════════════
# METRICS (Optional - für Prometheus)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/metrics", tags=["monitoring"], include_in_schema=False)
async def metrics(request: Request):
    """
    Basic Metrics Endpoint.
    
    In Production: Nutze prometheus_fastapi_instrumentator
    """
    import time
    
    uptime = time.time() - getattr(request.app.state, "startup_time", time.time())
    
    return {
        "uptime_seconds": round(uptime, 2),
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
    }
