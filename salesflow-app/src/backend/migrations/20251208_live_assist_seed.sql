-- ============================================================================
-- LIVE ASSIST SEED DATA
-- Quick Facts, Objection Responses, Vertical Knowledge für Zinzino
-- ============================================================================

-- ===================
-- QUICK FACTS (Zinzino)
-- ===================

INSERT INTO quick_facts (vertical, fact_type, fact_key, fact_value, fact_short, use_in_contexts, importance, is_key_fact, language)
VALUES 
-- USP Facts
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
-- OBJECTION RESPONSES (Zinzino)
-- ===================

INSERT INTO objection_responses (vertical, objection_type, objection_keywords, objection_example, response_short, response_full, response_technique, follow_up_question, source_type, language)
VALUES
-- PREIS
('network_marketing', 'price', 
 ARRAY['zu teuer', 'kein budget', 'kostet zu viel', 'kann mir nicht leisten', 'zu viel geld'],
 'Das ist mir zu teuer.',
 'Verstehe ich. Aber rechne mal: 1,50€ am Tag - weniger als ein Kaffee. Und du siehst in 120 Tagen schwarz auf weiß, ob''s wirkt.',
 'Das verstehe ich total. Aber lass uns mal kurz rechnen: Das sind etwa 1,50€ am Tag - weniger als ein Kaffee bei Starbucks. Der Unterschied? Nach 120 Tagen hast du einen Bluttest, der dir schwarz auf weiß zeigt, ob dein Körper sich verbessert hat. 90% sehen eine messbare Verbesserung. Bei welchem anderen Produkt bekommst du so eine Garantie?',
 'reduce_to_daily',
 'Was wäre es dir wert, wenn du wüsstest, dass dein Körper optimal versorgt ist?',
 'system', 'de'),

('network_marketing', 'price', 
 ARRAY['billiger', 'günstiger', 'amazon', 'drogerie', 'rossmann', 'dm'],
 'Bei Amazon gibt''s das billiger.',
 'Stimmt, billigere Omega-3 gibt''s überall. Aber: Macht jemand einen Bluttest vorher/nachher? Nein. Bei uns weißt du, ob''s wirkt.',
 'Ja, billigere Omega-3 Kapseln gibt''s überall. Aber hier ist der Unterschied: Weißt du bei den Billig-Produkten, ob sie überhaupt wirken? Macht jemand einen Bluttest vorher und nachher? Nein. Bei Zinzino siehst du den Beweis. Und die Qualität - Wildfischöl, keine Zuchtfische, plus Polyphenole aus Olivenöl. Das ist wie der Unterschied zwischen Fast Food und einem guten Restaurant.',
 'compare_value',
 'Was ist dir wichtiger: Der günstigste Preis oder zu wissen, dass es wirkt?',
 'system', 'de'),

-- ÜBERLEGEN
('network_marketing', 'think_about_it', 
 ARRAY['überlegen', 'drüber schlafen', 'später', 'nochmal nachdenken', 'muss schauen'],
 'Ich muss mir das nochmal überlegen.',
 'Klar, versteh ich. Was genau willst du dir überlegen? Vielleicht kann ich dir jetzt schon helfen.',
 'Verstehe ich total, ist eine Entscheidung für deine Gesundheit. Was genau möchtest du dir überlegen? Ist es der Preis, die Wirkung, oder etwas anderes? Vielleicht kann ich dir jetzt schon eine Info geben, die dir hilft.',
 'question_back',
 'Was müsste passieren, damit du heute Ja sagen könntest?',
 'system', 'de'),

-- ZEIT
('network_marketing', 'time', 
 ARRAY['keine zeit', 'zu beschäftigt', 'stressig', 'später'],
 'Ich hab gerade keine Zeit dafür.',
 'Genau deshalb! Wenn du gestresst bist, braucht dein Körper das am meisten. 10 Sekunden am Tag - Öl nehmen, fertig.',
 'Das höre ich oft. Aber ehrlich: Gerade WEIL du so beschäftigt bist, braucht dein Körper das. Stress verbrennt Omega-3 wie verrückt. Und der Aufwand? 10 Sekunden am Tag - ein Löffel Öl, fertig. Das ist weniger Aufwand als Zähneputzen.',
 'reframe',
 'Wie viel Zeit investierst du sonst in deine Gesundheit?',
 'system', 'de'),

-- VERTRAUEN / SKEPSIS
('network_marketing', 'trust', 
 ARRAY['glaub nicht', 'skeptisch', 'funktioniert nicht', 'marketing', 'zu schön'],
 'Das klingt zu gut, um wahr zu sein.',
 'Verstehe die Skepsis. Deshalb gibt''s den Bluttest - du siehst selbst, ob''s funktioniert. Kein Versprechen, nur Fakten.',
 'Die Skepsis verstehe ich total. Deshalb liebe ich Zinzino: Du musst mir nicht glauben. Du machst einen Bluttest vorher, nimmst 120 Tage das Produkt, machst den Test nochmal - und siehst selbst. Keine Marketing-Versprechen, nur deine eigenen Blutwerte. 90% sehen eine Verbesserung. Das ist Wissenschaft, nicht Wunschdenken.',
 'social_proof',
 'Was wäre, wenn du es einfach testen könntest - ohne Risiko?',
 'system', 'de'),

('network_marketing', 'trust', 
 ARRAY['mlm', 'pyramide', 'network marketing', 'schneeballsystem', 'netzwerk'],
 'Das ist doch MLM / Pyramidensystem.',
 'Verstehe die Sorge. Aber: Pyramiden haben kein Produkt. Wir haben Bluttests, Studien, echte Ergebnisse. Das Business-Modell ist optional.',
 'Das Thema verstehe ich. Aber lass mich kurz erklären: Bei einem Pyramidensystem gibt''s kein echtes Produkt, nur Geld das rumgeschoben wird. Bei Zinzino? Echte Produkte, echte Studien, echte Bluttests mit echten Ergebnissen. Die meisten Kunden sind normale Kunden, die nur das Produkt wollen. Das Business-Modell ist komplett optional.',
 'empathize_then_pivot',
 NULL,
 'system', 'de'),

-- KONKURRENZ
('network_marketing', 'competitor', 
 ARRAY['andere firma', 'schon was', 'nehme bereits', 'norsan', 'omega-3', 'bereits'],
 'Ich nehme schon Omega-3 von einer anderen Firma.',
 'Super, dass du auf Omega-3 achtest! Die Frage ist: Weißt du, ob''s wirkt? Mach den Test - wenn deine Balance gut ist, brauchst du uns nicht.',
 'Super, dass du schon auf Omega-3 achtest! Die Frage ist: Weißt du, ob dein aktuelles Produkt wirklich wirkt? Macht diese Firma einen Bluttest vorher/nachher? Bei Zinzino kannst du das checken. Wenn deine Balance schon optimal ist, brauchst du uns nicht. Aber die meisten sind überrascht, wie schlecht ihre Werte trotz Supplement sind.',
 'question_back',
 'Wärst du bereit, deine aktuelle Balance mal zu testen?',
 'system', 'de'),

-- KEIN BEDARF
('network_marketing', 'need', 
 ARRAY['brauch nicht', 'gesund', 'esse fisch', 'ernähre mich gut', 'brauch ich nicht'],
 'Ich esse genug Fisch, ich brauch das nicht.',
 'Guter Ansatz! Aber wusstest du: Selbst Leute die 3x/Woche Fisch essen, haben oft schlechte Omega-Werte. Der Test zeigt dir, wo du wirklich stehst.',
 'Das ist ein super Ansatz! Aber hier ist der Haken: Selbst Menschen, die 3x pro Woche Fisch essen, haben oft eine schlechte Omega-Balance. Warum? Weil auch Zuchtfische heute weniger Omega-3 haben, und weil wir gleichzeitig so viel Omega-6 aus anderen Quellen bekommen. Der Bluttest zeigt dir, wo du wirklich stehst - vielleicht bist du ja die Ausnahme!',
 'reframe',
 'Wärst du neugierig, deine tatsächlichen Werte zu sehen?',
 'system', 'de'),

-- KEIN INTERESSE
('network_marketing', 'not_interested', 
 ARRAY['kein interesse', 'interessiert mich nicht', 'nicht für mich'],
 'Das interessiert mich nicht.',
 'Verstehe. Darf ich fragen - was hält dich davon ab? Ist es das Thema Gesundheit generell oder speziell Omega-3?',
 'Verstehe, nicht alles ist für jeden. Darf ich nur kurz fragen: Geht''s dir um Nahrungsergänzung generell, oder speziell um Omega-3? Manchmal hör ich ''kein Interesse'' und eigentlich geht''s um was ganz anderes.',
 'question_back',
 'Was müsste ein Produkt haben, damit es dich interessiert?',
 'system', 'de');


-- ===================
-- VERTICAL KNOWLEDGE (Health & MLM)
-- ===================

INSERT INTO vertical_knowledge (vertical, knowledge_type, topic, question, answer_short, answer_full, keywords, language)
VALUES
-- Health/Supplements
('health_supplements', 'industry_fact', 'Omega-3 Mangel', 
 'Wie verbreitet ist Omega-3 Mangel?',
 '97% der Westeuropäer haben suboptimale Omega-3 Werte. Fast niemand ist optimal versorgt.',
 'Studien zeigen, dass 97% der Menschen in Westeuropa suboptimale Omega-3 Werte haben. Das liegt an unserer modernen Ernährung mit viel Omega-6 (aus Pflanzenölen, verarbeiteten Lebensmitteln) und wenig fettem Fisch. Ein optimales Verhältnis von 3:1 erreichen die wenigsten - der Durchschnitt liegt bei 15:1 oder schlechter.',
 ARRAY['omega-3', 'mangel', 'omega-6', 'verhältnis', 'balance'], 'de'),

('health_supplements', 'terminology', 'Omega 6:3 Verhältnis', 
 'Was bedeutet das Omega 6:3 Verhältnis?',
 'Verhältnis von entzündungsfördernden (Omega-6) zu entzündungshemmenden (Omega-3) Fettsäuren. Optimal: 3:1.',
 'Das Omega 6:3 Verhältnis zeigt das Gleichgewicht zwischen entzündungsfördernden Omega-6 Fettsäuren und entzündungshemmenden Omega-3 Fettsäuren im Körper. Beide sind wichtig, aber das Verhältnis sollte bei etwa 3:1 liegen. Bei den meisten Menschen ist es 15:1 oder höher - das kann chronische ''stille'' Entzündungen im Körper fördern.',
 ARRAY['omega', 'verhältnis', 'entzündung', 'balance', 'fettsäuren'], 'de'),

('health_supplements', 'faq', 'Stille Entzündungen', 
 'Was sind stille Entzündungen?',
 'Chronische, niedriggradige Entzündungen ohne Symptome. Werden mit verschiedenen Beschwerden in Verbindung gebracht.',
 'Stille Entzündungen (silent inflammation) sind chronische, niedriggradige Entzündungsprozesse im Körper, die keine spürbaren Symptome verursachen. Sie werden wissenschaftlich mit vielen chronischen Beschwerden in Verbindung gebracht. Ein gutes Omega-Verhältnis kann dazu beitragen, diese Entzündungen zu reduzieren.',
 ARRAY['entzündung', 'silent inflammation', 'chronisch'], 'de'),

('health_supplements', 'faq', 'EPA und DHA', 
 'Was sind EPA und DHA?',
 'Die wichtigsten Omega-3 Fettsäuren. EPA wirkt entzündungshemmend, DHA ist wichtig fürs Gehirn.',
 'EPA (Eicosapentaensäure) und DHA (Docosahexaensäure) sind die zwei wichtigsten Omega-3 Fettsäuren. EPA hat vor allem entzündungshemmende Eigenschaften, während DHA besonders wichtig für Gehirn und Sehfunktion ist. Der Körper kann sie nur begrenzt aus pflanzlichen Omega-3 Quellen (ALA) herstellen.',
 ARRAY['epa', 'dha', 'omega-3', 'fettsäuren', 'gehirn'], 'de'),

('health_supplements', 'regulation', 'Health Claims Verordnung', 
 'Was darf man über Nahrungsergänzungsmittel sagen?',
 'Nur zugelassene Health Claims. Keine Heilversprechen, keine Krankheitsbehauptungen.',
 'In der EU regelt die Health Claims Verordnung (EG Nr. 1924/2006), welche Aussagen über Lebensmittel und Nahrungsergänzungsmittel gemacht werden dürfen. Erlaubt sind nur zugelassene Health Claims wie ''trägt zur normalen Herzfunktion bei''. Verboten sind Heilversprechen und Behauptungen, Krankheiten zu heilen oder zu verhindern.',
 ARRAY['health claims', 'verordnung', 'erlaubt', 'verboten', 'werbung'], 'de'),

-- Network Marketing
('network_marketing', 'regulation', 'MLM vs Pyramide', 
 'Was ist der Unterschied zwischen MLM und Pyramidensystem?',
 'MLM hat echte Produkte und Endkunden. Pyramiden basieren nur auf Rekrutierung ohne echten Produktwert.',
 'Bei legitimem Network Marketing (MLM) steht ein echtes Produkt mit Endkundenwert im Mittelpunkt. Einkommen kommt primär aus Produktverkäufen. Bei illegalen Pyramidensystemen gibt es kein werthaltiges Produkt, Geld wird nur durch Rekrutierung generiert. Der Fokus liegt auf dem Anwerben neuer Teilnehmer statt auf Produktverkauf.',
 ARRAY['mlm', 'pyramide', 'network marketing', 'legal', 'illegal'], 'de'),

-- Additional Verticals: Coffee
('coffee', 'terminology', 'Arabica vs Robusta', 
 'Was ist der Unterschied zwischen Arabica und Robusta?',
 'Arabica: mild, fruchtig, 60% Weltmarkt. Robusta: kräftig, bitter, mehr Koffein.',
 'Arabica-Bohnen machen etwa 60% der Weltproduktion aus. Sie sind milder, haben fruchtige Noten und weniger Koffein. Robusta ist kräftiger, bitterer, hat fast doppelt so viel Koffein und ist robuster im Anbau.',
 ARRAY['arabica', 'robusta', 'bohnen', 'unterschied'], 'de'),

('coffee', 'faq', 'Röstgrad Bedeutung', 
 'Was bedeuten die verschiedenen Röstgrade?',
 'Hell: fruchtig, sauer. Mittel: ausgewogen. Dunkel: bitter, schokoladig, weniger Koffein.',
 'Helle Röstung bewahrt die Säure und Fruchtigkeit der Bohne. Mittlere Röstung ist ausgewogen. Dunkle Röstung bringt Bitterkeit und Schokonoten, reduziert aber tatsächlich den Koffeingehalt.',
 ARRAY['röstung', 'röstgrad', 'hell', 'dunkel', 'mittel'], 'de'),

-- Real Estate
('real_estate', 'regulation', 'Provision Käufer/Verkäufer', 
 'Wer zahlt die Maklerprovision?',
 'Seit 2020: Teilung 50/50 zwischen Käufer und Verkäufer. Max 3,57% pro Seite (inkl. MwSt).',
 'Seit dem neuen Maklergesetz 2020 wird die Provision in Deutschland geteilt. Der Verkäufer muss mindestens so viel zahlen wie der Käufer. Üblich sind 3,57% pro Seite (3% + MwSt). In einigen Bundesländern gibt es abweichende Regelungen.',
 ARRAY['provision', 'makler', 'käufer', 'verkäufer', 'teilung'], 'de'),

('real_estate', 'market_data', 'Immobilienpreise Entwicklung', 
 'Wie haben sich die Immobilienpreise entwickelt?',
 '2010-2022: Starker Anstieg. Seit 2023: Korrektur von 5-15% je nach Region.',
 'Von 2010 bis 2022 stiegen die Immobilienpreise in Deutschland um durchschnittlich 80-100%. Seit 2023 gibt es eine Korrektur durch steigende Zinsen. Je nach Region sind die Preise um 5-15% gefallen. Experten erwarten eine Stabilisierung auf dem aktuellen Niveau.',
 ARRAY['preise', 'entwicklung', 'korrektur', 'zinsen'], 'de'),

-- Finance
('finance', 'regulation', 'Beratungspflicht', 
 'Was muss bei der Finanzberatung dokumentiert werden?',
 'Beratungsprotokoll Pflicht. Eignungstest, Risikoaufklärung, Provisionsoffenlegung.',
 'Jede Finanzberatung muss dokumentiert werden: Eignungstest der Kundenbedürfnisse, Risikoaufklärung, alle Provisionen offenlegen. Der Kunde muss das Protokoll erhalten. Verstöße können zu Haftung und BaFin-Sanktionen führen.',
 ARRAY['beratungsprotokoll', 'dokumentation', 'pflicht', 'provision'], 'de');


-- ===================
-- VERIFICATION
-- ===================

SELECT 'quick_facts' as table_name, COUNT(*) as count FROM quick_facts
UNION ALL
SELECT 'objection_responses', COUNT(*) FROM objection_responses
UNION ALL
SELECT 'vertical_knowledge', COUNT(*) FROM vertical_knowledge;

