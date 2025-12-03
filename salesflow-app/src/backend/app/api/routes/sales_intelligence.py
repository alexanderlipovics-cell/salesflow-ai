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
# A/B TESTING ENDPOINTS
# =============================================================================

# In-memory storage for demo (in production: database)
_ab_tests = {}
_ab_test_results = {}


@router.post("/ab-tests", response_model=ABTestResponse)
async def create_ab_test(request: ABTestCreateRequest):
    """Erstellt einen neuen A/B Test"""
    test_id = str(uuid.uuid4())
    now = datetime.now()
    
    test = {
        "id": test_id,
        "name": request.name,
        "description": request.description,
        "test_type": request.test_type,
        "variant_a": request.variant_a,
        "variant_b": request.variant_b,
        "target_metric": request.target_metric,
        "target_industry": request.target_industry,
        "target_buyer_type": request.target_buyer_type,
        "variant_a_count": 0,
        "variant_b_count": 0,
        "variant_a_conversions": 0,
        "variant_b_conversions": 0,
        "status": "running",
        "created_at": now,
        "updated_at": now,
    }
    
    _ab_tests[test_id] = test
    
    return ABTestResponse(
        id=test_id,
        name=request.name,
        test_type=request.test_type,
        variant_a=request.variant_a,
        variant_b=request.variant_b,
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
async def get_all_ab_tests():
    """Liste aller A/B Tests"""
    return [
        ABTestResponse(
            id=t["id"],
            name=t["name"],
            test_type=t["test_type"],
            variant_a=t["variant_a"],
            variant_b=t["variant_b"],
            variant_a_count=t["variant_a_count"],
            variant_b_count=t["variant_b_count"],
            variant_a_conversions=t["variant_a_conversions"],
            variant_b_conversions=t["variant_b_conversions"],
            variant_a_rate=t["variant_a_conversions"] / max(t["variant_a_count"], 1),
            variant_b_rate=t["variant_b_conversions"] / max(t["variant_b_count"], 1),
            winner=_determine_winner(t),
            statistical_significance=0.0,  # Would be calculated properly
            status=t["status"],
            created_at=t["created_at"],
            updated_at=t["updated_at"],
        )
        for t in _ab_tests.values()
    ]


@router.post("/ab-tests/{test_id}/result")
async def log_ab_test_result(test_id: str, request: ABTestResultRequest):
    """Loggt ein Ergebnis für einen A/B Test"""
    if test_id not in _ab_tests:
        raise HTTPException(status_code=404, detail="Test not found")
    
    test = _ab_tests[test_id]
    
    if request.variant == "a":
        test["variant_a_count"] += 1
        if request.converted:
            test["variant_a_conversions"] += 1
    else:
        test["variant_b_count"] += 1
        if request.converted:
            test["variant_b_conversions"] += 1
    
    test["updated_at"] = datetime.now()
    
    return {"status": "logged", "test_id": test_id}


def _determine_winner(test: dict) -> Optional[str]:
    """Bestimmt den Gewinner eines A/B Tests"""
    if test["variant_a_count"] < 30 or test["variant_b_count"] < 30:
        return None  # Not enough data
    
    rate_a = test["variant_a_conversions"] / test["variant_a_count"]
    rate_b = test["variant_b_conversions"] / test["variant_b_count"]
    
    if abs(rate_a - rate_b) < 0.05:
        return None  # Too close
    
    return "a" if rate_a > rate_b else "b"


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@router.get("/analytics/framework-effectiveness", response_model=FrameworkEffectivenessResponse)
async def get_framework_effectiveness(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    """Analysiert die Effectiveness aller Frameworks"""
    now = datetime.now()
    start = start_date or (now - timedelta(days=30))
    end = end_date or now
    
    # Demo data (in production: real database query)
    frameworks = [
        FrameworkEffectivenessItem(
            framework_id="spin",
            framework_name="SPIN Selling",
            total_uses=45,
            conversions=18,
            conversion_rate=0.40,
            avg_deal_value=8500,
            avg_time_to_close_days=21,
            best_for_buyer_types=["analytical", "amiable"],
            best_for_industries=["b2b_saas", "b2b_services"],
        ),
        FrameworkEffectivenessItem(
            framework_id="challenger",
            framework_name="Challenger Sale",
            total_uses=32,
            conversions=14,
            conversion_rate=0.44,
            avg_deal_value=12000,
            avg_time_to_close_days=28,
            best_for_buyer_types=["driver", "analytical"],
            best_for_industries=["b2b_saas", "coaching"],
        ),
        FrameworkEffectivenessItem(
            framework_id="gap",
            framework_name="GAP Selling",
            total_uses=28,
            conversions=11,
            conversion_rate=0.39,
            avg_deal_value=6500,
            avg_time_to_close_days=14,
            best_for_buyer_types=["driver", "expressive"],
            best_for_industries=["b2b_saas"],
        ),
        FrameworkEffectivenessItem(
            framework_id="sandler",
            framework_name="Sandler",
            total_uses=20,
            conversions=9,
            conversion_rate=0.45,
            avg_deal_value=7200,
            avg_time_to_close_days=18,
            best_for_buyer_types=["analytical"],
            best_for_industries=["insurance", "finance"],
        ),
    ]
    
    # Sort by conversion rate
    frameworks.sort(key=lambda x: x.conversion_rate, reverse=True)
    
    return FrameworkEffectivenessResponse(
        period_start=start,
        period_end=end,
        total_deals=sum(f.total_uses for f in frameworks),
        frameworks=frameworks,
        top_framework=frameworks[0].framework_id if frameworks else "spin",
        insights=[
            f"🏆 Top Framework: {frameworks[0].framework_name} mit {frameworks[0].conversion_rate*100:.0f}% Conversion",
            f"💰 Höchster Deal Value: {max(frameworks, key=lambda x: x.avg_deal_value or 0).framework_name}",
            f"⚡ Schnellster Close: {min(frameworks, key=lambda x: x.avg_time_to_close_days or 999).framework_name}",
        ],
    )


@router.get("/analytics/buyer-type-effectiveness", response_model=BuyerTypeEffectivenessResponse)
async def get_buyer_type_effectiveness():
    """Analysiert die Effectiveness nach Buyer Type"""
    now = datetime.now()
    
    # Demo data
    buyer_types = [
        BuyerTypeEffectivenessItem(
            buyer_type=BuyerType.DRIVER,
            total_leads=42,
            conversions=21,
            conversion_rate=0.50,
            best_framework="gap",
            avg_touchpoints=3.2,
        ),
        BuyerTypeEffectivenessItem(
            buyer_type=BuyerType.ANALYTICAL,
            total_leads=38,
            conversions=15,
            conversion_rate=0.39,
            best_framework="spin",
            avg_touchpoints=5.8,
        ),
        BuyerTypeEffectivenessItem(
            buyer_type=BuyerType.EXPRESSIVE,
            total_leads=35,
            conversions=16,
            conversion_rate=0.46,
            best_framework="challenger",
            avg_touchpoints=4.1,
        ),
        BuyerTypeEffectivenessItem(
            buyer_type=BuyerType.AMIABLE,
            total_leads=30,
            conversions=10,
            conversion_rate=0.33,
            best_framework="solution",
            avg_touchpoints=6.5,
        ),
    ]
    
    return BuyerTypeEffectivenessResponse(
        period_start=now - timedelta(days=30),
        period_end=now,
        buyer_types=buyer_types,
        insights=[
            "🎯 Driver konvertieren am besten (50%) - schnelle Entscheider!",
            "🧮 Analytiker brauchen mehr Touchpoints (5.8) - Geduld zahlt sich aus",
            "🤝 Amiable haben niedrigste Rate - Mehr Beziehungsaufbau nötig",
        ],
    )


@router.get("/analytics/industry-effectiveness", response_model=IndustryEffectivenessResponse)
async def get_industry_effectiveness():
    """Analysiert die Effectiveness nach Industry"""
    now = datetime.now()
    
    # Demo data
    industries = [
        IndustryEffectivenessItem(
            industry_id="b2b_saas",
            industry_name="B2B SaaS",
            total_deals=52,
            conversions=23,
            conversion_rate=0.44,
            best_framework="gap",
            best_buyer_approach="driver",
            avg_deal_size=8500,
        ),
        IndustryEffectivenessItem(
            industry_id="network_marketing",
            industry_name="Network Marketing",
            total_deals=48,
            conversions=19,
            conversion_rate=0.40,
            best_framework="solution",
            best_buyer_approach="expressive",
            avg_deal_size=350,
        ),
        IndustryEffectivenessItem(
            industry_id="coaching",
            industry_name="Coaching",
            total_deals=28,
            conversions=12,
            conversion_rate=0.43,
            best_framework="challenger",
            best_buyer_approach="expressive",
            avg_deal_size=2500,
        ),
    ]
    
    return IndustryEffectivenessResponse(
        period_start=now - timedelta(days=30),
        period_end=now,
        industries=industries,
        insights=[
            "🚀 B2B SaaS führt mit 44% Conversion und höchstem Deal Size",
            "📈 GAP Selling funktioniert besonders gut für Tech-Deals",
            "💡 Expressive Buyer Types dominieren in Coaching & Network Marketing",
        ],
    )

