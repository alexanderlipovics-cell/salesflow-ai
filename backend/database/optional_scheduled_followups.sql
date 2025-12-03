-- ═══════════════════════════════════════════════════════════════
-- OPTIONAL EXTENSION: SCHEDULED FOLLOW-UPS
-- Allows scheduling follow-ups for specific times
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  playbook_id TEXT NOT NULL REFERENCES followup_playbooks(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  
  -- Execution Details
  executed_at TIMESTAMPTZ,
  follow_up_id UUID REFERENCES follow_ups(id),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_time 
ON scheduled_followups(scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_followups_lead 
ON scheduled_followups(lead_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_followups_user 
ON scheduled_followups(user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_followups_status 
ON scheduled_followups(status);

COMMENT ON TABLE scheduled_followups IS 'Scheduled follow-ups for specific times';

-- ═══════════════════════════════════════════════════════════════
-- RPC FUNCTION: Get Pending Scheduled Follow-ups
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pending_scheduled_followups()
RETURNS TABLE (
  scheduled_followup_id UUID,
  lead_id UUID,
  lead_name TEXT,
  playbook_id TEXT,
  scheduled_at TIMESTAMPTZ,
  user_id UUID
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sf.id AS scheduled_followup_id,
    l.id AS lead_id,
    l.name AS lead_name,
    sf.playbook_id,
    sf.scheduled_at,
    sf.user_id
  FROM scheduled_followups sf
  JOIN leads l ON l.id = sf.lead_id
  WHERE sf.status = 'pending'
    AND sf.scheduled_at <= NOW()
  ORDER BY sf.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_scheduled_followups IS 'Get all pending scheduled follow-ups that should be executed now';

-- ═══════════════════════════════════════════════════════════════
-- CRON JOB: Execute Scheduled Follow-ups (Hourly)
-- ═══════════════════════════════════════════════════════════════

-- Extension needed for pg_cron
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly execution
-- SELECT cron.schedule(
--   'execute-scheduled-followups',
--   '0 * * * *',  -- Every hour
--   $$
--   -- This would call a stored procedure or edge function
--   -- that executes pending scheduled follow-ups
--   $$
-- );

