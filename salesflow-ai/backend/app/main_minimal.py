"""SalesFlow AI - Minimal Server (bypasses broken imports)"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SalesFlow AI", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://salesflow-system.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "running", "app": "SalesFlow AI"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "database": "pending", "redis": "pending"}


@app.post("/api/stripe/webhooks")
async def stripe_webhooks():
    return {"received": True}


