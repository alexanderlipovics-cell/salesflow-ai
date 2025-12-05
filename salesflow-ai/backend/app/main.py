from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# App erstellen
app = FastAPI(
    title="SalesFlow AI API",
    description="Backend für FELLO Sales Copilot",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "https://aura-os-topaz.vercel.app",  # ✅ Echte Vercel URL
    "http://localhost:5173",
]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router importieren (aus app/routers/)
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

# Router registrieren
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


@app.get("/")
async def root():
    return {"status": "ok", "app": "SalesFlow AI"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
