"""Check Onboarding Database Setup"""
import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2

PROJECT_REF = "lncwvbhcafkdorypnpnz"
db_password = os.getenv('SUPABASE_DB_PASSWORD')

print("Connecting to database...")
conn = psycopg2.connect(
    f'postgresql://postgres:{db_password}@db.{PROJECT_REF}.supabase.co:5432/postgres'
)
cur = conn.cursor()

# 1. Prüfe profiles Spalten
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles'
    ORDER BY column_name
""")
print("\n=== PROFILES COLUMNS ===")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

# 2. Prüfe ob companies Tabelle existiert und Zinzino drin ist
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
""")
has_companies = cur.fetchone()
print(f"\n=== COMPANIES TABLE: {'EXISTS' if has_companies else 'MISSING!'} ===")

if has_companies:
    cur.execute("SELECT id, slug, name FROM companies WHERE slug = 'zinzino' OR name ILIKE '%zinzino%'")
    zinzino = cur.fetchall()
    print(f"Zinzino entry: {zinzino if zinzino else 'NOT FOUND!'}")
    
    cur.execute("SELECT slug, name FROM companies LIMIT 10")
    print("\nAll companies:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

# 3. Prüfe Profile Daten
cur.execute("SELECT id, first_name, company_id, company_slug FROM profiles LIMIT 10")
print("\n=== PROFILE DATA ===")
for row in cur.fetchall():
    print(f"  ID: {row[0][:8]}... | Name: {row[1]} | company_id: {row[2]} | company_slug: {row[3]}")

# Info: Profile wurde manuell aktualisiert, hier keine Änderungen mehr

cur.close()
conn.close()
print("\nDone!")

