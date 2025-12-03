"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF COACH SYSTEM                                                        ║
║  Skill Development Engine - Macht Anfänger zu Profis                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Der COACH entwickelt User durch:
- Identifizieren von Skill-Gaps
- Personalisiertes Coaching basierend auf Level
- Micro-Learning im Flow der Arbeit
- Fortschritts-Tracking

User Levels:
1. STARTER (0-30 Tage) - Grundlagen, Angst nehmen, kleine Wins
2. PRACTITIONER (30-90 Tage) - Konsistenz, Effizienz, Daten
3. PROFESSIONAL (90+ Tage) - Optimierung, Skalierung
4. EXPERT (Top 10%) - Team, Leadership, System-Building
"""

from typing import Optional, List
from dataclasses import dataclass
from enum import Enum

from .chief_v3_core import UserLevel


# ═══════════════════════════════════════════════════════════════════════════
# SKILL GAP DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

class SkillGap(str, Enum):
    """Erkannte Skill-Gaps."""
    OPENER_WEAK = "opener_weak"           # Niedrige Reply-Rate auf Cold Outreach
    RAPPORT_MISSING = "rapport_missing"   # Gespräche bleiben oberflächlich
    OBJECTION_FEAR = "objection_fear"     # Gespräch endet bei erstem Einwand
    CLOSING_WEAK = "closing_weak"         # Viele Gespräche, wenig Abschlüsse
    FOLLOWUP_ABSENT = "followup_absent"   # Leads werden nicht nachverfolgt
    PRIORITIZATION_POOR = "prioritization_poor"  # Viel Aktivität, wenig Ergebnis
    CONSISTENCY_LOW = "consistency_low"   # Aktivität schwankt stark
    TIME_MANAGEMENT = "time_management"   # Ineffiziente Zeitnutzung


@dataclass
class SkillGapInfo:
    """Info zu einem Skill-Gap."""
    gap: SkillGap
    symptom: str
    coaching_approach: str
    exercises: List[str]
    benchmark: str


SKILL_GAP_DATABASE = {
    SkillGap.OPENER_WEAK: SkillGapInfo(
        gap=SkillGap.OPENER_WEAK,
        symptom="<20% Reply-Rate auf Cold Outreach",
        coaching_approach="Template-Analyse, A/B Tests, Personalisierung",
        exercises=[
            "Schreibe 3 verschiedene Opener für denselben Lead",
            "Analysiere deine 5 besten Replies - was hatten die gemeinsam?",
            "Teste: Kurz (<50 Wörter) vs. Lang (>100 Wörter)",
        ],
        benchmark="Top-Performer: 30-40% Reply-Rate",
    ),
    SkillGap.RAPPORT_MISSING: SkillGapInfo(
        gap=SkillGap.RAPPORT_MISSING,
        symptom="Gespräche bleiben oberflächlich, kein Vertrauen",
        coaching_approach="Fragen-Techniken, Aktives Zuhören, Empathie",
        exercises=[
            "Stelle 3 Fragen bevor du über dein Angebot sprichst",
            "Wiederhole was der Lead gesagt hat in eigenen Worten",
            "Finde eine persönliche Gemeinsamkeit",
        ],
        benchmark="Ziel: Lead erzählt von persönlichen Themen",
    ),
    SkillGap.OBJECTION_FEAR: SkillGapInfo(
        gap=SkillGap.OBJECTION_FEAR,
        symptom="Gespräch endet bei erstem Einwand",
        coaching_approach="Einwand-Reframing, Übungen, Mindset",
        exercises=[
            "Schreibe 3 Antworten auf 'Zu teuer'",
            "Übe mit einem Partner: Er wirft Einwände, du reagierst",
            "Reframe: Einwand = Interesse (sonst würden sie nicht fragen)",
        ],
        benchmark="Top-Performer überwinden 60%+ der Einwände",
    ),
    SkillGap.CLOSING_WEAK: SkillGapInfo(
        gap=SkillGap.CLOSING_WEAK,
        symptom="Viele Gespräche, wenig Abschlüsse (<15% Closing-Rate)",
        coaching_approach="Buying Signals erkennen, Closing-Techniken",
        exercises=[
            "Liste 5 Buying Signals die du übersehen hast",
            "Übe den Assumptive Close: 'Sollen wir starten?'",
            "Nach jedem Gespräch: War da ein Closing-Moment den ich verpasst hab?",
        ],
        benchmark="Ziel: 25%+ Closing-Rate bei qualifizierten Leads",
    ),
    SkillGap.FOLLOWUP_ABSENT: SkillGapInfo(
        gap=SkillGap.FOLLOWUP_ABSENT,
        symptom="Leads werden nicht oder zu spät nachverfolgt",
        coaching_approach="System-Setup, Reminder-Nutzung, Gewohnheit",
        exercises=[
            "Setze für JEDEN Lead einen konkreten Follow-up Termin",
            "Blocke 30 Min täglich nur für Follow-ups",
            "Regel: Kein Gespräch ohne nächsten Schritt",
        ],
        benchmark="80%+ der Leads sollten Follow-up bekommen",
    ),
    SkillGap.PRIORITIZATION_POOR: SkillGapInfo(
        gap=SkillGap.PRIORITIZATION_POOR,
        symptom="Viel Aktivität, wenig Ergebnis (Pareto-Verstoß)",
        coaching_approach="Lead-Scoring, Zeit-Management, Fokus",
        exercises=[
            "Sortiere deine Leads in A/B/C (20% sind A-Leads)",
            "Verbringe 80% deiner Zeit mit A-Leads",
            "Lerne Nein zu sagen zu C-Leads",
        ],
        benchmark="A-Leads sollten 50%+ deiner Zeit bekommen",
    ),
    SkillGap.CONSISTENCY_LOW: SkillGapInfo(
        gap=SkillGap.CONSISTENCY_LOW,
        symptom="Aktivität schwankt stark (Montag 20, Freitag 2)",
        coaching_approach="Routinen, Minimum-Standards, Streaks",
        exercises=[
            "Setze ein MINIMUM pro Tag (z.B. 5 Outreaches, egal was)",
            "Mache die ersten 3 Outreaches VOR allem anderen",
            "Tracke deine Streak - wie viele Tage in Folge?",
        ],
        benchmark="Ziel: <20% Schwankung zwischen Tagen",
    ),
}


# ═══════════════════════════════════════════════════════════════════════════
# COACH SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_COACH_PROMPT = """
# CHIEF COACH SYSTEM - Skill Development Engine

## DEINE ROLLE

Du entwickelst User von Anfängern zu Profis durch:
- Identifizieren von Skill-Gaps
- Personalisiertes Coaching
- Micro-Learning im Flow der Arbeit
- Fortschritts-Tracking

## COACHING-PRINZIPIEN

### 1. Analysiere WAS schiefläuft, nicht nur DASS es schiefläuft
❌ "Du machst zu wenig Follow-ups"
✅ "Deine Follow-up Rate ist 30% - lass uns anschauen warum. 
    Ist es Zeit, Unsicherheit, oder vergisst du es?"

### 2. Gib konkrete, umsetzbare Tipps
❌ "Sei mehr proaktiv"
✅ "Bevor du morgen aufstehst: Schreib 3 Follow-up Nachrichten. 
    Hier sind Vorlagen für die 3 wichtigsten Leads..."

### 3. Micro-Learning statt Schulungen
❌ "Schau dir diesen 2-Stunden Kurs an"
✅ "Quick Tipp (30 Sek): Dein letzter Opener war 120 Wörter - 
    teste mal <50 Wörter. Kürzer = mehr Replies."

### 4. Feiere Fortschritt, auch kleinen
❌ Nur Kritik
✅ "Deine Reply-Rate ist von 20% auf 28% gestiegen! 
    Das ist +40% - weiter so! Nächstes Ziel: 35%"

## SKILL-GAP DETECTION

Erkenne automatisch wo der User strugglet:

| Symptom | Möglicher Gap | Coaching-Ansatz |
|---------|---------------|-----------------|
| Reply-Rate <20% | OPENER_WEAK | Template-Analyse, Kürzer schreiben |
| Gespräche enden früh | RAPPORT_MISSING | Mehr Fragen stellen |
| Einwand = Ende | OBJECTION_FEAR | Einwand-Training |
| Viele Gespräche, wenig Sales | CLOSING_WEAK | Buying Signals + Techniken |
| Leads vergessen | FOLLOWUP_ABSENT | System aufbauen |
| Viel Arbeit, wenig Ergebnis | PRIORITIZATION_POOR | Lead-Scoring |

## OUTPUT FORMAT

### Standard Coaching-Feedback
```
📊 BEOBACHTUNG
{Was zeigen die Daten?}

🎯 SKILL-GAP
{Was ist das zugrundeliegende Problem?}

💡 COACHING-TIPP
{Konkreter, umsetzbarer Rat}

🏋️ ÜBUNG (optional)
{Kleine Übung zum Verbessern}
```

### Micro-Learning (30 Sek)
```
💡 Quick Coaching:

Das hast du gemacht: {Beobachtung}
Das wäre stärker: {Bessere Alternative}

Merkst du den Unterschied?
→ {Erklärung in 1 Satz}
```
"""


# ═══════════════════════════════════════════════════════════════════════════
# USER LEVEL COACHING PROMPTS
# ═══════════════════════════════════════════════════════════════════════════

USER_LEVEL_COACHING = {
    
    UserLevel.STARTER: """
## 🎓 COACHING FÜR STARTER (0-30 Tage)

### Fokus-Themen:
- Angst vor Ablehnung überwinden
- Erste Erfolge erzielen (Replies, nicht Sales)
- Grundlagen-Skills aufbauen
- Einfache Routinen etablieren

### Typische Gaps:
- Zu lange, komplizierte Nachrichten
- Kein System für Follow-ups
- Nimmt Ablehnung persönlich
- Überfordert von zu vielen Optionen

### Dein Coaching-Stil:
- SEHR supportiv und ermutigend
- "Das ist normal" / "Jeder fängt so an"
- Kleine Wins feiern (jeder Reply ist ein Win!)
- EIN Schritt zur Zeit, nicht alles auf einmal
- Copy-paste-ready Templates geben

### Beispiel-Coaching:
"Hey, ich seh du hattest heute 2 Ablehnungen. Das ist NORMAL! 
Ich hab mal nachgeschaut: Die besten Vertriebler haben 70% Ablehnung.
Du bist auf dem richtigen Weg.

Kleiner Tipp: Deine Nachrichten sind ~150 Wörter. Teste mal <50 Wörter.
Hier ein Beispiel: '...'"
""",

    UserLevel.PRACTITIONER: """
## 💼 COACHING FÜR PRACTITIONER (30-90 Tage)

### Fokus-Themen:
- Konsistenz aufbauen
- Conversion-Bottlenecks finden
- Effizienter arbeiten
- Datenbasiert optimieren

### Typische Gaps:
- Aktivität schwankt stark
- Bestimmte Einwände sind noch schwach
- Verliert Leads im Mid-Funnel
- Keine klare Priorisierung

### Dein Coaching-Stil:
- Direkter, mehr zahlenbasiert
- "Deine Daten zeigen..." statt "Ich denke..."
- Optionen geben zum Testen
- Auf Patterns hinweisen

### Beispiel-Coaching:
"Deine Zahlen diese Woche:
- INTRO → GESPRÄCH: 45% ✅ (gut!)
- GESPRÄCH → TERMIN: 28% ⚠️ (unter Ø 40%)
- TERMIN → ABSCHLUSS: 65% ✅ (stark!)

Dein Bottleneck ist das Termin-Setting.
Ich hab deine letzten 5 'verlorenen' Gespräche analysiert.
Pattern: Du fragst nicht konkret nach einem Termin.

Probier: 'Passt dir Dienstag oder Mittwoch besser?' 
statt 'Meld dich wenn du Zeit hast'"
""",

    UserLevel.PROFESSIONAL: """
## 🏆 COACHING FÜR PROFESSIONAL (90+ Tage)

### Fokus-Themen:
- Plateau durchbrechen
- Zeit-Effizienz maximieren
- A-Lead Fokus stärken
- Burnout vermeiden

### Typische Gaps:
- Plateau erreicht, stagniert
- Zu viel Zeit mit C-Leads
- Arbeitet hart, nicht smart
- Keine Delegation/Automation

### Dein Coaching-Stil:
- Peer-Level, strategisch
- Daten und ROI fokussiert
- Herausfordern wenn nötig
- "Wie skalierst du das?"

### Beispiel-Coaching:
"Deine Zahlen sind solide - 25 Abschlüsse letzten Monat.
Aber hier ist was ich sehe:

Du verbringst ~40% deiner Zeit mit C-Leads die selten konvertieren.
Deine A-Lead Conversion: 45%
Deine C-Lead Conversion: 8%

Wenn wir C-Leads auf 20% reduzieren und zu A-Leads shiften:
→ Gleiche Arbeitszeit, aber 35+ Abschlüsse möglich.

Soll ich dir einen Lead-Scoring Workflow bauen?"
""",

    UserLevel.EXPERT: """
## 👑 COACHING FÜR EXPERT (Top 10%)

### Fokus-Themen:
- Team-Performance steigern
- Eigenen Erfolg replizieren
- Leadership entwickeln
- System-Building

### Typische Gaps:
- Kann eigenen Erfolg nicht im Team replizieren
- Micromanagement vs. Delegation
- Bottleneck weil alles über sie läuft
- Vernachlässigt eigenes Business für Team

### Dein Coaching-Stil:
- Strategischer Sparring-Partner
- Big Picture und Skalierung
- Herausfordernd und direkt
- "Was ist der Hebel?"

### Beispiel-Coaching:
"Du bist einer der Top-Performer. Die Frage ist: Wie skalierst du das?

Ich sehe 3 Optionen:
1. Dein System dokumentieren → Team kann's replizieren
2. Deine besten Templates teilen → Team-Performance +20%
3. Du fokussierst auf High-Value → Team macht den Rest

Was passt zu deinen Zielen für dieses Quartal?"
""",
}


# ═══════════════════════════════════════════════════════════════════════════
# SKILL GAP DETECTION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DetectedGap:
    """Ein erkannter Skill-Gap."""
    gap: SkillGap
    severity: str  # low, medium, high
    evidence: str
    coaching_priority: int  # 1 = höchste Priorität


def detect_skill_gaps(
    reply_rate: float = 0,
    closing_rate: float = 0,
    followup_rate: float = 0,
    activity_variance: float = 0,
    conversation_depth: float = 0,
    objection_success_rate: float = 0,
) -> List[DetectedGap]:
    """
    Erkennt Skill-Gaps basierend auf Metriken.
    
    Args:
        reply_rate: % der Outreaches die Replies bekommen
        closing_rate: % der Gespräche die zu Sales werden
        followup_rate: % der Leads die Follow-up bekommen
        activity_variance: Standardabweichung der täglichen Aktivität
        conversation_depth: Durchschnittliche Nachrichtenanzahl pro Lead
        objection_success_rate: % der Einwände die überwunden werden
        
    Returns:
        Liste von DetectedGap sortiert nach Priorität
    """
    gaps = []
    
    # Opener schwach
    if reply_rate < 0.20:
        gaps.append(DetectedGap(
            gap=SkillGap.OPENER_WEAK,
            severity="high" if reply_rate < 0.10 else "medium",
            evidence=f"Reply-Rate nur {reply_rate*100:.0f}% (Benchmark: 30%+)",
            coaching_priority=1,
        ))
    
    # Closing schwach
    if closing_rate < 0.20:
        gaps.append(DetectedGap(
            gap=SkillGap.CLOSING_WEAK,
            severity="high" if closing_rate < 0.10 else "medium",
            evidence=f"Closing-Rate nur {closing_rate*100:.0f}% (Benchmark: 25%+)",
            coaching_priority=2,
        ))
    
    # Follow-up fehlt
    if followup_rate < 0.60:
        gaps.append(DetectedGap(
            gap=SkillGap.FOLLOWUP_ABSENT,
            severity="high" if followup_rate < 0.40 else "medium",
            evidence=f"Nur {followup_rate*100:.0f}% der Leads bekommen Follow-up",
            coaching_priority=1,
        ))
    
    # Konsistenz niedrig
    if activity_variance > 0.5:
        gaps.append(DetectedGap(
            gap=SkillGap.CONSISTENCY_LOW,
            severity="medium",
            evidence=f"Aktivität schwankt um {activity_variance*100:.0f}%",
            coaching_priority=3,
        ))
    
    # Rapport fehlt
    if conversation_depth < 5:
        gaps.append(DetectedGap(
            gap=SkillGap.RAPPORT_MISSING,
            severity="medium" if conversation_depth >= 3 else "high",
            evidence=f"Gespräche enden nach ~{conversation_depth:.0f} Nachrichten",
            coaching_priority=2,
        ))
    
    # Einwand-Angst
    if objection_success_rate < 0.30:
        gaps.append(DetectedGap(
            gap=SkillGap.OBJECTION_FEAR,
            severity="high" if objection_success_rate < 0.15 else "medium",
            evidence=f"Nur {objection_success_rate*100:.0f}% der Einwände überwunden",
            coaching_priority=1,
        ))
    
    # Nach Priorität sortieren
    gaps.sort(key=lambda g: g.coaching_priority)
    
    return gaps


def get_coaching_for_gap(gap: SkillGap) -> Optional[SkillGapInfo]:
    """Gibt Coaching-Info für einen Skill-Gap zurück."""
    return SKILL_GAP_DATABASE.get(gap)


# ═══════════════════════════════════════════════════════════════════════════
# MICRO-LEARNING TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MICRO_LEARNING_TEMPLATES = {
    
    "message_too_long": """
💡 Quick Coaching (30 Sek):

Deine Nachricht war {word_count} Wörter.
Teste mal <50 Wörter!

**Stärker wäre:**
"{short_version}"

📊 Fakt: Kurze Nachrichten haben 2x höhere Reply-Rate.
""",

    "no_question": """
💡 Quick Coaching (30 Sek):

Deine Nachricht hatte keine Frage am Ende.
Das gibt dem Lead keinen Grund zu antworten.

**Stärker wäre:**
"{message_with_question}"

Regel: Jede Nachricht endet mit einer konkreten Frage.
""",

    "weak_closing": """
💡 Quick Coaching (30 Sek):

Dein Closing war: "{weak_close}"
Das gibt dem Lead zu viel Freiraum zum Aufschieben.

**Stärker wäre:**
"{strong_close}"

Merkst du den Unterschied? Konkretes Datum + Auswahl statt offenes Ende.
""",

    "missed_buying_signal": """
💡 Quick Coaching (30 Sek):

Ich hab ein Buying Signal gesehen das du übersehen hast:
→ "{buying_signal}"

Das war der Moment zum Closen! Nächstes Mal wenn du sowas hörst:
"{closing_response}"
""",

    "objection_retreat": """
💡 Quick Coaching (30 Sek):

Bei dem Einwand "{objection}" hast du aufgegeben.
Einwände = Interesse! Sonst würden sie nicht fragen.

**Nächstes Mal probier:**
"{objection_response}"

Dann eine Frage stellen um im Gespräch zu bleiben.
""",
}


def generate_micro_learning(
    situation: str,
    context: dict,
) -> str:
    """
    Generiert ein Micro-Learning für eine Situation.
    
    Args:
        situation: Art der Situation (message_too_long, etc.)
        context: Daten zum Befüllen des Templates
        
    Returns:
        Formatiertes Micro-Learning
    """
    template = MICRO_LEARNING_TEMPLATES.get(situation)
    if not template:
        return ""
    
    try:
        return template.format(**context)
    except KeyError:
        return template


# ═══════════════════════════════════════════════════════════════════════════
# WEEKLY SKILL REPORT
# ═══════════════════════════════════════════════════════════════════════════

def generate_weekly_skill_report(
    user_metrics: dict,
    previous_metrics: dict,
    detected_gaps: List[DetectedGap],
    user_level: UserLevel,
) -> str:
    """
    Generiert einen wöchentlichen Skill-Report.
    
    Args:
        user_metrics: Aktuelle Metriken
        previous_metrics: Metriken der Vorwoche
        detected_gaps: Erkannte Skill-Gaps
        user_level: Aktuelles User-Level
        
    Returns:
        Formatierter Report
    """
    report_parts = ["📊 **Dein Skill-Fortschritt diese Woche**\n"]
    
    # Verbesserungen
    improved = []
    stable = []
    focus = []
    
    for metric, value in user_metrics.items():
        prev = previous_metrics.get(metric, value)
        change = ((value - prev) / prev * 100) if prev > 0 else 0
        
        if change > 10:
            improved.append(f"• {metric}: {prev:.0f}% → {value:.0f}% ↗️")
        elif change < -10:
            focus.append(f"• {metric}: {prev:.0f}% → {value:.0f}% ↘️")
        else:
            stable.append(f"• {metric}: {value:.0f}% →")
    
    if improved:
        report_parts.append("\n**VERBESSERT** ↗️")
        report_parts.extend(improved)
    
    if stable:
        report_parts.append("\n**STABIL** →")
        report_parts.extend(stable)
    
    if focus or detected_gaps:
        report_parts.append("\n**FOKUS NÄCHSTE WOCHE** ⚠️")
        if detected_gaps:
            top_gap = detected_gaps[0]
            gap_info = get_coaching_for_gap(top_gap.gap)
            if gap_info:
                report_parts.append(f"• {gap_info.symptom}")
                report_parts.append(f"  → Tipp: {gap_info.coaching_approach}")
    
    # Level Progress
    level_names = {
        UserLevel.STARTER: "STARTER",
        UserLevel.PRACTITIONER: "PRACTITIONER",
        UserLevel.PROFESSIONAL: "PROFESSIONAL",
        UserLevel.EXPERT: "EXPERT",
    }
    report_parts.append(f"\n**Dein Level:** {level_names.get(user_level, 'PRACTITIONER')}")
    
    return "\n".join(report_parts)


# ═══════════════════════════════════════════════════════════════════════════
# FULL COACH PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_coach_prompt(
    user_level: UserLevel,
    detected_gaps: Optional[List[DetectedGap]] = None,
    recent_activity: Optional[dict] = None,
) -> str:
    """
    Baut den kompletten Coach-Prompt für einen User.
    
    Args:
        user_level: Erfahrungslevel des Users
        detected_gaps: Erkannte Skill-Gaps
        recent_activity: Letzte Aktivitäten des Users
        
    Returns:
        Vollständiger Coach-Prompt
    """
    prompt_parts = [CHIEF_COACH_PROMPT]
    
    # Level-spezifisches Coaching
    level_prompt = USER_LEVEL_COACHING.get(user_level, USER_LEVEL_COACHING[UserLevel.PRACTITIONER])
    prompt_parts.append(level_prompt)
    
    # Erkannte Gaps
    if detected_gaps:
        prompt_parts.append("\n## 🎯 ERKANNTE SKILL-GAPS (für diesen User)")
        for gap in detected_gaps[:3]:
            gap_info = get_coaching_for_gap(gap.gap)
            if gap_info:
                prompt_parts.append(f"\n### {gap.gap.value.upper()}")
                prompt_parts.append(f"- Symptom: {gap_info.symptom}")
                prompt_parts.append(f"- Schwere: {gap.severity}")
                prompt_parts.append(f"- Evidenz: {gap.evidence}")
                prompt_parts.append(f"- Ansatz: {gap_info.coaching_approach}")
    
    return "\n".join(prompt_parts)

