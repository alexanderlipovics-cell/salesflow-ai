"""
SalesFlow AI - MLM Field Mapping
=================================
Zentrales Field Mapping für alle unterstützten MLM-Unternehmen

Unterstützt:
- Zinzino
- PM-International (FitLine)
- doTERRA
- Herbalife
- Generic (Auto-Detection)

Features:
- Deutsche und englische Feldnamen
- Aliase und Varianten
- Auto-Detection basierend auf Headers
- Normalisierung
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum


class MLMCompany(Enum):
    """Unterstützte MLM-Unternehmen"""
    ZINZINO = "zinzino"
    PM_INTERNATIONAL = "pm-international"
    DOTERRA = "doterra"
    HERBALIFE = "herbalife"
    LR = "lr"
    VORWERK = "vorwerk"
    GENERIC = "generic"


# =============================================================================
# ZINZINO FIELD MAPPING
# =============================================================================

ZINZINO_FIELDS = {
    # Basis
    "partner_id": {
        "aliases": ["partner id", "id", "partner-id", "partnerid", "zinzino id"],
        "type": "string",
        "required": True,
    },
    "first_name": {
        "aliases": ["first name", "firstname", "vorname", "given name"],
        "type": "string",
        "required": True,
    },
    "last_name": {
        "aliases": ["last name", "lastname", "nachname", "surname", "family name"],
        "type": "string",
        "required": True,
    },
    "email": {
        "aliases": ["email", "e-mail", "email address", "e-mail-adresse"],
        "type": "string",
        "required": False,
    },
    "phone": {
        "aliases": ["phone", "telephone", "telefon", "tel", "mobile", "handy"],
        "type": "string",
        "required": False,
    },
    
    # Rang & Status
    "rank": {
        "aliases": ["rank", "rang", "current rank", "aktueller rang", "title"],
        "type": "string",
        "required": False,
    },
    "credits": {
        "aliases": ["credits", "cr", "kredit", "punkte"],
        "type": "number",
        "required": False,
    },
    "team_credits": {
        "aliases": ["team credits", "tc", "team-credits", "teampunkte", "group credits"],
        "type": "number",
        "required": False,
    },
    "pcp": {
        "aliases": ["pcp", "personal credits points"],
        "type": "number",
        "required": False,
    },
    
    # Sponsor
    "sponsor_id": {
        "aliases": ["sponsor id", "sponsor", "upline id", "upline", "enroller"],
        "type": "string",
        "required": False,
    },
    
    # Status
    "z4f_status": {
        "aliases": ["z4f", "z4f status", "zinzino 4 free"],
        "type": "boolean",
        "required": False,
    },
    "ecb_status": {
        "aliases": ["ecb", "ecb status", "extra customer bonus"],
        "type": "boolean",
        "required": False,
    },
    "subscription_active": {
        "aliases": ["subscription", "abo", "autoship", "auto-order"],
        "type": "boolean",
        "required": False,
    },
}


# =============================================================================
# PM-INTERNATIONAL FIELD MAPPING
# =============================================================================

PM_INTERNATIONAL_FIELDS = {
    # Basis
    "partner_id": {
        "aliases": ["partner-nr", "partner nr", "partnernr", "id", "pm id", "vertriebspartner-nr"],
        "type": "string",
        "required": True,
    },
    "first_name": {
        "aliases": ["vorname", "first name", "firstname"],
        "type": "string",
        "required": True,
    },
    "last_name": {
        "aliases": ["nachname", "last name", "lastname", "name"],
        "type": "string",
        "required": True,
    },
    "email": {
        "aliases": ["email", "e-mail"],
        "type": "string",
        "required": False,
    },
    "phone": {
        "aliases": ["telefon", "phone", "tel", "handy", "mobil"],
        "type": "string",
        "required": False,
    },
    
    # Rang
    "rank": {
        "aliases": ["rang", "rank", "stufe", "level", "karrierestufe"],
        "type": "string",
        "required": False,
    },
    
    # Volumen
    "volume_points": {
        "aliases": ["punkte", "p", "points", "volume points", "vp"],
        "type": "number",
        "required": False,
    },
    "gv": {
        "aliases": ["gv", "gruppenvolumen", "group volume", "team volume"],
        "type": "number",
        "required": False,
    },
    
    # Struktur
    "first_line_count": {
        "aliases": ["erstlinie", "first line", "frontline", "direkt", "1. linie"],
        "type": "number",
        "required": False,
    },
    "manager_lines": {
        "aliases": ["manager-linien", "manager lines", "ml"],
        "type": "number",
        "required": False,
    },
    
    # Sponsor
    "sponsor_id": {
        "aliases": ["sponsor", "sponsor-nr", "upline", "empfehler"],
        "type": "string",
        "required": False,
    },
    
    # Status
    "subscription_active": {
        "aliases": ["autoship", "abo", "auto-lieferung", "subscription"],
        "type": "boolean",
        "required": False,
    },
}


# =============================================================================
# DOTERRA FIELD MAPPING
# =============================================================================

DOTERRA_FIELDS = {
    # Basis
    "member_id": {
        "aliases": ["member id", "id", "member_id", "distributor id", "wa id", "wellness advocate id"],
        "type": "string",
        "required": True,
    },
    "first_name": {
        "aliases": ["first name", "firstname", "first_name", "vorname"],
        "type": "string",
        "required": True,
    },
    "last_name": {
        "aliases": ["last name", "lastname", "last_name", "nachname", "surname"],
        "type": "string",
        "required": True,
    },
    "email": {
        "aliases": ["email", "e-mail", "email address"],
        "type": "string",
        "required": False,
    },
    "phone": {
        "aliases": ["phone", "telephone", "phone number", "telefon", "tel", "mobile"],
        "type": "string",
        "required": False,
    },
    
    # Rang
    "rank": {
        "aliases": ["rank", "current rank", "rang", "aktueller rang", "title"],
        "type": "string",
        "required": False,
    },
    "highest_rank": {
        "aliases": ["highest rank", "paid as rank", "höchster rang", "paid rank"],
        "type": "string",
        "required": False,
    },
    
    # Volumen
    "pv": {
        "aliases": ["pv", "personal volume", "persönliches volumen", "personal vol"],
        "type": "number",
        "required": False,
    },
    "ov": {
        "aliases": ["ov", "organization volume", "org volume", "organisationsvolumen", "team volume"],
        "type": "number",
        "required": False,
    },
    "pgv": {
        "aliases": ["pgv", "personal growth volume", "growth volume"],
        "type": "number",
        "required": False,
    },
    "tv": {
        "aliases": ["tv", "team volume", "teamvolumen", "total volume"],
        "type": "number",
        "required": False,
    },
    
    # Struktur
    "legs": {
        "aliases": ["legs", "qualified legs", "beine", "qualifizierte beine", "active legs"],
        "type": "number",
        "required": False,
    },
    
    # LRP
    "lrp_active": {
        "aliases": ["lrp", "lrp active", "lrp status", "loyalty rewards", "loyalty rewards program"],
        "type": "boolean",
        "required": False,
    },
    "lrp_pv": {
        "aliases": ["lrp pv", "lrp volume", "lrp points"],
        "type": "number",
        "required": False,
    },
    
    # Sponsor
    "sponsor_id": {
        "aliases": ["sponsor id", "sponsor", "upline id", "upline"],
        "type": "string",
        "required": False,
    },
    "enroller_id": {
        "aliases": ["enroller id", "enroller", "einschreiber", "enrolling sponsor"],
        "type": "string",
        "required": False,
    },
}


# =============================================================================
# HERBALIFE FIELD MAPPING
# =============================================================================

HERBALIFE_FIELDS = {
    # Basis
    "distributor_id": {
        "aliases": ["distributor id", "id", "member id", "herbalife id", "dist id", "hbl id"],
        "type": "string",
        "required": True,
    },
    "first_name": {
        "aliases": ["first name", "firstname", "first_name", "vorname"],
        "type": "string",
        "required": True,
    },
    "last_name": {
        "aliases": ["last name", "lastname", "last_name", "nachname", "surname"],
        "type": "string",
        "required": True,
    },
    "email": {
        "aliases": ["email", "e-mail", "email address"],
        "type": "string",
        "required": False,
    },
    "phone": {
        "aliases": ["phone", "telephone", "phone number", "telefon", "tel", "mobile"],
        "type": "string",
        "required": False,
    },
    
    # Level
    "level": {
        "aliases": ["level", "status", "rank", "stufe", "rang", "discount level"],
        "type": "string",
        "required": False,
    },
    
    # Volumen
    "vp": {
        "aliases": ["vp", "volume points", "volumenpunkte", "points"],
        "type": "number",
        "required": False,
    },
    "ppv": {
        "aliases": ["ppv", "personally purchased volume", "persönlich gekaufte punkte", "personal purchase"],
        "type": "number",
        "required": False,
    },
    "tv": {
        "aliases": ["tv", "total volume", "gesamtvolumen", "team volume"],
        "type": "number",
        "required": False,
    },
    "ro": {
        "aliases": ["ro", "royalty points", "royalty override points", "royalty override"],
        "type": "number",
        "required": False,
    },
    
    # Compliance
    "retail_customers": {
        "aliases": ["retail customers", "customers", "kunden", "endkunden", "retail count"],
        "type": "number",
        "required": False,
    },
    "sold_percentage": {
        "aliases": ["sold %", "sold percentage", "verkauft %", "70% rule"],
        "type": "number",
        "required": False,
    },
    
    # Struktur
    "sponsor_id": {
        "aliases": ["sponsor id", "sponsor", "upline", "upline id"],
        "type": "string",
        "required": False,
    },
    "first_line_supervisors": {
        "aliases": ["first line", "first line supervisors", "erstlinie", "fl supervisors", "1st line sup"],
        "type": "number",
        "required": False,
    },
    
    # Nutrition Club
    "nutrition_club": {
        "aliases": ["nutrition club", "nc", "club", "has club"],
        "type": "boolean",
        "required": False,
    },
}


# =============================================================================
# GENERIC FIELD MAPPING (Auto-Detection)
# =============================================================================

GENERIC_FIELDS = {
    "id": {
        "aliases": ["id", "partner id", "member id", "distributor id", "nr", "nummer"],
        "type": "string",
        "required": True,
    },
    "first_name": {
        "aliases": ["first name", "firstname", "vorname", "given name"],
        "type": "string",
        "required": True,
    },
    "last_name": {
        "aliases": ["last name", "lastname", "nachname", "surname", "family name", "name"],
        "type": "string",
        "required": True,
    },
    "email": {
        "aliases": ["email", "e-mail"],
        "type": "string",
        "required": False,
    },
    "phone": {
        "aliases": ["phone", "telefon", "tel", "mobile", "handy"],
        "type": "string",
        "required": False,
    },
    "rank": {
        "aliases": ["rank", "rang", "level", "stufe", "status", "title"],
        "type": "string",
        "required": False,
    },
    "volume": {
        "aliases": ["volume", "volumen", "points", "punkte", "vp", "pv", "credits"],
        "type": "number",
        "required": False,
    },
    "sponsor": {
        "aliases": ["sponsor", "upline", "empfehler"],
        "type": "string",
        "required": False,
    },
}


# =============================================================================
# COMPANY FIELD MAPPING REGISTRY
# =============================================================================

COMPANY_FIELD_MAPPINGS = {
    MLMCompany.ZINZINO: ZINZINO_FIELDS,
    MLMCompany.PM_INTERNATIONAL: PM_INTERNATIONAL_FIELDS,
    MLMCompany.DOTERRA: DOTERRA_FIELDS,
    MLMCompany.HERBALIFE: HERBALIFE_FIELDS,
    MLMCompany.GENERIC: GENERIC_FIELDS,
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_field_mapping(company: MLMCompany, headers: List[str]) -> Dict[str, str]:
    """
    Erstellt Field Mapping basierend auf CSV-Headers
    
    Args:
        company: MLM-Unternehmen
        headers: CSV-Header-Liste
        
    Returns:
        Dict mit {field_name: header_name}
    """
    field_config = COMPANY_FIELD_MAPPINGS.get(company, GENERIC_FIELDS)
    mapping = {}
    
    # Normalisiere Headers
    normalized_headers = {h.lower().strip(): h for h in headers}
    
    for field_name, config in field_config.items():
        aliases = config.get("aliases", [])
        
        for alias in aliases:
            alias_lower = alias.lower()
            if alias_lower in normalized_headers:
                mapping[field_name] = normalized_headers[alias_lower]
                break
    
    return mapping


def detect_company_from_headers(headers: List[str]) -> Tuple[MLMCompany, float]:
    """
    Erkennt MLM-Unternehmen basierend auf CSV-Headers
    
    Returns:
        Tuple von (Company, Confidence 0-1)
    """
    normalized = [h.lower().strip() for h in headers]
    
    # Zinzino-spezifische Keywords
    zinzino_keywords = ["z4f", "ecb", "team credits", "pcp"]
    zinzino_score = sum(1 for kw in zinzino_keywords if any(kw in h for h in normalized))
    
    # PM-International-spezifische Keywords
    pm_keywords = ["erstlinie", "manager-linien", "gruppenvolumen", "fitline"]
    pm_score = sum(1 for kw in pm_keywords if any(kw in h for h in normalized))
    
    # doTERRA-spezifische Keywords
    doterra_keywords = ["lrp", "wellness advocate", "pgv", "enroller"]
    doterra_score = sum(1 for kw in doterra_keywords if any(kw in h for h in normalized))
    
    # Herbalife-spezifische Keywords
    herbalife_keywords = ["nutrition club", "royalty", "supervisor", "ppv"]
    herbalife_score = sum(1 for kw in herbalife_keywords if any(kw in h for h in normalized))
    
    scores = {
        MLMCompany.ZINZINO: zinzino_score,
        MLMCompany.PM_INTERNATIONAL: pm_score,
        MLMCompany.DOTERRA: doterra_score,
        MLMCompany.HERBALIFE: herbalife_score,
    }
    
    best_match = max(scores, key=scores.get)
    best_score = scores[best_match]
    
    if best_score == 0:
        return MLMCompany.GENERIC, 0.0
    
    # Confidence basierend auf Anzahl der Matches
    confidence = min(1.0, best_score / 3)
    
    return best_match, confidence


def validate_mapping(
    company: MLMCompany, 
    mapping: Dict[str, str]
) -> Tuple[bool, List[str]]:
    """
    Validiert ein Field Mapping
    
    Returns:
        Tuple von (is_valid, missing_required_fields)
    """
    field_config = COMPANY_FIELD_MAPPINGS.get(company, GENERIC_FIELDS)
    
    missing = []
    for field_name, config in field_config.items():
        if config.get("required", False) and field_name not in mapping:
            missing.append(field_name)
    
    return len(missing) == 0, missing


def normalize_value(value: Any, field_type: str) -> Any:
    """Normalisiert einen Wert basierend auf Feldtyp"""
    
    if value is None or value == "":
        return None
    
    if field_type == "number":
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Deutsche Zahlenformat-Konvertierung
            value = value.replace(".", "").replace(",", ".").strip()
            try:
                return float(value)
            except ValueError:
                return None
    
    elif field_type == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ("true", "yes", "ja", "1", "aktiv", "active", "x")
        return bool(value)
    
    elif field_type == "string":
        return str(value).strip()
    
    return value


def get_company_display_info(company: MLMCompany) -> Dict[str, str]:
    """Gibt Display-Informationen für ein Unternehmen zurück"""
    
    info = {
        MLMCompany.ZINZINO: {
            "name": "Zinzino",
            "icon": "🧪",
            "description": "Gesundheit & Nahrungsergänzung",
        },
        MLMCompany.PM_INTERNATIONAL: {
            "name": "PM-International (FitLine)",
            "icon": "💊",
            "description": "Sport- & Wellnessprodukte",
        },
        MLMCompany.DOTERRA: {
            "name": "doTERRA",
            "icon": "🌿",
            "description": "Ätherische Öle & Wellness",
        },
        MLMCompany.HERBALIFE: {
            "name": "Herbalife",
            "icon": "🥤",
            "description": "Ernährung & Gewichtsmanagement",
        },
        MLMCompany.LR: {
            "name": "LR Health & Beauty",
            "icon": "💄",
            "description": "Kosmetik & Nahrungsergänzung",
        },
        MLMCompany.VORWERK: {
            "name": "Vorwerk",
            "icon": "🏠",
            "description": "Haushaltsgeräte",
        },
        MLMCompany.GENERIC: {
            "name": "Andere MLM",
            "icon": "📊",
            "description": "Automatische Erkennung",
        },
    }
    
    return info.get(company, info[MLMCompany.GENERIC])


# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    "MLMCompany",
    "ZINZINO_FIELDS",
    "PM_INTERNATIONAL_FIELDS",
    "DOTERRA_FIELDS",
    "HERBALIFE_FIELDS",
    "GENERIC_FIELDS",
    "COMPANY_FIELD_MAPPINGS",
    "get_field_mapping",
    "detect_company_from_headers",
    "validate_mapping",
    "normalize_value",
    "get_company_display_info",
]

