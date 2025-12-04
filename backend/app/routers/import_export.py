"""
Import/Export API Router
CSV Import with AI Field Mapping, Excel/JSON Export
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional, Dict
import json

from ..core.auth import get_current_user
from ..core.supabase import get_supabase_client
# Note: OpenAI client is optional for import/export
def get_openai_client():
    """Stub for OpenAI client - AI mapping is optional."""
    return None
from ..services.import_export_service import ImportExportService


router = APIRouter(prefix="/api/import-export", tags=["import-export"])


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    mapping: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload and import CSV file with AI-powered field mapping."""
    
    user_id = current_user['id']
    content = await file.read()
    
    # Validate file
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only CSV files are supported")
    
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Maximum size is 10MB")
    
    mapping_dict = json.loads(mapping) if mapping else None
    
    supabase = get_supabase_client()
    openai_client = get_openai_client()
    service = ImportExportService(supabase, openai_client)
    
    job_id = await service.import_csv(
        user_id,
        content,
        file.filename,
        mapping_dict
    )
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Import gestartet. Du wirst benachrichtigt, wenn der Import abgeschlossen ist."
    }


@router.get("/import/jobs")
async def get_import_jobs(
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get user's import jobs."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('import_jobs')\
        .select('*')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(limit)\
        .execute()
    
    return response.data


@router.get("/import/jobs/{job_id}")
async def get_import_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get import job details."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('import_jobs')\
        .select('*')\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(404, "Import job not found")
    
    return response.data[0]


@router.post("/export/leads")
async def export_leads(
    export_format: str = Query('csv', regex='^(csv|excel|json)$'),
    status: Optional[str] = None,
    source: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export leads to CSV, Excel, or JSON."""
    
    user_id = current_user['id']
    
    # Build filters
    filters = {}
    if status:
        filters['status'] = status
    if source:
        filters['source'] = source
    
    supabase = get_supabase_client()
    openai_client = get_openai_client()
    service = ImportExportService(supabase, openai_client)
    
    job_id = await service.export_leads(user_id, export_format, filters)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": f"Export wird erstellt. Du kannst die Datei in wenigen Sekunden herunterladen."
    }


@router.get("/export/jobs")
async def get_export_jobs(
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get user's export jobs."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('export_jobs')\
        .select('*')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(limit)\
        .execute()
    
    return response.data


@router.get("/export/jobs/{job_id}")
async def get_export_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get export job details."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('export_jobs')\
        .select('*')\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(404, "Export job not found")
    
    return response.data[0]


@router.get("/download/{job_id}")
async def download_export(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download exported file."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Verify ownership
    job_response = supabase.table('export_jobs')\
        .select('*')\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    if not job_response.data:
        raise HTTPException(404, "Export not found")
    
    job = job_response.data[0]
    
    if job['status'] != 'completed':
        raise HTTPException(400, "Export not yet completed")
    
    openai_client = get_openai_client()
    service = ImportExportService(supabase, openai_client)
    
    try:
        content, content_type = await service.get_export_file(job_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    
    # Determine filename
    extension = {
        'text/csv': 'csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/json': 'json'
    }.get(content_type, 'dat')
    
    filename = f"salesflow_export_{job_id}.{extension}"
    
    return Response(
        content=content,
        media_type=content_type,
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )


@router.delete("/import/jobs/{job_id}")
async def delete_import_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete import job."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    supabase.table('import_jobs')\
        .delete()\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    return {"status": "deleted"}


@router.delete("/export/jobs/{job_id}")
async def delete_export_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete export job and file."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Get job to delete file
    job_response = supabase.table('export_jobs')\
        .select('file_path')\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    if job_response.data:
        import os
        file_path = job_response.data[0]['file_path']
        if os.path.exists(file_path):
            os.remove(file_path)
    
    supabase.table('export_jobs')\
        .delete()\
        .eq('id', job_id)\
        .eq('user_id', user_id)\
        .execute()
    
    return {"status": "deleted"}

