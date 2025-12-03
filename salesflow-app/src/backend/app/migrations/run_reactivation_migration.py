"""
Migrations-Skript für Reactivation Agent Tabellen

Führt die SQL-Migration gegen Supabase aus.

Usage:
    python -m app.migrations.run_reactivation_migration
"""

import asyncio
import os
import sys
from pathlib import Path

# Projekt-Root zum Path hinzufügen
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


async def run_migration():
    """Führt die Reactivation Agent Migration aus."""
    from supabase import create_client, Client
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Supabase Client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL oder SUPABASE_KEY nicht gesetzt!")
        return False
    
    print(f"🔗 Verbinde mit Supabase: {supabase_url[:50]}...")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Migration SQL laden
    migration_path = Path(__file__).parent.parent.parent.parent / "migrations" / "20241203_reactivation_tables.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        return False
    
    print(f"📄 Lade Migration: {migration_path.name}")
    
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    # SQL in einzelne Statements aufteilen (einfach)
    # Für komplexere Migrationen: pgmigrate oder alembic verwenden
    statements = []
    current_statement = []
    
    for line in sql.split("\n"):
        # Kommentare überspringen
        if line.strip().startswith("--"):
            continue
        
        current_statement.append(line)
        
        # Statement endet mit ;
        if line.strip().endswith(";"):
            stmt = "\n".join(current_statement).strip()
            if stmt:
                statements.append(stmt)
            current_statement = []
    
    print(f"📊 {len(statements)} Statements gefunden")
    
    # Statements ausführen
    success_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements, 1):
        # Leere Statements überspringen
        if not stmt.strip() or stmt.strip() == ";":
            continue
        
        try:
            # Statement-Typ erkennen
            stmt_type = stmt.strip().split()[0].upper() if stmt.strip() else "UNKNOWN"
            
            # RPC für DDL Statements
            result = supabase.rpc("exec_sql", {"sql": stmt}).execute()
            
            print(f"  ✅ [{i}/{len(statements)}] {stmt_type}...")
            success_count += 1
            
        except Exception as e:
            # Manche Fehler sind OK (z.B. "already exists")
            error_msg = str(e).lower()
            
            if "already exists" in error_msg or "does not exist" in error_msg:
                print(f"  ⏭️ [{i}/{len(statements)}] Übersprungen (existiert bereits)")
                success_count += 1
            elif "function exec_sql" in error_msg:
                print(f"  ⚠️ exec_sql Funktion nicht verfügbar - bitte SQL manuell ausführen")
                error_count += 1
            else:
                print(f"  ❌ [{i}/{len(statements)}] Fehler: {str(e)[:100]}")
                error_count += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Erfolgreich: {success_count}")
    print(f"❌ Fehler: {error_count}")
    
    if error_count > 0:
        print(f"\n⚠️ Bei Fehlern: Migration manuell im Supabase SQL Editor ausführen:")
        print(f"   {migration_path}")
    
    return error_count == 0


def main():
    """Entry Point."""
    print("="*60)
    print("  🔄 REACTIVATION AGENT - DATABASE MIGRATION")
    print("="*60)
    print()
    
    success = asyncio.run(run_migration())
    
    if success:
        print("\n✅ Migration erfolgreich abgeschlossen!")
    else:
        print("\n⚠️ Migration mit Warnungen abgeschlossen")
        print("   Bitte SQL manuell im Supabase Dashboard ausführen.")


if __name__ == "__main__":
    main()

