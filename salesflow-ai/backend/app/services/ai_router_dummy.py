# file: app/services/ai_router_dummy.py
"""
Dummy AI Router - Für lokale Tests ohne echte API-Calls

Generiert realistische Follow-up Nachrichten für Network Marketing.
NICHT für Produktion - später durch echten AI-Router ersetzen.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
import random


class DummyAIRouter:
    """
    Ein einfacher AI-"Router" für lokale Tests.
    
    Generiert personalisierte Nachrichten basierend auf:
    - Lead-Name
    - Sequenz-Step
    - Kontext
    """
    
    # Template-Nachrichten für verschiedene Steps
    TEMPLATES = {
        "interest_intro": [
            "Hey {name}, ich hab gesehen du interessierst dich für {topic}. Hast du kurz Zeit für ein schnelles Telefonat? 😊",
            "Hi {name}! Mega cool dass du dich gemeldet hast. Was genau hat dich denn neugierig gemacht?",
            "Hey {name} 👋 Danke für dein Interesse! Sag mal, was ist dir wichtiger - mehr Zeit oder mehr Geld?",
        ],
        "video_invite": [
            "Hey {name}, ich hab dir mal ein kurzes Video zusammengestellt, das erklärt wie das Ganze funktioniert. Schau es dir mal an wenn du 5 Minuten hast: [Link]",
            "Hi {name}! Falls du noch nicht dazu gekommen bist - hier ist das Video das ich dir empfohlen hab. Die ersten 3 Minuten reichen schon 👀",
        ],
        "gentle_followup": [
            "Hey {name}, nur ein kurzer Check-in 😊 Konntest du dir das Video anschauen? Bin gespannt auf dein Feedback!",
            "Hi {name}! Ich meld mich nochmal kurz - hast du noch Fragen zu dem was ich dir geschickt hab?",
            "Hey {name}, ich will nicht nerven aber wollte nur sichergehen dass meine Nachricht angekommen ist 😅",
        ],
        "call_attempt": [
            "Hey {name}! Ich würde dich gerne kurz anrufen, wann passt es dir am besten? Dauert auch nur 10 Minuten.",
            "Hi {name}, manchmal ist ein kurzes Telefonat einfacher als hin und her schreiben. Wann hast du 10 Minuten?",
        ],
        "final_checkin": [
            "Hey {name}, ich räume gerade meine Kontakte auf und wollte nochmal fragen ob das Thema für dich noch relevant ist? Wenn nicht, kein Problem - dann streiche ich dich von meiner Liste 😊",
            "Hi {name}! Letzte Nachricht von mir zu dem Thema - ist das noch was für dich oder soll ich dir den Platz nicht mehr blockieren?",
        ],
        "reactivation_hello": [
            "Hey {name}! Lange nichts gehört - hoffe dir geht's gut! 🙌 Wollte mich einfach mal wieder melden.",
            "Hi {name}, wie geht's dir so? Ich musste gerade an dich denken und wollte mal hören wie's läuft!",
        ],
        "default": [
            "Hey {name}, ich melde mich nochmal kurz 😊 Wie fühlt sich das für dich an, worüber wir zuletzt gesprochen haben?",
            "Hi {name}! Kurzer Check-in von mir - wie schaut's bei dir aus?",
        ],
    }
    
    TOPICS = [
        "finanzielle Unabhängigkeit",
        "mehr Zeit für die Familie",
        "ein eigenes Business",
        "Gesundheit und Wellness",
        "passives Einkommen",
    ]

    async def generate(
        self,
        task_type: str,
        user_payload: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generiert eine personalisierte Nachricht.
        
        Args:
            task_type: z.B. 'FOLLOWUP_GENERATION'
            user_payload: Enthält lead und suggestion
            config: Optionale Konfiguration
            
        Returns:
            Dict mit content, model, tokens_used etc.
        """
        lead = user_payload.get("lead", {}) or {}
        suggestion = user_payload.get("suggestion", {}) or {}

        # Name extrahieren
        name = lead.get("first_name") or lead.get("full_name", "").split()[0] or "du"
        
        # Template-Key aus Suggestion
        template_key = suggestion.get("meta", {}).get("template_key", "default")
        step_action = suggestion.get("meta", {}).get("step_action", "Follow-up")
        
        # Passendes Template wählen
        templates = self.TEMPLATES.get(template_key, self.TEMPLATES["default"])
        template = random.choice(templates)
        
        # Topic für Personalisierung
        topic = random.choice(self.TOPICS)
        
        # Nachricht generieren
        content = template.format(name=name, topic=topic)

        return {
            "content": content,
            "model": "dummy-local-v1",
            "prompt_version": "v0.1",
            "tokens_used": len(content.split()) * 2,  # Grobe Schätzung
            "raw": {
                "task_type": task_type,
                "config": config or {},
                "template_key": template_key,
                "step_action": step_action,
            },
        }


__all__ = ["DummyAIRouter"]

