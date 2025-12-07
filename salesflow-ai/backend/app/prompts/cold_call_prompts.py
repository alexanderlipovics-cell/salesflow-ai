"""Stub prompts for Cold Call Assistant."""

def get_cold_call_gpt_prompt(*args, **kwargs) -> str:
    """Return a simple stub prompt."""
    return "You are a cold call assistant. Generate a short, friendly call script."


__all__ = ["get_cold_call_gpt_prompt"]
"""
Sales Flow AI - Cold Call Assistant Prompts

Prompts für GPT, Claude und Gemini zur Script-Generierung für Kaltakquise
"""

# ============================================================================
# COLD CALL ASSISTANT - System Prompt
# ============================================================================

COLD_CALL_SYSTEM_PROMPT = """Du bist ein Experte für Kaltakquise und Cold Calling. 
Deine Aufgabe ist es, personalisierte, conversion-optimierte Gesprächsleitfäden zu erstellen.

Erstelle Scripts die:
- Kurz und prägnant sind (max. 30 Sekunden pro Abschnitt)
- Natürlich klingen (keine Roboter-Sprache)
- Auf den spezifischen Kontakt zugeschnitten sind
- Konkrete Einwandbehandlungen enthalten
- Zum Ziel führen (Termin, Qualifizierung, etc.)

Antworte IMMER im JSON-Format."""

# ============================================================================
# COLD CALL ASSISTANT - User Prompt Template
# ============================================================================

COLD_CALL_USER_PROMPT_TEMPLATE = """Erstelle einen personalisierten Gesprächsleitfaden für diesen Kaltakquise-Anruf:

KONTAKT INFORMATIONEN:
- Name: {contact_name}
- Firma: {company_name}
- Position: {position}
- Branche: {industry}
- Standort: {location}

KONTAKT-HISTORIE:
{contact_history}

ZIEL DES ANRUFS:
{goal}

VERFÜGBARE INFORMATIONEN:
{available_info}

FRAGE:
Erstelle einen strukturierten Gesprächsleitfaden mit:
1. Opener (erste 10 Sekunden)
2. Einwandbehandlungen für häufige Situationen
3. Closing-Strategie
4. Nächste Schritte

Antworte im folgenden JSON-Format:
{{
    "contact_name": "{contact_name}",
    "company_name": "{company_name}",
    "goal": "{goal}",
    "sections": [
        {{
            "section_type": "opener",
            "title": "Opener (Erste 10 Sekunden)",
            "script": "Konkreter Text, den der Verkäufer sagen kann",
            "tips": ["Tipp 1", "Tipp 2"]
        }},
        {{
            "section_type": "objection_response",
            "title": "Wenn 'Keine Zeit'",
            "script": "Konkrete Antwort auf diesen Einwand",
            "tips": ["Tipp 1", "Tipp 2"]
        }},
        {{
            "section_type": "objection_response",
            "title": "Wenn 'Kein Interesse'",
            "script": "Konkrete Antwort",
            "tips": ["Tipp 1"]
        }},
        {{
            "section_type": "objection_response",
            "title": "Wenn 'Schicken Sie Unterlagen'",
            "script": "Konkrete Antwort",
            "tips": ["Tipp 1"]
        }},
        {{
            "section_type": "objection_response",
            "title": "Wenn 'Zu teuer'",
            "script": "Konkrete Antwort",
            "tips": ["Tipp 1"]
        }},
        {{
            "section_type": "close",
            "title": "Terminvereinbarung",
            "script": "Wie der Verkäufer den Termin vereinbart",
            "tips": ["Tipp 1", "Tipp 2"]
        }}
    ],
    "suggested_objections": ["Keine Zeit", "Kein Interesse", "Schicken Sie Unterlagen", "Zu teuer"],
    "personalization_notes": "Warum dieser Script für diesen Kontakt passt"
}}
"""

# ============================================================================
# COLD CALL ASSISTANT - Für GPT (OpenAI)
# ============================================================================

def get_cold_call_gpt_prompt(contact_data: dict, goal: str = "book_meeting") -> list:
    """Format für OpenAI GPT API (ChatCompletion)."""
    return [
        {"role": "system", "content": COLD_CALL_SYSTEM_PROMPT},
        {"role": "user", "content": COLD_CALL_USER_PROMPT_TEMPLATE.format(
            contact_name=contact_data.get("name", "Herr/Frau"),
            company_name=contact_data.get("company", "Unbekannt"),
            position=contact_data.get("position", "N/A"),
            industry=contact_data.get("industry", "N/A"),
            location=format_location(contact_data),
            contact_history=format_contact_history(contact_data.get("history", [])),
            goal=goal,
            available_info=format_available_info(contact_data),
        )}
    ]


# ============================================================================
# COLD CALL ASSISTANT - Für Claude (Anthropic)
# ============================================================================

def get_cold_call_claude_prompt(contact_data: dict, goal: str = "book_meeting") -> str:
    """Format für Anthropic Claude API."""
    return f"""{COLD_CALL_SYSTEM_PROMPT}

{COLD_CALL_USER_PROMPT_TEMPLATE.format(
    contact_name=contact_data.get("name", "Herr/Frau"),
    company_name=contact_data.get("company", "Unbekannt"),
    position=contact_data.get("position", "N/A"),
    industry=contact_data.get("industry", "N/A"),
    location=format_location(contact_data),
    contact_history=format_contact_history(contact_data.get("history", [])),
    goal=goal,
    available_info=format_available_info(contact_data),
)}

WICHTIG: Antworte NUR mit gültigem JSON, keine zusätzlichen Erklärungen."""


# ============================================================================
# COLD CALL ASSISTANT - Für Gemini (Google)
# ============================================================================

def get_cold_call_gemini_prompt(contact_data: dict, goal: str = "book_meeting") -> str:
    """Format für Google Gemini API."""
    return f"""{COLD_CALL_SYSTEM_PROMPT}

{COLD_CALL_USER_PROMPT_TEMPLATE.format(
    contact_name=contact_data.get("name", "Herr/Frau"),
    company_name=contact_data.get("company", "Unbekannt"),
    position=contact_data.get("position", "N/A"),
    industry=contact_data.get("industry", "N/A"),
    location=format_location(contact_data),
    contact_history=format_contact_history(contact_data.get("history", [])),
    goal=goal,
    available_info=format_available_info(contact_data),
)}

Antworte ausschließlich mit gültigem JSON."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_location(contact_data: dict) -> str:
    """Formatiere Standort-Informationen."""
    city = contact_data.get("city", "")
    country = contact_data.get("country", "")
    if city and country:
        return f"{city}, {country}"
    return city or country or "N/A"


def format_contact_history(history: list) -> str:
    """Formatiere Kontakt-Historie."""
    if not history:
        return "Kein vorheriger Kontakt."
    
    formatted = []
    for entry in history[-5:]:  # Letzte 5 Einträge
        entry_type = entry.get("type", "contact")
        date = entry.get("date") or entry.get("created_at", "N/A")
        notes = entry.get("notes") or entry.get("content", "")
        formatted.append(f"- [{entry_type}] {date}: {notes}")
    
    return "\n".join(formatted) if formatted else "Kein vorheriger Kontakt."


def format_available_info(contact_data: dict) -> str:
    """Formatiere verfügbare Informationen über den Kontakt."""
    info = []
    
    if contact_data.get("email"):
        info.append(f"E-Mail: {contact_data['email']}")
    if contact_data.get("phone"):
        info.append(f"Telefon: {contact_data['phone']}")
    if contact_data.get("linkedin"):
        info.append(f"LinkedIn: {contact_data['linkedin']}")
    if contact_data.get("website"):
        info.append(f"Website: {contact_data['website']}")
    if contact_data.get("company_size"):
        info.append(f"Firmengröße: {contact_data['company_size']}")
    if contact_data.get("tags"):
        tags = ", ".join(contact_data['tags']) if isinstance(contact_data['tags'], list) else contact_data['tags']
        info.append(f"Tags: {tags}")
    
    return "\n".join(info) if info else "Grundlegende Kontaktdaten verfügbar."

