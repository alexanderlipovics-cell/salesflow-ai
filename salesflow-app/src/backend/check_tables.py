"""Check existing tables and columns."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

# Check companies table structure
print("\n=== COMPANIES TABLE ===")
cursor.execute("""
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'companies' 
    ORDER BY ordinal_position
""")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

# Check if quick_facts exists
print("\n=== TABLE EXISTENCE ===")
tables = ['quick_facts', 'objection_responses', 'vertical_knowledge', 
          'live_assist_sessions', 'live_assist_queries', 'company_users']
for table in tables:
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table}'
        )
    """)
    exists = cursor.fetchone()[0]
    status = "YES" if exists else "NO"
    print(f"  {table}: {status}")

conn.close()
