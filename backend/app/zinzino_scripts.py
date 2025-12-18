"""
ZINZINO MLM SCRIPTS
===================
50 praxiserprobte Skripte für Zinzino-Vertrieb
"""

ZINZINO_SCRIPTS = {
    "pitches": {
        "testen_statt_raten": {
            "name": "Der 'Testen statt Raten' Pitch",
            "text": "Hallo [Name], eine kurze Frage zum Thema Gesundheit: Weißt du eigentlich, wie es um deine Omega-Balance steht? Die meisten Menschen raten nur. Mit dem BalanceTest kannst du es in 5 Minuten zu Hause messen. Interesse?",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "situation": "cold_outreach"
        },
        "omega3_paradoxon": {
            "name": "Das Omega-3 Paradoxon",
            "text": "Hey [Name], wusstest du, dass 97% der Menschen ein ungesundes Omega-6/3 Verhältnis haben – selbst die, die Fischöl nehmen? Das liegt daran, dass Standard-Produkte kaum wirken. Ich zeige dir, warum das so ist und was wirklich funktioniert.",
            "channel": ["whatsapp", "instagram"],
            "situation": "health_interested"
        },
        "stille_entzuendung": {
            "name": "Die 'Stille Entzündung' Ansprache",
            "text": "Hallo [Name], hast du schon mal von 'Silent Inflammation' gehört? Das ist einer der Hauptgründe für viele Zivilisationskrankheiten. Es gibt einen einfachen Test, der zeigt, ob du betroffen bist. Wäre das interessant für dich?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "health_conscious"
        },
        "darmgesundheit": {
            "name": "Der Darm-Hirn Pitch",
            "text": "Hey [Name], man sagt ja 'Der Darm ist das zweite Gehirn'. Wusstest du, dass deine Darmgesundheit direkt mit deiner Omega-Balance zusammenhängt? Wir haben ein Konzept, das beides optimiert.",
            "channel": ["whatsapp", "instagram"],
            "situation": "wellness_focused"
        },
        "investition_vs_wirkung": {
            "name": "Der ROI-Pitch",
            "text": "Hallo [Name], viele geben Geld für Supplements aus, ohne zu wissen, ob sie wirken. Was wäre, wenn du VOR und NACH messen könntest, ob dein Investment sich lohnt? Genau das bieten wir.",
            "channel": ["linkedin", "whatsapp"],
            "situation": "analytical_type"
        },
        "fisch_frage": {
            "name": "Die Fisch-Frage",
            "text": "Hey [Name], kurze Frage: Isst du regelmäßig fetten Fisch? Die meisten denken, das reicht für Omega-3. In Wahrheit müsstest du täglich 1kg Lachs essen, um optimal versorgt zu sein. Es gibt einen einfacheren Weg.",
            "channel": ["whatsapp", "instagram"],
            "situation": "nutrition_aware"
        },
        "biohacker_sportler": {
            "name": "Der Biohacker/Sportler Pitch",
            "text": "Moin [Name], als jemand der auf Performance achtet: Optimierst du schon deine Zellmembranen? Die Omega-Balance ist einer der wichtigsten Biomarker für Regeneration und mentale Klarheit. Ich teste gerade meine Werte – willst du mitmachen?",
            "channel": ["instagram", "whatsapp"],
            "situation": "fitness_focused"
        },
        "skeptiker": {
            "name": "Die Skeptiker-Ansprache",
            "text": "Hallo [Name], ich verstehe, wenn du skeptisch bist bei Nahrungsergänzung – ich war es auch. Deshalb fand ich es so überzeugend, dass man hier vorher/nachher MESSEN kann. Keine Versprechungen, nur Zahlen. 15 Minuten für einen Realitätscheck?",
            "channel": ["linkedin", "whatsapp"],
            "situation": "skeptical_lead"
        },
        "kurze_frage": {
            "name": "Die 'Kurze Frage'",
            "text": "Hey [Name], kurze Frage: Wenn du wüsstest, dass ein einfacher Bluttest dir zeigen kann, wie gesund du WIRKLICH bist – würdest du ihn machen?",
            "channel": ["whatsapp", "instagram"],
            "situation": "quick_opener"
        },
        "health_protocol": {
            "name": "Das Health Protocol",
            "text": "Hallo [Name], ich arbeite gerade an meinem persönlichen 'Health Protocol'. Ein wichtiger Baustein ist die Omega-Balance. Hast du für dich schon ein System, wie du deine Gesundheit trackst?",
            "channel": ["instagram", "linkedin"],
            "situation": "self_optimization"
        }
    },
    
    "wert_fragen": {
        "lebensqualitaet": {
            "name": "Die Lebensqualität-Frage",
            "text": "Auf einer Skala von 1-10, wie würdest du deine aktuelle Energie und Vitalität bewerten? Was wäre es dir wert, diese Zahl um 2-3 Punkte zu verbessern?",
            "situation": "qualifying"
        },
        "zukunftsinvestition": {
            "name": "Die Zukunftsinvestition-Frage",
            "text": "Wenn du in 10 Jahren zurückschaust – was wäre es dir heute wert gewesen, präventiv in deine Zellgesundheit zu investieren?",
            "situation": "long_term_thinking"
        },
        "gewissheit": {
            "name": "Die Gewissheits-Frage",
            "text": "Was ist der Unterschied zwischen 'ich glaube, ich bin gesund' und 'ich WEISS, ich bin gesund'? Der Test gibt dir diese Gewissheit.",
            "situation": "uncertainty"
        },
        "mentale_klarheit": {
            "name": "Die Klarheits-Frage",
            "text": "Wie oft hast du Brain Fog oder fühlst dich mental nicht auf der Höhe? Was wäre es dir wert, jeden Tag mental klar und fokussiert zu sein?",
            "situation": "mental_performance"
        },
        "frustration": {
            "name": "Die Frustrations-Frage",
            "text": "Wie frustrierend ist es, Geld für Supplements auszugeben und nicht zu wissen, ob sie überhaupt wirken?",
            "situation": "supplement_user"
        }
    },
    
    "einwand_handling": {
        "zu_teuer": {
            "name": "Einwand: Zu teuer",
            "einwand": "Das ist mir zu teuer",
            "antwort": "Verstehe ich. Lass uns kurz rechnen: Das sind etwa 5€ pro Tag. Was gibst du sonst für Coffee-to-go oder Snacks aus? Hier investierst du in messbare Gesundheit. Außerdem: Wenn der Test zeigt, dass es nicht wirkt, sparst du dir alle zukünftigen Supplement-Käufe. Das ist eigentlich eine Ersparnis.",
            "situation": "price_objection"
        },
        "nehme_schon_omega3": {
            "name": "Einwand: Nehme schon Omega-3",
            "einwand": "Ich nehme schon Omega-3",
            "antwort": "Super, dass du schon auf Omega-3 achtest! Die spannende Frage ist: Wirkt es auch? 95% meiner Kunden, die vorher Standard-Fischöl genommen haben, hatten trotzdem schlechte Werte. Der Test zeigt dir, ob dein aktuelles Produkt funktioniert – oder ob du Geld verschwendest.",
            "situation": "existing_supplement"
        },
        "esse_gesund": {
            "name": "Einwand: Ich esse gesund",
            "einwand": "Ich ernähre mich schon gesund",
            "antwort": "Das ist toll! Aber selbst bei optimaler Ernährung ist die Omega-Balance heute schwer zu erreichen. Unsere Lebensmittel enthalten 10x weniger Omega-3 als vor 50 Jahren. Der Test zeigt dir, wo du wirklich stehst.",
            "situation": "healthy_eater"
        },
        "ist_das_mlm": {
            "name": "Einwand: Ist das MLM?",
            "einwand": "Ist das so ein Pyramidensystem?",
            "antwort": "Zinzino nutzt Direktvertrieb, ja. Das ermöglicht uns, in Forschung statt in TV-Werbung zu investieren. Wir haben über 40 wissenschaftliche Studien. Letztlich geht es aber um dich: Interessiert dich das Produkt und der Test? Wenn es wirkt, ist die Vertriebsform doch egal, oder?",
            "situation": "mlm_concern"
        },
        "glaube_nicht_an_supplements": {
            "name": "Einwand: Glaube nicht an Supplements",
            "einwand": "Ich glaube nicht an Nahrungsergänzung",
            "antwort": "Das verstehe ich – der Markt ist voll mit wirkungslosen Produkten. Genau deshalb gibt es den Test: Er zeigt objektiv, ob etwas wirkt. Kein Glaube nötig, nur Zahlen. Das ist der Unterschied zu allem anderen.",
            "situation": "supplement_skeptic"
        },
        "muss_arzt_fragen": {
            "name": "Einwand: Muss Arzt fragen",
            "einwand": "Ich muss erst meinen Arzt fragen",
            "antwort": "Sehr vernünftig! Ich kann dir die wissenschaftlichen Studien und das Produktdatenblatt schicken. Viele Ärzte empfehlen mittlerweile aktiv, die Omega-Balance zu testen. Dein Arzt wird sich freuen, dass du proaktiv bist.",
            "situation": "doctor_reference"
        },
        "angst_vor_test": {
            "name": "Einwand: Angst vor Bluttest",
            "einwand": "Ich hab Angst vor dem Bluttest",
            "antwort": "Verständlich! Aber es ist nur ein winziger Pieks in den Finger – wie beim Blutzucker messen. Dauert 2 Sekunden, kein Arztbesuch nötig, du machst es zu Hause. Die meisten sagen danach: 'Das war alles?'",
            "situation": "test_anxiety"
        },
        "warum_abo": {
            "name": "Einwand: Warum Abo?",
            "einwand": "Warum muss das ein Abo sein?",
            "antwort": "Du kannst auch einzeln bestellen! Das Abo hat aber Vorteile: Du vergisst nie nachzubestellen, bekommst einen besseren Preis, und nach 120 Tagen den Nachtest GRATIS, um deine Fortschritte zu sehen. Du kannst jederzeit pausieren oder kündigen.",
            "situation": "subscription_concern"
        },
        "geschmack": {
            "name": "Einwand: Schmeckt nicht",
            "einwand": "Fischöl schmeckt doch eklig",
            "antwort": "Stimmt, normales Fischöl ist furchtbar! Das BalanceOil ist anders – wir haben Zitrone, Orange oder Vanille. Die meisten nehmen es pur vom Löffel und mögen den Geschmack. Probier es aus, du wirst überrascht sein!",
            "situation": "taste_concern"
        },
        "datensicherheit": {
            "name": "Einwand: Datensicherheit",
            "einwand": "Wo landen meine Testergebnisse?",
            "antwort": "Gute Frage! Deine Daten gehören DIR. Sie werden in einem zertifizierten Labor in Norwegen analysiert und nur du bekommst die Ergebnisse. Nichts wird verkauft oder weitergegeben. DSGVO-konform, natürlich.",
            "situation": "privacy_concern"
        }
    },
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand (24h)",
            "text": "Hey [Name], konntest du dir die Infos zum BalanceTest anschauen? Was denkst du – wäre es spannend zu wissen, wo du stehst?",
            "timing": "24h_after_info"
        },
        "test_gekauft": {
            "name": "Test gekauft - Willkommen",
            "text": "Hey [Name], super dass du dabei bist! 🎉 Dein Test sollte in 2-3 Tagen ankommen. Kleiner Tipp: Mach ihn morgens nüchtern für beste Ergebnisse. Ich melde mich, wenn die Ergebnisse da sind!",
            "timing": "after_purchase"
        },
        "test_gemacht": {
            "name": "Nach Testdurchführung",
            "text": "Hi [Name], hast du den Test schon eingeschickt? Die Ergebnisse dauern ca. 10-20 Tage. Ich bin gespannt auf deine Werte!",
            "timing": "after_test_done"
        },
        "ergebnisse_da": {
            "name": "Ergebnisse sind da",
            "text": "Hey [Name], deine Ergebnisse sind da! 📊 Hast du sie dir schon angeschaut? Sollen wir kurz telefonieren und ich erkläre dir, was sie bedeuten?",
            "timing": "results_available"
        },
        "nach_besprechung": {
            "name": "Nach Ergebnis-Besprechung",
            "text": "Hi [Name], danke für das Gespräch! Wie wir besprochen haben, startest du jetzt mit dem BalanceOil. In 120 Tagen machen wir den Nachtest und schauen, wie sich deine Werte verbessert haben. Ich bin optimistisch! 💪",
            "timing": "post_consultation"
        },
        "studie_senden": {
            "name": "Studie/Value Add",
            "text": "Hey [Name], ich habe hier eine interessante Studie zur Omega-Balance und [Thema das Person interessiert]. Dachte, das könnte dich interessieren: [Link]",
            "timing": "value_add"
        },
        "sanfter_stupser": {
            "name": "Sanfter Reminder",
            "text": "Hi [Name], nur ein kurzer Check-in. Hast du noch Fragen zum Test? Kein Druck – melde dich einfach, wenn du soweit bist.",
            "timing": "soft_reminder"
        },
        "social_proof": {
            "name": "Social Proof Follow-Up",
            "text": "Hey [Name], [Bekannte Person/Kunde] hat gerade seine Nachtest-Ergebnisse bekommen – Verhältnis von 12:1 auf 3:1 verbessert in 4 Monaten! Ich dachte, das motiviert dich vielleicht auch.",
            "timing": "social_proof"
        },
        "bestandskunde": {
            "name": "Bestandskunden Check-in",
            "text": "Hi [Name], du nimmst das BalanceOil jetzt seit [X Wochen]. Wie fühlst du dich? Merkst du schon Unterschiede bei Energie oder Schlaf?",
            "timing": "customer_checkin"
        },
        "vor_nachtest": {
            "name": "Vor dem Nachtest",
            "text": "Hey [Name], dein 120-Tage-Nachtest steht bald an! Das wird spannend – dann sehen wir, wie sich deine Werte verbessert haben. Soll ich dir den Test zuschicken?",
            "timing": "before_retest"
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "text": "Hey [Name], ich sehe, du hattest noch keine Zeit zu antworten. Eine Zahl reicht: 1 = Interesse, aber später. 2 = Kein Interesse. 3 = Schick mehr Infos. 👍",
            "situation": "read_no_reply"
        },
        "empathisch": {
            "name": "Empathischer Check-in",
            "text": "Hi [Name], ich weiß, das Thema Gesundheit ist wichtig, aber der Alltag kommt dazwischen. Ist gerade einfach nicht der richtige Zeitpunkt? Kein Problem – sag kurz Bescheid.",
            "situation": "empathetic"
        },
        "multiple_choice_fisch": {
            "name": "Multiple Choice mit Fisch",
            "text": "Hey [Name], da ich nichts höre, kurze Umfrage: A) Ich esse genug Fisch, brauche das nicht. B) Interessant, aber gerade keine Zeit. C) Hatte deine Nachricht übersehen! 🐟",
            "situation": "fun_multiple_choice"
        },
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg",
            "text": "Hi [Name], ich will dich nicht nerven! Wenn das Thema für dich nicht relevant ist, sag einfach kurz 'Nein danke' – dann weiß ich Bescheid. Alles gut!",
            "situation": "easy_out"
        },
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "text": "Hey [Name], mein System sagt mir, ich soll nachfassen. Aber ehrlich: Ist das Thema Omega-Balance gerade überhaupt auf deinem Radar? Falls nicht, kein Stress!",
            "situation": "pattern_break"
        },
        "prioritaeten": {
            "name": "Prioritäten-Check",
            "text": "Hi [Name], ich verstehe – Gesundheit ist wichtig, aber manchmal gibt es dringendere Dinge. Soll ich mich in 1-2 Monaten nochmal melden?",
            "situation": "priorities"
        },
        "value_bump": {
            "name": "Value Bump",
            "text": "Hey [Name], kurze Info: Wir haben gerade eine Aktion – Test + erstes BalanceOil zum Sonderpreis. Falls das Timing jetzt besser passt?",
            "situation": "offer_based"
        },
        "archivieren": {
            "name": "Erlaubnis zum Archivieren",
            "text": "Hi [Name], ich räume meine Kontakte auf. Soll ich dich aus der 'Gesundheits-Interessenten' Liste nehmen, oder besteht grundsätzlich noch Interesse?",
            "situation": "cleanup"
        },
        "break_up": {
            "name": "Break-Up Message",
            "text": "Hey [Name], ich gehe davon aus, dass das Thema für dich erledigt ist. Falls du irgendwann doch mal deine Omega-Balance checken willst – du weißt, wo du mich findest! Alles Gute 🙌",
            "situation": "final_message"
        },
        "langzeit_checkin": {
            "name": "Langzeit Check-in (3-6 Monate)",
            "text": "Hi [Name], wir hatten vor einiger Zeit über das Thema Omega-Balance gesprochen. Hat sich bei dir gesundheitlich etwas verändert oder ist das Thema wieder relevant geworden?",
            "situation": "long_term"
        }
    },
    
    "closing": {
        "test_basiert": {
            "name": "Test-basierter Abschluss",
            "text": "Der einfachste nächste Schritt: Mach den Test. Dann weißt du, wo du stehst. Falls deine Werte gut sind, super – dann brauchst du nichts. Falls nicht, haben wir die Lösung. Win-win, oder?",
            "situation": "logical_close"
        },
        "120_tage_commitment": {
            "name": "120-Tage Commitment",
            "text": "Ich schlage vor: 120-Tage Challenge. Test jetzt, BalanceOil für 4 Monate, Nachtest. Wenn sich deine Werte nicht verbessern, fress ich einen Besen. Deal?",
            "situation": "commitment_close"
        },
        "kosten_des_wartens": {
            "name": "Kosten des Wartens",
            "text": "Jede Woche mit schlechter Omega-Balance ist eine Woche, in der deine Zellen nicht optimal arbeiten. In 120 Tagen könntest du schon transformierte Werte haben. Warum warten?",
            "situation": "urgency_close"
        },
        "choice_close_geschmack": {
            "name": "Choice Close (Geschmack)",
            "text": "Alles klar, dann lass uns starten! Welche Geschmacksrichtung magst du lieber: Zitrone, Orange oder Vanille?",
            "situation": "choice_close"
        },
        "onboarding": {
            "name": "Onboarding Close",
            "text": "Super Entscheidung! 🎉 Ich richte dir alles ein. Sobald der Test da ist, mach ihn morgens nüchtern. Ich melde mich, wenn deine Ergebnisse da sind, und wir besprechen alles. Willkommen in der Zinzino-Familie!",
            "situation": "welcome_close"
        }
    }
}

ZINZINO_COMPLIANCE = {
    "verboten": [
        "heilt",
        "kuriert", 
        "behandelt Krankheiten",
        "verhindert Krebs",
        "bekämpft Diabetes",
        "Anti-Aging Wunder",
        "garantierte Ergebnisse"
    ],
    "erlaubt": [
        "unterstützt normale Körperfunktionen",
        "trägt zur normalen Herzfunktion bei",
        "unterstützt das Wohlbefinden",
        "fördert die Balance",
        "wissenschaftlich getestet"
    ],
    "health_claims": [
        "EPA und DHA tragen zur normalen Herzfunktion bei",
        "DHA trägt zur Erhaltung einer normalen Gehirnfunktion bei",
        "DHA trägt zur Erhaltung normaler Sehkraft bei",
        "Omega-3-Fettsäuren tragen zur normalen Gehirnfunktion bei"
    ]
}

def get_script(category: str, script_id: str) -> dict:
    """Hole ein spezifisches Script."""
    if category in ZINZINO_SCRIPTS and script_id in ZINZINO_SCRIPTS[category]:
        return ZINZINO_SCRIPTS[category][script_id]
    return None

def get_all_scripts() -> dict:
    """Hole alle Zinzino Scripts."""
    return ZINZINO_SCRIPTS

def get_compliance_rules() -> dict:
    """Hole Compliance-Regeln."""
    return ZINZINO_COMPLIANCE