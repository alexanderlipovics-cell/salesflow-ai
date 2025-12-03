"""Check sequencer tables."""
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
cursor = conn.cursor()

tables = [
    'sequences',
    'sequence_steps', 
    'sequence_enrollments', 
    'sequence_actions',
    'sequence_action_queue',
    'email_accounts', 
    'email_templates',
    'email_tracking_events',
    'sequence_daily_stats'
]

for tbl in tables:
    cursor.execute(f"""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = %s ORDER BY ordinal_position
    """, (tbl,))
    cols = [r[0] for r in cursor.fetchall()]
    has_user_id = 'user_id' in cols
    has_status = 'status' in cols
    print(f'{tbl}:')
    print(f'  user_id: {"✅" if has_user_id else "❌"}')
    print(f'  status: {"✅" if has_status else "❌"}')
    print(f'  columns: {cols[:8]}...' if len(cols) > 8 else f'  columns: {cols}')
    print()

conn.close()

