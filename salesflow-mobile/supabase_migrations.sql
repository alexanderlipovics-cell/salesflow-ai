-- ============================================
-- SALESFLOW MOBILE - SUPABASE MIGRATIONS
-- ============================================
-- Führe diese Queries im Supabase SQL Editor aus

-- ============================================
-- 1. COPY TRACKING (Script-Kopier-Events)
-- ============================================

-- Tabelle für Copy-Events erstellen
CREATE TABLE IF NOT EXISTS script_copy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  copied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_copy_events_script ON script_copy_events(script_id);
CREATE INDEX IF NOT EXISTS idx_copy_events_user ON script_copy_events(user_id);

-- RLS aktivieren
ALTER TABLE script_copy_events ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann inserten
DROP POLICY IF EXISTS "Anyone can insert copy events" ON script_copy_events;
CREATE POLICY "Anyone can insert copy events" ON script_copy_events
  FOR INSERT WITH CHECK (true);

-- Policy: User sieht nur eigene
DROP POLICY IF EXISTS "Users see own copy events" ON script_copy_events;
CREATE POLICY "Users see own copy events" ON script_copy_events
  FOR SELECT USING (auth.uid() = user_id);

-- Stelle sicher dass mlm_scripts copied_count hat
ALTER TABLE mlm_scripts 
ADD COLUMN IF NOT EXISTS copied_count INTEGER DEFAULT 0;


-- ============================================
-- 2. SUBSCRIPTIONS (Freemium/Pro System)
-- ============================================

-- Tabelle für User-Subscriptions erstellen
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  is_pro BOOLEAN DEFAULT false,
  plan TEXT DEFAULT 'free',
  upgraded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users können eigene Subscription lesen
DROP POLICY IF EXISTS "Users can read own subscription" ON user_subscriptions;
CREATE POLICY "Users can read own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users können eigene Subscription updaten
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users können eigene Subscription erstellen
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
CREATE POLICY "Users can insert own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================
-- OPTIONAL: Hilfs-Funktionen
-- ============================================

-- Funktion um Script-Copy-Count zu erhöhen (atomic)
CREATE OR REPLACE FUNCTION increment_script_copy_count(script_uuid TEXT)
RETURNS void AS $$
BEGIN
  UPDATE mlm_scripts 
  SET copied_count = COALESCE(copied_count, 0) + 1 
  WHERE id = script_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion um beliebte Scripts zu holen
CREATE OR REPLACE FUNCTION get_popular_scripts(limit_count INTEGER DEFAULT 10)
RETURNS SETOF mlm_scripts AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM mlm_scripts 
  ORDER BY copied_count DESC NULLS LAST 
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

