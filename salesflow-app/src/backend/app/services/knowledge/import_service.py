# backend/app/services/knowledge/import_service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KNOWLEDGE IMPORT SERVICE                                                  ║
║  Lädt JSON Evidence Hub & Marketing Intelligence in Datenbank             ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Import aus JSON-Datei oder String
- Validierung aller Items
- Duplikat-Erkennung (by custom_id oder title)
- Dry-Run Modus für Vorschau
- Batch-Insert für Performance
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

from supabase import Client


class KnowledgeImportService:
    """Service zum Import von Knowledge Items aus JSON."""
    
    # Gültige Werte für Validierung
    VALID_DOMAINS = ["evidence", "company", "vertical", "generic"]
    VALID_EVIDENCE_LEVELS = ["high", "moderate", "limited", "expert_opinion"]
    VALID_COMPLIANCE_LEVELS = ["strict", "normal", "low"]
    VALID_TYPES = [
        # Evidence
        "study_summary", "meta_analysis", "health_claim", "guideline",
        # Company
        "company_overview", "product_line", "product_detail", 
        "compensation_plan", "compliance_rule", "faq",
        # Vertical
        "objection_handler", "sales_script", "best_practice",
        # Generic
        "psychology", "communication", "template_helper",
    ]
    
    def __init__(self, db: Client):
        self.db = db
    
    def import_from_json_file(
        self,
        file_path: str,
        company_id: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Importiert Knowledge Items aus JSON-Datei.
        
        Args:
            file_path: Pfad zur JSON-Datei
            company_id: Optional - Company zuordnen
            dry_run: Nur validieren, nicht importieren
        
        Returns:
            Dict mit imported_count, skipped_count, errors
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            return {
                'success': False,
                'imported_count': 0,
                'skipped_count': 0,
                'error_count': 1,
                'errors': [f'Datei nicht gefunden: {file_path}'],
                'dry_run': dry_run,
            }
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'imported_count': 0,
                'skipped_count': 0,
                'error_count': 1,
                'errors': [f'JSON Parse-Fehler: {str(e)}'],
                'dry_run': dry_run,
            }
        
        items = data.get('items', [])
        meta = data.get('meta', {})
        
        result = self.import_items(items, company_id, dry_run)
        result['source_file'] = file_path
        result['source_meta'] = meta
        
        return result
    
    def import_from_json_string(
        self,
        json_string: str,
        company_id: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Importiert aus JSON-String (z.B. von API)."""
        try:
            data = json.loads(json_string)
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'imported_count': 0,
                'skipped_count': 0,
                'error_count': 1,
                'errors': [f'JSON Parse-Fehler: {str(e)}'],
                'dry_run': dry_run,
            }
        
        items = data.get('items', data) if isinstance(data, dict) else data
        return self.import_items(items, company_id, dry_run)
    
    def import_items(
        self,
        items: List[Dict[str, Any]],
        company_id: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Hauptmethode: Importiert Liste von Knowledge Items.
        
        Args:
            items: Liste von Item-Dicts aus JSON
            company_id: Optional - Company ID für alle Items
            dry_run: Nur validieren, nicht importieren
            
        Returns:
            Import-Statistiken
        """
        imported = 0
        skipped = 0
        errors = []
        imported_ids = []
        
        for idx, item_data in enumerate(items):
            item_id = item_data.get('id', f'item_{idx}')
            
            try:
                # 1. Validierung
                validation = self._validate_item(item_data)
                if not validation['valid']:
                    errors.append(f"Item {item_id}: {validation['error']}")
                    continue
                
                # 2. Duplikat-Check
                is_duplicate, duplicate_reason = self._check_duplicate(
                    item_data.get('id'),
                    item_data.get('title'),
                )
                if is_duplicate:
                    skipped += 1
                    continue
                
                # 3. Einfügen (wenn kein Dry-Run)
                if not dry_run:
                    inserted_id = self._insert_item(item_data, company_id)
                    if inserted_id:
                        imported_ids.append(inserted_id)
                        imported += 1
                    else:
                        errors.append(f"Item {item_id}: Insert fehlgeschlagen")
                else:
                    imported += 1
                    
            except Exception as e:
                errors.append(f"Item {item_id}: {str(e)}")
        
        return {
            'success': len(errors) == 0,
            'imported_count': imported,
            'skipped_count': skipped,
            'error_count': len(errors),
            'errors': errors[:20],  # Limit für Response-Größe
            'dry_run': dry_run,
            'imported_ids': imported_ids if not dry_run else [],
        }
    
    def _validate_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validiert ein einzelnes Item.
        
        Returns:
            Dict mit 'valid' (bool) und 'error' (str oder None)
        """
        # Required Fields
        required = ['domain', 'type', 'topic', 'title', 'content']
        for field in required:
            if not item.get(field):
                return {'valid': False, 'error': f'Pflichtfeld fehlt: {field}'}
        
        # Domain Check
        if item['domain'] not in self.VALID_DOMAINS:
            return {
                'valid': False,
                'error': f"Ungültige domain: '{item['domain']}'. Erlaubt: {self.VALID_DOMAINS}"
            }
        
        # Type Check
        if item['type'] not in self.VALID_TYPES:
            return {
                'valid': False,
                'error': f"Ungültiger type: '{item['type']}'. Erlaubt: {self.VALID_TYPES}"
            }
        
        # Evidence Level (wenn vorhanden)
        if item.get('evidence_level'):
            if item['evidence_level'] not in self.VALID_EVIDENCE_LEVELS:
                return {
                    'valid': False,
                    'error': f"Ungültiger evidence_level: '{item['evidence_level']}'"
                }
        
        # Compliance Level (wenn vorhanden)
        if item.get('compliance_level'):
            if item['compliance_level'] not in self.VALID_COMPLIANCE_LEVELS:
                return {
                    'valid': False,
                    'error': f"Ungültiger compliance_level: '{item['compliance_level']}'"
                }
        
        # Content Length
        if len(item['content']) < 10:
            return {'valid': False, 'error': 'Content zu kurz (min. 10 Zeichen)'}
        
        if len(item['content']) > 50000:
            return {'valid': False, 'error': 'Content zu lang (max. 50.000 Zeichen)'}
        
        return {'valid': True, 'error': None}
    
    def _check_duplicate(
        self,
        custom_id: Optional[str],
        title: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Prüft ob Item bereits existiert.
        
        Returns:
            Tuple (is_duplicate: bool, reason: str oder None)
        """
        try:
            # Check by custom_id in metadata
            if custom_id:
                # Supabase jsonb contains query
                result = self.db.table("knowledge_items").select("id").eq(
                    "metadata->>custom_id", custom_id
                ).eq("is_active", True).limit(1).execute()
                
                if result.data and len(result.data) > 0:
                    return (True, f"custom_id '{custom_id}' existiert bereits")
            
            # Check by exact title
            result = self.db.table("knowledge_items").select("id").eq(
                "title", title
            ).eq("is_active", True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                return (True, f"Titel '{title[:50]}...' existiert bereits")
            
            return (False, None)
            
        except Exception as e:
            # Bei Fehlern: Kein Duplikat annehmen, weitermachen
            print(f"Warning: Duplikat-Check fehlgeschlagen: {e}")
            return (False, None)
    
    def _insert_item(
        self,
        item: Dict[str, Any],
        company_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Fügt ein Item in die Datenbank ein.
        
        Returns:
            Die ID des eingefügten Items oder None bei Fehler
        """
        try:
            # Metadata mit custom_id anreichern
            metadata = item.get('metadata') or {}
            if item.get('id'):
                metadata['custom_id'] = item['id']
            
            # Daten für Insert vorbereiten
            data = {
                "company_id": company_id,
                "vertical_id": item.get('vertical_id'),
                "language": item.get('language', 'de'),
                "region": item.get('region'),
                "domain": item['domain'],
                "type": item['type'],
                "topic": item['topic'],
                "subtopic": item.get('subtopic'),
                "title": item['title'],
                "content": item['content'],
                "content_short": item.get('content_short'),
                "study_year": item.get('study_year'),
                "study_authors": item.get('study_authors'),
                "study_population": item.get('study_population'),
                "study_type": item.get('study_type'),
                "study_intervention": item.get('study_intervention'),
                "study_outcomes": item.get('study_outcomes'),
                "nutrients_or_factors": item.get('nutrients_or_factors'),
                "health_outcome_areas": item.get('health_outcome_areas'),
                "evidence_level": item.get('evidence_level'),
                "source_type": item.get('source_type'),
                "source_url": item.get('source_url'),
                "source_reference": item.get('source_reference'),
                "compliance_level": item.get('compliance_level', 'normal'),
                "requires_disclaimer": item.get('requires_disclaimer', False),
                "disclaimer_text": item.get('disclaimer_text'),
                "usage_notes_for_ai": item.get('usage_notes_for_ai'),
                "keywords": item.get('keywords'),
                "metadata": metadata,
                "is_active": True,
                "is_current": True,
                "version": 1,
            }
            
            # None-Werte entfernen (Supabase mag das nicht)
            data = {k: v for k, v in data.items() if v is not None}
            
            result = self.db.table("knowledge_items").insert(data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0].get('id')
            
            return None
            
        except Exception as e:
            print(f"Error inserting item: {e}")
            return None
    
    def get_company_id_by_slug(self, slug: str) -> Optional[str]:
        """Holt Company ID anhand des Slugs."""
        try:
            result = self.db.table("companies").select("id").eq(
                "slug", slug
            ).eq("is_active", True).single().execute()
            
            if result.data:
                return result.data.get('id')
            return None
            
        except Exception:
            return None


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def import_evidence_hub(
    db: Client,
    file_path: str = None,
    company_id: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Import des Evidence Hub.
    
    Usage:
        from app.services.knowledge.import_service import import_evidence_hub
        from app.db.supabase import get_supabase_client
        
        db = get_supabase_client()
        result = import_evidence_hub(db, "data/EVIDENCE_HUB_COMPLETE.json")
        print(result)
    """
    # Default path relativ zum Backend-Root
    if file_path is None:
        base_path = Path(__file__).parent.parent.parent.parent
        file_path = base_path / "data" / "EVIDENCE_HUB_COMPLETE.json"
    
    service = KnowledgeImportService(db)
    return service.import_from_json_file(str(file_path), company_id, dry_run)


def import_marketing_intelligence(
    db: Client,
    file_path: str = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Convenience-Funktion zum Import der Marketing Intelligence.
    """
    if file_path is None:
        base_path = Path(__file__).parent.parent.parent.parent
        file_path = base_path / "data" / "MARKETING_INTELLIGENCE.json"
    
    service = KnowledgeImportService(db)
    return service.import_from_json_file(str(file_path), None, dry_run)

