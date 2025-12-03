"""
AI Prompts Service
Verwaltet und führt wiederverwendbare GPT-Prompts aus
"""

from typing import Dict, List, Optional
import re
import os
from openai import OpenAI
import json
from datetime import datetime
import uuid

from ..database import get_db


class AIPromptsService:
    """AI Prompts Management & Execution"""
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of OpenAI client"""
        if self._client is None:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY nicht gesetzt")
            self._client = OpenAI(api_key=api_key)
        return self._client
    
    async def get_prompts_by_category(self, category: str) -> List[Dict]:
        """Get all active prompts in a category"""
        
        async with get_db() as db:
            result = await db.execute(
                """
                SELECT * FROM ai_prompts
                WHERE category = $1 AND is_active = TRUE
                ORDER BY usage_count DESC, name ASC
                """,
                category
            )
            
            return [dict(row) for row in result.fetchall()]
    
    async def execute_prompt(
        self,
        prompt_id: str,
        input_values: Dict[str, any],
        user_id: str,
        lead_id: Optional[str] = None
    ) -> Dict:
        """
        Execute a prompt with given input values.
        
        Returns:
        {
            "success": bool,
            "output": str,
            "execution_id": str
        }
        """
        start_time = datetime.now()
        
        async with get_db() as db:
            # Get prompt
            prompt_result = await db.execute(
                "SELECT * FROM ai_prompts WHERE id = $1",
                prompt_id
            )
            prompt = prompt_result.fetchone()
            
            if not prompt:
                raise ValueError(f"Prompt {prompt_id} not found")
            
            # Replace placeholders
            filled_prompt = self._fill_template(
                prompt['prompt_template'],
                input_values
            )
            
            # Execute with GPT-4
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "Du bist ein Sales-Experte für Network Marketing. Antworte präzise, empathisch und handlungsorientiert."
                        },
                        {
                            "role": "user",
                            "content": filled_prompt
                        }
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                
                output = response.choices[0].message.content
                execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                
                # Log execution
                execution_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO ai_prompt_executions 
                    (id, prompt_id, user_id, lead_id, input_values, generated_output, execution_time_ms, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    execution_id, prompt_id, user_id, lead_id, 
                    json.dumps(input_values), output, execution_time_ms, 'success'
                )
                
                # Update usage stats
                await db.execute(
                    "UPDATE ai_prompts SET usage_count = usage_count + 1 WHERE id = $1",
                    prompt_id
                )
                
                await db.commit()
                
                return {
                    "success": True,
                    "output": output,
                    "execution_id": execution_id
                }
                
            except Exception as e:
                # Log failed execution
                execution_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO ai_prompt_executions 
                    (id, prompt_id, user_id, lead_id, input_values, status, error_message)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    execution_id, prompt_id, user_id, lead_id,
                    json.dumps(input_values), 'failed', str(e)
                )
                
                await db.commit()
                
                return {
                    "success": False,
                    "error": str(e)
                }
    
    def _fill_template(self, template: str, values: Dict) -> str:
        """Replace {{placeholders}} with actual values"""
        
        result = template
        
        for key, value in values.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        
        return result
    
    async def get_prompt_suggestions(self, context: Dict) -> List[Dict]:
        """
        Suggest relevant prompts based on context.
        
        Context can include:
        - lead_status
        - bant_score
        - last_interaction_days
        - objections
        """
        suggestions = []
        
        # If lead has objections -> suggest objection handling
        if context.get('objections'):
            suggestions.extend(
                await self.get_prompts_by_category('objection_handling')
            )
        
        # If lead is qualified -> suggest demo invitation
        if context.get('bant_score', 0) >= 75:
            suggestions.extend(
                await self.get_prompts_by_category('lead_progression')
            )
        
        # If lead is inactive -> suggest re-engagement
        if context.get('last_interaction_days', 0) >= 7:
            suggestions.extend(
                await self.get_prompts_by_category('nurture')
            )
        
        return suggestions[:5]  # Top 5 suggestions


# Initialize service
ai_prompts_service = AIPromptsService()

