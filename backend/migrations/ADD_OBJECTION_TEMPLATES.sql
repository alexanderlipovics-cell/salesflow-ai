-- Erstelle objection_templates Tabelle

CREATE TABLE IF NOT EXISTS objection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID,
    
    objection_text TEXT NOT NULL,
    objection_category TEXT NOT NULL,
    
    response_template TEXT NOT NULL,
    response_strategy TEXT,
    
    follow_up_question TEXT,
    bridge_to_close TEXT,
    
    key TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    
    times_used INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2),
    
    is_system BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    vertical TEXT DEFAULT 'all',
    language TEXT DEFAULT 'de',
    
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_objection_templates_category ON objection_templates(objection_category);
CREATE INDEX IF NOT EXISTS idx_objection_templates_user ON objection_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_objection_templates_status ON objection_templates(status);

-- RLS
ALTER TABLE objection_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Jeder kann System-Templates sehen, User sehen eigene
DROP POLICY IF EXISTS "objection_templates_select" ON objection_templates;
CREATE POLICY "objection_templates_select" ON objection_templates 
    FOR SELECT USING (is_system = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "objection_templates_insert" ON objection_templates;
CREATE POLICY "objection_templates_insert" ON objection_templates 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "objection_templates_update" ON objection_templates;
CREATE POLICY "objection_templates_update" ON objection_templates 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "objection_templates_delete" ON objection_templates;
CREATE POLICY "objection_templates_delete" ON objection_templates 
    FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Demo-Daten: System-Templates
INSERT INTO objection_templates (objection_text, objection_category, response_template, is_system, language) VALUES
('Das ist zu teuer', 'price', 'Ich verstehe. Wenn wir aber mal rechnen: Bei 3 zusätzlichen Abschlüssen pro Monat, wie viel wäre das wert?', true, 'de'),
('Ich habe keine Zeit', 'time', 'Total verständlich. Genau deshalb spart dir das System Zeit - wieviel Zeit verbringst du aktuell mit Follow-ups?', true, 'de'),
('Ich muss noch darüber nachdenken', 'delay', 'Natürlich! Was genau möchtest du dir nochmal durch den Kopf gehen lassen?', true, 'de'),
('Ich bin nicht interessiert', 'rejection', 'Kein Problem. Darf ich fragen, was dich an deiner aktuellen Lösung überzeugt?', true, 'de'),
('Ich habe schon ein CRM', 'competition', 'Super! Sales Flow AI ersetzt kein CRM - es ist der KI-Copilot NEBEN deinem CRM. Wie zufrieden bist du mit den Follow-ups?', true, 'de')
ON CONFLICT (key) DO NOTHING;

SELECT 'objection_templates erstellt!' AS status;

