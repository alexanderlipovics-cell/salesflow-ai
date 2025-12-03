"""
Sales Flow AI - AI Service
OpenAI Integration für CHIEF Coach.
"""

from typing import Optional, List, Dict, Any
from openai import OpenAI

from app.config import settings
from app.services.cache_service import cache_service, make_cache_key


class AIService:
    """
    Service für OpenAI API Interaktionen.
    Stellt CHIEF Coach Funktionalität bereit.
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        
        # CHIEF System Prompt
        self.system_prompt = """Du bist CHIEF, der KI Sales Coach von Sales Flow AI.

Deine Aufgabe:
- Hilf Vertriebsmitarbeitern bei Einwandbehandlung
- Generiere personalisierte Follow-up Nachrichten
- Gib Coaching-Tipps basierend auf Best Practices
- Beantworte Fragen zu Verkaufstechniken

Stil:
- Direkt und praxisorientiert
- Du-Ansprache
- Kurze, actionable Tipps
- Beispiele aus Network Marketing, Immobilien, Finanzvertrieb

Vermeide:
- Zu lange Antworten
- Theoretisches Geschwafel
- Passive Formulierungen
"""
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_context: Optional[Dict[str, Any]] = None,
        company_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Chat mit CHIEF Coach.
        
        Args:
            message: User-Nachricht
            conversation_history: Vorherige Nachrichten
            user_context: User-spezifische Infos (Rolle, Stats)
            company_context: Firmen-spezifische Infos (Power-Up)
            
        Returns:
            {response: str, tokens_used: int, memories_used: int}
        """
        messages = [{"role": "system", "content": self._build_system_prompt(user_context, company_context)}]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-10:]:  # Last 10 messages
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=0.7
            )
            
            return {
                "response": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "memories_used": len(conversation_history) if conversation_history else 0,
                "patterns_used": 0
            }
            
        except Exception as e:
            return {
                "response": f"Entschuldigung, es gab einen Fehler: {str(e)}",
                "tokens_used": 0,
                "memories_used": 0,
                "patterns_used": 0,
                "error": str(e)
            }
    
    def _build_system_prompt(
        self,
        user_context: Optional[Dict[str, Any]] = None,
        company_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Baut erweiterten System Prompt mit Kontext."""
        prompt = self.system_prompt
        
        if company_context:
            prompt += f"\n\nAktuelle Firma: {company_context.get('name', 'Unbekannt')}"
            if company_context.get("products"):
                prompt += f"\nProdukte: {', '.join(company_context['products'])}"
            if company_context.get("unique_selling_points"):
                prompt += f"\nUSPs: {', '.join(company_context['unique_selling_points'])}"
        
        if user_context:
            if user_context.get("role"):
                prompt += f"\n\nUser-Rolle: {user_context['role']}"
            if user_context.get("leads_count"):
                prompt += f"\nAktive Leads: {user_context['leads_count']}"
        
        return prompt
    
    async def handle_objection(
        self,
        objection: str,
        vertical: str = "network",
        channel: str = "whatsapp",
        disc_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generiert Antworten auf Einwände.
        
        Args:
            objection: Der Einwand des Kunden
            vertical: Branche (network, real_estate, finance)
            channel: Kanal (whatsapp, email, phone, instagram)
            disc_type: DISG-Typ (D, I, S, G)
            
        Returns:
            {variants: [{label, message, summary}]}
        """
        
        vertical_context = {
            "network": "Network Marketing / MLM",
            "real_estate": "Immobilienvertrieb",
            "finance": "Finanzvertrieb"
        }
        
        prompt = f"""Generiere 3 verschiedene Antworten auf diesen Kundeneinwand:

Einwand: "{objection}"
Branche: {vertical_context.get(vertical, vertical)}
Kanal: {channel}
{f'DISG-Typ des Kunden: {disc_type}' if disc_type else ''}

Gib 3 Varianten:
1. Logisch (Fakten, Zahlen, ROI)
2. Emotional (Gefühle, Werte, Story)
3. Provokativ (Herausfordernd, Gegenfrage)

Format pro Variante:
LABEL: (Emoji + Name)
MESSAGE: (Die Antwort)
SUMMARY: (Kurze Erklärung der Strategie)
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Du bist Experte für Einwandbehandlung im Vertrieb."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            variants = self._parse_objection_response(content)
            
            return {
                "variants": variants,
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }
            
        except Exception as e:
            return {
                "variants": [{
                    "label": "❌ Fehler",
                    "message": f"Konnte keine Antwort generieren: {str(e)}",
                    "summary": "Bitte erneut versuchen"
                }],
                "error": str(e)
            }
    
    def _parse_objection_response(self, content: str) -> List[Dict[str, str]]:
        """Parsed die KI-Antwort in strukturierte Varianten."""
        variants = []
        
        # Simple parsing - split by variant markers
        default_variants = [
            {"label": "💡 Logisch", "message": "", "summary": ""},
            {"label": "❤️ Emotional", "message": "", "summary": ""},
            {"label": "🔥 Provokativ", "message": "", "summary": ""}
        ]
        
        try:
            lines = content.split("\n")
            current_variant = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if "LABEL:" in line.upper() or line.startswith("1.") or line.startswith("2.") or line.startswith("3."):
                    if current_variant:
                        variants.append(current_variant)
                    current_variant = {"label": "", "message": "", "summary": ""}
                    if ":" in line:
                        current_variant["label"] = line.split(":", 1)[1].strip()
                
                elif "MESSAGE:" in line.upper() and current_variant:
                    current_variant["message"] = line.split(":", 1)[1].strip() if ":" in line else ""
                
                elif "SUMMARY:" in line.upper() and current_variant:
                    current_variant["summary"] = line.split(":", 1)[1].strip() if ":" in line else ""
                
                elif current_variant and not current_variant["message"]:
                    current_variant["message"] = line
            
            if current_variant:
                variants.append(current_variant)
            
            # Fill missing with defaults
            while len(variants) < 3:
                variants.append(default_variants[len(variants)])
            
            return variants[:3]
            
        except Exception:
            return default_variants
    
    async def generate_followup(
        self,
        lead_name: str,
        context: str,
        channel: str = "whatsapp",
        tone: str = "friendly"
    ) -> Dict[str, Any]:
        """
        Generiert Follow-up Nachricht.
        
        Args:
            lead_name: Name des Leads
            context: Kontext (z.B. "Nach Demo", "Angebot gesendet")
            channel: Kommunikationskanal
            tone: Tonalität (friendly, professional, casual)
            
        Returns:
            {message: str, subject: str (für Email)}
        """
        prompt = f"""Generiere eine Follow-up Nachricht:

Lead: {lead_name}
Kontext: {context}
Kanal: {channel}
Tonalität: {tone}

Die Nachricht sollte:
- Persönlich wirken
- Einen klaren CTA haben
- Zum Kanal passen (kurz für WhatsApp, ausführlicher für Email)
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Du schreibst effektive Follow-up Nachrichten."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return {
                "message": response.choices[0].message.content,
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }
            
        except Exception as e:
            return {
                "message": f"Fehler beim Generieren: {str(e)}",
                "error": str(e)
            }


# Global instance
ai_service = AIService()

