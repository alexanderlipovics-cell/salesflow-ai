# backend/app/services/chat_import/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT IMPORT SERVICE V2                                                     ║
║  Vollständige Conversation Intelligence                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- KI-gestützte Chat-Analyse mit Claude
- Lead-Extraktion mit Status & Deal-State
- Template Extraction
- Objection Detection
- Seller Style Analysis
- Learning Case Integration
- Contact Plan Automatisierung
"""

import json
import re
import os
from typing import Optional, List, Dict, Any, Tuple
from datetime import date, datetime, timedelta
from uuid import UUID

from supabase import Client
import anthropic

from ...api.schemas.chat_import import (
    ChatImportRequest,
    ChatImportResult,
    SaveImportRequest,
    SaveImportResponse,
    LeadCandidate,
    NextAction,
    ParsedMessage,
    ExtractedTemplate,
    DetectedObjection,
    SellerStyle,
    ConversationSummary,
    LeadStatus,
    DealState,
    ActionType,
    ObjectionType,
    MessageIntent,
    Channel,
)
from ...config.prompts.chief_chat_import import build_chat_import_prompt


class ChatImportService:
    """
    Vollständiger Chat Import Service mit Conversation Intelligence.
    
    Features:
    - Claude-basierte Analyse
    - Template Extraction
    - Objection Detection  
    - Learning Case Creation
    - Contact Plan Automation
    """
    
    # XP Rewards
    XP_CONVERSATION_IMPORTED = 10
    XP_LEAD_CREATED = 15
    XP_TEMPLATE_EXTRACTED = 5
    XP_LEARNING_CASE_CREATED = 25
    
    def __init__(self, db: Client):
        self.db = db
        self.anthropic = None
        if os.getenv("ANTHROPIC_API_KEY"):
            self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # =========================================================================
    # MAIN ANALYSIS
    # =========================================================================
    
    def analyze_chat(self, request: ChatImportRequest) -> ChatImportResult:
        """
        Analysiert einen Chatverlauf mit Claude.
        """
        
        # Build prompt
        prompt = build_chat_import_prompt(
            raw_text=request.raw_text,
            channel=request.channel.value if request.channel else None,
            vertical_id=request.vertical_id,
            company_id=request.company_id,
            language=request.language,
        )
        
        # Call Claude
        if self.anthropic:
            try:
                response = self.anthropic.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4000,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                content = response.content[0].text
                
                # Parse JSON
                # Remove markdown code blocks if present
                content = re.sub(r'^```json\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
                content = content.strip()
                
                # Try to find JSON object
                if not content.startswith('{'):
                    json_match = re.search(r'\{[\s\S]*\}', content)
                    if json_match:
                        content = json_match.group()
                
                data = json.loads(content)
                
                # Convert to Pydantic model
                return self._parse_analysis_result(data)
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                print(f"Content: {content[:500] if content else 'empty'}")
                # Fall back to rule-based
                return self._analyze_with_rules(request)
            except Exception as e:
                print(f"Analysis failed: {e}")
                return self._analyze_with_rules(request)
        else:
            # No API key - use rule-based
            return self._analyze_with_rules(request)
    
    def _parse_analysis_result(self, data: Dict) -> ChatImportResult:
        """Konvertiert Claude-Output zu ChatImportResult"""
        
        # Parse messages
        messages = []
        for msg in data.get("messages", []):
            try:
                messages.append(ParsedMessage(
                    sender_type=msg.get("sender_type", "unknown"),
                    sender_name=msg.get("sender_name"),
                    content=msg.get("content", ""),
                    sent_at=self._parse_datetime(msg.get("sent_at")),
                    sequence_number=msg.get("sequence_number", 0),
                    intent=self._safe_enum(MessageIntent, msg.get("intent")),
                    objection_type=self._safe_enum(ObjectionType, msg.get("objection_type")),
                    sentiment=msg.get("sentiment"),
                    is_template_candidate=msg.get("is_template_candidate", False),
                    template_use_case=msg.get("template_use_case"),
                ))
            except Exception as e:
                print(f"Error parsing message: {e}")
                continue
        
        # Parse lead candidate
        lead_data = data.get("lead_candidate", {})
        lead_candidate = LeadCandidate(
            name=lead_data.get("name"),
            handle_or_profile=lead_data.get("handle_or_profile"),
            phone=lead_data.get("phone"),
            email=lead_data.get("email"),
            channel=self._safe_enum(Channel, lead_data.get("channel")),
            location=lead_data.get("location"),
            company=lead_data.get("company"),
            notes=lead_data.get("notes"),
        )
        
        # Parse next action
        next_action_data = data.get("next_action", {})
        next_action = NextAction(
            action_type=self._safe_enum(ActionType, next_action_data.get("action_type")) or ActionType.no_action,
            action_description=next_action_data.get("action_description"),
            suggested_date=self._parse_date(next_action_data.get("suggested_date")),
            suggested_time=next_action_data.get("suggested_time"),
            suggested_channel=self._safe_enum(Channel, next_action_data.get("suggested_channel")),
            suggested_message=next_action_data.get("suggested_message"),
            priority=next_action_data.get("priority", 50),
            is_urgent=next_action_data.get("is_urgent", False),
            reasoning=next_action_data.get("reasoning"),
        )
        
        # Parse extracted templates
        templates = []
        for t in data.get("extracted_templates", []):
            try:
                templates.append(ExtractedTemplate(
                    content=t.get("content", ""),
                    use_case=t.get("use_case", "general"),
                    context_description=t.get("context_description"),
                    works_for_lead_status=[self._safe_enum(LeadStatus, s) for s in t.get("works_for_lead_status", []) if self._safe_enum(LeadStatus, s)],
                    works_for_deal_state=[self._safe_enum(DealState, s) for s in t.get("works_for_deal_state", []) if self._safe_enum(DealState, s)],
                    effectiveness_indicators=t.get("effectiveness_indicators", []),
                ))
            except Exception as e:
                print(f"Error parsing template: {e}")
                continue
        
        # Parse detected objections
        objections = []
        for o in data.get("detected_objections", []):
            try:
                objections.append(DetectedObjection(
                    objection_type=self._safe_enum(ObjectionType, o.get("objection_type")) or ObjectionType.other,
                    objection_text=o.get("objection_text", ""),
                    objection_context=o.get("objection_context"),
                    response_text=o.get("response_text"),
                    response_technique=o.get("response_technique"),
                    response_worked=o.get("response_worked"),
                ))
            except Exception as e:
                print(f"Error parsing objection: {e}")
                continue
        
        # Parse seller style
        style_data = data.get("seller_style", {})
        seller_style = SellerStyle(
            tone=style_data.get("tone", "friendly_casual"),
            pressure_level=style_data.get("pressure_level", "low"),
            emoji_usage=style_data.get("emoji_usage", "moderate"),
            message_length=style_data.get("message_length", "medium"),
            closing_style=style_data.get("closing_style", "soft_ask"),
            personalization_level=style_data.get("personalization_level", "high"),
        )
        
        # Parse conversation summary
        summary_data = data.get("conversation_summary", {})
        conversation_summary = ConversationSummary(
            summary=summary_data.get("summary", ""),
            key_topics=summary_data.get("key_topics", []),
            customer_sentiment=summary_data.get("customer_sentiment", "neutral"),
            sales_stage=summary_data.get("sales_stage", "unknown"),
            main_blocker=summary_data.get("main_blocker"),
        )
        
        return ChatImportResult(
            messages=messages,
            message_count=data.get("message_count", len(messages)),
            lead_candidate=lead_candidate,
            lead_status=self._safe_enum(LeadStatus, data.get("lead_status")) or LeadStatus.unknown,
            deal_state=self._safe_enum(DealState, data.get("deal_state")) or DealState.none,
            conversation_summary=conversation_summary,
            last_contact_summary=data.get("last_contact_summary", ""),
            next_action=next_action,
            extracted_templates=templates,
            detected_objections=objections,
            seller_style=seller_style,
            detected_channel=self._safe_enum(Channel, data.get("detected_channel")),
            detected_language=data.get("detected_language", "de"),
            first_message_at=self._parse_datetime(data.get("first_message_at")),
            last_message_at=self._parse_datetime(data.get("last_message_at")),
            confidence_score=data.get("confidence_score", 0.8),
            uncertainty_notes=data.get("uncertainty_notes", []),
            quality_score=data.get("quality_score"),
        )
    
    def _analyze_with_rules(self, request: ChatImportRequest) -> ChatImportResult:
        """Regelbasierte Analyse als Fallback"""
        
        raw_text = request.raw_text
        text_lower = raw_text.lower()
        lines = raw_text.split('\n')
        
        # Parse messages
        messages = []
        sequence = 0
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if ':' in line:
                parts = line.split(':', 1)
                sender_name = parts[0].strip()
                content = parts[1].strip() if len(parts) > 1 else ""
                
                # Determine sender type
                sender_type = "user" if sender_name.lower() in ['ich', 'du', 'me', 'you', 'alex'] else "lead"
                if sender_name.lower() in ['ich', 'me', 'alex']:
                    sender_type = "user"
                else:
                    sender_type = "lead"
                
                sequence += 1
                messages.append(ParsedMessage(
                    sender_type=sender_type,
                    sender_name=sender_name,
                    content=content,
                    sequence_number=sequence,
                ))
        
        # Extract name
        lead_name = None
        for msg in messages:
            if msg.sender_type == "lead" and msg.sender_name:
                if msg.sender_name.lower() not in ['du', 'you', 'kunde', 'customer']:
                    lead_name = msg.sender_name
                    break
        
        # Extract handle
        handle = None
        handles = re.findall(r'@([a-zA-Z0-9_.]+)', raw_text)
        if handles:
            handle = max(handles, key=len)
        
        # Determine status
        lead_status = LeadStatus.warm
        if any(w in text_lower for w in ['kein interesse', 'lass mich', 'nerv', 'spam']):
            lead_status = LeadStatus.cold
        elif any(w in text_lower for w in ['super', 'gerne', 'interessiert', 'erzähl mehr', 'telefonieren', 'treffen']):
            lead_status = LeadStatus.hot
        
        # Determine deal state
        deal_state = DealState.none
        if any(w in text_lower for w in ['überweise', 'buche das', 'zahle', 'bezahle']):
            deal_state = DealState.pending_payment
        elif any(w in text_lower for w in ['überlege', 'denke nach', 'prüfe das']):
            deal_state = DealState.considering
        elif any(w in text_lower for w in ['später', 'nächstes jahr', 'nach urlaub', 'nicht jetzt']):
            deal_state = DealState.on_hold
        
        # Determine next action
        action_type = ActionType.follow_up_message
        action_date = date.today() + timedelta(days=3)
        
        if deal_state == DealState.pending_payment:
            action_type = ActionType.check_payment
            action_date = date.today() + timedelta(days=2)
        elif deal_state == DealState.on_hold:
            action_type = ActionType.reactivation_follow_up
            action_date = date.today() + timedelta(weeks=3)
        
        # Build summary
        summary = f"Gespräch mit {lead_name or 'Lead'} analysiert. "
        if lead_status == LeadStatus.hot:
            summary += "Starkes Interesse erkennbar."
        elif deal_state == DealState.pending_payment:
            summary += "Zahlungszusage erkannt - Follow-up zur Zahlung."
        elif deal_state == DealState.on_hold:
            summary += "Lead hat auf später verschoben."
        
        return ChatImportResult(
            messages=messages,
            message_count=len(messages),
            lead_candidate=LeadCandidate(
                name=lead_name,
                handle_or_profile=handle,
                channel=request.channel,
            ),
            lead_status=lead_status,
            deal_state=deal_state,
            conversation_summary=ConversationSummary(
                summary=summary,
                key_topics=[],
                customer_sentiment="neutral",
            ),
            last_contact_summary=f"Letzter Kontakt: {messages[-1].content[:50] if messages else 'N/A'}...",
            next_action=NextAction(
                action_type=action_type,
                suggested_date=action_date,
                priority=50,
            ),
            confidence_score=0.5,
            uncertainty_notes=["Regelbasierte Analyse - bitte Status manuell prüfen"],
        )
    
    # =========================================================================
    # SAVE IMPORT
    # =========================================================================
    
    def save_import(
        self,
        user_id: str,
        request: SaveImportRequest,
    ) -> SaveImportResponse:
        """
        Speichert das Import-Ergebnis in der Datenbank.
        """
        
        result = request.import_result
        xp_earned = 0
        
        try:
            # 1. Create or Update Lead
            lead_id = None
            if request.create_lead:
                lead_id = self._create_or_update_lead(
                    user_id=user_id,
                    lead_candidate=result.lead_candidate,
                    lead_status=request.lead_status_override or result.lead_status,
                    deal_state=request.deal_state_override or result.deal_state,
                    last_contact_summary=result.last_contact_summary,
                    name_override=request.lead_name_override,
                )
                xp_earned += self.XP_LEAD_CREATED
            
            # 2. Create Conversation
            conversation_id = self._create_conversation(
                user_id=user_id,
                lead_id=lead_id,
                raw_text=request.raw_text,
                result=result,
            )
            xp_earned += self.XP_CONVERSATION_IMPORTED
            
            # 3. Save Messages
            messages_saved = self._save_messages(
                conversation_id=conversation_id,
                messages=result.messages,
            )
            
            # 4. Create Contact Plan
            contact_plan_id = None
            if request.create_contact_plan and lead_id and result.next_action.action_type != ActionType.no_action:
                contact_plan_id = self._create_contact_plan(
                    user_id=user_id,
                    lead_id=lead_id,
                    conversation_id=conversation_id,
                    next_action=result.next_action,
                )
            
            # 5. Save Templates
            templates_saved = 0
            if request.save_templates and result.extracted_templates:
                templates_saved = self._save_templates(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    templates=result.extracted_templates,
                )
                xp_earned += templates_saved * self.XP_TEMPLATE_EXTRACTED
            
            # 6. Save Objections
            objections_saved = 0
            if request.save_objections and result.detected_objections:
                objections_saved = self._save_objections(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    objections=result.detected_objections,
                )
            
            # 7. Save as Learning Case
            learning_case_id = None
            if request.save_as_learning_case:
                learning_case_id = self._create_learning_case(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    request=request,
                    result=result,
                )
                xp_earned += self.XP_LEARNING_CASE_CREATED
            
            # 8. Award XP
            self._award_xp(user_id, xp_earned, "chat_import")
            
            return SaveImportResponse(
                success=True,
                lead_id=str(lead_id) if lead_id else None,
                conversation_id=str(conversation_id),
                contact_plan_id=str(contact_plan_id) if contact_plan_id else None,
                learning_case_id=str(learning_case_id) if learning_case_id else None,
                templates_saved=templates_saved,
                objections_saved=objections_saved,
                messages_saved=messages_saved,
                xp_earned=xp_earned,
                message=self._build_success_message(
                    lead_created=lead_id is not None,
                    contact_plan_created=contact_plan_id is not None,
                    templates_saved=templates_saved,
                ),
            )
            
        except Exception as e:
            print(f"Save import error: {e}")
            return SaveImportResponse(
                success=False,
                message=f"Fehler beim Speichern: {str(e)}",
            )
    
    # =========================================================================
    # HELPER: CREATE LEAD
    # =========================================================================
    
    def _create_or_update_lead(
        self,
        user_id: str,
        lead_candidate: LeadCandidate,
        lead_status: LeadStatus,
        deal_state: DealState,
        last_contact_summary: str,
        name_override: str = None,
    ) -> str:
        """Erstellt oder aktualisiert Lead"""
        
        name = name_override or lead_candidate.name or "Unbekannt"
        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None
        
        # Check for existing lead by handle or phone
        existing_lead = None
        if lead_candidate.handle_or_profile:
            result = self.db.table("leads").select("id").eq(
                "user_id", user_id
            ).eq("social_handle", lead_candidate.handle_or_profile).limit(1).execute()
            
            if result.data:
                existing_lead = result.data[0]
        
        if not existing_lead and lead_candidate.phone:
            result = self.db.table("leads").select("id").eq(
                "user_id", user_id
            ).eq("phone", lead_candidate.phone).limit(1).execute()
            
            if result.data:
                existing_lead = result.data[0]
        
        if existing_lead:
            # Update existing
            self.db.table("leads").update({
                "status": lead_status.value if isinstance(lead_status, LeadStatus) else lead_status,
                "deal_state": deal_state.value if isinstance(deal_state, DealState) else deal_state,
                "last_contact_summary": last_contact_summary,
                "last_contact_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", existing_lead["id"]).execute()
            
            return existing_lead["id"]
        else:
            # Create new
            insert_data = {
                "user_id": user_id,
                "first_name": first_name,
                "last_name": last_name,
                "social_handle": lead_candidate.handle_or_profile,
                "phone": lead_candidate.phone,
                "email": lead_candidate.email,
                "channel": lead_candidate.channel.value if lead_candidate.channel else None,
                "status": lead_status.value if isinstance(lead_status, LeadStatus) else lead_status,
                "deal_state": deal_state.value if isinstance(deal_state, DealState) else deal_state,
                "last_contact_summary": last_contact_summary,
                "last_contact_at": datetime.utcnow().isoformat(),
                "import_source": "chat_import",
            }
            
            result = self.db.table("leads").insert(insert_data).execute()
            
            if not result.data:
                raise Exception("Lead konnte nicht erstellt werden")
            
            return result.data[0]["id"]
    
    # =========================================================================
    # HELPER: CREATE CONVERSATION
    # =========================================================================
    
    def _create_conversation(
        self,
        user_id: str,
        lead_id: Optional[str],
        raw_text: str,
        result: ChatImportResult,
    ) -> str:
        """Erstellt Conversation-Eintrag"""
        
        # Extract participant names
        participant_names = list(set(
            msg.sender_name for msg in result.messages 
            if msg.sender_name
        ))
        
        db_result = self.db.table("conversations").insert({
            "user_id": user_id,
            "lead_id": lead_id,
            "channel": result.detected_channel.value if result.detected_channel else "unknown",
            "raw_text": raw_text,
            "participant_names": participant_names,
            "message_count": result.message_count,
            "first_message_at": result.first_message_at.isoformat() if result.first_message_at else None,
            "last_message_at": result.last_message_at.isoformat() if result.last_message_at else None,
            "summary": result.conversation_summary.summary,
            "detected_language": result.detected_language,
            "import_source": "manual_paste",
            "processing_status": "completed",
        }).execute()
        
        if not db_result.data:
            raise Exception("Conversation konnte nicht erstellt werden")
        
        return db_result.data[0]["id"]
    
    # =========================================================================
    # HELPER: SAVE MESSAGES
    # =========================================================================
    
    def _save_messages(
        self,
        conversation_id: str,
        messages: List[ParsedMessage],
    ) -> int:
        """Speichert einzelne Nachrichten"""
        
        count = 0
        for msg in messages:
            try:
                self.db.table("messages").insert({
                    "conversation_id": conversation_id,
                    "sender_type": msg.sender_type,
                    "sender_name": msg.sender_name,
                    "content": msg.content,
                    "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                    "sequence_number": msg.sequence_number,
                    "message_intent": msg.intent.value if msg.intent else None,
                    "detected_objection_type": msg.objection_type.value if msg.objection_type else None,
                    "sentiment": msg.sentiment,
                    "is_template_candidate": msg.is_template_candidate,
                    "template_use_case": msg.template_use_case,
                }).execute()
                count += 1
            except Exception as e:
                print(f"Error saving message: {e}")
                continue
        
        return count
    
    # =========================================================================
    # HELPER: CREATE CONTACT PLAN
    # =========================================================================
    
    def _create_contact_plan(
        self,
        user_id: str,
        lead_id: str,
        conversation_id: str,
        next_action: NextAction,
    ) -> str:
        """Erstellt Contact Plan Eintrag"""
        
        # Default date if not specified
        planned_date = next_action.suggested_date
        if not planned_date:
            # Estimate based on action type
            if next_action.action_type == ActionType.check_payment:
                planned_date = date.today() + timedelta(days=3)
            elif next_action.action_type == ActionType.reactivation_follow_up:
                planned_date = date.today() + timedelta(weeks=3)
            else:
                planned_date = date.today() + timedelta(days=5)
        
        result = self.db.table("contact_plans").insert({
            "user_id": user_id,
            "lead_id": lead_id,
            "source_conversation_id": conversation_id,
            "source_type": "chat_import",
            "action_type": next_action.action_type.value if isinstance(next_action.action_type, ActionType) else next_action.action_type,
            "action_description": next_action.action_description,
            "planned_at": planned_date.isoformat(),
            "planned_time": next_action.suggested_time,
            "suggested_message": next_action.suggested_message,
            "suggested_channel": next_action.suggested_channel.value if next_action.suggested_channel else None,
            "priority": next_action.priority,
            "is_urgent": next_action.is_urgent,
            "status": "open",
        }).execute()
        
        if not result.data:
            raise Exception("Contact Plan konnte nicht erstellt werden")
        
        return result.data[0]["id"]
    
    # =========================================================================
    # HELPER: SAVE TEMPLATES
    # =========================================================================
    
    def _save_templates(
        self,
        user_id: str,
        conversation_id: str,
        templates: List[ExtractedTemplate],
    ) -> int:
        """Speichert extrahierte Templates"""
        
        count = 0
        for template in templates:
            try:
                self.db.table("message_templates").insert({
                    "user_id": user_id,
                    "source_conversation_id": conversation_id,
                    "extraction_type": "chat_import",
                    "content": template.content,
                    "use_case": template.use_case,
                    "context_tags": template.effectiveness_indicators,
                    "works_for_lead_status": [s.value for s in template.works_for_lead_status],
                    "works_for_deal_state": [s.value for s in template.works_for_deal_state],
                }).execute()
                count += 1
            except Exception as e:
                print(f"Error saving template: {e}")
                continue
        
        return count
    
    # =========================================================================
    # HELPER: SAVE OBJECTIONS
    # =========================================================================
    
    def _save_objections(
        self,
        user_id: str,
        conversation_id: str,
        objections: List[DetectedObjection],
    ) -> int:
        """Speichert erkannte Einwände"""
        
        count = 0
        for obj in objections:
            try:
                self.db.table("extracted_objections").insert({
                    "user_id": user_id,
                    "source_conversation_id": conversation_id,
                    "objection_type": obj.objection_type.value if isinstance(obj.objection_type, ObjectionType) else obj.objection_type,
                    "objection_text": obj.objection_text,
                    "objection_context": obj.objection_context,
                    "response_text": obj.response_text,
                    "response_technique": obj.response_technique,
                    "response_worked": obj.response_worked,
                }).execute()
                count += 1
            except Exception as e:
                print(f"Error saving objection: {e}")
                continue
        
        return count
    
    # =========================================================================
    # HELPER: CREATE LEARNING CASE
    # =========================================================================
    
    def _create_learning_case(
        self,
        user_id: str,
        conversation_id: str,
        request: SaveImportRequest,
        result: ChatImportResult,
    ) -> Optional[str]:
        """Erstellt Learning Case für Living OS"""
        
        try:
            # Build extracted data
            extracted_data = {
                "participants": [
                    msg.sender_name for msg in result.messages if msg.sender_name
                ],
                "key_objections": [
                    obj.objection_type.value if isinstance(obj.objection_type, ObjectionType) else obj.objection_type
                    for obj in result.detected_objections
                ],
                "successful_techniques": [
                    obj.response_technique for obj in result.detected_objections
                    if obj.response_worked
                ],
                "best_messages": [
                    {"content": t.content, "use_case": t.use_case}
                    for t in result.extracted_templates[:3]
                ],
            }
            
            # Build extracted templates
            extracted_templates = [
                {
                    "use_case": t.use_case,
                    "message": t.content,
                    "context": {"lead_status": [s.value for s in t.works_for_lead_status]},
                    "effectiveness_indicators": t.effectiveness_indicators,
                }
                for t in result.extracted_templates
            ]
            
            db_result = self.db.table("learning_cases").insert({
                "user_id": user_id,
                "conversation_id": conversation_id,
                "vertical": result.lead_candidate.channel.value if result.lead_candidate.channel else None,
                "channel": result.detected_channel.value if result.detected_channel else None,
                "conversation_goal": request.learning_case_goal,
                "outcome": request.learning_case_outcome,
                "outcome_details": request.learning_case_notes,
                "raw_conversation": request.raw_text,
                "extracted_data": json.dumps(extracted_data),
                "extracted_templates": json.dumps(extracted_templates),
                "seller_style": json.dumps(result.seller_style.model_dump() if hasattr(result.seller_style, 'model_dump') else {}),
                "source_type": "own",
                "quality_score": result.quality_score,
                "processing_status": "completed",
            }).execute()
            
            if db_result.data:
                return db_result.data[0]["id"]
        except Exception as e:
            print(f"Error creating learning case: {e}")
        
        return None
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _safe_enum(self, enum_class, value):
        """Safely convert value to enum"""
        if value is None:
            return None
        try:
            return enum_class(value)
        except (ValueError, KeyError):
            return None
    
    def _parse_date(self, value) -> Optional[date]:
        """Parst Datum aus verschiedenen Formaten"""
        if not value:
            return None
        if isinstance(value, date):
            return value
        try:
            return datetime.strptime(str(value), "%Y-%m-%d").date()
        except:
            return None
    
    def _parse_datetime(self, value) -> Optional[datetime]:
        """Parst Datetime aus verschiedenen Formaten"""
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except:
            try:
                return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
            except:
                return None
    
    def _award_xp(self, user_id: str, amount: int, reason: str):
        """Vergibt XP an User"""
        try:
            # Update user profile
            self.db.table("user_profiles").update({
                "xp": self.db.table("user_profiles").select("xp").eq("user_id", user_id).execute().data[0].get("xp", 0) + amount
            }).eq("user_id", user_id).execute()
            
            # Log XP event
            self.db.table("xp_events").insert({
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "source": "chat_import",
            }).execute()
        except Exception as e:
            print(f"Error awarding XP: {e}")
    
    def _build_success_message(
        self,
        lead_created: bool,
        contact_plan_created: bool,
        templates_saved: int,
    ) -> str:
        """Baut Success Message"""
        parts = ["✅ Import erfolgreich!"]
        
        if lead_created:
            parts.append("Lead angelegt")
        if contact_plan_created:
            parts.append("Follow-up geplant")
        if templates_saved > 0:
            parts.append(f"{templates_saved} Templates extrahiert")
        
        return " • ".join(parts)


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[ChatImportService] = None


def get_chat_import_service_v2(db: Client) -> ChatImportService:
    """Factory für ChatImportService"""
    return ChatImportService(db)
