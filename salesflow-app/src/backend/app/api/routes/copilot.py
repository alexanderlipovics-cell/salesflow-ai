"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FELLO AI COPILOT - API ROUTES                                             ║
║  Generiert psychologisch optimierte Antwort-Skripte für Sales              ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    - POST /copilot/generate - Generiert 3 Antwort-Optionen für Lead-Nachricht

Der FELLO Copilot analysiert:
- Sentiment (Skeptisch, Neugierig, Verärgert, Enthusiastisch)
- DISG-Typ (Dominant, Initiativ, Stetig, Gewissenhaft)
- Generiert passende Antworten (Soft, Direct, Question)
"""

import json
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.llm_client import get_llm_client
from ...config.prompts.fello_copilot import FELLO_SYSTEM_PROMPT


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/copilot", tags=["copilot"])


# =============================================================================
# SCHEMAS
# =============================================================================

class CopilotRequest(BaseModel):
    """Request für Copilot-Generierung."""
    user_company: str = Field(..., description="Firma/MLM des Users (z.B. Zinzino)")
    lead_message: str = Field(..., description="Die Nachricht des Leads")
    context: Optional[str] = Field("", description="Zusätzlicher Kontext zur Konversation")


class AnalysisResult(BaseModel):
    """Analyse-Ergebnis mit Sentiment und DISG."""
    sentiment: str = Field(..., description="Erkanntes Sentiment")
    disg_type: str = Field(..., description="Erkannter DISG-Typ")
    reasoning: str = Field(..., description="Begründung der Analyse")


class ResponseOption(BaseModel):
    """Eine Antwort-Option."""
    id: str = Field(..., description="ID der Option (opt_soft, opt_direct, opt_question)")
    label: str = Field(..., description="Label für UI")
    tone: str = Field(..., description="Ton der Antwort")
    content: str = Field(..., description="Die eigentliche Antwort")
    tags: List[str] = Field(default_factory=list, description="Tags für Kategorisierung")


class CopilotResponse(BaseModel):
    """Response mit Analyse und Optionen."""
    analysis: AnalysisResult
    options: List[ResponseOption]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/generate", response_model=CopilotResponse)
async def generate_responses(
    request: CopilotRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generiert 3 psychologisch optimierte Antwort-Optionen.
    
    Der FELLO AI Copilot analysiert die Lead-Nachricht und erstellt:
    - Option A (Soft/Empathisch): Für S & G Typen
    - Option B (Direct/Klar): Für D Typen  
    - Option C (Gegenfrage/Spin): Für I Typen
    
    Returns:
        CopilotResponse mit Analyse und 3 Optionen
    """
    try:
        # Prepare user input as JSON
        user_input = json.dumps({
            "user_company": request.user_company,
            "lead_message": request.lead_message,
            "context": request.context or ""
        }, ensure_ascii=False)
        
        # Get LLM client
        llm_client = get_llm_client()
        
        # Generate response with JSON mode
        response_text = await llm_client.chat(
            messages=[
                {"role": "system", "content": FELLO_SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=1500,
            json_mode=True
        )
        
        # Parse JSON response
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response was: {response_text[:500]}")
            raise HTTPException(
                status_code=500, 
                detail="AI-Antwort konnte nicht verarbeitet werden"
            )
        
        # Validate structure
        if "analysis" not in result or "options" not in result:
            logger.error(f"Invalid response structure: {result}")
            raise HTTPException(
                status_code=500,
                detail="Ungültige AI-Antwort-Struktur"
            )
        
        # Build response
        analysis = AnalysisResult(
            sentiment=result["analysis"].get("sentiment", "Unknown"),
            disg_type=result["analysis"].get("disg_type", "Unknown"),
            reasoning=result["analysis"].get("reasoning", "")
        )
        
        options = []
        for opt in result.get("options", []):
            options.append(ResponseOption(
                id=opt.get("id", "unknown"),
                label=opt.get("label", ""),
                tone=opt.get("tone", ""),
                content=opt.get("content", ""),
                tags=opt.get("tags", [])
            ))
        
        # Log for analytics
        logger.info(
            f"Copilot generated for user {current_user.id} | "
            f"Company: {request.user_company} | "
            f"DISG: {analysis.disg_type} | "
            f"Sentiment: {analysis.sentiment}"
        )
        
        return CopilotResponse(
            analysis=analysis,
            options=options
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in copilot generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-anonymous", response_model=CopilotResponse)
async def generate_responses_anonymous(
    request: CopilotRequest,
    db = Depends(get_db),
):
    """
    Generiert Antwort-Optionen ohne Authentifizierung.
    
    ⚠️ Nur für Demo/Testing - Rate-Limited in Production!
    """
    try:
        user_input = json.dumps({
            "user_company": request.user_company,
            "lead_message": request.lead_message,
            "context": request.context or ""
        }, ensure_ascii=False)
        
        llm_client = get_llm_client()
        
        response_text = await llm_client.chat(
            messages=[
                {"role": "system", "content": FELLO_SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=1500,
            json_mode=True
        )
        
        result = json.loads(response_text)
        
        analysis = AnalysisResult(
            sentiment=result["analysis"].get("sentiment", "Unknown"),
            disg_type=result["analysis"].get("disg_type", "Unknown"),
            reasoning=result["analysis"].get("reasoning", "")
        )
        
        options = []
        for opt in result.get("options", []):
            options.append(ResponseOption(
                id=opt.get("id", "unknown"),
                label=opt.get("label", ""),
                tone=opt.get("tone", ""),
                content=opt.get("content", ""),
                tags=opt.get("tags", [])
            ))
        
        return CopilotResponse(analysis=analysis, options=options)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI-Antwort konnte nicht verarbeitet werden")
    except Exception as e:
        logger.exception(f"Error in anonymous copilot generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MOBILE APP ENDPOINT (Simplified - No Auth Required)
# =============================================================================

class MobileCopilotRequest(BaseModel):
    """Simplified request for mobile app."""
    message: str = Field(..., description="Lead message or user question")
    lead_context: Optional[dict] = Field(default={}, description="Optional lead context")
    conversation_history: Optional[List[dict]] = Field(default=[], description="Chat history")
    context: Optional[dict] = Field(default={}, description="Additional context")
    vertical: Optional[str] = Field(default="mlm_sales", description="Vertical/industry")


class MobileCopilotResponse(BaseModel):
    """Mobile-friendly response with main text and options."""
    response: str = Field(..., description="Main response text")
    analysis: AnalysisResult
    options: List[ResponseOption]


@router.post("/mobile/generate", response_model=MobileCopilotResponse)
async def generate_mobile_responses(
    request: MobileCopilotRequest,
    db = Depends(get_db),
):
    """
    Mobile App Endpoint - Vereinfachtes Format ohne Auth.
    
    Akzeptiert: {"message": "Lead text", "lead_context": {}, "conversation_history": []}
    
    Liefert:
    - response: Hauptantwort-Text
    - analysis: Sentiment + DISG Analyse
    - options: 3 Antwort-Optionen (Soft, Direct, Question)
    """
    try:
        # Convert mobile format to standard format
        user_company = request.lead_context.get("company", "Network Marketing") if request.lead_context else "Network Marketing"
        
        user_input = json.dumps({
            "user_company": user_company,
            "lead_message": request.message,
            "context": str(request.lead_context) if request.lead_context else ""
        }, ensure_ascii=False)
        
        llm_client = get_llm_client()
        
        response_text = await llm_client.chat(
            messages=[
                {"role": "system", "content": FELLO_SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=1500,
            json_mode=True
        )
        
        result = json.loads(response_text)
        
        analysis = AnalysisResult(
            sentiment=result["analysis"].get("sentiment", "Unknown"),
            disg_type=result["analysis"].get("disg_type", "Unknown"),
            reasoning=result["analysis"].get("reasoning", "")
        )
        
        options = []
        for opt in result.get("options", []):
            options.append(ResponseOption(
                id=opt.get("id", "unknown"),
                label=opt.get("label", ""),
                tone=opt.get("tone", ""),
                content=opt.get("content", ""),
                tags=opt.get("tags", [])
            ))
        
        # Generate main response text from first option or analysis
        main_response = ""
        if options:
            main_response = f"**Analyse:** {analysis.sentiment} | DISG: {analysis.disg_type}\n\n"
            main_response += f"**Empfehlung:** {options[0].content if options else analysis.reasoning}"
        else:
            main_response = analysis.reasoning
        
        logger.info(f"Mobile Copilot | DISG: {analysis.disg_type} | Sentiment: {analysis.sentiment}")
        
        return MobileCopilotResponse(
            response=main_response,
            analysis=analysis,
            options=options
        )
        
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM response as JSON")
        raise HTTPException(status_code=500, detail="AI-Antwort konnte nicht verarbeitet werden")
    except Exception as e:
        logger.exception(f"Error in mobile copilot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def copilot_health():
    """Health-Check für den Copilot-Service."""
    return {
        "status": "ok",
        "service": "copilot",
        "endpoints": [
            "/api/copilot/generate",
            "/api/copilot/generate-anonymous", 
            "/api/copilot/mobile/generate"
        ]
    }
