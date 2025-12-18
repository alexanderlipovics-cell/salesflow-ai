-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SEED: 52 Network Marketing Scripts für NetworkerOS                        ║
-- ║  Kopiere diesen gesamten Inhalt in Supabase SQL Editor und klicke "Run"   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Erst Tabelle erstellen falls nicht vorhanden
CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_number INTEGER,
    category TEXT NOT NULL,
    subcategory TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    disg_hints JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'de',
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category);
CREATE INDEX IF NOT EXISTS idx_scripts_number ON scripts(script_number);

-- Alte Scripts löschen (falls vorhanden)
DELETE FROM scripts WHERE language = 'de';

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 1: ERSTKONTAKT (Scripts #1-10)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #1 Warm Market - Der ehrliche Ansatz
(1, 'erstkontakt', 'warm_market', 'Der ehrliche Ansatz',
'Hey [Name]! 👋

Ich weiß, das kommt jetzt vielleicht überraschend, aber ich hab vor kurzem etwas Spannendes angefangen und du bist eine der ersten Personen, an die ich gedacht habe.

Es geht um [Produkt/Thema] - und bevor du jetzt denkst "Oh nein, will der mir was verkaufen" 😅 - ich würde dir einfach gerne kurz zeigen, worum es geht.

Wenn''s nichts für dich ist, völlig okay. Aber ich würde mich über deine ehrliche Meinung freuen.

Hättest du diese Woche 15 Minuten Zeit für einen kurzen Call?',
'{"D": "Kürzer: Direkt zum Punkt, keine Emojis", "I": "Mehr Enthusiasmus, Story einbauen", "S": "Betone: Kein Druck, nur Meinung", "G": "Fakten hinzufügen: Was genau ist es?"}'::jsonb,
ARRAY['warm', 'classic', 'proven', 'beginner-friendly']),

-- #2 Warm Market - Der Neugier-Wecker
(2, 'erstkontakt', 'warm_market', 'Der Neugier-Wecker',
'Hey [Name], kurze Frage:

Bist du grundsätzlich offen für neue Möglichkeiten, nebenbei etwas aufzubauen? Frag nur, weil ich gerade an was dran bin und mir ein paar Gedanken gemacht hab, wer dafür passen könnte.',
'{"D": "Noch kürzer, direkte Frage", "I": "Mehr Spannung aufbauen", "S": "Sanfter: Kein Druck", "G": "Konkreter: Was für Möglichkeiten?"}'::jsonb,
ARRAY['warm', 'curiosity', 'short']),

-- #3 Warm Market - Der Kompliment-Opener
(3, 'erstkontakt', 'warm_market', 'Der Kompliment-Opener',
'Hey [Name]! 

Ich hab letztens an dich gedacht - du bist ja immer so [positives Attribut: gut vernetzt / offen für Neues / unternehmerisch unterwegs].

Ich bin gerade an einem Projekt dran und such Leute, die [Eigenschaft] sind. Bevor ich dir mehr erzähle - wärst du prinzipiell offen, dir mal was anzuschauen?',
'{"D": "Weniger Komplimente, mehr Substanz", "I": "Mehr Komplimente, mehr Enthusiasm", "S": "Betone Beziehung", "G": "Was genau für ein Projekt?"}'::jsonb,
ARRAY['warm', 'compliment', 'relationship']),

-- #4 Cold Market - Social Media DM
(4, 'erstkontakt', 'cold_market', 'Social Media DM',
'Hey [Name]! 

Bin gerade auf dein Profil gestoßen und finde echt cool, was du machst [konkretes Detail nennen].

Ich bin im Bereich [Branche] unterwegs und vernetze mich gerade mit interessanten Leuten. Keine Ahnung ob''s passt, aber: Bist du offen für neue Kontakte?',
'{"D": "Kürzer, direkter zum Business", "I": "Mehr Begeisterung für deren Content", "S": "Langsamer, mehr Beziehungsaufbau", "G": "Mehr Details über dich"}'::jsonb,
ARRAY['cold', 'social-media', 'dm', 'instagram']),

-- #5 Cold Market - Der Lifestyle-Ansatz
(5, 'erstkontakt', 'cold_market', 'Der Lifestyle-Ansatz',
'Hey! Mir ist aufgefallen, dass du auch [gemeinsames Interesse: Fitness / Reisen / Familie / Business] liebst.

Ich arbeite mit einem Team zusammen, das [Benefit] ermöglicht - ohne [Pain Point].

Ist wahrscheinlich nicht dein Ding, aber falls du neugierig bist: Ich zeig dir gern in 10 Min, worum es geht. Was meinst du?',
'{"D": "Benefit stärker betonen", "I": "Lifestyle-Story erzählen", "S": "Weniger pushy", "G": "Zahlen und Fakten"}'::jsonb,
ARRAY['cold', 'lifestyle', 'interest-based']),

-- #6 Online Lead - Nach Opt-in
(6, 'erstkontakt', 'online_lead', 'Nach Opt-in',
'Hey [Name]! 

Danke, dass du dich eingetragen hast 🙌

Du hast Interesse an [Thema] gezeigt - super! Lass mich kurz wissen: Was hat dich am meisten angesprochen? Dann kann ich dir gezielt weiterhelfen.

PS: Ich bin echte Person, kein Bot 😄',
'{"D": "Direkt zum Call auffordern", "I": "Mehr Emojis, mehr Enthusiasm", "S": "Sanfter, Fragen stellen", "G": "Mehr Infos geben"}'::jsonb,
ARRAY['online', 'lead', 'opt-in', 'funnel']),

-- #7 Referral - Empfehlung
(7, 'erstkontakt', 'referral', 'Empfehlung',
'Hey [Name]!

[Gemeinsamer Kontakt] hat mir erzählt, dass du [Situation/Interesse] hast, und meinte, ich sollte mich unbedingt mal bei dir melden.

Ich bin im Bereich [Thema] unterwegs und [gemeinsamer Kontakt] dachte, das könnte interessant für dich sein.

Hättest du kurz Zeit für ein Gespräch diese Woche?',
'{"D": "Direkt zum Punkt", "I": "Geschichte mit gemeinsamem Kontakt", "S": "Beziehung betonen", "G": "Warum genau passt es?"}'::jsonb,
ARRAY['referral', 'warm', 'introduction']),

-- #8 Event - Nach Kennenlernen
(8, 'erstkontakt', 'event', 'Nach Kennenlernen',
'Hey [Name]!

Hat mich echt gefreut, dich [bei Event] kennenzulernen! 

Du hattest ja erwähnt, dass [ihr Thema/Problem]. Ich hab da tatsächlich was, das perfekt passen könnte.

Lass uns mal telefonieren - wann passt dir diese Woche?',
'{"D": "Noch kürzer", "I": "Mehr über Event schwärmen", "S": "Erst Beziehung vertiefen", "G": "Details zum Gespräch"}'::jsonb,
ARRAY['event', 'follow-up', 'networking']),

-- #9 Reaktivierung - Alter Kontakt
(9, 'erstkontakt', 'reaktivierung', 'Alter Kontakt',
'Hey [Name]! Lang ist''s her! 

Wie geht''s dir so? Hab letztens an dich gedacht, weil [Grund].

Bei mir hat sich einiges getan - bin jetzt in [Bereich] unterwegs und es läuft richtig gut. Würd mich freuen, mal wieder zu quatschen!

Hast du Zeit diese Woche?',
'{"D": "Business-Fokus stärker", "I": "Mehr Enthusiasm über Wiedersehen", "S": "Mehr Zeit für Catch-up", "G": "Was genau hat sich getan?"}'::jsonb,
ARRAY['reactivation', 'old-contact', 'relationship']),

-- #10 Facebook Gruppe - Kommentar
(10, 'erstkontakt', 'social_media', 'Facebook Gruppe Kommentar',
'Hey [Name]!

Hab deinen Kommentar in [Gruppe] gesehen - fand ich echt gut, was du geschrieben hast!

Bin auch in dem Bereich unterwegs. Magst du dich vernetzen?',
'{"D": "Direkter", "I": "Mehr Begeisterung", "S": "Langsamer Aufbau", "G": "Mehr Kontext"}'::jsonb,
ARRAY['social-media', 'facebook', 'group', 'comment']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 2: FOLLOW-UP (Scripts #11-19)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #11 Nach Präsentation Tag 1
(11, 'followup', 'nach_praesentation', 'Tag 1 - Erste Reaktion',
'Hey [Name]!

Danke nochmal für deine Zeit gestern! 🙏

Was war dein erster Gedanke, nachdem wir aufgelegt haben?',
'{"D": "Direkter: Was ist deine Entscheidung?", "I": "Mehr Emojis, enthusiastisch", "S": "Sanfter: Wie fühlst du dich damit?", "G": "Welche Fragen sind noch offen?"}'::jsonb,
ARRAY['followup', 'day-1', 'post-presentation']),

-- #12 Nach Präsentation Tag 2
(12, 'followup', 'nach_praesentation', 'Tag 2 - Fragen klären',
'Hey [Name]!

Ich wollte kurz nachhaken - hast du dir schon Gedanken gemacht?

Oft kommen nach dem ersten Gespräch noch Fragen auf. Was geht dir durch den Kopf?',
'{"D": "Direkt nach Entscheidung fragen", "I": "Enthusiasm zeigen", "S": "Kein Druck, nur Fragen", "G": "Spezifische Fragen anbieten"}'::jsonb,
ARRAY['followup', 'day-2', 'questions']),

-- #13 Nach Präsentation Tag 3
(13, 'followup', 'nach_praesentation', 'Tag 3 - Entscheidung',
'Hey [Name]!

Ich möchte dich nicht nerven, aber ich frag einfach direkt:

Ist das was für dich - ja oder nein?

Beides ist völlig okay. Ich möchte nur wissen, wo wir stehen.',
'{"D": "Perfekt so - direkt", "I": "Mehr Beziehung zeigen", "S": "Noch sanfter", "G": "Mehr Optionen anbieten"}'::jsonb,
ARRAY['followup', 'day-3', 'decision']),

-- #14 Keine Antwort - Sanft
(14, 'followup', 'ghosted', 'Keine Antwort - Sanft',
'Hey [Name]!

Hab schon länger nichts von dir gehört - alles gut bei dir?

Kein Stress wegen [Thema] - ich wollte nur mal Hallo sagen 👋',
'{"D": "Direkter: Interesse noch da?", "I": "Persönlicher, Sorge zeigen", "S": "Perfekt so", "G": "Konkreten Status erfragen"}'::jsonb,
ARRAY['followup', 'ghosted', 'soft', 'no-response']),

-- #15 Keine Antwort - Break-Up
(15, 'followup', 'ghosted', 'Keine Antwort - Break-Up',
'Hey [Name]!

Ich glaub, ich hab meine Antwort 😅

Kein Problem - ich hak das Thema für uns ab. Falls sich mal was ändert, weißt du ja, wo du mich findest.

Alles Gute dir! 🙌',
'{"D": "Perfekt - klar und direkt", "I": "Mehr Optimismus für später", "S": "Tür offenlassen", "G": "Sachlich und professionell"}'::jsonb,
ARRAY['followup', 'ghosted', 'breakup', 'final']),

-- #16 Langzeit 30+ Tage
(16, 'followup', 'langzeit', '30 Tage - Check-in',
'Hey [Name]!

Ich räum gerade meine Kontakte auf und bin bei dir hängen geblieben.

Wir hatten vor [Zeitraum] mal über [Thema] gesprochen. Wollte mal hören, wie''s dir geht und ob sich was geändert hat?',
'{"D": "Schnell zum Punkt", "I": "Mehr persönliches Interesse", "S": "Sanft, kein Druck", "G": "Was hat sich konkret geändert?"}'::jsonb,
ARRAY['followup', 'longterm', '30-days']),

-- #17 Langzeit 60+ Tage
(17, 'followup', 'langzeit', '60 Tage - Neuer Aufhänger',
'Hey [Name]!

Lange her! Ich hab an dich gedacht, weil [aktueller Anlass: News, neues Produkt, Success Story].

Du warst damals interessiert an [Thema] - ist das noch aktuell?',
'{"D": "Direkter Business-Fokus", "I": "Enthusiasm über News", "S": "Beziehung zuerst", "G": "Konkrete News teilen"}'::jsonb,
ARRAY['followup', 'longterm', '60-days', 'new-hook']),

-- #18 Langzeit 90+ Tage
(18, 'followup', 'langzeit', '90 Tage - Neustart',
'Hey [Name]!

Wir hatten vor einer Weile mal gesprochen - das ist jetzt schon [Zeitraum] her!

Bei mir hat sich viel getan: [1-2 Updates]. Würde mich freuen, mal wieder zu hören wie''s dir geht.

Kaffee (virtuell oder real)?',
'{"D": "Business-Update fokussieren", "I": "Enthusiasm zeigen", "S": "Persönlich halten", "G": "Konkrete Updates"}'::jsonb,
ARRAY['followup', 'longterm', '90-days', 'restart']),

-- #19 Nach "Muss überlegen"
(19, 'followup', 'nach_einwand', 'Nach Muss Überlegen',
'Hey [Name]!

Du wolltest ja noch drüber nachdenken - was ist dabei rausgekommen?

Gibt''s noch offene Fragen, die ich klären kann?',
'{"D": "Direkt: Ja oder Nein?", "I": "Enthusiasm beibehalten", "S": "Raum geben", "G": "Spezifische Fragen anbieten"}'::jsonb,
ARRAY['followup', 'think-about-it', 'objection']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 3: EINWAND-BEHANDLUNG (Scripts #20-35)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #20 Keine Zeit - Variante 1
(20, 'einwand', 'keine_zeit', 'Keine Zeit - Verständnis',
'Das verstehe ich total. Wir sind alle busy.

Lass mich dich was fragen: Wenn du MEHR Zeit hättest - wäre es dann interessant für dich?

Denn genau darum geht''s eigentlich: Sich ein Einkommen aufzubauen, das einem langfristig MEHR Zeit gibt, nicht weniger.',
'{"D": "Kürzer, ROI-fokussiert", "I": "Story über Zeitgewinn", "S": "Mehr Verständnis", "G": "Zahlen: Wie viel Zeit genau?"}'::jsonb,
ARRAY['objection', 'no-time', 'empathy']),

-- #21 Keine Zeit - Variante 2
(21, 'einwand', 'keine_zeit', 'Keine Zeit - Challenge',
'Ich verstehe. Darf ich ehrlich sein?

Die erfolgreichsten Leute, die ich kenne, sind auch die beschäftigsten. Aber sie haben gelernt, Zeit für die RICHTIGEN Dinge zu finden.

Was wäre, wenn du mit nur 30 Minuten am Tag anfangen könntest?',
'{"D": "Perfekt - Challenge-Modus", "I": "Mehr Inspiration", "S": "Sanfter formulieren", "G": "Konkreter Zeitplan"}'::jsonb,
ARRAY['objection', 'no-time', 'challenge']),

-- #22 Kein Geld - Variante 1
(22, 'einwand', 'kein_geld', 'Kein Geld - Verständnis',
'Das kann ich nachvollziehen. Geld ist für die meisten ein Thema.

Aber lass mich fragen: Wenn Geld KEIN Thema wäre - würdest du dann einsteigen?

[Wenn ja:] Okay, dann lass uns schauen, wie wir das lösen können. Es gibt verschiedene Einstiegsmöglichkeiten...',
'{"D": "Direkt zur Lösung", "I": "Möglichkeiten aufzeigen", "S": "Kein Druck", "G": "Konkrete Zahlen"}'::jsonb,
ARRAY['objection', 'no-money', 'empathy']),

-- #23 Kein Geld - Variante 2
(23, 'einwand', 'kein_geld', 'Kein Geld - Investition',
'Ich verstehe. Die Frage ist: Ist "kein Geld" der Grund oder die Folge?

Was ich meine: Die meisten Menschen haben kein Geld, WEIL sie nie in sich selbst investiert haben.

Dieses Business ist eine Investition in DICH. Was wäre der Preis, wenn du die nächsten 5 Jahre genauso weitermachst wie jetzt?',
'{"D": "Perfekt - ROI-Fokus", "I": "Vision aufzeigen", "S": "Sanfter formulieren", "G": "Konkrete Rechnung"}'::jsonb,
ARRAY['objection', 'no-money', 'investment', 'mindset']),

-- #24 Partner/Familie sagt Nein
(24, 'einwand', 'partner', 'Partner sagt Nein',
'Das verstehe ich. Die Meinung deines Partners ist wichtig.

Darf ich fragen: Was genau sind die Bedenken? Oft sind es Missverständnisse, die sich leicht klären lassen.

Wäre es hilfreich, wenn wir das nächste Gespräch zu dritt führen? Dann kann ich alle Fragen direkt beantworten.',
'{"D": "Direkt zum Meeting zu dritt", "I": "Beziehung würdigen", "S": "Viel Verständnis", "G": "Konkrete Bedenken erfragen"}'::jsonb,
ARRAY['objection', 'partner', 'family', 'spouse']),

-- #25 MLM/Pyramide - Direkt
(25, 'einwand', 'mlm_pyramide', 'MLM/Pyramide - Direkter Konter',
'Ich verstehe die Skepsis - ich hatte sie am Anfang auch.

Hier ist der Unterschied: Bei einem Pyramidensystem verdienen nur die oben. Bei uns verdienen Leute, die mich eingeladen haben, teilweise WENIGER als ich - weil es auf LEISTUNG basiert, nicht auf Position.

Außerdem: Wir verkaufen echte Produkte, die Menschen wirklich nutzen und lieben.

Hast du konkrete Fragen zum Vergütungsplan?',
'{"D": "Noch direkter, Fakten", "I": "Persönliche Story", "S": "Mehr Verständnis zeigen", "G": "Vergütungsplan erklären"}'::jsonb,
ARRAY['objection', 'mlm', 'pyramid', 'scam', 'killer']),

-- #26 MLM/Pyramide - FTC Erklärung
(26, 'einwand', 'mlm_pyramide', 'MLM/Pyramide - FTC Erklärung',
'Gute Frage! Der Unterschied ist rechtlich klar definiert:

❌ Pyramidensystem: Geld verdienen durch Anwerben, kein echtes Produkt
✅ Legales Network Marketing: Geld verdienen durch Produktverkauf, Recruiting optional

Unsere Firma existiert seit [X Jahren], ist [Zertifizierungen], und der Großteil des Umsatzes kommt von echten Kunden, nicht von Vertriebspartnern.

Macht das Sinn?',
'{"D": "Perfekt - Fakten", "I": "Mehr Erfolgsgeschichten", "S": "Sanfter", "G": "Mehr Details, Quellen"}'::jsonb,
ARRAY['objection', 'mlm', 'pyramid', 'ftc', 'legal', 'killer']),

-- #27 MLM/Pyramide - Persönliche Story
(27, 'einwand', 'mlm_pyramide', 'MLM/Pyramide - Persönliche Story',
'Weißt du was? Ich dachte genauso wie du.

Als [Person] mir davon erzählt hat, war mein erster Gedanke: "Auf keinen Fall, das ist doch so ein Ding..."

Dann hab ich mir die Fakten angeschaut und gemerkt: Meine Vorurteile kamen von [schlechten Erfahrungen anderer / Medien / etc.].

Was mich überzeugt hat: [konkreter Grund].

Was wäre, wenn deine Vorurteile - wie meine - einfach nicht der Realität entsprechen?',
'{"D": "Kürzer, weniger emotional", "I": "Mehr Story-Details", "S": "Perfekt - persönlich", "G": "Fakten ergänzen"}'::jsonb,
ARRAY['objection', 'mlm', 'pyramid', 'personal', 'story', 'killer']),

-- #28 Kenne niemanden
(28, 'einwand', 'kenne_niemanden', 'Kenne Niemanden',
'Das sagen viele am Anfang! Weißt du, wie viele Kontakte du im Handy hast?

[Warten lassen...]

Die meisten haben 200-500. Das ist dein warmer Markt. Und wir starten nicht mit "verkaufen" - sondern mit echten Gesprächen.

Außerdem: Ich zeig dir, wie man auch komplett fremde Menschen anspricht - das ist erlernbar.',
'{"D": "Schneller zur Lösung", "I": "Begeisterung für Social Media", "S": "Schritt für Schritt", "G": "Konkrete Strategien"}'::jsonb,
ARRAY['objection', 'no-network', 'contacts', 'warm-market']),

-- #29 Nicht der Verkäufer-Typ
(29, 'einwand', 'nicht_verkaufen', 'Nicht der Verkäufer-Typ',
'Perfekt! Die besten Networker sind keine "Verkäufer".

Es geht nicht ums Verkaufen - es geht ums TEILEN. Du teilst etwas, das dir hilft, mit Menschen, die du magst.

Stell dir vor, du findest ein tolles Restaurant. Würdest du es Freunden empfehlen? Das ist Network Marketing. Nur dass du dafür bezahlt wirst.',
'{"D": "Kürzer, Business-Fokus", "I": "Mehr Begeisterung", "S": "Perfekt - sanft", "G": "Wie genau funktioniert teilen?"}'::jsonb,
ARRAY['objection', 'not-salesy', 'sharing', 'mindset']),

-- #30 Schlechte Erfahrungen
(30, 'einwand', 'schlechte_erfahrung', 'Schlechte Erfahrungen',
'Das tut mir leid zu hören. Darf ich fragen, was passiert ist?

[Zuhören...]

Ich verstehe. Leider gibt es in jeder Branche schwarze Schafe. Was ich dir versprechen kann: Bei uns läuft das anders, weil [konkreter Unterschied].

Was müsste passieren, damit du dem Ganzen noch eine Chance gibst?',
'{"D": "Schneller zum Unterschied", "I": "Mehr Empathie", "S": "Viel Zuhören", "G": "Konkrete Unterschiede"}'::jsonb,
ARRAY['objection', 'bad-experience', 'past', 'trust']),

-- #31 Muss drüber nachdenken
(31, 'einwand', 'ueberlegen', 'Muss drüber nachdenken',
'Klar, verstehe ich. Wichtige Entscheidungen sollte man durchdenken.

Hilf mir kurz: Worüber genau willst du nachdenken? Ist es [Option A], [Option B], oder etwas anderes?

So kann ich dir vielleicht jetzt schon die Infos geben, die du brauchst.',
'{"D": "Direkter: Was genau?", "I": "Positive Energie", "S": "Zeit geben", "G": "Spezifische Optionen"}'::jsonb,
ARRAY['objection', 'think-about-it', 'stall']),

-- #32 Zu teuer
(32, 'einwand', 'zu_teuer', 'Zu teuer',
'Ich verstehe - Preis ist wichtig.

Lass mich fragen: Zu teuer verglichen womit?

Wenn du [Ergebnis] erreichst, was wäre das wert für dich? Oft ist die Frage nicht "Kann ich mir das leisten?" sondern "Kann ich es mir leisten, es NICHT zu tun?"',
'{"D": "ROI-Rechnung", "I": "Vision des Ergebnisses", "S": "Verständnis zeigen", "G": "Konkrete Kosten-Nutzen"}'::jsonb,
ARRAY['objection', 'too-expensive', 'price', 'value']),

-- #33 Keine Lust auf Social Media
(33, 'einwand', 'social_media', 'Keine Lust auf Social Media',
'Das ist völlig okay! Social Media ist EIN Weg, aber nicht der EINZIGE.

Viele erfolgreiche Partner arbeiten hauptsächlich offline: Persönliche Gespräche, Events, Telefon.

Was ist dir lieber - und wie können wir das in deine Strategie einbauen?',
'{"D": "Welche Alternative?", "I": "Social Media Vorteile zeigen", "S": "Perfekt - Optionen", "G": "Konkrete Offline-Strategien"}'::jsonb,
ARRAY['objection', 'social-media', 'offline']),

-- #34 Das funktioniert nicht
(34, 'einwand', 'funktioniert_nicht', 'Das funktioniert nicht',
'Was meinst du genau mit "funktioniert nicht"?

Ich frage, weil [X Millionen Menschen] weltweit damit erfolgreich sind. Die Frage ist also nicht OB es funktioniert, sondern ob es für DICH funktionieren kann.

Was müsstest du sehen, um zu glauben, dass es auch für dich möglich ist?',
'{"D": "Zahlen und Fakten", "I": "Erfolgsgeschichten", "S": "Verständnis", "G": "Statistiken zeigen"}'::jsonb,
ARRAY['objection', 'doesnt-work', 'skeptic']),

-- #35 Jetzt nicht der richtige Zeitpunkt
(35, 'einwand', 'timing', 'Nicht der richtige Zeitpunkt',
'Wann wäre der richtige Zeitpunkt?

Ich frage, weil die meisten erfolgreichen Menschen auch "keinen perfekten Zeitpunkt" hatten. Sie haben einfach angefangen.

Was müsste sich ändern, damit der Zeitpunkt richtig wäre?',
'{"D": "Perfekt - direkt", "I": "Jetzt-oder-nie Energy", "S": "Verständnis zeigen", "G": "Konkrete Timeline"}'::jsonb,
ARRAY['objection', 'timing', 'not-now', 'later']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 4: CLOSING (Scripts #36-41)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #36 Soft Close
(36, 'closing', 'soft', 'Soft Close',
'Basierend auf dem, was wir besprochen haben - wie klingt das für dich?

Kannst du dich sehen, das zu machen?',
'{"D": "Direkter: Bist du dabei?", "I": "Mehr Enthusiasm", "S": "Perfekt - sanft", "G": "Was sind die nächsten Schritte?"}'::jsonb,
ARRAY['closing', 'soft', 'gentle']),

-- #37 Assumptive Close
(37, 'closing', 'assumptive', 'Assumptive Close',
'Super, das klingt gut!

Lass uns die nächsten Schritte besprechen. Wann passt es dir am besten, dass wir die Anmeldung zusammen durchgehen - heute Abend oder morgen früh?',
'{"D": "Perfekt - direkt", "I": "Mehr Excitement", "S": "Etwas sanfter", "G": "Genauen Prozess erklären"}'::jsonb,
ARRAY['closing', 'assumptive', 'schedule']),

-- #38 Urgency Close
(38, 'closing', 'urgency', 'Urgency Close',
'Ich will ehrlich mit dir sein: [Zeitbegrenzter Vorteil: Aktion läuft aus / Event steht an / etc.]

Ich will dich nicht drängen, aber wenn du eh dabei sein willst, macht es Sinn, JETZT zu starten.

Was meinst du?',
'{"D": "Perfekt - Dringlichkeit", "I": "FOMO aufbauen", "S": "Weniger Druck", "G": "Konkrete Deadline"}'::jsonb,
ARRAY['closing', 'urgency', 'limited-time']),

-- #39 Summary Close
(39, 'closing', 'summary', 'Summary Close',
'Lass mich kurz zusammenfassen:

Du willst [Ziel], du hast [Ressource: Zeit/Geld/Netzwerk], und du siehst, dass [Produkt/Opportunity] dir dabei helfen kann.

Die einzige Frage ist: Willst du heute starten oder weiter warten?',
'{"D": "Perfekt - Entscheidung forcieren", "I": "Vision wiederholen", "S": "Sanfter", "G": "Alle Punkte auflisten"}'::jsonb,
ARRAY['closing', 'summary', 'recap']),

-- #40 Trial Close
(40, 'closing', 'trial', 'Trial Close',
'Bevor ich weiter erkläre - mal ehrlich:

Auf einer Skala von 1-10, wie interessiert bist du?

[Bei 7+:] Super! Was fehlt zur 10?
[Bei <7:] Was müsste passieren, damit es höher wäre?',
'{"D": "Direkte Zahl fordern", "I": "Positiv auf jede Zahl reagieren", "S": "Keine Bewertung", "G": "Was bedeutet die Zahl?"}'::jsonb,
ARRAY['closing', 'trial', 'scale', 'temperature-check']),

-- #41 Referral Close
(41, 'closing', 'referral', 'Referral Close',
'Ich verstehe, dass es jetzt nicht passt für dich.

Letzte Frage: Kennst du jemanden, für den das interessant sein könnte? Jemand, der [Zielgruppen-Beschreibung]?

Ich würde mich über eine Empfehlung freuen - und du hilfst damit vielleicht jemandem, den du kennst.',
'{"D": "Direkt nach Namen fragen", "I": "Beziehung betonen", "S": "Perfekt - sanft", "G": "Genaue Kriterien"}'::jsonb,
ARRAY['closing', 'referral', 'recommendation']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 5: TEAM-ONBOARDING (Scripts #42-47)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #42 Willkommen
(42, 'onboarding', 'willkommen', 'Willkommen im Team',
'🎉 Herzlich willkommen im Team, [Name]!

Ich freu mich riesig, dass du dabei bist!

Die nächsten Schritte:
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

Wann hast du Zeit für unser erstes Onboarding-Call?',
'{"D": "Kürzer, Action-Items", "I": "Mehr Feier-Energie", "S": "Persönlicher", "G": "Detaillierte Schritte"}'::jsonb,
ARRAY['onboarding', 'welcome', 'new-partner']),

-- #43 Quick-Start Plan
(43, 'onboarding', 'quick_start', 'Quick-Start Plan',
'Hey [Name]! Hier dein Quick-Start Plan für die erste Woche:

TAG 1-2: Produkte kennenlernen
TAG 3-4: Namensliste erstellen (Ziel: 50 Namen)
TAG 5-7: Erste 10 Gespräche führen

Fragen? Ich bin für dich da!',
'{"D": "Noch kompakter", "I": "Mehr Motivation", "S": "Weniger überwältigend", "G": "Genaue Anleitungen"}'::jsonb,
ARRAY['onboarding', 'quick-start', 'first-week']),

-- #44 Vor erstem Gespräch
(44, 'onboarding', 'coaching', 'Vor erstem Gespräch',
'Hey [Name]! Du hast gleich dein erstes Gespräch - aufgeregt?

Denk dran:
✅ Du musst nicht perfekt sein
✅ Einfach du selbst sein und TEILEN
✅ Fragen stellen > Präsentieren
✅ Ich bin danach für Feedback da

Du schaffst das! 💪',
'{"D": "Nur Kernpunkte", "I": "Mehr Hype", "S": "Beruhigend", "G": "Checkliste erweitern"}'::jsonb,
ARRAY['onboarding', 'coaching', 'first-call', 'prep']),

-- #45 Nach erstem Gespräch
(45, 'onboarding', 'coaching', 'Nach erstem Gespräch',
'Hey [Name]! Wie war''s?

Erzähl mir:
1. Was lief gut?
2. Was war schwierig?
3. Was hat die Person gesagt?

Egal wie''s gelaufen ist - du hast es GEMACHT. Das ist der wichtigste Schritt!',
'{"D": "Nur Ergebnis", "I": "Feiern!", "S": "Unterstützend", "G": "Detaillierte Analyse"}'::jsonb,
ARRAY['onboarding', 'coaching', 'debrief', 'feedback']),

-- #46 Motivation bei Ablehnung
(46, 'onboarding', 'motivation', 'Bei Ablehnung',
'Hey [Name], ich hab gehört, dass [Gespräch] nicht so lief wie erhofft.

Das gehört dazu! Jedes "Nein" bringt dich näher zum nächsten "Ja".

Weißt du, wie viele "Neins" ich am Anfang kassiert hab? [Anzahl]. Und heute [Erfolg].

Lass uns kurz telefonieren - ich hab ein paar Tipps für dich.',
'{"D": "Kürzer, Lösung fokussiert", "I": "Mehr Enthusiasm", "S": "Viel Empathie", "G": "Statistiken teilen"}'::jsonb,
ARRAY['onboarding', 'motivation', 'rejection', 'support']),

-- #47 Wöchentliches Check-in
(47, 'onboarding', 'checkin', 'Wöchentliches Check-in',
'Hey [Name]! Zeit für unser Weekly:

📊 Wie war deine Woche?
🎯 Was hast du erreicht?
🚧 Wo brauchst du Hilfe?
📅 Was ist dein Plan für nächste Woche?

Bin gespannt!',
'{"D": "Nur Zahlen", "I": "Mehr Feier-Fokus", "S": "Persönlicher", "G": "Detaillierter Fragebogen"}'::jsonb,
ARRAY['onboarding', 'checkin', 'weekly', 'accountability']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 6: REAKTIVIERUNG (Scripts #48-49)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #48 Inaktiven Kunden reaktivieren
(48, 'reaktivierung', 'kunde', 'Inaktiven Kunden reaktivieren',
'Hey [Name]!

Mir ist aufgefallen, dass du schon länger nicht mehr bestellt hast - ist alles okay?

Ich wollte mal fragen:
- Gibt''s was, das dir gefehlt hat?
- Brauchst du Tipps zur Nutzung?
- Oder hat sich was geändert?

Würde mich freuen, von dir zu hören!',
'{"D": "Direkter: Bestellst du wieder?", "I": "Persönlicher Check-in", "S": "Perfekt - einfühlsam", "G": "Konkrete Produktfragen"}'::jsonb,
ARRAY['reactivation', 'customer', 'inactive']),

-- #49 Inaktiven Partner reaktivieren
(49, 'reaktivierung', 'partner', 'Inaktiven Partner reaktivieren',
'Hey [Name]!

Ich hab gemerkt, dass es bei dir gerade etwas ruhiger ist - alles gut?

Ich frag, weil ich mir Sorgen mache und wissen will, wie ich dir helfen kann.

Ist was im Leben passiert? Oder brauchst du einfach neuen Input?

Lass uns mal quatschen - ohne Druck, einfach als Check-in.',
'{"D": "Direkter: Machst du weiter?", "I": "Mehr Motivation", "S": "Perfekt - einfühlsam", "G": "Konkrete Analyse"}'::jsonb,
ARRAY['reactivation', 'partner', 'inactive', 'team']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KATEGORIE 7: SOCIAL MEDIA (Scripts #50-52)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO scripts (script_number, category, subcategory, title, content, disg_hints, tags) VALUES

-- #50 Story Engagement
(50, 'social_media', 'story', 'Story Engagement',
'Hey! Hab gerade deine Story gesehen 😍

[Bezug auf Story-Inhalt]

Mega cool! Wie lange machst du das schon?',
'{"D": "Kürzer", "I": "Mehr Emojis", "S": "Persönlicher", "G": "Spezifischere Frage"}'::jsonb,
ARRAY['social-media', 'story', 'engagement', 'instagram']),

-- #51 Post Kommentar Follow-Up
(51, 'social_media', 'post', 'Post Kommentar Follow-Up',
'Hey [Name]!

Danke für deinen Kommentar bei meinem Post! Fand ich cool, was du geschrieben hast.

Wie bist du eigentlich auf das Thema gekommen?',
'{"D": "Business-Fokus", "I": "Mehr Begeisterung", "S": "Langsamer Aufbau", "G": "Spezifische Frage"}'::jsonb,
ARRAY['social-media', 'post', 'comment', 'followup']),

-- #52 Neuer Follower
(52, 'social_media', 'follower', 'Neuer Follower DM',
'Hey [Name]!

Danke fürs Folgen! 🙌

Hab gesehen, dass du [etwas von deren Profil] machst - echt cool!

Wie bist du auf mein Profil gestoßen?',
'{"D": "Kürzer", "I": "Mehr Enthusiasm", "S": "Sanfter", "G": "Spezifische Frage"}'::jsonb,
ARRAY['social-media', 'follower', 'new', 'dm']);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FINALE ÜBERPRÜFUNG
-- ═══════════════════════════════════════════════════════════════════════════════

-- Zeige Zusammenfassung
SELECT 
    category,
    COUNT(*) as anzahl
FROM scripts 
GROUP BY category
ORDER BY 
    CASE category
        WHEN 'erstkontakt' THEN 1
        WHEN 'followup' THEN 2
        WHEN 'einwand' THEN 3
        WHEN 'closing' THEN 4
        WHEN 'onboarding' THEN 5
        WHEN 'reaktivierung' THEN 6
        WHEN 'social_media' THEN 7
    END;

-- Gesamtanzahl
SELECT COUNT(*) as total_scripts FROM scripts;
