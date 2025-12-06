from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

# Logging Setup (ohne request_id da das nur mit Middleware funktioniert)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# App erstellen
app = FastAPI(
    title="SalesFlow AI API",
    description="Backend für SalesFlow AI - Network Marketing CRM",
    version="2.0.0"
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

# 3. Rate Limiting Middleware
app.add_middleware(
    RateLimitMiddleware,
    enabled=settings.rate_limit_enabled,
    default_limit=settings.rate_limit_default_requests,
    default_window=settings.rate_limit_default_window_seconds,
    exclude_paths=["/health", "/docs", "/openapi.json", "/redoc"]
)

# 4. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Context Filter für Logging (fügt request_id zu Logs hinzu)
for handler in logging.root.handlers:
    handler.addFilter(RequestContextFilter())

# Router importieren (aus app/routers/)
from .routers.auth import router as auth_router  # JWT Authentication
from .routers.leads import router as leads_router
from .routers.copilot import router as copilot_router
from .routers.chat import router as chat_router
from .routers.autopilot import router as autopilot_router
from .routers.analytics import router as analytics_router
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

# Router registrieren
app.include_router(auth_router, prefix="/api")  # Authentication (public endpoints)
app.include_router(leads_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(autopilot_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
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


# Health check und root sind jetzt am Anfang der Datei definiert
