-- ============================================================================
-- LIVE ASSIST - FINAL FIX & SEED
-- ============================================================================

-- ===================
-- FIX OBJECTION_RESPONSES TABLE - Drop NOT NULL constraints
-- ===================

-- Remove NOT NULL constraints from old columns
ALTER TABLE objection_responses 
    ALTER COLUMN technique DROP NOT NULL,
    ALTER COLUMN response_script DROP NOT NULL,
    ALTER COLUMN success_rate DROP NOT NULL,
    ALTER COLUMN tone DROP NOT NULL,
    ALTER COLUMN when_to_use DROP NOT NULL,
    ALTER COLUMN objection_id DROP NOT NULL;

-- Add new columns if not exist
ALTER TABLE objection_responses 
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
    ADD COLUMN IF NOT EXISTS vertical TEXT,
    ADD COLUMN IF NOT EXISTS objection_type TEXT,
    ADD COLUMN IF NOT EXISTS objection_keywords TEXT[],
    ADD COLUMN IF NOT EXISTS objection_example TEXT,
    ADD COLUMN IF NOT EXISTS response_short TEXT,
    ADD COLUMN IF NOT EXISTS response_full TEXT,
    ADD COLUMN IF NOT EXISTS response_technique TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_question TEXT,
    ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS source_user_id UUID,
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'de',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index
CREATE INDEX IF NOT EXISTS idx_objection_responses_obj_type ON objection_responses(objection_type);

-- ===================
-- QUICK FACTS (Zinzino)
-- ===================

INSERT INTO quick_facts (vertical, fact_type, fact_key, fact_value, fact_short, use_in_contexts, importance, is_key_fact, language)
VALUES 
('network_marketing', 'differentiator', 'test_based_nutrition', 
 'Zinzino ist die einzige Firma, die Ernährung messbar macht - mit Bluttest vor und nach der Einnahme.', 
 'Einzige Firma mit Bluttest vor/nach.', 
 ARRAY['usp_pitch', 'opening', 'differentiation'], 100, true, 'de'),

('network_marketing', 'number', 'balance_improvement_rate', 
 '90% aller Nutzer verbessern ihre Omega 6:3 Balance nach 120 Tagen nachweislich.', 
 '90% verbessern in 120 Tagen.', 
 ARRAY['social_proof', 'objection_doubt', 'closing'], 95, true, 'de'),

('network_marketing', 'number', 'customers_tested', 
 'Über 1 Million Bluttests weltweit durchgeführt - größte Omega-3 Datenbank der Welt.', 
 '1 Million+ Tests, größte Omega-3 Datenbank.', 
 ARRAY['social_proof', 'trust_building'], 90, true, 'de'),

('network_marketing', 'comparison', 'average_omega_ratio', 
 'Durchschnittliche Omega 6:3 Balance in Europa: 15:1. Optimal wäre 3:1.', 
 'Europa 15:1, optimal 3:1 - die meisten sind unbalanciert.', 
 ARRAY['problem_awareness', 'opening'], 85, true, 'de'),

('network_marketing', 'benefit', 'silent_inflammation', 
 'Ein schlechtes Omega-Verhältnis fördert stille Entzündungen.', 
 'Schlechte Balance = stille Entzündungen.', 
 ARRAY['problem_awareness', 'health_angle'], 80, false, 'de'),

('network_marketing', 'benefit', 'balanceoil_polyphenols', 
 'BalanceOil+ enthält Polyphenole aus Olivenöl, die das Omega-3 schützen.', 
 'Polyphenole schützen das Omega-3 im Körper.', 
 ARRAY['product_detail', 'differentiation'], 75, false, 'de'),

('network_marketing', 'number', 'balanceoil_studies', 
 'Über 30 wissenschaftliche Studien belegen die Wirksamkeit der Zinzino-Produkte.', 
 '30+ Studien zur Wirksamkeit.', 
 ARRAY['science', 'trust_building', 'objection_doubt'], 85, true, 'de'),

('network_marketing', 'benefit', 'wild_fish_oil', 
 'Zinzino verwendet ausschließlich Wildfischöl aus nachhaltigem Fang.', 
 '100% Wildfisch, keine Zucht.', 
 ARRAY['quality', 'sustainability'], 70, false, 'de'),

('network_marketing', 'number', 'countries_active', 
 'Zinzino ist in über 100 Ländern aktiv.', 
 '100+ Länder, schnellstes Wachstum in Europa.', 
 ARRAY['business_opportunity', 'trust_building'], 70, false, 'de'),

('network_marketing', 'comparison', 'daily_cost', 
 'BalanceOil+ kostet etwa 1,50€ pro Tag - weniger als ein Kaffee, aber mit messbarer Wirkung.', 
 '1,50€/Tag - weniger als ein Kaffee.', 
 ARRAY['objection_price', 'closing'], 90, true, 'de'),

('network_marketing', 'benefit', 'vitamin_d_included', 
 'BalanceOil+ enthält bereits Vitamin D3 - kein zusätzliches Supplement nötig.', 
 'Vitamin D3 inklusive.', 
 ARRAY['product_detail', 'value'], 60, false, 'de');


-- ===================
-- OBJECTION RESPONSES (Zinzino)
-- ===================

INSERT INTO objection_responses (vertical, objection_type, objection_keywords, objection_example, response_short, response_full, response_technique, follow_up_question, source_type, language, is_active)
VALUES
('network_marketing', 'price', 
 ARRAY['zu teuer', 'kein budget', 'kostet zu viel', 'kann mir nicht leisten'],
 'Das ist mir zu teuer.',
 'Verstehe ich. Aber rechne mal: 1,50€ am Tag - weniger als ein Kaffee.',
 'Das verstehe ich. Das sind etwa 1,50€ am Tag - weniger als ein Kaffee. Und nach 120 Tagen siehst du schwarz auf weiß, ob es wirkt.',
 'reduce_to_daily',
 'Was wäre es dir wert, optimal versorgt zu sein?',
 'system', 'de', true),

('network_marketing', 'price', 
 ARRAY['billiger', 'günstiger', 'amazon', 'drogerie'],
 'Bei Amazon gibt es das billiger.',
 'Billigere Omega-3 gibt es überall. Aber: Weißt du, ob es wirkt? Bei uns gibt es den Bluttest.',
 'Ja, billigere Produkte gibt es. Aber weißt du bei denen, ob sie überhaupt wirken? Bei Zinzino siehst du den Beweis im Bluttest.',
 'compare_value',
 'Was ist dir wichtiger: Günstigster Preis oder Wissen, dass es wirkt?',
 'system', 'de', true),

('network_marketing', 'think_about_it', 
 ARRAY['überlegen', 'drüber schlafen', 'später', 'nachdenken'],
 'Ich muss mir das nochmal überlegen.',
 'Klar, versteh ich. Was genau willst du dir überlegen?',
 'Verstehe ich. Was genau möchtest du dir überlegen? Ist es der Preis, die Wirkung, oder etwas anderes?',
 'question_back',
 'Was müsste passieren, damit du heute Ja sagen könntest?',
 'system', 'de', true),

('network_marketing', 'time', 
 ARRAY['keine zeit', 'zu beschäftigt', 'stressig'],
 'Ich hab gerade keine Zeit dafür.',
 'Genau deshalb! Stress verbrennt Omega-3. Und der Aufwand? 10 Sekunden am Tag.',
 'Gerade weil du beschäftigt bist, braucht dein Körper das. Stress verbrennt Omega-3. Der Aufwand: 10 Sekunden am Tag.',
 'reframe',
 'Wie viel Zeit investierst du sonst in deine Gesundheit?',
 'system', 'de', true),

('network_marketing', 'trust', 
 ARRAY['glaub nicht', 'skeptisch', 'funktioniert nicht', 'zu schön'],
 'Das klingt zu gut, um wahr zu sein.',
 'Verstehe die Skepsis. Deshalb gibt es den Bluttest - du siehst selbst, ob es funktioniert.',
 'Die Skepsis verstehe ich. Du musst mir nicht glauben. Du machst einen Bluttest vorher und nachher - und siehst selbst.',
 'social_proof',
 'Was wäre, wenn du es einfach testen könntest?',
 'system', 'de', true),

('network_marketing', 'trust', 
 ARRAY['mlm', 'pyramide', 'network marketing', 'schneeballsystem'],
 'Das ist doch MLM / Pyramidensystem.',
 'Verstehe die Sorge. Aber: Pyramiden haben kein Produkt. Wir haben Bluttests, Studien, echte Ergebnisse.',
 'Bei einem Pyramidensystem gibt es kein echtes Produkt. Bei Zinzino? Echte Produkte, echte Studien, echte Ergebnisse.',
 'empathize_then_pivot',
 NULL,
 'system', 'de', true),

('network_marketing', 'competitor', 
 ARRAY['andere firma', 'schon was', 'nehme bereits', 'norsan'],
 'Ich nehme schon Omega-3 von einer anderen Firma.',
 'Super! Die Frage ist: Weißt du, ob es wirkt? Der Test zeigt dir, wo du stehst.',
 'Super, dass du auf Omega-3 achtest! Die Frage ist: Weißt du, ob es wirklich wirkt? Der Bluttest zeigt es dir.',
 'question_back',
 'Wärst du bereit, deine aktuelle Balance mal zu testen?',
 'system', 'de', true),

('network_marketing', 'need', 
 ARRAY['brauch nicht', 'gesund', 'esse fisch', 'ernähre mich gut'],
 'Ich esse genug Fisch, ich brauch das nicht.',
 'Guter Ansatz! Aber selbst Leute die 3x/Woche Fisch essen, haben oft schlechte Werte.',
 'Das ist super! Aber selbst Menschen, die 3x pro Woche Fisch essen, haben oft eine schlechte Balance.',
 'reframe',
 'Wärst du neugierig, deine tatsächlichen Werte zu sehen?',
 'system', 'de', true),

('network_marketing', 'not_interested', 
 ARRAY['kein interesse', 'interessiert mich nicht', 'nicht für mich'],
 'Das interessiert mich nicht.',
 'Verstehe. Darf ich fragen - was hält dich davon ab?',
 'Verstehe, nicht alles ist für jeden. Geht es dir um Nahrungsergänzung generell, oder speziell Omega-3?',
 'question_back',
 'Was müsste ein Produkt haben, damit es dich interessiert?',
 'system', 'de', true);


-- ===================
-- VERTICAL KNOWLEDGE
-- ===================

INSERT INTO vertical_knowledge (vertical, knowledge_type, topic, question, answer_short, answer_full, keywords, language)
VALUES
('health_supplements', 'industry_fact', 'Omega-3 Mangel', 
 'Wie verbreitet ist Omega-3 Mangel?',
 '97% der Westeuropäer haben suboptimale Omega-3 Werte.',
 'Studien zeigen, dass 97% der Menschen in Westeuropa suboptimale Omega-3 Werte haben.',
 ARRAY['omega-3', 'mangel', 'omega-6', 'balance'], 'de'),

('health_supplements', 'terminology', 'Omega 6:3 Verhältnis', 
 'Was bedeutet das Omega 6:3 Verhältnis?',
 'Verhältnis von Omega-6 zu Omega-3 Fettsäuren. Optimal: 3:1.',
 'Das Verhältnis zeigt das Gleichgewicht zwischen Omega-6 und Omega-3. Optimal wäre 3:1, die meisten haben 15:1.',
 ARRAY['omega', 'verhältnis', 'balance', 'fettsäuren'], 'de'),

('health_supplements', 'faq', 'Stille Entzündungen', 
 'Was sind stille Entzündungen?',
 'Chronische, niedriggradige Entzündungen ohne Symptome.',
 'Stille Entzündungen sind chronische Entzündungsprozesse ohne spürbare Symptome.',
 ARRAY['entzündung', 'silent inflammation', 'chronisch'], 'de'),

('health_supplements', 'faq', 'EPA und DHA', 
 'Was sind EPA und DHA?',
 'Die wichtigsten Omega-3 Fettsäuren. EPA: entzündungshemmend, DHA: Gehirn.',
 'EPA und DHA sind die wichtigsten Omega-3 Fettsäuren.',
 ARRAY['epa', 'dha', 'omega-3', 'fettsäuren'], 'de'),

('network_marketing', 'regulation', 'MLM vs Pyramide', 
 'Was ist der Unterschied zwischen MLM und Pyramidensystem?',
 'MLM hat echte Produkte. Pyramiden basieren nur auf Rekrutierung.',
 'Bei legitimem MLM steht ein echtes Produkt im Mittelpunkt. Bei Pyramidensystemen gibt es kein Produkt.',
 ARRAY['mlm', 'pyramide', 'network marketing', 'legal'], 'de'),

('coffee', 'terminology', 'Arabica vs Robusta', 
 'Was ist der Unterschied zwischen Arabica und Robusta?',
 'Arabica: mild, fruchtig. Robusta: kräftig, mehr Koffein.',
 'Arabica ist milder und fruchtiger. Robusta ist kräftiger mit mehr Koffein.',
 ARRAY['arabica', 'robusta', 'bohnen'], 'de'),

('real_estate', 'regulation', 'Provision', 
 'Wer zahlt die Maklerprovision?',
 'Seit 2020: Teilung 50/50 zwischen Käufer und Verkäufer.',
 'Seit dem Maklergesetz 2020 wird die Provision geteilt.',
 ARRAY['provision', 'makler', 'käufer', 'verkäufer'], 'de'),

('finance', 'regulation', 'Beratungspflicht', 
 'Was muss bei der Finanzberatung dokumentiert werden?',
 'Beratungsprotokoll Pflicht. Eignungstest, Risikoaufklärung.',
 'Jede Finanzberatung muss dokumentiert werden.',
 ARRAY['beratungsprotokoll', 'dokumentation', 'pflicht'], 'de');


-- ===================
-- VERIFICATION
-- ===================

SELECT 'quick_facts' as table_name, COUNT(*) as count FROM quick_facts
UNION ALL
SELECT 'objection_responses', COUNT(*) FROM objection_responses
UNION ALL
SELECT 'vertical_knowledge', COUNT(*) FROM vertical_knowledge;

