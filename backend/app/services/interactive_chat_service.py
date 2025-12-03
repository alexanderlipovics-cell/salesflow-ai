"""
Interactive Chat Service
GPT responses with clickable options (Quick Replies)
"""

from typing import Dict, List, Optional
import os
from openai import OpenAI
import json


class InteractiveChatService:
    """GPT Chat with Interactive Options"""
    
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
    
    async def chat(
        self,
        messages: List[Dict],
        enable_options: bool = True
    ) -> Dict:
        """
        Chat with GPT, optionally returning clickable options.
        
        Returns:
        {
            "message": str,
            "options": [{"label": str, "value": str, "action": str}] or None
        }
        """
        
        system_prompt = """
Du bist ein Sales-Experte für Network Marketing.

Wenn du den User um eine Entscheidung bittest (z.B. Kanal-Auswahl, Termin-Vorschläge), 
antworte im JSON-Format:

{
  "message": "Deine Nachricht hier",
  "options": [
    {"label": "✅ WhatsApp", "value": "whatsapp", "action": "send_via_whatsapp"},
    {"label": "📧 E-Mail", "value": "email", "action": "send_via_email"},
    {"label": "📲 Hier im Chat", "value": "chat", "action": "continue_chat"}
  ]
}

Wenn keine Auswahl nötig ist, antworte normal mit nur "message".
"""
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Try to parse as JSON (if GPT returned structured response)
        try:
            parsed = json.loads(content)
            
            if "message" in parsed:
                return parsed
            else:
                # Not structured, return as plain message
                return {"message": content, "options": None}
        except json.JSONDecodeError:
            # Plain text response
            return {"message": content, "options": None}


# Initialize service
interactive_chat_service = InteractiveChatService()

