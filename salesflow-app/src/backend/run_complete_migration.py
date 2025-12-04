#!/usr/bin/env python3
"""
Führt die COMPLETE_SCHEMA_MIGRATION aus.
Nutzt den Supabase Python Client.

Usage:
    cd backend
    python run_complete_migration.py
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client


def run_migration():
    """Führt die Migration über Supabase aus."""
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein!")
        return False
    
    print(f"🔗 Verbinde mit Supabase: {url[:50]}...")
    
    # Migration SQL lesen
    migration_path = Path(__file__).parent / "migrations" / "COMPLETE_SCHEMA_MIGRATION.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        return False
    
    sql = migration_path.read_text(encoding="utf-8")
    
    print(f"📄 Migration geladen: {migration_path.name}")
    print(f"   Größe: {len(sql):,} Zeichen")
    print()
    
    # SQL in einzelne Statements aufteilen
    statements = []
    current_stmt = []
    in_function = False
    
    for line in sql.split("\n"):
        # Skip pure comments and empty lines at statement level
        stripped = line.strip()
        
        # Track function/procedure bodies (they contain multiple semicolons)
        if "$$" in line:
            in_function = not in_function
        
        current_stmt.append(line)
        
        # End of statement (semicolon not inside function body)
        if stripped.endswith(";") and not in_function:
            stmt = "\n".join(current_stmt).strip()
            if stmt and not stmt.startswith("--"):
                statements.append(stmt)
            current_stmt = []
    
    # Any remaining
    if current_stmt:
        stmt = "\n".join(current_stmt).strip()
        if stmt and not stmt.startswith("--"):
            statements.append(stmt)
    
    print(f"📊 {len(statements)} SQL Statements gefunden")
    print()
    
    # Mit Supabase verbinden
    try:
        supabase = create_client(url, key)
        print("✅ Supabase Client erstellt")
    except Exception as e:
        print(f"❌ Supabase Verbindung fehlgeschlagen: {e}")
        return False
    
    print()
    print("=" * 60)
    print("  Führe Migration aus...")
    print("=" * 60)
    print()
    
    success = 0
    skipped = 0
    errors = []
    
    for i, stmt in enumerate(statements, 1):
        # Extract first meaningful line for display
        lines = [l for l in stmt.split("\n") if l.strip() and not l.strip().startswith("--")]
        first_line = lines[0][:60] if lines else stmt[:60]
        
        # Skip extension commands (they often fail with permissions)
        if "CREATE EXTENSION" in stmt.upper():
            print(f"  ⏭️ [{i:3d}] {first_line}... (Extension - skip)")
            skipped += 1
            continue
        
        # Skip view on auth.users (often restricted)
        if "FROM auth.users" in stmt and "VIEW" in stmt.upper():
            print(f"  ⏭️ [{i:3d}] {first_line}... (Auth view - skip)")
            skipped += 1
            continue
        
        try:
            # Execute via RPC or direct query
            result = supabase.rpc("exec_sql", {"query": stmt}).execute()
            print(f"  ✅ [{i:3d}] {first_line}...")
            success += 1
        except Exception as e:
            error_str = str(e).lower()
            
            # Check for acceptable errors
            if any(x in error_str for x in [
                "already exists",
                "duplicate key",
                "relation already exists",
                "constraint already exists",
                "policy already exists",
                "function already exists",
                "type already exists",
                "index already exists",
            ]):
                print(f"  ⏭️ [{i:3d}] {first_line}... (existiert)")
                skipped += 1
            elif "does not exist" in error_str and "rpc" in error_str:
                # RPC doesn't exist - need manual execution
                print(f"  ⚠️ exec_sql RPC nicht verfügbar!")
                errors.append((i, first_line, str(e)))
                break
            else:
                print(f"  ❌ [{i:3d}] {first_line}...")
                print(f"      Error: {str(e)[:100]}")
                errors.append((i, first_line, str(e)))
    
    print()
    print("=" * 60)
    print(f"  ✅ Erfolgreich:  {success}")
    print(f"  ⏭️ Übersprungen: {skipped}")
    print(f"  ❌ Fehler:       {len(errors)}")
    print("=" * 60)
    
    if errors:
        print()
        print("⚠️  Es gab Fehler. Die Migration muss manuell ausgeführt werden.")
        print()
        print("📋 MANUELLE MIGRATION:")
        print("─" * 60)
        print("1. Öffne: https://supabase.com/dashboard")
        print("2. Wähle dein Projekt")
        print("3. Gehe zu: SQL Editor")
        print("4. Kopiere den Inhalt von:")
        print(f"   {migration_path}")
        print("5. Klicke 'RUN'")
        print()
        
        # Quick copy info
        print("📎 Oder kopiere mit:")
        print(f'   type "{migration_path}"')
        
    return len(errors) == 0


if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  COMPLETE SCHEMA MIGRATION - SALES FLOW AI                   ║")
    print("║  ~140 Tabellen werden erstellt                               ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    
    success = run_migration()
    
    if not success:
        print()
        print("💡 TIPP: Die meisten Supabase-Projekte erlauben keine")
        print("   direkten SQL-Ausführungen über die API.")
        print("   Nutze den SQL Editor im Supabase Dashboard!")
    
    sys.exit(0 if success else 1)

