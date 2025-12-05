#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  IMPORT ALL SCRIPTS TO SUPABASE                                            ║
║  Importiert 100 Scripts aus 2 Batch-Dateien in mlm_scripts Tabelle         ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    cd backend
    export SUPABASE_SERVICE_KEY="your-service-key"
    python scripts/import_all_scripts.py
    
    # Oder mit .env file
    pip install python-dotenv
    python scripts/import_all_scripts.py
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Try to load .env file if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Fehler: supabase-py nicht installiert")
    print("   Installiere mit: pip install supabase")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

SUPABASE_URL = "https://ydnlxqjblvtoemqbjcai.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Pfade
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"

BATCH_FILES = [
    "scripts_batch1.json",
    "scripts_batch2.json",
]

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def validate_script(script: Dict[str, Any]) -> Tuple[bool, str]:
    """Validiert ein Script-Objekt."""
    required = ['id', 'title', 'content', 'category']
    for field in required:
        if field not in script or not script[field]:
            return False, f"Fehlendes Feld: {field}"
    return True, ""


def normalize_script(script: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalisiert ein Script für die mlm_scripts Tabelle.
    """
    # Company aus industry extrahieren
    company = 'GENERAL'
    if script.get('industry') and len(script['industry']) > 0:
        company = script['industry'][0].upper()
    
    # Tags normalisieren
    tags = script.get('tags', [])
    if isinstance(tags, str):
        tags = [tags]
    
    # Variables normalisieren (zu Array)
    variables = script.get('variables', [])
    if isinstance(variables, dict):
        variables = list(variables.keys())
    elif isinstance(variables, str):
        variables = [variables] if variables else []
    
    # Tone uppercase
    tone = script.get('tone', 'CASUAL').upper()
    
    return {
        'script_id': script['id'],
        'title': script['title'],
        'content': script['content'],
        'category': script['category'].upper(),
        'company': company,
        'tags': tags,
        'tone': tone,
        'variables': variables,
        'copied_count': 0,
        'success_rate': 0.0,
        'is_active': True,
    }


# ═══════════════════════════════════════════════════════════════════════════
# IMPORT FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def import_scripts(supabase: Client, filename: str) -> Tuple[int, int, List[str]]:
    """
    Importiert Scripts aus einer JSON-Datei in Supabase.
    
    Returns:
        (imported_count, error_count, error_messages)
    """
    filepath = DATA_DIR / filename
    
    if not filepath.exists():
        return 0, 1, [f"Datei nicht gefunden: {filepath}"]
    
    # Lade JSON
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return 0, 1, [f"JSON-Fehler in {filename}: {e}"]
    
    if 'scripts' not in data:
        return 0, 1, [f"Kein 'scripts' Feld in {filename}"]
    
    scripts = data['scripts']
    imported = 0
    errors = 0
    error_messages = []
    
    for script in scripts:
        # Validierung
        is_valid, error_msg = validate_script(script)
        if not is_valid:
            errors += 1
            error_messages.append(f"{script.get('id', 'unknown')}: {error_msg}")
            print(f"  ⚠️  {script.get('id', 'unknown')}: {error_msg}")
            continue
        
        try:
            # Normalisieren
            record = normalize_script(script)
            
            # Upsert (insert or update if exists)
            result = supabase.table('mlm_scripts').upsert(
                record,
                on_conflict='script_id'
            ).execute()
            
            imported += 1
            print(f"  ✅ {script['id']}: {script['title'][:40]}")
            
        except Exception as e:
            errors += 1
            error_msg = f"{script['id']}: {str(e)}"
            error_messages.append(error_msg)
            print(f"  ❌ {error_msg}")
    
    return imported, errors, error_messages


def main():
    """Main entry point."""
    print()
    print("╔" + "═" * 58 + "╗")
    print("║  🚀 IMPORT ALL SCRIPTS TO SUPABASE                        ║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    # Prüfe Supabase Key
    if not SUPABASE_KEY:
        print("❌ FEHLER: SUPABASE_SERVICE_KEY nicht gesetzt!")
        print()
        print("   Option 1 - Environment Variable:")
        print("   export SUPABASE_SERVICE_KEY='your-key'")
        print()
        print("   Option 2 - .env Datei erstellen:")
        print("   echo 'SUPABASE_SERVICE_KEY=your-key' > .env")
        print()
        sys.exit(1)
    
    print(f"📡 Supabase URL: {SUPABASE_URL[:40]}...")
    print(f"📂 Data Directory: {DATA_DIR}")
    print()
    
    # Verbinde mit Supabase
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Verbunden mit Supabase")
        print()
    except Exception as e:
        print(f"❌ Verbindungsfehler: {e}")
        sys.exit(1)
    
    # Import alle Batches
    total_imported = 0
    total_errors = 0
    all_errors = []
    
    for i, filename in enumerate(BATCH_FILES, 1):
        print("=" * 60)
        print(f"📦 Batch {i}: {filename}")
        print("=" * 60)
        
        imported, errors, error_msgs = import_scripts(supabase, filename)
        
        total_imported += imported
        total_errors += errors
        all_errors.extend(error_msgs)
        
        print()
        print(f"   Importiert: {imported}")
        print(f"   Fehler: {errors}")
        print()
    
    # Zusammenfassung
    print("=" * 60)
    print("📊 ZUSAMMENFASSUNG")
    print("=" * 60)
    print(f"✅ TOTAL IMPORTIERT: {total_imported}")
    print(f"❌ TOTAL FEHLER: {total_errors}")
    print()
    
    if all_errors:
        print("⚠️  Fehlerdetails:")
        for err in all_errors[:10]:
            print(f"   - {err}")
        if len(all_errors) > 10:
            print(f"   ... und {len(all_errors) - 10} weitere")
        print()
    
    # Prüfe Gesamtzahl in DB
    try:
        result = supabase.table('mlm_scripts').select('id', count='exact').execute()
        print(f"📚 Scripts in Datenbank: {result.count}")
    except Exception as e:
        print(f"⚠️  Konnte Gesamtzahl nicht abrufen: {e}")
    
    print()
    print("🎉 Import abgeschlossen!" if total_errors == 0 else "⚠️  Import mit Fehlern abgeschlossen")
    
    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

