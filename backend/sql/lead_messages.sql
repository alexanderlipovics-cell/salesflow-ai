-- Lead Messages für Unified Inbox
-- Command Center V2 - Alle Kanäle in einem Interface

-- Erstelle Tabelle falls sie nicht existiert
CREATE TABLE IF NOT EXISTS public.lead_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Channel & Direction
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'email', 'facebook', 'sms', 'linkedin')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Content
    content TEXT NOT NULL,
    media_url TEXT,
    
    -- External IDs für Sync
    external_message_id TEXT,
    external_thread_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Meta
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Füge fehlende Spalten hinzu falls die Tabelle bereits existiert
DO $$
BEGIN
    -- Füge user_id hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN user_id UUID;
    END IF;
    
    -- Füge lead_id hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN lead_id UUID;
    END IF;
    
    -- Füge channel hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'channel'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN channel TEXT;
    END IF;
    
    -- Füge direction hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'direction'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN direction TEXT;
    END IF;
    
    -- Füge content hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN content TEXT;
    END IF;
    
    -- Füge media_url hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'media_url'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN media_url TEXT;
    END IF;
    
    -- Füge external_message_id hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'external_message_id'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN external_message_id TEXT;
    END IF;
    
    -- Füge external_thread_id hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'external_thread_id'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN external_thread_id TEXT;
    END IF;
    
    -- Füge status hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN status TEXT DEFAULT 'sent';
    END IF;
    
    -- Füge sent_at hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN sent_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Füge delivered_at hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Füge read_at hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    
    -- Füge created_at hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Füge metadata hinzu falls nicht vorhanden
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.lead_messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Foreign Keys (nur wenn die Tabellen existieren)
DO $$
BEGIN
    -- Prüfe ob leads Tabelle existiert
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        -- Füge Foreign Key hinzu falls noch nicht vorhanden
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'lead_messages_lead_id_fkey'
        ) THEN
            ALTER TABLE public.lead_messages 
            ADD CONSTRAINT lead_messages_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Indexes (nur wenn die Spalten existieren)
DO $$
BEGIN
    -- Index für lead_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'lead_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_messages' 
        AND indexname = 'idx_lead_messages_lead'
    ) THEN
        CREATE INDEX idx_lead_messages_lead ON public.lead_messages(lead_id);
    END IF;
    
    -- Index für user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_messages' 
        AND indexname = 'idx_lead_messages_user'
    ) THEN
        CREATE INDEX idx_lead_messages_user ON public.lead_messages(user_id);
    END IF;
    
    -- Index für channel (nur wenn Spalte existiert)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'channel'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_messages' 
        AND indexname = 'idx_lead_messages_channel'
    ) THEN
        CREATE INDEX idx_lead_messages_channel ON public.lead_messages(channel);
    END IF;
    
    -- Index für sent_at (nur wenn Spalte existiert)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'sent_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_messages' 
        AND indexname = 'idx_lead_messages_sent'
    ) THEN
        CREATE INDEX idx_lead_messages_sent ON public.lead_messages(sent_at DESC);
    END IF;
    
    -- Index für direction (nur wenn Spalte existiert)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'direction'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_messages' 
        AND indexname = 'idx_lead_messages_direction'
    ) THEN
        CREATE INDEX idx_lead_messages_direction ON public.lead_messages(direction);
    END IF;
END $$;

-- RLS: Erst Policy löschen falls vorhanden (bevor wir sicherstellen dass user_id existiert)
DROP POLICY IF EXISTS "Users see own messages" ON public.lead_messages;

-- RLS aktivieren
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy erstellen (nur wenn user_id Spalte existiert)
DO $$
BEGIN
    -- Prüfe ob user_id Spalte existiert bevor wir die Policy erstellen
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_messages' 
        AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "Users see own messages" ON public.lead_messages 
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Kommentare
COMMENT ON TABLE public.lead_messages IS 'Unified Message Store für alle Kanäle (WhatsApp, Instagram, Email, etc.)';
COMMENT ON COLUMN public.lead_messages.channel IS 'Kommunikationskanal';
COMMENT ON COLUMN public.lead_messages.direction IS 'Richtung: inbound (vom Lead) oder outbound (an Lead)';
COMMENT ON COLUMN public.lead_messages.external_message_id IS 'ID der Nachricht im externen System (z.B. WhatsApp Message ID)';
COMMENT ON COLUMN public.lead_messages.metadata IS 'Zusätzliche Metadaten (z.B. Read Receipts, Delivery Status)';

