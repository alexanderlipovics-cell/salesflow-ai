"""
Tests für den Lead Hunter Service.

Testet:
- Lead Scoring
- Lead Kategorisierung
- MLM Signal Detection
- Hashtag Scanning (Mock)
"""
import pytest
from uuid import uuid4
from datetime import datetime

from app.models.hunter_models import (
    LeadSource,
    LeadTemperature,
    LeadCategory,
    LeadScoreFactors,
    LeadScore,
    HunterLead,
    SocialProfile,
    HashtagScanConfig,
    HunterConfig,
    NetworkMarketingSignals,
)
from app.services.hunter_service_advanced import (
    LeadHunterAdvancedService,
    ENTREPRENEUR_KEYWORDS,
    HEALTH_WELLNESS_KEYWORDS,
    MLM_COMPETITOR_KEYWORDS,
)


# ============= Fixtures =============

@pytest.fixture
def hunter_service():
    """Erstellt einen Test Hunter Service."""
    return LeadHunterAdvancedService()


@pytest.fixture
def sample_profile():
    """Erstellt ein Sample Profile."""
    return {
        "username": "fitness_coach_anna",
        "display_name": "Anna Schmidt",
        "bio": "Entrepreneur | Health Coach | Helping moms get fit 💪 | DM for coaching",
        "followers": 5000,
        "following": 500,
        "posts_count": 200,
        "engagement_rate": 0.04,
        "is_business_account": True,
        "profile_url": "https://instagram.com/fitness_coach_anna"
    }


@pytest.fixture
def sample_lead():
    """Erstellt einen Sample Lead."""
    return HunterLead(
        source=LeadSource.INSTAGRAM,
        first_name="Anna",
        last_name="Schmidt",
        interests=["fitness", "health", "entrepreneur"],
        talking_points=["Loves fitness", "Entrepreneur mindset"]
    )


# ============= Model Tests =============

class TestLeadHunterModels:
    """Tests für die Hunter Models."""
    
    def test_lead_source_values(self):
        """Testet Lead Source Werte."""
        assert LeadSource.INSTAGRAM.value == "instagram"
        assert LeadSource.LINKEDIN.value == "linkedin"
        assert LeadSource.WARM_MARKET.value == "warm_market"
    
    def test_lead_temperature_values(self):
        """Testet Lead Temperature Werte."""
        assert LeadTemperature.COLD.value == "cold"
        assert LeadTemperature.HOT.value == "hot"
        assert LeadTemperature.BURNING.value == "burning"
    
    def test_lead_category_values(self):
        """Testet Lead Category Werte."""
        assert LeadCategory.CUSTOMER.value == "customer"
        assert LeadCategory.BUSINESS_BUILDER.value == "business_builder"
        assert LeadCategory.HYBRID.value == "hybrid"
    
    def test_lead_score_factors_total(self):
        """Testet Lead Score Factors Berechnung."""
        factors = LeadScoreFactors(
            profile_completeness=20,
            engagement_frequency=15,
            interest_signals=20,
            ideal_customer_fit=15
        )
        
        assert factors.total_score == 70
    
    def test_hunter_lead_creation(self, sample_lead):
        """Testet HunterLead Erstellung."""
        assert sample_lead.source == LeadSource.INSTAGRAM
        assert sample_lead.first_name == "Anna"
        assert len(sample_lead.interests) == 3
    
    def test_social_profile_creation(self):
        """Testet SocialProfile Erstellung."""
        profile = SocialProfile(
            platform=LeadSource.INSTAGRAM,
            username="test_user",
            profile_url="https://instagram.com/test_user",
            followers=1000,
            engagement_rate=0.03
        )
        
        assert profile.platform == LeadSource.INSTAGRAM
        assert profile.followers == 1000


# ============= Keywords Tests =============

class TestKeywords:
    """Tests für Keywords."""
    
    def test_entrepreneur_keywords_exist(self):
        """Testet, dass Entrepreneur Keywords existieren."""
        assert len(ENTREPRENEUR_KEYWORDS) > 0
        assert "entrepreneur" in ENTREPRENEUR_KEYWORDS
        assert "financial freedom" in ENTREPRENEUR_KEYWORDS
    
    def test_health_wellness_keywords_exist(self):
        """Testet, dass Health/Wellness Keywords existieren."""
        assert len(HEALTH_WELLNESS_KEYWORDS) > 0
        assert "fitness" in HEALTH_WELLNESS_KEYWORDS
        assert "health" in HEALTH_WELLNESS_KEYWORDS
    
    def test_mlm_competitor_keywords_exist(self):
        """Testet, dass MLM Competitor Keywords existieren."""
        assert len(MLM_COMPETITOR_KEYWORDS) > 0
        assert "herbalife" in MLM_COMPETITOR_KEYWORDS


# ============= MLM Signal Detection Tests =============

class TestMLMSignalDetection:
    """Tests für MLM Signal Detection."""
    
    def test_analyze_mlm_signals_entrepreneur(self, hunter_service, sample_profile):
        """Testet Erkennung von Entrepreneur Signalen."""
        signals = hunter_service._analyze_mlm_signals(sample_profile)
        
        assert "entrepreneur" in [kw.lower() for kw in signals.entrepreneurial_keywords]
        assert signals.builder_score > 0
    
    def test_analyze_mlm_signals_health_wellness(self, hunter_service, sample_profile):
        """Testet Erkennung von Health/Wellness Signalen."""
        signals = hunter_service._analyze_mlm_signals(sample_profile)
        
        assert signals.health_wellness_interest is True
        assert signals.customer_score > 0
    
    def test_analyze_mlm_signals_competitor(self, hunter_service):
        """Testet Erkennung von Competitor Signalen."""
        profile = {
            "bio": "Herbalife Independent Distributor | Helping people get healthy"
        }
        
        signals = hunter_service._analyze_mlm_signals(profile)
        
        assert signals.already_in_mlm is True
        assert signals.competitor_affiliated == "herbalife"
    
    def test_analyze_mlm_signals_anti_mlm(self, hunter_service):
        """Testet Erkennung von Anti-MLM Signalen."""
        profile = {
            "bio": "No pyramid schemes please! Anti-MLM activist 🙅‍♀️"
        }
        
        signals = hunter_service._analyze_mlm_signals(profile)
        
        assert signals.anti_mlm_sentiment is True
    
    def test_recommendation_builder(self, hunter_service):
        """Testet Builder Empfehlung."""
        profile = {
            "bio": "Entrepreneur | CEO | Financial Freedom | Looking for side hustle opportunities"
        }
        
        signals = hunter_service._analyze_mlm_signals(profile)
        
        # Hoher Builder Score erwartet
        assert signals.builder_score > signals.customer_score


# ============= Lead Scoring Tests =============

class TestLeadScoring:
    """Tests für Lead Scoring."""
    
    @pytest.mark.asyncio
    async def test_score_lead_profile_completeness(self, hunter_service, sample_lead):
        """Testet Profile Completeness Scoring."""
        sample_lead.email = "anna@example.com"
        sample_lead.phone = "+49123456789"
        
        score = await hunter_service._score_lead(sample_lead)
        
        assert score.factors.profile_completeness > 0
    
    @pytest.mark.asyncio
    async def test_score_lead_interest_signals(self, hunter_service, sample_lead):
        """Testet Interest Signals Scoring."""
        sample_lead.interests = ["entrepreneur", "fitness", "financial freedom"]
        
        score = await hunter_service._score_lead(sample_lead)
        
        assert score.factors.interest_signals > 0
    
    @pytest.mark.asyncio
    async def test_score_lead_engagement(self, hunter_service, sample_lead):
        """Testet Engagement Scoring."""
        sample_lead.social_profiles = [
            SocialProfile(
                platform=LeadSource.INSTAGRAM,
                username="test",
                profile_url="https://instagram.com/test",
                engagement_rate=0.06  # High engagement
            )
        ]
        
        score = await hunter_service._score_lead(sample_lead)
        
        assert score.factors.engagement_frequency > 0
    
    @pytest.mark.asyncio
    async def test_temperature_determination(self, hunter_service):
        """Testet Temperature Bestimmung."""
        assert hunter_service._determine_temperature(85) == LeadTemperature.BURNING
        assert hunter_service._determine_temperature(70) == LeadTemperature.HOT
        assert hunter_service._determine_temperature(55) == LeadTemperature.WARM
        assert hunter_service._determine_temperature(40) == LeadTemperature.COOL
        assert hunter_service._determine_temperature(20) == LeadTemperature.COLD


# ============= Lead Categorization Tests =============

class TestLeadCategorization:
    """Tests für Lead Kategorisierung."""
    
    @pytest.mark.asyncio
    async def test_categorize_as_builder(self, hunter_service):
        """Testet Kategorisierung als Builder."""
        lead = HunterLead(
            source=LeadSource.INSTAGRAM,
            interests=["entrepreneur", "financial freedom", "business", "leadership"],
            talking_points=["Side hustle interest"]
        )
        
        category = await hunter_service._categorize_lead(lead)
        
        assert category in [LeadCategory.BUSINESS_BUILDER, LeadCategory.HYBRID, LeadCategory.UNKNOWN]
    
    @pytest.mark.asyncio
    async def test_categorize_as_customer(self, hunter_service):
        """Testet Kategorisierung als Customer."""
        lead = HunterLead(
            source=LeadSource.INSTAGRAM,
            interests=["fitness", "health", "wellness", "nutrition"],
            talking_points=[]
        )
        
        category = await hunter_service._categorize_lead(lead)
        
        assert category in [LeadCategory.CUSTOMER, LeadCategory.UNKNOWN]


# ============= Helper Function Tests =============

class TestHelperFunctions:
    """Tests für Helper Functions."""
    
    def test_extract_interests(self, hunter_service, sample_profile):
        """Testet Interest Extraktion."""
        interests = hunter_service._extract_interests(sample_profile)
        
        assert len(interests) > 0
    
    def test_generate_talking_points(self, hunter_service, sample_profile):
        """Testet Talking Points Generierung."""
        signals = hunter_service._analyze_mlm_signals(sample_profile)
        
        points = hunter_service._generate_talking_points(sample_profile, signals)
        
        assert len(points) > 0
        assert len(points) <= 3  # Max 3 points
    
    def test_create_lead_from_profile(self, hunter_service, sample_profile):
        """Testet Lead Erstellung aus Profile."""
        lead = hunter_service._create_lead_from_profile(
            sample_profile,
            source=LeadSource.INSTAGRAM,
            discovered_via="hashtag:#fitness"
        )
        
        assert lead.source == LeadSource.INSTAGRAM
        assert lead.discovered_via == "hashtag:#fitness"
        assert len(lead.social_profiles) == 1
    
    def test_deduplicate_leads(self, hunter_service):
        """Testet Lead Deduplizierung."""
        lead1 = HunterLead(
            source=LeadSource.INSTAGRAM,
            email="test@example.com"
        )
        lead2 = HunterLead(
            source=LeadSource.INSTAGRAM,
            email="test@example.com"  # Duplikat
        )
        lead3 = HunterLead(
            source=LeadSource.INSTAGRAM,
            email="other@example.com"
        )
        
        unique = hunter_service._deduplicate_leads([lead1, lead2, lead3])
        
        assert len(unique) == 2


# ============= Config Tests =============

class TestHunterConfig:
    """Tests für Hunter Configuration."""
    
    def test_hashtag_scan_config(self):
        """Testet Hashtag Scan Config."""
        config = HashtagScanConfig(
            hashtags=["fitness", "health", "entrepreneur"],
            platforms=[LeadSource.INSTAGRAM],
            min_followers=100,
            max_followers=50000
        )
        
        assert len(config.hashtags) == 3
        assert config.min_followers == 100
    
    def test_hunter_config(self):
        """Testet Hunter Config."""
        config = HunterConfig(
            user_id=uuid4(),
            auto_score=True,
            auto_categorize=True,
            min_score=40
        )
        
        assert config.auto_score is True
        assert config.min_score == 40


# ============= Integration Tests =============

class TestLeadHunterIntegration:
    """Integration Tests."""
    
    def test_passes_hashtag_filters(self, hunter_service, sample_profile):
        """Testet Hashtag Filter."""
        config = HashtagScanConfig(
            hashtags=["fitness"],
            min_followers=100,
            max_followers=10000,
            min_engagement_rate=0.02
        )
        
        passes = hunter_service._passes_hashtag_filters(sample_profile, config)
        
        assert passes is True
    
    def test_fails_hashtag_filters_too_many_followers(self, hunter_service, sample_profile):
        """Testet Filter Fail bei zu vielen Followern."""
        config = HashtagScanConfig(
            hashtags=["fitness"],
            min_followers=100,
            max_followers=1000  # Sample hat 5000
        )
        
        passes = hunter_service._passes_hashtag_filters(sample_profile, config)
        
        assert passes is False
    
    def test_relationship_strength_calculation(self, hunter_service):
        """Testet Relationship Strength Berechnung."""
        friend = {
            "mutual_friends": 150,
            "last_interaction": datetime.now()
        }
        
        strength = hunter_service._calculate_relationship_strength(friend)
        
        # Hohe mutual friends + recent interaction = hoher Score
        assert strength >= 7


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

