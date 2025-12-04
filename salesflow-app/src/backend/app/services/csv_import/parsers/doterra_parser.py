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


class DoterraParser:
    """Parser für doTERRA CSV-Exporte"""
    
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
    
    def __init__(self):
        self.company_id = "doterra"
        self.company_name = "doTERRA"
    
    def normalize_rank(self, rank_str: str) -> DoterraRank:
        """Normalisiert Rang-String zu DoterraRank Enum"""
        if not rank_str:
            return DoterraRank.UNKNOWN
        
        normalized = rank_str.lower().strip()
        return self.RANK_ALIASES.get(normalized, DoterraRank.UNKNOWN)
    
    def parse_row(self, row: Dict[str, Any], field_mapping: Dict[str, str]) -> DoterraContact:
        """Parst eine CSV-Zeile zu DoterraContact"""
        
        def get_value(key: str, default=None):
            mapped_key = field_mapping.get(key, key)
            return row.get(mapped_key, default)
        
        def get_float(key: str, default=0.0) -> float:
            val = get_value(key)
            if val is None or val == "":
                return default
            try:
                # Handle German number format (1.234,56)
                if isinstance(val, str):
                    val = val.replace(".", "").replace(",", ".")
                return float(val)
            except (ValueError, TypeError):
                return default
        
        def get_bool(key: str, default=False) -> bool:
            val = get_value(key)
            if val is None:
                return default
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                return val.lower() in ("true", "yes", "ja", "1", "aktiv", "active")
            return bool(val)
        
        contact = DoterraContact(
            member_id=str(get_value("member_id", "")),
            first_name=str(get_value("first_name", "")),
            last_name=str(get_value("last_name", "")),
            email=get_value("email"),
            phone=get_value("phone"),
            rank=self.normalize_rank(str(get_value("rank", ""))),
            highest_rank=self.normalize_rank(str(get_value("highest_rank", ""))),
            pv=get_float("pv"),
            ov=get_float("ov"),
            pgv=get_float("pgv"),
            tv=get_float("tv"),
            legs=int(get_float("legs")),
            lrp_active=get_bool("lrp_active"),
            lrp_pv=get_float("lrp_pv"),
            sponsor_id=get_value("sponsor_id"),
            enroller_id=get_value("enroller_id"),
        )
        
        # Berechne abgeleitete Werte
        contact = self._calculate_derived_values(contact)
        
        return contact
    
    def _calculate_derived_values(self, contact: DoterraContact) -> DoterraContact:
        """Berechnet abgeleitete Werte"""
        
        # Power of 3 Level basierend auf Struktur
        if contact.legs >= 9:
            contact.po3_level = 3
        elif contact.legs >= 3:
            contact.po3_level = 2
        elif contact.legs >= 1:
            contact.po3_level = 1
        
        # Boost-Qualifikation (vereinfacht: PGV >= 400)
        contact.po3_boost_qualified = contact.pgv >= 400
        
        # Highest Rank auf aktuellen setzen wenn höher
        if contact.rank.level > contact.highest_rank.level:
            contact.highest_rank = contact.rank
        
        return contact
    
    def calculate_unilevel_commission(self, level: int, volume: float) -> float:
        """Berechnet Unilevel-Provision für eine Ebene"""
        if level < 1 or level > 7:
            return 0.0
        percentage = UNILEVEL_PERCENTAGES.get(level, 0)
        return volume * percentage
    
    def calculate_power_of_3(self, level: int, has_boost: bool = False) -> float:
        """Berechnet Power of 3 Bonus"""
        if level < 1 or level > 3:
            return 0.0
        
        level_key = f"level_{level}"
        bonus_data = POWER_OF_3_BONUS.get(level_key, {})
        
        if has_boost:
            return bonus_data.get("boost", 0)
        return bonus_data.get("base", 0)
    
    def get_rank_requirements(self, target_rank: DoterraRank) -> Dict[str, Any]:
        """Gibt Anforderungen für einen Rang zurück"""
        return RANK_REQUIREMENTS.get(target_rank, {})
    
    def calculate_rank_progress(self, contact: DoterraContact, target_rank: DoterraRank) -> Dict[str, Any]:
        """Berechnet Fortschritt zum Ziel-Rang"""
        requirements = self.get_rank_requirements(target_rank)
        
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
    
    def get_leadership_pool_shares(self, rank: DoterraRank) -> int:
        """Gibt Anzahl der Leadership Pool Anteile zurück"""
        return LEADERSHIP_POOL_SHARES.get(rank, 0)
    
    def to_salesflow_contact(self, contact: DoterraContact) -> Dict[str, Any]:
        """Konvertiert zu SalesFlow Contact Format"""
        return {
            "external_id": contact.member_id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "company": "doTERRA",
            "source": "mlm_import",
            "mlm_data": {
                "company": "doterra",
                "rank": contact.rank.id,
                "rank_display": contact.rank.display_name,
                "rank_level": contact.rank.level,
                "highest_rank": contact.highest_rank.id,
                "pv": contact.pv,
                "ov": contact.ov,
                "pgv": contact.pgv,
                "tv": contact.tv,
                "legs": contact.legs,
                "lrp_active": contact.lrp_active,
                "lrp_pv": contact.lrp_pv,
                "sponsor_id": contact.sponsor_id,
                "enroller_id": contact.enroller_id,
                "po3_level": contact.po3_level,
                "po3_boost_qualified": contact.po3_boost_qualified,
            },
            "tags": self._generate_tags(contact),
            "score": self._calculate_lead_score(contact),
        }
    
    def _generate_tags(self, contact: DoterraContact) -> List[str]:
        """Generiert automatische Tags"""
        tags = ["doTERRA"]
        
        # Rang-Tag
        if contact.rank != DoterraRank.UNKNOWN:
            tags.append(f"Rang: {contact.rank.display_name}")
        
        # LRP Status
        if contact.lrp_active:
            tags.append("LRP Aktiv")
        else:
            tags.append("LRP Inaktiv")
        
        # Leadership Status
        if contact.rank.level >= DoterraRank.SILVER.level:
            tags.append("Leader")
        
        # Builder Status
        if contact.legs >= 3:
            tags.append("Builder")
        
        # Power of 3
        if contact.po3_level > 0:
            tags.append(f"Po3 Level {contact.po3_level}")
        
        return tags
    
    def _calculate_lead_score(self, contact: DoterraContact) -> int:
        """Berechnet Lead Score (0-100)"""
        score = 50  # Basis
        
        # Rang-Bonus
        score += min(contact.rank.level * 3, 30)
        
        # LRP Bonus
        if contact.lrp_active:
            score += 10
        
        # Aktivitäts-Bonus (basierend auf PV)
        if contact.pv >= 100:
            score += 5
        if contact.pv >= 200:
            score += 5
        
        return min(100, max(0, score))


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


def get_field_mapping(headers: List[str]) -> Dict[str, str]:
    """Erstellt Field Mapping basierend auf CSV-Headers"""
    mapping = {}
    
    for header in headers:
        header_lower = header.lower().strip()
        
        for field_name, aliases in DOTERRA_FIELD_MAPPING.items():
            if header_lower in [a.lower() for a in aliases]:
                mapping[field_name] = header
                break
    
    return mapping


# Export für SalesFlow Integration
__all__ = [
    "DoterraRank",
    "DoterraContact",
    "DoterraParser",
    "DOTERRA_FIELD_MAPPING",
    "get_field_mapping",
    "RANK_REQUIREMENTS",
    "UNILEVEL_PERCENTAGES",
    "POWER_OF_3_BONUS",
]

