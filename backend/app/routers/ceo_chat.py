"""
CHIEF CEO Chat - AI-Powered Multi-Model Router (Enterprise Grade)
Ein schnelles AI (Groq) entscheidet, welches Super-AI den Job macht.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from datetime import datetime
import httpx

from app.core.deps import get_supabase
from app.core.security import get_current_active_user

router = APIRouter(prefix="/api/ceo", tags=["CEO Chat"])

# ============================================
# MODELS CONFIG
# ============================================

MODELS = {
    "claude": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "strengths": "Code, Analyse, Dokumente, komplexe Logik",
    },
    "gpt4": {
        "provider": "openai",
        "model": "gpt-4o",
        "strengths": "Allrounder, Kreativität, Tools",
    },
    "gpt4-mini": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "strengths": "Schnell, günstig, einfache Tasks",
    },
    "groq": {
        "provider": "groq",
        "model": "llama-3.1-70b-versatile",
        "strengths": "Ultra-Speed, Smalltalk, kurze Fragen",
    },
    "dalle": {
        "provider": "openai",
        "model": "dall-e-3",
        "strengths": "Bildgenerierung",
    },
}

# System Prompt für CHIEF Persona
CHIEF_SYSTEM_PROMPT = """Du bist CHIEF, der High-Performance AI Executive Assistant für CEOs.
- Sei präzise, professionell und extrem effizient.
- Nutze Formatierung (Bullet Points, Fettschrift) für bessere Lesbarkeit.
- Bei Code: Produktionsreif und sauber.
- Bei Analysen: Kritisch und direkt. Kein Fülltext.
- Antworte auf Deutsch, außer der User fragt auf Englisch."""

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class ChatMessage(BaseModel):
    role: str
    content: str

class CEOChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    model: str = "auto"
    history: Optional[List[ChatMessage]] = []

class CEOChatResponse(BaseModel):
    session_id: str
    message: str
    model_used: str
    provider: str
    routing_reason: str
    tokens_used: dict
    created_at: str

# ============================================
# AI DISPATCHER (Das schnelle Gehirn)
# ============================================

async def dispatch_to_best_ai(message: str, has_files: bool = False) -> dict:
    """
    AI-powered Router: Groq Llama 8b analysiert den Input und entscheidet.
    Dauert ca. 0.2 Sekunden, kostet fast nichts.
    """
    
    # HARD RULE: Dateien IMMER zu Claude
    if has_files:
        return {
            "provider": "anthropic",
            "model": "claude-sonnet-4-20250514",
            "model_key": "claude",
            "reason": "File Analysis Specialist"
        }
    
    # AI Dispatcher via Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        # Fallback zu rule-based wenn kein Groq Key
        return rule_based_dispatch(message)
    
    dispatcher_prompt = """Du bist der Router AI für einen CEO Assistant.
Analysiere den User-Input und wähle das BESTE Model basierend auf Komplexität und Kosten.

Verfügbare Models:
1. CLAUDE (anthropic): Für Code, komplexe Logik, Strategie, lange Dokumente, Analysen.
2. GROQ (groq): Für einfache Fragen, Grüße, Fakten, kurzen Smalltalk (Speed ist key!).
3. GPT4 (openai): Für generelle Kreativität, Formatierung, oder wenn unsicher.
4. DALLE (openai): NUR wenn der User explizit ein Bild/Logo/Grafik generieren will.

Antworte NUR mit einem JSON Objekt:
{"provider": "anthropic|groq|openai", "model_key": "claude|groq|gpt4|dalle", "reason": "kurze Erklärung"}"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",  # Ultra schnell für Routing
                    "messages": [
                        {"role": "system", "content": dispatcher_prompt},
                        {"role": "user", "content": f'User Input: "{message}"'}
                    ],
                    "temperature": 0,
                    "max_tokens": 150,
                },
                timeout=5.0,  # Max 5 Sekunden für Router
            )
            
            if response.status_code != 200:
                return rule_based_dispatch(message)
            
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Parse JSON aus der Antwort
            # Manchmal kommt ```json ... ``` zurück
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            decision = json.loads(content.strip())
            
            # Model Config hinzufügen
            model_key = decision.get("model_key", "gpt4-mini")
            if model_key in MODELS:
                decision["model"] = MODELS[model_key]["model"]
                decision["provider"] = MODELS[model_key]["provider"]
            else:
                decision["model"] = "gpt-4o-mini"
                decision["provider"] = "openai"
                decision["model_key"] = "gpt4-mini"
            
            return decision
            
    except Exception as e:
        print(f"Dispatcher Error: {e}")
        return rule_based_dispatch(message)


def rule_based_dispatch(message: str) -> dict:
    """Fallback: Einfache Regel-basierte Entscheidung"""
    msg = message.lower()
    
    # Code/Analyse -> Claude
    if any(kw in msg for kw in ['code', 'python', 'javascript', 'analysier', 'strategie', 'vergleich', 'zusammenfass', 'funktion', 'script', 'bug', 'error']):
        return {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "model_key": "claude", "reason": "Code/Analysis detected"}
    
    # Lange Nachrichten -> Claude
    if len(message) > 500:
        return {"provider": "anthropic", "model": "claude-sonnet-4-20250514", "model_key": "claude", "reason": "Long input needs deep thinking"}
    
    # Bilder -> DALL-E
    if any(kw in msg for kw in ['bild', 'logo', 'zeichne', 'generiere bild', 'male', 'design']):
        return {"provider": "openai", "model": "dall-e-3", "model_key": "dalle", "reason": "Image generation request"}
    
    # Kurze, einfache Fragen -> Groq
    if len(message) < 100 and any(kw in msg for kw in ['hallo', 'hi', 'danke', 'wie geht', 'was ist', 'wer ist']):
        return {"provider": "groq", "model": "llama-3.1-70b-versatile", "model_key": "groq", "reason": "Simple query - speed mode"}
    
    # Default -> GPT-4 Mini
    return {"provider": "openai", "model": "gpt-4o-mini", "model_key": "gpt4-mini", "reason": "General purpose"}


# ============================================
# AI WORKERS (Die Spezialisten)
# ============================================

async def call_anthropic(messages: List[dict], model: str) -> tuple[str, dict]:
    """Call Claude API"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    # Convert messages to Anthropic format
    system_msg = CHIEF_SYSTEM_PROMPT
    chat_msgs = []
    for msg in messages:
        if msg["role"] == "system":
            system_msg = msg["content"]
        else:
            chat_msgs.append({"role": msg["role"], "content": msg["content"]})
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 4096,
                "system": system_msg,
                "messages": chat_msgs,
            },
            timeout=60.0,
        )
        
        if response.status_code != 200:
            error_text = response.text
            print(f"Anthropic Error: {response.status_code} - {error_text}")
            raise HTTPException(status_code=response.status_code, detail=f"Claude error: {error_text}")
        
        data = response.json()
        content = data["content"][0]["text"]
        tokens = {
            "input": data["usage"]["input_tokens"],
            "output": data["usage"]["output_tokens"],
        }
        return content, tokens


async def call_openai(messages: List[dict], model: str) -> tuple[str, dict]:
    """Call OpenAI API"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Add system prompt if not present
    if not any(m["role"] == "system" for m in messages):
        messages = [{"role": "system", "content": CHIEF_SYSTEM_PROMPT}] + messages
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 4096,
            },
            timeout=60.0,
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI error: {response.text}")
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens = {
            "input": data["usage"]["prompt_tokens"],
            "output": data["usage"]["completion_tokens"],
        }
        return content, tokens


async def call_groq(messages: List[dict], model: str) -> tuple[str, dict]:
    """Call Groq API (ultra fast)"""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    # Add system prompt if not present
    if not any(m["role"] == "system" for m in messages):
        messages = [{"role": "system", "content": CHIEF_SYSTEM_PROMPT}] + messages
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            timeout=30.0,
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Groq error: {response.text}")
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens = {
            "input": data["usage"].get("prompt_tokens", 0),
            "output": data["usage"].get("completion_tokens", 0),
        }
        return content, tokens


async def generate_image(prompt: str) -> tuple[str, dict]:
    """Generate image with DALL-E 3"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
            },
            timeout=60.0,
        )
        
        if response.status_code != 200:
            return "Entschuldigung, ich konnte das Bild nicht generieren.", {"input": 0, "output": 0}
        
        data = response.json()
        image_url = data["data"][0]["url"]
        
        return f"Hier ist dein Bild:\n\n![Generiertes Bild]({image_url})\n\n*(Link ist ca. 60 Minuten gültig)*", {"input": 0, "output": 1}


# ============================================
# MEMORY SYSTEM
# ============================================

async def get_chat_context(db, session_id: str, limit: int = 10) -> List[dict]:
    """Holt die letzten Nachrichten für Kontext"""
    try:
        result = db.table("chief_messages")\
            .select("role, content")\
            .eq("session_id", session_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        # Chronologisch umdrehen (Alt -> Neu)
        messages = result.data[::-1] if result.data else []
        return [{"role": m["role"], "content": m["content"]} for m in messages]
    except:
        return []


# ============================================
# HELPER FUNCTIONS
# ============================================

def _extract_user_id(current_user) -> str:
    """Extrahiert user_id aus current_user (verschiedene Formate möglich)"""
    if isinstance(current_user, dict):
        return current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
    if hasattr(current_user, "user_id"):
        return str(current_user.user_id)
    if hasattr(current_user, "id"):
        return str(current_user.id)
    raise HTTPException(status_code=401, detail="User ID konnte nicht extrahiert werden")


# ============================================
# MAIN ENDPOINT
# ============================================

@router.post("/chat", response_model=CEOChatResponse)
async def ceo_chat(
    request: CEOChatRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_supabase),
):
    """
    CHIEF CEO Chat - AI-Powered Multi-Model Router
    
    1. AI Dispatcher entscheidet welches Model (0.2s)
    2. Gewähltes Model antwortet
    3. Alles wird gespeichert (Memory + Billing)
    """
    user_id = _extract_user_id(current_user)
    
    # Session erstellen oder verwenden
    session_id = request.session_id
    if not session_id:
        session_result = db.table("chief_sessions").insert({
            "user_id": user_id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
        }).execute()
        session_id = session_result.data[0]["id"]
    
    # --- SCHRITT A: GEDÄCHTNIS LADEN ---
    history = await get_chat_context(db, session_id, 10)
    
    # --- SCHRITT B: AI DISPATCHER ENTSCHEIDET ---
    if request.model == "auto":
        ai_config = await dispatch_to_best_ai(request.message, has_files=False)
    else:
        # Manual Override
        model_key = request.model
        if model_key in MODELS:
            ai_config = {
                "provider": MODELS[model_key]["provider"],
                "model": MODELS[model_key]["model"],
                "model_key": model_key,
                "reason": "Manual selection"
            }
        else:
            ai_config = {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "model_key": "gpt4-mini",
                "reason": "Default fallback"
            }
    
    print(f"🧠 CHIEF Routing: {ai_config['provider']} ({ai_config.get('model_key')}) - {ai_config['reason']}")
    
    # User Message speichern
    db.table("chief_messages").insert({
        "user_id": user_id,
        "session_id": session_id,
        "role": "user",
        "content": request.message,
        "metadata": {"routing_decision": ai_config},
    }).execute()
    
    # --- SCHRITT C: WORKER AUSFÜHREN ---
    messages = history + [{"role": "user", "content": request.message}]
    
    provider = ai_config["provider"]
    model = ai_config["model"]
    
    try:
        if ai_config.get("model_key") == "dalle":
            response_content, tokens = await generate_image(request.message)
        elif provider == "anthropic":
            response_content, tokens = await call_anthropic(messages, model)
        elif provider == "groq":
            response_content, tokens = await call_groq(messages, model)
        else:
            response_content, tokens = await call_openai(messages, model)
    except HTTPException as e:
        # Fallback bei Fehler
        print(f"Worker Error, falling back to GPT-4 Mini: {e.detail}")
        response_content, tokens = await call_openai(messages, "gpt-4o-mini")
        ai_config["model_key"] = "gpt4-mini"
        ai_config["provider"] = "openai"
        ai_config["reason"] = "Fallback after error"
    
    # --- SCHRITT D: SPEICHERN (Memory + Billing) ---
    db.table("chief_messages").insert({
        "user_id": user_id,
        "session_id": session_id,
        "role": "assistant",
        "content": response_content,
        "model_name": ai_config.get("model_key", "unknown"),
        "provider": ai_config["provider"],
        "metadata": {
            "tokens": tokens,
            "routing_reason": ai_config["reason"],
            "billed": False,
        },
    }).execute()
    
    # Session updated_at aktualisieren
    db.table("chief_sessions").update({
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", session_id).execute()
    
    return CEOChatResponse(
        session_id=session_id,
        message=response_content,
        model_used=ai_config.get("model_key", "unknown"),
        provider=ai_config["provider"],
        routing_reason=ai_config["reason"],
        tokens_used=tokens,
        created_at=datetime.utcnow().isoformat(),
    )


# ============================================
# HELPER ENDPOINTS
# ============================================

@router.get("/sessions")
async def get_sessions(
    current_user = Depends(get_current_active_user),
    db = Depends(get_supabase),
):
    """Get all chat sessions for current user"""
    user_id = _extract_user_id(current_user)
    
    result = db.table("chief_sessions")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("updated_at", desc=True)\
        .limit(50)\
        .execute()
    
    return {"sessions": result.data}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_supabase),
):
    """Get all messages for a session"""
    user_id = _extract_user_id(current_user)
    
    # Verify session belongs to user
    session = db.table("chief_sessions")\
        .select("*")\
        .eq("id", session_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()
    
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.table("chief_messages")\
        .select("*")\
        .eq("session_id", session_id)\
        .order("created_at")\
        .execute()
    
    return {"session": session.data, "messages": messages.data}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user = Depends(get_current_active_user),
    db = Depends(get_supabase),
):
    """Delete a chat session and all its messages"""
    user_id = _extract_user_id(current_user)
    
    # Delete messages first
    db.table("chief_messages").delete().eq("session_id", session_id).execute()
    
    # Delete session
    db.table("chief_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
    
    return {"success": True}
