"""
Sales Flow AI - Closing Coach Prompts

Prompts für GPT, Claude und Gemini zur Deal-Analyse und Closing-Strategien
"""

# ============================================================================
# CLOSING COACH - System Prompt
# ============================================================================

CLOSING_COACH_SYSTEM_PROMPT = """Du bist ein erfahrener Sales-Coach und Closing-Experte. 
Deine Aufgabe ist es, Deals zu analysieren und konkrete, umsetzbare Strategien für den Abschluss zu empfehlen.

Analysiere:
- Gesprächshistorie und Notizen
- Deal-Stage und Verweildauer
- Erkannte Einwände und Blocker
- Engagement-Level des Kunden

Gib konkrete, branchen-agnostische Empfehlungen für Closing-Strategien.

Antworte IMMER im JSON-Format."""

# ============================================================================
# CLOSING COACH - User Prompt Template
# ============================================================================

CLOSING_COACH_USER_PROMPT_TEMPLATE = """Analysiere diesen Deal für Closing-Insights:

DEAL INFORMATIONEN:
- Deal-ID: {deal_id}
- Deal-Wert: {deal_value} EUR
- Stage: {stage}
- Verweildauer in Stage: {days_in_stage} Tage
- Erwartetes Close-Datum: {expected_close_date}
- Kontakt: {contact_name} ({contact_company})

GESPRÄCHSHISTORIE:
{conversation_history}

ERKANNTE EINWÄNDE:
{objections}

FRAGE:
Analysiere diesen Deal und gib mir:
1. Erkannte Blocker (Typ, Schweregrad, Kontext, Empfehlung)
2. Closing-Score (0-100) und Wahrscheinlichkeit
3. Empfohlene Closing-Strategien mit konkreten Scripts
4. Nächste Aktion und optimaler Zeitpunkt

Antworte im folgenden JSON-Format:
{{
    "detected_blockers": [
        {{
            "type": "price_objection|decision_maker_missing|timeline_unclear|budget_concern|competitor_mentioned|no_urgency",
            "severity": "low|medium|high",
            "occurrences": 2,
            "context": "Kurze Beschreibung des Blockers",
            "recommendation": "Konkrete Handlungsempfehlung"
        }}
    ],
    "closing_score": 65.0,
    "closing_probability": "very_low|low|medium|high|very_high",
    "recommended_strategies": [
        {{
            "strategy": "alternative_close|urgency_close|summary_close|value_close|assumptive_close",
            "script": "Konkreter Text, den der Verkäufer sagen kann",
            "confidence": 0.85,
            "when_to_use": "Wann diese Strategie am besten funktioniert"
        }}
    ],
    "suggested_next_action": "Konkrete nächste Aktion (z.B. 'Follow-up Call heute um 14:00')",
    "suggested_next_action_time": "2025-01-15T14:00:00Z",
    "conversation_sentiment": "positive|neutral|negative",
    "engagement_level": "high|medium|low",
    "objection_count": 2,
    "price_mentioned_count": 1,
    "timeline_mentioned": false,
    "analysis_reasoning": "Kurze Erklärung, warum diese Analyse"
}}
"""

# ============================================================================
# CLOSING COACH - Für GPT (OpenAI)
# ============================================================================

def get_closing_coach_gpt_prompt(deal_data: dict, conversation_history: list) -> list:
    """Format für OpenAI GPT API (ChatCompletion)."""
    return [
        {"role": "system", "content": CLOSING_COACH_SYSTEM_PROMPT},
        {"role": "user", "content": CLOSING_COACH_USER_PROMPT_TEMPLATE.format(
            deal_id=deal_data.get("id", "N/A"),
            deal_value=deal_data.get("value", 0),
            stage=deal_data.get("stage", "unknown"),
            days_in_stage=deal_data.get("days_in_stage", 0),
            expected_close_date=deal_data.get("expected_close_date", "N/A"),
            contact_name=deal_data.get("contact_name", "N/A"),
            contact_company=deal_data.get("contact_company", "N/A"),
            conversation_history=format_conversation_history(conversation_history),
            objections=format_objections(deal_data.get("objections", [])),
        )}
    ]


# ============================================================================
# CLOSING COACH - Für Claude (Anthropic)
# ============================================================================

def get_closing_coach_claude_prompt(deal_data: dict, conversation_history: list) -> str:
    """Format für Anthropic Claude API."""
    return f"""{CLOSING_COACH_SYSTEM_PROMPT}

{CLOSING_COACH_USER_PROMPT_TEMPLATE.format(
    deal_id=deal_data.get("id", "N/A"),
    deal_value=deal_data.get("value", 0),
    stage=deal_data.get("stage", "unknown"),
    days_in_stage=deal_data.get("days_in_stage", 0),
    expected_close_date=deal_data.get("expected_close_date", "N/A"),
    contact_name=deal_data.get("contact_name", "N/A"),
    contact_company=deal_data.get("contact_company", "N/A"),
    conversation_history=format_conversation_history(conversation_history),
    objections=format_objections(deal_data.get("objections", [])),
)}

WICHTIG: Antworte NUR mit gültigem JSON, keine zusätzlichen Erklärungen."""


# ============================================================================
# CLOSING COACH - Für Gemini (Google)
# ============================================================================

def get_closing_coach_gemini_prompt(deal_data: dict, conversation_history: list) -> str:
    """Format für Google Gemini API."""
    return f"""{CLOSING_COACH_SYSTEM_PROMPT}

{CLOSING_COACH_USER_PROMPT_TEMPLATE.format(
    deal_id=deal_data.get("id", "N/A"),
    deal_value=deal_data.get("value", 0),
    stage=deal_data.get("stage", "unknown"),
    days_in_stage=deal_data.get("days_in_stage", 0),
    expected_close_date=deal_data.get("expected_close_date", "N/A"),
    contact_name=deal_data.get("contact_name", "N/A"),
    contact_company=deal_data.get("contact_company", "N/A"),
    conversation_history=format_conversation_history(conversation_history),
    objections=format_objections(deal_data.get("objections", [])),
)}

Antworte ausschließlich mit gültigem JSON."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_conversation_history(history: list) -> str:
    """Formatiere Gesprächshistorie für Prompt."""
    if not history:
        return "Keine Gesprächshistorie verfügbar."
    
    formatted = []
    for i, entry in enumerate(history[-10:], 1):  # Letzte 10 Einträge
        entry_type = entry.get("type", "unknown")
        content = entry.get("content") or entry.get("notes") or entry.get("metadata", {}).get("message", "")
        timestamp = entry.get("created_at", "N/A")
        formatted.append(f"{i}. [{entry_type}] {timestamp}: {content}")
    
    return "\n".join(formatted) if formatted else "Keine Gesprächshistorie verfügbar."


def format_objections(objections: list) -> str:
    """Formatiere Einwände für Prompt."""
    if not objections:
        return "Keine Einwände erkannt."
    
    formatted = []
    for obj in objections:
        obj_type = obj.get("type", "unknown")
        obj_text = obj.get("text", obj.get("content", ""))
        formatted.append(f"- {obj_type}: {obj_text}")
    
    return "\n".join(formatted) if formatted else "Keine Einwände erkannt."

