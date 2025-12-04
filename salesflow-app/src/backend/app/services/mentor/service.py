"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MENTOR AI SERVICE                                                         ║
║  Hauptservice für MENTOR AI Chat                                           ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import time
import uuid
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from supabase import Client

from ..llm_client import LLMClient, get_llm_client
from .prompts import MENTOR_SYSTEM_PROMPT, MENTOR_CONTEXT_TEMPLATE, DISC_ADAPTATION_PROMPT
from .action_parser import ActionParser, ActionTag, extract_action_tags, strip_action_tags
from .context_builder import MentorContextBuilder, MentorContext
from ...core.config import settings
from ...services.compliance import check_message, ComplianceResult, ComplianceSentinel
from ...config.knowledge.mentor_knowledge import (
    build_mentor_system_prompt_addition,
    get_company_context,
)
from ...services.mentor.chief_service import is_chief_user, check_chief_access

# Neue Prompt-Struktur
import sys
from pathlib import Path
backend_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_root))
from prompts import (
    get_full_prompt,
    get_network_marketing_prompt,
    get_field_sales_prompt,
    get_general_prompt,
    get_phoenix_prompt,
    get_delay_master_prompt,
    get_dmo_tracker_prompt,
    get_ghostbuster_prompt,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# RESPONSE TYPES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MentorResponse:
    """Response vom MENTOR AI Service."""
    response: str
    actions: List[ActionTag]
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    context_summary: Optional[Dict[str, Any]] = None
    interaction_id: Optional[str] = None
    compliance_warning: Optional[Dict[str, Any]] = None  # Compliance-Warnung falls vorhanden
    
    def to_dict(self) -> dict:
        """Konvertiert zu Dictionary für API Response."""
        return {
            "response": self.response,
            "actions": [a.to_dict() for a in self.actions],
            "tokens_used": self.tokens_used,
            "context_summary": self.context_summary,
            "compliance_warning": self.compliance_warning,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# MENTOR SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class MentorService:
    """
    MENTOR AI Service.
    
    Hauptservice für Chat mit dem AI Sales Coach.
    
    Usage:
        service = MentorService(db)
        response = await service.chat(
            user_id="...",
            message="Wie steh ich heute?",
            include_context=True
        )
    """
    
    def __init__(
        self,
        db: Client,
        llm_client: Optional[LLMClient] = None,
    ):
        self.db = db
        self.llm = llm_client or get_llm_client()
        self.action_parser = ActionParser()
        self.context_builder = MentorContextBuilder(db)
    
    async def chat(
        self,
        user_id: str,
        message: str,
        company_id: Optional[str] = None,
        user_name: Optional[str] = None,
        include_context: bool = True,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        disc_type: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> MentorResponse:
        """
        Führt einen Chat mit MENTOR durch.
        
        Args:
            user_id: User ID
            message: Die User-Nachricht
            company_id: Company ID (optional)
            user_name: User Name (override)
            include_context: Kontext einbeziehen?
            conversation_history: Bisheriger Chatverlauf
            disc_type: DISC-Typ für Lead-Anpassung (D, I, S, G)
            model: LLM Model (override)
            temperature: LLM Temperature
            
        Returns:
            MentorResponse mit AI Antwort und Actions
        """
        start_time = time.time()
        interaction_id = str(uuid.uuid4())
        
        # CHIEF Mode Check
        is_chief = False
        try:
            # Versuche User Email zu holen
            user_result = self.db.table("profiles").select("email").eq("id", user_id).single().execute()
            if user_result.data:
                user_email = user_result.data.get("email")
                if user_email:
                    is_chief = is_chief_user(user_email)
        except Exception as e:
            logger.warning(f"Could not check CHIEF access: {e}")
            # Fallback: Prüfe über check_chief_access
            is_chief = await check_chief_access(self.db, user_id)
        
        # Context aufbauen
        context = None
        context_text = None
        if include_context:
            try:
                context = await self.context_builder.build(
                    user_id=user_id,
                    company_id=company_id,
                    user_name=user_name,
                )
                context_text = context.to_text()
            except Exception as e:
                logger.warning(f"Could not build context: {e}")
        
        # Vertical und Module aus Context holen
        vertical = None
        skill_level = None
        enabled_modules = None
        if context:
            vertical = context.vertical
            skill_level = getattr(context, 'skill_level', None) or context.experience_level
            enabled_modules = getattr(context, 'enabled_modules', None)
        
        # Messages zusammenbauen
        messages = self._build_messages(
            message=message,
            context_text=context_text,
            conversation_history=conversation_history,
            disc_type=disc_type,
            vertical=vertical,
            skill_level=skill_level,
            enabled_modules=enabled_modules,
            company_id=company_id,
            is_chief=is_chief,
        )
        
        # LLM aufrufen
        try:
            raw_response = await self.llm.chat(
                messages=messages,
                model=model,
                temperature=temperature,
            )
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise
        
        # Response parsen
        parse_result = self.action_parser.parse(raw_response)
        
        # Compliance-Check für User-Nachricht (Input)
        input_compliance_result = None
        company_name = None
        if company_id:
            # Konvertiere company_id zu company_name für Compliance Sentinel
            company_name = company_id.lower()
        
        # Prüfe User-Nachricht auf Compliance
        if company_name:
            input_compliance_result = check_message(message, company=company_name)
        
        # Compliance-Check für generierte Nachricht (Response)
        compliance_warning = None
        response_compliance_result = check_message(parse_result.clean_text, company=company_name)
        
        # Wenn Verstöße in Response gefunden wurden, füge Warning hinzu
        if not response_compliance_result.is_compliant and response_compliance_result.violations:
            # Erstelle Warning-Objekt
            critical_violations = [v for v in response_compliance_result.violations if v.severity == "critical"]
            error_violations = [v for v in response_compliance_result.violations if v.severity == "error"]
            
            if critical_violations or error_violations:
                compliance_warning = {
                    "has_violations": True,
                    "risk_score": response_compliance_result.risk_score,
                    "violation_count": len(response_compliance_result.violations),
                    "critical_count": len(critical_violations),
                    "error_count": len(error_violations),
                    "violations": [
                        {
                            "type": v.type.value,
                            "severity": v.severity,
                            "matched_text": v.matched_text,
                            "explanation": v.explanation,
                            "suggestion": v.suggestion,
                        }
                        for v in response_compliance_result.violations[:5]  # Max 5 für Response
                    ],
                    "message": (
                        f"⚠️ Compliance-Warnung: {len(response_compliance_result.violations)} Verstoß(e) in der Antwort gefunden. "
                        f"Bitte überprüfe die Nachricht vor dem Versenden."
                    ),
                }
                logger.warning(
                    f"Compliance-Verstoß in MENTOR Response für User {user_id}: "
                    f"{len(response_compliance_result.violations)} Verstöße, Risk Score: {response_compliance_result.risk_score}"
                )
        
        # Warnung auch bei Input-Verstößen (wenn kritisch)
        if input_compliance_result and not input_compliance_result.is_compliant:
            critical_input = [v for v in input_compliance_result.violations if v.severity == "critical"]
            if critical_input and not compliance_warning:
                compliance_warning = {
                    "has_violations": True,
                    "risk_score": input_compliance_result.risk_score,
                    "violation_count": len(input_compliance_result.violations),
                    "critical_count": len(critical_input),
                    "message": (
                        f"⚠️ Deine Nachricht enthält mögliche Compliance-Verstöße. "
                        f"Bitte formuliere deine Frage um."
                    ),
                }
        
        # Latenz berechnen
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Tokens schätzen
        tokens_estimate = (len(str(messages)) + len(raw_response)) // 4
        
        # Context Summary
        context_summary = None
        if context:
            context_summary = {
                "daily_flow_completion": context.daily_flow.get("overall_percent", 0) if context.daily_flow else None,
                "suggested_leads_count": len(context.suggested_leads) if context.suggested_leads else 0,
                "streak_days": context.streak_days,
            }
        
        # AI Interaction loggen
        await self._log_interaction(
            interaction_id=interaction_id,
            user_id=user_id,
            company_id=company_id,
            message=message,
            response=parse_result.clean_text,
            actions=parse_result.actions,
            tokens=tokens_estimate,
            latency_ms=latency_ms,
        )
        
        return MentorResponse(
            response=parse_result.clean_text,
            actions=parse_result.actions,
            tokens_used=tokens_estimate,
            latency_ms=latency_ms,
            context_summary=context_summary,
            interaction_id=interaction_id,
            compliance_warning=compliance_warning,
        )
    
    def _build_messages(
        self,
        message: str,
        context_text: Optional[str],
        conversation_history: Optional[List[Dict[str, str]]],
        disc_type: Optional[str],
        vertical: Optional[str] = None,
        skill_level: Optional[str] = None,
        enabled_modules: Optional[List[str]] = None,
        company_id: Optional[str] = None,
        is_chief: bool = False,
    ) -> List[Dict[str, str]]:
        """Baut die Messages für den LLM Call."""
        messages = []
        
        # MENTOR System Prompt mit Knowledge
        system_prompt = self._build_mentor_system_prompt(
            company_id=company_id,
            is_chief=is_chief,
        )
        
        # Neue Prompt-Struktur verwenden wenn Vertical bekannt
        if vertical:
            # Vertical-spezifischer Prompt laden
            vertical_prompt = None
            if vertical == "network_marketing":
                vertical_prompt = get_network_marketing_prompt()
            elif vertical == "field_sales":
                vertical_prompt = get_field_sales_prompt()
            else:
                vertical_prompt = get_general_prompt()
            
            # Module Prompts zusammenbauen
            module_prompts = []
            if enabled_modules:
                if "phoenix" in enabled_modules:
                    module_prompts.append(get_phoenix_prompt())
                if "delay_master" in enabled_modules:
                    module_prompts.append(get_delay_master_prompt())
                if "dmo_tracker" in enabled_modules:
                    module_prompts.append(get_dmo_tracker_prompt())
                if "ghostbuster" in enabled_modules:
                    module_prompts.append(get_ghostbuster_prompt())
            
            # Vollständigen Prompt bauen
            messages = get_full_prompt(
                vertical=vertical or "network_marketing",
                skill_level=skill_level or "advanced",
                vertical_specific_prompt=vertical_prompt,
                enabled_modules=enabled_modules or [],
                context_text=context_text,
            )
            
            # MENTOR System Prompt am Anfang einfügen
            if messages and messages[0].get("role") == "system":
                # Erweitere ersten System Prompt mit MENTOR Knowledge
                messages[0]["content"] = system_prompt + "\n\n" + messages[0]["content"]
            else:
                messages.insert(0, {
                    "role": "system",
                    "content": system_prompt,
                })
        else:
            # Fallback: Alte Prompts mit MENTOR Knowledge
            messages.append({
                "role": "system",
                "content": system_prompt,
            })
            
            # Context hinzufügen
            if context_text:
                messages.append({
                    "role": "system",
                    "content": MENTOR_CONTEXT_TEMPLATE.format(context_text=context_text),
                })
        
        # DISC Adaptation
        if disc_type and disc_type in ["D", "I", "S", "G"]:
            messages.append({
                "role": "system",
                "content": DISC_ADAPTATION_PROMPT.format(disc_type=disc_type),
            })
        
        # Conversation History
        if conversation_history:
            max_history = getattr(settings, "MAX_CONVERSATION_HISTORY", 10)
            for msg in conversation_history[-max_history:]:
                if msg.get("role") in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"],
                    })
        
        # Aktuelle User Message
        messages.append({
            "role": "user",
            "content": message,
        })
        
        return messages
    
    def _build_mentor_system_prompt(
        self,
        company_id: Optional[str] = None,
        is_chief: bool = False,
    ) -> str:
        """
        Baut den MENTOR System Prompt mit Knowledge Integration.
        
        Args:
            company_id: Company ID für company-spezifische Knowledge
            is_chief: Ist der User ein CHIEF User (Founder)?
            
        Returns:
            Vollständiger System Prompt
        """
        # Basis System Prompt
        base_prompt = """Du bist MENTOR, der KI-Vertriebscoach für Network Marketing.

═══════════════════════════════════════════════════════════════
DEINE EXPERTISE
═══════════════════════════════════════════════════════════════

• Follow-up Strategien
• Einwandbehandlung (zu teuer, keine Zeit, muss überlegen)
• HWG/DSGVO-konforme Kommunikation
• Gesprächseinstiege und Abschluss-Techniken

═══════════════════════════════════════════════════════════════
DEIN STIL
═══════════════════════════════════════════════════════════════

• Freundlich aber direkt
• Praxisorientiert mit konkreten Formulierungen
• Kurze, actionable Antworten
• Deutsch

═══════════════════════════════════════════════════════════════
COMPLIANCE
═══════════════════════════════════════════════════════════════

Bei Compliance-Fragen: Prüfe auf HWG (Heilversprechen) und DSGVO.
NIEMALS Heilversprechen machen oder Krankheitsnamen nennen.
NUR: Wellness, Lifestyle, Wohlbefinden, kosmetische Claims.
"""
        
        # CHIEF Mode - Erweiterte Prompts und alle Skripte
        if is_chief:
            chief_addition = """
═══════════════════════════════════════════════════════════════
👑 CHIEF MODE AKTIVIERT
═══════════════════════════════════════════════════════════════

Du hast Zugang zu ALLEN Power-Features:

✅ 50+ Outreach Skripte (Zinzino, B2B, Immobilien, Hotels)
✅ Erweiterte Einwandbehandlung (SalesFlow-spezifisch)
✅ Deal-Medic Prompts (BANT-Analyse, Pipeline-Review)
✅ CEO Module (Strategische Frameworks)
✅ Investor Brief Generation
✅ Keine API Limits

Nutze alle verfügbaren Ressourcen für beste Ergebnisse!
"""
            base_prompt += "\n\n" + chief_addition
        
        # Company-spezifische Knowledge hinzufügen
        if company_id:
            try:
                company_name = company_id.lower()
                knowledge_addition = build_mentor_system_prompt_addition(company_name)
                if knowledge_addition:
                    base_prompt += "\n\n" + knowledge_addition
            except Exception as e:
                logger.warning(f"Could not load company knowledge for {company_id}: {e}")
        
        return base_prompt
    
    async def _log_interaction(
        self,
        interaction_id: str,
        user_id: str,
        company_id: Optional[str],
        message: str,
        response: str,
        actions: List[ActionTag],
        tokens: int,
        latency_ms: int,
    ):
        """Loggt die AI Interaction in die Datenbank."""
        try:
            self.db.table("ai_interactions").insert({
                "id": interaction_id,
                "user_id": user_id,
                "company_id": company_id,
                "interaction_type": "mentor_chat",
                "request_text": message[:2000],  # Limit
                "response_text": response[:4000],  # Limit
                "model": self.llm.model,
                "provider": self.llm.provider,
                "total_tokens": tokens,
                "latency_ms": latency_ms,
                "action_tags": [a.to_dict() for a in actions],
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            # Logging should not fail the request
            logger.warning(f"Could not log AI interaction: {e}")
    
    async def get_context(
        self,
        user_id: str,
        company_id: Optional[str] = None,
    ) -> MentorContext:
        """
        Gibt den aktuellen Kontext zurück (für Frontend).
        
        Args:
            user_id: User ID
            company_id: Company ID (optional)
            
        Returns:
            MentorContext Objekt
        """
        return await self.context_builder.build(
            user_id=user_id,
            company_id=company_id,
        )
    
    async def submit_feedback(
        self,
        interaction_id: str,
        user_id: str,
        rating: Optional[int] = None,
        feedback: Optional[str] = None,
        was_helpful: Optional[bool] = None,
    ) -> bool:
        """
        Speichert Feedback zu einer AI Interaction.
        
        Args:
            interaction_id: ID der Interaction
            user_id: User ID (für Validierung)
            rating: Bewertung (1-5)
            feedback: Text-Feedback
            was_helpful: War die Antwort hilfreich?
            
        Returns:
            True wenn erfolgreich
        """
        try:
            update_data = {}
            if rating is not None:
                update_data["user_rating"] = rating
            if feedback is not None:
                update_data["user_feedback"] = feedback
            if was_helpful is not None:
                update_data["was_helpful"] = was_helpful
            
            if update_data:
                self.db.table("ai_interactions").update(update_data).eq(
                    "id", interaction_id
                ).eq("user_id", user_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Could not save feedback: {e}")
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

def get_mentor_service(db: Client) -> MentorService:
    """
    Factory Function für MentorService.
    
    Args:
        db: Supabase Client
        
    Returns:
        MentorService Instance
    """
    return MentorService(db)

