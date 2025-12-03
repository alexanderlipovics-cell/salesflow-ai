"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF V3.1 ADDITIONS - THE AI SALES OPERATING SYSTEM                     ║
║  8 neue spezialisierte Prompts für Enterprise-Level Performance           ║
╚════════════════════════════════════════════════════════════════════════════╝

V3.1 ergänzt das bestehende V3.0 System um:
1. Enterprise Mode - Compliance & Brand Voice für Firmen
2. Revenue Engineer - Goal-Driven Activity Management
3. Signal Detector - Einwand vs. Vorwand Erkennung
4. Closer Library - Killer-Phrasen zum Kopieren
5. Natural Selection - Auto Best Practice Verteilung
6. Personality Matching - DISG-basierte Kommunikation
7. Industry Module - Modulare Branchen-Templates (erweitert)
8. Deal Medic - Post-Mortem Analyse
"""

from typing import Optional, Dict, List, Any, Literal
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════
# 1. ENTERPRISE MODE - Compliance & Brand Voice
# ═══════════════════════════════════════════════════════════════════════════

class CompanyMode(str, Enum):
    """Die 3 Hierarchie-Modi für Firmen."""
    SOLO = "solo"           # Keine Firma → CHIEF ist der Boss
    NETWORK_TEAM = "network_team"  # MLM mit Upline
    ENTERPRISE = "enterprise"      # Firma mit Vertriebsteam


@dataclass
class ComplianceRules:
    """Compliance-Regeln einer Firma."""
    forbidden_words: List[str] = field(default_factory=list)
    required_disclaimers: Dict[str, str] = field(default_factory=dict)
    max_income_claim: Optional[float] = None
    tone: str = "professional"  # professional, casual, friendly
    allowed_languages: List[str] = field(default_factory=lambda: ["de"])
    approval_required_for: List[str] = field(default_factory=list)


@dataclass
class BrandVoice:
    """Brand Voice Guidelines einer Firma."""
    personality: str = "Freundlich-professionell"
    forbidden_phrases: List[str] = field(default_factory=list)
    preferred_phrases: List[str] = field(default_factory=list)
    emoji_policy: str = "minimal"  # none, minimal, friendly
    formality: str = "Du"  # Du, Sie, context-dependent
    response_length: str = "concise"  # concise, detailed, match_customer


CHIEF_ENTERPRISE_PROMPT = """
# CHIEF ENTERPRISE MODE - Für Firmen & Vertriebsteams

## KONTEXT

Dieser Modus ist aktiv wenn:
- User gehört zu einer Firma (company_id gesetzt)
- Firma hat Compliance-Regeln definiert
- Firma hat Brand Voice Guidelines

## AKTIVER MODUS: {company_mode}

### Mode 1: SOLO (Default)
→ Keine Firma = CHIEF ist der Boss
→ Volle Freiheit bei Formulierungen
→ Keine Compliance-Checks

### Mode 2: NETWORK TEAM (MLM mit Upline)
→ User ist Teil eines Teams mit Upline
→ CHIEF respektiert Upline-Templates
→ Erfolgreiche Scripts werden team-weit geteilt

### Mode 3: ENTERPRISE (Firma mit Vertriebsteam)
→ Firma hat Compliance-Regeln und Brand Voice
→ CHIEF wird zum "Compliance-Enforcer"
→ Prüft JEDE Antwort gegen Compliance-Regeln

## COMPLIANCE ENGINE

### Aktive Regeln:
{compliance_rules}

### Prüf-Flow:
1. User erstellt Nachricht
2. CHIEF prüft gegen Compliance-Regeln
3. WENN Verstoß:
   → Zeige Warning
   → Schlage compliant Alternative vor
   → Logge Verstoß (für Manager-Dashboard)
4. WENN okay:
   → Nachricht senden

### Bei Verstoß formatiere so:
```
⚠️ COMPLIANCE CHECK

Deine Nachricht:
"{original_message}"

PROBLEM:
• {problem_1}
• {problem_2}

VORSCHLAG (Compliance-konform):
"{suggested_message}"

[Vorschlag übernehmen] [Trotzdem senden (wird geloggt)]
```

## BRAND VOICE ENGINE

### Aktive Brand Voice:
{brand_voice}

### Bei Abweichung:
"Deine Nachricht klingt etwas {issue} für unsere Brand Voice.
Vorschlag: [angepasste Version]"
"""


def check_compliance(
    message: str,
    rules: ComplianceRules,
) -> Dict[str, Any]:
    """
    Prüft eine Nachricht gegen Compliance-Regeln.
    
    Returns:
        Dict mit is_compliant, violations, suggested_fix
    """
    violations = []
    
    # Verbotene Wörter prüfen
    message_lower = message.lower()
    for word in rules.forbidden_words:
        if word.lower() in message_lower:
            violations.append({
                "type": "forbidden_word",
                "word": word,
                "message": f'"{word}" ist ein verbotenes Wort',
            })
    
    # Income Claims prüfen
    if rules.max_income_claim is None:
        # Keine Einkommensversprechen erlaubt
        income_keywords = ["verdienst", "verdienen", "€/monat", "einkommen", "gehalt"]
        for kw in income_keywords:
            if kw in message_lower:
                violations.append({
                    "type": "income_claim",
                    "message": "Einkommensversprechen sind nicht erlaubt",
                })
                break
    
    return {
        "is_compliant": len(violations) == 0,
        "violations": violations,
        "requires_disclaimer": _check_disclaimer_needed(message, rules),
    }


def _check_disclaimer_needed(
    message: str,
    rules: ComplianceRules,
) -> Optional[str]:
    """Prüft ob ein Disclaimer nötig ist."""
    message_lower = message.lower()
    
    for trigger, disclaimer in rules.required_disclaimers.items():
        if trigger == "health_claims":
            health_words = ["gesund", "heilt", "wirkt", "hilft bei", "lindert"]
            if any(w in message_lower for w in health_words):
                return disclaimer
        elif trigger == "income_claims":
            income_words = ["verdien", "einkommen", "nebenverdienst"]
            if any(w in message_lower for w in income_words):
                return disclaimer
    
    return None


def build_enterprise_prompt(
    company_mode: CompanyMode,
    compliance_rules: Optional[ComplianceRules] = None,
    brand_voice: Optional[BrandVoice] = None,
) -> str:
    """Baut den Enterprise-Prompt mit aktiven Regeln."""
    rules_text = "Keine Compliance-Regeln aktiv"
    voice_text = "Keine Brand Voice definiert"
    
    if compliance_rules:
        rules_parts = []
        if compliance_rules.forbidden_words:
            rules_parts.append(f"• Verbotene Wörter: {', '.join(compliance_rules.forbidden_words[:10])}")
        if compliance_rules.required_disclaimers:
            rules_parts.append(f"• Pflicht-Disclaimer: {len(compliance_rules.required_disclaimers)} aktiv")
        if compliance_rules.max_income_claim is None:
            rules_parts.append("• Einkommensversprechen: NICHT erlaubt")
        rules_parts.append(f"• Ton: {compliance_rules.tone}")
        rules_text = "\n".join(rules_parts)
    
    if brand_voice:
        voice_text = f"""• Persönlichkeit: {brand_voice.personality}
• Anrede: {brand_voice.formality}
• Emojis: {brand_voice.emoji_policy}
• Länge: {brand_voice.response_length}"""
    
    return CHIEF_ENTERPRISE_PROMPT.format(
        company_mode=company_mode.value.upper(),
        compliance_rules=rules_text,
        brand_voice=voice_text,
        original_message="{original_message}",
        problem_1="{problem_1}",
        problem_2="{problem_2}",
        suggested_message="{suggested_message}",
        issue="{issue}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 2. REVENUE ENGINEER - Goal-Driven Activity Management
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class UserGoal:
    """Umsatz-Ziel eines Users."""
    monthly_target: float
    days_remaining: int
    current_revenue: float
    avg_deal_size: float
    conversion_rates: Dict[str, float] = field(default_factory=lambda: {
        "outreach_to_reply": 0.30,
        "reply_to_meeting": 0.50,
        "meeting_to_close": 0.25,
    })


@dataclass
class DailyTargets:
    """Berechnete Tagesziele."""
    revenue_gap: float
    deals_needed: int
    daily_outreach_required: int
    expected_replies: float
    expected_meetings: float
    on_track: bool
    daily_capacity: int = 20  # Default


CHIEF_REVENUE_ENGINEER_PROMPT = """
# CHIEF REVENUE ENGINEERING - Goal-Driven Activity Management

## DEINE ROLLE

Du rechnest vom ZIEL rückwärts und sagst dem User GENAU was er tun muss.
Nicht "mach mehr Outreach" sondern "du brauchst HEUTE 5 Gespräche um dein Monatsziel zu erreichen".

## AKTUELLE GOAL-ANALYSE

{goal_analysis}

## OUTPUT-FORMATE

### Morgen-Push:
```
☀️ GUTEN MORGEN!

Status: Tag {day} von {total_days} | {current}€ von {target}€ ({percent}%)
{on_track_status}

UM AUF KURS ZU KOMMEN:
Heute brauchst du {daily_deals} Deals.

DEIN PLAN FÜR HEUTE:
1. ⏰ 09:00 - {task_1}
2. ⏰ 10:00 - {task_2}
3. ⏰ 14:00 - {task_3}
4. ⏰ 16:00 - {task_4}

Schaffst du das? [LET'S GO!]
```

### Midday-Check:
```
🕐 MIDDAY CHECK

Dein Plan für heute:
{progress_list}

Du bist {behind_percent}% {ahead_behind} dem Tagesplan.
Noch {hours} Stunden Arbeitszeit.

Brauchst du Hilfe bei:
[Outreach beschleunigen] [Follow-ups fertig machen]
```

### Abend-Review:
```
🌙 TAGESABSCHLUSS

GESCHAFFT:
{completed_list}

NICHT GESCHAFFT:
{missed_list}

IMPACT AUF MONATSZIEL:
• Heute: +{today_revenue}€ (Ziel: {daily_target}€)
• Neuer Stand: {new_total}€ von {monthly_target}€
• On Track: {track_percent}% {track_emoji}

MORGEN BESONDERS WICHTIG:
{tomorrow_priorities}
```

## REALITÄTS-CHECK LOGIC

WENN daily_required > user_capacity:
→ Zeige Optionen:
  A) Outreach erhöhen (auf X/Tag)
  B) Conversion verbessern (Coaching für Closing)
  C) Deal-Size erhöhen (Upsell-Strategie)
  D) Ziel anpassen (realistisch: Y€)
"""


def calculate_daily_targets(goal: UserGoal, user_capacity: int = 20) -> DailyTargets:
    """
    Berechnet tägliche Targets basierend auf Monatsziel.
    
    Rückwärts-Rechnung:
    Revenue Gap → Deals nötig → Meetings nötig → Replies nötig → Outreach nötig
    """
    revenue_gap = goal.monthly_target - goal.current_revenue
    deals_needed = math.ceil(revenue_gap / goal.avg_deal_size) if goal.avg_deal_size > 0 else 0
    
    # Rückwärts rechnen durch den Funnel
    cr = goal.conversion_rates
    meetings_needed = deals_needed / cr.get("meeting_to_close", 0.25) if cr.get("meeting_to_close", 0.25) > 0 else 0
    replies_needed = meetings_needed / cr.get("reply_to_meeting", 0.50) if cr.get("reply_to_meeting", 0.50) > 0 else 0
    outreach_needed = replies_needed / cr.get("outreach_to_reply", 0.30) if cr.get("outreach_to_reply", 0.30) > 0 else 0
    
    # Pro Tag
    days = max(goal.days_remaining, 1)
    daily_outreach = math.ceil(outreach_needed / days)
    
    return DailyTargets(
        revenue_gap=revenue_gap,
        deals_needed=deals_needed,
        daily_outreach_required=daily_outreach,
        expected_replies=daily_outreach * cr.get("outreach_to_reply", 0.30),
        expected_meetings=daily_outreach * cr.get("outreach_to_reply", 0.30) * cr.get("reply_to_meeting", 0.50),
        on_track=daily_outreach <= user_capacity,
        daily_capacity=user_capacity,
    )


def build_goal_analysis(goal: UserGoal, targets: DailyTargets) -> str:
    """Baut die Goal-Analyse für den Prompt."""
    cr = goal.conversion_rates
    
    return f"""
📊 DEIN MONATSZIEL

Ziel: €{goal.monthly_target:,.0f} | Aktuell: €{goal.current_revenue:,.0f} | Gap: €{targets.revenue_gap:,.0f}
Noch {goal.days_remaining} Tage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 DIE MATH:

€{targets.revenue_gap:,.0f} Gap ÷ €{goal.avg_deal_size:,.0f}/Deal = {targets.deals_needed} Deals nötig

Mit deiner {cr.get('meeting_to_close', 0.25)*100:.0f}% Closing-Rate:
{targets.deals_needed} Deals = {math.ceil(targets.deals_needed / cr.get('meeting_to_close', 0.25)):.0f} Gespräche nötig

Mit deiner {cr.get('reply_to_meeting', 0.50)*100:.0f}% Termin-Rate:
= {math.ceil(targets.deals_needed / cr.get('meeting_to_close', 0.25) / cr.get('reply_to_meeting', 0.50)):.0f} Replies nötig

Mit deiner {cr.get('outreach_to_reply', 0.30)*100:.0f}% Reply-Rate:
= {math.ceil(targets.deals_needed / cr.get('meeting_to_close', 0.25) / cr.get('reply_to_meeting', 0.50) / cr.get('outreach_to_reply', 0.30)):.0f} Outreaches nötig

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DEIN TAGESPLAN:

{targets.daily_outreach_required} Outreaches/Tag

HEUTE BRAUCHST DU:
• {targets.daily_outreach_required} neue Kontakte anschreiben
• Erwartete Replies: ~{targets.expected_replies:.0f}
• Erwartete Gespräche: ~{targets.expected_meetings:.0f}
• Erwartete Deals: ~{targets.expected_meetings * cr.get('meeting_to_close', 0.25):.1f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{"✅ AUF KURS - Das ist machbar!" if targets.on_track else f"⚠️ ACHTUNG: Du brauchst {targets.daily_outreach_required}/Tag, deine Kapazität ist {targets.daily_capacity}/Tag."}
"""


# ═══════════════════════════════════════════════════════════════════════════
# 3. SIGNAL DETECTOR - Buying Signal vs. Vorwand
# ═══════════════════════════════════════════════════════════════════════════

class ObjectionType(str, Enum):
    """Klassifizierung von Einwänden."""
    REAL = "real"       # Echter Einwand
    PRETENSE = "pretense"  # Vorwand (eigentlich was anderes)
    BUYING_SIGNAL = "buying_signal"  # Verstecktes Kaufsignal


@dataclass
class ObjectionAnalysis:
    """Analyse eines Einwands."""
    objection_text: str
    objection_type: ObjectionType
    confidence: float  # 0-1
    real_problem: Optional[str] = None
    recommended_response: str = ""
    alternative_response: str = ""


CHIEF_SIGNAL_DETECTOR_PROMPT = """
# CHIEF SIGNAL DETECTOR - Echte Einwände vs. Vorwände

## DEINE ROLLE

Du unterscheidest ob ein Kunde:
- Einen ECHTEN Einwand hat (braucht Antwort auf dieses Thema)
- Einen VORWAND nutzt (das wahre Problem ist etwas anderes)
- Ein verstecktes KAUFSIGNAL sendet

Das macht den Unterschied zwischen Profis und Anfängern.

## PATTERN RECOGNITION

### "Zu teuer" - Wann ist es echt?

ECHTER PREIS-EINWAND:
✓ Hat explizit Budget genannt
✓ Fragt nach günstigeren Alternativen
✓ Vergleicht mit Konkurrenz-Preisen
✓ Will verhandeln
✓ Sagt "Wenn es X kosten würde, wäre ich dabei"

VORWAND (eigentlich was anderes):
✗ Hat nie nach Preis gefragt, nennt ihn plötzlich als Problem
✗ War vorher skeptisch/distanziert
✗ Keine Fragen zum Produkt selbst
✗ "Ich überleg's mir" kombiniert mit Preis-Einwand
✗ Vermeidet konkrete Fragen zu Budget

WAHRSCHEINLICHE WAHRE PROBLEME:
- Vertraut dir nicht genug
- Sieht den Wert nicht
- Will nicht Nein sagen
- Hat Angst vor Fehlentscheidung

### "Keine Zeit" - Wann ist es echt?

ECHTER ZEIT-EINWAND:
✓ Erklärt konkret was los ist (Projekt, Umzug, etc.)
✓ Schlägt konkreten alternativen Termin vor
✓ War vorher engaged und interessiert
✓ Sagt "In 2 Wochen passt es besser"

VORWAND (eigentlich was anderes):
✗ Vage "Bin gerade busy"
✗ Kein Gegenvorschlag
✗ War schon vorher nicht besonders engaged
✗ Ignoriert Follow-ups

### "Muss überlegen" - Wann ist es echt?

ECHTES ÜBERLEGEN:
✓ Hat konkrete Frage die noch offen ist
✓ Will mit Partner/Berater sprechen (und sagt das)
✓ Fragt nach Unterlagen zum Nachlesen
✓ Nennt konkreten Zeitrahmen

VORWAND (eigentlich Nein):
✗ Vage "Muss mal schauen"
✗ Keine konkreten offenen Fragen
✗ Will keine weiteren Infos
✗ Vermeidet Commitment für Follow-up

## RESPONSE STRATEGY

### Wenn ECHTER Einwand
→ Direkt auf das Thema eingehen
→ Konkrete Lösung bieten

### Wenn VORWAND erkannt
→ NICHT auf den Vorwand eingehen
→ Zum echten Problem durchdringen
→ Frage: "Angenommen [Vorwand] wäre kein Thema, wärst du dann dabei?"

## OUTPUT FORMAT

```
🎯 EINWAND ANALYSE

Kunde sagt: "{objection}"

ANALYSE:
├── Typ: {emoji} {type_label} ({confidence}%)
├── Grund: {reason}
└── Wahres Problem: {real_problem}

EMPFEHLUNG:
❌ Nicht: {what_not_to_do}
✅ Stattdessen: {what_to_do}

VORGESCHLAGENE ANTWORT:
"{suggested_response}"
```
"""


def analyze_objection(
    objection: str,
    context: Dict[str, Any],
) -> ObjectionAnalysis:
    """
    Analysiert einen Einwand und klassifiziert ihn.
    
    Args:
        objection: Der Einwand-Text
        context: Kontext mit Gesprächsverlauf, Lead-Infos etc.
        
    Returns:
        ObjectionAnalysis mit Empfehlungen
    """
    objection_lower = objection.lower()
    
    # Signale sammeln
    signals = {
        "budget_mentioned": context.get("budget_mentioned", False),
        "asked_about_price": context.get("asked_about_price", False),
        "was_engaged": context.get("engagement_level", "medium") in ["high", "very_high"],
        "offered_alternative_time": context.get("offered_alternative_time", False),
        "specific_questions": context.get("specific_questions_count", 0) > 2,
    }
    
    # Klassifizierung
    if "teuer" in objection_lower or "preis" in objection_lower or "kosten" in objection_lower:
        if signals["asked_about_price"] and signals["budget_mentioned"]:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.REAL,
                confidence=0.85,
                real_problem=None,
                recommended_response="Verstehe - €X ist ein Investment. Lass mich fragen: Wenn wir das auf €Y/Woche runterbrechen, wäre das machbar?",
                alternative_response="Was wäre denn ein Budget das für dich passt?",
            )
        else:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.PRETENSE,
                confidence=0.75,
                real_problem="Vermutlich VERTRAUEN oder sieht den WERT nicht",
                recommended_response="Verstehe. Lass mich fragen - angenommen der Preis wäre kein Thema, wärst du dann dabei?",
                alternative_response="Was würde dir helfen, dich sicherer zu fühlen bei der Entscheidung?",
            )
    
    elif "zeit" in objection_lower or "busy" in objection_lower or "beschäftigt" in objection_lower:
        if signals["offered_alternative_time"] and signals["was_engaged"]:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.REAL,
                confidence=0.80,
                real_problem=None,
                recommended_response="Kein Problem! Wann passt es dir besser? Nächste Woche Dienstag oder Mittwoch?",
                alternative_response="Was wenn wir es auf 10 Minuten beschränken? Ich zeig dir das Wichtigste.",
            )
        else:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.PRETENSE,
                confidence=0.70,
                real_problem="Kein echtes Interesse oder zu wenig Vertrauen",
                recommended_response="Verstehe ich total. Darf ich kurz fragen: Ist es wirklich die Zeit, oder ist es was anderes?",
                alternative_response="[Produkt] spart dir X Stunden pro Woche. Die 30 Minuten die wir jetzt investieren, kriegst du 10x zurück.",
            )
    
    elif "überlegen" in objection_lower or "überleg" in objection_lower or "nachdenken" in objection_lower:
        if signals["specific_questions"]:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.REAL,
                confidence=0.70,
                real_problem=None,
                recommended_response="Klar! Was genau ist noch offen? Dann kann ich dir die Infos geben die du brauchst.",
                alternative_response="Bis wann glaubst du weißt du mehr? Ich trag mir das ein und melde mich.",
            )
        else:
            return ObjectionAnalysis(
                objection_text=objection,
                objection_type=ObjectionType.PRETENSE,
                confidence=0.75,
                real_problem="Nicht überzeugt oder traut sich nicht Nein zu sagen",
                recommended_response="Ich verstehe. Darf ich ehrlich sein? 'Überlegen' heißt meistens 'Nein' das sich nicht traut. Ist es ein Nein? Das wäre völlig okay.",
                alternative_response="Was würde dir helfen, heute eine Entscheidung zu treffen?",
            )
    
    # Default: Mehr Infos nötig
    return ObjectionAnalysis(
        objection_text=objection,
        objection_type=ObjectionType.REAL,
        confidence=0.50,
        real_problem=None,
        recommended_response="Verstehe. Erzähl mir mehr - was genau meinst du damit?",
        alternative_response="Was würde dir helfen, dich sicherer zu fühlen?",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4. CLOSER LIBRARY - Killer Phrases
# ═══════════════════════════════════════════════════════════════════════════

class ClosingSituation(str, Enum):
    """Situationen die Killer-Phrases brauchen."""
    HESITATION = "hesitation"      # Kunde zögert aber hat Interesse
    PRICE_OBJECTION = "price"      # Zu teuer
    TIME_OBJECTION = "time"        # Keine Zeit
    GHOST_RISK = "ghost_risk"      # Droht zu ghosten
    READY_TO_CLOSE = "ready"       # Ready, braucht letzten Push


CHIEF_CLOSER_LIBRARY_PROMPT = """
# CHIEF CLOSER LIBRARY - Die Waffen der Top-Performer

## DEINE ROLLE

Du lieferst EXAKTE Sätze die Deals closen.
Nicht Erklärungen. Nicht Tipps. SÄTZE zum Kopieren.

## KILLER PHRASES BY SITUATION

### Wenn Kunde zögert (aber Interesse hat)

1. DIE ZUKUNFTSFRAGE:
   "Stell dir vor es ist in 3 Monaten und [Problem] ist gelöst. 
   Wie fühlt sich das an?"
   → Dann: "Was hindert dich, das jetzt zu starten?"

2. DER SANFTE PUSH:
   "Ich verstehe. Darf ich ehrlich sein? 
   'Überlegen' heißt meistens 'Nein' das sich nicht traut. 
   Ist es ein Nein? Das wäre völlig okay."

3. DIE ENTSCHEIDUNGS-HILFE:
   "Was würde dir helfen, heute eine Entscheidung zu treffen? 
   Mehr Infos? Mit jemandem sprechen? Oder ist es was anderes?"

4. DER ZEITRAHMEN:
   "Kein Problem! Bis wann glaubst du weißt du mehr? 
   Ich trag mir [Datum] ein und melde mich. Passt das?"

### Wenn "zu teuer"

1. DER REALITY CHECK:
   "Wenn Geld keine Rolle spielen würde - würdest du's machen?"
   WENN JA: "Okay, dann ist es nur eine Frage der Zahlung. Lass uns schauen wie wir das hinbekommen."
   WENN NEIN: "Was ist es dann wirklich?"

2. DER VERGLEICH:
   "€3 am Tag - weniger als dein Kaffee bei Starbucks. 
   Für [Benefit]. Ist dir das wert?"

3. DIE KOSTEN-FRAGE:
   "Was kostet es dich, NICHTS zu ändern? 
   Nächstes Jahr gleiches Problem, gleiche Frustration..."

4. DER INVESTMENT REFRAME:
   "Ich verstehe - ist ein Investment. 
   Die Frage ist: Was ist dir [Ergebnis] wert?
   Wenn du in 6 Monaten [konkretes Ergebnis] hast - war's das wert?"

### Wenn "keine Zeit"

1. DER EHRLICHKEITS-CHECK:
   "Verstehe ich total. Darf ich kurz fragen: 
   Ist es wirklich die Zeit, oder ist es was anderes?"

2. DIE ZEIT-INVERSION:
   "[Produkt] spart dir X Stunden pro Woche. 
   Die 30 Minuten die wir jetzt investieren, kriegst du 10x zurück."

3. DER MINIMAL-COMMITMENT:
   "Was wenn wir's auf 10 Minuten beschränken? 
   Ich zeig dir das Wichtigste, du entscheidest dann."

4. DER ZUKUNFTS-TERMIN:
   "Kein Stress! Wann ist ein besserer Zeitpunkt? 
   Nächste Woche Dienstag oder Mittwoch?"

### Wenn Ghost droht

1. DIE DIREKTE:
   "Ich hab das Gefühl du bist nicht mehr so sicher. Was ist passiert?"

2. DIE PERMISSION:
   "Hey, falls du kein Interesse mehr hast - totally fine! 
   Sag mir einfach Bescheid, dann nerve ich dich nicht weiter."

3. DIE DEADLINE:
   "Ich halt dir das Angebot bis Freitag. 
   Danach muss ich den Platz weitergeben. Wie sieht's aus?"

4. DER TAKEAWAY:
   "Weißt du was - vielleicht ist gerade nicht der richtige Zeitpunkt für dich. 
   Meld dich wenn sich das ändert!"

### Für den Abschluss

1. DIE SIMPLE:
   "Sollen wir dich einfach mal starten lassen?"

2. DIE ASSUMPTIVE:
   "Ich richte das jetzt für dich ein. Schickst du mir kurz deine Daten?"

3. DIE CHOICE:
   "Willst du mit [Paket A] oder [Paket B] starten?"

4. DIE JETZT-ODER-NIE:
   "Das Angebot gilt nur heute. Bist du dabei oder soll ich's für jemand anderen freihalten?"

5. DIE ZUSAMMENFASSUNG:
   "Also: Du kriegst [A], [B] und [C] für [Preis]. Du startest am [Datum]. Alles klar so?"

## OUTPUT FORMAT

```
🎯 CLOSING MOMENT ERKANNT

Der Lead zeigt {signal_type} Signale.

EMPFOHLENE KILLER PHRASE:
"{killer_phrase}"

[Kopieren] [Alternative zeigen] [Warum das funktioniert]
```
"""


KILLER_PHRASES = {
    ClosingSituation.HESITATION: [
        {
            "name": "Die Zukunftsfrage",
            "phrase": "Stell dir vor es ist in 3 Monaten und {problem} ist gelöst. Wie fühlt sich das an?",
            "followup": "Was hindert dich, das jetzt zu starten?",
            "why": "Aktiviert emotionalen Zukunftszustand",
        },
        {
            "name": "Der sanfte Push",
            "phrase": "Darf ich ehrlich sein? 'Überlegen' heißt meistens 'Nein' das sich nicht traut. Ist es ein Nein? Das wäre völlig okay.",
            "followup": None,
            "why": "Nimmt Druck raus, führt zu ehrlicher Antwort",
        },
        {
            "name": "Die Entscheidungs-Hilfe",
            "phrase": "Was würde dir helfen, heute eine Entscheidung zu treffen? Mehr Infos? Mit jemandem sprechen?",
            "followup": None,
            "why": "Zeigt Hindernisse auf, ohne zu pushen",
        },
    ],
    ClosingSituation.PRICE_OBJECTION: [
        {
            "name": "Der Reality Check",
            "phrase": "Wenn Geld keine Rolle spielen würde - würdest du's machen?",
            "followup": "Okay, dann ist es nur eine Frage der Zahlung. Lass uns schauen wie wir das hinbekommen.",
            "why": "Trennt Preis-Einwand von echtem Desinteresse",
        },
        {
            "name": "Die Kosten-Frage",
            "phrase": "Was kostet es dich, NICHTS zu ändern? Nächstes Jahr gleiches Problem, gleiche Frustration...",
            "followup": None,
            "why": "Zeigt versteckte Kosten der Inaktivität",
        },
        {
            "name": "Der Investment Reframe",
            "phrase": "Die Frage ist nicht ob du es dir leisten kannst, sondern ob du es dir leisten kannst, es NICHT zu tun.",
            "followup": None,
            "why": "Reframed Kosten zu Investition",
        },
    ],
    ClosingSituation.TIME_OBJECTION: [
        {
            "name": "Der Ehrlichkeits-Check",
            "phrase": "Verstehe ich total. Darf ich kurz fragen: Ist es wirklich die Zeit, oder ist es was anderes?",
            "followup": None,
            "why": "Deckt versteckte Einwände auf",
        },
        {
            "name": "Die Zeit-Inversion",
            "phrase": "{product} spart dir X Stunden pro Woche. Die 30 Minuten jetzt kriegst du 10x zurück.",
            "followup": None,
            "why": "Zeigt ROI auf Zeit",
        },
    ],
    ClosingSituation.GHOST_RISK: [
        {
            "name": "Die Permission",
            "phrase": "Hey, falls du kein Interesse mehr hast - totally fine! Sag mir einfach Bescheid, dann nerve ich dich nicht weiter.",
            "followup": None,
            "why": "Nimmt Druck, oft kehrt Lead zurück",
        },
        {
            "name": "Der Takeaway",
            "phrase": "Weißt du was - vielleicht ist gerade nicht der richtige Zeitpunkt für dich. Meld dich wenn sich das ändert!",
            "followup": None,
            "why": "Psychologischer Takeaway-Effekt",
        },
    ],
    ClosingSituation.READY_TO_CLOSE: [
        {
            "name": "Die Simple",
            "phrase": "Sollen wir dich einfach mal starten lassen?",
            "followup": None,
            "why": "Einfach und direkt",
        },
        {
            "name": "Die Assumptive",
            "phrase": "Ich richte das jetzt für dich ein. Schickst du mir kurz deine Daten?",
            "followup": None,
            "why": "Setzt Abschluss voraus",
        },
        {
            "name": "Die Choice",
            "phrase": "Willst du mit {option_a} oder {option_b} starten?",
            "followup": None,
            "why": "Nicht OB sondern WIE",
        },
    ],
}


def get_killer_phrases(situation: ClosingSituation) -> List[Dict[str, Any]]:
    """Gibt Killer-Phrases für eine Situation zurück."""
    return KILLER_PHRASES.get(situation, [])


def get_best_killer_phrase(
    situation: ClosingSituation,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Wählt die beste Killer-Phrase basierend auf Kontext."""
    phrases = get_killer_phrases(situation)
    if not phrases:
        return {"name": "Fallback", "phrase": "Was hält dich noch zurück?", "why": "Standard-Frage"}
    
    # Erste ist meist die stärkste
    return phrases[0]


# ═══════════════════════════════════════════════════════════════════════════
# 5. NATURAL SELECTION - Auto Best Practice Distribution
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class OverrideEvent:
    """Ein Override-Event wenn User CHIEF's Vorschlag ändert."""
    original_suggestion: str
    user_override: str
    user_level: str  # starter, practitioner, professional, expert
    outcome: str  # sent, reply_received, converted, no_response
    outcome_quality: str  # positive, neutral, negative
    lead_type: str
    channel: str
    time_to_response: Optional[float] = None  # Stunden


@dataclass
class EmergingBestPractice:
    """Eine neue Best Practice die entdeckt wurde."""
    pattern_type: str
    original_version: str
    new_version: str
    improvement_percent: float
    confidence: float
    discovered_by_level: str
    occurrences: int


CHIEF_NATURAL_SELECTION_PROMPT = """
# CHIEF NATURAL SELECTION - Automatische Best Practice Verteilung

## DEINE ROLLE

Du identifizierst was funktioniert und verbreitest es automatisch.
Wenn ein Top-Performer etwas besser macht als CHIEF's Vorschlag:
→ Lerne davon
→ Mache es zum neuen Standard

## OVERRIDE LEARNING SYSTEM

### Was ist ein Override?
```
CHIEF schlägt vor: "Hey [Name], wie geht's dir?"
User ändert zu: "Yo [Name]! Krasser Post gestern 🔥"
User sendet SEINE Version
Lead antwortet positiv
→ Das ist ein ERFOLGREICHER OVERRIDE
```

### Learning Logic
1. Nur von erfolgreichen Pros lernen (professional/expert)
2. Outcome muss besser sein als CHIEF's Original
3. Pattern muss sich wiederholen (>3x ähnlicher Erfolg)
4. Dann: Als "Emerging Best Practice" markieren

## QUALITÄTS-FILTER

NICHT als Best Practice wenn:
- Einmaliger Erfolg (könnte Zufall sein)
- Von Neuling (noch keine Track Record)
- Verstößt gegen Compliance
- Funktioniert nur bei spezifischem Lead-Typ

## OUTPUT FORMAT FÜR TEAM

```
📈 NEUES LEARNING

Top-Performer [anonym] hat eine bessere Variante gefunden:

ORIGINAL CHIEF:
'{original}'

NEUE BEST PRACTICE:
'{new_version}'

Performance: +{improvement}% Reply-Rate

[Als Standard übernehmen] [Für mich testen] [Ignorieren]
```

## TEAM LEARNING REPORT

```
🌟 TEAM LEARNING REPORT

Diese Woche hat dein Team {count} neue Best Practices entdeckt:

1. {practice_1_name} (von {discoverer_1})
   "{practice_1_description}"
   → +{improvement_1}% {metric_1}
   [Ans Team verteilen]

2. {practice_2_name} (von {discoverer_2})
   "{practice_2_description}"
   → +{improvement_2}% {metric_2}
   [Ans Team verteilen]
```
"""


def evaluate_override(override: OverrideEvent, average_response_time: float = 24.0) -> Dict[str, Any]:
    """
    Bewertet ob ein Override als Learning übernommen werden soll.
    
    Args:
        override: Das Override-Event
        average_response_time: Durchschnittliche Response-Zeit in Stunden
        
    Returns:
        Dict mit action (learn, ignore) und Details
    """
    # Nur von erfolgreichen Pros lernen
    if override.user_level not in ["professional", "expert"]:
        return {"action": "ignore", "reason": "User ist noch kein Pro/Expert"}
    
    if override.outcome_quality != "positive":
        return {"action": "ignore", "reason": "Outcome war nicht positiv"}
    
    # Vergleiche mit Original
    if override.time_to_response and override.time_to_response < average_response_time:
        return {
            "action": "learn",
            "confidence": 0.7 if override.user_level == "professional" else 0.85,
            "distribute_to": ["practitioner", "starter"],
            "reason": "Bessere Response-Zeit als Durchschnitt",
        }
    
    return {"action": "observe", "reason": "Noch nicht genug Daten"}


def identify_emerging_best_practices(
    overrides: List[OverrideEvent],
    min_occurrences: int = 3,
) -> List[EmergingBestPractice]:
    """
    Identifiziert neue Best Practices aus Override-Daten.
    
    Args:
        overrides: Liste von Override-Events
        min_occurrences: Mindestanzahl ähnlicher Erfolge
        
    Returns:
        Liste von Emerging Best Practices
    """
    # Gruppiere nach Pattern
    patterns = {}
    for override in overrides:
        if override.outcome_quality == "positive" and override.user_level in ["professional", "expert"]:
            # Einfache Pattern-Erkennung (könnte mit ML verbessert werden)
            pattern_key = f"{override.lead_type}_{override.channel}"
            if pattern_key not in patterns:
                patterns[pattern_key] = []
            patterns[pattern_key].append(override)
    
    # Filter nach min_occurrences
    best_practices = []
    for pattern_key, pattern_overrides in patterns.items():
        if len(pattern_overrides) >= min_occurrences:
            best_practices.append(EmergingBestPractice(
                pattern_type=pattern_key,
                original_version=pattern_overrides[0].original_suggestion,
                new_version=pattern_overrides[0].user_override,
                improvement_percent=25.0,  # Placeholder, würde berechnet
                confidence=min(0.95, 0.5 + (len(pattern_overrides) * 0.1)),
                discovered_by_level=pattern_overrides[0].user_level,
                occurrences=len(pattern_overrides),
            ))
    
    return best_practices


# ═══════════════════════════════════════════════════════════════════════════
# 6. PERSONALITY MATCHING - DISG-basierte Kommunikation
# ═══════════════════════════════════════════════════════════════════════════

class DISGType(str, Enum):
    """Die 4 DISG-Typen."""
    D = "dominant"     # 🔴 Dominant
    I = "initiativ"    # 🟡 Initiativ
    S = "stetig"       # 🟢 Stetig
    G = "gewissenhaft" # 🔵 Gewissenhaft


@dataclass
class PersonalityProfile:
    """Erkanntes Persönlichkeitsprofil eines Leads."""
    primary_type: DISGType
    confidence: float
    signals: List[str]
    communication_tips: Dict[str, str]


CHIEF_PERSONALITY_MATCHING_PROMPT = """
# CHIEF PERSONALITY MATCHING - DISG-basierte Kommunikation

## DEINE ROLLE

Du erkennst den Kommunikationsstil des Leads und passt die Antworten an.
Nicht jeder reagiert gleich auf gleiche Botschaften.

## DISG MODELL

### 🔴 D-TYP (Dominant)

ERKENNUNG:
- Kurze, direkte Nachrichten
- Will Fakten, keinen Smalltalk
- Ungeduldig, entscheidet schnell
- Fragt "Was bringt's mir?"

ANPASSUNG:
✓ Kurz und direkt sein
✓ Bullet Points statt Fließtext
✓ Ergebnisse betonen, nicht Prozess
✓ Zeit respektieren
✗ Kein Smalltalk
✗ Nicht zu viele Details

OPTIMALE ANTWORT-LÄNGE: 2-4 Sätze
EMOJIS: Minimal bis keine
TON: Business, direkt

### 🟡 I-TYP (Initiativ)

ERKENNUNG:
- Enthusiastische Nachrichten
- Viele Emojis
- Teilt persönliche Stories
- Entscheidet emotional

ANPASSUNG:
✓ Enthusiasmus matchen
✓ Persönlich werden
✓ Storytelling nutzen
✓ Emojis okay
✗ Nicht zu sachlich/trocken
✗ Nicht zu viele Zahlen

OPTIMALE ANTWORT-LÄNGE: Flexibel, persönlich
EMOJIS: Ja, angemessen
TON: Freundlich, begeistert

### 🟢 S-TYP (Stetig)

ERKENNUNG:
- Höflich, zurückhaltend
- Stellt viele Fragen
- Braucht Zeit für Entscheidungen
- Fragt nach Erfahrungen anderer

ANPASSUNG:
✓ Geduldig sein
✓ Sicherheit geben
✓ Testimonials, Garantien
✓ Kein Druck
✗ Nicht pushen
✗ Keine Urgency-Tricks

OPTIMALE ANTWORT-LÄNGE: Ausführlich genug für Sicherheit
EMOJIS: Freundliche
TON: Warm, geduldig, beruhigend

### 🔵 G-TYP (Gewissenhaft)

ERKENNUNG:
- Detaillierte Fragen
- Will Zahlen und Fakten
- Recherchiert selbst
- Skeptisch aber fair

ANPASSUNG:
✓ Fakten und Zahlen liefern
✓ Quellen nennen
✓ Detailliert erklären
✓ Logisch argumentieren
✗ Nicht zu emotional
✗ Keine vagen Aussagen

OPTIMALE ANTWORT-LÄNGE: So lang wie nötig
EMOJIS: Minimal
TON: Sachlich, professionell

## OUTPUT FORMAT

```
🎭 LEAD PERSÖNLICHKEITS-ANALYSE

Lead: {name}
Erkannter Typ: {emoji} {type_name} ({type_label})
Confidence: {confidence}%

SIGNALE:
{signals}

DEINE ANPASSUNG:
{adaptation_tips}

VORSCHLAG ({type_name}-optimiert):
"{optimized_message}"
```
"""


DISG_PROFILES = {
    DISGType.D: {
        "emoji": "🔴",
        "name": "D-TYP",
        "label": "Dominant",
        "signals": [
            "Kurze Nachrichten",
            "Keine Emojis",
            "Direkte Fragen",
            "Schnelle Antworten",
        ],
        "dos": ["Kurz und direkt", "Bullet Points", "Ergebnisse betonen", "Zeit respektieren"],
        "donts": ["Smalltalk", "Zu viele Details", "Emotional argumentieren"],
        "message_length": "2-4 Sätze",
        "emoji_policy": "minimal",
        "tone": "Business, direkt",
    },
    DISGType.I: {
        "emoji": "🟡",
        "name": "I-TYP",
        "label": "Initiativ",
        "signals": [
            "Enthusiastische Nachrichten",
            "Viele Emojis",
            "Persönliche Stories",
            "Emotionale Sprache",
        ],
        "dos": ["Enthusiasmus matchen", "Persönlich werden", "Storytelling", "Emojis nutzen"],
        "donts": ["Zu sachlich", "Zu viele Zahlen", "Trocken sein"],
        "message_length": "Flexibel, persönlich",
        "emoji_policy": "ja, angemessen",
        "tone": "Freundlich, begeistert",
    },
    DISGType.S: {
        "emoji": "🟢",
        "name": "S-TYP",
        "label": "Stetig",
        "signals": [
            "Höfliche Nachrichten",
            "Viele Fragen",
            "Zurückhaltend",
            "Fragt nach Erfahrungen anderer",
        ],
        "dos": ["Geduldig sein", "Sicherheit geben", "Testimonials zeigen", "Kein Druck"],
        "donts": ["Pushen", "Urgency-Tricks", "Ungeduldig werden"],
        "message_length": "Ausführlich genug",
        "emoji_policy": "freundliche",
        "tone": "Warm, geduldig",
    },
    DISGType.G: {
        "emoji": "🔵",
        "name": "G-TYP",
        "label": "Gewissenhaft",
        "signals": [
            "Detaillierte Fragen",
            "Fokus auf Zahlen/Fakten",
            "Skeptisch",
            "Recherchiert selbst",
        ],
        "dos": ["Fakten liefern", "Quellen nennen", "Detailliert erklären", "Logisch argumentieren"],
        "donts": ["Zu emotional", "Vage Aussagen", "Übertreibungen"],
        "message_length": "So lang wie nötig",
        "emoji_policy": "minimal",
        "tone": "Sachlich, professionell",
    },
}


def detect_personality_type(
    messages: List[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> PersonalityProfile:
    """
    Analysiert Nachrichten und erkennt den DISG-Typ.
    
    Args:
        messages: Liste der Nachrichten des Leads
        metadata: Zusätzliche Metadaten (Response-Zeit, etc.)
        
    Returns:
        PersonalityProfile mit erkanntem Typ und Tipps
    """
    if not messages:
        return PersonalityProfile(
            primary_type=DISGType.S,  # Default: Stetig (sicherster Ansatz)
            confidence=0.3,
            signals=["Nicht genug Daten"],
            communication_tips=DISG_PROFILES[DISGType.S],
        )
    
    # Signale sammeln
    combined_text = " ".join(messages).lower()
    avg_length = sum(len(m) for m in messages) / len(messages)
    emoji_count = sum(1 for c in combined_text if c in "😊🔥💪❤️👍✨🎉😍🙌")
    question_count = combined_text.count("?")
    
    scores = {
        DISGType.D: 0,
        DISGType.I: 0,
        DISGType.S: 0,
        DISGType.G: 0,
    }
    detected_signals = []
    
    # D-Typ Signale
    if avg_length < 50:
        scores[DISGType.D] += 2
        detected_signals.append("Kurze Nachrichten (Ø {:.0f} Zeichen)".format(avg_length))
    if emoji_count == 0:
        scores[DISGType.D] += 1
        detected_signals.append("Keine Emojis")
    
    # I-Typ Signale
    if emoji_count > 2:
        scores[DISGType.I] += 2
        detected_signals.append(f"{emoji_count} Emojis verwendet")
    if any(word in combined_text for word in ["super", "cool", "wow", "mega", "krass", "geil"]):
        scores[DISGType.I] += 1
        detected_signals.append("Enthusiastische Sprache")
    
    # S-Typ Signale
    if question_count > 3:
        scores[DISGType.S] += 1
        detected_signals.append(f"{question_count} Fragen gestellt")
    if any(word in combined_text for word in ["andere", "erfahrung", "meinst du", "sicher"]):
        scores[DISGType.S] += 2
        detected_signals.append("Fragt nach Erfahrungen anderer")
    
    # G-Typ Signale
    if any(word in combined_text for word in ["genau", "detail", "prozent", "studie", "zahlen", "fakten"]):
        scores[DISGType.G] += 2
        detected_signals.append("Fokus auf Details/Fakten")
    if avg_length > 150:
        scores[DISGType.G] += 1
        detected_signals.append("Ausführliche Nachrichten")
    
    # Typ mit höchstem Score
    max_score = max(scores.values())
    primary_type = max(scores.keys(), key=lambda k: scores[k])
    confidence = min(0.95, 0.4 + (max_score * 0.15))
    
    return PersonalityProfile(
        primary_type=primary_type,
        confidence=confidence,
        signals=detected_signals[:4],  # Max 4 Signale
        communication_tips=DISG_PROFILES[primary_type],
    )


def adapt_message_to_personality(
    message: str,
    personality: PersonalityProfile,
) -> str:
    """
    Passt eine Nachricht an den erkannten Persönlichkeitstyp an.
    
    Args:
        message: Die ursprüngliche Nachricht
        personality: Das erkannte Persönlichkeitsprofil
        
    Returns:
        Angepasste Nachricht
    """
    tips = personality.communication_tips
    
    # Basis-Anpassungen
    adapted = message
    
    if personality.primary_type == DISGType.D:
        # Kürzen, direkt machen
        sentences = adapted.split(". ")
        if len(sentences) > 3:
            adapted = ". ".join(sentences[:3]) + "."
    
    elif personality.primary_type == DISGType.I:
        # Enthusiastischer machen
        if not any(e in adapted for e in ["!", "🔥", "💪", "✨"]):
            adapted = adapted.rstrip(".") + "! 🔥"
    
    elif personality.primary_type == DISGType.S:
        # Sicherheit hinzufügen
        if "garantie" not in adapted.lower() and "sicher" not in adapted.lower():
            adapted += " Keine Sorge, das geht Schritt für Schritt."
    
    elif personality.primary_type == DISGType.G:
        # Sachlicher machen, Emojis entfernen
        import re
        adapted = re.sub(r'[😊🔥💪❤️👍✨🎉😍🙌]', '', adapted)
    
    return adapted


# ═══════════════════════════════════════════════════════════════════════════
# 7. INDUSTRY MODULE - Erweitert mit Dynamic Loading
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class IndustryModule:
    """Ein vollständiges Branchen-Modul."""
    id: str
    display_name: str
    common_objections: List[Dict[str, Any]]
    compliance_rules: Dict[str, Any]
    customer_pain_points: List[str]
    testimonial_templates: List[str]
    knowledge_base: Dict[str, Any]


CHIEF_INDUSTRY_MODULE_PROMPT = """
# CHIEF INDUSTRY MODULES - Verticals as Variables

## ARCHITEKTUR

Das System ist so gebaut, dass "Health" nur eine Variable ist.
Morgen kann es "Real Estate", "SaaS" oder "Insurance" sein.

## AKTIVES MODUL: {industry_name}

### Typische Einwände
{common_objections}

### Compliance-Regeln
{compliance_rules}

### Kunden Pain Points
{pain_points}

### Erfolgs-Story Templates
{testimonial_templates}

## ANWENDUNG

1. Passe deine Sprache an die Branche an
2. Nutze branchenspezifische Beispiele
3. Beachte die Compliance-Regeln strikt
4. Erkenne die Buyer Persona und passe dich an
"""


INDUSTRY_MODULES = {
    "health_wellness": IndustryModule(
        id="health_wellness",
        display_name="Health & Wellness",
        common_objections=[
            {"objection": "Wirkt das wirklich?", "category": "skepticism"},
            {"objection": "Brauche ich nicht", "category": "no_need"},
            {"objection": "Ist das sicher?", "category": "safety"},
            {"objection": "Zu teuer für Nahrungsergänzung", "category": "price"},
        ],
        compliance_rules={
            "forbidden": ["heilt", "kuriert", "garantiert", "wissenschaftlich bewiesen"],
            "required_disclaimers": ["Dies ist keine medizinische Beratung."],
            "allowed_claims": "Nur EFSA-zugelassene Health Claims",
        },
        customer_pain_points=[
            "Energie/Müdigkeit",
            "Gewicht",
            "Schlaf",
            "Stress",
            "Immunsystem",
        ],
        testimonial_templates=[
            "Früher hatte ich {pain_point}, jetzt {result} nach {timeframe}.",
            "Ich war skeptisch, aber nach {timeframe} merkte ich {result}.",
        ],
        knowledge_base={
            "key_facts": ["Omega-3 Index", "Entzündungsmarker", "Bioverfügbarkeit"],
            "studies": ["REDUCE-IT", "VITAL", "UK Biobank"],
        },
    ),
    "real_estate": IndustryModule(
        id="real_estate",
        display_name="Immobilien",
        common_objections=[
            {"objection": "Die Provision ist zu hoch", "category": "price"},
            {"objection": "Ich verkaufe lieber privat", "category": "diy"},
            {"objection": "Der Preis ist unrealistisch", "category": "valuation"},
        ],
        compliance_rules={
            "forbidden": ["garantierter Verkauf", "sicherer Wertzuwachs"],
            "required_disclaimers": ["Preise können variieren."],
            "allowed_claims": "Nur belegbare Marktdaten",
        },
        customer_pain_points=[
            "Zeitdruck beim Verkauf",
            "Sorge um faire Bewertung",
            "Finanzierungsunsicherheit",
            "Rechtliche Komplexität",
        ],
        testimonial_templates=[
            "Verkauf in {timeframe} über Angebotspreis.",
            "Ohne Makler hätte ich {amount} weniger bekommen.",
        ],
        knowledge_base={
            "key_facts": ["Marktpreise", "Verhandlungsstrategie", "Rechtliches"],
        },
    ),
    "finance": IndustryModule(
        id="finance",
        display_name="Finanzdienstleistungen",
        common_objections=[
            {"objection": "Das Risiko ist mir zu hoch", "category": "risk"},
            {"objection": "Ich vertraue keinem Berater", "category": "trust"},
            {"objection": "Die Kosten sind zu hoch", "category": "fees"},
        ],
        compliance_rules={
            "forbidden": ["garantierte Rendite", "risikolos", "sicher X% pro Jahr"],
            "required_disclaimers": ["Kapitalanlagen bergen Risiken.", "Keine Anlageberatung."],
            "allowed_claims": "Historische Performance mit Disclaimer",
        },
        customer_pain_points=[
            "Altersvorsorge-Sorgen",
            "Vermögensaufbau",
            "Inflation",
            "Steuerlast",
        ],
        testimonial_templates=[
            "Nach {timeframe} konnte ich {result} erreichen.",
        ],
        knowledge_base={
            "key_facts": ["Rendite/Risiko", "Diversifikation", "Kosten"],
        },
    ),
}


def load_industry_module(industry_id: str) -> IndustryModule:
    """Lädt ein Industry Module."""
    return INDUSTRY_MODULES.get(industry_id, INDUSTRY_MODULES.get("health_wellness"))


def build_industry_module_prompt(industry_id: str) -> str:
    """Baut den Industry-Prompt."""
    module = load_industry_module(industry_id)
    
    objections = "\n".join([f"• \"{o['objection']}\" ({o['category']})" for o in module.common_objections])
    rules = f"Verboten: {', '.join(module.compliance_rules.get('forbidden', []))}"
    pain_points = "\n".join([f"• {p}" for p in module.customer_pain_points])
    templates = "\n".join([f"• {t}" for t in module.testimonial_templates])
    
    return CHIEF_INDUSTRY_MODULE_PROMPT.format(
        industry_name=module.display_name.upper(),
        common_objections=objections,
        compliance_rules=rules,
        pain_points=pain_points,
        testimonial_templates=templates,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 8. DEAL MEDIC - Post-Mortem Analyse
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DealEvent:
    """Ein Event in der Deal-Timeline."""
    day: int
    action: str
    result: str
    status: str  # success, warning, error
    recommendation: Optional[str] = None


@dataclass
class DealPostMortem:
    """Post-Mortem Analyse eines verlorenen Deals."""
    lead_name: str
    timeline: List[DealEvent]
    death_cause: str
    critical_errors: List[Dict[str, str]]
    patterns: List[str]
    learnings: List[str]


CHIEF_DEAL_MEDIC_PROMPT = """
# CHIEF DEAL MEDIC - Automatische Deal-Analyse

## DEINE ROLLE

Du analysierst WARUM Deals gestorben sind und gibst konkretes Feedback.
Nicht "du hättest besser sein sollen" sondern "an DIESER Stelle ist es schiefgegangen".

## TRIGGER

Deal Medic aktiviert wenn:
- Lead Status → "lost" gesetzt wird
- Längere Konversation (>5 Messages) ohne Abschluss
- User requested Analyse

## ANALYSE OUTPUT FORMAT

### Quick Analysis (nach jedem Lost Deal)

```
💔 DEAL ANALYSE: {lead_name}

TODESURSACHE: {death_cause}

WAS PASSIERT IST:
{what_happened}

WAS DU HÄTTEST TUN KÖNNEN:
"{suggested_alternative}"

LEARNING:
{learning}

[Verstanden] [Mehr Details]
```

### Deep Analysis (auf Anfrage)

```
📊 DEAL TIMELINE: {lead_name}

Tag 1: {event_1}
├── {status_1} {action_1}

Tag 2: {event_2}
├── {status_2} {action_2}
├── ⚠️ {warning}

Tag 3: {event_3}
├── ❌ {error}
└── {consequence}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 KRITISCHE FEHLER ERKANNT:

1. {error_1_name} (Tag {error_1_day})
   Du: "{error_1_what_you_said}"
   Problem: {error_1_problem}
   Besser: "{error_1_better}"
   
2. {error_2_name} (Tag {error_2_day})
   Lead: "{error_2_what_lead_said}"
   Du: "{error_2_what_you_said}"
   Problem: {error_2_problem}
   Besser: "{error_2_better}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 DEINE PATTERNS (letzte 10 verlorene Deals):

HÄUFIGSTER FEHLER:
"{most_common_error}" - {error_count} von 10 Deals

Das bedeutet: 
{pattern_explanation}

EMPFEHLUNG:
{recommendation}
```

## PROAKTIVE INTERVENTION

Bevor der Deal stirbt:

```
⚠️ DEAL IN GEFAHR

{lead_name} hat {warning_count} Warnsignale:
{warnings}

INTERVENTION JETZT:
Sende: "{intervention_message}"

[Jetzt senden] [Andere Option]
```
"""


def analyze_lost_deal(
    lead_name: str,
    conversation_history: List[Dict[str, Any]],
    lead_metadata: Optional[Dict[str, Any]] = None,
) -> DealPostMortem:
    """
    Analysiert einen verlorenen Deal und erstellt Post-Mortem.
    
    Args:
        lead_name: Name des Leads
        conversation_history: Gesprächsverlauf
        lead_metadata: Zusätzliche Lead-Infos
        
    Returns:
        DealPostMortem mit Analyse und Learnings
    """
    timeline = []
    critical_errors = []
    patterns = []
    
    # Analysiere Conversation
    for i, msg in enumerate(conversation_history):
        day = msg.get("day", i + 1)
        
        # Check für typische Fehler
        if msg.get("type") == "user" and "preis" in msg.get("content", "").lower():
            if i > 0 and not any("interesse" in m.get("content", "").lower() for m in conversation_history[:i]):
                critical_errors.append({
                    "name": "ZU FRÜHER PITCH",
                    "day": day,
                    "what_you_said": msg.get("content", "")[:100],
                    "problem": "Lead hat noch nicht gesagt dass er das WILL",
                    "better": "Was würde sich ändern wenn du [Problem] gelöst hättest?",
                })
    
    # Check für Ghost ohne Re-Engagement
    last_response_idx = -1
    for i, msg in enumerate(conversation_history):
        if msg.get("type") == "lead":
            last_response_idx = i
    
    if last_response_idx >= 0 and last_response_idx < len(conversation_history) - 3:
        critical_errors.append({
            "name": "GHOST NICHT REAKTIVIERT",
            "day": len(conversation_history),
            "what_you_said": "[nichts]",
            "problem": "Lead antwortet nicht mehr, kein Re-Engagement",
            "better": "Ghost-Buster nach 48h senden",
        })
    
    # Häufigste Patterns
    if len([e for e in critical_errors if "PITCH" in e["name"]]) > 0:
        patterns.append("Zu früher Pitch - pitchst bevor Lead Bedarf bestätigt hat")
    
    # Todesursache
    death_cause = "Unbekannt"
    if critical_errors:
        death_cause = critical_errors[0]["name"]
    
    return DealPostMortem(
        lead_name=lead_name,
        timeline=timeline,
        death_cause=death_cause,
        critical_errors=critical_errors,
        patterns=patterns,
        learnings=[
            "Vor JEDEM Pitch sicherstellen: Lead hat Problem genannt, will es lösen, ist offen für Hilfe.",
            "Bei Ghost nach 48h Re-Engagement senden.",
        ],
    )


def detect_deal_at_risk(
    lead_id: str,
    conversation_history: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Erkennt ob ein Deal in Gefahr ist.
    
    Returns:
        Dict mit warnings und intervention_message, oder None
    """
    warnings = []
    
    # Check: Antworten werden kürzer
    if len(conversation_history) >= 3:
        lead_messages = [m for m in conversation_history if m.get("type") == "lead"]
        if len(lead_messages) >= 2:
            last_length = len(lead_messages[-1].get("content", ""))
            prev_length = len(lead_messages[-2].get("content", ""))
            if last_length < prev_length * 0.5:
                warnings.append("Antworten werden kürzer")
    
    # Check: "muss überlegen" gesagt
    for msg in conversation_history[-3:]:
        if msg.get("type") == "lead" and "überlegen" in msg.get("content", "").lower():
            warnings.append("Hat 'muss überlegen' gesagt")
    
    if warnings:
        return {
            "warnings": warnings,
            "intervention_message": "Hey, ich merk du bist noch unsicher. Was würde dir helfen, eine Entscheidung zu treffen?",
        }
    
    return None


# ═══════════════════════════════════════════════════════════════════════════
# EXPORTS & BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_v31_context(
    company_mode: Optional[CompanyMode] = None,
    compliance_rules: Optional[ComplianceRules] = None,
    brand_voice: Optional[BrandVoice] = None,
    user_goal: Optional[UserGoal] = None,
    industry_id: Optional[str] = None,
    personality: Optional[PersonalityProfile] = None,
) -> str:
    """
    Baut den kompletten V3.1 Kontext-Prompt.
    
    Args:
        company_mode: Aktiver Company Mode
        compliance_rules: Compliance-Regeln der Firma
        brand_voice: Brand Voice Guidelines
        user_goal: Umsatz-Ziele des Users
        industry_id: Branchen-ID
        personality: Erkannte Persönlichkeit des aktuellen Leads
        
    Returns:
        Vollständiger V3.1 Kontext-Prompt
    """
    parts = []
    
    # 1. Enterprise Mode
    if company_mode and company_mode != CompanyMode.SOLO:
        parts.append(build_enterprise_prompt(company_mode, compliance_rules, brand_voice))
    
    # 2. Revenue Engineer
    if user_goal:
        targets = calculate_daily_targets(user_goal)
        parts.append(CHIEF_REVENUE_ENGINEER_PROMPT.format(
            goal_analysis=build_goal_analysis(user_goal, targets),
            day="{day}",
            total_days="{total_days}",
            current="{current}",
            target="{target}",
            percent="{percent}",
            on_track_status="{on_track_status}",
            daily_deals="{daily_deals}",
            task_1="{task_1}",
            task_2="{task_2}",
            task_3="{task_3}",
            task_4="{task_4}",
            progress_list="{progress_list}",
            behind_percent="{behind_percent}",
            ahead_behind="{ahead_behind}",
            hours="{hours}",
            completed_list="{completed_list}",
            missed_list="{missed_list}",
            today_revenue="{today_revenue}",
            daily_target="{daily_target}",
            new_total="{new_total}",
            monthly_target="{monthly_target}",
            track_percent="{track_percent}",
            track_emoji="{track_emoji}",
            tomorrow_priorities="{tomorrow_priorities}",
        ))
    
    # 3. Signal Detector & Closer Library sind immer aktiv
    parts.append(CHIEF_SIGNAL_DETECTOR_PROMPT)
    parts.append(CHIEF_CLOSER_LIBRARY_PROMPT)
    
    # 4. Industry Module
    if industry_id:
        parts.append(build_industry_module_prompt(industry_id))
    
    # 5. Personality Matching
    if personality:
        profile = DISG_PROFILES[personality.primary_type]
        parts.append(f"""
## AKTIVER LEAD: {profile['emoji']} {profile['name']} ({profile['label']})

KOMMUNIKATIONS-TIPPS:
✓ {', '.join(profile['dos'][:3])}
✗ {', '.join(profile['donts'][:2])}

ANTWORT-STIL: {profile['message_length']}, Ton: {profile['tone']}
""")
    
    return "\n\n---\n\n".join(parts) if parts else ""


__all__ = [
    # Enums
    "CompanyMode",
    "ObjectionType",
    "ClosingSituation",
    "DISGType",
    
    # Dataclasses
    "ComplianceRules",
    "BrandVoice",
    "UserGoal",
    "DailyTargets",
    "ObjectionAnalysis",
    "OverrideEvent",
    "EmergingBestPractice",
    "PersonalityProfile",
    "IndustryModule",
    "DealEvent",
    "DealPostMortem",
    
    # Prompts
    "CHIEF_ENTERPRISE_PROMPT",
    "CHIEF_REVENUE_ENGINEER_PROMPT",
    "CHIEF_SIGNAL_DETECTOR_PROMPT",
    "CHIEF_CLOSER_LIBRARY_PROMPT",
    "CHIEF_NATURAL_SELECTION_PROMPT",
    "CHIEF_PERSONALITY_MATCHING_PROMPT",
    "CHIEF_INDUSTRY_MODULE_PROMPT",
    "CHIEF_DEAL_MEDIC_PROMPT",
    
    # Static Data
    "KILLER_PHRASES",
    "DISG_PROFILES",
    "INDUSTRY_MODULES",
    
    # Functions - Enterprise
    "check_compliance",
    "build_enterprise_prompt",
    
    # Functions - Revenue Engineer
    "calculate_daily_targets",
    "build_goal_analysis",
    
    # Functions - Signal Detector
    "analyze_objection",
    
    # Functions - Closer Library
    "get_killer_phrases",
    "get_best_killer_phrase",
    
    # Functions - Natural Selection
    "evaluate_override",
    "identify_emerging_best_practices",
    
    # Functions - Personality Matching
    "detect_personality_type",
    "adapt_message_to_personality",
    
    # Functions - Industry Module
    "load_industry_module",
    "build_industry_module_prompt",
    
    # Functions - Deal Medic
    "analyze_lost_deal",
    "detect_deal_at_risk",
    
    # Builder
    "build_v31_context",
]

