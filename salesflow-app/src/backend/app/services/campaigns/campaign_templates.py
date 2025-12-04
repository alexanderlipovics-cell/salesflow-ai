"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CAMPAIGN TEMPLATES                                                         ║
║  Systematische Outreach Templates für verschiedene Branchen                ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, List, Optional, Literal
from dataclasses import dataclass

# =============================================================================
# TEMPLATE DEFINITIONS
# =============================================================================

CAMPAIGN_TEMPLATES: Dict[str, Dict[str, Dict[str, Dict]]] = {
    "cold_outreach": {
        "immobilien": {
            "email": {
                "subject": "Exposés in 3 Sekunden – mehr Zeit für Besichtigungen",
                "body": """Hallo {contact_name},

ich habe gesehen, dass du {company_name} führst. 

Als Makler verbringst du wahrscheinlich viel Zeit mit Exposé-Erstellung – Zeit, die du eigentlich für Besichtigungen und Verkaufsgespräche brauchst.

Ich habe eine Lösung, die dir hilft:
✅ Exposés in 3 Sekunden generieren
✅ Mehr Zeit für Kundenkontakte
✅ Bessere Conversion durch professionelle Präsentation

Hast du 10 Minuten für einen kurzen Austausch?

Beste Grüße
{your_name}"""
            },
            "linkedin": """Hallo {contact_name},

ich sehe, du bist bei {company_name} tätig. 

Als Makler kennst du das Problem: Stundenlange Exposé-Erstellung statt Zeit für Besichtigungen.

Ich habe eine Lösung, die Exposés in 3 Sekunden generiert – mehr Zeit für das, was wirklich zählt.

Interessiert an einem kurzen Austausch?

Grüße
{your_name}""",
            "instagram_dm": """Hey {contact_name}! 👋

Schnelle Frage: Wie viel Zeit verbringst du pro Woche mit Exposé-Erstellung?

Ich habe eine Lösung, die dir dabei hilft, diese Zeit zu sparen und mehr Zeit für Besichtigungen zu haben.

Lust auf einen kurzen Austausch?

LG
{your_name}"""
        },
        "mlm_leader": {
            "email": {
                "subject": "Duplizierung auf Knopfdruck für dein Team",
                "body": """Hallo {contact_name},

du führst ein Team bei {company_name} – das ist beeindruckend! 🚀

Ich weiß aus Erfahrung: Die größte Herausforderung ist die Duplizierung. Jeder Teamleader muss dasselbe Wissen und dieselben Prozesse weitergeben.

Meine Lösung:
✅ Automatische Duplizierung von Best Practices
✅ Systematische Onboarding-Sequenzen für neue Partner
✅ Weniger Zeit für Training, mehr Zeit für Wachstum

Hast du 15 Minuten für einen kurzen Call?

Beste Grüße
{your_name}"""
            },
            "linkedin": """Hallo {contact_name},

du führst ein Team bei {company_name} – Respekt! 👏

Die größte Herausforderung im MLM: Systematische Duplizierung.

Ich habe eine Lösung, die dir dabei hilft, Best Practices automatisch an dein Team weiterzugeben – weniger Training, mehr Wachstum.

Interessiert an einem kurzen Austausch?

Grüße
{your_name}""",
            "whatsapp": """Hey {contact_name}! 👋

Schnelle Frage: Wie viel Zeit investierst du pro Woche in das Training deines Teams?

Ich habe ein System, das dir dabei hilft, Best Practices systematisch zu duplizieren – automatisch.

Lust auf einen kurzen Austausch?

LG
{your_name}"""
        },
        "hotel": {
            "email": {
                "subject": "Ihre Gästebewertungen in 5 Minuten verbessern",
                "body": """Guten Tag {contact_name},

ich habe gesehen, dass Sie {company_name} führen.

Gästebewertungen sind das A und O im Hotelgewerbe. Aber die systematische Nachfrage nach Feedback kostet viel Zeit – Zeit, die Sie eigentlich für Ihre Gäste brauchen.

Meine Lösung:
✅ Automatische Follow-up-Sequenzen nach Check-out
✅ Höhere Bewertungsquote durch zeitgemäße Kommunikation
✅ Mehr Zeit für Ihre Gäste

Hätten Sie 10 Minuten für einen kurzen Austausch?

Mit freundlichen Grüßen
{your_name}"""
            },
            "linkedin": """Guten Tag {contact_name},

ich sehe, Sie führen {company_name}.

Gästebewertungen sind entscheidend, aber die systematische Nachfrage nach Feedback kostet Zeit.

Ich habe eine Lösung, die automatische Follow-up-Sequenzen nach Check-out ermöglicht – höhere Bewertungsquote, mehr Zeit für Gäste.

Interessiert an einem kurzen Austausch?

Grüße
{your_name}""",
            "whatsapp": """Guten Tag {contact_name},

wie viele Gästebewertungen erhalten Sie pro Monat?

Ich habe ein System, das Ihnen dabei hilft, automatisch nach Feedback zu fragen – systematisch und professionell.

Lust auf einen kurzen Austausch?

Grüße
{your_name}"""
        }
    },
    "follow_up_sequence": {
        "day_3": """Hallo {contact_name},

vielen Dank für dein Interesse an unserem letzten Gespräch!

Ich dachte mir, es könnte hilfreich sein, dir nochmal die wichtigsten Punkte zusammenzufassen:

{key_points}

Falls du Fragen hast, melde dich einfach!

Beste Grüße
{your_name}""",
        "day_7": """Hey {contact_name},

ich wollte dir noch einen kurzen Tipp geben, der für {company_name} relevant sein könnte:

{value_add_tip}

Falls du Lust auf einen kurzen Austausch hast, sag einfach Bescheid!

LG
{your_name}""",
        "day_14": """Hallo {contact_name},

ich hoffe, es läuft gut bei {company_name}!

Da wir uns vor zwei Wochen ausgetauscht haben, wollte ich kurz nachfragen:

- Wie läuft das Thema {topic} bei dir?
- Gibt es Fragen, die ich beantworten kann?

Falls du Interesse hast, können wir gerne nochmal kurz sprechen.

Beste Grüße
{your_name}"""
    },
    "reactivation": {
        "pattern_interrupt": """Hey {contact_name}! 🤔

Komische Frage, aber: Was war das letzte Mal, als du etwas gemacht hast, das dein Business wirklich vorangebracht hat?

Ich dachte an dich, weil {relevant_insight}.

Lust auf einen kurzen Austausch?

LG
{your_name}""",
        "value_add": """Hallo {contact_name},

ich habe gerade an {company_name} gedacht und wollte dir einen kostenlosen Tipp geben:

{free_value}

Keine Verpflichtung, einfach als Wertschätzung für unsere bisherige Zusammenarbeit.

Falls du Fragen hast, melde dich!

Beste Grüße
{your_name}"""
    }
}

# =============================================================================
# SEQUENCE DEFINITIONS
# =============================================================================

SEQUENCES: Dict[str, List[Dict]] = {
    "cold_outreach": [
        {
            "day": 0,
            "type": "initial",
            "channel": "email",
            "description": "Erste Kontaktaufnahme mit Value Proposition"
        },
        {
            "day": 3,
            "type": "follow_up",
            "channel": "linkedin",
            "description": "Follow-up auf LinkedIn - sanfter Reminder"
        },
        {
            "day": 7,
            "type": "value_add",
            "channel": "email",
            "description": "Mehrwert-Content teilen ohne Verkaufsdruck"
        },
        {
            "day": 14,
            "type": "final",
            "channel": "whatsapp",
            "description": "Letzter Versuch - direkte Frage"
        }
    ],
    "warm_introduction": [
        {
            "day": 0,
            "type": "intro",
            "channel": "email",
            "description": "Warme Einführung mit gemeinsamen Kontakt"
        },
        {
            "day": 2,
            "type": "value",
            "channel": "email",
            "description": "Konkreter Mehrwert für ihr Business"
        },
        {
            "day": 5,
            "type": "social_proof",
            "channel": "linkedin",
            "description": "Erfolgsgeschichte teilen"
        }
    ]
}

