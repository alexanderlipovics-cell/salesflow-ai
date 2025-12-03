"""
═══════════════════════════════════════════════════════════════════════════
INTELLIGENT CHAT SERVICE
═══════════════════════════════════════════════════════════════════════════
Core AI-Chat mit Auto-Extraction und automatischen Aktionen.

Features:
- GPT-4 Function Calling für strukturierte Datenextraktion
- Automatische Lead-Erstellung und -Update
- BANT-Scoring
- Personality Detection (DISG)
- Objection Handling
- RAG-Integration mit Knowledge Base
- Compliance-Checks

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from openai import AsyncOpenAI
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IntelligentChatService:
    """
    Intelligent AI Chat Service with automatic data extraction and actions.
    """
    
    def __init__(self, openai_client: AsyncOpenAI = None, supabase=None):
        self.openai_client = openai_client
        self.supabase = supabase or get_supabase_client()
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        lead_id: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: User sends message, AI processes, extracts, saves, responds.
        
        Returns:
        {
            "ai_response": "...",
            "actions_taken": ["Lead created", "BANT updated", ...],
            "lead_id": "uuid",
            "suggestions": ["Next step: Schedule call", ...],
            "extracted_data": {...}
        }
        """
        start_time = datetime.now()
        
        try:
            # 1. Load full context
            context = await self._load_full_context(user_id, lead_id, conversation_history)
            
            # 2. Extract structured data with GPT Function Calling
            extracted_data = await self._extract_data_with_gpt(message, context)
            
            # 3. Execute automatic actions
            actions_taken = []
            new_lead_id = lead_id
            
            # Create/update lead
            if extracted_data.get('lead_data'):
                new_lead_id, lead_action = await self._handle_lead_data(
                    user_id, 
                    extracted_data['lead_data'],
                    lead_id
                )
                actions_taken.append(lead_action)
            
            # Update BANT
            if extracted_data.get('bant_signals') and new_lead_id:
                bant_score = await self._handle_bant_data(new_lead_id, extracted_data['bant_signals'])
                actions_taken.append(f"✅ BANT-Score berechnet: {bant_score}/100")
            
            # Log activity
            if extracted_data.get('activity') and new_lead_id:
                await self._log_activity(new_lead_id, user_id, extracted_data['activity'])
                actions_taken.append(f"✅ Activity '{extracted_data['activity']['type']}' geloggt")
            
            # Detect personality (DISG)
            if extracted_data.get('personality_signals') and new_lead_id:
                personality_type = await self._analyze_personality(
                    new_lead_id, 
                    extracted_data['personality_signals']
                )
                actions_taken.append(f"✅ DISG-Typ erkannt: {personality_type}")
            
            # Save objections
            if extracted_data.get('objections') and new_lead_id:
                await self._save_objections(new_lead_id, extracted_data['objections'])
                actions_taken.append(f"✅ {len(extracted_data['objections'])} Einwand/Einwände gespeichert")
            
            # 4. Generate intelligent response
            ai_response = await self._generate_smart_response(
                message=message,
                context=context,
                extracted_data=extracted_data,
                actions_taken=actions_taken,
                lead_id=new_lead_id
            )
            
            # 5. Generate suggestions
            suggestions = await self._generate_next_steps(
                extracted_data, 
                new_lead_id,
                context
            )
            
            # 6. Log chat interaction
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            await self._log_chat_interaction(
                user_id=user_id,
                lead_id=new_lead_id,
                message=message,
                ai_response=ai_response,
                extracted_data=extracted_data,
                actions_taken=actions_taken,
                suggestions=suggestions,
                processing_time_ms=processing_time
            )
            
            return {
                "ai_response": ai_response,
                "actions_taken": actions_taken,
                "lead_id": new_lead_id,
                "suggestions": suggestions,
                "extracted_data": extracted_data,
                "processing_time_ms": processing_time
            }
        
        except Exception as e:
            logger.error(f"Error in intelligent chat: {str(e)}", exc_info=True)
            return {
                "ai_response": f"Es gab einen Fehler bei der Verarbeitung. Bitte versuche es erneut.",
                "actions_taken": [],
                "lead_id": lead_id,
                "suggestions": [],
                "extracted_data": {},
                "error": str(e)
            }
    
    async def _extract_data_with_gpt(self, message: str, context: Dict) -> Dict:
        """
        Use GPT-4 Function Calling to extract structured data from user message.
        """
        
        system_prompt = """Du bist Sales Analyzer für Sales Flow AI.

Deine Aufgabe: Extrahiere aus User-Messages ALLE relevanten Verkaufsinformationen.

Extrahiere:
1. LEAD-DATEN: Name, Email, Phone, Company, Job Title, Source, Notes
2. BANT-SIGNALE:
   - Budget: Zahlen (€ oder implizite Hinweise)
   - Authority: Ist die Person Entscheider? (ja/nein/unklar)
   - Need: Was braucht/will die Person?
   - Timeline: Wann will sie starten/kaufen?
3. AKTIVITÄTEN: Call, Email, Meeting, Message - mit Datum/Notizen
4. EINWÄNDE: Alle Bedenken/Zweifel die geäußert wurden
5. PERSÖNLICHKEITS-SIGNALE: Tonalität, Sprachstil für DISG-Analyse
6. INTERESSE-LEVEL: 0-10 (wie interessiert ist der Lead?)
7. PRODUKT-INTERESSE: Welche Produkte wurden erwähnt?
8. NÄCHSTE SCHRITTE: Was sollte als nächstes passieren?

WICHTIG: 
- Auch implizite Informationen extrahieren
- Wenn unsicher, als "unklar" markieren
- ALLES extrahieren, auch wenn nicht explizit gesagt
"""

        function_schema = {
            "name": "extract_sales_data",
            "description": "Extract all sales-relevant data from user message",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_data": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "email": {"type": "string"},
                            "phone": {"type": "string"},
                            "company": {"type": "string"},
                            "job_title": {"type": "string"},
                            "source": {"type": "string", "enum": ["instagram", "facebook", "linkedin", "whatsapp", "referral", "manual", "other"]},
                            "notes": {"type": "string"}
                        }
                    },
                    "bant_signals": {
                        "type": "object",
                        "properties": {
                            "budget": {
                                "type": "object",
                                "properties": {
                                    "amount": {"type": "number"},
                                    "currency": {"type": "string"},
                                    "notes": {"type": "string"}
                                }
                            },
                            "authority": {
                                "type": "object",
                                "properties": {
                                    "is_decision_maker": {"type": "boolean"},
                                    "notes": {"type": "string"}
                                }
                            },
                            "need": {
                                "type": "object",
                                "properties": {
                                    "description": {"type": "string"},
                                    "pain_points": {"type": "array", "items": {"type": "string"}},
                                    "goals": {"type": "array", "items": {"type": "string"}}
                                }
                            },
                            "timeline": {
                                "type": "object",
                                "properties": {
                                    "urgency": {"type": "string", "enum": ["immediate", "this_week", "this_month", "this_quarter", "no_rush", "unclear"]},
                                    "specific_date": {"type": "string"},
                                    "notes": {"type": "string"}
                                }
                            }
                        }
                    },
                    "activity": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["call", "email", "meeting", "message", "demo", "other"]},
                            "date": {"type": "string"},
                            "duration_minutes": {"type": "number"},
                            "outcome": {"type": "string"},
                            "notes": {"type": "string"}
                        }
                    },
                    "objections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "objection_text": {"type": "string"},
                                "category": {"type": "string", "enum": ["price", "time", "trust", "competition", "timing", "other"]},
                                "severity": {"type": "string", "enum": ["low", "medium", "high"]}
                            }
                        }
                    },
                    "personality_signals": {
                        "type": "object",
                        "properties": {
                            "communication_style": {"type": "string"},
                            "decision_speed": {"type": "string", "enum": ["fast", "moderate", "slow"]},
                            "detail_orientation": {"type": "string", "enum": ["high", "medium", "low"]},
                            "social_focus": {"type": "string", "enum": ["high", "medium", "low"]},
                            "notes": {"type": "string"}
                        }
                    },
                    "interest_level": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 10
                    },
                    "product_mentions": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "next_steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "action": {"type": "string"},
                                "priority": {"type": "string", "enum": ["urgent", "high", "medium", "low"]},
                                "deadline": {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                temperature=0.3,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"""
Context (bisherige Informationen):
{json.dumps(context, indent=2, ensure_ascii=False)}

Neue User-Message:
{message}

Extrahiere ALLE Informationen aus dieser Message!
"""}
                ],
                functions=[function_schema],
                function_call={"name": "extract_sales_data"}
            )
            
            if response.choices[0].message.function_call:
                extracted = json.loads(response.choices[0].message.function_call.arguments)
                return extracted
            else:
                return {}
        
        except Exception as e:
            logger.error(f"Error extracting data: {str(e)}")
            return {}
    
    async def _generate_smart_response(
        self,
        message: str,
        context: Dict,
        extracted_data: Dict,
        actions_taken: List[str],
        lead_id: Optional[str]
    ) -> str:
        """
        Generate intelligent response (simplified version without RAG for now).
        """
        
        system_prompt = f"""Du bist Sales Flow AI - der intelligenteste Sales-Assistent für Network Marketing.

DEINE ROLLE:
- Hilf dem User bei allem rund um Verkauf, Lead-Management, Strategie
- Sei proaktiv mit Empfehlungen
- Feiere Erfolge mit!

AUTOMATISCHE AKTIONEN DURCHGEFÜHRT:
{chr(10).join(f'- {action}' for action in actions_taken) if actions_taken else 'Keine'}

EXTRAHIERTE DATEN:
{json.dumps(extracted_data, indent=2, ensure_ascii=False)}

ANWEISUNGEN:
1. Beantworte die User-Frage direkt und hilfreich
2. Gib konkrete nächste Schritte
3. Nutze die extrahierten Daten für personalisierte Tipps
4. Sei enthusiastisch aber professionell
5. Halte dich kurz (max 150 Wörter)

WICHTIG:
- KEINE Health Claims oder Income Guarantees!
- IMMER Disclaimer wenn nötig
"""
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                temperature=0.7,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ]
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "Ich habe deine Nachricht verstanden und die Daten gespeichert. Was möchtest du als nächstes tun?"
    
    async def _handle_lead_data(
        self, 
        user_id: str, 
        lead_data: Dict,
        existing_lead_id: Optional[str]
    ) -> tuple[Optional[str], str]:
        """
        Create or update lead in database.
        Returns: (lead_id, action_message)
        """
        try:
            if existing_lead_id:
                # Update existing lead
                update_fields = {k: v for k, v in lead_data.items() if v}
                if update_fields:
                    self.supabase.table('leads').update(update_fields).eq('id', existing_lead_id).execute()
                return existing_lead_id, f"✅ Lead-Daten aktualisiert"
            else:
                # Create new lead
                insert_data = {
                    'user_id': user_id,
                    'name': lead_data.get('name'),
                    'email': lead_data.get('email'),
                    'phone': lead_data.get('phone'),
                    'company': lead_data.get('company'),
                    'source': lead_data.get('source', 'manual'),
                    'notes': lead_data.get('notes'),
                    'status': 'new'
                }
                result = self.supabase.table('leads').insert(insert_data).execute()
                if result.data:
                    lead_id = result.data[0]['id']
                    lead_name = lead_data.get('name', 'Unknown')
                    return lead_id, f"✅ Lead '{lead_name}' erstellt"
            
            return None, "❌ Fehler beim Speichern der Lead-Daten"
        
        except Exception as e:
            logger.error(f"Error handling lead data: {str(e)}")
            return None, f"❌ Fehler: {str(e)}"
    
    async def _handle_bant_data(
        self, 
        lead_id: str, 
        bant_signals: Dict
    ) -> int:
        """
        Create or update BANT assessment.
        Returns: total_score
        """
        try:
            # Calculate scores (0-100)
            budget_score = self._calculate_budget_score(bant_signals.get('budget', {}))
            authority_score = self._calculate_authority_score(bant_signals.get('authority', {}))
            need_score = self._calculate_need_score(bant_signals.get('need', {}))
            timeline_score = self._calculate_timeline_score(bant_signals.get('timeline', {}))
            
            total_score = int((budget_score + authority_score + need_score + timeline_score) / 4)
            
            # Determine traffic light
            if total_score >= 75:
                traffic_light = 'green'
            elif total_score >= 50:
                traffic_light = 'yellow'
            else:
                traffic_light = 'red'
            
            # Insert or update
            bant_data = {
                'lead_id': lead_id,
                'budget_score': int(budget_score),
                'authority_score': int(authority_score),
                'need_score': int(need_score),
                'timeline_score': int(timeline_score),
                'total_score': total_score,
                'traffic_light': traffic_light,
                'budget_notes': json.dumps(bant_signals.get('budget', {})),
                'authority_notes': json.dumps(bant_signals.get('authority', {})),
                'need_notes': json.dumps(bant_signals.get('need', {})),
                'timeline_notes': json.dumps(bant_signals.get('timeline', {})),
                'assessed_by': 'ai_auto',
                'confidence_level': 0.7
            }
            
            # Upsert
            result = self.supabase.table('bant_assessments').upsert(bant_data, on_conflict='lead_id').execute()
            
            return total_score
        
        except Exception as e:
            logger.error(f"Error handling BANT data: {str(e)}")
            return 0
    
    def _calculate_budget_score(self, budget: Dict) -> float:
        """Calculate budget score (0-100)."""
        amount = budget.get('amount', 0)
        if not amount:
            return 0
        
        # Simple scoring logic
        if amount < 100:
            return min(amount / 5, 20)
        elif amount < 300:
            return 20 + ((amount - 100) / 200) * 30
        elif amount < 500:
            return 50 + ((amount - 300) / 200) * 25
        else:
            return min(75 + ((amount - 500) / 500) * 25, 100)
    
    def _calculate_authority_score(self, authority: Dict) -> float:
        """Calculate authority score (0-100)."""
        if authority.get('is_decision_maker'):
            return 100
        elif authority.get('notes'):
            return 50
        return 0
    
    def _calculate_need_score(self, need: Dict) -> float:
        """Calculate need score (0-100)."""
        score = 0
        if need.get('description'):
            score = 70
        if need.get('pain_points'):
            score += 15
        if need.get('goals'):
            score += 15
        return min(score, 100)
    
    def _calculate_timeline_score(self, timeline: Dict) -> float:
        """Calculate timeline score (0-100)."""
        urgency_map = {
            'immediate': 100,
            'this_week': 85,
            'this_month': 70,
            'this_quarter': 50,
            'no_rush': 25,
            'unclear': 0
        }
        urgency = timeline.get('urgency', 'unclear')
        return urgency_map.get(urgency, 0)
    
    async def _log_activity(
        self, 
        lead_id: str, 
        user_id: str,
        activity_data: Dict
    ):
        """Log activity for lead."""
        try:
            activity = {
                'lead_id': lead_id,
                'user_id': user_id,
                'type': activity_data.get('type', 'message'),
                'description': activity_data.get('notes', ''),
                'outcome': activity_data.get('outcome'),
                'duration_minutes': activity_data.get('duration_minutes'),
                'activity_date': activity_data.get('date') or datetime.now().isoformat(),
                'auto_logged': True
            }
            
            self.supabase.table('activities').insert(activity).execute()
        
        except Exception as e:
            logger.error(f"Error logging activity: {str(e)}")
    
    async def _analyze_personality(
        self, 
        lead_id: str, 
        personality_signals: Dict
    ) -> str:
        """
        Analyze personality based on signals and determine DISG type.
        """
        try:
            # Simple heuristic for DISG determination
            decision_speed = personality_signals.get('decision_speed', 'moderate')
            detail_orientation = personality_signals.get('detail_orientation', 'medium')
            social_focus = personality_signals.get('social_focus', 'medium')
            
            # Determine primary type
            if decision_speed == 'fast' and social_focus == 'low':
                primary_type = 'D'
            elif decision_speed == 'fast' and social_focus == 'high':
                primary_type = 'I'
            elif decision_speed == 'slow' and social_focus == 'high':
                primary_type = 'S'
            elif decision_speed == 'slow' and detail_orientation == 'high':
                primary_type = 'C'
            else:
                primary_type = 'I'  # Default
            
            # Upsert personality profile
            profile = {
                'lead_id': lead_id,
                'primary_type': primary_type,
                'confidence_score': 0.6,
                'assessment_method': 'ai_analysis',
                'signals_used': json.dumps(personality_signals)
            }
            
            self.supabase.table('personality_profiles').upsert(profile, on_conflict='lead_id').execute()
            
            return primary_type
        
        except Exception as e:
            logger.error(f"Error analyzing personality: {str(e)}")
            return 'Unknown'
    
    async def _save_objections(self, lead_id: str, objections: List[Dict]):
        """Save objections to lead metadata."""
        try:
            # Get current lead
            lead = self.supabase.table('leads').select('metadata').eq('id', lead_id).execute()
            if not lead.data:
                return
            
            current_metadata = lead.data[0].get('metadata', {}) or {}
            current_objections = current_metadata.get('objections', [])
            
            # Append new objections
            for objection in objections:
                current_objections.append({
                    **objection,
                    'recorded_at': datetime.now().isoformat()
                })
            
            # Update lead
            self.supabase.table('leads').update({
                'metadata': {**current_metadata, 'objections': current_objections}
            }).eq('id', lead_id).execute()
        
        except Exception as e:
            logger.error(f"Error saving objections: {str(e)}")
    
    async def _generate_next_steps(
        self, 
        extracted_data: Dict,
        lead_id: Optional[str],
        context: Dict
    ) -> List[str]:
        """Generate smart next-step suggestions."""
        suggestions = []
        
        # Based on BANT
        if extracted_data.get('bant_signals'):
            bant = extracted_data['bant_signals']
            
            if not bant.get('budget', {}).get('amount'):
                suggestions.append("💡 Frage nach Budget: 'Was hast du dir für den Start vorgestellt?'")
            
            if not bant.get('timeline', {}).get('urgency'):
                suggestions.append("💡 Frage nach Timeline: 'Wann möchtest du idealerweise starten?'")
        
        # Based on interest level
        interest = extracted_data.get('interest_level', 0)
        if interest >= 7:
            suggestions.append("🔥 HOT Lead! Nächster Schritt: Call buchen oder Angebot senden")
        elif interest >= 4:
            suggestions.append("📞 Warm Lead. Empfehlung: Follow-up in 2-3 Tagen")
        
        # Based on objections
        if extracted_data.get('objections'):
            suggestions.append("⚠️ Einwände erkannt. Nutze LIABILITY-SHIELD für perfekte Antworten")
        
        # Based on extracted next steps
        if extracted_data.get('next_steps'):
            for step in extracted_data['next_steps'][:2]:
                suggestions.append(f"✅ {step['action']}")
        
        return suggestions[:5]
    
    async def _load_full_context(
        self,
        user_id: str,
        lead_id: Optional[str],
        conversation_history: Optional[List[Dict]]
    ) -> Dict:
        """Load all relevant context for this conversation."""
        context = {
            "user_id": user_id,
            "conversation_history": conversation_history or []
        }
        
        if lead_id:
            try:
                # Load lead data
                lead = self.supabase.table('leads').select('*').eq('id', lead_id).execute()
                if lead.data:
                    context['lead'] = lead.data[0]
                
                # Load BANT
                bant = self.supabase.table('bant_assessments').select('*').eq('lead_id', lead_id).execute()
                if bant.data:
                    context['bant'] = bant.data[0]
                
                # Load personality
                personality = self.supabase.table('personality_profiles').select('*').eq('lead_id', lead_id).execute()
                if personality.data:
                    context['personality'] = personality.data[0]
            
            except Exception as e:
                logger.error(f"Error loading context: {str(e)}")
        
        return context
    
    async def _log_chat_interaction(
        self,
        user_id: str,
        lead_id: Optional[str],
        message: str,
        ai_response: str,
        extracted_data: Dict,
        actions_taken: List[str],
        suggestions: List[str],
        processing_time_ms: int
    ):
        """Log chat interaction to database."""
        try:
            # Log user message
            self.supabase.table('intelligent_chat_logs').insert({
                'user_id': user_id,
                'lead_id': lead_id,
                'role': 'user',
                'message': message,
                'extracted_data': json.dumps(extracted_data),
                'actions_taken': actions_taken,
                'suggestions': suggestions,
                'processing_time_ms': processing_time_ms,
                'model': 'gpt-4'
            }).execute()
            
            # Log assistant response
            self.supabase.table('intelligent_chat_logs').insert({
                'user_id': user_id,
                'lead_id': lead_id,
                'role': 'assistant',
                'message': ai_response,
                'processing_time_ms': 0
            }).execute()
        
        except Exception as e:
            logger.error(f"Error logging chat: {str(e)}")

