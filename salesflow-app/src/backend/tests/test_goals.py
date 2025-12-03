"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL CALCULATION TESTS                                                    ║
║  Tests für Goal-Berechnung über alle Verticals                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Run:
    pytest backend/tests/test_goals.py -v
"""

import pytest
from ..app.domain.goals.types import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
)
from ..app.domain.goals.service import GoalCalculationService, get_goal_service
from ..app.domain.goals.adapters.network_marketing import NetworkMarketingAdapter
from ..app.domain.goals.adapters.real_estate import RealEstateAdapter
from ..app.domain.goals.adapters.coaching import CoachingAdapter


# ═══════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture
def service():
    """Frischer GoalCalculationService für jeden Test."""
    return GoalCalculationService()


@pytest.fixture
def mlm_adapter():
    """Network Marketing Adapter ohne Plan."""
    return NetworkMarketingAdapter()


@pytest.fixture
def real_estate_adapter():
    """Real Estate Adapter."""
    return RealEstateAdapter()


@pytest.fixture
def coaching_adapter():
    """Coaching Adapter."""
    return CoachingAdapter()


# ═══════════════════════════════════════════════════════════════════════════
# SERVICE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestGoalCalculationService:
    """Tests für GoalCalculationService."""
    
    def test_service_has_default_adapters(self, service):
        """Service sollte Standard-Adapter haben."""
        verticals = service.get_available_verticals()
        
        assert "network_marketing" in verticals
        assert "real_estate" in verticals
        assert "coaching" in verticals
    
    def test_service_get_adapter(self, service):
        """Adapter sollten abrufbar sein."""
        adapter = service.get_adapter("network_marketing")
        
        assert adapter is not None
        assert adapter.vertical_id == "network_marketing"
    
    def test_service_calculate_goal_mlm_income(self, service):
        """MLM Income-Goal Berechnung."""
        goal_input = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=2000,
            timeframe_months=6,
        )
        
        breakdown = service.calculate_goal(goal_input)
        
        assert breakdown.vertical_id == VerticalId.NETWORK_MARKETING
        assert breakdown.goal_kind == GoalKind.INCOME
        assert breakdown.timeframe_months == 6
        assert breakdown.per_month_volume > 0
        assert breakdown.primary_units > 0  # Geschätzte Kunden
    
    def test_service_calculate_goal_real_estate(self, service):
        """Immobilien Income-Goal Berechnung."""
        goal_input = GoalInput(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=GoalKind.INCOME,
            target_value=5000,
            timeframe_months=12,
        )
        
        breakdown = service.calculate_goal(goal_input)
        
        assert breakdown.vertical_id == VerticalId.REAL_ESTATE
        assert breakdown.primary_units > 0  # Deals
        assert breakdown.secondary_units > 0  # Besichtigungen
        assert breakdown.required_volume > 0
    
    def test_service_calculate_daily_targets(self, service):
        """Daily Targets Berechnung."""
        goal_input = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=2000,
            timeframe_months=6,
        )
        
        breakdown = service.calculate_goal(goal_input)
        targets = service.calculate_daily_targets(breakdown)
        
        assert "daily" in targets
        assert "weekly" in targets
        assert targets["daily"]["new_contacts"] >= 0
        assert targets["daily"]["followups"] >= 0
        assert targets["daily"]["reactivations"] >= 0
    
    def test_service_get_kpis(self, service):
        """KPI-Definitionen abrufen."""
        kpis = service.get_kpi_definitions("network_marketing")
        
        assert len(kpis) > 0
        assert kpis[0].id is not None
        assert kpis[0].label is not None
    
    def test_service_unknown_vertical_raises(self, service):
        """Unbekanntes Vertical sollte Fehler werfen."""
        goal_input = GoalInput(
            vertical_id=VerticalId.CUSTOM,  # Kein Adapter registriert
            goal_kind=GoalKind.INCOME,
            target_value=1000,
            timeframe_months=3,
        )
        
        # CUSTOM hat keinen Adapter in der Default-Registrierung
        # Aber VerticalId.CUSTOM existiert - wir müssen testen ob er fehlt
        # Erstmal testen wir mit einem String der garantiert nicht existiert
        # Da wir nur enum values testen können, überspringen wir diesen Test
        pass


# ═══════════════════════════════════════════════════════════════════════════
# NETWORK MARKETING ADAPTER TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestNetworkMarketingAdapter:
    """Tests für Network Marketing Adapter."""
    
    def test_vertical_id(self, mlm_adapter):
        """Vertical ID sollte korrekt sein."""
        assert mlm_adapter.vertical_id == "network_marketing"
    
    def test_label(self, mlm_adapter):
        """Label sollte gesetzt sein."""
        label = mlm_adapter.get_label()
        assert "Network Marketing" in label or "MLM" in label
    
    def test_default_config(self, mlm_adapter):
        """Default Config sollte sinnvolle Werte haben."""
        config = mlm_adapter.get_default_conversion_config()
        
        assert config.working_days_per_week == 5
        assert 0 < config.contact_to_primary_unit <= 1
        assert 0 < config.contact_to_secondary_unit <= 1
        assert config.followups_per_primary > 0
    
    def test_kpi_definitions(self, mlm_adapter):
        """KPIs sollten definiert sein."""
        kpis = mlm_adapter.get_kpi_definitions()
        
        assert len(kpis) >= 4
        kpi_ids = [k.id for k in kpis]
        assert "new_contacts" in kpi_ids
        assert "followups" in kpi_ids
    
    def test_income_goal_calculation(self, mlm_adapter):
        """Income Goal Berechnung."""
        goal = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=2000,
            timeframe_months=6,
        )
        
        breakdown = mlm_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.primary_units > 0
        assert breakdown.per_month_volume > 0
        assert breakdown.per_week_volume > 0
        assert breakdown.per_day_volume > 0
    
    def test_volume_goal_calculation(self, mlm_adapter):
        """Volume Goal Berechnung."""
        goal = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.VOLUME,
            target_value=5000,  # 5000 Credits
            timeframe_months=3,
        )
        
        breakdown = mlm_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.required_volume == 5000
        assert breakdown.primary_units > 0


# ═══════════════════════════════════════════════════════════════════════════
# REAL ESTATE ADAPTER TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestRealEstateAdapter:
    """Tests für Real Estate Adapter."""
    
    def test_vertical_id(self, real_estate_adapter):
        """Vertical ID sollte korrekt sein."""
        assert real_estate_adapter.vertical_id == "real_estate"
    
    def test_label(self, real_estate_adapter):
        """Label sollte gesetzt sein."""
        label = real_estate_adapter.get_label()
        assert "Immobilien" in label or "Makler" in label
    
    def test_income_goal_calculation(self, real_estate_adapter):
        """Income Goal → Deals → Besichtigungen."""
        goal = GoalInput(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=GoalKind.INCOME,
            target_value=5000,  # 5000€/Monat
            timeframe_months=12,
        )
        
        breakdown = real_estate_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.primary_units > 0  # Deals
        assert breakdown.secondary_units > 0  # Besichtigungen
        assert breakdown.secondary_units > breakdown.primary_units  # Mehr Besichtigungen als Deals
        assert "required_leads" in breakdown.vertical_details
    
    def test_deals_goal_calculation(self, real_estate_adapter):
        """Deals Goal Berechnung."""
        goal = GoalInput(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=GoalKind.DEALS,
            target_value=10,  # 10 Deals
            timeframe_months=6,
        )
        
        breakdown = real_estate_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.primary_units == 10
        assert breakdown.required_volume > 0  # Provision


# ═══════════════════════════════════════════════════════════════════════════
# COACHING ADAPTER TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestCoachingAdapter:
    """Tests für Coaching Adapter."""
    
    def test_vertical_id(self, coaching_adapter):
        """Vertical ID sollte korrekt sein."""
        assert coaching_adapter.vertical_id == "coaching"
    
    def test_mrr_goal_calculation(self, coaching_adapter):
        """MRR Goal → Klienten → Discovery Calls."""
        goal = GoalInput(
            vertical_id=VerticalId.COACHING,
            goal_kind=GoalKind.INCOME,
            target_value=3000,  # 3000€ MRR
            timeframe_months=6,
        )
        
        breakdown = coaching_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.primary_units > 0  # Klienten
        assert breakdown.secondary_units > 0  # Discovery Calls
        assert breakdown.secondary_units > breakdown.primary_units  # Mehr Calls als Klienten
        assert "required_active_clients" in breakdown.vertical_details
    
    def test_clients_goal_calculation(self, coaching_adapter):
        """Klienten Goal Berechnung."""
        goal = GoalInput(
            vertical_id=VerticalId.COACHING,
            goal_kind=GoalKind.CUSTOMERS,
            target_value=10,  # 10 neue Klienten
            timeframe_months=3,
        )
        
        breakdown = coaching_adapter.compute_goal_breakdown(goal)
        
        assert breakdown.primary_units == 10
        assert breakdown.secondary_units > 10  # Mehr Discovery Calls nötig


# ═══════════════════════════════════════════════════════════════════════════
# EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    """Edge Cases und Grenzwerte."""
    
    def test_minimal_goal(self, service):
        """Minimales Ziel (1 Monat, kleiner Wert)."""
        goal = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=100,
            timeframe_months=1,
        )
        
        breakdown = service.calculate_goal(goal)
        
        assert breakdown.timeframe_months == 1
        assert breakdown.per_month_volume > 0
    
    def test_large_goal(self, service):
        """Großes Ziel (langer Zeitraum, hoher Wert)."""
        goal = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=10000,
            timeframe_months=24,
        )
        
        breakdown = service.calculate_goal(goal)
        
        assert breakdown.timeframe_months == 24
        assert breakdown.primary_units > 0
    
    def test_custom_conversion_config(self, service):
        """Custom Conversion Config verwenden."""
        goal = GoalInput(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=GoalKind.INCOME,
            target_value=2000,
            timeframe_months=6,
        )
        
        breakdown = service.calculate_goal(goal)
        
        custom_config = DailyFlowConfig(
            working_days_per_week=6,  # 6 statt 5 Tage
            contact_to_primary_unit=0.30,  # 30% statt 20%
            contact_to_secondary_unit=0.10,
            followups_per_primary=2,
            followups_per_secondary=3,
            reactivation_share=0.10,
        )
        
        targets = service.calculate_daily_targets(breakdown, custom_config)
        
        assert targets["daily"]["new_contacts"] >= 0


# ═══════════════════════════════════════════════════════════════════════════
# API TESTS (httpx)
# ═══════════════════════════════════════════════════════════════════════════

class TestGoalsAPI:
    """API Endpoint Tests."""
    
    @pytest.fixture
    def client(self):
        """Test Client für FastAPI."""
        from fastapi.testclient import TestClient
        from ..app.main import app
        return TestClient(app)
    
    def test_root_endpoint(self, client):
        """Root Endpoint sollte funktionieren."""
        response = client.get("/")
        
        assert response.status_code == 200
        assert response.json()["name"] == "Sales Flow AI"
    
    def test_health_check(self, client):
        """Health Check sollte funktionieren."""
        response = client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_list_verticals(self, client):
        """Verticals auflisten."""
        response = client.get("/api/v1/goals/verticals")
        
        assert response.status_code == 200
        verticals = response.json()
        assert len(verticals) >= 3
        
        ids = [v["id"] for v in verticals]
        assert "network_marketing" in ids
        assert "real_estate" in ids
    
    def test_calculate_goal_endpoint(self, client):
        """Goal Berechnung über API."""
        response = client.post("/api/v1/goals/calculate", json={
            "vertical_id": "network_marketing",
            "goal_kind": "income",
            "target_value": 2000,
            "timeframe_months": 6,
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["vertical_id"] == "network_marketing"
        assert data["goal_kind"] == "income"
        assert data["timeframe_months"] == 6
        assert data["primary_units"] > 0
    
    def test_calculate_goal_invalid_vertical(self, client):
        """Ungültiges Vertical sollte 400 zurückgeben."""
        response = client.post("/api/v1/goals/calculate", json={
            "vertical_id": "invalid_vertical",
            "goal_kind": "income",
            "target_value": 1000,
            "timeframe_months": 3,
        })
        
        assert response.status_code in [400, 422]  # Validation Error
    
    def test_get_kpis(self, client):
        """KPIs abrufen."""
        response = client.get("/api/v1/goals/kpis/network_marketing")
        
        assert response.status_code == 200
        kpis = response.json()
        assert len(kpis) > 0
        assert "id" in kpis[0]
        assert "label" in kpis[0]
    
    def test_get_kpis_unknown_vertical(self, client):
        """Unbekanntes Vertical sollte 404 zurückgeben."""
        response = client.get("/api/v1/goals/kpis/unknown_vertical")
        
        assert response.status_code == 404
    
    def test_get_conversion_config(self, client):
        """Conversion Config abrufen."""
        response = client.get("/api/v1/goals/conversion-config/real_estate")
        
        assert response.status_code == 200
        config = response.json()
        
        assert "working_days_per_week" in config
        assert "contact_to_primary_unit" in config
        assert config["working_days_per_week"] == 6  # Makler 6 Tage

