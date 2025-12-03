"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AI SERVICE                                                                ║
║  Unified AI Client with Skill Orchestration & Logging                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Combines:
- LLM Client (OpenAI, Anthropic)
- AI Logging (tracking, analytics)
- Skill Definitions (standardized prompts)

Usage:
    ai = AIService(user_id="...", company_id="...")
    
    response = await ai.call_skill(
        skill=Skill.ANALYZE_OBJECTION,
        input_data={"objection": "Ich muss noch überlegen..."},
        lead_id="..."
    )
    
    print(response.content)
    print(response.interaction_id)  # For outcome tracking
"""

import time
import logging
import uuid
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from ..llm_client import LLMClient, get_llm_client
from .ai_logger import AILogger, AIInteractionLog, OutcomeStatus, get_ai_logger
from ...core.config import settings

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# SKILLS ENUM
# ═══════════════════════════════════════════════════════════════════════════════

class Skill(str, Enum):
    """
    Available AI Skills.
    
    Each skill maps to a specific prompt template and configuration.
    """
    
    # Analysis Skills
    ANALYZE_OBJECTION = "analyze_objection"
    ANALYZE_PERSONALITY = "analyze_personality"
    ANALYZE_SENTIMENT = "analyze_sentiment"
    ANALYZE_INTENT = "analyze_intent"
    
    # Generation Skills
    GENERATE_FOLLOWUP = "generate_followup"
    GENERATE_REACTIVATION = "generate_reactivation"
    GENERATE_CLOSER = "generate_closer"
    GENERATE_RESPONSE = "generate_response"
    
    # Deal Skills
    CHECK_DEAL_HEALTH = "check_deal_health"
    DEAL_POST_MORTEM = "deal_post_mortem"
    CALCULATE_DAILY_TARGETS = "calculate_daily_targets"
    
    # Compliance
    CHECK_COMPLIANCE = "check_compliance"
    REWRITE_COMPLIANT = "rewrite_compliant"
    
    # Chat
    CHIEF_CHAT = "chief_chat"
    LIVE_ASSIST = "live_assist"
    
    # Other
    SUMMARIZE_CONVERSATION = "summarize_conversation"
    EXTRACT_ACTION_ITEMS = "extract_action_items"
    COACH_FEEDBACK = "coach_feedback"


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE CLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AIResponse:
    """Response from an AI skill call."""
    content: str
    interaction_id: str
    skill: Skill
    model: str
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    latency_ms: Optional[int] = None
    metadata: Dict[str, Any] = None
    
    @property
    def total_tokens(self) -> int:
        return (self.tokens_in or 0) + (self.tokens_out or 0)


@dataclass
class AIInteraction:
    """Full interaction details including response and tracking."""
    response: AIResponse
    interaction_id: str
    
    async def mark_used(self) -> bool:
        """Mark this interaction as used by the user."""
        logger_instance = get_ai_logger()
        return await logger_instance.mark_used(self.interaction_id)
    
    async def update_outcome(
        self,
        outcome: OutcomeStatus,
        rating: Optional[int] = None,
        feedback: Optional[str] = None,
    ) -> bool:
        """Update the outcome of this interaction."""
        logger_instance = get_ai_logger()
        return await logger_instance.update_outcome(
            self.interaction_id, outcome, rating, feedback
        )


# ═══════════════════════════════════════════════════════════════════════════════
# AI SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class AIService:
    """
    Unified AI Service with skill orchestration and logging.
    
    Wraps LLM calls with:
    - Standardized skill definitions
    - Automatic logging
    - Performance tracking
    - Outcome tracking support
    """
    
    def __init__(
        self,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        session_id: Optional[str] = None,
        llm_client: Optional[LLMClient] = None,
        ai_logger: Optional[AILogger] = None,
    ):
        self.user_id = user_id
        self.company_id = company_id
        self.session_id = session_id or str(uuid.uuid4())
        
        self.llm = llm_client or get_llm_client()
        self.logger = ai_logger or get_ai_logger()
    
    # ─────────────────────────────────────────────────────────────────────────
    # SKILL CALLS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def call_skill(
        self,
        skill: Skill,
        input_data: Dict[str, Any],
        lead_id: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        skill_version: str = "1.0",
        prompt_version: str = "1.0",
    ) -> AIInteraction:
        """
        Call an AI skill with automatic logging.
        
        Args:
            skill: The skill to call
            input_data: Input data for the skill
            lead_id: Optional lead context
            model: Override default model
            temperature: Override default temperature
            max_tokens: Override default max tokens
            skill_version: Version of the skill implementation
            prompt_version: Version of the prompt template
            
        Returns:
            AIInteraction with response and tracking
        """
        start_time = time.time()
        interaction_id = str(uuid.uuid4())
        
        # Get skill configuration
        skill_config = self._get_skill_config(skill)
        
        # Build messages
        system_prompt = skill_config.get("system_prompt", "")
        user_prompt = self._build_user_prompt(skill, input_data)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        # Use configured or default model
        used_model = model or skill_config.get("model", self.llm.model)
        used_temperature = temperature if temperature is not None else skill_config.get("temperature", self.llm.temperature)
        used_max_tokens = max_tokens or skill_config.get("max_tokens", self.llm.max_tokens)
        
        try:
            # Make the LLM call
            response_content = await self.llm.chat(
                messages=messages,
                model=used_model,
                temperature=used_temperature,
                max_tokens=used_max_tokens,
            )
            
            # Calculate metrics
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Estimate tokens (rough approximation, provider doesn't always return this)
            tokens_in = len(system_prompt + user_prompt) // 4
            tokens_out = len(response_content) // 4
            
            # Log the interaction
            log_entry = AIInteractionLog(
                id=interaction_id,
                skill_name=skill.value,
                skill_version=skill_version,
                prompt_version=prompt_version,
                provider=self.llm.provider,
                model=used_model,
                temperature=used_temperature,
                user_id=self.user_id,
                company_id=self.company_id,
                lead_id=lead_id,
                session_id=self.session_id,
                request_summary=user_prompt[:500],  # First 500 chars
                response_summary=response_content[:500],
                latency_ms=latency_ms,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
            )
            
            await self.logger.log(log_entry)
            
            # Build response
            response = AIResponse(
                content=response_content,
                interaction_id=interaction_id,
                skill=skill,
                model=used_model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
            )
            
            return AIInteraction(
                response=response,
                interaction_id=interaction_id,
            )
            
        except Exception as e:
            # Log the error
            latency_ms = int((time.time() - start_time) * 1000)
            
            await self.logger.log_error(
                skill_name=skill.value,
                provider=self.llm.provider,
                model=used_model,
                error=e,
                user_id=self.user_id,
                company_id=self.company_id,
                lead_id=lead_id,
                session_id=self.session_id,
                latency_ms=latency_ms,
            )
            
            raise
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVENIENCE METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_objection(
        self,
        objection_text: str,
        lead_context: Optional[Dict[str, Any]] = None,
        lead_id: Optional[str] = None,
    ) -> AIInteraction:
        """Analyze an objection and determine if it's real or pretense."""
        return await self.call_skill(
            skill=Skill.ANALYZE_OBJECTION,
            input_data={
                "objection": objection_text,
                "context": lead_context or {},
            },
            lead_id=lead_id,
        )
    
    async def generate_followup(
        self,
        lead_info: Dict[str, Any],
        context: str,
        tone: str = "professional",
        lead_id: Optional[str] = None,
    ) -> AIInteraction:
        """Generate a follow-up message for a lead."""
        return await self.call_skill(
            skill=Skill.GENERATE_FOLLOWUP,
            input_data={
                "lead": lead_info,
                "context": context,
                "tone": tone,
            },
            lead_id=lead_id,
        )
    
    async def check_compliance(
        self,
        message: str,
        vertical: str = "network_marketing",
        rules: Optional[List[str]] = None,
    ) -> AIInteraction:
        """Check a message for compliance issues."""
        return await self.call_skill(
            skill=Skill.CHECK_COMPLIANCE,
            input_data={
                "message": message,
                "vertical": vertical,
                "rules": rules or [],
            },
        )
    
    async def chief_chat(
        self,
        messages: List[Dict[str, str]],
        user_context: Optional[Dict[str, Any]] = None,
        lead_id: Optional[str] = None,
    ) -> AIInteraction:
        """Have a conversation with CHIEF."""
        return await self.call_skill(
            skill=Skill.CHIEF_CHAT,
            input_data={
                "messages": messages,
                "context": user_context or {},
            },
            lead_id=lead_id,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # SKILL CONFIGURATION
    # ─────────────────────────────────────────────────────────────────────────
    
    def _get_skill_config(self, skill: Skill) -> Dict[str, Any]:
        """Get configuration for a skill."""
        # Default configurations - can be extended/overridden
        configs = {
            Skill.ANALYZE_OBJECTION: {
                "system_prompt": """Du bist ein erfahrener Sales-Coach und Experte für Einwandbehandlung.
                
Analysiere den Einwand und bestimme:
1. Ist es ein echter Einwand oder ein Vorwand?
2. Was ist das wahre Problem dahinter?
3. Wie sollte man am besten reagieren?

Antworte im JSON-Format:
{
  "type": "real" | "pretense" | "buying_signal",
  "confidence": 0.0-1.0,
  "real_problem": "...",
  "recommended_response": "...",
  "alternative_response": "..."
}""",
                "temperature": 0.3,
                "max_tokens": 500,
            },
            
            Skill.GENERATE_FOLLOWUP: {
                "system_prompt": """Du bist ein Experte für Vertriebs-Kommunikation.
                
Erstelle eine Follow-up Nachricht basierend auf dem Kontext.
Die Nachricht sollte:
- Persönlich und relevant sein
- Einen klaren nächsten Schritt vorschlagen
- Zum Tonfall passen
- Kurz und prägnant sein (max 2-3 Sätze)""",
                "temperature": 0.7,
                "max_tokens": 300,
            },
            
            Skill.CHECK_COMPLIANCE: {
                "system_prompt": """Du bist ein Compliance-Experte für Vertriebskommunikation.
                
Prüfe die Nachricht auf:
- Verbotene Aussagen (Heilversprechen, Garantien, Einkommensversprechen)
- Rechtliche Risiken
- Branchenspezifische Compliance-Regeln

Antworte im JSON-Format:
{
  "is_compliant": true/false,
  "violations": [...],
  "risk_level": "low" | "medium" | "high",
  "suggestions": [...]
}""",
                "temperature": 0.1,
                "max_tokens": 400,
            },
            
            Skill.CHIEF_CHAT: {
                "system_prompt": """Du bist CHIEF - der KI-Sales-Coach von Sales Flow AI.

Du hilfst Vertrieblern dabei:
- Bessere Gespräche zu führen
- Einwände zu behandeln
- Deals abzuschließen
- Ihre Ziele zu erreichen

Dein Stil:
- Direkt und actionable
- Supportive aber fordernd
- Datengetrieben wenn möglich
- Immer mit konkreten nächsten Schritten""",
                "temperature": 0.7,
                "max_tokens": 800,
            },
            
            Skill.ANALYZE_PERSONALITY: {
                "system_prompt": """Du bist ein Experte für Verhaltensanalyse nach dem DISG-Modell.
                
Analysiere die Nachrichten und bestimme den Kommunikationsstil:
- D (Dominant): Direkt, ergebnisorientiert, ungeduldig
- I (Initiativ): Enthusiastisch, gesprächig, optimistisch  
- S (Stetig): Geduldig, loyal, teamorientiert
- G (Gewissenhaft): Analytisch, präzise, qualitätsorientiert

Antworte im JSON-Format:
{
  "primary_type": "D" | "I" | "S" | "G",
  "confidence": 0.0-1.0,
  "signals": ["..."],
  "communication_tips": ["..."]
}""",
                "temperature": 0.3,
                "max_tokens": 400,
            },
        }
        
        return configs.get(skill, {
            "system_prompt": "Du bist ein hilfreicher KI-Assistent.",
            "temperature": 0.7,
            "max_tokens": 500,
        })
    
    def _build_user_prompt(self, skill: Skill, input_data: Dict[str, Any]) -> str:
        """Build the user prompt for a skill."""
        # Simple serialization for now - can be extended per skill
        if skill == Skill.ANALYZE_OBJECTION:
            return f"""Analysiere diesen Einwand:

"{input_data.get('objection', '')}"

Kontext: {input_data.get('context', {})}"""
        
        elif skill == Skill.GENERATE_FOLLOWUP:
            lead = input_data.get("lead", {})
            return f"""Erstelle eine Follow-up Nachricht:

Lead: {lead.get('first_name', '')} {lead.get('last_name', '')}
Kontext: {input_data.get('context', '')}
Tonfall: {input_data.get('tone', 'professional')}"""
        
        elif skill == Skill.CHECK_COMPLIANCE:
            return f"""Prüfe diese Nachricht auf Compliance:

Nachricht: "{input_data.get('message', '')}"
Branche: {input_data.get('vertical', 'allgemein')}
Zusätzliche Regeln: {input_data.get('rules', [])}"""
        
        elif skill == Skill.CHIEF_CHAT:
            messages = input_data.get("messages", [])
            formatted = "\n".join([
                f"{m.get('role', 'user')}: {m.get('content', '')}"
                for m in messages
            ])
            return f"""Kontext: {input_data.get('context', {})}

Gespräch:
{formatted}"""
        
        elif skill == Skill.ANALYZE_PERSONALITY:
            messages = input_data.get("messages", [])
            return f"""Analysiere diese Nachrichten und bestimme den DISG-Typ:

{chr(10).join(messages)}"""
        
        else:
            # Generic serialization
            import json
            return json.dumps(input_data, ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON ACCESS
# ═══════════════════════════════════════════════════════════════════════════════

def get_ai_service(
    user_id: Optional[str] = None,
    company_id: Optional[str] = None,
) -> AIService:
    """Create an AI Service instance with context."""
    return AIService(user_id=user_id, company_id=company_id)

