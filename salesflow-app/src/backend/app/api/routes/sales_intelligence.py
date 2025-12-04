"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES INTELLIGENCE API ROUTES v3.0                                        ║
║  Endpoints für Multi-Language, Buyer Psychology, Frameworks, Industries   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser

from ..schemas.sales_intelligence import (
    # Language
    LanguageDetectionRequest,
    LanguageDetectionResponse,
    CulturalProfileResponse,
    LocalizedTemplateRequest,
    LocalizedTemplateResponse,
    LanguageCode,
    # Buyer Psychology
    BuyerProfileRequest,
    BuyerProfileResponse,
    BuyerTypeInfoResponse,
    ObjectionByBuyerTypeRequest,
    ObjectionByBuyerTypeResponse,
    BuyerType,
    BuyingStage,
    # Frameworks
    FrameworkRecommendationRequest,
    FrameworkRecommendationResponse,
    FrameworkInfoResponse,
    FrameworkPromptRequest,
    FrameworkPromptResponse,
    ObjectionByFrameworkRequest,
    ObjectionByFrameworkResponse,
    FrameworkType,
    # Industries
    IndustryInfoResponse,
    IndustryListItem,
    IndustryPromptResponse,
    IndustryObjectionRequest,
    IndustryObjectionResponse,
    IndustryType,
    # Momentum
    MomentumCalculationRequest,
    MomentumScoreResponse,
    MomentumSignalInput,
    # Micro-Coaching
    MicroCoachingRequest,
    MicroCoachingResponse,
    # Phone Mode
    PhoneModeStartRequest,
    PhoneModeCoachingResponse,
    # Competitive
    CompetitorMentionRequest,
    CompetitorHandlingResponse,
    # A/B Testing
    ABTestCreateRequest,
    ABTestResponse,
    ABTestResultRequest,
    # Analytics
    FrameworkEffectivenessRequest,
    FrameworkEffectivenessResponse,
    FrameworkEffectivenessItem,
    BuyerTypeEffectivenessResponse,
    BuyerTypeEffectivenessItem,
    IndustryEffectivenessResponse,
    IndustryEffectivenessItem,
)

from ...config.prompts import (
    # Multi-Language
    get_cultural_profile,
    build_multilang_prompt,
    get_localized_template,
    CULTURAL_PROFILES,
    # Buyer Psychology
    get_buyer_type_profile,
    get_buying_stage_info,
    build_buyer_profile_prompt,
    build_adapted_response_prompt,
    get_objection_response_by_buyer_type,
    BUYER_TYPE_PROFILES,
    BUYING_STAGES,
    # Frameworks
    get_framework,
    build_framework_prompt,
    recommend_framework,
    get_framework_questions,
    get_objection_response_by_framework,
    SALES_FRAMEWORKS,
    # Industries
    get_industry_profile,
    build_industry_prompt,
    get_industry_objection_response,
    list_all_industries,
    INDUSTRY_PROFILES,
    # Advanced
    build_phone_mode_prompt,
    build_competitive_prompt,
    calculate_momentum_score,
    get_micro_coaching_feedback,
    MomentumSignal,
)

router = APIRouter(prefix="/sales-intelligence", tags=["Sales Intelligence v3.0"])


# =============================================================================
# LANGUAGE ENDPOINTS
# =============================================================================

@router.get("/languages", response_model=List[dict])
async def get_supported_languages():
    """Liste aller unterstützten Sprachen und Kulturen"""
    return [
        {
            "code": code,
            "name": profile.language_name,
            "formality_default": profile.formality_default,
            "directness": profile.directness,
        }
        for code, profile in CULTURAL_PROFILES.items()
    ]


@router.get("/languages/{language_code}", response_model=CulturalProfileResponse)
async def get_language_profile(language_code: str):
    """Holt das kulturelle Profil für eine Sprache"""
    profile = get_cultural_profile(language_code)
    return CulturalProfileResponse(
        language_code=profile.language_code,
        language_name=profile.language_name,
        formality_default=profile.formality_default,
        directness=profile.directness,
        relationship_first=profile.relationship_first,
        urgency_acceptable=profile.urgency_acceptable,
        small_talk_expected=profile.small_talk_expected,
        emoji_tolerance=profile.emoji_tolerance,
        typical_objection_style=profile.typical_objection_style,
        trust_building_approach=profile.trust_building_approach,
        closing_style=profile.closing_style,
    )


@router.post("/languages/detect", response_model=LanguageDetectionResponse)
async def detect_language(request: LanguageDetectionRequest):
    """Erkennt die Sprache eines Textes (simplified - in production würde Claude verwendet)"""
    text = request.text.lower()
    
    # Simple heuristic detection (in production: Claude API call)
    if any(w in text for w in ["servus", "grüß gott", "passt", "schau"]):
        return LanguageDetectionResponse(
            language_code="de",
            regional_variant="de-at",
            formality_detected="casual",
            dialect_markers=["servus", "passt"],
            confidence=0.85,
        )
    elif any(w in text for w in ["grüezi", "merci", "gäll"]):
        return LanguageDetectionResponse(
            language_code="de",
            regional_variant="de-ch",
            formality_detected="formal",
            dialect_markers=["grüezi"],
            confidence=0.85,
        )
    elif any(w in text for w in ["hey", "hi", "awesome", "great"]):
        return LanguageDetectionResponse(
            language_code="en",
            regional_variant="en-us",
            formality_detected="casual",
            dialect_markers=[],
            confidence=0.80,
        )
    elif any(w in text for w in ["hola", "qué tal", "vale"]):
        return LanguageDetectionResponse(
            language_code="es",
            regional_variant="es",
            formality_detected="casual",
            dialect_markers=[],
            confidence=0.80,
        )
    else:
        return LanguageDetectionResponse(
            language_code="de",
            regional_variant=None,
            formality_detected="semi_formal",
            dialect_markers=[],
            confidence=0.70,
        )


@router.post("/languages/template", response_model=LocalizedTemplateResponse)
async def get_localized_template_endpoint(request: LocalizedTemplateRequest):
    """Holt ein lokalisiertes Template"""
    template_text = get_localized_template(
        template_key=request.template_key,
        language_code=request.language_code,
        lead_name=request.lead_name,
    )
    
    if not template_text:
        raise HTTPException(status_code=404, detail=f"Template '{request.template_key}' not found")
    
    return LocalizedTemplateResponse(
        template_key=request.template_key,
        language_code=request.language_code,
        template_text=template_text,
    )


# =============================================================================
# BUYER PSYCHOLOGY ENDPOINTS
# =============================================================================

@router.get("/buyer-types", response_model=List[BuyerTypeInfoResponse])
async def get_all_buyer_types():
    """Liste aller Buyer Types mit Details"""
    result = []
    for bt_id, bt in BUYER_TYPE_PROFILES.items():
        result.append(BuyerTypeInfoResponse(
            buyer_type=bt_id,
            name=bt["name"],
            emoji=bt["emoji"],
            characteristics=bt["characteristics"],
            communication_do=bt["communication_style"]["do"],
            communication_dont=bt["communication_style"]["dont"],
            ideal_pitch=bt["ideal_pitch"],
            objection_handling=bt["objection_handling"],
            closing_approach=bt["closing_approach"],
            typical_questions=bt["typical_questions"],
        ))
    return result


@router.get("/buyer-types/{buyer_type}", response_model=BuyerTypeInfoResponse)
async def get_buyer_type_info(buyer_type: BuyerType):
    """Holt Details zu einem Buyer Type"""
    bt = get_buyer_type_profile(buyer_type.value)
    return BuyerTypeInfoResponse(
        buyer_type=buyer_type,
        name=bt["name"],
        emoji=bt["emoji"],
        characteristics=bt["characteristics"],
        communication_do=bt["communication_style"]["do"],
        communication_dont=bt["communication_style"]["dont"],
        ideal_pitch=bt["ideal_pitch"],
        objection_handling=bt["objection_handling"],
        closing_approach=bt["closing_approach"],
        typical_questions=bt["typical_questions"],
    )


@router.post("/buyer-types/objection", response_model=ObjectionByBuyerTypeResponse)
async def get_objection_by_buyer_type(request: ObjectionByBuyerTypeRequest):
    """Holt Einwandbehandlung für einen Buyer Type"""
    response = get_objection_response_by_buyer_type(
        buyer_type=request.buyer_type.value,
        objection_type=request.objection_type,
    )
    return ObjectionByBuyerTypeResponse(
        buyer_type=request.buyer_type,
        objection_type=request.objection_type,
        strategy=response["strategy"],
        example=response["example"],
    )


@router.get("/buying-stages", response_model=List[dict])
async def get_all_buying_stages():
    """Liste aller Buying Stages mit Details"""
    return [
        {
            "id": stage_id,
            "name": stage["name"],
            "description": stage["description"],
            "signals": stage["signals"],
            "strategy": stage["strategy"],
            "content_types": stage["content_types"],
            "avoid": stage["avoid"],
        }
        for stage_id, stage in BUYING_STAGES.items()
    ]


@router.post("/buyer-profile/analyze")
async def analyze_buyer_profile(request: BuyerProfileRequest):
    """
    Analysiert einen Chat und erstellt ein Buyer Profile.
    In Production: Claude API Call mit build_buyer_profile_prompt()
    """
    # Build the prompt (would be sent to Claude in production)
    prompt = build_buyer_profile_prompt(
        chat_text=request.chat_text,
        context=request.context,
    )
    
    # Simplified response (in production: Claude API response parsing)
    return {
        "prompt_generated": True,
        "prompt_preview": prompt[:500] + "...",
        "note": "In Production wird dieser Prompt an Claude gesendet für echte Analyse",
    }


@router.get("/buyer-profile/adapted-prompt")
async def get_adapted_prompt(
    buyer_type: BuyerType,
    buying_stage: BuyingStage,
    message_intent: str = Query(default="follow_up"),
):
    """Holt einen an Buyer Type angepassten Prompt-Abschnitt"""
    prompt_section = build_adapted_response_prompt(
        buyer_type=buyer_type.value,
        buying_stage=buying_stage.value,
        message_intent=message_intent,
    )
    return {"prompt_section": prompt_section}


# =============================================================================
# SALES FRAMEWORKS ENDPOINTS
# =============================================================================

@router.get("/frameworks", response_model=List[FrameworkInfoResponse])
async def get_all_frameworks():
    """Liste aller Sales Frameworks"""
    result = []
    for fw_id, fw in SALES_FRAMEWORKS.items():
        result.append(FrameworkInfoResponse(
            id=fw.id,
            name=fw.name,
            best_for=fw.best_for,
            core_principle=fw.core_principle,
            stages=fw.stages,
            key_questions=fw.key_questions,
            common_mistakes=fw.common_mistakes,
        ))
    return result


@router.get("/frameworks/{framework_id}", response_model=FrameworkInfoResponse)
async def get_framework_info(framework_id: FrameworkType):
    """Holt Details zu einem Framework"""
    fw = get_framework(framework_id.value)
    return FrameworkInfoResponse(
        id=fw.id,
        name=fw.name,
        best_for=fw.best_for,
        core_principle=fw.core_principle,
        stages=fw.stages,
        key_questions=fw.key_questions,
        common_mistakes=fw.common_mistakes,
    )


@router.post("/frameworks/recommend", response_model=FrameworkRecommendationResponse)
async def recommend_framework_endpoint(request: FrameworkRecommendationRequest):
    """Empfiehlt das beste Framework für eine Situation"""
    recommended = recommend_framework(
        deal_size=request.deal_size,
        sales_cycle=request.sales_cycle,
        lead_type=request.lead_type,
        situation=request.situation,
    )
    
    # Get alternatives
    all_frameworks = list(SALES_FRAMEWORKS.keys())
    alternatives = [f for f in all_frameworks if f != recommended][:2]
    
    return FrameworkRecommendationResponse(
        recommended_framework=recommended,
        reasoning=f"Basierend auf Deal Size: {request.deal_size}, Cycle: {request.sales_cycle}",
        alternatives=alternatives,
    )


@router.post("/frameworks/prompt", response_model=FrameworkPromptResponse)
async def get_framework_prompt(request: FrameworkPromptRequest):
    """Holt einen Framework-spezifischen Prompt"""
    prompt = build_framework_prompt(
        framework_id=request.framework_id.value,
        current_stage=request.current_stage,
        lead_context=request.lead_context,
    )
    questions = get_framework_questions(
        framework_id=request.framework_id.value,
        stage=request.current_stage,
    )
    fw = get_framework(request.framework_id.value)
    
    return FrameworkPromptResponse(
        framework_id=request.framework_id.value,
        framework_name=fw.name,
        prompt_section=prompt,
        stage_questions=questions,
    )


@router.post("/frameworks/objection", response_model=ObjectionByFrameworkResponse)
async def get_objection_by_framework(request: ObjectionByFrameworkRequest):
    """Holt Einwandbehandlung nach Framework"""
    response = get_objection_response_by_framework(
        framework_id=request.framework_id.value,
        objection_type=request.objection_type,
    )
    return ObjectionByFrameworkResponse(
        framework_id=request.framework_id.value,
        objection_type=request.objection_type,
        response=response,
    )


# =============================================================================
# INDUSTRIES ENDPOINTS
# =============================================================================

@router.get("/industries", response_model=List[IndustryListItem])
async def get_all_industries():
    """Liste aller Branchen"""
    return list_all_industries()


@router.get("/industries/{industry_id}", response_model=IndustryInfoResponse)
async def get_industry_info(industry_id: IndustryType):
    """Holt Details zu einer Branche"""
    profile = get_industry_profile(industry_id.value)
    return IndustryInfoResponse(
        id=profile.id,
        name=profile.name,
        description=profile.description,
        typical_sales_cycle=profile.typical_sales_cycle,
        avg_deal_size=profile.avg_deal_size,
        key_decision_factors=profile.key_decision_factors,
        typical_objections=profile.typical_objections,
        compliance_rules=profile.compliance_rules,
        recommended_frameworks=profile.recommended_frameworks,
        buyer_personas=profile.buyer_personas,
        communication_style=profile.communication_style,
        trust_builders=profile.trust_builders,
        red_flags=profile.red_flags,
    )


@router.get("/industries/{industry_id}/prompt", response_model=IndustryPromptResponse)
async def get_industry_prompt_endpoint(industry_id: IndustryType):
    """Holt branchenspezifischen Prompt"""
    prompt = build_industry_prompt(industry_id.value)
    profile = get_industry_profile(industry_id.value)
    return IndustryPromptResponse(
        industry_id=industry_id.value,
        industry_name=profile.name,
        prompt_section=prompt,
    )


@router.post("/industries/objection", response_model=IndustryObjectionResponse)
async def get_industry_objection(request: IndustryObjectionRequest):
    """Holt branchenspezifische Einwandbehandlung"""
    response = get_industry_objection_response(
        industry_id=request.industry_id.value,
        objection_type=request.objection_type,
    )
    return IndustryObjectionResponse(
        industry_id=request.industry_id.value,
        objection_type=request.objection_type,
        strategy=response.get("strategy", ""),
        example=response.get("example", ""),
    )


# =============================================================================
# MOMENTUM ENDPOINTS
# =============================================================================

@router.post("/momentum/calculate", response_model=MomentumScoreResponse)
async def calculate_momentum(request: MomentumCalculationRequest):
    """Berechnet den Momentum Score für einen Lead"""
    # Convert to internal format
    signals = [
        MomentumSignal(
            type=s.type,
            signal=s.signal,
            weight=s.weight,
            timestamp=datetime.now(),  # In production: from database
            description=s.description,
        )
        for s in request.signals
    ]
    
    result = calculate_momentum_score(signals)
    
    # Generate alert if needed
    alert = None
    if result["score"] < 3:
        alert = f"🚨 Low Momentum Alert! Score: {result['score']}. Re-Engagement empfohlen."
    elif result["trend"] == "declining":
        alert = f"⚠️ Momentum sinkt. Trend: {result['trend']}. Engagement prüfen."
    
    return MomentumScoreResponse(
        lead_id=request.lead_id,
        score=result["score"],
        trend=result["trend"],
        recommendation=result["recommendation"],
        signals_count=result["signals_count"],
        positive_signals=result["positive_signals"],
        negative_signals=result["negative_signals"],
        alert=alert,
    )


# =============================================================================
# MICRO-COACHING ENDPOINTS
# =============================================================================

@router.post("/coaching/micro", response_model=MicroCoachingResponse)
async def get_micro_coaching(request: MicroCoachingRequest):
    """Holt Micro-Coaching Feedback für eine Aktion"""
    feedback = get_micro_coaching_feedback(
        action_type=request.action_type,
        context=request.context,
    )
    
    # Determine feedback type
    if feedback.startswith("✅") or feedback.startswith("🏆"):
        feedback_type = "positive"
    elif feedback.startswith("⚠️") or feedback.startswith("🔴"):
        feedback_type = "warning"
    else:
        feedback_type = "tip"
    
    return MicroCoachingResponse(
        feedback=feedback,
        feedback_type=feedback_type,
    )


# =============================================================================
# PHONE MODE ENDPOINTS
# =============================================================================

@router.post("/phone-mode/start")
async def start_phone_mode(request: PhoneModeStartRequest):
    """Startet den Phone Mode für einen Call"""
    prompt = build_phone_mode_prompt()
    return {
        "session_id": str(uuid.uuid4()),
        "lead_id": request.lead_id,
        "lead_name": request.lead_name,
        "call_type": request.call_type,
        "phone_mode_prompt": prompt,
        "status": "active",
    }


@router.post("/phone-mode/coaching")
async def get_phone_coaching(
    transcript_segment: str,
    call_phase: str = Query(default="discovery"),
):
    """
    Holt Live-Coaching basierend auf Transkript-Segment.
    In Production: Real-time Claude API call.
    """
    # Simplified heuristics (in production: Claude analyzes transcript)
    transcript_lower = transcript_segment.lower()
    
    if "zu teuer" in transcript_lower or "preis" in transcript_lower:
        return PhoneModeCoachingResponse(
            tag="⚠️ [EINWAND]",
            coaching="Preis-Einwand. Sag: 'Verstehe ich. Auf den Tag gerechnet sind das etwa X€.'",
            urgency="high",
        )
    elif "interessant" in transcript_lower or "spannend" in transcript_lower:
        return PhoneModeCoachingResponse(
            tag="🎯 [SIGNAL]",
            coaching="Positives Signal! Jetzt vertiefen: 'Was genau findest du interessant?'",
            urgency="medium",
        )
    elif "keine zeit" in transcript_lower:
        return PhoneModeCoachingResponse(
            tag="⚠️ [EINWAND]",
            coaching="Zeit-Einwand. Sag: '10 Minuten die dir X Stunden sparen. Wann passt es besser?'",
            urgency="high",
        )
    else:
        return PhoneModeCoachingResponse(
            tag="💡 [TIPP]",
            coaching="Stelle eine offene Frage um mehr zu erfahren.",
            urgency="low",
        )


# =============================================================================
# COMPETITIVE INTELLIGENCE ENDPOINTS
# =============================================================================

@router.post("/competitive/handle", response_model=CompetitorHandlingResponse)
async def handle_competitor_mention(request: CompetitorMentionRequest):
    """Holt Strategie für Wettbewerber-Erwähnung"""
    
    # Build competitive prompt
    prompt = build_competitive_prompt(
        competitor_name=request.competitor_name,
    )
    
    # Response templates by mention type
    templates = {
        "lock": f"Ah, {request.competitor_name} ist gut für [X]. Was wir anders machen ist [Y]. Wäre ein Vergleich interessant?",
        "price": f"Verstehe. Bei den reinen Kosten stimmt das. Was uns unterscheidet ist [Value]. Macht das Sinn?",
        "feature": f"Stimmt, das haben sie. Unser Ansatz ist [Alternative]. Viele sagen, das funktioniert sogar besser.",
        "third_party": "Ich respektiere die Meinung. Darf ich dir zeigen, was uns unterscheidet?",
    }
    
    return CompetitorHandlingResponse(
        competitor_name=request.competitor_name,
        strategy=f"Handle '{request.mention_type}' mention professionally",
        response_template=templates.get(request.mention_type, templates["lock"]),
        do=[
            "Frag was der Kunde an ihnen mag",
            "Differenziere über Mehrwert",
            "Sei respektvoll",
        ],
        dont=[
            "Wettbewerber schlecht machen",
            "Defensiv werden",
            "Features vergleichen ohne Kontext",
        ],
    )


# =============================================================================
# A/B TESTING ENDPOINTS (Database-backed)
# =============================================================================

def _determine_winner(test: dict) -> Optional[str]:
    """Bestimmt den Gewinner eines A/B Tests"""
    a_count = test.get("variant_a_count", 0) or 0
    b_count = test.get("variant_b_count", 0) or 0
    
    if a_count < 30 or b_count < 30:
        return None  # Not enough data
    
    rate_a = (test.get("variant_a_conversions", 0) or 0) / a_count
    rate_b = (test.get("variant_b_conversions", 0) or 0) / b_count
    
    if abs(rate_a - rate_b) < 0.05:
        return None  # Too close
    
    return "a" if rate_a > rate_b else "b"


@router.post("/ab-tests", response_model=ABTestResponse)
async def create_ab_test(
    request: ABTestCreateRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Erstellt einen neuen A/B Test (DB-basiert)"""
    now = datetime.now()
    
    test_data = {
        "user_id": current_user.id,
        "company_id": getattr(current_user, "company_id", None),
        "name": request.name,
        "description": request.description,
        "test_type": request.test_type,
        "variant_a": request.variant_a,
        "variant_b": request.variant_b,
        "target_metric": request.target_metric,
        "target_industry": request.target_industry,
        "target_buyer_type": request.target_buyer_type,
        "status": "running",
        "started_at": now.isoformat(),
    }
    
    result = db.table("ab_tests").insert(test_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create A/B test")
    
    test = result.data[0]
    
    return ABTestResponse(
        id=test["id"],
        name=test["name"],
        test_type=test["test_type"],
        variant_a=test["variant_a"],
        variant_b=test["variant_b"],
        variant_a_count=0,
        variant_b_count=0,
        variant_a_conversions=0,
        variant_b_conversions=0,
        variant_a_rate=0.0,
        variant_b_rate=0.0,
        winner=None,
        statistical_significance=0.0,
        status="running",
        created_at=now,
        updated_at=now,
    )


@router.get("/ab-tests", response_model=List[ABTestResponse])
async def get_all_ab_tests(
    status: Optional[str] = Query(None),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Liste aller A/B Tests (DB-basiert)"""
    query = db.table("ab_tests").select("*").eq("user_id", current_user.id)
    
    if status:
        query = query.eq("status", status)
    
    result = query.order("created_at", desc=True).execute()
    
    tests = []
    for t in result.data or []:
        a_count = t.get("variant_a_count", 0) or 0
        b_count = t.get("variant_b_count", 0) or 0
        a_conv = t.get("variant_a_conversions", 0) or 0
        b_conv = t.get("variant_b_conversions", 0) or 0
        
        tests.append(ABTestResponse(
            id=t["id"],
            name=t["name"],
            test_type=t["test_type"],
            variant_a=t["variant_a"],
            variant_b=t["variant_b"],
            variant_a_count=a_count,
            variant_b_count=b_count,
            variant_a_conversions=a_conv,
            variant_b_conversions=b_conv,
            variant_a_rate=a_conv / max(a_count, 1),
            variant_b_rate=b_conv / max(b_count, 1),
            winner=_determine_winner(t),
            statistical_significance=t.get("statistical_significance", 0) or 0,
            status=t["status"],
            created_at=t["created_at"],
            updated_at=t["updated_at"],
        ))
    
    return tests


@router.get("/ab-tests/{test_id}", response_model=ABTestResponse)
async def get_ab_test(
    test_id: str,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt einen einzelnen A/B Test"""
    result = db.table("ab_tests").select("*").eq("id", test_id).eq(
        "user_id", current_user.id
    ).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Test not found")
    
    t = result.data
    a_count = t.get("variant_a_count", 0) or 0
    b_count = t.get("variant_b_count", 0) or 0
    a_conv = t.get("variant_a_conversions", 0) or 0
    b_conv = t.get("variant_b_conversions", 0) or 0
    
    return ABTestResponse(
        id=t["id"],
        name=t["name"],
        test_type=t["test_type"],
        variant_a=t["variant_a"],
        variant_b=t["variant_b"],
        variant_a_count=a_count,
        variant_b_count=b_count,
        variant_a_conversions=a_conv,
        variant_b_conversions=b_conv,
        variant_a_rate=a_conv / max(a_count, 1),
        variant_b_rate=b_conv / max(b_count, 1),
        winner=_determine_winner(t),
        statistical_significance=t.get("statistical_significance", 0) or 0,
        status=t["status"],
        created_at=t["created_at"],
        updated_at=t["updated_at"],
    )


@router.post("/ab-tests/{test_id}/result")
async def log_ab_test_result(
    test_id: str,
    request: ABTestResultRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Loggt ein Ergebnis für einen A/B Test (DB-basiert)"""
    # Prüfen ob Test existiert
    test_result = db.table("ab_tests").select("id").eq("id", test_id).eq(
        "user_id", current_user.id
    ).single().execute()
    
    if not test_result.data:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Result einfügen
    result_data = {
        "test_id": test_id,
        "variant": request.variant,
        "converted": request.converted,
        "lead_id": getattr(request, "lead_id", None),
        "user_id": current_user.id,
    }
    
    db.table("ab_test_results").insert(result_data).execute()
    
    # Counter atomar updaten
    if request.variant == "a":
        db.rpc("increment_ab_test_counter", {
            "p_test_id": test_id,
            "p_variant": "a",
            "p_converted": request.converted
        }).execute()
    else:
        db.rpc("increment_ab_test_counter", {
            "p_test_id": test_id,
            "p_variant": "b",
            "p_converted": request.converted
        }).execute()
    
    return {"status": "logged", "test_id": test_id}


@router.patch("/ab-tests/{test_id}/status")
async def update_ab_test_status(
    test_id: str,
    status: str = Query(..., pattern="^(running|paused|completed|archived)$"),
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Aktualisiert den Status eines A/B Tests"""
    update_data = {
        "status": status,
        "updated_at": datetime.now().isoformat(),
    }
    
    if status == "completed":
        update_data["completed_at"] = datetime.now().isoformat()
    
    result = db.table("ab_tests").update(update_data).eq("id", test_id).eq(
        "user_id", current_user.id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {"status": "updated", "new_status": status}


# =============================================================================
# ANALYTICS ENDPOINTS (Database-backed)
# =============================================================================

FRAMEWORK_NAMES = {
    "spin": "SPIN Selling",
    "challenger": "Challenger Sale",
    "solution": "Solution Selling",
    "gap": "GAP Selling",
    "sandler": "Sandler",
    "meddic": "MEDDIC",
    "bant": "BANT",
    "value": "Value Selling",
}

@router.get("/analytics/framework-effectiveness", response_model=FrameworkEffectivenessResponse)
async def get_framework_effectiveness(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Analysiert die Effectiveness aller Frameworks (DB-basiert)"""
    now = datetime.now()
    start = start_date or (now - timedelta(days=30))
    end = end_date or now
    
    # Daten aus DB holen
    result = db.table("framework_usage_stats").select("*").eq(
        "user_id", current_user.id
    ).gte("date", start.date().isoformat()).lte(
        "date", end.date().isoformat()
    ).execute()
    
    # Aggregieren nach Framework
    framework_data = {}
    for row in result.data or []:
        fw_id = row["framework_id"]
        if fw_id not in framework_data:
            framework_data[fw_id] = {
                "total_uses": 0,
                "conversions": 0,
                "deals_closed": 0,
                "total_deal_value": 0,
                "time_to_close": [],
                "buyer_types": {},
                "industries": {},
            }
        
        fd = framework_data[fw_id]
        fd["total_uses"] += row.get("total_uses", 0) or 0
        fd["conversions"] += row.get("conversions", 0) or 0
        fd["deals_closed"] += row.get("deals_closed", 0) or 0
        fd["total_deal_value"] += float(row.get("total_deal_value", 0) or 0)
        
        if row.get("avg_time_to_close_days"):
            fd["time_to_close"].append(row["avg_time_to_close_days"])
        
        # Merge buyer type / industry stats
        for bt, count in (row.get("by_buyer_type") or {}).items():
            fd["buyer_types"][bt] = fd["buyer_types"].get(bt, 0) + count
        for ind, count in (row.get("by_industry") or {}).items():
            fd["industries"][ind] = fd["industries"].get(ind, 0) + count
    
    # Frameworks bauen
    frameworks = []
    for fw_id, data in framework_data.items():
        total = data["total_uses"]
        conv = data["conversions"]
        
        # Best buyer types
        best_bt = sorted(data["buyer_types"].items(), key=lambda x: x[1], reverse=True)[:2]
        best_ind = sorted(data["industries"].items(), key=lambda x: x[1], reverse=True)[:2]
        
        frameworks.append(FrameworkEffectivenessItem(
            framework_id=fw_id,
            framework_name=FRAMEWORK_NAMES.get(fw_id, fw_id.title()),
            total_uses=total,
            conversions=conv,
            conversion_rate=conv / max(total, 1),
            avg_deal_value=data["total_deal_value"] / max(data["deals_closed"], 1),
            avg_time_to_close_days=sum(data["time_to_close"]) // max(len(data["time_to_close"]), 1) if data["time_to_close"] else None,
            best_for_buyer_types=[bt for bt, _ in best_bt],
            best_for_industries=[ind for ind, _ in best_ind],
        ))
    
    # Fallback: Demo-Daten wenn keine DB-Einträge
    if not frameworks:
        frameworks = [
            FrameworkEffectivenessItem(
                framework_id="spin", framework_name="SPIN Selling",
                total_uses=0, conversions=0, conversion_rate=0.0,
                avg_deal_value=0, avg_time_to_close_days=0,
                best_for_buyer_types=[], best_for_industries=[],
            ),
        ]
    
    # Sort by conversion rate
    frameworks.sort(key=lambda x: x.conversion_rate, reverse=True)
    
    # Insights generieren
    insights = []
    if frameworks and frameworks[0].total_uses > 0:
        insights.append(f"🏆 Top Framework: {frameworks[0].framework_name} mit {frameworks[0].conversion_rate*100:.0f}% Conversion")
        best_value = max(frameworks, key=lambda x: x.avg_deal_value or 0)
        if best_value.avg_deal_value:
            insights.append(f"💰 Höchster Deal Value: {best_value.framework_name}")
        fastest = min((f for f in frameworks if f.avg_time_to_close_days), key=lambda x: x.avg_time_to_close_days, default=None)
        if fastest:
            insights.append(f"⚡ Schnellster Close: {fastest.framework_name}")
    else:
        insights.append("📊 Noch keine Framework-Daten. Nutze Frameworks um Statistiken zu sammeln!")
    
    return FrameworkEffectivenessResponse(
        period_start=start,
        period_end=end,
        total_deals=sum(f.total_uses for f in frameworks),
        frameworks=frameworks,
        top_framework=frameworks[0].framework_id if frameworks else "spin",
        insights=insights,
    )


@router.get("/analytics/buyer-type-effectiveness", response_model=BuyerTypeEffectivenessResponse)
async def get_buyer_type_effectiveness(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Analysiert die Effectiveness nach Buyer Type (DB-basiert)"""
    now = datetime.now()
    start = start_date or (now - timedelta(days=30))
    end = end_date or now
    
    # Daten aus DB holen
    result = db.table("buyer_type_stats").select("*").eq(
        "user_id", current_user.id
    ).gte("date", start.date().isoformat()).lte(
        "date", end.date().isoformat()
    ).execute()
    
    # Aggregieren nach Buyer Type
    bt_data = {}
    for row in result.data or []:
        bt = row["buyer_type"]
        if bt not in bt_data:
            bt_data[bt] = {
                "total_leads": 0,
                "conversions": 0,
                "total_touchpoints": 0,
                "best_framework": None,
            }
        
        bd = bt_data[bt]
        bd["total_leads"] += row.get("total_leads", 0) or 0
        bd["conversions"] += row.get("conversions", 0) or 0
        bd["total_touchpoints"] += row.get("total_touchpoints", 0) or 0
        if row.get("best_framework"):
            bd["best_framework"] = row["best_framework"]
    
    # Buyer Types bauen
    buyer_types = []
    for bt, data in bt_data.items():
        total = data["total_leads"]
        conv = data["conversions"]
        
        try:
            bt_enum = BuyerType(bt)
        except ValueError:
            continue
        
        buyer_types.append(BuyerTypeEffectivenessItem(
            buyer_type=bt_enum,
            total_leads=total,
            conversions=conv,
            conversion_rate=conv / max(total, 1),
            best_framework=data["best_framework"],
            avg_touchpoints=data["total_touchpoints"] / max(total, 1),
        ))
    
    # Fallback wenn keine Daten
    if not buyer_types:
        buyer_types = [
            BuyerTypeEffectivenessItem(
                buyer_type=BuyerType.DRIVER, total_leads=0, conversions=0,
                conversion_rate=0.0, best_framework=None, avg_touchpoints=0,
            ),
        ]
    
    # Sort by conversion rate
    buyer_types.sort(key=lambda x: x.conversion_rate, reverse=True)
    
    # Insights generieren
    insights = []
    if buyer_types and buyer_types[0].total_leads > 0:
        best = buyer_types[0]
        insights.append(f"🎯 {best.buyer_type.value.title()} konvertieren am besten ({best.conversion_rate*100:.0f}%)")
        most_touches = max(buyer_types, key=lambda x: x.avg_touchpoints)
        insights.append(f"🧮 {most_touches.buyer_type.value.title()} brauchen mehr Touchpoints ({most_touches.avg_touchpoints:.1f})")
    else:
        insights.append("📊 Noch keine Buyer-Type-Daten. Analysiere Leads um Statistiken zu sammeln!")
    
    return BuyerTypeEffectivenessResponse(
        period_start=start,
        period_end=end,
        buyer_types=buyer_types,
        insights=insights,
    )


@router.get("/analytics/industry-effectiveness", response_model=IndustryEffectivenessResponse)
async def get_industry_effectiveness(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Analysiert die Effectiveness nach Industry (DB-basiert)"""
    now = datetime.now()
    start = start_date or (now - timedelta(days=30))
    end = end_date or now
    
    # Daten aus DB holen
    result = db.table("industry_stats").select("*").eq(
        "user_id", current_user.id
    ).gte("date", start.date().isoformat()).lte(
        "date", end.date().isoformat()
    ).execute()
    
    # Aggregieren nach Industry
    ind_data = {}
    for row in result.data or []:
        ind_id = row["industry_id"]
        if ind_id not in ind_data:
            ind_data[ind_id] = {
                "industry_name": row.get("industry_name") or ind_id.replace("_", " ").title(),
                "total_deals": 0,
                "conversions": 0,
                "total_deal_value": 0,
                "best_framework": None,
                "best_buyer_approach": None,
            }
        
        data = ind_data[ind_id]
        data["total_deals"] += row.get("total_deals", 0) or 0
        data["conversions"] += row.get("conversions", 0) or 0
        data["total_deal_value"] += float(row.get("total_deal_value", 0) or 0)
        if row.get("best_framework"):
            data["best_framework"] = row["best_framework"]
        if row.get("best_buyer_approach"):
            data["best_buyer_approach"] = row["best_buyer_approach"]
    
    # Industries bauen
    industries = []
    for ind_id, data in ind_data.items():
        total = data["total_deals"]
        conv = data["conversions"]
        
        industries.append(IndustryEffectivenessItem(
            industry_id=ind_id,
            industry_name=data["industry_name"],
            total_deals=total,
            conversions=conv,
            conversion_rate=conv / max(total, 1),
            best_framework=data["best_framework"],
            best_buyer_approach=data["best_buyer_approach"],
            avg_deal_size=data["total_deal_value"] / max(conv, 1),
        ))
    
    # Fallback wenn keine Daten
    if not industries:
        industries = [
            IndustryEffectivenessItem(
                industry_id="default", industry_name="Keine Daten",
                total_deals=0, conversions=0, conversion_rate=0.0,
                best_framework=None, best_buyer_approach=None, avg_deal_size=0,
            ),
        ]
    
    # Sort by conversion rate
    industries.sort(key=lambda x: x.conversion_rate, reverse=True)
    
    # Insights generieren
    insights = []
    if industries and industries[0].total_deals > 0:
        best = industries[0]
        insights.append(f"🚀 {best.industry_name} führt mit {best.conversion_rate*100:.0f}% Conversion")
        best_value = max(industries, key=lambda x: x.avg_deal_size or 0)
        if best_value.avg_deal_size:
            insights.append(f"💰 Höchster Deal Size: {best_value.industry_name} ({best_value.avg_deal_size:,.0f}€)")
        if best.best_framework:
            insights.append(f"📈 {best.best_framework.upper()} funktioniert besonders gut")
    else:
        insights.append("📊 Noch keine Branchen-Daten. Tagge Leads mit Branchen um Statistiken zu sammeln!")
    
    return IndustryEffectivenessResponse(
        period_start=start,
        period_end=end,
        industries=industries,
        insights=insights,
    )

