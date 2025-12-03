"""
Template API Endpoints
Advanced template management with GPT auto-complete
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional

from app.services.template_service import template_service
from app.core.auth import get_current_user


router = APIRouter(prefix="/api/templates", tags=["Templates"])


class CreateTemplateRequest(BaseModel):
    name: str
    trigger_key: str
    channel: str
    category: Optional[str] = None
    subject_template: Optional[str] = None
    short_template: Optional[str] = None
    body_template: str
    reminder_template: Optional[str] = None
    fallback_template: Optional[str] = None
    gpt_autocomplete_prompt: Optional[str] = None
    preview_context: Optional[Dict] = None


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    body_template: Optional[str] = None
    reminder_template: Optional[str] = None
    fallback_template: Optional[str] = None
    subject_template: Optional[str] = None
    gpt_autocomplete_prompt: Optional[str] = None
    preview_context: Optional[Dict] = None
    is_active: Optional[bool] = None
    category: Optional[str] = None


class AutocompleteRequest(BaseModel):
    template_id: str
    lead_context: Optional[Dict] = None


class PreviewRequest(BaseModel):
    template_id: str
    context: Optional[Dict] = None


@router.get("/list")
async def list_templates(
    channel: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """
    Get all active templates
    
    Optional filter by channel (whatsapp, email, in_app)
    """
    
    templates = await template_service.get_all_templates(channel=channel)
    
    return {
        "success": True,
        "count": len(templates),
        "templates": templates
    }


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """Get template by ID"""
    
    template = await template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "success": True,
        "template": template
    }


@router.get("/by-trigger/{trigger_key}")
async def get_template_by_trigger(
    trigger_key: str,
    channel: str = Query('email'),
    current_user = Depends(get_current_user)
):
    """Get template by trigger key and channel"""
    
    template = await template_service.get_template_by_trigger(
        trigger_key=trigger_key,
        channel=channel
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "success": True,
        "template": template
    }


@router.post("/create")
async def create_template(
    request: CreateTemplateRequest,
    current_user = Depends(get_current_user)
):
    """
    Create new template
    
    Requires: name, trigger_key, channel, body_template
    Optional: reminder_template, fallback_template, gpt_autocomplete_prompt
    """
    
    # Only admin/leader can create templates
    if current_user.role not in ['admin', 'leader']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template_data = request.dict()
    template_data['created_by'] = current_user.id
    
    try:
        template = await template_service.create_template(template_data)
        
        return {
            "success": True,
            "message": "Template created successfully",
            "template": template
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}")
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    current_user = Depends(get_current_user)
):
    """
    Update template
    
    Only updates provided fields
    Creates version snapshot automatically (via trigger)
    """
    
    # Only admin/leader can update templates
    if current_user.role not in ['admin', 'leader']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    updates = {k: v for k, v in request.dict().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    try:
        template = await template_service.update_template(template_id, updates)
        
        return {
            "success": True,
            "message": "Template updated successfully",
            "template": template
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/autocomplete")
async def autocomplete_template(
    request: AutocompleteRequest,
    current_user = Depends(get_current_user)
):
    """
    GPT auto-complete for reminder and fallback templates
    
    Uses the template's gpt_autocomplete_prompt to generate
    reminder_template and fallback_template
    
    Example response:
    {
      "reminder_template": "...",
      "fallback_template": "..."
    }
    """
    
    try:
        result = await template_service.gpt_autocomplete_template(
            template_id=request.template_id,
            lead_context=request.lead_context
        )
        
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_template(
    request: PreviewRequest,
    current_user = Depends(get_current_user)
):
    """
    Preview template with context
    
    Renders all template fields (body, reminder, fallback, subject)
    with provided context
    """
    
    try:
        rendered = await template_service.preview_template(
            template_id=request.template_id,
            context=request.context
        )
        
        return {
            "success": True,
            "preview": rendered
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}/versions")
async def get_template_versions(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get version history for template
    
    Returns all past versions with change notes
    """
    
    versions = await template_service.get_template_versions(template_id)
    
    return {
        "success": True,
        "count": len(versions),
        "versions": versions
    }


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """
    Soft delete template (sets is_active = false)
    """
    
    # Only admin can delete
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        template = await template_service.update_template(
            template_id,
            {'is_active': False}
        )
        
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/list")
async def list_categories(
    current_user = Depends(get_current_user)
):
    """
    Get all template categories
    """
    
    from app.core.database import get_db
    
    async with get_db() as db:
        categories = await db.fetch(
            """
            SELECT DISTINCT category
            FROM followup_templates
            WHERE is_active = TRUE AND category IS NOT NULL
            ORDER BY category
            """
        )
        
        return {
            "success": True,
            "categories": [c['category'] for c in categories]
        }


@router.get("/channels/list")
async def list_channels(
    current_user = Depends(get_current_user)
):
    """
    Get available channels
    """
    
    return {
        "success": True,
        "channels": ['whatsapp', 'email', 'in_app']
    }

