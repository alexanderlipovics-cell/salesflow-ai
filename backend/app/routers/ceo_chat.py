"""
CHIEF CEO Chat - Multi-Model AI Router
Automatisch das beste Modell für jede Anfrage wählen
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, AsyncGenerator
import json
import re
from datetime import datetime
import httpx
import os

from app.core.deps import get_supabase
from app.core.security import get_current_active_user

router = APIRouter(prefix="/api/ceo", tags=["CEO Chat"])

# ============================================
# MODELS CONFIG
# ============================================

MODELS = {
    "claude": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "api_key_env": "ANTHROPIC_API_KEY",
        "strengths": ["analysis", "code", "writing", "reasoning", "long_context"],
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015,
    },
    "gpt4": {
        "provider": "openai",
        "model": "gpt-4o",
        "api_key_env": "OPENAI_API_KEY",
        "strengths": ["general", "tools", "function_calling", "vision"],
        "cost_per_1k_input": 0.005,
        "cost_per_1k_output": 0.015,
    },
    "gpt4-mini": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "api_key_env": "OPENAI_API_KEY",
        "strengths": ["fast", "cheap", "general"],
        "cost_per_1k_input": 0.00015,
        "cost_per_1k_output": 0.0006,
    },
    "groq": {
        "provider": "groq",
        "model": "llama-3.1-70b-versatile",
        "api_key_env": "GROQ_API_KEY",
        "strengths": ["speed", "cheap", "simple_tasks"],
        "cost_per_1k_input": 0.00059,
        "cost_per_1k_output": 0.00079,
    },
    "gemini": {
        "provider": "google",
        "model": "gemini-1.5-pro",
        "api_key_env": "GEMINI_API_KEY",
        "strengths": ["google_integration", "long_context", "multimodal"],
        "cost_per_1k_input": 0.00125,
        "cost_per_1k_output": 0.005,
    },
}

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class CEOChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    model: str = "auto"  # 'auto', 'claude', 'gpt4', 'groq', 'gemini'
    history: Optional[List[ChatMessage]] = []

class CEOChatResponse(BaseModel):
    session_id: str
    message: str
    model_used: str
    provider: str
    tokens_used: dict
    created_at: str

# ============================================
# AUTO ROUTER LOGIC
# ============================================

def detect_intent(message: str) -> str:
    """Erkennt was der User will und wählt das beste Modell"""
    
    message_lower = message.lower()
    
    # Code-bezogen → Claude
    code_keywords = ['code', 'python', 'javascript', 'typescript', 'react', 
                     'function', 'class', 'bug', 'error', 'debug', 'api',
                     'programmier', 'script', 'sql', 'database', 'backend', 'frontend']
    if any(kw in message_lower for kw in code_keywords):
        return "claude"
    
    # Analyse/Reasoning → Claude
    analysis_keywords = ['analysier', 'erkläre', 'warum', 'vergleich', 'strategie',
                        'review', 'bewerte', 'vor- und nachteile', 'zusammenfass']
    if any(kw in message_lower for kw in analysis_keywords):
        return "claude"
    
    # Langes Dokument → Claude (bester Kontext)
    if len(message) > 2000:
        return "claude"
    
    # Schnelle Antwort gewünscht → Groq
    speed_keywords = ['schnell', 'kurz', 'quick', 'fast', 'einfach nur']
    if any(kw in message_lower for kw in speed_keywords):
        return "groq"
    
    # Einfache Fragen → Groq (spart Geld)
    simple_patterns = [
        r'^was ist\s', r'^wer ist\s', r'^wann\s', r'^wo\s',
        r'^wie viel', r'^ja oder nein', r'^definiere\s'
    ]
    if any(re.match(p, message_lower) for p in simple_patterns):
        return "groq"
    
    # Google-spezifisch → Gemini
    google_keywords = ['google', 'gmail', 'calendar', 'docs', 'sheets', 'drive']
    if any(kw in message_lower for kw in google_keywords):
        return "gemini"
    
    # Bilder → GPT-4 (DALL-E Zugang)
    image_keywords = ['bild', 'image', 'foto', 'design', 'logo', 'visuali']
    if any(kw in message_lower for kw in image_keywords):
        return "gpt4"
    
    # Default für mittlere Komplexität → GPT-4-mini (gute Balance)
    return "gpt4-mini"

# ============================================
# API CALLS
# ============================================

async def call_anthropic(messages: List[dict], model: str) -> tuple[str, dict]:
    """Call Claude API"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    # Convert messages to Anthropic format
    system_msg = ""
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
                "system": system_msg or "Du bist CHIEF, der intelligente AI-Assistent für CEOs.",
                "messages": chat_msgs,
            },
            timeout=60.0,
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Anthropic error: {response.text}")
        
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

# ============================================
# MAIN ENDPOINT
# ============================================

@router.post("/chat", response_model=CEOChatResponse)
async def ceo_chat(
    request: CEOChatRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
):
    """
    CHIEF CEO Chat - Multi-Model AI Router
    
    - model: 'auto' (default) - CHIEF wählt das beste Modell
    - model: 'claude', 'gpt4', 'gpt4-mini', 'groq', 'gemini' - Manual override
    """
    from app.routers.chief import _extract_user_id
    
    user_id = _extract_user_id(current_user)
    
    # Session erstellen oder verwenden
    session_id = request.session_id
    if not session_id:
        # Neue Session erstellen
        try:
            session_result = db.table("chief_sessions").insert({
                "user_id": user_id,
                "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            }).execute()
            session_id = session_result.data[0]["id"]
        except Exception as e:
            # Fallback: Session ID generieren
            import uuid
            session_id = str(uuid.uuid4())
    
    # Model wählen
    if request.model == "auto":
        selected_model = detect_intent(request.message)
    else:
        selected_model = request.model
    
    model_config = MODELS.get(selected_model, MODELS["gpt4-mini"])
    
    # System Message
    system_message = """Du bist CHIEF, der intelligente AI-Assistent für CEOs und Unternehmer.

Du bist:
- Direkt und auf den Punkt
- Strategisch denkend
- Praktisch orientiert
- Unterstützend aber ehrlich

Du kannst:
- Code schreiben und erklären
- Dokumente analysieren
- Strategien entwickeln
- Content erstellen
- Business-Entscheidungen unterstützen

Antworte immer auf Deutsch, außer der User fragt explizit auf Englisch."""

    # Messages aufbauen
    messages = [{"role": "system", "content": system_message}]
    
    # History hinzufügen
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    
    # Aktuelle Nachricht
    messages.append({"role": "user", "content": request.message})
    
    # User Message speichern
    try:
        db.table("chief_messages").insert({
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": request.message,
            "model_name": None,
            "provider": None,
            "metadata": {},
        }).execute()
    except Exception as e:
        # Tabelle existiert möglicherweise nicht - das ist OK
        pass
    
    # API Call basierend auf Provider
    provider = model_config["provider"]
    model_name = model_config["model"]
    
    if provider == "anthropic":
        response_content, tokens = await call_anthropic(messages, model_name)
    elif provider == "openai":
        response_content, tokens = await call_openai(messages, model_name)
    elif provider == "groq":
        response_content, tokens = await call_groq(messages, model_name)
    else:
        # Fallback to OpenAI
        response_content, tokens = await call_openai(messages, "gpt-4o-mini")
        provider = "openai"
        model_name = "gpt-4o-mini"
    
    # Assistant Message speichern
    try:
        db.table("chief_messages").insert({
            "user_id": user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": response_content,
            "model_name": model_name,
            "provider": provider,
            "metadata": {"tokens": tokens},
        }).execute()
    except Exception as e:
        # Tabelle existiert möglicherweise nicht - das ist OK
        pass
    
    return CEOChatResponse(
        session_id=session_id,
        message=response_content,
        model_used=selected_model,
        provider=provider,
        tokens_used=tokens,
        created_at=datetime.utcnow().isoformat(),
    )

# ============================================
# HELPER ENDPOINTS
# ============================================

@router.get("/sessions")
async def get_sessions(
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
):
    """Get all chat sessions for current user"""
    from app.routers.chief import _extract_user_id
    
    user_id = _extract_user_id(current_user)
    
    try:
        result = db.table("chief_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("updated_at", desc=True)\
            .limit(50)\
            .execute()
        
        return {"sessions": result.data or []}
    except Exception as e:
        return {"sessions": []}

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
):
    """Get all messages for a session"""
    from app.routers.chief import _extract_user_id
    
    user_id = _extract_user_id(current_user)
    
    try:
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
        
        return {
            "session": session.data,
            "messages": messages.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
):
    """Delete a chat session and all its messages"""
    from app.routers.chief import _extract_user_id
    
    user_id = _extract_user_id(current_user)
    
    try:
        # Delete session (messages cascade)
        db.table("chief_sessions")\
            .delete()\
            .eq("id", session_id)\
            .eq("user_id", user_id)\
            .execute()
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

