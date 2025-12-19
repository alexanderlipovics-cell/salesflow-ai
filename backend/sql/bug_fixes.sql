-- ============================================
-- Bug Fixes: Constraints & Missing Tables
-- ============================================
-- 
-- Führe diese SQL-Befehle in Supabase SQL Editor aus
--

-- ============================================
-- FIX 1: lead_interactions Constraint Update
-- ============================================

-- Prüfe aktuelle Constraint-Definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'lead_interactions'::regclass 
AND contype = 'c'
AND conname LIKE '%interaction_type%';

-- Falls message_sent fehlt, Constraint aktualisieren:
DO $$
BEGIN
  -- Entferne alten Constraint falls vorhanden
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'lead_interactions'::regclass 
    AND conname = 'lead_interactions_interaction_type_check'
  ) THEN
    ALTER TABLE lead_interactions 
    DROP CONSTRAINT lead_interactions_interaction_type_check;
  END IF;
  
  -- Füge neuen Constraint hinzu
  ALTER TABLE lead_interactions 
  ADD CONSTRAINT lead_interactions_interaction_type_check 
  CHECK (interaction_type IN (
    'note', 
    'call', 
    'email', 
    'meeting', 
    'task', 
    'status_change',
    'message_sent', 
    'message_received', 
    'follow_up', 
    'other'
  ));
END $$;

-- ============================================
-- FIX 2: power_hour_sessions Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS public.power_hour_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  leads_processed INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_power_hour_sessions_user_id 
ON public.power_hour_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_power_hour_sessions_is_active 
ON public.power_hour_sessions(is_active) WHERE is_active = true;

-- RLS aktivieren
ALTER TABLE public.power_hour_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Sessions sehen/bearbeiten
CREATE POLICY "Users manage own power hour sessions"
ON public.power_hour_sessions FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- FIX 3: user_learning_profile Tabelle
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_learning_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_channels JSONB DEFAULT '[]'::jsonb,
  best_contact_times JSONB DEFAULT '{}'::jsonb,
  successful_patterns JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_user_id 
ON public.user_learning_profile(user_id);

-- RLS aktivieren
ALTER TABLE public.user_learning_profile ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihr eigenes Profil sehen/bearbeiten
CREATE POLICY "Users manage own learning profile"
ON public.user_learning_profile FOR ALL
USING (auth.uid() = user_id);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_user_learning_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_learning_profile_updated_at ON public.user_learning_profile;

CREATE TRIGGER update_user_learning_profile_updated_at 
BEFORE UPDATE ON public.user_learning_profile
FOR EACH ROW
EXECUTE FUNCTION update_user_learning_profile_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Prüfe ob Tabellen existieren
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('power_hour_sessions', 'user_learning_profile', 'lead_interactions')
ORDER BY table_name;

-- Prüfe Constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
  'power_hour_sessions'::regclass,
  'user_learning_profile'::regclass,
  'lead_interactions'::regclass
)
AND contype = 'c'
ORDER BY conname;

-- Prüfe RLS Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('power_hour_sessions', 'user_learning_profile', 'lead_interactions')
ORDER BY tablename, policyname;

