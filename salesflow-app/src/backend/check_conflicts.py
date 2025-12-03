"""Check for conflicting views/tables."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

tables_to_check = [
    'live_assist_sessions', 'live_assist_queries', 'quick_facts', 'vertical_knowledge',
    'conversations', 'messages', 'chat_imports', 'xp_events',
    'pulse_outreach_messages', 'lead_behavior_profiles', 'ghost_buster_templates',
    'autopilot_settings', 'autopilot_drafts', 'autopilot_actions'
]

print("Checking for existing tables/views...\n")

cursor.execute("""
    SELECT table_name, table_type 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(%s)
    ORDER BY table_name
""", (tables_to_check,))

results = cursor.fetchall()
if results:
    print("Found existing objects:")
    for name, ttype in results:
        print(f"  {name}: {ttype}")
else:
    print("No conflicts found!")

# Check for views specifically
cursor.execute("""
    SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = ANY(%s)
""", (tables_to_check,))
views = cursor.fetchall()
if views:
    print("\nViews that need to be dropped:")
    for v in views:
        print(f"  DROP VIEW IF EXISTS {v[0]} CASCADE;")

conn.close()

