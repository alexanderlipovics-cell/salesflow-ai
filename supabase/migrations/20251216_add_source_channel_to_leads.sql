-- Fügt source_channel Spalte zur leads Tabelle hinzu
-- Speichert den erkannten Messenger-Kanal (whatsapp, instagram, facebook, linkedin, telegram, sms, unknown)

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'unknown';

COMMENT ON COLUMN public.leads.source_channel IS 
    'Erkannter Messenger-Kanal aus Chat-Export: whatsapp, instagram, facebook, linkedin, telegram, sms, unknown';

-- Index für bessere Abfragen nach Channel
CREATE INDEX IF NOT EXISTS idx_leads_source_channel 
    ON public.leads (source_channel)
    WHERE source_channel IS NOT NULL AND source_channel != 'unknown';

