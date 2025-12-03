"""
Advanced Follow-up Template Service
Handles template management, GPT auto-complete, versioning
"""

from typing import Dict, List, Optional
import json
import os

import openai

from app.core.database import get_db


class TemplateService:
    """Advanced Template Management"""
    
    def __init__(self):
        openai.api_key = os.getenv('OPENAI_API_KEY')
    
    async def get_all_templates(self, channel: Optional[str] = None) -> List[Dict]:
        """
        Get all active templates
        
        Args:
            channel: Filter by channel (optional)
            
        Returns:
            list: Template objects
        """
        
        async with get_db() as db:
            if channel:
                templates = await db.fetch(
                    """
                    SELECT * FROM followup_templates
                    WHERE is_active = TRUE AND channel = $1
                    ORDER BY usage_count DESC
                    """,
                    channel
                )
            else:
                templates = await db.fetch(
                    """
                    SELECT * FROM followup_templates
                    WHERE is_active = TRUE
                    ORDER BY usage_count DESC
                    """
                )
            
            return [dict(t) for t in templates]
    
    async def get_template_by_id(self, template_id: str) -> Optional[Dict]:
        """Get template by ID"""
        
        async with get_db() as db:
            template = await db.fetchrow(
                "SELECT * FROM followup_templates WHERE id = $1",
                template_id
            )
            
            return dict(template) if template else None
    
    async def get_template_by_trigger(
        self,
        trigger_key: str,
        channel: str = 'email'
    ) -> Optional[Dict]:
        """Get template by trigger key and channel"""
        
        async with get_db() as db:
            template = await db.fetchrow(
                "SELECT * FROM get_template_by_trigger($1, $2)",
                trigger_key,
                channel
            )
            
            return dict(template) if template else None
    
    async def create_template(self, template_data: Dict) -> Dict:
        """
        Create new template
        
        Args:
            template_data: Template fields
            
        Returns:
            dict: Created template
        """
        
        async with get_db() as db:
            template = await db.fetchrow(
                """
                INSERT INTO followup_templates (
                    name,
                    trigger_key,
                    channel,
                    category,
                    subject_template,
                    short_template,
                    body_template,
                    reminder_template,
                    fallback_template,
                    gpt_autocomplete_prompt,
                    preview_context,
                    created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
                RETURNING *
                """,
                template_data.get('name'),
                template_data.get('trigger_key'),
                template_data.get('channel'),
                template_data.get('category'),
                template_data.get('subject_template'),
                template_data.get('short_template'),
                template_data.get('body_template'),
                template_data.get('reminder_template'),
                template_data.get('fallback_template'),
                template_data.get('gpt_autocomplete_prompt'),
                json.dumps(template_data.get('preview_context', {})),
                template_data.get('created_by')
            )
            
            return dict(template)
    
    async def update_template(self, template_id: str, updates: Dict) -> Dict:
        """
        Update template
        
        Args:
            template_id: Template UUID
            updates: Fields to update
            
        Returns:
            dict: Updated template
        """
        
        # Build dynamic update query
        set_clauses = []
        values = []
        param_index = 1
        
        for key, value in updates.items():
            if key in ['name', 'body_template', 'reminder_template', 'fallback_template', 
                      'subject_template', 'gpt_autocomplete_prompt', 'preview_context', 
                      'is_active', 'category']:
                set_clauses.append(f"{key} = ${param_index}")
                
                # Handle JSONB
                if key == 'preview_context':
                    values.append(json.dumps(value) if isinstance(value, dict) else value)
                else:
                    values.append(value)
                
                param_index += 1
        
        if not set_clauses:
            return await self.get_template_by_id(template_id)
        
        values.append(template_id)
        
        async with get_db() as db:
            template = await db.fetchrow(
                f"""
                UPDATE followup_templates
                SET {', '.join(set_clauses)}
                WHERE id = ${param_index}
                RETURNING *
                """,
                *values
            )
            
            return dict(template) if template else None
    
    async def gpt_autocomplete_template(
        self,
        template_id: str,
        lead_context: Optional[Dict] = None
    ) -> Dict:
        """
        Use GPT to auto-generate reminder and fallback templates
        
        Args:
            template_id: Template UUID
            lead_context: Optional context to use (overrides preview_context)
            
        Returns:
            dict: { 'reminder_template': str, 'fallback_template': str }
        """
        
        template = await self.get_template_by_id(template_id)
        
        if not template:
            raise ValueError("Template not found")
        
        # Build context
        context = template.get('preview_context', {})
        if lead_context:
            context.update(lead_context)
        
        gpt_prompt = template.get('gpt_autocomplete_prompt')
        
        if not gpt_prompt:
            raise ValueError("Template has no GPT autocomplete prompt")
        
        # Render GPT prompt with context
        rendered_prompt = self._render_string(gpt_prompt, context)
        
        try:
            response = openai.ChatCompletion.create(
                model=os.getenv('OPENAI_MODEL', 'gpt-4'),
                messages=[
                    {
                        "role": "system",
                        "content": "Du bist ein empathischer KI-Vertriebsassistent. Du generierst Follow-up Messages für Sales Flow AI."
                    },
                    {
                        "role": "user",
                        "content": rendered_prompt
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            # Parse response to extract reminder and fallback
            reminder, fallback = self._parse_gpt_response(content)
            
            return {
                "reminder_template": reminder,
                "fallback_template": fallback,
                "raw_response": content
            }
            
        except Exception as e:
            print(f"GPT Error: {e}")
            raise
    
    def _render_string(self, template: str, context: Dict) -> str:
        """Render template string with context"""
        result = template
        for key, value in context.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result
    
    def _parse_gpt_response(self, content: str) -> tuple:
        """
        Parse GPT response to extract reminder and fallback
        
        Expects format:
        1. Reminder (2 Tage): [text]
        2. Fallback (5 Tage): [text]
        """
        
        lines = content.strip().split('\n')
        
        reminder = None
        fallback = None
        
        current_section = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            
            if 'reminder' in line.lower() and ':' in line:
                if current_section and current_text:
                    if current_section == 'reminder':
                        reminder = '\n'.join(current_text)
                    elif current_section == 'fallback':
                        fallback = '\n'.join(current_text)
                
                current_section = 'reminder'
                current_text = [line.split(':', 1)[-1].strip()]
                
            elif 'fallback' in line.lower() and ':' in line:
                if current_section == 'reminder' and current_text:
                    reminder = '\n'.join(current_text)
                
                current_section = 'fallback'
                current_text = [line.split(':', 1)[-1].strip()]
                
            elif current_section:
                current_text.append(line)
        
        # Handle last section
        if current_section and current_text:
            if current_section == 'reminder':
                reminder = '\n'.join(current_text)
            elif current_section == 'fallback':
                fallback = '\n'.join(current_text)
        
        # Fallback to splitting by numbers if structured parsing fails
        if not reminder or not fallback:
            parts = content.split('2.', 1)
            if len(parts) == 2:
                reminder = parts[0].replace('1.', '').strip()
                fallback = parts[1].strip()
            else:
                reminder = content
                fallback = "Falls keine Antwort: Vielen Dank für deine Zeit. Ich melde mich später nochmal."
        
        return reminder, fallback
    
    async def preview_template(
        self,
        template_id: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Preview template with context
        
        Args:
            template_id: Template UUID
            context: Context to render with
            
        Returns:
            dict: Rendered template fields
        """
        
        template = await self.get_template_by_id(template_id)
        
        if not template:
            raise ValueError("Template not found")
        
        # Use preview_context if no context provided
        render_context = context or template.get('preview_context', {})
        
        rendered = {
            'subject': self._render_string(template.get('subject_template', ''), render_context) if template.get('subject_template') else None,
            'body': self._render_string(template.get('body_template', ''), render_context),
            'reminder': self._render_string(template.get('reminder_template', ''), render_context) if template.get('reminder_template') else None,
            'fallback': self._render_string(template.get('fallback_template', ''), render_context) if template.get('fallback_template') else None,
        }
        
        return rendered
    
    async def get_template_versions(self, template_id: str) -> List[Dict]:
        """Get version history for template"""
        
        async with get_db() as db:
            versions = await db.fetch(
                """
                SELECT * FROM template_versions
                WHERE template_id = $1
                ORDER BY created_at DESC
                """,
                template_id
            )
            
            return [dict(v) for v in versions]


# Singleton instance
template_service = TemplateService()
