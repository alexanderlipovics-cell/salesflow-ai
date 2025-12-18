"""
Sales Flow AI - Non Plus Ultra Lead Generation API Router

REST Endpoints für das vollständige Lead-Generierungssystem:
- Verification (V-Score)
- Enrichment (E-Score)
- Intent (I-Score)
- Lead Acquisition
- Auto-Assignment
- Auto-Outreach

Version 1.0
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field, EmailStr

from ..supabase_client import get_supabase_client
from ..services.verification_engine import create_verification_engine, VerificationResult
from ..services.enrichment_service import create_enrichment_service, EnrichmentResult
from ..services.intent_engine import create_intent_engine, IntentResult
from ..services.lead_acquisition import (
    create_lead_acquisition_service,
    RawLeadData,
    AcquisitionResult,
    SourceType,
)
from ..services.auto_assignment import (
    create_auto_assignment_service,
    AssignmentResult,
    AssignmentMethod,
)
from ..services.auto_outreach import (
    create_auto_outreach_service,
    OutreachResult,
    OutreachChannel,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lead-generation", tags=["Lead Generation - Non Plus Ultra"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

# --- Verification ---
class VerifyLeadRequest(BaseModel):
    lead_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_domain: Optional[str] = None
    linkedin_url: Optional[str] = None


class VerifyLeadResponse(BaseModel):
    success: bool
    v_score: float
    email_valid: Optional[bool] = None
    phone_valid: Optional[bool] = None
    is_duplicate: bool = False
    details: Dict[str, Any] = {}


# --- Enrichment ---
class EnrichLeadRequest(BaseModel):
    lead_id: str
    email: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    person_name: Optional[str] = None
    linkedin_url: Optional[str] = None


class EnrichLeadResponse(BaseModel):
    success: bool
    e_score: float
    company: Dict[str, Any] = {}
    person: Dict[str, Any] = {}
    icp_match_score: float = 0
    tech_stack: List[Dict] = []


# --- Intent ---
class AnalyzeIntentRequest(BaseModel):
    lead_id: str
    messages: Optional[List[Dict]] = None


class AnalyzeIntentResponse(BaseModel):
    success: bool
    i_score: float
    intent_stage: str
    buying_role: str
    direct_signals: Dict[str, Any] = {}
    activity: Dict[str, Any] = {}


# --- Lead Acquisition ---
class CreateLeadRequest(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_domain: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = "manual"
    source_campaign: Optional[str] = None


class CreateLeadResponse(BaseModel):
    success: bool
    lead_id: Optional[str] = None
    is_duplicate: bool = False
    duplicate_lead_id: Optional[str] = None
    errors: List[str] = []


class WebFormSubmissionRequest(BaseModel):
    form_data: Dict[str, Any]
    form_id: Optional[str] = None
    page_url: Optional[str] = None
    referrer: Optional[str] = None


class FacebookWebhookPayload(BaseModel):
    entry: List[Dict] = []


class LinkedInWebhookPayload(BaseModel):
    formResponse: Optional[Dict] = None


# --- Assignment ---
class AssignLeadRequest(BaseModel):
    lead_id: str
    force_user_id: Optional[str] = None
    method: Optional[str] = "auto"


class AssignLeadResponse(BaseModel):
    success: bool
    lead_id: str
    assigned_to: Optional[str] = None
    assignment_id: Optional[str] = None
    method: str
    score: float = 0
    sla_hours: int = 24
    reasons: List[str] = []
    error: Optional[str] = None


# --- Outreach ---
class CreateOutreachRequest(BaseModel):
    lead_id: str
    channel: str = "email"
    template_id: Optional[str] = None
    send_immediately: bool = False
    custom_message: Optional[str] = None


class CreateOutreachResponse(BaseModel):
    success: bool
    outreach_id: Optional[str] = None
    scheduled_at: Optional[str] = None
    error: Optional[str] = None


# --- Tracking ---
class WebTrackingEventRequest(BaseModel):
    lead_id: Optional[str] = None
    visitor_id: str
    event_type: str
    event_url: str
    session_id: Optional[str] = None
    time_on_page: Optional[int] = None
    scroll_depth: Optional[int] = None
    page_title: Optional[str] = None


class SocialEngagementRequest(BaseModel):
    lead_id: Optional[str] = None
    platform: str
    engagement_type: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    comment_text: Optional[str] = None


# --- Combined Score ---
class CombinedScoreResponse(BaseModel):
    lead_id: str
    p_score: float
    v_score: float
    e_score: float
    i_score: float
    lead_temperature: str
    priority: int
    intent_stage: str


# ============================================================================
# VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/verify", response_model=VerifyLeadResponse, summary="Lead verifizieren")
async def verify_lead(request: VerifyLeadRequest):
    """
    Führt vollständige Lead-Verifizierung durch (V-Score).
    
    Prüft:
    - E-Mail (Syntax, Domain, MX, SMTP, Disposable)
    - Telefon (Format, Typ, Carrier)
    - Domain (Existenz, Alter, SSL)
    - Social Profile (LinkedIn)
    - Duplikate
    """
    try:
        db = get_supabase_client()
        engine = create_verification_engine(db)
        
        result = await engine.verify_lead(
            lead_id=request.lead_id,
            email=request.email,
            phone=request.phone,
            company_domain=request.company_domain,
            linkedin_url=request.linkedin_url,
        )
        
        return VerifyLeadResponse(
            success=True,
            v_score=result.v_score,
            email_valid=result.email.valid,
            phone_valid=result.phone.valid,
            is_duplicate=result.is_duplicate,
            details={
                "email_score": result.email.score,
                "phone_score": result.phone.score,
                "domain_score": result.domain.score,
                "social_score": result.social.score,
                "behavioral_score": result.behavioral.score,
            }
        )
        
    except Exception as e:
        logger.exception(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify/batch", summary="Batch-Verifizierung")
async def verify_leads_batch(
    lead_ids: List[str],
    background_tasks: BackgroundTasks,
):
    """
    Startet Batch-Verifizierung für mehrere Leads im Hintergrund.
    """
    db = get_supabase_client()
    engine = create_verification_engine(db)
    
    # Im Hintergrund ausführen
    background_tasks.add_task(engine.verify_leads_batch, lead_ids)
    
    return {
        "success": True,
        "message": f"Batch verification started for {len(lead_ids)} leads",
        "lead_ids": lead_ids
    }


# ============================================================================
# ENRICHMENT ENDPOINTS
# ============================================================================

@router.post("/enrich", response_model=EnrichLeadResponse, summary="Lead anreichern")
async def enrich_lead(request: EnrichLeadRequest):
    """
    Reichert Lead-Daten an (E-Score).
    
    Fügt hinzu:
    - Firmendaten (Branche, Größe, Umsatz)
    - Kontaktperson (Titel, Seniorität)
    - Tech-Stack
    - ICP Match Score
    """
    try:
        db = get_supabase_client()
        service = create_enrichment_service(db)
        
        result = await service.enrich_lead(
            lead_id=request.lead_id,
            email=request.email,
            company_name=request.company_name,
            company_domain=request.company_domain,
            person_name=request.person_name,
            linkedin_url=request.linkedin_url,
        )
        
        return EnrichLeadResponse(
            success=True,
            e_score=result.e_score,
            company={
                "name": result.company.name,
                "domain": result.company.domain,
                "industry": result.company.industry,
                "size_range": result.company.size_range,
                "country": result.company.country,
            },
            person={
                "title": result.person.title,
                "seniority": result.person.seniority,
                "department": result.person.department,
            },
            icp_match_score=result.icp_match.match_score,
            tech_stack=[
                {"name": t.name, "category": t.category}
                for t in result.tech_stack
            ]
        )
        
    except Exception as e:
        logger.exception(f"Enrichment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INTENT ENDPOINTS
# ============================================================================

@router.post("/intent", response_model=AnalyzeIntentResponse, summary="Intent analysieren")
async def analyze_intent(request: AnalyzeIntentRequest):
    """
    Analysiert Kaufabsicht (I-Score).
    
    Analysiert:
    - Web-Aktivität (Seitenbesuche, High-Intent Pages)
    - Content-Engagement (Downloads, Webinare)
    - Direkte Signale (Demo-Anfragen, Preisfragen)
    - RFM-Analyse
    """
    try:
        db = get_supabase_client()
        engine = create_intent_engine(db)
        
        result = await engine.analyze_lead_intent(
            lead_id=request.lead_id,
            messages=request.messages,
        )
        
        return AnalyzeIntentResponse(
            success=True,
            i_score=result.i_score,
            intent_stage=result.intent_stage,
            buying_role=result.buying_role,
            direct_signals={
                "requested_demo": result.direct_signals.requested_demo,
                "asked_about_pricing": result.direct_signals.asked_about_pricing,
                "mentioned_competitor": result.direct_signals.mentioned_competitor,
                "mentioned_timeline": result.direct_signals.mentioned_timeline,
            },
            activity={
                "website_visits_7d": result.web_activity.visits_7d,
                "pricing_page_visits": result.web_activity.pricing_page_visits,
                "demo_page_visits": result.web_activity.demo_page_visits,
                "last_activity_at": result.last_activity_at.isoformat() if result.last_activity_at else None,
                "activity_frequency": result.activity_frequency,
            }
        )
        
    except Exception as e:
        logger.exception(f"Intent analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intent/message", summary="Nachrichten-Intent analysieren")
async def analyze_message_intent(message: str):
    """
    Analysiert Intent einer einzelnen Nachricht (für Live-Chat).
    """
    try:
        db = get_supabase_client()
        engine = create_intent_engine(db)
        
        result = engine.analyze_message_intent(message)
        return result
        
    except Exception as e:
        logger.exception(f"Message intent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEAD ACQUISITION ENDPOINTS
# ============================================================================

@router.post("/acquire", response_model=CreateLeadResponse, summary="Lead erfassen")
async def create_lead(request: CreateLeadRequest):
    """
    Erfasst einen neuen Lead manuell.
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        result = await service.create_manual_lead(
            data={
                "name": request.name,
                "email": request.email,
                "phone": request.phone,
                "company": request.company,
                "company_domain": request.company_domain,
                "title": request.title,
                "linkedin_url": request.linkedin_url,
                "notes": request.notes,
            },
            tags=request.tags,
        )
        
        return CreateLeadResponse(
            success=result.success,
            lead_id=result.lead_id,
            is_duplicate=result.is_duplicate,
            duplicate_lead_id=result.duplicate_lead_id,
            errors=result.errors,
        )
        
    except Exception as e:
        logger.exception(f"Lead acquisition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/acquire/web-form", response_model=CreateLeadResponse, summary="Web-Formular Lead")
async def handle_web_form(request: WebFormSubmissionRequest):
    """
    Verarbeitet Web-Formular Submission.
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        result = await service.handle_web_form_submission(
            form_data=request.form_data,
            form_id=request.form_id,
            page_url=request.page_url,
            referrer=request.referrer,
        )
        
        return CreateLeadResponse(
            success=result.success,
            lead_id=result.lead_id,
            is_duplicate=result.is_duplicate,
            duplicate_lead_id=result.duplicate_lead_id,
            errors=result.errors,
        )
        
    except Exception as e:
        logger.exception(f"Web form error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/facebook", summary="Facebook Lead Ads Webhook")
async def facebook_webhook(payload: FacebookWebhookPayload):
    """
    Empfängt Facebook Lead Ads Webhooks.
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        result = await service.handle_facebook_lead_webhook(payload.dict())
        
        return {
            "success": result.success,
            "lead_id": result.lead_id,
        }
        
    except Exception as e:
        logger.exception(f"Facebook webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/linkedin", summary="LinkedIn Lead Gen Webhook")
async def linkedin_webhook(payload: LinkedInWebhookPayload):
    """
    Empfängt LinkedIn Lead Gen Form Webhooks.
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        result = await service.handle_linkedin_lead_webhook(payload.dict())
        
        return {
            "success": result.success,
            "lead_id": result.lead_id,
        }
        
    except Exception as e:
        logger.exception(f"LinkedIn webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/csv", summary="CSV Import")
async def import_csv(
    file: UploadFile = File(...),
    skip_duplicates: bool = True,
    default_tags: Optional[str] = None,
    contact_status: Optional[str] = Query(
        default="never_contacted",
        description="Status für importierte Leads: never_contacted, unknown, customer"
    ),
):
    """
    Importiert Leads aus CSV-Datei.
    
    contact_status Optionen:
    - never_contacted: Alle als "Nie kontaktiert" (CHIEF bereitet Nachrichten vor)
    - unknown: Status unbekannt (Nicht in Inbox, nur in Kontakte-Liste)
    - customer: Alle sind Bestandskunden
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        content = await file.read()
        csv_content = content.decode("utf-8")
        
        tags = default_tags.split(",") if default_tags else None
        
        result = await service.import_from_csv(
            csv_content=csv_content,
            skip_duplicates=skip_duplicates,
            default_tags=tags,
            default_contact_status=contact_status,
        )
        
        return {
            "success": True,
            "total_rows": result.total_rows,
            "imported": result.imported,
            "duplicates": result.duplicates,
            "errors": result.errors,
            "error_details": result.error_details[:10],  # Max 10 Fehler anzeigen
        }
        
    except Exception as e:
        logger.exception(f"CSV import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ASSIGNMENT ENDPOINTS
# ============================================================================

@router.post("/assign", response_model=AssignLeadResponse, summary="Lead zuweisen")
async def assign_lead(request: AssignLeadRequest):
    """
    Weist Lead dem optimalen Verkäufer zu.
    """
    try:
        db = get_supabase_client()
        service = create_auto_assignment_service(db)
        
        method = AssignmentMethod(request.method) if request.method else AssignmentMethod.AUTO
        
        result = await service.assign_lead(
            lead_id=request.lead_id,
            force_user_id=request.force_user_id,
            method=method,
        )
        
        return AssignLeadResponse(
            success=result.success,
            lead_id=result.lead_id,
            assigned_to=result.assigned_to,
            assignment_id=result.assignment_id,
            method=result.method,
            score=result.score,
            sla_hours=result.sla_hours,
            reasons=result.reasons,
            error=result.error,
        )
        
    except Exception as e:
        logger.exception(f"Assignment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assign/batch", summary="Batch-Zuweisung")
async def assign_unassigned_leads(
    limit: int = Query(50, description="Max. Anzahl Leads"),
    background_tasks: BackgroundTasks = None,
):
    """
    Weist alle unzugewiesenen Leads zu (Batch).
    """
    db = get_supabase_client()
    service = create_auto_assignment_service(db)
    
    if background_tasks:
        background_tasks.add_task(service.assign_unassigned_leads, limit)
        return {"success": True, "message": f"Batch assignment started for up to {limit} leads"}
    
    result = await service.assign_unassigned_leads(limit)
    return result


@router.get("/sla/breaches", summary="SLA-Verletzungen")
async def get_sla_breaches():
    """
    Holt alle Zuweisungen mit SLA-Verletzung.
    """
    try:
        db = get_supabase_client()
        service = create_auto_assignment_service(db)
        
        breaches = await service.get_sla_breaches()
        
        return {
            "success": True,
            "count": len(breaches),
            "breaches": breaches,
        }
        
    except Exception as e:
        logger.exception(f"SLA check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# OUTREACH ENDPOINTS
# ============================================================================

@router.post("/outreach", response_model=CreateOutreachResponse, summary="Outreach erstellen")
async def create_outreach(request: CreateOutreachRequest):
    """
    Erstellt personalisierte Outreach-Nachricht.
    """
    try:
        db = get_supabase_client()
        service = create_auto_outreach_service(db)
        
        channel = OutreachChannel(request.channel)
        
        result = await service.create_outreach(
            lead_id=request.lead_id,
            channel=channel,
            template_id=request.template_id,
            send_immediately=request.send_immediately,
            custom_message=request.custom_message,
        )
        
        return CreateOutreachResponse(
            success=result.success,
            outreach_id=result.outreach_id,
            scheduled_at=result.scheduled_at.isoformat() if result.scheduled_at else None,
            error=result.error,
        )
        
    except Exception as e:
        logger.exception(f"Outreach error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outreach/process-queue", summary="Outreach-Queue verarbeiten")
async def process_outreach_queue(limit: int = Query(50)):
    """
    Verarbeitet anstehende Outreach-Nachrichten.
    """
    try:
        db = get_supabase_client()
        service = create_auto_outreach_service(db)
        
        result = await service.process_queue(limit)
        return result
        
    except Exception as e:
        logger.exception(f"Queue processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outreach/batch", summary="Batch-Outreach für neue Leads")
async def create_batch_outreach(
    days_back: int = Query(1),
    limit: int = Query(100),
    background_tasks: BackgroundTasks = None,
):
    """
    Erstellt Outreach für neue Leads ohne Erstansprache.
    """
    db = get_supabase_client()
    service = create_auto_outreach_service(db)
    
    if background_tasks:
        background_tasks.add_task(service.create_outreach_for_new_leads, days_back, limit)
        return {"success": True, "message": "Batch outreach started"}
    
    result = await service.create_outreach_for_new_leads(days_back, limit)
    return result


# ============================================================================
# TRACKING ENDPOINTS
# ============================================================================

@router.post("/track/web", summary="Web-Event tracken")
async def track_web_event(request: WebTrackingEventRequest):
    """
    Zeichnet Web-Tracking Event auf (für I-Score).
    """
    try:
        db = get_supabase_client()
        engine = create_intent_engine(db)
        
        await engine.record_web_event(
            lead_id=request.lead_id,
            visitor_id=request.visitor_id,
            event_type=request.event_type,
            event_url=request.event_url,
            event_data={
                "session_id": request.session_id,
                "time_on_page": request.time_on_page,
                "scroll_depth": request.scroll_depth,
                "page_title": request.page_title,
            }
        )
        
        return {"success": True}
        
    except Exception as e:
        logger.exception(f"Tracking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/social", summary="Social-Event tracken")
async def track_social_event(request: SocialEngagementRequest):
    """
    Zeichnet Social Media Engagement auf.
    """
    try:
        db = get_supabase_client()
        engine = create_intent_engine(db)
        
        await engine.record_social_event(
            lead_id=request.lead_id,
            platform=request.platform,
            engagement_type=request.engagement_type,
            event_data={
                "user_id": request.user_id,
                "username": request.username,
                "post_id": request.post_id,
                "post_url": request.post_url,
                "comment_text": request.comment_text,
            }
        )
        
        return {"success": True}
        
    except Exception as e:
        logger.exception(f"Social tracking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# COMBINED OPERATIONS
# ============================================================================

@router.post("/process-lead/{lead_id}", summary="Lead vollständig verarbeiten")
async def process_lead_full(
    lead_id: str,
    verify: bool = True,
    enrich: bool = True,
    analyze_intent: bool = True,
    assign: bool = True,
    create_outreach: bool = True,
):
    """
    Führt vollständige Lead-Verarbeitung durch:
    1. Verifizierung (V-Score)
    2. Anreicherung (E-Score)
    3. Intent-Analyse (I-Score)
    4. Zuweisung
    5. Outreach erstellen
    """
    results = {
        "lead_id": lead_id,
        "verification": None,
        "enrichment": None,
        "intent": None,
        "assignment": None,
        "outreach": None,
    }
    
    try:
        db = get_supabase_client()
        
        # Lead holen
        lead_result = db.table("leads").select("*").eq("id", lead_id).execute()
        if not lead_result.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead = lead_result.data[0]
        
        # 1. Verify
        if verify:
            engine = create_verification_engine(db)
            v_result = await engine.verify_lead(
                lead_id=lead_id,
                email=lead.get("email"),
                phone=lead.get("phone"),
                company_domain=lead.get("company_domain"),
                linkedin_url=lead.get("linkedin_url"),
            )
            results["verification"] = {"v_score": v_result.v_score}
        
        # 2. Enrich
        if enrich:
            service = create_enrichment_service(db)
            e_result = await service.enrich_lead(
                lead_id=lead_id,
                email=lead.get("email"),
                company_name=lead.get("company"),
                company_domain=lead.get("company_domain"),
                person_name=lead.get("name"),
                linkedin_url=lead.get("linkedin_url"),
            )
            results["enrichment"] = {"e_score": e_result.e_score}
        
        # 3. Intent
        if analyze_intent:
            intent_engine = create_intent_engine(db)
            i_result = await intent_engine.analyze_lead_intent(lead_id=lead_id)
            results["intent"] = {
                "i_score": i_result.i_score,
                "stage": i_result.intent_stage,
            }
        
        # 4. Assign
        if assign:
            assignment_service = create_auto_assignment_service(db)
            a_result = await assignment_service.assign_lead(lead_id=lead_id)
            results["assignment"] = {
                "assigned_to": a_result.assigned_to,
                "score": a_result.score,
            }
        
        # 5. Outreach
        if create_outreach:
            outreach_service = create_auto_outreach_service(db)
            o_result = await outreach_service.create_outreach(lead_id=lead_id)
            results["outreach"] = {
                "outreach_id": o_result.outreach_id,
                "scheduled_at": o_result.scheduled_at.isoformat() if o_result.scheduled_at else None,
            }
        
        # Combined P-Score holen
        updated_lead = db.table("leads").select("p_score").eq("id", lead_id).execute()
        if updated_lead.data:
            results["p_score"] = updated_lead.data[0].get("p_score", 0)
        
        return {"success": True, "results": results}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Full process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/score/{lead_id}", response_model=CombinedScoreResponse, summary="Alle Scores holen")
async def get_lead_scores(lead_id: str):
    """
    Holt alle Scores für einen Lead (V, E, I, P).
    """
    try:
        db = get_supabase_client()
        
        # Lead
        lead = db.table("leads").select("p_score").eq("id", lead_id).execute()
        if not lead.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        p_score = lead.data[0].get("p_score", 0) or 0
        
        # V-Score
        v_result = db.table("lead_verifications").select("v_score").eq("lead_id", lead_id).execute()
        v_score = v_result.data[0].get("v_score", 0) if v_result.data else 0
        
        # E-Score
        e_result = db.table("lead_enrichments").select("e_score").eq("lead_id", lead_id).execute()
        e_score = e_result.data[0].get("e_score", 0) if e_result.data else 0
        
        # I-Score
        i_result = db.table("lead_intents").select("i_score, intent_stage").eq("lead_id", lead_id).execute()
        i_score = i_result.data[0].get("i_score", 0) if i_result.data else 0
        intent_stage = i_result.data[0].get("intent_stage", "awareness") if i_result.data else "awareness"
        
        # Lead Temperature
        if p_score >= 80 and v_score >= 70:
            temperature = "hot_verified"
        elif p_score >= 80:
            temperature = "hot"
        elif p_score >= 60:
            temperature = "warm"
        elif p_score >= 40:
            temperature = "cool"
        else:
            temperature = "cold"
        
        # Priority
        if p_score >= 80:
            priority = 5 if intent_stage == "purchase" else 4
        elif p_score >= 60:
            priority = 3
        elif p_score >= 40:
            priority = 2
        else:
            priority = 1
        
        return CombinedScoreResponse(
            lead_id=lead_id,
            p_score=p_score,
            v_score=v_score,
            e_score=e_score,
            i_score=i_score,
            lead_temperature=temperature,
            priority=priority,
            intent_stage=intent_stage,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Score retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STATS & DASHBOARD
# ============================================================================

@router.get("/stats/acquisition", summary="Akquisitions-Statistiken")
async def get_acquisition_stats(days: int = Query(30)):
    """
    Holt Lead-Akquisitions-Statistiken.
    """
    try:
        db = get_supabase_client()
        service = create_lead_acquisition_service(db)
        
        stats = await service.get_acquisition_stats(days)
        return stats
        
    except Exception as e:
        logger.exception(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/pipeline", summary="Pipeline-Übersicht")
async def get_pipeline_stats():
    """
    Holt Pipeline-Statistiken nach Score-Kategorien.
    """
    try:
        db = get_supabase_client()
        
        # Leads nach P-Score Kategorie
        leads = db.table("leads").select("p_score, status").execute()
        
        stats = {
            "total": len(leads.data or []),
            "hot": 0,
            "warm": 0,
            "cool": 0,
            "cold": 0,
            "by_status": {},
        }
        
        for lead in (leads.data or []):
            p_score = lead.get("p_score") or 0
            status = lead.get("status", "NEW")
            
            if p_score >= 80:
                stats["hot"] += 1
            elif p_score >= 60:
                stats["warm"] += 1
            elif p_score >= 40:
                stats["cool"] += 1
            else:
                stats["cold"] += 1
            
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        
        return stats
        
    except Exception as e:
        logger.exception(f"Pipeline stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

