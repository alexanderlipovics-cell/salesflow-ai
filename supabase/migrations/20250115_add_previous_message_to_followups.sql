-- Migration: Add previous_message and previous_message_type to followup_suggestions
-- Date: 2025-01-15
-- Description: Speichert die letzte gesendete Nachricht für kontextbezogene Follow-ups

ALTER TABLE followup_suggestions 
ADD COLUMN IF NOT EXISTS previous_message TEXT,
ADD COLUMN IF NOT EXISTS previous_message_type TEXT;

-- Kommentare hinzufügen
COMMENT ON COLUMN followup_suggestions.previous_message IS 'Die letzte gesendete Nachricht an diesen Lead, auf die das Follow-up Bezug nimmt';
COMMENT ON COLUMN followup_suggestions.previous_message_type IS 'Typ der letzten Nachricht: first_contact, product_info, follow_up, objection_handling, generic';

-- Index für bessere Performance bei Queries
CREATE INDEX IF NOT EXISTS idx_followup_previous_message_type 
ON followup_suggestions(previous_message_type) 
WHERE previous_message_type IS NOT NULL;

