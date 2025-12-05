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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router importieren (aus app/routers/)
from .routers.leads import router as leads_router
from .routers.copilot import router as copilot_router
from .routers.chat import router as chat_router

# Router registrieren
app.include_router(leads_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "app": "SalesFlow AI"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
