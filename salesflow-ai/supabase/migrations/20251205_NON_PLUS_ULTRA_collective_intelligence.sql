-- ============================================================================
-- NON PLUS ULTRA: COLLABORATIVE INTELLIGENCE SYSTEM
-- ============================================================================
-- Version: 1.0.0
-- Purpose: 4-Ebenen-Architektur für kollektives Lernen mit Datenschutz
--
-- ARCHITEKTUR:
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Ebene 4: BEREITSTELLUNG (RAG + Inferenz + Styling)                     │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Ebene 3: GLOBALES MODELL (W_Global, Knowledge Graph, Embeddings)       │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Ebene 2: GENERALISIERUNG (Differential Privacy, RLHF, Abstraktion)     │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Ebene 1: LOKAL (D_User, User-Profile, Session-Cache)                   │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ============================================================================

-- ============================================================================
-- PREREQUISITE: Enable pgvector Extension (für Embeddings)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- PART 1: EBENE 1 - LOKALE USER-DATEN (D_User)
-- ============================================================================
-- Speichert individuelle Kommunikationsmuster, Tonalität, Präferenzen

-- 1.1 User Learning Profile (Erweitert)
-- ============================================================================
DROP TABLE IF EXISTS user_learning_profile CASCADE;

CREATE TABLE user_learning_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- KOMMUNIKATIONSMUSTER
    -- ═══════════════════════════════════════════════════════════════════════
    preferred_tone TEXT DEFAULT 'professional' 
        CHECK (preferred_tone IN ('direct', 'soft', 'enthusiastic', 'professional', 'casual', 'formal')),
    avg_message_length INTEGER DEFAULT 150,
    emoji_usage_level INTEGER DEFAULT 2 CHECK (emoji_usage_level BETWEEN 0 AND 5),
    formality_score DECIMAL(3,2) DEFAULT 0.50 CHECK (formality_score BETWEEN 0 AND 1),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- VERKAUFSSTIL-PROFIL
    -- ═══════════════════════════════════════════════════════════════════════
    sales_style TEXT DEFAULT 'balanced'
        CHECK (sales_style IN ('challenger', 'relationship', 'solution', 'consultative', 'balanced')),
    objection_handling_strength DECIMAL(3,2) DEFAULT 0.50,
    closing_aggressiveness DECIMAL(3,2) DEFAULT 0.50,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- ERFOLGSMETRIKEN (User-spezifisch)
    -- ═══════════════════════════════════════════════════════════════════════
    total_conversations INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_response_time_minutes INTEGER DEFAULT 60,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- TOP-PERFORMER PATTERNS (vom User gelernt)
    -- ═══════════════════════════════════════════════════════════════════════
    top_script_ids UUID[] DEFAULT '{}',
    top_objection_strategies JSONB DEFAULT '[]'::jsonb,
    best_performing_channels TEXT[] DEFAULT '{}',
    peak_activity_hours INTEGER[] DEFAULT '{9,10,11,14,15,16}',
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- OPT-OUT CONTROLS (Governance)
    -- ═══════════════════════════════════════════════════════════════════════
    contribute_to_global_learning BOOLEAN DEFAULT true,
    excluded_contact_ids UUID[] DEFAULT '{}',
    excluded_deal_ids UUID[] DEFAULT '{}',
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- TIMESTAMPS
    -- ═══════════════════════════════════════════════════════════════════════
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_learning_sync_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ulp_user_id ON user_learning_profile(user_id);
CREATE INDEX idx_ulp_contribute ON user_learning_profile(contribute_to_global_learning) 
    WHERE contribute_to_global_learning = true;

COMMENT ON TABLE user_learning_profile IS 
    'Ebene 1: Lokale User-Daten (D_User) für Hyper-Personalisierung';
COMMENT ON COLUMN user_learning_profile.contribute_to_global_learning IS 
    'User-Opt-Out für kollektives Lernen (Governance)';


-- 1.2 User Session Cache (Kurzzeit-Kontext)
-- ============================================================================
DROP TABLE IF EXISTS user_session_cache CASCADE;

CREATE TABLE user_session_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_key TEXT NOT NULL,
    
    -- Session-Daten (JSONB für Flexibilität)
    cache_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- TTL Management
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, session_key)
);

CREATE INDEX idx_usc_user_session ON user_session_cache(user_id, session_key);
CREATE INDEX idx_usc_expires ON user_session_cache(expires_at);

COMMENT ON TABLE user_session_cache IS 
    'Ebene 1: Kurzzeit-Cache für Session-spezifische Daten';


-- ============================================================================
-- PART 2: EBENE 2 - GENERALISIERUNGS-LAYER (Datenschutz-Filter)
-- ============================================================================
-- Verarbeitet und anonymisiert Erfolgsdaten für kollektives Lernen

-- 2.1 RLHF Feedback Sessions (Strukturiertes Feedback)
-- ============================================================================
DROP TABLE IF EXISTS rlhf_feedback_sessions CASCADE;

CREATE TABLE rlhf_feedback_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- KONTEXT (Anonymisiert für Training)
    -- ═══════════════════════════════════════════════════════════════════════
    user_id UUID NOT NULL,  -- Für User-Attribution, NICHT für Training
    
    -- Kontext-Hash (anonymisiert) - ermöglicht Gruppierung ohne User-Identität
    context_hash TEXT NOT NULL,  -- SHA256 von (vertical + channel + objection_category)
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- INPUT (Was wurde gefragt/generiert?)
    -- ═══════════════════════════════════════════════════════════════════════
    input_type TEXT NOT NULL 
        CHECK (input_type IN ('objection_response', 'message_generation', 'follow_up', 'closing_script')),
    input_context JSONB NOT NULL,  -- Anonymisierter Kontext (keine Namen, keine IDs)
    /*
    Beispiel input_context:
    {
        "vertical": "network_marketing",
        "channel": "whatsapp",
        "objection_category": "price",
        "lead_disg_type": "D",
        "conversation_length": 5
    }
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- OUTPUT (Was wurde generiert?)
    -- ═══════════════════════════════════════════════════════════════════════
    generated_response TEXT NOT NULL,
    generation_model TEXT NOT NULL,  -- z.B. "llama-3.1-70b-local", "gpt-4o-mini"
    generation_temperature DECIMAL(3,2),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- HUMAN FEEDBACK (RLHF-Kern)
    -- ═══════════════════════════════════════════════════════════════════════
    feedback_type TEXT CHECK (feedback_type IN ('explicit', 'implicit', 'outcome')),
    
    -- Explicit Feedback (User klickt)
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_edited BOOLEAN DEFAULT false,
    edited_response TEXT,  -- Was hat User korrigiert?
    
    -- Implicit Feedback (Verhalten)
    response_used BOOLEAN DEFAULT false,
    response_sent BOOLEAN DEFAULT false,
    time_to_use_seconds INTEGER,
    
    -- Outcome Feedback (Ergebnis)
    outcome TEXT CHECK (outcome IN ('converted', 'positive_reply', 'negative_reply', 'no_reply', 'unknown')),
    outcome_recorded_at TIMESTAMPTZ,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- BERECHNETE SCORES (Für Training)
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- Tone Score: War die Antwort zu aggressiv/passiv?
    tone_score DECIMAL(3,2) CHECK (tone_score BETWEEN -1 AND 1),
    -- -1.0 = zu aggressiv, 0.0 = perfekt, +1.0 = zu passiv
    
    -- Relevance Score: War die Antwort relevant?
    relevance_score DECIMAL(3,2) CHECK (relevance_score BETWEEN 0 AND 1),
    
    -- Composite Reward (für RLHF Training)
    composite_reward DECIMAL(5,2),
    /*
    Berechnung:
    composite_reward = 
        (user_rating/5 * 0.3) +
        (CASE WHEN response_used THEN 0.2 ELSE 0 END) +
        (CASE WHEN outcome = 'converted' THEN 0.5 
              WHEN outcome = 'positive_reply' THEN 0.3 
              WHEN outcome = 'negative_reply' THEN -0.2 
              ELSE 0 END)
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PRIVACY FLAGS
    -- ═══════════════════════════════════════════════════════════════════════
    eligible_for_training BOOLEAN DEFAULT true,
    privacy_reviewed BOOLEAN DEFAULT false,
    contains_pii BOOLEAN DEFAULT false,  -- Personal Identifiable Information detected
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rlhf_context_hash ON rlhf_feedback_sessions(context_hash);
CREATE INDEX idx_rlhf_input_type ON rlhf_feedback_sessions(input_type);
CREATE INDEX idx_rlhf_outcome ON rlhf_feedback_sessions(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_rlhf_eligible ON rlhf_feedback_sessions(eligible_for_training, created_at DESC) 
    WHERE eligible_for_training = true;
CREATE INDEX idx_rlhf_composite_reward ON rlhf_feedback_sessions(composite_reward DESC NULLS LAST);

COMMENT ON TABLE rlhf_feedback_sessions IS 
    'Ebene 2: RLHF Feedback für strukturiertes Training - Kern des kollektiven Lernens';
COMMENT ON COLUMN rlhf_feedback_sessions.context_hash IS 
    'Anonymisierter Hash für Gruppierung ohne User-Identität';
COMMENT ON COLUMN rlhf_feedback_sessions.composite_reward IS 
    'Aggregierter Reward-Score für RLHF Training';


-- 2.2 Anonymisierte Trainings-Datensätze (D_Train)
-- ============================================================================
DROP TABLE IF EXISTS training_data_pool CASCADE;

CREATE TABLE training_data_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- KATEGORISIERUNG
    -- ═══════════════════════════════════════════════════════════════════════
    training_category TEXT NOT NULL
        CHECK (training_category IN (
            'objection_handling', 'message_generation', 'closing_scripts',
            'follow_up_sequences', 'tone_calibration', 'vertical_specific'
        )),
    
    vertical TEXT DEFAULT 'general',
    sub_category TEXT,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- ANONYMISIERTER TRAININGS-DATENSATZ
    -- ═══════════════════════════════════════════════════════════════════════
    prompt_template TEXT NOT NULL,  -- Anonymisiert: "[LEAD_NAME]" statt "Max Müller"
    ideal_response TEXT NOT NULL,
    
    -- Kontext-Features (numerisch, kategorisch - KEINE PII)
    context_features JSONB NOT NULL,
    /*
    Beispiel:
    {
        "vertical": "network_marketing",
        "channel": "whatsapp",
        "objection_type": "price",
        "lead_profile": {"disg": "D", "interest_level": 0.7},
        "conversation_turn": 3,
        "time_of_day": "afternoon"
    }
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- AGGREGIERTE METRIKEN (Differential Privacy)
    -- ═══════════════════════════════════════════════════════════════════════
    success_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Differential Privacy: Laplace-Rauschen hinzugefügt
    noisy_success_rate DECIMAL(5,4),
    privacy_epsilon DECIMAL(4,2) DEFAULT 1.0,  -- Privacy Budget
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- QUALITY METRICS
    -- ═══════════════════════════════════════════════════════════════════════
    avg_reward_score DECIMAL(4,2),
    confidence_interval_lower DECIMAL(5,4),
    confidence_interval_upper DECIMAL(5,4),
    min_sample_size_reached BOOLEAN DEFAULT false,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- TRAINING STATUS
    -- ═══════════════════════════════════════════════════════════════════════
    last_aggregated_at TIMESTAMPTZ DEFAULT NOW(),
    included_in_model_version TEXT,
    training_weight DECIMAL(4,2) DEFAULT 1.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(training_category, vertical, sub_category, prompt_template)
);

CREATE INDEX idx_tdp_category ON training_data_pool(training_category, vertical);
CREATE INDEX idx_tdp_success_rate ON training_data_pool(noisy_success_rate DESC) 
    WHERE min_sample_size_reached = true;
CREATE INDEX idx_tdp_model_version ON training_data_pool(included_in_model_version);

COMMENT ON TABLE training_data_pool IS 
    'Ebene 2: Anonymisierte, aggregierte Trainings-Daten (D_Train) mit Differential Privacy';
COMMENT ON COLUMN training_data_pool.noisy_success_rate IS 
    'Success-Rate mit Laplace-Rauschen für Differential Privacy';
COMMENT ON COLUMN training_data_pool.privacy_epsilon IS 
    'Privacy Budget (ε) - niedrigere Werte = mehr Privatsphäre';


-- 2.3 Privacy Audit Log
-- ============================================================================
DROP TABLE IF EXISTS privacy_audit_log CASCADE;

CREATE TABLE privacy_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    action_type TEXT NOT NULL 
        CHECK (action_type IN (
            'data_aggregation', 'pii_detection', 'anonymization',
            'training_inclusion', 'user_opt_out', 'data_deletion'
        )),
    
    source_table TEXT NOT NULL,
    source_record_ids UUID[],
    
    privacy_epsilon_used DECIMAL(4,2),
    noise_magnitude DECIMAL(10,6),
    
    pii_detected BOOLEAN DEFAULT false,
    pii_fields TEXT[],
    
    action_result TEXT,
    action_details JSONB,
    
    performed_by TEXT DEFAULT 'system',
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pal_action_type ON privacy_audit_log(action_type, performed_at DESC);

COMMENT ON TABLE privacy_audit_log IS 
    'Ebene 2: Audit-Trail für alle Privacy-relevanten Operationen (Governance)';


-- ============================================================================
-- PART 3: EBENE 3 - GLOBALES MODELL (W_Global, Knowledge Graph, Embeddings)
-- ============================================================================

-- 3.1 Global Model Weights Registry
-- ============================================================================
DROP TABLE IF EXISTS global_model_registry CASCADE;

CREATE TABLE global_model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- MODELL-IDENTIFIKATION
    -- ═══════════════════════════════════════════════════════════════════════
    model_name TEXT NOT NULL,  -- z.B. "salesflow-llama-3.1-8b-v2.3"
    model_type TEXT NOT NULL 
        CHECK (model_type IN ('base_llm', 'fine_tuned', 'adapter', 'embedding')),
    base_model TEXT,  -- z.B. "meta-llama/Llama-3.1-8B-Instruct"
    
    version_major INTEGER NOT NULL,
    version_minor INTEGER NOT NULL,
    version_patch INTEGER NOT NULL,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- TRAININGS-METADATEN
    -- ═══════════════════════════════════════════════════════════════════════
    training_started_at TIMESTAMPTZ,
    training_completed_at TIMESTAMPTZ,
    training_data_from TIMESTAMPTZ,
    training_data_to TIMESTAMPTZ,
    
    training_samples_count INTEGER,
    training_epochs INTEGER,
    training_loss DECIMAL(8,6),
    validation_loss DECIMAL(8,6),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PERFORMANCE-METRIKEN
    -- ═══════════════════════════════════════════════════════════════════════
    benchmark_scores JSONB,
    /*
    {
        "objection_handling_accuracy": 0.87,
        "tone_calibration_score": 0.92,
        "conversion_lift_vs_baseline": 0.15,
        "response_relevance": 0.89
    }
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- DEPLOYMENT STATUS
    -- ═══════════════════════════════════════════════════════════════════════
    status TEXT DEFAULT 'training' 
        CHECK (status IN ('training', 'validating', 'staging', 'production', 'deprecated', 'rollback')),
    deployed_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- SPEICHERORT
    -- ═══════════════════════════════════════════════════════════════════════
    weights_path TEXT,  -- S3/GCS Pfad oder lokaler Pfad
    adapter_path TEXT,  -- LoRA Adapter Pfad (wenn fine-tuned)
    checksum_sha256 TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmr_model_name ON global_model_registry(model_name, version_major DESC, version_minor DESC);
CREATE INDEX idx_gmr_status ON global_model_registry(status) WHERE status = 'production';
CREATE INDEX idx_gmr_type ON global_model_registry(model_type);

COMMENT ON TABLE global_model_registry IS 
    'Ebene 3: Registry aller trainierten Modell-Versionen (W_Global)';


-- 3.2 Knowledge Graph Nodes
-- ============================================================================
DROP TABLE IF EXISTS knowledge_graph_nodes CASCADE;

CREATE TABLE knowledge_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- NODE-IDENTIFIKATION
    -- ═══════════════════════════════════════════════════════════════════════
    node_type TEXT NOT NULL 
        CHECK (node_type IN (
            'company', 'product', 'objection', 'strategy', 'script',
            'persona', 'vertical', 'channel', 'concept', 'faq'
        )),
    node_key TEXT NOT NULL,  -- Eindeutiger Schlüssel innerhalb des Typs
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- NODE-DATEN
    -- ═══════════════════════════════════════════════════════════════════════
    label TEXT NOT NULL,  -- Anzeigename
    description TEXT,
    
    properties JSONB DEFAULT '{}'::jsonb,
    /*
    Beispiel für node_type = 'objection':
    {
        "category": "price",
        "severity": 7,
        "common_contexts": ["cold_outreach", "follow_up"],
        "disg_sensitivity": {"D": 0.8, "I": 0.3, "S": 0.5, "G": 0.9}
    }
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- EMBEDDING (für semantische Suche)
    -- ═══════════════════════════════════════════════════════════════════════
    embedding vector(1536),  -- OpenAI ada-002 / text-embedding-3-small
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    embedding_updated_at TIMESTAMPTZ,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- USAGE STATISTICS
    -- ═══════════════════════════════════════════════════════════════════════
    retrieval_count INTEGER DEFAULT 0,
    success_when_retrieved DECIMAL(5,4) DEFAULT 0.0000,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- METADATA
    -- ═══════════════════════════════════════════════════════════════════════
    company_id UUID,  -- NULL = global
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(node_type, node_key, company_id, language)
);

-- HNSW Index für schnelle Similarity Search
CREATE INDEX idx_kgn_embedding ON knowledge_graph_nodes 
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_kgn_type_key ON knowledge_graph_nodes(node_type, node_key);
CREATE INDEX idx_kgn_company ON knowledge_graph_nodes(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_kgn_active ON knowledge_graph_nodes(is_active, node_type) WHERE is_active = true;

COMMENT ON TABLE knowledge_graph_nodes IS 
    'Ebene 3: Knowledge Graph Knoten mit Embeddings für RAG';
COMMENT ON COLUMN knowledge_graph_nodes.embedding IS 
    'Vector Embedding für semantische Similarity-Suche';


-- 3.3 Knowledge Graph Edges (Beziehungen)
-- ============================================================================
DROP TABLE IF EXISTS knowledge_graph_edges CASCADE;

CREATE TABLE knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    source_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- BEZIEHUNGS-TYP
    -- ═══════════════════════════════════════════════════════════════════════
    edge_type TEXT NOT NULL 
        CHECK (edge_type IN (
            'handles',           -- Strategie handles Einwand
            'belongs_to',        -- Produkt belongs_to Company
            'similar_to',        -- Einwand similar_to Einwand
            'precedes',          -- Script precedes Follow-up
            'requires',          -- Strategie requires Kontext
            'effective_for',     -- Script effective_for Persona
            'alternative_to',    -- Strategie alternative_to Strategie
            'contradicts',       -- Konzept contradicts Konzept
            'supports'           -- FAQ supports Einwandbehandlung
        )),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- BEZIEHUNGS-GEWICHT
    -- ═══════════════════════════════════════════════════════════════════════
    weight DECIMAL(4,3) DEFAULT 1.000 CHECK (weight BETWEEN 0 AND 1),
    confidence DECIMAL(4,3) DEFAULT 1.000,
    
    -- Lern-basierte Gewichtung
    times_traversed INTEGER DEFAULT 0,
    success_when_traversed DECIMAL(5,4),
    
    properties JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_node_id, target_node_id, edge_type)
);

CREATE INDEX idx_kge_source ON knowledge_graph_edges(source_node_id);
CREATE INDEX idx_kge_target ON knowledge_graph_edges(target_node_id);
CREATE INDEX idx_kge_type ON knowledge_graph_edges(edge_type);
CREATE INDEX idx_kge_weight ON knowledge_graph_edges(weight DESC) WHERE weight > 0.5;

COMMENT ON TABLE knowledge_graph_edges IS 
    'Ebene 3: Knowledge Graph Kanten - Beziehungen zwischen Wissenseinheiten';


-- 3.4 Global Insights (Aggregierte Erkenntnisse)
-- ============================================================================
DROP TABLE IF EXISTS global_insights CASCADE;

CREATE TABLE global_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- INSIGHT-KATEGORISIERUNG
    -- ═══════════════════════════════════════════════════════════════════════
    insight_type TEXT NOT NULL 
        CHECK (insight_type IN (
            'best_practice', 'pattern', 'correlation', 'warning', 'trend'
        )),
    
    vertical TEXT DEFAULT 'general',
    channel TEXT,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- INSIGHT-INHALT
    -- ═══════════════════════════════════════════════════════════════════════
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Strukturierte Daten
    insight_data JSONB NOT NULL,
    /*
    Beispiel für best_practice:
    {
        "pattern": "Einwand 'zu teuer' bei DISG-Typ D",
        "recommended_strategy": "challenger_reframe",
        "success_rate": 0.73,
        "sample_response": "Ich verstehe. Lass mich eine andere Frage stellen...",
        "context_requirements": ["product_knowledge", "roi_calculator"]
    }
    */
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STATISTIKEN
    -- ═══════════════════════════════════════════════════════════════════════
    sample_size INTEGER NOT NULL,
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    statistical_significance DECIMAL(6,4),  -- p-value
    
    -- Zeitraum der Analyse
    analysis_period_start DATE,
    analysis_period_end DATE,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STATUS
    -- ═══════════════════════════════════════════════════════════════════════
    is_active BOOLEAN DEFAULT true,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gi_type_vertical ON global_insights(insight_type, vertical);
CREATE INDEX idx_gi_confidence ON global_insights(confidence DESC) WHERE is_active = true;

COMMENT ON TABLE global_insights IS 
    'Ebene 3: Globale Erkenntnisse aus kollektivem Lernen';


-- ============================================================================
-- PART 4: EBENE 4 - BEREITSTELLUNG (RAG + Inferenz)
-- ============================================================================

-- 4.1 RAG Retrieval Log
-- ============================================================================
DROP TABLE IF EXISTS rag_retrieval_log CASCADE;

CREATE TABLE rag_retrieval_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL,
    session_id UUID,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- QUERY
    -- ═══════════════════════════════════════════════════════════════════════
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    query_type TEXT CHECK (query_type IN ('objection', 'message', 'knowledge', 'script')),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- RETRIEVAL RESULTS
    -- ═══════════════════════════════════════════════════════════════════════
    retrieved_node_ids UUID[] NOT NULL,
    retrieval_scores DECIMAL(6,4)[],
    retrieval_method TEXT DEFAULT 'hybrid' 
        CHECK (retrieval_method IN ('semantic', 'keyword', 'hybrid', 'graph')),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- GENERATION
    -- ═══════════════════════════════════════════════════════════════════════
    model_used TEXT,
    generated_response TEXT,
    generation_latency_ms INTEGER,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- FEEDBACK (für RAG-Optimierung)
    -- ═══════════════════════════════════════════════════════════════════════
    response_used BOOLEAN,
    user_feedback_score INTEGER CHECK (user_feedback_score BETWEEN 1 AND 5),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rrl_user ON rag_retrieval_log(user_id, created_at DESC);
CREATE INDEX idx_rrl_query_type ON rag_retrieval_log(query_type);

COMMENT ON TABLE rag_retrieval_log IS 
    'Ebene 4: Logging aller RAG-Anfragen für Optimierung';


-- 4.2 Response Styling Templates
-- ============================================================================
DROP TABLE IF EXISTS response_styling_templates CASCADE;

CREATE TABLE response_styling_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STYLE-IDENTIFIKATION
    -- ═══════════════════════════════════════════════════════════════════════
    style_name TEXT NOT NULL UNIQUE,
    style_description TEXT,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STYLE-PARAMETER
    -- ═══════════════════════════════════════════════════════════════════════
    tone TEXT NOT NULL 
        CHECK (tone IN ('direct', 'soft', 'enthusiastic', 'professional', 'casual', 'formal')),
    
    formality_level DECIMAL(3,2) CHECK (formality_level BETWEEN 0 AND 1),
    emoji_density INTEGER CHECK (emoji_density BETWEEN 0 AND 5),
    avg_sentence_length INTEGER,
    vocabulary_complexity TEXT CHECK (vocabulary_complexity IN ('simple', 'moderate', 'advanced')),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PROMPT INSTRUCTIONS
    -- ═══════════════════════════════════════════════════════════════════════
    system_prompt_addition TEXT,  -- Wird an Base-Prompt angehängt
    example_transformations JSONB,  -- Vorher/Nachher Beispiele
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- MAPPING
    -- ═══════════════════════════════════════════════════════════════════════
    suitable_for_channels TEXT[] DEFAULT '{}',
    suitable_for_verticals TEXT[] DEFAULT '{}',
    suitable_for_disg_types TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rst_tone ON response_styling_templates(tone);
CREATE INDEX idx_rst_active ON response_styling_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE response_styling_templates IS 
    'Ebene 4: Styling-Templates für D_User-basierte Anpassung der Antworten';


-- ============================================================================
-- PART 5: GOVERNANCE & KONTROLLE
-- ============================================================================

-- 5.1 Learning Opt-Out Requests
-- ============================================================================
DROP TABLE IF EXISTS learning_opt_out_requests CASCADE;

CREATE TABLE learning_opt_out_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL,
    
    opt_out_type TEXT NOT NULL 
        CHECK (opt_out_type IN ('full', 'contact_specific', 'deal_specific', 'time_limited')),
    
    target_id UUID,  -- contact_id oder deal_id
    
    reason TEXT,
    
    -- Zeitlich begrenzt
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,  -- NULL = permanent
    
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loor_user ON learning_opt_out_requests(user_id);
CREATE INDEX idx_loor_processed ON learning_opt_out_requests(processed) WHERE processed = false;

COMMENT ON TABLE learning_opt_out_requests IS 
    'Governance: User-Opt-Out Anfragen für kollektives Lernen';


-- 5.2 Model Performance Tracking
-- ============================================================================
DROP TABLE IF EXISTS model_performance_tracking CASCADE;

CREATE TABLE model_performance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    model_version_id UUID REFERENCES global_model_registry(id),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- METRIKEN (Täglich aggregiert)
    -- ═══════════════════════════════════════════════════════════════════════
    tracking_date DATE NOT NULL,
    
    total_requests INTEGER DEFAULT 0,
    successful_outcomes INTEGER DEFAULT 0,
    
    avg_response_rating DECIMAL(3,2),
    avg_conversion_rate DECIMAL(5,4),
    
    -- A/B Test Vergleich
    baseline_conversion_rate DECIMAL(5,4),
    conversion_lift DECIMAL(5,4),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- BREAKDOWN
    -- ═══════════════════════════════════════════════════════════════════════
    metrics_by_vertical JSONB,
    metrics_by_channel JSONB,
    metrics_by_use_case JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(model_version_id, tracking_date)
);

CREATE INDEX idx_mpt_model_date ON model_performance_tracking(model_version_id, tracking_date DESC);

COMMENT ON TABLE model_performance_tracking IS 
    'Governance: Tägliches Performance-Tracking der Modell-Versionen';


-- 5.3 Bias Mitigation Log
-- ============================================================================
DROP TABLE IF EXISTS bias_mitigation_log CASCADE;

CREATE TABLE bias_mitigation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    detection_type TEXT NOT NULL 
        CHECK (detection_type IN (
            'tone_bias', 'demographic_bias', 'channel_bias', 
            'vertical_bias', 'language_bias', 'outcome_bias'
        )),
    
    detected_pattern TEXT NOT NULL,
    affected_segments JSONB,
    
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    mitigation_action TEXT,
    mitigation_applied_at TIMESTAMPTZ,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_bml_type ON bias_mitigation_log(detection_type, severity);
CREATE INDEX idx_bml_unresolved ON bias_mitigation_log(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE bias_mitigation_log IS 
    'Governance: Erkennung und Behandlung von Bias im Modell';


-- ============================================================================
-- PART 6: FUNCTIONS & TRIGGERS
-- ============================================================================

-- 6.1 Function: Composite Reward berechnen
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_rlhf_composite_reward()
RETURNS TRIGGER AS $$
BEGIN
    NEW.composite_reward := COALESCE(
        (COALESCE(NEW.user_rating, 3)::DECIMAL / 5 * 0.3) +
        (CASE WHEN NEW.response_used THEN 0.2 ELSE 0 END) +
        (CASE 
            WHEN NEW.outcome = 'converted' THEN 0.5 
            WHEN NEW.outcome = 'positive_reply' THEN 0.3 
            WHEN NEW.outcome = 'negative_reply' THEN -0.2 
            ELSE 0 
        END),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_rlhf_reward ON rlhf_feedback_sessions;
CREATE TRIGGER trigger_calculate_rlhf_reward
    BEFORE INSERT OR UPDATE ON rlhf_feedback_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_rlhf_composite_reward();


-- 6.2 Function: Privacy-Epsilon Noise hinzufügen (Differential Privacy)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_laplace_noise(
    true_value DECIMAL,
    sensitivity DECIMAL DEFAULT 1.0,
    epsilon DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL AS $$
DECLARE
    scale DECIMAL;
    u DECIMAL;
    noise DECIMAL;
BEGIN
    -- Laplace-Verteilung: scale = sensitivity / epsilon
    scale := sensitivity / epsilon;
    
    -- Uniform random für Laplace
    u := random() - 0.5;
    
    -- Laplace noise
    noise := -scale * sign(u) * ln(1 - 2 * abs(u));
    
    RETURN true_value + noise;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_laplace_noise IS 
    'Fügt Laplace-Rauschen für Differential Privacy hinzu';


-- 6.3 Function: Training Data aggregieren
-- ============================================================================
CREATE OR REPLACE FUNCTION aggregate_training_data(
    p_training_category TEXT,
    p_vertical TEXT DEFAULT 'general',
    p_min_sample_size INTEGER DEFAULT 30,
    p_privacy_epsilon DECIMAL DEFAULT 1.0
)
RETURNS INTEGER AS $$
DECLARE
    aggregated_count INTEGER := 0;
    r RECORD;
BEGIN
    -- Aggregiere RLHF Sessions zu Training Data Pool
    FOR r IN 
        SELECT 
            input_type,
            input_context->>'vertical' as vertical,
            input_context->>'objection_type' as sub_category,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE outcome IN ('converted', 'positive_reply')) as success_count,
            AVG(composite_reward) as avg_reward
        FROM rlhf_feedback_sessions
        WHERE 
            eligible_for_training = true
            AND input_type = p_training_category
            AND (p_vertical = 'general' OR input_context->>'vertical' = p_vertical)
        GROUP BY 
            input_type,
            input_context->>'vertical',
            input_context->>'objection_type'
        HAVING COUNT(*) >= p_min_sample_size
    LOOP
        -- Upsert in training_data_pool mit noisy stats
        INSERT INTO training_data_pool (
            training_category,
            vertical,
            sub_category,
            prompt_template,
            ideal_response,
            context_features,
            success_count,
            total_count,
            success_rate,
            noisy_success_rate,
            privacy_epsilon,
            avg_reward_score,
            min_sample_size_reached,
            last_aggregated_at
        ) VALUES (
            r.input_type,
            COALESCE(r.vertical, 'general'),
            r.sub_category,
            '[AGGREGATED]',  -- Wird durch separaten Prozess gefüllt
            '[AGGREGATED]',
            '{}'::jsonb,
            r.success_count,
            r.total_count,
            r.success_count::DECIMAL / NULLIF(r.total_count, 0),
            add_laplace_noise(r.success_count::DECIMAL / NULLIF(r.total_count, 0), 1.0, p_privacy_epsilon),
            p_privacy_epsilon,
            r.avg_reward,
            true,
            NOW()
        )
        ON CONFLICT (training_category, vertical, sub_category, prompt_template) 
        DO UPDATE SET
            success_count = EXCLUDED.success_count,
            total_count = EXCLUDED.total_count,
            success_rate = EXCLUDED.success_rate,
            noisy_success_rate = EXCLUDED.noisy_success_rate,
            avg_reward_score = EXCLUDED.avg_reward_score,
            last_aggregated_at = NOW();
        
        aggregated_count := aggregated_count + 1;
        
        -- Privacy Audit Log
        INSERT INTO privacy_audit_log (
            action_type,
            source_table,
            privacy_epsilon_used,
            action_result,
            action_details
        ) VALUES (
            'data_aggregation',
            'rlhf_feedback_sessions',
            p_privacy_epsilon,
            'success',
            jsonb_build_object(
                'category', r.input_type,
                'vertical', r.vertical,
                'sample_size', r.total_count
            )
        );
    END LOOP;
    
    RETURN aggregated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_training_data IS 
    'Aggregiert RLHF Feedback zu anonymisierten Trainings-Daten mit Differential Privacy';


-- 6.4 Function: Semantic Search in Knowledge Graph
-- ============================================================================
CREATE OR REPLACE FUNCTION search_knowledge_graph(
    p_query_embedding vector(1536),
    p_node_types TEXT[] DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    node_id UUID,
    node_type TEXT,
    node_key TEXT,
    label TEXT,
    properties JSONB,
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kgn.id as node_id,
        kgn.node_type,
        kgn.node_key,
        kgn.label,
        kgn.properties,
        (1 - (kgn.embedding <=> p_query_embedding))::DECIMAL as similarity
    FROM knowledge_graph_nodes kgn
    WHERE 
        kgn.is_active = true
        AND kgn.embedding IS NOT NULL
        AND (p_node_types IS NULL OR kgn.node_type = ANY(p_node_types))
        AND (p_company_id IS NULL OR kgn.company_id IS NULL OR kgn.company_id = p_company_id)
        AND (1 - (kgn.embedding <=> p_query_embedding)) >= p_min_similarity
    ORDER BY kgn.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_knowledge_graph IS 
    'Semantische Suche im Knowledge Graph mit pgvector';


-- 6.5 Function: User Learning Profile aktualisieren
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_learning_profile(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_profile_exists BOOLEAN;
BEGIN
    -- Prüfen ob Profil existiert
    SELECT EXISTS(SELECT 1 FROM user_learning_profile WHERE user_id = p_user_id)
    INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
        -- Neues Profil anlegen
        INSERT INTO user_learning_profile (user_id) VALUES (p_user_id);
    END IF;
    
    -- Profil aktualisieren basierend auf RLHF Feedback
    UPDATE user_learning_profile ulp
    SET
        total_conversations = (
            SELECT COUNT(*) FROM rlhf_feedback_sessions 
            WHERE user_id = p_user_id
        ),
        total_conversions = (
            SELECT COUNT(*) FROM rlhf_feedback_sessions 
            WHERE user_id = p_user_id AND outcome = 'converted'
        ),
        conversion_rate = (
            SELECT 
                COALESCE(
                    COUNT(*) FILTER (WHERE outcome = 'converted')::DECIMAL / 
                    NULLIF(COUNT(*), 0) * 100,
                    0
                )
            FROM rlhf_feedback_sessions 
            WHERE user_id = p_user_id AND outcome IS NOT NULL
        ),
        top_script_ids = (
            SELECT ARRAY_AGG(DISTINCT (input_context->>'script_id')::UUID)
            FROM (
                SELECT input_context
                FROM rlhf_feedback_sessions
                WHERE 
                    user_id = p_user_id 
                    AND outcome IN ('converted', 'positive_reply')
                    AND input_context->>'script_id' IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 10
            ) sub
        ),
        updated_at = NOW(),
        last_learning_sync_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_learning_profile IS 
    'Aktualisiert User Learning Profile basierend auf RLHF Feedback';


-- 6.6 RPC: Track Mentor Interaction (Erweitert für RLHF)
-- ============================================================================
CREATE OR REPLACE FUNCTION track_mentor_interaction(
    p_user_id UUID,
    p_action_type TEXT,
    p_script_id TEXT DEFAULT NULL,
    p_contact_id UUID DEFAULT NULL,
    p_message_text TEXT DEFAULT NULL,
    p_outcome TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_context_hash TEXT;
BEGIN
    -- Context Hash für Anonymisierung
    v_context_hash := encode(
        sha256(
            (COALESCE(p_action_type, '') || '|' || 
             COALESCE(p_script_id, '') || '|' ||
             'network_marketing')::bytea
        ),
        'hex'
    );
    
    -- RLHF Session erstellen
    INSERT INTO rlhf_feedback_sessions (
        user_id,
        context_hash,
        input_type,
        input_context,
        generated_response,
        generation_model,
        outcome,
        feedback_type
    ) VALUES (
        p_user_id,
        v_context_hash,
        CASE 
            WHEN p_action_type IN ('script_shown', 'script_copied', 'script_sent') THEN 'message_generation'
            WHEN p_action_type = 'lead_converted' THEN 'closing_script'
            ELSE 'follow_up'
        END,
        jsonb_build_object(
            'action_type', p_action_type,
            'script_id', p_script_id,
            'vertical', 'network_marketing'
        ),
        COALESCE(p_message_text, ''),
        'user_input',
        p_outcome,
        'implicit'
    )
    RETURNING id INTO v_session_id;
    
    -- User Profile aktualisieren
    PERFORM update_user_learning_profile(p_user_id);
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PART 7: VIEWS FÜR ANALYTICS & MONITORING
-- ============================================================================

-- 7.1 View: Global Learning Dashboard
-- ============================================================================
CREATE OR REPLACE VIEW v_global_learning_dashboard AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE outcome = 'converted') as conversions,
    COUNT(*) FILTER (WHERE outcome = 'positive_reply') as positive_replies,
    AVG(composite_reward) as avg_reward,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) FILTER (WHERE eligible_for_training) as eligible_for_training
FROM rlhf_feedback_sessions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW v_global_learning_dashboard IS 
    'Dashboard: Tägliche Übersicht des kollektiven Lernens';


-- 7.2 View: Training Data Quality
-- ============================================================================
CREATE OR REPLACE VIEW v_training_data_quality AS
SELECT 
    training_category,
    vertical,
    COUNT(*) as dataset_count,
    SUM(total_count) as total_samples,
    AVG(success_rate) as avg_success_rate,
    AVG(noisy_success_rate) as avg_noisy_rate,
    AVG(privacy_epsilon) as avg_epsilon,
    COUNT(*) FILTER (WHERE min_sample_size_reached) as ready_for_training
FROM training_data_pool
GROUP BY training_category, vertical
ORDER BY ready_for_training DESC;

COMMENT ON VIEW v_training_data_quality IS 
    'Qualitätsübersicht der Trainings-Daten';


-- 7.3 View: Model Performance Comparison
-- ============================================================================
CREATE OR REPLACE VIEW v_model_performance_comparison AS
SELECT 
    gmr.model_name,
    gmr.version_major || '.' || gmr.version_minor || '.' || gmr.version_patch as version,
    gmr.status,
    gmr.training_samples_count,
    mpt.tracking_date,
    mpt.total_requests,
    mpt.avg_conversion_rate,
    mpt.conversion_lift,
    mpt.avg_response_rating
FROM global_model_registry gmr
LEFT JOIN model_performance_tracking mpt ON gmr.id = mpt.model_version_id
WHERE gmr.status IN ('production', 'staging')
ORDER BY gmr.model_name, mpt.tracking_date DESC;

COMMENT ON VIEW v_model_performance_comparison IS 
    'Vergleich der Modell-Versionen nach Performance';


-- ============================================================================
-- PART 8: INITIAL DATA / SEED
-- ============================================================================

-- 8.1 Response Styling Templates
-- ============================================================================
INSERT INTO response_styling_templates (style_name, style_description, tone, formality_level, emoji_density, system_prompt_addition, suitable_for_channels, suitable_for_disg_types) VALUES
('professional_direct', 'Professionell und direkt - für Business-Kontexte', 'professional', 0.75, 1, 
 'Antworte professionell und auf den Punkt. Vermeide Smalltalk. Fokussiere auf Fakten und Nutzen.', 
 ARRAY['email', 'linkedin'], ARRAY['D', 'G']),

('casual_friendly', 'Locker und freundlich - für Social Media', 'casual', 0.25, 3, 
 'Antworte locker und freundlich wie ein guter Bekannter. Nutze Emojis sparsam aber passend. Sei authentisch.', 
 ARRAY['whatsapp', 'instagram', 'facebook'], ARRAY['I', 'S']),

('enthusiastic_motivating', 'Begeistert und motivierend - für Network Marketing', 'enthusiastic', 0.40, 4, 
 'Antworte mit echter Begeisterung! Teile deine Energie und Vision. Motiviere ohne aufdringlich zu sein.', 
 ARRAY['whatsapp', 'instagram'], ARRAY['I']),

('soft_empathetic', 'Sanft und einfühlsam - für Einwandbehandlung', 'soft', 0.50, 2, 
 'Zeige echtes Verständnis. Bestätige Gefühle bevor du antwortest. Dränge nicht.', 
 ARRAY['whatsapp', 'email'], ARRAY['S', 'G']),

('formal_business', 'Formell und geschäftlich - für Enterprise', 'formal', 0.90, 0, 
 'Antworte in formellem Geschäftsdeutsch. Keine Emojis. Klare Struktur. Höfliche Anrede.', 
 ARRAY['email', 'linkedin'], ARRAY['G', 'D']);


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ NON PLUS ULTRA: COLLABORATIVE INTELLIGENCE SYSTEM INSTALLED';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 EBENE 1 (Lokal):';
    RAISE NOTICE '   ✅ user_learning_profile - User-spezifische Lernprofile';
    RAISE NOTICE '   ✅ user_session_cache - Kurzzeit-Kontext';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 EBENE 2 (Generalisierung):';
    RAISE NOTICE '   ✅ rlhf_feedback_sessions - RLHF Feedback Loop';
    RAISE NOTICE '   ✅ training_data_pool - Anonymisierte Trainings-Daten';
    RAISE NOTICE '   ✅ privacy_audit_log - Privacy Audit Trail';
    RAISE NOTICE '';
    RAISE NOTICE '🧠 EBENE 3 (Global):';
    RAISE NOTICE '   ✅ global_model_registry - Modell-Versionen (W_Global)';
    RAISE NOTICE '   ✅ knowledge_graph_nodes - Knowledge Graph mit Embeddings';
    RAISE NOTICE '   ✅ knowledge_graph_edges - Graph-Beziehungen';
    RAISE NOTICE '   ✅ global_insights - Kollektive Erkenntnisse';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 EBENE 4 (Bereitstellung):';
    RAISE NOTICE '   ✅ rag_retrieval_log - RAG Logging';
    RAISE NOTICE '   ✅ response_styling_templates - D_User Styling';
    RAISE NOTICE '';
    RAISE NOTICE '⚖️ GOVERNANCE:';
    RAISE NOTICE '   ✅ learning_opt_out_requests - User Opt-Out';
    RAISE NOTICE '   ✅ model_performance_tracking - Performance Monitoring';
    RAISE NOTICE '   ✅ bias_mitigation_log - Bias Erkennung';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNCTIONS:';
    RAISE NOTICE '   ✅ calculate_rlhf_composite_reward()';
    RAISE NOTICE '   ✅ add_laplace_noise() - Differential Privacy';
    RAISE NOTICE '   ✅ aggregate_training_data()';
    RAISE NOTICE '   ✅ search_knowledge_graph() - Semantic Search';
    RAISE NOTICE '   ✅ update_user_learning_profile()';
    RAISE NOTICE '   ✅ track_mentor_interaction() - RLHF Extended';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Self-Hosted LLM aufsetzen (Ollama/vLLM mit Llama 3.1)';
    RAISE NOTICE '   2. Embedding-Pipeline implementieren';
    RAISE NOTICE '   3. RAG-Engine in Backend integrieren';
    RAISE NOTICE '   4. RLHF Training-Pipeline einrichten';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

