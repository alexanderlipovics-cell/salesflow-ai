-- ============================================================================
-- Sales Flow AI - Tabellen-Verifikation
-- ============================================================================
-- Diese Query prüft, welche Tabellen in deiner Datenbank existieren
-- ============================================================================

SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'message_templates',
  'message_sequences', 
  'sequence_steps',
  'lead_scoring_history',
  'playbooks',
  'playbook_runs',
  'objections',
  'objection_responses'
)
ORDER BY table_name;

-- ============================================================================
-- Erwartete Ergebnisse (wenn alle Schemas ausgeführt wurden):
-- ============================================================================
-- table_name              | column_count
-- ----------------------- | ------------
-- lead_scoring_history    | 5
-- message_templates       | 17
-- objection_responses     | 8
-- objections              | 10
--
-- HINWEIS: 
-- - message_sequences, sequence_steps, playbooks, playbook_runs
--   existieren nur, wenn deren Schemas separat erstellt wurden
-- ============================================================================

