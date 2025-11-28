"""
FastAPI-Einstiegspunkt für Sales Flow AI.
"""

from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

from .ai_client import AIClient
from .config import get_settings
from .import_service import LeadImportError, LeadImportService, parse_import_payload
from .prompts import build_system_prompt
from .schemas import (
    ActionRequest,
    ActionResponse,
    ImportSummary,
    NeedsActionResponse,
)
from .supabase_client import SupabaseNotConfiguredError, get_supabase_client

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Sales Flow AI – KI-gestütztes Vertriebs-CRM.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Einfacher Health-Check."""

    return {"status": "ok"}


@app.post("/ai", response_model=ActionResponse)
async def handle_ai(request: ActionRequest) -> ActionResponse:
    """
    Zentraler Endpoint, der Actions wie chat, generate_message etc. verarbeitet.
    """

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500, detail="OPENAI_API_KEY ist nicht gesetzt."
        )

    client = AIClient(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
    )

    try:
        system_prompt = build_system_prompt(request.action, request.data)
        reply = client.generate(system_prompt, request.data.messages)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=502,
            detail=f"KI-Provider-Fehler: {exc}",
        ) from exc

    return ActionResponse(action=request.action, reply=reply)


@app.post("/import/leads", response_model=ImportSummary)
async def import_leads(request: Request) -> ImportSummary:
    """CSV- oder JSON-Import für Bestandskunden."""

    raw_body = await request.body()
    if not raw_body:
        raise HTTPException(status_code=400, detail="Der Request-Body darf nicht leer sein.")

    content_type = request.headers.get("content-type", "")
    payload: object

    if "application/json" in content_type:
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Ungültiges JSON.") from exc
    else:
        payload = raw_body.decode("utf-8", errors="ignore")

    try:
        contacts = parse_import_payload(payload)
    except LeadImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    ai_client = None
    if settings.openai_api_key:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )

    service = LeadImportService(supabase=supabase, ai_client=ai_client)

    try:
        summary = await run_in_threadpool(service.run, contacts)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return summary


@app.get("/leads/needs-action", response_model=NeedsActionResponse)
async def get_needs_action_leads(limit: int = 8) -> NeedsActionResponse:
    """Liefert eine kompakte Liste aller Leads ohne Status."""

    safe_limit = max(1, min(limit, 20))
    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    response = (
        supabase.table("leads")
        .select("id,name,email,company,last_contact")
        .eq("needs_action", True)
        .limit(safe_limit)
        .execute()
    )

    if getattr(response, "error", None):
        raise HTTPException(
            status_code=502, detail="Supabase-Fehler beim Laden der Leads."
        )

    leads = getattr(response, "data", None) or []
    return NeedsActionResponse(leads=leads)


__all__ = ["app"]
