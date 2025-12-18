import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime

# Mock Dependencies (Ersetzen durch echte Imports)
# from app.dependencies import get_db, get_current_user
# from app.main import ai_client

router = APIRouter(prefix="/api/lead-qualifier", tags=["AI Lead Qualifier"])

# --- Pydantic Models (Output Structure) ---

class BantBreakdown(BaseModel):
    budget: int = Field(..., description="0-100 Score")
    authority: int = Field(..., description="0-100 Score")
    need: int = Field(..., description="0-100 Score")
    timeline: int = Field(..., description="0-100 Score")


class LinkedinData(BaseModel):
    position: str
    company: str
    company_size: str
    industry: str


class PurchaseSignal(BaseModel):
    type: str  # z.B. "News", "Hiring", "Funding"
    confidence: int
    context: str


class Recommendation(BaseModel):
    priority: str  # "high", "medium", "low"
    reason: str
    suggested_questions: List[str]


class LeadAnalysisResponse(BaseModel):
    lead_id: str
    bant_score: int
    bant_breakdown: BantBreakdown
    linkedin_data: LinkedinData
    purchase_signals: List[PurchaseSignal]
    qualification_recommendation: Recommendation
    analyzed_at: datetime = Field(default_factory=datetime.now)


# --- Input Models ---

class AnalyzeRequest(BaseModel):
    lead_id: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_name: Optional[str] = None
    notes: Optional[str] = None  # Zusätzlicher Kontext für die AI


# --- Helpers ---

def calculate_overall_bant(breakdown: BantBreakdown) -> int:
    """Berechnet den gewichteten Durchschnitt (Beispiel: Need wiegt mehr)."""
    # Gewichtung: Budget 20%, Authority 20%, Need 40%, Timeline 20%
    score = (breakdown.budget * 0.2) + \
            (breakdown.authority * 0.2) + \
            (breakdown.need * 0.4) + \
            (breakdown.timeline * 0.2)
    return int(score)


async def mock_ai_analysis(prompt: str) -> Dict:
    """Simuliert den LLM Response Call."""
    # In Produktion: return await app.ai_client.chat_completion(prompt)
    import asyncio
    await asyncio.sleep(1.5)  # Simuliere Denkzeit
    return {
        "bant_breakdown": {"budget": 75, "authority": 90, "need": 85, "timeline": 40},
        "linkedin_data": {
            "position": "CTO", "company": "TechFlow Solutions",
            "company_size": "50-200", "industry": "SaaS"
        },
        "purchase_signals": [
            {"type": "Hiring", "confidence": 90, "context": "Sucht aktiv nach Senior React Devs"},
            {"type": "Funding", "confidence": 80, "context": "Series B Funding vor 2 Monaten"}
        ],
        "qualification_recommendation": {
            "priority": "high",
            "reason": "Hoher Need durch Skalierung (Hiring) und Budget vorhanden (Funding).",
            "suggested_questions": ["Wie planen Sie das Tech-Team zu skalieren?", "Welche Herausforderungen sehen Sie im aktuellen Stack?"]
        }
    }


# --- Endpoints ---

@router.post("/analyze", response_model=LeadAnalysisResponse)
async def analyze_lead(request: AnalyzeRequest):
    """
    Analysiert einen Lead mittels LLM und berechnet den BANT-Score.
    """
    # 1. Prompt Construction
    prompt = f"""
    Du bist ein Senior Sales Development Representative. Analysiere diesen Lead basierend auf folgenden Daten:
    Email: {request.email}
    Company: {request.company_name}
    LinkedIn: {request.linkedin_url}
    Notizen: {request.notes}
    
    Aufgabe:
    1. Extrahiere/Schätze LinkedIn Daten (Position, Größe, Branche).
    2. Bewerte nach BANT (0-100) für Budget, Authority, Need, Timeline.
    3. Identifiziere Kaufsignale (Funding, Hiring, News).
    4. Gib eine Empfehlung ab.
    
    Antworte NUR mit validem JSON.
    """
    
    try:
        # 2. Call LLM (Hier simuliert)
        ai_result = await mock_ai_analysis(prompt)
        
        # 3. Process Result
        bant_breakdown = BantBreakdown(**ai_result['bant_breakdown'])
        bant_score = calculate_overall_bant(bant_breakdown)
        
        response_data = LeadAnalysisResponse(
            lead_id=request.lead_id,
            bant_score=bant_score,
            bant_breakdown=bant_breakdown,
            linkedin_data=LinkedinData(**ai_result['linkedin_data']),
            purchase_signals=[PurchaseSignal(**s) for s in ai_result['purchase_signals']],
            qualification_recommendation=Recommendation(**ai_result['qualification_recommendation'])
        )

        # 4. Save to DB (Supabase Update Mock)
        # supabase.table('lead_enrichments').upsert({...}).execute()

        return response_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")


@router.get("/qualify/{lead_id}", response_model=LeadAnalysisResponse)
async def get_qualification(lead_id: str):
    """Holt gespeicherte Qualifizierungsdaten."""
    # In Produktion: DB Query
    # result = supabase.table('lead_enrichments').select('*').eq('lead_id', lead_id).single()
    raise HTTPException(status_code=404, detail="Not implemented in Mock")


@router.post("/batch-qualify")
async def batch_qualify(lead_ids: List[str], background_tasks: BackgroundTasks):
    """
    Startet einen Background-Job für mehrere Leads.
    """
    # Background Task Logic hier einfügen
    return {"message": f"Batch analysis started for {len(lead_ids)} leads", "status": "processing"}

