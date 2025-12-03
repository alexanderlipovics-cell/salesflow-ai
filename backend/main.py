"""
Sales Flow AI Backend - Main Application
FastAPI backend with Supabase integration
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from supabase import create_client, Client
from pydantic_settings import BaseSettings
from pydantic import Field

# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
class Settings(BaseSettings):
    """Application Settings managed by Pydantic."""
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_key: str = Field(..., alias="SUPABASE_KEY")
    allowed_origins: str = Field("http://localhost:5173", alias="ALLOWED_ORIGINS")
    environment: str = Field("development", alias="ENVIRONMENT")

    class Config:
        env_file = ".env"

# Load settings
settings = Settings()

# --- SUPABASE CLIENT ---
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

# --- DEPENDENCIES ---
def get_supabase() -> Client:
    """Dependency für Supabase Client."""
    return supabase

# --- LIFESPAN EVENTS ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info(f"🚀 Sales Flow AI Backend starting in {settings.environment} mode...")
    try:
        # Test DB connection
        result = supabase.table("leads").select("count", count="exact").limit(1).execute()
        logger.info(f"✅ Supabase connected successfully")
    except Exception as e:
        logger.warning(f"⚠️  Supabase connection issue: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down...")

# --- APP INITIALIZATION ---
docs_url = "/docs" if settings.environment == "development" else None
redoc_url = "/redoc" if settings.environment == "development" else None

app = FastAPI(
    title="Sales Flow AI Backend",
    description="API for Sales Flow AI - Titanium Edition",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
)

# --- CORS SETUP ---
origins = [origin.strip() for origin in settings.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"] if settings.environment == "development" else ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"] if settings.environment == "development" else ["Authorization", "Content-Type"],
)

# --- EXCEPTION HANDLERS ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
        },
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {repr(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"},
    )

# --- BASIC ROUTES ---
@app.get("/")
async def root():
    """Root endpoint - API welcome message."""
    return {
        "message": "Welcome to Sales Flow AI API - Titanium Edition",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs" if settings.environment == "development" else "disabled in production"
    }

@app.get("/api/health")
async def health_check(supabase_client: Client = Depends(get_supabase)):
    """Health check endpoint - verifies API and DB connectivity."""
    db_status = "unknown"
    http_status_code = status.HTTP_200_OK
    
    try:
        # Test query to verify DB connection
        supabase_client.table("leads").select("count", count="exact").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {repr(e)}")
        db_status = "error"
        http_status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status_code,
        content={
            "status": "healthy" if db_status == "connected" else "degraded",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "environment": settings.environment,
            "database": db_status,
            "version": "2.0.0"
        }
    )

# --- API ROUTERS ---
# NEW: AI Prompts & WhatsApp Integration
from app.routers import ai_prompts, whatsapp

app.include_router(ai_prompts.router)
app.include_router(whatsapp.router)

# Advanced Follow-up Templates System
try:
    from app.routers import followup_templates
    app.include_router(followup_templates.router)
    logger.info("✅ Advanced Follow-up Templates Router loaded")
except ImportError as e:
    logger.warning(f"⚠️  Follow-up Templates Router not available: {e}")

# --- API ROUTERS (Commented out for now - enable when needed) ---
# from app.routers import leads, message_templates, playbooks, objections
# 
# app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
# app.include_router(message_templates.router, prefix="/api/message-templates", tags=["Templates"])
# app.include_router(playbooks.router, prefix="/api/playbooks", tags=["Playbooks"])
# app.include_router(objections.router, prefix="/api/objections", tags=["Objections"])

# --- SIMPLE TEST ENDPOINTS ---
@app.get("/api/leads")
async def get_leads(supabase_client: Client = Depends(get_supabase)):
    """Get all leads (simple version without router)."""
    try:
        response = supabase_client.table("leads").select("*").limit(50).execute()
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Error fetching leads: {repr(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/message-templates")
async def get_templates(supabase_client: Client = Depends(get_supabase)):
    """Get all message templates (simple version)."""
    try:
        response = supabase_client.table("message_templates").select("*").execute()
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Error fetching templates: {repr(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/playbooks")
async def get_playbooks(supabase_client: Client = Depends(get_supabase)):
    """Get all playbooks (simple version)."""
    try:
        response = supabase_client.table("playbooks").select("*").execute()
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Error fetching playbooks: {repr(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ENTRY POINT ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)