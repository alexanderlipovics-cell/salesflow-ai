"""
═══════════════════════════════════════════════════════════════════════════
INTELLIGENT CHAT API
═══════════════════════════════════════════════════════════════════════════
API endpoints für den Intelligent Chat Service.

Endpoints:
- POST /api/intelligent-chat/message - Send message with auto-extraction
- GET /api/intelligent-chat/history - Get chat history
- GET /api/intelligent-chat/suggestions - Get smart suggestions

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.intelligent_chat_service import IntelligentChatService
from app.services.openai_service import OpenAIService
from app.core.auth import get_current_user
from app.utils.logger import get_logger
from openai import AsyncOpenAI
import os

logger = get_logger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: user, assistant, or system")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., description="User message")
    lead_id: Optional[str] = Field(None, description="Optional lead ID context")
    conversation_history: Optional[List[ChatMessage]] = Field(None, description="Conversation history")


class SendMessageResponse(BaseModel):
    ai_response: str
    actions_taken: List[str]
    lead_id: Optional[str]
    suggestions: List[str]
    extracted_data: Dict[str, Any]
    processing_time_ms: int


class ChatHistoryResponse(BaseModel):
    messages: List[Dict[str, Any]]
    total_count: int


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_chat_service() -> IntelligentChatService:
    """Get intelligent chat service instance."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Intelligent Chat requires OpenAI API access."
        )
    
    openai_client = AsyncOpenAI(api_key=api_key)
    return IntelligentChatService(openai_client=openai_client)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    chat_service: IntelligentChatService = Depends(get_chat_service)
):
    """
    Send message to intelligent chat with automatic data extraction.
    
    The AI will:
    - Extract lead data, BANT signals, objections, personality signals
    - Automatically create/update leads
    - Calculate BANT scores
    - Detect personality types
    - Generate smart responses with context
    - Provide next-step suggestions
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        # Convert conversation history
        conversation_history = None
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        # Process message
        result = await chat_service.process_message(
            user_id=user_id,
            message=request.message,
            lead_id=request.lead_id,
            conversation_history=conversation_history
        )
        
        return SendMessageResponse(
            ai_response=result['ai_response'],
            actions_taken=result['actions_taken'],
            lead_id=result.get('lead_id'),
            suggestions=result['suggestions'],
            extracted_data=result['extracted_data'],
            processing_time_ms=result.get('processing_time_ms', 0)
        )
    
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    lead_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get chat history for user or specific lead.
    
    Query Parameters:
    - lead_id: Optional - Filter by lead
    - limit: Max number of messages (default: 50)
    - offset: Pagination offset (default: 0)
    """
    try:
        from app.core.supabase import get_supabase_client
        supabase = get_supabase_client()
        
        user_id = current_user.get('sub') or current_user.get('id')
        
        # Build query
        query = supabase.table('intelligent_chat_logs').select('*').eq('user_id', user_id)
        
        if lead_id:
            query = query.eq('lead_id', lead_id)
        
        # Get total count
        count_result = query.execute()
        total_count = len(count_result.data) if count_result.data else 0
        
        # Get paginated messages
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        messages = result.data or []
        
        return ChatHistoryResponse(
            messages=messages,
            total_count=total_count
        )
    
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching chat history: {str(e)}")


@router.get("/suggestions/{lead_id}")
async def get_smart_suggestions(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get smart suggestions for a specific lead based on current context.
    
    Returns contextual suggestions like:
    - Next best actions
    - Follow-up timing
    - Objection handling tips
    - Recommended content to share
    """
    try:
        from app.core.supabase import get_supabase_client
        from app.services.predictive_ai_service import PredictiveAIService
        
        supabase = get_supabase_client()
        predictive_service = PredictiveAIService(supabase=supabase)
        
        # Get win probability and recommendations
        win_prob = await predictive_service.calculate_win_probability(lead_id)
        
        # Get optimal contact time
        user_id = current_user.get('sub') or current_user.get('id')
        optimal_time = await predictive_service.get_optimal_contact_time(lead_id, user_id)
        
        # Get lead status
        lead = supabase.table('leads').select('status, name').eq('id', lead_id).execute()
        lead_data = lead.data[0] if lead.data else {}
        
        suggestions = {
            "win_probability": win_prob['win_probability'],
            "confidence": win_prob['confidence'],
            "recommendations": win_prob['recommendations'],
            "optimal_contact_time": optimal_time,
            "lead_status": lead_data.get('status', 'unknown'),
            "lead_name": lead_data.get('name', 'Unknown')
        }
        
        return suggestions
    
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.get("/status")
async def get_chat_status():
    """
    Check if Intelligent Chat service is available.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    return {
        "service": "intelligent_chat",
        "status": "available" if api_key else "unavailable",
        "requires_openai": True,
        "has_api_key": bool(api_key),
        "features": [
            "auto_extraction",
            "lead_creation",
            "bant_scoring",
            "personality_detection",
            "objection_handling",
            "smart_suggestions"
        ]
    }

