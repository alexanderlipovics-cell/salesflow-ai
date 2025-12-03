"""Check columns of Live Assist tables."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

tables = ['quick_facts', 'objection_responses', 'live_assist_sessions', 'live_assist_queries']

for table in tables:
    print(f"\n=== {table.upper()} ===")
    cursor.execute(f"""
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = '{table}' 
        ORDER BY ordinal_position
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

# Check RLS status
print("\n=== RLS STATUS ===")
cursor.execute("""
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname IN ('quick_facts', 'objection_responses', 'live_assist_sessions', 'live_assist_queries')
""")
for row in cursor.fetchall():
    status = "ENABLED" if row[1] else "DISABLED"
    print(f"  {row[0]}: {status}")

# Check existing policies
print("\n=== EXISTING POLICIES ===")
cursor.execute("""
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
print("\n=== DONE ===")

