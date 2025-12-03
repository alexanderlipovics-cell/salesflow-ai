# backend/app/domain/verticals/adapters.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICAL PLAN ADAPTERS                                                    ║
║  Branchenspezifische Logik für Zielberechnung                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Jeder Adapter implementiert die verticalspezifische Logik:
- Conversion Rates (Kontakt → Kunde, etc.)
- Terminologie (Kunde vs. Deal vs. Abschluss)
- Berechnung von Aktivitäts-Targets
"""

from abc import ABC, abstractmethod
from typing import Dict, List

from .types import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    UnitBreakdown,
    ActivityTargets,
    ConversionRates,
)


# ═══════════════════════════════════════════════════════════════════════════
# BASE ADAPTER
# ═══════════════════════════════════════════════════════════════════════════

class VerticalPlanAdapter(ABC):
    """
    Basis-Klasse für alle Vertical Adapter.
    
    Jeder Adapter muss implementieren:
    - vertical_id: Die ID des Verticals
    - compute_goal_breakdown: Zielberechnung
    - get_default_conversion_rates: Standard-Conversions
    - get_terminology: Branchenspezifische Begriffe
    """
    
    @property
    @abstractmethod
    def vertical_id(self) -> VerticalId:
        """Die ID des Verticals."""
        pass
    
    @abstractmethod
    def compute_goal_breakdown(self, input: GoalInput) -> GoalBreakdown:
        """Berechnet das Ziel-Breakdown aus dem Input."""
        pass
    
    @abstractmethod
    def get_default_conversion_rates(self) -> ConversionRates:
        """Liefert die Standard-Conversion-Rates für dieses Vertical."""
        pass
    
    @abstractmethod
    def get_terminology(self) -> Dict[str, str]:
        """Liefert die branchenspezifische Terminologie."""
        pass
    
    def get_working_days(self, months: int, days_per_week: int = 5) -> int:
        """Berechnet die Arbeitstage im Zeitraum."""
        return days_per_week * 4 * months


# ═══════════════════════════════════════════════════════════════════════════
# NETWORK MARKETING ADAPTER
# ═══════════════════════════════════════════════════════════════════════════

class NetworkMarketingAdapter(VerticalPlanAdapter):
    """
    Adapter für Network Marketing / MLM.
    
    Unterstützt:
    - Income-basierte Ziele (€/Monat → Kunden + Partner)
    - Rang-basierte Ziele
    - Volumen-basierte Ziele (Credits/PV)
    """
    
    @property
    def vertical_id(self) -> VerticalId:
        return VerticalId.NETWORK_MARKETING
    
    def get_default_conversion_rates(self) -> ConversionRates:
        return ConversionRates(
            contact_to_primary=0.15,       # 15% Kontakte werden Kunden
            contact_to_secondary=0.03,     # 3% Kontakte werden Partner
            followups_per_primary=4,       # 4 Follow-ups pro Kunde
            followups_per_secondary=6,     # 6 Follow-ups pro Partner
            reactivation_share=0.15,       # 15% Reaktivierungen
        )
    
    def get_terminology(self) -> Dict[str, str]:
        return {
            "primary_unit": "Kunde",
            "primary_unit_plural": "Kunden",
            "secondary_unit": "Partner",
            "secondary_unit_plural": "Partner",
            "volume": "Credits",
            "deal": "Abschluss",
            "meeting": "Präsentation",
        }
    
    def compute_goal_breakdown(self, input: GoalInput) -> GoalBreakdown:
        meta = input.vertical_meta or {}
        conv = self.get_default_conversion_rates()
        
        # Arbeitstage berechnen
        working_days_per_week = meta.get("working_days_per_week", 5)
        total_days = self.get_working_days(input.timeframe_months, working_days_per_week)
        
        # Durchschnittswerte
        avg_volume_per_customer = meta.get("avg_volume_per_customer", 100)
        avg_income_per_volume = meta.get("avg_income_per_volume", 0.25)  # 25% Provision
        customer_per_partner = meta.get("customer_per_partner", 5)
        
        # Berechnung je nach Ziel-Art
        if input.goal_kind == GoalKind.INCOME:
            # Income → Volume → Kunden + Partner
            total_income = input.target_value * input.timeframe_months
            volume = total_income / avg_income_per_volume if avg_income_per_volume > 0 else total_income * 4
            customers = int(volume / avg_volume_per_customer)
            partners = max(1, int(customers / customer_per_partner))
            
        elif input.goal_kind == GoalKind.VOLUME:
            volume = input.target_value * input.timeframe_months
            customers = int(volume / avg_volume_per_customer)
            partners = max(1, int(customers / customer_per_partner))
            
        elif input.goal_kind == GoalKind.CUSTOMERS:
            customers = int(input.target_value)
            partners = max(1, int(customers / customer_per_partner))
            volume = customers * avg_volume_per_customer
            
        elif input.goal_kind == GoalKind.PARTNERS:
            partners = int(input.target_value)
            customers = partners * customer_per_partner
            volume = customers * avg_volume_per_customer
            
        else:
            # Fallback
            customers = int(input.target_value)
            partners = int(customers / customer_per_partner)
            volume = customers * avg_volume_per_customer
        
        # Kontakte berechnen (aus Conversion Rate)
        contacts_needed = int(customers / conv.contact_to_primary) if conv.contact_to_primary > 0 else customers * 7
        followups_needed = (customers * conv.followups_per_primary) + (partners * conv.followups_per_secondary)
        reactivations_needed = int(contacts_needed * conv.reactivation_share)
        
        # Aktivitäten pro Tag
        contacts_per_day = max(1, contacts_needed / total_days)
        followups_per_day = max(1, followups_needed / total_days)
        reactivations_per_day = max(0, reactivations_needed / total_days)
        
        return GoalBreakdown(
            vertical_id=VerticalId.NETWORK_MARKETING,
            goal_kind=input.goal_kind,
            timeframe_months=input.timeframe_months,
            primary=UnitBreakdown(
                label="Kunden",
                total=customers,
                per_month=customers / input.timeframe_months,
                per_week=customers / (input.timeframe_months * 4),
                per_day=customers / total_days,
            ),
            secondary=UnitBreakdown(
                label="Partner",
                total=partners,
                per_month=partners / input.timeframe_months,
                per_week=partners / (input.timeframe_months * 4),
                per_day=partners / total_days,
            ),
            volume=UnitBreakdown(
                label="Credits",
                total=int(volume),
                per_month=volume / input.timeframe_months,
                per_week=volume / (input.timeframe_months * 4),
                per_day=volume / total_days,
            ),
            activities_per_day=ActivityTargets(
                new_contacts=round(contacts_per_day, 1),
                followups=round(followups_per_day, 1),
                reactivations=round(reactivations_per_day, 1),
            ),
            vertical_details={
                "comp_plan_id": meta.get("comp_plan_id"),
                "avg_volume_per_customer": avg_volume_per_customer,
                "customer_per_partner": customer_per_partner,
            },
            confidence="medium",
            assumptions=[
                f"{avg_volume_per_customer} Credits/Kunde (Durchschnitt)",
                f"{int(conv.contact_to_primary * 100)}% Conversion Kontakt → Kunde",
                f"{working_days_per_week} Arbeitstage/Woche",
            ],
        )


# ═══════════════════════════════════════════════════════════════════════════
# REAL ESTATE ADAPTER
# ═══════════════════════════════════════════════════════════════════════════

class RealEstateAdapter(VerticalPlanAdapter):
    """
    Adapter für Immobilien / Real Estate.
    
    Unterstützt:
    - Income-basierte Ziele (€/Monat → Deals)
    - Deal-basierte Ziele
    - Volumen-basierte Ziele (Umsatz)
    """
    
    @property
    def vertical_id(self) -> VerticalId:
        return VerticalId.REAL_ESTATE
    
    def get_default_conversion_rates(self) -> ConversionRates:
        return ConversionRates(
            contact_to_primary=0.08,       # 8% Leads werden Deals
            contact_to_secondary=0.40,     # 40% Leads → Besichtigungen
            followups_per_primary=5,       # 5 Follow-ups pro Deal
            followups_per_secondary=2,     # 2 Follow-ups pro Besichtigung
            reactivation_share=0.10,       # 10% Reaktivierungen
        )
    
    def get_terminology(self) -> Dict[str, str]:
        return {
            "primary_unit": "Abschluss",
            "primary_unit_plural": "Abschlüsse",
            "secondary_unit": "Besichtigung",
            "secondary_unit_plural": "Besichtigungen",
            "volume": "Umsatzvolumen",
            "deal": "Verkauf",
            "meeting": "Besichtigung",
        }
    
    def compute_goal_breakdown(self, input: GoalInput) -> GoalBreakdown:
        meta = input.vertical_meta or {}
        conv = self.get_default_conversion_rates()
        
        # Arbeitstage
        working_days_per_week = meta.get("working_days_per_week", 5)
        total_days = self.get_working_days(input.timeframe_months, working_days_per_week)
        
        # Immobilien-spezifische Durchschnittswerte
        avg_commission = meta.get("avg_commission", 8000)           # 8.000€ Provision/Deal
        avg_deal_volume = meta.get("avg_deal_volume", 350000)       # 350.000€ Objektwert
        viewings_per_deal = meta.get("viewings_per_deal", 6)        # 6 Besichtigungen/Deal
        leads_per_deal = meta.get("leads_per_deal", 12)             # 12 Leads/Deal
        
        # Berechnung je nach Ziel-Art
        if input.goal_kind == GoalKind.INCOME:
            total_income = input.target_value * input.timeframe_months
            deals = max(1, int(total_income / avg_commission) + 1)
            
        elif input.goal_kind == GoalKind.DEALS:
            deals = int(input.target_value)
            
        elif input.goal_kind in (GoalKind.VOLUME, GoalKind.REVENUE):
            total_volume = input.target_value * input.timeframe_months
            deals = max(1, int(total_volume / avg_deal_volume) + 1)
            
        else:
            deals = int(input.target_value)
        
        # Abgeleitete Werte
        volume = deals * avg_deal_volume
        viewings = deals * viewings_per_deal
        leads = deals * leads_per_deal
        followups = deals * conv.followups_per_primary
        
        # Aktivitäten pro Tag
        leads_per_day = max(1, leads / total_days)
        followups_per_day = max(1, followups / total_days)
        reactivations_per_day = max(0, (leads * conv.reactivation_share) / total_days)
        viewings_per_day = max(0, viewings / total_days)
        
        return GoalBreakdown(
            vertical_id=VerticalId.REAL_ESTATE,
            goal_kind=input.goal_kind,
            timeframe_months=input.timeframe_months,
            primary=UnitBreakdown(
                label="Abschlüsse",
                total=deals,
                per_month=deals / input.timeframe_months,
                per_week=deals / (input.timeframe_months * 4),
                per_day=deals / total_days,
            ),
            secondary=UnitBreakdown(
                label="Besichtigungen",
                total=viewings,
                per_month=viewings / input.timeframe_months,
                per_week=viewings / (input.timeframe_months * 4),
                per_day=viewings / total_days,
            ),
            volume=UnitBreakdown(
                label="Umsatz €",
                total=int(volume),
                per_month=volume / input.timeframe_months,
                per_week=volume / (input.timeframe_months * 4),
                per_day=volume / total_days,
            ),
            activities_per_day=ActivityTargets(
                new_contacts=round(leads_per_day, 1),
                followups=round(followups_per_day, 1),
                reactivations=round(reactivations_per_day, 1),
                meetings=round(viewings_per_day, 1),
            ),
            vertical_details={
                "avg_commission": avg_commission,
                "avg_deal_volume": avg_deal_volume,
                "viewings_per_deal": viewings_per_deal,
                "leads_per_deal": leads_per_deal,
            },
            confidence="medium",
            assumptions=[
                f"{avg_commission:,.0f}€ Provision/Deal",
                f"{viewings_per_deal} Besichtigungen/Deal",
                f"{leads_per_deal} Leads/Deal",
            ],
        )


# ═══════════════════════════════════════════════════════════════════════════
# INSURANCE ADAPTER
# ═══════════════════════════════════════════════════════════════════════════

class InsuranceAdapter(VerticalPlanAdapter):
    """
    Adapter für Versicherung / Insurance.
    """
    
    @property
    def vertical_id(self) -> VerticalId:
        return VerticalId.INSURANCE
    
    def get_default_conversion_rates(self) -> ConversionRates:
        return ConversionRates(
            contact_to_primary=0.12,
            contact_to_secondary=0.05,
            followups_per_primary=4,
            followups_per_secondary=3,
            reactivation_share=0.20,
        )
    
    def get_terminology(self) -> Dict[str, str]:
        return {
            "primary_unit": "Abschluss",
            "primary_unit_plural": "Abschlüsse",
            "secondary_unit": "Termin",
            "secondary_unit_plural": "Termine",
            "volume": "Prämienvolumen",
            "deal": "Police",
            "meeting": "Beratungsgespräch",
        }
    
    def compute_goal_breakdown(self, input: GoalInput) -> GoalBreakdown:
        meta = input.vertical_meta or {}
        conv = self.get_default_conversion_rates()
        
        working_days_per_week = meta.get("working_days_per_week", 5)
        total_days = self.get_working_days(input.timeframe_months, working_days_per_week)
        
        # Versicherungs-spezifisch
        avg_commission = meta.get("avg_commission", 500)
        avg_premium = meta.get("avg_premium", 1200)
        meetings_per_deal = meta.get("meetings_per_deal", 2)
        
        # Berechnung
        if input.goal_kind == GoalKind.INCOME:
            total_income = input.target_value * input.timeframe_months
            deals = max(1, int(total_income / avg_commission) + 1)
        else:
            deals = int(input.target_value)
        
        volume = deals * avg_premium
        meetings = deals * meetings_per_deal
        leads = int(deals / conv.contact_to_primary) if conv.contact_to_primary > 0 else deals * 8
        followups = deals * conv.followups_per_primary
        
        return GoalBreakdown(
            vertical_id=VerticalId.INSURANCE,
            goal_kind=input.goal_kind,
            timeframe_months=input.timeframe_months,
            primary=UnitBreakdown(
                label="Policen",
                total=deals,
                per_month=deals / input.timeframe_months,
                per_week=deals / (input.timeframe_months * 4),
                per_day=deals / total_days,
            ),
            secondary=UnitBreakdown(
                label="Termine",
                total=meetings,
                per_month=meetings / input.timeframe_months,
                per_week=meetings / (input.timeframe_months * 4),
                per_day=meetings / total_days,
            ),
            volume=UnitBreakdown(
                label="Prämien €",
                total=int(volume),
                per_month=volume / input.timeframe_months,
                per_week=volume / (input.timeframe_months * 4),
                per_day=volume / total_days,
            ),
            activities_per_day=ActivityTargets(
                new_contacts=round(max(1, leads / total_days), 1),
                followups=round(max(1, followups / total_days), 1),
                reactivations=round(max(0, (leads * conv.reactivation_share) / total_days), 1),
                meetings=round(max(0, meetings / total_days), 1),
            ),
            vertical_details={
                "avg_commission": avg_commission,
                "avg_premium": avg_premium,
                "meetings_per_deal": meetings_per_deal,
            },
            confidence="medium",
            assumptions=[
                f"{avg_commission:,.0f}€ Provision/Police",
                f"{meetings_per_deal} Termine/Abschluss",
            ],
        )


# ═══════════════════════════════════════════════════════════════════════════
# COACHING ADAPTER
# ═══════════════════════════════════════════════════════════════════════════

class CoachingAdapter(VerticalPlanAdapter):
    """
    Adapter für Coaching & Beratung.
    """
    
    @property
    def vertical_id(self) -> VerticalId:
        return VerticalId.COACHING
    
    def get_default_conversion_rates(self) -> ConversionRates:
        return ConversionRates(
            contact_to_primary=0.10,
            contact_to_secondary=0.25,
            followups_per_primary=3,
            followups_per_secondary=2,
            reactivation_share=0.15,
        )
    
    def get_terminology(self) -> Dict[str, str]:
        return {
            "primary_unit": "Kunde",
            "primary_unit_plural": "Kunden",
            "secondary_unit": "Erstgespräch",
            "secondary_unit_plural": "Erstgespräche",
            "volume": "Umsatz",
            "deal": "Coaching-Paket",
            "meeting": "Discovery Call",
        }
    
    def compute_goal_breakdown(self, input: GoalInput) -> GoalBreakdown:
        meta = input.vertical_meta or {}
        conv = self.get_default_conversion_rates()
        
        working_days_per_week = meta.get("working_days_per_week", 5)
        total_days = self.get_working_days(input.timeframe_months, working_days_per_week)
        
        avg_package_value = meta.get("avg_package_value", 2500)
        discovery_calls_per_client = meta.get("discovery_calls_per_client", 1)
        
        if input.goal_kind == GoalKind.INCOME:
            total_income = input.target_value * input.timeframe_months
            clients = max(1, int(total_income / avg_package_value) + 1)
        else:
            clients = int(input.target_value)
        
        volume = clients * avg_package_value
        discovery_calls = clients * (1 / conv.contact_to_secondary) if conv.contact_to_secondary > 0 else clients * 4
        leads = int(clients / conv.contact_to_primary) if conv.contact_to_primary > 0 else clients * 10
        followups = clients * conv.followups_per_primary
        
        return GoalBreakdown(
            vertical_id=VerticalId.COACHING,
            goal_kind=input.goal_kind,
            timeframe_months=input.timeframe_months,
            primary=UnitBreakdown(
                label="Kunden",
                total=clients,
                per_month=clients / input.timeframe_months,
                per_week=clients / (input.timeframe_months * 4),
                per_day=clients / total_days,
            ),
            secondary=UnitBreakdown(
                label="Discovery Calls",
                total=int(discovery_calls),
                per_month=discovery_calls / input.timeframe_months,
                per_week=discovery_calls / (input.timeframe_months * 4),
                per_day=discovery_calls / total_days,
            ),
            volume=UnitBreakdown(
                label="Umsatz €",
                total=int(volume),
                per_month=volume / input.timeframe_months,
                per_week=volume / (input.timeframe_months * 4),
                per_day=volume / total_days,
            ),
            activities_per_day=ActivityTargets(
                new_contacts=round(max(1, leads / total_days), 1),
                followups=round(max(1, followups / total_days), 1),
                reactivations=round(max(0, (leads * conv.reactivation_share) / total_days), 1),
                meetings=round(max(0, discovery_calls / total_days), 1),
            ),
            vertical_details={
                "avg_package_value": avg_package_value,
            },
            confidence="medium",
            assumptions=[
                f"{avg_package_value:,.0f}€ Ø Paket-Wert",
                f"{int(conv.contact_to_primary * 100)}% Conversion Lead → Kunde",
            ],
        )


# ═══════════════════════════════════════════════════════════════════════════
# ADAPTER REGISTRY
# ═══════════════════════════════════════════════════════════════════════════

_ADAPTERS: Dict[VerticalId, VerticalPlanAdapter] = {
    VerticalId.NETWORK_MARKETING: NetworkMarketingAdapter(),
    VerticalId.REAL_ESTATE: RealEstateAdapter(),
    VerticalId.INSURANCE: InsuranceAdapter(),
    VerticalId.COACHING: CoachingAdapter(),
}


def get_adapter(vertical_id: str) -> VerticalPlanAdapter:
    """
    Gibt den Adapter für ein Vertical zurück.
    
    Falls nicht gefunden, wird Network Marketing als Fallback verwendet.
    
    Args:
        vertical_id: String ID des Verticals
        
    Returns:
        VerticalPlanAdapter Instanz
    """
    try:
        return _ADAPTERS[VerticalId(vertical_id)]
    except (ValueError, KeyError):
        # Fallback zu Network Marketing
        return _ADAPTERS[VerticalId.NETWORK_MARKETING]


def get_all_adapters() -> List[VerticalPlanAdapter]:
    """Gibt alle registrierten Adapter zurück."""
    return list(_ADAPTERS.values())


def get_available_verticals() -> List[Dict[str, str]]:
    """Gibt eine Liste aller verfügbaren Verticals zurück."""
    return [
        {
            "id": adapter.vertical_id.value,
            "terminology": adapter.get_terminology(),
        }
        for adapter in _ADAPTERS.values()
    ]

