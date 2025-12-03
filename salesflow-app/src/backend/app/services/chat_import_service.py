# backend/app/services/chat_import_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT IMPORT SERVICE                                                       ║
║  AI-gestützte Analyse von Social Media Chats                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Analysiert Chat-Verläufe und extrahiert:
- Lead-Daten (Name, Handle, Kontakt)
- Conversation Insights (Stimmung, Einwände, Kaufsignale)
- Nächste Schritte (Follow-up Empfehlung)
"""

import json
import re
from typing import Optional, List

from ..core.config import settings
from ..api.schemas.chat_import import (
    ImportFromChatRequest,
    ImportFromChatResponse,
    ExtractedLeadData,
    ConversationInsights,
    SuggestedNextStep,
    ChatChannel,
    LeadTemperature,
    NextStepType,
)
from .llm_client import get_llm_client, LLMClient


# ═══════════════════════════════════════════════════════════════════════════
# LLM SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Du analysierst Chat-Verläufe aus Social Media und extrahierst Lead-Daten als JSON.

WICHTIG: Gib NUR valides JSON aus, keine Erklärungen davor oder danach.

AUSGABE FORMAT:
{
  "extracted_lead": {
    "first_name": string|null,
    "last_name": string|null,
    "social_handle": string|null,
    "status": "new"|"interested"|"qualified"|"customer",
    "temperature": "cold"|"warm"|"hot",
    "last_message_summary": string
  },
  "conversation_insights": {
    "sentiment": "positive"|"neutral"|"negative"|"mixed",
    "interest_level": "high"|"medium"|"low"|"none",
    "objections_detected": string[],
    "questions_asked": string[],
    "pain_points": string[],
    "buying_signals": string[],
    "stage_in_funnel": "awareness"|"interest"|"consideration"|"intent"|"decision"
  },
  "suggested_next_step": {
    "type": "follow_up"|"introduce_offer"|"book_call"|"send_info"|"close"|"wait",
    "suggested_in_days": number,
    "message_suggestion": string,
    "urgency": "high"|"medium"|"low"
  },
  "analysis_confidence": "high"|"medium"|"low"
}

REGELN:
- Extrahiere Namen aus dem Gesprächsverlauf
- Bei Instagram: @handle aus URL oder Text
- Erkenne Einwände wie "keine Zeit", "kein Interesse", "zu teuer"
- Erkenne Kaufsignale wie "interessant", "erzähl mehr", "wie funktioniert"
- Empfehle konkrete, copy-paste-fähige Follow-up Nachrichten
- message_suggestion soll locker, freundlich und zur Situation passend sein"""


# ═══════════════════════════════════════════════════════════════════════════
# SERVICE CLASS
# ═══════════════════════════════════════════════════════════════════════════

class ChatImportService:
    """Service für Chat-Import und Analyse."""
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialisiert den Service.
        
        Args:
            llm_client: Optional LLM Client für AI-Analyse
        """
        self.llm_client = llm_client
    
    async def analyze_chat(self, request: ImportFromChatRequest) -> ImportFromChatResponse:
        """
        Analysiert einen Chat-Verlauf.
        
        Versucht zuerst LLM-Analyse, fällt auf regelbasierte Analyse zurück.
        
        Args:
            request: ImportFromChatRequest mit raw_chat und channel
            
        Returns:
            ImportFromChatResponse mit extrahierten Daten
        """
        word_count = len(request.raw_chat.split())
        
        # Versuche LLM-Analyse wenn Client verfügbar
        if self.llm_client or self._has_api_key():
            try:
                return await self._analyze_with_llm(request, word_count)
            except Exception as e:
                print(f"LLM analysis error: {e}")
        
        # Fallback: Regelbasierte Analyse
        return self._analyze_with_rules(request, word_count)
    
    def _has_api_key(self) -> bool:
        """Prüft ob ein LLM API Key konfiguriert ist."""
        return bool(settings.ANTHROPIC_API_KEY or settings.OPENAI_API_KEY)
    
    async def _analyze_with_llm(
        self, 
        request: ImportFromChatRequest, 
        word_count: int
    ) -> ImportFromChatResponse:
        """Analysiert Chat mit LLM (Anthropic oder OpenAI)."""
        
        # LLM Client holen oder erstellen
        client = self.llm_client or get_llm_client()
        
        # Prompt bauen
        user_prompt = f"Analysiere diesen {request.channel.value}-Chat:\n\n{request.raw_chat}"
        
        if request.user_role_name:
            user_prompt += f"\n\nHinweis: Der User heißt im Chat '{request.user_role_name}'."
        
        # LLM aufrufen
        response = await client.chat(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,  # Niedrig für konsistente JSON-Ausgabe
            max_tokens=1500,
        )
        
        # Response parsen
        text = response.strip()
        
        # JSON extrahieren (falls in Code-Block)
        text = re.sub(r'^```json?\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
        
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Raw response: {text[:500]}")
            # Fallback auf regelbasierte Analyse
            return self._analyze_with_rules(request, word_count)
        
        # Response bauen
        lead = data.get("extracted_lead", {})
        insights = data.get("conversation_insights", {})
        next_step = data.get("suggested_next_step", {})
        
        return ImportFromChatResponse(
            extracted_lead=ExtractedLeadData(
                first_name=lead.get("first_name"),
                last_name=lead.get("last_name"),
                social_handle=lead.get("social_handle"),
                social_url=self._build_social_url(request.channel, lead.get("social_handle")),
                channel=request.channel,
                language=request.language_hint,
                status=lead.get("status", "interested"),
                temperature=LeadTemperature(lead.get("temperature", "warm")),
                last_message_summary=lead.get("last_message_summary"),
            ),
            missing_fields=self._get_missing_fields(lead),
            conversation_insights=ConversationInsights(
                sentiment=insights.get("sentiment", "neutral"),
                interest_level=insights.get("interest_level", "medium"),
                objections_detected=insights.get("objections_detected", []),
                questions_asked=insights.get("questions_asked", []),
                pain_points=insights.get("pain_points", []),
                buying_signals=insights.get("buying_signals", []),
                stage_in_funnel=insights.get("stage_in_funnel", "interest"),
            ),
            suggested_next_step=SuggestedNextStep(
                type=NextStepType(next_step.get("type", "follow_up")),
                suggested_in_days=next_step.get("suggested_in_days", 3),
                message_suggestion=next_step.get("message_suggestion", ""),
                urgency=next_step.get("urgency", "medium"),
            ),
            analysis_confidence=data.get("analysis_confidence", "high"),
            raw_chat_word_count=word_count,
        )
    
    def _analyze_with_rules(
        self, 
        request: ImportFromChatRequest, 
        word_count: int
    ) -> ImportFromChatResponse:
        """
        Regelbasierte Chat-Analyse als Fallback.
        
        Funktioniert ohne LLM, ist aber weniger genau.
        """
        lines = request.raw_chat.split('\n')
        text_lower = request.raw_chat.lower()
        
        # ─────────────────────────────────────────────────────────────────
        # Name extrahieren
        # ─────────────────────────────────────────────────────────────────
        first_name = None
        for line in lines[:10]:
            if ':' in line:
                potential_name = line.split(':')[0].strip()
                # Validierung: 2-25 Zeichen, keine Zahlen
                if 2 <= len(potential_name) <= 25:
                    if not any(c.isdigit() for c in potential_name):
                        # Nicht der User selbst
                        if not request.user_role_name or potential_name.lower() != request.user_role_name.lower():
                            first_name = potential_name
                            break
        
        # ─────────────────────────────────────────────────────────────────
        # Social Handle extrahieren
        # ─────────────────────────────────────────────────────────────────
        handles = re.findall(r'@([a-zA-Z0-9_.]+)', request.raw_chat)
        social_handle = None
        if handles:
            # Längsten Handle nehmen (oft der aussagekräftigste)
            social_handle = f"@{max(handles, key=len)}"
        
        # ─────────────────────────────────────────────────────────────────
        # Sentiment analysieren
        # ─────────────────────────────────────────────────────────────────
        positive_words = ['super', 'toll', 'gerne', 'cool', 'interessant', 'spannend', '👍', '😊', '🙌', '❤️', 'danke']
        negative_words = ['nein', 'kein interesse', 'spam', 'nerv', 'aufhören', '👎', '😤', 'lass mich']
        
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)
        
        if pos_count > neg_count + 1:
            sentiment = "positive"
        elif neg_count > pos_count:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        # ─────────────────────────────────────────────────────────────────
        # Einwände erkennen
        # ─────────────────────────────────────────────────────────────────
        objections = []
        if any(w in text_lower for w in ['keine zeit', 'hab keine zeit', 'später', 'jetzt nicht']):
            objections.append("Zeit")
        if any(w in text_lower for w in ['teuer', 'kein geld', 'zu viel', 'kostet']):
            objections.append("Geld/Preis")
        if any(w in text_lower for w in ['scam', 'betrug', 'unseriös', 'abzocke', 'pyramid']):
            objections.append("Vertrauen/Skepsis")
        if any(w in text_lower for w in ['partner', 'freund', 'mann', 'frau', 'muss fragen']):
            objections.append("Dritte Person")
        
        # ─────────────────────────────────────────────────────────────────
        # Kaufsignale erkennen
        # ─────────────────────────────────────────────────────────────────
        buying_signals = []
        if any(w in text_lower for w in ['erzähl mehr', 'wie funktioniert', 'was genau', 'interessiert']):
            buying_signals.append("Informationswunsch")
        if any(w in text_lower for w in ['preis', 'kosten', 'was kostet', 'wieviel']):
            buying_signals.append("Preisinteresse")
        if any(w in text_lower for w in ['wann', 'können wir', 'treffen', 'call', 'telefonieren']):
            buying_signals.append("Terminwunsch")
        
        # ─────────────────────────────────────────────────────────────────
        # Temperatur bestimmen
        # ─────────────────────────────────────────────────────────────────
        if buying_signals and sentiment == "positive":
            temperature = LeadTemperature.hot
        elif objections and sentiment == "negative":
            temperature = LeadTemperature.cold
        else:
            temperature = LeadTemperature.warm
        
        # ─────────────────────────────────────────────────────────────────
        # Letzte Nachrichten als Summary
        # ─────────────────────────────────────────────────────────────────
        last_lines = [l.strip() for l in lines[-3:] if l.strip()]
        last_message_summary = ' | '.join(last_lines) if last_lines else None
        
        # ─────────────────────────────────────────────────────────────────
        # Follow-up Nachricht generieren
        # ─────────────────────────────────────────────────────────────────
        if first_name:
            message = f"Hey {first_name}! 😊 Wollte kurz nachhören - hast du dir die Infos schon ansehen können?"
        else:
            message = "Hey! 😊 Wollte kurz nachhören - hast du dir die Infos schon ansehen können?"
        
        if objections:
            message = f"Hey{' ' + first_name if first_name else ''}! Verstehe total, dass du Bedenken hast. Lass uns kurz quatschen - vielleicht kann ich ein paar Fragen klären? 😊"
        
        # ─────────────────────────────────────────────────────────────────
        # Response bauen
        # ─────────────────────────────────────────────────────────────────
        missing_fields = ["last_name", "email", "phone"]
        if not first_name:
            missing_fields.insert(0, "first_name")
        
        return ImportFromChatResponse(
            extracted_lead=ExtractedLeadData(
                first_name=first_name,
                social_handle=social_handle,
                social_url=self._build_social_url(request.channel, social_handle),
                channel=request.channel,
                language=request.language_hint,
                temperature=temperature,
                last_message_summary=last_message_summary,
            ),
            missing_fields=missing_fields,
            conversation_insights=ConversationInsights(
                sentiment=sentiment,
                interest_level="high" if buying_signals else "medium" if sentiment == "positive" else "low",
                objections_detected=objections,
                buying_signals=buying_signals,
            ),
            suggested_next_step=SuggestedNextStep(
                type=NextStepType.follow_up,
                suggested_in_days=2 if temperature == LeadTemperature.hot else 3,
                message_suggestion=message,
                urgency="high" if temperature == LeadTemperature.hot else "medium",
            ),
            analysis_confidence="low",
            raw_chat_word_count=word_count,
        )
    
    def _build_social_url(self, channel: ChatChannel, handle: Optional[str]) -> Optional[str]:
        """Baut die Social Media URL aus Channel und Handle."""
        if not handle:
            return None
        
        # Handle bereinigen
        clean_handle = handle.lstrip('@')
        
        urls = {
            ChatChannel.instagram: f"https://instagram.com/{clean_handle}",
            ChatChannel.facebook: f"https://facebook.com/{clean_handle}",
            ChatChannel.linkedin: f"https://linkedin.com/in/{clean_handle}",
            ChatChannel.telegram: f"https://t.me/{clean_handle}",
        }
        
        return urls.get(channel)
    
    def _get_missing_fields(self, lead: dict) -> List[str]:
        """Ermittelt fehlende Pflichtfelder."""
        required_fields = ["first_name", "last_name", "email", "phone"]
        return [f for f in required_fields if not lead.get(f)]


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_service_instance: Optional[ChatImportService] = None


def get_chat_import_service(llm_client: Optional[LLMClient] = None) -> ChatImportService:
    """
    Factory für ChatImportService.
    
    Erstellt eine Singleton-Instanz des Services.
    """
    global _service_instance
    
    if _service_instance is None or llm_client is not None:
        _service_instance = ChatImportService(llm_client)
    
    return _service_instance
