"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - FINANCE ADAPTER                                          ║
║  Goal Engine für Finanzvertrieb & Versicherung                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Besonderheiten Finanzvertrieb:
- Hybrid-Provisionen (Abschluss + Bestand)
- Beratungstermine als kritischer Schritt
- Empfehlungsgeschäft wichtig
- Compliance-Anforderungen
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


class FinanceAdapter(BaseVerticalAdapter):
    """
    Adapter für Finanzvertrieb (Finanzberater, Versicherungsmakler).
    
    Unterstützte Zieltypen:
    - income: Provisions-Ziel
    - deals: Anzahl Vertragsabschlüsse
    - volume: Abschluss-Volumen
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # Konfiguration
    # ─────────────────────────────────────────────────────────────────────────
    
    # Durchschnittswerte
    AVG_CONTRACT_VALUE = 150        # € monatliche Prämie/Rate
    AVG_COMMISSION_FACTOR = 12      # 12x Monatsbeitrag als Provision
    AVG_COMMISSION_PER_CONTRACT = 1_800  # €
    
    # Conversion Rates
    CONTACT_TO_CONSULTATION = 0.20  # 20% Kontakte → Beratungstermin
    CONSULTATION_TO_CONTRACT = 0.40  # 40% Beratungen → Abschluss
    CONTACT_TO_CONTRACT = 0.08      # 8% End-to-End
    
    # Empfehlungsquote
    REFERRAL_RATE = 0.3             # 30% der Kunden geben Empfehlungen
    REFERRALS_PER_CLIENT = 1.5      # Ø 1.5 Empfehlungen pro empfehlendem Kunden
    
    # ─────────────────────────────────────────────────────────────────────────
    # Interface Implementation
    # ─────────────────────────────────────────────────────────────────────────
    
    @property
    def vertical_id(self) -> str:
        return VerticalId.FINANCE.value
    
    def get_label(self) -> str:
        return "Finanzvertrieb"
    
    def get_default_conversion_config(self) -> DailyFlowConfig:
        """Finanz-typische Konversionsraten"""
        return DailyFlowConfig(
            working_days_per_week=5,
            contact_to_primary_unit=0.08,       # 8% Kontakte → Vertrag
            followups_per_primary=5.0,          # 5 Follow-ups pro Abschluss
            reactivation_share=0.20,            # 20% Reaktivierungen (Bestand!)
            has_team_building=False,
            has_appointments=True,              # Beratungstermine
            appointment_conversion=0.40,        # 40% Termin → Vertrag
        )
    
    def get_kpi_definitions(self) -> list[KpiDefinition]:
        """KPIs für Finanz Dashboard"""
        return [
            KpiDefinition(
                id="contracts",
                label="Abschlüsse",
                emoji="✅",
                unit="Verträge",
                description="Neue Vertragsabschlüsse",
                is_primary=True,
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="consultations",
                label="Beratungen",
                emoji="📊",
                unit="Anzahl",
                description="Beratungstermine",
                aggregation="sum",
                period="weekly",
            ),
            KpiDefinition(
                id="volume",
                label="Volumen",
                emoji="💎",
                unit="€",
                description="Abschluss-Volumen",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="commission",
                label="Provision",
                emoji="💰",
                unit="€",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="referrals",
                label="Empfehlungen",
                emoji="🌟",
                unit="Anzahl",
                aggregation="sum",
                period="monthly",
            ),
            KpiDefinition(
                id="applications",
                label="Anträge",
                emoji="📝",
                unit="Anzahl",
                description="Eingereichte Anträge",
                aggregation="sum",
                period="monthly",
            ),
        ]
    
    def compute_goal_breakdown(self, goal_input: GoalInput) -> GoalBreakdown:
        """
        Finanz Goal Breakdown.
        
        Logik:
        1. Provisions-Ziel → Anzahl Verträge
        2. Verträge → Beratungstermine
        3. Termine → Kontakte (+ Empfehlungsanteil)
        """
        
        if goal_input.goal_type == GoalType.INCOME:
            return self._breakdown_from_income(goal_input)
        elif goal_input.goal_type == GoalType.DEALS:
            return self._breakdown_from_contracts(goal_input)
        elif goal_input.goal_type == GoalType.VOLUME:
            return self._breakdown_from_volume(goal_input)
        else:
            return self._breakdown_from_income(goal_input)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private: Breakdown-Berechnungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def _breakdown_from_income(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Provisions-Ziel"""
        target_income = goal_input.target_value or 4000  # €/Monat
        
        # Monatliches Ziel → Anzahl Verträge
        monthly_contracts = target_income / self.AVG_COMMISSION_PER_CONTRACT
        total_contracts = monthly_contracts * goal_input.timeframe_months
        
        # Beratungen nötig
        consultations_needed = total_contracts / self.CONSULTATION_TO_CONTRACT
        
        # Kontakte nötig (abzüglich Empfehlungen)
        referral_contracts = total_contracts * self.REFERRAL_RATE * 0.5  # 50% der Empfehlungen konvertieren
        organic_contracts = total_contracts - referral_contracts
        organic_consultations = organic_contracts / self.CONSULTATION_TO_CONTRACT
        contacts_needed = organic_consultations / self.CONTACT_TO_CONSULTATION
        
        return GoalBreakdown(
            vertical_id=VerticalId.FINANCE,
            goal_type=GoalType.INCOME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Verträge",
            primary_units=total_contracts,
            primary_units_per_month=monthly_contracts,
            primary_units_per_week=monthly_contracts / 4.33,
            secondary_units={
                "consultations": round(consultations_needed),
                "contacts": round(contacts_needed),
                "expected_referrals": round(total_contracts * self.REFERRAL_RATE * self.REFERRALS_PER_CLIENT),
                "volume": round(total_contracts * self.AVG_CONTRACT_VALUE * 12),  # Jahresbeiträge
            },
            target_income_monthly=target_income,
            assumptions={
                "avg_commission_per_contract": self.AVG_COMMISSION_PER_CONTRACT,
                "consultation_to_contract_rate": self.CONSULTATION_TO_CONTRACT,
                "referral_rate": self.REFERRAL_RATE,
            },
            confidence=0.8,
        )
    
    def _breakdown_from_contracts(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Vertrags-Ziel"""
        target_contracts = goal_input.target_value or 3
        current = goal_input.current_value or 0
        needed = max(0, target_contracts - current)
        
        monthly_contracts = needed / goal_input.timeframe_months
        consultations_needed = needed / self.CONSULTATION_TO_CONTRACT
        
        return GoalBreakdown(
            vertical_id=VerticalId.FINANCE,
            goal_type=GoalType.DEALS,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Verträge",
            primary_units=needed,
            primary_units_per_month=monthly_contracts,
            primary_units_per_week=monthly_contracts / 4.33,
            secondary_units={
                "consultations": round(consultations_needed),
                "estimated_commission": round(needed * self.AVG_COMMISSION_PER_CONTRACT),
            },
            confidence=0.9,
        )
    
    def _breakdown_from_volume(self, goal_input: GoalInput) -> GoalBreakdown:
        """Berechnung aus Volumen-Ziel (Jahresbeiträge)"""
        target_volume = goal_input.target_value or 50_000  # € Jahresbeiträge
        
        # Volumen → Anzahl Verträge
        avg_annual_premium = self.AVG_CONTRACT_VALUE * 12
        total_contracts = target_volume / avg_annual_premium
        monthly_contracts = total_contracts / goal_input.timeframe_months
        
        # Provision schätzen
        estimated_commission = total_contracts * self.AVG_COMMISSION_PER_CONTRACT
        
        return GoalBreakdown(
            vertical_id=VerticalId.FINANCE,
            goal_type=GoalType.VOLUME,
            timeframe_months=goal_input.timeframe_months,
            primary_unit_label="Verträge",
            primary_units=total_contracts,
            primary_units_per_month=monthly_contracts,
            primary_units_per_week=monthly_contracts / 4.33,
            secondary_units={
                "volume": round(target_volume),
                "estimated_commission": round(estimated_commission),
            },
            target_income_monthly=estimated_commission / goal_input.timeframe_months,
            assumptions={
                "avg_annual_premium": avg_annual_premium,
                "commission_factor": self.AVG_COMMISSION_FACTOR,
            },
            confidence=0.8,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Finance-spezifische Erweiterungen
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_daily_flow_targets(
        self,
        goal_breakdown: GoalBreakdown,
        config: DailyFlowConfig | None = None,
    ) -> DailyFlowTargets:
        """
        Finanz-spezifische Daily Flow Berechnung.
        
        Berücksichtigt:
        - Beratungstermine als Zwischen-Schritt
        - Höhere Reaktivierungsquote (Bestandskunden)
        """
        if config is None:
            config = self.get_default_conversion_config()
        
        # Basis-Berechnung
        targets = super().compute_daily_flow_targets(goal_breakdown, config)
        
        # Finance-Ergänzung: Beratungstermine
        secondary = goal_breakdown.secondary_units or {}
        consultations_total = secondary.get("consultations", 0)
        
        if consultations_total > 0:
            weeks = goal_breakdown.timeframe_months * 4.33
            consultations_per_week = consultations_total / weeks
            targets.appointments = max(1, round(consultations_per_week))
        
        # Höhere Reaktivierungsquote für Bestandskundenpflege
        targets.reactivations = max(2, round(targets.reactivations * 1.3))
        targets.weekly_reactivations = targets.reactivations * 5
        
        return targets

