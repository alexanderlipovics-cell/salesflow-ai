"""Debug Migration - führt SQL Statement für Statement aus."""
import psycopg2
import os
import re
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

db_password = os.getenv('SUPABASE_DB_PASSWORD')
conn = psycopg2.connect(f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres')
conn.autocommit = True
cursor = conn.cursor()

# Read SQL file
sql_path = Path('migrations/DEPLOY_LEARNING_KNOWLEDGE.sql')
sql_content = sql_path.read_text(encoding='utf-8')

# Split into statements (respecting $$ blocks)
def split_statements(sql):
    statements = []
    current = []
    in_dollar = False
    
    for line in sql.split('\n'):
        if '$$' in line:
            count = line.count('$$')
            if count % 2 == 1:
                in_dollar = not in_dollar
        
        current.append(line)
        
        # Statement ends at ; outside $$ blocks
        stripped = line.strip()
        if stripped.endswith(';') and not in_dollar:
            stmt = '\n'.join(current).strip()
            if stmt and not stmt.startswith('--'):
                statements.append(stmt)
            current = []
    
    if current:
        stmt = '\n'.join(current).strip()
        if stmt:
            statements.append(stmt)
    
    return statements

statements = split_statements(sql_content)
print(f'📄 {len(statements)} Statements gefunden')
print()

success = 0
for i, stmt in enumerate(statements, 1):
    # Skip comments-only
    lines = [l for l in stmt.split('\n') if l.strip() and not l.strip().startswith('--')]
    if not lines:
        continue
    
    # Get first meaningful line for display
    first_line = lines[0][:80] if lines else stmt[:80]
    
    try:
        cursor.execute(stmt)
        success += 1
        if i % 20 == 0:
            print(f'  ✓ {i} Statements OK...')
    except psycopg2.Error as e:
        error_msg = str(e)
        if 'already exists' in error_msg.lower():
            # Ignore "already exists" errors
            success += 1
        else:
            print(f'❌ Statement {i} FEHLER:')
            print(f'   SQL: {first_line}...')
            print(f'   Error: {error_msg[:200]}')
            print()
            # Continue to find all errors
            continue

print()
print(f'✅ Fertig! {success} erfolgreich')
conn.close()

