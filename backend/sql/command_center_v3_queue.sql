-- Command Center V3 - Smart Queue System
-- Neue Spalten für Lead-Tracking und Queue-Management

-- Wartet Lead auf Antwort?
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS waiting_for_response BOOLEAN DEFAULT false;

-- Letzte eingehende Nachricht vom Lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_inbound_message TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_inbound_channel TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- Letzte Aktion des Users
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_action TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ;

-- Index für Queue-Abfragen (Performance)
CREATE INDEX IF NOT EXISTS idx_leads_waiting ON public.leads(user_id, waiting_for_response) 
WHERE waiting_for_response = true;

CREATE INDEX IF NOT EXISTS idx_leads_status_contact ON public.leads(user_id, status, last_contact_at) 
WHERE status NOT IN ('won', 'lost');

CREATE INDEX IF NOT EXISTS idx_leads_new_status ON public.leads(user_id, status) 
WHERE status = 'new' AND last_contact_at IS NULL;

-- Kommentare
COMMENT ON COLUMN public.leads.waiting_for_response IS 'Lead wartet auf Antwort - erscheint in "Action Required" Queue';
COMMENT ON COLUMN public.leads.last_inbound_message IS 'Letzte eingehende Nachricht vom Lead';
COMMENT ON COLUMN public.leads.last_inbound_channel IS 'Kanal der letzten eingehenden Nachricht (whatsapp, instagram, email, etc.)';
COMMENT ON COLUMN public.leads.last_action IS 'Letzte Aktion des Users (message_sent, call_made, later, etc.)';

