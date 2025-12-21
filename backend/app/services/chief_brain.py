"""
CHIEF Brain - Zentrale Intelligenz für AlSales
Konsolidiert: Workflow Detection, Message Generation, Learning
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# STATE PSYCHOLOGY (aus queue_message_generator.py)
# ═══════════════════════════════════════════════════════════════

STATE_PSYCHOLOGY = {
    "new": {
        "mindset": "Neugierig aber skeptisch. Kennt dich noch nicht.",
        "goal": "Aus der Masse herausstechen, echtes Interesse zeigen",
        "tone": "Authentisch, persönlich, interessiert an IHREM Leben",
        "avoid": "Produkt-Pitches, Copy-Paste Gefühl",
        "success_metric": "Antwort bekommen",
    },
    "contacted": {
        "mindset": "Hat Nachricht bekommen, überlegt ob relevant.",
        "goal": "Neugier wecken, zum Antworten bewegen",
        "tone": "Locker, kein Druck, Mehrwert bieten",
        "avoid": "Zu viele Nachrichten, verzweifelt wirken",
        "success_metric": "Erste Antwort",
    },
    "engaged": {
        "mindset": "Hat Interesse gezeigt. Will verstehen ob es passt.",
        "goal": "Wert demonstrieren, als Experte positionieren",
        "tone": "Hilfreich, informativ, beratend statt verkaufend",
        "avoid": "Zu früh auf Abschluss drängen",
        "success_metric": "Termin oder konkrete Frage",
    },
    "qualified": {
        "mindset": "Kurz vor Entscheidung. Hat letzte Zweifel.",
        "goal": "Entscheidung erleichtern, Risiko minimieren",
        "tone": "Selbstbewusst, unterstützend, Klarheit gebend",
        "avoid": "Verzweifelt wirken, zu viel Druck",
        "success_metric": "Abschluss oder Commitment",
    },
    "won": {
        "mindset": "Ist Kunde/Partner. Offen für mehr wenn happy.",
        "goal": "Beziehung pflegen, Erfolge feiern",
        "tone": "Wertschätzend, persönlich, Partner auf Augenhöhe",
        "avoid": "Sofort nächsten Sale pushen",
        "success_metric": "Wiederkauf oder Empfehlung",
    },
    "lost": {
        "mindset": "Hat nein gesagt. Will nicht belästigt werden.",
        "goal": "Sanft Tür offen halten, neuen Mehrwert bieten",
        "tone": "Respektvoll, nicht aufdringlich",
        "avoid": "Vorwürfe, Guilt-Tripping, zu häufig melden",
        "success_metric": "Zweite Chance",
    },
}


# ═══════════════════════════════════════════════════════════════
# WORKFLOW CASES (aus workflow_engine.py)
# ═══════════════════════════════════════════════════════════════

WORKFLOW_CASES = {
    "CLOSED": {
        "priority": "skip",
        "action": "Überspringe - Lead abgeschlossen",
        "buttons": [],
        "urgency": "none",
    },
    "HOT_LEAD": {
        "priority": "critical",
        "action": "🔥 Sofort handeln!",
        "buttons": ["call_now", "whatsapp", "instagram"],
        "urgency": "immediate",
    },
    "RESPONSE_RECEIVED": {
        "priority": "high",
        "action": "💬 Lead hat geantwortet - jetzt reagieren!",
        "buttons": ["whatsapp", "instagram", "email", "call"],
        "urgency": "immediate",
    },
    "FOLLOWUP_DUE": {
        "priority": "high",
        "action": "📅 Follow-up fällig",
        "buttons": ["send_followup", "whatsapp", "instagram", "snooze"],
        "urgency": "today",
    },
    "WAITING": {
        "priority": "low",
        "action": "⏳ Warte auf Antwort",
        "buttons": ["snooze", "note"],
        "urgency": "none",
    },
    "GONE_COLD": {
        "priority": "medium",
        "action": "❄️ Reaktivierung nötig",
        "buttons": ["reactivate", "whatsapp", "instagram", "archive"],
        "urgency": "this_week",
    },
    "QUALIFIED": {
        "priority": "high",
        "action": "🎯 Abschluss vorbereiten",
        "buttons": ["call", "book_meeting", "whatsapp"],
        "urgency": "today",
    },
    "NEW_LEAD": {
        "priority": "medium",
        "action": "👋 Erstkontakt nötig",
        "buttons": ["whatsapp", "instagram", "email"],
        "urgency": "today",
    },
}


def calculate_days_since(timestamp: Optional[str]) -> Optional[int]:
    """Berechnet Tage seit Timestamp."""
    if not timestamp:
        return None
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return (datetime.now(dt.tzinfo) - dt).days
    except:
        return None


def clean_message(message: Optional[str]) -> Optional[str]:
    """Bereinigt Nachricht für Copy-Paste."""
    if not message:
        return None
    
    message = message.strip()
    
    # Entferne Präfixe
    prefixes = ['Nachricht:', 'Message:', 'Suggested:', 'Vorschlag:', 'Icebreaker:', 'Eisbrecher:']
    for prefix in prefixes:
        if message.startswith(prefix):
            message = message[len(prefix):].strip()
    
    # Entferne Markdown
    message = message.replace('**', '').replace('__', '')
    
    return message if message else None


class ChiefBrain:
    """
    Zentrale Intelligenz für AlSales.
    
    Verantwortlich für:
    - Workflow Detection (welcher Status, welche Aktion)
    - Message Generation (personalisierte Nachrichten)
    - Learning (was funktioniert, was nicht)
    """
    
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id
        self._user_templates = None
        self._user_preferences = None
    
    # ═══════════════════════════════════════════════════════════
    # WORKFLOW DETECTION
    # ═══════════════════════════════════════════════════════════
    
    async def detect_workflow(
        self,
        lead: Dict[str, Any],
        messages: List[Dict] = None,
        followups: List[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Erkennt den Workflow-Status eines Leads.
        
        Returns:
            {
                'case': str,              # Workflow Case ID
                'priority': str,          # critical, high, medium, low, skip
                'action': str,            # Angezeigte Aktion
                'reason': str,            # Begründung
                'suggested_message': str, # Vorgeschlagene Nachricht
                'buttons': List[str],     # Verfügbare Buttons
                'urgency': str,           # immediate, today, this_week, none
                'channel': str            # Empfohlener Kanal
            }
        """
        messages = messages or []
        followups = followups or []
        
        lead_status = (lead.get('status') or 'new').lower()
        lead_temp = lead.get('temperature', 'cold')
        last_contact = lead.get('last_contact_at')
        name = lead.get('name', 'Lead').split()[0] if lead.get('name') else 'Lead'
        
        # 1. CLOSED - Lead gewonnen/verloren
        if lead_status in ['won', 'lost']:
            return self._build_workflow_result('CLOSED', lead, "Lead bereits abgeschlossen")
        
        # 2. HOT_LEAD - Temperatur = hot
        if lead_temp == 'hot':
            return self._build_workflow_result('HOT_LEAD', lead, f"{name} ist heiß! Schnell abschließen.")
        
        # 3. RESPONSE_RECEIVED - Letzte Nachricht war vom Lead
        if messages:
            last_msg = messages[-1] if messages else None  # Neueste zuletzt in Liste
            if last_msg and last_msg.get('direction') == 'inbound':
                return self._build_workflow_result(
                    'RESPONSE_RECEIVED', 
                    lead, 
                    f"{name} hat geantwortet!",
                    last_message=last_msg.get('content', '')
                )
        
        # 4. FOLLOWUP_DUE - Pending Follow-up fällig
        pending_followups = [f for f in followups if f.get('status') == 'pending']
        if pending_followups:
            due_followup = pending_followups[0]
            due_at = due_followup.get('due_at')
            if due_at:
                try:
                    due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                    now = datetime.now(due_date.tzinfo)
                    if due_date <= now:
                        return self._build_workflow_result(
                            'FOLLOWUP_DUE',
                            lead,
                            f"Follow-up fällig: {due_followup.get('reason', 'Nachfassen')}",
                            followup=due_followup
                        )
                except:
                    # Wenn Parsing fehlschlägt, trotzdem als fällig behandeln
                    return self._build_workflow_result(
                        'FOLLOWUP_DUE',
                        lead,
                        f"Follow-up fällig: {due_followup.get('reason', 'Nachfassen')}",
                        followup=due_followup
                    )
        
        # 5. WAITING - Wir haben geschrieben, warten auf Antwort (<7 Tage)
        days_since = calculate_days_since(last_contact)
        if last_contact and days_since is not None:
            # Prüfe ob letzte Nachricht outbound war
            if messages:
                last_msg = messages[-1]
                if last_msg.get('direction') == 'outbound' and days_since < 7:
                    return self._build_workflow_result(
                        'WAITING',
                        lead,
                        f"Nachricht vor {days_since} Tag(en) gesendet"
                    )
            
            # 6. GONE_COLD - Kein Kontakt > 7 Tage
            if days_since >= 7:
                return self._build_workflow_result(
                    'GONE_COLD',
                    lead,
                    f"Kein Kontakt seit {days_since} Tagen"
                )
        
        # 7. QUALIFIED - Status = qualified
        if lead_status == 'qualified':
            return self._build_workflow_result(
                'QUALIFIED',
                lead,
                f"{name} ist qualifiziert - Abschluss vorbereiten"
            )
        
        # 8. NEW_LEAD - Default für neue Leads
        return self._build_workflow_result(
            'NEW_LEAD',
            lead,
            "Neuer Lead - Erstkontakt nötig"
        )
    
    def _build_workflow_result(
        self,
        case: str,
        lead: Dict,
        reason: str,
        followup: Dict = None,
        last_message: str = None
    ) -> Dict[str, Any]:
        """Baut das Workflow-Result Objekt."""
        workflow_config = WORKFLOW_CASES.get(case, WORKFLOW_CASES['NEW_LEAD'])
        state = (lead.get('status') or 'new').lower()
        psychology = STATE_PSYCHOLOGY.get(state, STATE_PSYCHOLOGY['new'])
        
        # Bestimme bevorzugten Kanal
        channel = self._determine_channel(lead, followup)
        
        # Generiere Nachricht
        suggested_message = self._generate_quick_message(lead, case, psychology, followup, last_message)
        
        # Filtere Buttons basierend auf verfügbaren Kontaktdaten
        buttons = self._filter_buttons(workflow_config['buttons'], lead)
        
        result = {
            'case': case.lower(),
            'priority': workflow_config['priority'],
            'action': workflow_config['action'],
            'reason': reason,
            'suggested_message': clean_message(suggested_message),
            'buttons': buttons,
            'urgency': workflow_config['urgency'],
            'channel': channel,
            'psychology': psychology,
        }
        
        if followup:
            result['followup_id'] = followup.get('id')
        
        if last_message:
            result['last_message'] = last_message
        
        return result
    
    def _determine_channel(self, lead: Dict, followup: Dict = None) -> str:
        """Bestimmt den besten Kanal für den Lead."""
        # Wenn Follow-up einen Kanal hat, nutze diesen
        if followup and followup.get('channel'):
            return followup.get('channel').lower()
        
        # Ansonsten basierend auf verfügbaren Kontaktdaten
        if lead.get('whatsapp') or lead.get('phone'):
            return 'whatsapp'
        if lead.get('instagram') or lead.get('instagram_handle'):
            return 'instagram'
        if lead.get('email'):
            return 'email'
        return 'whatsapp'  # Default
    
    def _filter_buttons(self, buttons: List[str], lead: Dict) -> List[str]:
        """Filtert Buttons basierend auf verfügbaren Kontaktdaten."""
        filtered = []
        for btn in buttons:
            if btn == 'whatsapp' and not (lead.get('whatsapp') or lead.get('phone')):
                continue
            if btn == 'instagram' and not (lead.get('instagram') or lead.get('instagram_handle')):
                continue
            if btn == 'email' and not lead.get('email'):
                continue
            if btn in ['call', 'call_now'] and not lead.get('phone'):
                continue
            filtered.append(btn)
        return filtered
    
    def _generate_quick_message(
        self,
        lead: Dict,
        case: str,
        psychology: Dict,
        followup: Dict = None,
        last_message: str = None
    ) -> str:
        """Generiert eine schnelle Nachricht basierend auf Context."""
        name = lead.get('name', '').split()[0] if lead.get('name') else 'du'
        
        # Wenn Follow-up bereits eine Nachricht hat, nutze diese
        if followup and followup.get('suggested_message'):
            return followup.get('suggested_message')
        
        templates = {
            'NEW_LEAD': f"Hey {name}! 👋 Bin gerade auf dein Profil gestoßen - finde super was du machst! Hättest du Lust auf einen kurzen Austausch?",
            'FOLLOWUP_DUE': f"Hey {name}! 🙂 Wollte kurz nachhaken - hast du meine letzte Nachricht gesehen?",
            'GONE_COLD': f"Hey {name}! Lange nichts gehört - hoffe dir geht's gut! 🙂 Ist das Thema noch relevant für dich?",
            'HOT_LEAD': f"Hey {name}! 🔥 Super dass du interessiert bist - wann passt dir ein kurzes Gespräch?",
            'RESPONSE_RECEIVED': f"Hey {name}! Danke für deine Nachricht! 🙌 Lass uns kurz telefonieren damit ich dir alles zeigen kann.",
            'QUALIFIED': f"Hey {name}! Freut mich dass es passt - lass uns den nächsten Schritt besprechen! 🎯",
            'WAITING': None,  # Keine Nachricht wenn wir warten
        }
        
        return templates.get(case, templates['NEW_LEAD'])
    
    # ═══════════════════════════════════════════════════════════
    # MESSAGE GENERATION (AI-powered)
    # ═══════════════════════════════════════════════════════════
    
    async def generate_message(
        self,
        lead: Dict[str, Any],
        message_type: str = 'followup',
        channel: str = 'whatsapp',
        context: str = None,
    ) -> Dict[str, Any]:
        """
        Generiert eine personalisierte Nachricht mit AI.
        
        Args:
            lead: Lead-Daten
            message_type: first_contact, followup, reactivation, hot_lead
            channel: whatsapp, instagram, email
            context: Zusätzlicher Kontext (z.B. letzte Nachricht)
        
        Returns:
            {
                'message': str,
                'channel': str,
                'tone': str,
                'alternatives': List[str]  # 2-3 Alternativen
            }
        """
        # Lade User Templates
        templates = await self._load_user_templates()
        
        # Prüfe ob User-Template existiert
        user_template = self._find_matching_template(templates, message_type, channel)
        
        if user_template:
            # Nutze User-Template mit Variablen-Ersetzung
            message = self._apply_template(user_template, lead)
        else:
            # Generiere mit Default-Template
            message = await self._generate_ai_message(lead, message_type, channel, context)
        
        return {
            'message': self._clean_message(message),
            'channel': channel,
            'tone': 'friendly',
            'lead_name': lead.get('name'),
        }
    
    async def _load_user_templates(self) -> List[Dict]:
        """Lädt User-spezifische Message Templates."""
        if self._user_templates is not None:
            return self._user_templates
        
        try:
            result = self.db.table('user_message_templates')\
                .select('*')\
                .eq('user_id', self.user_id)\
                .execute()
            self._user_templates = result.data or []
        except Exception as e:
            logger.warning(f"Could not load user templates: {e}")
            self._user_templates = []
        
        return self._user_templates
    
    def _find_matching_template(
        self,
        templates: List[Dict],
        message_type: str,
        channel: str
    ) -> Optional[Dict]:
        """Findet passendes User-Template."""
        for t in templates:
            if t.get('template_type') == message_type:
                if t.get('is_default') or not channel:
                    return t
        return None
    
    def _apply_template(self, template: Dict, lead: Dict) -> str:
        """Wendet Template mit Variablen an."""
        message = template.get('message_template', '')
        
        # Variable Ersetzung
        name = lead.get('name', '').split()[0] if lead.get('name') else 'du'
        message = message.replace('{name}', name)
        message = message.replace('{{name}}', name)
        message = message.replace('{company}', lead.get('company', ''))
        message = message.replace('{{company}}', lead.get('company', ''))
        message = message.replace('{vorname}', name)
        message = message.replace('{{vorname}}', name)
        
        return message
    
    async def _generate_ai_message(
        self,
        lead: Dict,
        message_type: str,
        channel: str,
        context: str = None
    ) -> str:
        """Generiert Nachricht mit AI (Fallback)."""
        name = lead.get('name', '').split()[0] if lead.get('name') else 'du'
        
        # Simple Templates als Fallback
        templates = {
            'first_contact': f"Hey {name}! 👋 Bin gerade auf dein Profil gestoßen und finde super was du machst! Hättest du Lust auf einen kurzen Austausch?",
            'followup': f"Hey {name}! 🙂 Wollte kurz nachhaken - hast du dir das Thema schon ansehen können?",
            'reactivation': f"Hey {name}! Lange nichts gehört - hoffe dir geht's gut! Ist das Thema noch aktuell für dich?",
            'hot_lead': f"Hey {name}! 🔥 Freut mich dass du interessiert bist! Wann passt dir ein kurzes Gespräch am besten?",
        }
        
        return templates.get(message_type, templates['followup'])
    
    def _clean_message(self, message: str) -> str:
        """Bereinigt Nachricht für Copy-Paste."""
        if not message:
            return ""
        
        # Entferne Markdown
        message = message.replace('**', '').replace('__', '')
        
        # Entferne Präfixe
        prefixes = ['Nachricht:', 'Message:', 'Hier ist', 'Schreib ihm:', 'Schreib ihr:']
        for prefix in prefixes:
            if message.lower().startswith(prefix.lower()):
                message = message[len(prefix):].strip()
        
        return message.strip()
    
    # ═══════════════════════════════════════════════════════════
    # LEARNING SYSTEM
    # ═══════════════════════════════════════════════════════════
    
    async def log_message_outcome(
        self,
        lead_id: str,
        message: str,
        outcome: str,  # sent, opened, responded, positive, negative
        channel: str,
    ) -> None:
        """Loggt Message Outcome für Learning."""
        try:
            self.db.table('message_outcomes').insert({
                'user_id': self.user_id,
                'lead_id': lead_id,
                'message_template': self._anonymize_message(message),
                'channel': channel,
                'outcome': outcome,
                'outcome_score': self._outcome_to_score(outcome),
                'created_at': datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log message outcome: {e}")
    
    def _outcome_to_score(self, outcome: str) -> int:
        """Konvertiert Outcome zu Score."""
        scores = {
            'sent': 1,
            'opened': 3,
            'responded': 10,
            'positive': 15,
            'booked': 25,
            'closed': 50,
            'no_response': -2,
            'negative': -5,
        }
        return scores.get(outcome, 0)
    
    def _anonymize_message(self, message: str) -> str:
        """Anonymisiert Nachricht für Learning."""
        # Einfache Anonymisierung - Namen durch Platzhalter
        return message  # TODO: Implementiere richtige Anonymisierung
    
    # ═══════════════════════════════════════════════════════════
    # QUEUE HELPER
    # ═══════════════════════════════════════════════════════════
    
    async def get_prioritized_queue(self, limit: int = 20) -> List[Dict]:
        """
        Holt priorisierte Queue mit Workflow Detection für jeden Lead.
        FIXED: Case-insensitive Status matching.
        """
        queue = []
        seen_ids = set()
        all_leads_result = None
        
        try:
            # 1. Hot Leads (temperature = 'hot', nicht won/lost)
            hot_result = self.db.table('leads')\
                .select('*')\
                .eq('user_id', self.user_id)\
                .eq('temperature', 'hot')\
                .execute()
            
            for lead in (hot_result.data or []):
                status = (lead.get('status') or '').lower()
                if status not in ['won', 'lost']:
                    if lead.get('id') not in seen_ids:
                        workflow = await self.detect_workflow(lead)
                        queue.append({'lead': lead, 'workflow': workflow, 'score': 100})
                        seen_ids.add(lead.get('id'))
            
            logger.info(f"Hot leads found: {len([l for l in (hot_result.data or []) if (l.get('status') or '').lower() not in ['won', 'lost']])}")
        except Exception as e:
            logger.error(f"Error fetching hot leads: {e}")
        
        try:
            # 2. Fällige Follow-ups
            now = datetime.utcnow().isoformat()
            followups_result = self.db.table('followup_suggestions')\
                .select('*, leads(*)')\
                .eq('user_id', self.user_id)\
                .eq('status', 'pending')\
                .lte('due_at', now)\
                .limit(10)\
                .execute()
            
            for fu in (followups_result.data or []):
                lead = fu.get('leads', {})
                if lead and lead.get('id') and lead.get('id') not in seen_ids:
                    workflow = await self.detect_workflow(lead, followups=[fu])
                    queue.append({'lead': lead, 'workflow': workflow, 'score': 80})
                    seen_ids.add(lead.get('id'))
            
            logger.info(f"Follow-ups due found: {len(followups_result.data or [])}")
        except Exception as e:
            logger.error(f"Error fetching follow-ups: {e}")
        
        try:
            # 3. Neue Leads (status = 'new' OR 'NEW' - case insensitive)
            # Hole ALLE Leads und filtere in Python
            all_leads_result = self.db.table('leads')\
                .select('*')\
                .eq('user_id', self.user_id)\
                .limit(200)\
                .execute()
            
            new_leads = [
                l for l in (all_leads_result.data or [])
                if (l.get('status') or '').lower() == 'new'
            ]
            
            for lead in new_leads[:10]:
                if lead.get('id') not in seen_ids:
                    workflow = await self.detect_workflow(lead)
                    queue.append({'lead': lead, 'workflow': workflow, 'score': 60})
                    seen_ids.add(lead.get('id'))
            
            logger.info(f"New leads found: {len(new_leads)}")
        except Exception as e:
            logger.error(f"Error fetching new leads: {e}")
        
        try:
            # 4. Engaged/Opportunity Leads (high value)
            if all_leads_result is None:
                all_leads_result = self.db.table('leads')\
                    .select('*')\
                    .eq('user_id', self.user_id)\
                    .limit(200)\
                    .execute()
            
            engaged_leads = [
                l for l in (all_leads_result.data or [])
                if (l.get('status') or '').lower() in ['engaged', 'opportunity', 'qualified']
                and l.get('id') not in seen_ids
            ]
            
            for lead in engaged_leads[:10]:
                workflow = await self.detect_workflow(lead)
                queue.append({'lead': lead, 'workflow': workflow, 'score': 70})
                seen_ids.add(lead.get('id'))
            
            logger.info(f"Engaged/Opportunity leads found: {len(engaged_leads)}")
        except Exception as e:
            logger.error(f"Error fetching engaged leads: {e}")
        
        try:
            # 5. Contacted Leads (need follow-up)
            if all_leads_result is None:
                all_leads_result = self.db.table('leads')\
                    .select('*')\
                    .eq('user_id', self.user_id)\
                    .limit(200)\
                    .execute()
            
            contacted_leads = [
                l for l in (all_leads_result.data or [])
                if (l.get('status') or '').lower() in ['contacted', 'reviewed']
                and l.get('id') not in seen_ids
            ]
            
            for lead in contacted_leads[:10]:
                workflow = await self.detect_workflow(lead)
                queue.append({'lead': lead, 'workflow': workflow, 'score': 50})
                seen_ids.add(lead.get('id'))
            
            logger.info(f"Contacted leads found: {len(contacted_leads)}")
        except Exception as e:
            logger.error(f"Error fetching contacted leads: {e}")
        
        # 6. FALLBACK: Wenn Queue immer noch leer, hole alle nicht-abgeschlossenen Leads
        if len(queue) == 0:
            logger.warning("Queue still empty, fetching fallback leads")
            try:
                if all_leads_result is None:
                    all_leads_result = self.db.table('leads')\
                        .select('*')\
                        .eq('user_id', self.user_id)\
                        .limit(limit)\
                        .execute()
                
                for lead in (all_leads_result.data or [])[:limit]:
                    status = (lead.get('status') or '').lower()
                    if status not in ['won', 'lost'] and lead.get('id') not in seen_ids:
                        workflow = await self.detect_workflow(lead)
                        queue.append({'lead': lead, 'workflow': workflow, 'score': 30})
                        seen_ids.add(lead.get('id'))
                
                logger.info(f"Fallback leads added: {len(queue)}")
            except Exception as e:
                logger.error(f"Error fetching fallback leads: {e}")
        
        # Sortiere nach Score (höchste zuerst)
        queue.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        logger.info(f"Total queue size: {len(queue)}")
        return queue[:limit]
    
    async def _load_lead_messages(self, lead_id: str) -> List[Dict]:
        """Lädt Nachrichten für einen Lead."""
        try:
            result = self.db.table('lead_interactions')\
                .select('*')\
                .eq('lead_id', lead_id)\
                .order('created_at', desc=False)\
                .limit(10)\
                .execute()
            
            messages = []
            for interaction in (result.data or []):
                if interaction.get('type') == 'message':
                    messages.append({
                        'direction': 'inbound' if interaction.get('direction') == 'inbound' else 'outbound',
                        'content': interaction.get('content', ''),
                        'channel': interaction.get('channel'),
                    })
            return messages
        except Exception as e:
            logger.warning(f"Could not load lead messages: {e}")
            return []


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTION
# ═══════════════════════════════════════════════════════════════

async def get_chief_brain(db, user_id: str) -> ChiefBrain:
    """Factory function für ChiefBrain."""
    return ChiefBrain(db, user_id)

