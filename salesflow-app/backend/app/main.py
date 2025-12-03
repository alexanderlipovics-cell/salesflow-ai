"""
Sales Flow AI - Main FastAPI Application
Entry Point für das Backend.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from app.config import settings
from app.api import api_router


# ===========================================
# LIFESPAN (Startup/Shutdown)
# ===========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle management.
    Runs on startup and shutdown.
    """
    # Startup
    print("=" * 50)
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📍 Debug Mode: {settings.DEBUG}")
    print(f"🗄️ Supabase: {settings.SUPABASE_URL[:50]}...")
    print(f"🧠 AI Model: {settings.OPENAI_MODEL}")
    print(f"💾 Cache: {'Enabled' if settings.CACHE_ENABLED else 'Disabled'}")
    print("=" * 50)
    
    yield  # App runs here
    
    # Shutdown
    print("👋 Shutting down Sales Flow AI...")


# ===========================================
# CREATE APP
# ===========================================

app = FastAPI(
    title=settings.APP_NAME,
    description="""
    ## Sales Flow AI - Backend API
    
    KI-gestütztes CRM für Vertriebsteams.
    
    ### Features
    - 🧠 **CHIEF Coach**: KI Sales Assistant
    - 📋 **Leads Management**: CRUD + Auto-Reminder
    - 📬 **Follow-ups**: Automatische Task-Erstellung
    - 🎯 **Objection Brain**: Einwandbehandlung
    - 📚 **Playbooks**: Sales-Strategien
    
    ### Auth
    Bearer Token via Supabase Auth.
    """,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)


# ===========================================
# MIDDLEWARE
# ===========================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Timing Middleware
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Adds X-Response-Time header to all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Response-Time"] = f"{process_time:.3f}s"
    return response


# ===========================================
# EXCEPTION HANDLERS
# ===========================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "Ein Fehler ist aufgetreten",
            "path": str(request.url)
        }
    )


# ===========================================
# ROUTES
# ===========================================

# Include API routes
app.include_router(api_router, prefix=settings.API_PREFIX)


# Root endpoint
@app.get("/")
async def root():
    """API Root."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": settings.API_PREFIX
    }


# ===========================================
# RUN (for development)
# ===========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

