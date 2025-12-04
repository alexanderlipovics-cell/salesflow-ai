"""
╔════════════════════════════════════════════════════════════════════════════╗
║  doTERRA Parser für SalesFlow AI                                          ║
║  Basierend auf dem "Compensation Plan Elevated" 2025                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- 14 Rang-Levels (Wellness Advocate bis Triple Presidential Diamond)
- Unilevel-System mit dynamischer Kompression (7 Ebenen)
- Power of 3 Bonus mit Boost
- Leadership Pools
- DACH-Compliance (HWG)
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


class DoterraRank(Enum):
    """doTERRA Rang-Hierarchie 2025"""
    
    UNKNOWN = ("unknown", "Unbekannt", 0)
    WELLNESS_ADVOCATE = ("wellness_advocate", "Wellness Advocate", 1)
    MANAGER = ("manager", "Manager", 2)
    DIRECTOR = ("director", "Director", 3)
    EXECUTIVE = ("executive", "Executive", 4)
    ELITE = ("elite", "Elite", 5)
    PREMIER = ("premier", "Premier", 6)
    SILVER = ("silver", "Silver", 7)
    GOLD = ("gold", "Gold", 8)
    PLATINUM = ("platinum", "Platinum", 9)
    DIAMOND = ("diamond", "Diamond", 10)
    BLUE_DIAMOND = ("blue_diamond", "Blue Diamond", 11)
    PRESIDENTIAL_DIAMOND = ("presidential_diamond", "Presidential Diamond", 12)
    DOUBLE_PRESIDENTIAL = ("double_presidential", "Double Presidential Diamond", 13)
    TRIPLE_PRESIDENTIAL = ("triple_presidential", "Triple Presidential Diamond", 14)
    
    def __init__(self, id: str, display_name: str, level: int):
        self.id = id
        self.display_name = display_name
        self.level = level


# Rang-Anforderungen
RANK_REQUIREMENTS = {
    DoterraRank.MANAGER: {"min_ov": 500},
    DoterraRank.DIRECTOR: {"min_ov": 1000},
    DoterraRank.EXECUTIVE: {"min_ov": 2000},
    DoterraRank.ELITE: {"min_ov": 3000},
    DoterraRank.PREMIER: {"min_ov": 5000, "legs": 2, "leg_rank": DoterraRank.EXECUTIVE},
    DoterraRank.SILVER: {"legs": 3, "leg_rank": DoterraRank.ELITE},
    DoterraRank.GOLD: {"legs": 3, "leg_rank": DoterraRank.PREMIER},
    DoterraRank.PLATINUM: {"legs": 3, "leg_rank": DoterraRank.SILVER},
    DoterraRank.DIAMOND: {"legs": 4, "leg_rank": DoterraRank.SILVER},
    DoterraRank.BLUE_DIAMOND: {"legs": 5, "leg_rank": DoterraRank.GOLD},
    DoterraRank.PRESIDENTIAL_DIAMOND: {"legs": 6, "leg_rank": DoterraRank.PLATINUM},
}

# Unilevel-Provisionen (dynamische Kompression)
UNILEVEL_PERCENTAGES = {
    1: 0.02,  # 2% - Absichtlich niedrig (fördert Tiefe)
    2: 0.03,  # 3%
    3: 0.05,  # 5%
    4: 0.05,  # 5%
    5: 0.06,  # 6%
    6: 0.06,  # 6%
    7: 0.07,  # 7% - Maximum auf tiefster Ebene!
}

# Power of 3 Bonus (DACH in EUR)
POWER_OF_3_BONUS = {
    "level_1": {"base": 45, "boost": 90},
    "level_2": {"base": 215, "boost": 430},
    "level_3": {"base": 1075, "boost": 1290},
}

# Leadership Pool Anteile
LEADERSHIP_POOL_SHARES = {
    DoterraRank.SILVER: 1,
    DoterraRank.GOLD: 5,
    DoterraRank.PLATINUM: 10,
    DoterraRank.DIAMOND: 15,
    DoterraRank.BLUE_DIAMOND: 20,
    DoterraRank.PRESIDENTIAL_DIAMOND: 25,
}


@dataclass
class DoterraContact:
    """Strukturierter doTERRA Kontakt"""
    
    # Basis-Info
    member_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Rang & Status
    rank: DoterraRank = DoterraRank.UNKNOWN
    highest_rank: DoterraRank = DoterraRank.UNKNOWN
    
    # Volumen
    pv: float = 0.0  # Personal Volume
    ov: float = 0.0  # Organisation Volume
    pgv: float = 0.0  # Personal Growth Volume (Neukunden im 1. Jahr)
    tv: float = 0.0  # Team Volume
    
    # Struktur
    legs: int = 0  # Qualifizierte Beine
    qualified_legs: List[str] = field(default_factory=list)  # IDs der qualifizierten Legs
    
    # Status
    lrp_active: bool = False  # Loyalty Rewards Program
    lrp_pv: float = 0.0  # LRP PV
    enrollment_date: Optional[datetime] = None
    
    # Sponsor
    sponsor_id: Optional[str] = None
    enroller_id: Optional[str] = None
    
    # Power of 3 Status
    po3_level: int = 0
    po3_boost_qualified: bool = False


class DoterraParserHelper:
    """Helper-Klasse für doTERRA-spezifische Funktionen"""
    
    # Rang-Aliase für Normalisierung
    RANK_ALIASES = {
        # Englisch
        "wellness advocate": DoterraRank.WELLNESS_ADVOCATE,
        "wa": DoterraRank.WELLNESS_ADVOCATE,
        "manager": DoterraRank.MANAGER,
        "mgr": DoterraRank.MANAGER,
        "director": DoterraRank.DIRECTOR,
        "dir": DoterraRank.DIRECTOR,
        "executive": DoterraRank.EXECUTIVE,
        "exec": DoterraRank.EXECUTIVE,
        "elite": DoterraRank.ELITE,
        "premier": DoterraRank.PREMIER,
        "silver": DoterraRank.SILVER,
        "gold": DoterraRank.GOLD,
        "platinum": DoterraRank.PLATINUM,
        "plat": DoterraRank.PLATINUM,
        "diamond": DoterraRank.DIAMOND,
        "dia": DoterraRank.DIAMOND,
        "blue diamond": DoterraRank.BLUE_DIAMOND,
        "bd": DoterraRank.BLUE_DIAMOND,
        "presidential diamond": DoterraRank.PRESIDENTIAL_DIAMOND,
        "pd": DoterraRank.PRESIDENTIAL_DIAMOND,
        "presidential": DoterraRank.PRESIDENTIAL_DIAMOND,
        "double presidential diamond": DoterraRank.DOUBLE_PRESIDENTIAL,
        "double presidential": DoterraRank.DOUBLE_PRESIDENTIAL,
        "dpd": DoterraRank.DOUBLE_PRESIDENTIAL,
        "triple presidential diamond": DoterraRank.TRIPLE_PRESIDENTIAL,
        "triple presidential": DoterraRank.TRIPLE_PRESIDENTIAL,
        "tpd": DoterraRank.TRIPLE_PRESIDENTIAL,
        
        # Deutsch
        "berater": DoterraRank.WELLNESS_ADVOCATE,
        "silber": DoterraRank.SILVER,
        "platin": DoterraRank.PLATINUM,
        "diamant": DoterraRank.DIAMOND,
        "blauer diamant": DoterraRank.BLUE_DIAMOND,
        "präsidenten diamant": DoterraRank.PRESIDENTIAL_DIAMOND,
    }
    
    @staticmethod
    def normalize_rank(rank_str: str) -> DoterraRank:
        """Normalisiert Rang-String zu DoterraRank Enum"""
        if not rank_str:
            return DoterraRank.UNKNOWN
        
        normalized = rank_str.lower().strip()
        return DoterraParserHelper.RANK_ALIASES.get(normalized, DoterraRank.UNKNOWN)
    
    @staticmethod
    def calculate_unilevel_commission(level: int, volume: float) -> float:
        """Berechnet Unilevel-Provision für eine Ebene"""
        if level < 1 or level > 7:
            return 0.0
        percentage = UNILEVEL_PERCENTAGES.get(level, 0)
        return volume * percentage
    
    @staticmethod
    def calculate_power_of_3(level: int, has_boost: bool = False) -> float:
        """Berechnet Power of 3 Bonus"""
        if level < 1 or level > 3:
            return 0.0
        
        level_key = f"level_{level}"
        bonus_data = POWER_OF_3_BONUS.get(level_key, {})
        
        if has_boost:
            return bonus_data.get("boost", 0)
        return bonus_data.get("base", 0)
    
    @staticmethod
    def get_rank_requirements(target_rank: DoterraRank) -> Dict[str, Any]:
        """Gibt Anforderungen für einen Rang zurück"""
        return RANK_REQUIREMENTS.get(target_rank, {})
    
    @staticmethod
    def get_leadership_pool_shares(rank: DoterraRank) -> int:
        """Gibt Anzahl der Leadership Pool Anteile zurück"""
        return LEADERSHIP_POOL_SHARES.get(rank, 0)
    
    @staticmethod
    def calculate_rank_progress(contact: DoterraContact, target_rank: DoterraRank) -> Dict[str, Any]:
        """Berechnet Fortschritt zum Ziel-Rang"""
        requirements = DoterraParserHelper.get_rank_requirements(target_rank)
        
        if not requirements:
            return {"eligible": False, "message": "Ungültiger Rang"}
        
        progress = {
            "target_rank": target_rank.display_name,
            "current_rank": contact.rank.display_name,
            "requirements": {},
            "eligible": True,
        }
        
        # OV-Anforderung
        if "min_ov" in requirements:
            required_ov = requirements["min_ov"]
            progress["requirements"]["ov"] = {
                "required": required_ov,
                "current": contact.ov,
                "met": contact.ov >= required_ov,
                "remaining": max(0, required_ov - contact.ov),
            }
            if not progress["requirements"]["ov"]["met"]:
                progress["eligible"] = False
        
        # Legs-Anforderung
        if "legs" in requirements:
            required_legs = requirements["legs"]
            progress["requirements"]["legs"] = {
                "required": required_legs,
                "current": contact.legs,
                "met": contact.legs >= required_legs,
                "remaining": max(0, required_legs - contact.legs),
            }
            if not progress["requirements"]["legs"]["met"]:
                progress["eligible"] = False
        
        return progress


# Field Mapping für doTERRA
DOTERRA_FIELD_MAPPING = {
    # Englisch
    "member_id": ["member id", "id", "member_id", "distributor id", "wa id"],
    "first_name": ["first name", "firstname", "first_name", "vorname"],
    "last_name": ["last name", "lastname", "last_name", "nachname", "surname"],
    "email": ["email", "e-mail", "email address"],
    "phone": ["phone", "telephone", "phone number", "telefon", "tel"],
    "rank": ["rank", "current rank", "rang", "aktueller rang"],
    "highest_rank": ["highest rank", "paid as rank", "höchster rang"],
    "pv": ["pv", "personal volume", "persönliches volumen"],
    "ov": ["ov", "organization volume", "org volume", "organisationsvolumen"],
    "pgv": ["pgv", "personal growth volume"],
    "tv": ["tv", "team volume", "teamvolumen"],
    "legs": ["legs", "qualified legs", "beine", "qualifizierte beine"],
    "lrp_active": ["lrp", "lrp active", "lrp status", "loyalty rewards"],
    "lrp_pv": ["lrp pv", "lrp volume"],
    "sponsor_id": ["sponsor id", "sponsor", "upline id"],
    "enroller_id": ["enroller id", "enroller", "einschreiber"],
}


def get_doterra_field_mapping(headers: List[str]) -> Dict[str, str]:
    """Erstellt Field Mapping basierend auf CSV-Headers"""
    mapping = {}
    
    for header in headers:
        header_lower = header.lower().strip()
        
        for field_name, aliases in DOTERRA_FIELD_MAPPING.items():
            if header_lower in [a.lower() for a in aliases]:
                mapping[field_name] = header
                break
    
    return mapping

