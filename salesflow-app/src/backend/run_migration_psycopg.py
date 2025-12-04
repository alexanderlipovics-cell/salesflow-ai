#!/usr/bin/env python3
"""
Führt die Sales Intelligence Migration mit psycopg2 aus.

Usage:
    cd backend
    pip install psycopg2-binary
    python run_migration_psycopg.py
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

try:
    import psycopg2
except ImportError:
    print("❌ psycopg2 nicht installiert. Installiere mit:")
    print("   pip install psycopg2-binary")
    sys.exit(1)


def get_connection_string():
    """Baut den PostgreSQL Connection String aus Supabase URL."""
    supabase_url = os.getenv("SUPABASE_URL", "")
    db_password = os.getenv("SUPABASE_DB_PASSWORD", "")
    
    if not supabase_url:
        print("❌ SUPABASE_URL nicht gesetzt!")
        return None
    
    if not db_password:
        print("❌ SUPABASE_DB_PASSWORD nicht gesetzt!")
        print("   Finde es in Supabase Dashboard > Settings > Database > Connection string")
        return None
    
    # Supabase URL: https://PROJECT_REF.supabase.co
    # DB Host: db.PROJECT_REF.supabase.co
    parsed = urlparse(supabase_url)
    project_ref = parsed.netloc.split(".")[0]
    
    db_host = f"db.{project_ref}.supabase.co"
    db_port = 5432
    db_name = "postgres"
    db_user = "postgres"
    
    conn_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    print(f"📎 DB Host: {db_host}")
    
    return conn_string


def run_migration():
    """Führt die Migration aus."""
    
    conn_string = get_connection_string()
    if not conn_string:
        return False
    
    # Migration SQL lesen
    migration_path = Path(__file__).parent / "migrations" / "20251203_sales_intelligence_tables.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration nicht gefunden: {migration_path}")
        return False
    
    sql = migration_path.read_text(encoding="utf-8")
    
    print(f"📄 Migration geladen: {migration_path.name}")
    print(f"   Größe: {len(sql):,} Zeichen")
    print()
    
    try:
        print("🔗 Verbinde mit Datenbank...")
        conn = psycopg2.connect(conn_string)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✅ Verbindung hergestellt!")
        print()
        print("🚀 Führe Migration aus...")
        print()
        
        # Statements einzeln ausführen für besseres Logging
        # Wir nutzen hier eine Transaction für alles
        conn.autocommit = False
        
        try:
            cursor.execute(sql)
            conn.commit()
            print("✅ Migration erfolgreich ausgeführt!")
            
        except Exception as e:
            conn.rollback()
            error_msg = str(e)
            
            if "already exists" in error_msg.lower():
                print("⚠️  Einige Objekte existieren bereits (normal bei wiederholter Ausführung)")
                
                # Versuche mit einzelnen Statements
                conn.autocommit = True
                statements = split_sql_statements(sql)
                
                success = 0
                errors = 0
                
                for i, stmt in enumerate(statements, 1):
                    stmt = stmt.strip()
                    if not stmt or stmt.startswith("--"):
                        continue
                    
                    first_line = stmt.split("\n")[0][:50]
                    
                    try:
                        cursor.execute(stmt)
                        print(f"  ✅ [{i}] {first_line}...")
                        success += 1
                    except Exception as stmt_e:
                        stmt_error = str(stmt_e)
                        if "already exists" in stmt_error.lower() or "duplicate" in stmt_error.lower():
                            print(f"  ⏭️ [{i}] {first_line}... (existiert bereits)")
                            success += 1
                        else:
                            print(f"  ❌ [{i}] {first_line}...")
                            print(f"      Error: {stmt_error[:80]}")
                            errors += 1
                
                print()
                print(f"Erfolgreich: {success}, Fehler: {errors}")
                
            else:
                print(f"❌ Migration fehlgeschlagen: {error_msg}")
                return False
        
        cursor.close()
        conn.close()
        
        print()
        print("🎉 Fertig!")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Verbindungsfehler: {e}")
        print()
        print("Mögliche Ursachen:")
        print("  - SUPABASE_DB_PASSWORD falsch")
        print("  - IP nicht in Supabase Allowlist")
        print("  - Datenbank nicht erreichbar")
        return False


def split_sql_statements(sql: str) -> list:
    """Teilt SQL in einzelne Statements auf."""
    statements = []
    current = []
    in_function = False
    in_string = False
    dollar_tag = None
    
    lines = sql.split("\n")
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines and comments (unless in function)
        if not in_function:
            if not stripped or stripped.startswith("--"):
                continue
        
        # Track function blocks ($$...$$)
        if "$$" in line:
            if dollar_tag:
                # End of function
                in_function = False
                dollar_tag = None
            else:
                # Start of function
                in_function = True
                dollar_tag = "$$"
        
        current.append(line)
        
        # Statement end (nur wenn nicht in Function)
        if not in_function and stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
    
    # Rest
    if current:
        stmt = "\n".join(current).strip()
        if stmt:
            statements.append(stmt)
    
    return statements


if __name__ == "__main__":
    print("=" * 60)
    print("  Sales Intelligence Migration (PostgreSQL)")
    print("=" * 60)
    print()
    
    success = run_migration()
    sys.exit(0 if success else 1)

