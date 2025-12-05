-- ============================================
-- SALESFLOW - 100 MLM SCRIPTS INSERT
-- Generated: 2025-01-05
-- Batch 1: 50 Scripts (OPENER, PITCH, FOLLOW_UP)
-- Batch 2: 50 Scripts (OBJECTION, CLOSING)
-- ============================================

INSERT INTO mlm_scripts (script_id, title, content, category, company, tone, tags, variables) VALUES

-- ==========================================
-- BATCH 1: OPENER SCRIPTS (15)
-- ==========================================

('opener_001', 'Warm Market - Familie & Freunde', 'Hey [Name]! 👋 Ich starte gerade ein spannendes Projekt und dabei hab ich sofort an dich gedacht. Hast du 5 Minuten?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['warm', 'freunde', 'familie', 'soft'], ARRAY['Name']),

('opener_002', 'Cold Outreach - LinkedIn Professional', 'Hallo [Name], ich bin auf dein Profil gestoßen und finde deinen Werdegang in [Branche] beeindruckend. Ich habe eine Idee, die gut zu deinen Skills passen könnte. Hast du diese Woche 15 Minuten für einen kurzen Austausch?', 'OPENER', 'GENERAL', 'PROFESSIONAL', ARRAY['cold', 'linkedin', 'professional', 'b2b'], ARRAY['Name', 'Branche']),

('opener_003', 'Instagram Story Reaktion', 'Hey! 🔥 Deine Story hat mich echt angesprochen. [Spezifischer Bezug] - wie machst du das? Würde mich mega interessieren!', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['instagram', 'story', 'social-media', 'casual'], ARRAY['Bezug']),

('opener_004', 'Event-Based Opener', 'Hi [Name]! Wir waren beide bei [Event]. Dein Beitrag zu [Thema] hat mich echt zum Nachdenken gebracht. Lass uns connecten!', 'OPENER', 'GENERAL', 'PROFESSIONAL', ARRAY['event', 'networking', 'professional'], ARRAY['Name', 'Event', 'Thema']),

('opener_005', 'Referral - Empfehlung', 'Hey [Name]! [Empfehler] hat mir erzählt, dass du dich für [Thema] interessierst. Ich hab da was Spannendes - kurz quatschen?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['referral', 'warm', 'empfehlung'], ARRAY['Name', 'Empfehler', 'Thema']),

('opener_006', 'Curiosity Hook - Neugier wecken', 'Hey! Ich muss dir was zeigen, was mein Leben verändert hat. Keine Sorge, kein Spam – aber ich glaub, das könnte auch für dich interessant sein. Kurz Zeit?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['curiosity', 'hook', 'teaser'], ARRAY[]::text[]),

('opener_007', 'Value First - Mehrwert zuerst', 'Hi [Name]! Ich hab eine Checkliste erstellt für [Problem]. Dachte, die könnte für dich interessant sein. Soll ich sie dir schicken?', 'OPENER', 'GENERAL', 'PROFESSIONAL', ARRAY['value', 'content', 'lead-magnet'], ARRAY['Name', 'Problem']),

('opener_008', 'WhatsApp Voice Note', '[Als Sprachnachricht] Hey [Name]! Kurze Frage: Bist du offen für ein Nebeneinkommen, wenn es zu deinem Lifestyle passt? Meld dich kurz!', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['whatsapp', 'voice', 'nebeneinkommen'], ARRAY['Name']),

('opener_009', 'Re-Connect nach langer Zeit', 'Hey [Name]! Lange her! 👋 Wie geht''s dir? Hab gerade an die alten Zeiten gedacht. Was treibst du so beruflich?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['reconnect', 'warm', 'langzeit'], ARRAY['Name']),

('opener_010', 'Compliment Opener - Echtes Lob', 'Hey [Name]! Ich folge dir schon eine Weile und bin echt beeindruckt von [Leistung]. Wie hast du das geschafft?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['compliment', 'social-media', 'authentic'], ARRAY['Name', 'Leistung']),

('opener_011', 'DISG D-Typ Opener (Dominant)', 'Hey [Name], kurz und knapp: Ich hab eine Business-Opportunity, die zu deinem Profil passt. Ergebnisse in 90 Tagen messbar. Hast du 10 Minuten diese Woche?', 'OPENER', 'GENERAL', 'DIRECT', ARRAY['disg', 'dominant', 'direkt'], ARRAY['Name']),

('opener_012', 'DISG I-Typ Opener (Initiativ)', 'Hey [Name]! 🎉 Du wirst nicht glauben, was ich entdeckt hab! Das ist SO spannend - wir haben mega Events, eine tolle Community und du könntest richtig durchstarten! Lass uns quatschen!', 'OPENER', 'GENERAL', 'ENTHUSIASTIC', ARRAY['disg', 'initiativ', 'enthusiastisch'], ARRAY['Name']),

('opener_013', 'DISG S-Typ Opener (Stetig)', 'Hey [Name], ich hoffe es geht dir gut. 😊 Ich hab da was gefunden, das ich gerne mit dir teilen würde. Kein Druck – ich wollte nur sichergehen, dass du davon weißt. Wann passt dir ein kurzes Gespräch?', 'OPENER', 'GENERAL', 'EMPATHETIC', ARRAY['disg', 'stetig', 'empathisch'], ARRAY['Name']),

('opener_014', 'DISG G-Typ Opener (Gewissenhaft)', 'Hallo [Name], ich habe ein Geschäftsmodell analysiert, das interessante Kennzahlen aufweist: [X]% der Partner erreichen [Y] innerhalb von [Z] Monaten. Die Daten sind verifiziert. Interessiert an den Details?', 'OPENER', 'GENERAL', 'PROFESSIONAL', ARRAY['disg', 'gewissenhaft', 'analytisch'], ARRAY['Name', 'X', 'Y', 'Z']),

('opener_015', 'Facebook Gruppen Opener', 'Hey [Name]! Ich hab deinen Kommentar in [Gruppe] gesehen - mega Punkt! 💯 Beschäftigst du dich beruflich mit [Thema] oder ist das Hobby?', 'OPENER', 'GENERAL', 'CASUAL', ARRAY['facebook', 'gruppe', 'social-media'], ARRAY['Name', 'Gruppe', 'Thema']),

-- ==========================================
-- BATCH 1: PITCH SCRIPTS (20)
-- ==========================================

('pitch_001', 'Zinzino Balance Test Pitch', 'Wusstest du, dass 97% der Menschen ein Omega-Ungleichgewicht haben? Mit dem Zinzino BalanceTest siehst du in 15 Sekunden, wo du stehst. Kein Raten mehr – Daten!

Das Beste: Nach 4 Monaten mit unseren Produkten machen wir einen neuen Test. So siehst du messbar, was sich verbessert hat. Interesse?', 'PITCH', 'ZINZINO', 'PROFESSIONAL', ARRAY['zinzino', 'test', 'omega', 'wissenschaft'], ARRAY[]::text[]),

('pitch_002', 'Zinzino Business Opportunity', 'Hey! Ich baue gerade etwas Spannendes auf mit Zinzino.

✅ Wissenschaftsbasierte Produkte
✅ Messbare Ergebnisse für jeden Kunden
✅ Kein Überreden – der Test überzeugt
✅ Wachsender Gesundheitsmarkt

Ich suche 2-3 Leute, die das Potenzial sehen. Bist du dabei?', 'PITCH', 'ZINZINO', 'PROFESSIONAL', ARRAY['zinzino', 'business', 'team', 'opportunity'], ARRAY[]::text[]),

('pitch_003', 'LR Aloe Vera Produkt Pitch', 'Ich trinke seit 3 Monaten das Aloe Vera Drinking Gel von LR und meine Verdauung hat sich komplett verändert! 🌿

Das Gel unterstützt:
• Verdauung & Darmgesundheit
• Immunsystem
• Hautbild von innen

Hast du sowas schon mal probiert?', 'PITCH', 'LR', 'CASUAL', ARRAY['lr', 'aloe', 'gesundheit', 'produkt'], ARRAY[]::text[]),

('pitch_004', 'LR Firmenwagen Pitch', 'Stell dir vor: Ein Firmenwagen deiner Wahl, komplett bezahlt. 🚗

Bei LR ist das Realität für viele Partner. Der Weg dahin? Klare Schritte, echte Unterstützung, bewiesenes System.

Ich zeig dir gerne, wie das funktioniert – ohne Druck, nur Infos!', 'PITCH', 'LR', 'ENTHUSIASTIC', ARRAY['lr', 'auto', 'incentive', 'business'], ARRAY[]::text[]),

('pitch_005', 'Herbalife Fitness & Ernährung', 'Ich ersetze mein Frühstück mit dem Formula 1 Shake und fühl mich den ganzen Vormittag energiegeladen! 💪

✅ 21 Vitamine & Mineralien
✅ Hochwertiges Protein
✅ In 2 Minuten fertig
✅ Lecker in vielen Geschmacksrichtungen

Willst du mal probieren?', 'PITCH', 'HERBALIFE', 'CASUAL', ARRAY['herbalife', 'shake', 'fitness', 'ernährung'], ARRAY[]::text[]),

('pitch_006', 'Herbalife Abnehm-Erfolg', 'Hey [Name]! Ich hab mit Herbalife [X] kg abgenommen und fühl mich mega! 🎉

Das war kein Hungern – ich esse mehr als vorher, nur smarter.

Darf ich dir zeigen, wie ich das gemacht hab?', 'PITCH', 'HERBALIFE', 'CASUAL', ARRAY['herbalife', 'abnehmen', 'erfolg', 'transformation'], ARRAY['Name', 'X']),

('pitch_007', 'doTERRA Ätherische Öle Intro', 'Hey! 🌿 Benutzt du ätherische Öle?

Ich bin total verliebt in meine doTERRA Öle:
• Lavendel zum Entspannen 😴
• Pfefferminze für Energie ⚡
• Weihrauch für Fokus 🧘

Die Qualität ist unschlagbar. Soll ich dir mehr erzählen?', 'PITCH', 'DOTERRA', 'ENTHUSIASTIC', ARRAY['doterra', 'öle', 'wellness', 'natürlich'], ARRAY[]::text[]),

('pitch_008', 'doTERRA Clean Living', 'Ich hab so viel Chemie aus meinem Haushalt verbannt, seit ich doTERRA nutze!

🧹 Putzmittel? DIY mit Ölen
🧴 Hautpflege? Natürliche Rezepte
💊 Erste Hilfe? Öle-Set

Interessiert dich das Thema Clean Living?', 'PITCH', 'DOTERRA', 'CASUAL', ARRAY['doterra', 'clean', 'haushalt', 'natürlich'], ARRAY[]::text[]),

('pitch_009', 'Amway Nutrilite Vitamine', 'Die Nutrilite Vitamine von Amway sind was Besonderes:

🌱 Organisch angebaut auf eigenen Farmen
🔬 Wissenschaftlich getestet
♻️ Nachhaltig produziert

Ich nehm sie täglich und merk den Unterschied. Soll ich dir mehr erzählen?', 'PITCH', 'AMWAY', 'PROFESSIONAL', ARRAY['amway', 'nutrilite', 'vitamine', 'bio'], ARRAY[]::text[]),

('pitch_010', 'PM International FitLine', 'FitLine von PM International hat meinen Alltag verändert! 🏃‍♂️

• Activize für Energie am Morgen
• Optimal Set für die Basis
• Restorate für erholsamen Schlaf

Alles mit dem NTC (Nährstoff-Transport-Konzept) – wirkt in 10 Minuten!

Kennst du das schon?', 'PITCH', 'PM_INTERNATIONAL', 'ENTHUSIASTIC', ARRAY['pm', 'fitline', 'sport', 'energie'], ARRAY[]::text[]),

('pitch_011', 'Network Marketing Lifestyle', 'Stell dir vor:

☀️ Aufwachen ohne Wecker
💼 Arbeiten von überall
💰 Einkommen, das auch fließt wenn du Urlaub machst
👨‍👩‍👧 Mehr Zeit für Familie

Das ist Network Marketing richtig gemacht. Und es funktioniert – wenn du bereit bist zu lernen.

Neugierig?', 'PITCH', 'GENERAL', 'ENTHUSIASTIC', ARRAY['lifestyle', 'freiheit', 'vision'], ARRAY[]::text[]),

('pitch_012', 'Nebeneinkommen Pitch', 'Was wäre, wenn du jeden Monat 500-1000€ extra hättest?

Kein Zweitjob. Keine festen Arbeitszeiten. Von zu Hause aus.

Ich zeig dir, wie ich das mache. Kein Druck, nur Infos. Deal?', 'PITCH', 'GENERAL', 'CASUAL', ARRAY['nebeneinkommen', 'extra', 'flexibel'], ARRAY[]::text[]),

('pitch_013', 'Teamaufbau Pitch', 'Ich suche 3 hungrige Leute, die mit mir ein Team aufbauen wollen.

Keine Erfahrung nötig – ich zeig dir alles.
Aber du musst bereit sein:
✅ Zu lernen
✅ Dranzubleiben
✅ Anderen zu helfen

Bist du so jemand?', 'PITCH', 'GENERAL', 'DIRECT', ARRAY['team', 'aufbau', 'rekrutierung'], ARRAY[]::text[]),

('pitch_014', 'Problem-Solution Pitch', 'Kennst du das?

😤 Zu wenig Zeit für das Wichtige
😤 Gehalt reicht gerade so
😤 Keine Kontrolle über deinen Tag

Ich kannte das auch. Bis ich [Lösung] gefunden habe.

Willst du wissen, wie ich das geändert hab?', 'PITCH', 'GENERAL', 'EMPATHETIC', ARRAY['problem', 'solution', 'story'], ARRAY['Lösung']),

('pitch_015', 'Social Proof Pitch', '[Name aus Team] hat letzten Monat ihren ersten [Erfolg] erreicht! 🔥

Angefangen hat sie genau wie du – mit null Erfahrung und vielen Zweifeln.

Der Unterschied? Sie hat angefangen.

Wann bist du dran?', 'PITCH', 'GENERAL', 'ENTHUSIASTIC', ARRAY['social-proof', 'success-story', 'motivation'], ARRAY['Name', 'Erfolg']),

('pitch_016', 'Gesundheit als Investment', 'Wir investieren in Autos, Urlaub, Technik...

Aber was ist mit unserer Gesundheit? 🤔

Ohne Gesundheit ist alles andere wertlos.

Ich hab entschieden, in mich zu investieren. Willst du wissen, wie?', 'PITCH', 'GENERAL', 'PROFESSIONAL', ARRAY['gesundheit', 'investment', 'mindset'], ARRAY[]::text[]),

('pitch_017', 'Zinzino Xtend Pitch', 'Xtend von Zinzino ist mein Daily Essential:

🛡️ 23 Vitamine & Mineralien
🌿 Polyphenole aus Oliven
🦴 Vitamin D3 für Knochen
💪 Immunsystem Support

Ein Produkt. Komplette Grundversorgung. Simpel!', 'PITCH', 'ZINZINO', 'PROFESSIONAL', ARRAY['zinzino', 'xtend', 'vitamine', 'daily'], ARRAY[]::text[]),

('pitch_018', 'LR Beauty Pitch', 'Die ZEITGARD Pflegelinie von LR ist mein Beauty-Geheimnis! ✨

• Cleansing System für reine Haut
• Anti-Age Produkte die wirken
• Made in Germany Qualität

Deine Haut verdient das Beste. Soll ich dir mehr zeigen?', 'PITCH', 'LR', 'CASUAL', ARRAY['lr', 'beauty', 'hautpflege', 'zeitgard'], ARRAY[]::text[]),

('pitch_019', 'Herbalife 24 Sport Pitch', 'Herbalife24 ist speziell für Sportler entwickelt:

💪 Rebuild Strength nach dem Training
⚡ CR7 Drive während dem Sport
🏃 Formula 1 Sport für Athleten

Profi-Nutrition, die auch für dich funktioniert!', 'PITCH', 'HERBALIFE', 'ENTHUSIASTIC', ARRAY['herbalife', 'sport', 'h24', 'fitness'], ARRAY[]::text[]),

('pitch_020', 'Business für Mütter', 'Als Mama wollte ich:
✅ Bei meinen Kids sein
✅ Aber auch was Eigenes aufbauen
✅ Flexibel arbeiten können

Network Marketing macht das möglich. Ich arbeite wenn die Kids schlafen oder spielen.

Kennst du das Gefühl, zerrissen zu sein?', 'PITCH', 'GENERAL', 'EMPATHETIC', ARRAY['mütter', 'familie', 'flexibel', 'work-life'], ARRAY[]::text[]),

-- ==========================================
-- BATCH 1: FOLLOW_UP SCRIPTS (15)
-- ==========================================

('followup_001', 'Follow-Up nach Präsentation - Soft', 'Hey [Name]! 😊 Ich wollte kurz nachfragen, wie dir unser Gespräch letztens gefallen hat. Gibt es Fragen, die ich dir beantworten kann?', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['followup', 'präsentation', 'soft'], ARRAY['Name']),

('followup_002', 'Follow-Up Tag 3 - Sanfte Erinnerung', 'Hey [Name]! Nur kurz nachgehakt – hast du dir schon Gedanken gemacht? Kein Druck, nur neugierig 🙂', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['followup', 'reminder', 'soft'], ARRAY['Name']),

('followup_003', 'Follow-Up Tag 7 - Value Add', 'Hi [Name]! Ich hab hier einen Artikel gefunden, der perfekt zu unserem letzten Gespräch passt: [Link]

Was meinst du dazu?', 'FOLLOW_UP', 'GENERAL', 'PROFESSIONAL', ARRAY['followup', 'value', 'content'], ARRAY['Name', 'Link']),

('followup_004', 'Anti-Ghosting Pattern Interrupt', 'Hey [Name]! 🙋 Alles okay bei dir? Hab gerade an dich gedacht und wollte sichergehen, dass alles gut ist.', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['ghosting', 'pattern-interrupt', 'care'], ARRAY['Name']),

('followup_005', 'Anti-Ghosting Ehrlich', 'Hey [Name], ich merke das Timing passt gerade nicht. Kein Problem!

Soll ich mich in 2-3 Monaten nochmal melden, oder lieber ganz sein lassen? Sei ehrlich – ich nehm''s nicht persönlich 🙂', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['ghosting', 'ehrlich', 'exit'], ARRAY['Name']),

('followup_006', 'Post-Purchase Check-In', 'Hey [Name]! 📦 Wie gefällt dir [Produkt] bisher?

Ich wollte sichergehen, dass alles passt. Bei Fragen bin ich immer da!', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['kunde', 'zufriedenheit', 'service'], ARRAY['Name', 'Produkt']),

('followup_007', 'Testimonial Request', 'Hey [Name]! Du bist jetzt [Zeitraum] dabei und ich freu mich so über deine Ergebnisse! 🎉

Wärst du bereit, kurz zu erzählen, wie es dir damit geht? Würde anderen mega helfen!', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['testimonial', 'social-proof', 'success'], ARRAY['Name', 'Zeitraum']),

('followup_008', '90-Day Partner Check-In', 'Hey [Name]! Du bist jetzt 90 Tage dabei 🎯

Lass uns kurz sprechen:
• Was läuft gut?
• Wo brauchst du Support?
• Was sind deine Ziele für die nächsten 90 Tage?

Wann passt dir?', 'FOLLOW_UP', 'GENERAL', 'PROFESSIONAL', ARRAY['partner', 'check-in', 'coaching'], ARRAY['Name']),

('followup_009', 'Reactivation - Inaktiver Kunde', 'Hey [Name]! Lange nicht gehört 👋

Ich hab dich vermisst! Wir haben gerade [Neues Produkt/Angebot].

Dachte, das könnte dich interessieren. Wie geht''s dir?', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['reaktivierung', 'kunde', 'win-back'], ARRAY['Name', 'Angebot']),

('followup_010', 'Upgrade/Cross-Sell', 'Hey [Name]! Weil du [Produkt A] so liebst, wollte ich dir [Produkt B] zeigen.

Die ergänzen sich perfekt! Viele Kunden nutzen beides zusammen.

Soll ich dir mehr erzählen?', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['upsell', 'cross-sell', 'upgrade'], ARRAY['Name', 'ProduktA', 'ProduktB']),

('followup_011', 'Break-Up Message', 'Hey [Name], ich will ehrlich sein:

Ich hab dir jetzt ein paar Mal geschrieben und keine Antwort bekommen. Das ist völlig okay!

Ich lösche dich nicht – falls sich was ändert, weißt du wo du mich findest. 🙂

Alles Gute!', 'FOLLOW_UP', 'GENERAL', 'DIRECT', ARRAY['break-up', 'abschluss', 'ghosting'], ARRAY['Name']),

('followup_012', 'Video Message Follow-Up', '[Als Video-Nachricht]

Hey [Name]! Ich wollte mich kurz persönlich melden. Hab an unser Gespräch gedacht und wollte checken, wie es dir geht. Meld dich wenn du magst!', 'FOLLOW_UP', 'GENERAL', 'CASUAL', ARRAY['video', 'persönlich', 'nahbar'], ARRAY['Name']),

('followup_013', 'Urgency Follow-Up', 'Hey [Name]! Kurzes Update: [Angebot/Aktion] läuft nur noch bis [Datum].

Ich will nicht, dass du das verpasst. Letzte Chance – soll ich dir nochmal alles erklären?', 'FOLLOW_UP', 'GENERAL', 'DIRECT', ARRAY['urgency', 'fomo', 'deadline'], ARRAY['Name', 'Angebot', 'Datum']),

-- ==========================================
-- BATCH 2: OBJECTION SCRIPTS (30)
-- ==========================================

('objection_001', 'Einwand: Keine Zeit', 'Das verstehe ich total! Gerade deshalb könnte das hier interessant sein – es geht um Zeitfreiheit.

Die meisten in meinem Team haben auch so angefangen – neben Job und Familie.

Wann hättest du 15 Minuten für einen kurzen Call?', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'zeit', 'reframe'], ARRAY[]::text[]),

('objection_002', 'Einwand: Zu teuer', 'Ich verstehe, dass du auf dein Budget achtest. Das zeigt, dass du klug mit Geld umgehst! 👍

Lass mich fragen: Was wäre es dir wert, wenn [konkreter Nutzen]?

Manchmal ist die Frage nicht ''Kann ich mir das leisten?'' sondern ''Kann ich es mir leisten, es NICHT zu tun?''', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'preis', 'wert', 'reframe'], ARRAY['Nutzen']),

('objection_003', 'Einwand: Muss drüber schlafen', 'Absolut, das ist eine wichtige Entscheidung! 💯

Mal angenommen, du hättest morgen früh nochmal drüber geschlafen – was müsste passiert sein, damit du Ja sagst?

Ich frag nur, damit ich dir die richtigen Infos geben kann.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'nachdenken', 'isolieren'], ARRAY[]::text[]),

('objection_004', 'Einwand: Muss Partner fragen', 'Super, dass du deinen Partner einbeziehst! Das zeigt Respekt. 👫

Wann könnt ihr beide gemeinsam mit mir sprechen?

So kann ich alle Fragen direkt beantworten und ihr könnt zusammen entscheiden.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'partner', 'termin'], ARRAY[]::text[]),

('objection_005', 'Einwand: Ist das MLM/Pyramide?', 'Gute Frage! Pyramidensysteme sind illegal – da gibt''s kein echtes Produkt und nur die Gründer verdienen.

Bei uns:
✅ Echte Produkte mit echtem Nutzen
✅ Du verdienst durch Verkauf UND Teamaufbau
✅ Jeder kann mehr verdienen als sein Sponsor
✅ Komplett legal und reguliert

Der Unterschied zu einem normalen Job? Du bestimmst dein Einkommen selbst.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'mlm', 'pyramide', 'aufklärung'], ARRAY[]::text[]),

('objection_006', 'Einwand: Kenne niemanden', 'Das dachte ich am Anfang auch! Aber weißt du was?

Wir zeigen dir genau, wie du online neue Kontakte aufbaust. Social Media macht''s möglich.

Dein Bekanntenkreis ist nur der Anfang, nicht das Limit. 🚀

Bist du offen, zu lernen wie das geht?', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'kontakte', 'netzwerk', 'social-media'], ARRAY[]::text[]),

('objection_007', 'Einwand: Bin kein Verkäufer', 'Perfekt! Die besten in meinem Team sind auch keine klassischen Verkäufer. 🙌

Es geht nicht ums Verkaufen – es geht ums Teilen.

Du empfiehlst sowieso Restaurants, Netflix-Serien, Produkte... Das machst du schon – nur ohne dafür bezahlt zu werden!', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'verkauf', 'teilen', 'empfehlen'], ARRAY[]::text[]),

('objection_008', 'Einwand: Hab''s schon mal versucht', 'Oh interessant! Darf ich fragen, was damals nicht funktioniert hat?

[Zuhören]

Verstehe. Bei uns ist das anders: [Unterschied erklären]

Oft liegt''s am Training, am Support oder am System selbst. Was wenn es diesmal anders läuft?', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'erfahrung', 'vergangenheit', 'zweite-chance'], ARRAY[]::text[]),

('objection_009', 'Einwand: Nur die oben verdienen', 'Ich verstehe die Sorge! Aber check das mal:

📊 In unserem Team verdienen viele mehr als ihr Sponsor
🔄 Das System belohnt Leistung, nicht Position
📈 Je früher du startest, desto besser – aber spät ist nicht zu spät

Ich selbst hab auch nicht am Anfang angefangen. Willst du meine Zahlen sehen?', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'struktur', 'verdienst', 'fakten'], ARRAY[]::text[]),

('objection_010', 'Einwand: Kein Interesse', 'Kein Problem! 🙂 Darf ich fragen – kein Interesse am Produkt, am Business, oder generell am Thema?

[Je nach Antwort]

Verstehe. Falls sich das mal ändert – du weißt wo du mich findest!', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'interesse', 'qualifizierung', 'exit'], ARRAY[]::text[]),

('objection_011', 'Einwand: Ich weiß nicht ob das was für mich ist', 'Das ist total verständlich! Am Anfang wusste ich das auch nicht.

Was ich vorschlagen würde: Probier''s 90 Tage aus. Nicht mehr, nicht weniger.

Nach 90 Tagen weißt du genau, ob''s für dich ist. Und wenn nicht – kein Drama. Deal?', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'unsicherheit', 'test', 'commitment'], ARRAY[]::text[]),

('objection_012', 'Einwand: Meine Familie/Freunde sind dagegen', 'Das höre ich oft. Weißt du was?

Die Leute die dich am meisten lieben, wollen dich auch am meisten schützen.

Aber manchmal schützen sie dich vor Dingen, die sie selbst nicht verstehen.

Was wenn du ihnen in 6 Monaten zeigst, dass es funktioniert?', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'familie', 'umfeld', 'mindset'], ARRAY[]::text[]),

('objection_013', 'Einwand: Das funktioniert doch nicht', 'Ich verstehe die Skepsis! Darf ich dich was fragen?

Was genau funktioniert deiner Meinung nach nicht?

[Zuhören]

Okay, lass mich dir zeigen, wie [konkrete Person] es geschafft hat. Echte Person, echte Ergebnisse.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'skepsis', 'proof', 'social-proof'], ARRAY[]::text[]),

('objection_014', 'Einwand: Ich hab kein Geld für den Start', 'Verstehe ich! Das Startinvestment ist [Betrag].

Aber lass mich fragen: Wenn du wüsstest, dass du das in den ersten 30 Tagen wieder reinholen kannst – wäre es dann machbar?

Viele finanzieren den Start durch ihren ersten Verkauf. Ich zeig dir wie.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'geld', 'investment', 'start'], ARRAY['Betrag']),

('objection_015', 'Einwand: Ich muss erst recherchieren', 'Super, du bist gründlich! Das mag ich. 👍

Was genau willst du recherchieren? Vielleicht kann ich dir direkt die Infos geben.

[Oder] Ich schick dir ein paar Links – neutrale Quellen, keine Werbung. Dann reden wir nochmal?', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'recherche', 'info', 'vorbereitung'], ARRAY[]::text[]),

('objection_016', 'Einwand: Bei mir im Umfeld kauft das keiner', 'Das dachte ich auch! Aber dann hab ich was verstanden:

🌍 Dein Markt ist nicht nur dein Umfeld
📱 Social Media = unbegrenzter Markt
🔍 Die Leute die das brauchen, findest du online

Ich zeig dir genau, wie du die richtigen Menschen erreichst.', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'markt', 'online', 'reichweite'], ARRAY[]::text[]),

('objection_017', 'Einwand: Das ist mir zu kompliziert', 'Ich verstehe – am Anfang sieht alles kompliziert aus!

Aber weißt du was? Du musst nicht alles auf einmal lernen.

Wir gehen Schritt für Schritt:
1️⃣ Erste Woche: Die Basics
2️⃣ Zweite Woche: Erste Gespräche
3️⃣ Dritte Woche: Erste Kunden

Und ich bin bei jedem Schritt dabei.', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'kompliziert', 'einfach', 'support'], ARRAY[]::text[]),

('objection_018', 'Einwand: Produkt zu teuer für meine Kunden', 'Das höre ich manchmal. Aber lass mich fragen:

Wer sind ''deine Kunden'' in deiner Vorstellung?

[Zuhören]

Weißt du, es gibt genug Menschen die Qualität wollen und dafür zahlen. Die Kunst ist, die richtigen zu finden – nicht alle zu überzeugen.', 'OBJECTION', 'GENERAL', 'PROFESSIONAL', ARRAY['einwand', 'preis', 'zielgruppe', 'qualität'], ARRAY[]::text[]),

('objection_019', 'Einwand: Ich bin zu alt/jung dafür', 'Wir haben erfolgreiche Partner von 18 bis 70+!

[Wenn zu alt]: Erfahrung ist unbezahlbar – du hast Netzwerk, Vertrauen, Lebenserfahrung.

[Wenn zu jung]: Du hast Energie, Social Media Skills und keine Angst vor Neuem.

Das perfekte Alter gibt''s nicht. Es gibt nur den richtigen Zeitpunkt – und der ist jetzt.', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'alter', 'mindset', 'timing'], ARRAY[]::text[]),

('objection_020', 'Einwand: Ich hab schlechte Erfahrungen mit MLM', 'Das tut mir leid zu hören. 😔 Darf ich fragen, was passiert ist?

[Zuhören mit echtem Interesse]

Das klingt frustrierend. Ich verstehe warum du skeptisch bist.

Bei uns läuft das anders: [Konkrete Unterschiede nennen]

Ich erwarte keine sofortige Entscheidung. Aber vielleicht willst du''s dir nochmal anschauen?', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'erfahrung', 'mlm', 'trauma'], ARRAY[]::text[]),

('objection_021', 'Zinzino: Produkte zu teuer', 'Ich verstehe! Aber lass uns mal rechnen:

Balance Oil + Test kostet ca. 99€/Monat.

Dafür bekommst du:
✅ Tägliche Omega-3 Versorgung
✅ 2 wissenschaftliche Tests/Jahr
✅ Messbare Ergebnisse

Das sind 3,30€ pro Tag. Weniger als ein Kaffee to go. Für deine Gesundheit.', 'OBJECTION', 'ZINZINO', 'PROFESSIONAL', ARRAY['zinzino', 'preis', 'wert', 'rechnung'], ARRAY[]::text[]),

('objection_022', 'Zinzino: Warum brauche ich einen Test?', 'Gute Frage! 🔬

Ohne Test nimmst du Omega-3 ''blind'' – du weißt nicht ob es wirkt.

Mit Test:
📊 Du siehst deinen Ist-Zustand
📈 Du siehst nach 4 Monaten die Verbesserung
✅ Du weißt, dass es bei DIR funktioniert

Daten statt Hoffnung. Macht das Sinn?', 'OBJECTION', 'ZINZINO', 'PROFESSIONAL', ARRAY['zinzino', 'test', 'wissenschaft', 'warum'], ARRAY[]::text[]),

('objection_023', 'LR: Kenn ich nicht, ist das seriös?', 'Verstehe die Frage! LR gibt''s seit 1985 – fast 40 Jahre! 🏆

✅ Sitz in Deutschland (Ahlen)
✅ Über 300.000 Partner weltweit
✅ Eigene Produktion, höchste Standards
✅ Mehrfach ausgezeichnet

Kannst du gerne selbst googeln – aber ich kann auch Fragen beantworten!', 'OBJECTION', 'LR', 'PROFESSIONAL', ARRAY['lr', 'seriosität', 'fakten', 'vertrauen'], ARRAY[]::text[]),

('objection_024', 'Herbalife: Ist das nicht ungesund?', 'Ich verstehe die Sorge – es gab Gerüchte.

Fakten:
✅ Herbalife ist in 90+ Ländern zugelassen
✅ Millionen zufriedene Kunden weltweit
✅ Wissenschaftlicher Beirat mit Ärzten
✅ Alle Produkte getestet und zertifiziert

Ich selbst nutze die Produkte seit [Zeitraum]. Soll ich dir meine Erfahrung erzählen?', 'OBJECTION', 'HERBALIFE', 'PROFESSIONAL', ARRAY['herbalife', 'gesundheit', 'sicherheit', 'fakten'], ARRAY['Zeitraum']),

('objection_025', 'Einwand: Ich will keine Freunde nerven', 'Das will ich auch nicht! 🙂

Deshalb:
1️⃣ Wir sprechen nur mit Leuten die OFFEN sind
2️⃣ Kein Spam, kein Nerven
3️⃣ Wenn jemand Nein sagt → respektieren

Ich zeig dir, wie du professionell vorgehst ohne Beziehungen zu ruinieren. Deal?', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'freunde', 'beziehungen', 'professionell'], ARRAY[]::text[]),

('objection_026', 'Einwand: Das ist Zeitverschwendung', 'Verstehe! Deine Zeit ist wertvoll. 💎

Lass mich kurz fragen: Was wäre für dich KEINE Zeitverschwendung?

[Zuhören]

Okay, und was wenn ich dir zeigen kann, dass [Zeit/Geld/Freiheit] genau das ist, was du mit uns erreichen kannst?', 'OBJECTION', 'GENERAL', 'DIRECT', ARRAY['einwand', 'zeit', 'wert', 'fragen'], ARRAY[]::text[]),

('objection_027', 'Einwand: Ich bin zufrieden mit meinem Job', 'Das ist super! 👏 Ein guter Job ist wichtig.

Aber lass mich fragen: Bist du auch zufrieden mit:
• Deinem Einkommen?
• Deiner Freizeit?
• Deinen Zukunftsaussichten?

Die meisten starten nebenberuflich – nicht als Ersatz, sondern als Ergänzung.', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'job', 'zufriedenheit', 'nebenberuflich'], ARRAY[]::text[]),

('objection_028', 'Einwand: Ich probier erst mal alleine', 'Respektiere ich! 🙌

Aber kurze Frage: Warum alleine, wenn du Support haben könntest?

Bei mir bekommst du:
✅ Bewährte Vorlagen
✅ Coaching Calls
✅ Community die hilft

Alleine ist härter. Zusammen geht''s schneller. Was hält dich zurück?', 'OBJECTION', 'GENERAL', 'CASUAL', ARRAY['einwand', 'alleine', 'support', 'team'], ARRAY[]::text[]),

('objection_029', 'Einwand: Ich melde mich wenn ich bereit bin', 'Klar! 🙂 Aber lass mich dich was fragen:

Wann genau wärst du ''bereit''? Was müsste passieren?

[Zuhören]

Weißt du, die meisten warten auf den ''perfekten Moment''. Aber der kommt selten. Manchmal ist JETZT der richtige Zeitpunkt.', 'OBJECTION', 'GENERAL', 'DIRECT', ARRAY['einwand', 'timing', 'prokrastination', 'jetzt'], ARRAY[]::text[]),

('objection_030', 'Einwand: Mein Umfeld lacht mich aus', 'Das kenn ich! Am Anfang haben auch manche über mich gelacht. 😅

Aber weißt du was?

Dieselben Leute fragen jetzt, wie ich das mache.

Die Leute die lachen, sind oft die, die sich selbst nichts trauen. Lass dich davon nicht aufhalten.', 'OBJECTION', 'GENERAL', 'EMPATHETIC', ARRAY['einwand', 'umfeld', 'kritik', 'mut'], ARRAY[]::text[]),

-- ==========================================
-- BATCH 2: CLOSING SCRIPTS (20)
-- ==========================================

('closing_001', 'Soft Close - Zusammenfassung', 'Okay, lass mich zusammenfassen:

Du willst [Ziel]. ✅
Du siehst, dass unser [Produkt/System] das liefern kann. ✅
Die Investition passt für dich. ✅

Der einzige Schritt jetzt ist [konkrete Aktion].

Bereit?', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'soft', 'zusammenfassung'], ARRAY['Ziel', 'Produkt', 'Aktion']),

('closing_002', 'Assumptive Close', 'Super, dann machen wir das so! 🎉

Startest du lieber mit dem [Paket A] oder dem [Paket B]?

[Oder: Diese Woche oder nächste?]', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'assumptive', 'wahlmöglichkeit'], ARRAY['PaketA', 'PaketB']),

('closing_003', 'Urgency Close - Zeitdruck', 'Ich will ehrlich sein:

Das Angebot [Beschreibung] gibt''s nur noch bis [Datum]. Danach steigt der Preis auf [neuer Preis].

Ich will nicht, dass du das verpasst. Entscheidest du dich heute?', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'urgency', 'deadline', 'fomo'], ARRAY['Beschreibung', 'Datum', 'Preis']),

('closing_004', 'What''s Holding You Back', 'Basierend auf allem was du mir erzählt hast, glaube ich wirklich, dass das zu dir passt.

Was hält dich noch davon ab, heute zu starten?

[Zuhören und letzten Einwand behandeln]', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'direkt', 'einwand-final'], ARRAY[]::text[]),

('closing_005', 'Future Pacing Close', 'Stell dir mal vor:

In 6 Monaten hast du [Ergebnis erreicht]. Du wachst auf und fühlst dich [Gefühl].

Das ist möglich. Aber nur wenn du heute den ersten Schritt machst.

Bist du bereit?', 'CLOSING', 'GENERAL', 'ENTHUSIASTIC', ARRAY['closing', 'vision', 'emotion', 'zukunft'], ARRAY['Ergebnis', 'Gefühl']),

('closing_006', 'Ben Franklin Close', 'Lass uns das rational angehen.

Pro:
✅ [Vorteil 1]
✅ [Vorteil 2]
✅ [Vorteil 3]

Contra:
❓ [Bedenken - bereits besprochen]

Wenn die Vorteile überwiegen – und das tun sie – macht''s Sinn zu starten, oder?', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'logik', 'pro-contra', 'analytisch'], ARRAY['Vorteil1', 'Vorteil2', 'Vorteil3']),

('closing_007', 'Puppy Dog Close', 'Weißt du was? Probier''s einfach mal aus.

Wenn''s nach [Zeitraum] nicht das ist was du dir vorgestellt hast, können wir reden.

Kein Druck, kein Risiko. Deal?', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'testen', 'risikofrei'], ARRAY['Zeitraum']),

('closing_008', 'Now or Never Close', 'Ich sag dir was:

Der perfekte Zeitpunkt existiert nicht. Es gibt nur JETZT.

In einem Jahr wirst du dich fragen, warum du nicht heute angefangen hast.

Lass uns starten. Was sagst du?', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'jetzt', 'motivation', 'entscheidung'], ARRAY[]::text[]),

('closing_009', 'Scale Close (1-10)', 'Auf einer Skala von 1-10, wie überzeugt bist du?

[Antwort hören]

Okay, [Zahl]. Was müsste passieren, damit es eine 10 wird?

[Letzten Einwand klären und nochmal fragen]', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'skala', 'einwand', 'qualifizierung'], ARRAY[]::text[]),

('closing_010', 'Testimonial Close', '[Name] war auch skeptisch. Genau wie du.

Sie hat trotzdem angefangen und jetzt [Ergebnis].

Ihr größtes Learning? ''Hätte ich mal früher angefangen.''

Willst du in 6 Monaten dasselbe sagen können?', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'social-proof', 'story', 'erfolg'], ARRAY['Name', 'Ergebnis']),

('closing_011', 'Price Breakdown Close', 'Das Investment ist [Gesamtpreis].

Aber lass uns das aufschlüsseln:
📆 Über 12 Monate = [pro Monat]
📅 Pro Tag = [pro Tag]

Weniger als [Vergleich]. Für [Nutzen]. Fair, oder?', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'preis', 'aufschlüsselung', 'wert'], ARRAY['Gesamtpreis', 'Monat', 'Tag', 'Vergleich', 'Nutzen']),

('closing_012', 'Silent Close', '[Nach der Präsentation]

So, das ist das Angebot.

[PAUSE - Schweigen aushalten - nicht als Erster reden]

[Warten auf Reaktion des Prospects]', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'schweigen', 'pause', 'psychologie'], ARRAY[]::text[]),

('closing_013', 'Reverse Close', 'Weißt du was? Ich bin mir nicht mal sicher, ob das das Richtige für dich ist.

Warum glaubst DU, dass du damit erfolgreich sein könntest?

[Prospect verkauft sich selbst]', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'reverse', 'psychologie', 'selbstverkauf'], ARRAY[]::text[]),

('closing_014', 'Accountability Close', 'Ich mach dir einen Vorschlag:

Du startest heute, und ich bin die nächsten 90 Tage dein Coach.

Wenn du nach 90 Tagen nicht [konkretes Ergebnis] erreicht hast, finden wir gemeinsam raus warum.

Deal?', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'garantie', 'coaching', 'commitment'], ARRAY['Ergebnis']),

('closing_015', 'Fear of Loss Close', 'Ich muss ehrlich sein:

Wenn du jetzt nicht startest, passiert... nichts.

Du bist in 6 Monaten noch am gleichen Punkt.

Willst du das? Oder willst du, dass sich was ändert?', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'angst', 'verlust', 'status-quo'], ARRAY[]::text[]),

('closing_016', 'Partnership Close', 'Ich such keine Kunden – ich such Partner.

Menschen, mit denen ich langfristig zusammenarbeiten kann.

Wenn du das bist, dann lass uns starten. Zusammen.

Bist du dabei?', 'CLOSING', 'GENERAL', 'PROFESSIONAL', ARRAY['closing', 'partnerschaft', 'langfristig', 'team'], ARRAY[]::text[]),

('closing_017', 'Money Back Guarantee Close', 'Hör mal:

Wenn du nach [Zeitraum] nicht zufrieden bist, bekommst du [Garantie].

Du hast also null Risiko.

Der einzige Weg zu verlieren ist, es nicht zu versuchen.', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'garantie', 'risikofrei', 'vertrauen'], ARRAY['Zeitraum', 'Garantie']),

('closing_018', 'Next Step Close', 'Super! Der nächste Schritt ist ganz einfach:

1️⃣ [Schritt 1]
2️⃣ [Schritt 2]
3️⃣ [Schritt 3]

Ich nehm dich an die Hand. Machen wir Schritt 1 jetzt zusammen?', 'CLOSING', 'GENERAL', 'CASUAL', ARRAY['closing', 'schritte', 'einfach', 'handlung'], ARRAY['Schritt1', 'Schritt2', 'Schritt3']),

('closing_019', 'Question Close', 'Nur eine letzte Frage:

Siehst du irgendeinen Grund, warum du NICHT heute starten solltest?

[Wenn nein → Close]
[Wenn ja → Einwand behandeln]', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'frage', 'einwand', 'direkt'], ARRAY[]::text[]),

('closing_020', 'Commitment Close', 'Bevor wir starten, will ich sichergehen:

Bist du committed, das durchzuziehen?

Nicht ''ich versuch''s mal'' – sondern ''ich mach das''?

[Wenn ja] Super, dann nichts wie los! 🚀', 'CLOSING', 'GENERAL', 'DIRECT', ARRAY['closing', 'commitment', 'ernsthaft', 'erfolg'], ARRAY[]::text[])

ON CONFLICT (script_id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  company = EXCLUDED.company,
  tone = EXCLUDED.tone,
  tags = EXCLUDED.tags,
  variables = EXCLUDED.variables;

-- ============================================
-- SUMMARY
-- ============================================
-- Total Scripts: 100
-- Categories:
--   OPENER: 15
--   PITCH: 20
--   FOLLOW_UP: 13
--   OBJECTION: 30
--   CLOSING: 20
-- 
-- Companies:
--   GENERAL, ZINZINO, LR, HERBALIFE, DOTERRA, AMWAY, PM_INTERNATIONAL
-- ============================================

