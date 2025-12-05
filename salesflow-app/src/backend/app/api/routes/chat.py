"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT API - Simple Chat Endpoint for Mobile App                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    - POST /chat - Simple chat endpoint
    - POST /chat/completion - Chat with history
"""

import json
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ...db.deps import get_db
from ...services.llm_client import get_llm_client


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ChatMessage(BaseModel):
    """Single chat message."""
    role: str = Field(..., description="Role: user, assistant, system")
    content: str = Field(..., description="Message content")


class SimpleChatRequest(BaseModel):
    """Simple chat request for mobile."""
    message: str = Field(..., description="User message")
    context: Optional[str] = Field(default="mlm_sales", description="Context/vertical")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Chat history")


class ChatCompletionRequest(BaseModel):
    """Chat completion request with full options."""
    messages: List[ChatMessage] = Field(..., description="Message history")
    temperature: Optional[float] = Field(default=0.7, description="Temperature")
    max_tokens: Optional[int] = Field(default=1000, description="Max tokens")


class ChatResponse(BaseModel):
    """Chat response."""
    response: str = Field(..., description="AI response")
    message: Optional[str] = Field(default=None, description="Alias for response")
    

# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SALES_COACH_PROMPT = """Du bist ein erfahrener Sales Coach für Network Marketing im DACH-Raum.

🎯 DEINE ROLLE:
- Hilf bei Einwandbehandlung
- Gib Tipps für Follow-Ups
- Erstelle Verkaufsskripte
- Coache zu Abschlusstechniken

💬 DEIN STIL:
- Kurz und knackig
- Praxisorientiert
- Motivierend aber realistisch
- Du duzt den User

📊 DEINE EXPERTISE:
- DISG-Persönlichkeitstypen
- LIRA-Framework für Einwände
- Network Marketing Best Practices
- Closing Techniken

Antworte immer auf Deutsch und gib konkrete, umsetzbare Tipps!
"""


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
async def simple_chat(
    request: SimpleChatRequest,
    db = Depends(get_db),
):
    """
    Simple chat endpoint für Mobile App.
    
    Akzeptiert: {"message": "...", "context": "mlm_sales", "history": [...]}
    """
    try:
        llm_client = get_llm_client()
        
        # Build messages
        messages = [{"role": "system", "content": SALES_COACH_PROMPT}]
        
        # Add history if present
        if request.history:
            for msg in request.history[-5:]:  # Last 5 messages
                messages.append({"role": msg.role, "content": msg.content})
        
        # Add current message
        messages.append({"role": "user", "content": request.message})
        
        response_text = await llm_client.chat(
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )
        
        logger.info(f"Chat response generated for: {request.message[:50]}...")
        
        return ChatResponse(
            response=response_text,
            message=response_text  # Alias for compatibility
        )
        
    except Exception as e:
        logger.exception(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/completion", response_model=ChatResponse)
async def chat_completion(
    request: ChatCompletionRequest,
    db = Depends(get_db),
):
    """
    Chat completion with full message history.
    """
    try:
        llm_client = get_llm_client()
        
        # Prepend system prompt if not present
        messages = []
        has_system = any(m.role == "system" for m in request.messages)
        
        if not has_system:
            messages.append({"role": "system", "content": SALES_COACH_PROMPT})
        
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        response_text = await llm_client.chat(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        return ChatResponse(
            response=response_text,
            message=response_text
        )
        
    except Exception as e:
        logger.exception(f"Error in chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def chat_health():
    """Health check for chat service."""
    return {"status": "ok", "service": "chat"}

