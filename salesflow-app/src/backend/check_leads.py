"""Check leads table structure."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

# Leads Tabellen-Struktur
cursor.execute("""
    SELECT column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'leads'
    ORDER BY ordinal_position
""")
print('=== LEADS TABELLE ===')
for row in cursor.fetchall():
    col, dtype, default = row
    print(f'  {col}: {dtype}')

# Count
cursor.execute('SELECT COUNT(*) FROM leads')
count = cursor.fetchone()[0]
print(f'\nAnzahl Leads: {count}')

# Check for soft-delete columns
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'leads' 
    AND column_name IN ('deleted_at', 'is_deleted', 'is_active', 'archived', 'archived_at')
""")
soft_delete_cols = cursor.fetchall()
print(f'\nSoft-Delete Spalten: {[c[0] for c in soft_delete_cols] if soft_delete_cols else "KEINE"}')

# Check RLS
cursor.execute("""
    SELECT tablename, policyname FROM pg_policies WHERE tablename = 'leads'
""")
policies = cursor.fetchall()
print(f'\nRLS Policies: {len(policies)}')
for p in policies:
    print(f'  - {p[1]}')

conn.close()

