"""
╔════════════════════════════════════════════════════════════════════════════╗
║  Herbalife Parser für SalesFlow AI                                        ║
║  Basierend auf dem "Sales & Marketing Plan" 2025                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Stair-Step Breakaway System
- Supervisor-Qualifikation (3 Wege)
- Re-Qualifikation Tracking (KRITISCH!)
- Royalty Overrides (5-3-1)
- TAB Team (Production Bonus)
- 10 Retail Customers Rule
- 70% Rule Compliance
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, date


class HerbalifeLevel(Enum):
    """Herbalife Level-Hierarchie 2025"""
    
    UNKNOWN = ("unknown", "Unbekannt", 0, 0.00)
    DISTRIBUTOR = ("distributor", "Distributor", 1, 0.25)
    SENIOR_CONSULTANT = ("senior_consultant", "Senior Consultant", 2, 0.35)
    SUCCESS_BUILDER = ("success_builder", "Success Builder", 3, 0.42)
    QUALIFIED_PRODUCER = ("qualified_producer", "Qualified Producer", 4, 0.42)
    SUPERVISOR = ("supervisor", "Supervisor", 5, 0.50)
    
    # TAB Team Levels
    WORLD_TEAM = ("world_team", "World Team", 6, 0.50)
    GET_TEAM = ("get_team", "Global Expansion Team", 7, 0.50)
    MILLIONAIRE_TEAM = ("millionaire_team", "Millionaire Team", 8, 0.50)
    PRESIDENTS_TEAM = ("presidents_team", "President's Team", 9, 0.50)
    PRESIDENTS_20K = ("presidents_20k", "President's Team 20K", 10, 0.50)
    PRESIDENTS_30K = ("presidents_30k", "President's Team 30K", 11, 0.50)
    PRESIDENTS_50K = ("presidents_50k", "President's Team 50K", 12, 0.50)
    CHAIRMANS_CLUB = ("chairmans_club", "Chairman's Club", 13, 0.50)
    FOUNDERS_CIRCLE = ("founders_circle", "Founder's Circle", 14, 0.50)
    
    def __init__(self, id: str, display_name: str, level: int, discount: float):
        self.id = id
        self.display_name = display_name
        self.level = level
        self.discount = discount


# Supervisor-Qualifikation Optionen
SUPERVISOR_QUALIFICATION = {
    "one_month": {
        "vp_required": 4000,
        "unencumbered_min": 1000,
        "months": 1,
        "description": "4.000 VP in einem Monat (min. 1.000 unbelastet)"
    },
    "two_month": {
        "vp_per_month": 2500,
        "unencumbered_min": 1000,
        "months": 2,
        "description": "2.500 VP in zwei aufeinanderfolgenden Monaten"
    },
    "cumulative": {
        "vp_total": 4000,
        "ppv_min": 2000,
        "months": 12,
        "description": "4.000 VP in 12 Monaten (min. 2.000 PPV)"
    }
}

# Re-Qualifikation (Jährlich!)
REQUALIFICATION_REQUIREMENTS = {
    "annual_vp": 4000,
    "deadline_month": 1,  # Januar
    "deadline_day": 31,
    "consequence": "Rückstufung auf Qualified Producer + Verlust der Downline"
}

# Royalty Override Struktur (5-3-1)
ROYALTY_OVERRIDES = {
    "max_levels": 3,
    "max_percentage": 0.05,  # 5%
    "requirements": {
        "full_royalty": {"tv_min": 2500, "percentage": 0.05},
        "partial_royalty": {"tv_min": 1000, "percentage": 0.03},
        "minimum_royalty": {"tv_min": 500, "percentage": 0.01},
        "no_royalty": {"tv_min": 0, "percentage": 0.00},
    }
}

# TAB Team Requirements
TAB_TEAM_REQUIREMENTS = {
    HerbalifeLevel.GET_TEAM: {
        "ro_points": 1000,
        "approx_ov": 20000,
        "production_bonus": 0.02,
        "waiting_months": 0
    },
    HerbalifeLevel.MILLIONAIRE_TEAM: {
        "ro_points": 4000,
        "approx_ov": 80000,
        "production_bonus": 0.04,
        "waiting_months": 2
    },
    HerbalifeLevel.PRESIDENTS_TEAM: {
        "ro_points": 10000,
        "approx_ov": 200000,
        "production_bonus": 0.06,
        "waiting_months": 3
    },
    HerbalifeLevel.PRESIDENTS_20K: {
        "ro_points": 20000,
        "production_bonus": 0.065
    },
    HerbalifeLevel.PRESIDENTS_30K: {
        "ro_points": 30000,
        "production_bonus": 0.065
    },
    HerbalifeLevel.PRESIDENTS_50K: {
        "ro_points": 50000,
        "production_bonus": 0.07
    },
}

# Compliance Requirements
COMPLIANCE_RULES = {
    "retail_customers_min": 10,  # 10 Retail Customers Rule
    "sold_percentage_min": 0.70,  # 70% Rule
}


@dataclass
class HerbalifeContact:
    """Strukturierter Herbalife Kontakt"""
    
    # Basis-Info
    distributor_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Level & Status
    level: HerbalifeLevel = HerbalifeLevel.UNKNOWN
    is_supervisor: bool = False
    
    # Volumen
    vp: float = 0.0  # Volume Points
    ppv: float = 0.0  # Personally Purchased Volume
    tv: float = 0.0  # Total Volume
    ro: float = 0.0  # Royalty Override Points
    
    # Supervisor Qualifikation
    supervisor_since: Optional[datetime] = None
    qualification_method: Optional[str] = None  # one_month, two_month, cumulative
    
    # Re-Qualifikation (KRITISCH!)
    requalification_deadline: Optional[date] = None
    annual_vp_accumulated: float = 0.0
    requalification_at_risk: bool = False
    
    # TAB Team
    tab_team_level: Optional[HerbalifeLevel] = None
    production_bonus_rate: float = 0.0
    
    # Compliance
    retail_customers_count: int = 0
    retail_compliant: bool = False
    sold_percentage: float = 0.0
    
    # Struktur
    sponsor_id: Optional[str] = None
    first_line_supervisors: int = 0
    
    # Nutrition Club (DACH relevant)
    has_nutrition_club: bool = False
    club_compliant: bool = False  # Geschlossener Club?
    
    # Discount
    current_discount: float = 0.25


class HerbalifeParserHelper:
    """Helper-Klasse für Herbalife-spezifische Funktionen"""
    
    # Level-Aliase für Normalisierung
    LEVEL_ALIASES = {
        # Englisch
        "distributor": HerbalifeLevel.DISTRIBUTOR,
        "dist": HerbalifeLevel.DISTRIBUTOR,
        "member": HerbalifeLevel.DISTRIBUTOR,
        "senior consultant": HerbalifeLevel.SENIOR_CONSULTANT,
        "sc": HerbalifeLevel.SENIOR_CONSULTANT,
        "success builder": HerbalifeLevel.SUCCESS_BUILDER,
        "sb": HerbalifeLevel.SUCCESS_BUILDER,
        "qualified producer": HerbalifeLevel.QUALIFIED_PRODUCER,
        "qp": HerbalifeLevel.QUALIFIED_PRODUCER,
        "supervisor": HerbalifeLevel.SUPERVISOR,
        "sup": HerbalifeLevel.SUPERVISOR,
        "spv": HerbalifeLevel.SUPERVISOR,
        "world team": HerbalifeLevel.WORLD_TEAM,
        "wt": HerbalifeLevel.WORLD_TEAM,
        "global expansion team": HerbalifeLevel.GET_TEAM,
        "get team": HerbalifeLevel.GET_TEAM,
        "get": HerbalifeLevel.GET_TEAM,
        "millionaire team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "mill team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "mt": HerbalifeLevel.MILLIONAIRE_TEAM,
        "president's team": HerbalifeLevel.PRESIDENTS_TEAM,
        "presidents team": HerbalifeLevel.PRESIDENTS_TEAM,
        "pt": HerbalifeLevel.PRESIDENTS_TEAM,
        "chairman's club": HerbalifeLevel.CHAIRMANS_CLUB,
        "chairmans club": HerbalifeLevel.CHAIRMANS_CLUB,
        "founder's circle": HerbalifeLevel.FOUNDERS_CIRCLE,
        "founders circle": HerbalifeLevel.FOUNDERS_CIRCLE,
        
        # Deutsch
        "berater": HerbalifeLevel.DISTRIBUTOR,
        "vertriebspartner": HerbalifeLevel.DISTRIBUTOR,
        "senior berater": HerbalifeLevel.SENIOR_CONSULTANT,
        "qualifizierter produzent": HerbalifeLevel.QUALIFIED_PRODUCER,
        "betreuer": HerbalifeLevel.SUPERVISOR,
        "millionärs-team": HerbalifeLevel.MILLIONAIRE_TEAM,
        "präsidenten-team": HerbalifeLevel.PRESIDENTS_TEAM,
    }
    
    @staticmethod
    def normalize_level(level_str: str) -> HerbalifeLevel:
        """Normalisiert Level-String zu HerbalifeLevel Enum"""
        if not level_str:
            return HerbalifeLevel.UNKNOWN
        
        normalized = level_str.lower().strip()
        return HerbalifeParserHelper.LEVEL_ALIASES.get(normalized, HerbalifeLevel.UNKNOWN)
    
    @staticmethod
    def calculate_royalty_override(tv: float, level: int = 1) -> Dict[str, Any]:
        """Berechnet Royalty Override für eine Ebene"""
        if level > ROYALTY_OVERRIDES["max_levels"]:
            return {"percentage": 0, "reason": "Über Maximum (3 Ebenen)"}
        
        reqs = ROYALTY_OVERRIDES["requirements"]
        
        if tv >= reqs["full_royalty"]["tv_min"]:
            return {"percentage": 0.05, "reason": "Volle Royalty (5%)"}
        elif tv >= reqs["partial_royalty"]["tv_min"]:
            return {"percentage": 0.03, "reason": "Teilweise Royalty (3%)"}
        elif tv >= reqs["minimum_royalty"]["tv_min"]:
            return {"percentage": 0.01, "reason": "Minimale Royalty (1%)"}
        else:
            return {"percentage": 0, "reason": "Keine Royalty (TV < 500)"}
    
    @staticmethod
    def check_supervisor_qualification(
        vp_month1: float, 
        vp_month2: float = 0, 
        ppv: float = 0,
        unencumbered: float = 0
    ) -> Dict[str, Any]:
        """Prüft Supervisor-Qualifikation"""
        
        results = {
            "one_month": False,
            "two_month": False,
            "cumulative": False,
            "best_path": None,
            "remaining": {}
        }
        
        # Ein-Monats-Qualifikation
        if vp_month1 >= 4000 and unencumbered >= 1000:
            results["one_month"] = True
            results["best_path"] = "one_month"
        else:
            results["remaining"]["one_month"] = {
                "vp_needed": max(0, 4000 - vp_month1),
                "unencumbered_needed": max(0, 1000 - unencumbered)
            }
        
        # Zwei-Monats-Qualifikation
        if vp_month1 >= 2500 and vp_month2 >= 2500:
            results["two_month"] = True
            if not results["best_path"]:
                results["best_path"] = "two_month"
        else:
            results["remaining"]["two_month"] = {
                "month1_needed": max(0, 2500 - vp_month1),
                "month2_needed": max(0, 2500 - vp_month2)
            }
        
        return results
    
    @staticmethod
    def calculate_requalification_status(
        annual_vp: float, 
        current_date: date = None
    ) -> Dict[str, Any]:
        """Berechnet Re-Qualifikations-Status"""
        
        if current_date is None:
            current_date = date.today()
        
        deadline = date(current_date.year + 1 if current_date.month > 1 else current_date.year, 1, 31)
        days_remaining = (deadline - current_date).days
        vp_remaining = max(0, 4000 - annual_vp)
        
        # Berechne benötigte VP pro Monat
        months_remaining = max(1, days_remaining // 30)
        vp_per_month_needed = vp_remaining / months_remaining if months_remaining > 0 else vp_remaining
        
        status = {
            "deadline": deadline.isoformat(),
            "days_remaining": days_remaining,
            "annual_vp": annual_vp,
            "vp_remaining": vp_remaining,
            "vp_per_month_needed": round(vp_per_month_needed, 2),
            "on_track": annual_vp >= (4000 * (1 - days_remaining / 365)),
            "risk_level": "low"
        }
        
        # Risiko-Einstufung
        if vp_remaining == 0:
            status["risk_level"] = "qualified"
        elif days_remaining < 30 and vp_remaining > 1000:
            status["risk_level"] = "critical"
        elif days_remaining < 90 and vp_remaining > 2000:
            status["risk_level"] = "high"
        elif not status["on_track"]:
            status["risk_level"] = "medium"
        
        return status


# Field Mapping für Herbalife
HERBALIFE_FIELD_MAPPING = {
    # Englisch
    "distributor_id": ["distributor id", "id", "member id", "herbalife id", "dist id"],
    "first_name": ["first name", "firstname", "first_name", "vorname"],
    "last_name": ["last name", "lastname", "last_name", "nachname", "surname"],
    "email": ["email", "e-mail", "email address"],
    "phone": ["phone", "telephone", "phone number", "telefon", "tel", "mobile"],
    "level": ["level", "status", "rank", "stufe", "rang"],
    "vp": ["vp", "volume points", "volumenpunkte"],
    "ppv": ["ppv", "personally purchased volume", "persönlich gekaufte punkte"],
    "tv": ["tv", "total volume", "gesamtvolumen"],
    "ro": ["ro", "royalty points", "royalty override points"],
    "retail_customers": ["retail customers", "customers", "kunden", "endkunden"],
    "sold_percentage": ["sold %", "sold percentage", "verkauft %"],
    "sponsor_id": ["sponsor id", "sponsor", "upline", "upline id"],
    "first_line_supervisors": ["first line", "first line supervisors", "erstlinie", "fl supervisors"],
    "nutrition_club": ["nutrition club", "nc", "club"],
}


def get_herbalife_field_mapping(headers: List[str]) -> Dict[str, str]:
    """Erstellt Field Mapping basierend auf CSV-Headers"""
    mapping = {}
    
    for header in headers:
        header_lower = header.lower().strip()
        
        for field_name, aliases in HERBALIFE_FIELD_MAPPING.items():
            if header_lower in [a.lower() for a in aliases]:
                mapping[field_name] = header
                break
    
    return mapping

