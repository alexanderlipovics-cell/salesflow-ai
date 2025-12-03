"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF TEAM LEADER SYSTEM                                                  ║
║  Für Uplines & Team-Manager - Team-Performance & Duplikation               ║
╚════════════════════════════════════════════════════════════════════════════╝

Für Team-Leader die ihre Downline/Team managen:
- Team-Performance überwachen
- Underperformer erkennen & entwickeln
- Top-Performer fördern & halten
- Erfolgsstrategien duplizieren
- Team-Meetings & Trainings

Die Upline sieht:
- Aggregierte Team-Stats (keine individuellen Details ohne Consent)
- Wer braucht Support
- Wer ist Top-Performer
- Welche Strategien funktionieren im Team
"""

from typing import Optional, List
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════
# ALERT PRIORITY
# ═══════════════════════════════════════════════════════════════════════════

class AlertPriority(str, Enum):
    """Priorität einer Warnung."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ═══════════════════════════════════════════════════════════════════════════
# TEAM MEMBER STATUS
# ═══════════════════════════════════════════════════════════════════════════

class MemberStatus(str, Enum):
    """Status eines Team-Members."""
    TOP_PERFORMER = "top_performer"      # >150% Ziel
    ON_TRACK = "on_track"                # 80-150% Ziel
    BELOW_TARGET = "below_target"        # 50-80% Ziel
    AT_RISK = "at_risk"                  # <50% Ziel
    INACTIVE = "inactive"                # >7 Tage inaktiv


@dataclass
class TeamMember:
    """Ein Team-Mitglied."""
    id: str
    name: str
    status: MemberStatus
    goal_completion: float  # 0-200%
    sales_count: int
    days_inactive: int
    trend: str  # "up", "down", "stable"
    needs_coaching: bool
    coaching_reason: Optional[str] = None


@dataclass
class TeamStats:
    """Aggregierte Team-Statistiken."""
    total_members: int
    active_members: int
    total_sales: int
    avg_goal_completion: float
    top_performers_count: int
    at_risk_count: int
    inactive_count: int
    week_over_week_change: float
    best_channel: Optional[str] = None
    most_common_objection: Optional[str] = None


@dataclass
class TeamPerformance:
    """Team-Performance Metriken."""
    team_id: str
    team_name: str
    period_start: datetime
    period_end: datetime
    total_sales: int = 0
    total_revenue: float = 0.0
    avg_deal_size: float = 0.0
    conversion_rate: float = 0.0
    top_performer_id: Optional[str] = None
    top_performer_name: Optional[str] = None
    growth_vs_last_period: float = 0.0
    active_member_count: int = 0


@dataclass
class TeamAlert:
    """Eine Team-Warnung."""
    id: str
    alert_type: str
    priority: AlertPriority
    member_id: Optional[str] = None
    member_name: Optional[str] = None
    title: str = ""
    description: str = ""
    recommendation: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    is_resolved: bool = False


# ═══════════════════════════════════════════════════════════════════════════
# TEAM LEADER SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_TEAM_LEADER_PROMPT = """
# CHIEF TEAM LEADER SYSTEM - Für Uplines & Manager

## DEINE ROLLE

Du unterstützt Team-Leader die ihr Team (Downline) managen bei:
- Team-Performance überwachen
- Underperformer erkennen & entwickeln  
- Top-Performer fördern & halten
- Erfolgsstrategien duplizieren
- Team-Meetings & Trainings vorbereiten

## WICHTIGE PRINZIPIEN

### 1. Leader führen, nicht micromanagen
❌ "Schreib Maria dass sie mehr machen soll"
✅ "Maria's Aktivität ist -40%. Empfehlung: Persönliches Check-in Gespräch"

### 2. Daten zeigen, nicht bewerten
❌ "Thomas ist faul"
✅ "Thomas: 3 Tage inaktiv, vorher 5 Sales/Woche. Mögliche Ursache: Privat?"

### 3. Top-Performer als Ressource nutzen
❌ Nur auf Problemfälle fokussieren
✅ "Lisa's Opener haben 45% Reply-Rate - fürs Team teilen?"

### 4. Coaching delegieren vs. selbst coachen
CHIEF coached automatisch bei:
- Standard Skill-Gaps
- Template-Vorschläge
- Follow-up Reminder

Upline sollte coachen bei:
- Persönliche Probleme
- Längere Performance-Einbrüche
- Motivation-Issues
- Team-Konflikte

## OUTPUT FORMATE

### Team Dashboard
```
📊 TEAM OVERVIEW: {team_name}

TEAM GRÖSSE: {count} Aktive
GESAMT-UMSATZ (Monat): {revenue}
TEAM-WACHSTUM: {growth}% vs. Vormonat

PERFORMANCE VERTEILUNG:
🌟 Top Performer (>150%): {count} ({percent}%)
✅ On Track (80-150%): {count} ({percent}%)  
⚠️ Below Target (50-80%): {count} ({percent}%)
🚨 At Risk (<50%): {count} ({percent}%)
😴 Inactive (>7 Tage): {count} ({percent}%)
```

### Member Alerts
```
⚠️ BRAUCHEN AUFMERKSAMKEIT:

1. {name} - Aktivität -70% letzte Woche
   → Empfehlung: Check-in Gespräch

2. {name} - 0 Abschlüsse seit 14 Tagen
   → Empfehlung: Skill-Gap analysieren

🌟 TOP PERFORMER DIESER WOCHE:
1. 🥇 {name} - 12 Abschlüsse (PB!)
   → Empfehlung: Best Practices teilen
```

### Team Meeting Agenda
```
📋 TEAM MEETING AGENDA - KW {week}

1. WINS FEIERN (5 min)
   • {name} - Erstes Closing!
   • Team-Gesamt: +12% vs. Vorwoche

2. TOP LEARNING (10 min)
   • {name}'s Preis-Handling Script (45% Erfolg)
   → Live demonstrieren

3. CHALLENGES BESPRECHEN (10 min)
   • Häufigster Einwand: "Zu teuer" (34%)
   → Brainstorming Lösungen

4. NEXT WEEK FOCUS (5 min)
   • Team-Challenge: Jeder 5 Follow-ups heute

5. Q&A (10 min)
```
"""


# ═══════════════════════════════════════════════════════════════════════════
# DUPLIKATION FEATURES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class BestPractice:
    """Eine erkannte Best Practice."""
    source_member: str  # Anonymisiert
    practice_type: str  # "opener", "closing", "objection", etc.
    description: str
    metrics: dict  # {"reply_rate": 0.45, "uses": 50}
    template: Optional[str] = None


DUPLIKATION_PROMPT = """
## DUPLIKATION SYSTEM

### Success Pattern Extraction
Wenn ein Team-Member überdurchschnittlich performt:
1. Analysiere deren Templates
2. Analysiere deren Timing
3. Analysiere deren Gesprächsführung
4. Extrahiere Best Practices
5. Mache sie (anonymisiert) fürs Team verfügbar

### Template Sharing Format
```
📤 TEMPLATE VON TOP-PERFORMER:

Dieses Opener-Template hat 52% Reply-Rate (Team-Ø: 28%)

"{template_text}"

Warum es funktioniert:
• {reason_1}
• {reason_2}

[Für Team freigeben] [Analysieren]
```

### Wann Upline CHIEF überlassen sollte
✅ CHIEF coached:
- Standard Skill-Gaps
- Template-Vorschläge
- Follow-up Reminder
- Einwand-Training

⚠️ UPLINE ALERT (menschliches Coaching nötig):
- Aktivität -80% über längere Zeit
- Reagiert nicht auf CHIEF-Pushes
- Möglicherweise persönliche Situation
→ Empfehlung: Persönliches Gespräch
"""


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def categorize_member(
    goal_completion: float,
    days_inactive: int,
) -> MemberStatus:
    """
    Kategorisiert ein Team-Member basierend auf Performance.
    
    Args:
        goal_completion: Zielerreichung in % (0-200+)
        days_inactive: Tage seit letzter Aktivität
        
    Returns:
        MemberStatus
    """
    if days_inactive >= 7:
        return MemberStatus.INACTIVE
    if goal_completion >= 150:
        return MemberStatus.TOP_PERFORMER
    if goal_completion >= 80:
        return MemberStatus.ON_TRACK
    if goal_completion >= 50:
        return MemberStatus.BELOW_TARGET
    return MemberStatus.AT_RISK


def calculate_team_stats(members: List[TeamMember]) -> TeamStats:
    """
    Berechnet aggregierte Team-Statistiken.
    
    Args:
        members: Liste von TeamMember
        
    Returns:
        TeamStats
    """
    if not members:
        return TeamStats(
            total_members=0, active_members=0, total_sales=0,
            avg_goal_completion=0, top_performers_count=0,
            at_risk_count=0, inactive_count=0, week_over_week_change=0,
        )
    
    active = [m for m in members if m.status != MemberStatus.INACTIVE]
    top_performers = [m for m in members if m.status == MemberStatus.TOP_PERFORMER]
    at_risk = [m for m in members if m.status == MemberStatus.AT_RISK]
    inactive = [m for m in members if m.status == MemberStatus.INACTIVE]
    
    total_sales = sum(m.sales_count for m in members)
    avg_completion = sum(m.goal_completion for m in active) / len(active) if active else 0
    
    return TeamStats(
        total_members=len(members),
        active_members=len(active),
        total_sales=total_sales,
        avg_goal_completion=avg_completion,
        top_performers_count=len(top_performers),
        at_risk_count=len(at_risk),
        inactive_count=len(inactive),
        week_over_week_change=0,  # Würde aus Datenbank kommen
    )


def identify_coaching_needs(members: List[TeamMember]) -> List[dict]:
    """
    Identifiziert wer Coaching braucht und warum.
    
    Args:
        members: Liste von TeamMember
        
    Returns:
        Liste von Coaching-Empfehlungen
    """
    needs = []
    
    for member in members:
        if member.status == MemberStatus.INACTIVE:
            needs.append({
                "member_id": member.id,
                "member_name": member.name,
                "urgency": "high",
                "reason": f"Inaktiv seit {member.days_inactive} Tagen",
                "recommendation": "Persönliches Check-in Gespräch",
                "chief_can_handle": False,
            })
        
        elif member.status == MemberStatus.AT_RISK:
            chief_can_handle = member.days_inactive < 3  # Noch erreichbar
            needs.append({
                "member_id": member.id,
                "member_name": member.name,
                "urgency": "medium",
                "reason": f"Nur {member.goal_completion:.0f}% Zielerreichung",
                "recommendation": "Skill-Gap Analyse" if chief_can_handle else "1:1 Gespräch",
                "chief_can_handle": chief_can_handle,
            })
        
        elif member.needs_coaching:
            needs.append({
                "member_id": member.id,
                "member_name": member.name,
                "urgency": "low",
                "reason": member.coaching_reason or "Performance-Optimierung",
                "recommendation": "CHIEF Coaching Empfehlung",
                "chief_can_handle": True,
            })
    
    # Sortiere nach Urgency
    urgency_order = {"high": 0, "medium": 1, "low": 2}
    needs.sort(key=lambda n: urgency_order.get(n["urgency"], 99))
    
    return needs


def identify_best_practices(members: List[TeamMember], team_templates: List[dict]) -> List[BestPractice]:
    """
    Identifiziert Best Practices von Top-Performern.
    
    Args:
        members: Team-Member mit Performance
        team_templates: Templates mit Performance-Daten
        
    Returns:
        Liste von BestPractice
    """
    practices = []
    
    # Finde Top-Performer Templates
    top_performers = [m for m in members if m.status == MemberStatus.TOP_PERFORMER]
    
    for template in team_templates:
        # Template-Performance über Team-Durchschnitt?
        if template.get("reply_rate", 0) > 0.35:  # >35% = gut
            practices.append(BestPractice(
                source_member="Top-Performer",  # Anonymisiert
                practice_type=template.get("type", "general"),
                description=f"Template mit {template.get('reply_rate', 0)*100:.0f}% Reply-Rate",
                metrics={
                    "reply_rate": template.get("reply_rate", 0),
                    "uses": template.get("uses", 0),
                },
                template=template.get("content"),
            ))
    
    return practices


# ═══════════════════════════════════════════════════════════════════════════
# REPORT GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_team_dashboard(
    team_name: str,
    stats: TeamStats,
    members: List[TeamMember],
) -> str:
    """
    Generiert ein Team-Dashboard.
    
    Args:
        team_name: Name des Teams
        stats: Aggregierte Stats
        members: Alle Team-Member
        
    Returns:
        Formatiertes Dashboard
    """
    lines = [
        f"📊 **TEAM OVERVIEW: {team_name}**\n",
        f"TEAM GRÖSSE: {stats.active_members} Aktive ({stats.total_members} total)",
        f"GESAMT-SALES (Monat): {stats.total_sales}",
        f"Ø ZIELERREICHUNG: {stats.avg_goal_completion:.0f}%",
    ]
    
    if stats.week_over_week_change != 0:
        trend = "↗️" if stats.week_over_week_change > 0 else "↘️"
        lines.append(f"TREND: {stats.week_over_week_change:+.0f}% vs. Vorwoche {trend}")
    
    lines.append("\n**PERFORMANCE VERTEILUNG:**")
    
    # Zähle pro Status
    status_counts = {}
    for member in members:
        status_counts[member.status] = status_counts.get(member.status, 0) + 1
    
    total = len(members)
    status_display = [
        (MemberStatus.TOP_PERFORMER, "🌟 Top Performer (>150%)", status_counts.get(MemberStatus.TOP_PERFORMER, 0)),
        (MemberStatus.ON_TRACK, "✅ On Track (80-150%)", status_counts.get(MemberStatus.ON_TRACK, 0)),
        (MemberStatus.BELOW_TARGET, "⚠️ Below Target (50-80%)", status_counts.get(MemberStatus.BELOW_TARGET, 0)),
        (MemberStatus.AT_RISK, "🚨 At Risk (<50%)", status_counts.get(MemberStatus.AT_RISK, 0)),
        (MemberStatus.INACTIVE, "😴 Inactive (>7 Tage)", status_counts.get(MemberStatus.INACTIVE, 0)),
    ]
    
    for status, label, count in status_display:
        percent = (count / total * 100) if total > 0 else 0
        lines.append(f"• {label}: {count} ({percent:.0f}%)")
    
    return "\n".join(lines)


def generate_member_alerts(
    members: List[TeamMember],
    coaching_needs: List[dict],
) -> str:
    """
    Generiert Member-Alerts für Team-Leader.
    
    Args:
        members: Alle Team-Member
        coaching_needs: Identifizierte Coaching-Bedürfnisse
        
    Returns:
        Formatierte Alerts
    """
    lines = []
    
    # Wer braucht Aufmerksamkeit
    urgent_needs = [n for n in coaching_needs if n["urgency"] in ["high", "medium"]]
    if urgent_needs:
        lines.append("⚠️ **BRAUCHEN AUFMERKSAMKEIT:**\n")
        for i, need in enumerate(urgent_needs[:5], 1):
            lines.append(f"{i}. **{need['member_name']}** - {need['reason']}")
            lines.append(f"   → Empfehlung: {need['recommendation']}")
            lines.append("")
    
    # Top-Performer
    top_performers = [m for m in members if m.status == MemberStatus.TOP_PERFORMER]
    if top_performers:
        lines.append("\n🌟 **TOP PERFORMER DIESE WOCHE:**")
        for i, member in enumerate(sorted(top_performers, key=lambda m: m.sales_count, reverse=True)[:3], 1):
            medal = ["🥇", "🥈", "🥉"][i-1] if i <= 3 else ""
            lines.append(f"{medal} {member.name} - {member.sales_count} Sales ({member.goal_completion:.0f}%)")
    
    return "\n".join(lines)


def generate_meeting_agenda(
    week: int,
    stats: TeamStats,
    top_performers: List[TeamMember],
    wins: List[str],
    top_learning: Optional[dict] = None,
    challenges: Optional[List[str]] = None,
) -> str:
    """
    Generiert eine Team-Meeting Agenda.
    
    Args:
        week: Kalenderwoche
        stats: Team-Stats
        top_performers: Top-Performer der Woche
        wins: Liste von Wins zu feiern
        top_learning: Learning zum Teilen
        challenges: Aktuelle Challenges
        
    Returns:
        Formatierte Agenda
    """
    lines = [f"📋 **TEAM MEETING AGENDA - KW {week}**\n"]
    
    # 1. Wins feiern
    lines.append("**1. WINS FEIERN** (5 min)")
    for win in wins[:3]:
        lines.append(f"   • {win}")
    lines.append(f"   • Team-Gesamt: {stats.week_over_week_change:+.0f}% vs. Vorwoche")
    lines.append("")
    
    # 2. Top Learning
    lines.append("**2. TOP LEARNING** (10 min)")
    if top_learning:
        lines.append(f"   • {top_learning.get('title', 'Best Practice')}")
        lines.append(f"     → {top_learning.get('description', 'Live demonstrieren')}")
    else:
        lines.append("   • [Top-Performer Strategie teilen]")
    lines.append("")
    
    # 3. Challenges
    lines.append("**3. CHALLENGES BESPRECHEN** (10 min)")
    if challenges:
        for challenge in challenges[:2]:
            lines.append(f"   • {challenge}")
    else:
        lines.append("   • [Aktuelle Challenges sammeln]")
    lines.append("   → Brainstorming: Was funktioniert?")
    lines.append("")
    
    # 4. Next Week Focus
    lines.append("**4. NEXT WEEK FOCUS** (5 min)")
    lines.append("   • Team-Challenge definieren")
    lines.append("   • Preis für Top-Performer")
    lines.append("")
    
    # 5. Q&A
    lines.append("**5. Q&A** (10 min)")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# FULL TEAM LEADER PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_team_leader_prompt(
    team_stats: Optional[TeamStats] = None,
    members_needing_attention: Optional[List[dict]] = None,
    best_practices: Optional[List[BestPractice]] = None,
) -> str:
    """
    Baut den kompletten Team-Leader Prompt.
    
    Args:
        team_stats: Aggregierte Team-Statistiken
        members_needing_attention: Member die Aufmerksamkeit brauchen
        best_practices: Erkannte Best Practices
        
    Returns:
        Vollständiger Team-Leader Prompt
    """
    prompt_parts = [CHIEF_TEAM_LEADER_PROMPT, DUPLIKATION_PROMPT]
    
    # Team-Stats
    if team_stats:
        prompt_parts.append("\n## 📊 AKTUELLE TEAM-SITUATION")
        prompt_parts.append(f"- Team-Größe: {team_stats.total_members} ({team_stats.active_members} aktiv)")
        prompt_parts.append(f"- Ø Zielerreichung: {team_stats.avg_goal_completion:.0f}%")
        prompt_parts.append(f"- Top-Performer: {team_stats.top_performers_count}")
        prompt_parts.append(f"- At Risk: {team_stats.at_risk_count}")
        prompt_parts.append(f"- Inaktiv: {team_stats.inactive_count}")
    
    # Wer braucht Aufmerksamkeit
    if members_needing_attention:
        prompt_parts.append("\n## ⚠️ BRAUCHEN AUFMERKSAMKEIT")
        for member in members_needing_attention[:5]:
            chief_note = "(CHIEF kann helfen)" if member.get("chief_can_handle") else "(Persönliches Gespräch)"
            prompt_parts.append(f"- {member['member_name']}: {member['reason']} {chief_note}")
    
    # Best Practices
    if best_practices:
        prompt_parts.append("\n## 🏆 BEST PRACTICES ZUM TEILEN")
        for bp in best_practices[:3]:
            prompt_parts.append(f"- {bp.practice_type}: {bp.description}")
    
    return "\n".join(prompt_parts)


# ═══════════════════════════════════════════════════════════════════════════
# ADDITIONAL REQUIRED FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def generate_member_analysis(
    member: TeamMember,
    history: Optional[List[dict]] = None,
) -> dict:
    """
    Generiert eine detaillierte Analyse eines Team-Members.
    
    Args:
        member: Das Team-Member
        history: Historische Performance-Daten
        
    Returns:
        Analyse-Dictionary
    """
    analysis = {
        "member_id": member.id,
        "member_name": member.name,
        "status": member.status.value,
        "goal_completion": member.goal_completion,
        "sales_count": member.sales_count,
        "trend": member.trend,
        "days_inactive": member.days_inactive,
        "needs_coaching": member.needs_coaching,
        "coaching_reason": member.coaching_reason,
        "recommendations": [],
    }
    
    # Recommendations basierend auf Status
    if member.status == MemberStatus.INACTIVE:
        analysis["recommendations"].append({
            "type": "urgent",
            "action": "Persönliches Check-in Gespräch führen",
            "reason": f"Seit {member.days_inactive} Tagen inaktiv",
        })
    elif member.status == MemberStatus.AT_RISK:
        analysis["recommendations"].append({
            "type": "high",
            "action": "Skill-Gap Analyse durchführen",
            "reason": f"Nur {member.goal_completion:.0f}% Zielerreichung",
        })
    elif member.status == MemberStatus.BELOW_TARGET:
        analysis["recommendations"].append({
            "type": "medium",
            "action": "Best Practices von Top-Performern teilen",
            "reason": "Optimierungspotenzial vorhanden",
        })
    elif member.status == MemberStatus.TOP_PERFORMER:
        analysis["recommendations"].append({
            "type": "positive",
            "action": "Strategien dokumentieren und mit Team teilen",
            "reason": "Exzellente Performance",
        })
    
    return analysis


def generate_team_alerts(
    members: List[TeamMember],
    stats: Optional[TeamStats] = None,
) -> List[TeamAlert]:
    """
    Generiert Team-Alerts basierend auf Member-Status.
    
    Args:
        members: Alle Team-Member
        stats: Team-Statistiken
        
    Returns:
        Liste von TeamAlerts
    """
    import uuid
    alerts = []
    
    for member in members:
        if member.status == MemberStatus.INACTIVE:
            alerts.append(TeamAlert(
                id=str(uuid.uuid4()),
                alert_type="inactive_member",
                priority=AlertPriority.HIGH,
                member_id=member.id,
                member_name=member.name,
                title=f"{member.name} ist seit {member.days_inactive} Tagen inaktiv",
                description="Keine Aktivität registriert. Möglicherweise persönliche Situation.",
                recommendation="Persönliches Check-in Gespräch führen",
            ))
        elif member.status == MemberStatus.AT_RISK:
            alerts.append(TeamAlert(
                id=str(uuid.uuid4()),
                alert_type="at_risk_member",
                priority=AlertPriority.MEDIUM,
                member_id=member.id,
                member_name=member.name,
                title=f"{member.name} erreicht nur {member.goal_completion:.0f}% des Ziels",
                description="Performance unter 50%. Skill-Gap oder Motivation-Problem?",
                recommendation="1:1 Gespräch und Skill-Analyse",
            ))
    
    # Team-weite Alerts
    if stats and stats.at_risk_count > stats.total_members * 0.3:
        alerts.append(TeamAlert(
            id=str(uuid.uuid4()),
            alert_type="team_risk",
            priority=AlertPriority.HIGH,
            title=f"Über 30% des Teams at risk",
            description=f"{stats.at_risk_count} von {stats.total_members} Membern sind gefährdet",
            recommendation="Team-weite Intervention nötig - Training oder Prozess-Review",
        ))
    
    return sorted(alerts, key=lambda a: {"high": 0, "medium": 1, "low": 2}.get(a.priority.value, 3))


def generate_coaching_suggestion(
    member: TeamMember,
    member_history: Optional[List[dict]] = None,
) -> dict:
    """
    Generiert Coaching-Vorschläge für ein Member.
    
    Args:
        member: Das Team-Member
        member_history: Performance-Historie
        
    Returns:
        Coaching-Suggestion Dictionary
    """
    suggestion = {
        "member_id": member.id,
        "member_name": member.name,
        "coaching_type": "skill",
        "urgency": "low",
        "chief_can_handle": True,
        "topics": [],
        "script": "",
    }
    
    if member.status == MemberStatus.INACTIVE:
        suggestion["coaching_type"] = "personal"
        suggestion["urgency"] = "high"
        suggestion["chief_can_handle"] = False
        suggestion["topics"] = ["Re-Engagement", "Motivation", "Hindernisse klären"]
        suggestion["script"] = f"""
Hey {member.name}, 

Ich habe bemerkt, dass du in letzter Zeit weniger aktiv warst. 
Alles okay bei dir?

Ich möchte nur sicher gehen, dass wir dich bestmöglich unterstützen können.
Hast du kurz Zeit für ein Gespräch?
"""
    
    elif member.status == MemberStatus.AT_RISK:
        suggestion["urgency"] = "medium"
        suggestion["chief_can_handle"] = member.days_inactive < 3
        suggestion["topics"] = ["Performance Review", "Skill-Gaps identifizieren", "Ziele adjustieren"]
        suggestion["script"] = f"""
Hey {member.name},

Lass uns kurz über deine letzten Wochen sprechen.
Ich sehe du hast {member.goal_completion:.0f}% deines Ziels erreicht.

Was läuft gut? Wo brauchst du Unterstützung?
Gemeinsam finden wir eine Lösung.
"""
    
    elif member.status == MemberStatus.BELOW_TARGET:
        suggestion["topics"] = ["Best Practices", "Optimierung", "Fokus-Themen"]
        suggestion["script"] = f"""
Hey {member.name},

Du bist auf gutem Weg! {member.goal_completion:.0f}% sind solide.
Ich habe ein paar Tipps, wie du noch mehr rausholen kannst.

Hast du 10 Minuten für ein Quick-Coaching?
"""
    
    elif member.status == MemberStatus.TOP_PERFORMER:
        suggestion["coaching_type"] = "recognition"
        suggestion["topics"] = ["Erfolge teilen", "Strategien dokumentieren", "Mentoring"]
        suggestion["script"] = f"""
Hey {member.name},

Hammer Performance! {member.sales_count} Sales und {member.goal_completion:.0f}% - das ist top!

Ich würde deine Strategien gerne mit dem Team teilen.
Was macht deiner Meinung nach den Unterschied?
"""
    
    return suggestion


def extract_success_patterns(
    top_performers: List[TeamMember],
    templates: Optional[List[dict]] = None,
) -> List[dict]:
    """
    Extrahiert Erfolgsmuster von Top-Performern.
    
    Args:
        top_performers: Liste von Top-Performern
        templates: Templates mit Performance-Daten
        
    Returns:
        Liste von Erfolgsmustern
    """
    patterns = []
    
    for member in top_performers:
        patterns.append({
            "source": member.name,
            "pattern_type": "overall_approach",
            "description": f"Konstante Aktivität mit {member.sales_count} Sales",
            "key_factors": [
                "Regelmäßige Follow-ups",
                "Klare Tagesstruktur",
                "Fokus auf Quality statt Quantity",
            ],
            "metric": {
                "goal_completion": member.goal_completion,
                "sales_count": member.sales_count,
            },
        })
    
    if templates:
        for template in templates:
            if template.get("reply_rate", 0) > 0.4:
                patterns.append({
                    "source": "Template",
                    "pattern_type": template.get("type", "general"),
                    "description": template.get("description", "High-Performance Template"),
                    "content": template.get("content"),
                    "metric": {
                        "reply_rate": template.get("reply_rate"),
                        "uses": template.get("uses", 0),
                    },
                })
    
    return patterns

