"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF PROMPT EXTENSION: SALES BRAIN RULES INTEGRATION                    ║
║  Selbstlernende Regeln in den CHIEF Prompt einbinden                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Datei enthält:
    - Base Prompt für Sales Brain Rules
    - Formatting-Funktionen für CHIEF Integration
    - Prioritäts-basierte Sortierung
"""

from typing import List, Optional, Dict, Any


# =============================================================================
# BASE PROMPT
# =============================================================================

CHIEF_BRAIN_RULES_PROMPT = """
[PERSÖNLICHE LERNREGELN – DIESE HABEN HÖCHSTE PRIORITÄT]

Du hast Zugriff auf Lernregeln, die aus den Korrekturen des Users extrahiert wurden.
Diese Regeln spiegeln die persönlichen Präferenzen und den Stil des Users wider.

ANWENDUNGSREGELN:

1. PRIORITÄT DER REGELN
   🔴 override = IMMER anwenden, keine Ausnahmen
   🟡 high = In 95% der Fälle anwenden
   ⚪ normal = Standardmäßig anwenden, außer es gibt guten Grund
   💡 suggestion = Als Option anbieten

2. KONTEXT-MATCHING
   - Regeln mit Kontext (channel, lead_status, message_type) nur anwenden wenn Kontext passt
   - Regeln ohne Kontext gelten überall

3. BEISPIELE NUTZEN
   - Wenn example_bad und example_good vorhanden: Als Orientierung nutzen
   - Deinen Output gegen example_bad prüfen: Enthält er ähnliche Formulierungen?

4. TRANSPARENZ
   - Bei wichtigen Regeln kurz erwähnen: "(Basierend auf deiner Präferenz...)"
   - Nicht bei jeder Nachricht, nur wenn relevant

5. REGEL-FEEDBACK
   - Wenn du merkst, dass eine Regel nicht passt: Frag den User
   - "Ich habe gelernt, dass du X bevorzugst. Gilt das auch hier?"

BEISPIEL:

Regel: "Verwende nie 'Ich würde gerne...'. Nutze direkte Aussagen."
Priorität: override
Kontext: {channel: "instagram_dm"}

❌ Falsch: "Hey Anna, ich würde gerne mal mit dir über..."
✅ Richtig: "Hey Anna, lass uns kurz über..."

Diese Regel gilt für alle Instagram DMs, ohne Ausnahme.
"""


# =============================================================================
# FORMATTING FUNCTIONS
# =============================================================================

def format_rules_for_chief_prompt(rules: List[Dict[str, Any]], max_rules: int = 10) -> str:
    """
    Formatiert Regeln als Teil des CHIEF Prompts.
    Wird in build_chief_context() aufgerufen.
    
    Args:
        rules: Liste von Rule-Dictionaries oder RuleResponse-Objekten
        max_rules: Maximale Anzahl an Regeln (Default: 10)
    
    Returns:
        Formatierter Prompt-Block für CHIEF
    """
    if not rules:
        return ""
    
    # Limit to max rules
    rules = rules[:max_rules]
    
    lines = [CHIEF_BRAIN_RULES_PROMPT, "", "AKTIVE REGELN:", ""]
    
    for i, rule in enumerate(rules, 1):
        # Support both dict and object access
        if hasattr(rule, 'priority'):
            priority = rule.priority
            title = rule.title
            instruction = rule.instruction
            context = rule.context
            example_bad = rule.example_bad
            example_good = rule.example_good
        else:
            priority = rule.get("priority", "normal")
            title = rule.get("title", "Unbenannte Regel")
            instruction = rule.get("instruction", "")
            context = rule.get("context", {})
            example_bad = rule.get("example_bad")
            example_good = rule.get("example_good")
        
        priority_emoji = {
            "override": "🔴",
            "high": "🟡",
            "normal": "⚪",
            "suggestion": "💡",
        }.get(priority, "⚪")
        
        lines.append(f"{priority_emoji} **{title}**")
        lines.append(f"   {instruction}")
        
        if context:
            context_parts = []
            if isinstance(context, dict):
                for k, v in context.items():
                    context_parts.append(f"{k}={v}")
            if context_parts:
                lines.append(f"   📍 Gilt für: {', '.join(context_parts)}")
        
        if example_bad and example_good:
            bad_preview = example_bad[:40] + "..." if len(str(example_bad)) > 40 else example_bad
            good_preview = example_good[:40] + "..." if len(str(example_good)) > 40 else example_good
            lines.append(f'   ❌ Nicht: "{bad_preview}"')
            lines.append(f'   ✅ Besser: "{good_preview}"')
        
        lines.append("")
    
    return "\n".join(lines)


def get_priority_order(priority: str) -> int:
    """Gibt die Sortierreihenfolge für eine Priorität zurück."""
    return {
        "override": 0,
        "high": 1,
        "normal": 2,
        "suggestion": 3,
    }.get(priority, 2)


def sort_rules_by_priority(rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sortiert Regeln nach Priorität und Effektivität.
    
    Args:
        rules: Liste von Rule-Dictionaries
    
    Returns:
        Sortierte Liste
    """
    def sort_key(rule):
        if hasattr(rule, 'priority'):
            priority = rule.priority
            effectiveness = rule.effectiveness_score or 0
            applied = rule.times_applied or 0
        else:
            priority = rule.get("priority", "normal")
            effectiveness = rule.get("effectiveness_score") or 0
            applied = rule.get("times_applied") or 0
        
        return (
            get_priority_order(priority),
            -effectiveness,
            -applied
        )
    
    return sorted(rules, key=sort_key)


def filter_rules_for_context(
    rules: List[Dict[str, Any]],
    channel: Optional[str] = None,
    lead_status: Optional[str] = None,
    message_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Filtert Regeln basierend auf dem aktuellen Kontext.
    
    Args:
        rules: Liste von Rule-Dictionaries
        channel: Aktueller Kanal (z.B. "instagram_dm")
        lead_status: Aktueller Lead-Status (z.B. "cold")
        message_type: Nachrichtentyp (z.B. "first_contact")
    
    Returns:
        Gefilterte Liste von Regeln
    """
    filtered = []
    
    for rule in rules:
        if hasattr(rule, 'context'):
            context = rule.context or {}
        else:
            context = rule.get("context", {}) or {}
        
        # Prüfe Kontext-Match
        match = True
        
        if channel and context.get("channel"):
            if context["channel"] != channel:
                match = False
        
        if lead_status and context.get("lead_status"):
            if context["lead_status"] != lead_status:
                match = False
        
        if message_type and context.get("message_type"):
            if context["message_type"] != message_type:
                match = False
        
        if match:
            filtered.append(rule)
    
    return filtered


# =============================================================================
# INTEGRATION HELPERS
# =============================================================================

def build_brain_rules_section(
    rules: List[Dict[str, Any]],
    channel: Optional[str] = None,
    lead_status: Optional[str] = None,
    message_type: Optional[str] = None,
    max_rules: int = 10,
) -> str:
    """
    Baut den kompletten Brain Rules Abschnitt für den CHIEF Prompt.
    
    Diese Funktion kombiniert Filtering, Sorting und Formatting.
    
    Args:
        rules: Alle verfügbaren Regeln des Users
        channel: Aktueller Kanal
        lead_status: Aktueller Lead-Status
        message_type: Nachrichtentyp
        max_rules: Maximale Anzahl an Regeln
    
    Returns:
        Formatierter Prompt-Block oder leerer String
    """
    if not rules:
        return ""
    
    # 1. Filter by context
    filtered = filter_rules_for_context(
        rules,
        channel=channel,
        lead_status=lead_status,
        message_type=message_type,
    )
    
    if not filtered:
        return ""
    
    # 2. Sort by priority and effectiveness
    sorted_rules = sort_rules_by_priority(filtered)
    
    # 3. Format for prompt
    return format_rules_for_chief_prompt(sorted_rules, max_rules)


# =============================================================================
# COMPACT FORMAT (for smaller context windows)
# =============================================================================

def format_rules_compact(rules: List[Dict[str, Any]], max_rules: int = 5) -> str:
    """
    Formatiert Regeln in kompakter Form für kleinere Context Windows.
    
    Args:
        rules: Liste von Regeln
        max_rules: Maximale Anzahl
    
    Returns:
        Kompakter Prompt-Block
    """
    if not rules:
        return ""
    
    rules = rules[:max_rules]
    
    lines = ["[PERSÖNLICHE REGELN - UNBEDINGT BEACHTEN]", ""]
    
    for rule in rules:
        if hasattr(rule, 'instruction'):
            instruction = rule.instruction
        else:
            instruction = rule.get("instruction", "")
        
        lines.append(f"• {instruction}")
    
    return "\n".join(lines)


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "CHIEF_BRAIN_RULES_PROMPT",
    "format_rules_for_chief_prompt",
    "get_priority_order",
    "sort_rules_by_priority",
    "filter_rules_for_context",
    "build_brain_rules_section",
    "format_rules_compact",
]

