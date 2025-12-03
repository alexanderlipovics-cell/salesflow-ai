"""
═══════════════════════════════════════════════════════════════════════════
GDPR COMPLIANCE API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════
RESTful API für DSGVO-Compliance (Art. 15, 17, 20)
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from typing import Optional
from pydantic import BaseModel
from app.services.gdpr_service import GDPRService
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/gdpr", tags=["GDPR Compliance"])


# ─────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    user_id: str
    lead_id: Optional[str] = None
    export_format: str = "json"
    include_attachments: bool = True


class DeletionRequest(BaseModel):
    lead_id: str
    user_id: str
    reason: str
    legal_basis: str = "art_17_dsgvo"


class ConsentGrant(BaseModel):
    user_id: str
    consent_type: str
    consent_text: str
    consent_version: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.post("/export-request")
async def request_data_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """
    DSGVO Art. 20 - Recht auf Datenportabilität.
    
    Erstellt eine Anfrage für vollständigen Datenexport.
    Der Export wird asynchron generiert.
    
    **Body:**
    - user_id: User der den Export anfordert
    - lead_id: Optional - spezifischer Lead, sonst alle Daten
    - export_format: json, csv, pdf (default: json)
    - include_attachments: Dateien einschließen (default: true)
    
    **Returns:**
    - request_id: Zum Tracking des Exports
    - status: processing
    """
    service = GDPRService()
    
    request_id = await service.create_export_request(
        user_id=request.user_id,
        lead_id=request.lead_id,
        export_format=request.export_format,
        include_attachments=request.include_attachments
    )
    
    # Schedule background generation
    background_tasks.add_task(
        service.generate_export,
        request_id
    )
    
    return {
        "request_id": request_id,
        "status": "processing",
        "message": "Export wird generiert. Du wirst benachrichtigt wenn er fertig ist."
    }


@router.get("/export-request/{request_id}")
async def get_export_status(request_id: str):
    """
    Prüft Status einer Export-Anfrage.
    
    **Path Parameters:**
    - request_id: UUID der Export-Anfrage
    
    **Returns:**
    - status: pending, processing, completed, failed
    - download_url: Falls completed
    """
    supabase = get_supabase_client()
    
    result = supabase.table('data_export_requests').select('*').eq(
        'id', request_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Export-Anfrage nicht gefunden")
    
    export_data = result.data[0]
    
    response = {
        "request_id": request_id,
        "status": export_data['status'],
        "requested_at": export_data['requested_at'],
        "export_format": export_data['export_format']
    }
    
    if export_data['status'] == 'completed':
        response['download_url'] = export_data.get('download_url')
        response['expires_at'] = export_data.get('expires_at')
        response['file_size_bytes'] = export_data.get('file_size_bytes')
    elif export_data['status'] == 'failed':
        response['error_message'] = export_data.get('error_message')
    
    return response


@router.get("/export-request/{request_id}/download")
async def download_export(request_id: str):
    """
    Download des generierten Data Exports.
    
    **Path Parameters:**
    - request_id: UUID der Export-Anfrage
    
    **Returns:**
    - download_url: Temporärer Download-Link
    """
    service = GDPRService()
    
    try:
        download_url = await service.get_download_url(request_id)
        
        return {
            "download_url": download_url,
            "message": "Link ist 7 Tage gültig"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/deletion-request")
async def request_data_deletion(request: DeletionRequest):
    """
    DSGVO Art. 17 - Recht auf Vergessenwerden.
    
    Erstellt eine Anfrage zur Datenlöschung.
    Muss von Admin genehmigt werden.
    
    **Body:**
    - lead_id: UUID des zu löschenden Leads
    - user_id: User der die Löschung beantragt
    - reason: Grund für Löschung
    - legal_basis: Rechtliche Grundlage (default: art_17_dsgvo)
    
    **Returns:**
    - request_id: Zum Tracking der Anfrage
    - status: pending_approval
    """
    service = GDPRService()
    
    request_id = await service.create_deletion_request(
        lead_id=request.lead_id,
        user_id=request.user_id,
        reason=request.reason,
        legal_basis=request.legal_basis
    )
    
    return {
        "request_id": request_id,
        "status": "pending_approval",
        "message": "Löschanfrage wurde erstellt und wartet auf Admin-Genehmigung"
    }


@router.get("/deletion-request/{request_id}")
async def get_deletion_status(request_id: str):
    """
    Prüft Status einer Lösch-Anfrage.
    """
    supabase = get_supabase_client()
    
    result = supabase.table('data_deletion_requests').select('*').eq(
        'id', request_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Löschanfrage nicht gefunden")
    
    return result.data[0]


@router.post("/deletion-request/{request_id}/process")
async def process_deletion(
    request_id: str,
    approved: bool,
    admin_id: str,
    rejection_reason: Optional[str] = None,
    deletion_method: str = "anonymize"
):
    """
    Verarbeitet Lösch-Anfrage (Admin only).
    
    **Path Parameters:**
    - request_id: UUID der Löschanfrage
    
    **Body:**
    - approved: Genehmigt oder abgelehnt
    - admin_id: UUID des genehmigenden Admins
    - rejection_reason: Falls abgelehnt - Grund
    - deletion_method: anonymize oder hard_delete (default: anonymize)
    
    **Returns:**
    - status: completed oder rejected
    """
    service = GDPRService()
    
    if approved:
        result = await service.execute_deletion(
            request_id=request_id,
            admin_id=admin_id,
            deletion_method=deletion_method
        )
        return result
    else:
        if not rejection_reason:
            raise HTTPException(
                status_code=400,
                detail="Ablehnungsgrund erforderlich"
            )
        
        result = await service.reject_deletion(
            request_id=request_id,
            admin_id=admin_id,
            reason=rejection_reason
        )
        return result


@router.get("/consents/{user_id}")
async def get_user_consents(user_id: str):
    """
    Listet alle Einwilligungen eines Users.
    
    **Path Parameters:**
    - user_id: UUID des Users
    """
    supabase = get_supabase_client()
    
    result = supabase.table('user_consents').select('*').eq(
        'user_id', user_id
    ).eq('is_active', True).execute()
    
    return {
        "user_id": user_id,
        "consents": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/consents/{user_id}/check")
async def check_consent(
    user_id: str,
    consent_type: str
):
    """
    Prüft ob spezifische Einwilligung vorliegt.
    
    **Path Parameters:**
    - user_id: UUID des Users
    
    **Query Parameters:**
    - consent_type: Typ der Einwilligung (data_processing, marketing, etc.)
    
    **Returns:**
    - has_consent: boolean
    """
    service = GDPRService()
    
    has_consent = await service.check_consent(
        user_id=user_id,
        consent_type=consent_type
    )
    
    return {
        "user_id": user_id,
        "consent_type": consent_type,
        "has_consent": has_consent
    }


@router.post("/consents/grant")
async def grant_consent(consent: ConsentGrant):
    """
    Erteilt eine Einwilligung.
    
    **Body:**
    - user_id: UUID des Users
    - consent_type: Typ der Einwilligung
    - consent_text: Volltext der Einwilligung
    - consent_version: Version der Datenschutzerklärung
    - ip_address: Optional - IP für Nachweis
    - user_agent: Optional - Browser für Nachweis
    """
    service = GDPRService()
    
    consent_id = await service.grant_consent(
        user_id=consent.user_id,
        consent_type=consent.consent_type,
        consent_text=consent.consent_text,
        consent_version=consent.consent_version,
        ip_address=consent.ip_address,
        user_agent=consent.user_agent
    )
    
    return {
        "status": "granted",
        "consent_id": consent_id,
        "consent_type": consent.consent_type
    }


@router.post("/consents/{user_id}/revoke")
async def revoke_consent(
    user_id: str,
    consent_type: str
):
    """
    Widerruft eine Einwilligung.
    
    **Path Parameters:**
    - user_id: UUID des Users
    
    **Body:**
    - consent_type: Typ der Einwilligung
    """
    service = GDPRService()
    
    success = await service.revoke_consent(
        user_id=user_id,
        consent_type=consent_type
    )
    
    return {
        "status": "revoked",
        "user_id": user_id,
        "consent_type": consent_type
    }


@router.get("/privacy-report/{user_id}")
async def generate_privacy_report(user_id: str):
    """
    DSGVO Art. 15 - Auskunftsrecht.
    
    Generiert umfassenden Privacy-Report für User.
    
    **Path Parameters:**
    - user_id: UUID des Users
    
    **Returns:**
    - Vollständiger Privacy-Report mit allen Daten-Zugriffen
    """
    service = GDPRService()
    
    report = await service.generate_privacy_report(user_id=user_id)
    
    return report


@router.get("/retention-check")
async def check_retention_expiry():
    """
    Prüft welche Daten gemäß Retention Policy gelöscht werden sollten.
    
    **Returns:**
    - Liste von Leads die Retention-Limit überschreiten
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('check_retention_expiry').execute()
    
    return {
        "expiring_leads": result.data or [],
        "count": len(result.data) if result.data else 0
    }

