"""
Sales Flow AI - Non Plus Ultra Auto-Outreach Service

Automatisierte, personalisierte Erstansprache:
- Template-basierte Nachrichten mit Variablen
- KI-generierte Personalisierung
- Optimales Timing
- Multi-Channel (Email, LinkedIn, WhatsApp)
- A/B Testing Support

Version 1.0
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

OUTREACH_CONFIG = {
    # Optimal Send Times (Stunde des Tages)
    "optimal_hours": {
        "email": [9, 10, 14, 15],  # Morgens und früher Nachmittag
        "linkedin_dm": [8, 9, 17, 18],  # Vor/Nach der Arbeit
        "whatsapp": [10, 11, 15, 16],  # Mittags
    },
    
    # Template Selection Thresholds
    "template_thresholds": {
        "hot_lead_min_score": 80,
        "warm_lead_min_score": 50,
        "cold_lead_min_score": 0,
    },
    
    # Rate Limits
    "rate_limits": {
        "email_per_day": 100,
        "linkedin_per_day": 50,
        "whatsapp_per_day": 200,
    },
    
    # Personalization Settings
    "personalization": {
        "use_first_name": True,
        "reference_company": True,
        "reference_industry": True,
        "reference_activity": True,
    }
}


# ============================================================================
# ENUMS
# ============================================================================

class OutreachChannel(str, Enum):
    """Outreach-Kanäle"""
    EMAIL = "email"
    LINKEDIN_DM = "linkedin_dm"
    WHATSAPP = "whatsapp"
    SMS = "sms"


class OutreachStatus(str, Enum):
    """Outreach-Status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class PersonalizationData:
    """Daten für Personalisierung"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    recent_activity: Optional[str] = None
    pain_point: Optional[str] = None
    competitor: Optional[str] = None
    mutual_connection: Optional[str] = None
    sender_name: Optional[str] = None
    sender_title: Optional[str] = None
    personalized_hook: Optional[str] = None
    personalized_observation: Optional[str] = None
    relevant_topic: Optional[str] = None
    content_link: Optional[str] = None
    report_link: Optional[str] = None
    trend_1: Optional[str] = None
    trend_2: Optional[str] = None
    trend_3: Optional[str] = None


@dataclass
class OutreachMessage:
    """Generierte Outreach-Nachricht"""
    lead_id: str
    template_id: Optional[str] = None
    channel: str = OutreachChannel.EMAIL.value
    subject: Optional[str] = None
    body: str = ""
    personalization_data: Dict[str, Any] = field(default_factory=dict)
    scheduled_at: Optional[datetime] = None
    optimal_send_time: bool = False


@dataclass
class OutreachResult:
    """Ergebnis einer Outreach-Aktion"""
    success: bool
    outreach_id: Optional[str] = None
    lead_id: str = ""
    channel: str = ""
    scheduled_at: Optional[datetime] = None
    error: Optional[str] = None


# ============================================================================
# AUTO-OUTREACH SERVICE
# ============================================================================

class AutoOutreachService:
    """
    Non Plus Ultra Auto-Outreach Service
    
    Erstellt und plant personalisierte Erstansprachen:
    1. Template-Auswahl basierend auf Lead-Score
    2. Personalisierung mit Lead-Daten
    3. Optimales Timing
    4. Multi-Channel Support
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.config = OUTREACH_CONFIG
    
    # ========================================================================
    # MAIN OUTREACH FLOW
    # ========================================================================
    
    async def create_outreach(
        self,
        lead_id: str,
        channel: OutreachChannel = OutreachChannel.EMAIL,
        template_id: Optional[str] = None,
        send_immediately: bool = False,
        custom_message: Optional[str] = None,
        sender_user_id: Optional[str] = None,
    ) -> OutreachResult:
        """
        Erstellt eine personalisierte Outreach-Nachricht.
        
        Args:
            lead_id: UUID des Leads
            channel: Kommunikationskanal
            template_id: Optional - Spezifisches Template
            send_immediately: Sofort senden oder planen
            custom_message: Optional - Eigene Nachricht statt Template
            sender_user_id: User ID des Absenders
            
        Returns:
            OutreachResult mit geplanter Nachricht
        """
        logger.info(f"Creating outreach for lead: {lead_id}, channel: {channel}")
        
        result = OutreachResult(success=False, lead_id=lead_id, channel=channel.value)
        
        try:
            # 1. Lead-Daten holen
            lead_data = await self._get_lead_data(lead_id)
            if not lead_data:
                result.error = "Lead not found"
                return result
            
            # 2. Personalisierungsdaten aufbereiten
            personalization = await self._prepare_personalization(lead_data, sender_user_id)
            
            # 3. Template auswählen (falls nicht vorgegeben)
            if custom_message:
                subject = None
                body = self._apply_personalization(custom_message, personalization)
            else:
                template = await self._select_template(lead_data, channel, template_id)
                if not template:
                    result.error = "No suitable template found"
                    return result
                
                subject = self._apply_personalization(
                    template.get("subject_template", ""), 
                    personalization
                )
                body = self._apply_personalization(
                    template.get("body_template", ""), 
                    personalization
                )
            
            # 4. Optimalen Zeitpunkt bestimmen
            if send_immediately:
                scheduled_at = datetime.utcnow()
                optimal_time = False
            else:
                scheduled_at = self._calculate_optimal_send_time(channel, lead_data)
                optimal_time = True
            
            # 5. In Queue speichern
            outreach_message = OutreachMessage(
                lead_id=lead_id,
                template_id=template_id if not custom_message else None,
                channel=channel.value,
                subject=subject,
                body=body,
                personalization_data=self._personalization_to_dict(personalization),
                scheduled_at=scheduled_at,
                optimal_send_time=optimal_time,
            )
            
            outreach_id = await self._save_to_queue(outreach_message, sender_user_id)
            
            result.success = True
            result.outreach_id = outreach_id
            result.scheduled_at = scheduled_at
            
            logger.info(f"Outreach created: {outreach_id}, scheduled for {scheduled_at}")
            
        except Exception as e:
            logger.exception(f"Outreach creation error: {e}")
            result.error = str(e)
        
        return result
    
    # ========================================================================
    # DATA PREPARATION
    # ========================================================================
    
    async def _get_lead_data(self, lead_id: str) -> Optional[Dict]:
        """Holt alle Lead-Daten für Personalisierung"""
        try:
            # Basis-Lead
            lead_result = self.db.table("leads").select("*").eq("id", lead_id).execute()
            if not lead_result.data:
                return None
            
            lead = lead_result.data[0]
            
            # Enrichment
            enrichment_result = (
                self.db.table("lead_enrichments")
                .select("*")
                .eq("lead_id", lead_id)
                .execute()
            )
            if enrichment_result.data:
                lead["enrichment"] = enrichment_result.data[0]
            
            # Intent
            intent_result = (
                self.db.table("lead_intents")
                .select("*")
                .eq("lead_id", lead_id)
                .execute()
            )
            if intent_result.data:
                lead["intent"] = intent_result.data[0]
            
            # Source
            source_result = (
                self.db.table("lead_sources")
                .select("*")
                .eq("lead_id", lead_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if source_result.data:
                lead["source"] = source_result.data[0]
            
            return lead
            
        except Exception as e:
            logger.exception(f"Error getting lead data: {e}")
            return None
    
    async def _prepare_personalization(
        self, 
        lead_data: Dict, 
        sender_user_id: Optional[str]
    ) -> PersonalizationData:
        """Bereitet Personalisierungsdaten auf"""
        p = PersonalizationData()
        
        # Name aufteilen
        full_name = lead_data.get("name", "")
        name_parts = full_name.split(" ", 1) if full_name else []
        
        p.first_name = name_parts[0] if name_parts else "there"
        p.last_name = name_parts[1] if len(name_parts) > 1 else ""
        p.full_name = full_name or "there"
        
        # Firma
        enrichment = lead_data.get("enrichment", {})
        p.company = enrichment.get("company_name") or lead_data.get("company", "Ihrem Unternehmen")
        p.title = enrichment.get("person_title") or lead_data.get("title", "")
        p.industry = enrichment.get("company_industry", "Ihrer Branche")
        p.company_size = enrichment.get("company_size_range", "")
        
        # Intent-basierte Personalisierung
        intent = lead_data.get("intent", {})
        
        # Recent Activity
        if intent.get("pricing_page_visits", 0) > 0:
            p.recent_activity = "Ihr Interesse an unseren Preisen"
            p.pain_point = "Kostenoptimierung"
        elif intent.get("demo_page_visits", 0) > 0:
            p.recent_activity = "Ihre Demo-Anfrage"
            p.pain_point = "Produktivitätssteigerung"
        elif intent.get("case_study_views", 0) > 0:
            p.recent_activity = "Ihr Interesse an unseren Erfolgsgeschichten"
            p.pain_point = "bewährte Lösungen"
        else:
            p.recent_activity = "Ihr Interesse an unserer Lösung"
            p.pain_point = "Vertriebsoptimierung"
        
        # Competitor
        if intent.get("competitor_mentioned"):
            p.competitor = intent.get("competitor_mentioned")
        
        # Personalisierte Hooks basierend auf Daten
        p.personalized_hook = self._generate_hook(lead_data, p)
        p.personalized_observation = self._generate_observation(lead_data, p)
        
        # Sender Info
        if sender_user_id:
            sender = await self._get_sender_info(sender_user_id)
            p.sender_name = sender.get("name", "Ihr SalesFlow Team")
            p.sender_title = sender.get("title", "")
        else:
            p.sender_name = "Ihr SalesFlow Team"
        
        # Content Links (Placeholder)
        p.relevant_topic = p.industry
        p.content_link = "https://salesflow.ai/resources"
        p.report_link = "https://salesflow.ai/report"
        
        # Trends basierend auf Branche
        industry_trends = self._get_industry_trends(p.industry)
        p.trend_1 = industry_trends[0] if len(industry_trends) > 0 else "KI-gestützte Automatisierung"
        p.trend_2 = industry_trends[1] if len(industry_trends) > 1 else "Personalisierung in Echtzeit"
        p.trend_3 = industry_trends[2] if len(industry_trends) > 2 else "Mobile-First Strategien"
        
        return p
    
    def _generate_hook(self, lead_data: Dict, p: PersonalizationData) -> str:
        """Generiert personalisierten Hook"""
        hooks = []
        
        enrichment = lead_data.get("enrichment", {})
        
        if enrichment.get("is_hiring"):
            hooks.append(f"Sie wachsen gerade (ich habe gesehen, dass {p.company} einstellt)")
        
        if enrichment.get("funding_last_round"):
            hooks.append(f"Gratulation zur {enrichment['funding_last_round']}-Runde")
        
        if p.industry and p.industry != "Ihrer Branche":
            hooks.append(f"Ihr Fokus auf {p.industry}")
        
        if p.title:
            hooks.append(f"Ihre Rolle als {p.title}")
        
        return hooks[0] if hooks else f"das Wachstum von {p.company}"
    
    def _generate_observation(self, lead_data: Dict, p: PersonalizationData) -> str:
        """Generiert personalisierte Beobachtung"""
        observations = [
            f"Ihr Engagement im Bereich {p.industry}",
            f"die Art wie {p.company} sich positioniert",
            f"Ihre Expertise in {p.industry}",
        ]
        
        if p.title:
            observations.insert(0, f"Ihren Weg zum {p.title}")
        
        return observations[0]
    
    def _get_industry_trends(self, industry: str) -> List[str]:
        """Holt relevante Trends für Branche"""
        trends_map = {
            "Network Marketing": [
                "Social Selling über WhatsApp",
                "Automatisierte Follow-up Sequenzen",
                "Community-basierte Leadgenerierung"
            ],
            "Insurance": [
                "Digitale Beratung und Abschluss",
                "KI-basierte Risikoanalyse",
                "Customer Self-Service Portale"
            ],
            "Real Estate": [
                "Virtuelle Besichtigungen",
                "KI-gestützte Preisbewertung",
                "Social Media Lead Generation"
            ],
            "Consulting": [
                "Thought Leadership Content",
                "LinkedIn als Hauptkanal",
                "Value-First Outreach Strategien"
            ],
            "SaaS": [
                "Product-Led Growth",
                "Self-Service Onboarding",
                "Usage-Based Pricing Modelle"
            ],
        }
        
        return trends_map.get(industry, [
            "KI-gestützte Automatisierung",
            "Personalisierung in Echtzeit",
            "Mobile-First Strategien"
        ])
    
    async def _get_sender_info(self, user_id: str) -> Dict:
        """Holt Absender-Informationen"""
        try:
            result = (
                self.db.table("sales_rep_profiles")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            
            if result.data:
                return result.data[0]
                
        except Exception as e:
            logger.warning(f"Could not get sender info: {e}")
        
        return {}
    
    # ========================================================================
    # TEMPLATE HANDLING
    # ========================================================================
    
    async def _select_template(
        self, 
        lead_data: Dict, 
        channel: OutreachChannel,
        template_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Wählt passendes Template basierend auf Lead-Daten"""
        try:
            if template_id:
                # Spezifisches Template
                result = (
                    self.db.table("outreach_templates")
                    .select("*")
                    .eq("id", template_id)
                    .eq("is_active", True)
                    .execute()
                )
                if result.data:
                    return result.data[0]
            
            # Template basierend auf Score und Channel
            p_score = lead_data.get("p_score", 50)
            
            query = (
                self.db.table("outreach_templates")
                .select("*")
                .eq("channel", channel.value)
                .eq("is_active", True)
            )
            
            # Score-basierte Filterung
            thresholds = self.config["template_thresholds"]
            if p_score >= thresholds["hot_lead_min_score"]:
                query = query.eq("target_intent_stage", "decision")
            elif p_score >= thresholds["warm_lead_min_score"]:
                query = query.eq("target_intent_stage", "consideration")
            else:
                query = query.eq("target_intent_stage", "awareness")
            
            result = query.order("avg_reply_rate", desc=True).limit(1).execute()
            
            if result.data:
                return result.data[0]
            
            # Fallback: Irgendeines für den Channel
            fallback = (
                self.db.table("outreach_templates")
                .select("*")
                .eq("channel", channel.value)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            return fallback.data[0] if fallback.data else None
            
        except Exception as e:
            logger.exception(f"Template selection error: {e}")
            return None
    
    def _apply_personalization(self, template: str, p: PersonalizationData) -> str:
        """Wendet Personalisierung auf Template an"""
        if not template:
            return ""
        
        # Variablen ersetzen
        replacements = {
            "{{first_name}}": p.first_name or "there",
            "{{last_name}}": p.last_name or "",
            "{{full_name}}": p.full_name or "there",
            "{{company}}": p.company or "Ihrem Unternehmen",
            "{{title}}": p.title or "",
            "{{industry}}": p.industry or "Ihrer Branche",
            "{{company_size}}": p.company_size or "",
            "{{recent_activity}}": p.recent_activity or "",
            "{{pain_point}}": p.pain_point or "",
            "{{competitor}}": p.competitor or "",
            "{{mutual_connection}}": p.mutual_connection or "",
            "{{sender_name}}": p.sender_name or "Ihr Team",
            "{{sender_title}}": p.sender_title or "",
            "{{personalized_hook}}": p.personalized_hook or "",
            "{{personalized_observation}}": p.personalized_observation or "",
            "{{relevant_topic}}": p.relevant_topic or "",
            "{{content_link}}": p.content_link or "",
            "{{report_link}}": p.report_link or "",
            "{{trend_1}}": p.trend_1 or "",
            "{{trend_2}}": p.trend_2 or "",
            "{{trend_3}}": p.trend_3 or "",
        }
        
        result = template
        for placeholder, value in replacements.items():
            result = result.replace(placeholder, value)
        
        # Leere Zeilen entfernen (von leeren Variablen)
        result = re.sub(r'\n\s*\n\s*\n', '\n\n', result)
        
        return result.strip()
    
    def _personalization_to_dict(self, p: PersonalizationData) -> Dict[str, Any]:
        """Konvertiert PersonalizationData zu Dict für DB"""
        return {
            "first_name": p.first_name,
            "company": p.company,
            "industry": p.industry,
            "pain_point": p.pain_point,
            "recent_activity": p.recent_activity,
        }
    
    # ========================================================================
    # TIMING OPTIMIZATION
    # ========================================================================
    
    def _calculate_optimal_send_time(
        self, 
        channel: OutreachChannel, 
        lead_data: Dict
    ) -> datetime:
        """Berechnet optimalen Versandzeitpunkt"""
        now = datetime.utcnow()
        
        # Basis: Nächster optimaler Slot
        optimal_hours = self.config["optimal_hours"].get(
            channel.value, 
            [9, 10, 14, 15]
        )
        
        # Lead-spezifische Optimierung
        intent = lead_data.get("intent", {})
        best_contact_time = intent.get("best_contact_time")
        
        if best_contact_time:
            # Lead-spezifische beste Zeit verwenden
            try:
                hour = int(best_contact_time.split(":")[0])
                optimal_hours = [hour]
            except:
                pass
        
        # Nächsten Slot finden
        current_hour = now.hour
        
        for hour in sorted(optimal_hours):
            if hour > current_hour:
                # Heute noch möglich
                return now.replace(hour=hour, minute=0, second=0, microsecond=0)
        
        # Morgen zum ersten Slot
        tomorrow = now + timedelta(days=1)
        return tomorrow.replace(
            hour=optimal_hours[0], 
            minute=0, 
            second=0, 
            microsecond=0
        )
    
    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================
    
    async def _save_to_queue(
        self, 
        message: OutreachMessage, 
        sender_user_id: Optional[str]
    ) -> str:
        """Speichert Nachricht in Queue"""
        data = {
            "lead_id": message.lead_id,
            "template_id": message.template_id,
            "assigned_to": sender_user_id,
            "channel": message.channel,
            "subject": message.subject,
            "body": message.body,
            "personalization_data": message.personalization_data,
            "scheduled_at": message.scheduled_at.isoformat() if message.scheduled_at else None,
            "optimal_send_time": message.optimal_send_time,
            "status": OutreachStatus.PENDING.value,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        result = self.db.table("outreach_queue").insert(data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to save outreach to queue")
    
    # ========================================================================
    # QUEUE PROCESSING
    # ========================================================================
    
    async def process_queue(self, limit: int = 50) -> Dict[str, Any]:
        """
        Verarbeitet anstehende Outreach-Nachrichten.
        
        Wird von Cron-Job aufgerufen.
        """
        logger.info("Processing outreach queue")
        
        stats = {
            "processed": 0,
            "sent": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            now = datetime.utcnow().isoformat()
            
            # Fällige Nachrichten holen
            result = (
                self.db.table("outreach_queue")
                .select("*")
                .eq("status", OutreachStatus.PENDING.value)
                .lte("scheduled_at", now)
                .order("scheduled_at")
                .limit(limit)
                .execute()
            )
            
            messages = result.data or []
            stats["processed"] = len(messages)
            
            for message in messages:
                try:
                    success = await self._send_outreach(message)
                    
                    if success:
                        stats["sent"] += 1
                        self.db.table("outreach_queue").update({
                            "status": OutreachStatus.SENT.value,
                            "sent_at": datetime.utcnow().isoformat(),
                        }).eq("id", message["id"]).execute()
                    else:
                        stats["failed"] += 1
                        self.db.table("outreach_queue").update({
                            "status": OutreachStatus.FAILED.value,
                            "error_message": "Send failed",
                        }).eq("id", message["id"]).execute()
                        
                except Exception as e:
                    stats["failed"] += 1
                    stats["errors"].append({
                        "outreach_id": message["id"],
                        "error": str(e)
                    })
            
            logger.info(f"Queue processing complete: {stats['sent']}/{stats['processed']} sent")
            
        except Exception as e:
            logger.exception(f"Queue processing error: {e}")
            stats["errors"].append({"error": str(e)})
        
        return stats
    
    async def _send_outreach(self, message: Dict) -> bool:
        """
        Sendet eine Outreach-Nachricht.
        
        In Production: Integration mit Email-Service, LinkedIn API, etc.
        """
        channel = message.get("channel")
        
        if channel == OutreachChannel.EMAIL.value:
            return await self._send_email(message)
        elif channel == OutreachChannel.LINKEDIN_DM.value:
            return await self._send_linkedin_dm(message)
        elif channel == OutreachChannel.WHATSAPP.value:
            return await self._send_whatsapp(message)
        
        return False
    
    async def _send_email(self, message: Dict) -> bool:
        """
        Sendet E-Mail.
        
        In Production: Integration mit SendGrid, Mailgun, etc.
        """
        logger.info(f"Sending email for outreach: {message['id']}")
        
        # Placeholder - In Production echte Email-API nutzen
        # Beispiel mit SendGrid:
        # sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_KEY)
        # mail = Mail(from_email, subject, to_email, content)
        # response = sg.client.mail.send.post(request_body=mail.get())
        
        return True  # Placeholder
    
    async def _send_linkedin_dm(self, message: Dict) -> bool:
        """
        Sendet LinkedIn DM.
        
        In Production: LinkedIn API oder Automation Tool.
        """
        logger.info(f"Sending LinkedIn DM for outreach: {message['id']}")
        
        # Placeholder - LinkedIn hat keine offizielle Messaging API
        # Muss über Sales Navigator API oder externe Tools gelöst werden
        
        return True  # Placeholder
    
    async def _send_whatsapp(self, message: Dict) -> bool:
        """
        Sendet WhatsApp Nachricht.
        
        In Production: WhatsApp Business API.
        """
        logger.info(f"Sending WhatsApp for outreach: {message['id']}")
        
        # Placeholder - WhatsApp Business API nutzen
        
        return True  # Placeholder
    
    # ========================================================================
    # TRACKING
    # ========================================================================
    
    async def record_open(self, outreach_id: str) -> None:
        """Zeichnet Email-Öffnung auf"""
        try:
            self.db.table("outreach_queue").update({
                "status": OutreachStatus.OPENED.value,
                "opened_at": datetime.utcnow().isoformat(),
            }).eq("id", outreach_id).execute()
        except Exception as e:
            logger.warning(f"Could not record open: {e}")
    
    async def record_click(self, outreach_id: str) -> None:
        """Zeichnet Link-Klick auf"""
        try:
            self.db.table("outreach_queue").update({
                "status": OutreachStatus.CLICKED.value,
                "clicked_at": datetime.utcnow().isoformat(),
            }).eq("id", outreach_id).execute()
        except Exception as e:
            logger.warning(f"Could not record click: {e}")
    
    async def record_reply(self, outreach_id: str) -> None:
        """Zeichnet Antwort auf"""
        try:
            self.db.table("outreach_queue").update({
                "status": OutreachStatus.REPLIED.value,
                "replied_at": datetime.utcnow().isoformat(),
            }).eq("id", outreach_id).execute()
            
            # Template Performance aktualisieren
            outreach = (
                self.db.table("outreach_queue")
                .select("template_id")
                .eq("id", outreach_id)
                .execute()
            )
            
            if outreach.data and outreach.data[0].get("template_id"):
                await self._update_template_stats(outreach.data[0]["template_id"])
                
        except Exception as e:
            logger.warning(f"Could not record reply: {e}")
    
    async def _update_template_stats(self, template_id: str) -> None:
        """Aktualisiert Template-Statistiken"""
        try:
            # Alle Outreach für dieses Template
            result = (
                self.db.table("outreach_queue")
                .select("status")
                .eq("template_id", template_id)
                .in_("status", [
                    OutreachStatus.SENT.value,
                    OutreachStatus.OPENED.value,
                    OutreachStatus.CLICKED.value,
                    OutreachStatus.REPLIED.value,
                ])
                .execute()
            )
            
            data = result.data or []
            total = len(data)
            
            if total > 0:
                opens = sum(1 for d in data if d["status"] in ["opened", "clicked", "replied"])
                replies = sum(1 for d in data if d["status"] == "replied")
                
                self.db.table("outreach_templates").update({
                    "times_used": total,
                    "avg_open_rate": opens / total,
                    "avg_reply_rate": replies / total,
                }).eq("id", template_id).execute()
                
        except Exception as e:
            logger.warning(f"Could not update template stats: {e}")
    
    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================
    
    async def create_outreach_for_new_leads(
        self,
        days_back: int = 1,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """
        Erstellt Outreach für neue Leads ohne Erstansprache.
        
        Wird von Cron-Job aufgerufen.
        """
        logger.info("Creating outreach for new leads")
        
        stats = {
            "leads_found": 0,
            "outreach_created": 0,
            "errors": []
        }
        
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
            
            # Neue Leads ohne Outreach
            leads_result = (
                self.db.table("leads")
                .select("id, p_score, platform")
                .gte("created_at", cutoff)
                .order("p_score", desc=True)
                .limit(limit)
                .execute()
            )
            
            leads = leads_result.data or []
            stats["leads_found"] = len(leads)
            
            for lead in leads:
                # Prüfen ob schon Outreach existiert
                existing = (
                    self.db.table("outreach_queue")
                    .select("id")
                    .eq("lead_id", lead["id"])
                    .execute()
                )
                
                if existing.data:
                    continue
                
                # Channel basierend auf Platform
                platform = lead.get("platform", "Email").lower()
                if "whatsapp" in platform:
                    channel = OutreachChannel.WHATSAPP
                elif "linkedin" in platform:
                    channel = OutreachChannel.LINKEDIN_DM
                else:
                    channel = OutreachChannel.EMAIL
                
                result = await self.create_outreach(
                    lead_id=lead["id"],
                    channel=channel,
                )
                
                if result.success:
                    stats["outreach_created"] += 1
                else:
                    stats["errors"].append({
                        "lead_id": lead["id"],
                        "error": result.error
                    })
            
            logger.info(f"Batch outreach complete: {stats['outreach_created']} created")
            
        except Exception as e:
            logger.exception(f"Batch outreach error: {e}")
            stats["errors"].append({"error": str(e)})
        
        return stats


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_auto_outreach_service(db: Client) -> AutoOutreachService:
    """Factory für AutoOutreachService"""
    return AutoOutreachService(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "AutoOutreachService",
    "create_auto_outreach_service",
    "OutreachMessage",
    "OutreachResult",
    "PersonalizationData",
    "OutreachChannel",
    "OutreachStatus",
    "OUTREACH_CONFIG",
]

