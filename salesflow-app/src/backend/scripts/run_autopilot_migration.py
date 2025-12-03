"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT MIGRATION RUNNER                                                ║
║  Führt die v3.2 Autopilot Migration in Supabase aus                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Ausführen:
    cd backend
    python -m scripts.run_autopilot_migration
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# .env laden
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from supabase import create_client, Client

def run_migration():
    """Führt die Autopilot Migration aus."""
    
    print("🚀 CHIEF v3.2 Autopilot Migration")
    print("=" * 60)
    
    # Supabase Client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL oder SUPABASE_KEY nicht gefunden!")
        print("   Bitte .env Datei prüfen.")
        sys.exit(1)
    
    print(f"📡 Verbinde mit Supabase: {url[:40]}...")
    
    supabase: Client = create_client(url, key)
    
    # Migration SQL laden
    migration_path = Path(__file__).parent.parent / "migrations" / "20251209_autopilot_system.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        sys.exit(1)
    
    print(f"📄 Lade Migration: {migration_path.name}")
    
    with open(migration_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # SQL in einzelne Statements aufteilen
    # (Supabase RPC kann nur einzelne Statements ausführen)
    statements = []
    current_stmt = []
    in_function = False
    
    for line in sql_content.split("\n"):
        stripped = line.strip()
        
        # Skip Kommentare
        if stripped.startswith("--"):
            continue
        
        # Erkennen wenn wir in einer Function/DO Block sind
        if "$$" in line:
            in_function = not in_function
        
        current_stmt.append(line)
        
        # Statement Ende erkennen (außerhalb von Funktionen)
        if not in_function and stripped.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt and not stmt.startswith("--"):
                statements.append(stmt)
            current_stmt = []
    
    print(f"📊 {len(statements)} SQL Statements gefunden")
    print()
    
    # Statements einzeln ausführen
    success = 0
    errors = 0
    
    for i, stmt in enumerate(statements):
        # Statement-Vorschau (erste 60 Zeichen)
        preview = stmt.replace("\n", " ")[:60]
        
        try:
            # Via RPC ausführen
            supabase.rpc("execute_sql", {"sql": stmt}).execute()
            print(f"  ✅ [{i+1}/{len(statements)}] {preview}...")
            success += 1
        except Exception as e:
            error_msg = str(e)
            
            # Bekannte harmlose Errors ignorieren
            if "already exists" in error_msg.lower():
                print(f"  ⏭️ [{i+1}/{len(statements)}] Bereits vorhanden: {preview[:40]}...")
                success += 1
            elif "does not exist" in error_msg.lower() and "DROP" in stmt.upper():
                print(f"  ⏭️ [{i+1}/{len(statements)}] Nichts zu löschen: {preview[:40]}...")
                success += 1
            else:
                print(f"  ❌ [{i+1}/{len(statements)}] Fehler: {error_msg[:80]}")
                errors += 1
    
    print()
    print("=" * 60)
    print(f"✅ Erfolgreich: {success}")
    print(f"❌ Fehler: {errors}")
    
    if errors == 0:
        print()
        print("🎉 Migration erfolgreich abgeschlossen!")
        print()
        print("Neue Tabellen:")
        print("  • autopilot_settings")
        print("  • lead_autopilot_overrides")
        print("  • autopilot_drafts")
        print("  • autopilot_actions")
        print("  • channel_mappings")
        print("  • autopilot_stats_daily")
    else:
        print()
        print("⚠️ Einige Statements hatten Fehler.")
        print("   Bitte im Supabase Dashboard manuell prüfen.")


if __name__ == "__main__":
    run_migration()

