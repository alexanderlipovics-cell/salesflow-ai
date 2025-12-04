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

# --- ADDITIONAL ROUTERS ---

# Playbooks
try:
    from routers.playbooks import router as playbooks_router
    app.include_router(playbooks_router, prefix="/api/playbooks", tags=["Playbooks"])
    logger.info("✅ Playbooks Router loaded")
except ImportError as e:
    logger.warning(f"⚠️ Playbooks Router not available: {e}")

# --- DEMO ENDPOINTS FOR FRONTEND ---

@app.get("/api/leads/needs-action")
async def get_leads_needs_action():
    """Get leads needing immediate action."""
    return {
        "leads": [
            {"id": "1", "name": "Max Mustermann", "status": "hot", "score": 85, "action": "Follow-up heute"},
            {"id": "2", "name": "Anna Schmidt", "status": "warm", "score": 70, "action": "Präsentation vereinbaren"},
            {"id": "3", "name": "Peter Müller", "status": "warm", "score": 65, "action": "Angebot senden"},
        ],
        "count": 3
    }

@app.get("/api/leads/daily-command")
async def get_daily_command():
    """Get daily command tasks."""
    return {
        "leads": [
            {"id": "1", "name": "Max Mustermann", "task": "Follow-up anrufen", "priority": "high"},
            {"id": "2", "name": "Anna Schmidt", "task": "WhatsApp nachfassen", "priority": "medium"},
            {"id": "3", "name": "Lisa Weber", "task": "Email senden", "priority": "low"},
        ],
        "tasks": [
            {"id": "t1", "description": "5 neue Kontakte ansprechen", "done": False},
            {"id": "t2", "description": "10 Follow-ups senden", "done": False},
            {"id": "t3", "description": "2 Präsentationen", "done": False},
        ],
        "count": 3
    }

@app.post("/api/import/customers")
async def import_customers(data: dict):
    """Import customers endpoint."""
    return {
        "success": True,
        "imported": len(data.get("customers", [])),
        "message": "Import erfolgreich"
    }

@app.post("/api/delay/generate")
async def generate_delay(data: dict):
    """Generate follow-up delay."""
    import random
    return {
        "delay_minutes": random.randint(15, 120),
        "delay_text": "ca. 1 Stunde",
        "suggested_message": f"Hey {data.get('lead_name', 'du')}! 👋 Wie sieht's aus?",
        "reasoning": "Optimale Zeit basierend auf Lead-Temperatur",
        "alternatives": [
            "Hi! Wollte nochmal nachhaken...",
            "Hey, kurze Frage noch...",
        ]
    }

@app.post("/api/gtm-copy/generate")
async def generate_gtm_copy(data: dict):
    """Generate GTM copy."""
    return {
        "content": f"""# Demo GTM Copy

**Task:** {data.get('task', 'Landingpage')}

## Hero Section

**Mehr Abschlüsse mit denselben Leads – ohne mehr Chaos, ohne mehr Tools.**

Sales Flow AI ist der KI-Vertriebs-Copilot für dein Team.

→ [Demo anfragen]

---

*💡 Hinweis: Demo-Modus. Für echte KI-Texte OpenAI API Key konfigurieren.*
"""
    }

@app.post("/api/objection-brain/generate")
async def generate_objection_response(data: dict):
    """Generate objection response."""
    objection = data.get("objection", "Das ist zu teuer")
    return {
        "responses": [
            {
                "type": "logical",
                "text": f"Ich verstehe. Wenn wir aber mal rechnen: Bei 3 zusätzlichen Abschlüssen pro Monat durch bessere Follow-ups, wie viel wäre das wert?"
            },
            {
                "type": "emotional", 
                "text": "Das verstehe ich total. Die meisten unserer erfolgreichsten Kunden haben am Anfang genauso gedacht..."
            },
            {
                "type": "question",
                "text": "Was wäre es dir wert, wenn du nie wieder einen heißen Lead vergisst?"
            }
        ],
        "objection": objection,
        "category": "price"
    }

@app.post("/api/objection-brain/log")
async def log_objection(data: dict):
    """Log objection handling."""
    return {"success": True, "logged": True}

@app.post("/api/next-best-actions/suggest")
async def suggest_next_actions(data: dict):
    """Suggest next best actions."""
    return {
        "actions": [
            {"priority": 1, "action": "Follow-up mit Max Mustermann", "type": "call", "reason": "Hot Lead, 3 Tage ohne Kontakt"},
            {"priority": 2, "action": "WhatsApp an Anna Schmidt", "type": "message", "reason": "Interesse gezeigt, nachfassen"},
            {"priority": 3, "action": "Email an Peter Müller", "type": "email", "reason": "Angebot nachfassen"},
        ],
        "summary": "3 dringende Aktionen für heute"
    }

@app.get("/api/analytics/dashboard/complete")
async def get_dashboard_complete(workspace_id: str = None, range: str = "30d"):
    """Get complete dashboard analytics."""
    return {
        "period": range,
        "summary": {
            "total_leads": 1250,
            "active_leads": 380,
            "conversion_rate": 0.28,
            "revenue_this_period": 125000.00
        },
        "pipeline": {
            "new": 125, "contacted": 234, "qualified": 145,
            "proposal": 67, "won": 45, "lost": 23
        }
    }

@app.get("/api/followups/analytics")
async def get_followup_analytics(days: int = 30):
    """Get follow-up analytics."""
    return {
        "period_days": days,
        "total_followups": 567,
        "completed": 456,
        "pending": 89,
        "overdue": 22,
        "completion_rate": 0.80
    }


# --- PHOENIX/PHÖNIX ENDPOINTS ---

@app.get("/api/phoenix/spots")
async def get_phoenix_spots(location: str = None, radius: int = 5000):
    """Get spots near location for Phönix feature."""
    return {
        "spots": [
            {"id": "1", "name": "Café Central", "type": "cafe", "distance": 250, "rating": 4.5},
            {"id": "2", "name": "Starbucks Wien", "type": "cafe", "distance": 400, "rating": 4.0},
            {"id": "3", "name": "WeWork Coworking", "type": "coworking", "distance": 800, "rating": 4.3},
            {"id": "4", "name": "Stadtpark", "type": "park", "distance": 1200, "rating": 4.8},
        ],
        "location": location or "Wien, 3. Bezirk",
        "radius": radius
    }


@app.post("/api/phoenix/spots")
async def save_phoenix_spot(data: dict):
    """Save a favorite spot."""
    return {
        "success": True,
        "spot": {
            "id": "new_spot_1",
            "name": data.get("name", "Neuer Spot"),
            "type": data.get("type", "cafe"),
            "saved": True
        }
    }


@app.get("/api/phoenix/suggestions")
async def get_phoenix_suggestions(location: str = None, time_minutes: int = 30):
    """Get activity suggestions based on available time."""
    return {
        "suggestions": [
            {"activity": "Kaffee trinken und Leads nachfassen", "duration": 20, "type": "productive"},
            {"activity": "LinkedIn-Posts checken", "duration": 15, "type": "networking"},
            {"activity": "Kurzer Spaziergang zur Entspannung", "duration": 10, "type": "wellness"},
        ],
        "available_time": time_minutes
    }


# --- ENTRY POINT ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)