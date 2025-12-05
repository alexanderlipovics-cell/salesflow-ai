#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GEMINI SCRIPTS IMPORT                                                     ║
║  Importiert 50 Scripts von Gemini in Supabase mlm_scripts Tabelle          ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    # Mit Service Key (empfohlen)
    python backend/scripts/import_gemini_scripts.py
    
    # Oder mit explizitem Key
    SUPABASE_SERVICE_ROLE_KEY=your_key python backend/scripts/import_gemini_scripts.py
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from supabase import create_client
except ImportError:
    print("❌ Fehler: supabase-py nicht installiert")
    print("   Installiere mit: pip install supabase")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

SUPABASE_URL = "https://ydnlxqjblvtoemqbjcai.supabase.co"

# Service Role Key aus Environment oder Backend Settings
def get_supabase_key():
    """Holt Supabase Key aus verschiedenen Quellen."""
    # 1. Environment Variable (höchste Priorität)
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if key:
        return key
    
    # 2. Versuche Backend Settings zu laden
    try:
        from app.core.config import settings
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if key:
            return key
    except:
        pass
    
    # 3. Fallback
    return "YOUR_SERVICE_KEY_HERE"

SUPABASE_KEY = get_supabase_key()

# JSON-Datei Pfad
JSON_FILE = backend_dir / "data" / "scripts_gemini_50.json"

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def validate_script(script: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validiert ein Script-Objekt.
    
    Returns:
        (is_valid, error_message)
    """
    required_fields = ['id', 'title', 'content', 'category']
    
    for field in required_fields:
        if field not in script:
            return False, f"Fehlendes Feld: {field}"
    
    if not script['id'] or not script['title'] or not script['content']:
        return False, "id, title und content dürfen nicht leer sein"
    
    valid_categories = ['opener', 'followup', 'closing', 'objection', 'general']
    if script['category'] not in valid_categories:
        return False, f"Ungültige Kategorie: {script['category']}. Erlaubt: {valid_categories}"
    
    return True, ""

def normalize_script(script: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalisiert ein Script für die Datenbank.
    """
    # Hole erste Industry oder 'GENERAL'
    company = 'GENERAL'
    if script.get('industry') and len(script['industry']) > 0:
        company = script['industry'][0].upper()
    
    # Normalisiere Tags
    tags = script.get('tags', [])
    if isinstance(tags, str):
        tags = [tags]
    elif not isinstance(tags, list):
        tags = []
    
    # Normalisiere Variables
    variables = script.get('variables', {})
    if isinstance(variables, str):
        try:
            variables = json.loads(variables)
        except:
            variables = {}
    elif not isinstance(variables, dict):
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

# ═══════════════════════════════════════════════════════════════════════════
# MAIN IMPORT FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def import_scripts(dry_run: bool = False) -> Dict[str, Any]:
    """
    Importiert Scripts aus JSON in Supabase.
    
    Args:
        dry_run: Wenn True, wird nur validiert, nicht importiert
        
    Returns:
        Dictionary mit Import-Ergebnissen
    """
    print("╔" + "═" * 60 + "╗")
    print("║  🚀 GEMINI SCRIPTS IMPORT                                    ║")
    print("╚" + "═" * 60 + "╝")
    print()
    
    # Prüfe Supabase Key
    if SUPABASE_KEY == "YOUR_SERVICE_KEY_HERE":
        print("❌ FEHLER: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt!")
        print()
        print("   Optionen:")
        print("   1. Environment Variable setzen:")
        print("      export SUPABASE_SERVICE_ROLE_KEY=dein_key")
        print()
        print("   2. Oder direkt im Script setzen (nur für Tests)")
        print()
        return {
            'success': False,
            'error': 'SUPABASE_SERVICE_ROLE_KEY nicht gesetzt',
            'imported': 0,
            'errors': []
        }
    
    # Prüfe JSON-Datei
    if not JSON_FILE.exists():
        print(f"❌ JSON-Datei nicht gefunden: {JSON_FILE}")
        print()
        return {
            'success': False,
            'error': f'Datei nicht gefunden: {JSON_FILE}',
            'imported': 0,
            'errors': []
        }
    
    print(f"📂 Datei: {JSON_FILE}")
    print(f"🔧 Modus: {'DRY-RUN (nur Validierung)' if dry_run else 'IMPORT'}")
    print()
    
    # Lade JSON
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON-Parse-Fehler: {e}")
        return {
            'success': False,
            'error': f'JSON-Parse-Fehler: {e}',
            'imported': 0,
            'errors': []
        }
    except Exception as e:
        print(f"❌ Fehler beim Lesen der Datei: {e}")
        return {
            'success': False,
            'error': f'Datei-Lese-Fehler: {e}',
            'imported': 0,
            'errors': []
        }
    
    # Prüfe Struktur
    if 'scripts' not in data:
        print("❌ JSON-Struktur ungültig: 'scripts' Feld fehlt")
        return {
            'success': False,
            'error': "JSON-Struktur ungültig: 'scripts' Feld fehlt",
            'imported': 0,
            'errors': []
        }
    
    scripts = data['scripts']
    if not isinstance(scripts, list):
        print("❌ JSON-Struktur ungültig: 'scripts' muss eine Liste sein")
        return {
            'success': False,
            'error': "JSON-Struktur ungültig: 'scripts' muss eine Liste sein",
            'imported': 0,
            'errors': []
        }
    
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
        for error in errors[:10]:
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... und {len(errors) - 10} weitere")
        print()
    
    if not valid_scripts:
        print("❌ Keine gültigen Scripts zum Importieren")
        return {
            'success': False,
            'error': 'Keine gültigen Scripts',
            'imported': 0,
            'errors': errors
        }
    
    # Dry-Run: Nur validieren
    if dry_run:
        print()
        print("💡 DRY-RUN abgeschlossen. Führe ohne --dry-run aus, um zu importieren.")
        return {
            'success': True,
            'imported': 0,
            'validated': len(valid_scripts),
            'errors': errors,
            'dry_run': True
        }
    
    # Verbinde mit Supabase
    print()
    print("🔌 Verbinde mit Supabase...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("  ✅ Verbunden")
    except Exception as e:
        print(f"  ❌ Verbindungsfehler: {e}")
        return {
            'success': False,
            'error': f'Supabase-Verbindungsfehler: {e}',
            'imported': 0,
            'errors': errors
        }
    
    # Importiere Scripts
    print()
    print("📥 Importiere Scripts...")
    print()
    
    imported_count = 0
    import_errors = []
    
    for i, script in enumerate(valid_scripts, 1):
        try:
            normalized = normalize_script(script)
            
            # Prüfe ob Script bereits existiert (basierend auf script_id)
            existing = supabase.table('mlm_scripts')\
                .select('id')\
                .eq('script_id', normalized['script_id'])\
                .execute()
            
            if existing.data:
                print(f"  ⏭️  #{i}: {normalized['title']} (übersprungen - bereits vorhanden)")
                continue
            
            # Insert
            result = supabase.table('mlm_scripts').insert(normalized).execute()
            
            imported_count += 1
            print(f"  ✅ #{i}: {normalized['title']}")
            
        except Exception as e:
            error_msg = f"Script #{i} ({script.get('id', 'unknown')}): {str(e)}"
            import_errors.append(error_msg)
            print(f"  ❌ #{i}: {script.get('title', 'Unknown')} - {e}")
    
    # Zusammenfassung
    print()
    print("=" * 60)
    print(f"✅ Erfolgreich importiert: {imported_count}")
    print(f"⏭️  Übersprungen: {len(valid_scripts) - imported_count - len(import_errors)}")
    print(f"❌ Fehler: {len(import_errors)}")
    if import_errors:
        print()
        print("⚠️  Import-Fehler:")
        for error in import_errors[:5]:
            print(f"   - {error}")
        if len(import_errors) > 5:
            print(f"   ... und {len(import_errors) - 5} weitere")
    print("=" * 60)
    print()
    
    return {
        'success': imported_count > 0,
        'imported': imported_count,
        'skipped': len(valid_scripts) - imported_count - len(import_errors),
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
        description="Importiert Gemini-Scripts in Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  # Dry-Run (nur Validierung)
  python backend/scripts/import_gemini_scripts.py --dry-run
  
  # Echter Import
  python backend/scripts/import_gemini_scripts.py
  
  # Mit explizitem Key
  SUPABASE_SERVICE_ROLE_KEY=key python backend/scripts/import_gemini_scripts.py
        """
    )
    
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='Nur validieren, nicht importieren'
    )
    
    parser.add_argument(
        '--file', '-f',
        type=str,
        default=None,
        help='Alternativer Pfad zur JSON-Datei'
    )
    
    args = parser.parse_args()
    
    # Überschreibe JSON-Datei wenn angegeben
    global JSON_FILE
    if args.file:
        JSON_FILE = Path(args.file)
        if not JSON_FILE.is_absolute():
            JSON_FILE = backend_dir / JSON_FILE
    
    result = import_scripts(dry_run=args.dry_run)
    
    if result['success']:
        print("🎉 Import abgeschlossen!")
        sys.exit(0)
    else:
        print("❌ Import fehlgeschlagen!")
        sys.exit(1)

if __name__ == '__main__':
    main()

