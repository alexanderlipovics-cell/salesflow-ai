ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_stage INTEGER DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_objection TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disqualified BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disqualify_reason TEXT;

COMMENT ON COLUMN leads.sales_stage IS '1=new, 2=engaged, 3=qualified, 4=problem_aware, 5=solution_fit, 6=micro_commit, 7=next_step, 8=committed, 9=follow_up, 0=disqualified';

