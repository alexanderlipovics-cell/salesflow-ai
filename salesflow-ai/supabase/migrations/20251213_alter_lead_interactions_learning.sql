-- Erweiterte Felder für Gesprächsprotokolle
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral';
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS key_facts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS objections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS next_steps TEXT;
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS budget_mentioned DECIMAL(10,2);
ALTER TABLE lead_interactions ADD COLUMN IF NOT EXISTS timeline_mentioned TEXT;

