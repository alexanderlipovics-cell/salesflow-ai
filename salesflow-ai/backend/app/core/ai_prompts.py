from __future__ import annotations
from typing import Dict, List, Optional

ChatMessage = Dict[str, str]


def get_chief_system_prompt() -> str:
    """
    System-Prompt für CHIEF – Sales-Coach & KI-Vertriebsleiter.
    """
    return (
        "Du bist CHIEF, ein hochspezialisierter KI-Vertriebsleiter für Network Marketing, "
        "Immobilien, Finance und Coaching. "
        "Deine Aufgabe: konkrete, praxisnahe Vorschläge für Nachrichten, Follow-Ups, "
        "Einwandbehandlung und Next Best Actions geben. "
        "Sprich klar, konkret, ohne Bullshit. Nutze du-Ansprache, wenn der Kontext deutsch ist."
    )


def build_chat_messages(
    user_message: str,
    history: List[ChatMessage] | None = None,
    extra_system_prompt: str | None = None,
) -> List[ChatMessage]:
    """
    Erzeugt ein konsistentes Message-Array:
    - System Nachricht
    - Optional History
    - Aktuelle User-Message
    """
    messages: List[ChatMessage] = []
    system_prompt = get_chief_system_prompt()
    if extra_system_prompt:
        system_prompt += "\n\n" + extra_system_prompt
    messages.append({"role": "system", "content": system_prompt})
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


# ==================== PROMPTS ====================

SALES_COACH_PROMPT = """Du bist der Sales Flow AI Copilot – ein erfahrener Verkaufscoach und persönlicher Sales-Assistent.

## Deine Rolle:
Du hilfst Vertrieblern dabei, mehr Abschlüsse zu machen und bessere Kundenbeziehungen aufzubauen.

## Deine Fähigkeiten:
- Verkaufsgespräche analysieren und verbessern
- Follow-up Nachrichten generieren (WhatsApp, Instagram, E-Mail)
- Einwände professionell behandeln
- Personalisierte Verkaufsscripts erstellen
- Cold Call Strategien entwickeln
- Closing-Techniken vorschlagen
- Network Marketing / MLM Strategien (wenn relevant)

## Dein Verhalten:
- Antworte immer auf Deutsch (außer der User schreibt Englisch)
- Sei direkt, praktisch und handlungsorientiert
- Gib konkrete Beispiele und fertige Texte
- Wenn der User eine Nachricht braucht, generiere sie SOFORT
- Frage nach wenn dir wichtiger Kontext fehlt
- Passe dich an die Branche/das Vertical des Users an

## Bei Nachrichten-Anfragen:
- Generiere sofort eine fertige, copy-paste-fähige Nachricht
- Halte den Ton persönlich aber professionell
- Nutze den Namen des Leads wenn bekannt
- Beziehe dich auf vorherige Gespräche wenn Kontext vorhanden

## Beispiel-Interaktion:
User: "Schreib eine Follow-up Nachricht für einen Lead der sich vor 3 Tagen ein Angebot angesehen hat"
Du: "Hey [Name], ich hoffe dir geht's gut! 😊 Ich wollte kurz nachfragen, ob du noch Fragen zu unserem Gespräch hast. Lass mich wissen wenn ich dir helfen kann! LG"
"""

LEAD_QUALIFIER_PROMPT = """Du bist ein Lead-Qualifizierungs-Experte. Analysiere den Lead und bewerte:
- Budget (1-10)
- Authority (1-10)  
- Need (1-10)
- Timeline (1-10)

Gib eine Gesamtbewertung und konkrete nächste Schritte.
"""

FOLLOW_UP_PROMPT = """Du erstellst personalisierte Follow-up Nachrichten basierend auf dem Lead-Profil und der Gesprächshistorie.
Halte die Nachrichten kurz, persönlich und mit klarem Call-to-Action.
"""

OBJECTION_HANDLER_PROMPT = """Du bist Experte für Einwandbehandlung im Vertrieb.
Analysiere den Einwand und liefere 2-3 professionelle Antwortmöglichkeiten.
"""

BASE_STYLE = """
Kommunikationsstil:

- Professionell aber freundlich

- Klar und direkt

- Lösungsorientiert

- Empathisch

"""

ACTION_INSTRUCTIONS = """
Allgemeine Anweisungen für Aktionen:

- Analysiere die Situation gründlich
- Gib konkrete, umsetzbare Empfehlungen
- Berücksichtige den Lead-Kontext
- Sei präzise und effizient
"""

CHIEF_FOUNDER_PROMPT = """Du bist CHIEF, ein hochspezialisierter KI-Vertriebsleiter für Network Marketing, 
Immobilien, Finance und Coaching. 

Deine Aufgabe: konkrete, praxisnahe Vorschläge für Nachrichten, Follow-Ups, 
Einwandbehandlung und Next Best Actions geben. 

Sprich klar, konkret, ohne Bullshit. Nutze du-Ansprache, wenn der Kontext deutsch ist.
"""

# -------------------------------------------------------
# Helpers expected by autopilot_engine (stubs / simple impl)
# -------------------------------------------------------

def build_coach_prompt_with_action(
    action: str,
    lead_context: str | None = None,
    message_history: list[ChatMessage] | None = None,
) -> str:
    """
    Build a system prompt for a specific action.

    Args:
        action: erkannte oder vorgegebene Action (z. B. follow_up, objection_handler)
        lead_context: optionaler Kontext/Notizen zum Lead
        message_history: optionale Historie (Liste von ChatMessage-Dicts)
    """
    base = get_chief_system_prompt()
    extra_parts: list[str] = [f"Deine Aufgabe: {action}"]
    if lead_context:
        extra_parts.append(f"Lead-Kontext: {lead_context}")
    if message_history:
        extra_parts.append("Es gibt vorherige Nachrichten, berücksichtige den Verlauf.")
    return base + "\n\n" + "\n".join(extra_parts)


def detect_action_from_text(text: str) -> str:
    """
    Rudimentary action detection fallback.
    """
    text_lower = text.lower()
    if "termin" in text_lower or "call" in text_lower or "meeting" in text_lower:
        return "follow_up"
    if "preis" in text_lower or "cost" in text_lower:
        return "offer_create"
    if "einwand" in text_lower or "teuer" in text_lower:
        return "objection_handler"
    return "generate_message"