"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - MLM / NETWORK MARKETING ADAPTER                          ║
║  Goal Engine für Direktvertrieb & Teamaufbau                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Besonderheiten MLM:
- Rang-basiertes Einkommenssystem
- Team-Volumen als primäre Metrik
- Partner-Recruiting zusätzlich zu Kundengewinnung
- Compensation Plan Integration
"""

from typing import Optional
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


class MLMAdapter(BaseVerticalAdapter):
    """
    Adapter für Network Marketing / MLM.
    
    Unterstützte Zieltypen:
    - income: Ziel-Einkommen → Berechnet nötigen Rang + Volumen
    - rank: Bestimmten Rang erreichen → Berechnet nötiges Volumen
    - customers: Kunden-Anzahl
    - partners: Partner-Anzahl
    - volume: Team-Volumen
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # Konfiguration (kann pro Company überschrieben werden)
    # ─────────────────────────────────────────────────────────────────────────
    
    # Durchschnittswerte für Schätzungen
    AVG_CUSTOMER_VOLUME = 60        # PV pro Kunde/Monat
    AVG_PARTNER_VOLUME = 100        # PV pro aktiver Partner
    AVG_CUSTOMER_VALUE = 80         # € Umsatz pro Kunde
    
    # Conversion Rates
    CONTACT_TO_CUSTOMER = 0.12      # 12% Kontakte → Kunden
    CONTACT_TO_PARTNER = 0.05       # 5% Kontakte → Partner
    
    # ─────────────────────────────────────────────────────────────────────────
    # Interface Implementation
    # ─────────────────────────────────────────────────────────────────────────
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.NETWORK_MARKETING.value
    
    def get_label(self) -> str:
        return "Network Marketing"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """MLM-typische Konversionsraten"""
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.10,       # 10% Kontakte → Kunde/Partner
            followups_per_primary=4.0,          # 4 Follow-ups pro Abschluss
            reactivation_share=0.15,            # 15% Reaktivierungen
            has_team_building=True,             # MLM hat Teamaufbau
            has_appointments=False,
        )
    
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """KPIs für MLM Dashboard"""
        return [
            KpiDefinition(
                id="team_volume",
                label="Team-Volumen",
                emoji="📊",
                unit="PV",
                description="Gesamtes Gruppenvolumen",
                is_primary=True,
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="personal_volume",
                label="Persönliches Volumen",
                emoji="💎",
                unit="PV",
                description="Eigenes Volumen",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="customers",
                label="Kunden",
                emoji="👥",
                unit="Anzahl",
                aggregation="sum",
                period="total",
            ),
            KpiDefinition(
                id="partners",
                label="Partner",
                emoji="🤝",
                unit="Anzahl",
                aggregation="sum",
                period="total",
            ),
            KpiDefinition(
                id="rank",
                label="Rang",
                emoji="🏆",
                unit="Level",
                aggregation="max",
                period="total",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        MLM Goal Breakdown.
        
        Logik:
        1. Ziel-Einkommen → Nötiger Rang bestimmen
        2. Rang → Benötigtes Gruppenvolumen
        3. Volumen → Anzahl Kunden + Partner schätzen
        """
        
        if goal_input.goal_type == GoalType.INCOME:
            return self._breakdown_from_income(goal_input)
        elif goal_input.goal_type == GoalType.RANK:
            return self._breakdown_from_rank(goal_input)
        elif goal_input.goal_type == GoalType.CUSTOMERS:
            return self._breakdown_from_customers(goal_input)
        elif goal_input.goal_type == GoalType.PARTNERS:
            return self._breakdown_from_partners(goal_input)
        elif goal_input.goal_type == GoalType.VOLUME:
            return self._breakdown_from_volume(goal_input)
        else:
            # Fallback: Behandle als Income
            return self._breakdown_from_income(goal_input)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private: Breakdown-Berechnungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def _breakdown_from_income(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Einkommens-Ziel"""
        target_income = goal_input.target_value or 2000
        
        # Schätzung: Wie viel Volumen für dieses Einkommen?
        # Typische MLM-Formel: Einkommen ≈ Volumen * 0.08 (8% durchschnittliche Provision)
        required_volume = target_income / 0.08
        
        # Volumen aufteilen: 70% Kunden, 30% Partner
        customer_volume = required_volume * 0.7
        partner_volume = required_volume * 0.3
        
        estimated_customers = customer_volume / self.AVG_CUSTOMER_VOLUME
        estimated_partners = partner_volume / self.AVG_PARTNER_VOLUME
        
        # Primary Unit: Kunden (für Daily Flow)
        total_primary = estimated_customers + estimated_partners
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_type=GoalType.INCOME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Kunden & Partner",
            primary_units=total_primary,
            primary_units_per_month=total_primary / goal_input.timeframe_months,
            primary_units_per_week=total_primary / (goal_input.timeframe_months * 4.33),
            secondary_units={
                "customers": round(estimated_customers),
                "partners": round(estimated_partners),
                "team_volume": round(required_volume),
            },
            target_income_monthly=target_income,
            assumptions={
                "avg_customer_volume": self.AVG_CUSTOMER_VOLUME,
                "avg_partner_volume": self.AVG_PARTNER_VOLUME,
                "commission_rate": 0.08,
                "customer_share": 0.7,
            },
            confidence=0.75,  # Schätzung, da ohne Compensation Plan
        )
    
    def _breakdown_from_rank(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Rang-Ziel"""
        # TODO: Integration mit Compensation Plan Service
        # Für jetzt: Placeholder-Werte
        target_rank = goal_input.target_rank_id or "team_leader"
        
        # Typische Rang-Anforderungen (Beispiel)
        rank_requirements = {
            "distributor": {"volume": 100, "partners": 0},
            "team_leader": {"volume": 1000, "partners": 2},
            "manager": {"volume": 5000, "partners": 5},
            "director": {"volume": 15000, "partners": 10},
            "executive": {"volume": 50000, "partners": 20},
        }
        
        req = rank_requirements.get(target_rank, {"volume": 1000, "partners": 2})
        required_volume = req["volume"]
        required_partners = req["partners"]
        
        # Kunden schätzen
        partner_volume = required_partners * self.AVG_PARTNER_VOLUME
        customer_volume = required_volume - partner_volume
        estimated_customers = max(0, customer_volume / self.AVG_CUSTOMER_VOLUME)
        
        total_primary = estimated_customers + required_partners
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_type=GoalType.RANK,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Kunden & Partner",
            primary_units=total_primary,
            primary_units_per_month=total_primary / goal_input.timeframe_months,
            primary_units_per_week=total_primary / (goal_input.timeframe_months * 4.33),
            secondary_units={
                "customers": round(estimated_customers),
                "partners": required_partners,
                "team_volume": required_volume,
            },
            target_rank_name=target_rank,
            assumptions={
                "rank_requirements": req,
            },
            confidence=0.8,
        )
    
    def _breakdown_from_customers(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Kunden-Ziel"""
        target_customers = goal_input.target_value or 20
        current = goal_input.current_value or 0
        needed = max(0, target_customers - current)
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_type=GoalType.CUSTOMERS,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Kunden",
            primary_units=needed,
            primary_units_per_month=needed / goal_input.timeframe_months,
            primary_units_per_week=needed / (goal_input.timeframe_months * 4.33),
            secondary_units={
                "estimated_volume": round(needed * self.AVG_CUSTOMER_VOLUME),
            },
            confidence=0.9,
        )
    
    def _breakdown_from_partners(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Partner-Ziel"""
        target_partners = goal_input.target_value or 5
        current = goal_input.current_value or 0
        needed = max(0, target_partners - current)
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_type=GoalType.PARTNERS,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Partner",
            primary_units=needed,
            primary_units_per_month=needed / goal_input.timeframe_months,
            primary_units_per_week=needed / (goal_input.timeframe_months * 4.33),
            secondary_units={
                "estimated_volume": round(needed * self.AVG_PARTNER_VOLUME),
            },
            assumptions={
                "note": "Partner-Recruiting braucht mehr Kontakte als Kundengewinnung",
                "contact_multiplier": 2.0,
            },
            confidence=0.85,
        )
    
    def _breakdown_from_volume(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Volumen-Ziel"""
        target_volume = goal_input.target_value or 5000
        current = goal_input.current_value or 0
        needed = max(0, target_volume - current)
        
        # Aufteilen in Kunden + Partner
        customer_volume = needed * 0.7
        partner_volume = needed * 0.3
        
        estimated_customers = customer_volume / self.AVG_CUSTOMER_VOLUME
        estimated_partners = partner_volume / self.AVG_PARTNER_VOLUME
        
        total_primary = estimated_customers + estimated_partners
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_type=GoalType.VOLUME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Kunden & Partner",
            primary_units=total_primary,
            primary_units_per_month=total_primary / goal_input.timeframe_months,
            primary_units_per_week=total_primary / (goal_input.timeframe_months * 4.33),
            secondary_units={
                "customers": round(estimated_customers),
                "partners": round(estimated_partners),
                "team_volume": round(needed),
            },
            confidence=0.85,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # MLM-spezifische Erweiterungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_daily_flow_targets(
        self,
        goal_breakdown: GoalBreakdown,
        config: DailyFlowConfig | None = None,
    ) -> DailyFlowTargets:
        """
        MLM-spezifische Daily Flow Berechnung.
        
        Berücksichtigt:
        - Unterschiedliche Conversion für Kunden vs. Partner
        - Team-Calls als zusätzliche Aktivität
        """
        if config is None:
            config = self.get_default_conversion_config()
        
        # Basis-Berechnung
        targets = super().compute_daily_flow_targets(goal_breakdown, config)
        
        # MLM-Ergänzung: Wenn Partner-Ziel, mehr Kontakte nötig
        secondary = goal_breakdown.secondary_units or {}
        if secondary.get("partners", 0) > 0:
            # Partner brauchen doppelt so viele Kontakte
            partner_share = secondary.get("partners", 0) / max(1, goal_breakdown.primary_units)
            contact_boost = 1 + (partner_share * 0.5)  # Bis zu 50% mehr Kontakte
            
            targets.new_contacts = max(1, round(targets.new_contacts * contact_boost))
            targets.weekly_contacts = max(1, round(targets.weekly_contacts * contact_boost))
        
        # Team-Calls (1 pro Woche pro 5 Partner)
        partners = secondary.get("partners", 0)
        if partners > 0:
            weekly_team_calls = max(1, round(partners / 5))
            targets.team_calls = weekly_team_calls
        
        return targets

