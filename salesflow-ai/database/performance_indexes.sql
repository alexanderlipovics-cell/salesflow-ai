-- =============================================
-- PERFORMANCE INDEXES FOR SALESFLOW
-- Run this in Supabase SQL Editor
-- =============================================

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_temp 
    ON public.leads(user_id, temperature);

CREATE INDEX IF NOT EXISTS idx_leads_user_status 
    ON public.leads(user_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_user_created 
    ON public.leads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_user_followup 
    ON public.leads(user_id, next_follow_up)
    WHERE next_follow_up IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_user_name 
    ON public.leads(user_id, name);

-- Finance transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
    ON public.finance_transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
    ON public.finance_transactions(user_id, tx_type);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category 
    ON public.finance_transactions(user_id, category);

-- Sequence enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status 
    ON public.sequence_enrollments(user_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_next_action 
    ON public.sequence_enrollments(user_id, next_action_date, status)
    WHERE status = 'active';

-- Power hour sessions
CREATE INDEX IF NOT EXISTS idx_power_hour_user_active 
    ON public.power_hour_sessions(user_id, is_active)
    WHERE is_active = true;

-- Messages (if exists)
CREATE INDEX IF NOT EXISTS idx_messages_lead 
    ON public.messages(lead_id, created_at DESC);

-- Analyze tables to update query planner
ANALYZE public.leads;
ANALYZE public.finance_transactions;
ANALYZE public.sequence_enrollments;
ANALYZE public.power_hour_sessions;

SELECT 'Performance indexes created successfully!' as status;

