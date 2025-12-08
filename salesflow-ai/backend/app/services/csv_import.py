"""
CSV Import Service für Lead-Import.
Handles CSV/Excel parsing, validation, deduplication, and import.
"""

import csv
import io
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import pandas as pd
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ImportResult:
    """Result of an import operation."""
    imported: int = 0
    errors: List[Dict[str, Any]] = None
    duplicates: List[Dict[str, Any]] = None
    total_rows: int = 0

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.duplicates is None:
            self.duplicates = []


@dataclass
class ColumnMapping:
    """Mapping from CSV column to lead field."""
    csv_column: str
    lead_field: str
    required: bool = False


class CSVImportService:
    """Service for importing leads from CSV files."""

    # Standard lead fields
    LEAD_FIELDS = {
        'name': {'required': True, 'type': 'string'},
        'email': {'required': False, 'type': 'string'},
        'phone': {'required': False, 'type': 'string'},
        'company': {'required': False, 'type': 'string'},
        'status': {'required': False, 'type': 'string', 'default': 'new'},
        'notes': {'required': False, 'type': 'string'},
        'source': {'required': False, 'type': 'string', 'default': 'csv_import'},
        'score': {'required': False, 'type': 'number', 'default': 50}
    }

    # Fuzzy matching for column names
    COLUMN_NAME_MAP = {
        'name': ['name', 'vorname', 'firstname', 'first_name', 'nachname', 'lastname', 'last_name',
                'voller name', 'full name', 'contact name', 'kontakt name'],
        'email': ['email', 'e-mail', 'mail', 'emailadresse', 'email_address'],
        'phone': ['phone', 'telefon', 'telephone', 'tel', 'mobile', 'handy', 'nummer'],
        'company': ['company', 'firma', 'unternehmen', 'organisation', 'organization', 'arbeitgeber'],
        'status': ['status', 'state', 'zustand'],
        'notes': ['notes', 'notizen', 'kommentar', 'comments', 'bemerkung'],
        'score': ['score', 'bewertung', 'rating', 'punkte']
    }

    def __init__(self, db_client):
        self.db = db_client

    def parse_csv_file(self, file_content: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Parse CSV/Excel file and return data rows and column headers.
        """
        try:
            # Try to detect file type from extension
            if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
                # Excel file
                df = pd.read_excel(io.BytesIO(file_content))
                data = df.to_dict('records')
                columns = list(df.columns)
            else:
                # CSV file
                content_str = file_content.decode('utf-8-sig')  # Handle BOM
                csv_reader = csv.DictReader(io.StringIO(content_str))
                data = list(csv_reader)
                columns = list(data[0].keys()) if data else []

            return data, columns

        except Exception as e:
            logger.error(f"Error parsing file {filename}: {e}")
            raise ValueError(f"Could not parse file: {str(e)}")

    def auto_detect_mapping(self, csv_columns: List[str]) -> Dict[str, str]:
        """
        Auto-detect column mapping based on fuzzy name matching.
        Returns dict mapping lead_field -> csv_column
        """
        mapping = {}

        for lead_field, possible_names in self.COLUMN_NAME_MAP.items():
            for csv_col in csv_columns:
                csv_col_lower = csv_col.lower().strip()
                if any(name in csv_col_lower for name in possible_names):
                    if lead_field not in mapping:  # Take first match
                        mapping[lead_field] = csv_col
                    break

        return mapping

    def validate_mapping(self, mapping: Dict[str, str], csv_columns: List[str]) -> List[str]:
        """
        Validate column mapping and return list of missing required fields.
        """
        missing_required = []

        for field_name, field_config in self.LEAD_FIELDS.items():
            if field_config['required']:
                if field_name not in mapping or mapping[field_name] not in csv_columns:
                    missing_required.append(field_name)

        return missing_required

    def preview_data(self, data: List[Dict[str, Any]], mapping: Dict[str, str], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Preview transformed data using the mapping.
        Returns first N rows transformed to lead format.
        """
        preview = []

        for i, row in enumerate(data[:limit]):
            try:
                lead = self._transform_row(row, mapping)
                lead['preview_row'] = i + 1
                preview.append(lead)
            except Exception as e:
                preview.append({
                    'preview_row': i + 1,
                    'error': str(e),
                    'raw_data': row
                })

        return preview

    def _transform_row(self, row: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Transform a CSV row to lead format using the mapping.
        """
        lead = {
            'id': str(uuid.uuid4()),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'source': 'csv_import'
        }

        # Apply mapping
        for lead_field, csv_column in mapping.items():
            if csv_column in row and row[csv_column] is not None:
                value = str(row[csv_column]).strip()
                if value:  # Only set if not empty
                    lead[lead_field] = self._convert_value(lead_field, value)

        # Apply defaults for missing fields
        for field_name, field_config in self.LEAD_FIELDS.items():
            if field_name not in lead and 'default' in field_config:
                lead[field_name] = field_config['default']

        return lead

    def _convert_value(self, field_name: str, value: str) -> Any:
        """
        Convert string value to appropriate type for the field.
        """
        field_config = self.LEAD_FIELDS.get(field_name, {})
        field_type = field_config.get('type', 'string')

        if field_type == 'number':
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return 50  # Default score
        elif field_type == 'boolean':
            return value.lower() in ('true', '1', 'yes', 'ja', 'y', 'j')
        else:
            return value.strip()

    def check_duplicates(self, leads: List[Dict[str, Any]], user_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Check for duplicates and return (unique_leads, duplicates).
        Checks by email OR phone.
        """
        unique_leads = []
        duplicates = []

        # Get existing leads for this user
        existing_result = self.db.table('leads').select('email, phone').eq('user_id', user_id).execute()
        existing_emails = {lead['email'] for lead in existing_result.data if lead['email']}
        existing_phones = {lead['phone'] for lead in existing_result.data if lead['phone']}

        for lead in leads:
            email = lead.get('email')
            phone = lead.get('phone')

            is_duplicate = False
            duplicate_reason = []

            if email and email in existing_emails:
                is_duplicate = True
                duplicate_reason.append(f"Email {email} existiert bereits")
            if phone and phone in existing_phones:
                is_duplicate = True
                duplicate_reason.append(f"Telefon {phone} existiert bereits")

            if is_duplicate:
                lead_copy = lead.copy()
                lead_copy['duplicate_reason'] = '; '.join(duplicate_reason)
                duplicates.append(lead_copy)
            else:
                unique_leads.append(lead)

        return unique_leads, duplicates

    def import_leads(self, leads: List[Dict[str, Any]], user_id: str, skip_duplicates: bool = True) -> ImportResult:
        """
        Import leads to database.
        """
        result = ImportResult(total_rows=len(leads))

        if skip_duplicates:
            leads, duplicates = self.check_duplicates(leads, user_id)
            result.duplicates = duplicates

        # Add user_id to all leads
        for lead in leads:
            lead['user_id'] = user_id

        # Batch insert
        try:
            if leads:
                self.db.table('leads').insert(leads).execute()
                result.imported = len(leads)

            logger.info(f"Imported {result.imported} leads for user {user_id}")

        except Exception as e:
            logger.error(f"Import error: {e}")
            result.errors.append({
                'type': 'database_error',
                'message': str(e),
                'row': None
            })

        return result

    def import_from_csv(self, file_content: bytes, filename: str, mapping: Dict[str, str],
                       user_id: str, skip_duplicates: bool = True) -> ImportResult:
        """
        Complete import workflow: parse -> transform -> validate -> import
        """
        try:
            # Parse file
            data, csv_columns = self.parse_csv_file(file_content, filename)

            if not data:
                return ImportResult(errors=[{'type': 'empty_file', 'message': 'Datei ist leer'}])

            # Validate mapping
            missing_required = self.validate_mapping(mapping, csv_columns)
            if missing_required:
                return ImportResult(errors=[{
                    'type': 'missing_required_fields',
                    'message': f'Fehlende Pflichtfelder: {", ".join(missing_required)}'
                }])

            # Transform data
            leads = []
            for i, row in enumerate(data):
                try:
                    lead = self._transform_row(row, mapping)
                    leads.append(lead)
                except Exception as e:
                    return ImportResult(errors=[{
                        'type': 'transform_error',
                        'message': f'Fehler in Zeile {i+1}: {str(e)}',
                        'row': i+1
                    }])

            # Import
            result = self.import_leads(leads, user_id, skip_duplicates)
            result.total_rows = len(data)

            return result

        except Exception as e:
            logger.error(f"Import failed: {e}")
            return ImportResult(errors=[{
                'type': 'general_error',
                'message': str(e)
            }])
