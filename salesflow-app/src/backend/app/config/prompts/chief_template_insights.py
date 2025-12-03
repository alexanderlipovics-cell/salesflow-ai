"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF TEMPLATE INSIGHTS PROMPT                                            ║
║  Erweitert CHIEF mit selbstlernenden Template-Insights                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Gibt CHIEF Zugang zu den Top-performenden Templates des Users/Teams,
um bessere, datenbasierte Nachrichtenvorschläge zu machen.
"""

from typing import List, Optional, Dict, Any


# ═══════════════════════════════════════════════════════════════════════════
# TEMPLATE INSIGHTS PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_TEMPLATE_INSIGHTS_PROMPT = """
[TEMPLATE INSIGHTS – DEIN SELBST-LERNENDER TEIL]

Du bekommst im Kontext "top_templates" – die Templates mit der besten Performance.

Jedes Template enthält:
- name, channel, preview (Textausschnitt)
- stats: events_sent, reply_rate, win_rate

DEINE AUFGABE:

1. NUTZE DIE TOP-TEMPLATES ALS INSPIRATION – NICHT ALS KOPIE
   - Übernimm NIE 1:1 den Text
   - Nutze Struktur, Tonalität, CTA als Vorlage
   - Passe IMMER an: Lead-Name, Situation, Kanal

2. PRIORITÄTEN:
   - Höhere win_rate > höhere reply_rate
   - Bei wenig Daten (< 20 sends): erwähne "noch zu wenig Daten"

3. SKILL-LEVEL ANPASSUNG:

   rookie:
   - Einfach, klar, kurz
   - 1:1 sendbar ohne Änderungen
   - Wenig Fachbegriffe

   advanced:
   - Social Proof einbauen
   - Konkrete CTAs (Call, Zoom, Voice)
   - Nutzen-Formulierungen

   pro:
   - Effizient, positioniert, keine Floskeln
   - 2-3 Varianten mit Einsatz-Szenario
   - Anspruchsvollere Texte

4. KANAL-ANPASSUNG:
   - Instagram/WhatsApp: Kurz, persönlich, klarer CTA
   - LinkedIn/Email: Strukturierter, kurze Absätze

5. BEISPIEL-ANTWORT:

   Heute fehlen dir noch 3 Kontakte.
   Basierend auf deinen Top-Templates (Win-Rate ~8%):

   Variante A – Soft (für vorsichtige Kontakte):
   ---
   Hey [Name], bin auf dein Profil gestoßen...
   ---

   Variante B – Direkt (für selbstbewusste):
   ---
   Hey [Name], ich helfe Leuten wie dir...
   ---

   Welche passt besser?

6. KEINE INTERNA PREISGEBEN:
   - Template-Namen nur optional erwähnen
   - Keine IDs oder exakte Stats zeigen
"""


# ═══════════════════════════════════════════════════════════════════════════
# SKILL LEVEL PROMPTS
# ═══════════════════════════════════════════════════════════════════════════

SKILL_LEVEL_PROMPTS = {
    "rookie": """
Der User ist ein ROOKIE:
- Gib einfache, klare Anweisungen
- Nachrichten sollten 1:1 kopierbar sein
- Erkläre kurz WARUM etwas funktioniert
- Vermeide Fachbegriffe
- Eine Variante reicht meist
""",
    
    "intermediate": """
Der User ist INTERMEDIATE:
- Gib 2 Varianten (soft/direkt)
- Erkläre die Unterschiede kurz
- Erwähne relevante Stats wenn verfügbar
- Erlaube Personalisierung
""",
    
    "advanced": """
Der User ist ADVANCED:
- Gib 2-3 Varianten mit Kontext
- Nutze fortgeschrittene Techniken (Social Proof, Urgency, Reframing)
- Zeige Stats und Learnings
- Sei effizienter in deinen Erklärungen
""",
    
    "pro": """
Der User ist ein PRO:
- Sei maximal effizient
- Gib Optionen mit klaren Trade-offs
- Keine Basics erklären
- Fokus auf Nuancen und Feinheiten
- A/B Test Vorschläge wenn sinnvoll
""",
}


# ═══════════════════════════════════════════════════════════════════════════
# CHANNEL-SPECIFIC PROMPTS
# ═══════════════════════════════════════════════════════════════════════════

CHANNEL_PROMPTS = {
    "instagram_dm": """
Kanal: Instagram DM
- Max 150-200 Zeichen ideal
- Persönlich, locker
- Emoji sparsam (1-2 max)
- Klarer CTA am Ende
- Keine Links im ersten Touch
""",
    
    "whatsapp": """
Kanal: WhatsApp
- Kann etwas länger sein (bis 300 Zeichen)
- Persönlich, direkt
- Voice Note als Option erwähnen
- Emojis OK
- Links funktionieren gut
""",
    
    "linkedin": """
Kanal: LinkedIn
- Professioneller Ton
- Bezug auf Profil/Gemeinsamkeiten
- 100-150 Zeichen für InMail
- Keine Emojis (oder sehr sparsam)
- Business-fokussiert
""",
    
    "email": """
Kanal: Email
- Betreff ist KRITISCH
- Kurze Absätze
- Klare Struktur
- 1 klarer CTA
- P.S. kann helfen
""",
    
    "phone": """
Kanal: Telefon/Voice
- Kurzes Intro
- Schnell zum Punkt
- Offene Fragen stellen
- Exit-Option geben
""",
}


# ═══════════════════════════════════════════════════════════════════════════
# BUILDER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def build_template_insights_prompt(
    top_templates: List[Dict[str, Any]],
    skill_level: str = "intermediate",
    channel: Optional[str] = None,
) -> str:
    """
    Baut den Template Insights Prompt für CHIEF.
    
    Args:
        top_templates: Liste von Top-Template Dicts
        skill_level: rookie, intermediate, advanced, pro
        channel: Optional spezifischer Kanal
        
    Returns:
        Formatierter Prompt String
    """
    parts = [CHIEF_TEMPLATE_INSIGHTS_PROMPT]
    
    # Skill Level
    skill_prompt = SKILL_LEVEL_PROMPTS.get(skill_level, SKILL_LEVEL_PROMPTS["intermediate"])
    parts.append(skill_prompt)
    
    # Channel
    if channel and channel in CHANNEL_PROMPTS:
        parts.append(CHANNEL_PROMPTS[channel])
    
    # Top Templates formatieren
    if top_templates:
        templates_text = format_templates_for_prompt(top_templates)
        parts.append(f"\n## Deine Top-Templates:\n{templates_text}")
    else:
        parts.append("\n## Keine Performance-Daten verfügbar\nErstelle Nachrichten basierend auf Best Practices.")
    
    return "\n".join(parts)


def format_templates_for_prompt(templates: List[Dict[str, Any]]) -> str:
    """
    Formatiert Templates als lesbaren String für den Prompt.
    
    Args:
        templates: Liste von Template Dicts
        
    Returns:
        Formatierter String
    """
    if not templates:
        return "Noch keine Performance-Daten verfügbar."
    
    lines = []
    for i, t in enumerate(templates, 1):
        stats = t.get("stats", {})
        reply_pct = (stats.get("reply_rate", 0) * 100)
        win_pct = (stats.get("win_rate", 0) * 100)
        sends = stats.get("events_sent", 0)
        
        name = t.get("name") or f"Template {i}"
        channel = t.get("channel") or "alle Kanäle"
        preview = t.get("preview", "")[:100]
        
        lines.append(f"""
### {i}. {name} ({channel})
- Reply-Rate: {reply_pct:.1f}% | Win-Rate: {win_pct:.1f}% | {sends} Sends
- Vorschau: "{preview}..."
""")
    
    return "\n".join(lines)


def get_full_chief_prompt(
    base_prompt: str,
    top_templates: Optional[List[Dict[str, Any]]] = None,
    skill_level: str = "intermediate",
    channel: Optional[str] = None,
) -> str:
    """
    Kombiniert Base Prompt mit Template Insights.
    
    Args:
        base_prompt: Der Standard CHIEF System Prompt
        top_templates: Liste von Top-Template Dicts (optional)
        skill_level: rookie, intermediate, advanced, pro
        channel: Optional spezifischer Kanal
        
    Returns:
        Vollständiger System Prompt
    """
    parts = [base_prompt]
    
    # Skill Level anpassen
    skill_prompt = SKILL_LEVEL_PROMPTS.get(skill_level)
    if skill_prompt:
        parts.append(f"\n## Skill Level Anpassung\n{skill_prompt}")
    
    # Template Insights wenn vorhanden
    if top_templates:
        insights = build_template_insights_prompt(
            top_templates, 
            skill_level=skill_level,
            channel=channel,
        )
        parts.append(insights)
    
    return "\n\n".join(parts)


# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT BUILDER FOR TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

def build_templates_context_section(
    templates: List[Dict[str, Any]],
    include_stats: bool = True,
) -> str:
    """
    Baut die Template-Sektion für den CHIEF Context.
    
    Args:
        templates: Liste von TopTemplateForChief Dicts
        include_stats: Stats einbeziehen?
        
    Returns:
        Formatierter Context-Abschnitt
    """
    if not templates:
        return """
## Template Insights
Noch keine ausreichenden Performance-Daten.
Erstelle Nachrichten basierend auf allgemeinen Best Practices.
"""
    
    lines = ["\n## Template Insights (basierend auf deinen Daten)"]
    
    for t in templates[:3]:  # Max 3 für Context
        stats = t.get("stats", {})
        
        if include_stats:
            reply_pct = (stats.get("reply_rate", 0) * 100)
            win_pct = (stats.get("win_rate", 0) * 100)
            sends = stats.get("events_sent", 0)
            
            confidence = "⚠️" if sends < 20 else "✅" if sends >= 50 else "📊"
            
            lines.append(f"""
**{t.get('name', 'Template')}** {confidence}
- Kanal: {t.get('channel', 'alle')}
- Stats: {reply_pct:.0f}% Reply, {win_pct:.0f}% Win ({sends} Sends)
- Stil: "{t.get('preview', '')[:80]}..."
""")
        else:
            lines.append(f"""
**{t.get('name', 'Template')}**
- Kanal: {t.get('channel', 'alle')}
- Stil: "{t.get('preview', '')[:80]}..."
""")
    
    lines.append("""
Nutze diese als Inspiration, nicht als Kopie. Passe immer an die konkrete Situation an.
""")
    
    return "\n".join(lines)

