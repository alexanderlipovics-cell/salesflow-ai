"""
FELLO / SALES FLOW AI - VERKAUFSSKRIPTE
=======================================
50 praxiserprobte Skripte zum Verkauf von Sales Flow AI / FELLO
Für Networker, Makler, Finanzberater, Coaches
"""

FELLO_SCRIPTS = {
    "pitches": {
        "follow_up_chaos": {
            "name": "Der 'Follow-Up Chaos' Pitch",
            "text": "Hallo [Name], kurze Frage: Wie viele Leute hast du in deiner Kontaktliste, die du schon ewig nicht mehr angeschrieben hast? Bei den meisten Networkern/Maklern sind das hunderte. FELLO hilft dir, JEDEN systematisch zu bearbeiten – ohne dass jemand durchrutscht.",
            "channel": ["whatsapp", "linkedin", "instagram"],
            "situation": "cold_outreach",
            "vertical": "all"
        },
        "ki_coach": {
            "name": "Der 'KI-Coach' Pitch",
            "text": "Hey [Name], stell dir vor: Ein Sales-Coach, der 24/7 verfügbar ist und dir für JEDEN Kontakt die perfekte Nachricht vorschlägt. Kein Grübeln mehr, was du schreiben sollst. Das ist FELLO – dein KI-Vertriebsassistent.",
            "channel": ["whatsapp", "instagram"],
            "situation": "coach_angle",
            "vertical": "all"
        },
        "zeit_zurueck": {
            "name": "Der 'Zeit zurück' Pitch",
            "text": "Hallo [Name], wie viel Zeit verbringst du täglich damit, Follow-ups zu planen und Nachrichten zu schreiben? Die meisten sagen 1-2 Stunden. FELLO kann das auf 15 Minuten reduzieren – bei MEHR Ergebnissen. Interesse?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "time_focused",
            "vertical": "all"
        },
        "networker_spezifisch": {
            "name": "Der Networker-Pitch",
            "text": "Hey [Name], als Networker weißt du: Kontakte sind Gold – aber nur wenn du sie auch bearbeitest. FELLO ist wie eine digitale Upline, die dir sagt, wen du heute anschreiben sollst und WAS. Dein Sponsor 24/7 in der Hosentasche.",
            "channel": ["whatsapp", "instagram"],
            "situation": "networker",
            "vertical": "network_marketing"
        },
        "makler_spezifisch": {
            "name": "Der Makler-Pitch",
            "text": "Hallo [Name], als Makler hast du eine goldene Liste: ehemalige Käufer, Verkäufer, Interessenten. Aber wer hat Zeit, alle regelmäßig zu kontaktieren? FELLO erinnert dich automatisch und schlägt die perfekte Nachricht vor. Mehr Empfehlungen, weniger Aufwand.",
            "channel": ["whatsapp", "linkedin"],
            "situation": "makler",
            "vertical": "immo"
        },
        "finanzberater_spezifisch": {
            "name": "Der Finanzberater-Pitch",
            "text": "Hallo [Name], bei Finanzberatung ist regelmäßiger Kontakt der Schlüssel zu Vertrauen und Cross-Selling. FELLO hilft dir, JEDEN Bestandskunden systematisch zu betreuen – ohne dass jemand vergessen wird.",
            "channel": ["whatsapp", "linkedin"],
            "situation": "finance",
            "vertical": "finance"
        },
        "ghostbuster_hook": {
            "name": "Der Ghostbuster-Pitch",
            "text": "Hey [Name], wie viele Leute haben dich 'geghostet' – auf gelesen, aber nie geantwortet? FELLO hat einen 'Ghostbuster', der automatisch die perfekte Reaktivierungs-Nachricht vorschlägt. Die meisten holen damit 20-30% ihrer toten Kontakte zurück.",
            "channel": ["whatsapp", "instagram"],
            "situation": "ghostbuster_angle",
            "vertical": "all"
        },
        "compliance_pitch": {
            "name": "Der Compliance-Pitch",
            "text": "Hallo [Name], ich weiß, im Network Marketing ist Compliance ein heikles Thema. FELLO hat einen eingebauten Compliance-Checker, der deine Nachrichten auf problematische Formulierungen prüft. So bist du immer auf der sicheren Seite.",
            "channel": ["whatsapp", "linkedin"],
            "situation": "compliance_focused",
            "vertical": "network_marketing"
        },
        "keine_ausreden": {
            "name": "Der 'Keine Ausreden' Pitch",
            "text": "Hey [Name], die häufigste Ausrede im Vertrieb: 'Ich weiß nicht, was ich schreiben soll.' Mit FELLO hast du diese Ausrede nie wieder. Die KI gibt dir für jede Situation das perfekte Script. Du musst nur noch auf Senden klicken.",
            "channel": ["whatsapp", "instagram"],
            "situation": "no_excuses",
            "vertical": "all"
        },
        "demo_angebot": {
            "name": "Der Demo-Pitch",
            "text": "Hallo [Name], ich könnte dir viel erzählen – aber am besten zeige ich es dir. 15 Minuten Bildschirmfreigabe, ich zeig dir FELLO live und wie es für [deine Branche] funktioniert. Wann hast du Zeit?",
            "channel": ["whatsapp", "linkedin"],
            "situation": "demo_offer",
            "vertical": "all"
        }
    },
    
    "wert_fragen": {
        "kontakte_wert": {
            "name": "Die Kontakte-Wert Frage",
            "text": "Wie viele Kontakte hast du in deiner Liste, die du länger als 3 Monate nicht angeschrieben hast? Was wäre es dir wert, wenn JEDER dieser Kontakte reaktiviert würde?",
            "situation": "qualifying"
        },
        "zeit_wert": {
            "name": "Die Zeit-Wert Frage",
            "text": "Wie viele Stunden pro Woche verbringst du mit Follow-ups und Nachrichten schreiben? Was wäre es dir wert, diese Zeit zu halbieren – bei besseren Ergebnissen?",
            "situation": "time_value"
        },
        "abschluesse_wert": {
            "name": "Die Abschlüsse-Wert Frage",
            "text": "Was ist ein durchschnittlicher Abschluss bei dir wert? Wenn FELLO dir hilft, nur EINEN zusätzlichen Abschluss pro Monat zu machen, hat sich das Tool x-fach bezahlt.",
            "situation": "roi_calculation"
        },
        "stress_wert": {
            "name": "Die Stress-Wert Frage",
            "text": "Wie oft hast du ein schlechtes Gewissen, weil du Kontakte vergessen hast? Was wäre es dir wert, diesen Stress loszuwerden und zu wissen, dass NIEMAND durchrutscht?",
            "situation": "stress_relief"
        },
        "profi_wert": {
            "name": "Die Profi-Wert Frage",
            "text": "Was unterscheidet die Top-10% in deiner Branche vom Rest? Systematische Kontaktpflege. Was wäre es dir wert, dieses System zu haben?",
            "situation": "professionalism"
        }
    },
    
    "einwand_handling": {
        "zu_teuer": {
            "name": "Einwand: Zu teuer",
            "einwand": "Das ist mir zu teuer",
            "antwort": "Verstehe ich. Lass uns rechnen: FELLO kostet €29-119/Monat. Wenn du dadurch nur EINEN zusätzlichen Abschluss pro Monat machst, was ist der wert? Bei den meisten Networkern/Maklern ist das ein Vielfaches. FELLO ist kein Kostenfaktor, sondern ein ROI-Multiplikator.",
            "situation": "price_objection"
        },
        "kein_zeit": {
            "name": "Einwand: Keine Zeit",
            "einwand": "Ich habe keine Zeit, noch ein Tool zu lernen",
            "antwort": "Genau deshalb brauchst du FELLO! Es SPART Zeit statt sie zu kosten. Die Einrichtung dauert 10 Minuten, danach sparst du täglich 30-60 Minuten. Die KI macht die Arbeit, du musst nur noch klicken.",
            "situation": "time_objection"
        },
        "hab_schon_crm": {
            "name": "Einwand: Habe schon CRM",
            "einwand": "Ich habe schon ein CRM / Excel",
            "antwort": "Super! FELLO ist kein Ersatz für dein CRM – es ist die INTELLIGENZ, die fehlt. Ein CRM speichert Kontakte. FELLO sagt dir, WEN du WANN mit WELCHER Nachricht kontaktieren sollst. Das ist der Unterschied zwischen Daten sammeln und Umsatz machen.",
            "situation": "existing_tool"
        },
        "klappt_auch_so": {
            "name": "Einwand: Klappt auch so",
            "einwand": "Ich komme auch so zurecht",
            "antwort": "Das glaube ich dir! Die Frage ist: Wie viel Potenzial lässt du liegen? Die meisten haben hunderte Kontakte, die sie nicht bearbeiten. FELLO hilft dir, ALLES rauszuholen. Von 'zurechtkommen' zu 'dominieren' – das ist der Unterschied.",
            "situation": "status_quo"
        },
        "ist_das_sicher": {
            "name": "Einwand: Ist das sicher/seriös?",
            "einwand": "Ist das sicher? Wer steckt dahinter?",
            "antwort": "Berechtigte Frage! FELLO wird in Europa gehostet, ist DSGVO-konform, deine Daten gehören dir. Wir nutzen modernste Verschlüsselung. Gegründet von Vertrieblern für Vertriebler – wir wissen, worauf es ankommt.",
            "situation": "trust_concern"
        },
        "brauche_ich_nicht": {
            "name": "Einwand: Brauche ich nicht",
            "einwand": "Ich brauche das nicht",
            "antwort": "Kann sein! Aber lass mich fragen: Wie viele Kontakte in deiner Liste hast du diesen Monat NICHT angeschrieben? Wenn die Antwort 'einige' ist, dann könnte FELLO den Unterschied machen. Denn jeder nicht kontaktierte Lead ist verlorener Umsatz.",
            "situation": "no_need"
        },
        "probier_erstmal": {
            "name": "Einwand: Will erst testen",
            "einwand": "Ich will das erst mal testen",
            "antwort": "Perfekt! Genau dafür haben wir einen kostenlosen Testzeitraum. Du kannst FELLO 14 Tage ausprobieren und selbst sehen, ob es funktioniert. Kein Risiko, nur Erkenntnisgewinn. Sollen wir dich einrichten?",
            "situation": "trial_request"
        },
        "ki_ersetzt_mich": {
            "name": "Einwand: KI ersetzt mich",
            "einwand": "Ich will keine KI, das ist unpersönlich",
            "antwort": "Verstehe die Sorge! Aber FELLO ersetzt dich nicht – es unterstützt dich. Die KI schlägt vor, DU entscheidest. Die Nachricht kommt von dir, in deinem Stil. FELLO ist wie ein Assistent, der dir zuarbeitet, nicht wie ein Roboter, der für dich spricht.",
            "situation": "ai_concern"
        },
        "spaeter_vielleicht": {
            "name": "Einwand: Später vielleicht",
            "einwand": "Vielleicht später, nicht jetzt",
            "antwort": "Klar, ich verstehe. Aber überleg mal: Jede Woche ohne System sind Kontakte, die vergessen werden, Abschlüsse, die nicht passieren. Wann ist der 'richtige Zeitpunkt', Geld liegen zu lassen? Lass uns wenigstens den Test starten.",
            "situation": "timing_objection"
        },
        "wie_funktioniert": {
            "name": "Einwand: Wie funktioniert das?",
            "einwand": "Wie genau funktioniert das?",
            "antwort": "Kurz erklärt: Du importierst deine Kontakte (oder trägst sie ein). FELLO analysiert, wer wann kontaktiert werden sollte. Die KI schlägt dir die perfekte Nachricht vor – basierend auf Branche, Phase und Situation. Du klickst, sendest, fertig. Willst du es live sehen?",
            "situation": "how_it_works"
        }
    },
    
    "follow_up": {
        "nach_demo": {
            "name": "Nach Demo (24h)",
            "text": "Hey [Name], danke für deine Zeit gestern! Wie hat dir die Demo gefallen? Welches Feature hat dich am meisten angesprochen?",
            "timing": "24h_after_demo"
        },
        "nach_info": {
            "name": "Nach Info-Versand",
            "text": "Hi [Name], konntest du dir die Infos zu FELLO anschauen? Hast du Fragen dazu, wie es für [deine Branche] funktioniert?",
            "timing": "24h_after_info"
        },
        "trial_tag3": {
            "name": "Trial Tag 3",
            "text": "Hey [Name], du testest FELLO jetzt seit 3 Tagen. Wie läuft's? Hast du schon Kontakte importiert und die KI-Vorschläge gesehen?",
            "timing": "trial_day3"
        },
        "trial_tag7": {
            "name": "Trial Tag 7",
            "text": "Hi [Name], eine Woche FELLO! Konntest du schon ein paar Follow-ups rausschicken? Die meisten sehen jetzt die ersten Reaktionen. Wie ist dein Feedback?",
            "timing": "trial_day7"
        },
        "trial_ende": {
            "name": "Trial Ende",
            "text": "Hey [Name], dein Testzeitraum endet bald. Wie war deine Erfahrung? Sollen wir dich auf einen bezahlten Plan upgraden, damit du weiter alle Features nutzen kannst?",
            "timing": "trial_ending"
        },
        "bestandskunde_check": {
            "name": "Bestandskunden Check-in",
            "text": "Hi [Name], wie läuft's mit FELLO? Nutzt du die neuen Features wie [Feature X]? Wenn du Fragen hast, bin ich für dich da!",
            "timing": "customer_checkin"
        },
        "feature_update": {
            "name": "Feature-Update",
            "text": "Hey [Name], wir haben gerade [neues Feature] gelauncht – perfekt für [Use Case]. Hast du's schon gesehen? Ich zeig dir gern, wie es funktioniert.",
            "timing": "feature_announcement"
        },
        "referral_ask": {
            "name": "Empfehlungs-Anfrage",
            "text": "Hi [Name], freut mich, dass du FELLO erfolgreich nutzt! 🙏 Kennst du andere Networker/Makler/Berater, denen das auch helfen würde? Für Empfehlungen gibt's [Bonus].",
            "timing": "referral"
        },
        "upsell_growth": {
            "name": "Upgrade zu Growth",
            "text": "Hey [Name], du bist ja auf dem Starter-Plan. Ich sehe, du nutzt FELLO intensiv – hast du schon mal über Growth nachgedacht? Damit bekommst du [Ghostbuster, mehr Kontakte, etc.].",
            "timing": "upsell"
        },
        "reaktivierung": {
            "name": "Reaktivierung Ex-Kunde",
            "text": "Hi [Name], ich hab gesehen, du hattest FELLO vor einiger Zeit getestet. Wie sieht dein Follow-up System aktuell aus? Wir haben seitdem viel verbessert – vielleicht ist jetzt ein guter Zeitpunkt für einen neuen Blick.",
            "timing": "win_back"
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "text": "Hey [Name], ich sehe, du hast's gelesen. Eine Zahl reicht: 1 = Interesse, aber gerade keine Zeit. 2 = Kein Interesse mehr. 3 = Schick mir mehr Infos.",
            "situation": "read_no_reply"
        },
        "empathisch": {
            "name": "Empathischer Check-in",
            "text": "Hi [Name], der Alltag ist voll – ich verstehe. Ist das Thema 'Vertrieb systematisieren' gerade einfach nicht Prio? Sag mir kurz Bescheid.",
            "situation": "empathetic"
        },
        "multiple_choice": {
            "name": "Multiple Choice",
            "text": "Hey [Name], kurze Umfrage: A) Interessiert, aber gerade Chaos. B) Hab andere Prioritäten. C) Brauch mehr Infos. Was trifft zu?",
            "situation": "fun_multiple_choice"
        },
        "roi_reminder": {
            "name": "ROI Reminder",
            "text": "Hi [Name], kurze Rechnung: Wenn FELLO dir nur EINEN zusätzlichen Abschluss pro Monat bringt, was ist der wert? Ist das Thema noch interessant oder soll ich dich in Ruhe lassen?",
            "situation": "roi_based"
        },
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg",
            "text": "Hey [Name], ich will dich nicht nerven. Wenn FELLO nichts für dich ist, sag einfach kurz Bescheid – dann weiß ich, woran ich bin. Alles gut!",
            "situation": "easy_out"
        },
        "pattern_interrupt": {
            "name": "Pattern Interrupt",
            "text": "Hi [Name], mein eigenes FELLO sagt mir, ich soll nachfassen 😉 Aber ganz ehrlich: Ist das Thema 'Vertrieb mit KI-Support' für dich relevant?",
            "situation": "pattern_break"
        },
        "social_proof": {
            "name": "Social Proof Ghost",
            "text": "Hey [Name], [Nutzer X] hat mir gerade geschrieben, dass er mit FELLO letzten Monat [Y Abschlüsse] gemacht hat. Ich dachte, das könnte dich motivieren. Noch Interesse?",
            "situation": "social_proof"
        },
        "archivieren": {
            "name": "Erlaubnis zum Archivieren",
            "text": "Hi [Name], ich räume meine Kontakte auf (mit FELLO natürlich 😉). Soll ich dich aus meiner 'Interessenten' Liste nehmen, oder besteht grundsätzlich noch Interesse?",
            "situation": "cleanup"
        },
        "break_up": {
            "name": "Break-Up Message",
            "text": "Hey [Name], da ich nichts höre, gehe ich davon aus, dass es gerade nicht passt. Falls du mal einen KI-Sales-Assistenten brauchst – du weißt, wo du mich findest. Viel Erfolg!",
            "situation": "final_message"
        },
        "langzeit_checkin": {
            "name": "Langzeit Check-in",
            "text": "Hi [Name], wir hatten vor einer Weile über FELLO gesprochen. Wie sieht dein Follow-up System aktuell aus? Wir haben seitdem viel Neues gebaut.",
            "situation": "long_term"
        }
    },
    
    "closing": {
        "trial_close": {
            "name": "Trial Abschluss",
            "text": "Der einfachste nächste Schritt: 14 Tage testen. Kostenlos, keine Kreditkarte nötig. Wenn's nicht passt, war's das. Wenn doch, hast du dein Vertriebsproblem gelöst. Sollen wir dich einrichten?",
            "situation": "trial_close"
        },
        "demo_close": {
            "name": "Demo Abschluss",
            "text": "Lass mich dir FELLO in 15 Minuten zeigen. Bildschirmfreigabe, ich führe dich durch, du siehst es live. Danach entscheidest du. Wann passt dir?",
            "situation": "demo_close"
        },
        "roi_close": {
            "name": "ROI Abschluss",
            "text": "Lass uns rechnen: FELLO Starter kostet €29/Monat. Ein Abschluss bei dir bringt [X€]. Wenn FELLO dir nur EINEN zusätzlichen Abschluss alle 3 Monate bringt, hast du [Y]% ROI. Macht das Sinn?",
            "situation": "roi_close"
        },
        "founding_member_close": {
            "name": "Founding Member Abschluss",
            "text": "Wir haben noch ein paar Founding Member Plätze: €499 einmalig, lebenslang Growth-Plan. Das sind [X€/Monat] nach 2 Jahren. Wenn du weißt, dass du FELLO langfristig nutzt, ist das ein No-Brainer. Interesse?",
            "situation": "founding_close"
        },
        "onboarding_close": {
            "name": "Onboarding Close",
            "text": "Super Entscheidung! 🎉 Ich richte dir FELLO ein und wir haben einen 15-Minuten Onboarding-Call, wo ich dir alles zeige. Morgen früh oder nachmittag – was passt besser?",
            "situation": "welcome_close"
        }
    }
}

FELLO_COMPLIANCE = {
    "hinweise": [
        "FELLO ist ein Assistenz-Tool, keine Automatisierung",
        "Die KI schlägt vor, der Mensch entscheidet",
        "DSGVO-konform, Daten in Europa",
        "Keine falschen Versprechungen zu Ergebnissen"
    ],
    "verboten": [
        "garantierte X Abschlüsse",
        "automatische Nachrichten ohne Prüfung",
        "Spam-Versprechen",
        "unrealistische ROI-Garantien"
    ],
    "erlaubt": [
        "Zeitersparnis",
        "systematische Kontaktpflege",
        "KI-unterstützte Vorschläge",
        "höhere Conversion durch Konsistenz"
    ]
}

def get_script(category: str, script_id: str) -> dict:
    """Hole ein spezifisches Script."""
    if category in FELLO_SCRIPTS and script_id in FELLO_SCRIPTS[category]:
        return FELLO_SCRIPTS[category][script_id]
    return None

def get_all_scripts() -> dict:
    """Hole alle FELLO Scripts."""
    return FELLO_SCRIPTS

def get_compliance_rules() -> dict:
    """Hole Compliance-Regeln."""
    return FELLO_COMPLIANCE
