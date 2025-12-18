-- Erweitere Status-Check für followup_suggestions
ALTER TABLE followup_suggestions DROP CONSTRAINT IF EXISTS followup_suggestions_status_check;

ALTER TABLE followup_suggestions
ADD CONSTRAINT followup_suggestions_status_check
CHECK (status IN (
  'pending',
  'sent',
  'skipped',
  'snoozed',
  'completed',
  'done',
  'no_response',
  'failed'
));

