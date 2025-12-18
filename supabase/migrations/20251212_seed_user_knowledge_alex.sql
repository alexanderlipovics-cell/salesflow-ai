-- Seed spezifische user_knowledge Einträge für Alex Lipovics
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user_knowledge'
    ) THEN
        -- Absichern, dass die benötigten Spalten vorhanden sind
        EXECUTE 'ALTER TABLE public.user_knowledge ADD COLUMN IF NOT EXISTS category TEXT';
        EXECUTE 'ALTER TABLE public.user_knowledge ADD COLUMN IF NOT EXISTS content TEXT';
        EXECUTE 'ALTER TABLE public.user_knowledge ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()';

        -- Alex Lipovics Basiseinträge
        INSERT INTO public.user_knowledge (user_id, category, content, created_at)
        SELECT '2a301883-f35d-468d-bbc9-c30c2431d7f0', 'identity', 'Name: Alex Lipovics, Gründer von Sales Flow AI', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_knowledge
            WHERE user_id = '2a301883-f35d-468d-bbc9-c30c2431d7f0'
              AND category = 'identity'
              AND content = 'Name: Alex Lipovics, Gründer von Sales Flow AI'
        );

        INSERT INTO public.user_knowledge (user_id, category, content, created_at)
        SELECT '2a301883-f35d-468d-bbc9-c30c2431d7f0', 'company', 'Sales Flow AI - KI-CRM für Sales-Profis', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_knowledge
            WHERE user_id = '2a301883-f35d-468d-bbc9-c30c2431d7f0'
              AND category = 'company'
              AND content = 'Sales Flow AI - KI-CRM für Sales-Profis'
        );

        INSERT INTO public.user_knowledge (user_id, category, content, created_at)
        SELECT '2a301883-f35d-468d-bbc9-c30c2431d7f0', 'product', 'Sales Flow AI verkaufen/demonstrieren', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_knowledge
            WHERE user_id = '2a301883-f35d-468d-bbc9-c30c2431d7f0'
              AND category = 'product'
              AND content = 'Sales Flow AI verkaufen/demonstrieren'
        );

        INSERT INTO public.user_knowledge (user_id, category, content, created_at)
        SELECT '2a301883-f35d-468d-bbc9-c30c2431d7f0', 'style', 'Locker, per Du, kurz und prägnant', NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_knowledge
            WHERE user_id = '2a301883-f35d-468d-bbc9-c30c2431d7f0'
              AND category = 'style'
              AND content = 'Locker, per Du, kurz und prägnant'
        );
    ELSE
        RAISE NOTICE '⚠️ Tabelle user_knowledge existiert nicht – Seed wird übersprungen';
    END IF;
END $$;

