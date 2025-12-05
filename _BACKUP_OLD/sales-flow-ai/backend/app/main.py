"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - FastAPI Backend                                           ║
║  KI-gestützter Vertriebs-Copilot für MLM, Immobilien & Finance            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.api.routes import goals, compensation, health
from app.config.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 Starting Sales Flow AI Backend...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    yield
    logger.info("👋 Shutting down Sales Flow AI Backend...")


app = FastAPI(
    title="Sales Flow AI",
    description="KI-gestützter Vertriebs-Copilot für MLM, Immobilien & Finance",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, tags=["Health"])
app.include_router(goals.router, prefix="/api/v1/goals", tags=["Goals"])
app.include_router(compensation.router, prefix="/api/v1/compensation", tags=["Compensation"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Sales Flow AI",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
    )

