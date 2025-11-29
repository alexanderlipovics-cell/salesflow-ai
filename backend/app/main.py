"""
FastAPI-Einstiegspunkt für Sales Flow AI.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .ai_client import AIClient
from .config import get_settings
from .import_service import LeadImportError, LeadImportService, parse_import_payload
from .prompts import build_system_prompt
from .schemas import (
    ActionRequest,
    ActionResponse,
    DailyCommandItem,
    DailyCommandResponse,
    ImportSummary,
    NeedsActionResponse,
)
from .scenario_service import fetch_scenarios, render_scenarios_as_knowledge
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


@app.get("/scenarios/preview")
async def preview_scenarios(
    vertical: str,
    tags: Optional[str] = None,
    limit: int = 3,
) -> Dict[str, Any]:
    """
    Liefert eine kompakte Vorschau von Vertriebsszenarien und dem daraus
    generierten Knowledge-Text. Gedacht für Tests & Debugging.

    Beispiel:
    GET /scenarios/preview?vertical=art&tags=winstage,preis&limit=3
    """

    tag_list = None
    if tags:
        parsed = [tag.strip() for tag in tags.split(",") if tag.strip()]
        tag_list = parsed or None

    scenarios = fetch_scenarios(vertical=vertical, tags=tag_list, limit=limit)
    knowledge = render_scenarios_as_knowledge(scenarios)

    return {
        "vertical": vertical,
        "requested_limit": limit,
        "count": len(scenarios),
        "tags": tag_list or [],
        "knowledge": knowledge,
    }


@app.get("/leads/daily-command", response_model=DailyCommandResponse)
async def get_daily_command_leads(
    horizon_days: int = 3, limit: int = 20
) -> DailyCommandResponse:
    """Liefert eine priorisierte Liste von Leads, die heute bzw. bald bearbeitet werden sollten."""

    safe_limit = max(1, min(limit, 50))
    safe_horizon = max(0, min(horizon_days, 30))
    today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    horizon_end = today_utc + timedelta(days=safe_horizon)
    """Liefert eine priorisierte Liste von Leads, die heute bzw. in den nächsten Tagen bearbeitet werden sollten."""

    safe_limit = max(1, min(limit, 100))
    safe_horizon_days = max(0, min(horizon_days, 30))
    now_utc = datetime.now(timezone.utc)
    horizon_end = now_utc + timedelta(days=safe_horizon_days)
    horizon_iso = horizon_end.isoformat()

    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    selection = (
        "id,name,company,status,next_action,next_action_at,deal_value,needs_action"
    )

    def fetch_rows(builder: Any) -> list[Dict[str, Any]]:
        try:
            response = builder.execute()
        except Exception as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=502,
                detail="Supabase-Fehler beim Laden der Daily-Command-Leads.",
            ) from exc

        if getattr(response, "error", None):
            raise HTTPException(
                status_code=502,
                detail="Supabase-Fehler beim Laden der Daily-Command-Leads.",
            )
        data = getattr(response, "data", None) or []
        return data

    scheduled_rows = fetch_rows(
        supabase.table("leads")
        .select(selection)
        .filter("next_action_at", "lte", horizon_end.isoformat())
        .order("next_action_at")
        .order("deal_value", desc=True)
        .limit(safe_limit)
    )

    needs_action_rows = fetch_rows(
        supabase.table("leads")
        .select(selection)
        .eq("needs_action", True)
        .order("deal_value", desc=True)
        .limit(safe_limit)
    )

    prioritized_items: list[DailyCommandItem] = []
    seen_ids: set[str | int] = set()
    for row in scheduled_rows + needs_action_rows:
        lead_id = row.get("id")
        if lead_id is None or lead_id in seen_ids:
            continue
        seen_ids.add(lead_id)
        prioritized_items.append(DailyCommandItem(**row))
        if len(prioritized_items) >= safe_limit:
            break

    return DailyCommandResponse(items=prioritized_items)
        "id,name,email,company,status,next_action,"
        "next_action_at,deal_value,needs_action"
    )
    filter_expression = (
        f"and(next_action_at.is.not.null,next_action_at.lte.{horizon_iso}),"
        "needs_action.is.true"
    )
    error_detail = "Supabase-Fehler beim Laden der Daily-Command-Leads."

    try:
        response = (
            supabase.table("leads")
            .select(selection)
            .or_(filter_expression)
            .order("next_action_at", desc=False, nulls_first=False)
            .order("needs_action", desc=True)
            .order("deal_value", desc=True)
            .limit(safe_limit)
            .execute()
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail=error_detail) from exc

    if getattr(response, "error", None):
        raise HTTPException(status_code=502, detail=error_detail)

    leads = getattr(response, "data", None) or []
    items = [DailyCommandItem(**lead) for lead in leads]
    return DailyCommandResponse(items=items)


__all__ = ["app"]
