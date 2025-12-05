-- ═══════════════════════════════════════════════════════════════════════════
-- SALES PSYCHOLOGY MODULES
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabelle: sales_psychology_principles
CREATE TABLE IF NOT EXISTS sales_psychology_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  german_name TEXT,
  concept TEXT NOT NULL,
  database_input TEXT,
  example_phrase TEXT,
  example_phrase_de TEXT,
  category TEXT, -- reziprozitaet, verknappung, autoritaet, konsistenz
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: spin_questions
CREATE TABLE IF NOT EXISTS spin_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- S, P, I, N
  type_name TEXT,
  purpose TEXT,
  questions JSONB, -- Array von Fragen
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: objection_handling_advanced
CREATE TABLE IF NOT EXISTS objection_handling_advanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection TEXT NOT NULL,
  step_1_buffer TEXT, -- Puffern/Zustimmen
  step_2_isolate TEXT, -- Isolieren
  step_3_reframe TEXT, -- Reframen
  step_4_close TEXT, -- Close
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: customer_types_disg
CREATE TABLE IF NOT EXISTS customer_types_disg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type CHAR(1) NOT NULL, -- D, I, S, G
  type_name TEXT,
  recognition_signs TEXT,
  ai_instruction TEXT,
  example_script TEXT,
  tone TEXT, -- direkt, enthusiastisch, empathisch, analytisch
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: gap_selling_framework
CREATE TABLE IF NOT EXISTS gap_selling_framework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL, -- status_quo, wunschzustand, gap, bridge
  phase_name TEXT,
  questions JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabelle: anti_ghosting_strategies
CREATE TABLE IF NOT EXISTS anti_ghosting_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL,
  reason_de TEXT,
  solution TEXT,
  solution_de TEXT,
  example_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Sales Psychology Principles
INSERT INTO sales_psychology_principles (name, german_name, concept, database_input, example_phrase_de, category) VALUES
('Reciprocity', 'Reziprozität', 'Wenn du gibst, will der andere zurückgeben.', 'Biete immer erst Mehrwert an, bevor du eine Forderung stellst.', 'Ich habe dir hier eine Checkliste erstellt, wie du X lösen kannst. Schau sie dir an. Wenn du danach Fragen hast, können wir gerne sprechen.', 'reziprozitaet'),
('Scarcity', 'Verknappung', 'Menschen wollen das, was schwer zu bekommen ist.', 'Niemals unendliche Verfügbarkeit suggerieren. Zeit oder Plätze sind begrenzt.', 'Ich habe für diese Woche nur noch zwei Slots für Erstgespräche offen. Einer am Dienstag, einer am Donnerstag. Welcher passt dir?', 'verknappung'),
('Authority', 'Autorität', 'Menschen folgen Experten.', 'Positioniere dich nicht als Bittsteller, sondern als Arzt/Diagnostiker.', 'Basierend auf dem, was du mir erzählst, macht Produkt X keinen Sinn für dich. Wir sollten uns eher Y ansehen.', 'autoritaet'),
('Consistency', 'Konsistenz', 'Wer Ja zu kleinen Dingen sagt, sagt eher Ja zum großen Kauf.', 'Hole dir viele kleine Jas ab.', 'Macht das Sinn für dich? -> Ja -> Kannst du dir vorstellen, dass das dein Problem löst? -> Ja -> Sollen wir es dann machen?', 'konsistenz')
ON CONFLICT DO NOTHING;

-- SPIN Questions
INSERT INTO spin_questions (type, type_name, purpose, questions) VALUES
('S', 'Situationsfragen', 'Kontext verstehen', '["Wie lange beschäftigst du dich schon mit dem Thema?", "Was hast du bereits ausprobiert?"]'::jsonb),
('P', 'Problemfragen', 'Den Kunden das Problem spüren lassen', '["Was stört dich am meisten an deiner aktuellen Situation?", "Wie viel Zeit/Geld verlierst du dadurch aktuell pro Monat?"]'::jsonb),
('I', 'Implikationsfragen', 'Den Schmerz vergrößern', '["Wenn du jetzt nichts änderst, wo stehst du dann in 6 Monaten?", "Welche Auswirkungen hat dieser Stress auf deine Familie?"]'::jsonb),
('N', 'Need-Payoff-Fragen', 'Der Kunde verkauft sich die Lösung selbst', '["Wie würde es sich anfühlen, wenn dieses Problem morgen gelöst wäre?", "Was würdest du mit der gewonnenen Zeit machen?"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Objection Handling Advanced
INSERT INTO objection_handling_advanced (objection, step_1_buffer, step_2_isolate, step_3_reframe, step_4_close) VALUES
('Ich muss drüber schlafen', 
 'Das verstehe ich absolut. Es ist eine wichtige Entscheidung.',
 'Mal angenommen, wir hätten morgen früh wieder telefoniert – was genau müsste passiert sein, damit du Ja sagst?',
 'Meistens bedeutet drüber schlafen, dass man Angst hat, einen Fehler zu machen. Was genau ist deine Sorge?',
 'Lass uns doch lieber jetzt klären, ob es passt, anstatt dass du heute Nacht grübelst.')
ON CONFLICT DO NOTHING;

-- Customer Types DISG
INSERT INTO customer_types_disg (type, type_name, recognition_signs, ai_instruction, example_script, tone) VALUES
('D', 'Dominant - Der Macher', 'Kurze Sätze, will Ergebnisse, ungeduldig', 'Sei direkt. Keine Floskeln. Sprich über Ergebnisse, Zeitersparnis und Gewinn.', 'Wir können dein Umsatzziel in 3 Monaten erreichen. Das Investment beträgt X, der ROI ist Y. Sollen wir starten?', 'direkt'),
('I', 'Initiativ - Der Entertainer', 'Nutzt Emojis, redet viel, emotional, enthusiastisch', 'Sei begeistert. Nutze Emojis. Sprich über Community, Spaß und Anerkennung.', 'Du wirst unser Team lieben! 🎉 Wir haben super Events und du wirst schnell auf der Bühne stehen können.', 'enthusiastisch'),
('S', 'Stetig - Der Teamplayer', 'Fragt nach Sicherheit, Garantie, ist zurückhaltend', 'Sei empathisch und ruhig. Baue Druck ab. Sprich über Sicherheit und Unterstützung.', 'Wir lassen dich nicht allein. Du bekommst einen persönlichen Coach an die Seite.', 'empathisch'),
('G', 'Gewissenhaft - Der Analytiker', 'Fragt nach Details, Zahlen, Daten, Fakten. Skeptisch', 'Sei präzise. Nutze Daten und Fakten. Vermeide Hype. Sende PDFs oder Studien.', 'Unser Produkt ist Fresenius-zertifiziert und die Studie X belegt eine Wirksamkeit von 95%.', 'analytisch')
ON CONFLICT DO NOTHING;

-- Gap Selling Framework
INSERT INTO gap_selling_framework (phase, phase_name, questions, description) VALUES
('status_quo', 'Die Insel der Schmerzen', '["Wo stehst du gerade?", "Warum ist das ein Problem für dich?", "Warum hast du es noch nicht gelöst?"]'::jsonb, 'Aktuelle Situation verstehen'),
('wunschzustand', 'Die Insel der Freude', '["Wo willst du hin?", "Was ist dein konkretes Ziel?"]'::jsonb, 'Ziel definieren'),
('gap', 'Die Lücke', '["Was fehlt dir, um von A nach B zu kommen?"]'::jsonb, 'Skill, Plan oder Mentor identifizieren'),
('bridge', 'Die Brücke', '["Unsere Lösung ist genau diese Brücke."]'::jsonb, 'Das Angebot als Lösung positionieren')
ON CONFLICT DO NOTHING;

-- Anti-Ghosting Strategies
INSERT INTO anti_ghosting_strategies (reason, reason_de, solution, solution_de, example_message) VALUES
('Overwhelm', 'Überforderung - Zu viel Info geschickt', 'Micro-Steps', 'Nur eine Frage pro Nachricht', 'Hey, kurze Frage: Passt dir Dienstag oder Donnerstag besser?'),
('Pressure', 'Druck - Zu salesy gewirkt', 'Push-Pull', 'Interesse reduzieren', 'Ich bin mir gar nicht sicher, ob das überhaupt für dich passt, aber...'),
('Irrelevance', 'Irrelevanz - Falscher Zeitpunkt', 'Pattern Interrupt', 'Etwas Unerwartetes senden', 'Hey! Hab gerade an dich gedacht. Alles okay bei dir? 🙂')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- Alle Tabellen sind öffentlich lesbar (für alle User)
ALTER TABLE sales_psychology_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_handling_advanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_types_disg ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_selling_framework ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_ghosting_strategies ENABLE ROW LEVEL SECURITY;

-- Policies: Alle authentifizierten User können lesen
CREATE POLICY "Allow read for authenticated users" ON sales_psychology_principles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON spin_questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON objection_handling_advanced
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON customer_types_disg
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON gap_selling_framework
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON anti_ghosting_strategies
  FOR SELECT USING (auth.role() = 'authenticated');

