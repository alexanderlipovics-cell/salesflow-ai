-- ============================================
-- Inbox Drafts Table Setup
-- ============================================
-- 
-- Tabelle für Magic Send All Review Mode
-- Speichert Drafts die vom User reviewt werden müssen
--

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.inbox_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram', 'linkedin', 'email')),
  contact_identifier TEXT, -- Phone number, email, username, etc.
  original_message TEXT,
  draft_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_inbox_drafts_user_status 
ON public.inbox_drafts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_inbox_drafts_created_at 
ON public.inbox_drafts(created_at DESC);

-- RLS aktivieren
ALTER TABLE public.inbox_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Drafts sehen/bearbeiten
CREATE POLICY "Users can manage own drafts"
ON public.inbox_drafts FOR ALL
USING (auth.uid() = user_id);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inbox_drafts_updated_at 
BEFORE UPDATE ON public.inbox_drafts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEST-DATEN (Optional)
-- ============================================
-- 
-- Ersetze 'DEINE-USER-UUID-HIER' mit deiner tatsächlichen User-ID
-- Hole sie aus: SELECT id FROM auth.users WHERE email = 'deine@email.com';
--
-- INSERT INTO public.inbox_drafts (user_id, contact_name, platform, contact_identifier, original_message, draft_content, status)
-- VALUES 
--   ('DEINE-USER-UUID-HIER', 'Max Mustermann', 'linkedin', 'max-mustermann', 'Danke für die Vernetzung!', 'Hey Max! 👋 Danke dir auch. Ich habe gesehen, du bist auch im Vertrieb. Wie läuft Q4 bei dir?', 'pending'),
--   ('DEINE-USER-UUID-HIER', 'Lisa Müller', 'instagram', 'lisa_mueller', '🔥 Story Reaktion', 'Hey Lisa! Danke für den Support. 😊 Was machst du eigentlich beruflich?', 'pending'),
--   ('DEINE-USER-UUID-HIER', 'Fitness Studio Wien', 'email', 'info@fitness-wien.at', 'Anfrage Kooperation', 'Hallo Team Wien, ich habe euer Studio gesehen. Habt ihr Interesse an einer Corporate Health Lösung für eure Trainer?', 'pending'),
--   ('DEINE-USER-UUID-HIER', 'Markus', 'whatsapp', '+43660123456', 'Wann telefonieren wir?', 'Hi Markus, passt dir morgen 14:00 Uhr? 📅', 'pending'),
--   ('DEINE-USER-UUID-HIER', 'Sarah Schmidt', 'linkedin', 'sarah-schmidt', 'Interessantes Profil', 'Hallo Sarah, danke! Ich finde deinen Ansatz im Marketing spannend. Lass uns gerne austauschen.', 'pending');
--

