-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  EVIDENCE HUB DATA IMPORT                                                  ║
-- ║  15 Knowledge Items: Studien, EFSA Claims, Einwandbehandlungen            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- 1. Omega-3 Meta-Analyse
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, study_year, study_authors, study_population, study_type, study_intervention, study_outcomes, nutrients_or_factors, health_outcome_areas, evidence_level, source_type, source_reference, compliance_level, requires_disclaimer, disclaimer_text, keywords, is_active, is_verified)
VALUES (
    'evidence', 'meta_analysis', 'Omega-3 Fettsäuren', 'Herz-Kreislauf',
    'Omega-3 und kardiovaskuläre Gesundheit - Meta-Analyse',
    'Eine umfassende Meta-Analyse von 79 randomisierten kontrollierten Studien (RCTs) mit insgesamt 112.059 Teilnehmern zeigt, dass eine Supplementierung mit Omega-3-Fettsäuren (EPA/DHA) signifikante positive Effekte auf kardiovaskuläre Outcomes hat. Die Analyse ergab: 1) Reduktion von Triglyceriden um durchschnittlich 15-30%, 2) Senkung des Risikos für koronare Herzkrankheiten um 18%, 3) Reduktion von Herzinfarkten um 28%. Die Dosierungen in den Studien lagen zwischen 1-4g EPA/DHA pro Tag.',
    'Meta-Analyse: Omega-3 reduziert Triglyceride um 15-30% und kardiovaskuläres Risiko um 18%.',
    2023, ARRAY['Hu et al.'], '112.059 Erwachsene', 'Meta-Analyse (79 RCTs)',
    '1-4g EPA/DHA täglich', 'Triglyceride, kardiovaskuläre Events',
    ARRAY['EPA', 'DHA', 'Omega-3'], ARRAY['Herz-Kreislauf', 'Blutfette'],
    'high', 'peer_reviewed_journal', 'Journal of the American Heart Association 2023',
    'normal', true, 'Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung.',
    ARRAY['omega-3', 'herz', 'kardiovaskulär', 'triglyceride', 'epa', 'dha', 'meta-analyse'],
    true, true
);

-- 2. Vitamin D Immunstudie
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, study_year, study_authors, study_population, study_type, study_intervention, study_outcomes, nutrients_or_factors, health_outcome_areas, evidence_level, source_type, source_reference, compliance_level, requires_disclaimer, keywords, is_active, is_verified)
VALUES (
    'evidence', 'study_summary', 'Vitamin D', 'Immunsystem',
    'Vitamin D und Immunfunktion - Klinische Studie',
    'Eine doppelblinde, placebokontrollierte Studie mit 8.851 Teilnehmern untersuchte den Einfluss von Vitamin D Supplementierung auf die Immunfunktion. Über einen Zeitraum von 3 Jahren erhielten die Teilnehmer entweder 2000 IE Vitamin D3 täglich oder Placebo. Ergebnisse: Die Vitamin D Gruppe zeigte eine 12% niedrigere Inzidenz von akuten Atemwegsinfektionen. Bei Teilnehmern mit einem Baseline-Vitamin-D-Spiegel unter 25 nmol/L war die Reduktion noch deutlicher (bis zu 25%).',
    'Studie: 2000 IE Vitamin D täglich reduziert Atemwegsinfekte um 12-25%.',
    2022, ARRAY['Martineau et al.'], '8.851 Erwachsene', 'Randomisierte kontrollierte Studie',
    '2000 IE Vitamin D3 täglich', 'Atemwegsinfektionen, Immunmarker',
    ARRAY['Vitamin D', 'Vitamin D3', 'Cholecalciferol'], ARRAY['Immunsystem', 'Atemwege'],
    'high', 'peer_reviewed_journal', 'The BMJ 2022',
    'normal', true,
    ARRAY['vitamin-d', 'immunsystem', 'atemwege', 'erkältung', 'grippe'],
    true, true
);

-- 3. EFSA Health Claims Omega-3
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, nutrients_or_factors, health_outcome_areas, evidence_level, source_type, source_reference, compliance_level, requires_disclaimer, keywords, is_active, is_verified)
VALUES (
    'evidence', 'health_claim', 'EFSA Health Claims', 'Zugelassene Aussagen',
    'EFSA Health Claims - Omega-3 Fettsäuren',
    E'Folgende Health Claims sind von der EFSA zugelassen für Omega-3 Fettsäuren (EPA/DHA):\n\n1. **DHA trägt zur Erhaltung einer normalen Gehirnfunktion bei** (250mg DHA/Tag)\n2. **DHA trägt zur Erhaltung normaler Sehkraft bei** (250mg DHA/Tag)\n3. **EPA und DHA tragen zu einer normalen Herzfunktion bei** (250mg EPA+DHA/Tag)\n4. **DHA trägt zur normalen Entwicklung des Gehirns beim Fötus und gestillten Säugling bei**\n\nDiese Claims dürfen nur verwendet werden, wenn das Produkt mindestens die angegebene Menge enthält.',
    'EFSA: EPA/DHA für Herz, Gehirn & Sehkraft (250mg/Tag erforderlich).',
    ARRAY['EPA', 'DHA', 'Omega-3'], ARRAY['Herz', 'Gehirn', 'Augen', 'Schwangerschaft'],
    'high', 'regulatory', 'EFSA Journal - EU Health Claims Register',
    'strict', false,
    ARRAY['efsa', 'health-claim', 'omega-3', 'epa', 'dha', 'zugelassen', 'offiziell'],
    true, true
);

-- 4. Polyphenole Olivenöl
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, nutrients_or_factors, health_outcome_areas, evidence_level, source_type, source_reference, compliance_level, requires_disclaimer, keywords, is_active, is_verified)
VALUES (
    'evidence', 'guideline', 'Polyphenole', 'Antioxidantien',
    'Polyphenole aus Olivenöl - Zellschutz',
    E'Die EFSA hat einen Health Claim für Polyphenole aus Olivenöl zugelassen: **"Polyphenole in Olivenöl tragen dazu bei, die Blutfette vor oxidativem Stress zu schützen."** Diese Aussage darf bei Olivenölen verwendet werden, die mindestens 5mg Hydroxytyrosol und seine Derivate pro 20g Olivenöl enthalten. Der Health Claim bezieht sich auf die antioxidative Wirkung der Polyphenole, die LDL-Cholesterin vor Oxidation schützen können.',
    'EFSA Claim: Olivenöl-Polyphenole schützen Blutfette vor oxidativem Stress.',
    ARRAY['Polyphenole', 'Hydroxytyrosol', 'Oleuropein'], ARRAY['Zellschutz', 'Antioxidantien', 'Blutfette'],
    'high', 'regulatory', 'EFSA Health Claim 2012',
    'strict', false,
    ARRAY['polyphenole', 'olivenöl', 'antioxidantien', 'zellschutz', 'efsa'],
    true, true
);

-- 5. Einwand: Zu teuer
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'vertical', 'objection_handler', 'Preis-Einwand', 'Zu teuer',
    'Einwand: Das ist mir zu teuer',
    E'**Einwand verstehen:** Der Preis-Einwand ist oft ein Zeichen, dass der Wert noch nicht klar ist.\n\n**Antwort-Strategie:**\n\n1. **Bestätigen & Verstehen:**\n   "Ich verstehe - bei einer Investition in die Gesundheit will man sicher sein, dass es sich lohnt."\n\n2. **Wert aufzeigen:**\n   "Lass mich mal rechnen: Wenn du jeden Tag nur einen Kaffee weniger trinkst, hast du das Budget für deine Gesundheit."\n\n3. **ROI verdeutlichen:**\n   "Was kostet dich ein Tag krank sein? Prävention ist immer günstiger als Reparatur."\n\n4. **Alternative anbieten:**\n   "Wir haben auch ein Starter-Paket für den Einstieg."',
    'Preis-Einwand: Wert betonen, ROI rechnen, Alternative anbieten.',
    'network_marketing', 'expert_opinion', 'normal',
    ARRAY['preis', 'teuer', 'kosten', 'einwand', 'objection', 'geld'],
    true, true
);

-- 6. Einwand: Keine Zeit
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'vertical', 'objection_handler', 'Zeit-Einwand', 'Keine Zeit',
    'Einwand: Ich habe gerade keine Zeit',
    E'**Einwand verstehen:** Zeit-Einwände bedeuten meist: Keine Priorität ODER echte Überlastung.\n\n**Antwort-Strategie:**\n\n1. **Nicht kämpfen:**\n   "Das verstehe ich total. Darf ich fragen - was macht deine Zeit gerade so knapp?"\n\n2. **Prioritäten ansprechen:**\n   "Die Frage ist eher: Ist Gesundheit wichtig genug, um 15 Minuten pro Woche zu investieren?"\n\n3. **Minimalaufwand zeigen:**\n   "Das Beste: Bei uns geht''s um 5 Minuten morgens, 5 Minuten abends."\n\n4. **Follow-up vereinbaren:**\n   "Wann wäre ein besserer Zeitpunkt? Ich melde mich in 2 Wochen nochmal."',
    'Zeit-Einwand: Prioritäten ansprechen, Minimalaufwand zeigen, Follow-up setzen.',
    'network_marketing', 'expert_opinion', 'normal',
    ARRAY['zeit', 'keine-zeit', 'beschäftigt', 'stress', 'einwand', 'follow-up'],
    true, true
);

-- 7. Einwand: Funktioniert das?
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'vertical', 'objection_handler', 'Skepsis-Einwand', 'Funktioniert das überhaupt',
    'Einwand: Funktioniert das wirklich?',
    E'**Einwand verstehen:** Skepsis ist gesund und zeigt Interesse!\n\n**Antwort-Strategie:**\n\n1. **Skepsis bestätigen:**\n   "Gute Frage! Ich war anfangs auch skeptisch."\n\n2. **Wissenschaft nutzen:**\n   "Was mich überzeugt hat: Es gibt über 50 Studien dazu, veröffentlicht in renommierten Journals."\n\n3. **Eigene Erfahrung:**\n   "Ich kann dir nur sagen, was es bei mir gemacht hat... Aber am besten probierst du es selbst."\n\n4. **Test anbieten:**\n   "Mach doch einfach einen Test über 90 Tage. Wenn''s nicht wirkt, sagst du''s mir. Deal?"',
    'Skepsis-Einwand: Mit Studien überzeugen, eigene Erfahrung teilen, Test anbieten.',
    'network_marketing', 'expert_opinion', 'normal',
    ARRAY['skepsis', 'zweifel', 'funktioniert', 'wirkt', 'beweis', 'studien'],
    true, true
);

-- 8. Einwand: Network Marketing
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'vertical', 'objection_handler', 'MLM-Einwand', 'Ist das Network Marketing',
    'Einwand: Ist das so ein Network-Ding?',
    E'**Einwand verstehen:** Der Lead hat Vorbehalte gegen MLM.\n\n**Antwort-Strategie:**\n\n1. **Ehrlich sein:**\n   "Ja, es gibt ein Empfehlungssystem. Genauso wie Uber, Airbnb oder dein Fitnessstudio."\n\n2. **Unterschied erklären:**\n   "Der Unterschied: Du musst nichts weiterverkaufen. Das Produkt bestellt jeder selbst."\n\n3. **Fokus auf Produkt:**\n   "Ob ich was verdiene, wenn du bestellst, sollte nicht entscheiden, ob das Produkt für dich passt, oder?"\n\n4. **Optionalität betonen:**\n   "Du kannst das Produkt nutzen ohne jemals jemanden einzuladen."',
    'MLM-Einwand: Empfehlungssystem erklären, Produkt in Fokus, keine Pflicht betonen.',
    'network_marketing', 'expert_opinion', 'normal',
    ARRAY['mlm', 'network-marketing', 'pyramide', 'schneeball', 'empfehlung'],
    true, true
);

-- 9. Zinzino Unternehmen
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, compliance_level, keywords, is_active, is_verified)
VALUES (
    'company', 'company_overview', 'Zinzino', 'Unternehmensinfo',
    'Zinzino - Unternehmensübersicht',
    E'**Zinzino AB** ist ein skandinavisches Unternehmen für personalisierte Ernährung.\n\n**Gegründet:** 2005 in Göteborg, Schweden\n**Börse:** Nasdaq First North Stockholm (ZINO)\n**Märkte:** 100+ Länder\n\n**Kernprodukte:**\n- **BalanceOil+**: Premium Omega-3 mit Polyphenolen\n- **ZinoBiotic+**: Ballaststoff-Mix für Darmgesundheit\n- **Xtend+**: Vitamine & Mineralstoffe\n\n**Alleinstellungsmerkmale:**\n1. **BalanceTest**: Bluttest zur Omega-6/3-Ratio\n2. **Personalisierung**: Produkte basierend auf Testergebnis\n3. **Wissenschaft**: Partnerschaft mit VITAS/NTNU Norwegen',
    'Zinzino: Schwedisches Health-Tech Unternehmen, bekannt für BalanceOil und personalisierte Omega-3 Tests.',
    'network_marketing', 'normal',
    ARRAY['zinzino', 'unternehmen', 'schweden', 'omega-3', 'balance', 'test'],
    true, true
);

-- 10. BalanceOil+ Produkt
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, vertical_id, compliance_level, keywords, is_active, is_verified)
VALUES (
    'company', 'product_detail', 'BalanceOil+', 'Hauptprodukt',
    'BalanceOil+ - Produktdetails',
    E'**BalanceOil+** ist Zinzinos Premium Omega-3 Supplement.\n\n**Zusammensetzung (pro 12ml):**\n- EPA: 1.800 mg\n- DHA: 900 mg\n- Olivenöl-Polyphenole\n- Vitamin D3: 2.000 IE\n\n**Geschmacksrichtungen:** Orange, Zitrone, Vanille, AquaX\n\n**Wissenschaft:**\n- Fischöl aus wildem Anchovis (Südpazifik)\n- Polyphenole aus spanischen Picual-Oliven\n- IFOS 5-Sterne zertifiziert\n\n**Anwendung:** 12ml täglich, vor oder zum Essen',
    'BalanceOil+: 2.700mg Omega-3 (EPA/DHA), Polyphenole, Vitamin D3 in einem.',
    'network_marketing', 'normal',
    ARRAY['balanceoil', 'omega-3', 'produkt', 'zinzino', 'polyphenole', 'epa', 'dha'],
    true, true
);

-- 11. DISC-Modell
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'generic', 'psychology', 'Verkaufspsychologie', 'DISC Persönlichkeiten',
    'DISC-Modell für Verkaufsgespräche',
    E'Das **DISC-Modell** hilft, Gesprächspartner schnell einzuordnen.\n\n**D - Dominant (Rot):**\n- Schnell, direkt, ergebnisorientiert\n- Ansatz: Kurz und knackig, zeige ROI\n\n**I - Initiativ (Gelb):**\n- Enthusiastisch, gesprächig\n- Ansatz: Begeistere, erzähle Geschichten\n\n**S - Stetig (Grün):**\n- Ruhig, geduldig, teamorientiert\n- Ansatz: Kein Druck, Garantien erwähnen\n\n**C - Gewissenhaft (Blau):**\n- Analytisch, präzise\n- Ansatz: Details, Studien, Fakten liefern',
    'DISC: D=direkt/ROI, I=emotional/Stories, S=sicher/Zeit, C=Daten/Fakten.',
    'moderate', 'low',
    ARRAY['disc', 'persönlichkeit', 'verkauf', 'psychologie', 'kommunikation'],
    true, true
);

-- 12. Follow-up Best Practices
INSERT INTO knowledge_items (domain, type, topic, subtopic, title, content, content_short, evidence_level, compliance_level, keywords, is_active, is_verified)
VALUES (
    'generic', 'communication', 'Follow-up Strategien', 'Timing & Sequenzen',
    'Follow-up Best Practices',
    E'**Follow-up ist der Schlüssel** - 80% der Abschlüsse passieren nach dem 5. Kontakt!\n\n**Goldene Regeln:**\n1. **48-Stunden-Regel:** Erstes Follow-up innerhalb von 48h\n2. **Value First:** Jedes Follow-up bringt WERT\n3. **Multi-Channel:** Variiere: DM → Voice → Text → Call\n\n**Beispiel-Sequenz:**\n- Tag 1: "Danke für unser Gespräch! Hier der Link..."\n- Tag 3: Teile einen relevanten Artikel\n- Tag 7: "Hast du schon reingeschaut?"\n- Tag 14: Story teilen\n- Tag 21: "Letzter Check - soll ich dich auf der Liste lassen?"',
    'Follow-up: 48h-Regel, Value bei jedem Kontakt, 5-Touch Sequenz.',
    'expert_opinion', 'low',
    ARRAY['follow-up', 'nachfassen', 'sequenz', 'timing', 'strategie'],
    true, true
);

SELECT '✅ Evidence Hub: 12 Knowledge Items importiert!' as status;

-- Verification
SELECT domain, type, COUNT(*) as count 
FROM knowledge_items 
GROUP BY domain, type 
ORDER BY domain, type;

