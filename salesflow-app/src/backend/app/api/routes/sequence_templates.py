"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCE TEMPLATES API                                                    ║
║  Vorgefertigte Sequence-Workflows                                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ...db.supabase import get_supabase
from ...db.deps import get_current_user, CurrentUser
from ...services.sequencer.templates import TemplateService

router = APIRouter(prefix="/sequence-templates", tags=["sequence-templates"])


# =============================================================================
# SCHEMAS
# =============================================================================

class TemplateSummary(BaseModel):
    """Template-Übersicht (ohne Steps)."""
    id: str
    name: str
    description: str
    category: str
    tags: List[str]
    estimated_duration_days: int
    step_count: int


class TemplateDetail(BaseModel):
    """Vollständiges Template mit Steps."""
    id: str
    name: str
    description: str
    category: str
    tags: List[str]
    estimated_duration_days: int
    steps: List[Dict[str, Any]]


class ApplyTemplateRequest(BaseModel):
    """Request zum Anwenden eines Templates."""
    name: Optional[str] = None
    customizations: Optional[Dict[str, Any]] = None


class CategoryInfo(BaseModel):
    """Kategorie-Information."""
    id: str
    name: str
    count: int


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/", response_model=List[TemplateSummary])
async def list_templates(
    category: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """
    📋 Listet alle verfügbaren Sequence-Templates.
    
    Optionaler Filter nach Kategorie.
    """
    service = TemplateService(supabase)
    return service.list_templates(category=category)


@router.get("/categories", response_model=List[CategoryInfo])
async def list_categories(
    supabase = Depends(get_supabase)
):
    """
    🏷️ Listet alle Template-Kategorien.
    """
    service = TemplateService(supabase)
    return service.get_categories()


@router.get("/{template_id}", response_model=TemplateDetail)
async def get_template(
    template_id: str,
    supabase = Depends(get_supabase)
):
    """
    📄 Holt ein einzelnes Template mit allen Details.
    """
    service = TemplateService(supabase)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template


@router.post("/{template_id}/apply")
async def apply_template(
    template_id: str,
    request: ApplyTemplateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    🚀 Wendet ein Template an und erstellt eine neue Sequence.
    
    Optionale Anpassungen:
    - name: Benutzerdefinierter Name
    - customizations: Step-Anpassungen
    """
    service = TemplateService(supabase)
    
    try:
        sequence = await service.apply_template(
            template_id=template_id,
            user_id=current_user.id,
            name=request.name,
            customizations=request.customizations
        )
        
        return {
            "success": True,
            "message": "Template applied successfully",
            "sequence": sequence
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}/preview")
async def preview_template(
    template_id: str,
    supabase = Depends(get_supabase)
):
    """
    👁️ Vorschau eines Templates mit Beispiel-Personalisierung.
    """
    service = TemplateService(supabase)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Beispiel-Personalisierung
    example_vars = {
        "first_name": "Max",
        "last_name": "Mustermann",
        "company": "Beispiel GmbH",
        "industry": "Tech",
        "sender_name": "Lisa Schmidt",
    }
    
    # Steps mit Beispiel-Daten
    preview_steps = []
    for step in template["steps"]:
        preview_step = step.copy()
        config = preview_step.get("config", {}).copy()
        
        # Variablen ersetzen
        for key, value in config.items():
            if isinstance(value, str):
                for var, val in example_vars.items():
                    value = value.replace(f"{{{{{var}}}}}", val)
                config[key] = value
        
        preview_step["config"] = config
        preview_steps.append(preview_step)
    
    return {
        **template,
        "steps": preview_steps,
        "example_variables": example_vars
    }

