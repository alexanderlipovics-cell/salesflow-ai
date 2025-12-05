"""
Sales Flow AI - Non Plus Ultra Intent Engine (I-Score)

Kaufabsichts-Erkennung und Verhaltenstracking:
- Web-Aktivität (Seitenbesuche, Verweildauer)
- Content-Engagement (Downloads, Webinare)
- Social Engagement (Likes, Kommentare, Shares)
- Direkte Intent-Signale (Demo-Anfragen, Preisfragen)
- RFM-Analyse (Recency, Frequency, Depth)

Version 1.0
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION & ENUMS
# ============================================================================

class IntentStage(str, Enum):
    """Kaufphasen"""
    AWARENESS = "awareness"       # Kennt Problem, sucht Infos
    CONSIDERATION = "consideration"  # Evaluiert Lösungen
    DECISION = "decision"         # Vergleicht Anbieter
    PURCHASE = "purchase"         # Kurz vor Kauf


class BuyingRole(str, Enum):
    """Rollen im Kaufprozess"""
    CHAMPION = "champion"         # Interner Befürworter
    DECISION_MAKER = "decision_maker"  # Entscheider
    INFLUENCER = "influencer"     # Beeinflusst Entscheidung
    USER = "user"                 # Endnutzer
    BLOCKER = "blocker"           # Verhindert Kauf
    UNKNOWN = "unknown"


# Intent Configuration
INTENT_CONFIG = {
    # High-Intent Seiten und ihre Scores
    "high_intent_pages": {
        "/pricing": {"score": 25, "category": "pricing"},
        "/preise": {"score": 25, "category": "pricing"},
        "/demo": {"score": 30, "category": "demo"},
        "/free-trial": {"score": 28, "category": "trial"},
        "/case-study": {"score": 15, "category": "case_study"},
        "/case-studies": {"score": 15, "category": "case_study"},
        "/testimonials": {"score": 12, "category": "social_proof"},
        "/contact": {"score": 20, "category": "contact"},
        "/kontakt": {"score": 20, "category": "contact"},
        "/get-started": {"score": 25, "category": "conversion"},
        "/sign-up": {"score": 28, "category": "conversion"},
        "/compare": {"score": 18, "category": "comparison"},
        "/vs-": {"score": 18, "category": "comparison"},
        "/features": {"score": 10, "category": "product"},
        "/funktionen": {"score": 10, "category": "product"},
    },
    
    # Intent Keywords in Nachrichten/Kommentaren
    "intent_keywords": {
        "strong_buy": [
            "preis", "kosten", "price", "cost", "how much", "wie viel",
            "kaufen", "buy", "bestellen", "order", "abonnement", "subscription",
            "vertrag", "contract", "lizenz", "license"
        ],
        "demo_interest": [
            "demo", "vorführung", "präsentation", "presentation", "zeigen", "show",
            "ausprobieren", "try", "testen", "test", "free trial"
        ],
        "comparison": [
            "vergleich", "compare", "alternative", "besser als", "better than",
            "unterschied", "difference", "vs", "versus"
        ],
        "timeline": [
            "wann", "when", "wie schnell", "how fast", "sofort", "immediately",
            "dringend", "urgent", "diese woche", "this week", "heute", "today"
        ],
        "budget": [
            "budget", "etat", "geld", "money", "investition", "investment",
            "erschwinglich", "affordable", "rabatt", "discount"
        ],
    },
    
    # Score-Gewichtungen
    "weights": {
        "web_activity": 0.30,
        "content_engagement": 0.25,
        "direct_signals": 0.30,
        "recency": 0.15,
    },
    
    # Zeitfenster
    "recency_decay": {
        "1_day": 1.0,
        "3_days": 0.9,
        "7_days": 0.7,
        "14_days": 0.5,
        "30_days": 0.3,
    },
    
    # Thresholds für Stage-Klassifizierung
    "stage_thresholds": {
        "purchase": 80,
        "decision": 60,
        "consideration": 40,
        "awareness": 0,
    }
}


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class WebActivityData:
    """Web-Aktivitätsdaten"""
    visits_30d: int = 0
    visits_7d: int = 0
    total_page_views: int = 0
    unique_pages: int = 0
    avg_time_on_site_seconds: int = 0
    bounce_rate: float = 0.0
    high_intent_pages: List[Dict] = field(default_factory=list)
    pricing_page_visits: int = 0
    demo_page_visits: int = 0
    case_study_views: int = 0


@dataclass
class ContentEngagementData:
    """Content-Engagement-Daten"""
    content_downloads: int = 0
    webinar_registrations: int = 0
    email_opens_30d: int = 0
    email_clicks_30d: int = 0
    form_submissions: int = 0


@dataclass
class SocialEngagementData:
    """Social-Media-Engagement-Daten"""
    likes: int = 0
    comments: int = 0
    shares: int = 0
    engagement_score: float = 0.0


@dataclass
class DirectSignalsData:
    """Direkte Kaufsignale"""
    requested_demo: bool = False
    requested_quote: bool = False
    asked_about_pricing: bool = False
    mentioned_competitor: bool = False
    competitor_mentioned: Optional[str] = None
    mentioned_budget: bool = False
    mentioned_timeline: bool = False
    intent_keywords_found: List[Dict] = field(default_factory=list)


@dataclass
class RFMScores:
    """Recency, Frequency, Depth Scores"""
    recency_score: float = 0.0  # Wie kürzlich aktiv
    frequency_score: float = 0.0  # Wie oft aktiv
    depth_score: float = 0.0  # Wie tief engaged


@dataclass
class IntentResult:
    """Gesamtergebnis der Intent-Analyse"""
    lead_id: str
    i_score: float = 0.0
    web_activity: WebActivityData = field(default_factory=WebActivityData)
    content_engagement: ContentEngagementData = field(default_factory=ContentEngagementData)
    social_engagement: SocialEngagementData = field(default_factory=SocialEngagementData)
    direct_signals: DirectSignalsData = field(default_factory=DirectSignalsData)
    rfm_scores: RFMScores = field(default_factory=RFMScores)
    intent_stage: str = IntentStage.AWARENESS.value
    buying_role: str = BuyingRole.UNKNOWN.value
    last_activity_at: Optional[datetime] = None
    days_since_last_activity: Optional[int] = None
    activity_frequency: str = "sporadic"
    best_contact_time: Optional[str] = None
    analyzed_at: datetime = field(default_factory=datetime.utcnow)


# ============================================================================
# INTENT ENGINE
# ============================================================================

class IntentEngine:
    """
    Non Plus Ultra Intent Engine
    
    Analysiert Kaufabsicht basierend auf:
    1. Web-Aktivität
    2. Content-Engagement
    3. Social Engagement
    4. Direkte Signale
    5. RFM-Analyse
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.config = INTENT_CONFIG
    
    # ========================================================================
    # MAIN INTENT ANALYSIS
    # ========================================================================
    
    async def analyze_lead_intent(
        self,
        lead_id: str,
        messages: Optional[List[Dict]] = None,
    ) -> IntentResult:
        """
        Analysiert die Kaufabsicht eines Leads.
        
        Args:
            lead_id: UUID des Leads
            messages: Optional - Liste von Nachrichten für Keyword-Analyse
            
        Returns:
            IntentResult mit vollständiger Intent-Analyse
        """
        logger.info(f"Analyzing intent for lead: {lead_id}")
        
        result = IntentResult(lead_id=lead_id)
        
        try:
            # 1. Web-Aktivität analysieren
            result.web_activity = await self._analyze_web_activity(lead_id)
            
            # 2. Content-Engagement analysieren
            result.content_engagement = await self._analyze_content_engagement(lead_id)
            
            # 3. Social Engagement analysieren
            result.social_engagement = await self._analyze_social_engagement(lead_id)
            
            # 4. Direkte Signale analysieren
            result.direct_signals = await self._analyze_direct_signals(lead_id, messages)
            
            # 5. RFM Scores berechnen
            result.rfm_scores = self._calculate_rfm_scores(result)
            
            # 6. Aktivitäts-Metadaten
            result.last_activity_at, result.days_since_last_activity = await self._get_last_activity(lead_id)
            result.activity_frequency = self._determine_activity_frequency(result)
            result.best_contact_time = await self._determine_best_contact_time(lead_id)
            
            # 7. I-Score berechnen
            result.i_score = self._calculate_i_score(result)
            
            # 8. Intent Stage und Buying Role bestimmen
            result.intent_stage = self._determine_intent_stage(result)
            result.buying_role = self._determine_buying_role(result)
            
            # 9. In DB speichern
            await self._save_intent_result(result)
            
            logger.info(f"Intent analysis complete: lead={lead_id}, i_score={result.i_score:.2f}, stage={result.intent_stage}")
            
        except Exception as e:
            logger.exception(f"Intent analysis error for lead {lead_id}: {e}")
        
        return result
    
    # ========================================================================
    # WEB ACTIVITY ANALYSIS
    # ========================================================================
    
    async def _analyze_web_activity(self, lead_id: str) -> WebActivityData:
        """Analysiert Web-Aktivität des Leads"""
        data = WebActivityData()
        
        try:
            # Tracking Events aus DB holen
            cutoff_30d = (datetime.utcnow() - timedelta(days=30)).isoformat()
            cutoff_7d = (datetime.utcnow() - timedelta(days=7)).isoformat()
            
            # Page Views der letzten 30 Tage
            events_result = (
                self.db.table("web_tracking_events")
                .select("*")
                .eq("lead_id", lead_id)
                .eq("event_type", "page_view")
                .gte("created_at", cutoff_30d)
                .execute()
            )
            
            events = events_result.data or []
            
            if events:
                data.visits_30d = len(set(e.get("session_id") for e in events if e.get("session_id")))
                data.visits_7d = len(set(
                    e.get("session_id") for e in events 
                    if e.get("session_id") and e.get("created_at", "") >= cutoff_7d
                ))
                data.total_page_views = len(events)
                data.unique_pages = len(set(e.get("event_url") for e in events))
                
                # Durchschnittliche Zeit auf Seite
                times = [e.get("time_on_page_seconds", 0) for e in events if e.get("time_on_page_seconds")]
                data.avg_time_on_site_seconds = int(sum(times) / len(times)) if times else 0
                
                # High-Intent Pages analysieren
                page_visits = {}
                for event in events:
                    url = event.get("event_url", "").lower()
                    for page_pattern, page_config in self.config["high_intent_pages"].items():
                        if page_pattern in url:
                            if page_pattern not in page_visits:
                                page_visits[page_pattern] = {
                                    "page": page_pattern,
                                    "visits": 0,
                                    "time_spent": 0,
                                    "category": page_config["category"]
                                }
                            page_visits[page_pattern]["visits"] += 1
                            page_visits[page_pattern]["time_spent"] += event.get("time_on_page_seconds", 0)
                
                data.high_intent_pages = list(page_visits.values())
                
                # Spezifische Seiten zählen
                data.pricing_page_visits = sum(
                    1 for e in events 
                    if any(p in e.get("event_url", "").lower() for p in ["/pricing", "/preise"])
                )
                data.demo_page_visits = sum(
                    1 for e in events 
                    if "/demo" in e.get("event_url", "").lower()
                )
                data.case_study_views = sum(
                    1 for e in events 
                    if "case-stud" in e.get("event_url", "").lower()
                )
                
                # Bounce Rate (vereinfacht: Sessions mit nur 1 Pageview)
                sessions = {}
                for e in events:
                    sid = e.get("session_id")
                    if sid:
                        sessions[sid] = sessions.get(sid, 0) + 1
                
                if sessions:
                    bounces = sum(1 for count in sessions.values() if count == 1)
                    data.bounce_rate = bounces / len(sessions)
        
        except Exception as e:
            logger.exception(f"Web activity analysis error: {e}")
        
        return data
    
    # ========================================================================
    # CONTENT ENGAGEMENT ANALYSIS
    # ========================================================================
    
    async def _analyze_content_engagement(self, lead_id: str) -> ContentEngagementData:
        """Analysiert Content-Engagement des Leads"""
        data = ContentEngagementData()
        
        try:
            cutoff_30d = (datetime.utcnow() - timedelta(days=30)).isoformat()
            
            # Downloads
            downloads_result = (
                self.db.table("web_tracking_events")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("event_type", "download")
                .gte("created_at", cutoff_30d)
                .execute()
            )
            data.content_downloads = len(downloads_result.data or [])
            
            # Form Submissions
            forms_result = (
                self.db.table("web_tracking_events")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("event_type", "form_submit")
                .gte("created_at", cutoff_30d)
                .execute()
            )
            data.form_submissions = len(forms_result.data or [])
            
            # Email Opens/Clicks würden von Email-Service kommen
            # Hier Placeholder - in Production Integration mit Mailgun, SendGrid etc.
            
        except Exception as e:
            logger.exception(f"Content engagement analysis error: {e}")
        
        return data
    
    # ========================================================================
    # SOCIAL ENGAGEMENT ANALYSIS
    # ========================================================================
    
    async def _analyze_social_engagement(self, lead_id: str) -> SocialEngagementData:
        """Analysiert Social Media Engagement des Leads"""
        data = SocialEngagementData()
        
        try:
            # Social Engagement Events
            events_result = (
                self.db.table("social_engagement_events")
                .select("*")
                .eq("lead_id", lead_id)
                .execute()
            )
            
            events = events_result.data or []
            
            for event in events:
                engagement_type = event.get("engagement_type", "")
                if engagement_type == "like":
                    data.likes += 1
                elif engagement_type == "comment":
                    data.comments += 1
                elif engagement_type == "share":
                    data.shares += 1
            
            # Engagement Score berechnen
            # Likes = 1 Punkt, Comments = 3 Punkte, Shares = 5 Punkte
            data.engagement_score = min(100, (data.likes * 1 + data.comments * 3 + data.shares * 5))
            
        except Exception as e:
            logger.exception(f"Social engagement analysis error: {e}")
        
        return data
    
    # ========================================================================
    # DIRECT SIGNALS ANALYSIS
    # ========================================================================
    
    async def _analyze_direct_signals(
        self, 
        lead_id: str, 
        messages: Optional[List[Dict]] = None
    ) -> DirectSignalsData:
        """Analysiert direkte Kaufsignale"""
        data = DirectSignalsData()
        
        try:
            # Message Events holen falls nicht übergeben
            if messages is None:
                msg_result = (
                    self.db.table("message_events")
                    .select("content, direction")
                    .eq("lead_id", lead_id)
                    .eq("direction", "inbound")
                    .execute()
                )
                messages = msg_result.data or []
            
            # Alle Nachrichten-Texte sammeln
            all_text = " ".join(
                str(m.get("content", "") or m.get("message", ""))
                for m in messages
            ).lower()
            
            # Keyword-Analyse
            keywords_found = []
            
            for category, keywords in self.config["intent_keywords"].items():
                for keyword in keywords:
                    if keyword.lower() in all_text:
                        keywords_found.append({
                            "keyword": keyword,
                            "category": category,
                            "count": all_text.count(keyword.lower())
                        })
                        
                        # Flags setzen
                        if category == "strong_buy":
                            data.asked_about_pricing = True
                        elif category == "demo_interest":
                            data.requested_demo = True
                        elif category == "timeline":
                            data.mentioned_timeline = True
                        elif category == "budget":
                            data.mentioned_budget = True
            
            data.intent_keywords_found = keywords_found
            
            # Social Engagement Kommentare mit Intent analysieren
            intent_comments = (
                self.db.table("social_engagement_events")
                .select("comment_text, contains_price_inquiry, contains_interest_signal")
                .eq("lead_id", lead_id)
                .eq("engagement_type", "comment")
                .execute()
            )
            
            for comment in (intent_comments.data or []):
                if comment.get("contains_price_inquiry"):
                    data.asked_about_pricing = True
                if comment.get("contains_interest_signal"):
                    data.requested_demo = True  # General interest
            
            # Demo-Anfrage explizit prüfen
            demo_forms = (
                self.db.table("web_tracking_events")
                .select("id")
                .eq("lead_id", lead_id)
                .eq("event_type", "form_submit")
                .ilike("event_url", "%demo%")
                .execute()
            )
            if demo_forms.data:
                data.requested_demo = True
            
        except Exception as e:
            logger.exception(f"Direct signals analysis error: {e}")
        
        return data
    
    # ========================================================================
    # RFM ANALYSIS
    # ========================================================================
    
    def _calculate_rfm_scores(self, result: IntentResult) -> RFMScores:
        """Berechnet RFM-Scores (Recency, Frequency, Depth)"""
        rfm = RFMScores()
        
        # Recency Score (0-100)
        # Basiert auf letzter Aktivität
        if result.days_since_last_activity is not None:
            if result.days_since_last_activity <= 1:
                rfm.recency_score = 100
            elif result.days_since_last_activity <= 3:
                rfm.recency_score = 90
            elif result.days_since_last_activity <= 7:
                rfm.recency_score = 70
            elif result.days_since_last_activity <= 14:
                rfm.recency_score = 50
            elif result.days_since_last_activity <= 30:
                rfm.recency_score = 30
            else:
                rfm.recency_score = 10
        
        # Frequency Score (0-100)
        # Basiert auf Besuchen in 30 Tagen
        visits = result.web_activity.visits_30d
        if visits >= 10:
            rfm.frequency_score = 100
        elif visits >= 7:
            rfm.frequency_score = 80
        elif visits >= 4:
            rfm.frequency_score = 60
        elif visits >= 2:
            rfm.frequency_score = 40
        elif visits >= 1:
            rfm.frequency_score = 20
        else:
            rfm.frequency_score = 0
        
        # Depth Score (0-100)
        # Basiert auf Engagement-Tiefe
        depth_factors = [
            result.web_activity.pricing_page_visits > 0,
            result.web_activity.demo_page_visits > 0,
            result.web_activity.case_study_views > 0,
            result.content_engagement.content_downloads > 0,
            result.content_engagement.form_submissions > 0,
            result.social_engagement.comments > 0,
            result.direct_signals.asked_about_pricing,
            result.direct_signals.requested_demo,
        ]
        rfm.depth_score = (sum(depth_factors) / len(depth_factors)) * 100
        
        return rfm
    
    # ========================================================================
    # ACTIVITY METADATA
    # ========================================================================
    
    async def _get_last_activity(self, lead_id: str) -> Tuple[Optional[datetime], Optional[int]]:
        """Holt Zeitpunkt der letzten Aktivität"""
        try:
            # Web Events
            web_result = (
                self.db.table("web_tracking_events")
                .select("created_at")
                .eq("lead_id", lead_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            
            # Message Events
            msg_result = (
                self.db.table("message_events")
                .select("created_at")
                .eq("lead_id", lead_id)
                .eq("direction", "inbound")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            
            # Social Events
            social_result = (
                self.db.table("social_engagement_events")
                .select("created_at")
                .eq("lead_id", lead_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            
            # Neueste Aktivität finden
            timestamps = []
            for result in [web_result, msg_result, social_result]:
                if result.data:
                    ts_str = result.data[0].get("created_at")
                    if ts_str:
                        try:
                            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                            timestamps.append(ts)
                        except:
                            pass
            
            if timestamps:
                last_activity = max(timestamps)
                days_since = (datetime.utcnow().replace(tzinfo=last_activity.tzinfo) - last_activity).days
                return last_activity, days_since
            
        except Exception as e:
            logger.exception(f"Get last activity error: {e}")
        
        return None, None
    
    def _determine_activity_frequency(self, result: IntentResult) -> str:
        """Bestimmt Aktivitätsfrequenz"""
        visits = result.web_activity.visits_30d
        
        if visits >= 15:
            return "daily"
        elif visits >= 8:
            return "weekly"
        elif visits >= 2:
            return "monthly"
        else:
            return "sporadic"
    
    async def _determine_best_contact_time(self, lead_id: str) -> Optional[str]:
        """Bestimmt beste Kontaktzeit basierend auf Aktivitätspattern"""
        try:
            events_result = (
                self.db.table("web_tracking_events")
                .select("created_at")
                .eq("lead_id", lead_id)
                .limit(100)
                .execute()
            )
            
            events = events_result.data or []
            if not events:
                return None
            
            # Stunden zählen
            hours = {}
            for event in events:
                ts_str = event.get("created_at")
                if ts_str:
                    try:
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        hour = ts.hour
                        hours[hour] = hours.get(hour, 0) + 1
                    except:
                        pass
            
            if hours:
                best_hour = max(hours, key=hours.get)
                return f"{best_hour:02d}:00-{(best_hour+1)%24:02d}:00"
            
        except Exception as e:
            logger.exception(f"Best contact time error: {e}")
        
        return None
    
    # ========================================================================
    # SCORE CALCULATION
    # ========================================================================
    
    def _calculate_i_score(self, result: IntentResult) -> float:
        """Berechnet gewichteten I-Score"""
        weights = self.config["weights"]
        
        # Web Activity Score (0-100)
        web_score = self._calculate_web_score(result.web_activity)
        
        # Content Engagement Score (0-100)
        content_score = self._calculate_content_score(result.content_engagement)
        
        # Direct Signals Score (0-100)
        direct_score = self._calculate_direct_score(result.direct_signals)
        
        # Recency Score (bereits 0-100)
        recency_score = result.rfm_scores.recency_score
        
        # Gewichtete Summe
        i_score = (
            web_score * weights["web_activity"] +
            content_score * weights["content_engagement"] +
            direct_score * weights["direct_signals"] +
            recency_score * weights["recency"]
        )
        
        return round(min(100, max(0, i_score)), 2)
    
    def _calculate_web_score(self, web: WebActivityData) -> float:
        """Berechnet Web-Activity Score"""
        score = 0.0
        
        # Besuche
        score += min(20, web.visits_7d * 4)
        
        # High-Intent Pages
        for page in web.high_intent_pages:
            page_pattern = page.get("page", "")
            if page_pattern in self.config["high_intent_pages"]:
                visits = page.get("visits", 0)
                page_score = self.config["high_intent_pages"][page_pattern]["score"]
                score += min(page_score, visits * page_score * 0.5)
        
        # Zeit auf Site
        if web.avg_time_on_site_seconds > 180:  # > 3 min
            score += 10
        elif web.avg_time_on_site_seconds > 60:  # > 1 min
            score += 5
        
        return min(100, score)
    
    def _calculate_content_score(self, content: ContentEngagementData) -> float:
        """Berechnet Content-Engagement Score"""
        score = 0.0
        
        score += content.content_downloads * 15
        score += content.webinar_registrations * 25
        score += content.email_clicks_30d * 3
        score += content.form_submissions * 20
        
        return min(100, score)
    
    def _calculate_direct_score(self, direct: DirectSignalsData) -> float:
        """Berechnet Direct-Signals Score"""
        score = 0.0
        
        if direct.requested_demo:
            score += 35
        if direct.requested_quote:
            score += 30
        if direct.asked_about_pricing:
            score += 25
        if direct.mentioned_timeline:
            score += 15
        if direct.mentioned_budget:
            score += 10
        if direct.mentioned_competitor:
            score += 20
        
        return min(100, score)
    
    # ========================================================================
    # STAGE & ROLE CLASSIFICATION
    # ========================================================================
    
    def _determine_intent_stage(self, result: IntentResult) -> str:
        """Bestimmt die Kaufphase"""
        i_score = result.i_score
        thresholds = self.config["stage_thresholds"]
        
        # Zusätzliche Signale für genauere Klassifizierung
        direct = result.direct_signals
        
        if i_score >= thresholds["purchase"] or (direct.requested_demo and direct.asked_about_pricing):
            return IntentStage.PURCHASE.value
        elif i_score >= thresholds["decision"] or direct.asked_about_pricing:
            return IntentStage.DECISION.value
        elif i_score >= thresholds["consideration"] or result.web_activity.case_study_views > 0:
            return IntentStage.CONSIDERATION.value
        else:
            return IntentStage.AWARENESS.value
    
    def _determine_buying_role(self, result: IntentResult) -> str:
        """Bestimmt die Rolle im Kaufprozess"""
        # Basierend auf Engagement-Patterns
        
        direct = result.direct_signals
        rfm = result.rfm_scores
        
        # Champion: Hohes Engagement, teilt Content
        if result.social_engagement.shares > 0 and rfm.depth_score > 60:
            return BuyingRole.CHAMPION.value
        
        # Decision Maker: Preisfragen, Demo-Anfragen
        if direct.asked_about_pricing and direct.mentioned_budget:
            return BuyingRole.DECISION_MAKER.value
        
        # Influencer: Hohes Engagement aber keine Budget-Fragen
        if rfm.depth_score > 50 and not direct.mentioned_budget:
            return BuyingRole.INFLUENCER.value
        
        # User: Nutzt Produkt-Seiten, wenig anderes
        if result.web_activity.total_page_views > 5 and result.direct_signals.requested_demo:
            return BuyingRole.USER.value
        
        return BuyingRole.UNKNOWN.value
    
    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================
    
    async def _save_intent_result(self, result: IntentResult) -> None:
        """Speichert Intent-Ergebnis in DB"""
        try:
            data = {
                "lead_id": result.lead_id,
                "i_score": result.i_score,
                "i_score_updated_at": datetime.utcnow().isoformat(),
                
                # Web Activity
                "website_visits_30d": result.web_activity.visits_30d,
                "website_visits_7d": result.web_activity.visits_7d,
                "total_page_views": result.web_activity.total_page_views,
                "unique_pages_viewed": result.web_activity.unique_pages,
                "avg_time_on_site_seconds": result.web_activity.avg_time_on_site_seconds,
                "bounce_rate": result.web_activity.bounce_rate,
                "high_intent_pages": result.web_activity.high_intent_pages,
                "pricing_page_visits": result.web_activity.pricing_page_visits,
                "demo_page_visits": result.web_activity.demo_page_visits,
                "case_study_views": result.web_activity.case_study_views,
                
                # Content Engagement
                "content_downloads": result.content_engagement.content_downloads,
                "webinar_registrations": result.content_engagement.webinar_registrations,
                "email_opens_30d": result.content_engagement.email_opens_30d,
                "email_clicks_30d": result.content_engagement.email_clicks_30d,
                "form_submissions": result.content_engagement.form_submissions,
                
                # Social Engagement
                "social_likes": result.social_engagement.likes,
                "social_comments": result.social_engagement.comments,
                "social_shares": result.social_engagement.shares,
                "content_engagement_score": result.social_engagement.engagement_score,
                
                # Direct Signals
                "requested_demo": result.direct_signals.requested_demo,
                "requested_quote": result.direct_signals.requested_quote,
                "asked_about_pricing": result.direct_signals.asked_about_pricing,
                "mentioned_competitor": result.direct_signals.mentioned_competitor,
                "competitor_mentioned": result.direct_signals.competitor_mentioned,
                "mentioned_budget": result.direct_signals.mentioned_budget,
                "mentioned_timeline": result.direct_signals.mentioned_timeline,
                "intent_keywords": result.direct_signals.intent_keywords_found,
                
                # RFM
                "recency_score": result.rfm_scores.recency_score,
                "frequency_score": result.rfm_scores.frequency_score,
                "depth_score": result.rfm_scores.depth_score,
                
                # Classification
                "intent_stage": result.intent_stage,
                "buying_committee_role": result.buying_role,
                
                # Meta
                "last_activity_at": result.last_activity_at.isoformat() if result.last_activity_at else None,
                "days_since_last_activity": result.days_since_last_activity,
                "activity_frequency": result.activity_frequency,
                "best_contact_time": result.best_contact_time,
            }
            
            # Upsert
            existing = self.db.table("lead_intents").select("id").eq("lead_id", result.lead_id).execute()
            
            if existing.data:
                self.db.table("lead_intents").update(data).eq("lead_id", result.lead_id).execute()
            else:
                self.db.table("lead_intents").insert(data).execute()
                
            logger.info(f"Saved intent result for lead: {result.lead_id}")
            
        except Exception as e:
            logger.exception(f"Error saving intent result: {e}")
    
    # ========================================================================
    # MESSAGE INTENT ANALYSIS (für Live-Nachrichten)
    # ========================================================================
    
    def analyze_message_intent(self, message: str) -> Dict[str, Any]:
        """
        Analysiert Intent einer einzelnen Nachricht.
        Nützlich für Live-Chat/WhatsApp Integration.
        """
        message_lower = message.lower()
        
        result = {
            "keywords_found": [],
            "intent_category": "general",
            "intent_strength": 0.0,
            "suggested_response_type": "standard",
        }
        
        # Keyword-Suche
        for category, keywords in self.config["intent_keywords"].items():
            for keyword in keywords:
                if keyword in message_lower:
                    result["keywords_found"].append({
                        "keyword": keyword,
                        "category": category
                    })
        
        # Intent-Kategorie bestimmen
        if any(k["category"] == "strong_buy" for k in result["keywords_found"]):
            result["intent_category"] = "purchase_intent"
            result["intent_strength"] = 0.9
            result["suggested_response_type"] = "pricing_info"
        elif any(k["category"] == "demo_interest" for k in result["keywords_found"]):
            result["intent_category"] = "demo_request"
            result["intent_strength"] = 0.8
            result["suggested_response_type"] = "demo_booking"
        elif any(k["category"] == "timeline" for k in result["keywords_found"]):
            result["intent_category"] = "urgency"
            result["intent_strength"] = 0.7
            result["suggested_response_type"] = "fast_track"
        elif any(k["category"] == "comparison" for k in result["keywords_found"]):
            result["intent_category"] = "evaluation"
            result["intent_strength"] = 0.6
            result["suggested_response_type"] = "differentiation"
        
        return result
    
    # ========================================================================
    # TRACKING EVENT RECORDING
    # ========================================================================
    
    async def record_web_event(
        self,
        lead_id: Optional[str],
        visitor_id: str,
        event_type: str,
        event_url: str,
        event_data: Optional[Dict] = None,
    ) -> None:
        """
        Zeichnet ein Web-Tracking Event auf.
        
        Wird vom Frontend/Tracking-Pixel aufgerufen.
        """
        try:
            # High-Intent Page?
            is_high_intent = any(
                p in event_url.lower() 
                for p in self.config["high_intent_pages"].keys()
            )
            
            # Page Category bestimmen
            page_category = "other"
            for pattern, config in self.config["high_intent_pages"].items():
                if pattern in event_url.lower():
                    page_category = config["category"]
                    break
            
            data = {
                "lead_id": lead_id,
                "visitor_id": visitor_id,
                "event_type": event_type,
                "event_url": event_url,
                "event_page_title": event_data.get("page_title") if event_data else None,
                "event_element": event_data.get("element") if event_data else None,
                "event_value": event_data.get("value") if event_data else None,
                "page_category": page_category,
                "is_high_intent_page": is_high_intent,
                "session_id": event_data.get("session_id") if event_data else None,
                "time_on_page_seconds": event_data.get("time_on_page") if event_data else None,
                "scroll_depth_percent": event_data.get("scroll_depth") if event_data else None,
                "device_type": event_data.get("device_type") if event_data else None,
                "browser": event_data.get("browser") if event_data else None,
                "country": event_data.get("country") if event_data else None,
                "city": event_data.get("city") if event_data else None,
            }
            
            self.db.table("web_tracking_events").insert(data).execute()
            logger.debug(f"Recorded web event: {event_type} for {visitor_id}")
            
        except Exception as e:
            logger.exception(f"Error recording web event: {e}")
    
    async def record_social_event(
        self,
        lead_id: Optional[str],
        platform: str,
        engagement_type: str,
        event_data: Dict,
    ) -> None:
        """
        Zeichnet ein Social Media Engagement auf.
        
        Wird von Social Webhook aufgerufen.
        """
        try:
            # Intent aus Kommentar analysieren
            comment_text = event_data.get("comment_text", "")
            intent_analysis = self.analyze_message_intent(comment_text) if comment_text else {}
            
            data = {
                "lead_id": lead_id,
                "platform": platform,
                "platform_user_id": event_data.get("user_id"),
                "platform_username": event_data.get("username"),
                "engagement_type": engagement_type,
                "post_id": event_data.get("post_id"),
                "post_url": event_data.get("post_url"),
                "comment_text": comment_text,
                "contains_question": "?" in comment_text,
                "contains_price_inquiry": intent_analysis.get("intent_category") == "purchase_intent",
                "contains_interest_signal": intent_analysis.get("intent_strength", 0) > 0.5,
                "sentiment": event_data.get("sentiment", "neutral"),
                "intent_category": intent_analysis.get("intent_category"),
                "intent_confidence": intent_analysis.get("intent_strength", 0),
                "engagement_at": event_data.get("timestamp"),
            }
            
            self.db.table("social_engagement_events").insert(data).execute()
            logger.debug(f"Recorded social event: {engagement_type} on {platform}")
            
        except Exception as e:
            logger.exception(f"Error recording social event: {e}")


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_intent_engine(db: Client) -> IntentEngine:
    """Factory für IntentEngine"""
    return IntentEngine(db)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "IntentEngine",
    "create_intent_engine",
    "IntentResult",
    "WebActivityData",
    "ContentEngagementData",
    "SocialEngagementData",
    "DirectSignalsData",
    "RFMScores",
    "IntentStage",
    "BuyingRole",
    "INTENT_CONFIG",
]

