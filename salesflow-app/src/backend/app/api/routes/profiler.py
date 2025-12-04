"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NEURO PROFILER API                                                        ║
║  /api/v2/profiler/* Endpoints                                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /analyze-contact/{contact_id} - Analysiere Kontakt
- POST /analyze-text - Analysiere Text
- GET /recommendations/{disg_type} - Empfehlungen für DISG-Typ
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.profiler import NeuroProfiler, get_profiler_service


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/profiler", tags=["profiler", "disc", "neuro"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AnalyzeTextRequest(BaseModel):
    """Request für Text-Analyse."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Text der analysiert werden soll"
    )


class AnalyzeTextResponse(BaseModel):
    """Response für Text-Analyse."""
    primary_type: str = Field(..., description="Primärer DISG-Typ (D, I, S, G)")
    secondary_type: Optional[str] = Field(None, description="Sekundärer DISG-Typ")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Konfidenz der Analyse (0-1)")
    scores: dict = Field(..., description="Scores für alle DISG-Typen")
    signals_detected: list = Field(..., description="Erkannte Signale")
    recommendations: dict = Field(..., description="Empfehlungen für Kommunikation")


class AnalyzeContactResponse(BaseModel):
    """Response für Kontakt-Analyse."""
    contact_id: str
    primary_type: str
    secondary_type: Optional[str]
    confidence: float
    scores: dict
    signals_detected: list
    recommendations: dict


class RecommendationsResponse(BaseModel):
    """Response für Empfehlungen."""
    disg_type: str
    communication_style: str
    approach: str
    avoid: str
    opening_suggestions: list
    pitch_structure: list
    closing_technique: str


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/analyze-contact/{contact_id}", response_model=AnalyzeContactResponse)
async def analyze_contact(
    contact_id: str = Path(..., description="ID des Kontakts"),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert einen Kontakt basierend auf allen verfügbaren Daten.
    
    ## Was wird analysiert:
    
    - E-Mails des Kontakts
    - Nachrichten (WhatsApp, SMS, etc.)
    - Notizen
    - Interaktions-Historie
    
    ## Response:
    
    - `primary_type`: Haupt-DISG-Typ (D, I, S, G)
    - `secondary_type`: Sekundärer Typ (falls vorhanden)
    - `confidence`: Konfidenz der Analyse (0-1)
    - `scores`: Scores für alle Typen
    - `recommendations`: Kommunikations-Empfehlungen
    """
    profiler = get_profiler_service(db)
    
    try:
        profile = await profiler.analyze_contact(
            contact_id=contact_id,
            user_id=current_user.id,
        )
        
        return AnalyzeContactResponse(
            contact_id=contact_id,
            primary_type=profile.primary_type,
            secondary_type=profile.secondary_type,
            confidence=profile.confidence,
            scores=profile.scores,
            signals_detected=profile.signals_detected,
            recommendations=profile.recommendations,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analyse fehlgeschlagen: {str(e)}"
        )


@router.post("/analyze-text", response_model=AnalyzeTextResponse)
async def analyze_text(
    request: AnalyzeTextRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert einen einzelnen Text (z.B. E-Mail von Kunde).
    
    ## Verwendung:
    
    Nützlich für schnelle Einschätzung eines einzelnen Textes,
    z.B. wenn ein Kunde eine E-Mail schreibt.
    
    ## Beispiel:
    
    ```json
    {
      "text": "Hallo, ich interessiere mich für dein Angebot. Könntest du mir bitte die genauen Zahlen und Daten schicken? Ich möchte das genau durchgehen."
    }
    ```
    
    → Erkennt wahrscheinlich Typ "G" (Gewissenhaft)
    """
    profiler = get_profiler_service(db)
    
    try:
        profile = await profiler.analyze_text(request.text)
        
        return AnalyzeTextResponse(
            primary_type=profile.primary_type,
            secondary_type=profile.secondary_type,
            confidence=profile.confidence,
            scores=profile.scores,
            signals_detected=profile.signals_detected,
            recommendations=profile.recommendations,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Text-Analyse fehlgeschlagen: {str(e)}"
        )


@router.get("/recommendations/{disg_type}", response_model=RecommendationsResponse)
async def get_recommendations(
    disg_type: str = Path(..., description="DISG-Typ (D, I, S, G)", regex="^[DISG]$"),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Kommunikations-Empfehlungen für einen DISG-Typ zurück.
    
    ## DISG-Typen:
    
    - **D** (Dominant): Direkt, ergebnisorientiert
    - **I** (Initiativ): Enthusiastisch, beziehungsorientiert
    - **S** (Stetig): Geduldig, harmoniebedürftig
    - **G** (Gewissenhaft): Analytisch, detailorientiert
    
    ## Response:
    
    - `communication_style`: Wie kommunizieren?
    - `approach`: Wie ansprechen?
    - `avoid`: Was vermeiden?
    - `opening_suggestions`: Vorschläge für Einstieg
    - `pitch_structure`: Struktur für Pitch
    - `closing_technique`: Closing-Technik
    """
    profiler = get_profiler_service(db)
    
    recommendations = profiler.get_pitch_recommendations(disg_type)
    
    return RecommendationsResponse(
        disg_type=disg_type.upper(),
        communication_style=recommendations["communication_style"],
        approach=recommendations["approach"],
        avoid=recommendations["avoid"],
        opening_suggestions=recommendations["opening_suggestions"],
        pitch_structure=recommendations["pitch_structure"],
        closing_technique=recommendations["closing_technique"],
    )


@router.get("/types")
async def get_disc_types():
    """
    Gibt alle DISG-Typen mit Beschreibungen zurück.
    
    Nützlich für Frontend-Darstellung.
    """
    from ...services.profiler.neuro_profiler import DISG_TYPES
    
    return {
        "types": {
            key: {
                "name": value["name"],
                "traits": value["traits"],
                "communication": value["communication"],
                "approach": value["approach"],
                "avoid": value["avoid"],
            }
            for key, value in DISG_TYPES.items()
        }
    }

