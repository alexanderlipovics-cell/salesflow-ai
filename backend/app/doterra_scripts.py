"""
DOTERRA MLM SCRIPTS
===================
50 praxiserprobte Skripte für doTERRA-Vertrieb
"""

DOTERRA_SCRIPTS = {
    "pitches": {
        "natuerliche_loesung": {
            "name": "Der 'Natürliche Lösung' Pitch",
            "text": "Hallo [Name], kurze Frage: Wie gehst du mit Stress, Schlafproblemen oder Kopfschmerzen um? Ich nutze seit einiger Zeit ätherische Öle als natürliche Unterstützung und bin begeistert. Hast du schon mal damit experimentiert?",
            "channel": ["whatsapp", "instagram"],
            "situation": "cold_outreach"
        },
        "reinheit_qualitaet": {
            "name": "Der Qualitäts-Pitch",
            "text": "Hey [Name], bei ätherischen Ölen ist Qualität ALLES. 80% der Öle auf dem Markt sind verdünnt oder synthetisch. doTERRA hat den strengsten Reinheitsstandard der Branche – CPTG-zertifiziert. Kennst du den Unterschied?",
            "channel": ["whatsapp", "instagram", "linkedin"],
            "situation": "quality_focused"
        },
        "familien_wellness": {
            "name": "Der Familien-Pitch",
            "text": "Hallo [Name], als Mama/Papa willst du das Beste für deine Familie, oder? Ich nutze ätherische Öle als sanfte, natürliche Unterstützung – für besseren Schlaf, Fokus bei den Hausaufgaben, oder zur Stärkung in der Erkältungszeit. Interesse?",
            "channel": ["whatsapp", "instagram"],
            "situation": "family_focused"
        },
        "diffuser_erlebnis": {
            "name": "Der Diffuser-Pitch",
            "text": "Hey [Name], stell dir vor: Du kommst nach Hause, und es duftet wie in einem Spa. Lavendel zum Entspannen, Pfefferminze für Frische, Zitrone für gute Laune. Ein Diffuser mit den richtigen Ölen verändert alles. Willst du mehr wissen?",
            "channel": ["instagram", "whatsapp"],
            "situation": "lifestyle_focused"
        },
        "wellness_routine": {
            "name": "Der Routine-Pitch",
            "text": "Hallo [Name], ich habe meine Morgen- und Abendroutine komplett mit ätherischen Ölen aufgewertet. Mehr Energie, besserer Schlaf, weniger Stress. Alles natürlich. Soll ich dir zeigen, wie einfach das geht?",
            "channel": ["whatsapp", "instagram"],
            "situation": "routine_interested"
        },
        "naturkosmetik": {
            "name": "Der DIY/Naturkosmetik Pitch",
            "text": "Hey [Name], du interessierst dich für natürliche Kosmetik? Mit ätherischen Ölen kannst du deine eigenen Produkte machen – Gesichtsserum, Bodybutter, Raumspray. Keine Chemie, volle Kontrolle über die Inhaltsstoffe. Ich zeig dir wie!",
            "channel": ["instagram", "whatsapp"],
            "situation": "diy_interested"
        },
        "kopfschmerzen_stress": {
            "name": "Der Problem-Löser Pitch",
            "text": "Hallo [Name], kennst du das: Kopfschmerzen, Verspannungen, Stress? Bevor ich zu Tabletten greife, nutze ich Pfefferminzöl auf die Schläfen. Klingt simpel, wirkt aber erstaunlich gut. Hast du sowas schon mal probiert?",
            "channel": ["whatsapp", "instagram"],
            "situation": "problem_aware"
        },
        "business_opportunity": {
            "name": "Der Business-Pitch",
            "text": "Hey [Name], neben meinem Job baue ich mir mit doTERRA ein zweites Standbein auf. Flexible Arbeitszeiten, tolle Produkte, echte Community. Falls du offen bist für neue Möglichkeiten – erzähl ich dir gern mehr.",
            "channel": ["whatsapp", "linkedin", "instagram"],
            "situation": "business_opportunity"
        },
        "yoga_meditation": {
            "name": "Der Yoga/Meditation Pitch",
            "text": "Hallo [Name], ich sehe, du praktizierst Yoga/Meditation. Nutzt du ätherische Öle dabei? Weihrauch für Erdung, Lavendel für Entspannung, Balance-Blend für Zentrierung – das verstärkt die Praxis enorm.",
            "channel": ["instagram", "whatsapp"],
            "situation": "spiritual_wellness"
        },
        "starter_kit": {
            "name": "Der Starter-Kit Pitch",
            "text": "Hey [Name], wenn du ätherische Öle mal richtig ausprobieren willst: Wir haben ein Starter-Kit mit den 10 wichtigsten Ölen + Diffuser. Perfekt zum Einstieg, und du sparst gegenüber Einzelkauf. Interesse?",
            "channel": ["whatsapp", "instagram"],
            "situation": "low_barrier"
        }
    },
    
    "wert_fragen": {
        "natuerlich_vs_chemie": {
            "name": "Die Natürlich-vs-Chemie Frage",
            "text": "Wie oft greifst du zu Medikamenten oder chemischen Produkten für kleine Beschwerden? Was wäre es dir wert, natürliche Alternativen zu haben, die genauso gut funktionieren?",
            "situation": "qualifying"
        },
        "raumklima_frage": {
            "name": "Die Raumklima-Frage",
            "text": "Wie fühlst du dich in deinem Zuhause? Was wäre es dir wert, eine Atmosphäre zu schaffen, die dich sofort entspannt, wenn du reinkommst?",
            "situation": "home_atmosphere"
        },
        "schlaf_frage": {
            "name": "Die Schlaf-Frage",
            "text": "Wie ist dein Schlaf? Was wäre es dir wert, jeden Abend entspannt einzuschlafen und morgens erholt aufzuwachen – ganz ohne Schlafmittel?",
            "situation": "sleep_focused"
        },
        "stress_frage": {
            "name": "Die Stress-Frage",
            "text": "Auf einer Skala von 1-10: Wie gestresst fühlst du dich im Alltag? Was wäre es dir wert, ein einfaches Tool zu haben, das dich in Sekunden runterbringt?",
            "situation": "stress_management"
        },
        "familie_schuetzen": {
            "name": "Die Familien-Schutz Frage",
            "text": "Wie wichtig ist es dir, deine Familie auf natürliche Weise zu unterstützen? Was wäre es dir wert, sanfte Lösungen für die kleinen Wehwehchen des Alltags zu haben?",
            "situation": "family_care"
        }
    },
    
    "einwand_handling": {
        "zu_teuer": {
            "name": "Einwand: Zu teuer",
            "einwand": "Die Öle sind mir zu teuer",
            "antwort": "Ich verstehe – auf den ersten Blick wirkt das so. Aber: Ein Fläschchen hält Monate, weil du nur wenige Tropfen brauchst. Pro Anwendung sind das Centbeträge. Und du bekommst CPTG-geprüfte Reinheit, die wirklich wirkt. Billige Öle sind oft verdünnt – da zahlst du doppelt.",
            "situation": "price_objection"
        },
        "hab_schon_oele": {
            "name": "Einwand: Habe schon Öle",
            "einwand": "Ich habe schon ätherische Öle",
            "antwort": "Super! Woher hast du sie? Der Unterschied bei Ölen ist riesig. 80% sind verdünnt oder synthetisch. doTERRA ist einer der wenigen Anbieter mit transparenter Herkunft und CPTG-Zertifizierung. Hast du mal den Vergleich gemacht?",
            "situation": "existing_oils"
        },
        "ist_mlm": {
            "name": "Einwand: Ist das MLM?",
            "einwand": "Ist das Network Marketing?",
            "antwort": "Ja, doTERRA nutzt Direktvertrieb. Das bedeutet: Du bekommst persönliche Beratung und Betreuung statt anonymem Amazon-Kauf. Und die Preise sind vergleichbar mit anderen Premium-Ölen. Ich bin hier, weil ich an die Produkte glaube. Willst du sie erst mal testen?",
            "situation": "mlm_concern"
        },
        "wirkt_das": {
            "name": "Einwand: Wirkt das überhaupt?",
            "einwand": "Ätherische Öle – wirkt das wirklich?",
            "antwort": "Berechtigte Frage! Aromatherapie wird seit Jahrtausenden genutzt. Heute gibt es hunderte Studien zur Wirkung von Lavendel, Pfefferminze, Weihrauch. Aber am besten probierst du es selbst – das Erlebnis überzeugt mehr als jede Studie.",
            "situation": "efficacy_doubt"
        },
        "nur_duft": {
            "name": "Einwand: Ist doch nur Duft",
            "einwand": "Das ist doch nur Raumduft",
            "antwort": "Verstehe ich – so dachte ich anfangs auch. Aber ätherische Öle sind mehr als Duft. Sie enthalten aktive Pflanzenstoffe, die über Haut oder Einatmen wirken. Lavendel entspannt nachweislich, Pfefferminze macht wach. Das ist Pflanzenpower pur.",
            "situation": "underestimate"
        },
        "keine_zeit": {
            "name": "Einwand: Keine Zeit",
            "einwand": "Ich habe keine Zeit für so was",
            "antwort": "Gerade für dich sind Öle perfekt! Diffuser an, Tropfen drauf, fertig. Oder ein Tropfen Pfefferminze auf die Schläfen – dauert 5 Sekunden. Das ist keine Zeitinvestition, sondern Zeitersparnis, weil du dich besser fühlst.",
            "situation": "time_objection"
        },
        "allergie_bedenken": {
            "name": "Einwand: Allergie/Empfindlich",
            "einwand": "Ich reagiere empfindlich auf Düfte",
            "antwort": "Das ist wichtig zu wissen! Bei synthetischen Düften reagieren viele empfindlich. Reine ätherische Öle sind etwas anderes – keine Chemie, nur Pflanze. Trotzdem: Wir machen immer einen Verträglichkeitstest. Sicherheit geht vor.",
            "situation": "sensitivity_concern"
        },
        "brauche_zeit": {
            "name": "Einwand: Muss nachdenken",
            "einwand": "Ich muss erst darüber nachdenken",
            "antwort": "Absolut! Gute Entscheidungen brauchen Zeit. Ich schicke dir ein paar Infos und Erfahrungsberichte. Wann sollen wir uns nochmal austauschen?",
            "situation": "needs_time"
        },
        "nicht_mein_ding": {
            "name": "Einwand: Nicht mein Ding",
            "einwand": "Das ist einfach nicht mein Ding",
            "antwort": "Kein Problem, ich verstehe das! Darf ich fragen: Hast du schon mal echte, hochwertige Öle ausprobiert? Viele ändern ihre Meinung nach dem ersten Erlebnis. Wenn nicht – alles gut, kein Stress.",
            "situation": "general_rejection"
        },
        "online_guenstiger": {
            "name": "Einwand: Online günstiger",
            "einwand": "Ich finde Öle online günstiger",
            "antwort": "Stimmt, es gibt günstigere Angebote. Aber Vorsicht: Viele sind verdünnt, synthetisch oder falsch gelagert. Bei doTERRA weißt du genau, was drin ist – CPTG-zertifiziert, transparente Herkunft. Qualität hat ihren Preis, aber sie wirkt auch.",
            "situation": "price_comparison"
        }
    },
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand (24h)",
            "text": "Hey [Name], konntest du dir die Infos zu den ätherischen Ölen anschauen? Welches Öl oder Thema hat dich am meisten angesprochen?",
            "timing": "24h_after_info"
        },
        "nach_sample": {
            "name": "Nach Sample/Probe",
            "text": "Hi [Name], wie war dein Erlebnis mit der Öl-Probe? Hast du den Duft genossen? Viele sind überrascht, wie intensiv die Wirkung ist.",
            "timing": "after_sample"
        },
        "nach_class": {
            "name": "Nach Online-Class/Workshop",
            "text": "Hey [Name], danke, dass du bei der Class dabei warst! Was war für dich der interessanteste Punkt? Hast du noch Fragen?",
            "timing": "after_class"
        },
        "starter_kit_interesse": {
            "name": "Starter-Kit Follow-Up",
            "text": "Hallo [Name], du hattest ja Interesse am Starter-Kit gezeigt. Diesen Monat gibt's noch [Bonus/Aktion] dazu. Soll ich dir das sichern?",
            "timing": "kit_followup"
        },
        "saisonal_winter": {
            "name": "Saisonales Follow-Up (Winter)",
            "text": "Hey [Name], die kalte Jahreszeit ist da! Jetzt nutzen viele On Guard (Immunsupport) und Breathe (freie Atemwege). Ist das Thema für dich aktuell?",
            "timing": "seasonal_winter"
        },
        "saisonal_fruehling": {
            "name": "Saisonales Follow-Up (Frühling)",
            "text": "Hi [Name], der Frühling kommt! Viele kämpfen mit Allergien. Es gibt ein tolles Trio aus Lavendel, Zitrone und Pfefferminze. Soll ich dir mehr erzählen?",
            "timing": "seasonal_spring"
        },
        "bestandskunde_check": {
            "name": "Bestandskunden Check-in",
            "text": "Hey [Name], wie läuft's mit deinen Ölen? Brauchst du Nachschub oder hast du Fragen zur Anwendung? Ich bin für dich da!",
            "timing": "customer_checkin"
        },
        "social_proof": {
            "name": "Social Proof Follow-Up",
            "text": "Hi [Name], [Kundin X] hat mir gerade erzählt, dass Lavendel ihr beim Einschlafen so geholfen hat. Ich dachte, das könnte dich interessieren, weil du ja auch Schlafthemen hast.",
            "timing": "social_proof"
        },
        "business_followup": {
            "name": "Business-Opportunity Follow-Up",
            "text": "Hey [Name], du hattest ja Interesse an der Business-Seite von doTERRA. Diese Woche hab ich Zeit für ein ausführliches Gespräch. Wann passt dir?",
            "timing": "business_followup"
        },
        "empfehlung_fragen": {
            "name": "Empfehlungs-Anfrage",
            "text": "Hi [Name], freut mich, dass du die Öle liebst! 🙏 Kennst du jemanden, dem das auch helfen könnte? Ich würde mich über eine Empfehlung sehr freuen.",
            "timing": "referral"
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "text": "Hey [Name], ich sehe, du hast's gelesen aber noch nicht geantwortet. Eine Zahl reicht: 1 = Interesse, aber später. 2 = Kein Interesse. 3 = Schick mehr Infos. 💜",
            "situation": "read_no_reply"
        },
        "empathisch": {
            "name": "Empathischer Check-in",
            "text": "Hi [Name], das Leben ist manchmal voll. Ist das Thema ätherische Öle gerade einfach nicht dran? Total okay – sag mir nur kurz Bescheid.",
            "situation": "empathetic"
        },
        "multiple_choice": {
            "name": "Multiple Choice",
            "text": "Hey [Name], kurze Umfrage 😊: A) Interessiert, aber keine Zeit gerade. B) Hab's vergessen, danke! C) Nicht mein Ding. Was passt?",
            "situation": "fun_multiple_choice"
        },
        "duft_basiert": {
            "name": "Duft-basierter Re-Engage",
            "text": "Hi [Name], ich hab gerade einen neuen Duft im Diffuser und musste an dich denken. Hast du mittlerweile mal Öle ausprobiert? Oder ist das Thema erstmal auf Pause?",
            "situation": "duft_trigger"
        },
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg",
            "text": "Hey [Name], ich will dich nicht nerven. Wenn ätherische Öle nichts für dich sind, sag einfach kurz Bescheid – dann weiß ich, woran ich bin. Alles gut!",
            "situation": "easy_out"
        },
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "text": "Hi [Name], mein System erinnert mich nachzufassen. Aber ganz ehrlich: Ist das Thema natürliche Wellness gerade überhaupt auf deinem Radar?",
            "situation": "pattern_break"
        },
        "value_bump": {
            "name": "Value Bump",
            "text": "Hey [Name], nur kurz: Diesen Monat gibt's das Starter-Kit mit [Bonus]. Falls das Timing jetzt besser passt?",
            "situation": "offer_based"
        },
        "archivieren": {
            "name": "Erlaubnis zum Archivieren",
            "text": "Hi [Name], ich räume meine Kontakte auf. Soll ich dich aus meiner 'Öle-Interessenten' Liste nehmen, oder besteht grundsätzlich noch Interesse?",
            "situation": "cleanup"
        },
        "break_up": {
            "name": "Break-Up Message",
            "text": "Hey [Name], da ich nichts höre, gehe ich davon aus, dass es gerade nicht passt. Falls sich das ändert – du weißt, wo du mich findest! Alles Gute 💜",
            "situation": "final_message"
        },
        "langzeit_checkin": {
            "name": "Langzeit Check-in",
            "text": "Hi [Name], wir hatten vor einer Weile über ätherische Öle gesprochen. Wie sieht's aus – hat sich was verändert? Vielleicht ist jetzt ein besserer Zeitpunkt?",
            "situation": "long_term"
        }
    },
    
    "closing": {
        "sample_close": {
            "name": "Sample/Probe Abschluss",
            "text": "Am einfachsten: Ich schicke dir eine Probe von Lavendel oder Pfefferminze. Dann erlebst du selbst, wie die Qualität ist. Welches soll's sein?",
            "situation": "sample_close"
        },
        "starter_kit_close": {
            "name": "Starter-Kit Abschluss",
            "text": "Das Starter-Kit ist der beste Einstieg: 10 Öle + Diffuser, alles was du brauchst. Du sparst gegenüber Einzelkauf und hast ein komplettes Wellness-Setup. Sollen wir das starten?",
            "situation": "kit_close"
        },
        "einzeloel_close": {
            "name": "Einzel-Öl Abschluss",
            "text": "Lass uns klein anfangen: Ein Öl, das zu deinem Thema passt. [Lavendel/Pfefferminze/etc.] wäre perfekt für dich. Soll ich das für dich bestellen?",
            "situation": "single_oil_close"
        },
        "class_close": {
            "name": "Online-Class Abschluss",
            "text": "Ich mache am [Datum] eine kleine Online-Class zu ätherischen Ölen. 30 Minuten, unverbindlich, du lernst die Basics. Bist du dabei?",
            "situation": "class_close"
        },
        "onboarding_close": {
            "name": "Onboarding Close",
            "text": "Super Entscheidung! 💜 Ich richte dir alles ein und schicke dir eine Willkommens-Anleitung. In wenigen Tagen startest du deine Öle-Reise. Willkommen bei doTERRA!",
            "situation": "welcome_close"
        }
    }
}

DOTERRA_COMPLIANCE = {
    "verboten": [
        "heilt",
        "kuriert",
        "behandelt Krankheiten",
        "ersetzt Medikamente",
        "Diagnose",
        "Therapie"
    ],
    "erlaubt": [
        "unterstützt das Wohlbefinden",
        "natürliche Pflanzenkraft",
        "aromatherapeutische Anwendung",
        "traditionelle Verwendung",
        "CPTG-zertifizierte Reinheit"
    ],
    "hinweise": [
        "Ätherische Öle sind kein Ersatz für medizinische Behandlung",
        "Bei Schwangerschaft, Stillzeit oder Erkrankungen Arzt konsultieren",
        "Nicht bei Kindern unter 6 Jahren ohne Rücksprache anwenden",
        "Zitrusöle können photosensibilisierend wirken"
    ]
}

def get_script(category: str, script_id: str) -> dict:
    """Hole ein spezifisches Script."""
    if category in DOTERRA_SCRIPTS and script_id in DOTERRA_SCRIPTS[category]:
        return DOTERRA_SCRIPTS[category][script_id]
    return None

def get_all_scripts() -> dict:
    """Hole alle doTERRA Scripts."""
    return DOTERRA_SCRIPTS

def get_compliance_rules() -> dict:
    """Hole Compliance-Regeln."""
    return DOTERRA_COMPLIANCE
