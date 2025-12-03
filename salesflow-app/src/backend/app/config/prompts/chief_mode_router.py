"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF MODE ROUTER                                                         ║
║  Entscheidet automatisch welcher CHIEF Modus aktiviert wird                ║
╚════════════════════════════════════════════════════════════════════════════╝

Der Router analysiert:
1. User-Message Intent (was will der User?)
2. Context Signals (was zeigen die Daten?)
3. Proaktive Trigger (was sollte CHIEF ansprechen?)

Und wählt den passenden Modus:
- DRIVER: Bei Inaktivität, überfälligen Tasks
- COACH: Bei Skill-Gaps, Lernbedarf
- ANALYST: Bei Performance-Fragen
- COPILOT: Bei Live-Gespräch-Hilfe
- CELEBRATION: Bei Erfolgen, Milestones
"""

from typing import Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum
import re

from .chief_v3_core import ChiefMode, UserLevel


# ═══════════════════════════════════════════════════════════════════════════
# INTENT PATTERNS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class IntentPattern:
    """Ein Pattern zur Intent-Erkennung."""
    keywords: List[str]
    mode: ChiefMode
    priority: int = 0  # Höher = wichtiger bei Konflikten


# Intent-Patterns für Message-Analyse
INTENT_PATTERNS = [
    # COPILOT - Live Hilfe (höchste Priorität)
    IntentPattern(
        keywords=[
            "kunde sagt", "lead sagt", "er sagt", "sie sagt",
            "wie antworte ich", "was sage ich", "was soll ich sagen",
            "hilf mir bei", "schnelle hilfe", "jetzt gerade",
            "im gespräch", "schreibt gerade", "wartet auf antwort",
            "einwand", "zu teuer", "keine zeit", "kein interesse",
            "muss überlegen", "ghostet", "antwortet nicht",
        ],
        mode=ChiefMode.COPILOT,
        priority=100,
    ),
    
    # ANALYST - Daten & Performance
    IntentPattern(
        keywords=[
            "statistik", "zahlen", "performance", "analyse",
            "wie läuft", "meine zahlen", "conversion", "quote",
            "vergleich", "benchmark", "durchschnitt", "trend",
            "wie viele", "prozent", "rate", "report",
            "diese woche", "dieser monat", "letzten tage",
        ],
        mode=ChiefMode.ANALYST,
        priority=70,
    ),
    
    # COACH - Lernen & Verbessern
    IntentPattern(
        keywords=[
            "wie mache ich", "wie funktioniert", "tipps für",
            "verbessern", "lernen", "training", "besser werden",
            "was mache ich falsch", "warum klappt", "hilfe bei",
            "technik", "strategie", "vorgehen", "methode",
            "erkläre mir", "zeig mir", "bring mir bei",
        ],
        mode=ChiefMode.COACH,
        priority=60,
    ),
    
    # CELEBRATION - Erfolge (erkannt durch positive Aussagen)
    IntentPattern(
        keywords=[
            "geschafft", "abgeschlossen", "gewonnen", "verkauft",
            "hat gekauft", "hat unterschrieben", "zugesagt",
            "erster sale", "neuer kunde", "neuer partner",
            "ziel erreicht", "fertig", "done", "yes",
        ],
        mode=ChiefMode.CELEBRATION,
        priority=80,
    ),
    
    # DRIVER - wird meist durch Context getriggert, nicht Message
    IntentPattern(
        keywords=[
            "was soll ich tun", "wo anfangen", "was jetzt",
            "motivation", "keine lust", "prokrastiniere",
            "schiebe auf", "komme nicht voran",
        ],
        mode=ChiefMode.DRIVER,
        priority=50,
    ),
]


# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT SIGNALS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ContextSignal:
    """Ein Signal aus dem User-Context."""
    signal_type: str
    value: any
    mode_suggestion: ChiefMode
    priority: int


def analyze_context_signals(context: dict) -> List[ContextSignal]:
    """
    Analysiert den Context und extrahiert Signals für Mode-Auswahl.
    
    Args:
        context: Der User-Context aus build_chief_context()
        
    Returns:
        Liste von ContextSignals sortiert nach Priorität
    """
    signals = []
    
    # 1. Check für Celebration Signals
    if context.get("recent_wins"):
        recent_wins = context["recent_wins"]
        if len(recent_wins) > 0:
            # Win in den letzten 24h = Celebration
            signals.append(ContextSignal(
                signal_type="recent_win",
                value=recent_wins[0],
                mode_suggestion=ChiefMode.CELEBRATION,
                priority=90,
            ))
    
    # 2. Check Streak (Celebration bei Milestones)
    streak = context.get("streak_days", 0)
    if streak in [7, 14, 21, 30]:  # Milestone Streaks
        signals.append(ContextSignal(
            signal_type="streak_milestone",
            value=streak,
            mode_suggestion=ChiefMode.CELEBRATION,
            priority=85,
        ))
    
    # 3. Check für Driver Signals (Inaktivität, überfällige Tasks)
    daily_status = context.get("daily_flow_status", {})
    
    # Stark unter Ziel = Driver Mode
    overall_percent = daily_status.get("overall_percent", 100)
    if overall_percent < 30:
        signals.append(ContextSignal(
            signal_type="low_progress",
            value=overall_percent,
            mode_suggestion=ChiefMode.DRIVER,
            priority=75,
        ))
    
    # Überfällige Follow-ups
    suggested_leads = context.get("suggested_leads", [])
    overdue_leads = [l for l in suggested_leads if "überfällig" in l.get("reason", "").lower()]
    if len(overdue_leads) >= 3:
        signals.append(ContextSignal(
            signal_type="overdue_followups",
            value=len(overdue_leads),
            mode_suggestion=ChiefMode.DRIVER,
            priority=80,
        ))
    
    # 4. Check für Coach Signals (Skill-Gaps aus Template Insights)
    template_insights = context.get("template_insights", {})
    improvement_candidates = template_insights.get("improvement_candidates", [])
    if len(improvement_candidates) >= 2:
        signals.append(ContextSignal(
            signal_type="skill_gap_detected",
            value=improvement_candidates,
            mode_suggestion=ChiefMode.COACH,
            priority=60,
        ))
    
    # 5. Pending Actions (für Driver)
    pending = context.get("pending_actions", {})
    if pending.get("has_urgent"):
        signals.append(ContextSignal(
            signal_type="urgent_actions",
            value=pending.get("total", 0),
            mode_suggestion=ChiefMode.DRIVER,
            priority=85,
        ))
    
    # 6. Outreach Context (Ghosts = Driver)
    outreach = context.get("outreach", {})
    if outreach.get("total_ghosts", 0) >= 5:
        signals.append(ContextSignal(
            signal_type="many_ghosts",
            value=outreach.get("total_ghosts"),
            mode_suggestion=ChiefMode.DRIVER,
            priority=70,
        ))
    
    # Sortiere nach Priorität (höchste zuerst)
    signals.sort(key=lambda s: s.priority, reverse=True)
    
    return signals


# ═══════════════════════════════════════════════════════════════════════════
# MODE ROUTER
# ═══════════════════════════════════════════════════════════════════════════

def detect_message_intent(message: str) -> Tuple[ChiefMode, float]:
    """
    Erkennt den Intent aus der User-Message.
    
    Args:
        message: Die User-Nachricht
        
    Returns:
        Tuple von (erkannter Modus, Confidence 0-1)
    """
    message_lower = message.lower()
    
    best_match = ChiefMode.DEFAULT
    best_score = 0
    best_priority = 0
    
    for pattern in INTENT_PATTERNS:
        # Zähle Keyword-Matches
        matches = sum(1 for kw in pattern.keywords if kw in message_lower)
        
        if matches > 0:
            # Score = Anzahl Matches * Priority
            score = matches * pattern.priority
            
            if score > best_score or (score == best_score and pattern.priority > best_priority):
                best_match = pattern.mode
                best_score = score
                best_priority = pattern.priority
    
    # Confidence berechnen (0-1)
    confidence = min(1.0, best_score / 200) if best_score > 0 else 0
    
    return best_match, confidence


def route_to_mode(
    message: str,
    context: Optional[dict] = None,
    force_mode: Optional[ChiefMode] = None,
) -> Tuple[ChiefMode, str, List[ContextSignal]]:
    """
    Routet zur passenden CHIEF Mode basierend auf Message und Context.
    
    Args:
        message: Die User-Nachricht
        context: Optional User-Context
        force_mode: Optional erzwungener Modus (überschreibt alles)
        
    Returns:
        Tuple von (gewählter Modus, Begründung, relevante Signals)
    """
    # Forced Mode überschreibt alles
    if force_mode:
        return force_mode, "Modus wurde explizit gesetzt", []
    
    # 1. Message Intent analysieren
    message_mode, message_confidence = detect_message_intent(message)
    
    # 2. Context Signals analysieren
    context_signals = []
    if context:
        context_signals = analyze_context_signals(context)
    
    # 3. Entscheidung treffen
    
    # Hohe Message-Confidence = Message gewinnt
    if message_confidence >= 0.5:
        return message_mode, f"Message-Intent erkannt (Confidence: {message_confidence:.0%})", context_signals
    
    # Context-Signal mit hoher Priorität = Context gewinnt
    if context_signals and context_signals[0].priority >= 80:
        top_signal = context_signals[0]
        return (
            top_signal.mode_suggestion,
            f"Context-Signal: {top_signal.signal_type} (Priority: {top_signal.priority})",
            context_signals,
        )
    
    # Mittlere Message-Confidence = Message
    if message_confidence >= 0.3:
        return message_mode, f"Message-Intent (Confidence: {message_confidence:.0%})", context_signals
    
    # Irgendein Context-Signal vorhanden
    if context_signals:
        top_signal = context_signals[0]
        return (
            top_signal.mode_suggestion,
            f"Context-Signal: {top_signal.signal_type}",
            context_signals,
        )
    
    # Default
    return ChiefMode.DEFAULT, "Kein spezifischer Intent erkannt", []


def get_proactive_messages(context: dict) -> List[dict]:
    """
    Generiert proaktive Nachrichten basierend auf Context-Signals.
    
    Wird aufgerufen NACH der User-Antwort um zu prüfen ob CHIEF
    noch etwas Wichtiges ansprechen sollte.
    
    Args:
        context: User-Context
        
    Returns:
        Liste von proaktiven Nachrichten die CHIEF senden sollte
    """
    proactive = []
    signals = analyze_context_signals(context)
    
    for signal in signals[:3]:  # Max 3 proaktive Hinweise
        
        if signal.signal_type == "overdue_followups":
            proactive.append({
                "type": "driver",
                "priority": signal.priority,
                "message": f"⚠️ Du hast {signal.value} überfällige Follow-ups. Soll ich dir helfen die abzuarbeiten?",
            })
        
        elif signal.signal_type == "low_progress":
            proactive.append({
                "type": "driver",
                "priority": signal.priority,
                "message": f"📊 Dein Tagesfortschritt liegt bei {signal.value:.0f}%. Lass uns das noch drehen!",
            })
        
        elif signal.signal_type == "many_ghosts":
            proactive.append({
                "type": "driver",
                "priority": signal.priority,
                "message": f"👻 {signal.value} Kontakte ghosten dich. Zeit für eine Re-Engagement Kampagne?",
            })
        
        elif signal.signal_type == "streak_milestone":
            proactive.append({
                "type": "celebration",
                "priority": signal.priority,
                "message": f"🔥 {signal.value}-Tage-Streak! Das ist ein Milestone - mega!",
            })
        
        elif signal.signal_type == "skill_gap_detected":
            gaps = signal.value[:2]  # Top 2 Gaps
            gap_names = [g.get("name", "Template") for g in gaps]
            proactive.append({
                "type": "coach",
                "priority": signal.priority,
                "message": f"📈 Ich sehe Verbesserungspotenzial bei: {', '.join(gap_names)}. Sollen wir daran arbeiten?",
            })
    
    # Nach Priorität sortieren
    proactive.sort(key=lambda p: p["priority"], reverse=True)
    
    return proactive


# ═══════════════════════════════════════════════════════════════════════════
# CELEBRATION DETECTOR
# ═══════════════════════════════════════════════════════════════════════════

def detect_celebration_event(
    message: str,
    context: dict,
    previous_context: Optional[dict] = None,
) -> Optional[str]:
    """
    Erkennt ob ein Celebration-Event eingetreten ist.
    
    Args:
        message: User-Nachricht
        context: Aktueller Context
        previous_context: Vorheriger Context (für Vergleich)
        
    Returns:
        Celebration-Trigger Key oder None
    """
    message_lower = message.lower()
    
    # Explizite Sale-Meldung
    sale_keywords = ["verkauft", "abgeschlossen", "hat gekauft", "neuer kunde", "sale"]
    if any(kw in message_lower for kw in sale_keywords):
        # Prüfe ob es der erste Sale ist
        # (würde aus Context kommen, hier vereinfacht)
        return "sale_completed"
    
    # Streak Milestones
    streak = context.get("streak_days", 0)
    if streak == 7:
        return "streak_7"
    elif streak == 14:
        return "streak_14"
    elif streak == 30:
        return "streak_30"
    
    # Wochenziel erreicht
    daily_status = context.get("daily_flow_status", {})
    if daily_status.get("overall_percent", 0) >= 100:
        return "weekly_goal"
    
    # Recent Wins im Context
    if context.get("recent_wins"):
        return "recent_win"
    
    return None


# ═══════════════════════════════════════════════════════════════════════════
# USER LEVEL DETECTOR
# ═══════════════════════════════════════════════════════════════════════════

def detect_user_level(context: dict) -> UserLevel:
    """
    Erkennt das User-Level basierend auf Context-Daten.
    
    Args:
        context: User-Context
        
    Returns:
        UserLevel Enum
    """
    # Versuche aus skill_level zu mappen (Legacy)
    skill_level = context.get("skill_level", "advanced")
    
    # Mapping
    if skill_level == "rookie":
        return UserLevel.STARTER
    elif skill_level == "pro":
        return UserLevel.PROFESSIONAL
    
    # Default für "advanced"
    return UserLevel.PRACTITIONER
    
    # TODO: Später basierend auf echten Metriken:
    # - Anzahl Abschlüsse
    # - Tage aktiv
    # - Conversion Rates
    # - etc.

