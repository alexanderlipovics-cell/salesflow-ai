"""
GPT Service with i18n Support
Handles OpenAI GPT-4 interactions with language awareness
"""

from typing import Dict, List, Optional, Any
import openai
import json
from datetime import datetime

from app.services.i18n_service import i18n_service
from app.config import settings


class GPTService:
    """GPT Integration with Language Support"""
    
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
        self.model = "gpt-4"
        self.temperature = 0.7
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        user_id: str,
        enable_functions: bool = False,
        temperature: Optional[float] = None
    ) -> Dict:
        """Chat with GPT in user's language"""
        
        # Get user's language
        user_language = await i18n_service.get_user_language(user_id)
        
        # Get system prompt in user's language
        system_prompt = await i18n_service.get_gpt_system_prompt_in_language(user_language)
        
        # Prepend system prompt
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages
        
        # Call OpenAI
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=full_messages,
                temperature=temperature or self.temperature
            )
            
            return {
                "message": response.choices[0].message.content,
                "language": user_language,
                "model": self.model,
                "tokens_used": response.usage.total_tokens
            }
        except Exception as e:
            return {
                "error": str(e),
                "language": user_language
            }
    
    async def autocomplete_template(
        self,
        template_id: str,
        user_id: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """Auto-complete template in user's language"""
        
        # Get user's language
        user_language = await i18n_service.get_user_language(user_id)
        
        # Get template in user's language
        template = await i18n_service.get_template_in_language(
            template_id=template_id,
            language=user_language
        )
        
        if not template:
            return {
                "error": "Template not found",
                "language": user_language
            }
        
        # Create language-specific prompt
        prompts = {
            'de': f"""Generiere einen REMINDER und FALLBACK für dieses Follow-up Template:

**ORIGINAL MESSAGE:**
{template.get('body_template', '')}

**REMINDER** (falls keine Antwort nach 3 Tagen):
- Kurz, freundlich, nicht aufdringlich
- Bietet alternative Kontaktmöglichkeit an

**FALLBACK** (falls keine Antwort nach 7 Tagen):
- Respektvoll, gibt Exit-Möglichkeit
- Hält Tür offen für später

Ton: empathisch, professionell, modern (Du-Ansprache)

Antworte im JSON Format:
{{
  "reminder": "...",
  "fallback": "..."
}}""",

            'en': f"""Generate a REMINDER and FALLBACK for this follow-up template:

**ORIGINAL MESSAGE:**
{template.get('body_template', '')}

**REMINDER** (if no response after 3 days):
- Short, friendly, not pushy
- Offers alternative contact option

**FALLBACK** (if no response after 7 days):
- Respectful, gives exit option
- Keeps door open for later

Tone: empathetic, professional, modern

Respond in JSON format:
{{
  "reminder": "...",
  "fallback": "..."
}}""",

            'fr': f"""Génère un RAPPEL et un FALLBACK pour ce modèle de suivi:

**MESSAGE ORIGINAL:**
{template.get('body_template', '')}

**RAPPEL** (si pas de réponse après 3 jours):
- Court, amical, pas insistant
- Propose une alternative de contact

**FALLBACK** (si pas de réponse après 7 jours):
- Respectueux, donne une option de sortie
- Garde la porte ouverte pour plus tard

Ton: empathique, professionnel, moderne

Réponds au format JSON:
{{
  "reminder": "...",
  "fallback": "..."
}}""",

            'es': f"""Genera un RECORDATORIO y FALLBACK para esta plantilla de seguimiento:

**MENSAJE ORIGINAL:**
{template.get('body_template', '')}

**RECORDATORIO** (si no hay respuesta después de 3 días):
- Corto, amigable, no insistente
- Ofrece opción de contacto alternativa

**FALLBACK** (si no hay respuesta después de 7 días):
- Respetuoso, da opción de salida
- Mantiene la puerta abierta para más tarde

Tono: empático, profesional, moderno

Responde en formato JSON:
{{
  "reminder": "...",
  "fallback": "..."
}}"""
        }
        
        prompt = prompts.get(user_language, prompts['de'])
        
        # Get system prompt
        system_prompt = await i18n_service.get_gpt_system_prompt_in_language(user_language)
        
        # Call GPT
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON response
            result = json.loads(content)
            
            return {
                "reminder_template": result.get('reminder', ''),
                "fallback_template": result.get('fallback', ''),
                "language": user_language,
                "tokens_used": response.usage.total_tokens
            }
        except Exception as e:
            return {
                "error": str(e),
                "language": user_language
            }
    
    async def generate_followup_message(
        self,
        lead_data: Dict,
        template: Dict,
        user_id: str,
        context: Optional[str] = None
    ) -> Dict:
        """Generate personalized follow-up message"""
        
        # Get user's language
        user_language = await i18n_service.get_user_language(user_id)
        
        # Create prompt
        prompts = {
            'de': f"""Personalisiere diese Follow-up Nachricht für den Lead:

**LEAD:**
- Name: {lead_data.get('first_name', '')} {lead_data.get('last_name', '')}
- Status: {lead_data.get('status', '')}
- Letzte Interaktion: {lead_data.get('last_interaction', 'N/A')}

**TEMPLATE:**
{template.get('body_template', '')}

**CONTEXT:**
{context or 'Keine zusätzlichen Informationen'}

Personalisiere die Nachricht:
- Verwende den Namen natürlich
- Beziehe dich auf Status/Context
- Halte den Ton des Templates bei
- Maximal 150 Wörter

Antworte NUR mit der personalisierten Nachricht.""",

            'en': f"""Personalize this follow-up message for the lead:

**LEAD:**
- Name: {lead_data.get('first_name', '')} {lead_data.get('last_name', '')}
- Status: {lead_data.get('status', '')}
- Last Interaction: {lead_data.get('last_interaction', 'N/A')}

**TEMPLATE:**
{template.get('body_template', '')}

**CONTEXT:**
{context or 'No additional information'}

Personalize the message:
- Use the name naturally
- Reference status/context
- Maintain template tone
- Maximum 150 words

Respond ONLY with the personalized message."""
        }
        
        prompt = prompts.get(user_language, prompts['de'])
        
        # Get system prompt
        system_prompt = await i18n_service.get_gpt_system_prompt_in_language(user_language)
        
        # Call GPT
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8
            )
            
            return {
                "message": response.choices[0].message.content,
                "language": user_language,
                "tokens_used": response.usage.total_tokens
            }
        except Exception as e:
            return {
                "error": str(e),
                "language": user_language
            }
    
    async def translate_template(
        self,
        template_text: str,
        from_language: str,
        to_language: str,
        user_id: str
    ) -> Dict:
        """Translate template to another language"""
        
        prompt = f"""Translate this sales follow-up template from {from_language} to {to_language}:

**ORIGINAL:**
{template_text}

Requirements:
- Keep placeholders like {{{{first_name}}}} intact
- Maintain the tone and style
- Adapt culturally appropriate (e.g., emojis, formality level)
- Keep line breaks

Respond ONLY with the translated text."""
        
        # Get system prompt in target language
        system_prompt = await i18n_service.get_gpt_system_prompt_in_language(to_language)
        
        # Call GPT
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )
            
            return {
                "translated_text": response.choices[0].message.content,
                "from_language": from_language,
                "to_language": to_language,
                "tokens_used": response.usage.total_tokens
            }
        except Exception as e:
            return {
                "error": str(e),
                "from_language": from_language,
                "to_language": to_language
            }
    
    async def detect_language(self, text: str) -> str:
        """Detect language of text"""
        
        prompt = f"""Detect the language of this text and respond with ONLY the ISO 639-1 code (e.g., 'de', 'en', 'fr'):

{text}

Respond with only the 2-letter code."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=10
            )
            
            detected_lang = response.choices[0].message.content.strip().lower()
            
            # Validate it's in supported languages
            if detected_lang in i18n_service.supported_languages:
                return detected_lang
            
            return 'de'  # Default fallback
        except Exception:
            return 'de'  # Default fallback


# Initialize service
gpt_service = GPTService()

