"""SalesFlow AI - Minimal Server (bypasses broken imports)"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Al Sales Solutions", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://salesflow-system.com",
        "https://www.salesflow-system.com",
        "https://alsales.ai",
        "https://www.alsales.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "running", "app": "Al Sales Solutions"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "database": "pending", "redis": "pending"}


@app.post("/api/stripe/webhooks")
async def stripe_webhooks():
    return {"received": True}


