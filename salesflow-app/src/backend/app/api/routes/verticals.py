"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICALS API ROUTES                                                      ║
║  Branchenspezifische Konfiguration, Playbooks & KPIs                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /verticals - List all available verticals
- GET /verticals/{id} - Get vertical configuration
- GET /verticals/{id}/pipeline - Get pipeline stages
- GET /verticals/{id}/kpis - Get KPI definitions
- GET /verticals/{id}/playbooks - List playbooks
- GET /verticals/{id}/playbooks/{playbook_id} - Get playbook details
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ...db.deps import get_current_user, CurrentUser
from ...config.verticals import (
    VERTICAL_CONFIGS,
    get_vertical_config,
    get_all_verticals,
)
from ...config.verticals_extended import (
    get_vertical_config_extended,
    get_vertical_pipeline,
    get_vertical_kpis,
    get_vertical_playbooks,
    get_playbook_details,
    get_vertical_followup_cycle,
    get_vertical_channels,
    get_common_objections,
    get_success_patterns,
    VERTICAL_CONFIGS_EXTENDED,
)

router = APIRouter(prefix="/verticals", tags=["verticals"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class VerticalSummary(BaseModel):
    """Vertical summary for listing."""
    id: str
    display_name: str
    compliance_level: str
    has_extended_config: bool


class PipelineStageResponse(BaseModel):
    """Pipeline stage response."""
    id: str
    name: str
    order: int
    color: str
    description: str
    typical_duration_days: int
    next_actions: List[str]
    is_terminal: bool


class KPIResponse(BaseModel):
    """KPI definition response."""
    id: str
    name: str
    description: str
    unit: str
    target_direction: str
    default_target: Optional[float]


class PlaybookSummary(BaseModel):
    """Playbook summary for listing."""
    id: str
    name: str
    description: str
    trigger: str
    steps_count: int
    success_metric: Optional[str]


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=Dict[str, Any])
async def list_verticals(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all available verticals.
    
    Returns basic and extended verticals with their key properties.
    """
    verticals = []
    
    for vertical_id, config in VERTICAL_CONFIGS.items():
        has_extended = vertical_id in VERTICAL_CONFIGS_EXTENDED
        
        verticals.append({
            "id": vertical_id,
            "display_name": config.display_name,
            "compliance_level": config.compliance_level,
            "default_tone": config.default_tone,
            "has_extended_config": has_extended,
            "has_playbooks": has_extended,
        })
    
    return {
        "verticals": verticals,
        "count": len(verticals),
    }


@router.get("/{vertical_id}", response_model=Dict[str, Any])
async def get_vertical(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get complete configuration for a vertical.
    
    Includes:
    - Basic config (compliance rules, tone, objections)
    - Extended config (pipeline, KPIs, playbooks) if available
    """
    if vertical_id not in VERTICAL_CONFIGS:
        raise HTTPException(status_code=404, detail=f"Vertical not found: {vertical_id}")
    
    basic = get_vertical_config(vertical_id)
    has_extended = vertical_id in VERTICAL_CONFIGS_EXTENDED
    
    response = {
        "id": basic.id,
        "display_name": basic.display_name,
        "compliance_level": basic.compliance_level,
        "default_tone": basic.default_tone,
        "key_objections": basic.key_objections,
        "common_moods": basic.common_moods,
        "special_rules": basic.special_rules,
        "coach_priorities": basic.coach_priorities,
    }
    
    if has_extended:
        response["pipeline"] = get_vertical_pipeline(vertical_id)
        response["kpis"] = get_vertical_kpis(vertical_id)
        response["followup_cycle"] = get_vertical_followup_cycle(vertical_id)
        response["channels"] = get_vertical_channels(vertical_id)
        response["common_objections"] = get_common_objections(vertical_id)
        response["success_patterns"] = get_success_patterns(vertical_id)
        response["playbooks_count"] = len(get_vertical_playbooks(vertical_id))
    
    return response


@router.get("/{vertical_id}/pipeline", response_model=Dict[str, Any])
async def get_pipeline(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get pipeline stages for a vertical.
    
    Returns ordered list of stages with colors and typical durations.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        # Return default pipeline
        return {
            "vertical": vertical_id,
            "stages": [
                {"id": "lead", "name": "Lead", "order": 1, "color": "#94a3b8"},
                {"id": "qualified", "name": "Qualifiziert", "order": 2, "color": "#3b82f6"},
                {"id": "proposal", "name": "Angebot", "order": 3, "color": "#8b5cf6"},
                {"id": "negotiation", "name": "Verhandlung", "order": 4, "color": "#f59e0b"},
                {"id": "closed", "name": "Abgeschlossen", "order": 5, "color": "#22c55e"},
                {"id": "lost", "name": "Verloren", "order": 99, "color": "#ef4444"},
            ],
            "is_default": True,
        }
    
    return {
        "vertical": vertical_id,
        "stages": get_vertical_pipeline(vertical_id),
        "is_default": False,
    }


@router.get("/{vertical_id}/kpis", response_model=Dict[str, Any])
async def get_kpis(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get KPI definitions for a vertical.
    
    Returns KPIs with their units, targets, and calculation methods.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        # Return default KPIs
        return {
            "vertical": vertical_id,
            "kpis": [
                {"id": "new_contacts", "name": "Neukontakte", "unit": "count", "default_target": 5},
                {"id": "meetings", "name": "Termine", "unit": "count", "default_target": 10},
                {"id": "deals_closed", "name": "Abschlüsse", "unit": "count", "default_target": 2},
            ],
            "is_default": True,
        }
    
    return {
        "vertical": vertical_id,
        "kpis": get_vertical_kpis(vertical_id),
        "is_default": False,
    }


@router.get("/{vertical_id}/playbooks", response_model=Dict[str, Any])
async def list_playbooks(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all playbooks for a vertical.
    
    Playbooks are step-by-step guides for specific situations.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        return {
            "vertical": vertical_id,
            "playbooks": [],
            "message": "No playbooks available for this vertical",
        }
    
    return {
        "vertical": vertical_id,
        "playbooks": get_vertical_playbooks(vertical_id),
    }


@router.get("/{vertical_id}/playbooks/{playbook_id}", response_model=Dict[str, Any])
async def get_playbook(
    vertical_id: str,
    playbook_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get detailed playbook with all steps.
    
    Returns complete playbook including:
    - All steps with order
    - AI skills to use
    - Templates to apply
    - Conditions for each step
    """
    playbook = get_playbook_details(vertical_id, playbook_id)
    
    if not playbook:
        raise HTTPException(
            status_code=404,
            detail=f"Playbook not found: {playbook_id} in {vertical_id}"
        )
    
    return {
        "vertical": vertical_id,
        "playbook": playbook,
    }


@router.get("/{vertical_id}/followup-cycle", response_model=Dict[str, Any])
async def get_followup_cycle(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get follow-up timing recommendations for a vertical.
    
    Returns recommended days to wait for various scenarios.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        # Default cycle
        return {
            "vertical": vertical_id,
            "cycle": {
                "after_first_contact": 2,
                "after_no_response": 3,
                "after_interest_shown": 1,
                "after_proposal": 2,
                "reactivation_threshold": 30,
            },
            "is_default": True,
        }
    
    return {
        "vertical": vertical_id,
        "cycle": get_vertical_followup_cycle(vertical_id),
        "is_default": False,
    }


@router.get("/{vertical_id}/channels", response_model=Dict[str, Any])
async def get_channels(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get recommended communication channels for a vertical.
    
    Returns primary and secondary channel recommendations.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        return {
            "vertical": vertical_id,
            "primary": ["whatsapp", "phone", "email"],
            "secondary": ["sms", "linkedin"],
            "is_default": True,
        }
    
    channels = get_vertical_channels(vertical_id)
    return {
        "vertical": vertical_id,
        "primary": channels["primary"],
        "secondary": channels["secondary"],
        "is_default": False,
    }


@router.get("/{vertical_id}/objections", response_model=Dict[str, Any])
async def get_objections(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get common objections for a vertical.
    
    Returns objections with their types and severity levels.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        # Get from basic config
        basic = get_vertical_config(vertical_id)
        return {
            "vertical": vertical_id,
            "objections": [{"objection": obj, "type": "general"} for obj in basic.key_objections],
        }
    
    return {
        "vertical": vertical_id,
        "objections": get_common_objections(vertical_id),
    }


@router.get("/{vertical_id}/success-patterns", response_model=Dict[str, Any])
async def get_success_patterns_endpoint(
    vertical_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get success patterns for a vertical.
    
    Returns proven strategies that work in this vertical.
    """
    if vertical_id not in VERTICAL_CONFIGS_EXTENDED:
        return {
            "vertical": vertical_id,
            "patterns": [],
            "message": "No specific success patterns documented",
        }
    
    return {
        "vertical": vertical_id,
        "patterns": get_success_patterns(vertical_id),
    }

