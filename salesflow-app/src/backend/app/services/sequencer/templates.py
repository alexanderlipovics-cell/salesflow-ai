"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCE TEMPLATES                                                        ║
║  Vorgefertigte Workflows für verschiedene Use-Cases                       ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict, Any
from datetime import datetime
import uuid


# =============================================================================
# TEMPLATE DEFINITIONS
# =============================================================================

SEQUENCE_TEMPLATES: List[Dict[str, Any]] = [
    # =========================================================================
    # COLD OUTREACH
    # =========================================================================
    {
        "id": "cold-outreach-basic",
        "name": "🎯 Cold Outreach - Basic",
        "description": "Klassische 3-Step Cold Outreach Sequence für neue Kontakte",
        "category": "cold_outreach",
        "tags": ["cold", "outbound", "beginner"],
        "estimated_duration_days": 10,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 0,
                "config": {
                    "subject": "Kurze Frage zu {{company}}",
                    "body": """Hallo {{first_name}},

ich habe gesehen, dass {{company}} im Bereich {{industry}} aktiv ist. 

Wir helfen Unternehmen wie eurem dabei, [HAUPTVORTEIL]. Bei unseren Kunden sehen wir im Schnitt [ERGEBNIS].

Hätten Sie diese Woche 15 Minuten Zeit für ein kurzes Gespräch?

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 3,
                "delay_hours": 0,
                "config": {
                    "subject": "Re: Kurze Frage zu {{company}}",
                    "body": """Hallo {{first_name}},

kurzes Follow-up zu meiner letzten Nachricht.

Ich wollte sichergehen, dass sie nicht im Spam gelandet ist. Falls das Timing gerade schlecht ist - wann wäre ein besserer Zeitpunkt?

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "email",
                "delay_days": 4,
                "delay_hours": 0,
                "config": {
                    "subject": "Letzte Frage",
                    "body": """Hallo {{first_name}},

ich möchte nicht nerven, deshalb meine letzte Nachricht:

Ist [THEMA] aktuell überhaupt ein Thema für euch? Falls nicht, kein Problem - dann streich ich euch von meiner Liste.

Falls ja: Was wäre der beste nächste Schritt?

Beste Grüße
{{sender_name}}"""
                }
            }
        ]
    },
    
    # =========================================================================
    # COLD OUTREACH ADVANCED
    # =========================================================================
    {
        "id": "cold-outreach-multichannel",
        "name": "🚀 Cold Outreach - Multi-Channel",
        "description": "Email + LinkedIn Kombination für höhere Response-Rate",
        "category": "cold_outreach",
        "tags": ["cold", "multichannel", "linkedin", "advanced"],
        "estimated_duration_days": 14,
        "steps": [
            {
                "step_order": 1,
                "step_type": "linkedin_connect",
                "delay_days": 0,
                "delay_hours": 0,
                "config": {
                    "message": "Hi {{first_name}}, ich bin auf dein Profil gestoßen und fand [GRUND] interessant. Würde mich über eine Vernetzung freuen!"
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 2,
                "delay_hours": 0,
                "config": {
                    "subject": "{{first_name}} - kurze Frage",
                    "body": """Hallo {{first_name}},

ich habe dir gerade auf LinkedIn eine Anfrage geschickt und wollte mich parallel per Mail melden.

[PITCH - 2-3 Sätze]

Hättest du diese Woche 15 Minuten Zeit für ein kurzes Gespräch?

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "linkedin_message",
                "delay_days": 4,
                "delay_hours": 0,
                "config": {
                    "message": "Hey {{first_name}}, danke für die Connection! Hast du meine Mail bekommen? Kurze Frage: [FRAGE]"
                }
            },
            {
                "step_order": 4,
                "step_type": "email",
                "delay_days": 3,
                "delay_hours": 0,
                "config": {
                    "subject": "Re: {{first_name}} - kurze Frage",
                    "body": """Hi {{first_name}},

nur ein kurzes Follow-up. Ich weiß, du bist beschäftigt.

Eine Frage: Wäre [THEMA] aktuell relevant für dich?

Falls ja → Lass uns 10 Min telefonieren.
Falls nein → Auch okay, dann streiche ich dich.

{{sender_name}}"""
                }
            },
            {
                "step_order": 5,
                "step_type": "email",
                "delay_days": 4,
                "delay_hours": 0,
                "config": {
                    "subject": "Letzte Nachricht",
                    "body": """{{first_name}},

das hier ist meine letzte Nachricht zu diesem Thema.

Falls ich später noch mal relevant werde, weißt du ja wo du mich findest 😊

Alles Gute!
{{sender_name}}"""
                }
            }
        ]
    },
    
    # =========================================================================
    # FOLLOW-UP SEQUENCE
    # =========================================================================
    {
        "id": "follow-up-meeting",
        "name": "📅 Follow-Up nach Meeting",
        "description": "Nachfassen nach einem Erstgespräch/Demo",
        "category": "follow_up",
        "tags": ["follow-up", "meeting", "demo"],
        "estimated_duration_days": 21,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 2,
                "config": {
                    "subject": "Danke für das Gespräch, {{first_name}}!",
                    "body": """Hallo {{first_name}},

vielen Dank für das tolle Gespräch heute!

Wie besprochen hier die nächsten Schritte:
1. [SCHRITT 1]
2. [SCHRITT 2]
3. [SCHRITT 3]

Anbei findest du noch [MATERIAL/PRÄSENTATION/LINK].

Falls du Fragen hast, melde dich jederzeit!

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 3,
                "delay_hours": 0,
                "config": {
                    "subject": "Re: Danke für das Gespräch, {{first_name}}!",
                    "body": """Hallo {{first_name}},

ich wollte kurz nachhaken, ob du Zeit hattest, dir [MATERIAL] anzuschauen?

Falls du Fragen hast oder etwas unklar war, lass es mich wissen.

Wann wäre ein guter Zeitpunkt für unser nächstes Gespräch?

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "email",
                "delay_days": 4,
                "delay_hours": 0,
                "config": {
                    "subject": "Kurze Rückfrage",
                    "body": """Hallo {{first_name}},

ich wollte mich kurz melden - wie sieht's aus auf eurer Seite?

Gibt es Fragen, bei denen ich helfen kann? Oder macht es Sinn, einen kurzen Call mit [ENTSCHEIDER/TEAM] zu planen?

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 4,
                "step_type": "email",
                "delay_days": 7,
                "delay_hours": 0,
                "config": {
                    "subject": "Noch aktuell?",
                    "body": """Hallo {{first_name}},

ich melde mich ein letztes Mal - ist das Thema [THEMA] aktuell noch relevant für euch?

Falls sich die Prioritäten geändert haben, ist das völlig okay. Dann melde ich mich in ein paar Monaten nochmal.

Falls es noch aktuell ist: Was wäre der beste nächste Schritt?

Beste Grüße
{{sender_name}}"""
                }
            }
        ]
    },
    
    # =========================================================================
    # RE-ENGAGEMENT / GHOST
    # =========================================================================
    {
        "id": "ghost-reengagement",
        "name": "👻 Ghost Re-Engagement",
        "description": "Reaktivierung von verstummten Leads",
        "category": "reengagement",
        "tags": ["ghost", "reengagement", "win-back"],
        "estimated_duration_days": 14,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 0,
                "config": {
                    "subject": "Hab ich was falsch gemacht? 😅",
                    "body": """Hey {{first_name}},

ich hab gemerkt, dass wir den Faden verloren haben.

Keine Sorge, das passiert - wir sind alle beschäftigt.

Eine ehrliche Frage: Ist [THEMA] aktuell noch ein Thema für dich?

- Falls ja → Lass uns kurz telefonieren
- Falls nein → Auch okay, dann hake ich das ab

Was meinst du?

{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 5,
                "delay_hours": 0,
                "config": {
                    "subject": "Quick Check-in",
                    "body": """{{first_name}},

ich schreib dir nochmal, weil ich wissen wollte:

Hat sich bei euch was verändert bzgl. [THEMA]? Manchmal ändern sich Prioritäten - das ist normal.

Falls ja: Wo steht ihr gerade?
Falls nein: Sag mir Bescheid, dann respektiere ich das.

{{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "email",
                "delay_days": 7,
                "delay_hours": 0,
                "config": {
                    "subject": "Letzte Nachricht",
                    "body": """{{first_name}},

ich schließe das hier ab, weil ich nichts von dir gehört habe.

Kein Problem - vielleicht ist das Timing einfach nicht richtig.

Falls sich das mal ändert: Du weißt wo du mich findest.

Alles Gute!
{{sender_name}}

P.S. Falls ich etwas übersehen habe oder du aus einem anderen Grund nicht geantwortet hast - lass es mich wissen!"""
                }
            }
        ]
    },
    
    # =========================================================================
    # NETWORK MARKETING
    # =========================================================================
    {
        "id": "network-new-contact",
        "name": "🌟 Network Marketing - Neukontakt",
        "description": "Einladungs-Sequence für Network Marketing",
        "category": "network_marketing",
        "tags": ["network", "mlm", "invitation"],
        "estimated_duration_days": 10,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 0,
                "config": {
                    "subject": "Hey {{first_name}} - kurze Frage",
                    "body": """Hey {{first_name}}!

Ich hoffe es geht dir gut! 

Ich bin auf was Spannendes gestoßen und musste sofort an dich denken. Es geht um [THEMA - Gesundheit/Zusatzeinkommen/etc.].

Hättest du 10 Minuten, damit ich dir kurz davon erzählen kann?

Liebe Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 3,
                "delay_hours": 0,
                "config": {
                    "subject": "Re: Hey {{first_name}} - kurze Frage",
                    "body": """Hey {{first_name}},

wollte nochmal kurz nachhaken - hast du meine Nachricht gesehen?

Hier ein kurzes Video, das erklärt worum es geht (nur 3 Min):
[VIDEO-LINK]

Sag mir Bescheid, was du denkst!

LG {{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "email",
                "delay_days": 4,
                "delay_hours": 0,
                "config": {
                    "subject": "Feedback?",
                    "body": """Hey {{first_name}},

hast du dir das Video anschauen können?

Falls du Fragen hast, lass es mich wissen. Und falls es nichts für dich ist, auch kein Problem!

LG {{sender_name}}"""
                }
            }
        ]
    },
    
    # =========================================================================
    # EVENT / WEBINAR
    # =========================================================================
    {
        "id": "webinar-followup",
        "name": "📹 Webinar Follow-Up",
        "description": "Nachfassen nach Webinar-Anmeldung",
        "category": "event",
        "tags": ["webinar", "event", "follow-up"],
        "estimated_duration_days": 7,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 1,
                "config": {
                    "subject": "Danke für deine Teilnahme! 🎉",
                    "body": """Hey {{first_name}},

super, dass du beim Webinar dabei warst!

Hier wie versprochen:
- 📹 Die Aufzeichnung: [LINK]
- 📄 Die Slides: [LINK]
- 🎁 Bonus: [LINK]

Falls du Fragen hast, schreib mir einfach!

{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 2,
                "delay_hours": 0,
                "config": {
                    "subject": "Hast du dir die Aufzeichnung angeschaut?",
                    "body": """Hey {{first_name}},

ich wollte kurz nachhaken: Hast du dir die Webinar-Aufzeichnung anschauen können?

Falls ja: Was war dein größter Takeaway?

Falls nein: Hier nochmal der Link - [LINK]

Beste Grüße
{{sender_name}}"""
                }
            },
            {
                "step_order": 3,
                "step_type": "email",
                "delay_days": 3,
                "delay_hours": 0,
                "config": {
                    "subject": "Nächster Schritt?",
                    "body": """Hey {{first_name}},

ich hab noch eine Frage: Was wäre für dich der beste nächste Schritt?

Option A: Kostenloses Strategie-Gespräch buchen → [CALENDLY]
Option B: Mehr Infos per Mail bekommen
Option C: Erstmal nichts, danke!

Lass es mich wissen!

{{sender_name}}"""
                }
            }
        ]
    },
    
    # =========================================================================
    # REFERRAL
    # =========================================================================
    {
        "id": "referral-ask",
        "name": "🤝 Empfehlungs-Anfrage",
        "description": "Nach Empfehlungen fragen bei bestehenden Kunden",
        "category": "referral",
        "tags": ["referral", "customer", "recommendation"],
        "estimated_duration_days": 10,
        "steps": [
            {
                "step_order": 1,
                "step_type": "email",
                "delay_days": 0,
                "delay_hours": 0,
                "config": {
                    "subject": "Kurze Bitte, {{first_name}}",
                    "body": """Hey {{first_name}},

ich hoffe es läuft alles gut bei dir!

Ich habe eine kleine Bitte: Kennst du jemanden, der auch von [PRODUKT/SERVICE] profitieren könnte?

Ich frag dich, weil ich am liebsten mit Leuten arbeite, die wie du [EIGENSCHAFT - z.B. offen für Neues sind].

Falls dir jemand einfällt, lass es mich wissen!

Danke dir!
{{sender_name}}"""
                }
            },
            {
                "step_order": 2,
                "step_type": "email",
                "delay_days": 5,
                "delay_hours": 0,
                "config": {
                    "subject": "Re: Kurze Bitte, {{first_name}}",
                    "body": """Hey {{first_name}},

wollte nochmal kurz nachhaken bzgl. Empfehlungen.

Zur Erinnerung: Für jede erfolgreiche Empfehlung gibt es [BONUS/BELOHNUNG].

Falls dir gerade niemand einfällt, ist das auch okay. Aber falls doch - du weißt wie du mich erreichst!

{{sender_name}}"""
                }
            }
        ]
    }
]


# =============================================================================
# TEMPLATE SERVICE
# =============================================================================

class TemplateService:
    """Service für Sequence Templates."""
    
    def __init__(self, supabase):
        self.supabase = supabase
    
    def list_templates(self, category: str = None) -> List[Dict]:
        """Listet alle verfügbaren Templates."""
        templates = SEQUENCE_TEMPLATES.copy()
        
        if category:
            templates = [t for t in templates if t["category"] == category]
        
        # Nur Meta-Informationen zurückgeben (ohne steps)
        return [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t["description"],
                "category": t["category"],
                "tags": t["tags"],
                "estimated_duration_days": t["estimated_duration_days"],
                "step_count": len(t["steps"]),
            }
            for t in templates
        ]
    
    def get_template(self, template_id: str) -> Dict:
        """Holt ein einzelnes Template mit allen Details."""
        for t in SEQUENCE_TEMPLATES:
            if t["id"] == template_id:
                return t
        return None
    
    async def apply_template(
        self,
        template_id: str,
        user_id: str,
        name: str = None,
        customizations: Dict = None
    ) -> Dict:
        """
        Wendet ein Template an und erstellt eine neue Sequence.
        
        Args:
            template_id: ID des Templates
            user_id: User ID
            name: Optionaler Name (sonst Template-Name)
            customizations: Optionale Anpassungen
            
        Returns:
            Erstellte Sequence
        """
        template = self.get_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        customizations = customizations or {}
        
        # Sequence erstellen
        sequence_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name or template["name"],
            "description": template["description"],
            "status": "draft",
            "trigger_type": "manual",
            "settings": {
                "send_window_start": "09:00",
                "send_window_end": "18:00",
                "timezone": "Europe/Berlin",
                "skip_weekends": True,
                "daily_limit": 50,
                "stop_on_reply": True,
            },
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # In DB speichern
        result = self.supabase.table("sequences").insert(sequence_data).execute()
        
        if not result.data:
            raise Exception("Failed to create sequence")
        
        sequence = result.data[0]
        
        # Steps erstellen
        for step in template["steps"]:
            step_data = {
                "id": str(uuid.uuid4()),
                "sequence_id": sequence["id"],
                "step_order": step["step_order"],
                "step_type": step["step_type"],
                "delay_days": step.get("delay_days", 0),
                "delay_hours": step.get("delay_hours", 0),
                "delay_minutes": step.get("delay_minutes", 0),
                "config": step.get("config", {}),
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
            }
            
            # Customizations anwenden
            if customizations.get("steps"):
                custom_step = customizations["steps"].get(str(step["step_order"]))
                if custom_step:
                    step_data["config"].update(custom_step)
            
            self.supabase.table("sequence_steps").insert(step_data).execute()
        
        return sequence
    
    def get_categories(self) -> List[Dict]:
        """Gibt alle verfügbaren Kategorien zurück."""
        categories = {}
        for t in SEQUENCE_TEMPLATES:
            cat = t["category"]
            if cat not in categories:
                categories[cat] = {
                    "id": cat,
                    "name": self._category_name(cat),
                    "count": 0
                }
            categories[cat]["count"] += 1
        
        return list(categories.values())
    
    def _category_name(self, cat_id: str) -> str:
        """Gibt den lesbaren Namen einer Kategorie zurück."""
        names = {
            "cold_outreach": "🎯 Cold Outreach",
            "follow_up": "📅 Follow-Up",
            "reengagement": "👻 Re-Engagement",
            "network_marketing": "🌟 Network Marketing",
            "event": "📹 Events & Webinare",
            "referral": "🤝 Empfehlungen",
        }
        return names.get(cat_id, cat_id.replace("_", " ").title())

