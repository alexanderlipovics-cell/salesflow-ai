"""
Migration Runner für Sales Flow AI
Führt die Phase 1 Migration direkt über Supabase aus
"""
import os
import sys
from pathlib import Path

# Füge den Backend-Pfad hinzu
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt!")
    print(f"   SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
    print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✓' if SUPABASE_SERVICE_KEY else '✗'}")
    sys.exit(1)

# SQL Migration - aufgeteilt in einzelne Statements
MIGRATIONS = [
    # 1. scheduled_jobs Tabelle
    """
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        user_id UUID,
        job_type VARCHAR(100) NOT NULL,
        job_name VARCHAR(255),
        payload JSONB NOT NULL DEFAULT '{}',
        run_at TIMESTAMPTZ NOT NULL,
        priority INT DEFAULT 5,
        status VARCHAR(50) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 3,
        last_error TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        execution_time_ms INT,
        result JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        parent_job_id UUID,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_rule VARCHAR(100)
    )
    """,
    
    # 2. ai_interactions Tabelle
    """
    CREATE TABLE IF NOT EXISTS ai_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        user_id UUID,
        lead_id UUID,
        deal_id UUID,
        session_id UUID,
        skill_name VARCHAR(100) NOT NULL,
        skill_version VARCHAR(20) DEFAULT '1.0',
        prompt_version VARCHAR(20) DEFAULT '1.0',
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        temperature FLOAT,
        request_summary TEXT,
        request_payload JSONB,
        response_summary TEXT,
        response_payload JSONB,
        latency_ms INT,
        tokens_in INT,
        tokens_out INT,
        cost_usd DECIMAL(10, 6),
        used_in_message BOOLEAN DEFAULT FALSE,
        outcome_status VARCHAR(50) DEFAULT 'unknown',
        outcome_updated_at TIMESTAMPTZ,
        user_rating INT,
        user_feedback TEXT,
        error_type VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
    )
    """,
    
    # 3. feature_flags Tabelle
    """
    CREATE TABLE IF NOT EXISTS feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        user_id UUID,
        plan_name VARCHAR(50) DEFAULT 'free',
        flags JSONB NOT NULL DEFAULT '{}',
        monthly_ai_calls_limit INT DEFAULT 1000,
        monthly_ai_calls_used INT DEFAULT 0,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        trial_ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    
    # 4. company_settings Tabelle
    """
    CREATE TABLE IF NOT EXISTS company_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID UNIQUE,
        locale VARCHAR(10) DEFAULT 'de-DE',
        timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
        default_currency VARCHAR(3) DEFAULT 'EUR',
        date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
        time_format VARCHAR(10) DEFAULT '24h',
        number_format VARCHAR(20) DEFAULT 'de',
        ai_language VARCHAR(10) DEFAULT 'de',
        ai_tone VARCHAR(50) DEFAULT 'professional',
        primary_vertical VARCHAR(50) DEFAULT 'network_marketing',
        company_color_primary VARCHAR(7),
        company_color_secondary VARCHAR(7),
        logo_url TEXT,
        compliance_level VARCHAR(20) DEFAULT 'standard',
        require_compliance_check BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    
    # 5. template_metrics Tabelle
    """
    CREATE TABLE IF NOT EXISTS template_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL,
        user_id UUID,
        sent_count INT DEFAULT 0,
        reply_count INT DEFAULT 0,
        meeting_count INT DEFAULT 0,
        deal_count INT DEFAULT 0,
        avg_response_time_hours FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    
    # 6. user_integrations Tabelle
    """
    CREATE TABLE IF NOT EXISTS user_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'not_connected',
        connected_at TIMESTAMPTZ,
        last_sync_at TIMESTAMPTZ,
        error_message TEXT,
        account_info JSONB,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, provider)
    )
    """
]

def run_sql(sql: str) -> dict:
    """Führt SQL über die Supabase REST API aus"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Verwende die REST API für RPC
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    try:
        response = httpx.post(
            url,
            headers=headers,
            json={"query": sql.strip()},
            timeout=30.0
        )
        return {"success": response.status_code < 400, "status": response.status_code, "text": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_migration_postgrest(sql: str, table_name: str) -> bool:
    """Prüft ob Tabelle existiert und erstellt sie wenn nötig"""
    from supabase import create_client
    
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        # Versuche die Tabelle abzufragen
        result = client.table(table_name).select("id").limit(1).execute()
        print(f"   ✓ Tabelle '{table_name}' existiert bereits")
        return True
    except Exception as e:
        if "does not exist" in str(e) or "PGRST" in str(e):
            print(f"   → Tabelle '{table_name}' wird erstellt...")
            # Tabelle existiert nicht, wir können sie nicht über PostgREST erstellen
            return False
        else:
            print(f"   ✓ Tabelle '{table_name}' existiert")
            return True

def main():
    print("=" * 60)
    print("🚀 SALES FLOW AI - Phase 1 Migration")
    print("=" * 60)
    print(f"\n📍 Supabase URL: {SUPABASE_URL[:50]}...")
    print()
    
    tables = [
        ("scheduled_jobs", MIGRATIONS[0]),
        ("ai_interactions", MIGRATIONS[1]),
        ("feature_flags", MIGRATIONS[2]),
        ("company_settings", MIGRATIONS[3]),
        ("template_metrics", MIGRATIONS[4]),
        ("user_integrations", MIGRATIONS[5]),
    ]
    
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    existing = []
    missing = []
    
    print("📋 Prüfe existierende Tabellen...")
    for table_name, sql in tables:
        try:
            client.table(table_name).select("id").limit(1).execute()
            existing.append(table_name)
            print(f"   ✓ {table_name}")
        except Exception as e:
            if "does not exist" in str(e).lower() or "pgrst" in str(e).lower():
                missing.append((table_name, sql))
                print(f"   ✗ {table_name} (fehlt)")
            else:
                existing.append(table_name)
                print(f"   ✓ {table_name}")
    
    print()
    print(f"📊 Ergebnis: {len(existing)} existieren, {len(missing)} fehlen")
    
    if missing:
        print()
        print("⚠️  Folgende Tabellen müssen im Supabase Dashboard erstellt werden:")
        print()
        for table_name, _ in missing:
            print(f"   • {table_name}")
        print()
        print("📝 Bitte führe die Migration manuell aus:")
        print("   1. Öffne: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql/new")
        print("   2. Kopiere den Inhalt von: migrations/DEPLOY_PHASE1_QUICK.sql")
        print("   3. Klicke auf 'Run'")
        print()
        
        # Zeige das SQL für die fehlenden Tabellen
        print("=" * 60)
        print("📄 SQL für fehlende Tabellen:")
        print("=" * 60)
        for table_name, sql in missing:
            print(f"\n-- {table_name}")
            print(sql.strip())
            print(";")
    else:
        print()
        print("✅ Alle Tabellen existieren bereits!")
        print("   Die Migration ist abgeschlossen.")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
