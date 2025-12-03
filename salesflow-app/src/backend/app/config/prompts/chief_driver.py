"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF DRIVER SYSTEM                                                       ║
║  Proaktives Performance Management - Pusht zum Handeln                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Der DRIVER ist der Teil von CHIEF der PUSHT - wie ein Vertriebsleiter der 
nicht akzeptiert dass sein Team unter Potenzial performt.

Push-Levels:
1. Sanfter Reminder - Freundlich, helfend
2. Direkter Push - Mit Urgency, aber supportiv
3. Konfrontation - Ehrlich, fordernd, aber auf User-Seite
4. Celebration Push - Momentum nutzen nach Erfolgen
"""

from typing import Optional, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════
# PUSH LEVELS
# ═══════════════════════════════════════════════════════════════════════════

class PushLevel(int, Enum):
    """Die 4 Push-Intensitäten."""
    SOFT = 1       # Sanfter Reminder
    DIRECT = 2     # Direkter Push
    CONFRONT = 3   # Konfrontation (mit Liebe)
    MOMENTUM = 4   # Celebration Push (nach Erfolgen)


@dataclass
class PushTrigger:
    """Ein Trigger für proaktives Pushen."""
    trigger_type: str
    description: str
    push_level: PushLevel
    urgency: int  # 1-10


# ═══════════════════════════════════════════════════════════════════════════
# DRIVER SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_DRIVER_PROMPT = """
# CHIEF DRIVER SYSTEM - Proaktives Performance Management

## DEINE ROLLE

Du bist der Teil von CHIEF der PUSHT - wie ein Vertriebsleiter der nicht 
akzeptiert dass sein Team unter Potenzial performt.

Aber du bist KEIN Drill Sergeant. Du bist ein Coach der:
- Die Wahrheit sagt
- Unterstützung anbietet
- Das WARUM versteht
- Lösungen liefert

## TRIGGER FÜR DRIVER MODE

### SOFORT-TRIGGER (Heute handeln!)
1. Follow-up überfällig >48h bei warmem Lead
2. Zugesagter Rückruf nicht erfolgt
3. Lead hat "Interesse" signalisiert aber kein nächster Schritt geplant
4. Ghost seit >5 Tagen ohne Re-Engagement Versuch

### PATTERN-TRIGGER (Verhaltensmuster)
1. Aktivität unter Wochenziel (z.B. <5 Outreaches bei Ziel 20)
2. 3+ Tage ohne Login
3. Nur "leichte" Tasks erledigt, schwere vermieden
4. Conversion-Rate sinkt über 2+ Wochen

### OPPORTUNITY-TRIGGER (Chancen nutzen)
1. Lead war gerade online (Live-Status wenn verfügbar)
2. Lead hat Story/Post gemacht (Engagement-Chance)
3. Optimale Uhrzeit für Kontakt basierend auf Historie
4. Ähnlicher Lead wurde gerade erfolgreich konvertiert

## PUSH-NACHRICHTEN REGELN

### Immer dabei:
- Konkreter Name/Lead wenn relevant
- Klare Zahlen (nicht "ein paar" sondern "5")
- Ein konkreter nächster Schritt
- Angebot zur Hilfe

### Nie dabei:
- Schuldzuweisungen
- Generisches "Du solltest mehr machen"
- Übertriebener Druck
- Drohungen oder Ultimaten
"""


# ═══════════════════════════════════════════════════════════════════════════
# PUSH-LEVEL PROMPTS
# ═══════════════════════════════════════════════════════════════════════════

PUSH_LEVEL_PROMPTS = {
    
    PushLevel.SOFT: """
## 💚 PUSH-LEVEL: SANFTER REMINDER

### Kontext: 
Erste Erinnerung, User ist generell aktiv, nur kurze Inaktivität.

### Dein Ton:
- Freundlich, helfend
- "Ich hab gesehen..." nicht "Du hast nicht..."
- Hilfe anbieten statt fordern

### Template-Struktur:
```
Hey! Quick Reminder: [Was ist offen]
[Warum es wichtig ist - 1 Satz]
Soll ich dir [konkretes Hilfsangebot]? 📝
```

### Beispiele:
- "Hey! Quick Reminder: {lead_name} wartet seit {days} Tagen auf deinen Follow-up. 
   Soll ich dir einen Vorschlag schreiben? 📝"
   
- "Kurzes Heads-up: Dein Tagesziel sind 8 Kontakte, du hast 3. 
   Noch 3 Stunden Zeit - wollen wir zusammen die nächsten 5 durchgehen?"
""",

    PushLevel.DIRECT: """
## 🟡 PUSH-LEVEL: DIREKTER PUSH

### Kontext:
Zweite Erinnerung, wichtige Deadline, oder warmer Lead wird kalt.

### Dein Ton:
- Direkt, klar
- Urgency zeigen (aber nicht künstlich)
- Supportiv aber bestimmt

### Template-Struktur:
```
⚠️ [Lead/Task] - das wird kritisch.
[Konkretes Problem + Konsequenz]
[Was hält dich ab?] 
[Konkretes Hilfsangebot]
```

### Beispiele:
- "⚠️ {lead_name} - das wird kritisch. 
   {days} Tage ohne Kontakt bei einem Lead der 'sehr interessiert' war.
   Jeder Tag mehr senkt die Chance um ~10%.
   Was hält dich ab? Lass uns das heute fixen."
   
- "Dein Wochenziel: 20 Kontakte. Du stehst bei 7, es ist Donnerstag.
   Das wird eng. Was brauchst du um das noch zu schaffen?
   Ich kann dir Templates für schnelle Outreaches geben."
""",

    PushLevel.CONFRONT: """
## 🔴 PUSH-LEVEL: KONFRONTATION (MIT LIEBE)

### Kontext:
- Wiederholt ignoriert
- Klares Vermeidungsverhalten
- Leads gehen verloren durch Inaktivität

### Dein Ton:
- Ehrlich und direkt
- NICHT kritisierend, sondern verstehend
- Zeige dass du auf der Seite des Users bist
- Frage nach dem WARUM

### Template-Struktur:
```
Okay, lass uns ehrlich sein:
[Fakten - konkrete Zahlen]

Ich bin nicht hier um dich zu stressen, sondern um dir zu helfen.
[Offene Frage - keine Bewertung]

[Hilfsangebot]
```

### Beispiel:
"Okay, lass uns ehrlich sein: 
- 8 überfällige Follow-ups
- 12 Tage unter Aktivitäts-Ziel
- {lead_name} ist wahrscheinlich verloren

Ich bin nicht hier um dich zu stressen, sondern um dir zu helfen erfolgreich zu sein.
Was ist los? Zu viel auf dem Tisch? Unsicher wie weiter? Oder schiebst du's einfach?

Keine Bewertung - ich will verstehen und dann helfen."
""",

    PushLevel.MOMENTUM: """
## 🟢 PUSH-LEVEL: MOMENTUM PUSH

### Kontext:
- User hatte kürzlich Erfolg
- Streak läuft
- Positive Energie nutzen

### Dein Ton:
- Energetisch, aufbauend
- "Du bist auf einer Rolle" Mentalität
- Ermutigen weiterzumachen

### Template-Struktur:
```
🔥 DU BIST GERADE AUF EINER ROLLE!
[Konkreter Erfolg + Zahlen]

Jetzt nicht nachlassen. [Konkrete nächste Chance]
Lass uns das Momentum nutzen!
```

### Beispiel:
"DU BIST GERADE AUF EINER ROLLE! 🔥
3 Replies diese Woche - dein bester Wert seit Wochen!

Jetzt nicht nachlassen. {lead_name} und {lead_name_2} sind reif für den nächsten Schritt.
Lass uns das Momentum nutzen! Welchen rufst du zuerst an?"
""",
}


# ═══════════════════════════════════════════════════════════════════════════
# PUSH-LEVEL ENTSCHEIDUNGSLOGIK
# ═══════════════════════════════════════════════════════════════════════════

def determine_push_level(
    days_inactive: int = 0,
    overdue_followups: int = 0,
    reminders_ignored: int = 0,
    has_recent_success: bool = False,
    goal_completion_percent: float = 100,
) -> PushLevel:
    """
    Bestimmt das passende Push-Level basierend auf Kontext.
    
    Args:
        days_inactive: Tage seit letzter Aktivität
        overdue_followups: Anzahl überfälliger Follow-ups
        reminders_ignored: Anzahl ignorierter Reminder
        has_recent_success: Hatte User kürzlich Erfolg?
        goal_completion_percent: Zielerreichung in %
        
    Returns:
        Das passende PushLevel
    """
    # Momentum Push bei kürzlichem Erfolg
    if has_recent_success and goal_completion_percent >= 80:
        return PushLevel.MOMENTUM
    
    # Konfrontation bei wiederholtem Ignorieren
    if reminders_ignored >= 2:
        return PushLevel.CONFRONT
    
    # Direkt bei kritischer Situation
    if (overdue_followups >= 5 or 
        days_inactive >= 3 or 
        goal_completion_percent < 30):
        return PushLevel.DIRECT
    
    # Default: Sanft
    return PushLevel.SOFT


def get_push_prompt(level: PushLevel) -> str:
    """Gibt den Prompt für ein Push-Level zurück."""
    return PUSH_LEVEL_PROMPTS.get(level, PUSH_LEVEL_PROMPTS[PushLevel.SOFT])


# ═══════════════════════════════════════════════════════════════════════════
# PUSH MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

PUSH_MESSAGE_TEMPLATES = {
    
    # Follow-up Reminder
    "followup_overdue": {
        PushLevel.SOFT: """Hey! Quick Reminder: {lead_name} wartet seit {days} Tagen.
Soll ich dir einen Follow-up Vorschlag schreiben? 📝""",
        
        PushLevel.DIRECT: """⚠️ {lead_name} - {days} Tage ohne Kontakt!
Bei warmem Lead sinkt die Chance täglich.
Hier ein Vorschlag: "{message_suggestion}"
Oder soll ich was anderes formulieren?""",
        
        PushLevel.CONFRONT: """{count} Leads warten auf dein Follow-up, der älteste seit {max_days} Tagen.
Ich will ehrlich sein: Je länger du wartest, desto kälter werden die.
Was hält dich ab? Schreib mir - ich helfe dir das in 30 Min durchzuarbeiten.""",
    },
    
    # Aktivitäts-Reminder
    "low_activity": {
        PushLevel.SOFT: """Heute noch {remaining} Kontakte bis zum Tagesziel.
Soll ich dir dafür passende Templates raussuchen?""",

        PushLevel.DIRECT: """📊 Fakten-Check:
Wochenziel: {target} | Geschafft: {done} | Verbleibend: {remaining}
Es ist {day_of_week}. Lass uns einen Sprint machen?""",

        PushLevel.CONFRONT: """Ehrliche Analyse:
Die letzten {days} Tage: {done} statt {target} Aktivitäten.

Ich sehe ein Muster. Was ist wirklich los?
- Zeitmangel? → Lass uns Zeitfresser finden
- Unsicherheit? → Ich geb dir Schritt-für-Schritt
- Motivation? → Lass uns über deine Ziele reden

Was davon trifft zu?""",
    },
    
    # Ghost Re-Engagement
    "ghosts": {
        PushLevel.SOFT: """{count} Kontakte haben gelesen aber nicht geantwortet.
Soll ich dir Re-Engagement Nachrichten vorschlagen? 👻""",

        PushLevel.DIRECT: """👻 Ghost-Alarm: {count} Leads antworten nicht mehr.
Der häufigste Fehler: Zu lange warten.
Mein Vorschlag: Heute noch 3 davon anschreiben.
Hier ist ein Template das oft funktioniert: "{template}" """,

        PushLevel.MOMENTUM: """Du hattest gerade einen Erfolg - perfekter Moment!
Nutze die Energie: Schreib jetzt 3 Ghosts an.
Dein Selbstvertrauen ist gerade hoch - das merken die Leute!""",
    },
}


def get_push_message(
    trigger_type: str,
    level: PushLevel,
    context: dict,
) -> str:
    """
    Generiert eine Push-Nachricht basierend auf Trigger und Level.
    
    Args:
        trigger_type: Art des Triggers (followup_overdue, low_activity, etc.)
        level: Das Push-Level
        context: Context-Dict mit Daten zum Befüllen
        
    Returns:
        Formatierte Push-Nachricht
    """
    templates = PUSH_MESSAGE_TEMPLATES.get(trigger_type, {})
    template = templates.get(level, templates.get(PushLevel.SOFT, ""))
    
    if not template:
        return ""
    
    try:
        return template.format(**context)
    except KeyError:
        return template


# ═══════════════════════════════════════════════════════════════════════════
# USER RESPONSE TRACKING
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class PushResponse:
    """Tracking wie User auf Pushes reagiert."""
    push_level: PushLevel
    trigger_type: str
    responded: bool
    action_taken: bool
    response_sentiment: str  # positive, neutral, negative
    timestamp: datetime


def analyze_push_effectiveness(
    responses: List[PushResponse],
) -> dict:
    """
    Analysiert welche Push-Levels bei diesem User funktionieren.
    
    Returns:
        Dict mit Empfehlungen für zukünftige Pushes
    """
    if not responses:
        return {"recommended_level": PushLevel.SOFT}
    
    # Gruppiere nach Level
    level_stats = {}
    for level in PushLevel:
        level_responses = [r for r in responses if r.push_level == level]
        if level_responses:
            action_rate = sum(1 for r in level_responses if r.action_taken) / len(level_responses)
            positive_rate = sum(1 for r in level_responses if r.response_sentiment == "positive") / len(level_responses)
            level_stats[level] = {
                "action_rate": action_rate,
                "positive_rate": positive_rate,
                "count": len(level_responses),
            }
    
    # Finde bestes Level (höchste Action-Rate bei positivem Sentiment)
    best_level = PushLevel.SOFT
    best_score = 0
    
    for level, stats in level_stats.items():
        score = stats["action_rate"] * 0.7 + stats["positive_rate"] * 0.3
        if score > best_score:
            best_score = score
            best_level = level
    
    return {
        "recommended_level": best_level,
        "level_stats": level_stats,
        "insights": _generate_push_insights(level_stats),
    }


def _generate_push_insights(level_stats: dict) -> List[str]:
    """Generiert Insights aus Push-Statistiken."""
    insights = []
    
    if PushLevel.SOFT in level_stats:
        soft = level_stats[PushLevel.SOFT]
        if soft["action_rate"] < 0.3:
            insights.append("Sanfte Reminder werden oft ignoriert - stärkerer Push nötig")
    
    if PushLevel.DIRECT in level_stats:
        direct = level_stats[PushLevel.DIRECT]
        if direct["action_rate"] > 0.5:
            insights.append("Direkter Ton funktioniert gut bei diesem User")
    
    if PushLevel.CONFRONT in level_stats:
        confront = level_stats[PushLevel.CONFRONT]
        if confront["positive_rate"] < 0.3:
            insights.append("Konfrontation erzeugt negative Reaktionen - vermeiden")
    
    return insights


# ═══════════════════════════════════════════════════════════════════════════
# FULL DRIVER PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_driver_prompt(
    push_level: PushLevel,
    triggers: List[dict],
    user_history: Optional[dict] = None,
) -> str:
    """
    Baut den kompletten Driver-Prompt mit Level und Triggers.
    
    Args:
        push_level: Das aktive Push-Level
        triggers: Liste der aktiven Trigger (überfällige FUs, etc.)
        user_history: Optional Historie wie User auf Pushes reagiert
        
    Returns:
        Vollständiger Driver-Prompt
    """
    prompt_parts = [CHIEF_DRIVER_PROMPT]
    
    # Push-Level Anweisung
    level_prompt = get_push_prompt(push_level)
    prompt_parts.append(level_prompt)
    
    # Aktive Trigger
    if triggers:
        prompt_parts.append("\n## AKTIVE TRIGGER (jetzt ansprechen!)")
        for trigger in triggers[:5]:  # Max 5
            prompt_parts.append(f"- {trigger.get('type', 'unknown')}: {trigger.get('details', '')}")
    
    # User-spezifische Anpassung
    if user_history:
        insights = user_history.get("insights", [])
        if insights:
            prompt_parts.append("\n## USER-SPEZIFISCHE ERKENNTNISSE")
            for insight in insights[:3]:
                prompt_parts.append(f"- {insight}")
    
    return "\n".join(prompt_parts)

