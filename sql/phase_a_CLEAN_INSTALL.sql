-- ====================================================================
-- SALES FLOW AI - PHASE A: CLEAN INSTALL
-- ====================================================================
-- Löscht alte Versionen und erstellt alles neu
-- Safe to run multiple times!
-- ====================================================================

-- ====================================================================
-- 1. DROP EXISTING OBJECTS (IF ANY)
-- ====================================================================

-- Drop Triggers
DROP TRIGGER IF EXISTS trigger_update_template_performance ON template_performance;
DROP TRIGGER IF EXISTS trigger_update_post_comments ON community_comments;
DROP TRIGGER IF EXISTS update_mlm_comp_plans_updated_at ON mlm_compensation_plans;
DROP TRIGGER IF EXISTS update_mlm_events_updated_at ON mlm_events;
DROP TRIGGER IF EXISTS update_three_way_calls_updated_at ON three_way_calls;
DROP TRIGGER IF EXISTS update_mlm_downline_updated_at ON mlm_downline_structure;
DROP TRIGGER IF EXISTS update_mlm_lead_playbooks_updated_at ON mlm_lead_playbooks;

-- Drop Functions
DROP FUNCTION IF EXISTS update_template_performance_rates() CASCADE;
DROP FUNCTION IF EXISTS update_post_comments_count() CASCADE;

-- Drop Views
DROP VIEW IF EXISTS v_top_templates CASCADE;
DROP VIEW IF EXISTS v_success_leaderboard CASCADE;
DROP VIEW IF EXISTS v_community_engagement CASCADE;

-- Drop Tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS community_comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS template_performance CASCADE;
DROP TABLE IF EXISTS company_success_stories CASCADE;

-- ====================================================================
-- 2. CREATE TABLES
-- ====================================================================

-- 2.1 COMPANY SUCCESS STORIES
CREATE TABLE company_success_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  user_id UUID,
  story_title TEXT NOT NULL,
  story_text TEXT NOT NULL,
  achievement_type TEXT CHECK (achievement_type IN (
    'rank_advancement', 'income_milestone', 'team_growth', 
    'product_results', 'lifestyle_change', 'other'
  )),
  timeframe_months INTEGER,
  metrics JSONB,
  location_country TEXT,
  location_region TEXT,
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  video_url TEXT,
  tags TEXT[],
  language TEXT DEFAULT 'de',
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_success_stories_company ON company_success_stories(company_name);
CREATE INDEX idx_success_stories_achievement ON company_success_stories(achievement_type);
CREATE INDEX idx_success_stories_country ON company_success_stories(location_country);
CREATE INDEX idx_success_stories_featured ON company_success_stories(featured) WHERE featured = true;
CREATE INDEX idx_success_stories_verified ON company_success_stories(verified) WHERE verified = true;

-- 2.2 TEMPLATE PERFORMANCE
CREATE TABLE template_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id TEXT NOT NULL,
  company_name TEXT,
  user_id UUID,
  
  times_used INTEGER DEFAULT 0,
  times_sent INTEGER DEFAULT 0,
  times_delivered INTEGER DEFAULT 0,
  times_opened INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,
  times_replied INTEGER DEFAULT 0,
  times_positive_reply INTEGER DEFAULT 0,
  times_negative_reply INTEGER DEFAULT 0,
  times_converted INTEGER DEFAULT 0,
  
  delivery_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  response_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  
  performance_score INTEGER CHECK (performance_score BETWEEN 0 AND 100),
  
  channel TEXT,
  target_audience TEXT,
  language TEXT DEFAULT 'de',
  region TEXT,
  
  period_start DATE DEFAULT CURRENT_DATE,
  period_end DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, company_name, user_id, period_start)
);

CREATE INDEX idx_template_perf_template ON template_performance(template_id);
CREATE INDEX idx_template_perf_company ON template_performance(company_name);
CREATE INDEX idx_template_perf_score ON template_performance(performance_score DESC);
CREATE INDEX idx_template_perf_conversion ON template_performance(conversion_rate DESC);

-- 2.3 COMMUNITY POSTS
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  company_name TEXT,
  
  post_type TEXT CHECK (post_type IN (
    'question', 'tip', 'success', 'challenge', 'discussion', 'resource'
  )) NOT NULL,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  category TEXT,
  tags TEXT[],
  
  relevant_companies TEXT[],
  relevant_regions TEXT[],
  language TEXT DEFAULT 'de',
  
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  bookmarks_count INTEGER DEFAULT 0,
  
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  images JSONB,
  attachments JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_company ON community_posts(company_name);
CREATE INDEX idx_community_posts_type ON community_posts(post_type);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_featured ON community_posts(is_featured) WHERE is_featured = true;
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);

-- 2.4 COMMUNITY COMMENTS
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES community_comments(id),
  
  content TEXT NOT NULL,
  
  likes_count INTEGER DEFAULT 0,
  is_solution BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id);
CREATE INDEX idx_community_comments_user ON community_comments(user_id);
CREATE INDEX idx_community_comments_parent ON community_comments(parent_comment_id);

-- ====================================================================
-- 3. CREATE VIEWS
-- ====================================================================

CREATE VIEW v_top_templates AS
SELECT 
  tp.template_id,
  tp.company_name,
  tp.channel,
  tp.target_audience,
  AVG(tp.open_rate) as avg_open_rate,
  AVG(tp.response_rate) as avg_response_rate,
  AVG(tp.conversion_rate) as avg_conversion_rate,
  AVG(tp.performance_score) as avg_performance_score,
  SUM(tp.times_used) as total_uses,
  SUM(tp.times_converted) as total_conversions,
  COUNT(DISTINCT tp.user_id) as unique_users
FROM template_performance tp
WHERE tp.times_used >= 5
GROUP BY tp.template_id, tp.company_name, tp.channel, tp.target_audience
HAVING AVG(tp.performance_score) >= 60
ORDER BY avg_performance_score DESC, total_conversions DESC;

CREATE VIEW v_success_leaderboard AS
SELECT 
  company_name,
  COUNT(*) as total_stories,
  SUM(CASE WHEN verified THEN 1 ELSE 0 END) as verified_stories,
  SUM(CASE WHEN featured THEN 1 ELSE 0 END) as featured_stories,
  SUM(views_count) as total_views,
  SUM(likes_count) as total_likes,
  AVG(timeframe_months) as avg_timeframe_months
FROM company_success_stories
WHERE verified = true
GROUP BY company_name
ORDER BY verified_stories DESC, total_likes DESC;

CREATE VIEW v_community_engagement AS
SELECT 
  cp.category,
  cp.post_type,
  COUNT(cp.id) as total_posts,
  SUM(cp.views_count) as total_views,
  SUM(cp.likes_count) as total_likes,
  SUM(cp.comments_count) as total_comments,
  AVG(cp.comments_count)::DECIMAL(10,2) as avg_comments_per_post,
  COUNT(DISTINCT cp.user_id) as unique_contributors
FROM community_posts cp
WHERE cp.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cp.category, cp.post_type
ORDER BY total_views DESC;

-- ====================================================================
-- 4. CREATE FUNCTIONS
-- ====================================================================

CREATE FUNCTION update_template_performance_rates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivery_rate := CASE 
    WHEN NEW.times_sent > 0 THEN (NEW.times_delivered::DECIMAL / NEW.times_sent * 100)
    ELSE 0 
  END;
  
  NEW.open_rate := CASE 
    WHEN NEW.times_delivered > 0 THEN (NEW.times_opened::DECIMAL / NEW.times_delivered * 100)
    ELSE 0 
  END;
  
  NEW.response_rate := CASE 
    WHEN NEW.times_opened > 0 THEN (NEW.times_replied::DECIMAL / NEW.times_opened * 100)
    ELSE 0 
  END;
  
  NEW.conversion_rate := CASE 
    WHEN NEW.times_replied > 0 THEN (NEW.times_converted::DECIMAL / NEW.times_replied * 100)
    ELSE 0 
  END;
  
  NEW.performance_score := (
    (NEW.open_rate * 0.2) + 
    (NEW.response_rate * 0.3) + 
    (NEW.conversion_rate * 0.5)
  )::INTEGER;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts 
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts 
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 5. CREATE TRIGGERS
-- ====================================================================

CREATE TRIGGER trigger_update_template_performance
  BEFORE INSERT OR UPDATE ON template_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_template_performance_rates();

CREATE TRIGGER trigger_update_post_comments
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- ====================================================================
-- 6. INSERT EXAMPLE DATA
-- ====================================================================

INSERT INTO company_success_stories (
  company_name, story_title, story_text, achievement_type,
  timeframe_months, metrics, location_country, location_region,
  verified, featured, language, tags
) VALUES (
  'Zinzino',
  'Von 0 auf Diamond in 8 Monaten',
  'Als ich mit Zinzino startete, war ich skeptisch. Aber der BalanceTest hat mich überzeugt. Ich fokussierte mich auf Gesundheitsresultate statt Verkauf - und baute in 8 Monaten ein Team von 45 aktiven Partnern auf. Der Schlüssel: Authentizität und messbare Ergebnisse zeigen.',
  'rank_advancement',
  8,
  '{"rank": "Diamond", "monthly_income": 3500, "team_size": 45, "customer_base": 120}'::jsonb,
  'DE',
  'Bayern',
  true,
  true,
  'de',
  ARRAY['zinzino', 'team_building', 'health_results']
);

INSERT INTO company_success_stories (
  company_name, story_title, story_text, achievement_type,
  timeframe_months, metrics, location_country, verified, featured, language, tags
) VALUES (
  'Herbalife',
  '10kg Gewichtsverlust als bester Verkaufsargument',
  'Ich nutzte die Herbalife Produkte selbst und verlor 10kg in 3 Monaten. Meine Vorher-Nachher-Fotos waren mein bestes Marketing. Seitdem betreue ich 30 Kunden und habe monatlich €1.200 Nebenverdienst.',
  'product_results',
  6,
  '{"weight_loss_kg": 10, "monthly_income": 1200, "customer_base": 30}'::jsonb,
  'AT',
  true,
  false,
  'de',
  ARRAY['herbalife', 'weight_loss', 'personal_results']
);

-- ====================================================================
-- 7. VERIFICATION QUERIES
-- ====================================================================

-- Zeige alle erstellten Tabellen
SELECT 'Tables Created:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE 'company_success%' 
  OR table_name LIKE 'template_perf%'
  OR table_name LIKE 'community_%'
)
ORDER BY table_name;

-- Zeige alle Views
SELECT 'Views Created:' as status;
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'v_%'
ORDER BY table_name;

-- Count Success Stories
SELECT 'Success Stories Count:' as status, COUNT(*) as count
FROM company_success_stories;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ PHASE A INSTALLATION COMPLETE!';
  RAISE NOTICE '✅ 4 Tables created';
  RAISE NOTICE '✅ 3 Views created';
  RAISE NOTICE '✅ 2 Functions created';
  RAISE NOTICE '✅ 2 Triggers created';
  RAISE NOTICE '✅ 2 Example Success Stories inserted';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 READY FOR CURSOR INTEGRATION!';
END $$;
