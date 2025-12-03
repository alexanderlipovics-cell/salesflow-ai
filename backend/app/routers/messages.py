"""
SALES FLOW AI - Message Recommendation API
CHIEF-powered message generation with compliance checking
"""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.core.auth_helper import get_current_user_id
from app.core.llm import call_chief_llm
from app.routers.compliance import run_compliance_check_internal

router = APIRouter(prefix="/api/messages", tags=["messages"])

# ============================================================================
# MODELS
# ============================================================================

class RecommendMessageRequest(BaseModel):
    lead_id: str
    company_id: str
    funnel_stage: str
    channel: str
    language_code: str
    use_case: str
    objection_key: Optional[str] = None
    preferred_style: Optional[str] = None
    disc_override: Optional[str] = None

class TemplateMeta(BaseModel):
    template_id: Optional[str] = None
    translation_id: Optional[str] = None
    funnel_stage: str
    channel: str
    disc_target: Optional[str] = None
    source: str

class ComplianceViolation(BaseModel):
    category: str
    severity: str
    message: str
    rule_id: Optional[str] = None

class RecommendMessageResponse(BaseModel):
    template_body: str
    meta: TemplateMeta
    compliance_status: str  # 'ok','warn','block'
    violations: list[ComplianceViolation] = []
    safe_text: Optional[str] = None

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/recommend", response_model=RecommendMessageResponse)
async def recommend_message(
    payload: RecommendMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Get AI-recommended message with compliance check"""
    supabase = get_supabase_client()
    
    # Get lead data
    try:
        lead = (
            supabase.table("leads")
            .select("id,name,disc_primary,language_code,stage")
            .eq("id", payload.lead_id)
            .single()
            .execute()
        ).data
    except Exception as e:
        lead = {
            "id": payload.lead_id,
            "name": None,
            "disc_primary": None,
            "language_code": payload.language_code,
            "stage": payload.funnel_stage,
        }
    
    disc_type = payload.disc_override or lead.get("disc_primary")
    
    # Call CHIEF LLM
    chief_payload = {
        "lead": lead,
        "company_id": payload.company_id,
        "funnel_stage": payload.funnel_stage,
        "channel": payload.channel,
        "language_code": payload.language_code,
        "use_case": payload.use_case,
        "disc_type": disc_type,
        "objection_key": payload.objection_key,
        "preferred_style": payload.preferred_style,
    }
    chief_result = await call_chief_llm(chief_payload)
    
    raw_body = chief_result["template_body"]
    meta = chief_result.get("meta", {})
    
    # Get company for compliance
    try:
        company = (
            supabase.table("mlm_companies")
            .select("id,display_name,default_language")
            .eq("id", payload.company_id)
            .single()
            .execute()
        ).data
        default_language = company.get("default_language", payload.language_code)
    except:
        default_language = payload.language_code
    
    # Compliance check
    compliance = await run_compliance_check_internal(
        text=raw_body,
        company_id=payload.company_id,
        locale=payload.language_code or default_language,
        channel=payload.channel,
        user_id=user_id,
    )
    
    return RecommendMessageResponse(
        template_body=raw_body,
        meta=TemplateMeta(
            template_id=meta.get("template_id"),
            translation_id=meta.get("translation_id"),
            funnel_stage=payload.funnel_stage,
            channel=payload.channel,
            disc_target=disc_type,
            source=meta.get("source", "chief"),
        ),
        compliance_status=compliance["status"],
        violations=[
            ComplianceViolation(
                category=v["category"],
                severity=v["severity"],
                message=v["message"],
                rule_id=v.get("rule_id"),
            )
            for v in compliance.get("violations", [])
        ],
        safe_text=compliance.get("safe_text"),
    )
