"""
Feld-Mapping mit automatischer Spalten-Erkennung
"""

from typing import List, Dict, Optional, Any
from ..ai.ai_service import AIService


class ColumnMapper:
    """Basis Mapping-Klasse."""
    
    # Standard-Feld-Mappings
    STANDARD_MAPPINGS = {
        'name': ['name', 'vollständiger name', 'full name', 'kontakt', 'contact'],
        'first_name': ['vorname', 'first name', 'firstname', 'vorname'],
        'last_name': ['nachname', 'last name', 'lastname', 'surname', 'nachname'],
        'email': ['email', 'e-mail', 'emailadresse', 'mail', 'e-mail adresse'],
        'phone': ['telefon', 'phone', 'tel', 'handy', 'mobile', 'rufnummer'],
        'mlm_id': ['id', 'mlm-id', 'mlm_id', 'kontakt-id', 'contact id', 'partner id', 'partnerid', 'partner-nr', 'partner nr', 'vertriebspartner-nr'],
        'mlm_rank': ['rang', 'rank', 'level', 'stufe', 'title', 'titel', 'status', 'karrierestufe'],
        'team_id': ['team-id', 'team_id', 'team id', 'team'],
        'sponsor_id': ['sponsor', 'sponsor-id', 'sponsor_id', 'sponsor id', 'upline', 'einschreiber', 'enroller', 'empfehler'],
        'subscription_active': ['z4f', 'auto order', 'zinzino4free', 'z4f status', 'free status', 'autoship', 'abo', 'auto order', 'abo-status'],
        'customer_points': ['pcp', 'customer points', 'kunden', 'customers', 'personal customer points'],
        'z4f_active': ['z4f', 'zinzino4free', 'auto order', 'free status'],
        'ecb_active': ['ecb', 'enrollment credit bonus', 'ecb status'],
        'rcb_active': ['rcb', 'residual credit bonus', 'rcb status'],
        'sponsor_name': ['sponsor name', 'sponsor_name', 'sponsor-name'],
        'mlm_pv': ['pv', 'personal volume', 'personal-volume', 'credits', 'volume', 'pcv', 'personal credits', 'punkte', 'points', 'p', 'eigenumsatz'],
        'mlm_gv': ['gv', 'group volume', 'group-volume', 'team credits', 'wcv', 'balance', 'team balance', 'geschäftsvolumen', 'gruppenvolumen', 'team volume'],
        'mlm_ov': ['ov', 'organization volume', 'organization-volume', 'org volume', 'organisationsvolumen'],
        'pgv': ['pgv', 'personal growth volume'],
        'tv': ['tv', 'team volume', 'teamvolumen'],
        'legs': ['legs', 'qualified legs', 'beine', 'qualifizierte beine'],
        'lrp_active': ['lrp', 'lrp active', 'lrp status', 'loyalty rewards'],
        'lrp_pv': ['lrp pv', 'lrp volume'],
        'mlm_vp': ['vp', 'volume points', 'volume-points'],
        'mlm_pp': ['pp', 'performance points', 'performance-points'],
        'mlm_level': ['level', 'stufe', 'ebene'],
        'first_line_count': ['erstlinie', 'first line', 'frontline', 'direkte partner'],
        'volume_points': ['punkte', 'points', 'p', 'pv', 'eigenumsatz'],
    }
    
    # PM-International spezifisches Mapping
    PM_INTERNATIONAL_MAPPING = {
        'mlm_id': ['Partner-Nr', 'Partner Nr', 'PartnerNr', 'ID', 'Vertriebspartner-Nr'],
        'first_name': ['Vorname', 'First Name', 'FirstName'],
        'last_name': ['Nachname', 'Last Name', 'LastName', 'Name'],
        'email': ['Email', 'E-Mail', 'E-mail', 'Mail'],
        'phone': ['Telefon', 'Phone', 'Tel', 'Mobile', 'Handy'],
        'mlm_rank': ['Rang', 'Rank', 'Status', 'Stufe', 'Karrierestufe'],
        'volume_points': ['Punkte', 'Points', 'P', 'PV', 'Eigenumsatz'],
        'mlm_gv': ['GV', 'Geschäftsvolumen', 'Gruppenvolumen', 'Team Volume'],
        'first_line_count': ['Erstlinie', 'First Line', 'Frontline', 'Direkte Partner'],
        'sponsor_id': ['Sponsor', 'Upline', 'Einschreiber', 'Empfehler'],
        'subscription_active': ['Autoship', 'ABO', 'Auto Order', 'Abo-Status'],
    }
    
    @staticmethod
    def suggest_mapping(csv_columns: List[str]) -> Dict[str, str]:
        """Schlägt Mapping basierend auf Spaltennamen vor."""
        mappings = {}
        csv_lower = {col.lower().strip(): col for col in csv_columns}
        
        for db_field, aliases in ColumnMapper.STANDARD_MAPPINGS.items():
            for alias in aliases:
                if alias in csv_lower:
                    mappings[csv_lower[alias]] = db_field
                    break
        
        return mappings


class AutoMapper:
    """GPT-basierte automatische Spalten-Erkennung."""
    
    def __init__(self, ai_service: Optional[AIService] = None):
        self.ai_service = ai_service or AIService()
    
    async def detect_columns_with_gpt(
        self, 
        headers: List[str], 
        sample_rows: List[Dict[str, str]],
        mlm_company: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Verwendet GPT um Spalten automatisch zu erkennen.
        
        Args:
            headers: CSV-Spalten-Header
            sample_rows: Beispiel-Zeilen
            mlm_company: Optional MLM-Unternehmen für bessere Erkennung
        
        Returns:
            Mapping von CSV-Spalte zu DB-Feld
        """
        # Zuerst Standard-Mapping versuchen
        standard_mapping = ColumnMapper.suggest_mapping(headers)
        
        # Wenn alle Spalten gemappt sind, GPT nicht benötigt
        if len(standard_mapping) == len(headers):
            return standard_mapping
        
        # GPT-Prompt für Spalten-Erkennung
        prompt = f"""Du bist ein Experte für CSV-Datenanalyse und MLM-Systeme.

CSV-Spalten: {', '.join(headers)}

Beispiel-Daten (erste 3 Zeilen):
{self._format_sample_rows(sample_rows[:3])}

MLM-Unternehmen: {mlm_company or 'Unbekannt'}

Aufgabe: Erkenne welche CSV-Spalte welchem Datenbankfeld entspricht.

Verfügbare Datenbankfelder:
- name (Vollständiger Name)
- first_name (Vorname)
- last_name (Nachname)
- email (E-Mail-Adresse)
- phone (Telefonnummer)
- mlm_id (MLM-interne ID)
- mlm_rank (Rang im MLM-System)
- team_id (Team-ID)
- sponsor_id (Sponsor-ID)
- sponsor_name (Sponsor-Name)
- mlm_pv (Personal Volume)
- mlm_gv (Group Volume)
- mlm_ov (Organization Volume)
- mlm_vp (Volume Points)
- mlm_pp (Performance Points)
- mlm_level (Level im Downline)

Antworte NUR mit einem JSON-Objekt im Format:
{{
  "csv_column_name": "db_field_name",
  ...
}}

Beispiel:
{{
  "Name": "name",
  "E-Mail": "email",
  "Telefon": "phone",
  "Rang": "mlm_rank"
}}

Antworte NUR mit dem JSON, keine Erklärungen."""

        try:
            response = await self.ai_service.generate_response(
                messages=[{"role": "user", "content": prompt}],
                model="gpt-4o-mini",  # Günstigeres Modell für Mapping
                temperature=0.1  # Niedrige Temperatur für konsistente Ergebnisse
            )
            
            # JSON aus Response extrahieren
            import json
            import re
            
            # Versuche JSON zu finden
            json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
            if json_match:
                mapping = json.loads(json_match.group())
                # Validiere Mapping
                valid_mapping = {}
                for csv_col, db_field in mapping.items():
                    if csv_col in headers and db_field in ColumnMapper.STANDARD_MAPPINGS:
                        valid_mapping[csv_col] = db_field
                return valid_mapping
            
            return standard_mapping
            
        except Exception as e:
            # Fallback zu Standard-Mapping
            return standard_mapping
    
    def _format_sample_rows(self, rows: List[Dict[str, str]]) -> str:
        """Formatiert Beispiel-Zeilen für GPT-Prompt."""
        if not rows:
            return "Keine Daten"
        
        formatted = []
        for i, row in enumerate(rows, 1):
            row_str = ", ".join([f"{k}: {v}" for k, v in row.items() if v])
            formatted.append(f"Zeile {i}: {row_str}")
        
        return "\n".join(formatted)

