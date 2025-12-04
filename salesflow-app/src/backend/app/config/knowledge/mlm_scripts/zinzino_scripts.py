"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ZINZINO MLM-SPEZIFISCHE SCRIPT LIBRARY                                      ║
║  Vollständige Script-Sammlung für Zinzino Partner                           ║
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
# ZINZINO SCRIPTS
# =============================================================================

ZINZINO_SCRIPTS = {
    
    # =========================================================================
    # PITCHES - Eröffnungs-Scripts
    # =========================================================================
    
    "pitches": {
        "testen_statt_raten": {
            "name": "Der 'Testen statt Raten' Pitch",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name], eine kurze Frage zum Thema Gesundheit: Nimmst du Nahrungsergänzungsmittel? Und wenn ja: Woher weißt du, ob sie wirklich wirken?

Die meisten Menschen raten einfach... aber es gibt einen Weg, es zu TESTEN.

Zinzino hat einen BalanceTest entwickelt, der dir zeigt, wie dein Omega-3-Index wirklich aussieht. Keine Vermutungen, sondern Fakten.

Interessiert dich das? Dann kann ich dir mehr erzählen.""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen - nur 'unterstützt normale Körperfunktionen'",
            "tags": ["omega3", "test", "gesundheit"]
        },
        
        "omega3_paradoxon": {
            "name": "Das Omega-3 Paradoxon",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "type": "cold_warm",
            "text": """Hey [Name] 👋

Kurze Frage: Nimmst du Omega-3? 

Die meisten Menschen denken, sie tun genug für ihre Gesundheit, wenn sie Fisch essen oder ein Omega-3-Präparat nehmen. Aber hier ist das Paradoxon:

90% der Menschen haben trotzdem einen zu niedrigen Omega-3-Index. Warum? Weil sie nicht wissen, ob ihr Produkt wirklich wirkt.

Zinzino hat die Lösung: BalanceTest + BalanceOil mit nachweisbarer Wirkung.

Soll ich dir zeigen, wie das funktioniert?""",
            "variables": ["Name"],
            "compliance_notes": "Statistik ist allgemein bekannt, keine Heilversprechen",
            "tags": ["omega3", "paradoxon", "statistik"]
        },
        
        "stille_entzuendung": {
            "name": "Stille Entzündung",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hallo [Name],

weißt du, was eine 'stille Entzündung' ist? Das sind Entzündungen im Körper, die du nicht spürst, aber die langfristig Probleme verursachen können.

Ein niedriger Omega-3-Index kann dazu beitragen. Der BalanceTest zeigt dir, wo du stehst - und BalanceOil kann helfen, deine Balance zu verbessern.

Interessiert dich das Thema? Dann lass uns kurz sprechen.""",
            "variables": ["Name"],
            "compliance_notes": "Nur informativ, keine Heilversprechen",
            "tags": ["entzündung", "omega3", "gesundheit"]
        },
        
        "darmgesundheit": {
            "name": "Darmgesundheit & Polyphenole",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

Darmgesundheit ist ein riesiges Thema. Aber wusstest du, dass BalanceOil nicht nur Omega-3 enthält, sondern auch Polyphenole?

Polyphenole sind sekundäre Pflanzenstoffe, die deine Darmgesundheit unterstützen können. Das ist einer der großen Unterschiede zu Standard-Fischöl.

Möchtest du mehr darüber erfahren?""",
            "variables": ["Name"],
            "compliance_notes": "Unterstützt normale Körperfunktionen - kein Heilversprechen",
            "tags": ["darm", "polyphenole", "gesundheit"]
        },
        
        "investition_vs_wirkung": {
            "name": "Investition vs. Wirkung",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hallo [Name],

eine Frage: Wie viel gibst du monatlich für deine Gesundheit aus? Fitnessstudio, Nahrungsergänzung, gesunde Ernährung...

Und: Woher weißt du, ob deine Investition wirklich wirkt?

Bei Zinzino kannst du es MESSEN. BalanceTest zeigt dir deinen Omega-3-Index - und nach 120 Tagen siehst du die Verbesserung.

Das ist der Unterschied zwischen raten und wissen.

Interessiert dich das?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Einkommensversprechen, nur Produktvorteile",
            "tags": ["investition", "wirkung", "test"]
        },
        
        "fisch_frage": {
            "name": "Die Fisch-Frage",
            "channel": ["whatsapp", "instagram"],
            "type": "cold_warm",
            "text": """Hey [Name],

schnelle Frage: Isst du regelmäßig Fisch? 

Falls ja: Super! Aber selbst bei 2-3x Fisch pro Woche erreichen die meisten Menschen nicht den optimalen Omega-3-Index.

Warum? Weil die Qualität und die Verarbeitung entscheidend sind. BalanceOil ist standardisiert, getestet und nachweisbar wirksam.

Soll ich dir zeigen, wie der BalanceTest funktioniert?""",
            "variables": ["Name"],
            "compliance_notes": "Allgemeine Information, keine Heilversprechen",
            "tags": ["fisch", "omega3", "ernährung"]
        },
        
        "biohacker_sportler": {
            "name": "Biohacker & Sportler",
            "channel": ["instagram", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

ich sehe, du interessierst dich für Performance-Optimierung. 

Falls du noch nicht getestet hast: Der Omega-3-Index ist ein wichtiger Biomarker. Viele Biohacker und Sportler nutzen BalanceTest, um ihre Werte zu tracken.

BalanceOil mit Polyphenolen ist speziell für Menschen entwickelt, die ihre Gesundheit messen und optimieren wollen.

Interessiert dich das?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Leistungsversprechen für Sportler",
            "tags": ["biohacker", "sportler", "performance"]
        },
        
        "skeptiker": {
            "name": "Für Skeptiker",
            "channel": ["whatsapp", "linkedin"],
            "type": "cold_warm",
            "text": """Hallo [Name],

ich verstehe, wenn du skeptisch bist. Viele Menschen sind es bei Nahrungsergänzung.

Deshalb macht Zinzino es anders: Erst TESTEN (BalanceTest), dann sehen, ob es wirkt. Keine Versprechen ohne Beweis.

Nach 120 Tagen machst du einen zweiten Test - und siehst die Veränderung in deinen Werten.

Das ist Transparenz statt Marketing.

Möchtest du mehr wissen?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen, nur Transparenz",
            "tags": ["skeptiker", "transparenz", "test"]
        },
        
        "kurze_frage": {
            "name": "Kurze Frage",
            "channel": ["whatsapp"],
            "type": "cold",
            "text": """Hey [Name],

kurze Frage: Nimmst du Omega-3? Und wenn ja: Woher weißt du, ob es wirkt?

Falls du es testen möchtest, kann ich dir zeigen wie.""",
            "variables": ["Name"],
            "compliance_notes": "Sehr kurz, keine Claims",
            "tags": ["kurz", "frage", "omega3"]
        },
        
        "health_protocol": {
            "name": "Health Protocol",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hallo [Name],

falls du ein Health Protocol verfolgst oder entwickeln möchtest: Der Omega-3-Index ist ein wichtiger Biomarker, den viele übersehen.

BalanceTest zeigt dir deinen aktuellen Stand - und BalanceOil kann helfen, deine Werte zu optimieren. Nach 120 Tagen siehst du die Veränderung.

Das ist evidenzbasierte Gesundheit statt Raten.

Interessiert dich das?""",
            "variables": ["Name"],
            "compliance_notes": "Evidenzbasiert, keine Heilversprechen",
            "tags": ["protocol", "biomarker", "gesundheit"]
        }
    },
    
    # =========================================================================
    # WERT-FRAGEN - Value-basierte Bedarfsanalyse
    # =========================================================================
    
    "wert_fragen": {
        "lebensqualitaet": {
            "name": "Lebensqualität",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name], eine Frage: Was ist dir deine Lebensqualität wert?

Ich meine: Energie, Wohlbefinden, langfristige Gesundheit. 

Viele Menschen investieren in Fitness, Ernährung, Wellness - aber übersehen den Omega-3-Index. Dabei ist er ein wichtiger Baustein.

BalanceTest zeigt dir, wo du stehst. Und BalanceOil kann helfen, deine Balance zu verbessern.

Ist das etwas, worauf du Wert legst?""",
            "variables": ["Name"],
            "compliance_notes": "Wert-Frage, keine Heilversprechen",
            "tags": ["lebensqualität", "wert", "gesundheit"]
        },
        
        "zukunftsinvestition": {
            "name": "Zukunftsinvestition",
            "channel": ["whatsapp", "linkedin"],
            "type": "warm",
            "text": """Hey [Name],

wie investierst du in deine Zukunft? 

Ich meine nicht finanziell, sondern gesundheitlich. Was du heute tust, wirkt sich auf dein Wohlbefinden in 10, 20 Jahren aus.

Der Omega-3-Index ist ein Biomarker, den du heute messen und optimieren kannst. BalanceTest + BalanceOil ist eine Investition in deine langfristige Gesundheit.

Ist das etwas, das für dich wichtig ist?""",
            "variables": ["Name"],
            "compliance_notes": "Langfristige Gesundheit, keine Heilversprechen",
            "tags": ["zukunft", "investition", "gesundheit"]
        },
        
        "wert_der_gewissheit": {
            "name": "Wert der Gewissheit",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

was ist dir mehr wert: Raten oder Wissen?

Die meisten Menschen nehmen Nahrungsergänzung und hoffen, dass sie wirkt. Bei Zinzino kannst du es MESSEN.

BalanceTest zeigt dir deinen Omega-3-Index. Nach 120 Tagen siehst du die Veränderung. Das ist Gewissheit statt Hoffnung.

Ist das etwas, das für dich wertvoll ist?""",
            "variables": ["Name"],
            "compliance_notes": "Transparenz, keine Heilversprechen",
            "tags": ["gewissheit", "test", "transparenz"]
        },
        
        "mentale_klarheit": {
            "name": "Mentale Klarheit",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

wie wichtig ist dir mentale Klarheit? Konzentration, Fokus, geistige Leistungsfähigkeit?

Omega-3, besonders DHA, trägt zur Erhaltung einer normalen Gehirnfunktion bei. BalanceOil enthält hochwertiges DHA.

Aber: Woher weißt du, ob dein aktueller Omega-3-Index ausreicht? BalanceTest zeigt es dir.

Ist das ein Thema für dich?""",
            "variables": ["Name"],
            "compliance_notes": "Health Claim: DHA trägt zur normalen Gehirnfunktion bei (erlaubt)",
            "tags": ["gehirn", "klarheit", "dha"]
        },
        
        "frustration": {
            "name": "Frustration mit Standard-Produkten",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """[Name],

ich verstehe, wenn du frustriert bist. Viele Menschen haben schon verschiedene Omega-3-Produkte probiert - ohne zu wissen, ob sie wirklich wirken.

Das ist der Unterschied bei Zinzino: Du TESTEST zuerst. BalanceTest zeigt dir deinen aktuellen Stand. Dann nimmst du BalanceOil - und nach 120 Tagen siehst du die Verbesserung.

Keine Vermutungen. Nur Fakten.

Möchtest du es ausprobieren?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen, nur Transparenz",
            "tags": ["frustration", "test", "transparenz"]
        }
    },
    
    # =========================================================================
    # EINWAND-HANDLING - Antworten auf häufige Einwände
    # =========================================================================
    
    "einwand_handling": {
        "zu_teuer_polyphenole": {
            "einwand": "Das ist mir zu teuer / Omega-3 aus der Drogerie ist günstiger.",
            "antwort": """Ich verstehe. Aber vergleiche es nicht mit Standard-Fischöl. Der Unterschied liegt in den Polyphenolen.

Polyphenole schützen das Omega-3 vor Oxidation - das bedeutet, es bleibt länger wirksam in deinem Körper. Standard-Fischöl oxidiert oft schon vor der Einnahme.

Außerdem: Bei Zinzino TESTEST du, ob es wirkt. BalanceTest vorher und nachher. Das kannst du bei Drogerie-Produkten nicht.

Es ist nicht teurer - es ist anders. Und messbar.

Möchtest du mehr über den Unterschied erfahren?""",
            "key_argument": "Polyphenole schützen vor Oxidation",
            "compliance_notes": "Keine Heilversprechen, nur Produktvorteile",
            "tags": ["preis", "polyphenole", "qualität"]
        },
        
        "nehme_schon_omega3": {
            "einwand": "Ich nehme schon Omega-3.",
            "antwort": """Das ist super! Aber hier ist die Frage: Woher weißt du, ob es wirklich wirkt?

Die meisten Menschen nehmen Omega-3 und hoffen, dass es hilft. Bei Zinzino kannst du es MESSEN.

BalanceTest zeigt dir deinen aktuellen Omega-3-Index. Wenn du schon Omega-3 nimmst, aber dein Index trotzdem niedrig ist, dann wirkt dein aktuelles Produkt vielleicht nicht optimal.

Nach 120 Tagen mit BalanceOil siehst du die Veränderung in deinen Werten.

Möchtest du deinen aktuellen Stand testen?""",
            "key_argument": "Testen statt Raten",
            "compliance_notes": "Keine Heilversprechen",
            "tags": ["bereits_kunde", "test", "wirkung"]
        },
        
        "esse_gesund": {
            "einwand": "Ich esse schon gesund / viel Fisch.",
            "antwort": """Das ist großartig! Gesunde Ernährung ist wichtig.

Aber hier ist das Paradoxon: Selbst bei 2-3x Fisch pro Woche erreichen 90% der Menschen nicht den optimalen Omega-3-Index. Warum?

Weil die Qualität, Verarbeitung und Bioverfügbarkeit entscheidend sind. BalanceOil ist standardisiert, getestet und nachweisbar wirksam.

BalanceTest zeigt dir, wo du wirklich stehst - auch wenn du gesund isst.

Möchtest du es testen?""",
            "key_argument": "90% haben trotzdem niedrigen Index",
            "compliance_notes": "Statistik, keine Heilversprechen",
            "tags": ["ernährung", "fisch", "test"]
        },
        
        "ist_das_mlm": {
            "einwand": "Ist das MLM / Pyramide?",
            "antwort": """Zinzino ist ein Network-Marketing-Unternehmen, ja. Aber es ist kein Schneeballsystem.

Der Unterschied: Bei Zinzino geht es primär um das PRODUKT. BalanceTest und BalanceOil sind evidenzbasiert und wissenschaftlich belegt. Die meisten Kunden sind reine Endkunden.

Das Geschäftsmodell ist transparent: Du kannst Partner werden und andere Menschen über das Produkt informieren. Aber das ist optional.

Viele Menschen nutzen Zinzino einfach als Kunden, weil sie die Qualität und Transparenz schätzen.

Möchtest du mehr über das Produkt erfahren?""",
            "key_argument": "Produkt steht im Vordergrund, nicht Rekrutierung",
            "compliance_notes": "Transparent über MLM-Struktur",
            "tags": ["mlm", "transparenz", "produkt"]
        },
        
        "glaube_nicht_an_supplements": {
            "einwand": "Ich glaube nicht an Nahrungsergänzungsmittel.",
            "antwort": """Ich verstehe deine Skepsis. Viele Menschen sind es.

Deshalb macht Zinzino es anders: Du musst nicht GLAUBEN - du kannst es MESSEN.

BalanceTest zeigt dir deinen Omega-3-Index. Das ist ein wissenschaftlich anerkannter Biomarker. Keine Vermutungen, sondern Fakten.

Wenn dein Index niedrig ist, kannst du BalanceOil nehmen - und nach 120 Tagen siehst du die Veränderung in deinen Werten.

Das ist Evidenz statt Glaube.

Möchtest du es testen?""",
            "key_argument": "Testen statt Glauben",
            "compliance_notes": "Evidenzbasiert, keine Heilversprechen",
            "tags": ["skeptiker", "test", "evidenz"]
        },
        
        "muss_arzt_fragen": {
            "einwand": "Ich muss meinen Arzt fragen.",
            "antwort": """Das ist eine gute Idee! BalanceOil ist ein Nahrungsergänzungsmittel und kann eine gesunde Ernährung ergänzen.

EPA und DHA tragen zur normalen Herzfunktion bei. DHA trägt zur Erhaltung einer normalen Gehirnfunktion bei. Das sind wissenschaftlich belegte Health Claims.

Viele Ärzte empfehlen Omega-3, besonders bei niedrigem Index. BalanceTest kann dir zeigen, wo du stehst.

Sprich gerne mit deinem Arzt - und wenn du Fragen hast, helfe ich dir gerne weiter.""",
            "key_argument": "Erlaubte Health Claims",
            "compliance_notes": "Nur erlaubte Health Claims verwenden",
            "tags": ["arzt", "health_claims", "beratung"]
        },
        
        "angst_vor_test": {
            "einwand": "Ich habe Angst vor dem Test / vor Nadeln.",
            "antwort": """Ich verstehe das. Aber der BalanceTest ist super einfach: Es ist nur ein kleiner Tropfen Blut aus der Fingerkuppe. Keine große Nadel, kein Arztbesuch.

Du machst es zu Hause, sendest es ein - und bekommst deine Ergebnisse per E-Mail.

Viele Menschen, die normalerweise Angst vor Tests haben, finden den BalanceTest überraschend einfach.

Möchtest du mehr darüber erfahren, wie der Test funktioniert?""",
            "key_argument": "Einfacher Fingerkuppen-Test",
            "compliance_notes": "Keine medizinischen Versprechen",
            "tags": ["test", "angst", "einfach"]
        },
        
        "warum_abo": {
            "einwand": "Warum Abo? Ich will nicht gebunden sein.",
            "antwort": """Ich verstehe das. Aber hier ist der Grund: Omega-3 wirkt am besten, wenn du es kontinuierlich nimmst. Dein Körper kann es nicht speichern.

Das Abo ist flexibel: Du kannst jederzeit pausieren oder kündigen. Es ist keine Bindung, sondern eine bequeme Lieferung.

Außerdem: Nach 120 Tagen machst du einen zweiten BalanceTest, um die Verbesserung zu sehen. Dafür brauchst du kontinuierliche Einnahme.

Möchtest du mehr über die Flexibilität erfahren?""",
            "key_argument": "Flexibles Abo, keine Bindung",
            "compliance_notes": "Keine Heilversprechen",
            "tags": ["abo", "flexibilität", "kontinuität"]
        },
        
        "geschmack": {
            "einwand": "Ich mag den Geschmack nicht / Fischgeschmack.",
            "antwort": """Das verstehe ich. BalanceOil hat einen leichten Zitronengeschmack, der den Fischgeschmack überdeckt.

Viele Menschen, die normalerweise kein Fischöl mögen, finden BalanceOil überraschend angenehm.

Du nimmst es einfach mit einem Löffel - oder mischst es in Smoothies, Joghurt, etc.

Möchtest du es probieren?""",
            "key_argument": "Zitronengeschmack, vielseitig verwendbar",
            "compliance_notes": "Keine Heilversprechen",
            "tags": ["geschmack", "anwendung", "produkt"]
        },
        
        "datensicherheit": {
            "einwand": "Was passiert mit meinen Daten / Testergebnissen?",
            "antwort": """Deine Daten sind sicher. Zinzino ist ein seriöses Unternehmen und hält sich an die DSGVO.

Deine Testergebnisse sind privat. Du entscheidest, ob du sie teilen möchtest.

Der BalanceTest wird von einem unabhängigen Labor ausgewertet. Deine persönlichen Daten werden vertraulich behandelt.

Wenn du Fragen zur Datensicherheit hast, kann ich dir gerne mehr Informationen geben.""",
            "key_argument": "DSGVO-konform, vertraulich",
            "compliance_notes": "Datenschutz-konform",
            "tags": ["datenschutz", "dsgvo", "sicherheit"]
        }
    },
    
    # =========================================================================
    # FOLLOW-UP - Nachfass-Scripts
    # =========================================================================
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

ich habe dir die Infos geschickt. Hast du Fragen dazu?

Falls du den BalanceTest machen möchtest, kann ich dir gerne helfen.""",
            "variables": ["Name"],
            "compliance_notes": "Kurz, keine Claims",
            "tags": ["info", "nachfrage", "test"]
        },
        
        "test_gekauft": {
            "name": "Nach Test-Kauf",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

super, dass du den BalanceTest bestellt hast! 

Falls du Fragen zur Durchführung hast, helfe ich dir gerne. Der Test ist einfach: Nur ein Tropfen Blut aus der Fingerkuppe.

Wenn deine Ergebnisse da sind, können wir sie gerne zusammen anschauen.

Viel Erfolg!""",
            "variables": ["Name"],
            "compliance_notes": "Support, keine Heilversprechen",
            "tags": ["test", "support", "ergebnisse"]
        },
        
        "test_gemacht": {
            "name": "Nach Test-Durchführung",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

hast du den BalanceTest schon eingeschickt? 

Die Ergebnisse kommen normalerweise innerhalb von 2-3 Wochen. Wenn sie da sind, können wir sie gerne zusammen anschauen und besprechen, was deine nächsten Schritte sein könnten.

Falls du Fragen hast, melde dich gerne!""",
            "variables": ["Name"],
            "compliance_notes": "Support, keine Heilversprechen",
            "tags": ["test", "ergebnisse", "support"]
        },
        
        "ergebnisse_da": {
            "name": "Nach Ergebnissen",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hallo [Name],

deine BalanceTest-Ergebnisse sind da! 

Wie sehen sie aus? Falls dein Omega-3-Index niedrig ist, können wir gerne besprechen, wie BalanceOil helfen kann, deine Werte zu verbessern.

Nach 120 Tagen machst du einen zweiten Test - und siehst die Veränderung.

Möchtest du, dass wir deine Ergebnisse zusammen anschauen?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen, nur Produktvorteile",
            "tags": ["ergebnisse", "test", "balanceoil"]
        },
        
        "nach_besprechung": {
            "name": "Nach Besprechung",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

danke für unser Gespräch! 

Falls du noch Fragen hast oder den BalanceTest bestellen möchtest, melde dich gerne.

Ich bin für dich da.""",
            "variables": ["Name"],
            "compliance_notes": "Kurz, keine Claims",
            "tags": ["besprechung", "nachfrage", "support"]
        },
        
        "studie_senden": {
            "name": "Studie senden",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

ich sende dir gerne Studien zum Omega-3-Index und zur Wirkung von BalanceOil.

Falls du Fragen dazu hast oder den BalanceTest machen möchtest, helfe ich dir gerne.""",
            "variables": ["Name"],
            "compliance_notes": "Wissenschaftliche Studien, keine Heilversprechen",
            "tags": ["studie", "evidenz", "test"]
        },
        
        "sanfter_stupser": {
            "name": "Sanfter Stupser",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: Hast du schon über den BalanceTest nachgedacht?

Falls du Fragen hast, helfe ich dir gerne.""",
            "variables": ["Name"],
            "compliance_notes": "Sehr sanft, keine Claims",
            "tags": ["stupser", "nachfrage", "test"]
        },
        
        "social_proof": {
            "name": "Social Proof",
            "channel": ["whatsapp", "instagram"],
            "type": "warm",
            "text": """Hey [Name],

ich habe gerade mit [Name2] gesprochen, der den BalanceTest gemacht hat. Seine Ergebnisse waren interessant - und nach 120 Tagen mit BalanceOil hat sich sein Omega-3-Index deutlich verbessert.

Falls du auch testen möchtest, kann ich dir gerne helfen.""",
            "variables": ["Name", "Name2"],
            "compliance_notes": "Social Proof, keine Heilversprechen",
            "tags": ["social_proof", "erfolg", "test"]
        },
        
        "bestandskunde": {
            "name": "Bestandskunde Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

wie geht es dir mit BalanceOil? 

Falls du schon 120 Tage nimmst, wäre es Zeit für den zweiten BalanceTest, um deine Verbesserung zu sehen.

Möchtest du, dass ich dir dabei helfe?""",
            "variables": ["Name"],
            "compliance_notes": "Support, keine Heilversprechen",
            "tags": ["bestandskunde", "test", "support"]
        },
        
        "vor_zweitem_test": {
            "name": "Vor zweitem Test",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

du nimmst BalanceOil jetzt schon eine Weile. Zeit für den zweiten BalanceTest, um deine Verbesserung zu sehen!

Soll ich dir einen neuen Test bestellen?""",
            "variables": ["Name"],
            "compliance_notes": "Keine Heilversprechen, nur Produktvorteile",
            "tags": ["test", "zweiter_test", "verbesserung"]
        }
    },
    
    # =========================================================================
    # GHOSTBUSTER - Scripts für inaktive/ghostete Kontakte
    # =========================================================================
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich sehe, du hast meine Nachricht gelesen, aber nicht geantwortet. 

Kein Problem - vielleicht war es nicht der richtige Zeitpunkt. Falls du später Fragen hast oder den BalanceTest machen möchtest, melde dich gerne.

Ich bin für dich da.""",
            "variables": ["Name"],
            "compliance_notes": "Sanft, keine Claims",
            "tags": ["ghost", "gelesen", "sanft"]
        },
        
        "empathisch": {
            "name": "Empathisch",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich hoffe, es geht dir gut. 

Falls du gerade viel um die Ohren hast, verstehe ich das. Gesundheit ist wichtig, aber sie muss auch in deinen Alltag passen.

Falls du später Fragen zum BalanceTest oder BalanceOil hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name"],
            "compliance_notes": "Sehr empathisch, keine Claims",
            "tags": ["ghost", "empathisch", "sanft"]
        },
        
        "multiple_choice_fisch": {
            "name": "Multiple Choice - Fisch",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

kurze Frage: Isst du regelmäßig Fisch?

A) Ja, 2-3x pro Woche
B) Ja, aber selten
C) Nein, gar nicht

Falls A oder B: Interessant wäre, ob dein Omega-3-Index trotzdem optimal ist. BalanceTest zeigt es dir.

Falls C: Dann könnte BalanceOil interessant für dich sein.

Was denkst du?""",
            "variables": ["Name"],
            "compliance_notes": "Interaktiv, keine Heilversprechen",
            "tags": ["ghost", "frage", "interaktiv"]
        },
        
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

falls du gerade keine Zeit oder kein Interesse hast, ist das völlig okay.

Falls du später Fragen hast oder den BalanceTest machen möchtest, melde dich gerne. Kein Problem.

Bis dann!""",
            "variables": ["Name"],
            "compliance_notes": "Ausweg anbieten, keine Claims",
            "tags": ["ghost", "ausweg", "sanft"]
        },
        
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

komplett andere Frage: Was machst du für deine Gesundheit, außer Ernährung und Sport?

Falls du noch nichts spezielles machst: Der Omega-3-Index ist ein Biomarker, den viele übersehen. BalanceTest zeigt dir, wo du stehst.

Interessiert dich das?""",
            "variables": ["Name"],
            "compliance_notes": "Pattern Interrupt, keine Heilversprechen",
            "tags": ["ghost", "pattern_interrupt", "frage"]
        },
        
        "prioritaeten": {
            "name": "Prioritäten",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich verstehe, wenn Gesundheit gerade nicht deine Priorität ist. Jeder hat andere Dinge, die gerade wichtig sind.

Falls du später Fragen zum BalanceTest oder BalanceOil hast, melde dich gerne. Kein Druck.

Bis dann!""",
            "variables": ["Name"],
            "compliance_notes": "Respektvoll, keine Claims",
            "tags": ["ghost", "prioritäten", "sanft"]
        },
        
        "value_bump": {
            "name": "Value Bump",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

kurz: Wusstest du, dass 90% der Menschen einen zu niedrigen Omega-3-Index haben - auch wenn sie gesund essen?

BalanceTest zeigt dir, wo du wirklich stehst. Keine Vermutungen.

Falls das interessant für dich ist, melde dich gerne.""",
            "variables": ["Name"],
            "compliance_notes": "Statistik, keine Heilversprechen",
            "tags": ["ghost", "value", "statistik"]
        },
        
        "archivieren": {
            "name": "Archivieren",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

ich verstehe, wenn du gerade kein Interesse hast. Kein Problem.

Falls du später Fragen zum BalanceTest oder BalanceOil hast, melde dich gerne. Ich bin für dich da.

Bis dann!""",
            "variables": ["Name"],
            "compliance_notes": "Archivieren, keine Claims",
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
            "compliance_notes": "Breakup, respektvoll",
            "tags": ["ghost", "breakup", "respektvoll"]
        },
        
        "langzeit_checkin": {
            "name": "Langzeit Check-in",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hey [Name],

lange nicht gesprochen! Wie geht es dir?

Falls du dich noch an unser Gespräch erinnerst: Der BalanceTest ist immer noch eine Möglichkeit, deinen Omega-3-Index zu testen.

Falls du Fragen hast, melde dich gerne.""",
            "variables": ["Name"],
            "compliance_notes": "Langzeit, keine Claims",
            "tags": ["ghost", "langzeit", "checkin"]
        }
    },
    
    # =========================================================================
    # CLOSING - Abschluss-Scripts
    # =========================================================================
    
    "closing": {
        "test_basiert": {
            "name": "Test-basiertes Closing",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

du hast jetzt die Infos. Der nächste Schritt wäre der BalanceTest, um zu sehen, wo dein Omega-3-Index wirklich steht.

Soll ich dir einen Test bestellen? Oder hast du noch Fragen?""",
            "variables": ["Name"],
            "compliance_notes": "Soft Close, keine Heilversprechen",
            "tags": ["closing", "test", "soft"]
        },
        
        "120_tage_commitment": {
            "name": "120-Tage Commitment",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """Hey [Name],

der BalanceTest zeigt dir deinen aktuellen Stand. Dann nimmst du 120 Tage BalanceOil - und machst einen zweiten Test, um die Verbesserung zu sehen.

Das ist ein Commitment zu deiner Gesundheit, aber es ist messbar. Keine Vermutungen.

Möchtest du starten?""",
            "variables": ["Name"],
            "compliance_notes": "Commitment, keine Heilversprechen",
            "tags": ["closing", "commitment", "120_tage"]
        },
        
        "kosten_des_wartens": {
            "name": "Kosten des Wartens",
            "channel": ["whatsapp", "phone"],
            "type": "warm",
            "text": """[Name],

eine Frage: Was kostet es dich, NICHT zu wissen, ob dein Omega-3-Index optimal ist?

Gesundheit ist eine Investition. BalanceTest + BalanceOil ist messbar und evidenzbasiert.

Möchtest du es ausprobieren?""",
            "variables": ["Name"],
            "compliance_notes": "Value Close, keine Heilversprechen",
            "tags": ["closing", "kosten", "wartens"]
        },
        
        "choice_close_geschmack": {
            "name": "Choice Close - Geschmack",
            "channel": ["whatsapp"],
            "type": "warm",
            "text": """Hey [Name],

du kannst BalanceOil pur nehmen oder in Smoothies, Joghurt, etc. mischen.

Was bevorzugst du? Und soll ich dir einen BalanceTest bestellen?""",
            "variables": ["Name"],
            "compliance_notes": "Choice Close, keine Heilversprechen",
            "tags": ["closing", "choice", "geschmack"]
        },
        
        "onboarding": {
            "name": "Onboarding nach Kauf",
            "channel": ["whatsapp", "email"],
            "type": "warm",
            "text": """Hallo [Name],

super, dass du dabei bist! 

Hier sind die nächsten Schritte:
1. BalanceTest durchführen (falls noch nicht gemacht)
2. BalanceOil täglich einnehmen
3. Nach 120 Tagen zweiten Test machen

Falls du Fragen hast, helfe ich dir gerne. Viel Erfolg!""",
            "variables": ["Name"],
            "compliance_notes": "Onboarding, keine Heilversprechen",
            "tags": ["closing", "onboarding", "support"]
        }
    }
}

# =============================================================================
# COMPLIANCE-HINWEISE FÜR ZINZINO
# =============================================================================

ZINZINO_COMPLIANCE = {
    "verboten": [
        "heilt",
        "kuriert",
        "behandelt Krankheiten",
        "verhindert Krebs",
        "senkt Blutdruck garantiert",
        "wirkt gegen Entzündungen",
        "heilt Depressionen",
        "verhindert Alzheimer",
        "garantiert Gewichtsverlust",
        "ersetzt Medikamente"
    ],
    
    "erlaubt": [
        "unterstützt normale Körperfunktionen",
        "trägt zur normalen Herzfunktion bei",
        "unterstützt das Wohlbefinden",
        "fördert die Balance",
        "kann helfen",
        "unterstützt",
        "trägt bei"
    ],
    
    "health_claims": [
        "EPA und DHA tragen zur normalen Herzfunktion bei",
        "DHA trägt zur Erhaltung einer normalen Gehirnfunktion bei",
        "DHA trägt zur Erhaltung normaler Sehkraft bei",
        "Die positive Wirkung stellt sich bei einer täglichen Aufnahme von 250 mg EPA und DHA ein",
        "Die positive Wirkung stellt sich bei einer täglichen Aufnahme von 250 mg DHA ein"
    ],
    
    "produkt_spezifisch": {
        "balanceoil": [
            "Enthält Omega-3 (EPA/DHA)",
            "Enthält Polyphenole",
            "Standardisiert und getestet",
            "Nachweisbar wirksam"
        ],
        "balancetest": [
            "Misst Omega-3-Index",
            "Wissenschaftlich anerkannter Biomarker",
            "Einfacher Fingerkuppen-Test",
            "Ergebnisse in 2-3 Wochen"
        ]
    },
    
    "mlm_spezifisch": [
        "Keine Einkommensversprechen",
        "Keine Garantien für Erfolg",
        "Transparenz über Geschäftsmodell",
        "Produkt steht im Vordergrund"
    ]
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_scripts_for_category(category: str) -> Dict[str, Any]:
    """Holt alle Scripts einer Kategorie."""
    return ZINZINO_SCRIPTS.get(category, {})

def get_script(category: str, script_id: str) -> Dict[str, Any]:
    """Holt ein einzelnes Script."""
    category_scripts = ZINZINO_SCRIPTS.get(category, {})
    return category_scripts.get(script_id, {})

def get_all_categories() -> List[str]:
    """Gibt alle verfügbaren Kategorien zurück."""
    return list(ZINZINO_SCRIPTS.keys())

def check_compliance(text: str) -> Dict[str, Any]:
    """
    Prüft einen Text auf Compliance-Verstöße.
    
    Returns:
        {
            "is_compliant": bool,
            "violations": List[str],
            "suggestions": List[str]
        }
    """
    violations = []
    suggestions = []
    text_lower = text.lower()
    
    # Prüfe auf verbotene Wörter
    for verboten in ZINZINO_COMPLIANCE["verboten"]:
        if verboten.lower() in text_lower:
            violations.append(f"Verbotenes Wort gefunden: '{verboten}'")
            suggestions.append(f"Ersetze durch: '{ZINZINO_COMPLIANCE['erlaubt'][0]}'")
    
    return {
        "is_compliant": len(violations) == 0,
        "violations": violations,
        "suggestions": suggestions
    }

# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ZINZINO_SCRIPTS",
    "ZINZINO_COMPLIANCE",
    "get_scripts_for_category",
    "get_script",
    "get_all_categories",
    "check_compliance",
]

