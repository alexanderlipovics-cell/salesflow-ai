"""
AI Prompts API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from ..services.ai_prompts_service import ai_prompts_service
from ..services.interactive_chat_service import interactive_chat_service
from ..services.gpt_functions_service import gpt_functions_service
from ..database import get_db

router = APIRouter(prefix="/api/ai-prompts", tags=["AI Prompts"])


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class ExecutePromptRequest(BaseModel):
    prompt_id: str
    input_values: Dict
    lead_id: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[Dict]
    use_functions: bool = False


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/categories/{category}")
async def get_prompts_by_category(category: str):
    """Get all prompts in a category"""
    try:
        prompts = await ai_prompts_service.get_prompts_by_category(category)
        return {"prompts": prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_prompt(request: ExecutePromptRequest):
    """Execute a prompt with given input values"""
    
    try:
        # Mock user_id for now (in production, get from auth)
        user_id = "00000000-0000-0000-0000-000000000000"
        
        result = await ai_prompts_service.execute_prompt(
            prompt_id=request.prompt_id,
            input_values=request.input_values,
            user_id=user_id,
            lead_id=request.lead_id
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest):
    """Chat with GPT (with optional function calling)"""
    
    try:
        if request.use_functions:
            result = await gpt_functions_service.chat_with_functions(request.messages)
        else:
            result = await interactive_chat_service.chat(request.messages)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_prompt_suggestions(lead_id: str):
    """Get prompt suggestions based on lead context"""
    
    try:
        # Get lead context from database
        async with get_db() as db:
            lead_result = await db.execute(
                "SELECT * FROM leads WHERE id = $1",
                lead_id
            )
            lead = lead_result.fetchone()
            
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")
            
            # Build context
            context = {
                "lead_status": lead.get('status'),
                "bant_score": lead.get('bant_score', 0),
                "last_interaction_days": (
                    (datetime.now() - lead['last_contact']).days 
                    if lead.get('last_contact') else 999
                ),
                "objections": lead.get('objections')
            }
        
        suggestions = await ai_prompts_service.get_prompt_suggestions(context)
        
        return {"suggestions": suggestions}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_prompts():
    """Get all active prompts"""
    
    try:
        async with get_db() as db:
            result = await db.execute(
                """
                SELECT id, name, category, description, usage_count
                FROM ai_prompts
                WHERE is_active = TRUE
                ORDER BY category, usage_count DESC
                """
            )
            
            prompts = [dict(row) for row in result.fetchall()]
            
            return {"prompts": prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_feedback(execution_id: str, rating: int, feedback: Optional[str] = None):
    """Submit user feedback for a prompt execution"""
    
    try:
        async with get_db() as db:
            await db.execute(
                """
                UPDATE ai_prompt_executions
                SET user_rating = $1, user_feedback = $2
                WHERE id = $3
                """,
                rating, feedback, execution_id
            )
            await db.commit()
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

