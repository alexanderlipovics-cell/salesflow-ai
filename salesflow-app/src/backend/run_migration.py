"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MIGRATION RUNNER v2                                                       ║
║  Führt SQL-Migrationen direkt gegen Supabase aus                          ║
║  Nutzt direkte PostgreSQL-Verbindung für volle Kontrolle                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    python run_migration.py migrations/DEPLOY_LEARNING_KNOWLEDGE.sql
    python run_migration.py migrations/20251209_pulse_tracker_v2.sql
"""

import sys
import os
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings


# Supabase Project Info
PROJECT_REF = "lncwvbhcafkdorypnpnz"


def get_database_url() -> str:
    """Baut die Database URL aus Supabase Credentials."""
    
    # Versuche DATABASE_URL aus .env
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    
    # Versuche DB_PASSWORD aus .env oder settings
    db_password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("DB_PASSWORD") or settings.SUPABASE_DB_PASSWORD
    if db_password:
        # Direkte Supabase DB-Verbindung (nicht Pooler)
        return f"postgresql://postgres:{db_password}@db.{PROJECT_REF}.supabase.co:5432/postgres"
    
    return ""


def run_migration(sql_file: str) -> bool:
    """Führt eine SQL-Migration gegen Supabase aus."""
    
    # Read SQL file
    sql_path = Path(sql_file)
    if not sql_path.exists():
        # Try relative to migrations folder
        sql_path = Path(__file__).parent / "migrations" / sql_file
    
    if not sql_path.exists():
        print(f"[ERROR] SQL-Datei nicht gefunden: {sql_file}")
        return False
    
    sql_content = sql_path.read_text(encoding="utf-8")
    print(f"[MIGRATION] Lade: {sql_path.name}")
    print(f"   Groesse: {len(sql_content):,} Zeichen")
    
    # Get Database URL
    db_url = get_database_url()
    
    if not db_url:
        print("")
        print("❌ Keine Datenbank-Verbindung konfiguriert!")
        print("")
        print("So richtest du es ein:")
        print("1. Öffne: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/settings/database")
        print("2. Scrolle zu 'Connection string' → 'URI'")
        print("3. Kopiere das Passwort (oder setze ein neues)")
        print("4. Füge in backend/.env ein:")
        print("   SUPABASE_DB_PASSWORD=dein_passwort_hier")
        print("")
        print("Alternativ die komplette URL:")
        print("   DATABASE_URL=postgresql://postgres.lncwvbhcafkdorypnpnz:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")
        print("")
        return False
    
    print("[DB] Verbinde mit Datenbank...")
    
    try:
        import psycopg2
    except ImportError:
        print("[ERROR] psycopg2 nicht installiert!")
        print("   Installiere mit: pip install psycopg2-binary")
        return False
    
    try:
        # Verbindung herstellen
        conn = psycopg2.connect(db_url)
        conn.autocommit = True  # Fuer DDL Statements
        cursor = conn.cursor()
        
        print("[OK] Verbunden!")
        print("")
        print("[RUN] Fuehre Migration aus...")
        
        # Fuehre das gesamte SQL aus
        cursor.execute(sql_content)
        
        print("")
        print("[SUCCESS] Migration erfolgreich ausgefuehrt!")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"[ERROR] Datenbank-Fehler: {e}")
        
        # Spezifische Fehlerbehandlung
        error_msg = str(e).lower()
        if "already exists" in error_msg:
            print("")
            print("[INFO] Einige Objekte existieren bereits - das ist normal bei Re-Runs.")
            return True
        elif "permission denied" in error_msg:
            print("")
            print("[ERROR] Keine Berechtigung! Pruefe ob das Passwort korrekt ist.")
        elif "password authentication failed" in error_msg:
            print("")
            print("[ERROR] Falsches Passwort! Pruefe SUPABASE_DB_PASSWORD in .env")
        
        return False
        
    except Exception as e:
        print(f"[ERROR] Unerwarteter Fehler: {e}")
        return False


def main():
    """CLI Entry Point."""
    
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <sql_file>")
        print("")
        print("Beispiele:")
        print("  python run_migration.py DEPLOY_LEARNING_KNOWLEDGE.sql")
        print("  python run_migration.py migrations/20251209_pulse_tracker_v2.sql")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    success = run_migration(sql_file)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

