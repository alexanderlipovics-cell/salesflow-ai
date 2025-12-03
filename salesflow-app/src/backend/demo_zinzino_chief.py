"""
Demo: Wie CHIEF das Zinzino-Wissen nutzt
"""

import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

# Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
db = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_zinzino_knowledge(query_topic: str = None):
    """Holt Zinzino-Wissen aus der DB"""
    
    # Zinzino Company ID holen
    company = db.table("companies").select("id, name").eq("slug", "zinzino").execute()
    if not company.data:
        return None
    
    company_id = company.data[0]["id"]
    print(f"\n🏢 Company: {company.data[0]['name']} (ID: {company_id[:8]}...)")
    
    # Knowledge Items abrufen
    query = db.table("knowledge_items").select("*").eq("company_id", company_id)
    
    if query_topic:
        query = query.ilike("content", f"%{query_topic}%")
    
    items = query.limit(10).execute()
    
    return items.data


def get_zinzino_mode_prompt():
    """Holt den CHIEF Zinzino-Mode Prompt"""
    
    company = db.table("companies").select("id").eq("slug", "zinzino").execute()
    if not company.data:
        return None
    
    company_id = company.data[0]["id"]
    
    template = db.table("templates").select("content").eq(
        "company_id", company_id
    ).eq("name", "Zinzino Mode Prompt").execute()
    
    if template.data:
        return template.data[0]["content"]
    return None


def demo_knowledge_lookup():
    """Demonstriert die Knowledge-Abfrage für verschiedene Themen"""
    
    print("=" * 70)
    print("🔬 DEMO: Zinzino-Wissen in CHIEF")
    print("=" * 70)
    
    # ─────────────────────────────────────────────────────────────────────
    # 1. ZINZINO-MODE PROMPT
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("📋 ZINZINO-MODE PROMPT (für System-Prompt):")
    print("─" * 70)
    
    mode_prompt = get_zinzino_mode_prompt()
    if mode_prompt:
        # Zeige erste 800 Zeichen
        print(mode_prompt[:800] + "..." if len(mode_prompt) > 800 else mode_prompt)
    else:
        print("❌ Kein Mode-Prompt gefunden")
    
    # ─────────────────────────────────────────────────────────────────────
    # 2. ALLE KNOWLEDGE ITEMS
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("📚 ALLE ZINZINO KNOWLEDGE-ITEMS:")
    print("─" * 70)
    
    all_items = get_zinzino_knowledge()
    if all_items:
        for item in all_items:
            print(f"\n  📄 [{item['type']}] {item['title']}")
            print(f"     Topic: {item.get('topic', '-')}")
            if item.get('content_short'):
                print(f"     → {item['content_short'][:100]}...")
    else:
        print("❌ Keine Items gefunden")
    
    # ─────────────────────────────────────────────────────────────────────
    # 3. THEMEN-SPEZIFISCHE SUCHE
    # ─────────────────────────────────────────────────────────────────────
    test_queries = [
        "BalanceTest",
        "Omega-3",
        "Einwand",
        "Business"
    ]
    
    for query in test_queries:
        print("\n" + "─" * 70)
        print(f"🔍 SUCHE: '{query}'")
        print("─" * 70)
        
        results = get_zinzino_knowledge(query)
        if results:
            for r in results[:3]:
                print(f"\n  ✅ [{r['type']}] {r['title']}")
                # Zeige relevanten Ausschnitt
                content = r.get('content', '')
                if query.lower() in content.lower():
                    idx = content.lower().find(query.lower())
                    start = max(0, idx - 50)
                    end = min(len(content), idx + 150)
                    snippet = content[start:end]
                    print(f"     ...{snippet}...")
        else:
            print("  ❌ Keine Treffer")
    
    # ─────────────────────────────────────────────────────────────────────
    # 4. SIMULIERTER CHIEF-KONTEXT
    # ─────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("🤖 SIMULIERTER CHIEF-KONTEXT FÜR ANFRAGE:")
    print("   'Wie erkläre ich den BalanceTest einem skeptischen Kunden?'")
    print("=" * 70)
    
    # Sammle relevantes Wissen
    context_parts = []
    
    # Mode Prompt
    if mode_prompt:
        context_parts.append(f"[SYSTEM COMPLIANCE]\n{mode_prompt[:500]}...")
    
    # Relevante Knowledge Items
    test_items = get_zinzino_knowledge("Test")
    skeptic_items = get_zinzino_knowledge("skeptisch") or get_zinzino_knowledge("Einwand")
    
    if test_items:
        context_parts.append(f"\n[PRODUKT-WISSEN: BalanceTest]\n{test_items[0].get('content', '')[:400]}...")
    
    if skeptic_items:
        context_parts.append(f"\n[EINWANDBEHANDLUNG]\n{skeptic_items[0].get('content', '')[:400]}...")
    
    print("\n📦 Kontext, der CHIEF erhält:")
    print("-" * 50)
    for part in context_parts:
        print(part)
    
    print("\n" + "=" * 70)
    print("✅ DEMO COMPLETE")
    print("=" * 70)
    print("""
FAZIT:
- CHIEF hat Zugriff auf alle Zinzino-spezifischen Texte
- Der Mode-Prompt setzt Compliance-Regeln
- Knowledge-Items können nach Themen gefiltert werden
- Bei Anfragen wird relevantes Wissen automatisch eingebunden
""")


if __name__ == "__main__":
    demo_knowledge_lookup()

