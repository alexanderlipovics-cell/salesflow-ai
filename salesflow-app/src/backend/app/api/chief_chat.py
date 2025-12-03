"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF CHAT API v3.0                                                       ║
║  Der AI Vertriebsleiter - Nicht nur Assistent, sondern Leader              ║
╚════════════════════════════════════════════════════════════════════════════╝

CHIEF v3.0 Features:
- 5 Modi: DRIVER, COACH, ANALYST, COPILOT, CELEBRATION
- Automatisches Mode-Routing basierend auf Message + Context
- Proaktives Pushen bei Inaktivität
- Celebration bei Erfolgen
- Skill-Level basierte Anpassung (STARTER → EXPERT)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client
import json
import re

from ..db.deps import get_db, get_current_user, get_current_user_optional, CurrentUser
from ..services.chief_context import build_chief_context, format_context_for_llm
from ..services.llm_client import call_llm
from ..config.prompts.chief_prompt import build_system_messages
from ..core.config import settings

# CHIEF v3 Imports
from ..config.prompts.chief_v3_core import (
    ChiefMode,
    UserLevel,
    build_chief_v3_prompt,
    map_skill_level_to_user_level,
)
from ..config.prompts.chief_mode_router import (
    route_to_mode,
    get_proactive_messages,
    detect_celebration_event,
    detect_user_level,
)


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/ai/chief", tags=["ai", "chief"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class ChiefChatRequest(BaseModel):
    """Request für CHIEF Chat."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="User-Nachricht an CHIEF"
    )
    company_id: Optional[str] = Field(
        None,
        description="Company ID für Kontext (Override)"
    )
    include_context: bool = Field(
        default=True,
        description="Daily Flow Kontext einbeziehen?"
    )
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="Bisheriger Chatverlauf [{role: 'user'|'assistant', content: '...'}]"
    )
    force_mode: Optional[str] = Field(
        None,
        description="Erzwinge bestimmten Modus (driver, coach, analyst, copilot, celebration)"
    )
    use_v3: bool = Field(
        default=True,
        description="CHIEF v3 System verwenden (5 Modi, Mode-Routing)"
    )


class ChiefChatResponse(BaseModel):
    """Response von CHIEF."""
    reply: str = Field(..., description="CHIEF's Antwort")
    actions: list[dict] = Field(
        default_factory=list,
        description="Erkannte Actions für Frontend"
    )
    context_used: bool = Field(
        default=False,
        description="Wurde Kontext verwendet?"
    )
    # v3 Erweiterungen
    mode: Optional[str] = Field(
        None,
        description="Aktivierter CHIEF Modus (v3)"
    )
    mode_reason: Optional[str] = Field(
        None,
        description="Warum dieser Modus gewählt wurde"
    )
    proactive_hints: list[dict] = Field(
        default_factory=list,
        description="Proaktive Hinweise die CHIEF noch ansprechen könnte"
    )
    celebration: Optional[str] = Field(
        None,
        description="Celebration-Event wenn erkannt"
    )


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def extract_actions(reply: str) -> tuple[str, list[dict]]:
    """
    Extrahiert Action-Tags aus CHIEF's Antwort.
    
    Format: [[ACTION:TYPE:PARAMS]]
    
    Unterstützte Actions:
    - FOLLOWUP_LEADS - Öffnet Follow-up Dialog
    - NEW_CONTACTS - Startet Neucontact Workflow
    - SHOW_LEAD - Zeigt Lead-Details
    - OPEN_OBJECTION - Öffnet Objection Brain
    - COMPLETE_TASK - Markiert Task als erledigt
    
    Returns:
        (clean_reply, list of actions)
    """
    actions = []
    action_pattern = r'\[\[ACTION:([A-Z_]+)(?::([^\]]+))?\]\]'
    
    for match in re.finditer(action_pattern, reply):
        action_type = match.group(1)
        params = match.group(2)
        
        action = {"type": action_type}
        
        if params:
            if "," in params:
                action["params"] = [p.strip() for p in params.split(",")]
            else:
                action["params"] = params.strip()
        
        actions.append(action)
    
    # Clean reply (remove action tags)
    clean_reply = re.sub(action_pattern, "", reply).strip()
    
    return clean_reply, actions


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/chat", response_model=ChiefChatResponse)
async def chief_chat(
    payload: ChiefChatRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Chat mit CHIEF v3.0 - dem AI Vertriebsleiter.
    
    ## v3.0 Features
    
    CHIEF ist nicht nur ein Assistent, sondern ein AI Vertriebsleiter der:
    - **PUSHT** wenn nötig (Driver Mode)
    - **ENTWICKELT** (Coach Mode)
    - **ANALYSIERT** (Analyst Mode)
    - **HILFT** live im Gespräch (Copilot Mode)
    - **FEIERT** Erfolge (Celebration Mode)
    
    ## Automatisches Mode-Routing
    
    CHIEF wählt automatisch den passenden Modus basierend auf:
    - Der User-Nachricht (Intent Detection)
    - Dem Context (überfällige Follow-ups, Inaktivität, Erfolge)
    
    ## Action Tags
    
    CHIEF kann Actions zurückgeben die das Frontend verarbeiten kann:
    - `FOLLOWUP_LEADS` - Öffnet Follow-up für bestimmte Leads
    - `NEW_CONTACTS` - Startet Workflow für neue Kontakte
    - `CELEBRATE` - Zeigt Celebration Animation
    """
    
    # Company ID: Aus Payload oder vom User
    company_id = payload.company_id or current_user.company_id
    
    if not company_id:
        raise HTTPException(
            status_code=400,
            detail="company_id required (in payload or user profile)"
        )
    
    context = None
    context_text = None
    context_used = False
    
    # Kontext aufbauen (wenn gewünscht und aktiviert)
    if payload.include_context and settings.ENABLE_CHIEF_CONTEXT:
        try:
            context = await build_chief_context(
                db=db,
                user_id=current_user.id,
                company_id=company_id,
                user_name=current_user.name or "User",
                query=payload.message,
                include_knowledge=True,
                include_templates=True,
                include_living_os=True,
                include_storybook=True,
                include_outreach=True,
            )
            
            if context:
                context_text = format_context_for_llm(context)
                context_used = True
                
        except Exception as e:
            print(f"Warning: Could not build context: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════
    # CHIEF v3: Mode Routing
    # ═══════════════════════════════════════════════════════════════════════
    
    mode = ChiefMode.DEFAULT
    mode_reason = "Standard-Modus"
    proactive_hints = []
    celebration_event = None
    
    if payload.use_v3:
        # Force Mode wenn angegeben
        force_mode = None
        if payload.force_mode:
            try:
                force_mode = ChiefMode(payload.force_mode.lower())
            except ValueError:
                pass
        
        # Mode-Routing
        mode, mode_reason, signals = route_to_mode(
            message=payload.message,
            context=context,
            force_mode=force_mode,
        )
        
        # Proaktive Hints generieren
        if context:
            proactive_hints = get_proactive_messages(context)
        
        # Celebration Detection
        if context:
            celebration_event = detect_celebration_event(
                message=payload.message,
                context=context,
            )
            if celebration_event:
                mode = ChiefMode.CELEBRATION
                mode_reason = f"Celebration erkannt: {celebration_event}"
        
        # User Level ermitteln
        user_level = None
        if context:
            user_level = detect_user_level(context)
        
        # v3 Prompt bauen
        messages = build_chief_v3_prompt(
            mode=mode,
            user_level=user_level,
            context_text=context_text,
            celebration_trigger=celebration_event,
        )
    else:
        # Fallback: Legacy v2 System
        vertical_style = None
        skill_level = None
        if context_used and context:
            if "vertical_profile" in context:
                vertical_style = context["vertical_profile"].get("conversation_style")
            if "skill_level" in context:
                skill_level = context["skill_level"]
        
        messages = build_system_messages(context_text, vertical_style, skill_level)
    
    # Conversation History hinzufügen (mit Limit)
    max_history = settings.MAX_CONVERSATION_HISTORY
    for msg in payload.conversation_history[-max_history:]:
        if msg.get("role") in ["user", "assistant"]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
    
    # Aktuelle User-Nachricht
    messages.append({
        "role": "user",
        "content": payload.message,
    })
    
    # LLM aufrufen
    try:
        raw_reply = await call_llm(messages=messages)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM call failed: {str(e)}"
        )
    
    # Actions extrahieren
    clean_reply, actions = extract_actions(raw_reply)
    
    return ChiefChatResponse(
        reply=clean_reply,
        actions=actions,
        context_used=context_used,
        mode=mode.value if payload.use_v3 else None,
        mode_reason=mode_reason if payload.use_v3 else None,
        proactive_hints=proactive_hints[:3] if payload.use_v3 else [],
        celebration=celebration_event,
    )


@router.post("/chat/demo", response_model=ChiefChatResponse)
async def chief_chat_demo(
    payload: ChiefChatRequest,
    db: Client = Depends(get_db),
):
    """
    Demo-Version von CHIEF Chat (ohne Auth).
    
    Nutzt Mock-Daten für Kontext.
    Nützlich für Testing und Demos.
    """
    
    context_text = None
    context_used = False
    
    # Mock Context für Demo
    if payload.include_context:
        context = {
            "user_name": "Demo User",
            "context_date": "2024-01-15",
            "daily_flow_status": {
                "date": "2024-01-15",
                "new_contacts": {"target": 8, "done": 5, "remaining": 3, "percent": 62.5},
                "followups": {"target": 6, "done": 4, "remaining": 2, "percent": 66.7},
                "reactivations": {"target": 2, "done": 1, "remaining": 1, "percent": 50.0},
                "overall_percent": 62.5,
                "is_on_track": True,
            },
            "remaining_today": {"new_contacts": 3, "followups": 2, "reactivations": 1},
            "suggested_leads": [
                {"id": "lead-001", "name": "Anna M.", "status": "warm", "reason": "Überfälliges Follow-up"},
                {"id": "lead-002", "name": "Markus K.", "status": "interested", "reason": "Wollte sich melden"},
            ],
            "vertical_profile": {
                "vertical_id": "network_marketing",
                "vertical_label": "Network Marketing",
                "conversation_style": "locker, direkt, motivierend",
            },
            "streak_days": 5,
        }
        context_text = format_context_for_llm(context)
        context_used = True
    
    # Messages aufbauen
    messages = build_system_messages(context_text)
    
    # Conversation History hinzufügen
    for msg in payload.conversation_history[-10:]:
        if msg.get("role") in ["user", "assistant"]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
    
    # Aktuelle User-Nachricht
    messages.append({
        "role": "user",
        "content": payload.message,
    })
    
    # LLM aufrufen
    try:
        raw_reply = await call_llm(messages=messages)
    except Exception as e:
        # Fallback für Demo wenn kein LLM konfiguriert
        raw_reply = _get_demo_response(payload.message)
    
    # Actions extrahieren
    clean_reply, actions = extract_actions(raw_reply)
    
    return ChiefChatResponse(
        reply=clean_reply,
        actions=actions,
        context_used=context_used,
    )


def _get_demo_response(user_message: str) -> str:
    """Fallback Response wenn kein LLM verfügbar."""
    msg_lower = user_message.lower()
    
    if "heute" in msg_lower or "plan" in msg_lower:
        return """Hey! Kurzer Check zu deinem Tagesplan:

Du hast heute schon 5 von 8 geplanten neuen Kontakten erledigt ✅
Follow-ups: 4 von 6 ✅
Reaktivierungen: 1 von 2 ✅

Um voll im Plan zu bleiben, fehlen dir noch:
• 3 neue Kontakte
• 2 Follow-ups
• 1 Reaktivierung

Für Follow-ups würde ich mit Anna und Markus starten – beide sind überfällig.

Wie willst du starten?
🟢 2 schnelle Follow-up-Nachrichten
🔵 3 neue Kontakte anschreiben

[[ACTION:FOLLOWUP_LEADS:lead-001,lead-002]]"""
    
    if "einwand" in msg_lower or "objection" in msg_lower or "keine zeit" in msg_lower:
        return """Klar, hier sind 3 Wege wie du auf "keine Zeit" reagieren kannst:

**1. Empathisch:**
"Verstehe ich total. Zeit ist wertvoll. Genau deshalb zeig ich dir in 15 Min wie du mit weniger Aufwand mehr erreichst. Wann passt's diese Woche?"

**2. Reframing:**
"Interessant - die meisten meiner erfolgreichsten Partner haben anfangs genauso gedacht. Was hat sich geändert? Sie haben erkannt dass es um eine Stunde pro Tag geht, nicht mehr."

**3. Direkt:**
"Mal ehrlich - wir finden immer Zeit für das was uns wichtig ist. Ist finanzielle Freiheit dir wichtig genug für eine Stunde am Tag?"

Welcher Stil passt zu deinem Gegenüber? 💪

[[ACTION:OPEN_OBJECTION:keine_zeit]]"""
    
    if "lead" in msg_lower or "kontakt" in msg_lower:
        return """Basierend auf deinen Daten würde ich diese Leads priorisieren:

**1. Anna M.** (warm) - Überfälliges Follow-up
Sie hatte Interesse gezeigt, aber du hast seit 3 Tagen nichts mehr gehört. Ein kurzer Check-in wäre gut.

**2. Markus K.** (interested) - Wollte sich melden
Er hatte gesagt er meldet sich "diese Woche" - aber noch keine Reaktion. Nachhaken!

Soll ich dir eine Nachricht für einen der beiden vorschlagen?

[[ACTION:SHOW_LEAD:lead-001]]"""
    
    return f"""Hey! Ich bin CHIEF, dein Sales-Coach 💪

Du hast gefragt: "{user_message[:80]}..."

Lass uns das gemeinsam angehen! Was möchtest du erreichen?

- 🎯 Tagesziele checken
- 📞 Nächste Leads priorisieren
- 🗣️ Einwand behandeln
- 📊 Wochenübersicht"""


@router.get("/status")
async def chief_status():
    """Health check für CHIEF v3."""
    # Check LLM availability
    llm_status = "configured" if settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY else "not_configured"
    
    return {
        "status": "online",
        "version": "3.0",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_status": llm_status,
        "model": settings.OPENAI_MODEL if settings.LLM_PROVIDER == "openai" else settings.ANTHROPIC_MODEL,
        "features": [
            "daily_flow_context",
            "lead_suggestions",
            "vertical_adaptation",
            "action_tags",
            # v3 Features
            "mode_routing",
            "driver_mode",
            "coach_mode",
            "analyst_mode",
            "copilot_mode",
            "celebration_mode",
            "proactive_hints",
            "user_levels",
        ],
        "modes": [m.value for m in ChiefMode],
        "user_levels": [l.value for l in UserLevel],
        "context_enabled": settings.ENABLE_CHIEF_CONTEXT,
    }


@router.get("/actions")
async def list_actions():
    """
    Liste aller verfügbaren Action-Tags.
    
    Diese Actions kann CHIEF in seinen Antworten einbetten,
    damit das Frontend entsprechend reagieren kann.
    """
    return {
        "actions": [
            {
                "type": "FOLLOWUP_LEADS",
                "description": "Öffnet Follow-up Dialog für bestimmte Leads",
                "params": "Komma-separierte Lead-IDs",
                "example": "[[ACTION:FOLLOWUP_LEADS:lead-001,lead-002]]",
            },
            {
                "type": "NEW_CONTACTS",
                "description": "Startet Workflow für neue Kontakte",
                "params": "Anzahl der Kontakte",
                "example": "[[ACTION:NEW_CONTACTS:3]]",
            },
            {
                "type": "SHOW_LEAD",
                "description": "Zeigt Lead-Details Modal",
                "params": "Lead-ID",
                "example": "[[ACTION:SHOW_LEAD:lead-001]]",
            },
            {
                "type": "OPEN_OBJECTION",
                "description": "Öffnet Objection Brain für ein Thema",
                "params": "Einwand-Thema",
                "example": "[[ACTION:OPEN_OBJECTION:keine_zeit]]",
            },
            {
                "type": "COMPLETE_TASK",
                "description": "Markiert eine Task-Kategorie als erledigt",
                "params": "Task-Typ (new_contact, followup, reactivation)",
                "example": "[[ACTION:COMPLETE_TASK:followup]]",
            },
        ],
    }
