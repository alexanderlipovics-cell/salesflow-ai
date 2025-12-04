"""
HERBALIFE MLM SCRIPTS
=====================
50 praxiserprobte Skripte für Herbalife-Vertrieb
"""

HERBALIFE_SCRIPTS = {
    "pitches": {
        "gesundes_fruehstueck": {
            "name": "Der 'Gesundes Frühstück' Pitch",
            "text": "Hallo [Name], eine kurze Frage: Wie sieht dein typisches Frühstück aus? Viele meiner Kunden hetzen morgens. Ich helfe Menschen, in unter 3 Minuten ein perfekt ausbalanciertes Frühstück zu bekommen, das Energie für den Tag gibt. Interesse?",
            "channel": ["whatsapp", "instagram"],
            "situation": "cold_outreach"
        },
        "energie_level": {
            "name": "Der 'Energie-Level' Pitch",
            "text": "Hallo [Name], kennst du das typische Nachmittagstief? Oft liegt das an einer nicht optimalen Nährstoffversorgung. Wir haben Konzepte, die helfen können, das Energielevel konstant zu halten. Darf ich dir dazu kurz was zeigen?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "energy_focused"
        },
        "wohlfuehlgewicht": {
            "name": "Der 'Wohlfühlgewicht' Pitch",
            "text": "Hey [Name], viele kämpfen damit, ihr Wohlfühlgewicht zu erreichen und zu halten. Diäten sind oft frustrierend. Ich arbeite als Coach mit einem Konzept, das auf personalisierter Ernährung und Community-Support basiert. Offen für einen Austausch?",
            "channel": ["whatsapp", "instagram"],
            "situation": "weight_management"
        },
        "bequemlichkeit": {
            "name": "Der 'Bequemlichkeit' Pitch",
            "text": "Hey [Name], wie oft stehst du mittags vor der Wahl: Ungesundes Kantinenessen oder teurer Lieferservice? Ich zeige dir, wie du eine gesunde, schnelle und preiswerte Mahlzeit bekommst, die dich bei deinen Zielen unterstützt. Interesse?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "busy_professional"
        },
        "community_coaching": {
            "name": "Der 'Community & Coaching' Pitch",
            "text": "Hallo [Name], der Versuch, den Lebensstil alleine umzustellen, scheitert oft. Bei uns bekommst du nicht nur einen Ernährungsplan, sondern auch einen persönlichen Coach und Zugang zu unserer Support-Community. Gemeinsam ist es einfacher.",
            "channel": ["whatsapp", "instagram"],
            "situation": "community_seeker"
        },
        "sport_fitness": {
            "name": "Der 'Sport & Fitness' Pitch (H24)",
            "text": "Hey [Name], ich sehe, du bist sportlich aktiv. Was tust du aktuell für deine Regeneration? Ich arbeite mit der H24 Sportlinie, die speziell dafür entwickelt wurde. Interesse an Infos?",
            "channel": ["instagram", "whatsapp"],
            "situation": "fitness_active"
        },
        "skeptiker": {
            "name": "Die 'Skeptiker'-Ansprache",
            "text": "Hallo [Name], noch eine 'Diät'? Ich verstehe die Skepsis. Bei uns geht es nicht um Verzicht, sondern um eine nachhaltige Umstellung mit persönlicher Betreuung. Kein Hype, nur ein Plan, der funktioniert. 15 Min Zeit für einen Realitätscheck?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "skeptical_lead"
        },
        "trial_pack": {
            "name": "Der 'Trial Pack' Pitch",
            "text": "Hallo [Name], anstatt dir viel zu erzählen, lade ich dich ein, es selbst zu testen. Wir haben ein 3-Tage-Testpaket für unser Gesundes Frühstück. So kannst du sehen, wie es dir schmeckt und wie du dich fühlst. Interesse?",
            "channel": ["whatsapp", "instagram"],
            "situation": "low_barrier"
        },
        "kurze_frage": {
            "name": "Die 'Kurze Frage'",
            "text": "Hey [Name], kurze Frage: Was ist aktuell deine größte Herausforderung beim Thema gesunde Ernährung im Alltag?",
            "channel": ["whatsapp", "instagram"],
            "situation": "quick_opener"
        },
        "wellness_check": {
            "name": "Der 'Wellness-Check' Pitch",
            "text": "Hey [Name], ich biete aktuell kostenlose Wellness-Checks an. Dabei analysieren wir deine aktuellen Essgewohnheiten und Ziele und erstellen einen individuellen Plan für dich. Wann hättest du 30 Minuten Zeit dafür?",
            "channel": ["whatsapp", "instagram"],
            "situation": "consultation_offer"
        }
    },
    
    "wert_fragen": {
        "wohlbefinden": {
            "name": "Die 'Wohlbefinden'-Frage",
            "text": "Auf einer Skala von 1-10, wie wohl fühlst du dich aktuell in deinem Körper? Was wäre es dir wert, diese Zahl um 2-3 Punkte zu verbessern?",
            "situation": "qualifying"
        },
        "zeitspar": {
            "name": "Die 'Zeitspar'-Frage",
            "text": "Wie viel Zeit verbringst du täglich damit, Mahlzeiten zu planen und zu kochen? Was würdest du mit der Zeit machen, wenn du wüsstest, dass 1-2 Mahlzeiten am Tag perfekt abgedeckt sind?",
            "situation": "time_focused"
        },
        "kostenvergleich": {
            "name": "Die 'Kostenvergleich'-Frage",
            "text": "Was gibst du typischerweise für ein Mittagessen oder einen Kaffee-to-go aus? Was, wenn eine vollwertige, gesunde Mahlzeit dich weniger als 3€ kosten würde?",
            "situation": "budget_conscious"
        },
        "coaching_wert": {
            "name": "Die 'Coaching-Wert'-Frage",
            "text": "Was ist der Unterschied zwischen einem Fitnessstudio-Abo und einem Personal Trainer? Die Betreuung. Was ist es dir wert, einen Coach zu haben, der dich motiviert und den Plan anpasst?",
            "situation": "coaching_value"
        },
        "frustration": {
            "name": "Die 'Frustration'-Frage",
            "text": "Wie frustrierend ist es, verschiedene Diäten auszuprobieren und am Ende doch wieder am Ausgangspunkt zu landen? Was, wenn dies der letzte Plan ist, den du jemals starten musst?",
            "situation": "diet_frustrated"
        }
    },
    
    "einwand_handling": {
        "zu_teuer": {
            "name": "Einwand: Zu teuer",
            "einwand": "Das ist mir zu teuer",
            "antwort": "Ich verstehe, auf den ersten Blick wirkt der Preis hoch. Aber lass uns das pro Mahlzeit rechnen: Ein Shake kostet dich weniger als 3€. Das ist günstiger als ein belegtes Brötchen vom Bäcker und dabei hast du eine perfekt ausbalancierte Mahlzeit. Du sparst also Geld beim Wocheneinkauf.",
            "situation": "price_objection"
        },
        "keine_shakes": {
            "name": "Einwand: Keine Shakes",
            "einwand": "Ich mag keine Shakes / Ich esse lieber richtiges Essen",
            "antwort": "Absolut verständlich! Es geht nicht darum, nur noch Shakes zu trinken. Der Plan sieht 1-2 Shakes pro Tag vor, für Bequemlichkeit und Nährstoffkontrolle. Dazu gibt es normale, gesunde Mahlzeiten. Ich helfe dir dabei, das perfekt in deinen Alltag zu integrieren.",
            "situation": "product_preference"
        },
        "ist_mlm": {
            "name": "Einwand: Ist das MLM?",
            "einwand": "Ist das nicht dieses Pyramidensystem/MLM?",
            "antwort": "Herbalife nutzt Network Marketing als Vertriebsmodell, ja. Das ermöglicht die intensive persönliche Betreuung, die du im Laden nicht bekommst. Es ist ein seit über 40 Jahren etabliertes, börsennotiertes Unternehmen. Letztlich geht es darum, ob das Produkt und das Coaching dir helfen.",
            "situation": "mlm_concern"
        },
        "jojo_effekt": {
            "name": "Einwand: Jo-Jo-Effekt",
            "einwand": "Ich habe Angst vor dem Jo-Jo-Effekt",
            "antwort": "Das ist eine berechtigte Sorge bei Crash-Diäten. Deshalb ist unser Ansatz anders. Wir konzentrieren uns auf eine nachhaltige Ernährungsumstellung und Muskelaufbau (durch Proteine), nicht nur auf Kalorienreduktion. Mein Job als Coach ist es, dir beizubringen, wie du das Gewicht auch hältst.",
            "situation": "sustainability_concern"
        },
        "schon_probiert": {
            "name": "Einwand: Schon probiert",
            "einwand": "Ich habe das schon mal probiert, es hat nicht funktioniert",
            "antwort": "Das tut mir leid zu hören. Darf ich fragen: Hattest du damals einen Coach, der dich intensiv betreut hat? Oft liegt der Fehler nicht am Produkt, sondern an der falschen Anwendung oder fehlender Unterstützung. Ich stelle sicher, dass wir es diesmal richtig machen.",
            "situation": "past_experience"
        },
        "ernaehre_mich_gesund": {
            "name": "Einwand: Ernähre mich gesund",
            "einwand": "Ich ernähre mich schon gesund",
            "antwort": "Das ist super! Aber selbst bei gesunder Ernährung ist es schwer, täglich alle notwendigen Makro- und Mikronährstoffe in der richtigen Balance zu bekommen. Herbalife ist eine einfache Möglichkeit, diese Lücken zu schließen.",
            "situation": "healthy_eater"
        },
        "schmeckt_nicht": {
            "name": "Einwand: Schmeckt nicht",
            "einwand": "Mir schmecken die Produkte nicht",
            "antwort": "Wann hast du das letzte Mal probiert? Die Rezepturen wurden stetig verbessert und es gibt mittlerweile viele Geschmacksrichtungen. Außerdem hängt viel von der Zubereitung ab – ich habe tolle Rezepte, die schmecken wie ein Dessert!",
            "situation": "taste_objection"
        },
        "keine_zeit": {
            "name": "Einwand: Keine Zeit",
            "einwand": "Ich habe keine Zeit dafür",
            "antwort": "Perfekt, denn dieses Konzept ist für Menschen gemacht, die keine Zeit haben. Ein Shake ist in 2 Minuten fertig – schneller als jede andere gesunde Mahlzeit.",
            "situation": "time_objection"
        },
        "ungesund_chemisch": {
            "name": "Einwand: Ungesund/Chemisch",
            "einwand": "Ich habe gehört, die Produkte seien ungesund/chemisch",
            "antwort": "Das ist ein Mythos. Die Produkte basieren auf wissenschaftlichen Erkenntnissen und erfüllen höchste Qualitätsstandards ('Seed to Feed'). Sie sind dazu da, deine Ernährung zu verbessern. Ich zeige dir gerne die genauen Inhaltsstoffe.",
            "situation": "quality_concern"
        },
        "nicht_im_laden": {
            "name": "Einwand: Nicht im Laden kaufbar",
            "einwand": "Warum kann ich das nicht einfach im Laden kaufen?",
            "antwort": "Einige Produkte gibt es online, aber der Schlüssel zum Erfolg bei Herbalife ist der Plan und das persönliche Coaching. Du kaufst nicht nur ein Produkt, du kaufst eine Lösung mit Betreuung – und das bin ich.",
            "situation": "availability_question"
        }
    },
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand (24h)",
            "text": "Hallo [Name], konntest du dir die Infos zum Gesunden Frühstück schon anschauen? Was denkst du über die Idee, morgens Zeit zu sparen und trotzdem perfekt versorgt zu sein?",
            "timing": "24h_after_info"
        },
        "wert_addieren": {
            "name": "Das 'Wert-Addieren' Follow-Up",
            "text": "Hey [Name], ich habe nochmal über unser Gespräch nachgedacht. Du sagtest, dass [spezifisches Problem] dich sehr stört. Ich bin sicher, wir können das mit dem richtigen Plan in den Griff bekommen. Sollen wir es angehen?",
            "timing": "48h_value_add"
        },
        "social_proof": {
            "name": "Das 'Social Proof' Follow-Up",
            "text": "Hallo [Name], ich dachte, das könnte dich motivieren: [Kunde X] hat vor 3 Monaten gestartet und fühlt sich jetzt viel fitter. Ich bin sicher, das kannst du auch.",
            "timing": "social_proof"
        },
        "einladung_event": {
            "name": "Das 'Einladung' Follow-Up",
            "text": "Hey [Name], wir veranstalten am [Datum] ein kostenloses Online-Workout / einen Infoabend zum Thema gesunde Ernährung. Wäre das interessant für dich? Du kannst dir alles unverbindlich anschauen.",
            "timing": "event_invite"
        },
        "naechster_schritt": {
            "name": "Das 'Nächster Schritt' Follow-Up",
            "text": "Hey [Name], um die nächsten Schritte konkret zu machen: Sollen wir mit dem 3-Tage-Testpaket starten oder möchtest du direkt mit dem vollen Frühstücksprogramm loslegen?",
            "timing": "decision_point"
        },
        "testpaket_tag1": {
            "name": "Testpaket Tag 1",
            "text": "Hallo [Name], Tag 1 deines Testpakets! Wie hat dir der Shake geschmeckt? Denk daran, genug Wasser zu trinken. Ich bin für dich da, wenn du Fragen hast!",
            "timing": "trial_day1"
        },
        "nach_testpaket": {
            "name": "Nach dem Testpaket",
            "text": "Hey [Name], deine 3 Tage sind um! Wie fühlst du dich? Hast du gemerkt, dass du mehr Energie hattest? Lass uns jetzt den Plan für den Rest des Monats aufstellen.",
            "timing": "trial_complete"
        },
        "sanfter_stupser": {
            "name": "Der 'Sanfte Stupser'",
            "text": "Hallo [Name], nur ein kurzer Check-in. Konntest du dir schon Gedanken zu unserem Angebot machen? Kein Stress, aber ich bin neugierig auf dein Feedback.",
            "timing": "soft_reminder"
        },
        "roi_followup": {
            "name": "Der 'ROI'-Follow-up",
            "text": "[Name], denk daran: Es geht nicht nur um die Produkte, sondern um die Veränderung deines Lebensstils. Wenn du dich dadurch fitter und selbstbewusster fühlst, hat sich die Investition sofort gelohnt. Wann sollen wir starten?",
            "timing": "value_reminder"
        },
        "finaler_checkin": {
            "name": "Finaler Check-in",
            "text": "Hallo [Name], ich wollte mich nochmal melden, bevor ich meinen Fall schließe. Ist das Thema 'Wohlfühlgewicht erreichen' für dich noch aktuell?",
            "timing": "final_check"
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "text": "Hey [Name], ich sehe, du hast meine Nachricht gelesen. Eine Ernährungsumstellung ist ein großer Schritt. Gib mir nur einen kurzen Daumen hoch 👍, wenn wir später weitermachen sollen, oder sag Bescheid, wenn es gerade nicht passt.",
            "situation": "read_no_reply"
        },
        "empathischer_checkin": {
            "name": "Der 'Empathische Check-in'",
            "text": "Hallo [Name], ich weiß, der Alltag kann stressig sein. Ist das Thema 'Gesunde Routine finden' aktuell einfach nicht Prio A bei dir? Kein Problem, sag mir nur kurz Bescheid.",
            "situation": "empathetic"
        },
        "multiple_choice": {
            "name": "Der 'Multiple Choice'",
            "text": "Hallo [Name], da ich nichts von dir höre, sag mir doch bitte kurz, was Phase ist: 1) Du bist interessiert, aber hattest keine Zeit. 2) Du hast das Interesse verloren. 3) Du bist im Schokoladen-Koma und brauchst Hilfe. 😉 Einfach die Zahl senden.",
            "situation": "fun_multiple_choice"
        },
        "einfacher_ausweg": {
            "name": "Der 'Einfache Ausweg'",
            "text": "Hey [Name], ich will dich absolut nicht nerven. Wenn das Thema für dich nicht relevant ist, sag einfach kurz 'Nein danke', dann weiß ich Bescheid und höre auf, dich zu kontaktieren.",
            "situation": "easy_out"
        },
        "pattern_interrupt": {
            "name": "Der 'Pattern Interrupt'",
            "text": "Hey [Name], mein CRM sagt mir, ich soll dich nerven, aber das will ich nicht 😉. Ganz ehrlich: Ist das Thema noch relevant für dich, oder sollen wir es erstmal vertagen?",
            "situation": "pattern_break"
        },
        "prioritaeten_check": {
            "name": "Der 'Prioritäten-Check'",
            "text": "Hallo [Name], ich habe länger nichts von dir gehört. Manchmal ist einfach nicht der richtige Zeitpunkt, um große Veränderungen anzugehen. Alles okay bei dir?",
            "situation": "priorities"
        },
        "value_bump": {
            "name": "Der 'Value Bump'",
            "text": "Hey [Name], wir haben gerade eine Aktion für das Starter-Set / eine neue Geschmacksrichtung. Dachte, das könnte relevant sein, da du [Grund] erwähnt hattest.",
            "situation": "offer_based"
        },
        "archivieren": {
            "name": "Die 'Erlaubnis zum Archivieren'",
            "text": "Hallo [Name], ich räume gerade meine Kontakte auf. Soll ich deinen Fall archivieren oder besteht grundsätzlich noch Interesse daran, deine Ernährungsziele zu erreichen?",
            "situation": "cleanup"
        },
        "break_up": {
            "name": "Der 'Break-Up'",
            "text": "Hallo [Name], da ich keine Rückmeldung bekomme, gehe ich davon aus, dass das Thema für dich erledigt ist. Ich wünsche dir alles Gute. Falls sich was ändert, weißt du, wo du mich findest.",
            "situation": "final_message"
        },
        "langzeit_checkin": {
            "name": "Der 'Langzeit-Check-in'",
            "text": "Hallo [Name], wir hatten vor einiger Zeit mal über das Thema Wohlfühlgewicht gesprochen. Hat sich bei dir etwas verändert oder ist das Thema wieder aktuell für dich?",
            "situation": "long_term"
        }
    },
    
    "closing": {
        "testpaket_abschluss": {
            "name": "Der 'Testpaket-Abschluss'",
            "text": "Der einfachste Weg herauszufinden, ob das was für dich ist, ist das 3-Tage-Testpaket. Es kostet nur [Preis] und du hast 6 Mahlzeiten abgedeckt. Sollen wir das starten?",
            "situation": "low_barrier_close"
        },
        "coaching_commitment": {
            "name": "Der 'Coaching-Commitment'-Abschluss",
            "text": "Die Produkte sind das Werkzeug, aber mein Coaching macht den Unterschied. Bist du bereit, dich auf diesen Prozess einzulassen und gemeinsam deine Ziele zu erreichen?",
            "situation": "commitment_close"
        },
        "kosten_des_wartens": {
            "name": "Der 'Kosten des Wartens'-Abschluss",
            "text": "Jede Woche, die du wartest, ist eine Woche, in der du dich nicht so gut fühlst, wie du könntest. Lass uns jetzt starten. Der beste Zeitpunkt ist immer jetzt.",
            "situation": "urgency_close"
        },
        "choice_close": {
            "name": "Der 'Choice Close'",
            "text": "Sehr gut. Lass uns dein Starter-Paket zusammenstellen. Was bevorzugst du geschmacklich: Eher fruchtig wie Erdbeere oder lieber klassisch wie Vanille oder Schokolade?",
            "situation": "choice_close"
        },
        "onboarding_close": {
            "name": "Der 'Onboarding Close'",
            "text": "Super Entscheidung. Ich richte dir dein Kundenkonto ein und stelle deinen individuellen Plan zusammen. Sobald das Paket bei dir ist, melde dich kurz, und wir besprechen die ersten Tage. Willkommen im Team!",
            "situation": "welcome_close"
        }
    }
}

HERBALIFE_COMPLIANCE = {
    "verboten": [
        "Verliere 5kg in 2 Wochen",
        "garantierter Gewichtsverlust",
        "heilt Diabetes",
        "Wundermittel",
        "ohne Sport abnehmen garantiert"
    ],
    "erlaubt": [
        "Unterstützung beim Gewichtsmanagement",
        "Wohlfühlgewicht",
        "gesunder, aktiver Lebensstil",
        "persönliche Ziele",
        "ausgewogene Ernährung"
    ],
    "health_claims": [
        "Proteine tragen zum Erhalt von Muskelmasse bei",
        "Ballaststoffe unterstützen die Verdauung"
    ]
}

def get_script(category: str, script_id: str) -> dict:
    """Hole ein spezifisches Script."""
    if category in HERBALIFE_SCRIPTS and script_id in HERBALIFE_SCRIPTS[category]:
        return HERBALIFE_SCRIPTS[category][script_id]
    return None

def get_all_scripts() -> dict:
    """Hole alle Herbalife Scripts."""
    return HERBALIFE_SCRIPTS

def get_compliance_rules() -> dict:
    """Hole Compliance-Regeln."""
    return HERBALIFE_COMPLIANCE