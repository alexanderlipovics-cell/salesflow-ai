"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHECK RLS POLICIES                                                        ║
║  Prüft ob die CHIEF v4.0 RLS Policies deployed sind                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Erwartete Policies aus 20251203_chief_v33_production.sql:
- tenant_quick_facts
- tenant_objection_responses
- tenant_vertical_knowledge
- tenant_live_assist_sessions
- tenant_live_assist_queries
- tenant_intent_patterns
- tenant_objection_patterns
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Required tenant policies from CHIEF v4.0
REQUIRED_POLICIES = [
    ("quick_facts", "tenant_quick_facts"),
    ("objection_responses", "tenant_objection_responses"),
    ("vertical_knowledge", "tenant_vertical_knowledge"),
    ("live_assist_sessions", "tenant_live_assist_sessions"),
    ("live_assist_queries", "tenant_live_assist_queries"),
    ("intent_learning_patterns", "tenant_intent_patterns"),
    ("objection_learning_patterns", "tenant_objection_patterns"),
]


def check_rls_policies():
    """Prüft alle RLS Policies."""
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    
    if not db_password:
        print("❌ SUPABASE_DB_PASSWORD nicht gesetzt!")
        return False
    
    try:
        conn = psycopg2.connect(
            f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres'
        )
        cursor = conn.cursor()
        
        print("=" * 70)
        print("CHIEF v4.0 RLS POLICIES STATUS CHECK")
        print("=" * 70)
        
        # 1. Check if RLS is enabled on tables
        print("\n📋 RLS Aktivierung auf Tabellen:")
        cursor.execute("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN (
                'quick_facts', 'objection_responses', 'vertical_knowledge',
                'live_assist_sessions', 'live_assist_queries',
                'intent_learning_patterns', 'objection_learning_patterns'
            )
            ORDER BY tablename
        """)
        
        tables_with_rls = {}
        for table, rls_enabled in cursor.fetchall():
            status = "✅" if rls_enabled else "❌"
            tables_with_rls[table] = rls_enabled
            print(f"  {status} {table}: RLS {'aktiviert' if rls_enabled else 'NICHT aktiviert'}")
        
        # 2. Check existing policies
        print("\n📋 Existierende RLS Policies:")
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname
        """)
        
        existing_policies = {}
        for schema, table, policy, permissive, roles, cmd, qual in cursor.fetchall():
            if table not in existing_policies:
                existing_policies[table] = []
            existing_policies[table].append({
                "name": policy,
                "permissive": permissive,
                "roles": roles,
                "cmd": cmd,
            })
        
        # Print existing policies
        for table, policies in sorted(existing_policies.items()):
            print(f"\n  📁 {table}:")
            for p in policies:
                print(f"      • {p['name']} ({p['cmd']}) → {p['roles']}")
        
        # 3. Check required CHIEF v4.0 policies
        print("\n" + "=" * 70)
        print("CHIEF v4.0 REQUIRED POLICIES CHECK")
        print("=" * 70)
        
        all_ok = True
        missing_policies = []
        
        for table, required_policy in REQUIRED_POLICIES:
            table_policies = existing_policies.get(table, [])
            policy_names = [p["name"] for p in table_policies]
            
            if required_policy in policy_names:
                print(f"  ✅ {required_policy} on {table}")
            else:
                print(f"  ❌ {required_policy} on {table} - FEHLT!")
                missing_policies.append((table, required_policy))
                all_ok = False
        
        # 4. Summary
        print("\n" + "=" * 70)
        print("ZUSAMMENFASSUNG")
        print("=" * 70)
        
        if all_ok:
            print("\n🎉 ALLE CHIEF v4.0 RLS POLICIES SIND DEPLOYED!")
        else:
            print(f"\n⚠️  {len(missing_policies)} POLICIES FEHLEN:")
            for table, policy in missing_policies:
                print(f"   - {policy} auf {table}")
            print("\n📝 Zum Deployen ausführen:")
            print("   python run_migration.py 20251203_chief_v33_production.sql")
        
        conn.close()
        return all_ok
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False


def check_performance_indexes():
    """Prüft Performance-Indexes."""
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    
    try:
        conn = psycopg2.connect(
            f'postgresql://postgres:{db_password}@db.lncwvbhcafkdorypnpnz.supabase.co:5432/postgres'
        )
        cursor = conn.cursor()
        
        print("\n" + "=" * 70)
        print("PERFORMANCE INDEXES CHECK")
        print("=" * 70)
        
        # Check for response_time_ms index
        cursor.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'live_assist_queries'
            ORDER BY indexname
        """)
        
        indexes = cursor.fetchall()
        print(f"\n📊 Indexes auf live_assist_queries ({len(indexes)}):")
        
        has_response_time_idx = False
        for name, definition in indexes:
            print(f"  • {name}")
            if 'response_time' in name.lower():
                has_response_time_idx = True
        
        if has_response_time_idx:
            print("\n  ✅ Performance-Index für response_time_ms vorhanden")
        else:
            print("\n  ⚠️  Kein Index für response_time_ms gefunden")
            print("      → Kann Performance bei Analytics beeinträchtigen")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Fehler: {e}")


if __name__ == "__main__":
    check_rls_policies()
    check_performance_indexes()

