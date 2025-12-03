-- ═════════════════════════════════════════════════════════════════
-- PHASE 2: RAG-OPTIMIERTE WISSENSDATENBANK
-- ═════════════════════════════════════════════════════════════════
-- Zentrale Wissensbasis für Playbooks, Einwände, Produkte, Best Practices
-- Mit Vector Search für semantische Retrieval
-- ═════════════════════════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────
-- 1. ZENTRALE KNOWLEDGE BASE
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL, 
    -- Categories: 'playbook', 'objection', 'product', 'script', 'faq', 'best_practice', 'article', 'training'
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    embedding VECTOR(1536), -- OpenAI ada-002 embeddings
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], 
    language VARCHAR(10) DEFAULT 'de',
    source VARCHAR(100), -- 'manual', 'imported', 'ai_generated', 'user_contributed'
    usage_count INTEGER DEFAULT 0,
    effectiveness_score FLOAT CHECK (effectiveness_score BETWEEN 0 AND 1),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- Optional: Link zu user
    
    CONSTRAINT valid_category CHECK (category IN (
        'playbook', 'objection', 'product', 'script', 'faq', 
        'best_practice', 'article', 'training', 'case_study'
    ))
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_base(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_kb_language ON knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_kb_usage ON knowledge_base(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_kb_effectiveness ON knowledge_base(effectiveness_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON knowledge_base USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────────
-- 2. ERWEITERTE OBJECTION LIBRARY (ergänzt bestehendes Schema)
-- ─────────────────────────────────────────────────────────────────

-- Note: objection_library existiert bereits, erweitere nur Felder
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='objection_library' AND column_name='response_variants') THEN
        ALTER TABLE objection_library ADD COLUMN response_variants JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='objection_library' AND column_name='personality_adaptations') THEN
        ALTER TABLE objection_library ADD COLUMN personality_adaptations JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='objection_library' AND column_name='success_rate') THEN
        ALTER TABLE objection_library ADD COLUMN success_rate FLOAT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='objection_library' AND column_name='usage_count') THEN
        ALTER TABLE objection_library ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='objection_library' AND column_name='similar_objections') THEN
        ALTER TABLE objection_library ADD COLUMN similar_objections TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. PRODUKT-KATALOG (für Upselling)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), 
    -- Categories: 'starter_kit', 'premium_pack', 'training', 'tools', 'subscription'
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    tier VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum'
    features JSONB DEFAULT '[]'::jsonb, -- Liste der Features
    benefits JSONB DEFAULT '{}'::jsonb, -- Nutzen für verschiedene Personas
    target_personality_types VARCHAR[] DEFAULT ARRAY[]::VARCHAR[], 
    -- DISG-Typen: ['D', 'I', 'S', 'C']
    target_industries TEXT[] DEFAULT ARRAY[]::TEXT[],
    upsell_from UUID, -- Von welchem Produkt ist dies ein Upsell?
    cross_sell_products UUID[] DEFAULT ARRAY[]::UUID[], -- Kombinierbare Produkte
    active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    sales_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    stock_status VARCHAR(50) DEFAULT 'available', -- 'available', 'limited', 'out_of_stock'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT valid_rating CHECK (avg_rating IS NULL OR (avg_rating >= 0 AND avg_rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_upsell ON products(upsell_from);
CREATE INDEX IF NOT EXISTS idx_products_industries ON products USING GIN(target_industries);
CREATE INDEX IF NOT EXISTS idx_products_sales ON products(sales_count DESC);

-- ─────────────────────────────────────────────────────────────────
-- 4. LEAD-PRODUKT INTERACTIONS (Kaufhistorie & Interessen)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_product_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID, -- Wer hat die Interaktion erfasst
    interaction_type VARCHAR(50) NOT NULL, 
    -- Types: 'purchased', 'interested', 'demo_shown', 'objection_raised', 'declined', 'wishlist'
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    amount DECIMAL(10,2), -- Falls gekauft
    status VARCHAR(50), -- 'completed', 'pending', 'cancelled', 'refunded'
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
        'purchased', 'interested', 'demo_shown', 'objection_raised', 
        'declined', 'wishlist', 'trial_started', 'trial_converted'
    ))
);

CREATE INDEX IF NOT EXISTS idx_lead_product_lead ON lead_product_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_product_product ON lead_product_interactions(product_id);
CREATE INDEX IF NOT EXISTS idx_lead_product_type ON lead_product_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_product_date ON lead_product_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_lead_product_user ON lead_product_interactions(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. SUCCESS STORIES (für Social Proof)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS success_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Wer hat Erfolg gehabt?
    lead_id UUID, -- Mit welchem Lead?
    story_type VARCHAR(50) NOT NULL, 
    -- Types: 'first_sale', 'big_deal', 'recruitment', 'milestone', 'comeback', 'turnaround'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metrics JSONB DEFAULT '{}'::jsonb, 
    -- Beispiel: {'revenue': 5000, 'timeframe_days': 30, 'conversion_rate': 0.45}
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility VARCHAR(50) DEFAULT 'squad', -- 'private', 'squad', 'company', 'public'
    upvotes INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_story_type CHECK (story_type IN (
        'first_sale', 'big_deal', 'recruitment', 'milestone', 
        'comeback', 'turnaround', 'team_achievement'
    )),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'squad', 'company', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_success_type ON success_stories(story_type);
CREATE INDEX IF NOT EXISTS idx_success_user ON success_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_success_lead ON success_stories(lead_id);
CREATE INDEX IF NOT EXISTS idx_success_visibility ON success_stories(visibility);
CREATE INDEX IF NOT EXISTS idx_success_featured ON success_stories(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_success_upvotes ON success_stories(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_success_tags ON success_stories USING GIN(tags);

-- ─────────────────────────────────────────────────────────────────
-- 6. PRODUCT REVIEWS (User-Generated Content)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    pros TEXT,
    cons TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON product_reviews(verified_purchase) WHERE verified_purchase = TRUE;

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-Update Timestamps
-- ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_kb_timestamp
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_success_stories_timestamp
    BEFORE UPDATE ON success_stories
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_product_reviews_timestamp
    BEFORE UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-Update Product Avg Rating
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        avg_rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_product_rating
    AFTER INSERT OR UPDATE OR DELETE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE knowledge_base IS 'Zentrale RAG-optimierte Wissensdatenbank mit Vector Search';
COMMENT ON TABLE products IS 'Produkt-Katalog für Upselling und Cross-Selling Empfehlungen';
COMMENT ON TABLE lead_product_interactions IS 'Trackt alle Interaktionen zwischen Leads und Produkten';
COMMENT ON TABLE success_stories IS 'User-generierte Erfolgsgeschichten für Social Proof und Motivation';
COMMENT ON TABLE product_reviews IS 'Produkt-Bewertungen für Qualitätssicherung und Social Proof';

