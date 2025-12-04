#!/usr/bin/env python3
"""
Führt die Sales Intelligence Migration direkt aus.
Nutzt den Supabase Admin Client.

Usage:
    cd backend
    python run_migration_direct.py
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

import requests


def run_migration():
    """Führt die Migration über Supabase REST API aus."""
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein!")
        sys.exit(1)
    
    print(f"🔗 Verbinde mit Supabase: {url[:50]}...")
    
    # Migration SQL lesen
    migration_path = Path(__file__).parent / "migrations" / "20251203_sales_intelligence_tables.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        sys.exit(1)
    
    sql = migration_path.read_text(encoding="utf-8")
    
    print(f"📄 Migration geladen: {migration_path.name}")
    print(f"   Größe: {len(sql):,} Zeichen")
    
    # SQL in Statements aufteilen (einfache Version)
    # Wir teilen bei doppelten Zeilenumbrüchen nach Semikolons
    raw_statements = sql.split("\n\n")
    
    statements = []
    current = []
    
    for block in raw_statements:
        block = block.strip()
        if not block or block.startswith("--"):
            continue
        
        # Kommentarzeilen entfernen
        lines = []
        for line in block.split("\n"):
            stripped = line.strip()
            if not stripped.startswith("--"):
                lines.append(line)
        
        clean_block = "\n".join(lines).strip()
        if clean_block:
            statements.append(clean_block)
    
    print(f"📊 {len(statements)} SQL Blöcke gefunden")
    print()
    
    # REST API für SQL Ausführung
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    
    # Supabase SQL Endpoint
    sql_url = f"{url}/rest/v1/rpc/exec_sql"
    
    success = 0
    errors = []
    
    for i, stmt in enumerate(statements, 1):
        first_line = stmt.split("\n")[0][:50]
        
        # Skip leere Statements
        if not stmt.strip() or stmt.strip().startswith("--"):
            continue
        
        try:
            response = requests.post(
                sql_url,
                headers=headers,
                json={"sql": stmt}
            )
            
            if response.status_code in [200, 201, 204]:
                print(f"  ✅ [{i}] {first_line}...")
                success += 1
            elif "already exists" in response.text.lower():
                print(f"  ⏭️ [{i}] {first_line}... (existiert bereits)")
                success += 1
            elif "duplicate key" in response.text.lower():
                print(f"  ⏭️ [{i}] {first_line}... (bereits vorhanden)")
                success += 1
            else:
                print(f"  ❌ [{i}] {first_line}...")
                print(f"      Status: {response.status_code}")
                print(f"      Error: {response.text[:150]}")
                errors.append((i, first_line, response.text))
        except Exception as e:
            error_msg = str(e)
            if "already exists" in error_msg.lower():
                print(f"  ⏭️ [{i}] {first_line}... (existiert bereits)")
                success += 1
            else:
                print(f"  ❌ [{i}] {first_line}...")
                print(f"      Exception: {error_msg[:100]}")
                errors.append((i, first_line, error_msg))
    
    print()
    print("=" * 60)
    print(f"✅ Verarbeitet: {success}")
    
    if errors:
        print(f"❌ Fehler: {len(errors)}")
        print()
        print("⚠️  Die Fehler könnten bedeuten, dass exec_sql RPC nicht existiert.")
        print("    Bitte führe die Migration manuell im Supabase SQL Editor aus:")
        print(f"    1. Öffne: {url.replace('.supabase.co', '.supabase.co/project/default/sql')}")
        print(f"    2. Kopiere den Inhalt von: {migration_path}")
        print("    3. Führe das SQL aus")
    else:
        print("🎉 Migration erfolgreich!")
    
    return len(errors) == 0


if __name__ == "__main__":
    print("=" * 60)
    print("  Sales Intelligence Migration")
    print("=" * 60)
    print()
    
    success = run_migration()
    
    if not success:
        print()
        print("=" * 60)
        print("ALTERNATIVE: Kopiere die SQL-Datei und führe sie manuell aus:")
        print("=" * 60)
        print()
        print("1. Öffne Supabase Dashboard > SQL Editor")
        print("2. Kopiere den Inhalt von:")
        print("   backend/migrations/20251203_sales_intelligence_tables.sql")
        print("3. Füge ein und klicke 'RUN'")
    
    sys.exit(0 if success else 1)

