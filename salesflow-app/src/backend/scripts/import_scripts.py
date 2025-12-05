#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SCRIPTS IMPORT - Importiert 50 Scripts in Supabase                        ║
║  Verwendet: mlm_scripts ODER scripts Tabelle                               ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    python backend/scripts/import_scripts.py
    python backend/scripts/import_scripts.py --dry-run
    python backend/scripts/import_scripts.py --table scripts
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Add parent directory to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Fehler: supabase-py nicht installiert")
    print("   Installiere mit: pip install supabase")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

# Supabase URLs
SUPABASE_URLS = [
    "https://lncwvbhcafkdorypnpnz.supabase.co",  # Mobile App URL
    "https://ydnlxqjblvtoemqbjcai.supabase.co",  # Backend URL
]

def get_supabase_config() -> tuple[str, str]:
    """Holt Supabase URL und Key aus verschiedenen Quellen."""
    
    # 1. Environment Variable (höchste Priorität)
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if url and key:
        return url, key
    
    # 2. Versuche Backend Settings zu laden
    try:
        from app.core.config import settings
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            return url, key
    except:
        pass
    
    # 3. Fallback - verwende Mobile App URL
    url = SUPABASE_URLS[0]
    key = os.getenv("SUPABASE_ANON_KEY", "")
    
    return url, key

SUPABASE_URL, SUPABASE_KEY = get_supabase_config()

# JSON-Datei Pfad
JSON_FILE = backend_dir / "data" / "scripts_gemini_50.json"

# ═══════════════════════════════════════════════════════════════════════════
# TABLE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

# Schema für mlm_scripts Tabelle
MLM_SCRIPTS_SCHEMA = {
    'script_id': str,
    'title': str,
    'content': str,
    'category': str,
    'company': str,
    'tags': list,
    'tone': str,
    'variables': dict,
    'copied_count': int,
    'is_active': bool,
}

# Schema für scripts Tabelle
SCRIPTS_SCHEMA = {
    'number': int,
    'name': str,
    'category': str,
    'context': str,
    'relationship_level': str,
    'text': str,
    'description': str,
    'variables': list,
    'variants': list,
    'vertical': str,
    'language': str,
    'tags': list,
}

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def validate_script(script: Dict[str, Any]) -> tuple[bool, str]:
    """Validiert ein Script-Objekt."""
    required_fields = ['id', 'title', 'content', 'category']
    
    for field in required_fields:
        if field not in script:
            return False, f"Fehlendes Feld: {field}"
    
    if not script['id'] or not script['title'] or not script['content']:
        return False, "id, title und content dürfen nicht leer sein"
    
    return True, ""


def normalize_for_mlm_scripts(script: Dict[str, Any]) -> Dict[str, Any]:
    """Normalisiert ein Script für die mlm_scripts Tabelle."""
    company = 'GENERAL'
    if script.get('industry') and len(script['industry']) > 0:
        company = script['industry'][0].upper().replace('NETWORK_MARKETING', 'GENERAL')
    
    if script.get('company'):
        company = script['company'].upper()
    
    tags = script.get('tags', [])
    if isinstance(tags, str):
        tags = [tags]
    
    variables = script.get('variables', {})
    if isinstance(variables, str):
        try:
            variables = json.loads(variables)
        except:
            variables = {}
    
    return {
        'script_id': script['id'],
        'title': script['title'],
        'content': script['content'],
        'category': script['category'],
        'company': company,
        'tags': tags,
        'tone': script.get('tone', 'neutral'),
        'variables': variables,
        'copied_count': 0,
        'is_active': True,
    }


def normalize_for_scripts(script: Dict[str, Any], number: int) -> Dict[str, Any]:
    """Normalisiert ein Script für die scripts Tabelle."""
    
    # Kategorie-Mapping
    category_map = {
        'opener': 'erstkontakt',
        'followup': 'follow_up',
        'follow_up': 'follow_up',
        'objection': 'einwand',
        'einwand': 'einwand',
        'closing': 'closing',
        'general': 'erstkontakt',
    }
    
    # Context-Mapping basierend auf Tags
    context_map = {
        'warm': 'warm_freunde',
        'kalt': 'kalt_social',
        'cold': 'kalt_social',
        'linkedin': 'kalt_social',
        'instagram': 'kalt_social',
        'ghost': 'ghosted',
        'zeit': 'keine_zeit',
        'teuer': 'kein_geld',
        'geld': 'kein_geld',
        'preis': 'kein_geld',
        'partner': 'partner_fragen',
        'mlm': 'mlm_pyramide',
        'pyramide': 'mlm_pyramide',
    }
    
    category = script.get('category', 'general').lower()
    mapped_category = category_map.get(category, 'erstkontakt')
    
    # Finde passenden Context
    tags = script.get('tags', [])
    context = 'warm_freunde'  # Default
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower in context_map:
            context = context_map[tag_lower]
            break
    
    # Beziehungslevel basierend auf Tags
    relationship = 'warm'
    if any(t in ['cold', 'kalt'] for t in [t.lower() for t in tags]):
        relationship = 'kalt'
    elif any(t in ['heiss', 'hot', 'closing'] for t in [t.lower() for t in tags]):
        relationship = 'heiss'
    
    variables = script.get('variables', {})
    if isinstance(variables, dict):
        variables = list(variables.keys())
    
    return {
        'number': number,
        'name': script['title'],
        'category': mapped_category,
        'context': context,
        'relationship_level': relationship,
        'text': script['content'],
        'description': script.get('description', ''),
        'variables': variables,
        'variants': [],
        'vertical': 'network_marketing',
        'language': 'de',
        'tags': tags,
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN IMPORT FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def import_scripts(
    dry_run: bool = False, 
    table: str = 'mlm_scripts',
    json_file: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Importiert Scripts aus JSON in Supabase.
    
    Args:
        dry_run: Wenn True, wird nur validiert, nicht importiert
        table: Zieltabelle ('mlm_scripts' oder 'scripts')
        json_file: Optionaler Pfad zur JSON-Datei
        
    Returns:
        Dictionary mit Import-Ergebnissen
    """
    print("╔" + "═" * 60 + "╗")
    print("║  🚀 SCRIPTS IMPORT                                           ║")
    print("╚" + "═" * 60 + "╝")
    print()
    
    file_path = json_file or JSON_FILE
    
    # Prüfe Supabase Key
    if not SUPABASE_KEY:
        print("❌ FEHLER: SUPABASE_KEY nicht gesetzt!")
        print()
        print("   Setze Environment Variable:")
        print("   export SUPABASE_SERVICE_ROLE_KEY=dein_key")
        print()
        return {'success': False, 'error': 'SUPABASE_KEY nicht gesetzt', 'imported': 0}
    
    # Prüfe JSON-Datei
    if not file_path.exists():
        print(f"❌ JSON-Datei nicht gefunden: {file_path}")
        return {'success': False, 'error': f'Datei nicht gefunden: {file_path}', 'imported': 0}
    
    print(f"📂 Datei: {file_path}")
    print(f"📊 Tabelle: {table}")
    print(f"🔧 Modus: {'DRY-RUN (nur Validierung)' if dry_run else 'IMPORT'}")
    print()
    
    # Lade JSON
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON-Parse-Fehler: {e}")
        return {'success': False, 'error': f'JSON-Parse-Fehler: {e}', 'imported': 0}
    
    # Prüfe Struktur
    if 'scripts' not in data:
        print("❌ JSON-Struktur ungültig: 'scripts' Feld fehlt")
        return {'success': False, 'error': "JSON-Struktur ungültig", 'imported': 0}
    
    scripts = data['scripts']
    print(f"📚 Gefunden: {len(scripts)} Scripts")
    print()
    
    # Validiere alle Scripts
    print("🔍 Validiere Scripts...")
    valid_scripts = []
    errors = []
    
    for i, script in enumerate(scripts, 1):
        is_valid, error_msg = validate_script(script)
        if is_valid:
            valid_scripts.append(script)
        else:
            errors.append(f"Script #{i} ({script.get('id', 'unknown')}): {error_msg}")
    
    print(f"  ✅ Gültig: {len(valid_scripts)}")
    print(f"  ❌ Ungültig: {len(errors)}")
    
    if errors:
        print()
        print("⚠️  Validierungsfehler:")
        for error in errors[:5]:
            print(f"   - {error}")
        if len(errors) > 5:
            print(f"   ... und {len(errors) - 5} weitere")
    
    if not valid_scripts:
        print("❌ Keine gültigen Scripts zum Importieren")
        return {'success': False, 'error': 'Keine gültigen Scripts', 'imported': 0}
    
    # Dry-Run
    if dry_run:
        print()
        print("💡 DRY-RUN abgeschlossen.")
        print(f"   {len(valid_scripts)} Scripts würden importiert werden.")
        return {'success': True, 'imported': 0, 'validated': len(valid_scripts), 'dry_run': True}
    
    # Verbinde mit Supabase
    print()
    print("🔌 Verbinde mit Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"  ✅ Verbunden mit {SUPABASE_URL[:40]}...")
    except Exception as e:
        print(f"  ❌ Verbindungsfehler: {e}")
        return {'success': False, 'error': f'Verbindungsfehler: {e}', 'imported': 0}
    
    # Importiere Scripts
    print()
    print("📥 Importiere Scripts...")
    print()
    
    imported_count = 0
    skipped_count = 0
    import_errors = []
    
    for i, script in enumerate(valid_scripts, 1):
        try:
            # Normalisiere basierend auf Tabelle
            if table == 'mlm_scripts':
                normalized = normalize_for_mlm_scripts(script)
                id_field = 'script_id'
            else:
                normalized = normalize_for_scripts(script, i)
                id_field = 'number'
            
            # Prüfe ob bereits vorhanden
            if table == 'mlm_scripts':
                existing = supabase.table(table)\
                    .select('id')\
                    .eq(id_field, normalized[id_field])\
                    .execute()
            else:
                existing = supabase.table(table)\
                    .select('id')\
                    .eq('name', normalized['name'])\
                    .execute()
            
            if existing.data:
                print(f"  ⏭️  #{i}: {script['title'][:40]} (übersprungen)")
                skipped_count += 1
                continue
            
            # Insert
            result = supabase.table(table).insert(normalized).execute()
            
            imported_count += 1
            print(f"  ✅ #{i}: {script['title'][:40]}")
            
        except Exception as e:
            error_msg = f"Script #{i}: {str(e)}"
            import_errors.append(error_msg)
            print(f"  ❌ #{i}: {script.get('title', 'Unknown')[:30]} - {e}")
    
    # Zusammenfassung
    print()
    print("=" * 60)
    print(f"✅ Erfolgreich importiert: {imported_count}")
    print(f"⏭️  Übersprungen (bereits vorhanden): {skipped_count}")
    print(f"❌ Fehler: {len(import_errors)}")
    print("=" * 60)
    print()
    
    return {
        'success': imported_count > 0 or skipped_count > 0,
        'imported': imported_count,
        'skipped': skipped_count,
        'errors': errors + import_errors,
        'total': len(scripts),
        'valid': len(valid_scripts)
    }


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """CLI Entry Point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Importiert Scripts in Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  # Dry-Run (nur Validierung)
  python backend/scripts/import_scripts.py --dry-run
  
  # Import in mlm_scripts (Standard)
  python backend/scripts/import_scripts.py
  
  # Import in scripts Tabelle
  python backend/scripts/import_scripts.py --table scripts
  
  # Mit explizitem Key
  SUPABASE_SERVICE_ROLE_KEY=key python backend/scripts/import_scripts.py
        """
    )
    
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='Nur validieren, nicht importieren'
    )
    
    parser.add_argument(
        '--table', '-t',
        type=str,
        default='mlm_scripts',
        choices=['mlm_scripts', 'scripts'],
        help='Zieltabelle (default: mlm_scripts)'
    )
    
    parser.add_argument(
        '--file', '-f',
        type=str,
        default=None,
        help='Alternativer Pfad zur JSON-Datei'
    )
    
    args = parser.parse_args()
    
    json_file = None
    if args.file:
        json_file = Path(args.file)
        if not json_file.is_absolute():
            json_file = backend_dir / json_file
    
    result = import_scripts(
        dry_run=args.dry_run,
        table=args.table,
        json_file=json_file
    )
    
    if result['success']:
        print("🎉 Import abgeschlossen!")
        sys.exit(0)
    else:
        print("❌ Import fehlgeschlagen!")
        sys.exit(1)


if __name__ == '__main__':
    main()

