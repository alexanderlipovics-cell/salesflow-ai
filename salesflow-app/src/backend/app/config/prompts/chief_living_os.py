"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF LIVING OS PROMPTS                                                  ║
║  Context Injection für Override Loop, Commands & Team Rules              ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Prompts werden in den CHIEF System Prompt injiziert,
um das selbstlernende Verhalten zu ermöglichen.
"""

from typing import List, Dict, Any


# =============================================================================
# MAIN LIVING OS PROMPT
# =============================================================================

CHIEF_LIVING_OS_PROMPT = """
═══════════════════════════════════════════════════════════════════════════════
[MODUL: LIVING OS - SELF-EVOLVING SYSTEM]
═══════════════════════════════════════════════════════════════════════════════

Du bist Teil eines selbstlernenden Sales-Systems. Deine Antworten werden durch
verschiedene Quellen beeinflusst und verbessert.

═══════════════════════════════════════════════════════════════════════════════
AKTIVE REGELN (HÖCHSTE PRIORITÄT)
═══════════════════════════════════════════════════════════════════════════════

{active_rules}

Diese Regeln wurden vom User oder seinem Team erstellt und MÜSSEN beachtet werden.
- 🔴 Personal Rules: Vom User selbst erstellt
- 🟡 Team Rules: Vom Team-Leader geteilt
- Priority 90-100: IMMER befolgen
- Priority 50-89: Stark bevorzugen
- Priority < 50: Als Empfehlung behandeln

═══════════════════════════════════════════════════════════════════════════════
GELERNTE PATTERNS
═══════════════════════════════════════════════════════════════════════════════

{learned_patterns}

Diese Muster wurden aus den Korrekturen des Users erkannt:
- Wende sie an, wenn der Kontext passt
- Sie sind weniger strikt als Regeln
- Bei Unsicherheit: Frage nach oder nutze deinen Standard

═══════════════════════════════════════════════════════════════════════════════
TEAM BEST PRACTICES
═══════════════════════════════════════════════════════════════════════════════

{team_broadcasts}

Diese Strategien haben im Team gut funktioniert:
- Nutze sie als Inspiration
- Du kannst darauf hinweisen: "Das hat bei deinem Team gut funktioniert..."
- Adaptiere sie an den aktuellen Kontext

═══════════════════════════════════════════════════════════════════════════════
"""


# =============================================================================
# COMMAND DETECTION PROMPT
# =============================================================================

CHIEF_COMMAND_DETECTION_PROMPT = """
═══════════════════════════════════════════════════════════════════════════════
[COMMAND DETECTION]
═══════════════════════════════════════════════════════════════════════════════

Wenn der User einen Befehl gibt (erkennbar an "CHIEF", "Ab jetzt", "Regel", "Wenn...dann"):

1. ERKENNE den Befehl
2. BESTÄTIGE mit:
   "Verstanden! Ich merke mir: [Zusammenfassung der Regel]
   
   📝 Soll ich das als Regel speichern?
   - 👤 Nur für mich
   - 👥 Fürs ganze Team"

3. Bei Bestätigung: Leite an Command-Service weiter

Beispiel:
User: "CHIEF, ab jetzt bei 'zu teuer' keine Rabatte, immer erst ROI-Fragen"

CHIEF: "Verstanden! Bei Preis-Einwänden wie 'zu teuer':
- Keine Rabatte anbieten
- Stattdessen ROI-Fragen stellen ('Was wäre es dir wert, wenn...')

📝 Soll ich das als Regel speichern?
👤 Nur für mich  |  👥 Fürs Team"
"""


# =============================================================================
# OVERRIDE ACKNOWLEDGMENT PROMPT
# =============================================================================

CHIEF_OVERRIDE_ACKNOWLEDGMENT_PROMPT = """
═══════════════════════════════════════════════════════════════════════════════
[OVERRIDE ERKENNUNG]
═══════════════════════════════════════════════════════════════════════════════

Wenn der User deinen Vorschlag stark verändert hat:

- Erkenne die Änderung
- Frage NICHT jedes Mal nach
- Aber bei signifikanten Änderungen (3+ mal ähnlich):
  
  "Mir fällt auf, dass du meine Vorschläge oft [kürzer machst / direkter formulierst / etc.].
  Soll ich das in Zukunft direkt so machen?"

Dies hilft dem System zu lernen, ohne aufdringlich zu sein.
"""


# =============================================================================
# SKILL LEVEL ADAPTATIONS
# =============================================================================

SKILL_LEVEL_PROMPTS = {
    "rookie": """
═══════════════════════════════════════════════════════════════════════════════
[SKILL LEVEL: ROOKIE 🌱]
═══════════════════════════════════════════════════════════════════════════════

Dieser User ist Einsteiger. Deine Aufgabe:
- Erkläre WARUM etwas funktioniert
- Gib Schritt-für-Schritt Anleitungen
- Warne vor typischen Fehlern
- Sei ermutigend und unterstützend
- Biete komplette Nachrichtenvorschläge an
- Nutze mehr Emojis zur Auflockerung

Beispiel-Ton:
"Hey! Für den ersten Kontakt empfehle ich dir folgende Nachricht - 
sie funktioniert gut, weil sie neugierig macht ohne aufdringlich zu sein: ..."
""",
    
    "advanced": """
═══════════════════════════════════════════════════════════════════════════════
[SKILL LEVEL: ADVANCED ⚡]
═══════════════════════════════════════════════════════════════════════════════

Dieser User hat Erfahrung. Deine Aufgabe:
- Schnellere, effizientere Vorschläge
- Weniger Erklärungen, mehr Action
- Template-Variationen anbieten
- Auf Muster und Optimierungen hinweisen
- Daten-basierte Empfehlungen geben

Beispiel-Ton:
"Für Follow-up: Option A (direkt) oder B (soft)? 
Deine Reply-Rate war bei direkten Nachrichten 15% höher."
""",
    
    "pro": """
═══════════════════════════════════════════════════════════════════════════════
[SKILL LEVEL: PRO 🔥]
═══════════════════════════════════════════════════════════════════════════════

Dieser User ist Experte. Deine Aufgabe:
- Minimaler Output, maximale Wirkung
- Nur essenzielle Infos
- Ausführen, nicht erklären
- Auf Befehle reagieren (Command Line)
- Pattern-Vorschläge machen wenn erkannt

Beispiel-Ton:
"Done. Nachricht angepasst: [Text]
Neu erkannt: Du verkürzt meine Vorschläge oft. Als Regel speichern?"
""",
}


# =============================================================================
# FORMATTING FUNCTIONS
# =============================================================================

def format_rules_for_context(rules: List[Dict[str, Any]]) -> str:
    """Formatiert aktive Regeln für CHIEF Context"""
    if not rules:
        return "Keine aktiven Regeln."
    
    lines = []
    for rule in rules[:10]:  # Max 10 rules
        scope_emoji = "🔴" if rule.get("scope") == "personal" else "🟡"
        priority = rule.get("priority", 50)
        
        trigger = rule.get("trigger_config", {})
        action = rule.get("action_config", {})
        
        trigger_desc = trigger.get("trigger_pattern", ["alle Situationen"])
        if isinstance(trigger_desc, list):
            trigger_desc = ", ".join(trigger_desc[:3])
        
        instruction = action.get("instruction", "")
        
        lines.append(
            f"{scope_emoji} **[P{priority}]** Bei '{trigger_desc}':\n"
            f"   → {instruction}"
        )
        
        # Add example if available
        examples = rule.get("examples", [])
        if examples and isinstance(examples, list) and examples:
            ex = examples[0]
            if isinstance(ex, dict):
                if ex.get('bad'):
                    lines.append(f"   ❌ Nicht: {ex.get('bad', '')}")
                if ex.get('good'):
                    lines.append(f"   ✅ Besser: {ex.get('good', '')}")
    
    return "\n\n".join(lines)


def format_patterns_for_context(patterns: List[Dict[str, Any]]) -> str:
    """Formatiert gelernte Patterns für CHIEF Context"""
    if not patterns:
        return "Noch keine Patterns erkannt."
    
    lines = []
    for pattern in patterns[:5]:  # Max 5 patterns
        success = pattern.get("success_rate", 0) or 0
        success_pct = f"{success * 100:.0f}%" if success else "?"
        
        context = pattern.get("context_filter", {})
        channels = context.get("channels", ["alle"])
        if isinstance(channels, list):
            channels_str = ", ".join(channels)
        else:
            channels_str = str(channels)
        
        pattern_type = pattern.get("pattern_type", "Unbekannt")
        description = pattern.get("pattern_description", "")
        
        lines.append(
            f"• **{pattern_type}** ({success_pct} Erfolg)\n"
            f"  {description}" if description else f"• **{pattern_type}** ({success_pct} Erfolg)\n"
            f"  Kanäle: {channels_str}"
        )
    
    return "\n".join(lines)


def format_broadcasts_for_context(broadcasts: List[Dict[str, Any]]) -> str:
    """Formatiert Team Broadcasts für CHIEF Context"""
    if not broadcasts:
        return "Keine Team Best Practices verfügbar."
    
    lines = []
    for bc in broadcasts[:3]:  # Max 3 broadcasts
        perf = bc.get("performance_data", {}) or {}
        reply_rate = perf.get("reply_rate", 0) or 0
        improvement = perf.get("improvement_vs_average", "")
        
        title = bc.get("title", "Unbekannt")
        description = bc.get("description", "")
        
        lines.append(
            f"📣 **{title}**\n"
            f"   {description}\n"
            f"   Performance: {reply_rate * 100:.0f}% Antwortrate {improvement}"
        )
    
    return "\n\n".join(lines)


def build_living_os_context_prompt(
    rules: List[Dict[str, Any]],
    patterns: List[Dict[str, Any]],
    broadcasts: List[Dict[str, Any]],
    skill_level: str = "advanced",
) -> str:
    """
    Baut den vollständigen Living OS Prompt.
    
    Args:
        rules: Aktive Regeln
        patterns: Erkannte Patterns
        broadcasts: Team Broadcasts
        skill_level: rookie, advanced, pro
        
    Returns:
        Formatierter Prompt String
    """
    formatted_rules = format_rules_for_context(rules)
    formatted_patterns = format_patterns_for_context(patterns)
    formatted_broadcasts = format_broadcasts_for_context(broadcasts)
    
    # Main prompt
    prompt = CHIEF_LIVING_OS_PROMPT.format(
        active_rules=formatted_rules,
        learned_patterns=formatted_patterns,
        team_broadcasts=formatted_broadcasts,
    )
    
    # Add skill level adaptation
    skill_prompt = SKILL_LEVEL_PROMPTS.get(skill_level, SKILL_LEVEL_PROMPTS["advanced"])
    prompt += "\n" + skill_prompt
    
    # Add command detection for Pro users
    if skill_level == "pro":
        prompt += "\n" + CHIEF_COMMAND_DETECTION_PROMPT
    
    return prompt


def get_override_feedback_message(
    pattern: str,
    occurrence_count: int,
) -> str:
    """
    Generiert Feedback-Nachricht wenn Pattern erkannt wurde.
    
    Args:
        pattern: Der erkannte Pattern-Typ
        occurrence_count: Wie oft das Pattern vorkam
        
    Returns:
        Feedback-Nachricht für den User
    """
    pattern_descriptions = {
        "shorter_more_direct": "kürzer und direkter formulierst",
        "longer_more_detailed": "ausführlicher schreibst",
        "informal_tone": "lockerer/informeller formulierst",
        "formal_tone": "formeller formulierst",
        "emoji_removed": "Emojis entfernst",
        "emoji_added": "mehr Emojis verwendest",
        "question_added": "Fragen hinzufügst",
        "no_emojis": "ohne Emojis schreibst",
        "more_questions": "mehr Fragen stellst",
        "casual_friendly": "freundlich-locker formulierst",
    }
    
    desc = pattern_descriptions.get(pattern, f"Änderungen vom Typ '{pattern}' machst")
    
    if occurrence_count >= 5:
        return (
            f"💡 Mir fällt auf, dass du meine Vorschläge oft {desc}.\n\n"
            f"Soll ich das in Zukunft direkt so machen? Das würde dir Zeit sparen."
        )
    elif occurrence_count >= 3:
        return (
            f"📝 Ich habe bemerkt, dass du {desc}. "
            f"Bei noch ein paar ähnlichen Änderungen frage ich, ob ich das automatisch so machen soll."
        )
    
    return ""


# =============================================================================
# CONTEXT INJECTION HELPERS
# =============================================================================

def should_show_command_hint(skill_level: str, message: str) -> bool:
    """
    Prüft ob ein Command-Hint gezeigt werden sollte.
    
    Für Pro-User zeigen wir Hints wie man Befehle gibt.
    """
    if skill_level != "pro":
        return False
    
    # Prüfe ob Nachricht wie ein impliziter Befehl aussieht
    indicators = [
        "mach das immer",
        "ab jetzt",
        "in zukunft",
        "merke dir",
        "bei einwand",
        "wenn jemand",
    ]
    
    message_lower = message.lower()
    return any(ind in message_lower for ind in indicators)


def get_command_hint() -> str:
    """Gibt Hint für Command-Nutzung zurück"""
    return (
        "\n\n💡 **Tipp:** Du kannst mir auch direkte Befehle geben:\n"
        "`CHIEF, bei [Situation] immer [Aktion]`\n"
        "Dann speichere ich das als Regel."
    )

