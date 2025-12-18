"""
Lead Hunter Service for SalesFlow AI.

Implements intelligent lead discovery from multiple sources:
- Instagram Hashtag Scanner
- LinkedIn Contact Suggestions
- Lookalike Lead Finding
- Event Participant Analysis
- Warm Market Analysis
"""
import asyncio
import re
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID, uuid4
import logging
import hashlib

from app.models.hunter_models import (
    HunterLead,
    HunterConfig,
    HunterScanResult,
    HashtagScanConfig,
    LookalikeScanConfig,
    EventScanConfig,
    WarmMarketConfig,
    LeadSource,
    LeadTemperature,
    LeadCategory,
    LeadScore,
    LeadScoreFactors,
    SocialProfile,
    SocialEngagement,
    EngagementType,
    NetworkMarketingSignals,
    InterestLevel,
)

logger = logging.getLogger(__name__)


# ============= Keywords for Analysis =============

ENTREPRENEUR_KEYWORDS = [
    "entrepreneur", "business owner", "ceo", "founder", "side hustle",
    "passive income", "financial freedom", "work from home", "own boss",
    "startup", "hustler", "dreamer", "ambitious", "motivated",
    "success mindset", "wealth", "freedom lifestyle", "laptop lifestyle"
]

HEALTH_WELLNESS_KEYWORDS = [
    "fitness", "health", "wellness", "nutrition", "weight loss",
    "healthy lifestyle", "gym", "workout", "organic", "natural",
    "supplements", "vitamins", "energy", "detox", "clean eating",
    "self care", "mental health", "mindfulness", "yoga"
]

MLM_COMPETITOR_KEYWORDS = [
    "amway", "herbalife", "avon", "mary kay", "tupperware",
    "younique", "arbonne", "doterra", "young living", "monat",
    "beachbody", "it works", "primerica", "cutco", "usana"
]

ANTI_MLM_KEYWORDS = [
    "pyramid scheme", "mlm scam", "antimlm", "anti-mlm",
    "not a pyramid", "hun bot", "boss babe cringe"
]


class LeadHunterAdvancedService:
    """
    Service for discovering and qualifying leads from multiple sources.
    """
    
    def __init__(
        self,
        lead_repo=None,
        social_api_client=None,
        ai_analyzer=None
    ):
        self._lead_repo = lead_repo
        self._social_api = social_api_client
        self._ai_analyzer = ai_analyzer
        self._cache: dict[str, Any] = {}
    
    # ============= Main Scan Methods =============
    
    async def run_full_scan(
        self,
        config: HunterConfig
    ) -> HunterScanResult:
        """Run complete lead hunting scan based on configuration."""
        result = HunterScanResult(config=config)
        all_leads: list[HunterLead] = []
        
        try:
            # Run configured scans in parallel
            tasks = []
            
            if config.hashtag_config:
                tasks.append(self._scan_hashtags(config.hashtag_config))
            
            if config.lookalike_config:
                tasks.append(self._scan_lookalikes(config.lookalike_config))
            
            if config.event_config:
                tasks.append(self._scan_event(config.event_config))
            
            if config.warm_market_config:
                tasks.append(self._scan_warm_market(
                    config.user_id, 
                    config.warm_market_config
                ))
            
            if tasks:
                scan_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for scan_result in scan_results:
                    if isinstance(scan_result, Exception):
                        result.errors.append(str(scan_result))
                        logger.error(f"Scan error: {scan_result}")
                    elif isinstance(scan_result, list):
                        all_leads.extend(scan_result)
            
            # Deduplicate leads
            all_leads = self._deduplicate_leads(all_leads)
            
            # Filter existing leads if configured
            if config.exclude_existing_leads and self._lead_repo:
                all_leads = await self._filter_existing_leads(all_leads)
            
            # Score and categorize leads
            if config.auto_score:
                for lead in all_leads:
                    lead.score = await self._score_lead(lead)
                    lead.temperature = self._determine_temperature(lead.score.total_score)
            
            if config.auto_categorize:
                for lead in all_leads:
                    lead.category = await self._categorize_lead(lead)
            
            # Filter by minimum score
            qualified_leads = [
                lead for lead in all_leads
                if lead.score and lead.score.total_score >= config.min_score
            ]
            
            # Update result
            result.leads = qualified_leads
            result.leads_found = len(all_leads)
            result.leads_qualified = len(qualified_leads)
            result.completed_at = datetime.utcnow()
            
            # Calculate breakdowns
            result.by_source = self._count_by_field(qualified_leads, "source")
            result.by_temperature = self._count_by_field(qualified_leads, "temperature")
            result.by_category = self._count_by_field(qualified_leads, "category")
            
            logger.info(
                f"Lead Hunter scan complete: {result.leads_found} found, "
                f"{result.leads_qualified} qualified"
            )
            
        except Exception as e:
            result.errors.append(f"Scan failed: {str(e)}")
            result.completed_at = datetime.utcnow()
            logger.exception("Lead Hunter scan failed")
        
        return result
    
    # ============= Instagram Hashtag Scanner =============
    
    async def _scan_hashtags(
        self,
        config: HashtagScanConfig
    ) -> list[HunterLead]:
        """Scan Instagram hashtags for potential leads."""
        leads = []
        
        for hashtag in config.hashtags:
            try:
                # In production, use Instagram API or approved scraping service
                profiles = await self._fetch_hashtag_users(
                    hashtag=hashtag,
                    platform=LeadSource.INSTAGRAM,
                    limit=config.max_results_per_hashtag
                )
                
                for profile_data in profiles:
                    # Apply filters
                    if not self._passes_hashtag_filters(profile_data, config):
                        continue
                    
                    # Create lead
                    lead = self._create_lead_from_profile(
                        profile_data,
                        source=LeadSource.INSTAGRAM,
                        discovered_via=f"hashtag:#{hashtag}"
                    )
                    
                    # Analyze profile for MLM signals
                    signals = self._analyze_mlm_signals(profile_data)
                    lead.interests = self._extract_interests(profile_data)
                    lead.talking_points = self._generate_talking_points(
                        profile_data, signals
                    )
                    
                    leads.append(lead)
                    
            except Exception as e:
                logger.warning(f"Error scanning hashtag #{hashtag}: {e}")
        
        return leads
    
    async def _fetch_hashtag_users(
        self,
        hashtag: str,
        platform: LeadSource,
        limit: int
    ) -> list[dict]:
        """
        Fetch users who posted with a hashtag.
        
        In production, integrate with:
        - Instagram Graph API (for business accounts)
        - Approved third-party services
        """
        # Mock implementation - replace with real API calls
        # This returns sample data structure
        return [
            {
                "username": f"user_{i}",
                "display_name": f"Sample User {i}",
                "bio": "Entrepreneur | Health enthusiast | Living my best life 💪",
                "followers": 5000 + (i * 100),
                "following": 500 + (i * 10),
                "posts_count": 200 + i,
                "engagement_rate": 0.03 + (i * 0.001),
                "is_business_account": i % 3 == 0,
                "profile_url": f"https://instagram.com/user_{i}",
                "recent_hashtags": [hashtag, "fitness", "motivation"],
                "recent_posts": [
                    {"text": "Working on my goals! 🎯", "likes": 150, "comments": 12},
                ]
            }
            for i in range(min(limit, 10))  # Limited for demo
        ]
    
    def _passes_hashtag_filters(
        self,
        profile: dict,
        config: HashtagScanConfig
    ) -> bool:
        """Check if profile passes configured filters."""
        followers = profile.get("followers", 0)
        
        if followers < config.min_followers:
            return False
        
        if followers > config.max_followers:
            return False
        
        engagement = profile.get("engagement_rate", 0)
        if engagement < config.min_engagement_rate:
            return False
        
        if config.exclude_business_accounts and profile.get("is_business_account"):
            return False
        
        if config.exclude_verified and profile.get("is_verified"):
            return False
        
        return True
    
    # ============= LinkedIn Scanner =============
    
    async def scan_linkedin_connections(
        self,
        user_id: UUID,
        include_2nd_degree: bool = True,
        industries: list[str] = None,
        job_titles: list[str] = None,
        limit: int = 100
    ) -> list[HunterLead]:
        """
        Scan LinkedIn for potential leads.
        
        Uses LinkedIn API or Sales Navigator integration.
        """
        leads = []
        
        # Fetch connections (mock implementation)
        connections = await self._fetch_linkedin_connections(
            include_2nd_degree=include_2nd_degree,
            limit=limit
        )
        
        for conn in connections:
            # Filter by criteria
            if industries and conn.get("industry") not in industries:
                continue
            
            if job_titles:
                title = conn.get("job_title", "").lower()
                if not any(jt.lower() in title for jt in job_titles):
                    continue
            
            lead = HunterLead(
                first_name=conn.get("first_name"),
                last_name=conn.get("last_name"),
                email=conn.get("email"),
                source=LeadSource.LINKEDIN,
                source_url=conn.get("profile_url"),
                discovered_via="linkedin_connections"
            )
            
            # Add LinkedIn profile
            lead.social_profiles.append(SocialProfile(
                platform=LeadSource.LINKEDIN,
                username=conn.get("linkedin_id", ""),
                profile_url=conn.get("profile_url", ""),
                display_name=f"{conn.get('first_name', '')} {conn.get('last_name', '')}",
                bio=conn.get("headline"),
                followers=conn.get("connections_count"),
                location=conn.get("location")
            ))
            
            # Analyze for MLM fit
            signals = self._analyze_linkedin_signals(conn)
            lead.interests = conn.get("skills", [])
            lead.talking_points = self._generate_linkedin_talking_points(conn)
            
            leads.append(lead)
        
        return leads
    
    async def _fetch_linkedin_connections(
        self,
        include_2nd_degree: bool,
        limit: int
    ) -> list[dict]:
        """Fetch LinkedIn connections via API."""
        # Mock implementation
        return [
            {
                "linkedin_id": f"linkedin_{i}",
                "first_name": "John",
                "last_name": f"Doe{i}",
                "headline": "Entrepreneur | Business Development",
                "industry": "Health & Wellness",
                "job_title": "Sales Manager",
                "connections_count": 500 + (i * 50),
                "profile_url": f"https://linkedin.com/in/johndoe{i}",
                "location": "New York, NY",
                "skills": ["Sales", "Marketing", "Leadership"]
            }
            for i in range(min(limit, 10))
        ]
    
    # ============= Lookalike Lead Finder =============
    
    async def _scan_lookalikes(
        self,
        config: LookalikeScanConfig
    ) -> list[HunterLead]:
        """Find leads similar to best existing customers."""
        leads = []
        
        if not self._lead_repo:
            return leads
        
        # Get source leads for analysis
        source_leads = []
        for lead_id in config.source_lead_ids:
            lead = await self._lead_repo.get_by_id(lead_id)
            if lead:
                source_leads.append(lead)
        
        if not source_leads:
            return leads
        
        # Build ideal customer profile
        icp = self._build_ideal_customer_profile(source_leads)
        
        # Find similar profiles (mock - would use ML in production)
        similar_profiles = await self._find_similar_profiles(
            icp=icp,
            limit=config.max_results
        )
        
        for profile in similar_profiles:
            similarity = self._calculate_similarity(profile, icp)
            
            if similarity < config.min_similarity:
                continue
            
            lead = self._create_lead_from_profile(
                profile,
                source=LeadSource.LOOKALIKE,
                discovered_via=f"lookalike:{config.source_lead_ids[0]}"
            )
            lead.similarity_score = similarity
            lead.similar_to_lead_id = config.source_lead_ids[0]
            
            leads.append(lead)
        
        # Sort by similarity
        leads.sort(key=lambda x: x.similarity_score or 0, reverse=True)
        
        return leads
    
    def _build_ideal_customer_profile(
        self,
        source_leads: list[dict]
    ) -> dict:
        """Build ICP from best customers."""
        # Aggregate characteristics
        all_interests = []
        all_industries = []
        demographics = []
        
        for lead in source_leads:
            all_interests.extend(lead.get("interests", []))
            if lead.get("industry"):
                all_industries.append(lead["industry"])
            if lead.get("demographics"):
                demographics.append(lead["demographics"])
        
        # Find common patterns
        from collections import Counter
        interest_counts = Counter(all_interests)
        industry_counts = Counter(all_industries)
        
        return {
            "top_interests": [i for i, _ in interest_counts.most_common(10)],
            "industries": [i for i, _ in industry_counts.most_common(5)],
            "avg_followers": sum(
                l.get("followers", 0) for l in source_leads
            ) / len(source_leads) if source_leads else 0,
            "characteristics": self._extract_common_characteristics(source_leads)
        }
    
    async def _find_similar_profiles(
        self,
        icp: dict,
        limit: int
    ) -> list[dict]:
        """Find profiles matching ICP."""
        # In production, use ML model or social API search
        # Mock implementation
        return [
            {
                "username": f"similar_user_{i}",
                "interests": icp.get("top_interests", [])[:3],
                "industry": icp.get("industries", ["General"])[0],
                "followers": int(icp.get("avg_followers", 1000)),
                "characteristics": icp.get("characteristics", {})
            }
            for i in range(min(limit, 10))
        ]
    
    def _calculate_similarity(self, profile: dict, icp: dict) -> float:
        """Calculate similarity score between profile and ICP."""
        score = 0.0
        
        # Interest overlap (40%)
        profile_interests = set(profile.get("interests", []))
        icp_interests = set(icp.get("top_interests", []))
        if icp_interests:
            overlap = len(profile_interests & icp_interests) / len(icp_interests)
            score += overlap * 0.4
        
        # Industry match (30%)
        if profile.get("industry") in icp.get("industries", []):
            score += 0.3
        
        # Follower range (15%)
        avg_followers = icp.get("avg_followers", 1000)
        profile_followers = profile.get("followers", 0)
        if avg_followers > 0:
            ratio = min(profile_followers, avg_followers) / max(profile_followers, avg_followers)
            score += ratio * 0.15
        
        # Characteristics match (15%)
        score += 0.15  # Simplified
        
        return round(score, 2)
    
    # ============= Event Scanner =============
    
    async def _scan_event(
        self,
        config: EventScanConfig
    ) -> list[HunterLead]:
        """Scan event participants and engagers."""
        leads = []
        
        # Scan event hashtags
        if config.event_hashtags:
            hashtag_config = HashtagScanConfig(
                hashtags=config.event_hashtags,
                platforms=[LeadSource.INSTAGRAM, LeadSource.LINKEDIN],
                max_results_per_hashtag=50
            )
            hashtag_leads = await self._scan_hashtags(hashtag_config)
            
            for lead in hashtag_leads:
                lead.discovered_via = f"event:{config.event_name}"
            
            leads.extend(hashtag_leads)
        
        # Scan event platform (Eventbrite, Meetup, etc.)
        if config.event_url:
            event_participants = await self._fetch_event_participants(
                event_url=config.event_url,
                include_attendees=config.scan_attendees,
                include_speakers=config.scan_speakers
            )
            
            for participant in event_participants:
                lead = HunterLead(
                    first_name=participant.get("first_name"),
                    last_name=participant.get("last_name"),
                    email=participant.get("email"),
                    source=LeadSource.EVENT,
                    source_url=config.event_url,
                    discovered_via=f"event:{config.event_name}"
                )
                
                # Speakers are high-value
                if participant.get("is_speaker"):
                    lead.talking_points.append(
                        f"Loved your talk at {config.event_name}"
                    )
                
                leads.append(lead)
        
        return leads
    
    async def _fetch_event_participants(
        self,
        event_url: str,
        include_attendees: bool,
        include_speakers: bool
    ) -> list[dict]:
        """Fetch event participants from event platform."""
        # Mock implementation
        participants = []
        
        if include_speakers:
            participants.extend([
                {
                    "first_name": "Speaker",
                    "last_name": f"Name{i}",
                    "is_speaker": True,
                    "topic": "Network Marketing Success"
                }
                for i in range(3)
            ])
        
        if include_attendees:
            participants.extend([
                {
                    "first_name": "Attendee",
                    "last_name": f"Name{i}",
                    "is_speaker": False
                }
                for i in range(10)
            ])
        
        return participants
    
    # ============= Warm Market Scanner =============
    
    async def _scan_warm_market(
        self,
        user_id: UUID,
        config: WarmMarketConfig
    ) -> list[HunterLead]:
        """Analyze warm market (existing relationships)."""
        leads = []
        
        # Fetch Facebook friends (with user's authorization)
        if config.include_friends:
            friends = await self._fetch_facebook_friends(user_id)
            
            for friend in friends:
                relationship_strength = self._calculate_relationship_strength(friend)
                
                if relationship_strength < config.min_relationship_strength:
                    continue
                
                lead = HunterLead(
                    first_name=friend.get("first_name"),
                    last_name=friend.get("last_name"),
                    source=LeadSource.WARM_MARKET,
                    source_url=friend.get("profile_url"),
                    discovered_via="warm_market:facebook_friend",
                    relationship_type="friend",
                    relationship_strength=relationship_strength,
                    last_interaction=friend.get("last_interaction")
                )
                
                # Add Facebook profile
                lead.social_profiles.append(SocialProfile(
                    platform=LeadSource.FACEBOOK,
                    username=friend.get("facebook_id", ""),
                    profile_url=friend.get("profile_url", ""),
                    display_name=f"{friend.get('first_name', '')} {friend.get('last_name', '')}"
                ))
                
                # Generate warm market talking points
                lead.talking_points = self._generate_warm_market_talking_points(
                    friend, relationship_strength
                )
                
                leads.append(lead)
        
        # Sort by relationship strength or last interaction
        if config.prioritize_by == "relationship_strength":
            leads.sort(key=lambda x: x.relationship_strength or 0, reverse=True)
        else:
            leads.sort(
                key=lambda x: x.last_interaction or datetime.min,
                reverse=True
            )
        
        return leads
    
    async def _fetch_facebook_friends(self, user_id: UUID) -> list[dict]:
        """Fetch Facebook friends via Graph API."""
        # Mock implementation - requires user OAuth
        return [
            {
                "facebook_id": f"fb_{i}",
                "first_name": "Friend",
                "last_name": f"Name{i}",
                "profile_url": f"https://facebook.com/friend{i}",
                "mutual_friends": 50 + (i * 10),
                "last_interaction": datetime.utcnow() - timedelta(days=i * 7),
                "interests": ["fitness", "travel", "business"]
            }
            for i in range(20)
        ]
    
    def _calculate_relationship_strength(self, friend: dict) -> int:
        """Calculate relationship strength (1-10)."""
        score = 5  # Base score
        
        # Mutual friends boost
        mutual = friend.get("mutual_friends", 0)
        if mutual > 100:
            score += 2
        elif mutual > 50:
            score += 1
        
        # Recent interaction boost
        last_interaction = friend.get("last_interaction")
        if last_interaction:
            days_ago = (datetime.utcnow() - last_interaction).days
            if days_ago < 7:
                score += 2
            elif days_ago < 30:
                score += 1
        
        return min(10, max(1, score))
    
    # ============= Lead Scoring =============
    
    async def _score_lead(self, lead: HunterLead) -> LeadScore:
        """Score a lead based on multiple factors."""
        factors = LeadScoreFactors()
        reasons = []
        
        # Profile completeness (0-25)
        completeness = 0
        if lead.first_name:
            completeness += 5
        if lead.email:
            completeness += 10
        if lead.social_profiles:
            completeness += 5
        if lead.phone:
            completeness += 5
        factors.profile_completeness = min(25, completeness)
        
        if factors.profile_completeness >= 20:
            reasons.append("Complete profile information")
        
        # Engagement frequency (0-25)
        engagement_score = 0
        if lead.social_profiles:
            profile = lead.social_profiles[0]
            if profile.engagement_rate and profile.engagement_rate > 0.05:
                engagement_score = 25
                reasons.append("High engagement rate")
            elif profile.engagement_rate and profile.engagement_rate > 0.02:
                engagement_score = 15
        factors.engagement_frequency = engagement_score
        
        # Interest signals (0-25)
        interest_score = 0
        for interest in lead.interests:
            if any(kw in interest.lower() for kw in ENTREPRENEUR_KEYWORDS):
                interest_score += 5
            if any(kw in interest.lower() for kw in HEALTH_WELLNESS_KEYWORDS):
                interest_score += 3
        factors.interest_signals = min(25, interest_score)
        
        if factors.interest_signals >= 15:
            reasons.append("Strong interest alignment")
        
        # Ideal customer fit (0-25)
        fit_score = 0
        if lead.similarity_score:
            fit_score = int(lead.similarity_score * 25)
            reasons.append(f"Lookalike match: {lead.similarity_score:.0%}")
        elif lead.relationship_strength:
            fit_score = lead.relationship_strength * 2
            reasons.append("Warm relationship")
        else:
            fit_score = 10  # Base fit
        factors.ideal_customer_fit = min(25, fit_score)
        
        # Determine confidence
        confidence = 0.5
        if lead.email:
            confidence += 0.2
        if len(lead.social_profiles) > 1:
            confidence += 0.1
        if lead.engagements:
            confidence += 0.2
        
        return LeadScore(
            lead_id=lead.id,
            factors=factors,
            total_score=factors.total_score,
            temperature=self._determine_temperature(factors.total_score),
            category=lead.category,
            confidence=min(1.0, confidence),
            reasons=reasons
        )
    
    def _determine_temperature(self, score: int) -> LeadTemperature:
        """Determine lead temperature from score."""
        if score >= 80:
            return LeadTemperature.BURNING
        elif score >= 65:
            return LeadTemperature.HOT
        elif score >= 50:
            return LeadTemperature.WARM
        elif score >= 35:
            return LeadTemperature.COOL
        else:
            return LeadTemperature.COLD
    
    # ============= Lead Categorization =============
    
    async def _categorize_lead(self, lead: HunterLead) -> LeadCategory:
        """Categorize lead as customer, builder, or hybrid."""
        signals = self._analyze_mlm_signals_from_lead(lead)
        
        # Check for existing MLM involvement
        if signals.already_in_mlm or signals.anti_mlm_sentiment:
            return LeadCategory.UNKNOWN
        
        builder_score = signals.builder_score
        customer_score = signals.customer_score
        
        if builder_score >= 60 and customer_score >= 60:
            return LeadCategory.HYBRID
        elif builder_score >= 50:
            return LeadCategory.BUSINESS_BUILDER
        elif customer_score >= 50:
            return LeadCategory.CUSTOMER
        else:
            return LeadCategory.UNKNOWN
    
    def _analyze_mlm_signals(self, profile: dict) -> NetworkMarketingSignals:
        """Analyze profile for MLM-relevant signals."""
        signals = NetworkMarketingSignals()
        bio = (profile.get("bio") or "").lower()
        
        # Check entrepreneur keywords
        signals.entrepreneurial_keywords = [
            kw for kw in ENTREPRENEUR_KEYWORDS
            if kw.lower() in bio
        ]
        signals.side_hustle_interest = any(
            phrase in bio for phrase in ["side hustle", "extra income", "passive income"]
        )
        signals.financial_freedom_mentions = "financial freedom" in bio or "freedom" in bio
        signals.leadership_indicators = any(
            word in bio for word in ["leader", "mentor", "coach", "team"]
        )
        
        # Check health/wellness
        signals.health_wellness_interest = any(
            kw.lower() in bio for kw in HEALTH_WELLNESS_KEYWORDS
        )
        
        # Check competitors
        for competitor in MLM_COMPETITOR_KEYWORDS:
            if competitor in bio:
                signals.already_in_mlm = True
                signals.competitor_affiliated = competitor
                break
        
        # Check anti-MLM
        signals.anti_mlm_sentiment = any(
            kw in bio for kw in ANTI_MLM_KEYWORDS
        )
        
        # Calculate scores
        signals.builder_score = min(100, len(signals.entrepreneurial_keywords) * 15 +
            (20 if signals.side_hustle_interest else 0) +
            (15 if signals.financial_freedom_mentions else 0) +
            (20 if signals.leadership_indicators else 0))
        
        signals.customer_score = min(100,
            (40 if signals.health_wellness_interest else 0) +
            len(signals.product_category_interest) * 10 +
            (30 if signals.lifestyle_fit else 20))
        
        # Determine recommendation
        if signals.builder_score > signals.customer_score + 20:
            signals.recommendation = LeadCategory.BUSINESS_BUILDER
        elif signals.customer_score > signals.builder_score + 20:
            signals.recommendation = LeadCategory.CUSTOMER
        elif signals.builder_score >= 50 and signals.customer_score >= 50:
            signals.recommendation = LeadCategory.HYBRID
        else:
            signals.recommendation = LeadCategory.UNKNOWN
        
        return signals
    
    def _analyze_mlm_signals_from_lead(self, lead: HunterLead) -> NetworkMarketingSignals:
        """Analyze lead object for MLM signals."""
        # Combine all text sources
        text_sources = lead.interests + lead.talking_points
        for profile in lead.social_profiles:
            if profile.bio:
                text_sources.append(profile.bio)
        
        combined_text = " ".join(text_sources).lower()
        
        signals = NetworkMarketingSignals()
        
        # Analyze combined text
        signals.entrepreneurial_keywords = [
            kw for kw in ENTREPRENEUR_KEYWORDS
            if kw.lower() in combined_text
        ]
        signals.health_wellness_interest = any(
            kw.lower() in combined_text for kw in HEALTH_WELLNESS_KEYWORDS
        )
        
        # Check for MLM involvement
        for competitor in MLM_COMPETITOR_KEYWORDS:
            if competitor in combined_text:
                signals.already_in_mlm = True
                signals.competitor_affiliated = competitor
                break
        
        signals.anti_mlm_sentiment = any(
            kw in combined_text for kw in ANTI_MLM_KEYWORDS
        )
        
        # Calculate scores
        signals.builder_score = min(100, 
            len(signals.entrepreneurial_keywords) * 15 + 20)
        signals.customer_score = min(100,
            (50 if signals.health_wellness_interest else 20) + 30)
        
        return signals
    
    # ============= Helper Methods =============
    
    def _create_lead_from_profile(
        self,
        profile: dict,
        source: LeadSource,
        discovered_via: str
    ) -> HunterLead:
        """Create HunterLead from profile data."""
        lead = HunterLead(
            source=source,
            source_url=profile.get("profile_url"),
            discovered_via=discovered_via,
            first_name=profile.get("first_name") or profile.get("display_name", "").split()[0] if profile.get("display_name") else None,
            raw_data=profile
        )
        
        # Add social profile
        social = SocialProfile(
            platform=source,
            username=profile.get("username", ""),
            profile_url=profile.get("profile_url", ""),
            display_name=profile.get("display_name"),
            bio=profile.get("bio"),
            followers=profile.get("followers"),
            following=profile.get("following"),
            posts_count=profile.get("posts_count"),
            engagement_rate=profile.get("engagement_rate"),
            is_business_account=profile.get("is_business_account", False),
            is_verified=profile.get("is_verified", False)
        )
        lead.social_profiles.append(social)
        
        return lead
    
    def _extract_interests(self, profile: dict) -> list[str]:
        """Extract interests from profile."""
        interests = []
        
        bio = profile.get("bio", "")
        hashtags = profile.get("recent_hashtags", [])
        
        # Extract from hashtags
        interests.extend(hashtags)
        
        # Extract from bio
        for keyword in ENTREPRENEUR_KEYWORDS + HEALTH_WELLNESS_KEYWORDS:
            if keyword.lower() in bio.lower():
                interests.append(keyword)
        
        return list(set(interests))
    
    def _generate_talking_points(
        self,
        profile: dict,
        signals: NetworkMarketingSignals
    ) -> list[str]:
        """Generate conversation talking points."""
        points = []
        
        bio = profile.get("bio", "")
        
        if signals.entrepreneurial_keywords:
            points.append(f"I noticed you're interested in {signals.entrepreneurial_keywords[0]} - me too!")
        
        if signals.health_wellness_interest:
            points.append("I see we share a passion for health and wellness")
        
        if signals.leadership_indicators:
            points.append("Your leadership mindset really stands out")
        
        if profile.get("engagement_rate", 0) > 0.05:
            points.append("Your content really resonates with people!")
        
        return points[:3]
    
    def _generate_warm_market_talking_points(
        self,
        friend: dict,
        strength: int
    ) -> list[str]:
        """Generate talking points for warm market contacts."""
        points = []
        
        if strength >= 8:
            points.append("It's been a while! We should catch up")
        elif strength >= 5:
            points.append("I've been thinking about you recently")
        
        interests = friend.get("interests", [])
        if "fitness" in interests:
            points.append("How's your fitness journey going?")
        if "business" in interests:
            points.append("I'd love to hear about what you're working on")
        
        return points
    
    def _generate_linkedin_talking_points(self, profile: dict) -> list[str]:
        """Generate talking points for LinkedIn contacts."""
        points = []
        
        headline = profile.get("headline", "")
        
        if "entrepreneur" in headline.lower():
            points.append("I admire your entrepreneurial spirit")
        
        if profile.get("skills"):
            points.append(f"Your expertise in {profile['skills'][0]} is impressive")
        
        return points
    
    def _deduplicate_leads(self, leads: list[HunterLead]) -> list[HunterLead]:
        """Remove duplicate leads based on email or social profile."""
        seen = set()
        unique = []
        
        for lead in leads:
            # Create unique key
            keys = []
            if lead.email:
                keys.append(f"email:{lead.email}")
            for profile in lead.social_profiles:
                keys.append(f"{profile.platform}:{profile.username}")
            
            key = hashlib.md5("|".join(sorted(keys)).encode()).hexdigest()
            
            if key not in seen:
                seen.add(key)
                unique.append(lead)
        
        return unique
    
    async def _filter_existing_leads(
        self,
        leads: list[HunterLead]
    ) -> list[HunterLead]:
        """Filter out leads that already exist in database."""
        if not self._lead_repo:
            return leads
        
        new_leads = []
        for lead in leads:
            # Check by email
            if lead.email:
                existing = await self._lead_repo.get_by_email(lead.email)
                if existing:
                    continue
            
            new_leads.append(lead)
        
        return new_leads
    
    def _count_by_field(
        self,
        leads: list[HunterLead],
        field: str
    ) -> dict[str, int]:
        """Count leads by a specific field."""
        counts = {}
        for lead in leads:
            value = getattr(lead, field, None)
            if value:
                key = value.value if hasattr(value, "value") else str(value)
                counts[key] = counts.get(key, 0) + 1
        return counts
    
    def _extract_common_characteristics(
        self,
        leads: list[dict]
    ) -> dict:
        """Extract common characteristics from leads."""
        return {
            "count": len(leads),
            "avg_engagement": sum(
                l.get("engagement_rate", 0) for l in leads
            ) / len(leads) if leads else 0
        }
    
    def _analyze_linkedin_signals(self, profile: dict) -> dict:
        """Analyze LinkedIn profile for signals."""
        return {
            "is_entrepreneur": "entrepreneur" in profile.get("headline", "").lower(),
            "is_sales": "sales" in profile.get("job_title", "").lower(),
            "has_network": (profile.get("connections_count", 0) > 500)
        }

