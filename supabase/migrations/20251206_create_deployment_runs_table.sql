-- ============================================
-- MIGRATION: Create Deployment Runs Table
-- Datum: 06. Dezember 2025
-- Beschreibung: AI-powered deployment tracking
-- ============================================

-- Tabelle für AI-gestützte Deployment-Runs
CREATE TABLE IF NOT EXISTS public.deployment_runs (
    id SERIAL PRIMARY KEY,
    version VARCHAR(64) NOT NULL,
    strategy VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    risk_level VARCHAR(16) NOT NULL,
    risk_score INTEGER NOT NULL,
    analysis JSONB,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_deployment_runs_version ON public.deployment_runs(version);
CREATE INDEX IF NOT EXISTS idx_deployment_runs_status ON public.deployment_runs(status);
CREATE INDEX IF NOT EXISTS idx_deployment_runs_created_at ON public.deployment_runs(created_at DESC);

-- Kommentare
COMMENT ON TABLE public.deployment_runs IS 'Tracks AI-powered deployment runs with risk analysis';
COMMENT ON COLUMN public.deployment_runs.version IS 'Git version/tag being deployed';
COMMENT ON COLUMN public.deployment_runs.strategy IS 'Deployment strategy: canary/blue-green/rolling';
COMMENT ON COLUMN public.deployment_runs.status IS 'Deployment status: pending/running/success/failed';
COMMENT ON COLUMN public.deployment_runs.risk_level IS 'AI-calculated risk level: low/medium/high';
COMMENT ON COLUMN public.deployment_runs.risk_score IS 'AI-calculated risk score 0-100';
COMMENT ON COLUMN public.deployment_runs.analysis IS 'Complete AI risk analysis with recommendations';
COMMENT ON COLUMN public.deployment_runs.results IS 'Deployment results and step-by-step outcomes';

-- RLS Policy (falls RLS aktiviert ist)
-- ALTER TABLE public.deployment_runs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Admins can view all deployments" ON public.deployment_runs
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
