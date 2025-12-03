"""
Migration Runner für Reactivation Agent
Erstellt die Tabellen für den LangGraph-basierten Reactivation Agent
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt!")
    sys.exit(1)

# Reactivation Agent Migrations
MIGRATIONS = [
    # 1. reactivation_runs Tabelle
    ("reactivation_runs", """
    CREATE TABLE IF NOT EXISTS reactivation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        lead_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'started',
        signals_found INTEGER DEFAULT 0,
        primary_signal JSONB,
        confidence_score DECIMAL(3,2),
        action_taken VARCHAR(50),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        error_message TEXT,
        execution_time_ms INTEGER,
        final_state JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """),
    
    # 2. reactivation_drafts Tabelle (Review Queue)
    ("reactivation_drafts", """
    CREATE TABLE IF NOT EXISTS reactivation_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        lead_id UUID NOT NULL,
        run_id UUID NOT NULL,
        draft_message TEXT NOT NULL,
        suggested_channel VARCHAR(50) NOT NULL,
        signals JSONB NOT NULL DEFAULT '[]',
        lead_context JSONB NOT NULL DEFAULT '{}',
        confidence_score DECIMAL(3,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewed_at TIMESTAMPTZ,
        reviewer_notes TEXT,
        edited_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
    )
    """),
    
    # 3. signal_events Tabelle
    ("signal_events", """
    CREATE TABLE IF NOT EXISTS signal_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL,
        user_id UUID NOT NULL,
        signal_type VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT,
        relevance_score DECIMAL(3,2) NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMPTZ,
        run_id UUID,
        raw_data JSONB,
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """),
    
    # 4. lead_interactions_embeddings Tabelle (Vector Store)
    ("lead_interactions_embeddings", """
    CREATE TABLE IF NOT EXISTS lead_interactions_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL,
        user_id UUID NOT NULL,
        interaction_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        embedding vector(1536),
        channel VARCHAR(50),
        sentiment VARCHAR(20),
        topics TEXT[],
        interaction_date TIMESTAMPTZ NOT NULL,
        indexed_at TIMESTAMPTZ DEFAULT NOW()
    )
    """),
    
    # 5. reactivation_queue Tabelle (für Batch-Jobs)
    ("reactivation_queue", """
    CREATE TABLE IF NOT EXISTS reactivation_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL,
        user_id UUID NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """),
]

def main():
    print("=" * 60)
    print("🔄 REACTIVATION AGENT - Migration")
    print("=" * 60)
    print(f"\n📍 Supabase URL: {SUPABASE_URL[:50]}...")
    print()
    
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    existing = []
    missing = []
    
    print("📋 Prüfe Reactivation-Agent Tabellen...")
    for table_name, sql in MIGRATIONS:
        try:
            client.table(table_name).select("id").limit(1).execute()
            existing.append(table_name)
            print(f"   ✓ {table_name}")
        except Exception as e:
            error_str = str(e).lower()
            if "does not exist" in error_str or "pgrst" in error_str or "relation" in error_str:
                missing.append((table_name, sql))
                print(f"   ✗ {table_name} (fehlt)")
            else:
                existing.append(table_name)
                print(f"   ✓ {table_name}")
    
    print()
    print(f"📊 Ergebnis: {len(existing)} existieren, {len(missing)} fehlen")
    
    if missing:
        print()
        print("=" * 60)
        print("📝 SQL für fehlende Tabellen (kopiere ins Supabase Dashboard):")
        print("   https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql/new")
        print("=" * 60)
        
        # Erst pgvector Extension
        print("\n-- 0. pgvector Extension (für Embeddings)")
        print("CREATE EXTENSION IF NOT EXISTS vector;")
        
        for table_name, sql in missing:
            print(f"\n-- {table_name}")
            print(sql.strip())
            print(";")
        
        # Indexes
        print("\n-- Indexes")
        print("""
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_user ON reactivation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_lead ON reactivation_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_status ON reactivation_runs(status);
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON reactivation_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_signals_lead ON signal_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signal_events(signal_type);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON lead_interactions_embeddings(lead_id);
        """)
        
        # RLS Policies
        print("\n-- RLS Policies")
        print("""
ALTER TABLE reactivation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own runs" ON reactivation_runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own drafts" ON reactivation_drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own signals" ON signal_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own embeddings" ON lead_interactions_embeddings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own queue" ON reactivation_queue FOR ALL USING (auth.uid() = user_id);
        """)
        
        # Vector Search Function
        print("\n-- Vector Search Function")
        print("""
CREATE OR REPLACE FUNCTION match_lead_interactions(
    query_embedding vector(1536),
    match_lead_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    interaction_type VARCHAR(50),
    interaction_date TIMESTAMPTZ,
    similarity FLOAT,
    sentiment VARCHAR(20),
    topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.content,
        e.summary,
        e.interaction_type,
        e.interaction_date,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.sentiment,
        e.topics
    FROM lead_interactions_embeddings e
    WHERE 
        e.lead_id = match_lead_id
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
        """)
    else:
        print()
        print("✅ Alle Reactivation-Agent Tabellen existieren bereits!")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()

