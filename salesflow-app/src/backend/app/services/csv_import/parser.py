"""
CSV Parser für verschiedene MLM-Formate
"""

import csv
import io
import re
from typing import List, Dict, Optional, Any
from enum import Enum


class MLMCompany(str, Enum):
    """MLM-Unternehmen."""
    ZINZINO = "zinzino"
    PM_INTERNATIONAL = "pm-international"
    DOTERRA = "doterra"
    HERBALIFE = "herbalife"
    LR = "lr"
    VORWERK = "vorwerk"
    GENERIC = "generic"


class CSVParser:
    """Basis CSV Parser."""
    
    def __init__(self, csv_content: str, delimiter: str = ','):
        self.csv_content = csv_content
        self.delimiter = delimiter
        self.rows: List[Dict[str, str]] = []
        self.headers: List[str] = []
    
    def parse(self) -> List[Dict[str, str]]:
        """Parst CSV und gibt Liste von Dictionaries zurück."""
        try:
            reader = csv.DictReader(
                io.StringIO(self.csv_content),
                delimiter=self.delimiter
            )
            self.headers = reader.fieldnames or []
            self.rows = [row for row in reader]
            return self.rows
        except Exception as e:
            raise ValueError(f"CSV Parse Fehler: {str(e)}")
    
    def get_headers(self) -> List[str]:
        """Gibt Spalten-Header zurück."""
        if not self.headers:
            self.parse()
        return self.headers
    
    def get_sample_rows(self, count: int = 5) -> List[Dict[str, str]]:
        """Gibt Beispiel-Zeilen zurück."""
        if not self.rows:
            self.parse()
        return self.rows[:count]


class MLMParserFactory:
    """Factory für MLM-spezifische Parser."""
    
    @staticmethod
    def create_parser(company: MLMCompany, csv_content: str) -> 'BaseMLMParser':
        """Erstellt Parser für spezifisches MLM-Unternehmen."""
        parsers = {
            MLMCompany.ZINZINO: ZinzinoParser,
            MLMCompany.PM_INTERNATIONAL: PMInternationalParser,
            MLMCompany.DOTERRA: DoTerraParser,
            MLMCompany.HERBALIFE: HerbalifeParser,
            MLMCompany.LR: LRParser,
            MLMCompany.VORWERK: VorwerkParser,
            MLMCompany.GENERIC: GenericMLMParser,
        }
        
        parser_class = parsers.get(company, GenericMLMParser)
        return parser_class(csv_content)
    
    @staticmethod
    def detect_company(headers: List[str]) -> MLMCompany:
        """Erkennt MLM-Unternehmen basierend auf Headers."""
        headers_lower = [h.lower() for h in headers]
        
        # ZINZINO: Partner ID, Vorname, Nachname, Email, Telefon, Rang, Credits, Sponsor ID, Z4F
        if any('partner id' in h or 'partnerid' in h for h in headers_lower):
            if any('credits' in h or 'z4f' in h for h in headers_lower):
                return MLMCompany.ZINZINO
        
        # PM-International: Partner-Nr, Vorname, Nachname, Email, Telefon, Rang, Punkte, GV, Erstlinie, Sponsor, Autoship
        if any('partner-nr' in h or 'partner nr' in h or 'partnernr' in h for h in headers_lower):
            if any('punkte' in h or 'points' in h or 'p' in h for h in headers_lower):
                return MLMCompany.PM_INTERNATIONAL
        if any('pm' in h and 'international' in h for h in headers_lower):
            return MLMCompany.PM_INTERNATIONAL
        
        # doTERRA: Vorname, Nachname, Email, Telefon, Rank, OV
        if any('rank' in h for h in headers_lower):
            if any('ov' in h or 'organization' in h for h in headers_lower):
                return MLMCompany.DOTERRA
        
        # Herbalife: Name, ID, Sponsor, Level, VP, PP
        if any('sponsor' in h for h in headers_lower):
            if any('vp' in h or 'pp' in h for h in headers_lower):
                return MLMCompany.HERBALIFE
        
        # LR: Ähnlich wie Herbalife
        if any('lr' in h for h in headers_lower):
            return MLMCompany.LR
        
        # Vorwerk: Ähnlich wie PM-International
        if any('vorwerk' in h for h in headers_lower):
            return MLMCompany.VORWERK
        
        return MLMCompany.GENERIC


class BaseMLMParser(CSVParser):
    """Basis Parser für MLM-Formate."""
    
    def __init__(self, csv_content: str, company: MLMCompany):
        super().__init__(csv_content)
        self.company = company
    
    def normalize_contact(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Normalisiert Kontakt-Daten für Datenbank."""
        return {
            'name': self._get_name(row),
            'first_name': self._get_first_name(row),
            'last_name': self._get_last_name(row),
            'email': self._get_email(row),
            'phone': self._get_phone(row),
            'mlm_company': self.company.value,
            'mlm_id': self._get_mlm_id(row),
            'mlm_rank': self._get_rank(row),
            'team_position': self._get_team_position(row),
            'mlm_pv': self._get_pv(row),
            'mlm_gv': self._get_gv(row),
            'mlm_ov': self._get_ov(row),
            'mlm_vp': self._get_vp(row),
            'mlm_pp': self._get_pp(row),
            'team_id': self._get_team_id(row),
            'sponsor_id': self._get_sponsor_id(row),
            'sponsor_name': self._get_sponsor_name(row),
            'mlm_level': self._get_level(row),
        }
    
    def _get_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert vollständigen Namen."""
        return row.get('Name') or row.get('name') or None
    
    def _get_first_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Vorname."""
        return row.get('Vorname') or row.get('vorname') or row.get('First Name') or row.get('first_name') or None
    
    def _get_last_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Nachname."""
        return row.get('Nachname') or row.get('nachname') or row.get('Last Name') or row.get('last_name') or None
    
    def _get_email(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert E-Mail."""
        return (
            row.get('Email') or 
            row.get('email') or 
            row.get('E-Mail') or 
            row.get('E-mail') or
            row.get('e-mail') or 
            None
        )
    
    def _get_phone(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Telefonnummer."""
        return (
            row.get('Telefon') or 
            row.get('telefon') or 
            row.get('Phone') or 
            row.get('phone') or
            row.get('Tel') or
            row.get('Mobile') or
            None
        )
    
    def _get_mlm_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert MLM-ID."""
        return row.get('ID') or row.get('id') or row.get('MLM-ID') or row.get('mlm_id') or None
    
    def _get_rank(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Rang."""
        return row.get('Rang') or row.get('rang') or row.get('Rank') or row.get('rank') or None
    
    def _get_team_position(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Team-Position."""
        return None  # Wird von spezifischen Parsern überschrieben
    
    def _get_pv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Personal Volume."""
        val = row.get('PV') or row.get('pv') or row.get('Personal Volume') or None
        return float(val) if val else None
    
    def _get_gv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Group Volume."""
        val = row.get('GV') or row.get('gv') or row.get('Group Volume') or None
        return float(val) if val else None
    
    def _get_ov(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Organization Volume."""
        val = row.get('OV') or row.get('ov') or row.get('Organization Volume') or None
        return float(val) if val else None
    
    def _get_vp(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Volume Points."""
        val = row.get('VP') or row.get('vp') or row.get('Volume Points') or None
        return float(val) if val else None
    
    def _get_pp(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Performance Points."""
        val = row.get('PP') or row.get('pp') or row.get('Performance Points') or None
        return float(val) if val else None
    
    def _get_team_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Team-ID."""
        return row.get('Team-ID') or row.get('team_id') or row.get('Team ID') or None
    
    def _get_sponsor_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Sponsor-ID."""
        return row.get('Sponsor') or row.get('sponsor') or row.get('Sponsor ID') or row.get('sponsor_id') or None
    
    def _get_sponsor_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Sponsor-Name."""
        return row.get('Sponsor Name') or row.get('sponsor_name') or None
    
    def _get_level(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert Level."""
        val = row.get('Level') or row.get('level') or None
        return int(val) if val else None


class PMInternationalParser(BaseMLMParser):
    """Parser für PM-International (FitLine) Export."""
    
    # PM-International Rang-Hierarchie
    PM_RANKS = {
        # Basis
        'teampartner': 1,        # TP - Start
        'manager': 2,            # M - 600 P
        'sales manager': 3,      # SM - 2.500 P
        'marketing manager': 4,  # MM - 5.000 P
        
        # Führungsebene (ab hier Auto-Bonus)
        'international marketing manager': 5,  # IMM - 10.000 P, ≥3 Manager
        'vice president': 6,                   # VP - 25.000 P, ≥3 SM
        'executive vice president': 7,         # EVP - 50.000 P, ≥3 MM
        
        # Top Management
        'president': 8,                    # P - 100.000 P, ≥3 IMM
        'silver presidents team': 9,       # SP - 200.000 P, ≥3 VP
        'gold presidents team': 10,        # GP - 400.000 P, ≥3 EVP
        'platinum presidents team': 11,    # PP - 600.000 P, ≥4 EVP
        'champions league': 12             # CL - 1.000.000 P, ≥5 P
    }
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.PM_INTERNATIONAL)
    
    def normalize_rank(self, rank: str) -> str:
        """Normalisiert PM-International Rang-String."""
        if not rank:
            return 'teampartner'
        
        normalized = rank.lower().strip()
        
        # Handle abbreviations
        if normalized == 'tp':
            return 'teampartner'
        if normalized == 'm':
            return 'manager'
        if normalized == 'sm':
            return 'sales manager'
        if normalized == 'mm':
            return 'marketing manager'
        if normalized == 'imm':
            return 'international marketing manager'
        if normalized == 'vp':
            return 'vice president'
        if normalized == 'evp':
            return 'executive vice president'
        if normalized in ['p', 'pt']:
            return 'president'
        if normalized == 'sp':
            return 'silver presidents team'
        if normalized == 'gp':
            return 'gold presidents team'
        if normalized == 'pp':
            return 'platinum presidents team'
        if normalized == 'cl':
            return 'champions league'
        
        # Handle German variations
        if 'silber' in normalized:
            return 'silver presidents team'
        if 'gold' in normalized and 'president' in normalized:
            return 'gold presidents team'
        if 'platin' in normalized:
            return 'platinum presidents team'
        if 'champion' in normalized:
            return 'champions league'
        
        # Normalisiere Leerzeichen (mehrfache Leerzeichen zu einem)
        normalized = re.sub(r'\s+', ' ', normalized)
        
        return normalized
    
    def _get_mlm_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Partner-Nr."""
        return (
            row.get('Partner-Nr') or 
            row.get('Partner Nr') or 
            row.get('PartnerNr') or 
            row.get('ID') or 
            row.get('id') or
            row.get('Vertriebspartner-Nr') or
            row.get('Partner ID') or
            None
        )
    
    def _get_first_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Vorname."""
        return (
            row.get('Vorname') or 
            row.get('First Name') or 
            row.get('FirstName') or
            row.get('first_name') or 
            None
        )
    
    def _get_last_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Nachname."""
        return (
            row.get('Nachname') or 
            row.get('Last Name') or 
            row.get('LastName') or
            row.get('last_name') or
            row.get('Name') or  # Fallback falls nur Name vorhanden
            None
        )
    
    def _get_rank(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert und normalisiert Rang."""
        rank = (
            row.get('Rang') or 
            row.get('Rank') or 
            row.get('Status') or
            row.get('Stufe') or
            row.get('Karrierestufe') or
            None
        )
        if rank:
            return self.normalize_rank(rank)
        return None
    
    def _get_sponsor_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Sponsor/Upline ID."""
        return (
            row.get('Sponsor') or 
            row.get('Upline') or 
            row.get('Einschreiber') or
            row.get('Empfehler') or
            row.get('Sponsor ID') or
            row.get('sponsor_id') or
            None
        )
    
    def _get_pv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Punkte (Personal Volume). 1 Punkt ≈ 0,51€"""
        val = (
            row.get('Punkte') or 
            row.get('Points') or 
            row.get('P') or
            row.get('PV') or
            row.get('Eigenumsatz') or
            None
        )
        try:
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_gv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert GV (Geschäftsvolumen / Group Volume)."""
        val = (
            row.get('GV') or 
            row.get('Geschäftsvolumen') or 
            row.get('Gruppenvolumen') or
            row.get('Team Volume') or
            None
        )
        try:
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_first_line_count(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert Erstlinie (First Line Count)."""
        val = (
            row.get('Erstlinie') or 
            row.get('First Line') or 
            row.get('Frontline') or
            row.get('Direkte Partner') or
            None
        )
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_subscription_active(self, row: Dict[str, str]) -> bool:
        """Extrahiert Autoship/ABO Status."""
        val = (
            row.get('Autoship') or 
            row.get('ABO') or 
            row.get('Auto Order') or
            row.get('Abo-Status') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1', 'ja', 'y']
    
    def is_auto_bonus_qualified(self, rank: str) -> bool:
        """Prüft Auto-Bonus Qualifikation (ab IMM)."""
        normalized_rank = self.normalize_rank(rank) if rank else 'teampartner'
        level = self.PM_RANKS.get(normalized_rank, 0)
        return level >= 5  # IMM oder höher
    
    def get_required_manager_lines(self, rank: str) -> int:
        """Gibt erforderliche Manager-Linien für Rang zurück."""
        normalized_rank = self.normalize_rank(rank) if rank else 'teampartner'
        requirements = {
            'international marketing manager': 3,
            'vice president': 3,
            'executive vice president': 3,
            'president': 3,
            'silver presidents team': 3,
            'gold presidents team': 3,
            'platinum presidents team': 4,
            'champions league': 5
        }
        return requirements.get(normalized_rank, 0)
    
    def points_to_euro(self, points: Optional[float]) -> Optional[float]:
        """Konvertiert Punkte zu Euro (1 P ≈ 0,51€)."""
        if points is None:
            return None
        return points * 0.51
    
    def normalize_contact(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Normalisiert PM-International Kontakt-Daten."""
        base = super().normalize_contact(row)
        
        # PM-International-spezifische Felder
        rank = self._get_rank(row)
        rank_level = None
        if rank:
            rank_level = self.PM_RANKS.get(rank, 1)
        
        # Punkte und Volumen
        points = self._get_pv(row)
        volume_euro = self.points_to_euro(points) if points else None
        group_volume = self._get_gv(row)
        first_line_count = self._get_first_line_count(row)
        subscription_active = self._get_subscription_active(row)
        
        # Auto-Bonus Qualifikation
        auto_bonus_qualified = self.is_auto_bonus_qualified(rank) if rank else False
        
        # Manager-Linien
        manager_lines = self.get_required_manager_lines(rank) if rank else 0
        
        # Erweitere base mit PM-International-spezifischen Daten
        base.update({
            'mlm_rank_level': rank_level,
            'volume_points': points,  # Punkte (P)
            'volume_euro': volume_euro,  # Punkte in Euro umgerechnet
            'first_line_count': first_line_count,
            'subscription_active': subscription_active,  # Autoship/ABO
            'auto_bonus_qualified': auto_bonus_qualified,
            'manager_lines': manager_lines,
        })
        
        return base


class DoTerraParser(BaseMLMParser):
    """Parser für doTERRA Export (Compensation Plan Elevated 2025)."""
    
    # doTERRA Rang-Hierarchie (14 Levels)
    DOTERRA_RANKS = {
        'unknown': 0,
        'wellness_advocate': 1,        # WA
        'manager': 2,                  # M - 500 OV
        'director': 3,                 # D - 1000 OV
        'executive': 4,                # E - 2000 OV
        'elite': 5,                    # Elite - 3000 OV
        'premier': 6,                  # Premier - 5000 OV, ≥2 Executive Legs
        'silver': 7,                   # Silver - ≥3 Elite Legs
        'gold': 8,                     # Gold - ≥3 Premier Legs
        'platinum': 9,                 # Platinum - ≥3 Silver Legs
        'diamond': 10,                 # Diamond - ≥4 Silver Legs
        'blue_diamond': 11,            # Blue Diamond - ≥5 Gold Legs
        'presidential_diamond': 12,    # Presidential Diamond - ≥6 Platinum Legs
        'double_presidential': 13,     # Double Presidential Diamond
        'triple_presidential': 14,     # Triple Presidential Diamond
    }
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.DOTERRA)
        # Import doTERRA Parser aus parsers-Modul
        try:
            from .parsers.doterra_parser import DoterraParser, DoterraRank
            self.doterra_parser = DoterraParser()
            self.DoterraRank = DoterraRank
        except ImportError:
            self.doterra_parser = None
            self.DoterraRank = None
    
    def normalize_rank(self, rank: str) -> str:
        """Normalisiert doTERRA Rang-String."""
        if not rank:
            return 'unknown'
        
        if self.doterra_parser:
            doterra_rank = self.doterra_parser.normalize_rank(rank)
            return doterra_rank.id if doterra_rank else 'unknown'
        
        # Fallback ohne Parser
        normalized = rank.lower().strip()
        rank_map = {
            'wa': 'wellness_advocate',
            'mgr': 'manager', 'm': 'manager',
            'dir': 'director', 'd': 'director',
            'exec': 'executive', 'e': 'executive',
            'prem': 'premier',
            'sil': 'silver', 'silber': 'silver',
            'g': 'gold',
            'plat': 'platinum', 'platin': 'platinum',
            'dia': 'diamond', 'diamant': 'diamond',
            'bd': 'blue_diamond',
            'pd': 'presidential_diamond',
            'dpd': 'double_presidential',
            'tpd': 'triple_presidential',
        }
        return rank_map.get(normalized, normalized.replace(' ', '_'))
    
    def _get_mlm_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Member ID."""
        return (
            row.get('Member ID') or 
            row.get('MemberID') or 
            row.get('ID') or 
            row.get('id') or
            row.get('Distributor ID') or
            row.get('WA ID') or
            None
        )
    
    def _get_first_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Vorname."""
        return (
            row.get('Vorname') or 
            row.get('First Name') or 
            row.get('FirstName') or
            row.get('first_name') or 
            None
        )
    
    def _get_last_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Nachname."""
        return (
            row.get('Nachname') or 
            row.get('Last Name') or 
            row.get('LastName') or
            row.get('last_name') or
            row.get('Surname') or
            None
        )
    
    def _get_rank(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert und normalisiert Rang."""
        rank = (
            row.get('Rank') or 
            row.get('Current Rank') or 
            row.get('Rang') or
            row.get('Paid As Rank') or
            row.get('Highest Rank') or
            None
        )
        if rank:
            return self.normalize_rank(rank)
        return None
    
    def _get_ov(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert OV (Organization Volume)."""
        val = (
            row.get('OV') or 
            row.get('Organization Volume') or 
            row.get('Org Volume') or
            row.get('Organisationsvolumen') or
            None
        )
        try:
            if isinstance(val, str):
                # Handle German number format (1.234,56)
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_pv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert PV (Personal Volume)."""
        val = (
            row.get('PV') or 
            row.get('Personal Volume') or 
            row.get('Persönliches Volumen') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_pgv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert PGV (Personal Growth Volume)."""
        val = (
            row.get('PGV') or 
            row.get('Personal Growth Volume') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_tv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert TV (Team Volume)."""
        val = (
            row.get('TV') or 
            row.get('Team Volume') or 
            row.get('Teamvolumen') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_legs(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert qualifizierte Legs."""
        val = (
            row.get('Legs') or 
            row.get('Qualified Legs') or 
            row.get('Beine') or
            row.get('Qualifizierte Beine') or
            None
        )
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_lrp_active(self, row: Dict[str, str]) -> bool:
        """Extrahiert LRP Status (Loyalty Rewards Program)."""
        val = (
            row.get('LRP') or 
            row.get('LRP Active') or 
            row.get('LRP Status') or
            row.get('Loyalty Rewards') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1', 'y']
    
    def _get_lrp_pv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert LRP PV."""
        val = (
            row.get('LRP PV') or 
            row.get('LRP Volume') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert vollständigen Namen."""
        first = self._get_first_name(row)
        last = self._get_last_name(row)
        if first and last:
            return f"{first} {last}"
        return first or last
    
    def normalize_contact(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Normalisiert doTERRA Kontakt-Daten."""
        base = super().normalize_contact(row)
        
        # doTERRA-spezifische Felder
        rank = self._get_rank(row)
        rank_level = None
        if rank:
            rank_level = self.DOTERRA_RANKS.get(rank, 0)
        
        # Volumen
        pv = self._get_pv(row)
        ov = self._get_ov(row)
        pgv = self._get_pgv(row)
        tv = self._get_tv(row)
        
        # Struktur
        legs = self._get_legs(row) or 0
        
        # LRP Status
        lrp_active = self._get_lrp_active(row)
        lrp_pv = self._get_lrp_pv(row)
        
        # Power of 3 Level (vereinfacht)
        po3_level = 0
        if legs >= 9:
            po3_level = 3
        elif legs >= 3:
            po3_level = 2
        elif legs >= 1:
            po3_level = 1
        
        # Boost-Qualifikation (vereinfacht: PGV >= 400)
        po3_boost_qualified = (pgv or 0) >= 400
        
        # Erweitere base mit doTERRA-spezifischen Daten
        base.update({
            'mlm_rank_level': rank_level,
            'mlm_pv': pv,
            'mlm_ov': ov,
            'pgv': pgv,  # Personal Growth Volume
            'tv': tv,  # Team Volume
            'legs': legs,  # Qualifizierte Beine
            'lrp_active': lrp_active,  # Loyalty Rewards Program
            'lrp_pv': lrp_pv,
            'po3_level': po3_level,  # Power of 3 Level
            'po3_boost_qualified': po3_boost_qualified,
        })
        
        return base


class HerbalifeParser(BaseMLMParser):
    """Parser für Herbalife Export (Sales & Marketing Plan 2025)."""
    
    # Herbalife Level-Hierarchie (14 Levels)
    HERBALIFE_LEVELS = {
        'unknown': 0,
        'distributor': 1,              # 25% Discount
        'senior_consultant': 2,        # 35% Discount
        'success_builder': 3,          # 42% Discount
        'qualified_producer': 4,       # 42% Discount
        'supervisor': 5,               # 50% Discount - KRITISCH!
        'world_team': 6,               # TAB Team
        'get_team': 7,                 # TAB Team - 1.000 RO
        'millionaire_team': 8,         # TAB Team - 4.000 RO
        'presidents_team': 9,          # TAB Team - 10.000 RO
        'presidents_20k': 10,          # TAB Team - 20.000 RO
        'presidents_30k': 11,          # TAB Team - 30.000 RO
        'presidents_50k': 12,          # TAB Team - 50.000 RO
        'chairmans_club': 13,
        'founders_circle': 14,
    }
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.HERBALIFE)
        # Import Herbalife Parser aus parsers-Modul
        try:
            from .parsers.herbalife_parser import HerbalifeParser, HerbalifeLevel
            self.herbalife_parser = HerbalifeParser()
            self.HerbalifeLevel = HerbalifeLevel
        except ImportError:
            self.herbalife_parser = None
            self.HerbalifeLevel = None
    
    def normalize_level(self, level: str) -> str:
        """Normalisiert Herbalife Level-String."""
        if not level:
            return 'unknown'
        
        if self.herbalife_parser:
            herbalife_level = self.herbalife_parser.normalize_level(level)
            return herbalife_level.id if herbalife_level else 'unknown'
        
        # Fallback ohne Parser
        normalized = level.lower().strip()
        level_map = {
            'dist': 'distributor', 'member': 'distributor',
            'sc': 'senior_consultant',
            'sb': 'success_builder',
            'qp': 'qualified_producer',
            'sup': 'supervisor', 'spv': 'supervisor',
            'wt': 'world_team',
            'get': 'get_team',
            'mt': 'millionaire_team',
            'pt': 'presidents_team',
        }
        return level_map.get(normalized, normalized.replace(' ', '_').replace("'", ''))
    
    def _get_mlm_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Distributor ID."""
        return (
            row.get('Distributor ID') or 
            row.get('DistributorID') or 
            row.get('ID') or 
            row.get('id') or
            row.get('Herbalife ID') or
            row.get('Dist ID') or
            None
        )
    
    def _get_level(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert Level."""
        level_str = (
            row.get('Level') or 
            row.get('Status') or 
            row.get('Rank') or
            row.get('Stufe') or
            None
        )
        if level_str:
            normalized = self.normalize_level(level_str)
            return self.HERBALIFE_LEVELS.get(normalized, 0)
        return None
    
    def _get_vp(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert VP (Volume Points)."""
        val = (
            row.get('VP') or 
            row.get('Volume Points') or 
            row.get('Volumenpunkte') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_ppv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert PPV (Personally Purchased Volume)."""
        val = (
            row.get('PPV') or 
            row.get('Personally Purchased Volume') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_ro(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert RO (Royalty Override Points)."""
        val = (
            row.get('RO') or 
            row.get('Royalty Points') or 
            row.get('Royalty Override Points') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace(".", "").replace(",", ".")
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_retail_customers(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert Retail Customers Count."""
        val = (
            row.get('Retail Customers') or 
            row.get('Customers') or 
            row.get('Kunden') or
            None
        )
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_sold_percentage(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Sold Percentage (70% Rule)."""
        val = (
            row.get('Sold %') or 
            row.get('Sold Percentage') or 
            row.get('Verkauft %') or
            None
        )
        try:
            if isinstance(val, str):
                val = val.replace("%", "").replace(",", ".")
            return float(val) / 100 if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_first_line_supervisors(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert First Line Supervisors."""
        val = (
            row.get('First Line') or 
            row.get('First Line Supervisors') or 
            row.get('Erstlinie') or
            None
        )
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_nutrition_club(self, row: Dict[str, str]) -> bool:
        """Extrahiert Nutrition Club Status."""
        val = (
            row.get('Nutrition Club') or 
            row.get('NC') or 
            row.get('Club') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1', 'y', 'x']
    
    def _get_team_position(self, row: Dict[str, str]) -> Optional[str]:
        sponsor = self._get_sponsor_id(row)
        if sponsor:
            return 'downline'
        return 'sponsor'
    
    def normalize_contact(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Normalisiert Herbalife Kontakt-Daten."""
        base = super().normalize_contact(row)
        
        # Herbalife-spezifische Felder
        level = self._get_level(row)
        is_supervisor = level and level >= 5
        
        # Volumen
        vp = self._get_vp(row)
        ppv = self._get_ppv(row)
        tv = self._get_tv(row)
        ro = self._get_ro(row)
        
        # Compliance
        retail_customers = self._get_retail_customers(row) or 0
        sold_percentage = self._get_sold_percentage(row) or 0.70
        retail_compliant = retail_customers >= 10 and sold_percentage >= 0.70
        
        # Struktur
        first_line_supervisors = self._get_first_line_supervisors(row) or 0
        
        # Nutrition Club
        has_nutrition_club = self._get_nutrition_club(row)
        
        # Re-Qualifikation (KRITISCH!)
        requalification_at_risk = False
        if is_supervisor:
            from datetime import date
            today = date.today()
            deadline = date(today.year + 1, 1, 31)
            days_remaining = (deadline - today).days
            # Vereinfacht: At Risk wenn < 90 Tage
            requalification_at_risk = days_remaining < 90
        
        # TAB Team Level (vereinfacht basierend auf RO)
        tab_team_level = None
        production_bonus_rate = 0.0
        if ro:
            if ro >= 50000:
                tab_team_level = 'presidents_50k'
                production_bonus_rate = 0.07
            elif ro >= 30000:
                tab_team_level = 'presidents_30k'
                production_bonus_rate = 0.065
            elif ro >= 20000:
                tab_team_level = 'presidents_20k'
                production_bonus_rate = 0.065
            elif ro >= 10000:
                tab_team_level = 'presidents_team'
                production_bonus_rate = 0.06
            elif ro >= 4000:
                tab_team_level = 'millionaire_team'
                production_bonus_rate = 0.04
            elif ro >= 1000:
                tab_team_level = 'get_team'
                production_bonus_rate = 0.02
        
        # Erweitere base mit Herbalife-spezifischen Daten
        base.update({
            'mlm_level': level,
            'mlm_vp': vp,
            'ppv': ppv,  # Personally Purchased Volume
            'mlm_tv': tv,
            'ro': ro,  # Royalty Override Points
            'is_supervisor': is_supervisor,
            'retail_customers_count': retail_customers,
            'retail_compliant': retail_compliant,
            'sold_percentage': sold_percentage,
            'first_line_supervisors': first_line_supervisors,
            'has_nutrition_club': has_nutrition_club,
            'tab_team_level': tab_team_level,
            'production_bonus_rate': production_bonus_rate,
            'requalification_at_risk': requalification_at_risk,
        })
        
        return base


class LRParser(BaseMLMParser):
    """Parser für LR Export."""
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.LR)


class VorwerkParser(BaseMLMParser):
    """Parser für Vorwerk Export."""
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.VORWERK)


class ZinzinoParser(BaseMLMParser):
    """Parser für ZINZINO Export."""
    
    # ZINZINO Rank Mapping (korrekte Hierarchie)
    ZINZINO_RANKS = {
        # Fast Start Titel
        'partner': 1,
        'q-team': 2,
        'x-team': 3,           # 10 Kunden = Lifetime ECB!
        'a-team': 4,
        'pro-team': 5,
        'top-team': 6,
        'top-team 200': 7,
        'top-team 300': 8,
        # Führungsränge
        'bronze': 9,
        'silver': 10,
        'gold': 11,
        'executive': 12,       # zPhone Bonus (200 PP)
        'diamond': 13,         # zCar Bonus (1000€)
        'director': 14,
        'crown': 15,
        'royal crown': 16,
        'black ambassador': 17,
        'president': 18,
    }
    
    def normalize_rank(self, rank: str) -> str:
        """Normalisiert ZINZINO Rang-String."""
        if not rank:
            return 'partner'
        
        normalized = rank.lower().strip()
        
        # Handle variations
        if 'smart bronze' in normalized or 'fast bronze' in normalized:
            return 'bronze'
        if 'fast silver' in normalized or 'smart silver' in normalized:
            return 'silver'
        if 'top-team' in normalized and '200' in normalized:
            return 'top-team 200'
        if 'top-team' in normalized and '300' in normalized:
            return 'top-team 300'
        if 'royal' in normalized and 'crown' in normalized:
            return 'royal crown'
        if 'black' in normalized and 'ambassador' in normalized:
            return 'black ambassador'
        
        # Entferne Leerzeichen und normalisiere
        normalized = normalized.replace(' ', '-')
        
        return normalized
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.ZINZINO)
    
    def _get_mlm_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Partner ID."""
        return (
            row.get('Partner ID') or 
            row.get('PartnerID') or 
            row.get('ID') or 
            row.get('id') or
            row.get('Partner-Nr') or
            row.get('Partner Nr') or
            None
        )
    
    def _get_first_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Vorname."""
        return (
            row.get('Vorname') or 
            row.get('First Name') or 
            row.get('FirstName') or
            row.get('first_name') or 
            None
        )
    
    def _get_last_name(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Nachname."""
        return (
            row.get('Nachname') or 
            row.get('Last Name') or 
            row.get('LastName') or
            row.get('last_name') or 
            None
        )
    
    def _get_rank(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert und normalisiert Rang."""
        rank = (
            row.get('Rang') or 
            row.get('Rank') or 
            row.get('Title') or
            row.get('Titel') or
            row.get('Status') or
            None
        )
        if rank:
            return self.normalize_rank(rank)
        return None
    
    def _get_sponsor_id(self, row: Dict[str, str]) -> Optional[str]:
        """Extrahiert Sponsor ID."""
        return (
            row.get('Sponsor ID') or 
            row.get('Sponsor') or 
            row.get('Upline') or
            row.get('Einschreiber') or
            row.get('Enroller') or
            None
        )
    
    def _get_pv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Credits (Personal Volume / Volume Points)."""
        val = (
            row.get('Credits') or 
            row.get('PCV') or
            row.get('Personal Credits') or
            row.get('Volume') or 
            row.get('PV') or 
            None
        )
        try:
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_gv(self, row: Dict[str, str]) -> Optional[float]:
        """Extrahiert Team Credits (Group Volume / Balance)."""
        val = (
            row.get('Team Credits') or 
            row.get('Balance') or
            row.get('WCV') or
            row.get('Team Balance') or
            row.get('Group Volume') or 
            row.get('GV') or 
            None
        )
        try:
            return float(val) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_customer_points(self, row: Dict[str, str]) -> Optional[int]:
        """Extrahiert PCP (Personal Customer Points)."""
        val = (
            row.get('PCP') or 
            row.get('Customer Points') or
            row.get('Kunden') or
            row.get('Customers') or
            None
        )
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None
    
    def _get_z4f_status(self, row: Dict[str, str]) -> bool:
        """Extrahiert Z4F Status (Zinzino4Free)."""
        val = (
            row.get('Z4F') or 
            row.get('Zinzino4Free') or
            row.get('Auto Order') or
            row.get('Free Status') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1']
    
    def _get_ecb_status(self, row: Dict[str, str]) -> bool:
        """Extrahiert ECB Status (Enrollment Credit Bonus)."""
        val = (
            row.get('ECB') or 
            row.get('Enrollment Credit Bonus') or
            row.get('ECB Status') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1']
    
    def _get_rcb_status(self, row: Dict[str, str]) -> bool:
        """Extrahiert RCB Status (Residual Credit Bonus)."""
        val = (
            row.get('RCB') or 
            row.get('Residual Credit Bonus') or
            row.get('RCB Status') or
            ''
        ).lower()
        return val in ['yes', 'active', 'aktiv', 'ja', 'true', '1']
    
    def normalize_contact(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Normalisiert ZINZINO Kontakt-Daten."""
        base = super().normalize_contact(row)
        
        # ZINZINO-spezifische Felder
        rank = self._get_rank(row)
        rank_level = None
        if rank:
            # Rank wurde bereits normalisiert in _get_rank()
            rank_level = self.ZINZINO_RANKS.get(rank, 1)
        
        # Status prüfen
        status = row.get('Status', '').lower()
        is_active = status == 'active' or status == 'aktiv'
        
        # ZINZINO-spezifische Status-Felder
        z4f_active = self._get_z4f_status(row)
        ecb_active = self._get_ecb_status(row)
        rcb_active = self._get_rcb_status(row)
        customer_points = self._get_customer_points(row)
        
        # Grace Period (optional, falls in CSV vorhanden)
        grace_period_end = None
        try:
            grace_val = row.get('Grace Period End') or row.get('Grace Period') or row.get('Grace')
            if grace_val:
                from datetime import datetime
                grace_period_end = datetime.strptime(grace_val, '%Y-%m-%d').date().isoformat()
        except (ValueError, TypeError, AttributeError):
            pass
        
        # Erweitere base mit ZINZINO-spezifischen Daten
        base.update({
            'mlm_rank_level': rank_level,
            'is_active': is_active,
            'subscription_active': z4f_active,  # Z4F = Subscription
            'customer_points': customer_points,
            'z4f_active': z4f_active,
            'ecb_active': ecb_active,
            'rcb_active': rcb_active,
            'grace_period_end': grace_period_end,
        })
        
        return base


class GenericMLMParser(BaseMLMParser):
    """Generic Parser mit GPT-basierter Spalten-Erkennung."""
    
    def __init__(self, csv_content: str):
        super().__init__(csv_content, MLMCompany.GENERIC)
    
    def detect_columns(self, headers: List[str]) -> Dict[str, str]:
        """Erkennt Spalten mit GPT (wird von AutoMapper verwendet)."""
        # Wird von AutoMapper implementiert
        return {}

