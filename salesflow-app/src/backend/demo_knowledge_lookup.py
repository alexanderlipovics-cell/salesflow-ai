"""Demo: Wie CHIEF Knowledge abruft"""
from dotenv import load_dotenv
load_dotenv()
import os
from supabase import create_client

db = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

# Teste verschiedene Anfragen
queries = [
    ("BalanceTest", "Zinzino"),
    ("Activize", "PM-International"),
    ("Aloe Vera", "LR Health"),
    ("Lavendel", "doTERRA"),
]

print("=" * 70)
print("🧠 CHIEF KNOWLEDGE LOOKUP DEMO")
print("=" * 70)

for query, expected_company in queries:
    print(f"\n📝 Query: \"{query}\" (erwartet: {expected_company})")
    print("-" * 50)
    
    result = db.table('knowledge_items').select(
        'title, type, content_short'
    ).or_(
        f'title.ilike.%{query}%,content.ilike.%{query}%'
    ).eq('is_active', True).limit(2).execute()
    
    if result.data:
        for item in result.data:
            print(f"  ✅ {item['title']}")
            print(f"     Type: {item['type']}")
            if item.get('content_short'):
                short = item['content_short'][:80] + "..." if len(item.get('content_short', '')) > 80 else item.get('content_short', '')
                print(f"     → {short}")
    else:
        print("  ❌ Nichts gefunden")

print("\n" + "=" * 70)
print("✅ CHIEF kann dieses Wissen jetzt in Antworten verwenden!")
print("=" * 70)

