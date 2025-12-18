-- ============================================================================
-- A/B EXPERIMENT LAYER: Erweiterung von message_events für Experiment-Tracking
-- ============================================================================
-- Migration: 20251206_alter_message_events_add_experiment_fields.sql
-- Beschreibung: Fügt template_version und persona_variant für A/B-Tests hinzu
-- ============================================================================

-- Experiment-Felder hinzufügen
ALTER TABLE public.message_events
    ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS persona_variant TEXT DEFAULT NULL;

-- Kommentare für Dokumentation
COMMENT ON COLUMN public.message_events.template_version IS 
    'Version des verwendeten Templates/Prompts (z.B. v1.0, v2.0-beta)';

COMMENT ON COLUMN public.message_events.persona_variant IS 
    'Persona-Variante für A/B-Tests (z.B. default, friendly, professional, hunter)';

-- Index für Experiment-Analytics
CREATE INDEX IF NOT EXISTS idx_message_events_template_version 
    ON public.message_events(template_version) 
    WHERE template_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_events_persona_variant 
    ON public.message_events(persona_variant) 
    WHERE persona_variant IS NOT NULL;

-- Composite Index für A/B-Analyse (Version + Variant + User)
CREATE INDEX IF NOT EXISTS idx_message_events_experiment 
    ON public.message_events(user_id, template_version, persona_variant)
    WHERE template_version IS NOT NULL;

