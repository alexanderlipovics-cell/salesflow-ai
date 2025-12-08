CREATE TABLE IF NOT EXISTS public.objection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ergänzende Spalten (idempotent, falls Tabelle schon existiert)
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS objection_key TEXT;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS objection_category TEXT;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS response_template TEXT;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS response_strategy TEXT;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '[]';
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS tips TEXT;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0;
ALTER TABLE public.objection_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0; -- legacy compat

-- Unique Index für Keys (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS objection_templates_objection_key_idx ON public.objection_templates (objection_key);

CREATE TABLE IF NOT EXISTS public.user_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objection_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_objections ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.user_objections ADD COLUMN IF NOT EXISTS best_response TEXT;
ALTER TABLE public.user_objections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.user_objections ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE public.user_objections ADD COLUMN IF NOT EXISTS fail_count INTEGER DEFAULT 0;

-- RLS
ALTER TABLE public.objection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_objections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates" ON public.objection_templates
    FOR SELECT USING (true);

CREATE POLICY "Users manage own objections" ON public.user_objections
    FOR ALL USING (auth.uid() = user_id);

-- Insert/Upsert default objections (einzeln, robust gegen Copy/Paste)
DO $$
BEGIN
    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'too_expensive', 'Das ist mir zu teuer', 'price',
        'Ich verstehe den Punkt. Darf ich fragen: Zu teuer im Vergleich wozu?',
        'Nie den Preis verteidigen, sondern Wert/ROI reframen.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'no_time', 'Ich habe keine Zeit', 'time',
        'Gerade weil du wenig Zeit hast: Das spart dir [X] Stunden pro Woche. Wann passt ein 10-Min-Call?',
        'Zeit-Einwand = Priorität. Zeige Zeitgewinn und mache kleinen nächsten Schritt.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'need_to_think', 'Ich muss noch darüber nachdenken', 'trust',
        'Klar. Was genau möchtest du noch prüfen? Dann kann ich dir gezielt helfen.',
        'Meist fehlt Info/Trust. Nach konkretem Hinderungsgrund fragen.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'not_interested', 'Kein Interesse', 'need',
        'Verstehe. Was hättest du dir erhofft? Dann sehe ich, ob wir das liefern.',
        'Bedarf klären, Erwartung abholen, nächsten Fit prüfen.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'spouse_decision', 'Muss mit Partner/Chef besprechen', 'authority',
        'Gerne. Sollen wir einen kurzen gemeinsamen Termin machen, damit alle Fragen geklärt sind?',
        'Entscheider einbeziehen, wichtigstes Argument für die Person herausarbeiten.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'bad_timing', 'Jetzt ist ein schlechter Zeitpunkt', 'time',
        'Verstehe. Was macht das Timing schwierig? Ich halte dir gern einen Termin frei, der besser passt.',
        'Timing konkretisieren, Follow-up fixieren, ggf. Nutzen gerade jetzt reframen.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'had_bad_experience', 'Habe schlechte Erfahrungen gemacht', 'trust',
        'Tut mir leid zu hören. Was genau ist passiert? Ich zeige dir, was wir anders machen (inkl. Garantie/Test).',
        'Zuhören, Verständnis zeigen, Sicherheit bieten.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.objection_templates (
        objection_key, objection_text, objection_category, response_template, response_strategy, times_used, is_active
    ) VALUES (
        'is_this_mlm', 'Ist das MLM/Schneeballsystem?', 'trust',
        'Gute Frage. Fokus liegt auf dem Produkt – Verdienst kommt aus Produktumsatz, nicht nur Recruiting. Was genau macht dir Sorge?',
        'Produkt in den Vordergrund, Skepsis adressieren, offen fragen.',
        0, true
    )
    ON CONFLICT (objection_key) DO UPDATE SET
        objection_text = EXCLUDED.objection_text,
        objection_category = EXCLUDED.objection_category,
        response_template = EXCLUDED.response_template,
        response_strategy = EXCLUDED.response_strategy,
        is_active = EXCLUDED.is_active;
END $$;

