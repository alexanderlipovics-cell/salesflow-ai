"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF KNOWLEDGE - Founder Version                                         ║
║  50+ Outreach Skripte, Einwandbehandlung, Deal-Medic, CEO Module          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, List, Any, Optional

# =============================================================================
# CHIEF OUTREACH SCRIPTS - 50+ Skripte für verschiedene Branchen
# =============================================================================

CHIEF_OUTREACH_SCRIPTS = {
    # ───────────────────────────────────────────────────────────────────────
    # ZINZINO SCRIPTS (Network Marketing)
    # ───────────────────────────────────────────────────────────────────────
    "zinzino": {
        "cold_linkedin": """Hallo {name},

ich sehe, du bist {role} bei {company}.

Als Experte für gesunde Ernährung kennst du sicher die Bedeutung von Omega-3-Fettsäuren für Herz-Kreislauf-Gesundheit.

Ich habe eine Lösung, die wissenschaftlich getestete Omega-3-Produkte mit einem bewährten Geschäftsmodell kombiniert.

Hast du 15 Minuten für einen kurzen Austausch?

Grüße
{your_name}""",

        "cold_whatsapp": """Hey {name}! 👋

Schnelle Frage: Wie wichtig ist dir wissenschaftlich belegte Produktqualität?

Ich habe eine Lösung, die beides verbindet: Premium-Omega-3-Produkte + Geschäftsmodell.

Lust auf einen kurzen Call?

LG
{your_name}""",

        "value_first_email": """Betreff: Omega-3 Studie, die dich interessieren könnte

Hallo {name},

ich habe gerade eine neue Studie über die Auswirkungen von Omega-3 auf kardiovaskuläre Gesundheit gelesen und dachte direkt an dich.

[KURZE ZUSAMMENFASSUNG DER STUDIE]

Falls du Interesse an wissenschaftlich getesteten Omega-3-Produkten hast, können wir gerne kurz sprechen.

Beste Grüße
{your_name}""",

        "warm_referral": """Hallo {name},

{referrer_name} hat mir von dir erzählt und meinte, dass du dich für {topic} interessierst.

Ich führe ein Business mit wissenschaftlich getesteten Omega-3-Produkten - vielleicht passt das zu dir?

Kannst du dir 15 Minuten Zeit nehmen?

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # B2B SALES SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "b2b": {
        "cold_linkedin": """Hallo {name},

ich sehe, du führst {company} - Respekt!

Als {role} kennst du sicher die Herausforderung: {pain_point}.

Ich habe eine Lösung, die {key_benefit}.

Hättest du 10 Minuten für einen kurzen Austausch?

Grüße
{your_name}""",

        "cold_email": """Betreff: {company} - {key_benefit}

Guten Tag {name},

ich habe {company} recherchiert und sehe, dass {observation}.

Viele ähnliche Unternehmen kämpfen mit {pain_point}.

Meine Lösung: {solution_summary}

Hätten Sie Interesse an einem kurzen Gespräch?

Mit freundlichen Grüßen
{your_name}""",

        "follow_up_1": """Hallo {name},

ich hatte dir letzte Woche geschrieben bezüglich {topic}.

Falls du noch Zeit hast, würde ich gerne kurz mit dir sprechen.

Alternativ: Hier ist ein kurzer Case Study über {similar_company}.

Beste Grüße
{your_name}""",

        "social_proof": """Hallo {name},

ich dachte an dich, weil {similar_company} gerade {achievement} erreicht hat - mit unserer Lösung.

Vielleicht interessiert dich, wie?

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # IMMOBILIEN SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "immobilien": {
        "cold_linkedin": """Hallo {name},

du bist Makler bei {company} - beeindruckend!

Ich weiß, wie zeitaufwendig Exposé-Erstellung ist. Stunden, die du eigentlich für Besichtigungen brauchst.

Ich habe ein System, das dir dabei hilft, Exposés in 3 Sekunden zu generieren - mehr Zeit für das, was wirklich zählt.

Hast du 10 Minuten?

Grüße
{your_name}""",

        "cold_email": """Betreff: Exposés in 3 Sekunden – mehr Zeit für Besichtigungen

Guten Tag {name},

als Makler bei {company} verbringst du wahrscheinlich viel Zeit mit Exposé-Erstellung.

Zeit, die du eigentlich für Besichtigungen und Verkaufsgespräche brauchst.

Meine Lösung: Automatische Exposé-Generierung in 3 Sekunden.

✅ Mehr Zeit für Kundenkontakte
✅ Professionelle Präsentation
✅ Bessere Conversion

Hätten Sie 10 Minuten für einen kurzen Austausch?

Mit freundlichen Grüßen
{your_name}""",

        "value_first": """Hallo {name},

kostenloser Tipp: Wie du mit einem kleinen Trick deine Exposé-Erstellung um 80% beschleunigst.

[VALUE TIP]

Falls dich die vollständige Lösung interessiert, können wir gerne kurz sprechen.

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # HOTEL SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "hotel": {
        "cold_email": """Betreff: Ihre Gästebewertungen in 5 Minuten verbessern

Guten Tag {name},

ich habe gesehen, dass Sie {hotel_name} führen.

Gästebewertungen sind das A und O im Hotelgewerbe. Aber die systematische Nachfrage nach Feedback kostet viel Zeit.

Meine Lösung:
✅ Automatische Follow-up-Sequenzen nach Check-out
✅ Höhere Bewertungsquote durch zeitgemäße Kommunikation
✅ Mehr Zeit für Ihre Gäste

Hätten Sie 10 Minuten für einen kurzen Austausch?

Mit freundlichen Grüßen
{your_name}""",

        "cold_linkedin": """Hallo {name},

Sie führen {hotel_name} - Respekt!

Gästebewertungen sind entscheidend, aber die systematische Nachfrage nach Feedback kostet Zeit.

Ich habe eine Lösung, die automatische Follow-up-Sequenzen nach Check-out ermöglicht.

Höhere Bewertungsquote, mehr Zeit für Gäste.

Interessiert?

Grüße
{your_name}""",

        "social_proof": """Hallo {name},

{similar_hotel} hat gerade {achievement} erreicht - mit unserem System für automatische Gästebewertungen.

Vielleicht interessiert Sie, wie?

Grüße
{your_name}""",
    },
}

# =============================================================================
# EINWANDBEHANDLUNG FÜR SALESFLOW AI
# =============================================================================

CHIEF_OBJECTION_HANDLING = {
    "price_too_high": {
        "framework": "Wert vs. Preis",
        "responses": [
            """Ich verstehe, dass der Preis erstmal hoch wirkt. 

Lass uns das anders betrachten: Was kostet es dich, wenn du nichts änderst?

[ROI-BERECHNUNG]

Das bedeutet, du hast deine Investition in [ZEITRAUM] wieder drin.""",

            """Stimmt, es ist eine Investition. Aber schauen wir uns an, was du dafür bekommst:

✅ [BENEFIT 1]
✅ [BENEFIT 2]
✅ [BENEFIT 3]

Im Vergleich zu [ALTERNATIVE] ist das eigentlich sehr fair.""",

            """Was, wenn ich dir zeige, wie du das in Raten zahlen kannst?

Oder: Wir starten mit einem kleineren Paket - du siehst die Ergebnisse, dann upgraden wir.""",
        ],
        "closing_questions": [
            "Wenn der Preis kein Problem wäre, würdest du sofort starten?",
            "Was müsste passieren, damit sich das für dich lohnt?",
            "Was kostet es dich, wenn du noch 3 Monate wartest?",
        ],
    },

    "no_time": {
        "framework": "Zeit-Investition vs. Zeit-Ersparnis",
        "responses": [
            """Ich verstehe - du hast schon viel zu tun.

Genau deshalb ist unsere Lösung so wichtig: Sie SPART dir Zeit.

Statt [AKTUELLE ZEITAUFWENDUNG] brauchst du nur noch [NEUE ZEITAUFWENDUNG].

Das sind [X] Stunden pro Woche mehr für das, was wirklich zählt.""",

            """Warte - wenn du keine Zeit hast, ist das der Grund, warum du das brauchst!

Ohne Automatisierung wirst du noch weniger Zeit haben.

Mit unserer Lösung gewinnst du [X] Stunden pro Woche zurück.""",

            """Was, wenn ich dir zeige, wie du in 10 Minuten pro Tag alles schaffst?

Das ist machbar, oder?""",
        ],
        "closing_questions": [
            "Wie viel Zeit würdest du investieren, wenn du weißt, dass du danach 10 Stunden pro Woche sparst?",
            "Was wäre, wenn du dich auf die wichtigen Dinge konzentrieren könntest statt auf Routine?",
        ],
    },

    "not_convinced": {
        "framework": "Proof + Risk Reversal",
        "responses": [
            """Das kann ich verstehen - du willst sichergehen.

Schauen wir uns das an:

✅ [PROOF 1]
✅ [PROOF 2]
✅ [PROOF 3]

Plus: [RISK REVERSAL] - du kannst jederzeit kündigen, wenn es nicht passt.""",

            """Was müsste ich dir zeigen, damit du überzeugt bist?

[WARTE AUF ANTWORT]

Okay, dann zeige ich dir genau das. Lass uns einen kurzen Test machen.""",

            """Was, wenn wir es erstmal 30 Tage testen?

Du siehst die Ergebnisse, dann entscheidest du.""",
        ],
        "closing_questions": [
            "Was bräuchtest du, um dir sicher zu sein?",
            "Was wäre das Schlimmste, was passieren könnte?",
            "Und was wäre das Beste, was passieren könnte?",
        ],
    },

    "thinking_about_it": {
        "framework": "Urgency + Clarification",
        "responses": [
            """Super, dass du darüber nachdenkst!

Was genau beschäftigt dich noch?

[WARTE AUF ANTWORT]

Okay, lass uns das klären. [ANTWORT AUF EINWAND]""",

            """Ich verstehe, dass du dir Zeit nehmen willst.

Aber schauen wir uns an: Was passiert, wenn du noch 2 Wochen wartest?

[KOSTE DES NICHT-HANDELNS]

Vielleicht können wir jetzt einen ersten Schritt machen?""",

            """Perfekt! Lass uns gemeinsam durchgehen, was dich beschäftigt.

Dann kannst du eine fundierte Entscheidung treffen.""",
        ],
        "closing_questions": [
            "Was genau lässt dich noch zweifeln?",
            "Was wäre, wenn wir das jetzt klären würden?",
            "Was müsste passieren, damit du dich heute entscheidest?",
        ],
    },

    "competitor": {
        "framework": "Differentiation",
        "responses": [
            """Ah, du nutzt [COMPETITOR]! Das ist gut.

Lass mich dir zeigen, was uns unterscheidet:

✅ [UNIQUE BENEFIT 1]
✅ [UNIQUE BENEFIT 2]
✅ [UNIQUE BENEFIT 3]

[COMPETITOR] macht das nicht.""",

            """Ich verstehe - [COMPETITOR] ist ein gutes Tool.

Aber schau dir das an: [UNTERSCHEID]

Das macht uns einzigartig.""",

            """Was, wenn du beides nutzt?

[COMPETITOR] für [ANWENDUNGSFALL 1], wir für [ANWENDUNGSFALL 2].""",
        ],
        "closing_questions": [
            "Was fehlt dir bei [COMPETITOR]?",
            "Was würde dich überzeugen, zu wechseln?",
            "Was, wenn du beides testen könntest?",
        ],
    },
}

# =============================================================================
# DEAL-MEDIC PROMPTS - Retten von Deals in Gefahr
# =============================================================================

CHIEF_DEAL_MEDIC = {
    "stalled_deal": {
        "diagnosis": "Deal ist ins Stocken geraten - kein Fortschritt in [X] Tagen",
        "action_plan": [
            "1. Identifiziere die echte Blockade (Preis, Zeit, Autorität, Bedarf)",
            "2. Schicke Pattern Interrupt Nachricht",
            "3. Biete konkreten Mehrwert (Case Study, ROI-Rechnung)",
            "4. Erstelle Urgency (Angebot, Deadline)",
            "5. Fokussiere auf schmerzhaften Status Quo",
        ],
        "pattern_interrupt_template": """Hallo {name},

ich habe gerade über {company} nachgedacht und mir ist etwas aufgefallen.

[ÜBERRASCHENDE BE OBSERVATION]

Das hat mich an unser Gespräch erinnert. 

Was denkst du: [THOUGHT-PROVOKING QUESTION]?""",

        "value_add_template": """Hallo {name},

ich habe gerade einen Case Study über {similar_company} gelesen, die {achievement} erreicht haben.

[KURZE ZUSAMMENFASSUNG]

Das könnte auch für {company} relevant sein.

Soll ich dir die vollständige Analyse schicken?""",

        "urgency_template": """Hallo {name},

kurze Info: Wir haben noch [X] Plätze für [OFFER] frei.

Da du Interesse hattest, dachte ich, ich melde mich kurz.

Sollen wir nochmal kurz sprechen?""",
    },

    "price_objection": {
        "diagnosis": "Preis-Einwand blockiert den Deal",
        "action_plan": [
            "1. Verstehe die echte Einwand-Hintergrund (Budget, Wert-Wahrnehmung, Autorität)",
            "2. Zeige ROI mit konkreten Zahlen",
            "3. Biete Payment-Optionen oder kleinere Pakete",
            "4. Vergleiche mit Status Quo Kosten",
            "5. Erstelle Urgency mit Angebot",
        ],
        "roi_template": """Hallo {name},

ich habe eine ROI-Berechnung für {company} gemacht:

Aktuell kostet dich [PROBLEM] etwa [COST PER MONTH].

Mit unserer Lösung:
- Investition: [PRICE]
- Ersparnis: [SAVINGS PER MONTH]
- ROI: [X]% in [TIME]

Das bedeutet, du hast deine Investition in [PAYBACK PERIOD] wieder drin.""",

        "payment_options_template": """Hallo {name},

ich verstehe, dass der Preis erstmal hoch wirkt.

Was, wenn wir das anders strukturieren?

✅ Ratenzahlung: [X]€ / Monat
✅ Oder: Start mit kleinerem Paket [PRICE]
✅ Oder: [SPECIAL OFFER]

Was passt besser zu dir?""",

        "comparison_template": """Hallo {name},

lass uns das in Relation setzen:

[Aktuelle Kosten des Problems] vs. [Lösung Preis]

Oder anders: [COST PER DAY] pro Tag für [ALL BENEFITS].

Das ist fair, oder?""",
    },

    "ghosted": {
        "diagnosis": "Kontakt antwortet nicht mehr",
        "action_plan": [
            "1. Pattern Interrupt Nachricht (völlig anders als vorher)",
            "2. Breakup Email (würdevoll verabschieden mit offener Tür)",
            "3. Wertvollen Content ohne Verkaufsintention",
            "4. Social Proof (Erfolgsgeschichte)",
            "5. Final Ask (letzter Versuch mit klarer Frage)",
        ],
        "pattern_interrupt_template": """Hey {name}! 🤔

Komische Frage, aber: Was war das letzte Mal, als du etwas gemacht hast, das dein Business wirklich vorangebracht hat?

[THOUGHT-PROVOKING CONTENT]

Falls du Lust auf einen kurzen Austausch hast, sag Bescheid!

LG
{your_name}""",

        "breakup_template": """Hallo {name},

ich habe gemerkt, dass du wahrscheinlich gerade andere Prioritäten hast.

Das ist völlig okay - ich verstehe das.

Falls du in Zukunft doch Interesse hast, melde dich einfach.

Die Tür bleibt offen.

Beste Grüße
{your_name}""",

        "final_ask_template": """Hallo {name},

letzte Frage: Ist das Thema {topic} für dich noch relevant?

Falls ja, lass uns kurz sprechen.
Falls nein, sage einfach Bescheid - dann melde ich mich nicht mehr.

Alles Gute
{your_name}""",
    },
}

# =============================================================================
# CEO MODULE - Executive-Level Insights
# =============================================================================

CHIEF_CEO_MODULE = {
    "strategic_questions": [
        "Was ist dein größter Hebel für Wachstum im nächsten Quartal?",
        "Welche 3 Metriken sind für dein Business am wichtigsten?",
        "Was hält dich nachts wach? (Größte Sorge)",
        "Was wäre, wenn du 2x mehr Zeit hättest?",
        "Was ist dein größtes Bottleneck?",
        "Was macht deine Konkurrenz besser?",
        "Was würde dein Business transformieren?",
        "Wo siehst du dich in 12 Monaten?",
    ],

    "growth_frameworks": {
        "pirate_metrics": {
            "name": "AARRR Framework (Pirate Metrics)",
            "stages": [
                "Acquisition - Wie gewinnst du Kunden?",
                "Activation - Erste positive Erfahrung",
                "Retention - Kunden zurückholen",
                "Revenue - Einnahmen generieren",
                "Referral - Kunden werben Kunden",
            ],
            "questions": [
                "Welche Acquisition-Kanäle funktionieren am besten?",
                "Was ist dein Activation-Moment?",
                "Wie hältst du Kunden langfristig?",
                "Wie maximierst du Customer Lifetime Value?",
                "Wie aktivierst du Referrals?",
            ],
        },
        "flywheel": {
            "name": "Flywheel Model",
            "stages": [
                "Attract - Aufmerksamkeit gewinnen",
                "Engage - Interaktion schaffen",
                "Delight - Kunden begeistern",
            ],
            "questions": [
                "Wie gewinnst du Aufmerksamkeit?",
                "Wie schaffst du echte Interaktion?",
                "Wie begeisterst du deine Kunden?",
            ],
        },
    },

    "decision_frameworks": {
        "impact_effort": {
            "name": "Impact vs. Effort Matrix",
            "quadrants": [
                "High Impact, Low Effort - Quick Wins (Priorität 1)",
                "High Impact, High Effort - Major Projects (Priorität 2)",
                "Low Impact, Low Effort - Fill-ins (Priorität 3)",
                "Low Impact, High Effort - Thankless Tasks (Vermeiden)",
            ],
        },
        "pareto": {
            "name": "80/20 Rule",
            "questions": [
                "Welche 20% deiner Aktivitäten bringen 80% der Ergebnisse?",
                "Welche 20% deiner Kunden bringen 80% des Umsatzes?",
                "Welche 20% deiner Probleme verursachen 80% der Kopfschmerzen?",
            ],
        },
    },

    "leadership_insights": [
        "Delegate everything except your unique value",
        "Systematize what works, eliminate what doesn't",
        "Focus on leverage, not effort",
        "Build systems, not habits",
        "Measure what matters, ignore the rest",
        "Double down on what works",
        "Kill your darlings (if they don't work)",
        "Time is your only non-renewable resource",
    ],
}

# =============================================================================
# QUICK ACCESS FUNCTIONS
# =============================================================================

def get_outreach_script(industry: str, script_type: str, variables: Dict[str, str]) -> str:
    """Gibt ein Outreach-Skript zurück, formatiert mit Variablen."""
    scripts = CHIEF_OUTREACH_SCRIPTS.get(industry, {})
    template = scripts.get(script_type, "")
    
    if not template:
        return ""
    
    try:
        return template.format(**variables)
    except KeyError:
        return template

def get_objection_response(objection_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Gibt Einwandbehandlung zurück."""
    objection = CHIEF_OBJECTION_HANDLING.get(objection_type)
    
    if not objection:
        return {}
    
    return {
        "framework": objection.get("framework"),
        "responses": objection.get("responses", []),
        "closing_questions": objection.get("closing_questions", []),
    }

def get_deal_medic_plan(situation: str) -> Dict[str, Any]:
    """Gibt Deal-Medic Action Plan zurück."""
    medic = CHIEF_DEAL_MEDIC.get(situation)
    
    if not medic:
        return {}
    
    return {
        "diagnosis": medic.get("diagnosis"),
        "action_plan": medic.get("action_plan", []),
        "templates": {
            k: v for k, v in medic.items() 
            if k.endswith("_template")
        },
    }

def get_ceo_insight(insight_type: str) -> Any:
    """Gibt CEO Module Insight zurück."""
    module = CHIEF_CEO_MODULE.get(insight_type)
    return module

