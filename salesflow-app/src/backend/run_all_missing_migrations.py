"""
Führt alle fehlenden Migrationen aus.
"""
import psycopg2
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

# Migrationen die ausgeführt werden müssen (in Reihenfolge)
MIGRATIONS_TO_RUN = [
    "006_auto_reminder_system.sql",
    "007_coaching_prompts.sql",
    "010_finance_system.sql",
    "010_personality_contact_plans.sql",
    "011_compensation_plans.sql",
    # "011_compensation_plans_v2.sql",  # Skip - duplicate of above
    "012_activity_tracking.sql",
    "013_vertical_system.sql",
    # "015_knowledge_system.sql",  # Already partially done via DEPLOY_LEARNING_KNOWLEDGE
    "020_finance_tax_prep_extended.sql",
    "021_chat_import_deal_states.sql",
    "20251202_outreach_tracker.sql",
    "20251203_chief_v33_production.sql",
    "20251203_sales_brain.sql",
    "20251203_sales_brain_v2.sql",
    "20251205_living_os.sql",
    "20251206_brand_storybook.sql",
    "20251206_storybook_analytics.sql",
    "20251207_chat_import_system.sql",
    "20251208_live_assist.sql",
    "20251209_autopilot_system.sql",
    "20251209_pulse_tracker_v2.sql",
    "20251210_pulse_tracker_v2_1.sql",
    "20251210_sales_intelligence_v3.sql",
]

def run_migrations():
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
    conn.autocommit = True
    cursor = conn.cursor()
    
    migrations_dir = Path(__file__).parent / "migrations"
    
    print("=" * 70)
    print("FÜHRE ALLE FEHLENDEN MIGRATIONEN AUS")
    print("=" * 70)
    print(f"\n📋 {len(MIGRATIONS_TO_RUN)} Migrationen zu verarbeiten\n")
    
    # Erstelle Tracking-Tabelle
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMPTZ DEFAULT NOW(),
            success BOOLEAN DEFAULT true,
            error_message TEXT
        )
    """)
    print("✅ Migrations-Tracking-Tabelle erstellt\n")
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    for i, migration_name in enumerate(MIGRATIONS_TO_RUN, 1):
        migration_path = migrations_dir / migration_name
        
        # Check if already executed
        cursor.execute("SELECT 1 FROM _migrations WHERE name = %s AND success = true", (migration_name,))
        if cursor.fetchone():
            print(f"⏭️  [{i}/{len(MIGRATIONS_TO_RUN)}] {migration_name} - BEREITS AUSGEFÜHRT")
            skipped_count += 1
            continue
        
        if not migration_path.exists():
            print(f"❌ [{i}/{len(MIGRATIONS_TO_RUN)}] {migration_name} - DATEI NICHT GEFUNDEN")
            error_count += 1
            continue
        
        print(f"🔄 [{i}/{len(MIGRATIONS_TO_RUN)}] {migration_name}...", end=" ", flush=True)
        
        try:
            sql_content = migration_path.read_text(encoding='utf-8')
            cursor.execute(sql_content)
            
            # Log success
            cursor.execute(
                "INSERT INTO _migrations (name, success) VALUES (%s, true) ON CONFLICT (name) DO UPDATE SET executed_at = NOW(), success = true",
                (migration_name,)
            )
            
            print("✅")
            success_count += 1
            
        except psycopg2.Error as e:
            error_msg = str(e)[:500]
            
            # Log error
            cursor.execute(
                "INSERT INTO _migrations (name, success, error_message) VALUES (%s, false, %s) ON CONFLICT (name) DO UPDATE SET executed_at = NOW(), success = false, error_message = %s",
                (migration_name, error_msg, error_msg)
            )
            
            # Check if it's just "already exists" errors
            if "already exists" in error_msg.lower():
                print("⚠️  (teilweise bereits vorhanden)")
                success_count += 1
            else:
                print(f"❌ FEHLER")
                print(f"   → {error_msg[:200]}")
                error_count += 1
    
    conn.close()
    
    print("\n" + "=" * 70)
    print("ERGEBNIS")
    print("=" * 70)
    print(f"\n✅ Erfolgreich: {success_count}")
    print(f"⏭️  Übersprungen: {skipped_count}")
    print(f"❌ Fehler: {error_count}")
    print(f"\n📊 Gesamt: {success_count + skipped_count + error_count}/{len(MIGRATIONS_TO_RUN)}")
    
    if error_count == 0:
        print("\n🎉 ALLE MIGRATIONEN ERFOLGREICH!")
    else:
        print(f"\n⚠️  {error_count} Migrationen hatten Fehler - prüfe die Logs.")

if __name__ == "__main__":
    run_migrations()

