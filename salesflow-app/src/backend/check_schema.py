"""Check existing database schema."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

# Check ALL tables
cursor.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
""")
print('ALLE Public Tabellen:')
for row in cursor.fetchall():
    print(f'  - {row[0]}')

# Check sequences table specifically
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'sequences' 
    ORDER BY ordinal_position
""")
cols = cursor.fetchall()
if cols:
    print('\n✅ sequences Spalten:')
    for row in cols:
        print(f'  - {row[0]}')
else:
    print('\n❌ sequences existiert NICHT')

# Check knowledge_items columns if exists
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'knowledge_items' 
    ORDER BY ordinal_position
""")
cols = cursor.fetchall()
if cols:
    print('\nknowledge_items Spalten:')
    for row in cols:
        print(f'  - {row[0]}')
else:
    print('\nknowledge_items existiert NICHT')

# Check templates columns if exists
cursor.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'templates' 
    ORDER BY ordinal_position
""")
cols = cursor.fetchall()
if cols:
    print('\ntemplates Spalten:')
    for row in cols:
        print(f'  - {row[0]}')
else:
    print('\ntemplates existiert NICHT')

conn.close()

