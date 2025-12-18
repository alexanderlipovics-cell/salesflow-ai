-- Kunden-Felder für Leads (Kunde = Lead mit status='won')
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_since timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_value decimal(10,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'kunde';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS orders_count integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_order_at timestamptz;

