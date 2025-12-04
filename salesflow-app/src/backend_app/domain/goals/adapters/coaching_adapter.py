"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - COACHING ADAPTER                                         ║
║  Goal Engine für Coaches & Berater                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Besonderheiten Coaching:
- High-Ticket Verkauf
- Discovery Calls als Qualifizierung
- MRR (Monthly Recurring Revenue) als wichtige Metrik
- Längere Kundenbeziehungen
"""

from ..vertical_adapter import BaseVerticalAdapter
from ..types import (
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    KpiDefinition,
    VerticalId,
    GoalType,
)


class CoachingAdapter(BaseVerticalAdapter):
    """
    Adapter für Coaches, Berater und Trainer.
    
    Unterstützte Zieltypen:
    - income: Umsatz-/MRR-Ziel
    - customers: Anzahl Klienten
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # Konfiguration
    # ─────────────────────────────────────────────────────────────────────────
    
    # Durchschnittswerte High-Ticket Coaching
    AVG_CLIENT_VALUE = 3_000        # € pro Klient (Programm/Paket)
    AVG_MRR_PER_CLIENT = 500        # € monatlich bei Retainer
    AVG_CLIENT_LIFETIME = 6         # Monate
    
    # Conversion Rates
    LEAD_TO_DISCOVERY = 0.30        # 30% Leads → Discovery Call
    DISCOVERY_TO_CLIENT = 0.25      # 25% Discovery → Klient
    LEAD_TO_CLIENT = 0.075          # 7.5% End-to-End
    
    # ─────────────────────────────────────────────────────────────────────────
    # Interface Implementation
    # ─────────────────────────────────────────────────────────────────────────
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.COACHING.value
    
    def get_label(self) -> str:
        return "Coaching & Beratung"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """Coaching-typische Konversionsraten"""
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.075,      # 7.5% Lead → Klient
            followups_per_primary=6.0,          # 6 Follow-ups pro Abschluss
            reactivation_share=0.10,            # 10% Reaktivierungen
            has_team_building=False,
            has_appointments=True,              # Discovery Calls
            appointment_conversion=0.25,        # 25% Discovery → Klient
        )
    
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """KPIs für Coaching Dashboard"""
        return [
            KpiDefinition(
                id="clients",
                label="Klienten",
                emoji="👤",
                unit="Anzahl",
                description="Aktive Coaching-Klienten",
                is_primary=True,
                aggregation="sum",
                period="total",
            ),
            KpiDefinition(
                id="mrr",
                label="MRR",
                emoji="💰",
                unit="€",
                description="Monthly Recurring Revenue",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="discovery_calls",
                label="Discovery Calls",
                emoji="📞",
                unit="Anzahl",
                aggregation="sum",
                period="weekly",
            ),
            KpiDefinition(
                id="leads",
                label="Leads",
                emoji="🎯",
                unit="Anzahl",
                aggregation="sum",
                period="weekly",
            ),
            KpiDefinition(
                id="sessions",
                label="Sessions",
                emoji="🎙️",
                unit="Anzahl",
                description="Coaching Sessions pro Woche",
                aggregation="sum",
                period="weekly",
            ),
            KpiDefinition(
                id="client_lifetime",
                label="Ø Kundendauer",
                emoji="📊",
                unit="Monate",
                aggregation="avg",
                period="total",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Coaching Goal Breakdown.
        
        Logik:
        1. Umsatz-Ziel → Anzahl Klienten
        2. Klienten → Discovery Calls
        3. Calls → Leads/Kontakte
        """
        
        if goal_input.goal_type == GoalType.INCOME:
            return self._breakdown_from_income(goal_input)
        elif goal_input.goal_type == GoalType.CUSTOMERS:
            return self._breakdown_from_clients(goal_input)
        else:
            return self._breakdown_from_income(goal_input)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private: Breakdown-Berechnungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def _breakdown_from_income(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Umsatz-/MRR-Ziel"""
        target_income = goal_input.target_value or 5000  # €/Monat
        
        # Umsatz → Anzahl neue Klienten nötig
        # Bei High-Ticket: Einmalzahlung, ansonsten MRR
        clients_needed = target_income / self.AVG_CLIENT_VALUE
        total_clients = clients_needed * goal_input.timeframe_months
        
        # Discovery Calls nötig
        discovery_calls = total_clients / self.DISCOVERY_TO_CLIENT
        
        # Leads nötig
        leads_needed = discovery_calls / self.LEAD_TO_DISCOVERY
        
        monthly_clients = total_clients / goal_input.timeframe_months
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_type=GoalType.INCOME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Klienten",
            primary_units=total_clients,
            primary_units_per_month=monthly_clients,
            primary_units_per_week=monthly_clients / 4.33,
            secondary_units={
                "discovery_calls": round(discovery_calls),
                "leads": round(leads_needed),
                "total_revenue": round(total_clients * self.AVG_CLIENT_VALUE),
            },
            target_income_monthly=target_income,
            assumptions={
                "avg_client_value": self.AVG_CLIENT_VALUE,
                "discovery_to_client_rate": self.DISCOVERY_TO_CLIENT,
                "lead_to_discovery_rate": self.LEAD_TO_DISCOVERY,
            },
            confidence=0.75,
        )
    
    def _breakdown_from_clients(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Klienten-Ziel"""
        target_clients = goal_input.target_value or 5
        current = goal_input.current_value or 0
        needed = max(0, target_clients - current)
        
        monthly_clients = needed / goal_input.timeframe_months
        discovery_calls = needed / self.DISCOVERY_TO_CLIENT
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_type=GoalType.CUSTOMERS,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Klienten",
            primary_units=needed,
            primary_units_per_month=monthly_clients,
            primary_units_per_week=monthly_clients / 4.33,
            secondary_units={
                "discovery_calls": round(discovery_calls),
                "estimated_revenue": round(needed * self.AVG_CLIENT_VALUE),
            },
            confidence=0.9,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Coaching-spezifische Erweiterungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_daily_flow_targets(
        self,
        goal_breakdown: GoalBreakdown,
        config: DailyFlowConfig | None = None,
    ) -> DailyFlowTargets:
        """
        Coaching-spezifische Daily Flow Berechnung.
        
        Berücksichtigt:
        - Discovery Calls als Zwischen-Schritt
        - Content Marketing / Lead Nurturing wichtiger
        """
        if config is None:
            config = self.get_default_conversion_config()
        
        # Basis-Berechnung
        targets = super().compute_daily_flow_targets(goal_breakdown, config)
        
        # Coaching-Ergänzung: Discovery Calls
        secondary = goal_breakdown.secondary_units or {}
        discovery_total = secondary.get("discovery_calls", 0)
        
        if discovery_total > 0:
            weeks = goal_breakdown.timeframe_months * 4.33
            discovery_per_week = discovery_total / weeks
            targets.appointments = max(1, round(discovery_per_week))
        
        return targets

