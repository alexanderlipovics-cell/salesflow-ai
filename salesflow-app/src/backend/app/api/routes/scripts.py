"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT LIBRARY API ROUTES                                                  ║
║  50+ bewährte Scripts für Network Marketing & Sales                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    
    SCRIPTS:
    - GET    /scripts                    - Alle Scripts abrufen (mit Filtern)
    - GET    /scripts/{id}               - Einzelnes Script abrufen
    - GET    /scripts/number/{number}    - Script nach Nummer abrufen
    - POST   /scripts/suggest            - Script-Vorschlag für Situation
    - GET    /scripts/search             - Scripts durchsuchen
    
    CATEGORIES:
    - GET    /scripts/categories         - Alle Kategorien
    - GET    /scripts/categories/{cat}   - Scripts einer Kategorie
    
    PERFORMANCE:
    - POST   /scripts/{id}/log           - Usage loggen
    - GET    /scripts/top                - Top-performing Scripts
    
    DISG:
    - GET    /scripts/disg/hints/{type}  - DISG Anpassungs-Hinweise
    - POST   /scripts/disg/adapt         - Script für DISG anpassen
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

from ...db.deps import get_db, get_current_user, CurrentUser
from ..schemas.scripts import (
    ScriptCategoryEnum,
    ScriptContextEnum,
    RelationshipLevelEnum,
    DISGTypeEnum,
    ScriptQueryRequest,
    ScriptSuggestionRequest,
    ScriptUsageLogRequest,
    ScriptResponse,
    ScriptListResponse,
    ScriptCategorySummary,
    ScriptLibraryOverview,
    DISGAdaptationHints,
)
from ...services.scripts import ScriptLibraryService
from ...services.scripts.models import (
    ScriptCategory,
    ScriptContext,
    RelationshipLevel,
    DISGType,
    DISG_ADAPTATIONS,
)
from ...services.scripts.network_marketing_scripts import (
    ALL_NETWORK_MARKETING_SCRIPTS,
    get_scripts_by_category,
)
from ...services.scripts.mlm_script_service import MLMScriptService


router = APIRouter(prefix="/scripts", tags=["scripts"])


# =============================================================================
# HELPER: Service initialisieren
# =============================================================================

def get_script_service(db=None) -> ScriptLibraryService:
    """Erstellt und initialisiert den Script-Service."""
    service = ScriptLibraryService(db)
    # Lade In-Memory Scripts
    service.load_scripts_from_seed(ALL_NETWORK_MARKETING_SCRIPTS)
    return service


# =============================================================================
# SCRIPTS ABRUFEN
# =============================================================================

@router.get("", response_model=ScriptListResponse)
async def get_scripts(
    category: Optional[ScriptCategoryEnum] = Query(None, description="Kategorie filtern"),
    context: Optional[ScriptContextEnum] = Query(None, description="Kontext filtern"),
    relationship_level: Optional[RelationshipLevelEnum] = Query(None, description="Beziehungslevel"),
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg", description="DISG-Typ für Anpassung"),
    vertical: str = Query("network_marketing", description="Branche"),
    language: str = Query("de", description="Sprache"),
    adapt_to_disg: bool = Query(True, description="Scripts an DISG anpassen"),
    limit: int = Query(50, ge=1, le=100, description="Max. Anzahl"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Scripts basierend auf Filtern.
    
    Beispiele:
    - GET /scripts?category=einwand&disg=S
    - GET /scripts?context=ghosted&relationship_level=warm
    """
    service = get_script_service(db)
    
    # Konvertiere Enums
    cat = ScriptCategory(category.value) if category else None
    ctx = ScriptContext(context.value) if context else None
    rel = RelationshipLevel(relationship_level.value) if relationship_level else None
    disg = DISGType(disg_type.value) if disg_type else None
    
    scripts = service.get_scripts(
        category=cat,
        context=ctx,
        relationship_level=rel,
        disg_type=disg,
        vertical=vertical,
        language=language,
        limit=limit,
        adapt_to_disg=adapt_to_disg,
    )
    
    return ScriptListResponse(
        scripts=[ScriptResponse(**s) for s in scripts],
        total=len(scripts),
        category=category.value if category else None,
        context=context.value if context else None,
        disg_adapted=adapt_to_disg and disg_type is not None,
    )


@router.get("/overview", response_model=ScriptLibraryOverview)
async def get_library_overview(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt eine Übersicht über die gesamte Script Library.
    """
    category_info = {
        ScriptCategory.ERSTKONTAKT: ("Erstkontakt", "Scripts für die erste Kontaktaufnahme"),
        ScriptCategory.FOLLOW_UP: ("Follow-Up", "Nachfass-Scripts und Ghost-Buster"),
        ScriptCategory.EINWAND: ("Einwand-Behandlung", "Antworten auf häufige Einwände"),
        ScriptCategory.CLOSING: ("Closing", "Abschluss-Scripts"),
        ScriptCategory.ONBOARDING: ("Team-Onboarding", "Scripts für neue Teammitglieder"),
        ScriptCategory.REAKTIVIERUNG: ("Reaktivierung", "Inaktive Kunden/Partner reaktivieren"),
        ScriptCategory.SOCIAL_MEDIA: ("Social Media", "Scripts für Social Media Interaktionen"),
    }
    
    categories = []
    for cat, (name, desc) in category_info.items():
        cat_scripts = get_scripts_by_category(cat)
        contexts = list(set(s.context.value for s in cat_scripts))
        categories.append(ScriptCategorySummary(
            category=cat.value,
            name=name,
            description=desc,
            script_count=len(cat_scripts),
            contexts=contexts,
        ))
    
    return ScriptLibraryOverview(
        total_scripts=len(ALL_NETWORK_MARKETING_SCRIPTS),
        categories=categories,
        verticals=["network_marketing"],
        languages=["de"],
    )


@router.get("/search")
async def search_scripts(
    q: str = Query(..., min_length=2, description="Suchbegriff"),
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Durchsucht Scripts nach Keywords.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    scripts = service.search_scripts(q, disg_type=disg, limit=limit)
    
    return {
        "query": q,
        "results": [ScriptResponse(**s) for s in scripts],
        "total": len(scripts),
    }


@router.get("/number/{number}", response_model=ScriptResponse)
async def get_script_by_number(
    number: int,
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    contact_name: Optional[str] = Query(None, description="Name zum Einsetzen"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt ein Script anhand seiner Nummer (1-52).
    
    Beispiel: GET /scripts/number/20?disg=D&contact_name=Max
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    script = service.get_script_by_number(number, disg_type=disg)
    
    if not script:
        raise HTTPException(404, f"Script #{number} nicht gefunden")
    
    # Name einsetzen wenn angegeben
    if contact_name:
        script["text"] = script["text"].replace("[Name]", contact_name)
        script["text"] = script["text"].replace("[NAME]", contact_name)
    
    return ScriptResponse(**script)


@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script_by_id(
    script_id: str,
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt ein einzelnes Script per ID.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    script = service.get_script_by_id(script_id, disg_type=disg)
    
    if not script:
        raise HTTPException(404, "Script nicht gefunden")
    
    return ScriptResponse(**script)


# =============================================================================
# SMART SUGGESTION
# =============================================================================

@router.post("/suggest", response_model=ScriptResponse)
async def suggest_script(
    request: ScriptSuggestionRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Schlägt das beste Script für eine Situation vor.
    
    Analysiert die Beschreibung und wählt automatisch das passendste Script.
    
    Beispiel:
    ```json
    {
        "situation_description": "Kunde sagt er hat keine Zeit",
        "disg_type": "S",
        "contact_name": "Max"
    }
    ```
    """
    service = get_script_service(db)
    
    disg = DISGType(request.disg_type.value) if request.disg_type else None
    rel = RelationshipLevel(request.relationship_level.value) if request.relationship_level else None
    
    script = service.suggest_script(
        situation_description=request.situation_description,
        disg_type=disg,
        relationship_level=rel,
    )
    
    if not script:
        raise HTTPException(404, "Kein passendes Script gefunden")
    
    # Variablen ersetzen
    text = script["text"]
    if request.contact_name:
        text = text.replace("[Name]", request.contact_name)
        text = text.replace("[NAME]", request.contact_name)
    
    if request.variables:
        for key, value in request.variables.items():
            text = text.replace(f"[{key}]", value)
            text = text.replace(f"[{key.upper()}]", value)
    
    script["text"] = text
    
    return ScriptResponse(**script)


# =============================================================================
# KATEGORIEN
# =============================================================================

@router.get("/categories/{category}")
async def get_scripts_for_category(
    category: ScriptCategoryEnum,
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle Scripts einer Kategorie.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    scripts = service.get_scripts(
        category=ScriptCategory(category.value),
        disg_type=disg,
        limit=100,
    )
    
    # Gruppiere nach Kontext
    by_context = {}
    for s in scripts:
        ctx = s.get("context", "unknown")
        if ctx not in by_context:
            by_context[ctx] = []
        by_context[ctx].append(ScriptResponse(**s))
    
    return {
        "category": category.value,
        "total": len(scripts),
        "by_context": by_context,
    }


# =============================================================================
# PERFORMANCE TRACKING
# =============================================================================

@router.post("/{script_id}/log")
async def log_script_usage(
    script_id: str,
    request: ScriptUsageLogRequest,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt die Verwendung eines Scripts für Performance-Tracking.
    """
    service = get_script_service(db)
    
    disg = DISGType(request.disg_type.value) if request.disg_type else None
    
    success = service.log_script_usage(
        script_id=script_id,
        user_id=str(current_user.id),
        was_sent=request.was_sent,
        got_reply=request.got_reply,
        was_positive=request.was_positive,
        converted=request.converted,
        response_time_minutes=request.response_time_minutes,
        channel=request.channel,
        disg_type=disg,
    )
    
    return {"success": success, "script_id": script_id}


@router.get("/top/performing")
async def get_top_scripts(
    category: Optional[ScriptCategoryEnum] = Query(None),
    metric: str = Query("conversion_rate", description="Metrik (conversion_rate, reply_rate, positive_rate)"),
    limit: int = Query(5, ge=1, le=20),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt die Top-performing Scripts.
    """
    service = get_script_service(db)
    
    cat = ScriptCategory(category.value) if category else None
    
    scripts = service.get_top_scripts(
        category=cat,
        metric=metric,
        limit=limit,
    )
    
    return {
        "metric": metric,
        "category": category.value if category else "all",
        "top_scripts": [ScriptResponse(**s) for s in scripts],
    }


# =============================================================================
# DISG ANPASSUNG
# =============================================================================

@router.get("/disg/hints/{disg_type}", response_model=DISGAdaptationHints)
async def get_disg_hints(
    disg_type: DISGTypeEnum,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt Anpassungs-Hinweise für einen DISG-Typ zurück.
    
    Hilfreich um zu verstehen, wie Scripts angepasst werden.
    """
    disg = DISGType(disg_type.value)
    hints = DISG_ADAPTATIONS.get(disg, {})
    
    return DISGAdaptationHints(
        disg_type=disg_type.value,
        name=hints.get("name", ""),
        rules=hints.get("rules", []),
        remove_elements=hints.get("remove_elements", []),
        add_elements=hints.get("add_elements", []),
        tone=hints.get("tone", "neutral"),
        max_length_factor=hints.get("max_length_factor", 1.0),
    )


@router.get("/disg/all-hints")
async def get_all_disg_hints(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt alle DISG-Anpassungs-Hinweise zurück.
    """
    all_hints = {}
    
    for disg_type, hints in DISG_ADAPTATIONS.items():
        all_hints[disg_type.value] = DISGAdaptationHints(
            disg_type=disg_type.value,
            name=hints.get("name", ""),
            rules=hints.get("rules", []),
            remove_elements=hints.get("remove_elements", []),
            add_elements=hints.get("add_elements", []),
            tone=hints.get("tone", "neutral"),
            max_length_factor=hints.get("max_length_factor", 1.0),
        )
    
    return all_hints


@router.post("/disg/adapt")
async def adapt_script_for_disg(
    script_number: int = Query(..., ge=1, le=52, description="Script-Nummer"),
    disg_type: DISGTypeEnum = Query(..., alias="disg", description="DISG-Typ"),
    contact_name: Optional[str] = Query(None, description="Name zum Einsetzen"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Passt ein Script für einen DISG-Typ an.
    
    Gibt das Original und die angepasste Version zurück.
    """
    service = get_script_service(db)
    
    # Original holen
    original = service.get_script_by_number(script_number, disg_type=None)
    if not original:
        raise HTTPException(404, f"Script #{script_number} nicht gefunden")
    
    # Angepasste Version
    disg = DISGType(disg_type.value)
    adapted = service.get_script_by_number(script_number, disg_type=disg)
    
    # Name einsetzen
    if contact_name:
        adapted["text"] = adapted["text"].replace("[Name]", contact_name)
        adapted["text"] = adapted["text"].replace("[NAME]", contact_name)
    
    return {
        "script_number": script_number,
        "disg_type": disg_type.value,
        "original": ScriptResponse(**original),
        "adapted": ScriptResponse(**adapted),
        "adaptation_hints": DISG_ADAPTATIONS.get(disg, {}),
    }


# =============================================================================
# QUICK ACCESS
# =============================================================================

@router.get("/quick/objections")
async def get_objection_scripts(
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Quick Access: Alle Einwand-Scripts gruppiert nach Einwand-Typ.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    scripts = service.get_scripts(
        category=ScriptCategory.EINWAND,
        disg_type=disg,
        limit=50,
    )
    
    # Gruppiere nach Kontext (Einwand-Typ)
    objection_types = {
        "keine_zeit": "Keine Zeit",
        "kein_geld": "Kein Geld",
        "partner_fragen": "Muss Partner fragen",
        "mlm_pyramide": "Ist das MLM/Pyramide?",
        "kenne_niemanden": "Ich kenne niemanden",
        "nicht_verkaufer": "Bin kein Verkäufer",
        "schon_versucht": "Hab schon mal probiert",
        "nur_oben": "Nur die oben verdienen",
        "nachdenken": "Muss nachdenken",
    }
    
    grouped = {}
    for s in scripts:
        ctx = s.get("context", "unknown")
        label = objection_types.get(ctx, ctx)
        if label not in grouped:
            grouped[label] = []
        grouped[label].append(ScriptResponse(**s))
    
    return {
        "category": "einwand",
        "disg_adapted": disg_type is not None,
        "objection_types": grouped,
    }


@router.get("/quick/followup")
async def get_followup_scripts(
    context: Optional[str] = Query(None, description="ghosted, nach_praesentation, langzeit"),
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Quick Access: Follow-Up Scripts.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    ctx = None
    if context:
        try:
            ctx = ScriptContext(context)
        except ValueError:
            pass
    
    scripts = service.get_scripts(
        category=ScriptCategory.FOLLOW_UP,
        context=ctx,
        disg_type=disg,
        limit=20,
    )
    
    return {
        "category": "follow_up",
        "context": context,
        "disg_adapted": disg_type is not None,
        "scripts": [ScriptResponse(**s) for s in scripts],
    }


@router.get("/quick/closing")
async def get_closing_scripts(
    style: Optional[str] = Query(None, description="soft, assumptive, urgency"),
    disg_type: Optional[DISGTypeEnum] = Query(None, alias="disg"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Quick Access: Closing Scripts.
    """
    service = get_script_service(db)
    disg = DISGType(disg_type.value) if disg_type else None
    
    ctx = None
    if style:
        context_map = {
            "soft": ScriptContext.SOFT_CLOSE,
            "assumptive": ScriptContext.ASSUMPTIVE_CLOSE,
            "urgency": ScriptContext.URGENCY_CLOSE,
        }
        ctx = context_map.get(style)
    
    scripts = service.get_scripts(
        category=ScriptCategory.CLOSING,
        context=ctx,
        disg_type=disg,
        limit=10,
    )
    
    return {
        "category": "closing",
        "style": style,
        "disg_adapted": disg_type is not None,
        "scripts": [ScriptResponse(**s) for s in scripts],
    }


# =============================================================================
# MLM-SPEZIFISCHE SCRIPTS
# =============================================================================

mlm_script_service = MLMScriptService()


@router.get("/mlm/{mlm_company}")
async def get_mlm_scripts(
    mlm_company: str,
    category: Optional[str] = Query(None, description="Kategorie (pitches, einwand_handling, etc.)"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle Scripts für ein MLM-Unternehmen.
    
    Beispiele:
    - GET /api/v2/scripts/mlm/zinzino
    - GET /api/v2/scripts/mlm/zinzino?category=pitches
    """
    scripts = mlm_script_service.get_scripts_for_company(
        company=mlm_company,
        category=category
    )
    
    if not scripts:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Scripts gefunden für '{mlm_company}'" + 
                   (f" in Kategorie '{category}'" if category else "")
        )
    
    return {
        "company": mlm_company,
        "category": category,
        "scripts": scripts,
        "total": len(scripts) if isinstance(scripts, dict) else 0
    }


@router.get("/mlm/{mlm_company}/{category}")
async def get_mlm_scripts_by_category(
    mlm_company: str,
    category: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Scripts einer spezifischen Kategorie für ein MLM-Unternehmen.
    
    Beispiel: GET /api/v2/scripts/mlm/zinzino/pitches
    """
    scripts = mlm_script_service.get_scripts_for_company(
        company=mlm_company,
        category=category
    )
    
    if not scripts:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Scripts gefunden für '{mlm_company}' in Kategorie '{category}'"
        )
    
    return {
        "company": mlm_company,
        "category": category,
        "scripts": scripts,
        "total": len(scripts)
    }


@router.get("/mlm/{mlm_company}/{category}/{script_id}")
async def get_mlm_script_by_id(
    mlm_company: str,
    category: str,
    script_id: str,
    variables: Optional[str] = Query(None, description="JSON-String mit Variablen (z.B. {\"Name\": \"Max\"})"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt ein einzelnes Script per ID.
    
    Beispiel: GET /api/v2/scripts/mlm/zinzino/pitches/testen_statt_raten?variables={"Name":"Max"}
    """
    import json
    
    script = mlm_script_service.get_script_by_id(
        company=mlm_company,
        category=category,
        script_id=script_id
    )
    
    if not script:
        raise HTTPException(
            status_code=404,
            detail=f"Script '{script_id}' nicht gefunden in '{mlm_company}/{category}'"
        )
    
    # Variablen ersetzen, falls angegeben
    if variables:
        try:
            vars_dict = json.loads(variables)
            script_text = script.get("text", "")
            script["text"] = mlm_script_service.replace_variables(script_text, vars_dict)
        except json.JSONDecodeError:
            pass  # Ignoriere ungültiges JSON
    
    return {
        "company": mlm_company,
        "category": category,
        "script_id": script_id,
        **script
    }


@router.post("/mlm/{mlm_company}/suggest")
async def suggest_mlm_script(
    mlm_company: str,
    context: str = Query(..., description="Beschreibung der Situation"),
    channel: Optional[str] = Query(None, description="Kanal (whatsapp, instagram, linkedin)"),
    situation_type: Optional[str] = Query(None, description="Typ (cold, warm)"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Schlägt ein passendes Script basierend auf Kontext vor.
    
    Beispiel: POST /api/v2/scripts/mlm/zinzino/suggest?context=einwand_zu_teuer&channel=whatsapp
    """
    script = mlm_script_service.suggest_script(
        company=mlm_company,
        context=context,
        channel=channel,
        situation_type=situation_type
    )
    
    if not script:
        raise HTTPException(
            status_code=404,
            detail=f"Kein passendes Script gefunden für Kontext: '{context}'"
        )
    
    return {
        "company": mlm_company,
        "context": context,
        "suggested_script": script
    }


@router.get("/mlm/{mlm_company}/situation/{situation}")
async def get_scripts_by_situation(
    mlm_company: str,
    situation: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Findet passende Scripts basierend auf einer Situation.
    
    Beispiel: GET /api/v2/scripts/mlm/zinzino/situation/einwand_zu_teuer
    """
    scripts = mlm_script_service.get_script_by_situation(
        company=mlm_company,
        situation=situation
    )
    
    if not scripts:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Scripts gefunden für Situation: '{situation}'"
        )
    
    return {
        "company": mlm_company,
        "situation": situation,
        "scripts": scripts,
        "total": len(scripts)
    }


@router.post("/mlm/{mlm_company}/compliance/check")
async def check_mlm_compliance(
    mlm_company: str,
    text: str = Query(..., description="Zu prüfender Text"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Prüft einen Text auf MLM-spezifische Compliance-Verstöße.
    
    Beispiel: POST /api/v2/scripts/mlm/zinzino/compliance/check?text=Dieses Produkt heilt Krebs
    """
    result = mlm_script_service.check_compliance(
        company=mlm_company,
        text=text
    )
    
    return {
        "company": mlm_company,
        "text": text,
        **result
    }


@router.get("/mlm/companies")
async def get_available_mlm_companies(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt alle verfügbaren MLM-Unternehmen zurück.
    
    Beispiel: GET /api/v2/scripts/mlm/companies
    """
    companies = mlm_script_service.get_available_companies()
    
    return {
        "companies": companies,
        "total": len(companies)
    }


@router.get("/mlm/{mlm_company}/categories")
async def get_mlm_categories(
    mlm_company: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt alle Kategorien für ein MLM-Unternehmen zurück.
    
    Beispiel: GET /api/v2/scripts/mlm/zinzino/categories
    """
    categories = mlm_script_service.get_categories_for_company(mlm_company)
    
    if not categories:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Kategorien gefunden für '{mlm_company}'"
        )
    
    return {
        "company": mlm_company,
        "categories": categories,
        "total": len(categories)
    }

