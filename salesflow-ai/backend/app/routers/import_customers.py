"""
Endpoints für den Bestandskunden-Import per CSV-Upload.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.ai_client import AIClient
from app.config import get_settings
from app.import_service import LeadImportError, LeadImportService, parse_import_payload
from app.schemas import ImportSummary
from app.supabase_client import SupabaseNotConfiguredError, get_supabase_client

router = APIRouter(prefix="/import", tags=["import"])
settings = get_settings()


@router.post("/customers", response_model=ImportSummary)
async def import_customers(file: UploadFile = File(...)) -> ImportSummary:
    """
    Nimmt eine CSV-Datei entgegen und importiert Bestandskunden bzw. Leads.
    """

    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Bitte eine CSV-Datei hochladen.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Die CSV-Datei ist leer.")

    try:
        contacts = parse_import_payload(content)
    except LeadImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        supabase = get_supabase_client()
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    ai_client = None
    if settings.openai_api_key:
        ai_client = AIClient(api_key=settings.openai_api_key, model=settings.openai_model)

    service = LeadImportService(supabase=supabase, ai_client=ai_client)

    try:
        summary = await run_in_threadpool(service.run, contacts)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return summary

