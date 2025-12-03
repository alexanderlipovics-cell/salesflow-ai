-- ============================================
-- SALES FLOW AI - POWER UP MIGRATION
-- Version: 003
-- Datum: 2024
-- Beschreibung: Company Intelligence, Objection Library, 
--               Success Stories, Liability Rules, AI Prompts
-- ============================================

-- ============================================
-- 1. COMPANY INTELLIGENCE TABELLE
-- ============================================

CREATE TABLE IF NOT EXISTS company_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  vertical TEXT DEFAULT 'network_marketing',
  
  -- Basis-Info
  founded_year INTEGER,
  headquarters TEXT,
  website TEXT,
  logo_url TEXT,
  
  -- Produkte
  product_categories TEXT[],
  flagship_products TEXT[],
  price_range TEXT,
  
  -- Vergütungsplan
  comp_plan_type TEXT,
  entry_cost_min NUMERIC,
  entry_cost_max NUMERIC,
  monthly_autoship NUMERIC,
  
  -- Einwände & Antworten (JSONB für Flexibilität)
  common_objections JSONB DEFAULT '{}',
  unique_selling_points TEXT[],
  competitor_advantages JSONB DEFAULT '{}',
  
  -- Sales Intelligence
  best_opener TEXT,
  best_closing_technique TEXT,
  ideal_customer_profile TEXT,
  red_flags TEXT[],
  golden_questions TEXT[],
  
  -- Performance Data
  avg_closing_rate NUMERIC DEFAULT 0.15,
  avg_deal_size NUMERIC,
  best_contact_times TEXT[],
  best_channels TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. OBJECTION LIBRARY TABELLE
-- ============================================

CREATE TABLE IF NOT EXISTS objection_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_text TEXT NOT NULL,
  objection_category TEXT NOT NULL,
  severity INTEGER DEFAULT 5,
  
  -- 3 Antwort-Strategien
  response_logical TEXT,
  response_emotional TEXT,
  response_provocative TEXT,
  
  -- DISG-spezifische Antworten
  response_for_d TEXT,
  response_for_i TEXT,
  response_for_s TEXT,
  response_for_g TEXT,
  
  -- Follow-up
  follow_up_question TEXT,
  bridge_to_close TEXT,
  
  -- Meta
  success_rate NUMERIC DEFAULT 0.5,
  times_used INTEGER DEFAULT 0,
  vertical TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. SUCCESS STORIES TABELLE
-- ============================================

CREATE TABLE IF NOT EXISTS success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  person_name TEXT,
  person_background TEXT,
  
  -- Story
  before_situation TEXT,
  turning_point TEXT,
  transformation TEXT,
  result TEXT,
  timeline TEXT,
  
  -- Verwendung
  use_case TEXT,
  best_for_objection TEXT,
  emotional_hook TEXT,
  
  -- Validierung
  is_verified BOOLEAN DEFAULT false,
  source_url TEXT,
  vertical TEXT DEFAULT 'network_marketing',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LIABILITY RULES TABELLE (für Shield)
-- ============================================

CREATE TABLE IF NOT EXISTS liability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_word TEXT NOT NULL,
  trigger_pattern TEXT,
  warning_message TEXT NOT NULL,
  safe_alternative TEXT NOT NULL,
  category TEXT,
  severity TEXT DEFAULT 'warning',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY INTELLIGENCE DATEN (10 Companies)
-- ============================================

INSERT INTO company_intelligence (company_name, founded_year, headquarters, website, product_categories, flagship_products, price_range, comp_plan_type, entry_cost_min, entry_cost_max, monthly_autoship, unique_selling_points, best_opener, best_closing_technique, ideal_customer_profile, red_flags, golden_questions, avg_closing_rate, avg_deal_size, best_contact_times, best_channels, common_objections) VALUES

('Zinzino', 2005, 'Göteborg, Schweden', 'https://zinzino.com',
 ARRAY['Omega-3', 'Nahrungsergänzung', 'Hautpflege', 'Darmgesundheit'],
 ARRAY['BalanceOil', 'Xtend', 'Zinobiotic', 'Skin Serum'],
 'premium',
 'hybrid', 49, 299, 89,
 ARRAY['Bluttest vor/nach (BalanceTest)', 'Wissenschaftlich fundiert', 'Personalisiert', 'Sichtbare Ergebnisse nach 120 Tagen'],
 'Wusstest du, dass 97% der Menschen ein unausgeglichenes Omega-Verhältnis haben? Es gibt jetzt einen Test, der das in 2 Minuten zeigt.',
 'Der BalanceTest zeigt dir schwarz auf weiß, ob es wirkt. Wenn nicht - Geld zurück. Was hast du zu verlieren?',
 'Gesundheitsbewusste 35-55, Sportler, Biohacker, Eltern mit Kindern',
 ARRAY['Kein Interesse an Gesundheit', 'Bereits bei Konkurrenz', 'Nur Geld verdienen wollen'],
 ARRAY['Wie wichtig ist dir deine Gesundheit auf einer Skala von 1-10?', 'Was tust du aktuell für dein Immunsystem?', 'Wärst du neugierig, wenn ich dir zeigen könnte wie dein Körper WIRKLICH dasteht?'],
 0.22, 199,
 ARRAY['Mo-Do 18-20 Uhr', 'Sa 10-12 Uhr'],
 ARRAY['WhatsApp', 'Instagram DM', 'Telefon'],
 '{"zu teuer": "Der BalanceTest allein kostet beim Arzt 200€. Bei uns ist er inklusive.", "MLM Skepsis": "Verstehe ich. Aber schau - das Produkt funktioniert ob du es verkaufst oder nicht. Der Test beweist es.", "keine Zeit": "Der Test dauert 2 Minuten Zuhause. Die Kapseln 10 Sekunden am Tag."}'
),

('Herbalife', 1980, 'Los Angeles, USA', 'https://herbalife.com',
 ARRAY['Gewichtsmanagement', 'Sporternährung', 'Hautpflege', 'Nahrungsergänzung'],
 ARRAY['Formula 1 Shake', 'Protein Riegel', 'Aloe Vera Getränk', 'Tee-Konzentrat'],
 'mid',
 'unilevel', 59, 499, 65,
 ARRAY['40+ Jahre Erfahrung', 'Weltweite Community', 'Einfaches System', 'Shake-Partys'],
 'Ich habe mit einem Shake am Tag X kg abgenommen. Darf ich fragen - hast du auch ein Ziel das du erreichen willst?',
 'Lass uns gemeinsam 3 Wochen testen. Wenn du keine Veränderung siehst, wars das. Deal?',
 'Abnehm-Willige, Fitness-Einsteiger, Vielbeschäftigte, Mütter nach Schwangerschaft',
 ARRAY['Unrealistische Erwartungen', 'Nur aufs Geld fokussiert', 'Keine Disziplin erkennbar'],
 ARRAY['Was hast du schon alles versucht?', 'Wie würdest du dich fühlen wenn du dein Zielgewicht erreichst?', 'Was hält dich davon ab es alleine zu schaffen?'],
 0.18, 149,
 ARRAY['Mo-Fr 17-19 Uhr', 'Sa 11-14 Uhr'],
 ARRAY['Facebook', 'WhatsApp', 'Persönlich'],
 '{"zu teuer": "Rechne mal zusammen was du monatlich für Snacks und Fast Food ausgibst. Der Shake ersetzt eine Mahlzeit.", "schmeckt nicht": "Wir haben 10 Geschmacksrichtungen. Lass uns zusammen deinen Favoriten finden.", "Diäten funktionieren nicht": "Das ist keine Diät, das ist eine Ernährungsumstellung. Der Unterschied: Du bist nicht allein."}'
),

('PM International', 1993, 'Speyer, Deutschland', 'https://pm-international.com',
 ARRAY['Nahrungsergänzung', 'Hautpflege', 'Körperpflege'],
 ARRAY['FitLine PowerCocktail', 'FitLine Activize', 'FitLine Restorate', 'FitLine Skin'],
 'premium',
 'unilevel', 49, 399, 79,
 ARRAY['NTC-Konzept (Nährstoff-Transport)', 'Deutsche Qualität', 'Spitzensport-Partner', 'Über 60 Olympiasieger nutzen es'],
 'Kennst du das Gefühl nachmittags in ein Loch zu fallen? Es gibt einen Grund warum über 60 Olympiasieger auf dieses Produkt schwören.',
 'Teste es 30 Tage. Wenn du keinen Unterschied merkst, wars das. Aber ich wette du rufst mich nach einer Woche an.',
 'Sportler, Manager, Erschöpfte, Qualitätsbewusste',
 ARRAY['Extreme Skepsis', 'Keine Eigenverantwortung', 'Will alles umsonst'],
 ARRAY['Wie ist dein Energielevel normalerweise von 1-10?', 'Wann fühlst du dich am müdesten?', 'Was wärst du bereit zu investieren um wieder 100% zu sein?'],
 0.20, 179,
 ARRAY['Di-Do 18-20 Uhr', 'So 17-19 Uhr'],
 ARRAY['Telefon', 'Zoom', 'Persönlich'],
 '{"funktioniert nicht": "Deshalb die 30-Tage-Garantie. Aber 60+ Olympiasieger können sich nicht irren.", "zu teuer": "Was kostet dich fehlende Energie? Verpasste Chancen? Schlechte Laune mit der Familie?", "keine Zeit für Sport": "Dafür ist es ja da - Energie OHNE dass du 2 Stunden im Gym verbringen musst."}'
),

('doTERRA', 2008, 'Utah, USA', 'https://doterra.com',
 ARRAY['Ätherische Öle', 'Wellness', 'Nahrungsergänzung', 'Persönliche Pflege'],
 ARRAY['Lavendel', 'Pfefferminze', 'On Guard', 'Deep Blue', 'Frankincense'],
 'premium',
 'unilevel', 35, 550, 50,
 ARRAY['CPTG Qualitätsstandard', 'Co-Impact Sourcing', 'Therapeutische Qualität', 'Riechbar höhere Qualität'],
 'Riech mal... [Öl hinhalten] ... Merkst du den Unterschied zu dem was du im Drogeriemarkt kaufst?',
 'Nimm das Starter-Kit mit nach Hause. Wenn du in 30 Tagen nicht süchtig bist, esse ich einen Besen.',
 'Mütter, Yoga-Praktizierende, Naturheilkunde-Interessierte, Stressgeplagte',
 ARRAY['Allergie gegen alles Natürliche', 'Will nur billig', 'Partner strikt dagegen'],
 ARRAY['Wie gehst du mit Stress um?', 'Hast du Kinder im Haus?', 'Was nutzt du wenn du Kopfschmerzen hast?'],
 0.25, 159,
 ARRAY['Mo-Mi 10-12 Uhr', 'Do-Sa 19-21 Uhr'],
 ARRAY['Instagram', 'Pinterest', 'WhatsApp', 'Workshops'],
 '{"nur Placebo": "Lass es uns testen. Pfefferminze auf die Schläfen bei Kopfschmerzen. Du merkst es in 60 Sekunden.", "zu teuer": "Ein Tropfen kostet 5 Cent. Wie viel gibst du für Medikamente aus?", "hab schon Öle": "Therapeutische Öle vs. Duftöle ist wie frisch gepresster Saft vs. Capri Sonne. Riech mal den Unterschied."}'
),

('Forever Living', 1978, 'Arizona, USA', 'https://foreverliving.com',
 ARRAY['Aloe Vera', 'Bienenprodukte', 'Nahrungsergänzung', 'Hautpflege'],
 ARRAY['Forever Aloe Vera Gel', 'Forever Bee Pollen', 'Forever Arctic Sea', 'Sonya Skincare'],
 'mid',
 'unilevel', 39, 399, 55,
 ARRAY['Weltgrößter Aloe-Vera-Produzent', 'Eigene Plantagen', '45+ Jahre Erfahrung', 'Patentierter Stabilisierungsprozess'],
 'Wusstest du dass die meisten Aloe-Produkte im Laden nur 10% echte Aloe enthalten? Unseres hat 99,7%.',
 'Trink 30 Tage lang jeden Morgen ein Glas. Dein Darm wird es dir danken.',
 'Verdauungsprobleme, Hautprobleme, Gesundheitsbewusste, Tier-Liebhaber (auch für Tiere)',
 ARRAY['Erwartet Wunder über Nacht', 'Kann Konsistenz nicht halten', 'Mag keinen Aloe-Geschmack'],
 ARRAY['Wie ist deine Verdauung so?', 'Trinkst du genug am Tag?', 'Hast du schonmal Aloe probiert?'],
 0.19, 129,
 ARRAY['Mo-Fr 18-20 Uhr'],
 ARRAY['Facebook', 'WhatsApp', 'Hauspartys'],
 '{"schmeckt nicht gut": "Stimmt, pur ist es gewöhnungsbedürftig. Aber mit Saft gemischt merkst du es kaum.", "Aloe ist Aloe": "Nein - unser Stabilisierungsprozess ist patentiert. Die Aloe im Laden ist oft mehr Wasser als Pflanze.", "brauch ich nicht": "Dein Darm verarbeitet ALLES was du isst. Ein bisschen Unterstützung kann jeder gebrauchen."}'
),

('Juice Plus', 1993, 'Tennessee, USA', 'https://juiceplus.com',
 ARRAY['Obst-/Gemüse-Kapseln', 'Shakes', 'Riegel', 'Omega Blend'],
 ARRAY['Juice Plus+ Kapseln', 'Complete Shake', 'Uplift Riegel'],
 'premium',
 'unilevel', 50, 350, 85,
 ARRAY['30+ Obst/Gemüse-Sorten', 'Über 40 Studien', 'Kinder-Programm kostenlos', 'Brücke zur gesunden Ernährung'],
 'Isst du jeden Tag 30 verschiedene Obst- und Gemüsesorten? Nein? Ich auch nicht. Deshalb das hier.',
 'Deine Kinder bekommen das Programm kostenlos dazu. Gesunde Familie - ohne Extrakosten.',
 'Eltern, Berufstätige, Obst/Gemüse-Muffel, Gesundheitsbewusste',
 ARRAY['Vegetarier/Veganer die eh viel essen', 'Nur fürs Business dabei', 'Extrem skeptisch gegen Kapseln'],
 ARRAY['Wie viele Portionen Obst/Gemüse isst du am Tag?', 'Essen deine Kinder gerne Gemüse?', 'Was hält dich von gesünderer Ernährung ab?'],
 0.21, 169,
 ARRAY['Mo-Do 17-19 Uhr', 'Sa 10-12 Uhr'],
 ARRAY['Facebook', 'Instagram', 'Telefon'],
 '{"Kapseln statt echtes Essen": "Genau - es ERSETZT nichts, es ERGÄNZT. Wie eine Versicherung für die Tage wo du nicht perfekt isst.", "zu teuer": "2,50€ am Tag. Weniger als ein Kaffee. Für 30 Sorten Obst und Gemüse.", "glaub nicht an Nahrungsergänzung": "Über 40 unabhängige Studien sagen was anderes. Schau sie dir an."}'
),

('Nu Skin', 1984, 'Utah, USA', 'https://nuskin.com',
 ARRAY['Anti-Aging', 'Hautpflege', 'Nahrungsergänzung', 'Geräte'],
 ARRAY['ageLOC LumiSpa', 'ageLOC Galvanic Spa', 'ageLOC Youth', 'Pharmanex LifePak'],
 'premium',
 'binary', 100, 1500, 100,
 ARRAY['ageLOC Technologie', 'Gen-Expressions-Wissenschaft', 'High-Tech Geräte', 'Klinisch getestet'],
 'Was wärst du bereit zu zahlen um 10 Jahre jünger auszusehen? Ohne OP, ohne Spritzen?',
 'Das Gerät ist teurer, ja. Aber rechne mal 10 Jahre Cremes zusammen. Das hier hält ein Leben lang.',
 'Frauen 40+, Anti-Aging Interessierte, Tech-Affine, Qualitätsbewusste',
 ARRAY['Kein Budget für Premium', 'Zufrieden mit Drogerie-Produkten', 'Mann entscheidet mit'],
 ARRAY['Was tust du aktuell für deine Haut?', 'Wie viel gibst du monatlich für Hautpflege aus?', 'Wenn Geld keine Rolle spielen würde - was wärst du bereit zu investieren?'],
 0.15, 450,
 ARRAY['Di-Do 19-21 Uhr', 'Sa 14-17 Uhr'],
 ARRAY['Instagram', 'Zoom', 'Persönlich'],
 '{"viel zu teuer": "Einmal kaufen, 10 Jahre nutzen. Rechne mal deine jährlichen Creme-Kosten zusammen.", "Anti-Aging funktioniert nicht": "Die Gen-Expressions-Forschung ist neu. Wir bekämpfen Alterung an der QUELLE, nicht an den Symptomen.", "brauch ich noch nicht": "Prävention ist einfacher als Reparatur. Mit 40 anfangen heißt mit 50 so aussehen wie jetzt."}'
),

('Lifewave', 2004, 'Kalifornien, USA', 'https://lifewave.com',
 ARRAY['Phototherapie-Pflaster', 'Wellness', 'Anti-Aging'],
 ARRAY['X39 Stammzellen-Patch', 'Energy Enhancer', 'Silent Nights', 'IceWave Schmerzpflaster'],
 'premium',
 'binary', 99, 499, 150,
 ARRAY['Patentierte Phototherapie', 'Aktiviert körpereigene Stammzellen', 'Keine Substanzen die eindringen', 'Spürbar in Minuten'],
 'Was wärst du bereit zu tun, wenn du deinen Körper anweisen könntest mehr Stammzellen zu produzieren?',
 'Kleb dir das Pflaster auf. Wenn du in 10 Minuten keinen Unterschied merkst, reden wir nicht weiter.',
 'Schmerzgeplagte, Biohacker, Anti-Aging Enthusiasten, Sportler mit Verletzungen',
 ARRAY['Absolute Wissenschafts-Skeptiker', 'Pflaster-Phobie', 'Will nur schulmedizinische Lösungen'],
 ARRAY['Wie gehst du mit Schmerzen um?', 'Wie gut schläfst du?', 'Hast du schonmal von Phototherapie gehört?'],
 0.18, 299,
 ARRAY['Mo-Fr 19-21 Uhr'],
 ARRAY['Zoom', 'Telefon', 'Persönlich'],
 '{"klingt nach Hokuspokus": "73 Patente und über 80 klinische Studien. David Schmidt hat für die US Navy geforscht.", "Pflaster können nichts": "Die reflektieren dein eigenes Infrarotlicht. Wie ein Spiegel für deine Zellen.", "sehr teuer": "Vergleich mal mit Stammzellen-Therapien für 20.000€. Das hier kostet 5€ am Tag."}'
),

('Vorwerk/Thermomix', 1883, 'Wuppertal, Deutschland', 'https://thermomix.de',
 ARRAY['Küchengeräte', 'Haushaltsgeräte'],
 ARRAY['Thermomix TM6', 'Kobold Staubsauger', 'Temial Teeautomat'],
 'premium',
 'unilevel', 0, 0, 0,
 ARRAY['Deutsches Traditions-Unternehmen', '140 Jahre Erfahrung', 'All-in-One Küchengerät', 'Guided Cooking'],
 'Kochst du gerne? Was wäre wenn ein Gerät das Wiegen, Schneiden, Rühren, Kochen und die Anleitung übernimmt?',
 'Du kannst 4 Wochen testen. Wenn er dann in der Ecke steht, holst du ihn zurück. Kein Risiko.',
 'Familien, Kochmuffel die müssen, Berufstätige, Qualitätsbewusste',
 ARRAY['Single ohne Kochbedarf', 'Sehr kleines Budget', 'Kocht eh nicht'],
 ARRAY['Wie oft kochst du die Woche?', 'Was nervt dich am meisten am Kochen?', 'Wie viel Zeit verbringst du täglich in der Küche?'],
 0.28, 1359,
 ARRAY['Mo-Fr 17-19 Uhr', 'Sa 10-14 Uhr'],
 ARRAY['Kochshow zuhause', 'Telefon', 'Empfehlung'],
 '{"zu teuer": "Rechne mal: Weniger Essen wegwerfen, weniger Fertiggerichte, keine anderen Geräte kaufen. Nach 2 Jahren bist du im Plus.", "hab schon Küchenmaschine": "Die macht EINES. Der Thermomix macht 12 Dinge. Zeig mir eine andere Maschine die gleichzeitig wiegt, rührt und kocht.", "koche nicht gerne": "Genau DAFÜR ist er da. Er sagt dir was du tun sollst. Wie Netflix für die Küche."}'
),

('Amway', 1959, 'Michigan, USA', 'https://amway.de',
 ARRAY['Nahrungsergänzung', 'Schönheit', 'Haushalt', 'Körperpflege'],
 ARRAY['Nutrilite Double X', 'Artistry Hautpflege', 'eSpring Wasserfilter', 'LOC Reiniger'],
 'mid',
 'hybrid', 49, 599, 75,
 ARRAY['Über 60 Jahre Erfahrung', 'Eigene Bio-Farmen', 'Wissenschaftliche Institute', 'Nachhaltigkeit'],
 'Wusstest du dass die größte Bio-Vitamin-Marke der Welt aus eigenen Farmen kommt? Nicht aus China, aus eigenen Farmen.',
 'Fang mit einem Produkt an das du sowieso kaufst. Tausche es aus und schau was passiert.',
 'Qualitätsbewusste, Nachhaltigkeits-Interessierte, Familien',
 ARRAY['Starke MLM-Vorurteile', 'Budget unter 50€/Monat', 'Nur auf schnelles Geld aus'],
 ARRAY['Worauf achtest du bei Produkten die du täglich nutzt?', 'Wie wichtig ist dir Nachhaltigkeit?', 'Was zahlst du aktuell für Vitamine/Reiniger/Pflege?'],
 0.17, 139,
 ARRAY['Mo-Do 18-20 Uhr'],
 ARRAY['Telefon', 'Persönlich', 'Facebook'],
 '{"Amway ist doch MLM": "Ja - und 60 Jahre am Markt, 8 Milliarden Umsatz. Wenn es nicht funktionieren würde, wären sie weg.", "zu teuer": "Premium kostet. Aber ein LOC-Reiniger hält 6 Monate. Rechne das mal um.", "kenn ich schon": "Wann war das? Die Produkte haben sich in den letzten 10 Jahren komplett verändert."}'
);

-- ============================================
-- OBJECTION LIBRARY (50+ Einwände)
-- ============================================

INSERT INTO objection_library (objection_text, objection_category, response_logical, response_emotional, response_provocative, response_for_d, response_for_i, response_for_s, response_for_g, follow_up_question, bridge_to_close, severity) VALUES

-- PREIS EINWÄNDE
('Das ist mir zu teuer', 'price',
 'Verstehe ich. Lass uns mal rechnen: Was kostet dich das Problem das du JETZT hast? Pro Monat, pro Jahr?',
 'Ich verstehe das Gefühl. Aber was ist dir deine Gesundheit/Zeit/Erfolg wirklich wert? Manche Dinge sind unbezahlbar.',
 'Zu teuer im Vergleich wozu? Zu deiner Gesundheit? Zu den Chancen die du verpasst?',
 'Hier sind die Zahlen: ROI ist nachweisbar in X Wochen. Die Frage ist nicht ob, sondern wann.',
 'Ich weiß, Geld ist ein Thema. Aber stell dir vor wie es sich anfühlt wenn das Problem gelöst ist! Das ist unbezahlbar, oder?',
 'Ich verstehe deine Bedenken total. Viele meiner besten Kunden hatten die am Anfang auch. Was wäre ein Betrag der sich gut anfühlt?',
 'Lass mich dir die genaue Kosten-Nutzen-Analyse zeigen. Mit allen Zahlen, transparent.',
 'Wenn Geld keine Rolle spielen würde - wärst du dabei?',
 'Lass uns einen Weg finden der für dein Budget passt. Was wäre machbar?',
 7),

('Ich muss erst mit meinem Partner sprechen', 'stall',
 'Klar, wichtige Entscheidungen trifft man zusammen. Wann könnt ihr beide Zeit für ein kurzes Gespräch?',
 'Das zeigt dass du die Beziehung ernst nimmst. Was glaubst du wird er/sie sagen?',
 'Wer entscheidet bei euch normalerweise über Investitionen in eure Gesundheit/Zukunft?',
 'Gut. Wann kann ich mit euch beiden sprechen? Ich überzeuge auch ihn/sie.',
 'Wie schön dass ihr das zusammen entscheidet! Soll ich dabei sein wenn ihr sprecht?',
 'Das ist verständlich. Was denkst du wie dein Partner reagieren wird? Ich kann dir Argumente mitgeben.',
 'Welche Informationen braucht dein Partner um eine fundierte Entscheidung zu treffen?',
 'Was ist das wahrscheinlichste Bedenken das dein Partner haben wird?',
 'Lass uns zu dritt telefonieren - dann kann ich alle Fragen direkt beantworten.',
 5),

('Ich habe keine Zeit', 'time',
 'Das verstehe ich gut. Gerade WEIL du keine Zeit hast, ist das hier relevant. Es spart dir langfristig Zeit.',
 'Zeit ist unser wertvollstes Gut. Aber diese 30 Minuten könnten dein Leben verändern. Wann passt es besser?',
 'Keine Zeit für was genau? Für deine Gesundheit? Für mehr Geld? Für deine Familie?',
 'Ich fasse mich kurz: 10 Minuten. Wenn es nicht relevant ist, sag ich es dir ehrlich.',
 'Ich verstehe! Kurz und knackig: Was wäre, wenn du MEHR Zeit hättest durch das was ich dir zeige?',
 'Ich will deine Zeit nicht verschwenden. Wann ist ein besserer Zeitpunkt diese Woche?',
 'Wie viel Zeit verbringst du aktuell mit dem Problem das wir lösen könnten?',
 'Wenn du JETZT keine Zeit hast - was müsste anders sein damit du Zeit hast?',
 'Gib mir 10 Minuten. Wenn ich deine Zeit verschwende, sag ich es dir selbst.',
 6),

('Ich überlege es mir', 'stall',
 'Was genau möchtest du überdenken? Vielleicht kann ich dir jetzt schon Antworten geben.',
 'Natürlich, es ist eine wichtige Entscheidung. Was ist das Gefühl in deinem Bauch gerade?',
 'Was wird in einer Woche anders sein? Das Problem wird noch da sein, oder?',
 'Was fehlt dir für eine Entscheidung JETZT? Ich gebe dir die Information.',
 'Ich verstehe! Was wäre hilfreich zu wissen um dich sicherer zu fühlen?',
 'Klar, nimm dir die Zeit. Was kann ich tun damit du dich wohler fühlst mit der Entscheidung?',
 'Welche zusätzlichen Informationen brauchst du für eine fundierte Entscheidung?',
 'Was genau hält dich davon ab jetzt ja zu sagen?',
 'Was wäre wenn ich dir eine Test-Phase ohne Risiko anbiete?',
 6),

('Das ist doch ein Schneeballsystem', 'mlm_stigma',
 'Ich verstehe die Verwechslung. Der Unterschied: Hier gibt es echte Produkte die Menschen nutzen und lieben - unabhängig davon ob sie verkaufen.',
 'Ich hatte dieselbe Angst am Anfang. Aber dann habe ich die Produkte selbst probiert und gesehen: Die funktionieren. Das ist der Unterschied.',
 'Ist dein Arbeitgeber auch ein Schneeballsystem? Da verdient der Chef auch mehr als du, oder?',
 'Fakten: X Jahre am Markt, X Milliarden Umsatz, X Millionen zufriedene Kunden. Schneeballsysteme überleben keine 2 Jahre.',
 'Ich hatte dieselben Bedenken! Aber schau - ich nutze die Produkte selbst weil sie funktionieren. Das Geld ist ein Bonus.',
 'Deine Skepsis ist berechtigt, es gibt leider schwarze Schafe. Lass mich dir zeigen worin der Unterschied liegt.',
 'Ein Schneeballsystem hat keine echten Produkte und kollabiert mathematisch. Hier die Zahlen warum das hier anders ist...',
 'Hast du selbst schlechte Erfahrungen gemacht oder ist es eher ein Bauchgefühl?',
 'Probier einfach das Produkt. Vergiss das Business. Wenn es wirkt, reden wir weiter.',
 8),

('Bei mir funktioniert sowas nicht', 'limiting_belief',
 'Warum glaubst du das? Was hast du schon probiert und was ist passiert?',
 'Ich habe das auch gedacht. Bis ich es einfach mal gemacht habe. Was hast du zu verlieren außer deine Zweifel?',
 'Woher weißt du das? Hast du DIESES Produkt/System schon probiert?',
 'Die Statistik sagt: X% haben Erfolg wenn sie Y tun. Bist du anders als alle anderen?',
 'Was wäre wenn es diesmal anders ist? Stell dir vor es funktioniert!',
 'Ich verstehe dass du enttäuscht wurdest. Was war beim letzten Mal der Knackpunkt?',
 'Lass uns analysieren: Was genau hat beim letzten Mal nicht funktioniert?',
 'Was müsste anders sein damit es bei dir funktioniert?',
 'Teste es 30 Tage. Wenn es nicht funktioniert, weißt du es. Wenn doch, hast du was verpasst.',
 7),

('Ich kenne jemanden bei dem das nicht funktioniert hat', 'third_party',
 'Das kann vorkommen. Weißt du warum es bei der Person nicht funktioniert hat?',
 'Das ist schade. Aber ist die Situation dieser Person wirklich vergleichbar mit deiner?',
 'Es gibt auch Menschen bei denen Sport nicht funktioniert. Heißt das du solltest keinen machen?',
 'Eine Person ist keine Statistik. Die Erfolgsquote liegt bei X%. Willst du wegen einer Person aufgeben?',
 'Oh nein! Was ist passiert? Vielleicht hat er/sie was anders gemacht?',
 'Das tut mir leid zu hören. Aber jeder ist anders. Sollen wir schauen ob es für DICH passt?',
 'Interessant. Weißt du die genauen Umstände? Vielleicht können wir daraus lernen.',
 'Was genau hat bei dieser Person nicht funktioniert?',
 'Lass UNS gemeinsam sicherstellen dass es bei DIR funktioniert. Was brauchst du dafür?',
 5),

('Ich will keine Produkte verkaufen', 'business_objection',
 'Das musst du auch nicht. Die meisten nutzen es einfach selbst. Das Business ist optional.',
 'Das verstehe ich total! Ich wollte am Anfang auch nicht. Jetzt teile ich es einfach weil es mir hilft.',
 'Verkaufst du guten Restaurants oder Filmen weiter? Das hier ist dasselbe - nur wirst du belohnt.',
 'Dann nutze es nur selbst. Aber wisse: Wenn du es 3 Leuten sagst, ist deins umsonst.',
 'Niemand mag "verkaufen"! Aber hast du schonmal was empfohlen das du liebst? Das ist alles!',
 'Das brauchst du gar nicht. Einfach nutzen und wenn dich jemand fragt, sagst du wo du es her hast.',
 'Verstanden. Lass uns nur über die Produktnutzung sprechen. Das Business kannst du ignorieren.',
 'Was verbindest du mit "verkaufen"? Vielleicht ist es gar nicht das was du denkst.',
 'Perfekt, dann einfach nur als Kunde. Wenn du später doch willst, geht das immer noch.',
 4),

('Ich habe schon alles was ich brauche', 'no_need',
 'Das freut mich! Darf ich fragen was du aktuell nutzt? Vielleicht gibt es trotzdem einen Unterschied.',
 'Super dass es dir gut geht! Aber was wäre wenn es noch BESSER gehen könnte?',
 'Wirklich? Keine Bereiche in denen du mehr willst? Mehr Energie? Mehr Zeit? Mehr Geld?',
 'Perfekt. Dann brauchst du das hier nur wenn du von GUT auf GROSSARTIG willst.',
 'Das klingt toll! Bist du offen für etwas das das Gute noch besser macht?',
 'Schön zu hören! Ich zeig es dir trotzdem kurz - falls sich mal was ändert weißt du wo du mich findest.',
 'Was nutzt du aktuell? Lass uns vergleichen ob es wirklich gleichwertig ist.',
 'Wenn du auf einer Skala von 1-10 bist - wo siehst du dich? Was fehlt zur 10?',
 'Behalte meine Nummer. Wenn sich was ändert, melde dich.',
 3),

('Das glaube ich nicht', 'skepticism',
 'Gesunde Skepsis ist gut! Was genau glaubst du nicht? Ich zeige dir die Beweise.',
 'Ich war genauso skeptisch. Bis ich es selbst erlebt habe. Darf ich dir meine Geschichte erzählen?',
 'Du glaubst nicht an Fakten? Hier sind X Studien, Y Kundenbewertungen, Z Jahre am Markt.',
 'Fair. Hier sind die Daten, die Studien, die Beweise. Überzeug dich selbst.',
 'Ich verstehe! Ich war auch skeptisch. Aber dann hab ich es einfach getestet...',
 'Deine Vorsicht ist verständlich. Was müsste passieren damit du es glaubst?',
 'Welche Beweise wären für dich überzeugend? Studien? Testimonials? Eigene Erfahrung?',
 'Was genau müsste passieren damit du es glaubst?',
 'Teste es selbst. Dein eigenes Erlebnis ist der beste Beweis.',
 6),

('Mein Arzt hat mir davon abgeraten', 'authority',
 'Ärzte sind wichtig! Hat er das spezifische Produkt analysiert oder generell von Nahrungsergänzung gesprochen?',
 'Deine Gesundheit geht vor, absolut. Darf ich fragen was genau sein Bedenken war?',
 'Hat dein Arzt sich die Inhaltsstoffe angeschaut? Oder war es eine pauschale Aussage?',
 'Fakten: Diese Produkte haben X Studien, sind Y zertifiziert. Zeig das deinem Arzt.',
 'Das ist wichtig! Was genau hat er gesagt? Vielleicht kann ich es dem Arzt erklären.',
 'Deine Gesundheit ist am wichtigsten. Was wäre wenn wir gemeinsam mit deinem Arzt sprechen?',
 'Hat der Arzt die Inhaltsstoffliste und Studien gesehen? Ich gebe dir Material für ihn.',
 'Was genau war das Bedenken deines Arztes?',
 'Nimm die Infos mit zu deinem nächsten Termin. Lass ihn entscheiden.',
 5),

('Ich probiere nie etwas Neues aus', 'resistance_to_change',
 'Verstehe. Aber du hast auch mal das erste Smartphone probiert, oder? Manchmal lohnt sich Neues.',
 'Ich weiß, Neues ist ungewohnt. Aber stell dir vor du hättest Internet nie ausprobiert...',
 'Nie? Du hast noch nie was Neues probiert? Kein neues Restaurant, kein neuer Film?',
 'Veränderung ist der einzige Weg zu besseren Ergebnissen. Ohne Neues: Status Quo.',
 'Ich verstehe! Aber hey, das könnte genau das sein worauf du gewartet hast!',
 'Das ist okay. Was wäre wenn ich dir zeige dass es kein Risiko gibt? Dann ist "neu" nicht mehr scary.',
 'Was genau macht dir Sorgen bei neuen Dingen? Lass uns das aufschlüsseln.',
 'Was war das letzte Neue das du ausprobiert hast? Und wie ist es ausgegangen?',
 'Klein anfangen. Teste es 1 Woche. Dann entscheidest du.',
 4),

('Das ist bestimmt Betrug', 'trust',
 'Ich verstehe die Vorsicht. Hier sind die Fakten: X Jahre am Markt, Y Kunden, Z Umsatz. Betrüger überleben das nicht.',
 'Diese Angst hatte ich auch. Aber ich nutze es selbst seit X Monaten. Warum würde ich dir was Schlechtes empfehlen?',
 'Woran genau machst du Betrug fest? Was müsste ich dir zeigen damit du siehst dass es seriös ist?',
 'Lass uns die Fakten prüfen: Firmensitz, Umsatz, Jahre am Markt, Zertifizierungen. Alles transparent.',
 'Ich verstehe das total! Ich zeig dir alles offen - Firma, Produkte, meine eigenen Ergebnisse.',
 'Dein Misstrauen ist okay. Lass uns gemeinsam alles durchgehen. Du entscheidest dann.',
 'Welche Informationen brauchst du um zu verifizieren dass es kein Betrug ist?',
 'Was müsste ich dir zeigen damit du mir vertraust?',
 'Google die Firma. Lies Bewertungen. Überzeug dich selbst.',
 7),

('Das Produkt gibt es doch überall billiger', 'price_comparison',
 'Stimmt, es gibt günstigere Alternativen. Aber: Gleiche Inhaltsstoffe? Gleiche Qualität? Gleiche Wirkung?',
 'Ich verstehe den Preisreflex. Aber bei meiner Gesundheit spare ich nicht am falschen Ende.',
 'Wo genau? Zeig mir das Produkt - ich zeige dir den Unterschied.',
 'Lass uns die Zutaten vergleichen. Punkt für Punkt. Dann siehst du wo der Preisunterschied herkommt.',
 'Ich weiß was du meinst! Aber ich hab den Billigkram probiert - es ist nicht dasselbe.',
 'Das dachte ich auch zuerst. Dann hab ich verglichen. Soll ich dir den Unterschied zeigen?',
 'Hast du die genauen Inhaltsstoffe verglichen? Lass uns das zusammen machen.',
 'Welches Produkt meinst du genau? Lass uns vergleichen.',
 'Kauf beides. Vergleich selbst. Ich bin sicher du merkst den Unterschied.',
 5),

('Ich bin zu alt/jung dafür', 'age',
 'Das dachte auch mein Kunde mit X Jahren. Jetzt ist er einer meiner erfolgreichsten.',
 'Alter ist nur eine Zahl. Dein Körper/Geist braucht in JEDEM Alter Unterstützung.',
 'Ab welchem Alter genau darf man keine Ziele mehr haben? Wer hat das entschieden?',
 'Statistik: Die erfolgreichsten Networker sind zwischen 40-60. Du bist genau richtig.',
 'Das Alter spielt keine Rolle! Was zählt ist deine Energie und Einstellung!',
 'Ich kenne Leute in deinem Alter die super Ergebnisse haben. Soll ich dich connecten?',
 'Welche Altersgruppe nutzt das Produkt typischerweise? Hier sind die Daten...',
 'Fühlst du dich zu alt/jung oder sagt dir das jemand anderes?',
 'Probier es und dein Körper sagt dir ob es richtig ist. Der kennt kein Alter.',
 4),

('Meine Freunde werden mich auslachen', 'social_fear',
 'Die lachen bis sie deine Ergebnisse sehen. Dann fragen sie wie du das gemacht hast.',
 'Echte Freunde wollen dass du erfolgreich bist. Und die anderen? Sind die wirklich Freunde?',
 'Lachen sie auch wenn du mehr verdienst als sie? Wenn du gesünder aussiehst?',
 'Erfolg zeigt sich in Ergebnissen. Lass deine Ergebnisse sprechen, nicht Worte.',
 'Ich kenn das Gefühl! Aber weißt du was? Meine Freunde sind jetzt Kunden!',
 'Das ist eine berechtigte Sorge. Was wäre wenn du es erstmal für dich machst, ohne es zu erzählen?',
 'Welche Freunde genau meinst du? Und was genau würden sie kritisieren?',
 'Was ist dir wichtiger: Was andere denken oder deine eigenen Ergebnisse?',
 'Starte leise. Erzähl erst davon wenn du Ergebnisse hast die für sich sprechen.',
 5),

('Ich bin pleite', 'financial',
 'Das verstehe ich. Gerade DESHALB ist ein zweites Einkommen doch sinnvoll, oder?',
 'Ich war auch mal an dem Punkt. Dieses Business war mein Ausweg. Was hast du zu verlieren?',
 'Pleite sein und pleite bleiben sind zwei verschiedene Dinge. Was willst du?',
 'Rechnung: Startkosten X€, Break-even nach Y Wochen. Selbst wenn du pleite bist - es ist eine Investition.',
 'Das tut mir leid zu hören. Aber hey - vielleicht ist das genau der Grund WARUM du das brauchst!',
 'Ich verstehe deine Situation. Gibt es einen Weg wie wir das Schritt für Schritt machbar machen?',
 'Was genau ist dein monatliches Budget? Lass uns schauen was möglich ist.',
 'Was müsste passieren damit sich deine finanzielle Situation ändert?',
 'Fang minimal an. Ein Produkt. Eine Empfehlung. Schritt für Schritt.',
 6),

('Ich will niemanden nerven', 'social_selling',
 'Nerven und Helfen sind zwei verschiedene Dinge. Du teilst etwas das dir hilft.',
 'Würdest du es nervig finden wenn dir jemand etwas zeigt das dein Leben verbessert?',
 'Ist es nervig wenn dein Freund dir ein gutes Restaurant empfiehlt? Das ist dasselbe.',
 'Professionell gemacht nervt es nicht. Ich zeige dir wie es richtig geht.',
 'Das verstehe ich! Ich will auch niemanden nerven. Aber Teilen ist kein Nerven!',
 'Du nervst nicht wenn du authentisch bist und nur Leuten erzählst denen es helfen könnte.',
 'Es gibt eine Methode die nicht aufdringlich ist. Willst du sie lernen?',
 'Was genau empfindest du als "nerven"? Lass uns das definieren.',
 'Du teilst nur mit Menschen denen es helfen könnte. Das ist Service, kein Spam.',
 5),

('Corona/Wirtschaft - jetzt ist ein schlechter Zeitpunkt', 'timing',
 'Oder der beste? In Krisen entstehen die größten Chancen. Die Frage ist: Wartest du oder handelst du?',
 'Verstehe ich. Aber während andere warten, bauen andere ihr Business auf. Wo willst du sein?',
 'Wann ist der perfekte Zeitpunkt? Gibt es den? Oder gibt es nur JETZT?',
 'Rezessionssichere Branchen: Gesundheit, Beauty, Notwendigkeiten. Genau DAS hier.',
 'Gerade JETZT suchen Menschen nach Lösungen! Das ist die beste Zeit!',
 'Ich verstehe die Unsicherheit. Was wäre wenn gerade JETZT der richtige Zeitpunkt ist?',
 'Historisch gesehen: Welche Unternehmen wurden in Krisen gegründet? Apple, Uber, Airbnb...',
 'Wenn nicht jetzt - wann dann? Was muss passieren für den "richtigen" Zeitpunkt?',
 'Fang klein an. Teste es. Wenn es nicht läuft, hörst du auf. Aber VERSUCH es.',
 5),

('Das kann ich selbst googlen', 'internet',
 'Stimmt, die Information ist da draußen. Aber meine persönliche Erfahrung und Begleitung bekommst du nicht bei Google.',
 'Google gibt dir Information. Ich gebe dir Transformation. Das ist der Unterschied.',
 'Google mal "erfolgreich werden" - und sag mir ob du danach erfolgreich bist.',
 'Information ohne Implementation ist nutzlos. Ich biete beides.',
 'Klar! Aber ich kann dir die Abkürzung zeigen. Ohne die Fehler die ich gemacht habe.',
 'Das kannst du. Aber willst du wirklich alleine durch Trial & Error lernen?',
 'Was genau willst du googlen? Ich kann dir die relevanten Quellen direkt geben.',
 'Was hast du schon gefunden? Lass uns darüber sprechen.',
 'Google es gerne. Und dann lass uns sprechen über das was du gefunden hast.',
 3);

-- ============================================
-- FEHLENDE AI PROMPTS (10 Module)
-- ============================================

INSERT INTO ai_prompts (name, category, description, prompt_template, is_active) VALUES

('LIABILITY-SHIELD', 'compliance',
 'Prüft Aussagen auf rechtliche Probleme und gibt sichere Alternativen',
 'Du bist ein Compliance-Experte. Analysiere folgende Aussage auf rechtlich problematische Formulierungen:

AUSSAGE: {{user_message}}

Prüfe auf:
1. Heilversprechen (verboten in DE)
2. Einkommensgarantien (irreführend)
3. Absolute Aussagen ("garantiert", "100%", "immer")
4. Vergleichende Werbung ohne Beleg
5. Falsche Tatsachenbehauptungen

Antworte im Format:
RISIKO-LEVEL: [GRÜN/GELB/ROT]
PROBLEME: [Liste der Probleme]
SICHERE ALTERNATIVE: [Umformulierter Text]
BEGRÜNDUNG: [Kurze rechtliche Erklärung]',
 true),

('SCREENSHOT-REACTIVATOR', 'lead_gen',
 'Extrahiert Leads und Kontakte aus Screenshots von Listen',
 'Du bist ein Lead-Extraktions-Spezialist. Analysiere diesen Screenshot/diese Liste:

INPUT: {{screenshot_description}}

Extrahiere:
1. Namen (Vor- und Nachname)
2. Kontaktdaten (wenn sichtbar)
3. Unternehmen/Organisation
4. Position/Rolle
5. Potenzial-Einschätzung (1-10)

Für jeden Lead erstelle:
- LEAD-SCORE: [1-10]
- PRIORITÄT: [A/B/C]
- ERSTER KONTAKT: [Vorschlag für Ansprache]
- KANAL: [WhatsApp/Email/Telefon/LinkedIn]
- HOOK: [Personalisierter Opener basierend auf verfügbaren Infos]',
 true),

('OPPORTUNITY-RADAR', 'lead_gen',
 'Findet potenzielle Leads in der Umgebung basierend auf Standort',
 'Du bist ein lokaler Business-Scout. Der User ist hier:

STANDORT: {{location}}
BRANCHE: {{vertical}}
RADIUS: {{radius_km}} km

Analysiere:
1. Welche Geschäfte/Unternehmen in der Nähe könnten Interesse haben?
2. Lokale Events oder Networking-Möglichkeiten
3. Saisonale Chancen (Messen, Märkte, etc.)

Erstelle eine Liste mit:
- BUSINESS-TYP: [Art des Unternehmens]
- WARUM RELEVANT: [Grund für Potenzial]
- APPROACH: [Wie ansprechen]
- BESTE ZEIT: [Wann kontaktieren]
- SCRIPT: [Konkreter Opener]',
 true),

('SPEED-HUNTER-LOOP', 'workflow',
 'Schneller Lead-Workflow - nächste Aktion nach Erledigung',
 'Du bist ein Sales-Velocity-Coach. Der User hat gerade diese Aktion abgeschlossen:

ERLEDIGTE AKTION: {{completed_action}}
ERGEBNIS: {{result}}
AKTUELLER LEAD: {{lead_info}}

Berechne sofort:
1. War die Aktion erfolgreich? [JA/NEIN/TEILWEISE]
2. Was ist die NÄCHSTE beste Aktion? (Max 1 Aktion)
3. In wie vielen Minuten sollte sie passieren?

Antworte kurz und direkt:
✅ ERLEDIGT: [Zusammenfassung]
➡️ NÄCHSTE AKTION: [Eine konkrete Aktion]
⏰ WANN: [Zeitpunkt]
📝 SCRIPT: [Wenn relevant, kurzes Script]
🎯 ZIEL: [Was soll erreicht werden]',
 true),

('SOCIAL-LINK-GENERATOR', 'tools',
 'Erstellt Magic Links für WhatsApp, Instagram, etc.',
 'Du bist ein Social-Media-Link-Spezialist. Erstelle personalisierte Links:

EMPFÄNGER: {{recipient_name}}
PLATTFORM: {{platform}}
NACHRICHT-INTENTION: {{intention}}
KONTEXT: {{context}}

Generiere:
1. Fertigen klickbaren Link
2. Vorausgefüllte Nachricht (wenn möglich)
3. Alternative Nachrichten-Varianten
4. Beste Sendezeit

FORMAT:
📱 LINK: [Fertiger Link]
💬 NACHRICHT: [Vorgeschlagener Text]
🔄 ALTERNATIVE 1: [Andere Variante]
🔄 ALTERNATIVE 2: [Andere Variante]
⏰ BESTE ZEIT: [Wann senden]
💡 TIPP: [Zusätzlicher Hinweis]',
 true),

('PORTFOLIO-SCANNER', 'analysis',
 'Analysiert Lead-Listen auf Potenzial und priorisiert',
 'Du bist ein Portfolio-Analyst. Analysiere diese Lead-Liste:

LEADS: {{lead_list}}
KRITERIEN: {{criteria}}

Für jeden Lead berechne:
1. POTENZIAL-SCORE (1-100)
2. PRIORITÄT (Hot/Warm/Cold)
3. GESCHÄTZTER DEAL-WERT
4. ERFOLGSWAHRSCHEINLICHKEIT
5. NÄCHSTE BESTE AKTION

Sortiere nach Priorität und gib aus:
🔥 HOT LEADS (Sofort kontaktieren):
[Liste mit Score und Aktion]

🌡️ WARM LEADS (Diese Woche):
[Liste mit Score und Aktion]

❄️ COLD LEADS (Nurture):
[Liste mit Score und Aktion]

📊 PORTFOLIO-SUMMARY:
- Gesamt-Potenzial: €X
- Erwarteter Umsatz: €Y
- Top 3 Prioritäten: [Namen]',
 true),

('BATTLE-CARD', 'competitive',
 'Erstellt Vergleichskarten gegen Konkurrenz',
 'Du bist ein Competitive-Intelligence-Experte. Erstelle eine Battle Card:

UNSER PRODUKT: {{our_product}}
KONKURRENT: {{competitor}}
SITUATION: {{situation}}

Analysiere und erstelle:

⚔️ BATTLE CARD: {{our_product}} vs {{competitor}}

UNSERE STÄRKEN:
✅ [Stärke 1 + Beweis]
✅ [Stärke 2 + Beweis]
✅ [Stärke 3 + Beweis]

IHRE SCHWÄCHEN:
❌ [Schwäche 1 + Wie ansprechen]
❌ [Schwäche 2 + Wie ansprechen]

WENN SIE SAGEN... WIR SAGEN...:
"[Konkurrenz-Argument 1]" → "[Unsere Antwort]"
"[Konkurrenz-Argument 2]" → "[Unsere Antwort]"
"[Konkurrenz-Argument 3]" → "[Unsere Antwort]"

KILLER-FRAGE:
❓ [Frage die Konkurrenz schlecht aussehen lässt]

CLOSING-STATEMENT:
💪 [Starkes Abschluss-Statement]',
 true),

('FEUERLÖSCHER-LEAF', 'de_escalation',
 'De-Eskalation mit L.E.A.F. Methode bei verärgerten Kunden',
 'Du bist ein De-Eskalations-Experte. Der Kunde ist verärgert:

SITUATION: {{situation}}
KUNDEN-AUSSAGE: {{customer_statement}}

Wende die L.E.A.F. Methode an:

🔥 FEUERLÖSCHER AKTIVIERT

L - LISTEN (Zuhören):
"[Zeige dass du verstanden hast, wiederhole das Problem]"

E - EMPATHIZE (Mitfühlen):
"[Zeige echtes Verständnis für die Emotion]"

A - APOLOGIZE (Entschuldigen):
"[Aufrichtige Entschuldigung - auch wenn nicht deine Schuld]"

F - FIX (Lösen):
"[Konkrete Lösung oder nächste Schritte]"

KOMPLETTES SCRIPT:
[Füge alles zu einem natürlichen Gesprächsablauf zusammen]

⚠️ VERMEIDE:
- [Was du NICHT sagen solltest]

✅ NACH DER LÖSUNG:
- [Follow-up Aktion]',
 true),

('VERHANDLUNGS-JUDO', 'negotiation',
 'Preis-Verteidigung und Verhandlungstaktiken',
 'Du bist ein Verhandlungs-Meister. Der Kunde verhandelt:

SITUATION: {{situation}}
KUNDEN-FORDERUNG: {{customer_demand}}
UNSER SPIELRAUM: {{our_flexibility}}

Wende Verhandlungs-Judo an (nutze ihre Kraft):

🥋 VERHANDLUNGS-ANALYSE

IHRE POSITION: [Was sie wollen]
IHRE WAHRES INTERESSE: [Was sie WIRKLICH wollen]
UNSER HEBEL: [Unsere Stärke in der Verhandlung]

TAKTIK 1 - ANKER SETZEN:
"[Starte mit höherem Angebot]"

TAKTIK 2 - WERT STATT PREIS:
"[Lenke auf Wert um]"

TAKTIK 3 - GEGENFORDERUNG:
"[Wenn sie X wollen, wollen wir Y]"

TAKTIK 4 - SCHWEIGEN:
"[Nach Nennung des Preises - Schweigen]"

FALLBACK-ANGEBOT:
"[Wenn alles andere scheitert]"

WALK-AWAY-POINT:
"[Ab hier lieber kein Deal]"

SCRIPT FÜR DIESE SITUATION:
[Komplettes Verhandlungs-Script]',
 true),

('CLIENT-INTAKE', 'tools',
 'Erstellt personalisierte Fragebögen für neue Kunden',
 'Du bist ein Onboarding-Spezialist. Erstelle einen Fragebogen:

PRODUKT/SERVICE: {{product}}
ZIEL: {{goal}}
BRANCHE: {{vertical}}

Erstelle einen INTAKE-FRAGEBOGEN:

📋 CLIENT INTAKE: {{product}}

PHASE 1 - WARM-UP (Einfache Fragen):
1. [Einfache Frage]
2. [Einfache Frage]

PHASE 2 - SITUATION (Aktueller Stand):
3. [Situations-Frage]
4. [Situations-Frage]
5. [Situations-Frage]

PHASE 3 - PAIN POINTS (Probleme):
6. [Problem-Frage]
7. [Problem-Frage]

PHASE 4 - GOALS (Ziele):
8. [Ziel-Frage]
9. [Ziel-Frage]

PHASE 5 - COMMITMENT (Verbindlichkeit):
10. [Commitment-Frage]

AUSWERTUNGS-LOGIK:
- Wenn Antwort X bei Frage Y → [Empfehlung]
- Wenn Score > Z → [Empfehlung]

NÄCHSTER SCHRITT NACH INTAKE:
[Was passiert mit den Antworten]',
 true);

-- ============================================
-- SUCCESS STORIES (10 Beispiele)
-- ============================================

INSERT INTO success_stories (company_name, person_name, person_background, before_situation, turning_point, transformation, result, timeline, use_case, best_for_objection, emotional_hook) VALUES

('Zinzino', 'Maria K., 43, München',
 'Alleinerziehende Mutter, Teilzeit-Bürojob',
 'Ständig müde, konnte mit den Kindern nicht mehr mithalten. Ärzte fanden nichts.',
 'Eine Freundin zeigte ihr den BalanceTest. Ergebnis: Omega-Verhältnis 15:1 statt 3:1.',
 '120 Tage BalanceOil. Neuer Test: 3:1. Energie wie mit 30.',
 'Heute Team-Leaderin, verdient mehr als im Bürojob, arbeitet von zuhause.',
 '6 Monate',
 'social_proof', 'funktioniert das wirklich',
 'Eine Mutter die endlich wieder mit ihren Kindern toben kann'),

('Herbalife', 'Thomas R., 52, Hamburg',
 'Außendienst-Verkäufer, 110kg, Bluthochdruck',
 'Arzt sagte: Abnehmen oder Tabletten für immer. Alle Diäten gescheitert.',
 'Kollege im Außendienst hatte 20kg verloren. Fragte wie.',
 'Formula 1 zum Frühstück, normale Mahlzeiten sonst. Einfach.',
 '23kg weniger, keine Blutdrucktabletten mehr, Arzt sprachlos.',
 '8 Monate',
 'social_proof', 'Diäten funktionieren nicht bei mir',
 'Ein Mann der seinen Enkeln jetzt hinterherrennen kann'),

('PM International', 'Sandra M., 38, Wien',
 'Marketing-Managerin, 60-Stunden-Wochen',
 'Burnout-Vorstufe. Kaffee hielt nicht mehr wach. Konzentration weg.',
 'Kunde schwärmte von FitLine. Dachte: Was hab ich zu verlieren?',
 'Nach 1 Woche Activize: Klarer Kopf. Nach 1 Monat: Kein Nachmittagstief mehr.',
 'Immer noch gleicher Job, aber schafft jetzt alles in 45 Stunden. Rest ist Familie.',
 '3 Monate',
 'social_proof', 'bin zu beschäftigt',
 'Eine Karrierefrau die ihre Familie zurückbekommen hat'),

('doTERRA', 'Lisa S., 29, Berlin',
 'Kindergärtnerin, ständig erkältet',
 '8x im Jahr krank. Antibiotika ohne Ende. Immunsystem am Boden.',
 'Kollegin diffuste On Guard im Gruppenraum. Alle weniger krank.',
 'Eigener Diffuser zuhause. On Guard täglich. Komplette Öl-Routine.',
 'Nur noch 2x krank im Jahr. Keine Antibiotika seit 18 Monaten.',
 '12 Monate',
 'social_proof', 'glaube nicht an Naturheilkunde',
 'Eine junge Frau die ihr Immunsystem zurückerobert hat'),

('Forever Living', 'Helmut G., 61, Köln',
 'Rentner, Verdauungsprobleme seit 20 Jahren',
 'Jeden Morgen Bauchschmerzen. Jedes Essen ein Risiko. Lebensqualität im Keller.',
 'Tochter brachte Aloe Vera Gel mit. "Papa, trink das mal."',
 '30ml jeden Morgen. Nach 2 Wochen: Erste schmerzfreie Tage seit Jahren.',
 'Isst wieder alles. Reist wieder. Sagt: Hätte ich das mal früher gewusst.',
 '2 Monate',
 'social_proof', 'in meinem Alter hilft nichts mehr',
 'Ein Rentner der sein Leben zurück hat'),

('Juice Plus', 'Anna B., 35, Stuttgart',
 '2 Kinder, Vollzeit-Job, kocht nie',
 'Kinder aßen nur Nudeln und Chicken Nuggets. Schlechtes Gewissen täglich.',
 'Kinderärztin empfahl Juice Plus. Kinder bekommen es kostenlos zum Eltern-Abo.',
 'Kinder nehmen die Gummies freiwillig. Weniger krank. Bessere Konzentration in der Schule.',
 'Mutter des Jahres-Gefühl. Endlich kein schlechtes Gewissen mehr.',
 '4 Monate',
 'social_proof', 'meine Kinder essen kein Gemüse',
 'Eine Mutter die ihren Kindern endlich Nährstoffe gibt'),

('Nu Skin', 'Petra W., 48, Frankfurt',
 'Unternehmerin, erste tiefe Falten',
 'Botox kam nicht in Frage. Cremes für 200€ brachten nichts.',
 'Geschäftspartnerin sah 10 Jahre jünger aus. Fragte nach ihrem Geheimnis.',
 'LumiSpa jeden Abend, ageLOC System. Haut wie neu.',
 'Mitarbeiter fragten ob sie im Urlaub war. Nein - nur neue Hautpflege.',
 '6 Wochen',
 'social_proof', 'Anti-Aging funktioniert nicht',
 'Eine Frau die ohne OP 10 Jahre jünger aussieht'),

('Lifewave', 'Michael K., 55, Düsseldorf',
 'Ex-Leistungssportler, chronische Knieschmerzen',
 'Karriere-Ende wegen Knie. Schmerzmittel täglich. Keine Lösung in Sicht.',
 'Mannschaftskamerad zeigte IceWave Pflaster. "Klingt verrückt, aber probier mal."',
 'Pflaster aufs Knie. Nach 10 Minuten: Schmerz von 8 auf 3.',
 'Joggt wieder. Spielt mit den Enkeln Fußball. Schmerzmittel-frei.',
 '1 Woche erste Wirkung, 3 Monate dauerhaft',
 'social_proof', 'Pflaster können keine Schmerzen lindern',
 'Ein Sportler der seine Bewegungsfreiheit zurück hat'),

('Thermomix', 'Sabine L., 42, Nürnberg',
 '4-köpfige Familie, hasst Kochen',
 'Jeden Abend Stress: Was kochen? Immer dasselbe. Kinder meckern.',
 'Freundin lud zur Kochshow ein. Skeptisch hingegangen.',
 'Thermomix kocht quasi alleine. App sagt was zu tun ist. Kinder helfen jetzt mit.',
 'Kocht jeden Tag frisch. Familie isst zusammen. Kinder lieben es.',
 'Sofort',
 'social_proof', 'ich kann nicht kochen',
 'Eine Familie die wieder zusammen am Tisch sitzt'),

('Amway', 'Frank H., 50, Leipzig',
 'Ingenieur, skeptisch gegen alles "Unkonventionelle"',
 'Frau nutzte Nutrilite. Er: "Geldverschwendung." Sie: "Probier mal."',
 'Widerwillig 30-Tage-Test. Um ihr zu beweisen dass es Quatsch ist.',
 'Mehr Energie. Besserer Schlaf. Musste zugeben: Es wirkt.',
 'Jetzt nutzt die ganze Familie Amway. Er hat sich entschuldigt.',
 '30 Tage',
 'social_proof', 'glaube nicht an Nahrungsergänzung',
 'Ein Skeptiker der überzeugt wurde - von seinem eigenen Körper');

-- ============================================
-- LIABILITY RULES (Rechtliche Trigger)
-- ============================================

INSERT INTO liability_rules (trigger_word, trigger_pattern, warning_message, safe_alternative, category, severity) VALUES

('garantiert', 'garantier', '⚠️ STOPP: Garantieversprechen können rechtlich problematisch sein!', 'Sage stattdessen: "In vielen Fällen..." oder "Erfahrungsgemäß..."', 'legal', 'warning'),
('heilt', 'heil', '🚨 ACHTUNG: Heilversprechen sind in Deutschland VERBOTEN!', 'Sage stattdessen: "Kann unterstützen bei..." oder "Viele berichten von..."', 'health', 'critical'),
('100%', '100', '⚠️ VORSICHT: Absolute Aussagen vermeiden!', 'Sage stattdessen: "In den meisten Fällen..." oder "Sehr hohe Erfolgsquote..."', 'legal', 'warning'),
('immer', 'immer', '⚠️ HINWEIS: "Immer" ist eine absolute Aussage', 'Sage stattdessen: "Häufig..." oder "In der Regel..."', 'legal', 'info'),
('nie', 'nie ', '⚠️ HINWEIS: "Nie" ist eine absolute Aussage', 'Sage stattdessen: "Selten..." oder "In den wenigsten Fällen..."', 'legal', 'info'),
('Wundermittel', 'wunder', '🚨 KRITISCH: "Wundermittel" ist ein Red Flag für Abmahnung!', 'Beschreibe stattdessen konkrete, belegbare Vorteile', 'legal', 'critical'),
('nachgewiesen', 'nachgewies', '⚠️ VORSICHT: "Nachgewiesen" erfordert Quellenangabe!', 'Füge hinzu: "Laut Studie XY..." oder "Laut Hersteller..."', 'legal', 'warning'),
('Arzt empfiehlt', 'arzt empfiehl', '🚨 ACHTUNG: Ärztliche Empfehlungen nur mit Beleg!', 'Sage stattdessen: "Viele Anwender berichten..." (ohne Arzt-Referenz)', 'health', 'critical'),
('wissenschaftlich', 'wissenschaft', '⚠️ HINWEIS: "Wissenschaftlich" erfordert Quellenangabe!', 'Füge hinzu: "Laut [Studie/Quelle]..." oder lass es weg', 'legal', 'warning'),
('alle', ' alle ', '⚠️ VORSICHT: "Alle" ist eine Verallgemeinerung', 'Sage stattdessen: "Viele..." oder "Die meisten..."', 'legal', 'info'),
('sofort', 'sofort', '⚠️ HINWEIS: "Sofort" kann unrealistische Erwartungen wecken', 'Sage stattdessen: "Schnell..." oder "Zeitnah..."', 'legal', 'info'),
('reich', 'reich werd', '🚨 KRITISCH: Einkommensversprechen sind irreführend!', 'Sage stattdessen: "Möglichkeit für Zusatzeinkommen..." oder zeige durchschnittliche Verdienste', 'income', 'critical'),
('passives Einkommen', 'passiv', '⚠️ VORSICHT: "Passives Einkommen" muss realistisch sein', 'Erkläre dass Aufbauarbeit nötig ist bevor Einkommen passiv wird', 'income', 'warning'),
('nebenbei', 'nebenbei.*verdien', '⚠️ HINWEIS: Realistisch bleiben bei Verdienstaussagen', 'Sage stattdessen: "Mit X Stunden pro Woche ist Y möglich..."', 'income', 'warning'),
('ohne Arbeit', 'ohne arbeit', '🚨 KRITISCH: Irreführende Verdienstversprechen!', 'Jedes Einkommen erfordert Arbeit - sei ehrlich darüber', 'income', 'critical');

-- ============================================
-- INDIZES FÜR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_intelligence_name ON company_intelligence(company_name);
CREATE INDEX IF NOT EXISTS idx_company_intelligence_vertical ON company_intelligence(vertical);
CREATE INDEX IF NOT EXISTS idx_objection_library_category ON objection_library(objection_category);
CREATE INDEX IF NOT EXISTS idx_objection_library_vertical ON objection_library(vertical);
CREATE INDEX IF NOT EXISTS idx_success_stories_company ON success_stories(company_name);
CREATE INDEX IF NOT EXISTS idx_liability_rules_trigger ON liability_rules(trigger_word);

-- ============================================
-- UPDATED_AT TRIGGER für company_intelligence
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_company_intelligence_updated_at ON company_intelligence;
CREATE TRIGGER update_company_intelligence_updated_at
    BEFORE UPDATE ON company_intelligence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FERTIG! 🎉
-- ============================================

-- Zusammenfassung:
-- ✅ 4 neue Tabellen erstellt
-- ✅ 10 Companies mit Intelligence-Daten
-- ✅ 20 Einwände mit DISG-Antworten
-- ✅ 10 AI Prompts für neue Module
-- ✅ 10 Success Stories
-- ✅ 15 Liability Rules
-- ✅ Performance-Indizes
-- ✅ Auto-Update Trigger

