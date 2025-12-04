"""
╔════════════════════════════════════════════════════════════════════════════╗
║  BASE SCRIPTS - Allgemeine MLM-Scripts (70+)                                 ║
║  Universell einsetzbare Scripts für alle MLM-Unternehmen                    ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, List, Any

# =============================================================================
# BASE SCRIPTS - 70+ allgemeine Scripts
# =============================================================================

BASE_SCRIPTS = {
    
    # =========================================================================
    # PITCHES - 12 allgemeine Opener
    # =========================================================================
    
    "pitches": {
        "gesundheit_frage": {
            "name": "Gesundheits-Frage",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "cold_warm",
            "text": """Hey [Name] 👋

Kurze Frage: Was tust du für deine Gesundheit? 

Ich meine nicht nur Sport und Ernährung, sondern auch präventive Maßnahmen. Viele Menschen übersehen wichtige Bausteine.

Falls du interessiert bist, kann ich dir mehr erzählen.""",
            "variables": ["Name"],
            "tags": ["gesundheit", "prävention", "allgemein"]
        },
        
        "wert_frage": {
            "name": "Wert-Frage",
            "channel": ["whatsapp", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name],

eine Frage: Was ist dir deine Gesundheit wert?

Viele Menschen investieren in Fitness, Ernährung, Wellness - aber übersehen wichtige Bausteine, die wissenschaftlich belegt sind.

Falls das interessant für dich ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "tags": ["wert", "gesundheit", "investition"]
        },
        
        "kennenlernen": {
            "name": "Kennenlernen",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

wir kennen uns ja schon eine Weile. Ich arbeite mit [Produkt/Service] und helfe Menschen dabei, [Nutzen].

Falls das für dich interessant ist, können wir gerne mal sprechen.""",
            "variables": ["Name", "Produkt/Service", "Nutzen"],
            "tags": ["kennenlernen", "warm", "beziehung"]
        },
        
        "gemeinsamkeiten": {
            "name": "Gemeinsamkeiten",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

ich sehe, wir haben [Gemeinsamkeit] gemeinsam. 

Ich arbeite mit [Produkt/Service] und helfe Menschen dabei, [Nutzen] zu erreichen. Falls das für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Gemeinsamkeit", "Produkt/Service", "Nutzen"],
            "tags": ["gemeinsamkeiten", "warm", "rapport"]
        },
        
        "kurze_frage": {
            "name": "Kurze Frage",
            "channel": ["whatsapp"],
            "type": "cold",
            "text": """Hey [Name],

kurze Frage: [Frage]?

Falls ja, kann ich dir vielleicht helfen.""",
            "variables": ["Name", "Frage"],
            "tags": ["kurz", "frage", "cold"]
        },
        
        "interesse_wecken": {
            "name": "Interesse wecken",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name],

ich habe etwas Interessantes entdeckt, das vielleicht auch für dich relevant ist: [Hook].

Falls du mehr wissen möchtest, können wir gerne sprechen.""",
            "variables": ["Name", "Hook"],
            "tags": ["interesse", "hook", "cold_warm"]
        },
        
        "social_proof": {
            "name": "Social Proof",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich habe gerade mit [Name2] gesprochen, der [Erfolg] erreicht hat. 

Falls das auch für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Name2", "Erfolg"],
            "tags": ["social_proof", "erfolg", "warm"]
        },
        
        "wertschätzung": {
            "name": "Wertschätzung",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

ich schätze [Qualität] an dir sehr. 

Deshalb dachte ich, dass [Angebot] vielleicht auch für dich interessant sein könnte. Falls ja, können wir gerne sprechen.""",
            "variables": ["Name", "Qualität", "Angebot"],
            "tags": ["wertschätzung", "warm", "beziehung"]
        },
        
        "neugier": {
            "name": "Neugier wecken",
            "channel": ["whatsapp", "instagram"],
            "type": "cold_warm",
            "text": """Hey [Name],

ich habe etwas entdeckt, das vielleicht auch für dich interessant ist. 

Falls du neugierig bist, können wir gerne kurz sprechen.""",
            "variables": ["Name"],
            "tags": ["neugier", "cold_warm", "hook"]
        },
        
        "persönlich": {
            "name": "Persönlicher Ansatz",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich dachte an dich, weil [Grund]. 

Falls [Angebot] für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Grund", "Angebot"],
            "tags": ["persönlich", "warm", "beziehung"]
        },
        
        "wert_anbieten": {
            "name": "Wert anbieten",
            "channel": ["whatsapp", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name],

ich biete [Wert] an, das vielleicht auch für dich interessant ist.

Falls du mehr wissen möchtest, können wir gerne sprechen.""",
            "variables": ["Name", "Wert"],
            "tags": ["wert", "angebot", "cold_warm"]
        },
        
        "einfach": {
            "name": "Einfach & direkt",
            "channel": ["whatsapp"],
            "type": "cold",
            "text": """Hey [Name],

kurz: [Angebot]. Interessiert?""",
            "variables": ["Name", "Angebot"],
            "tags": ["einfach", "direkt", "cold"]
        }
    },
    
    # =========================================================================
    # WERT-FRAGEN - 8 Pain-Fragen
    # =========================================================================
    
    "wert_fragen": {
        "lebensqualität": {
            "name": "Lebensqualität",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name], eine Frage: Was ist dir deine Lebensqualität wert?

Ich meine: Energie, Wohlbefinden, langfristige Gesundheit. 

Viele Menschen investieren in verschiedene Dinge, aber übersehen wichtige Bausteine.

Ist das etwas, worauf du Wert legst?""",
            "variables": ["Name"],
            "tags": ["lebensqualität", "wert", "gesundheit"]
        },
        
        "zukunft": {
            "name": "Zukunftsinvestition",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

wie investierst du in deine Zukunft? 

Ich meine nicht finanziell, sondern gesundheitlich. Was du heute tust, wirkt sich auf dein Wohlbefinden in 10, 20 Jahren aus.

Ist das etwas, das für dich wichtig ist?""",
            "variables": ["Name"],
            "tags": ["zukunft", "investition", "gesundheit"]
        },
        
        "gewissheit": {
            "name": "Wert der Gewissheit",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

was ist dir mehr wert: Raten oder Wissen?

Viele Menschen hoffen, dass etwas wirkt. Aber es gibt einen Weg, es zu MESSEN.

Das ist Gewissheit statt Hoffnung.

Ist das etwas, das für dich wertvoll ist?""",
            "variables": ["Name"],
            "tags": ["gewissheit", "test", "transparenz"]
        },
        
        "frustration": {
            "name": "Frustration",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """[Name],

ich verstehe, wenn du frustriert bist. Viele Menschen haben schon verschiedene Dinge probiert - ohne zu wissen, ob sie wirklich wirken.

Das ist der Unterschied: Du kannst es TESTEN. Keine Vermutungen. Nur Fakten.

Möchtest du es ausprobieren?""",
            "variables": ["Name"],
            "tags": ["frustration", "test", "transparenz"]
        },
        
        "prioritäten": {
            "name": "Prioritäten",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

was sind deine Prioritäten? 

Gesundheit, Familie, Erfolg? 

Falls Gesundheit dazu gehört, könnte [Angebot] interessant für dich sein.""",
            "variables": ["Name", "Angebot"],
            "tags": ["prioritäten", "wert", "gesundheit"]
        },
        
        "kosten_nichtstun": {
            "name": "Kosten des Nichtstuns",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

eine Frage: Was kostet es dich, NICHT zu handeln?

Gesundheit ist eine Investition. [Angebot] ist messbar und evidenzbasiert.

Möchtest du es ausprobieren?""",
            "variables": ["Name", "Angebot"],
            "tags": ["kosten", "investition", "wert"]
        },
        
        "was_wichtig": {
            "name": "Was ist wichtig?",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

was ist dir wirklich wichtig? 

Falls [Thema] dazu gehört, könnte [Angebot] interessant für dich sein.""",
            "variables": ["Name", "Thema", "Angebot"],
            "tags": ["wichtig", "wert", "thema"]
        },
        
        "veränderung": {
            "name": "Veränderung",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

was müsste passieren, damit du [Ziel] erreichst?

Falls [Angebot] dabei helfen kann, können wir gerne sprechen.""",
            "variables": ["Name", "Ziel", "Angebot"],
            "tags": ["veränderung", "ziel", "wert"]
        }
    },
    
    # =========================================================================
    # EINWAND-HANDLING - 12 allgemeine Einwände
    # =========================================================================
    
    "einwand_handling": {
        "zu_teuer": {
            "einwand": "Das ist mir zu teuer.",
            "antwort": """Ich verstehe. Aber vergleiche es nicht mit Standard-Produkten. Der Unterschied liegt in der Qualität und Nachweisbarkeit.

Außerdem: Bei uns kannst du TESTEN, ob es wirkt. Das kannst du bei günstigeren Alternativen nicht.

Es ist nicht teurer - es ist anders. Und messbar.

Möchtest du mehr über den Unterschied erfahren?""",
            "key_argument": "Qualität und Nachweisbarkeit",
            "tags": ["preis", "qualität", "test"]
        },
        
        "keine_zeit": {
            "einwand": "Ich habe keine Zeit.",
            "antwort": """Ich verstehe das. Aber hier ist die Sache: Gesundheit braucht Zeit - oder sie kostet dich später Zeit.

[Angebot] ist einfach in den Alltag integrierbar. Du musst nichts Kompliziertes machen.

Falls du 5 Minuten hast, kann ich dir zeigen, wie einfach es ist.""",
            "key_argument": "Einfach integrierbar",
            "tags": ["zeit", "einfach", "integration"]
        },
        
        "muss_nachdenken": {
            "einwand": "Ich muss nachdenken / mit Partner sprechen.",
            "antwort": """Das ist völlig verständlich. Nimm dir gerne die Zeit.

Falls du Fragen hast oder mit deinem Partner sprechen möchtest, helfe ich dir gerne.

Soll ich dir die wichtigsten Infos nochmal zusammenfassen?""",
            "key_argument": "Zeit geben, Support anbieten",
            "tags": ["nachdenken", "partner", "support"]
        },
        
        "ist_das_mlm": {
            "einwand": "Ist das MLM / Pyramide?",
            "antwort": """[Unternehmen] ist ein Network-Marketing-Unternehmen, ja. Aber es ist kein Schneeballsystem.

Der Unterschied: Bei uns geht es primär um das PRODUKT. Die meisten Kunden sind reine Endkunden.

Das Geschäftsmodell ist transparent: Du kannst Partner werden und andere Menschen über das Produkt informieren. Aber das ist optional.

Viele Menschen nutzen [Unternehmen] einfach als Kunden, weil sie die Qualität schätzen.

Möchtest du mehr über das Produkt erfahren?""",
            "key_argument": "Produkt steht im Vordergrund",
            "tags": ["mlm", "transparenz", "produkt"]
        },
        
        "glaube_nicht": {
            "einwand": "Ich glaube nicht an [Produkttyp].",
            "antwort": """Ich verstehe deine Skepsis. Viele Menschen sind es.

Deshalb machen wir es anders: Du musst nicht GLAUBEN - du kannst es MESSEN.

[Test] zeigt dir deine Werte. Keine Vermutungen, sondern Fakten.

Wenn deine Werte nicht optimal sind, kannst du [Produkt] nehmen - und nach [Zeitraum] siehst du die Veränderung.

Das ist Evidenz statt Glaube.

Möchtest du es testen?""",
            "key_argument": "Testen statt Glauben",
            "tags": ["skeptiker", "test", "evidenz"]
        },
        
        "schon_versucht": {
            "einwand": "Ich habe das schon mal probiert.",
            "antwort": """Das ist interessant. Was war deine Erfahrung?

Der Unterschied könnte sein: [Unterschied]. 

Außerdem: Bei uns kannst du TESTEN, ob es wirklich wirkt. Das ist der große Unterschied.

Möchtest du es nochmal mit Messung probieren?""",
            "key_argument": "Mit Messung testen",
            "tags": ["bereits_probiert", "test", "unterschied"]
        },
        
        "esse_gesund": {
            "einwand": "Ich esse schon gesund.",
            "antwort": """Das ist großartig! Gesunde Ernährung ist wichtig.

Aber hier ist das Paradoxon: Selbst bei gesunder Ernährung erreichen viele Menschen nicht die optimalen Werte. Warum?

Weil die Qualität, Verarbeitung und Bioverfügbarkeit entscheidend sind. [Produkt] ist standardisiert, getestet und nachweisbar wirksam.

[Test] zeigt dir, wo du wirklich stehst - auch wenn du gesund isst.

Möchtest du es testen?""",
            "key_argument": "Qualität und Bioverfügbarkeit",
            "tags": ["ernährung", "qualität", "test"]
        },
        
        "muss_arzt_fragen": {
            "einwand": "Ich muss meinen Arzt fragen.",
            "antwort": """Das ist eine gute Idee! [Produkt] ist ein Nahrungsergänzungsmittel und kann eine gesunde Ernährung ergänzen.

Viele Ärzte empfehlen [Produkttyp], besonders bei niedrigen Werten. [Test] kann dir zeigen, wo du stehst.

Sprich gerne mit deinem Arzt - und wenn du Fragen hast, helfe ich dir gerne weiter.""",
            "key_argument": "Arzt-Konsultation unterstützen",
            "tags": ["arzt", "beratung", "support"]
        },
        
        "kein_interesse": {
            "einwand": "Ich habe kein Interesse.",
            "antwort": """Das ist völlig okay. Kein Problem.

Falls du später Fragen hast oder es doch ausprobieren möchtest, melde dich gerne.

Ich bin für dich da.""",
            "key_argument": "Respektvoll akzeptieren",
            "tags": ["kein_interesse", "respekt", "ausweg"]
        },
        
        "warum_abo": {
            "einwand": "Warum Abo? Ich will nicht gebunden sein.",
            "antwort": """Ich verstehe das. Aber hier ist der Grund: [Produkt] wirkt am besten, wenn du es kontinuierlich nimmst.

Das Abo ist flexibel: Du kannst jederzeit pausieren oder kündigen. Es ist keine Bindung, sondern eine bequeme Lieferung.

Außerdem: Nach [Zeitraum] machst du einen zweiten [Test], um die Verbesserung zu sehen. Dafür brauchst du kontinuierliche Einnahme.

Möchtest du mehr über die Flexibilität erfahren?""",
            "key_argument": "Flexibles Abo, keine Bindung",
            "tags": ["abo", "flexibilität", "kontinuität"]
        },
        
        "zu_gut_um_wahr": {
            "einwand": "Das klingt zu gut, um wahr zu sein.",
            "antwort": """Ich verstehe deine Skepsis. Aber hier ist der Unterschied: Du musst es nicht glauben - du kannst es TESTEN.

[Test] zeigt dir deine aktuellen Werte. Dann nimmst du [Produkt] - und nach [Zeitraum] siehst du die Veränderung.

Keine Versprechen ohne Beweis. Nur Fakten.

Möchtest du es testen?""",
            "key_argument": "Testen statt Versprechen",
            "tags": ["skeptiker", "test", "transparenz"]
        },
        
        "nicht_jetzt": {
            "einwand": "Jetzt ist nicht der richtige Zeitpunkt.",
            "antwort": """Ich verstehe. Wann wäre denn ein guter Zeitpunkt?

Falls du später Fragen hast oder es ausprobieren möchtest, melde dich gerne.

Ich bin für dich da.""",
            "key_argument": "Zeitpunkt respektieren",
            "tags": ["zeitpunkt", "respekt", "follow_up"]
        }
    },
    
    # =========================================================================
    # FOLLOW-UP - 12 allgemeine Follow-ups
    # =========================================================================
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

ich habe dir die Infos geschickt. Hast du Fragen dazu?

Falls du [Aktion] machen möchtest, kann ich dir gerne helfen.""",
            "variables": ["Name", "Aktion"],
            "tags": ["info", "nachfrage", "support"]
        },
        
        "sanfter_stupser": {
            "name": "Sanfter Stupser",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: Hast du schon über [Thema] nachgedacht?

Falls du Fragen hast, helfe ich dir gerne.""",
            "variables": ["Name", "Thema"],
            "tags": ["stupser", "nachfrage", "sanft"]
        },
        
        "wert_bieten": {
            "name": "Wert bieten",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

ich habe [Wert] für dich, das vielleicht interessant ist.

Falls du Fragen hast, melde dich gerne.""",
            "variables": ["Name", "Wert"],
            "tags": ["wert", "angebot", "follow_up"]
        },
        
        "erinnerung": {
            "name": "Erinnerung",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Erinnerung: [Thema].

Falls du Fragen hast, helfe ich dir gerne.""",
            "variables": ["Name", "Thema"],
            "tags": ["erinnerung", "follow_up", "sanft"]
        },
        
        "update": {
            "name": "Update",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

kurzes Update: [Update].

Falls das für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Update"],
            "tags": ["update", "info", "follow_up"]
        },
        
        "frage": {
            "name": "Frage",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: [Frage]?

Falls ja, können wir gerne sprechen.""",
            "variables": ["Name", "Frage"],
            "tags": ["frage", "follow_up", "sanft"]
        },
        
        "check_in": {
            "name": "Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

wie geht es dir? 

Falls du Fragen zu [Thema] hast, helfe ich dir gerne.""",
            "variables": ["Name", "Thema"],
            "tags": ["check_in", "support", "follow_up"]
        },
        
        "social_proof": {
            "name": "Social Proof",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich habe gerade mit [Name2] gesprochen, der [Erfolg] erreicht hat.

Falls das auch für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Name2", "Erfolg"],
            "tags": ["social_proof", "erfolg", "follow_up"]
        },
        
        "angebot": {
            "name": "Angebot",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

ich habe [Angebot] für dich.

Falls das interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Angebot"],
            "tags": ["angebot", "follow_up", "wert"]
        },
        
        "danke": {
            "name": "Danke",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

danke für unser Gespräch!

Falls du noch Fragen hast oder [Aktion] machen möchtest, melde dich gerne.

Ich bin für dich da.""",
            "variables": ["Name", "Aktion"],
            "tags": ["danke", "follow_up", "support"]
        },
        
        "langzeit": {
            "name": "Langzeit Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

lange nicht gesprochen! Wie geht es dir?

Falls du dich noch an unser Gespräch erinnerst: [Thema] ist immer noch eine Möglichkeit.

Falls du Fragen hast, melde dich gerne.""",
            "variables": ["Name", "Thema"],
            "tags": ["langzeit", "check_in", "follow_up"]
        },
        
        "wertschätzung": {
            "name": "Wertschätzung",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

ich schätze [Qualität] an dir sehr.

Deshalb dachte ich, dass [Angebot] vielleicht auch für dich interessant sein könnte.

Falls ja, können wir gerne sprechen.""",
            "variables": ["Name", "Qualität", "Angebot"],
            "tags": ["wertschätzung", "follow_up", "warm"]
        }
    },
    
    # =========================================================================
    # GHOSTBUSTER - 12 allgemeine Ghostbuster
    # =========================================================================
    
    "ghostbuster": {
        "gelesen": {
            "name": "Gelesen, nicht geantwortet",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich sehe, du hast meine Nachricht gelesen, aber nicht geantwortet. 

Kein Problem - vielleicht war es nicht der richtige Zeitpunkt. Falls du später Fragen hast, melde dich gerne.

Ich bin für dich da.""",
            "variables": ["Name"],
            "tags": ["ghost", "gelesen", "sanft"]
        },
        
        "empathisch": {
            "name": "Empathisch",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich hoffe, es geht dir gut. 

Falls du gerade viel um die Ohren hast, verstehe ich das. [Thema] ist wichtig, aber sie muss auch in deinen Alltag passen.

Falls du später Fragen hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name", "Thema"],
            "tags": ["ghost", "empathisch", "sanft"]
        },
        
        "multiple_choice": {
            "name": "Multiple Choice",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: [Frage]?

A) [Option A]
B) [Option B]
C) [Option C]

Falls A oder B: [Folge].

Falls C: [Folge].

Was denkst du?""",
            "variables": ["Name", "Frage", "Option A", "Option B", "Option C", "Folge"],
            "tags": ["ghost", "frage", "interaktiv"]
        },
        
        "ausweg": {
            "name": "Einfacher Ausweg",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

falls du gerade keine Zeit oder kein Interesse hast, ist das völlig okay.

Falls du später Fragen hast, melde dich gerne. Kein Problem.

Bis dann!""",
            "variables": ["Name"],
            "tags": ["ghost", "ausweg", "sanft"]
        },
        
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

komplett andere Frage: [Frage]?

Falls ja: [Folge].

Interessiert dich das?""",
            "variables": ["Name", "Frage", "Folge"],
            "tags": ["ghost", "pattern_interrupt", "frage"]
        },
        
        "prioritäten": {
            "name": "Prioritäten",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich verstehe, wenn [Thema] gerade nicht deine Priorität ist. Jeder hat andere Dinge, die gerade wichtig sind.

Falls du später Fragen hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name", "Thema"],
            "tags": ["ghost", "prioritäten", "sanft"]
        },
        
        "value_bump": {
            "name": "Value Bump",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

kurz: [Wert].

Falls das interessant für dich ist, melde dich gerne.""",
            "variables": ["Name", "Wert"],
            "tags": ["ghost", "value", "wert"]
        },
        
        "archivieren": {
            "name": "Archivieren",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich verstehe, wenn du gerade kein Interesse hast. Kein Problem.

Falls du später Fragen hast, melde dich gerne. Ich bin für dich da.

Bis dann!""",
            "variables": ["Name"],
            "tags": ["ghost", "archivieren", "sanft"]
        },
        
        "breakup": {
            "name": "Breakup",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich merke, dass du gerade kein Interesse hast. Das ist völlig okay.

Falls du später Fragen hast, melde dich gerne. Aber ich werde dich jetzt nicht mehr kontaktieren, es sei denn, du meldest dich.

Alles Gute!""",
            "variables": ["Name"],
            "tags": ["ghost", "breakup", "respektvoll"]
        },
        
        "humor": {
            "name": "Humor",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich hoffe, du bist nicht von der Erde verschwunden 😄

Falls du noch da bist und Fragen hast, melde dich gerne.""",
            "variables": ["Name"],
            "tags": ["ghost", "humor", "locker"]
        },
        
        "direkt": {
            "name": "Direkt",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurz: [Frage]?

Falls ja, können wir sprechen. Falls nein, kein Problem.""",
            "variables": ["Name", "Frage"],
            "tags": ["ghost", "direkt", "klar"]
        },
        
        "final": {
            "name": "Final",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

das war meine letzte Nachricht. Falls du später Fragen hast, melde dich gerne.

Alles Gute!""",
            "variables": ["Name"],
            "tags": ["ghost", "final", "respektvoll"]
        }
    },
    
    # =========================================================================
    # CLOSING - 8 allgemeine Abschlüsse
    # =========================================================================
    
    "closing": {
        "soft": {
            "name": "Soft Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

du hast jetzt die Infos. Der nächste Schritt wäre [Aktion].

Soll ich dir dabei helfen? Oder hast du noch Fragen?""",
            "variables": ["Name", "Aktion"],
            "tags": ["closing", "soft", "sanft"]
        },
        
        "assumptive": {
            "name": "Assumptive Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

super, dass du dabei bist! 

Hier sind die nächsten Schritte: [Schritte].

Falls du Fragen hast, helfe ich dir gerne.""",
            "variables": ["Name", "Schritte"],
            "tags": ["closing", "assumptive", "selbstbewusst"]
        },
        
        "choice": {
            "name": "Choice Close",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

du kannst [Option A] oder [Option B] wählen.

Was bevorzugst du? Und soll ich dir dabei helfen?""",
            "variables": ["Name", "Option A", "Option B"],
            "tags": ["closing", "choice", "optionen"]
        },
        
        "urgency": {
            "name": "Urgency Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

eine Frage: Was kostet es dich, NICHT zu handeln?

[Aktion] ist messbar und evidenzbasiert.

Möchtest du starten?""",
            "variables": ["Name", "Aktion"],
            "tags": ["closing", "urgency", "wert"]
        },
        
        "testimonial": {
            "name": "Testimonial Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

[Name2] hat [Erfolg] erreicht. 

Falls das auch für dich interessant ist, können wir starten.""",
            "variables": ["Name", "Name2", "Erfolg"],
            "tags": ["closing", "testimonial", "social_proof"]
        },
        
        "onboarding": {
            "name": "Onboarding",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

super, dass du dabei bist! 

Hier sind die nächsten Schritte:
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

Falls du Fragen hast, helfe ich dir gerne. Viel Erfolg!""",
            "variables": ["Name", "Schritt 1", "Schritt 2", "Schritt 3"],
            "tags": ["closing", "onboarding", "support"]
        },
        
        "summary": {
            "name": "Summary Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

zusammenfassend: [Zusammenfassung].

Der nächste Schritt wäre [Aktion].

Soll ich dir dabei helfen?""",
            "variables": ["Name", "Zusammenfassung", "Aktion"],
            "tags": ["closing", "summary", "zusammenfassung"]
        },
        
        "direct": {
            "name": "Direct Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

sind wir uns einig? Dann können wir starten.""",
            "variables": ["Name"],
            "tags": ["closing", "direct", "direkt"]
        }
    }
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_base_scripts_by_category(category: str) -> Dict[str, Any]:
    """Holt alle Scripts einer Kategorie."""
    return BASE_SCRIPTS.get(category, {})

def get_base_script(category: str, script_id: str) -> Dict[str, Any]:
    """Holt ein einzelnes Script."""
    category_scripts = BASE_SCRIPTS.get(category, {})
    return category_scripts.get(script_id, {})

def get_all_base_categories() -> List[str]:
    """Gibt alle verfügbaren Kategorien zurück."""
    return list(BASE_SCRIPTS.keys())

__all__ = [
    "BASE_SCRIPTS",
    "get_base_scripts_by_category",
    "get_base_script",
    "get_all_base_categories",
]

