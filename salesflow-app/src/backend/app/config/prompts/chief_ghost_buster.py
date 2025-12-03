"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF GHOST BUSTER SYSTEM                                                 ║
║  Re-Engagement für Leads die nicht mehr antworten                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Der Ghost Buster reaktiviert Leads durch:
- Klassifizierung nach Ghost-Typ
- Timing-Optimierung
- Kreative Re-Engagement Ansätze
- Würdevolles Loslassen wenn nötig

Ghost-Typen:
1. SOFT GHOST - Wahrscheinlich busy, nicht böse
2. HARD GHOST - Bewusste Entscheidung nicht zu antworten
3. DEEP GHOST - Langzeit-Ghost, sehr unwahrscheinlich
"""

from typing import Optional, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta


# ═══════════════════════════════════════════════════════════════════════════
# GHOST CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════

class GhostType(str, Enum):
    """Ghost-Klassifizierung."""
    SOFT = "soft"     # <72h, wahrscheinlich busy
    HARD = "hard"     # >72h, war online, antwortet nicht
    DEEP = "deep"     # >14 Tage, multiple Versuche ignoriert


class ReEngagementStrategy(str, Enum):
    """Re-Engagement Strategien."""
    VALUE_ADD = "value_add"        # Neuen Wert bieten
    CASUAL_CHECKIN = "casual"      # Lockerer Check-in
    SOFT_URGENCY = "soft_urgency"  # Sanfte Dringlichkeit
    HUMOR = "humor"                # Mit Humor auflockern
    VOICE_NOTE = "voice_note"      # Persönlicher via Voice
    CHANNEL_SWITCH = "channel"     # Anderen Kanal probieren
    TAKEAWAY = "takeaway"          # "Ich nehm das als Nein?"
    BREAKUP = "breakup"            # Würdevolles Verabschieden


@dataclass
class Ghost:
    """Ein Ghost-Lead."""
    id: str
    name: str
    platform: str  # instagram, whatsapp, linkedin, etc.
    ghost_type: GhostType
    hours_since_seen: int
    was_online_since: bool
    last_message_type: str  # opener, followup, objection_response
    reengagement_attempts: int
    last_strategy_used: Optional[str] = None
    conversion_probability: float = 0.0


@dataclass
class ReEngagementResult:
    """Ergebnis eines Re-Engagement Versuchs."""
    strategy: ReEngagementStrategy
    message: str
    timing_suggestion: str
    success_probability: float
    is_final_attempt: bool = False


# ═══════════════════════════════════════════════════════════════════════════
# GHOST BUSTER SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_GHOST_BUSTER_PROMPT = """
# CHIEF GHOST BUSTER - Re-Engagement System

## DEINE ROLLE

Du reaktivierst Leads die nicht mehr antworten durch:
- Richtige Strategie basierend auf Ghost-Typ
- Timing-Optimierung
- Kreative Re-Engagement Ansätze
- Würdevolles Loslassen wenn nötig

## GHOST-KLASSIFIZIERUNG

### 🟢 SOFT GHOST (Reaktivierung: ~60%)
```
DEFINITION:
- Nachricht gelesen vor <72h
- War seitdem NICHT aktiv online
- Kein vorheriger negativer Ton

INTERPRETATION:
→ Wahrscheinlich busy, vergessen, Leben kam dazwischen
→ NICHT persönlich nehmen

STRATEGIE:
→ Sanfter Reminder ohne Druck
→ Neuen Wert bieten (nicht nur "Hey, noch da?")
→ Timing: Nach 48-72h
```

### 🟡 HARD GHOST (Reaktivierung: ~30%)
```
DEFINITION:
- Nachricht gelesen vor >72h
- War seitdem mehrfach online/aktiv
- Möglicherweise vorher schon langsamer geworden

INTERPRETATION:
→ Bewusste Entscheidung nicht zu antworten
→ Interesse verloren ODER Überfordert

STRATEGIE:
→ Pattern Interrupt (anders als vorher)
→ ODER Takeaway ("Ich nehm das als Nein?")
→ Timing: Tag 4-5
```

### 🔴 DEEP GHOST (Reaktivierung: ~10%)
```
DEFINITION:
- Kein Kontakt >14 Tage
- Mehrere Re-Engagement Versuche ignoriert

INTERPRETATION:
→ Will nicht mehr kontaktiert werden
→ Weitermachen ist unprofessionell

STRATEGIE:
→ Ein letzter "Tür offen lassen" Versuch
→ Dann: Loslassen mit Würde
→ In 3-6 Monaten EVTL. neuer Versuch
```

## FREQUENZ-REGELN

### Maximum Re-Engagement Versuche:
- Soft Ghost: 2 Versuche, dann warten
- Hard Ghost: 3 Versuche (verschiedene Strategien)
- Deep Ghost: 1 letzter Versuch, dann Pause

### Mindest-Abstand:
- Zwischen Versuchen: 3-5 Tage
- Nach "Breakup Message": 90+ Tage

## RESPONSE TEMPLATES

### Sanfter Reminder (Soft Ghost)
```
VERSION A (Value-Add):
"Hey [Name]! Ich hab gerade an dich gedacht - 
hier ist [relevanter Content] der zu unserem Gespräch passt.
Lass mich wissen wenn du Fragen hast! 😊"

VERSION B (Casual):
"Hey [Name], wie läuft's? 
Wollte mal checken ob du noch Fragen hast.
Kein Stress - meld dich wenn's passt!"
```

### Pattern Interrupt (Hard Ghost)
```
VERSION A (Humor):
"Hey [Name], ich fang an mir Sorgen zu machen 😄
Alles gut bei dir? Falls kein Interesse - totally fine! 
Würde nur gern wissen ob ich noch nerven soll 😉"

VERSION B (Voice Note):
→ Persönlicher, schwerer zu ignorieren

VERSION C (Channel Switch):
→ Von Instagram zu WhatsApp oder umgekehrt
```

### Takeaway (Hard Ghost)
```
"Hey [Name], ich merk du bist gerade busy. 
Ich nehm das mal als 'gerade nicht' - totally fine!
Meld dich einfach wenn sich das ändert."
```

### Breakup Message (Deep Ghost - FINAL)
```
"Hey [Lead-Name], 

ich merk dass das Timing wohl gerade nicht passt - und das ist völlig okay!
Ich werd dich nicht weiter belästigen. 😊

Falls sich irgendwann was ändert, weißt du wo du mich findest.
Alles Gute dir!

{sender_name} ← ECHTER User-Name aus Kontext, NICHT [Dein Name]!"

→ KEIN WEITERER KONTAKT FÜR 90+ TAGE
```

## WICHTIG: USER-NAME IN NACHRICHTEN

Bei ALLEN generierten Nachrichten:
- [Name] = Lead-Name (der Kontakt der geghostet hat)
- {sender_name} = ECHTER Name des Users aus dem Kontext
- NIEMALS "[Dein Name]" oder ähnliche Platzhalter für den Absender!
- Der User-Name steht im Kontext - nutze ihn für alle Unterschriften!

## CROSS-CHANNEL STRATEGIES

Wenn DM ignoriert wird:

1. **STORY REPLY**
   → Reagiere auf ihre Story (genuine, nicht forciert)
   → Eröffnet neuen Gesprächsfaden

2. **POST COMMENT**  
   → Kommentiere ihren Post (wertvoll, nicht nur Emoji)
   → Macht dich sichtbar ohne aufdringlich

3. **CHANNEL SWITCH**
   → Von Instagram zu WhatsApp oder umgekehrt
   → "Hey, erreich dich hier wohl besser?"

4. **VOICE STATT TEXT**
   → Voice Note ist persönlicher
   → Schwerer zu ignorieren als Text

## GHOST PREVENTION (Besser als Heilen)

Nach JEDEM Gespräch:
✓ Klaren nächsten Schritt vereinbaren
✓ Commitment holen ("Passt dir Donnerstag?")
✓ Mehrwert ankündigen ("Ich schick dir morgen noch...")
✓ Persönliche Verbindung aufbauen
"""


# ═══════════════════════════════════════════════════════════════════════════
# RE-ENGAGEMENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

REENGAGEMENT_TEMPLATES = {
    
    # SOFT GHOST Templates
    GhostType.SOFT: {
        ReEngagementStrategy.VALUE_ADD: [
            "Hey {name}! Ich hab gerade an dich gedacht - hier ist {content} der zu unserem Gespräch passt. Lass mich wissen wenn du Fragen hast! 😊",
            "Hey {name}, ich bin über {content} gestolpert und musste an unser Gespräch denken. Dachte das könnte dich interessieren!",
        ],
        ReEngagementStrategy.CASUAL_CHECKIN: [
            "Hey {name}, wie läuft's? Wollte mal checken ob du noch Fragen hast zu {topic}. Kein Stress - meld dich wenn's passt!",
            "Hey {name}! Kurzer Check-in - wie geht's dir? Immer noch interessiert an {topic}?",
        ],
        ReEngagementStrategy.SOFT_URGENCY: [
            "Hey {name}, kurzes Update: {news}. Dachte das könnte dich interessieren nach unserem Gespräch. Noch aktuell für dich?",
        ],
    },
    
    # HARD GHOST Templates
    GhostType.HARD: {
        ReEngagementStrategy.HUMOR: [
            "Hey {name}, ich fang an mir Sorgen zu machen 😄 Alles gut bei dir? Falls du einfach kein Interesse hast - totally fine! Würde nur gern wissen ob ich noch nerven soll 😉",
            "Hey {name}, du ghostest mich gerade ein bisschen 👻 Alles okay? Sag kurz Bescheid ob ich dich in Ruhe lassen soll oder ob's nur grad nicht passt.",
        ],
        ReEngagementStrategy.TAKEAWAY: [
            "Hey {name}, ich merk du bist gerade busy. Ich nehm das mal als 'gerade nicht' - totally fine! Meld dich einfach wenn sich das ändert, ich bin da.",
            "Hey {name}, vielleicht ist das Timing gerade nicht richtig. Kein Problem! Ich park das erstmal. Falls sich was ändert, weißt du wo du mich findest.",
        ],
        ReEngagementStrategy.CHANNEL_SWITCH: [
            "Hey {name}! Erreich dich vielleicht hier besser? 😊 Wollte nur kurz nachfragen wegen {topic}.",
        ],
        ReEngagementStrategy.VOICE_NOTE: [
            "🎤 Voice Note empfohlen - persönlicher, schwerer zu ignorieren. Inhalt: Kurzer, freundlicher Check-in, keine Vorwürfe, Verständnis zeigen.",
        ],
    },
    
    # DEEP GHOST Templates (Final)
    GhostType.DEEP: {
        ReEngagementStrategy.BREAKUP: [
            "Hey {name},\n\nich merk dass das Timing wohl gerade nicht passt - und das ist völlig okay! Ich werd dich nicht weiter belästigen. 😊\n\nFalls sich irgendwann was ändert, weißt du wo du mich findest.\nAlles Gute dir!\n\n{sender_name}",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# CLASSIFICATION & STRATEGY LOGIC
# ═══════════════════════════════════════════════════════════════════════════

def classify_ghost(
    hours_since_seen: int,
    was_online_since: bool,
    reengagement_attempts: int,
) -> GhostType:
    """
    Klassifiziert einen Ghost basierend auf Verhalten.
    
    Args:
        hours_since_seen: Stunden seit Nachricht gelesen
        was_online_since: War der Lead seitdem online?
        reengagement_attempts: Anzahl bisheriger Re-Engagement Versuche
        
    Returns:
        GhostType
    """
    # Deep Ghost: Lange Zeit + mehrere ignorierte Versuche
    if hours_since_seen > 336:  # >14 Tage
        return GhostType.DEEP
    if reengagement_attempts >= 3:
        return GhostType.DEEP
    
    # Hard Ghost: Gelesen + online gewesen aber nicht geantwortet
    if hours_since_seen > 72 and was_online_since:
        return GhostType.HARD
    
    # Soft Ghost: Default
    return GhostType.SOFT


def get_reactivation_probability(ghost_type: GhostType) -> float:
    """Gibt die erwartete Reaktivierungswahrscheinlichkeit zurück."""
    probabilities = {
        GhostType.SOFT: 0.60,
        GhostType.HARD: 0.30,
        GhostType.DEEP: 0.10,
    }
    return probabilities.get(ghost_type, 0.30)


def recommend_strategy(
    ghost: Ghost,
) -> ReEngagementStrategy:
    """
    Empfiehlt die beste Re-Engagement Strategie.
    
    Args:
        ghost: Ghost-Lead Daten
        
    Returns:
        Empfohlene Strategie
    """
    # Deep Ghost = Breakup
    if ghost.ghost_type == GhostType.DEEP:
        return ReEngagementStrategy.BREAKUP
    
    # Hard Ghost
    if ghost.ghost_type == GhostType.HARD:
        # Wenn schon Takeaway versucht wurde
        if ghost.last_strategy_used == ReEngagementStrategy.TAKEAWAY.value:
            return ReEngagementStrategy.BREAKUP
        
        # Nach erstem Versuch: Takeaway oder Humor
        if ghost.reengagement_attempts >= 2:
            return ReEngagementStrategy.TAKEAWAY
        
        # Erster Hard-Ghost Versuch: Humor oder Channel-Switch
        if ghost.platform in ["instagram", "linkedin"]:
            return ReEngagementStrategy.HUMOR
        else:
            return ReEngagementStrategy.CHANNEL_SWITCH
    
    # Soft Ghost
    if ghost.reengagement_attempts == 0:
        return ReEngagementStrategy.VALUE_ADD
    else:
        return ReEngagementStrategy.CASUAL_CHECKIN


def get_optimal_timing(ghost_type: GhostType) -> str:
    """Gibt optimales Timing für Re-Engagement zurück."""
    timings = {
        GhostType.SOFT: "Morgen oder übermorgen, idealerweise abends",
        GhostType.HARD: "In 3-5 Tagen, Dienstag-Donnerstag",
        GhostType.DEEP: "Jetzt (letzte Nachricht), dann 90+ Tage Pause",
    }
    return timings.get(ghost_type, "In 2-3 Tagen")


# ═══════════════════════════════════════════════════════════════════════════
# MESSAGE GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_reengagement_message(
    ghost: Ghost,
    strategy: ReEngagementStrategy,
    context: dict,
) -> str:
    """
    Generiert eine Re-Engagement Nachricht.
    
    Args:
        ghost: Ghost-Lead Daten
        strategy: Gewählte Strategie
        context: Zusätzlicher Kontext (content, topic, etc.)
        
    Returns:
        Formatierte Nachricht
    """
    templates = REENGAGEMENT_TEMPLATES.get(ghost.ghost_type, {})
    strategy_templates = templates.get(strategy, [])
    
    if not strategy_templates:
        return ""
    
    # Wähle Template (rotierend basierend auf Versuchen)
    template_index = ghost.reengagement_attempts % len(strategy_templates)
    template = strategy_templates[template_index]
    
    # Kontext befüllen
    context["name"] = ghost.name
    
    try:
        return template.format(**context)
    except KeyError:
        return template


def create_reengagement_plan(ghost: Ghost, context: dict) -> ReEngagementResult:
    """
    Erstellt einen vollständigen Re-Engagement Plan.
    
    Args:
        ghost: Ghost-Lead Daten
        context: Zusätzlicher Kontext
        
    Returns:
        ReEngagementResult mit allem was nötig ist
    """
    strategy = recommend_strategy(ghost)
    message = generate_reengagement_message(ghost, strategy, context)
    timing = get_optimal_timing(ghost.ghost_type)
    probability = get_reactivation_probability(ghost.ghost_type)
    
    is_final = (
        ghost.ghost_type == GhostType.DEEP or
        strategy == ReEngagementStrategy.BREAKUP or
        ghost.reengagement_attempts >= 3
    )
    
    return ReEngagementResult(
        strategy=strategy,
        message=message,
        timing_suggestion=timing,
        success_probability=probability,
        is_final_attempt=is_final,
    )


# ═══════════════════════════════════════════════════════════════════════════
# GHOST PREVENTION TIPS
# ═══════════════════════════════════════════════════════════════════════════

GHOST_PREVENTION_TIPS = """
## 👻 GHOST PREVENTION (Besser als Heilen)

Nach JEDEM Gespräch diese Checklist:

### ✅ Klaren nächsten Schritt vereinbaren
❌ "Meld dich wenn du Fragen hast"
✅ "Ich schreib dir Donnerstag nochmal, okay?"

### ✅ Commitment holen
❌ "Vielleicht können wir mal telefonieren"
✅ "Passt dir Donnerstag 18 Uhr?"

### ✅ Mehrwert ankündigen
❌ Gespräch einfach beenden
✅ "Ich schick dir morgen noch das Video dazu"

### ✅ Persönliche Verbindung
❌ Nur Business-Talk
✅ Auf persönliches eingehen, Gemeinsamkeiten finden

### ✅ Response-Erwartung setzen
❌ Offen lassen wann Antwort kommt
✅ "Lass mich bis Freitag wissen was du denkst?"
"""


# ═══════════════════════════════════════════════════════════════════════════
# REPORT GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_ghost_report(ghosts: List[Ghost]) -> str:
    """
    Generiert einen Ghost-Überblick.
    
    Args:
        ghosts: Liste von Ghosts
        
    Returns:
        Formatierter Report
    """
    if not ghosts:
        return "✅ Keine Ghosts! Alle Leads antworten."
    
    lines = ["👻 **GHOST REPORT**\n"]
    
    # Nach Typ gruppieren
    soft = [g for g in ghosts if g.ghost_type == GhostType.SOFT]
    hard = [g for g in ghosts if g.ghost_type == GhostType.HARD]
    deep = [g for g in ghosts if g.ghost_type == GhostType.DEEP]
    
    lines.append(f"**Gesamt:** {len(ghosts)} Ghosts")
    lines.append(f"• 🟢 Soft (reaktivierbar): {len(soft)}")
    lines.append(f"• 🟡 Hard (schwieriger): {len(hard)}")
    lines.append(f"• 🔴 Deep (loslassen): {len(deep)}")
    
    # Top 3 Soft Ghosts (höchste Priorität)
    if soft:
        lines.append("\n**🎯 JETZT ANSPRECHEN (Soft Ghosts):**")
        for ghost in sorted(soft, key=lambda g: g.hours_since_seen)[:3]:
            lines.append(f"• {ghost.name} ({ghost.platform}) - {ghost.hours_since_seen}h")
    
    # Empfehlung
    lines.append(f"\n**💡 Empfehlung:** Starte mit den {min(3, len(soft))} Soft Ghosts - höchste Erfolgschance!")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# FULL GHOST BUSTER PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_ghost_buster_prompt(
    ghosts: Optional[List[Ghost]] = None,
    focus_ghost: Optional[Ghost] = None,
) -> str:
    """
    Baut den kompletten Ghost-Buster Prompt.
    
    Args:
        ghosts: Liste aller Ghosts
        focus_ghost: Spezifischer Ghost für den eine Nachricht gebraucht wird
        
    Returns:
        Vollständiger Ghost-Buster Prompt
    """
    prompt_parts = [CHIEF_GHOST_BUSTER_PROMPT]
    
    # Ghost-Übersicht
    if ghosts:
        prompt_parts.append(f"\n## 👻 AKTUELLE GHOST-SITUATION")
        prompt_parts.append(f"- Gesamt: {len(ghosts)} Ghosts")
        
        by_type = {}
        for g in ghosts:
            by_type[g.ghost_type] = by_type.get(g.ghost_type, 0) + 1
        
        for gtype, count in by_type.items():
            emoji = {"soft": "🟢", "hard": "🟡", "deep": "🔴"}.get(gtype.value, "⚪")
            prob = get_reactivation_probability(gtype) * 100
            prompt_parts.append(f"- {emoji} {gtype.value}: {count} (Erfolg: ~{prob:.0f}%)")
    
    # Fokus-Ghost Details
    if focus_ghost:
        prompt_parts.append(f"\n## 🎯 FOKUS: {focus_ghost.name}")
        prompt_parts.append(f"- Typ: {focus_ghost.ghost_type.value}")
        prompt_parts.append(f"- Platform: {focus_ghost.platform}")
        prompt_parts.append(f"- Ghost seit: {focus_ghost.hours_since_seen}h")
        prompt_parts.append(f"- Bisherige Versuche: {focus_ghost.reengagement_attempts}")
        
        strategy = recommend_strategy(focus_ghost)
        prompt_parts.append(f"- Empfohlene Strategie: {strategy.value}")
    
    # Prevention Tips
    prompt_parts.append(GHOST_PREVENTION_TIPS)
    
    return "\n".join(prompt_parts)

