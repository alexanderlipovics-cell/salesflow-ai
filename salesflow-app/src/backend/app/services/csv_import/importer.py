"""
Kontakt-Import Service
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from supabase import Client

from .parser import MLMParserFactory, MLMCompany
from .mapping import ColumnMapper, AutoMapper


class ContactImporter:
    """Service für Kontakt-Import."""
    
    def __init__(self, db: Client, user_id: str):
        self.db = db
        self.user_id = user_id
        self.batch_id = str(uuid.uuid4())
        self.auto_mapper = AutoMapper()
    
    async def import_contacts(
        self,
        csv_content: str,
        mlm_company: MLMCompany,
        field_mapping: Optional[Dict[str, str]] = None,
        skip_duplicates: bool = True,
        sync_mode: str = "once",  # "once", "weekly"
    ) -> Dict[str, Any]:
        """
        Importiert Kontakte aus CSV.
        
        Args:
            csv_content: CSV-Inhalt als String
            mlm_company: MLM-Unternehmen
            field_mapping: Optional manuelles Mapping
            skip_duplicates: Duplikate überspringen
            sync_mode: "once" oder "weekly"
        
        Returns:
            Import-Statistiken
        """
        # Parser erstellen
        parser = MLMParserFactory.create_parser(mlm_company, csv_content)
        rows = parser.parse()
        
        # Mapping bestimmen
        if field_mapping:
            mapping = field_mapping
        else:
            # Auto-Mapping
            headers = parser.get_headers()
            sample_rows = parser.get_sample_rows(5)
            mapping = await self.auto_mapper.detect_columns_with_gpt(
                headers, 
                sample_rows,
                mlm_company.value
            )
        
        # Kontakte normalisieren und importieren
        imported = 0
        skipped = 0
        errors = 0
        duplicates = 0
        error_details = []
        
        for i, row in enumerate(rows):
            try:
                # Normalisiere Kontakt
                contact_data = parser.normalize_contact(row)
                
                # Mapping anwenden (falls manuell)
                if field_mapping:
                    mapped_data = {}
                    for csv_col, db_field in field_mapping.items():
                        if csv_col in row and row[csv_col]:
                            mapped_data[db_field] = row[csv_col]
                    # Überschreibe mit gemappten Daten
                    contact_data.update(mapped_data)
                
                # Validierung
                if not contact_data.get('name') and not contact_data.get('email'):
                    errors += 1
                    error_details.append({
                        "row": i + 1,
                        "error": "Name oder E-Mail erforderlich"
                    })
                    continue
                
                # Duplikat-Check
                is_duplicate = await self._check_duplicate(
                    email=contact_data.get('email'),
                    phone=contact_data.get('phone'),
                    mlm_id=contact_data.get('mlm_id'),
                    mlm_company=mlm_company.value
                )
                
                if is_duplicate:
                    duplicates += 1
                    if skip_duplicates:
                        skipped += 1
                        continue
                
                # Import-Metadaten hinzufügen
                contact_data.update({
                    'user_id': self.user_id,
                    'import_source': f'csv_{mlm_company.value}',
                    'import_batch_id': self.batch_id,
                    'last_imported_at': datetime.utcnow().isoformat(),
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat(),
                })
                
                # In DB einfügen
                result = self.db.table('contacts').insert(contact_data).execute()
                
                if result.data:
                    imported += 1
                else:
                    errors += 1
                    error_details.append({
                        "row": i + 1,
                        "error": "Datenbankfehler"
                    })
                    
            except Exception as e:
                errors += 1
                error_details.append({
                    "row": i + 1,
                    "error": str(e)
                })
        
        # Sync-Job erstellen (falls wöchentlich)
        if sync_mode == "weekly":
            await self._create_sync_job(mlm_company, csv_content)
        
        return {
            "batch_id": self.batch_id,
            "total_rows": len(rows),
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
            "duplicates": duplicates,
            "error_details": error_details[:20]  # Max 20 Fehler
        }
    
    async def _check_duplicate(
        self,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        mlm_id: Optional[str] = None,
        mlm_company: Optional[str] = None
    ) -> bool:
        """Prüft ob Kontakt bereits existiert."""
        try:
            query = self.db.table('contacts').select('id').eq('user_id', self.user_id)
            
            if email:
                result = query.eq('email', email).limit(1).execute()
                if result.data:
                    return True
            
            if phone:
                result = query.eq('phone', phone).limit(1).execute()
                if result.data:
                    return True
            
            if mlm_id and mlm_company:
                result = query.eq('mlm_id', mlm_id).eq('mlm_company', mlm_company).limit(1).execute()
                if result.data:
                    return True
            
            return False
        except Exception:
            return False
    
    async def _create_sync_job(self, mlm_company: MLMCompany, csv_content: str):
        """Erstellt wöchentlichen Sync-Job."""
        # TODO: Implementiere Sync-Job in jobs Tabelle
        pass
    
    async def reimport_batch(self, batch_id: str) -> Dict[str, Any]:
        """Re-Importiert einen Batch (für Sync)."""
        # TODO: Implementiere Re-Import
        pass

