# file: app/services/lead_hunter_service.py
"""
Lead Hunter Service - Speziell für Network Marketing

Das Problem: Networker wissen nicht WO sie neue Leads finden sollen.

Die Lösung: Intelligenter Lead Hunter der:
1. Social Media Profile analysiert (Hashtags, Bios)
2. Look-alike Leads findet (ähnlich wie erfolgreiche Partner)
3. Reaktivierungs-Kandidaten identifiziert
4. Empfehlungen aus dem eigenen Netzwerk extrahiert
"""

from __future__ import annotations

import re
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ─────────────────────────────────────
# Enums & Types
# ─────────────────────────────────────

class LeadHuntSource(str, Enum):
    """Quelle für gefundene Leads"""
    INSTAGRAM_HASHTAG = "instagram_hashtag"
    INSTAGRAM_FOLLOWERS = "instagram_followers"
    FACEBOOK_GROUPS = "facebook_groups"
    LINKEDIN_CONNECTIONS = "linkedin_connections"
    WHATSAPP_CONTACTS = "whatsapp_contacts"
    REFERRAL = "referral"
    REACTIVATION = "reactivation"
    LOOKALIKE = "lookalike"
    MANUAL = "manual"


class LeadHuntPriority(str, Enum):
    """Priorität für gefundene Leads"""
    HOT = "hot"         # Sofort kontaktieren
    WARM = "warm"       # Innerhalb 24h
    COLD = "cold"       # Diese Woche
    NURTURE = "nurture" # Langfristig pflegen


class MLMSignalStrength(str, Enum):
    """Stärke der MLM-Affinität Signale"""
    STRONG = "strong"   # Definitiv interessiert
    MEDIUM = "medium"   # Wahrscheinlich interessiert
    WEAK = "weak"       # Vielleicht interessiert
    NONE = "none"       # Keine Signale


# ─────────────────────────────────────
# Models
# ─────────────────────────────────────

class HuntedLead(BaseModel):
    """Ein gefundener potenzieller Lead"""
    id: UUID = Field(default_factory=uuid4)
    
    # Identifikation
    name: Optional[str] = None
    handle: Optional[str] = None
    platform: str
    profile_url: Optional[str] = None
    
    # Analyse
    bio_keywords: List[str] = Field(default_factory=list)
    mlm_signals: List[str] = Field(default_factory=list)
    mlm_signal_strength: MLMSignalStrength = MLMSignalStrength.WEAK
    
    # Bewertung
    hunt_score: float = Field(0.0, ge=0, le=100)
    priority: LeadHuntPriority = LeadHuntPriority.COLD
    source: LeadHuntSource
    
    # Kontext
    suggested_opener: Optional[str] = None
    reason: str = ""
    
    # Meta
    found_at: datetime = Field(default_factory=datetime.now)


class HuntCriteria(BaseModel):
    """Kriterien für die Lead-Suche"""
    # Hashtags (Instagram/TikTok)
    hashtags: List[str] = Field(default_factory=list)
    
    # Keywords in Bio
    bio_keywords: List[str] = Field(default_factory=list)
    
    # MLM-spezifische Signale
    mlm_signals: List[str] = Field(
        default=[
            "nebeneinkommen", "selbstständig", "freiheit", "zeitfreiheit",
            "passives einkommen", "business", "coach", "mentor",
            "mama business", "homeoffice", "network", "team",
            "unabhängig", "erfolgreich", "traumleben", "lifestyle",
        ]
    )
    
    # Negative Signale (ausschließen)
    negative_signals: List[str] = Field(
        default=[
            "anti mlm", "kein network", "pyramid scheme", "scam",
        ]
    )
    
    # Location Filter
    locations: List[str] = Field(default=["deutschland", "österreich", "schweiz"])
    
    # Follower Range (für Micro-Influencer)
    min_followers: int = 500
    max_followers: int = 50000


class HuntResult(BaseModel):
    """Ergebnis einer Lead-Jagd"""
    success: bool
    total_found: int
    leads: List[HuntedLead]
    criteria_used: HuntCriteria
    hunt_duration_ms: int
    suggestions: List[str] = Field(default_factory=list)


class DailyHuntQuota(BaseModel):
    """Tägliche Lead-Jagd Quote"""
    user_id: UUID
    date: str
    leads_found: int = 0
    leads_contacted: int = 0
    goal: int = 10
    progress_percent: float = 0.0


# ─────────────────────────────────────
# Service
# ─────────────────────────────────────

class LeadHunterService:
    """
    Intelligenter Lead Hunter für Network Marketing.
    
    Features:
    - Hashtag-basierte Suche
    - Bio-Keyword Analyse
    - MLM-Signal Erkennung
    - Look-alike Finder
    - Reaktivierungs-Scan
    - Empfehlungs-Extraktion
    """
    
    # MLM-Positive Keywords (DACH-spezifisch)
    MLM_POSITIVE_KEYWORDS = [
        # Business-Interesse
        "nebeneinkommen", "zusatzeinkommen", "selbstständig", "selbständig",
        "eigenes business", "unternehmer", "unternehmerin", "gründer",
        "business aufbauen", "passives einkommen",
        
        # Lifestyle
        "freiheit", "zeitfreiheit", "ortsunabhängig", "digital nomad",
        "reisen", "traumleben", "lifestyle", "work life balance",
        
        # Familie
        "mama", "mami", "mompreneur", "working mom", "homeoffice mama",
        "familie", "kinder", "elternzeit",
        
        # Coaching/Persönlichkeit
        "coach", "coaching", "mentor", "mentorin", "persönlichkeitsentwicklung",
        "mindset", "erfolg", "erfolgreich", "motivation",
        
        # Network Marketing Signale
        "network", "team", "teamaufbau", "partnership", "community",
        "empfehlung", "weiterempfehlen",
        
        # Health & Wellness (typische MLM-Branchen)
        "gesundheit", "wellness", "fitness", "abnehmen", "ernährung",
        "nahrungsergänzung", "supplements", "clean eating",
        
        # Beauty
        "beauty", "skincare", "makeup", "kosmetik", "pflege",
    ]
    
    # Negative Keywords (ausschließen)
    MLM_NEGATIVE_KEYWORDS = [
        "anti mlm", "kein mlm", "kein network", "pyramid scheme",
        "schneeballsystem", "abzocke", "scam", "betrug",
        "keine anfragen", "keine verkäufer",
    ]
    
    def __init__(self):
        # In-Memory Storage für Demo
        self._hunted_leads: Dict[UUID, List[HuntedLead]] = {}
        self._daily_quotas: Dict[str, DailyHuntQuota] = {}
    
    # ─────────────────────────────────
    # MAIN HUNTING METHODS
    # ─────────────────────────────────
    
    async def hunt_by_criteria(
        self,
        user_id: UUID,
        criteria: HuntCriteria,
        limit: int = 20,
    ) -> HuntResult:
        """
        Sucht Leads basierend auf Kriterien.
        
        In Produktion: Würde echte Social Media APIs nutzen.
        Hier: Demo-Daten mit realistischer Logik.
        """
        import time
        start = time.time()
        
        # Demo: Generiere realistische Leads
        leads = self._generate_demo_leads(criteria, limit)
        
        # Analyse & Scoring
        for lead in leads:
            self._analyze_lead(lead, criteria)
        
        # Nach Score sortieren
        leads.sort(key=lambda l: l.hunt_score, reverse=True)
        
        # Speichern
        if user_id not in self._hunted_leads:
            self._hunted_leads[user_id] = []
        self._hunted_leads[user_id].extend(leads)
        
        # Quota aktualisieren
        await self._update_quota(user_id, len(leads))
        
        duration = int((time.time() - start) * 1000)
        
        return HuntResult(
            success=True,
            total_found=len(leads),
            leads=leads,
            criteria_used=criteria,
            hunt_duration_ms=duration,
            suggestions=self._generate_suggestions(leads),
        )
    
    async def hunt_lookalikes(
        self,
        user_id: UUID,
        reference_lead_ids: List[UUID],
        limit: int = 10,
    ) -> HuntResult:
        """
        Findet Leads die ähnlich zu erfolgreichen Partnern sind.
        
        "Wer ist so wie meine besten Partner?"
        """
        criteria = HuntCriteria(
            bio_keywords=["coach", "mama", "business", "lifestyle"],
            mlm_signals=self.MLM_POSITIVE_KEYWORDS[:10],
        )
        
        leads = self._generate_demo_leads(criteria, limit)
        
        for lead in leads:
            lead.source = LeadHuntSource.LOOKALIKE
            lead.reason = "Ähnlich zu deinen Top-Partnern"
            self._analyze_lead(lead, criteria)
        
        return HuntResult(
            success=True,
            total_found=len(leads),
            leads=leads,
            criteria_used=criteria,
            hunt_duration_ms=50,
            suggestions=["Lookalikes haben oft ähnliche Interessen wie deine besten Partner!"],
        )
    
    async def scan_reactivation_candidates(
        self,
        user_id: UUID,
        days_inactive: int = 30,
    ) -> HuntResult:
        """
        Findet Leads die reaktiviert werden könnten.
        
        "Wer hat lange nicht reagiert aber war mal interessiert?"
        """
        # Demo: Generiere Reaktivierungs-Kandidaten
        leads = [
            HuntedLead(
                name="Lisa Müller",
                platform="whatsapp",
                bio_keywords=["mama", "coach"],
                mlm_signals=["business interesse"],
                mlm_signal_strength=MLMSignalStrength.MEDIUM,
                hunt_score=65,
                priority=LeadHuntPriority.WARM,
                source=LeadHuntSource.REACTIVATION,
                suggested_opener="Hey Lisa! Lange nichts gehört - wie geht's dir?",
                reason=f"Kein Kontakt seit {days_inactive}+ Tagen, war ursprünglich interessiert",
            ),
            HuntedLead(
                name="Max Schmidt",
                platform="instagram",
                handle="@max_fitness",
                bio_keywords=["fitness", "coach"],
                mlm_signals=["nebeneinkommen interesse"],
                mlm_signal_strength=MLMSignalStrength.WEAK,
                hunt_score=45,
                priority=LeadHuntPriority.COLD,
                source=LeadHuntSource.REACTIVATION,
                suggested_opener="Hey Max! Ich musste gerade an unser Gespräch denken...",
                reason=f"Ghosted vor {days_inactive} Tagen",
            ),
        ]
        
        return HuntResult(
            success=True,
            total_found=len(leads),
            leads=leads,
            criteria_used=HuntCriteria(),
            hunt_duration_ms=20,
            suggestions=[
                "Reaktivierungs-Nachrichten sollten locker und ohne Druck sein",
                "Frag nach ihrem aktuellen Status, nicht nach dem Business",
            ],
        )
    
    async def get_daily_suggestions(
        self,
        user_id: UUID,
        count: int = 5,
    ) -> List[HuntedLead]:
        """
        Gibt tägliche Lead-Vorschläge.
        
        Wird im Daily Flow genutzt: "Diese 5 Leute solltest du heute anschreiben"
        """
        # Kombiniere verschiedene Quellen
        all_leads: List[HuntedLead] = []
        
        # 1. Lookalikes
        lookalike_result = await self.hunt_lookalikes(user_id, [], limit=2)
        all_leads.extend(lookalike_result.leads)
        
        # 2. Reaktivierungen
        reactivation_result = await self.scan_reactivation_candidates(user_id)
        all_leads.extend(reactivation_result.leads[:2])
        
        # 3. Standard Hunt
        criteria = HuntCriteria(
            hashtags=["networkmarketing", "nebeneinkommen"],
            bio_keywords=["coach", "mama", "business"],
        )
        hunt_result = await self.hunt_by_criteria(user_id, criteria, limit=2)
        all_leads.extend(hunt_result.leads)
        
        # Nach Priorität & Score sortieren
        priority_order = {
            LeadHuntPriority.HOT: 0,
            LeadHuntPriority.WARM: 1,
            LeadHuntPriority.COLD: 2,
            LeadHuntPriority.NURTURE: 3,
        }
        all_leads.sort(key=lambda l: (priority_order.get(l.priority, 99), -l.hunt_score))
        
        return all_leads[:count]
    
    async def get_daily_quota(self, user_id: UUID) -> DailyHuntQuota:
        """Gibt die tägliche Quote zurück."""
        today = datetime.now().strftime("%Y-%m-%d")
        key = f"{user_id}_{today}"
        
        if key not in self._daily_quotas:
            self._daily_quotas[key] = DailyHuntQuota(
                user_id=user_id,
                date=today,
                goal=10,
            )
        
        return self._daily_quotas[key]
    
    # ─────────────────────────────────
    # ANALYSIS HELPERS
    # ─────────────────────────────────
    
    def _analyze_lead(self, lead: HuntedLead, criteria: HuntCriteria) -> None:
        """Analysiert und bewertet einen Lead."""
        score = 0.0
        signals: List[str] = []
        
        # Bio Keywords analysieren
        bio_text = " ".join(lead.bio_keywords).lower()
        
        # Positive MLM Signale
        for keyword in self.MLM_POSITIVE_KEYWORDS:
            if keyword.lower() in bio_text:
                score += 5
                signals.append(keyword)
        
        # Negative Signale (Abzug)
        for keyword in self.MLM_NEGATIVE_KEYWORDS:
            if keyword.lower() in bio_text:
                score -= 30
                lead.priority = LeadHuntPriority.NURTURE
        
        # Criteria Keywords
        for kw in criteria.bio_keywords:
            if kw.lower() in bio_text:
                score += 3
        
        # Signal Strength bestimmen
        if len(signals) >= 5:
            lead.mlm_signal_strength = MLMSignalStrength.STRONG
            score += 20
        elif len(signals) >= 3:
            lead.mlm_signal_strength = MLMSignalStrength.MEDIUM
            score += 10
        elif len(signals) >= 1:
            lead.mlm_signal_strength = MLMSignalStrength.WEAK
            score += 5
        else:
            lead.mlm_signal_strength = MLMSignalStrength.NONE
        
        # Priorität bestimmen
        if score >= 70:
            lead.priority = LeadHuntPriority.HOT
        elif score >= 50:
            lead.priority = LeadHuntPriority.WARM
        elif score >= 30:
            lead.priority = LeadHuntPriority.COLD
        
        lead.hunt_score = min(100, max(0, score))
        lead.mlm_signals = signals[:10]  # Max 10 Signale
        
        # Opener generieren
        if not lead.suggested_opener:
            lead.suggested_opener = self._generate_opener(lead)
    
    def _generate_opener(self, lead: HuntedLead) -> str:
        """Generiert einen personalisierten Opener."""
        name = lead.name or "du"
        
        if "mama" in lead.bio_keywords or "mami" in lead.bio_keywords:
            return f"Hey {name}! Als Mama weiß ich wie wertvoll Zeitfreiheit ist. Dein Profil hat mich neugierig gemacht 🙌"
        
        if "coach" in lead.bio_keywords:
            return f"Hey {name}! Dein Coaching-Ansatz hat mich angesprochen. Was ist deine größte Herausforderung beim Skalieren?"
        
        if "fitness" in lead.bio_keywords:
            return f"Hey {name}! Mega inspirierend was du machst! 💪 Bist du offen für neue Kooperationen?"
        
        return f"Hey {name}! Dein Profil ist mir aufgefallen - find ich mega spannend was du machst! 🙌"
    
    def _generate_demo_leads(
        self,
        criteria: HuntCriteria,
        limit: int,
    ) -> List[HuntedLead]:
        """Generiert realistische Demo-Leads."""
        import random
        
        demo_profiles = [
            {
                "name": "Julia Fischer",
                "handle": "@julia_coaching",
                "platform": "instagram",
                "bio_keywords": ["coach", "mama", "business", "lifestyle", "freiheit"],
            },
            {
                "name": "Sarah Weber",
                "handle": "@sarah_fitness",
                "platform": "instagram",
                "bio_keywords": ["fitness", "health", "mama", "homeoffice"],
            },
            {
                "name": "Anna Müller",
                "handle": "@anna_lifestyle",
                "platform": "instagram",
                "bio_keywords": ["lifestyle", "reisen", "freiheit", "selbstständig"],
            },
            {
                "name": "Lena Schmidt",
                "handle": "@lena_beauty",
                "platform": "instagram",
                "bio_keywords": ["beauty", "skincare", "mama", "business"],
            },
            {
                "name": "Marie Hoffmann",
                "handle": "@marie_mindset",
                "platform": "instagram",
                "bio_keywords": ["mindset", "erfolg", "coach", "motivation"],
            },
            {
                "name": "Laura Bauer",
                "handle": "@laura_mom",
                "platform": "instagram",
                "bio_keywords": ["mama", "family", "lifestyle", "nebeneinkommen"],
            },
            {
                "name": "Sophie Wagner",
                "handle": "@sophie_wellness",
                "platform": "instagram",
                "bio_keywords": ["wellness", "health", "coach", "meditation"],
            },
            {
                "name": "Lisa Braun",
                "handle": "@lisa_entrepreneur",
                "platform": "instagram",
                "bio_keywords": ["entrepreneur", "business", "startup", "hustle"],
            },
        ]
        
        leads = []
        for profile in random.sample(demo_profiles, min(limit, len(demo_profiles))):
            lead = HuntedLead(
                name=profile["name"],
                handle=profile["handle"],
                platform=profile["platform"],
                profile_url=f"https://instagram.com/{profile['handle'][1:]}",
                bio_keywords=profile["bio_keywords"],
                source=LeadHuntSource.INSTAGRAM_HASHTAG,
                reason="Gefunden über Hashtag-Suche",
            )
            leads.append(lead)
        
        return leads
    
    def _generate_suggestions(self, leads: List[HuntedLead]) -> List[str]:
        """Generiert Tipps basierend auf den gefundenen Leads."""
        suggestions = []
        
        hot_count = len([l for l in leads if l.priority == LeadHuntPriority.HOT])
        if hot_count > 0:
            suggestions.append(f"🔥 {hot_count} Hot Leads gefunden - kontaktiere sie HEUTE!")
        
        mama_count = len([l for l in leads if "mama" in l.bio_keywords])
        if mama_count > 0:
            suggestions.append(f"👩‍👧 {mama_count} Mama-Profile - nutze das 'Zeitfreiheit' Argument!")
        
        coach_count = len([l for l in leads if "coach" in l.bio_keywords])
        if coach_count > 0:
            suggestions.append(f"🎯 {coach_count} Coaches gefunden - frag nach ihrer Skalierungs-Strategie!")
        
        return suggestions
    
    async def _update_quota(self, user_id: UUID, leads_found: int) -> None:
        """Aktualisiert die tägliche Quote."""
        quota = await self.get_daily_quota(user_id)
        quota.leads_found += leads_found
        quota.progress_percent = min(100, (quota.leads_found / quota.goal) * 100)


# Singleton
_lead_hunter: Optional[LeadHunterService] = None


def get_lead_hunter_service() -> LeadHunterService:
    """Gibt den Lead Hunter Service zurück."""
    global _lead_hunter
    if _lead_hunter is None:
        _lead_hunter = LeadHunterService()
    return _lead_hunter


__all__ = [
    "LeadHunterService",
    "get_lead_hunter_service",
    "HuntedLead",
    "HuntCriteria",
    "HuntResult",
    "DailyHuntQuota",
    "LeadHuntSource",
    "LeadHuntPriority",
    "MLMSignalStrength",
]

