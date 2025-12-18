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
    Erzeugt ein konsistentes Message-Array.
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

SALES_COACH_PROMPT = """Du bist ein erfahrener Sales Coach und hilfst bei der Optimierung von Verkaufsgesprächen und Lead-Qualifizierung.

Deine Aufgaben:
- Analysiere Leads und gib Handlungsempfehlungen
- Schlage passende Follow-up Strategien vor
- Hilf bei der Priorisierung von Verkaufschancen
- Gib Tipps für effektive Kommunikation

Antworte immer auf Deutsch, professionell aber freundlich.
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


# ==================== ACTION DETECTION ====================

ACTION_KEYWORDS = {
    "follow_up": ["follow-up", "nachfassen", "melden", "kontaktieren", "anrufen"],
    "qualify": ["qualifizieren", "bewerten", "einschätzen", "prüfen"],
    "close": ["abschließen", "verkaufen", "deal", "vertrag"],
    "nurture": ["pflegen", "warmhalten", "beziehung", "content"],
    "objection": ["einwand", "bedenken", "aber", "problem", "teuer", "zeit"],
}


def detect_action_from_text(text: str) -> str:
    """
    Erkennt die wahrscheinlichste Aktion basierend auf dem Text.
    
    Returns:
        Action type: 'follow_up', 'qualify', 'close', 'nurture', 'objection', oder 'general'
    """
    text_lower = text.lower()
    
    for action, keywords in ACTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return action
    
    return "general"


def build_coach_prompt_with_action(
    action: str,
    lead_context: Optional[Dict] = None,
    message_history: Optional[List[str]] = None,
) -> str:
    """
    Baut einen spezifischen Prompt basierend auf der erkannten Aktion.
    
    Args:
        action: Die erkannte Aktion (follow_up, qualify, close, etc.)
        lead_context: Optionale Lead-Informationen
        message_history: Optionale Nachrichtenhistorie
    
    Returns:
        Angepasster System-Prompt für die KI
    """
    base_prompt = SALES_COACH_PROMPT
    
    action_prompts = {
        "follow_up": """
Fokus: Follow-Up Nachricht erstellen
- Beziehe dich auf vorherige Gespräche
- Biete konkreten Mehrwert
- Klarer nächster Schritt
""",
        "qualify": """
Fokus: Lead-Qualifizierung
- Stelle gezielte BANT-Fragen
- Identifiziere Entscheidungskriterien
- Bewerte die Verkaufschance
""",
        "close": """
Fokus: Abschluss vorbereiten
- Fasse Vorteile zusammen
- Behandle letzte Einwände
- Klarer Call-to-Action zum Abschluss
""",
        "nurture": """
Fokus: Beziehungspflege
- Teile relevanten Content
- Baue Vertrauen auf
- Halte den Kontakt warm ohne zu pushen
""",
        "objection": """
Fokus: Einwandbehandlung
- Höre den Einwand aktiv
- Zeige Verständnis
- Liefere überzeugende Gegenargumente
""",
        "general": """
Fokus: Allgemeine Beratung
- Analysiere die Situation
- Gib konkrete Handlungsempfehlungen
- Schlage nächste Schritte vor
""",
    }
    
    prompt = base_prompt + "\n" + action_prompts.get(action, action_prompts["general"])
    
    if lead_context:
        prompt += f"\n\nLead-Kontext:\n{lead_context}"
    
    if message_history:
        prompt += f"\n\nNachrichtenverlauf:\n" + "\n".join(message_history[-5:])
    
    return prompt