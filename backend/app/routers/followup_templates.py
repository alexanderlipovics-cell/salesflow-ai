"""
Follow-up Templates API Endpoints
Advanced Multi-Field Templates with GPT Auto-Complete
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging

from app.services.template_service import template_service
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/followup-templates", tags=["Follow-up Templates"])


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class CreateTemplateRequest(BaseModel):
    """Request model for creating a template"""
    name: str
    trigger_key: str
    channel: str  # 'whatsapp', 'email', 'in_app'
    body_template: str
    subject_template: Optional[str] = None
    short_template: Optional[str] = None
    reminder_template: Optional[str] = None
    fallback_template: Optional[str] = None
    gpt_autocomplete_prompt: Optional[str] = None
    preview_context: Optional[Dict] = None
    category: Optional[str] = None


class UpdateTemplateRequest(BaseModel):
    """Request model for updating a template"""
    updates: Dict


class RenderTemplateRequest(BaseModel):
    """Request model for rendering a template with context"""
    template_id: str
    context: Dict


class AutoCompleteRequest(BaseModel):
    """Request model for GPT autocomplete"""
    template_id: str
    lead_context: Optional[Dict] = None


class ImportTemplatesRequest(BaseModel):
    """Request model for importing templates"""
    templates_json: str


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS - TEMPLATE CRUD
# ═══════════════════════════════════════════════════════════════

@router.get("/list")
async def list_templates(
    channel: Optional[str] = Query(None, description="Filter by channel"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: bool = Query(True, description="Filter active/inactive templates"),
    current_user = Depends(get_current_user)
):
    """
    Get all templates with optional filters
    
    - **channel**: Filter by channel (whatsapp, email, in_app)
    - **category**: Filter by category (objection, nurture, reminder, etc.)
    - **is_active**: Show only active templates
    """
    
    try:
        templates = await template_service.get_all_templates(
            channel=channel,
            category=category,
            is_active=is_active
        )
        
        return {
            "success": True,
            "count": len(templates),
            "templates": templates
        }
        
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get single template by ID
    """
    
    try:
        template = await template_service.get_template_by_id(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "template": template
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_template(
    request: CreateTemplateRequest,
    current_user = Depends(get_current_user)
):
    """
    Create new follow-up template
    
    - **name**: Template name
    - **trigger_key**: Unique trigger identifier (e.g. 'inactivity_14d')
    - **channel**: Channel type (whatsapp, email, in_app)
    - **body_template**: Main message body with {{placeholders}}
    - **subject_template**: Email subject (optional, only for email channel)
    - **short_template**: Short preview text (optional, for whatsapp/in_app)
    - **reminder_template**: Follow-up reminder after 2 days (optional)
    - **fallback_template**: Final follow-up after 5 days (optional)
    - **gpt_autocomplete_prompt**: Prompt for GPT to generate reminder/fallback (optional)
    - **preview_context**: Example data for preview (optional)
    - **category**: Template category (optional)
    """
    
    try:
        template_id = await template_service.create_template(
            name=request.name,
            trigger_key=request.trigger_key,
            channel=request.channel,
            body_template=request.body_template,
            subject_template=request.subject_template,
            short_template=request.short_template,
            reminder_template=request.reminder_template,
            fallback_template=request.fallback_template,
            gpt_autocomplete_prompt=request.gpt_autocomplete_prompt,
            preview_context=request.preview_context,
            category=request.category,
            user_id=str(current_user.get('id'))
        )
        
        if not template_id:
            raise HTTPException(status_code=500, detail="Failed to create template")
        
        return {
            "success": True,
            "template_id": template_id,
            "message": "Template created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}")
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    current_user = Depends(get_current_user)
):
    """
    Update existing template
    
    Send only the fields you want to update in the `updates` dict.
    """
    
    try:
        success = await template_service.update_template(
            template_id=template_id,
            updates=request.updates
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Update failed")
        
        return {
            "success": True,
            "message": "Template updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete template (soft delete - marks as inactive)
    """
    
    try:
        success = await template_service.delete_template(template_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Delete failed")
        
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS - PREVIEW & RENDERING
# ═══════════════════════════════════════════════════════════════

@router.get("/{template_id}/preview")
async def get_template_preview(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get rendered preview of template using preview_context
    
    Returns all template fields rendered with the stored preview context.
    """
    
    try:
        preview = await template_service.render_template_preview(template_id)
        
        if not preview:
            raise HTTPException(status_code=404, detail="Template not found or preview failed")
        
        return {
            "success": True,
            "preview": preview
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render")
async def render_template(
    request: RenderTemplateRequest,
    current_user = Depends(get_current_user)
):
    """
    Render template with custom context
    
    - **template_id**: ID of template to render
    - **context**: Dictionary with values for {{placeholders}}
    
    Returns all template fields rendered with provided context.
    """
    
    try:
        rendered = await template_service.render_template_with_context(
            template_id=request.template_id,
            context=request.context
        )
        
        if not rendered:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "rendered": rendered
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rendering template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS - GPT AUTO-COMPLETE
# ═══════════════════════════════════════════════════════════════

@router.post("/autocomplete")
async def autocomplete_template(
    request: AutoCompleteRequest,
    current_user = Depends(get_current_user)
):
    """
    Use GPT to auto-generate reminder and fallback templates
    
    - **template_id**: ID of template with gpt_autocomplete_prompt
    - **lead_context**: Optional custom context (overwrites preview_context)
    
    Returns generated reminder_template and fallback_template.
    """
    
    try:
        result = await template_service.gpt_autocomplete_template(
            template_id=request.template_id,
            lead_context=request.lead_context
        )
        
        if not result or not result.get('success'):
            error_msg = result.get('error', 'GPT autocomplete failed') if result else 'Unknown error'
            raise HTTPException(status_code=500, detail=error_msg)
        
        return {
            "success": True,
            "reminder_template": result.get('reminder_template'),
            "fallback_template": result.get('fallback_template'),
            "generated_prompt": result.get('generated_prompt')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in autocomplete: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS - IMPORT/EXPORT
# ═══════════════════════════════════════════════════════════════

@router.get("/export")
async def export_templates(
    template_ids: Optional[List[str]] = Query(None, description="Specific template IDs to export"),
    current_user = Depends(get_current_user)
):
    """
    Export templates as JSON
    
    - **template_ids**: Optional list of specific template IDs to export
    
    If no IDs provided, exports all templates.
    """
    
    try:
        json_export = await template_service.export_templates(template_ids)
        
        return {
            "success": True,
            "export": json_export,
            "count": len(template_ids) if template_ids else "all"
        }
        
    except Exception as e:
        logger.error(f"Error exporting templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_templates(
    request: ImportTemplatesRequest,
    current_user = Depends(get_current_user)
):
    """
    Import templates from JSON
    
    - **templates_json**: JSON string with template data
    
    Returns IDs of imported templates.
    """
    
    try:
        imported_ids = await template_service.import_templates(request.templates_json)
        
        return {
            "success": True,
            "imported": len(imported_ids),
            "template_ids": imported_ids
        }
        
    except Exception as e:
        logger.error(f"Error importing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS - STATISTICS
# ═══════════════════════════════════════════════════════════════

@router.get("/{template_id}/stats")
async def get_template_stats(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get usage statistics for a template
    
    Returns usage_count, success_rate, version, and timestamps.
    """
    
    try:
        stats = await template_service.get_template_stats(template_id)
        
        if not stats:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {
            "success": True,
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/meta/channels")
async def get_available_channels(current_user = Depends(get_current_user)):
    """Get list of available channels"""
    return {
        "success": True,
        "channels": ["whatsapp", "email", "in_app"]
    }


@router.get("/meta/categories")
async def get_available_categories(current_user = Depends(get_current_user)):
    """Get list of available categories"""
    return {
        "success": True,
        "categories": [
            "objection",
            "nurture",
            "reminder",
            "reactivation",
            "proposal",
            "closing",
            "onboarding"
        ]
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "service": "follow-up-templates",
        "status": "healthy"
    }

