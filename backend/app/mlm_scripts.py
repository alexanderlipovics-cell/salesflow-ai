"""
Universal MLM Business Building Scripts
50 professionelle Network Marketing Skripte für Geschäftsaufbau (Rekrutierung/Sponsoring)
Firmenneutral - funktioniert für Wellness, Kosmetik, Finanzen, Dienstleistungen, Haushaltsprodukte

COMPLIANCE-HINWEIS (DACH-Region):
- Keine Einkommensversprechen
- Keine "nichts tun" Aussagen
- Sprich von "leistungsorientierter Vergütung", "nebenberuflichem Aufbau", "Business-Option"
"""

UNIVERSAL_MLM_SCRIPTS = {
    "meta": {
        "company": "Universal",
        "total_scripts": 50,
        "categories": 6,
        "language": "de",
        "compliance": "DACH",
        "focus": "business_building"
    },
    
    "categories": {
        
        # ============================================
        # KATEGORIE A: DIREKTER KONTAKT & COLD MARKET
        # ============================================
        "cold_market": {
            "name": "Direkter Kontakt & Cold Market",
            "description": "Interessante Profile oder Bekannte ansprechen ohne 'spammy' zu wirken",
            "scripts": [
                {
                    "id": "A01",
                    "name": "Profil-Kompliment Ansatz",
                    "context": "Social Media - Erstkontakt",
                    "trigger": "Interessantes Profil entdeckt",
                    "script": "Hey {name}, ich bin gerade über dein Profil gestolpert. Ich mag deine positive Ausstrahlung / deinen Content zum Thema {thema}. Ich suche aktuell genau solche offenen Persönlichkeiten für eine Kooperation im Bereich {branche}. Bist du grundsätzlich offen für neue Projekte?",
                    "variables": ["name", "thema", "branche"],
                    "best_for": ["instagram", "linkedin", "facebook"]
                },
                {
                    "id": "A02",
                    "name": "Plan B Ansatz",
                    "context": "Aktuelle Wirtschaftslage nutzen",
                    "trigger": "Gespräch über Wirtschaft/Inflation",
                    "script": "Hallo {name}, in Zeiten von Inflation und Unsicherheit bauen sich viele ein zweites Standbein auf. Ich expandiere gerade mein Business in deiner Region. Hättest du Lust, dir anzusehen, wie du dir nebenberuflich etwas Eigenes aufbauen kannst, ohne deinen Job zu riskieren?",
                    "variables": ["name"],
                    "best_for": ["unsichere_zeiten", "inflation_gespräche"]
                },
                {
                    "id": "A03",
                    "name": "Ich suche Leaders Ansatz",
                    "context": "Für selbstbewusste Kontakte",
                    "trigger": "Person wirkt unternehmerisch",
                    "script": "Hey {name}, wir kennen uns noch nicht, aber du wirkst auf mich wie jemand, der unternehmerisch denkt. Ich suche aktuell 2-3 Schlüsselpersonen, die Lust haben, etwas Großes mit aufzubauen. Wenn du offen für Business-Optionen bist, lass uns mal 10 Min sprechen.",
                    "variables": ["name"],
                    "best_for": ["unternehmer_typen", "führungspersönlichkeiten"]
                },
                {
                    "id": "A04",
                    "name": "Dritte Person Frage",
                    "context": "Indirekter Ansatz",
                    "trigger": "Will nicht direkt ansprechen",
                    "script": "Hallo {name}, ich brauche mal dein Netzwerk. Kennst du jemanden, der aktuell unzufrieden im Job ist oder sich gerne 500-1000€ nebenbei dazuverdienen möchte? Ich habe da ein spannendes Projekt.",
                    "variables": ["name"],
                    "follow_up": "Oft antwortet der Gefragte: 'Ja, ich selbst. Worum geht's?'",
                    "best_for": ["indirekter_einstieg", "netzwerk_nutzen"]
                },
                {
                    "id": "A05",
                    "name": "Kunden-zu-Partner Switch",
                    "context": "Begeisterte Produktnutzer",
                    "trigger": "Kunde zeigt Begeisterung",
                    "script": "Hey {name}, du bist ja so begeistert von {produkt}. Hast du mal darüber nachgedacht, diese Begeisterung zu nutzen? Viele meiner Partner haben angefangen wie du – als zufriedene Kunden – und refinanzieren sich jetzt ihre Produkte oder verdienen sich ein echtes Einkommen dazu.",
                    "variables": ["name", "produkt"],
                    "best_for": ["bestandskunden", "produktfans"]
                },
                {
                    "id": "A06",
                    "name": "Mama/Papa Ansatz",
                    "context": "Flexibilität für Eltern",
                    "trigger": "Person hat Kinder",
                    "script": "Hallo {name}, ich sehe, du bist auch Mama/Papa. Ich weiß, wie schwer der Spagat zwischen Job und Familie ist. Ich arbeite mit einem Konzept, das mir erlaubt, von zu Hause aus zu arbeiten, wenn die Kids schlafen/in der Schule sind. Wäre mehr Flexibilität für dich interessant?",
                    "variables": ["name"],
                    "best_for": ["eltern", "mütter", "väter", "homeoffice"]
                },
                {
                    "id": "A07",
                    "name": "Karriere-Frust Ansatz",
                    "context": "Unzufriedenheit im Job",
                    "trigger": "Person klagt über Arbeit",
                    "script": "Hey {name}, kurze Frage: Liebst du das, was du aktuell beruflich machst, zu 100%? Falls nicht: Ich zeige Menschen, wie sie sich parallel zum Job einen 'Exit-Plan' aufbauen können. Interesse an Infos?",
                    "variables": ["name"],
                    "best_for": ["job_unzufriedene", "karriere_wechsler"]
                },
                {
                    "id": "A08",
                    "name": "Branche-Spezifisch Ansatz",
                    "context": "Für Selbstständige (Trainer, Kosmetiker)",
                    "trigger": "Person ist selbstständig im Dienstleistungsbereich",
                    "script": "Hallo {name}, als {beruf} tauscht du ja Zeit gegen Geld. Was passiert, wenn du mal krank bist oder Urlaub machst? Ich habe ein Konzept, wie du an deiner Expertise auch dann verdienst, wenn du gerade nicht im Studio bist. Offen für einen Austausch?",
                    "variables": ["name", "beruf"],
                    "best_for": ["fitnesstrainer", "kosmetikerinnen", "therapeuten", "coaches"]
                },
                {
                    "id": "A09",
                    "name": "Neugier-Wecker",
                    "context": "Neugier wecken ohne Details",
                    "trigger": "Person hat besondere Eigenschaft",
                    "script": "Hey {name}, ich habe gerade ein Projekt gestartet und musste sofort an dich denken, weil du {eigenschaft} bist. Ich weiß nicht, ob es was für dich ist, aber ich würde es dir gerne unverbindlich zeigen.",
                    "variables": ["name", "eigenschaft"],
                    "beispiel_eigenschaften": ["sehr organisiert", "kommunikativ", "zielstrebig", "kreativ"],
                    "best_for": ["persönliche_ansprache", "kompliment_einstieg"]
                },
                {
                    "id": "A10",
                    "name": "Studenten/Azubi Ansatz",
                    "context": "Junge Zielgruppe",
                    "trigger": "Person ist Student oder Azubi",
                    "script": "Hi {name}, neben dem Studium Geld verdienen, ohne kellnern zu müssen? Ich baue ein Team auf, das rein über Social Media arbeitet. Freie Zeiteinteilung. Wäre das was für dich?",
                    "variables": ["name"],
                    "best_for": ["studenten", "azubis", "junge_zielgruppe", "social_media_affin"]
                }
            ]
        },
        
        # ============================================
        # KATEGORIE B: WARUM-FRAGE & PAIN POINTS
        # ============================================
        "pain_points": {
            "name": "Warum-Frage & Pain Points",
            "description": "Das 'Warum' des Interessenten herauskitzeln bevor man präsentiert",
            "scripts": [
                {
                    "id": "B01",
                    "name": "Zukunfts-Frage",
                    "context": "Langfristige Perspektive ansprechen",
                    "trigger": "Gespräch über Zukunft/Karriere",
                    "script": "Wo siehst du dich beruflich in 5 Jahren, wenn du so weitermachst wie heute? Bist du mit diesem Bild zufrieden oder wünschst du dir eine Veränderung?",
                    "variables": [],
                    "psychology": "Schafft Unzufriedenheit mit Status Quo"
                },
                {
                    "id": "B02",
                    "name": "Einkommens-Lücken Frage",
                    "context": "Finanzielle Wünsche aufdecken",
                    "trigger": "Gespräch über Geld/Finanzen",
                    "script": "Was würdest du tun, wenn jeden Monat 500€ mehr auf dem Konto wären? Urlaub, Sparen oder Rechnungen zahlen? Ich kann dir zeigen, wie das realistisch machbar ist.",
                    "variables": [],
                    "psychology": "Aktiviert emotionale Wünsche"
                },
                {
                    "id": "B03",
                    "name": "Sicherheits-Frage",
                    "context": "Risiko einer Einkommensquelle",
                    "trigger": "Person hat nur einen Job",
                    "script": "Verlässt du dich gerne auf nur eine Einkommensquelle? Die meisten Finanzexperten raten zu Diversifikation. Network Marketing ist der risikoärmste Weg, eine zweite Quelle aufzubauen.",
                    "variables": [],
                    "psychology": "Spielt mit Sicherheitsbedürfnis"
                },
                {
                    "id": "B04",
                    "name": "Chef-Frage",
                    "context": "Freiheit vs. Anstellung",
                    "trigger": "Person ist angestellt und unzufrieden",
                    "script": "Wie sehr nervt es dich, dass jemand anderes über deine Zeit und deinen Gehaltsscheck bestimmt? Stell dir vor, du wärst dein eigener Chef, aber ohne das Risiko einer klassischen Firmengründung.",
                    "variables": [],
                    "psychology": "Freiheitswunsch aktivieren"
                },
                {
                    "id": "B05",
                    "name": "Renten-Frage",
                    "context": "Altersvorsorge ansprechen",
                    "trigger": "Gespräch über Zukunft/Alter",
                    "script": "Mal ehrlich: Glaubst du, dass deine Rente später reichen wird, um deinen Lebensstandard zu halten? Wir bauen uns hier ein asset-basiertes Einkommen auf, das langfristig fließt.",
                    "variables": [],
                    "psychology": "Zukunftsangst konstruktiv nutzen"
                }
            ]
        },
        
        # ============================================
        # KATEGORIE C: EINWANDBEHANDLUNG
        # ============================================
        "objection_handling": {
            "name": "Einwandbehandlung (Geschäftsmodell)",
            "description": "Vorurteile gegen MLM entkräften und Professionalität zeigen",
            "scripts": [
                {
                    "id": "C01",
                    "name": "Schneeballsystem Einwand",
                    "objection": "Ist das ein Schneeballsystem?",
                    "script": "Ich bin froh, dass du das fragst, das zeigt, dass du kritisch bist. Schneeballsysteme sind illegal und haben kein echtes Produkt. Wir sind ein registriertes Unternehmen mit realen Produkten/Dienstleistungen. Wir werden nur bezahlt, wenn Umsatz fließt – genau wie im klassischen Vertrieb. Macht das Sinn für dich?",
                    "technique": "Kompliment + Aufklärung + Rückfrage"
                },
                {
                    "id": "C02",
                    "name": "Keine Zeit Einwand",
                    "objection": "Ich habe keine Zeit.",
                    "script": "Genau deshalb ist das hier interessant für dich. Wenn du heute keine Zeit hast, wirst du in 5 Jahren auch keine haben, wenn du nichts änderst. Wir nutzen ein System, um Zeit zu hebeln. Kannst du 3-5 Stunden pro Woche investieren, um langfristig mehr Zeit zu haben?",
                    "technique": "Reframe + konkrete Frage"
                },
                {
                    "id": "C03",
                    "name": "Kann nicht verkaufen Einwand",
                    "objection": "Ich kann nicht verkaufen.",
                    "script": "Musst du auch nicht im klassischen Sinne. Wir sind keine Staubsaugervertreter. Wir empfehlen Produkte, die wir lieben, und zeigen anderen, wie das Geschäft funktioniert. Es ist eher Beratung und Coaching. Kannst du etwas empfehlen, das du gut findest?",
                    "technique": "Reframe + einfache Rückfrage"
                },
                {
                    "id": "C04",
                    "name": "Kenne niemanden Einwand",
                    "objection": "Ich kenne niemanden.",
                    "script": "Das dachte ich am Anfang auch. Aber wir zeigen dir in unserem Onboarding genau, wie du über Social Media Kontakte knüpfst und wie du professionell arbeitest, ohne deine Freunde zu nerven. Das ist alles lernbar.",
                    "technique": "Empathie + Lösung anbieten"
                },
                {
                    "id": "C05",
                    "name": "Kein Geld Einwand",
                    "objection": "Ich habe kein Geld zum Starten.",
                    "script": "Verstehe ich. Aber ist das nicht genau der Grund, warum du etwas ändern solltest? Im Vergleich zu einem Franchise (wo du 50.000€ brauchst) ist der Start hier minimal. Wenn ich dir zeige, wie du dein Startkapital im ersten Monat wieder reinholst, wäre es dann eine Option?",
                    "technique": "Verständnis + Perspektivwechsel + Angebot"
                },
                {
                    "id": "C06",
                    "name": "Nur die Oben verdienen Einwand",
                    "objection": "Das machen doch nur die oben, die Geld verdienen.",
                    "script": "Das ist ein Mythos. In einer normalen Firma verdient der Chef immer mehr als der Angestellte. Hier ist es fair: Wenn du fleißiger bist als ich, kannst du mich überholen und mehr verdienen. Es ist leistungsbezogen, nicht positionsbezogen.",
                    "technique": "Mythos entkräften + Fairness betonen"
                },
                {
                    "id": "C07",
                    "name": "Was denken andere Einwand",
                    "objection": "Was denken meine Freunde/Familie?",
                    "script": "Zahlen deine Freunde deine Rechnungen? Wenn du erfolgreich wirst, werden sie dich fragen, wie du es gemacht hast. Am Anfang gibt es oft Skepsis, aber wir arbeiten professionell. Du musst niemanden überreden.",
                    "technique": "Perspektivwechsel + Professionalität"
                },
                {
                    "id": "C08",
                    "name": "Kein Social Media Typ Einwand",
                    "objection": "Ich bin nicht der Typ für Social Media.",
                    "script": "Social Media ist ein Werkzeug, aber kein Muss. Man kann dieses Geschäft auch 'offline' durch Netzwerken aufbauen. Wir finden den Weg, der zu deiner Persönlichkeit passt.",
                    "technique": "Alternative anbieten"
                },
                {
                    "id": "C09",
                    "name": "Partner fragen Einwand",
                    "objection": "Ich muss erst meinen Partner fragen.",
                    "script": "Absolut, das ist wichtig. Soll ich dir ein kurzes Video geben, das ihr euch gemeinsam ansehen könnt? Dann hat er/sie auch die richtigen Fakten und nicht nur Hörensagen.",
                    "technique": "Validieren + Tool anbieten"
                },
                {
                    "id": "C10",
                    "name": "Später anschauen Einwand",
                    "objection": "Ich schau mir das später mal an.",
                    "script": "Klar, kein Druck. Aber beachte: Wir starten gerade eine neue Team-Phase. Wenn du jetzt einsteigst, profitierst du vom aktuellen Momentum. Timing ist im Business oft alles.",
                    "technique": "Akzeptieren + Urgency"
                }
            ]
        },
        
        # ============================================
        # KATEGORIE D: DIE EINLADUNG
        # ============================================
        "invitation": {
            "name": "Die Einladung (Präsentation/Call)",
            "description": "Den Interessenten dazu bringen, sich das Geschäftskonzept anzusehen",
            "scripts": [
                {
                    "id": "D01",
                    "name": "Wenn ich würdest du Klassiker",
                    "context": "Standard-Einladung",
                    "trigger": "Nach Interesse-Signal",
                    "script": "Wenn ich dir einen Link zu einem 15-minütigen Video sende, das unser Geschäftsmodell erklärt – würdest du es dir ansehen?",
                    "technique": "Micro-Commitment"
                },
                {
                    "id": "D02",
                    "name": "Live-Webinar Einladung",
                    "context": "Event-basiert",
                    "trigger": "Webinar steht an",
                    "script": "Hey {name}, heute Abend um {uhrzeit} erklärt einer unserer Top-Führungskräfte das Konzept live. Da kannst du anonym reinschauen und dir ein Bild machen. Soll ich dir den Zoom-Link reservieren?",
                    "variables": ["name", "uhrzeit"],
                    "technique": "Anonymität + Live-Element"
                },
                {
                    "id": "D03",
                    "name": "Mein Mentor Einladung",
                    "context": "3-Way-Call",
                    "trigger": "Viele Fragen vom Interessenten",
                    "script": "Du hast so gute Fragen, die ich dir gerne professionell beantworten möchte. Lass uns kurz mit meinem Mentor {mentor_name} telefonieren. Er/Sie ist extrem erfolgreich und kann dir genau sagen, ob das was für dich ist.",
                    "variables": ["mentor_name"],
                    "technique": "Autorität nutzen"
                },
                {
                    "id": "D04",
                    "name": "Kein Risiko Pitch",
                    "context": "Risikobedenken nehmen",
                    "trigger": "Person zögert",
                    "script": "Schau es dir einfach unverbindlich an. Im schlimmsten Fall hast du 20 Minuten Zeit investiert und weißt, dass es nichts für dich ist. Im besten Fall ändert es deine finanzielle Zukunft. Fairer Deal?",
                    "technique": "Worst-Case minimieren"
                },
                {
                    "id": "D05",
                    "name": "Exklusiv Ansatz",
                    "context": "Wertigkeit erhöhen",
                    "trigger": "Hochwertige Kontakte",
                    "script": "Ich wähle meine Partner sehr genau aus. Schau dir diese Info an, und danach entscheiden wir beide, ob eine Zusammenarbeit Sinn macht.",
                    "technique": "Exklusivität + gegenseitige Auswahl"
                },
                {
                    "id": "D06",
                    "name": "Neues Produkt Launch Ansatz",
                    "context": "Timing nutzen",
                    "trigger": "Neuer Launch steht an",
                    "script": "Wir launchen gerade eine neue Produktlinie im Bereich {bereich}. Das ist der perfekte Zeitpunkt, um sich als Partner zu positionieren, bevor es jeder kennt. Hier sind die Infos...",
                    "variables": ["bereich"],
                    "technique": "First-Mover Advantage"
                },
                {
                    "id": "D07",
                    "name": "Zweite Meinung",
                    "context": "Warmer Markt",
                    "trigger": "Bekannte/Freunde",
                    "script": "Du bist geschäftlich fit. Würdest du mir einen Gefallen tun und dir mein neues Business-Konzept ansehen? Ich bräuchte deine ehrliche Meinung dazu.",
                    "technique": "Expertise anerkennen + Gefallen bitten"
                },
                {
                    "id": "D08",
                    "name": "Video-Teaser",
                    "context": "Neugier auf Video",
                    "trigger": "Video senden",
                    "script": "Ich schicke dir ein Video. Achte besonders auf Minute 4 bis 6, da wird erklärt, wie die Vergütung funktioniert. Das hat mich total geflasht.",
                    "technique": "Spezifische Anweisung + persönliche Reaktion"
                },
                {
                    "id": "D09",
                    "name": "WhatsApp-Audio Methode",
                    "context": "Persönlicher als Text",
                    "trigger": "WhatsApp Konversation",
                    "script": "Hey, schreiben dauert zu lange. Ich habe hier ein Konzept, das {vorteil}. Ich schick dir gleich ein kurzes Info-Video. Gib mir danach einfach Feedback, ob Daumen hoch oder runter.",
                    "variables": ["vorteil"],
                    "technique": "Audio = persönlicher"
                },
                {
                    "id": "D10",
                    "name": "Veranstaltungs-Einladung Offline",
                    "context": "Live-Event",
                    "trigger": "Event in der Nähe",
                    "script": "Am {tag} ist ein Business-Day von uns in deiner Nähe. Ich lade dich ein, komm als mein Gast mit. Du wirst den 'Vibe' und die Menschen dort lieben.",
                    "variables": ["tag"],
                    "technique": "Erlebnis + Gast-Status"
                }
            ]
        },
        
        # ============================================
        # KATEGORIE E: FOLLOW-UP & GHOSTING
        # ============================================
        "follow_up": {
            "name": "Follow-Up & Ghosting",
            "description": "Nachfassen ohne zu nerven - Entscheidung abholen",
            "scripts": [
                {
                    "id": "E01",
                    "name": "Was hat dir am besten gefallen",
                    "context": "Nach Video/Präsentation",
                    "trigger": "Person hat Info gesehen",
                    "script": "Hey {name}, du hast das Video gesehen. Was hat dir am besten gefallen? Das Produkt oder die Möglichkeit, Geld zu verdienen?",
                    "variables": ["name"],
                    "technique": "Positive Presupposition - NIE fragen 'Wie fandest du es?'",
                    "why": "Lädt nicht zu Kritik ein"
                },
                {
                    "id": "E02",
                    "name": "Skala-Frage",
                    "context": "Interesse quantifizieren",
                    "trigger": "Nach erster Info",
                    "script": "Auf einer Skala von 1 bis 10 (1 = kein Interesse, 10 = ich will sofort starten): Wo stehst du gerade?",
                    "follow_up": "Bei allem über 1 fragen: 'Was fehlt dir noch zur 10?'",
                    "technique": "Quantifizierung + Lücke identifizieren"
                },
                {
                    "id": "E03",
                    "name": "Noch offen Check",
                    "context": "Nach Ghosting",
                    "trigger": "Keine Antwort seit Tagen",
                    "script": "Hey {name}, ich wollte das hier nicht offen lassen. Bist du grundsätzlich noch offen für das Thema 'Nebenberuflicher Aufbau', oder soll ich dich von meiner Liste streichen?",
                    "variables": ["name"],
                    "technique": "Klare Entscheidung einfordern"
                },
                {
                    "id": "E04",
                    "name": "Nicht nerven wollen",
                    "context": "Sympathie zeigen",
                    "trigger": "Gefühl zu pushy zu sein",
                    "script": "Hallo {name}, ich habe das Gefühl, ich gehe dir auf die Nerven, das ist nicht meine Absicht! 😉 Ein kurzes 'Kein Interesse' ist völlig okay für mich. Sag einfach Bescheid.",
                    "variables": ["name"],
                    "technique": "Selbstironie + Permission to say no"
                },
                {
                    "id": "E05",
                    "name": "Zeit rennt Ansatz",
                    "context": "Urgency schaffen",
                    "trigger": "Einarbeitung planen",
                    "script": "Hey, ich plane gerade die Einarbeitung für die nächste Woche und habe noch einen Slot frei. Willst du ihn haben oder soll ich ihn anderweitig vergeben?",
                    "technique": "Scarcity + Entscheidungsdruck"
                },
                {
                    "id": "E06",
                    "name": "Social Proof Follow-Up",
                    "context": "Erfolg anderer zeigen",
                    "trigger": "Neuer Partner hat Erfolg",
                    "script": "Schau mal, {partner_name} ist letzte Woche gestartet und hat gerade seinen ersten Bonus erreicht. Das hättest du auch sein können! Wollen wir nochmal quatschen?",
                    "variables": ["partner_name"],
                    "technique": "FOMO + Social Proof"
                },
                {
                    "id": "E07",
                    "name": "Frage vergessen",
                    "context": "Sanftes Nachfassen",
                    "trigger": "Keine Reaktion",
                    "script": "Da ich nichts höre: Habe ich dir eine wichtige Frage noch nicht beantwortet, oder passt der Zeitpunkt einfach gerade nicht?",
                    "technique": "Service-Orientierung + Timing-Option"
                },
                {
                    "id": "E08",
                    "name": "Update nach Monaten",
                    "context": "Reaktivierung",
                    "trigger": "Lange kein Kontakt",
                    "script": "Hey {name}, lange her! Wollte dir nur kurz sagen: Bei uns hat sich viel getan (neue Produkte/Tools). Vielleicht ist jetzt ein besserer Zeitpunkt für dich als damals?",
                    "variables": ["name"],
                    "technique": "News-Anlass + neuer Zeitpunkt"
                },
                {
                    "id": "E09",
                    "name": "Humor-Breaker",
                    "context": "Eis brechen nach Stille",
                    "trigger": "Lange keine Antwort",
                    "script": "Wurde dein Handy von Aliens entführt? 🛸 Scherz beiseite: Alles gut bei dir?",
                    "technique": "Humor + echtes Interesse"
                },
                {
                    "id": "E10",
                    "name": "Erlaubnis zum Abschluss",
                    "context": "Finaler Follow-Up",
                    "trigger": "Letzte Nachricht",
                    "script": "Wenn ich bis Freitag nichts höre, gehe ich davon aus, dass du aktuell glücklich und zufrieden bist und kein weiteres Einkommen brauchst. Ich archiviere dann deine Akte. Alles Liebe!",
                    "technique": "Deadline + positives Framing + Abschluss"
                }
            ]
        },
        
        # ============================================
        # KATEGORIE F: CLOSING & ONBOARDING
        # ============================================
        "closing": {
            "name": "Closing & Onboarding",
            "description": "Die Registrierung durchführen und das Commitment abholen",
            "scripts": [
                {
                    "id": "F01",
                    "name": "Bist du bereit Abschluss",
                    "context": "Nach Überzeugung",
                    "trigger": "Person hat Interesse bestätigt",
                    "script": "Du hast gesagt, du willst {ziel} erreichen und das Modell passt für dich. Ich bin bereit, Zeit in dich zu investieren. Bist du bereit, zu starten?",
                    "variables": ["ziel"],
                    "technique": "Commitment abholen"
                },
                {
                    "id": "F02",
                    "name": "Paket-Wahl Abschluss",
                    "context": "Optionen präsentieren",
                    "trigger": "Ja-Signal",
                    "script": "Es gibt drei Möglichkeiten zu starten: Das kleine Paket zum Testen, das Business-Paket für den schnellen Start oder das Profi-Paket. Welches passt am besten zu deinen Zielen?",
                    "technique": "Auswahl statt Ja/Nein"
                },
                {
                    "id": "F03",
                    "name": "Letzte Zweifel Killer",
                    "context": "Risiko minimieren",
                    "trigger": "Noch leichte Zweifel",
                    "script": "Lass uns das Worst-Case-Szenario durchgehen: Du startest, nutzt die Produkte und entscheidest nach 3 Monaten, dass das Business nichts für dich ist. Dann hast du tolle Produkte genutzt und bist gesünder/schöner. Das Risiko ist also null. Sollen wir es machen?",
                    "technique": "Worst-Case = immer noch gut"
                },
                {
                    "id": "F04",
                    "name": "Verdienst-Check",
                    "context": "Ziele konkretisieren",
                    "trigger": "Einkommens-Interesse",
                    "script": "Wie viel möchtest du im ersten Monat verdienen? Okay, um {betrag} Euro zu erreichen, müssen wir {aufgabe} tun. Traust du dir das zu, wenn ich dir dabei helfe?",
                    "variables": ["betrag", "aufgabe"],
                    "technique": "Konkretisierung + Support anbieten"
                },
                {
                    "id": "F05",
                    "name": "Willkommen-Satz",
                    "context": "Nach dem Ja",
                    "trigger": "Zusage erhalten",
                    "script": "Super Entscheidung! Ich schicke dir jetzt den Registrierungslink. Sobald du durch bist, machen wir direkt einen Termin für dein Onboarding-Gespräch, damit du keine Zeit verlierst. Willkommen im Team!",
                    "technique": "Bestätigung + nächster Schritt + Emotion"
                }
            ]
        }
    }
}


def get_script_by_id(script_id: str) -> dict:
    """Get a specific script by its ID (e.g., 'A01', 'C05')"""
    for category in UNIVERSAL_MLM_SCRIPTS["categories"].values():
        for script in category["scripts"]:
            if script["id"] == script_id:
                return script
    return None


def get_scripts_by_category(category_key: str) -> list:
    """Get all scripts in a category"""
    if category_key in UNIVERSAL_MLM_SCRIPTS["categories"]:
        return UNIVERSAL_MLM_SCRIPTS["categories"][category_key]["scripts"]
    return []


def get_objection_response(objection_keyword: str) -> dict:
    """Find the best objection handling script for a keyword"""
    objection_scripts = UNIVERSAL_MLM_SCRIPTS["categories"]["objection_handling"]["scripts"]
    for script in objection_scripts:
        if objection_keyword.lower() in script["objection"].lower():
            return script
    return None


def get_all_categories() -> list:
    """Return list of all category names and descriptions"""
    return [
        {
            "key": key,
            "name": cat["name"],
            "description": cat["description"],
            "count": len(cat["scripts"])
        }
        for key, cat in UNIVERSAL_MLM_SCRIPTS["categories"].items()
    ]


def search_scripts(query: str) -> list:
    """Search all scripts for a keyword"""
    results = []
    query_lower = query.lower()
    for category in UNIVERSAL_MLM_SCRIPTS["categories"].values():
        for script in category["scripts"]:
            searchable = f"{script.get('name', '')} {script.get('context', '')} {script.get('script', '')} {script.get('trigger', '')}"
            if query_lower in searchable.lower():
                results.append(script)
    return results


# Export for API usage
__all__ = [
    "UNIVERSAL_MLM_SCRIPTS",
    "get_script_by_id",
    "get_scripts_by_category", 
    "get_objection_response",
    "get_all_categories",
    "search_scripts"
]