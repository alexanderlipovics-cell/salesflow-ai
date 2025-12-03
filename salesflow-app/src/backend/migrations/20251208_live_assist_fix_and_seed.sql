-- ============================================================================
-- LIVE ASSIST - FIX OBJECTION_RESPONSES & SEED DATA
-- ============================================================================

-- ===================
-- FIX OBJECTION_RESPONSES TABLE
-- ===================

-- Add missing columns to objection_responses
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

-- Create index on objection_type if not exists
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
 'Durchschnittliche Omega 6:3 Balance in Europa: 15:1. Optimal wäre 3:1. Die meisten sind massiv im Ungleichgewicht.', 
 'Europa 15:1, optimal 3:1 - die meisten sind unbalanciert.', 
 ARRAY['problem_awareness', 'opening'], 85, true, 'de'),

('network_marketing', 'benefit', 'silent_inflammation', 
 'Ein schlechtes Omega-Verhältnis fördert stille Entzündungen - Ursache für viele chronische Beschwerden.', 
 'Schlechte Balance = stille Entzündungen.', 
 ARRAY['problem_awareness', 'health_angle'], 80, false, 'de'),

('network_marketing', 'benefit', 'balanceoil_polyphenols', 
 'BalanceOil+ enthält Polyphenole aus Olivenöl, die die Oxidation des Omega-3 im Körper verhindern.', 
 'Polyphenole schützen das Omega-3 im Körper.', 
 ARRAY['product_detail', 'differentiation'], 75, false, 'de'),

('network_marketing', 'number', 'balanceoil_studies', 
 'Über 30 wissenschaftliche Studien belegen die Wirksamkeit der Zinzino-Produkte.', 
 '30+ Studien zur Wirksamkeit.', 
 ARRAY['science', 'trust_building', 'objection_doubt'], 85, true, 'de'),

('network_marketing', 'benefit', 'wild_fish_oil', 
 'Zinzino verwendet ausschließlich Wildfischöl aus nachhaltigem Fang - keine Zuchtfische.', 
 '100% Wildfisch, keine Zucht.', 
 ARRAY['quality', 'sustainability'], 70, false, 'de'),

('network_marketing', 'number', 'countries_active', 
 'Zinzino ist in über 100 Ländern aktiv und eines der am schnellsten wachsenden Health-Tech-Unternehmen Europas.', 
 '100+ Länder, schnellstes Wachstum in Europa.', 
 ARRAY['business_opportunity', 'trust_building'], 70, false, 'de'),

('network_marketing', 'differentiator', 'subscription_model', 
 'Abo-Modell mit automatischer Lieferung alle 30-60-90 Tage. Kein Mindestbestellwert, jederzeit kündbar.', 
 'Flexibles Abo, jederzeit kündbar.', 
 ARRAY['pricing', 'objection_commitment'], 65, false, 'de'),

('network_marketing', 'comparison', 'daily_cost', 
 'BalanceOil+ kostet etwa 1,50€ pro Tag - weniger als ein Kaffee, aber mit messbarer Wirkung.', 
 '1,50€/Tag - weniger als ein Kaffee.', 
 ARRAY['objection_price', 'closing'], 90, true, 'de'),

('network_marketing', 'benefit', 'vitamin_d_included', 
 'BalanceOil+ enthält bereits Vitamin D3 - kein zusätzliches Supplement nötig.', 
 'Vitamin D3 inklusive.', 
 ARRAY['product_detail', 'value'], 60, false, 'de');


-- ===================
-- OBJECTION RESPONSES (Zinzino) - Use new columns
-- ===================

INSERT INTO objection_responses (vertical, objection_type, objection_keywords, objection_example, response_short, response_full, response_technique, follow_up_question, source_type, language)
VALUES
('network_marketing', 'price', 
 ARRAY['zu teuer', 'kein budget', 'kostet zu viel', 'kann mir nicht leisten', 'zu viel geld'],
 'Das ist mir zu teuer.',
 'Verstehe ich. Aber rechne mal: 1,50€ am Tag - weniger als ein Kaffee. Und du siehst in 120 Tagen schwarz auf weiß, ob''s wirkt.',
 'Das verstehe ich total. Aber lass uns mal kurz rechnen: Das sind etwa 1,50€ am Tag - weniger als ein Kaffee bei Starbucks. Der Unterschied? Nach 120 Tagen hast du einen Bluttest, der dir schwarz auf weiß zeigt, ob dein Körper sich verbessert hat. 90% sehen eine messbare Verbesserung. Bei welchem anderen Produkt bekommst du so eine Garantie?',
 'reduce_to_daily',
 'Was wäre es dir wert, wenn du wüsstest, dass dein Körper optimal versorgt ist?',
 'system', 'de'),

('network_marketing', 'price', 
 ARRAY['billiger', 'günstiger', 'amazon', 'drogerie'],
 'Bei Amazon gibt''s das billiger.',
 'Stimmt, billigere Omega-3 gibt''s überall. Aber: Macht jemand einen Bluttest vorher/nachher? Nein. Bei uns weißt du, ob''s wirkt.',
 'Ja, billigere Omega-3 Kapseln gibt''s überall. Aber hier ist der Unterschied: Weißt du bei den Billig-Produkten, ob sie überhaupt wirken? Macht jemand einen Bluttest vorher und nachher? Nein. Bei Zinzino siehst du den Beweis.',
 'compare_value',
 'Was ist dir wichtiger: Der günstigste Preis oder zu wissen, dass es wirkt?',
 'system', 'de'),

('network_marketing', 'think_about_it', 
 ARRAY['überlegen', 'drüber schlafen', 'später', 'nochmal nachdenken'],
 'Ich muss mir das nochmal überlegen.',
 'Klar, versteh ich. Was genau willst du dir überlegen? Vielleicht kann ich dir jetzt schon helfen.',
 'Verstehe ich total, ist eine Entscheidung für deine Gesundheit. Was genau möchtest du dir überlegen? Ist es der Preis, die Wirkung, oder etwas anderes?',
 'question_back',
 'Was müsste passieren, damit du heute Ja sagen könntest?',
 'system', 'de'),

('network_marketing', 'time', 
 ARRAY['keine zeit', 'zu beschäftigt', 'stressig'],
 'Ich hab gerade keine Zeit dafür.',
 'Genau deshalb! Wenn du gestresst bist, braucht dein Körper das am meisten. 10 Sekunden am Tag - Öl nehmen, fertig.',
 'Das höre ich oft. Aber ehrlich: Gerade WEIL du so beschäftigt bist, braucht dein Körper das. Stress verbrennt Omega-3 wie verrückt. Und der Aufwand? 10 Sekunden am Tag.',
 'reframe',
 'Wie viel Zeit investierst du sonst in deine Gesundheit?',
 'system', 'de'),

('network_marketing', 'trust', 
 ARRAY['glaub nicht', 'skeptisch', 'funktioniert nicht', 'zu schön'],
 'Das klingt zu gut, um wahr zu sein.',
 'Verstehe die Skepsis. Deshalb gibt''s den Bluttest - du siehst selbst, ob''s funktioniert. Kein Versprechen, nur Fakten.',
 'Die Skepsis verstehe ich total. Deshalb liebe ich Zinzino: Du musst mir nicht glauben. Du machst einen Bluttest vorher, nimmst 120 Tage das Produkt, machst den Test nochmal - und siehst selbst.',
 'social_proof',
 'Was wäre, wenn du es einfach testen könntest - ohne Risiko?',
 'system', 'de'),

('network_marketing', 'trust', 
 ARRAY['mlm', 'pyramide', 'network marketing', 'schneeballsystem'],
 'Das ist doch MLM / Pyramidensystem.',
 'Verstehe die Sorge. Aber: Pyramiden haben kein Produkt. Wir haben Bluttests, Studien, echte Ergebnisse. Das Business-Modell ist optional.',
 'Das Thema verstehe ich. Aber lass mich kurz erklären: Bei einem Pyramidensystem gibt''s kein echtes Produkt. Bei Zinzino? Echte Produkte, echte Studien, echte Bluttests mit echten Ergebnissen.',
 'empathize_then_pivot',
 NULL,
 'system', 'de'),

('network_marketing', 'competitor', 
 ARRAY['andere firma', 'schon was', 'nehme bereits', 'norsan'],
 'Ich nehme schon Omega-3 von einer anderen Firma.',
 'Super, dass du auf Omega-3 achtest! Die Frage ist: Weißt du, ob''s wirkt? Mach den Test - wenn deine Balance gut ist, brauchst du uns nicht.',
 'Super, dass du schon auf Omega-3 achtest! Die Frage ist: Weißt du, ob dein aktuelles Produkt wirklich wirkt? Macht diese Firma einen Bluttest vorher/nachher?',
 'question_back',
 'Wärst du bereit, deine aktuelle Balance mal zu testen?',
 'system', 'de'),

('network_marketing', 'need', 
 ARRAY['brauch nicht', 'gesund', 'esse fisch', 'ernähre mich gut'],
 'Ich esse genug Fisch, ich brauch das nicht.',
 'Guter Ansatz! Aber wusstest du: Selbst Leute die 3x/Woche Fisch essen, haben oft schlechte Omega-Werte. Der Test zeigt dir, wo du wirklich stehst.',
 'Das ist ein super Ansatz! Aber hier ist der Haken: Selbst Menschen, die 3x pro Woche Fisch essen, haben oft eine schlechte Omega-Balance.',
 'reframe',
 'Wärst du neugierig, deine tatsächlichen Werte zu sehen?',
 'system', 'de'),

('network_marketing', 'not_interested', 
 ARRAY['kein interesse', 'interessiert mich nicht', 'nicht für mich'],
 'Das interessiert mich nicht.',
 'Verstehe. Darf ich fragen - was hält dich davon ab? Ist es das Thema Gesundheit generell oder speziell Omega-3?',
 'Verstehe, nicht alles ist für jeden. Darf ich nur kurz fragen: Geht''s dir um Nahrungsergänzung generell, oder speziell um Omega-3?',
 'question_back',
 'Was müsste ein Produkt haben, damit es dich interessiert?',
 'system', 'de');


-- ===================
-- VERTICAL KNOWLEDGE (Health & MLM)
-- ===================

INSERT INTO vertical_knowledge (vertical, knowledge_type, topic, question, answer_short, answer_full, keywords, language)
VALUES
('health_supplements', 'industry_fact', 'Omega-3 Mangel', 
 'Wie verbreitet ist Omega-3 Mangel?',
 '97% der Westeuropäer haben suboptimale Omega-3 Werte. Fast niemand ist optimal versorgt.',
 'Studien zeigen, dass 97% der Menschen in Westeuropa suboptimale Omega-3 Werte haben. Das liegt an unserer modernen Ernährung mit viel Omega-6 und wenig fettem Fisch.',
 ARRAY['omega-3', 'mangel', 'omega-6', 'verhältnis', 'balance'], 'de'),

('health_supplements', 'terminology', 'Omega 6:3 Verhältnis', 
 'Was bedeutet das Omega 6:3 Verhältnis?',
 'Verhältnis von entzündungsfördernden (Omega-6) zu entzündungshemmenden (Omega-3) Fettsäuren. Optimal: 3:1.',
 'Das Omega 6:3 Verhältnis zeigt das Gleichgewicht zwischen Omega-6 und Omega-3 Fettsäuren. Optimal wäre 3:1, die meisten haben 15:1 oder schlechter.',
 ARRAY['omega', 'verhältnis', 'entzündung', 'balance', 'fettsäuren'], 'de'),

('health_supplements', 'faq', 'Stille Entzündungen', 
 'Was sind stille Entzündungen?',
 'Chronische, niedriggradige Entzündungen ohne Symptome. Werden mit verschiedenen Beschwerden in Verbindung gebracht.',
 'Stille Entzündungen (silent inflammation) sind chronische Entzündungsprozesse ohne spürbare Symptome. Ein gutes Omega-Verhältnis kann helfen, diese zu reduzieren.',
 ARRAY['entzündung', 'silent inflammation', 'chronisch'], 'de'),

('health_supplements', 'faq', 'EPA und DHA', 
 'Was sind EPA und DHA?',
 'Die wichtigsten Omega-3 Fettsäuren. EPA wirkt entzündungshemmend, DHA ist wichtig fürs Gehirn.',
 'EPA und DHA sind die zwei wichtigsten Omega-3 Fettsäuren. EPA hat entzündungshemmende Eigenschaften, DHA ist wichtig für Gehirn und Sehfunktion.',
 ARRAY['epa', 'dha', 'omega-3', 'fettsäuren', 'gehirn'], 'de'),

('health_supplements', 'regulation', 'Health Claims Verordnung', 
 'Was darf man über Nahrungsergänzungsmittel sagen?',
 'Nur zugelassene Health Claims. Keine Heilversprechen, keine Krankheitsbehauptungen.',
 'Die EU Health Claims Verordnung regelt, welche Aussagen erlaubt sind. Verboten sind Heilversprechen und Behauptungen, Krankheiten zu heilen.',
 ARRAY['health claims', 'verordnung', 'erlaubt', 'verboten', 'werbung'], 'de'),

('network_marketing', 'regulation', 'MLM vs Pyramide', 
 'Was ist der Unterschied zwischen MLM und Pyramidensystem?',
 'MLM hat echte Produkte und Endkunden. Pyramiden basieren nur auf Rekrutierung ohne echten Produktwert.',
 'Bei legitimem Network Marketing steht ein echtes Produkt im Mittelpunkt. Bei illegalen Pyramidensystemen gibt es kein werthaltiges Produkt.',
 ARRAY['mlm', 'pyramide', 'network marketing', 'legal', 'illegal'], 'de'),

('coffee', 'terminology', 'Arabica vs Robusta', 
 'Was ist der Unterschied zwischen Arabica und Robusta?',
 'Arabica: mild, fruchtig, 60% Weltmarkt. Robusta: kräftig, bitter, mehr Koffein.',
 'Arabica-Bohnen sind milder, fruchtiger mit weniger Koffein. Robusta ist kräftiger, bitterer mit fast doppelt so viel Koffein.',
 ARRAY['arabica', 'robusta', 'bohnen', 'unterschied'], 'de'),

('real_estate', 'regulation', 'Provision Käufer/Verkäufer', 
 'Wer zahlt die Maklerprovision?',
 'Seit 2020: Teilung 50/50 zwischen Käufer und Verkäufer. Max 3,57% pro Seite (inkl. MwSt).',
 'Seit dem neuen Maklergesetz 2020 wird die Provision geteilt. Der Verkäufer muss mindestens so viel zahlen wie der Käufer.',
 ARRAY['provision', 'makler', 'käufer', 'verkäufer', 'teilung'], 'de'),

('finance', 'regulation', 'Beratungspflicht', 
 'Was muss bei der Finanzberatung dokumentiert werden?',
 'Beratungsprotokoll Pflicht. Eignungstest, Risikoaufklärung, Provisionsoffenlegung.',
 'Jede Finanzberatung muss dokumentiert werden: Eignungstest, Risikoaufklärung, alle Provisionen offenlegen.',
 ARRAY['beratungsprotokoll', 'dokumentation', 'pflicht', 'provision'], 'de');


-- ===================
-- VERIFICATION
-- ===================

SELECT 'quick_facts' as table_name, COUNT(*) as count FROM quick_facts
UNION ALL
SELECT 'objection_responses', COUNT(*) FROM objection_responses
UNION ALL
SELECT 'vertical_knowledge', COUNT(*) FROM vertical_knowledge;

