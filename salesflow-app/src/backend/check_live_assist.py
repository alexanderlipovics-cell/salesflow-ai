"""Check Live Assist schema status."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

print('Live Assist Data Status:')
print('=' * 60)

# Count records in each table
tables = ['quick_facts', 'objection_responses', 'vertical_knowledge', 
          'live_assist_sessions', 'live_assist_queries']

for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f'  {table}: {count} Einträge')
    except Exception as e:
        print(f'  {table}: ERROR - {e}')

# Show sample quick facts
print('\n' + '=' * 60)
print('Sample Quick Facts:')
cursor.execute("SELECT fact_key, fact_short FROM quick_facts LIMIT 5")
for row in cursor.fetchall():
    print(f'  • {row[0]}: {row[1]}')

# Show sample objection responses
print('\nSample Objection Responses:')
cursor.execute("SELECT objection_type, response_short FROM objection_responses WHERE objection_type IS NOT NULL LIMIT 5")
for row in cursor.fetchall():
    print(f'  • {row[0]}: {row[1][:60]}...')

conn.close()
print('\n✅ Check abgeschlossen')

