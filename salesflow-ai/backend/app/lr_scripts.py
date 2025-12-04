"""
LR HEALTH & BEAUTY MLM SCRIPTS
==============================
50 praxiserprobte Skripte für LR-Vertrieb
"""

LR_SCRIPTS = {
    "pitches": {
        "aloe_vera_experte": {
            "name": "Der Aloe Vera Experte Pitch",
            "text": "Hallo [Name], kurze Frage: Nutzt du schon Aloe Vera für deine Gesundheit? Die meisten kennen es nur als Sonnenbrand-Gel. Aber wusstest du, dass hochwertiges Aloe Vera Gel von innen wahre Wunder für Verdauung und Immunsystem bewirken kann? Ich zeig dir gern den Unterschied.",
            "channel": ["whatsapp", "instagram"],
            "situation": "cold_outreach"
        },
        "made_in_germany": {
            "name": "Der 'Made in Germany' Pitch",
            "text": "Hey [Name], bei Nahrungsergänzung und Kosmetik achte ich extrem auf Qualität. Deshalb arbeite ich mit LR – deutsche Produktion, Fresenius-geprüft, höchste Standards. Kennst du die Marke schon?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "quality_focused"
        },
        "stress_level": {
            "name": "Der Stress-Level Pitch",
            "text": "Hallo [Name], wie gehst du mit Stress um? Viele unterschätzen, wie sehr Stress den Körper belastet. Ich nutze ein Konzept aus Aloe Vera und speziellen Vitalstoffen, das mir hilft, entspannter durch den Tag zu kommen. Interesse?",
            "channel": ["whatsapp", "instagram"],
            "situation": "stress_focused"
        },
        "haut_schoenheit": {
            "name": "Der Haut & Schönheit Pitch",
            "text": "Hey [Name], ich sehe, du achtest auf dein Äußeres. Ich hab eine Frage: Pflegst du deine Haut auch von INNEN? Wahre Schönheit kommt von innen – mit den richtigen Nährstoffen. Ich zeig dir, was ich meine.",
            "channel": ["instagram", "whatsapp"],
            "situation": "beauty_interested"
        },
        "parfum_qualitaet": {
            "name": "Der Parfum/Kosmetik Pitch",
            "text": "Hallo [Name], magst du hochwertige Düfte? Ich arbeite mit einer Marke, die Designer-Düfte in Premium-Qualität anbietet – aber zu einem Bruchteil des Preises. Klingt interessant?",
            "channel": ["instagram", "whatsapp"],
            "situation": "fragrance_interested"
        },
        "immunsystem": {
            "name": "Der Immunsystem Pitch",
            "text": "Hey [Name], gerade in der aktuellen Zeit: Was tust du für dein Immunsystem? Ich hab ein Konzept aus Aloe Vera, Colostrum und speziellen Vitalstoffen, das mein Wohlbefinden komplett verändert hat.",
            "channel": ["whatsapp", "instagram"],
            "situation": "health_conscious"
        },
        "nebeneinkommen": {
            "name": "Der Business-Opportunity Pitch",
            "text": "Hallo [Name], ich weiß nicht, ob das was für dich ist, aber: Ich baue mir gerade ein zweites Standbein auf – von zu Hause, flexibel, mit Produkten die ich selbst liebe. Falls du offen bist für neue Möglichkeiten, erzähl ich dir gern mehr.",
            "channel": ["whatsapp", "linkedin", "instagram"],
            "situation": "business_opportunity"
        },
        "fresenius_siegel": {
            "name": "Der Qualitäts-Siegel Pitch",
            "text": "Hey [Name], bei Supplements bin ich super kritisch. Deshalb war mir wichtig: Die Produkte, die ich nehme, sind vom SGS Institut Fresenius geprüft – unabhängige Qualitätskontrolle. Das gibt mir Sicherheit. Dir auch?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "skeptical_lead"
        },
        "zeitmanagement": {
            "name": "Der Zeitmanagement Pitch",
            "text": "Hallo [Name], du wirkst wie jemand mit wenig Zeit. Ich hab eine Lösung gefunden: 2 Minuten am Tag für meine Gesundheitsroutine – Aloe Vera Gel + ein paar Kapseln. Fertig. Keine komplizierten Pläne. Interesse?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "busy_professional"
        },
        "starter_set": {
            "name": "Der Starter-Set Pitch",
            "text": "Hey [Name], anstatt viel zu erklären: Wir haben ein Starter-Set zum Testen. So kannst du selbst erleben, ob die Produkte zu dir passen. Kein Risiko, nur Erfahrung sammeln. Klingt fair?",
            "channel": ["whatsapp", "instagram"],
            "situation": "low_barrier"
        }
    },
    
    "wert_fragen": {
        "gesundheitsinvestition": {
            "name": "Die Gesundheitsinvestition-Frage",
            "text": "Was investierst du aktuell monatlich in deine Gesundheit? Die meisten geben mehr für Kaffee aus als für Prävention. Was wäre es dir wert, langfristig fit und vital zu bleiben?",
            "situation": "qualifying"
        },
        "energie_frage": {
            "name": "Die Energie-Frage",
            "text": "Wie oft fühlst du dich müde oder energielos, obwohl du genug schläfst? Was wäre es dir wert, jeden Tag mit echter Energie aufzuwachen?",
            "situation": "energy_focused"
        },
        "hautbild_frage": {
            "name": "Die Hautbild-Frage",
            "text": "Wie zufrieden bist du mit deinem Hautbild? Was wäre es dir wert, wenn deine Haut von innen heraus strahlt – ohne teure Cremes?",
            "situation": "beauty_focused"
        },
        "zeitwert_frage": {
            "name": "Die Zeitwert-Frage",
            "text": "Wie viel Zeit verbringst du mit Recherche nach den richtigen Produkten? Was wäre es dir wert, ein System zu haben, das einfach funktioniert?",
            "situation": "convenience_focused"
        },
        "vertrauen_frage": {
            "name": "Die Vertrauens-Frage",
            "text": "Wie sehr vertraust du den Supplements, die du aktuell nimmst? Was wäre es dir wert, 100% sicher zu sein, dass die Qualität stimmt?",
            "situation": "trust_building"
        }
    },
    
    "einwand_handling": {
        "zu_teuer": {
            "name": "Einwand: Zu teuer",
            "einwand": "Das ist mir zu teuer",
            "antwort": "Verstehe ich. Lass uns mal rechnen: Das Aloe Vera Gel kostet pro Tag etwa 2€. Weniger als ein Kaffee. Dafür bekommst du geprüfte Qualität, die wirklich wirkt. Und als Partner bekommst du sogar Rabatt. Soll ich dir zeigen, wie das funktioniert?",
            "situation": "price_objection"
        },
        "ist_mlm": {
            "name": "Einwand: Ist das MLM?",
            "einwand": "Ist das Network Marketing?",
            "antwort": "Ja, LR nutzt Direktvertrieb. Das bedeutet: Statt Millionen für TV-Werbung auszugeben, investiert LR in Produktqualität und belohnt Empfehlungen. Du bekommst persönliche Beratung statt anonymem Online-Kauf. Ist das wirklich schlecht?",
            "situation": "mlm_concern"
        },
        "kenne_marke_nicht": {
            "name": "Einwand: Kenne die Marke nicht",
            "einwand": "Ich kenne LR gar nicht",
            "antwort": "Das geht vielen so – LR macht keine klassische Werbung. Aber: LR ist seit über 35 Jahren am Markt, einer der größten Direktvertriebe Europas, produziert in Deutschland und ist Fresenius-geprüft. Die Fakten sprechen für sich.",
            "situation": "brand_unknown"
        },
        "hab_schon_produkte": {
            "name": "Einwand: Habe schon Produkte",
            "einwand": "Ich nutze schon andere Produkte",
            "antwort": "Super, dass du schon auf dich achtest! Darf ich fragen, welche Marke? Oft ist der Unterschied die Qualität und Bioverfügbarkeit. Viele meiner Kunden waren überrascht, wie anders sich LR-Produkte anfühlen. Ein Vergleich lohnt sich.",
            "situation": "competitor_products"
        },
        "keine_zeit": {
            "name": "Einwand: Keine Zeit",
            "einwand": "Ich habe keine Zeit dafür",
            "antwort": "Perfekt – genau für Menschen wie dich ist das Konzept gemacht! 30ml Aloe Gel morgens, fertig. Keine komplizierten Routinen. 30 Sekunden pro Tag. Die Frage ist nicht, ob du Zeit hast, sondern ob du dir diese 30 Sekunden wert bist.",
            "situation": "time_objection"
        },
        "muss_partner_fragen": {
            "name": "Einwand: Muss Partner fragen",
            "einwand": "Ich muss erst meinen Partner fragen",
            "antwort": "Absolut verständlich! Soll ich euch beiden gemeinsam die Infos zeigen? Oder ich schicke dir Material, das du mit deinem Partner durchschauen kannst. Wann würde das passen?",
            "situation": "partner_approval"
        },
        "glaube_nicht_dran": {
            "name": "Einwand: Glaube nicht an Supplements",
            "einwand": "Ich glaube nicht an Nahrungsergänzung",
            "antwort": "Das verstehe ich – der Markt ist voll mit Müll. Genau deshalb setze ich auf Fresenius-geprüfte Qualität. LR investiert in echte Wirksamkeit, nicht in Marketing. Probier es 30 Tage – wenn du nichts merkst, war's das.",
            "situation": "supplement_skeptic"
        },
        "aus_apotheke": {
            "name": "Einwand: Kaufe in Apotheke",
            "einwand": "Ich kaufe lieber in der Apotheke",
            "antwort": "Apotheken-Qualität ist wichtig, absolut. LR hat die gleichen Qualitätsstandards – Fresenius-Siegel, deutsche Produktion. Der Unterschied: Du bekommst persönliche Beratung und oft bessere Preise. Wo ist der Nachteil?",
            "situation": "pharmacy_preference"
        },
        "schmeckt_nicht": {
            "name": "Einwand: Aloe schmeckt nicht",
            "einwand": "Aloe Vera schmeckt doch eklig",
            "antwort": "Haha, das dachte ich auch! Aber LR hat verschiedene Geschmacksrichtungen – Pfirsich, Honig, sogar Sivera (herb). Die meisten finden eine Variante, die ihnen schmeckt. Welche Geschmacksrichtung magst du generell?",
            "situation": "taste_concern"
        },
        "erst_recherchieren": {
            "name": "Einwand: Muss erst recherchieren",
            "einwand": "Ich muss erst selbst recherchieren",
            "antwort": "Sehr gut, mach das! Ich schicke dir die offiziellen Infos, Studien und das Fresenius-Zertifikat. Dann kannst du in Ruhe alles prüfen. Wann sollen wir uns danach kurz austauschen?",
            "situation": "research_needed"
        }
    },
    
    "follow_up": {
        "nach_info": {
            "name": "Nach Info-Versand (24h)",
            "text": "Hey [Name], konntest du dir die Infos zu LR anschauen? Was hat dich am meisten angesprochen – die Produkte oder die Möglichkeit?",
            "timing": "24h_after_info"
        },
        "nach_produkttest": {
            "name": "Nach Produkt-Test (Tag 3)",
            "text": "Hi [Name], du testest jetzt seit ein paar Tagen das Aloe Vera Gel. Wie geht's dir damit? Manche merken schon nach wenigen Tagen einen Unterschied bei der Verdauung.",
            "timing": "day3_product"
        },
        "nach_produkttest_woche": {
            "name": "Nach Produkt-Test (Woche 1)",
            "text": "Hey [Name], eine Woche mit LR! Wie fühlst du dich? Die meisten berichten von mehr Energie und besserer Verdauung. Was ist deine Erfahrung?",
            "timing": "week1_product"
        },
        "business_interesse": {
            "name": "Business-Interesse Follow-Up",
            "text": "Hallo [Name], du hattest ja Interesse am Business-Aspekt gezeigt. Ich hab diese Woche Zeit für ein kurzes Gespräch, wo ich dir zeige, wie der Einstieg funktioniert und was realistisch möglich ist. Wann passt dir?",
            "timing": "business_followup"
        },
        "social_proof": {
            "name": "Social Proof Follow-Up",
            "text": "Hey [Name], kurzes Update: [Kundin X] hat mir gerade geschrieben, dass ihre Verdauungsprobleme nach 3 Wochen Aloe Vera viel besser sind. Dachte, das motiviert dich vielleicht.",
            "timing": "social_proof"
        },
        "event_einladung": {
            "name": "Event-Einladung",
            "text": "Hi [Name], wir machen am [Datum] ein Online-Event zu [Thema]. Unverbindlich, kostenlos, und du lernst mehr über die Produkte und die Menschen dahinter. Kommst du dazu?",
            "timing": "event_invite"
        },
        "sanfter_stupser": {
            "name": "Sanfter Reminder",
            "text": "Hey [Name], nur ein kurzer Check-in. Hast du noch Fragen zu LR oder den Produkten? Ich bin da, wenn du mehr wissen willst.",
            "timing": "soft_reminder"
        },
        "bestandskunde_nachkauf": {
            "name": "Bestandskunde Nachkauf",
            "text": "Hi [Name], dein Aloe Vera Gel müsste bald leer sein. Soll ich dir Nachschub bestellen? Ich kann dir auch zeigen, wie du als Partner günstiger bekommst.",
            "timing": "reorder_reminder"
        },
        "upgrade_pitch": {
            "name": "Upgrade/Erweiterung",
            "text": "Hey [Name], du nutzt ja schon das Aloe Gel und bist zufrieden. Viele ergänzen das mit [Produkt X] für noch bessere Ergebnisse. Soll ich dir dazu Infos schicken?",
            "timing": "upsell"
        },
        "referral_ask": {
            "name": "Empfehlungs-Anfrage",
            "text": "Hi [Name], freut mich, dass du mit den LR-Produkten zufrieden bist! Kennst du jemanden, dem das auch helfen könnte? Ich würde mich über eine Empfehlung sehr freuen.",
            "timing": "referral"
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "text": "Hey [Name], ich sehe, du hast's gelesen aber noch nicht geantwortet. Kein Stress – eine Zahl reicht: 1 = Interesse, aber später. 2 = Kein Interesse. 3 = Schick mir mehr Infos.",
            "situation": "read_no_reply"
        },
        "empathisch": {
            "name": "Empathischer Check-in",
            "text": "Hi [Name], ich weiß, das Leben ist manchmal voll. Ist das Thema Gesundheit/LR gerade einfach nicht Prio? Total okay – sag mir nur kurz Bescheid.",
            "situation": "empathetic"
        },
        "multiple_choice": {
            "name": "Multiple Choice",
            "text": "Hey [Name], kurze Umfrage 😊: A) Interessiert, aber gerade keine Zeit. B) Hab's vergessen, danke für die Erinnerung! C) Nicht mein Ding. Was trifft zu?",
            "situation": "fun_multiple_choice"
        },
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg",
            "text": "Hi [Name], ich will dich nicht nerven. Wenn LR nichts für dich ist, sag einfach kurz Bescheid – dann weiß ich, woran ich bin. Alles gut!",
            "situation": "easy_out"
        },
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "text": "Hey [Name], mein System erinnert mich, nachzufassen. Aber ehrlich: Ist das Thema Gesundheit/Zusatzeinkommen gerade überhaupt relevant für dich?",
            "situation": "pattern_break"
        },
        "value_bump": {
            "name": "Value Bump",
            "text": "Hey [Name], nur kurz: Wir haben gerade ein Sonder-Set im Angebot – perfekt zum Testen. Falls das Timing jetzt besser passt?",
            "situation": "offer_based"
        },
        "archivieren": {
            "name": "Erlaubnis zum Archivieren",
            "text": "Hi [Name], ich räume meine Kontakte auf. Soll ich dich aus meiner 'LR-Interessenten' Liste nehmen, oder besteht grundsätzlich noch Interesse?",
            "situation": "cleanup"
        },
        "break_up": {
            "name": "Break-Up Message",
            "text": "Hey [Name], da ich nichts höre, gehe ich davon aus, dass es gerade nicht passt. Falls sich das ändert – du weißt, wo du mich findest! Alles Gute 🙌",
            "situation": "final_message"
        },
        "langzeit_checkin": {
            "name": "Langzeit Check-in",
            "text": "Hi [Name], wir hatten vor einer Weile über LR gesprochen. Hat sich bei dir was verändert? Vielleicht ist jetzt ein besserer Zeitpunkt?",
            "situation": "long_term"
        },
        "winter_health": {
            "name": "Saisonaler Hook (Winter)",
            "text": "Hey [Name], die kalte Jahreszeit kommt – viele denken jetzt ans Immunsystem. Ist das Thema LR/Aloe Vera vielleicht gerade aktueller für dich?",
            "situation": "seasonal"
        }
    },
    
    "closing": {
        "starter_close": {
            "name": "Starter-Set Abschluss",
            "text": "Der einfachste Weg: Das Starter-Set. Du testest die Produkte, und wenn's nicht passt, war's das. Kein Abo, kein Druck. Sollen wir das starten?",
            "situation": "low_barrier_close"
        },
        "partner_close": {
            "name": "Partner-Registrierung Close",
            "text": "Wenn du die Produkte eh nutzen willst, macht Partner-Registrierung Sinn: Du sparst sofort 28% und kannst bei Gefallen weiterempfehlen. Soll ich dir zeigen, wie das geht?",
            "situation": "partner_close"
        },
        "dreissig_tage_test": {
            "name": "30-Tage Test Close",
            "text": "Mein Vorschlag: 30 Tage testen. Wenn du dich danach nicht besser fühlst, war's das. Aber die meisten wollen nach 30 Tagen nicht mehr aufhören. Deal?",
            "situation": "trial_close"
        },
        "choice_close": {
            "name": "Choice Close (Geschmack)",
            "text": "Perfekt, dann lass uns starten! Welche Geschmacksrichtung beim Aloe Gel: Pfirsich, Honig oder Sivera (herb)?",
            "situation": "choice_close"
        },
        "onboarding_close": {
            "name": "Onboarding Close",
            "text": "Super Entscheidung! 🎉 Ich richte dir alles ein und schicke dir eine Anleitung, wie du am besten startest. In 2-3 Tagen ist alles da. Willkommen bei LR!",
            "situation": "welcome_close"
        }
    }
}

LR_COMPLIANCE = {
    "verboten": [
        "heilt Krankheiten",
        "Wundermittel",
        "garantierte Ergebnisse",
        "ersetzt Medikamente",
        "Heilversprechen"
    ],
    "erlaubt": [
        "unterstützt das Wohlbefinden",
        "Fresenius-geprüfte Qualität",
        "Made in Germany",
        "trägt zu normalen Körperfunktionen bei",
        "hochwertige Inhaltsstoffe"
    ],
    "health_claims": [
        "Vitamin C trägt zur normalen Funktion des Immunsystems bei",
        "Vitamin D trägt zur Erhaltung normaler Knochen bei",
        "Zink trägt zur normalen kognitiven Funktion bei"
    ]
}

def get_script(category: str, script_id: str) -> dict:
    """Hole ein spezifisches Script."""
    if category in LR_SCRIPTS and script_id in LR_SCRIPTS[category]:
        return LR_SCRIPTS[category][script_id]
    return None

def get_all_scripts() -> dict:
    """Hole alle LR Scripts."""
    return LR_SCRIPTS

def get_compliance_rules() -> dict:
    """Hole Compliance-Regeln."""
    return LR_COMPLIANCE
