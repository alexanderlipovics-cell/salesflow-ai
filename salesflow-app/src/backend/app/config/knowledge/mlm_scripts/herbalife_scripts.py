"""
╔════════════════════════════════════════════════════════════════════════════╗
║  HERBALIFE MLM-SPEZIFISCHE SCRIPT LIBRARY                                   ║
║  Vollständige Script-Sammlung für Herbalife Partner                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Kategorien:
- pitches: Eröffnungs-Scripts für verschiedene Situationen
- wert_fragen: Value-basierte Fragen zur Bedarfsanalyse
- einwand_handling: Antworten auf häufige Einwände
- follow_up: Nachfass-Scripts für verschiedene Phasen
- ghostbuster: Scripts für inaktive/ghostete Kontakte
- closing: Abschluss-Scripts
"""

from typing import Dict, List, Any

# =============================================================================
# HERBALIFE SCRIPTS
# =============================================================================

HERBALIFE_SCRIPTS = {
    
    # =========================================================================
    # PITCHES - 10 Eröffnungs-Scripts
    # =========================================================================
    
    "pitches": {
        "gesund_abnehmen": {
            "name": "Gesund abnehmen",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "cold_warm",
            "text": """Hey [Name] 👋

Kurze Frage: Hast du schon mal versucht abzunehmen? 

Die meisten Menschen probieren es mit Diäten - aber die meisten scheitern, weil sie nicht nachhaltig sind.

Herbalife hat ein wissenschaftlich entwickeltes Programm, das auf ausgewogener Ernährung basiert. Keine Crash-Diät, sondern ein gesunder Lebensstil.

Interessiert dich das? Dann kann ich dir mehr erzählen.""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen - nur 'unterstützt gesunde Ernährung'",
            "tags": ["abnehmen", "ernährung", "gesundheit"]
        },
        
        "energie_steigern": {
            "name": "Energie steigern",
            "channel": ["whatsapp", "instagram"],
            "type": "cold_warm",
            "text": """Hallo [Name],

wie geht es dir mit deiner Energie? 

Viele Menschen fühlen sich müde und antriebslos - oft liegt es an der Ernährung. Herbalife Produkte können helfen, deine Energie zu steigern durch ausgewogene Nährstoffe.

Falls das interessant für dich ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Unterstützt normale Körperfunktionen",
            "tags": ["energie", "nährstoffe", "wohlbefinden"]
        },
        
        "sportler": {
            "name": "Für Sportler",
            "channel": ["instagram", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

ich sehe, du treibst Sport. Super!

Falls du deine Performance optimieren möchtest: Herbalife hat spezielle Produkte für Sportler, die deine Ernährung ergänzen können.

Protein-Shakes, Recovery-Drinks, und mehr - alles wissenschaftlich entwickelt.

Interessiert dich das?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Leistungsversprechen",
            "tags": ["sportler", "protein", "performance"]
        },
        
        "gesunde_ernährung": {
            "name": "Gesunde Ernährung",
            "channel": ["whatsapp", "instagram"],
            "type": "cold_warm",
            "text": """Hey [Name],

wie wichtig ist dir gesunde Ernährung? 

Viele Menschen wollen sich gesund ernähren, aber im Alltag fehlt die Zeit. Herbalife Produkte können eine gesunde Ernährung ergänzen - schnell, einfach, wissenschaftlich entwickelt.

Falls das interessant für dich ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Ergänzt gesunde Ernährung",
            "tags": ["ernährung", "gesund", "alltag"]
        },
        
        "wohlbefinden": {
            "name": "Wohlbefinden",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hallo [Name],

was tust du für dein Wohlbefinden? 

Herbalife hat ein ganzheitliches Konzept: Gesunde Ernährung, ausgewogene Nährstoffe, und ein aktiver Lebensstil.

Falls das für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Wohlbefinden, keine Heilversprechen",
            "tags": ["wohlbefinden", "ganzheitlich", "lebensstil"]
        },
        
        "gemeinschaft": {
            "name": "Gemeinschaft",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

Herbalife ist mehr als nur Produkte - es ist eine Gemeinschaft von Menschen, die sich für Gesundheit und Wohlbefinden einsetzen.

Falls du Teil dieser Gemeinschaft werden möchtest, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Gemeinschaft, keine Einkommensversprechen",
            "tags": ["gemeinschaft", "team", "netzwerk"]
        },
        
        "wissenschaftlich": {
            "name": "Wissenschaftlich entwickelt",
            "channel": ["whatsapp", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name],

Herbalife Produkte sind wissenschaftlich entwickelt und werden von Ernährungswissenschaftlern unterstützt.

Falls du mehr über die Wissenschaft hinter den Produkten wissen möchtest, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Wissenschaftlich, keine Heilversprechen",
            "tags": ["wissenschaft", "evidenz", "qualität"]
        },
        
        "persönlich": {
            "name": "Persönlicher Ansatz",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

jeder Mensch ist anders. Deshalb bietet Herbalife einen persönlichen Ansatz - maßgeschneidert auf deine Bedürfnisse.

Falls du mehr wissen möchtest, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Persönlich, keine Heilversprechen",
            "tags": ["persönlich", "individuell", "bedürfnisse"]
        },
        
        "erfolgsgeschichte": {
            "name": "Erfolgsgeschichte",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich habe [Name2] geholfen, [Erfolg] zu erreichen. 

Falls das auch für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Name2", "Erfolg"],
            "compliance_notes": "Social Proof, keine Heilversprechen",
            "tags": ["erfolg", "social_proof", "testimonial"]
        },
        
        "kostenlos_beratung": {
            "name": "Kostenlose Beratung",
            "channel": ["whatsapp"],
            "type": "cold_warm",
            "text": """Hey [Name],

ich biete eine kostenlose Beratung zu gesunder Ernährung und Wohlbefinden an.

Falls das interessant für dich ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Beratung, keine Heilversprechen",
            "tags": ["beratung", "kostenlos", "wert"]
        }
    },
    
    # =========================================================================
    # WERT-FRAGEN - 5 Pain-Fragen
    # =========================================================================
    
    "wert_fragen": {
        "lebensqualität": {
            "name": "Lebensqualität",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name], eine Frage: Was ist dir deine Lebensqualität wert?

Ich meine: Energie, Wohlbefinden, Gesundheit. 

Viele Menschen investieren in verschiedene Dinge, aber übersehen die Grundlage: Gesunde Ernährung.

Ist das etwas, worauf du Wert legst?""",
            "variables": ["Name"],
            "compliance_notes": "Wert-Frage, keine Heilversprechen",
            "tags": ["lebensqualität", "wert", "gesundheit"]
        },
        
        "energie": {
            "name": "Energie",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

wie wichtig ist dir Energie? 

Viele Menschen fühlen sich müde - oft liegt es an der Ernährung. Gesunde, ausgewogene Ernährung kann helfen, deine Energie zu steigern.

Ist das ein Thema für dich?""",
            "variables": ["Name"],
            "compliance_notes": "Energie, keine Heilversprechen",
            "tags": ["energie", "müdigkeit", "ernährung"]
        },
        
        "selbstvertrauen": {
            "name": "Selbstvertrauen",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """[Name],

wie wichtig ist dir Selbstvertrauen? 

Viele Menschen fühlen sich nicht wohl in ihrer Haut - oft liegt es an der Ernährung und dem Lebensstil.

Falls das ein Thema für dich ist, können wir gerne sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Selbstvertrauen, keine Heilversprechen",
            "tags": ["selbstvertrauen", "wohlbefinden", "lebensstil"]
        },
        
        "zukunft": {
            "name": "Zukunft",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

wie investierst du in deine Zukunft? 

Gesunde Ernährung heute wirkt sich auf dein Wohlbefinden in 10, 20 Jahren aus.

Ist das etwas, das für dich wichtig ist?""",
            "variables": ["Name"],
            "compliance_notes": "Zukunft, keine Heilversprechen",
            "tags": ["zukunft", "investition", "gesundheit"]
        },
        
        "zeit": {
            "name": "Zeit",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """[Name],

wie viel Zeit investierst du in deine Gesundheit? 

Viele Menschen haben keine Zeit für gesunde Ernährung - aber Herbalife Produkte können helfen, gesunde Ernährung einfach in den Alltag zu integrieren.

Ist das interessant für dich?""",
            "variables": ["Name"],
            "compliance_notes": "Zeit, keine Heilversprechen",
            "tags": ["zeit", "alltag", "ernährung"]
        }
    },
    
    # =========================================================================
    # EINWAND-HANDLING - 10 Einwände
    # =========================================================================
    
    "einwand_handling": {
        "zu_teuer": {
            "einwand": "Das ist mir zu teuer.",
            "antwort": """Ich verstehe. Aber vergleiche es nicht mit Standard-Produkten. Der Unterschied liegt in der Qualität und Wissenschaft.

Herbalife Produkte sind wissenschaftlich entwickelt und werden von Ernährungswissenschaftlern unterstützt.

Außerdem: Gesunde Ernährung ist eine Investition in deine Zukunft.

Möchtest du mehr über den Wert erfahren?""",
            "key_argument": "Qualität und Wissenschaft",
            "tags": ["preis", "qualität", "wert"]
        },
        
        "keine_zeit": {
            "einwand": "Ich habe keine Zeit.",
            "antwort": """Ich verstehe das. Aber genau deshalb sind Herbalife Produkte perfekt: Sie sind schnell und einfach zu verwenden.

Du musst nichts Kompliziertes machen - einfach in deinen Alltag integrieren.

Falls du 5 Minuten hast, kann ich dir zeigen, wie einfach es ist.""",
            "key_argument": "Schnell und einfach",
            "tags": ["zeit", "einfach", "alltag"]
        },
        
        "schon_versucht": {
            "einwand": "Ich habe schon mal versucht abzunehmen / gesünder zu leben.",
            "antwort": """Das ist interessant. Was war deine Erfahrung?

Der Unterschied könnte sein: Herbalife ist kein Crash-Diät-Programm, sondern ein nachhaltiger Lebensstil mit wissenschaftlicher Unterstützung.

Möchtest du es nochmal mit einem anderen Ansatz probieren?""",
            "key_argument": "Nachhaltig statt Crash-Diät",
            "tags": ["bereits_probiert", "nachhaltig", "lebensstil"]
        },
        
        "ist_das_mlm": {
            "einwand": "Ist das MLM / Pyramide?",
            "antwort": """Herbalife ist ein Network-Marketing-Unternehmen, ja. Aber es ist kein Schneeballsystem.

Der Unterschied: Bei Herbalife geht es primär um das PRODUKT und die Gemeinschaft. Die meisten Menschen nutzen Herbalife als Kunden.

Das Geschäftsmodell ist transparent: Du kannst Partner werden und andere Menschen über gesunde Ernährung informieren. Aber das ist optional.

Viele Menschen nutzen Herbalife einfach als Kunden, weil sie die Qualität schätzen.

Möchtest du mehr über das Produkt erfahren?""",
            "key_argument": "Produkt steht im Vordergrund",
            "tags": ["mlm", "transparenz", "produkt"]
        },
        
        "glaube_nicht": {
            "einwand": "Ich glaube nicht an Nahrungsergänzungsmittel.",
            "antwort": """Ich verstehe deine Skepsis. Viele Menschen sind es.

Aber Herbalife ist mehr als nur Nahrungsergänzung - es ist ein ganzheitliches Konzept für gesunde Ernährung und einen aktiven Lebensstil.

Die Produkte sind wissenschaftlich entwickelt und werden von Ernährungswissenschaftlern unterstützt.

Möchtest du mehr über die Wissenschaft erfahren?""",
            "key_argument": "Wissenschaftlich entwickelt",
            "tags": ["skeptiker", "wissenschaft", "evidenz"]
        },
        
        "esse_gesund": {
            "einwand": "Ich esse schon gesund.",
            "antwort": """Das ist großartig! Gesunde Ernährung ist wichtig.

Aber hier ist die Sache: Selbst bei gesunder Ernährung können manche Nährstoffe fehlen. Herbalife Produkte können eine gesunde Ernährung ergänzen.

Außerdem: Im Alltag ist es manchmal schwierig, immer perfekt zu essen. Herbalife kann helfen, die Lücken zu schließen.

Möchtest du mehr erfahren?""",
            "key_argument": "Ergänzt gesunde Ernährung",
            "tags": ["ernährung", "ergänzung", "nährstoffe"]
        },
        
        "muss_nachdenken": {
            "einwand": "Ich muss nachdenken / mit Partner sprechen.",
            "antwort": """Das ist völlig verständlich. Nimm dir gerne die Zeit.

Falls du Fragen hast oder mit deinem Partner sprechen möchtest, helfe ich dir gerne.

Soll ich dir die wichtigsten Infos nochmal zusammenfassen?""",
            "key_argument": "Zeit geben, Support anbieten",
            "tags": ["nachdenken", "partner", "support"]
        },
        
        "geschmack": {
            "einwand": "Ich mag den Geschmack nicht.",
            "antwort": """Das verstehe ich. Aber Herbalife hat viele verschiedene Geschmacksrichtungen.

Es gibt sicher etwas, das dir schmeckt. Außerdem kannst du die Produkte auch in Smoothies, Joghurt, etc. mischen.

Möchtest du verschiedene Geschmacksrichtungen probieren?""",
            "key_argument": "Viele Geschmacksrichtungen",
            "tags": ["geschmack", "vielfalt", "anwendung"]
        },
        
        "warum_abo": {
            "einwand": "Warum Abo? Ich will nicht gebunden sein.",
            "antwort": """Ich verstehe das. Aber hier ist der Grund: Gesunde Ernährung wirkt am besten, wenn du sie kontinuierlich praktizierst.

Das Abo ist flexibel: Du kannst jederzeit pausieren oder kündigen. Es ist keine Bindung, sondern eine bequeme Lieferung.

Möchtest du mehr über die Flexibilität erfahren?""",
            "key_argument": "Flexibles Abo, keine Bindung",
            "tags": ["abo", "flexibilität", "kontinuität"]
        },
        
        "kein_interesse": {
            "einwand": "Ich habe kein Interesse.",
            "antwort": """Das ist völlig okay. Kein Problem.

Falls du später Fragen hast oder es doch ausprobieren möchtest, melde dich gerne.

Ich bin für dich da.""",
            "key_argument": "Respektvoll akzeptieren",
            "tags": ["kein_interesse", "respekt", "ausweg"]
        }
    },
    
    # =========================================================================
    # FOLLOW-UP - 10 Follow-ups
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
        
        "erfolgsgeschichte": {
            "name": "Erfolgsgeschichte",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich habe gerade mit [Name2] gesprochen, der [Erfolg] erreicht hat.

Falls das auch für dich interessant ist, können wir gerne sprechen.""",
            "variables": ["Name", "Name2", "Erfolg"],
            "tags": ["erfolg", "social_proof", "testimonial"]
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
        
        "wert": {
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
        
        "bestandskunde": {
            "name": "Bestandskunde Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

wie geht es dir mit den Produkten? 

Falls du Fragen hast oder neue Produkte ausprobieren möchtest, helfe ich dir gerne.""",
            "variables": ["Name"],
            "tags": ["bestandskunde", "support", "produkte"]
        },
        
        "gemeinschaft": {
            "name": "Gemeinschaft",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

Herbalife ist mehr als nur Produkte - es ist eine Gemeinschaft.

Falls du Teil dieser Gemeinschaft werden möchtest, können wir gerne sprechen.""",
            "variables": ["Name"],
            "tags": ["gemeinschaft", "team", "netzwerk"]
        }
    },
    
    # =========================================================================
    # GHOSTBUSTER - 10 Ghostbuster
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

Falls du gerade viel um die Ohren hast, verstehe ich das. Gesundheit ist wichtig, aber sie muss auch in deinen Alltag passen.

Falls du später Fragen hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name"],
            "tags": ["ghost", "empathisch", "sanft"]
        },
        
        "frage": {
            "name": "Frage",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: [Frage]?

Falls ja, können wir sprechen. Falls nein, kein Problem.""",
            "variables": ["Name", "Frage"],
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

komplett andere Frage: Was machst du für deine Gesundheit?

Falls du noch nichts spezielles machst: Herbalife könnte interessant für dich sein.

Interessiert dich das?""",
            "variables": ["Name"],
            "tags": ["ghost", "pattern_interrupt", "frage"]
        },
        
        "prioritäten": {
            "name": "Prioritäten",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich verstehe, wenn Gesundheit gerade nicht deine Priorität ist. Jeder hat andere Dinge, die gerade wichtig sind.

Falls du später Fragen hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name"],
            "tags": ["ghost", "prioritäten", "sanft"]
        },
        
        "value_bump": {
            "name": "Value Bump",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

kurz: Gesunde Ernährung ist eine Investition in deine Zukunft.

Falls das interessant für dich ist, melde dich gerne.""",
            "variables": ["Name"],
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
        
        "langzeit": {
            "name": "Langzeit Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

lange nicht gesprochen! Wie geht es dir?

Falls du dich noch an unser Gespräch erinnerst: Herbalife ist immer noch eine Möglichkeit für gesunde Ernährung.

Falls du Fragen hast, melde dich gerne.""",
            "variables": ["Name"],
            "tags": ["ghost", "langzeit", "checkin"]
        }
    },
    
    # =========================================================================
    # CLOSING - 5 Abschlüsse
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
        
        "gemeinschaft": {
            "name": "Gemeinschaft Close",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

Herbalife ist mehr als nur Produkte - es ist eine Gemeinschaft von Menschen, die sich für Gesundheit einsetzen.

Möchtest du Teil dieser Gemeinschaft werden?""",
            "variables": ["Name"],
            "tags": ["closing", "gemeinschaft", "team"]
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
        }
    }
}

# =============================================================================
# COMPLIANCE-HINWEISE FÜR HERBALIFE
# =============================================================================

HERBALIFE_COMPLIANCE = {
    "verboten": [
        "heilt",
        "kuriert",
        "behandelt Krankheiten",
        "verhindert Krebs",
        "garantiert Gewichtsverlust",
        "ersetzt Medikamente",
        "heilt Diabetes",
        "verhindert Herzkrankheiten"
    ],
    
    "erlaubt": [
        "unterstützt gesunde Ernährung",
        "ergänzt eine ausgewogene Ernährung",
        "unterstützt das Wohlbefinden",
        "kann helfen",
        "unterstützt",
        "trägt bei"
    ],
    
    "health_claims": [
        "Unterstützt gesunde Ernährung",
        "Ergänzt eine ausgewogene Ernährung",
        "Kann Teil eines gesunden Lebensstils sein"
    ],
    
    "produkt_spezifisch": {
        "protein_shakes": [
            "Enthält Protein",
            "Ergänzt eine ausgewogene Ernährung",
            "Wissenschaftlich entwickelt"
        ],
        "nahrungsergänzung": [
            "Ergänzt eine gesunde Ernährung",
            "Enthält wichtige Nährstoffe",
            "Wissenschaftlich entwickelt"
        ]
    },
    
    "mlm_spezifisch": [
        "Keine Einkommensversprechen",
        "Keine Garantien für Erfolg",
        "Transparenz über Geschäftsmodell",
        "Produkt steht im Vordergrund"
    ]
}

__all__ = [
    "HERBALIFE_SCRIPTS",
    "HERBALIFE_COMPLIANCE",
]

