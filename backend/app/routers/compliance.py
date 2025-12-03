# ============================================================================
# FILE: app/routers/compliance.py
# DESCRIPTION: Compliance API Endpoints - LIABILITY-SHIELD
# ============================================================================

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List

from app.services.compliance_service import compliance_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ComplianceCheckRequest(BaseModel):
    """Request model for compliance check"""
    text: str = Field(..., description="Text to check for compliance")
    use_openai: bool = Field(
        default=False, 
        description="Use OpenAI Moderation API (slower but more thorough)"
    )


class ComplianceCheckResponse(BaseModel):
    """Response model for compliance check"""
    is_compliant: bool
    issues: List[str]
    filtered_text: str
    action_taken: str


@router.post("/check", response_model=ComplianceCheckResponse)
async def check_compliance(request: ComplianceCheckRequest):
    """
    Check text for compliance issues (Heilversprechen, Garantien, etc.)
    
    Returns filtered text with issues removed and disclaimer added if needed.
    """
    try:
        result = await compliance_service.check_compliance(
            text=request.text,
            use_openai=request.use_openai
        )
        
        return ComplianceCheckResponse(**result)
        
    except Exception as e:
        logger.error(f"Compliance check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Compliance check failed"
        )


@router.get("/health")
async def compliance_health():
    """Health check for compliance service"""
    return {
        "status": "healthy",
        "service": "liability-shield",
        "blacklist_terms": len(compliance_service.blacklist_patterns)
    }


# =============================================================================
# INTERNAL FUNCTIONS (für andere Router)
# =============================================================================

async def run_compliance_check_internal(text: str, use_openai: bool = False) -> dict:
    """
    Interne Funktion für Compliance-Checks aus anderen Routern.
    
    Args:
        text: Text, der geprüft werden soll
        use_openai: Ob OpenAI Moderation API verwendet werden soll
        
    Returns:
        Dict mit is_compliant, issues, filtered_text, action_taken
    """
    try:
        result = await compliance_service.check_compliance(
            text=text,
            use_openai=use_openai
        )
        return result
    except Exception as e:
        logger.warning(f"Internal compliance check failed: {e}")
        # Fallback: Passieren lassen aber loggen
        return {
            "is_compliant": True,
            "issues": [],
            "filtered_text": text,
            "action_taken": "passed_with_warning"
        }


__all__ = [
    "router",
    "run_compliance_check_internal",
    "ComplianceCheckRequest",
    "ComplianceCheckResponse",
]