#!/usr/bin/env python3
"""
Führt die Sales Intelligence Migration aus.

Usage:
    python run_sales_intelligence_migration.py
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
    """Führt die Migration aus."""
    
    # Supabase Client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein!")
        print("   Setze die Variablen in .env oder als Umgebungsvariablen.")
        sys.exit(1)
    
    print(f"🔗 Verbinde mit Supabase: {url[:50]}...")
    
    supabase = create_client(url, key)
    
    # Migration SQL lesen
    migration_path = Path(__file__).parent / "migrations" / "20251203_sales_intelligence_tables.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        sys.exit(1)
    
    sql = migration_path.read_text(encoding="utf-8")
    
    print(f"📄 Migration geladen: {migration_path.name}")
    print(f"   Größe: {len(sql):,} Zeichen")
    
    # SQL in Statements aufteilen
    statements = []
    current = []
    in_function = False
    
    for line in sql.split("\n"):
        stripped = line.strip()
        
        # Track function blocks
        if "CREATE OR REPLACE FUNCTION" in line or "CREATE FUNCTION" in line:
            in_function = True
        if in_function and stripped == "$$ LANGUAGE plpgsql;" or stripped == "$$ LANGUAGE plpgsql SECURITY DEFINER;":
            in_function = False
        
        # Skip comments and empty lines (except in functions)
        if not in_function:
            if stripped.startswith("--") or stripped == "":
                if current:
                    continue
                else:
                    continue
        
        current.append(line)
        
        # Statement end
        if not in_function and stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt and not stmt.startswith("--"):
                statements.append(stmt)
            current = []
    
    # Remaining
    if current:
        stmt = "\n".join(current).strip()
        if stmt and not stmt.startswith("--"):
            statements.append(stmt)
    
    print(f"📊 {len(statements)} SQL Statements gefunden")
    print()
    
    # Statements ausführen
    success = 0
    errors = []
    
    for i, stmt in enumerate(statements, 1):
        # Kurze Beschreibung des Statements
        first_line = stmt.split("\n")[0][:60]
        
        try:
            # Supabase RPC für raw SQL
            supabase.rpc("exec_sql", {"sql": stmt}).execute()
            print(f"  ✅ [{i}/{len(statements)}] {first_line}...")
            success += 1
        except Exception as e:
            error_msg = str(e)
            
            # Ignoriere "already exists" Fehler
            if "already exists" in error_msg.lower():
                print(f"  ⏭️ [{i}/{len(statements)}] {first_line}... (existiert bereits)")
                success += 1
            elif "duplicate key" in error_msg.lower():
                print(f"  ⏭️ [{i}/{len(statements)}] {first_line}... (bereits vorhanden)")
                success += 1
            else:
                print(f"  ❌ [{i}/{len(statements)}] {first_line}...")
                print(f"      Error: {error_msg[:100]}")
                errors.append((i, first_line, error_msg))
    
    print()
    print("=" * 60)
    print(f"✅ Erfolgreich: {success}/{len(statements)}")
    
    if errors:
        print(f"❌ Fehler: {len(errors)}")
        for i, desc, err in errors[:5]:
            print(f"   [{i}] {desc}: {err[:80]}")
    else:
        print("🎉 Migration erfolgreich abgeschlossen!")
    
    return len(errors) == 0


if __name__ == "__main__":
    print("=" * 60)
    print("  Sales Intelligence Migration")
    print("=" * 60)
    print()
    
    success = run_migration()
    sys.exit(0 if success else 1)

