"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF ONBOARDING SYSTEM                                                   ║
║  Neue User zum ersten Erfolg bringen                                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Das Onboarding-System bringt neue User zum ersten Erfolg durch:
- Strukturierte Journey (Tag 1-14)
- Kleine, erreichbare Ziele
- Micro-Wins feiern
- Overwhelm verhindern
- Gamification-Elemente

Ziel: Time-to-First-Value < 7 Tage
"""

from typing import Optional, List
from dataclasses import dataclass
from enum import Enum
from datetime import date, timedelta


# ═══════════════════════════════════════════════════════════════════════════
# ONBOARDING STAGES
# ═══════════════════════════════════════════════════════════════════════════

class OnboardingStage(str, Enum):
    """Onboarding-Phasen."""
    DAY_1 = "day_1"           # Setup & First Win
    DAYS_2_3 = "days_2_3"     # First Conversations
    DAYS_4_7 = "days_4_7"     # Building Rhythm
    DAYS_8_14 = "days_8_14"   # First Milestones
    COMPLETED = "completed"    # Onboarding abgeschlossen


@dataclass
class OnboardingTask:
    """Eine Onboarding-Aufgabe."""
    id: str
    title: str
    description: str
    stage: OnboardingStage
    order: int
    estimated_minutes: int
    is_required: bool = True
    celebration_on_complete: Optional[str] = None


@dataclass
class OnboardingProgress:
    """Fortschritt eines Users im Onboarding."""
    user_id: str
    current_stage: OnboardingStage
    days_since_start: int
    tasks_completed: int
    tasks_total: int
    first_contact_sent: bool
    first_reply_received: bool
    first_sale: bool
    is_overwhelmed: bool = False


# ═══════════════════════════════════════════════════════════════════════════
# ONBOARDING SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_ONBOARDING_PROMPT = """
# CHIEF ONBOARDING SYSTEM - Neue User zum Erfolg führen

## DEINE ROLLE

Du führst neue User durch ihr erstes Erlebnis mit Sales Flow AI.
Dein Ziel: Erster Erfolg (Reply oder Sale) innerhalb von 7 Tagen.

## ONBOARDING-PRINZIPIEN

### 1. Kleine Schritte, große Wins
❌ "Hier sind alle 12 Features, viel Spaß!"
✅ "Heute nur EINE Sache: Dein erstes Kontakt anlegen. 2 Minuten."

### 2. Overwhelm verhindern
❌ Alle Optionen zeigen
✅ Nur den EINEN nächsten Schritt zeigen

### 3. Micro-Wins feiern
❌ Erst beim Sale feiern
✅ JEDEN kleinen Fortschritt feiern (Profil fertig, erster Kontakt, erste Nachricht)

### 4. Konkret und machbar
❌ "Schreib ein paar Leute an"
✅ "Schreib DIESEN Text an DIESEN Kontakt. Jetzt."

## ONBOARDING JOURNEY

### 📅 TAG 1: Setup & First Win
```
ZIEL: Erste Nachricht gesendet

☐ Profil einrichten (2 min)
☐ Erstes Produkt hinzufügen (3 min)
☐ Ersten Kontakt anlegen (2 min)
☐ Erste Nachricht senden (5 min)

→ 12 Minuten und du bist ready!
```

### 📅 TAG 2-3: First Conversations
```
ZIEL: Gespräch am Laufen

☐ Check: Hat {name} geantwortet?
☐ 2 neue Kontakte hinzufügen
☐ 2 neue Nachrichten senden
☐ Auf Antworten reagieren (mit CHIEF Hilfe)
```

### 📅 TAG 4-7: Building Rhythm
```
ZIEL: Tägliche Routine etablieren

☐ Daily Flow verstehen
☐ 5 Kontakte pro Tag
☐ Follow-up System nutzen
☐ Erste Einwände behandeln
```

### 📅 TAG 8-14: First Milestones
```
ZIEL: Erster Sale oder heißer Lead

☐ Erstes echtes Gespräch führen
☐ Einwand erfolgreich behandeln
☐ Termin/Demo vereinbaren
☐ Erster Abschluss 🎉
```

## OVERWHELM DETECTION

### Signs of Overwhelm:
- Viele Tutorials angefangen, keine beendet
- Lange Pausen zwischen Aktionen
- Fragen wie "Wo fang ich an?"
- Mehrere Tage inaktiv in Woche 1

### Response:
```
"Hey, ich merk du bist vielleicht etwas overwhelmed.
Das ist normal! Vergiss alles andere - hier ist das EINZIGE
was du heute tun musst:

→ [Eine einzige, kleine Aktion]

Das wars. Mehr nicht. Du schaffst das! 💪"
```

## CELEBRATION MOMENTS

### First Contact Created
```
🎉 Erster Kontakt angelegt!
Das war der wichtigste Schritt.
Jetzt: Eine Nachricht an {name} senden?
```

### First Message Sent
```
💪 Erste Nachricht ist raus!
Du bist mutiger als 50% die nie anfangen.
Jetzt heißt es: Dranbleiben und checken ob {name} antwortet.
```

### First Reply Received
```
🎉 BOOM! DEINE ERSTE ANTWORT!
{name} hat geantwortet!
Das ist RIESIG. Viele schaffen das nie.
Du hast gerade bewiesen: Du kannst das!
```

### First Sale
```
🏆🏆🏆 DEIN ERSTER SALE! 🏆🏆🏆

Das ist der Moment den du nie vergisst!
{name} hat gekauft!

Du bist jetzt offiziell kein Anfänger mehr.
Von hier wird es nur leichter!
```

## SIMPLIFICATION MODE

Wenn Overwhelm erkannt:
- Reduziere alle Optionen auf EINE
- Zeige nur nächsten Schritt
- Feiere jeden Mini-Win
- Keine neuen Features vorstellen
- Fokus: DOING > LEARNING
"""


# ═══════════════════════════════════════════════════════════════════════════
# ONBOARDING TASKS
# ═══════════════════════════════════════════════════════════════════════════

ONBOARDING_TASKS = [
    # DAY 1
    OnboardingTask(
        id="profile_setup",
        title="Profil einrichten",
        description="Dein Name und Foto hinzufügen",
        stage=OnboardingStage.DAY_1,
        order=1,
        estimated_minutes=2,
        celebration_on_complete="Profil fertig! ✅ Du siehst jetzt professionell aus.",
    ),
    OnboardingTask(
        id="add_product",
        title="Produkt hinzufügen",
        description="Dein Hauptprodukt mit Beschreibung anlegen",
        stage=OnboardingStage.DAY_1,
        order=2,
        estimated_minutes=3,
        celebration_on_complete="Produkt angelegt! ✅ CHIEF kennt jetzt dein Angebot.",
    ),
    OnboardingTask(
        id="first_contact",
        title="Ersten Kontakt anlegen",
        description="Eine Person die du ansprechen möchtest",
        stage=OnboardingStage.DAY_1,
        order=3,
        estimated_minutes=2,
        celebration_on_complete="🎉 Erster Kontakt! Der wichtigste Schritt ist getan.",
    ),
    OnboardingTask(
        id="first_message",
        title="Erste Nachricht senden",
        description="CHIEF hilft dir mit einem Vorschlag",
        stage=OnboardingStage.DAY_1,
        order=4,
        estimated_minutes=5,
        is_required=True,
        celebration_on_complete="💪 Erste Nachricht raus! Du bist mutiger als die meisten.",
    ),
    
    # DAYS 2-3
    OnboardingTask(
        id="check_replies",
        title="Antworten checken",
        description="Schau ob jemand geantwortet hat",
        stage=OnboardingStage.DAYS_2_3,
        order=1,
        estimated_minutes=2,
    ),
    OnboardingTask(
        id="add_more_contacts",
        title="2 weitere Kontakte",
        description="Deine Kontaktliste erweitern",
        stage=OnboardingStage.DAYS_2_3,
        order=2,
        estimated_minutes=4,
    ),
    OnboardingTask(
        id="send_more_messages",
        title="2 Nachrichten senden",
        description="Mit CHIEF's Hilfe formulieren",
        stage=OnboardingStage.DAYS_2_3,
        order=3,
        estimated_minutes=6,
    ),
    OnboardingTask(
        id="respond_to_reply",
        title="Auf Antwort reagieren",
        description="CHIEF hilft dir mit der Antwort",
        stage=OnboardingStage.DAYS_2_3,
        order=4,
        estimated_minutes=5,
        is_required=False,
        celebration_on_complete="🎉 Erstes Gespräch läuft! Du machst das super.",
    ),
    
    # DAYS 4-7
    OnboardingTask(
        id="understand_daily_flow",
        title="Daily Flow kennenlernen",
        description="Dein täglicher Rhythmus",
        stage=OnboardingStage.DAYS_4_7,
        order=1,
        estimated_minutes=3,
    ),
    OnboardingTask(
        id="daily_contacts_5",
        title="5 Kontakte an einem Tag",
        description="Dein erstes volles Tagesziel",
        stage=OnboardingStage.DAYS_4_7,
        order=2,
        estimated_minutes=20,
        celebration_on_complete="🔥 5 Kontakte an einem Tag! Du baust Momentum auf.",
    ),
    OnboardingTask(
        id="use_followup_system",
        title="Follow-up System nutzen",
        description="Setze deinen ersten automatischen Follow-up",
        stage=OnboardingStage.DAYS_4_7,
        order=3,
        estimated_minutes=3,
    ),
    OnboardingTask(
        id="handle_first_objection",
        title="Ersten Einwand behandeln",
        description="Mit Objection Brain meistern",
        stage=OnboardingStage.DAYS_4_7,
        order=4,
        estimated_minutes=5,
        is_required=False,
        celebration_on_complete="💪 Ersten Einwand gemeistert! Du wirst immer besser.",
    ),
    
    # DAYS 8-14
    OnboardingTask(
        id="real_conversation",
        title="Echtes Gespräch führen",
        description="Mindestens 5 Nachrichten hin und her",
        stage=OnboardingStage.DAYS_8_14,
        order=1,
        estimated_minutes=15,
        celebration_on_complete="🎉 Echtes Gespräch! Du baust Beziehungen auf.",
    ),
    OnboardingTask(
        id="book_demo",
        title="Termin/Demo vereinbaren",
        description="Den nächsten Schritt planen",
        stage=OnboardingStage.DAYS_8_14,
        order=2,
        estimated_minutes=10,
        is_required=False,
        celebration_on_complete="📅 Termin gebucht! Das ist ein heißer Lead.",
    ),
    OnboardingTask(
        id="first_sale",
        title="Erster Abschluss",
        description="Dein erster Sale!",
        stage=OnboardingStage.DAYS_8_14,
        order=3,
        estimated_minutes=0,
        is_required=False,
        celebration_on_complete="🏆🏆🏆 ERSTER SALE! Du bist offiziell kein Anfänger mehr!",
    ),
]


# ═══════════════════════════════════════════════════════════════════════════
# ONBOARDING MESSAGES
# ═══════════════════════════════════════════════════════════════════════════

ONBOARDING_MESSAGES = {
    
    "welcome": """
🎉 WILLKOMMEN BEI SALES FLOW AI!

Ich bin CHIEF, dein AI Sales Coach. Zusammen machen wir dich zum Profi!

**HEUTE ERREICHEN WIR:**
☐ Dein Profil einrichten (2 min)
☐ Dein erstes Produkt hinzufügen (3 min)
☐ Deinen ersten Kontakt anlegen (2 min)
☐ Deine erste Nachricht senden (5 min)

Das wars! 12 Minuten und du bist ready.

**Lass uns starten →** [Los geht's]
""",

    "day_2_checkin": """
🌟 TAG 2 - Wie läuft's?

Gestern hast du {name} angeschrieben. Mega!

**HEUTE:**
☐ Check: Hat {name} geantwortet? [Ja] [Nein]
☐ 2 neue Kontakte hinzufügen
☐ 2 neue Nachrichten senden

**TIPP DES TAGES:**
Die besten Opener sind kurz und persönlich.
Nicht: 'Hey ich hab da was für dich'
Sondern: 'Hey [Name], dein Post neulich war cool! Quick Frage...'
""",

    "progress_update": """
📈 DEIN FORTSCHRITT

Kontakte angelegt: {contacts_count} ✓
Nachrichten gesendet: {messages_count} ✓
Antworten bekommen: {replies_count} ✓

{progress_message}
""",

    "overwhelm_detected": """
Hey, ich merk du bist vielleicht etwas overwhelmed.

**Das ist völlig normal!** Vergiss alles andere.

Hier ist das **EINZIGE** was du heute tun musst:

→ {single_action}

Das wars. Mehr nicht.
Du schaffst das! 💪
""",

    "first_week_complete": """
🎉 **DEINE ERSTE WOCHE!**

Du hast mehr geschafft als 80% der Neustarter:
• {contacts_count} Kontakte angelegt
• {messages_count} Nachrichten gesendet
• {replies_count} Antworten bekommen

**NÄCHSTES ZIEL:**
Diese Woche: Dein erstes echtes Gespräch führen.
Wenn jemand antwortet und Fragen hat → Ich helfe dir live!
""",

    "milestone_first_reply": """
🎉 BOOM! DEINE ERSTE ANTWORT!

**{lead_name} hat geantwortet!**

Das ist RIESIG. Viele schaffen das nie.
Du hast gerade bewiesen: Du kannst das!

**Was jetzt:**
1. Ich zeig dir wie du antwortest
2. Du sendest die Antwort
3. Wir bauen auf diesem Erfolg auf

Ready? [Zeig mir die Antwort]
""",

    "milestone_first_sale": """
🏆🏆🏆 **DEIN ERSTER SALE!** 🏆🏆🏆

Das ist der Moment den du nie vergisst!

**{lead_name} hat gekauft!**
Deine erste Provision: {amount}

**Was du richtig gemacht hast:**
• Du hast angefangen (die meisten tun das nie)
• Du bist drangeblieben
• Du hast den Abschluss gemacht

**Du bist jetzt offiziell kein Anfänger mehr.**
Von hier wird es nur leichter!

[Teile deinen Erfolg] [Zum nächsten Lead]
""",
}


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_current_stage(days_since_start: int) -> OnboardingStage:
    """
    Bestimmt die aktuelle Onboarding-Stage basierend auf Tagen.
    
    Args:
        days_since_start: Tage seit Registrierung
        
    Returns:
        OnboardingStage
    """
    if days_since_start <= 1:
        return OnboardingStage.DAY_1
    elif days_since_start <= 3:
        return OnboardingStage.DAYS_2_3
    elif days_since_start <= 7:
        return OnboardingStage.DAYS_4_7
    elif days_since_start <= 14:
        return OnboardingStage.DAYS_8_14
    else:
        return OnboardingStage.COMPLETED


def get_tasks_for_stage(stage: OnboardingStage) -> List[OnboardingTask]:
    """
    Gibt alle Tasks für eine Stage zurück.
    
    Args:
        stage: Onboarding-Stage
        
    Returns:
        Liste von Tasks
    """
    return [t for t in ONBOARDING_TASKS if t.stage == stage]


def get_next_task(
    progress: OnboardingProgress,
    completed_task_ids: List[str],
) -> Optional[OnboardingTask]:
    """
    Gibt die nächste zu erledigende Task zurück.
    
    Args:
        progress: Aktueller Fortschritt
        completed_task_ids: IDs der erledigten Tasks
        
    Returns:
        Nächste Task oder None
    """
    stage_tasks = get_tasks_for_stage(progress.current_stage)
    
    for task in sorted(stage_tasks, key=lambda t: t.order):
        if task.id not in completed_task_ids:
            return task
    
    return None


def detect_overwhelm(
    days_since_start: int,
    tasks_completed: int,
    days_inactive: int,
    session_count: int,
) -> bool:
    """
    Erkennt ob ein User overwhelmed ist.
    
    Args:
        days_since_start: Tage seit Start
        tasks_completed: Erledigte Tasks
        days_inactive: Tage ohne Aktivität
        session_count: Anzahl Sessions
        
    Returns:
        True wenn Overwhelm erkannt
    """
    # Zu wenig Fortschritt für die Zeit
    expected_tasks = min(days_since_start * 2, 10)
    if tasks_completed < expected_tasks * 0.3:
        return True
    
    # Inaktiv in den ersten Tagen
    if days_since_start <= 7 and days_inactive >= 2:
        return True
    
    # Viele Sessions aber wenig Fortschritt
    if session_count > 5 and tasks_completed < 3:
        return True
    
    return False


def get_simplification_action(
    progress: OnboardingProgress,
    completed_task_ids: List[str],
) -> str:
    """
    Gibt die einfachste nächste Aktion für einen overwhelmed User.
    
    Args:
        progress: Aktueller Fortschritt
        completed_task_ids: Erledigte Tasks
        
    Returns:
        Eine einzige, einfache Aktion
    """
    next_task = get_next_task(progress, completed_task_ids)
    
    if next_task:
        return f"{next_task.title} ({next_task.estimated_minutes} min)"
    
    # Fallback
    if not progress.first_contact_sent:
        return "Schreib EINE Nachricht an EINEN Kontakt"
    elif not progress.first_reply_received:
        return "Check ob jemand geantwortet hat"
    else:
        return "Führe EIN Gespräch weiter"


# ═══════════════════════════════════════════════════════════════════════════
# MESSAGE GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_onboarding_message(
    message_type: str,
    context: dict,
) -> str:
    """
    Generiert eine Onboarding-Nachricht.
    
    Args:
        message_type: Art der Nachricht
        context: Daten zum Befüllen
        
    Returns:
        Formatierte Nachricht
    """
    template = ONBOARDING_MESSAGES.get(message_type, "")
    
    if not template:
        return ""
    
    try:
        return template.format(**context)
    except KeyError:
        return template


def generate_progress_summary(progress: OnboardingProgress) -> str:
    """
    Generiert eine Fortschritts-Zusammenfassung.
    
    Args:
        progress: Aktueller Fortschritt
        
    Returns:
        Formatierter Fortschritt
    """
    lines = ["📊 **DEIN ONBOARDING FORTSCHRITT**\n"]
    
    # Stage-Progress
    stage_names = {
        OnboardingStage.DAY_1: "Tag 1: Setup",
        OnboardingStage.DAYS_2_3: "Tag 2-3: Erste Gespräche",
        OnboardingStage.DAYS_4_7: "Tag 4-7: Rhythmus aufbauen",
        OnboardingStage.DAYS_8_14: "Tag 8-14: Erste Erfolge",
        OnboardingStage.COMPLETED: "Onboarding abgeschlossen!",
    }
    
    lines.append(f"**Aktuelle Phase:** {stage_names.get(progress.current_stage, 'Unbekannt')}")
    lines.append(f"**Tag:** {progress.days_since_start}")
    lines.append(f"**Tasks:** {progress.tasks_completed}/{progress.tasks_total}")
    
    # Milestones
    lines.append("\n**Milestones:**")
    lines.append(f"• Erste Nachricht: {'✅' if progress.first_contact_sent else '⬜'}")
    lines.append(f"• Erste Antwort: {'✅' if progress.first_reply_received else '⬜'}")
    lines.append(f"• Erster Sale: {'🏆' if progress.first_sale else '⬜'}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# FULL ONBOARDING PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_onboarding_prompt(
    progress: Optional[OnboardingProgress] = None,
    next_task: Optional[OnboardingTask] = None,
    is_overwhelmed: bool = False,
) -> str:
    """
    Baut den kompletten Onboarding-Prompt.
    
    Args:
        progress: Aktueller User-Fortschritt
        next_task: Nächste zu erledigende Task
        is_overwhelmed: Ist User overwhelmed?
        
    Returns:
        Vollständiger Onboarding-Prompt
    """
    prompt_parts = [CHIEF_ONBOARDING_PROMPT]
    
    # Aktueller Fortschritt
    if progress:
        prompt_parts.append(f"\n## 📊 USER FORTSCHRITT")
        prompt_parts.append(f"- Tag: {progress.days_since_start}")
        prompt_parts.append(f"- Stage: {progress.current_stage.value}")
        prompt_parts.append(f"- Tasks: {progress.tasks_completed}/{progress.tasks_total}")
        prompt_parts.append(f"- Erste Nachricht: {'✅' if progress.first_contact_sent else '❌'}")
        prompt_parts.append(f"- Erste Antwort: {'✅' if progress.first_reply_received else '❌'}")
        prompt_parts.append(f"- Erster Sale: {'✅' if progress.first_sale else '❌'}")
    
    # Nächste Task
    if next_task:
        prompt_parts.append(f"\n## 🎯 NÄCHSTE TASK")
        prompt_parts.append(f"- **{next_task.title}**")
        prompt_parts.append(f"- {next_task.description}")
        prompt_parts.append(f"- Dauer: ~{next_task.estimated_minutes} min")
    
    # Overwhelm-Modus
    if is_overwhelmed:
        prompt_parts.append("\n## ⚠️ OVERWHELM ERKANNT")
        prompt_parts.append("User zeigt Zeichen von Überforderung.")
        prompt_parts.append("→ SIMPLIFICATION MODE aktivieren")
        prompt_parts.append("→ Nur EINE Aktion vorschlagen")
        prompt_parts.append("→ Keine neuen Features erwähnen")
    
    return "\n".join(prompt_parts)

