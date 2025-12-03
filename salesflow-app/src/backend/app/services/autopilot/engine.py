"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT ENGINE                                                          ║
║  Hauptlogik für automatische Nachrichtenverarbeitung                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Die Engine verbindet:
- Intent Detection
- Confidence Scoring
- Response Generation
- Action Execution
"""

import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging

from supabase import Client

from .intent_detector import IntentDetector
from .confidence import ConfidenceEngine, ConfidenceResult
from ...config.prompts.chief_autopilot import (
    MessageIntent,
    LeadTemperature,
    AutopilotAction,
    AutopilotSettings,
    AutopilotDecision,
    LeadAutopilotOverride,
    InboundMessage,
    InboundChannel,
    IntentAnalysis,
    AutonomyLevel,
    build_autopilot_system_prompt,
    build_intent_router_prompt,
    build_confidence_engine_prompt
)

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Vollständiges Ergebnis der Nachrichtenverarbeitung."""
    success: bool
    lead_id: str
    message_id: str
    
    # Analysis
    intent_analysis: IntentAnalysis
    confidence_result: ConfidenceResult
    
    # Decision
    decision: AutopilotDecision
    
    # Response
    response_sent: bool
    response_message: Optional[str] = None
    
    # Next Steps
    follow_up_scheduled: bool = False
    follow_up_date: Optional[datetime] = None
    
    # Alerts
    user_alerted: bool = False
    alert_type: Optional[str] = None
    
    # Metadata
    processing_time_ms: int = 0
    error: Optional[str] = None


class AutopilotEngine:
    """
    Die Haupt-Engine für den CHIEF Autopilot.
    
    Verarbeitet eingehende Nachrichten und entscheidet:
    - Was ist der Intent?
    - Wie sicher bin ich?
    - Was soll passieren?
    - Wer muss benachrichtigt werden?
    """
    
    def __init__(
        self,
        supabase: Client,
        llm_client,
        knowledge_service=None,
        push_service=None
    ):
        """
        Args:
            supabase: Supabase Client
            llm_client: LLM Client für Response Generation
            knowledge_service: Service für Knowledge Base Lookup
            push_service: Service für Push Notifications
        """
        self.supabase = supabase
        self.llm_client = llm_client
        self.knowledge_service = knowledge_service
        self.push_service = push_service
        
        self.intent_detector = IntentDetector(llm_client)
        self.confidence_engine = ConfidenceEngine(knowledge_service)
    
    async def process_inbound_message(
        self,
        user_id: str,
        message: InboundMessage,
        settings: Optional[AutopilotSettings] = None
    ) -> ProcessingResult:
        """
        Verarbeitet eine eingehende Nachricht komplett.
        
        Args:
            user_id: ID des Users (Owner der Leads)
            message: Die eingehende Nachricht
            settings: User Autopilot-Settings
            
        Returns:
            ProcessingResult mit allen Details
        """
        start_time = datetime.utcnow()
        
        try:
            # 1. Settings laden wenn nicht übergeben
            settings = settings or await self._load_settings(user_id)
            
            # 2. Lead finden oder erstellen
            lead = await self._get_or_create_lead(
                user_id, 
                message.channel, 
                message.lead_external_id
            )
            
            # 3. Nachricht speichern
            stored_message = await self._store_message(lead["id"], message)
            
            # 4. Lead-Kontext laden
            lead_context = await self._load_lead_context(lead["id"])
            
            # 5. Lead Override laden
            lead_override = await self._load_lead_override(lead["id"])
            
            # 6. Intent analysieren
            intent_analysis = self.intent_detector.analyze(
                message=message.text,
                conversation_history=lead_context.get("recent_messages", []),
                lead_context=lead_context
            )
            
            # 7. Response generieren (wenn nötig)
            response_message = await self._generate_response(
                user_id=user_id,
                lead=lead,
                message=message,
                intent_analysis=intent_analysis,
                settings=settings
            )
            
            # 8. Knowledge Match suchen
            knowledge_match = await self._search_knowledge(
                user_id, message.text
            ) if self.knowledge_service else None
            
            # 9. Confidence berechnen
            confidence_result = self.confidence_engine.calculate(
                intent=intent_analysis.intent,
                intent_confidence=intent_analysis.confidence,
                response_message=response_message or "",
                lead_context=lead_context,
                knowledge_match=knowledge_match,
                settings=settings,
                lead_override=lead_override
            )
            
            # 10. Entscheidung treffen
            decision = AutopilotDecision(
                action=confidence_result.action,
                confidence_score=confidence_result.score,
                confidence_breakdown=confidence_result.breakdown,
                reasoning=confidence_result.reasoning,
                response_message=response_message,
                user_prompt=self._generate_user_prompt(
                    lead["name"],
                    intent_analysis,
                    confidence_result.action
                )
            )
            
            # 11. Aktion ausführen
            execution_result = await self._execute_action(
                user_id=user_id,
                lead=lead,
                message=message,
                decision=decision,
                intent_analysis=intent_analysis,
                settings=settings
            )
            
            # 12. Result zusammenbauen
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return ProcessingResult(
                success=True,
                lead_id=lead["id"],
                message_id=stored_message["id"],
                intent_analysis=intent_analysis,
                confidence_result=confidence_result,
                decision=decision,
                response_sent=execution_result.get("sent", False),
                response_message=response_message,
                follow_up_scheduled=execution_result.get("follow_up_scheduled", False),
                follow_up_date=execution_result.get("follow_up_date"),
                user_alerted=execution_result.get("user_alerted", False),
                alert_type=execution_result.get("alert_type"),
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return ProcessingResult(
                success=False,
                lead_id="",
                message_id="",
                intent_analysis=IntentAnalysis(
                    intent=MessageIntent.UNCLEAR,
                    confidence=0,
                    lead_temperature=LeadTemperature.WARM,
                    sentiment="neutral",
                    urgency="low"
                ),
                confidence_result=ConfidenceResult(
                    score=0,
                    breakdown=None,
                    action=AutopilotAction.HUMAN_NEEDED,
                    reasoning="Processing error",
                    recommendations=[],
                    risk_factors=[]
                ),
                decision=AutopilotDecision(
                    action=AutopilotAction.HUMAN_NEEDED,
                    confidence_score=0,
                    confidence_breakdown=None,
                    reasoning="Error during processing"
                ),
                response_sent=False,
                processing_time_ms=processing_time,
                error=str(e)
            )
    
    async def _load_settings(self, user_id: str) -> AutopilotSettings:
        """Lädt User Autopilot Settings aus der DB."""
        try:
            result = self.supabase.table("autopilot_settings").select("*").eq(
                "user_id", user_id
            ).single().execute()
            
            if result.data:
                return AutopilotSettings(
                    autonomy_level=AutonomyLevel(result.data.get("autonomy_level", "assistant")),
                    confidence_threshold=result.data.get("confidence_threshold", 90),
                    auto_info_replies=result.data.get("auto_info_replies", True),
                    auto_simple_questions=result.data.get("auto_simple_questions", True),
                    auto_followups=result.data.get("auto_followups", True),
                    auto_scheduling=result.data.get("auto_scheduling", True),
                    auto_calendar_booking=result.data.get("auto_calendar_booking", False),
                    auto_price_replies=result.data.get("auto_price_replies", False),
                    auto_objection_handling=result.data.get("auto_objection_handling", False),
                    auto_closing=result.data.get("auto_closing", False),
                    notify_hot_lead=result.data.get("notify_hot_lead", True),
                    notify_human_needed=result.data.get("notify_human_needed", True),
                    notify_daily_summary=result.data.get("notify_daily_summary", True),
                    notify_every_action=result.data.get("notify_every_action", False),
                    working_hours_start=result.data.get("working_hours_start", "09:00"),
                    working_hours_end=result.data.get("working_hours_end", "20:00"),
                    send_on_weekends=result.data.get("send_on_weekends", False)
                )
        except Exception:
            pass
        
        return AutopilotSettings()  # Defaults
    
    async def _get_or_create_lead(
        self,
        user_id: str,
        channel: InboundChannel,
        external_id: str
    ) -> Dict[str, Any]:
        """Findet einen Lead oder erstellt einen neuen."""
        
        # Erst nach external_id suchen
        result = self.supabase.table("leads").select("*").eq(
            "user_id", user_id
        ).eq(
            "channel", channel.value
        ).eq(
            "external_id", external_id
        ).execute()
        
        if result.data:
            return result.data[0]
        
        # Neuen Lead erstellen
        new_lead = {
            "user_id": user_id,
            "channel": channel.value,
            "external_id": external_id,
            "name": f"Lead {external_id[:8]}",  # Placeholder
            "status": "new",
            "source": f"autopilot_{channel.value}",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = self.supabase.table("leads").insert(new_lead).execute()
        return result.data[0]
    
    async def _store_message(
        self,
        lead_id: str,
        message: InboundMessage
    ) -> Dict[str, Any]:
        """Speichert die Nachricht in der DB."""
        
        msg_data = {
            "lead_id": lead_id,
            "channel": message.channel.value,
            "direction": "inbound",
            "content_type": message.content_type,
            "content": message.text,
            "media_url": message.media_url,
            "external_id": message.external_id,
            "timestamp": message.timestamp.isoformat(),
            "raw_payload": json.dumps(message.raw_payload)
        }
        
        result = self.supabase.table("lead_messages").insert(msg_data).execute()
        return result.data[0]
    
    async def _load_lead_context(self, lead_id: str) -> Dict[str, Any]:
        """Lädt den vollständigen Lead-Kontext."""
        
        # Lead Details
        lead = self.supabase.table("leads").select("*").eq(
            "id", lead_id
        ).single().execute()
        
        # Letzte Nachrichten
        messages = self.supabase.table("lead_messages").select("*").eq(
            "lead_id", lead_id
        ).order("timestamp", desc=True).limit(10).execute()
        
        # Stats berechnen
        context = {
            "lead_id": lead_id,
            "name": lead.data.get("name", "Unknown") if lead.data else "Unknown",
            "status": lead.data.get("status", "new") if lead.data else "new",
            "interaction_count": len(messages.data) if messages.data else 0,
            "recent_messages": messages.data if messages.data else [],
            "is_vip": lead.data.get("is_vip", False) if lead.data else False,
            "estimated_value": lead.data.get("estimated_value", 0) if lead.data else 0
        }
        
        # Letzte Kontakt-Zeit
        if messages.data and len(messages.data) > 0:
            last_msg = messages.data[0]
            last_contact = datetime.fromisoformat(last_msg["timestamp"].replace("Z", "+00:00"))
            days_since = (datetime.utcnow() - last_contact.replace(tzinfo=None)).days
            context["days_since_last_contact"] = days_since
            context["last_contact"] = last_msg["timestamp"]
        
        return context
    
    async def _load_lead_override(
        self,
        lead_id: str
    ) -> Optional[LeadAutopilotOverride]:
        """Lädt Lead-spezifische Autopilot Overrides."""
        
        try:
            result = self.supabase.table("lead_autopilot_overrides").select("*").eq(
                "lead_id", lead_id
            ).single().execute()
            
            if result.data:
                return LeadAutopilotOverride(
                    lead_id=lead_id,
                    mode=result.data.get("mode", "normal"),
                    reason=result.data.get("reason"),
                    is_vip=result.data.get("is_vip", False)
                )
        except Exception:
            pass
        
        return None
    
    async def _search_knowledge(
        self,
        user_id: str,
        query: str
    ) -> Optional[Dict[str, Any]]:
        """Sucht in der Knowledge Base."""
        
        if not self.knowledge_service:
            return None
        
        try:
            results = await self.knowledge_service.search(
                user_id=user_id,
                query=query,
                limit=3
            )
            
            if results and len(results) > 0:
                best_match = results[0]
                return {
                    "match_type": "similar" if best_match.get("similarity", 0) > 0.8 else "partial",
                    "similarity": best_match.get("similarity", 0),
                    "content": best_match.get("content", ""),
                    "source": best_match.get("source", "")
                }
        except Exception as e:
            logger.warning(f"Knowledge search failed: {e}")
        
        return None
    
    async def _generate_response(
        self,
        user_id: str,
        lead: Dict[str, Any],
        message: InboundMessage,
        intent_analysis: IntentAnalysis,
        settings: AutopilotSettings
    ) -> Optional[str]:
        """Generiert eine Response basierend auf Intent."""
        
        # Für bestimmte Intents keine Response generieren
        no_response_intents = [
            MessageIntent.SPAM,
            MessageIntent.IRRELEVANT
        ]
        
        if intent_analysis.intent in no_response_intents:
            return None
        
        # Template-basierte Responses für Standard-Intents
        templates = self._get_response_templates()
        
        if intent_analysis.intent in templates:
            template = templates[intent_analysis.intent]
            return self._personalize_template(template, lead, intent_analysis)
        
        # LLM für komplexere Fälle
        try:
            prompt = build_intent_router_prompt(
                lead_name=lead.get("name", "Lead"),
                lead_status=lead.get("status", "new"),
                channel=message.channel.value,
                last_interaction="kürzlich",
                interaction_count=0,
                confidence_threshold=settings.confidence_threshold
            )
            
            response = await self.llm_client.generate(
                system_prompt=prompt,
                user_message=f"Nachricht: {message.text}\nIntent: {intent_analysis.intent.value}",
                max_tokens=300
            )
            
            return response
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return None
    
    def _get_response_templates(self) -> Dict[MessageIntent, str]:
        """Standard-Response-Templates für häufige Intents."""
        return {
            MessageIntent.SIMPLE_INFO: (
                "Hey! 👋 Kurz gesagt: Wir helfen dir, mehr aus deinen Leads rauszuholen - "
                "ohne mehr Tools oder Chaos.\n\n"
                "Was interessiert dich am meisten - Follow-ups, Einwandbehandlung oder "
                "generell mehr Abschlüsse?"
            ),
            MessageIntent.PRICE_INQUIRY: (
                "Super Frage! 💰 Je nach Paket ab €79/Monat.\n\n"
                "Das Richtige für dich finden wir am besten in 10 Min am Telefon.\n"
                "Wann passt es dir diese Woche? 📞"
            ),
            MessageIntent.TIME_OBJECTION: (
                "Verstehe ich total! ⏰\n\n"
                "Wann passt es dir besser - nächste Woche oder in 2 Wochen?\n"
                "Ich melde mich dann nochmal."
            ),
            MessageIntent.SCHEDULING: (
                "Perfekt! 📅 Ich trage das ein.\n\n"
                "Du bekommst gleich eine Kalendereinladung.\n"
                "Bis dann! 👋"
            ),
        }
    
    def _personalize_template(
        self,
        template: str,
        lead: Dict[str, Any],
        intent_analysis: IntentAnalysis
    ) -> str:
        """Personalisiert ein Template mit Lead-Daten."""
        
        name = lead.get("name", "")
        if name and not name.startswith("Lead "):
            # Personalisierte Begrüßung
            template = template.replace("Hey!", f"Hey {name}!")
        
        return template
    
    async def _execute_action(
        self,
        user_id: str,
        lead: Dict[str, Any],
        message: InboundMessage,
        decision: AutopilotDecision,
        intent_analysis: IntentAnalysis,
        settings: AutopilotSettings
    ) -> Dict[str, Any]:
        """Führt die entschiedene Aktion aus."""
        
        result = {
            "sent": False,
            "follow_up_scheduled": False,
            "user_alerted": False
        }
        
        if decision.action == AutopilotAction.AUTO_SEND:
            # Prüfen ob wir das dürfen
            if self._can_auto_send(intent_analysis.intent, settings):
                # Nachricht senden (Channel-spezifisch)
                sent = await self._send_message(
                    lead=lead,
                    channel=message.channel,
                    content=decision.response_message
                )
                result["sent"] = sent
                
                # Hot Lead Alert
                if intent_analysis.lead_temperature == LeadTemperature.HOT:
                    if settings.notify_hot_lead:
                        await self._alert_user(
                            user_id=user_id,
                            alert_type="hot_lead",
                            lead=lead,
                            message=f"🔥 HOT LEAD: {lead['name']} zeigt Kaufsignal!"
                        )
                        result["user_alerted"] = True
                        result["alert_type"] = "hot_lead"
            else:
                # Fallback zu Draft
                decision.action = AutopilotAction.DRAFT_REVIEW
        
        if decision.action == AutopilotAction.DRAFT_REVIEW:
            # Draft speichern
            await self._save_draft(
                user_id=user_id,
                lead_id=lead["id"],
                content=decision.response_message,
                intent=intent_analysis.intent.value
            )
            
            # User benachrichtigen
            if settings.notify_human_needed:
                await self._alert_user(
                    user_id=user_id,
                    alert_type="draft_review",
                    lead=lead,
                    message=decision.user_prompt or f"📝 Entwurf für {lead['name']} prüfen"
                )
                result["user_alerted"] = True
                result["alert_type"] = "draft_review"
        
        if decision.action == AutopilotAction.HUMAN_NEEDED:
            # Dringend Alert
            await self._alert_user(
                user_id=user_id,
                alert_type="human_needed",
                lead=lead,
                message=f"🚨 {lead['name']} braucht deine Antwort!"
            )
            result["user_alerted"] = True
            result["alert_type"] = "human_needed"
        
        if decision.action == AutopilotAction.ARCHIVE:
            # Lead archivieren
            await self._archive_lead(lead["id"])
        
        # Follow-up planen wenn nötig
        if intent_analysis.intent in [MessageIntent.TIME_OBJECTION, MessageIntent.SIMPLE_INFO]:
            follow_up_date = datetime.utcnow() + timedelta(days=2)
            await self._schedule_follow_up(
                lead_id=lead["id"],
                scheduled_for=follow_up_date,
                reason=f"Follow-up nach {intent_analysis.intent.value}"
            )
            result["follow_up_scheduled"] = True
            result["follow_up_date"] = follow_up_date
        
        # Action loggen
        await self._log_action(
            user_id=user_id,
            lead_id=lead["id"],
            action=decision.action.value,
            intent=intent_analysis.intent.value,
            confidence=decision.confidence_score,
            response_sent=result["sent"]
        )
        
        return result
    
    def _can_auto_send(
        self,
        intent: MessageIntent,
        settings: AutopilotSettings
    ) -> bool:
        """Prüft ob Auto-Send für diesen Intent erlaubt ist."""
        
        permission_map = {
            MessageIntent.SIMPLE_INFO: settings.auto_info_replies,
            MessageIntent.SPECIFIC_QUESTION: settings.auto_simple_questions,
            MessageIntent.SCHEDULING: settings.auto_scheduling,
            MessageIntent.PRICE_INQUIRY: settings.auto_price_replies,
            MessageIntent.PRICE_OBJECTION: settings.auto_objection_handling,
            MessageIntent.TIME_OBJECTION: settings.auto_objection_handling,
            MessageIntent.READY_TO_BUY: settings.auto_closing,
        }
        
        return permission_map.get(intent, False)
    
    async def _send_message(
        self,
        lead: Dict[str, Any],
        channel: InboundChannel,
        content: str
    ) -> bool:
        """Sendet eine Nachricht über den jeweiligen Kanal."""
        
        # TODO: Channel-spezifische Implementierung
        # Für jetzt nur loggen und in DB speichern
        
        try:
            msg_data = {
                "lead_id": lead["id"],
                "channel": channel.value,
                "direction": "outbound",
                "content_type": "text",
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "auto_sent": True
            }
            
            self.supabase.table("lead_messages").insert(msg_data).execute()
            
            logger.info(f"Auto-sent message to lead {lead['id']} via {channel.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False
    
    async def _save_draft(
        self,
        user_id: str,
        lead_id: str,
        content: str,
        intent: str
    ):
        """Speichert einen Entwurf für spätere Review."""
        
        draft_data = {
            "user_id": user_id,
            "lead_id": lead_id,
            "content": content,
            "intent": intent,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        
        self.supabase.table("autopilot_drafts").insert(draft_data).execute()
    
    async def _alert_user(
        self,
        user_id: str,
        alert_type: str,
        lead: Dict[str, Any],
        message: str
    ):
        """Sendet einen Alert an den User."""
        
        if self.push_service:
            await self.push_service.send_notification(
                user_id=user_id,
                title=f"CHIEF Autopilot",
                body=message,
                data={
                    "type": alert_type,
                    "lead_id": lead["id"],
                    "lead_name": lead.get("name", "Unknown")
                }
            )
    
    async def _archive_lead(self, lead_id: str):
        """Archiviert einen Lead (Spam/Irrelevant)."""
        
        self.supabase.table("leads").update({
            "status": "archived",
            "archived_at": datetime.utcnow().isoformat(),
            "archive_reason": "autopilot_spam"
        }).eq("id", lead_id).execute()
    
    async def _schedule_follow_up(
        self,
        lead_id: str,
        scheduled_for: datetime,
        reason: str
    ):
        """Plant ein Follow-up."""
        
        self.supabase.table("follow_up_tasks").insert({
            "lead_id": lead_id,
            "scheduled_for": scheduled_for.isoformat(),
            "reason": reason,
            "status": "pending",
            "source": "autopilot"
        }).execute()
    
    async def _log_action(
        self,
        user_id: str,
        lead_id: str,
        action: str,
        intent: str,
        confidence: int,
        response_sent: bool
    ):
        """Loggt eine Autopilot-Aktion für Analytics."""
        
        self.supabase.table("autopilot_actions").insert({
            "user_id": user_id,
            "lead_id": lead_id,
            "action": action,
            "intent": intent,
            "confidence_score": confidence,
            "response_sent": response_sent,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    
    def _generate_user_prompt(
        self,
        lead_name: str,
        intent_analysis: IntentAnalysis,
        action: AutopilotAction
    ) -> str:
        """Generiert einen kurzen Prompt für den User."""
        
        if action == AutopilotAction.DRAFT_REVIEW:
            return f"📝 Antwort für {lead_name} prüfen? [Senden] [Bearbeiten]"
        
        if action == AutopilotAction.HUMAN_NEEDED:
            intent_labels = {
                MessageIntent.COMPLEX_OBJECTION: "Komplexer Einwand",
                MessageIntent.READY_TO_BUY: "Will kaufen!",
                MessageIntent.UNCLEAR: "Unklar was gemeint ist"
            }
            label = intent_labels.get(intent_analysis.intent, intent_analysis.intent.value)
            return f"🚨 {lead_name}: {label} - Deine Antwort gefragt"
        
        return ""

