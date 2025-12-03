"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LEARNING EVENTS SERVICE                                                   ║
║  Loggt AI-Entscheidungen und User-Korrekturen für kontinuierliches Lernen ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul:
- Loggt jede AI-Entscheidung mit vollständigem Kontext
- Erfasst User-Korrekturen (Edits, Approvals, Rejections)
- Berechnet Confidence-Anpassungen basierend auf Lern-Patterns
- Unterstützt das Feedback-Loop für verbesserte AI-Entscheidungen
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from supabase import Client

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Typen von Learning Events."""
    AUTOPILOT_DECISION = "autopilot_decision"
    USER_CORRECTION = "user_correction"
    USER_APPROVAL = "user_approval"
    DRAFT_EDIT = "draft_edit"
    TEMPLATE_USED = "template_used"
    OBJECTION_HANDLED = "objection_handled"
    PATTERN_DETECTED = "pattern_detected"
    FEEDBACK_POSITIVE = "feedback_positive"
    FEEDBACK_NEGATIVE = "feedback_negative"


class ContextType(str, Enum):
    """Kontext-Typen für Events."""
    MESSAGE = "message"
    OBJECTION = "objection"
    FOLLOW_UP = "follow_up"
    SCHEDULING = "scheduling"
    CLOSING = "closing"
    REENGAGEMENT = "reengagement"
    GENERAL = "general"


@dataclass
class AIDecisionLog:
    """Struktur für AI-Entscheidungs-Logging."""
    intent: str
    confidence: int
    action: str
    reasoning: str
    suggested_response: Optional[str] = None
    knowledge_match: Optional[Dict[str, Any]] = None
    lead_context: Optional[Dict[str, Any]] = None


@dataclass
class UserActionLog:
    """Struktur für User-Aktion-Logging."""
    action_type: str  # "approve", "edit", "reject", "ignore"
    original_content: Optional[str] = None
    edited_content: Optional[str] = None
    time_to_action_seconds: Optional[int] = None


@dataclass
class OutcomeLog:
    """Struktur für Outcome-Logging."""
    success: bool
    lead_response: Optional[str] = None  # "positive", "negative", "neutral"
    deal_progress: bool = False
    notes: Optional[str] = None


@dataclass
class LearningSignals:
    """Signale für das Learning System."""
    should_increase_confidence: bool = False
    pattern_type: Optional[str] = None
    keywords: List[str] = None
    effective_phrases: List[str] = None
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.effective_phrases is None:
            self.effective_phrases = []


class LearningEventsService:
    """
    Service für das Logging und Analysieren von Learning Events.
    
    Jede AI-Entscheidung und User-Korrektur wird geloggt,
    um das System kontinuierlich zu verbessern.
    """
    
    def __init__(self, supabase: Client):
        """
        Args:
            supabase: Supabase Client
        """
        self.supabase = supabase
    
    async def log_autopilot_decision(
        self,
        user_id: str,
        lead_id: str,
        action_id: str,
        ai_decision: AIDecisionLog,
        channel: Optional[str] = None,
        lead_temperature: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> str:
        """
        Loggt eine Autopilot-Entscheidung.
        
        Args:
            user_id: User ID
            lead_id: Lead ID
            action_id: Autopilot Action ID
            ai_decision: Die AI-Entscheidung
            channel: Kommunikationskanal
            lead_temperature: Lead-Temperatur
            session_id: Session ID für Tracking
            
        Returns:
            ID des erstellten Events
        """
        try:
            event_data = {
                "user_id": user_id,
                "event_type": EventType.AUTOPILOT_DECISION.value,
                "context_type": self._determine_context_type(ai_decision.intent),
                "lead_id": lead_id,
                "action_id": action_id,
                "ai_decision": asdict(ai_decision),
                "channel": channel,
                "lead_temperature": lead_temperature,
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("learning_events").insert(event_data).execute()
            
            if result.data:
                logger.info(f"Logged autopilot decision for lead {lead_id}")
                return result.data[0]["id"]
            
            return ""
            
        except Exception as e:
            logger.error(f"Error logging autopilot decision: {e}")
            return ""
    
    async def log_user_correction(
        self,
        user_id: str,
        lead_id: str,
        draft_id: str,
        original_ai_decision: AIDecisionLog,
        user_action: UserActionLog,
        channel: Optional[str] = None
    ) -> str:
        """
        Loggt eine User-Korrektur (Edit/Reject einer AI-Entscheidung).
        
        Args:
            user_id: User ID
            lead_id: Lead ID
            draft_id: Draft ID
            original_ai_decision: Die ursprüngliche AI-Entscheidung
            user_action: Was der User gemacht hat
            channel: Kommunikationskanal
            
        Returns:
            ID des erstellten Events
        """
        try:
            # Learning Signals berechnen
            learning_signals = self._calculate_learning_signals(
                original_ai_decision,
                user_action
            )
            
            event_data = {
                "user_id": user_id,
                "event_type": EventType.USER_CORRECTION.value,
                "context_type": self._determine_context_type(original_ai_decision.intent),
                "lead_id": lead_id,
                "draft_id": draft_id,
                "ai_decision": asdict(original_ai_decision),
                "user_action": asdict(user_action),
                "learning_signals": asdict(learning_signals),
                "channel": channel,
                "is_significant": True,  # Korrekturen sind immer signifikant
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("learning_events").insert(event_data).execute()
            
            if result.data:
                # Pattern updaten
                await self._update_pattern_from_correction(
                    user_id,
                    original_ai_decision.intent,
                    user_action.action_type == "approve"
                )
                
                logger.info(f"Logged user correction for draft {draft_id}")
                return result.data[0]["id"]
            
            return ""
            
        except Exception as e:
            logger.error(f"Error logging user correction: {e}")
            return ""
    
    async def log_user_approval(
        self,
        user_id: str,
        lead_id: str,
        draft_id: str,
        ai_decision: AIDecisionLog,
        time_to_action_seconds: int
    ) -> str:
        """
        Loggt eine User-Bestätigung (Approval ohne Edit).
        
        Args:
            user_id: User ID
            lead_id: Lead ID
            draft_id: Draft ID
            ai_decision: Die AI-Entscheidung
            time_to_action_seconds: Zeit bis zur Aktion
            
        Returns:
            ID des erstellten Events
        """
        try:
            user_action = UserActionLog(
                action_type="approve",
                original_content=ai_decision.suggested_response,
                time_to_action_seconds=time_to_action_seconds
            )
            
            learning_signals = LearningSignals(
                should_increase_confidence=True,
                pattern_type="approval"
            )
            
            event_data = {
                "user_id": user_id,
                "event_type": EventType.USER_APPROVAL.value,
                "context_type": self._determine_context_type(ai_decision.intent),
                "lead_id": lead_id,
                "draft_id": draft_id,
                "ai_decision": asdict(ai_decision),
                "user_action": asdict(user_action),
                "learning_signals": asdict(learning_signals),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("learning_events").insert(event_data).execute()
            
            if result.data:
                # Pattern updaten (positives Signal)
                await self._update_pattern_from_correction(
                    user_id,
                    ai_decision.intent,
                    success=True
                )
                
                logger.info(f"Logged user approval for draft {draft_id}")
                return result.data[0]["id"]
            
            return ""
            
        except Exception as e:
            logger.error(f"Error logging user approval: {e}")
            return ""
    
    async def log_outcome(
        self,
        event_id: str,
        outcome: OutcomeLog
    ) -> bool:
        """
        Fügt Outcome-Daten zu einem bestehenden Event hinzu.
        
        Args:
            event_id: ID des Learning Events
            outcome: Das Outcome
            
        Returns:
            True wenn erfolgreich
        """
        try:
            result = self.supabase.table("learning_events").update({
                "outcome": asdict(outcome),
                "processed_at": datetime.utcnow().isoformat(),
                "is_processed": True
            }).eq("id", event_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error logging outcome: {e}")
            return False
    
    async def get_confidence_adjustment(
        self,
        user_id: str,
        intent: str,
        channel: Optional[str] = None
    ) -> int:
        """
        Berechnet eine Confidence-Anpassung basierend auf vergangenen Events.
        
        Args:
            user_id: User ID
            intent: Der erkannte Intent
            channel: Optional: Kanal für spezifischere Anpassung
            
        Returns:
            Anpassung in Prozentpunkten (-20 bis +20)
        """
        try:
            # Patterns für diesen Intent laden
            result = self.supabase.table("learning_patterns").select(
                "success_rate, sample_count"
            ).eq(
                "user_id", user_id
            ).like(
                "pattern_key", f"{intent}%"
            ).order(
                "sample_count", desc=True
            ).limit(1).execute()
            
            if not result.data:
                return 0
            
            pattern = result.data[0]
            success_rate = pattern.get("success_rate", 0.5)
            sample_count = pattern.get("sample_count", 0)
            
            # Adjustment berechnen
            if sample_count >= 10:
                if success_rate > 0.9:
                    return 10
                elif success_rate > 0.8:
                    return 5
                elif success_rate < 0.5:
                    return -10
                elif success_rate < 0.3:
                    return -20
            elif sample_count >= 5:
                if success_rate > 0.85:
                    return 5
                elif success_rate < 0.4:
                    return -5
            
            return 0
            
        except Exception as e:
            logger.error(f"Error getting confidence adjustment: {e}")
            return 0
    
    async def get_learning_stats(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Lädt Learning-Statistiken für den User.
        
        Args:
            user_id: User ID
            days: Anzahl Tage
            
        Returns:
            Statistiken
        """
        try:
            since = datetime.utcnow().replace(
                hour=0, minute=0, second=0
            ).__sub__(
                __import__('datetime').timedelta(days=days)
            ).isoformat()
            
            result = self.supabase.table("learning_events").select(
                "event_type, outcome"
            ).eq(
                "user_id", user_id
            ).gte(
                "created_at", since
            ).execute()
            
            events = result.data or []
            
            # Zählen
            stats = {
                "total_events": len(events),
                "autopilot_decisions": 0,
                "user_approvals": 0,
                "user_corrections": 0,
                "positive_outcomes": 0,
                "negative_outcomes": 0,
                "approval_rate": 0
            }
            
            for event in events:
                event_type = event.get("event_type")
                outcome = event.get("outcome", {})
                
                if event_type == EventType.AUTOPILOT_DECISION.value:
                    stats["autopilot_decisions"] += 1
                elif event_type == EventType.USER_APPROVAL.value:
                    stats["user_approvals"] += 1
                elif event_type == EventType.USER_CORRECTION.value:
                    stats["user_corrections"] += 1
                
                if outcome:
                    if outcome.get("success"):
                        stats["positive_outcomes"] += 1
                    else:
                        stats["negative_outcomes"] += 1
            
            # Approval Rate berechnen
            total_decisions = stats["user_approvals"] + stats["user_corrections"]
            if total_decisions > 0:
                stats["approval_rate"] = round(
                    (stats["user_approvals"] / total_decisions) * 100, 1
                )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting learning stats: {e}")
            return {}
    
    def _determine_context_type(self, intent: str) -> str:
        """Bestimmt den Context-Type basierend auf dem Intent."""
        
        objection_intents = [
            "price_objection", "time_objection", "trust_objection", "complex_objection"
        ]
        scheduling_intents = ["scheduling", "reschedule", "booking_request"]
        closing_intents = ["ready_to_buy"]
        reengagement_intents = ["ghost_reengagement"]
        followup_intents = ["scheduled_followup"]
        
        if intent in objection_intents:
            return ContextType.OBJECTION.value
        elif intent in scheduling_intents:
            return ContextType.SCHEDULING.value
        elif intent in closing_intents:
            return ContextType.CLOSING.value
        elif intent in reengagement_intents:
            return ContextType.REENGAGEMENT.value
        elif intent in followup_intents:
            return ContextType.FOLLOW_UP.value
        else:
            return ContextType.MESSAGE.value
    
    def _calculate_learning_signals(
        self,
        ai_decision: AIDecisionLog,
        user_action: UserActionLog
    ) -> LearningSignals:
        """Berechnet Learning Signals aus einer Korrektur."""
        
        signals = LearningSignals()
        
        if user_action.action_type == "approve":
            signals.should_increase_confidence = True
            signals.pattern_type = "approval"
        elif user_action.action_type == "reject":
            signals.should_increase_confidence = False
            signals.pattern_type = "rejection"
        elif user_action.action_type == "edit":
            # Bei Edit analysieren wir die Änderungen
            signals.should_increase_confidence = False
            signals.pattern_type = "edit"
            
            # Effektive Phrasen aus dem Edit extrahieren
            if user_action.edited_content and user_action.original_content:
                # Neue Phrasen identifizieren
                original_words = set(user_action.original_content.lower().split())
                edited_words = set(user_action.edited_content.lower().split())
                new_words = edited_words - original_words
                
                if len(new_words) > 0:
                    signals.effective_phrases = list(new_words)[:5]
        
        return signals
    
    async def _update_pattern_from_correction(
        self,
        user_id: str,
        intent: str,
        success: bool
    ):
        """Updated ein Learning Pattern basierend auf einer Korrektur."""
        
        try:
            pattern_key = f"{intent}_response"
            
            # Existierendes Pattern suchen
            result = self.supabase.table("learning_patterns").select("*").eq(
                "user_id", user_id
            ).eq(
                "pattern_key", pattern_key
            ).single().execute()
            
            if result.data:
                # Update
                old_count = result.data.get("sample_count", 0)
                old_rate = result.data.get("success_rate", 0.5)
                
                new_count = old_count + 1
                new_rate = ((old_rate * old_count) + (1 if success else 0)) / new_count
                
                update_data = {
                    "sample_count": new_count,
                    "success_rate": new_rate,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                if success:
                    update_data["last_success_at"] = datetime.utcnow().isoformat()
                
                self.supabase.table("learning_patterns").update(
                    update_data
                ).eq("id", result.data["id"]).execute()
            else:
                # Neu erstellen
                self.supabase.table("learning_patterns").insert({
                    "user_id": user_id,
                    "pattern_type": "successful_response" if success else "failed_response",
                    "pattern_key": pattern_key,
                    "pattern_data": {"intent": intent},
                    "sample_count": 1,
                    "success_rate": 1.0 if success else 0.0,
                    "last_success_at": datetime.utcnow().isoformat() if success else None,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
                
        except Exception as e:
            logger.error(f"Error updating pattern: {e}")


def get_learning_events_service(supabase: Client) -> LearningEventsService:
    """Factory function für LearningEventsService."""
    return LearningEventsService(supabase)

