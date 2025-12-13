-- Add lost_reason field to leads table for tracking why leads were lost
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN leads.lost_reason IS 'Reason why this lead was marked as lost (e.g., no_response, not_interested, wrong_contact)';
