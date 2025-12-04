"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CAMPAIGNS API v2                                                           ║
║  /api/v2/campaigns/* Endpoints                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /templates - Liste aller verfügbaren Templates
- POST /generate - Generiere personalisierte Outreach-Nachricht
- GET /sequence/{type} - Hole Sequenz-Definition
"""

import logging
from typing import List, Optional, Dict, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.campaigns import CampaignService, CAMPAIGN_TEMPLATES, SEQUENCES
from ...services.campaigns.campaign_service import (
    IndustryType,
    ChannelType,
    CampaignType,
    OutreachMessage,
)

logger = logging.getLogger(__name__)

# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(prefix="/campaigns", tags=["campaigns", "outreach"])

# =============================================================================
# SCHEMAS
# =============================================================================

class TemplateInfo(BaseModel):
    """Information über ein Template."""
    campaign_type: str
    industry: str
    channel: str
    has_subject: bool


class TemplatesResponse(BaseModel):
    """Response für Templates-Liste."""
    templates: List[TemplateInfo]
    industries: List[str]
    channels: List[str]
    campaign_types: List[str]


class GenerateRequest(BaseModel):
    """Request für Outreach-Generation."""
    industry: IndustryType = Field(..., description="Branche (immobilien, mlm_leader, hotel)")
    channel: ChannelType = Field(..., description="Kanal (email, linkedin, whatsapp, instagram_dm)")
    contact_name: str = Field(..., description="Name des Kontakts")
    company_name: str = Field(..., description="Name des Unternehmens")
    campaign_type: CampaignType = Field(
        default="cold_outreach",
        description="Campaign-Typ (cold_outreach, follow_up_sequence, reactivation)"
    )
    personalize: bool = Field(
        default=True,
        description="Ob die Nachricht mit AI personalisiert werden soll"
    )
    additional_context: Optional[Dict[str, str]] = Field(
        default=None,
        description="Zusätzlicher Kontext (z.B. your_name, topic, etc.)"
    )


class MessageResponse(BaseModel):
    """Eine Outreach-Nachricht."""
    type: str = Field(..., description="Campaign-Typ")
    subject: Optional[str] = Field(None, description="Email-Betreff (nur bei Email)")
    body: str = Field(..., description="Nachrichtentext")
    channel: str = Field(..., description="Kanal")
    confidence: float = Field(..., description="Confidence-Score (0-1)")


class GenerateResponse(BaseModel):
    """Response für Outreach-Generation."""
    message: MessageResponse


class SequenceStep(BaseModel):
    """Ein Schritt in einer Sequenz."""
    day: int = Field(..., description="Tag der Sequenz (0 = Start)")
    type: str = Field(..., description="Typ des Schritts")
    channel: str = Field(..., description="Kanal")
    description: str = Field(..., description="Beschreibung")


class SequenceResponse(BaseModel):
    """Response für Sequenz."""
    sequence_type: str
    steps: List[SequenceStep]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _get_service() -> CampaignService:
    """Erstellt CampaignService Instanz."""
    return CampaignService()


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/templates", response_model=TemplatesResponse)
async def get_templates(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt alle verfügbaren Templates zurück.
    
    ## Beispiel Response
    
    ```json
    {
      "templates": [
        {
          "campaign_type": "cold_outreach",
          "industry": "immobilien",
          "channel": "email",
          "has_subject": true
        }
      ],
      "industries": ["immobilien", "mlm_leader", "hotel"],
      "channels": ["email", "linkedin", "whatsapp", "instagram_dm"],
      "campaign_types": ["cold_outreach", "follow_up_sequence", "reactivation"]
    }
    ```
    """
    templates = []
    industries_set = set()
    channels_set = set()
    campaign_types_set = set()
    
    for campaign_type, industries in CAMPAIGN_TEMPLATES.items():
        campaign_types_set.add(campaign_type)
        
        for industry, channels in industries.items():
            industries_set.add(industry)
            
            for channel, config in channels.items():
                channels_set.add(channel)
                
                has_subject = isinstance(config, dict) and "subject" in config
                
                templates.append(TemplateInfo(
                    campaign_type=campaign_type,
                    industry=industry,
                    channel=channel,
                    has_subject=has_subject,
                ))
    
    return TemplatesResponse(
        templates=templates,
        industries=sorted(list(industries_set)),
        channels=sorted(list(channels_set)),
        campaign_types=sorted(list(campaign_types_set)),
    )


@router.post("/generate", response_model=GenerateResponse)
async def generate_outreach(
    request: GenerateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generiert eine personalisierte Outreach-Nachricht basierend auf Template.
    
    ## Beispiel Request
    
    ```json
    {
      "industry": "immobilien",
      "channel": "email",
      "contact_name": "Max Mustermann",
      "company_name": "Mustermann Immobilien",
      "campaign_type": "cold_outreach",
      "personalize": true,
      "additional_context": {
        "your_name": "Anna Schmidt"
      }
    }
    ```
    
    ## Beispiel Response
    
    ```json
    {
      "message": {
        "type": "cold_outreach",
        "subject": "Exposés in 3 Sekunden – mehr Zeit für Besichtigungen",
        "body": "Hallo Max Mustermann,\n\nich habe gesehen...",
        "channel": "email",
        "confidence": 0.75
      }
    }
    ```
    """
    try:
        service = _get_service()
        
        # Context erweitern mit user info falls vorhanden
        additional_context = request.additional_context or {}
        if "your_name" not in additional_context:
            # Versuche user name zu holen
            additional_context["your_name"] = current_user.first_name or "Dein Name"
        
        message: OutreachMessage = await service.generate_outreach(
            industry=request.industry,
            channel=request.channel,
            contact_name=request.contact_name,
            company_name=request.company_name,
            campaign_type=request.campaign_type,
            personalize=request.personalize,
            additional_context=additional_context,
        )
        
        return GenerateResponse(
            message=MessageResponse(
                type=message.type,
                subject=message.subject,
                body=message.body,
                channel=message.channel,
                confidence=message.confidence,
            )
        )
        
    except Exception as e:
        logger.error(f"Error generating outreach: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei Outreach-Generation: {str(e)}"
        )


@router.get("/sequence/{sequence_type}", response_model=SequenceResponse)
async def get_sequence(
    sequence_type: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt eine Sequenz-Definition zurück.
    
    Verfügbare Sequenz-Typen:
    - `cold_outreach`: 4-Schritte Sequenz für Cold Outreach
    - `warm_introduction`: 3-Schritte Sequenz für warme Einführungen
    
    ## Beispiel Response
    
    ```json
    {
      "sequence_type": "cold_outreach",
      "steps": [
        {
          "day": 0,
          "type": "initial",
          "channel": "email",
          "description": "Erste Kontaktaufnahme mit Value Proposition"
        }
      ]
    }
    ```
    """
    sequence = SEQUENCES.get(sequence_type)
    
    if not sequence:
        raise HTTPException(
            status_code=404,
            detail=f"Sequenz-Typ '{sequence_type}' nicht gefunden. Verfügbar: {', '.join(SEQUENCES.keys())}"
        )
    
    steps = [
        SequenceStep(
            day=step["day"],
            type=step["type"],
            channel=step["channel"],
            description=step["description"],
        )
        for step in sequence
    ]
    
    return SequenceResponse(
        sequence_type=sequence_type,
        steps=steps,
    )

