"""
Analysiert welche Migrationen noch fehlen.
"""
import psycopg2
import os
import re
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

print("=" * 70)
print("MIGRATION ANALYSE")
print("=" * 70)

# 1. Alle existierenden Tabellen
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")
existing_tables = set(row[0] for row in cursor.fetchall())
print(f"\n✅ EXISTIERENDE TABELLEN ({len(existing_tables)}):")
for t in sorted(existing_tables):
    print(f"   - {t}")

# 2. Migration-Dateien analysieren
migrations_dir = Path(__file__).parent / "migrations"
migration_files = sorted(migrations_dir.glob("*.sql"))

print(f"\n📁 MIGRATION-DATEIEN ({len(migration_files)}):")

# Kategorisiere Migrationen
deploy_files = []
numbered_files = []
dated_files = []
other_files = []

for f in migration_files:
    name = f.name
    if name.startswith("DEPLOY_") or name.startswith("FIX_") or name.startswith("ADD_") or name.startswith("IMPORT_"):
        deploy_files.append(f)
    elif re.match(r'^\d{3}_', name):
        numbered_files.append(f)
    elif re.match(r'^\d{8}_', name):
        dated_files.append(f)
    else:
        other_files.append(f)

print(f"   - Nummeriert (003-021): {len(numbered_files)}")
print(f"   - Datiert (20251xxx): {len(dated_files)}")
print(f"   - Deploy Scripts: {len(deploy_files)}")

# 3. Analysiere welche Tabellen jede Migration erstellt
print(f"\n🔍 ANALYSE WELCHE TABELLEN FEHLEN...")

missing_tables_by_migration = {}

for f in numbered_files + dated_files:
    content = f.read_text(encoding='utf-8', errors='ignore')
    
    # Finde CREATE TABLE statements
    creates = re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)', content, re.IGNORECASE)
    
    missing = [t for t in creates if t.lower() not in [x.lower() for x in existing_tables]]
    
    if missing:
        missing_tables_by_migration[f.name] = missing

print(f"\n❌ MIGRATIONEN MIT FEHLENDEN TABELLEN ({len(missing_tables_by_migration)}):")
for migration, tables in missing_tables_by_migration.items():
    print(f"\n   📄 {migration}")
    for t in tables:
        print(f"      - {t}")

# 4. Zusammenfassung
print("\n" + "=" * 70)
print("ZUSAMMENFASSUNG")
print("=" * 70)

all_missing = set()
for tables in missing_tables_by_migration.values():
    all_missing.update(tables)

print(f"\n📊 Statistik:")
print(f"   - Existierende Tabellen: {len(existing_tables)}")
print(f"   - Fehlende Tabellen: {len(all_missing)}")
print(f"   - Migrationen mit fehlenden Tabellen: {len(missing_tables_by_migration)}")

if missing_tables_by_migration:
    print(f"\n🚀 EMPFEHLUNG:")
    print(f"   Führe diese Migrationen aus (in Reihenfolge):")
    for i, migration in enumerate(sorted(missing_tables_by_migration.keys()), 1):
        print(f"   {i}. {migration}")

conn.close()

