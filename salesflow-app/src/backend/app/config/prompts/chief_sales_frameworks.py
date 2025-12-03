"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF SALES FRAMEWORKS MODULE v3.0                                        ║
║  Bewährte Verkaufsmethodiken intelligent anwenden                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul integriert:
- SPIN Selling (für komplexe B2B)
- Challenger Sale (für Transformation)
- GAP Selling (für B2B SaaS)
- Sandler (für hartnäckige Leads)
- SNAP Selling (für Vielbeschäftigte)
- MEDDIC (für Enterprise)
- Solution Selling (für Problem-Solution Fit)
"""

from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass

# =============================================================================
# FRAMEWORK DEFINITIONS
# =============================================================================

FrameworkType = Literal[
    "spin", "challenger", "gap", "sandler", 
    "snap", "meddic", "solution", "consultative"
]


@dataclass
class SalesFramework:
    """Definition eines Verkaufsframeworks"""
    id: str
    name: str
    best_for: List[str]
    core_principle: str
    stages: List[Dict[str, str]]
    key_questions: List[str]
    common_mistakes: List[str]


# =============================================================================
# FRAMEWORK DATABASE
# =============================================================================

SALES_FRAMEWORKS: Dict[str, SalesFramework] = {
    "spin": SalesFramework(
        id="spin",
        name="SPIN Selling",
        best_for=["B2B", "Komplexe Produkte", "Lange Sales Cycles", "Multiple Stakeholder"],
        core_principle="Durch Fragen den Kunden selbst zum Problem und zur Lösung führen",
        stages=[
            {
                "name": "S - Situation",
                "goal": "Aktuelle Lage verstehen",
                "description": "Fakten und Kontext sammeln ohne zu urteilen",
                "example_questions": [
                    "Wie läuft aktuell euer Follow-up Prozess?",
                    "Welche Tools nutzt ihr dafür?",
                    "Wie viele Leads bearbeitet ihr pro Woche?",
                ],
            },
            {
                "name": "P - Problem",
                "goal": "Schmerz aufdecken",
                "description": "Probleme und Herausforderungen identifizieren",
                "example_questions": [
                    "Wo verliert ihr die meisten Leads?",
                    "Was frustriert dich am meisten dabei?",
                    "Wie oft passiert es, dass Follow-ups vergessen werden?",
                ],
            },
            {
                "name": "I - Implication",
                "goal": "Konsequenzen aufzeigen",
                "description": "Die Auswirkungen des Problems verstärken",
                "example_questions": [
                    "Was bedeutet das für eure Conversion Rate?",
                    "Wie viel Umsatz geht dadurch verloren?",
                    "Wie wirkt sich das auf die Team-Motivation aus?",
                ],
            },
            {
                "name": "N - Need-Payoff",
                "goal": "Lösung verknüpfen",
                "description": "Den Wert der Lösung vom Kunden selbst formulieren lassen",
                "example_questions": [
                    "Wie würde es helfen, wenn kein Follow-up mehr vergessen wird?",
                    "Was würde es bedeuten, 30% mehr Leads zu konvertieren?",
                    "Wie wichtig wäre es, das zu lösen?",
                ],
            },
        ],
        key_questions=[
            "Erzähl mir mehr über eure aktuelle Situation...",
            "Welche Herausforderungen seht ihr dabei?",
            "Was passiert, wenn das so weitergeht?",
            "Wie würde die ideale Lösung aussehen?",
        ],
        common_mistakes=[
            "Zu früh pitchen, bevor Problem klar ist",
            "Zu viele Situation-Fragen (langweilig)",
            "Implication-Phase überspringen",
            "Lösung vorgeben statt herausarbeiten",
        ],
    ),
    
    "challenger": SalesFramework(
        id="challenger",
        name="Challenger Sale",
        best_for=["B2B", "Transformation", "Commoditized Markets", "Status Quo brechen"],
        core_principle="Den Kunden herausfordern und neue Perspektiven bieten",
        stages=[
            {
                "name": "Teach",
                "goal": "Neue Einsichten liefern",
                "description": "Dem Kunden etwas Neues über sein Business beibringen",
                "example_approach": "Wusstest du, dass 67% der Leads durch mangelhaftes Follow-up verloren gehen? Die meisten denken, es liegt an der Lead-Qualität, aber die Daten zeigen etwas anderes...",
            },
            {
                "name": "Tailor",
                "goal": "Auf Situation anpassen",
                "description": "Die Insights auf die spezifische Situation des Kunden zuschneiden",
                "example_approach": "Bei einem Team eurer Größe bedeutet das vermutlich [X] verlorene Deals pro Monat, also etwa [Y] € Umsatzverlust.",
            },
            {
                "name": "Take Control",
                "goal": "Prozess führen",
                "description": "Selbstbewusst durch den Kaufprozess führen",
                "example_approach": "Basierend auf dem, was ich gesehen habe, empfehle ich: Wir starten mit [A], dann [B]. Passt das für dich?",
            },
        ],
        key_questions=[
            "Was wäre, wenn alles was du über [Thema] glaubst, falsch ist?",
            "Hast du dir schon mal überlegt, warum [Überraschende Statistik]?",
            "Die meisten in deiner Position denken [X], aber die Daten zeigen [Y].",
        ],
        common_mistakes=[
            "Zu aggressiv herausfordern (Beziehung beschädigen)",
            "Insights ohne Relevanz für den Kunden",
            "Zu früh Take Control (erst Credibility aufbauen)",
            "Nicht genug Daten/Beweise für Insights",
        ],
    ),
    
    "gap": SalesFramework(
        id="gap",
        name="GAP Selling",
        best_for=["B2B SaaS", "Tech Sales", "Problem-Solution Fit", "Consultative Selling"],
        core_principle="Die Lücke zwischen IST und SOLL klar machen",
        stages=[
            {
                "name": "Current State",
                "goal": "Wo steht der Kunde?",
                "description": "Detailliertes Verständnis der aktuellen Situation",
                "questions": [
                    "Wie läuft das heute?",
                    "Welche Ergebnisse erzielt ihr aktuell?",
                    "Womit seid ihr unzufrieden?",
                ],
            },
            {
                "name": "Future State",
                "goal": "Wo will der Kunde hin?",
                "description": "Idealbild und Ziele verstehen",
                "questions": [
                    "Wie sollte es idealerweise laufen?",
                    "Was wäre ein Game-Changer für euch?",
                    "Welche Ziele habt ihr für Q4?",
                ],
            },
            {
                "name": "Gap",
                "goal": "Lücke quantifizieren",
                "description": "Den Abstand zwischen IST und SOLL deutlich machen",
                "questions": [
                    "Was fehlt, um dahin zu kommen?",
                    "Was kostet euch diese Lücke jeden Monat?",
                    "Wie lange versucht ihr schon, das zu lösen?",
                ],
            },
        ],
        key_questions=[
            "Wenn du den aktuellen Zustand mit 1-10 bewerten müsstest?",
            "Was würde eine 10 für euch bedeuten?",
            "Was hält euch davon ab, dahin zu kommen?",
        ],
        common_mistakes=[
            "Zu schnell zur Lösung springen",
            "Gap nicht quantifizieren (in € oder Zeit)",
            "Future State nicht konkret genug",
            "Nur Features zeigen, nicht den Gap schließen",
        ],
    ),
    
    "sandler": SalesFramework(
        id="sandler",
        name="Sandler Selling System",
        best_for=["Hartnäckige Leads", "Think-It-Over", "Preis-Einwände", "Langzyklus"],
        core_principle="Gleichberechtigte Beziehung, keine Verkäufer-Käufer-Dynamik",
        stages=[
            {
                "name": "Bonding & Rapport",
                "goal": "Beziehung auf Augenhöhe",
                "description": "Vertrauen aufbauen, nicht als Verkäufer wahrgenommen werden",
            },
            {
                "name": "Up-Front Contract",
                "goal": "Klare Erwartungen setzen",
                "description": "Zu Beginn klären: Was passiert heute, was danach?",
                "example": "Ist es ok wenn ich dir ein paar Fragen stelle, und am Ende sagen wir beide ehrlich ob es passt oder nicht?",
            },
            {
                "name": "Pain",
                "goal": "Tief ins Problem gehen",
                "description": "Den emotionalen und geschäftlichen Schmerz verstehen",
                "pain_funnel": [
                    "Erzähl mir mehr darüber...",
                    "Wie lange geht das schon so?",
                    "Was habt ihr dagegen unternommen?",
                    "Warum hat das nicht funktioniert?",
                    "Was kostet euch das?",
                    "Wie fühlt sich das an?",
                ],
            },
            {
                "name": "Budget",
                "goal": "Früh klären",
                "description": "Budget-Diskussion nicht am Ende, sondern früh im Prozess",
                "example": "Bevor wir weitermachen: Wenn das die Lösung ist, habt ihr Budget dafür eingeplant?",
            },
            {
                "name": "Decision",
                "goal": "Entscheidungsprozess verstehen",
                "description": "Wer entscheidet? Wie? Bis wann?",
            },
        ],
        key_questions=[
            "Wenn ich dir zeige dass wir helfen können, was passiert dann?",
            "Wer außer dir ist an der Entscheidung beteiligt?",
            "Lass mich direkt fragen: Habt ihr Budget dafür?",
            "Was müsste passieren, damit du heute entscheidest?",
        ],
        common_mistakes=[
            "Zu nett sein, nicht genug fordern",
            "Up-Front Contract vergessen",
            "Pain nur oberflächlich behandeln",
            "Budget-Frage bis zum Schluss aufschieben",
        ],
    ),
    
    "snap": SalesFramework(
        id="snap",
        name="SNAP Selling",
        best_for=["Vielbeschäftigte Leads", "C-Level", "Schnelle Entscheidungen", "Commodities"],
        core_principle="Für überlastete Käufer: Einfach, wertvoll, ausgerichtet, dringend",
        stages=[
            {
                "name": "S - Simple",
                "goal": "Einfach halten",
                "description": "Komplexität eliminieren, Entscheidung leicht machen",
                "tactics": [
                    "Max 3 Optionen anbieten",
                    "Keine Überlastung mit Features",
                    "Klarer nächster Schritt",
                ],
            },
            {
                "name": "N - iNvaluable",
                "goal": "Wert sofort zeigen",
                "description": "Unverzichtbar erscheinen, nicht 'nice to have'",
                "tactics": [
                    "Quick Wins früh liefern",
                    "ROI in 30 Sekunden erklären",
                    "Expertise demonstrieren",
                ],
            },
            {
                "name": "A - Aligned",
                "goal": "Auf Prioritäten ausrichten",
                "description": "Zeigen wie du ihre wichtigsten Ziele unterstützt",
                "tactics": [
                    "Ihre Prioritäten kennen",
                    "In ihrer Sprache sprechen",
                    "Auf ihre KPIs verweisen",
                ],
            },
            {
                "name": "P - Priority",
                "goal": "Dringlichkeit schaffen",
                "description": "Warum jetzt handeln, nicht später?",
                "tactics": [
                    "Kosten des Wartens aufzeigen",
                    "Limitierte Angebote (authentisch)",
                    "Konkurrenz-Druck wenn relevant",
                ],
            },
        ],
        key_questions=[
            "In 30 Sekunden: Was ist euer größtes Problem gerade?",
            "Was steht gerade ganz oben auf eurer Prioritätenliste?",
            "Wenn du nur eine Sache ändern könntest, was wäre das?",
        ],
        common_mistakes=[
            "Zu viele Optionen, zu komplex",
            "Nicht auf ihre Prioritäten eingehen",
            "Value nicht schnell genug zeigen",
            "Fake Urgency (durchschaubar)",
        ],
    ),
    
    "meddic": SalesFramework(
        id="meddic",
        name="MEDDIC",
        best_for=["Enterprise Sales", "Große Deals", "Lange Cycles", "Multiple Stakeholder"],
        core_principle="Qualifizieren durch strukturierte Informationssammlung",
        stages=[
            {
                "name": "M - Metrics",
                "goal": "Messbare Ziele",
                "description": "Welche KPIs wollen sie verbessern? Wie messen sie Erfolg?",
            },
            {
                "name": "E - Economic Buyer",
                "goal": "Entscheider identifizieren",
                "description": "Wer kann Budget freigeben? Wer hat das letzte Wort?",
            },
            {
                "name": "D - Decision Criteria",
                "goal": "Entscheidungskriterien",
                "description": "Nach welchen Kriterien wird entschieden?",
            },
            {
                "name": "D - Decision Process",
                "goal": "Entscheidungsprozess",
                "description": "Wie läuft der Prozess? Wer ist involviert? Timeline?",
            },
            {
                "name": "I - Identify Pain",
                "goal": "Schmerz identifizieren",
                "description": "Was ist der Business-Schmerz? Wie dringend?",
            },
            {
                "name": "C - Champion",
                "goal": "Champion finden",
                "description": "Wer kämpft intern für uns? Hat Einfluss und will unseren Erfolg?",
            },
        ],
        key_questions=[
            "Welche KPIs wollt ihr verbessern?",
            "Wer gibt das Budget frei?",
            "Was sind eure Must-Have Kriterien?",
            "Wie läuft der Entscheidungsprozess bei euch?",
            "Wer ist intern euer Sponsor für dieses Projekt?",
        ],
        common_mistakes=[
            "Ohne Champion weiterarbeiten",
            "Economic Buyer nie sprechen",
            "Decision Criteria nicht kennen",
            "Nur mit User statt mit Entscheider",
        ],
    ),
    
    "solution": SalesFramework(
        id="solution",
        name="Solution Selling",
        best_for=["Custom Solutions", "Services", "Consulting", "Complex Products"],
        core_principle="Erst Problem verstehen, dann Lösung präsentieren",
        stages=[
            {
                "name": "Discover",
                "goal": "Problem verstehen",
                "description": "Tiefes Verständnis der Situation und Herausforderungen",
            },
            {
                "name": "Diagnose",
                "goal": "Ursachen identifizieren",
                "description": "Warum existiert das Problem? Was sind die Root Causes?",
            },
            {
                "name": "Design",
                "goal": "Lösung skizzieren",
                "description": "Gemeinsam die ideale Lösung entwickeln",
            },
            {
                "name": "Deliver",
                "goal": "Lösung präsentieren",
                "description": "Maßgeschneiderten Vorschlag präsentieren",
            },
        ],
        key_questions=[
            "Was wäre für euch die ideale Lösung?",
            "Warum ist das Problem entstanden?",
            "Was habt ihr schon versucht?",
            "Wie sieht Erfolg für euch aus?",
        ],
        common_mistakes=[
            "Zu früh Lösung präsentieren",
            "One-Size-Fits-All Pitch",
            "Nicht genug Zeit für Discovery",
            "Kundensprache nicht übernehmen",
        ],
    ),
}


# =============================================================================
# SALES FRAMEWORKS SYSTEM PROMPT
# =============================================================================

CHIEF_SALES_FRAMEWORKS_PROMPT = """
[CHIEF - SALES FRAMEWORK ENGINE v3.0]

Du beherrschst die bewährten Verkaufsmethodiken und wendest sie intelligent an.

╔════════════════════════════════════════════════════════════════════════════╗
║  FRAMEWORK-AUSWAHL                                                         ║
╚════════════════════════════════════════════════════════════════════════════╝

Wähle das Framework basierend auf:

SPIN SELLING wenn:
• B2B mit langen Cycles
• Komplexe Produkte
• Kunde muss Problem erst verstehen
• Mehrere Stakeholder

CHALLENGER wenn:
• Commoditized Market
• Status Quo brechen nötig
• Kunde denkt er braucht nichts
• Transformation verkaufen

GAP SELLING wenn:
• B2B SaaS / Tech
• Klarer Problem-Solution Fit
• Kunde weiß was er will
• Quantifizierbare Ergebnisse

SANDLER wenn:
• Hartnäckige "Think-It-Over"
• Preis-Einwände
• Lead will kostenlos beraten werden
• Keine klare Commitment

SNAP wenn:
• Vielbeschäftigte Leads (C-Level)
• Wenig Zeit für lange Gespräche
• Commodity-Produkt
• Schnelle Entscheidung nötig

MEDDIC wenn:
• Enterprise Deals (> 50k€)
• Viele Stakeholder
• Procurement involviert
• Lange Entscheidungsprozesse

SOLUTION wenn:
• Custom Solutions / Services
• Consulting
• Jeder Kunde ist anders
• High-Touch Sales

╔════════════════════════════════════════════════════════════════════════════╗
║  AKTIVES FRAMEWORK: {active_framework}                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

{framework_details}

╔════════════════════════════════════════════════════════════════════════════╗
║  FRAGEN-TECHNIKEN                                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

1. OFFENE FRAGEN (für Discovery)
   "Erzähl mir mehr über..."
   "Wie läuft das bei euch?"
   "Was bedeutet das für dich?"

2. TIEFGANG-FRAGEN (für Pain)
   "Warum ist das so?"
   "Wie lange geht das schon?"
   "Was habt ihr dagegen unternommen?"

3. IMPLIKATIONS-FRAGEN (für Urgency)
   "Was passiert wenn das so weitergeht?"
   "Was kostet euch das?"
   "Wie wirkt sich das auf [KPI] aus?"

4. VISION-FRAGEN (für Solution)
   "Wie sähe die ideale Lösung aus?"
   "Was würde sich ändern wenn...?"
   "Wie würdet ihr Erfolg messen?"

5. COMMITMENT-FRAGEN (für Close)
   "Was müsste passieren, damit...?"
   "Wenn ich zeigen kann dass... wärst du bereit?"
   "Was ist der nächste Schritt?"

╔════════════════════════════════════════════════════════════════════════════╗
║  EINWAND-HANDLING BY FRAMEWORK                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

PREIS-EINWAND:

SPIN: "Verstehe. Lass mich fragen: Was kostet es euch, das Problem nicht zu lösen?"
CHALLENGER: "Interessant. Die meisten denken zuerst an den Preis. Aber was ist der Preis des Status Quo?"
GAP: "Was kostet euch die Lücke zwischen jetzt und eurem Ziel jeden Monat?"
SANDLER: "Bevor wir über Preis reden: Ist das überhaupt die richtige Lösung für euch?"
SNAP: "[ROI] in 30 Sekunden: Investition [X], Return [Y], Amortisation [Z] Monate."

KEINE-ZEIT-EINWAND:

SPIN: "Was passiert in der Zwischenzeit mit eurem [Problem]?"
CHALLENGER: "Die erfolgreichsten Teams nehmen sich Zeit für [X]. Wie priorisiert ihr das?"
GAP: "Wie viel Zeit kostet euch das Problem jeden Tag?"
SNAP: "10 Minuten jetzt = 5 Stunden gespart pro Woche. Deal?"

MUSS-ÜBERLEGEN-EINWAND:

SPIN: "Natürlich. Worüber genau möchtest du nachdenken?"
SANDLER: "Verstehe. Typischerweise heißt das entweder [A] oder [B]. Was ist es bei dir?"
GAP: "Was fehlt dir noch um eine Entscheidung zu treffen?"
CHALLENGER: "Über welchen Aspekt? Ich kann dir vielleicht jetzt schon helfen."
"""


# =============================================================================
# BUILDER FUNCTIONS
# =============================================================================

def get_framework(framework_id: str) -> SalesFramework:
    """Holt ein Framework nach ID."""
    return SALES_FRAMEWORKS.get(framework_id, SALES_FRAMEWORKS["solution"])


def build_framework_prompt(
    framework_id: str,
    current_stage: Optional[str] = None,
    lead_context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Baut einen Framework-spezifischen Prompt.
    
    Args:
        framework_id: z.B. "spin", "challenger", "gap"
        current_stage: Aktuelle Stage im Framework
        lead_context: Zusätzlicher Kontext zum Lead
    
    Returns:
        Formatierter Prompt
    """
    framework = get_framework(framework_id)
    
    # Build stages section
    stages_text = []
    for i, stage in enumerate(framework.stages, 1):
        stage_name = stage.get("name", f"Stage {i}")
        stage_goal = stage.get("goal", "")
        stage_desc = stage.get("description", "")
        
        # Highlight current stage
        if current_stage and stage_name.lower().startswith(current_stage.lower()):
            stages_text.append(f"→ **{stage_name}** (AKTUELL): {stage_goal}")
        else:
            stages_text.append(f"  {stage_name}: {stage_goal}")
        
        stages_text.append(f"    {stage_desc}")
    
    framework_details = f"""
FRAMEWORK: {framework.name}
BEST FOR: {', '.join(framework.best_for)}
CORE: {framework.core_principle}

STAGES:
{chr(10).join(stages_text)}

KEY QUESTIONS:
{chr(10).join([f'• "{q}"' for q in framework.key_questions])}

AVOID:
{chr(10).join([f'❌ {m}' for m in framework.common_mistakes])}
"""
    
    return CHIEF_SALES_FRAMEWORKS_PROMPT.format(
        active_framework=framework.name,
        framework_details=framework_details,
    )


def recommend_framework(
    deal_size: Optional[str] = None,
    sales_cycle: Optional[str] = None,
    lead_type: Optional[str] = None,
    situation: Optional[str] = None,
) -> str:
    """
    Empfiehlt das beste Framework basierend auf Situation.
    
    Args:
        deal_size: "small", "medium", "large", "enterprise"
        sales_cycle: "short", "medium", "long"
        lead_type: "cold", "warm", "hot"
        situation: Beschreibung der Situation
    
    Returns:
        Empfohlenes Framework ID
    """
    # Simple rules-based recommendation
    if deal_size == "enterprise" or sales_cycle == "long":
        return "meddic"
    
    if situation and any(w in situation.lower() for w in ["think", "überlegen", "später"]):
        return "sandler"
    
    if situation and any(w in situation.lower() for w in ["busy", "keine zeit", "schnell"]):
        return "snap"
    
    if situation and any(w in situation.lower() for w in ["status quo", "anders", "neu"]):
        return "challenger"
    
    if sales_cycle == "short" and lead_type in ["warm", "hot"]:
        return "gap"
    
    # Default
    return "spin"


def get_framework_questions(framework_id: str, stage: Optional[str] = None) -> List[str]:
    """
    Holt die Fragen für ein Framework / eine Stage.
    
    Args:
        framework_id: Framework ID
        stage: Optional spezifische Stage
    
    Returns:
        Liste von Fragen
    """
    framework = get_framework(framework_id)
    
    if stage:
        for s in framework.stages:
            if s.get("name", "").lower().startswith(stage.lower()):
                return s.get("example_questions", s.get("questions", []))
    
    return framework.key_questions


def get_objection_response_by_framework(
    framework_id: str,
    objection_type: str,
) -> str:
    """
    Gibt eine Framework-spezifische Einwandbehandlung.
    
    Args:
        framework_id: Das aktive Framework
        objection_type: Art des Einwands
    
    Returns:
        Formulierungsvorschlag
    """
    responses = {
        "spin": {
            "price": "Verstehe. Lass mich fragen: Was kostet es euch, das Problem nicht zu lösen?",
            "time": "Was passiert in der Zwischenzeit mit eurem Problem?",
            "think": "Natürlich. Worüber genau möchtest du nachdenken?",
        },
        "challenger": {
            "price": "Interessant. Aber was ist der Preis des Status Quo?",
            "time": "Die erfolgreichsten Teams nehmen sich Zeit für das hier. Wie priorisiert ihr?",
            "think": "Über welchen Aspekt? Ich kann dir vielleicht jetzt schon helfen.",
        },
        "gap": {
            "price": "Was kostet euch die Lücke zwischen jetzt und eurem Ziel jeden Monat?",
            "time": "Wie viel Zeit kostet euch das Problem jeden Tag?",
            "think": "Was fehlt dir noch um eine Entscheidung zu treffen?",
        },
        "sandler": {
            "price": "Bevor wir über Preis reden: Ist das überhaupt die richtige Lösung für euch?",
            "time": "Verstehe. Wann wäre denn der richtige Zeitpunkt?",
            "think": "Typischerweise heißt das entweder A oder B. Was ist es bei dir?",
        },
        "snap": {
            "price": "ROI in 30 Sekunden: Investition X, Return Y, Amortisation in Z Monaten.",
            "time": "10 Minuten jetzt = 5 Stunden gespart pro Woche. Deal?",
            "think": "Was ist die eine Frage die ich dir noch beantworten kann?",
        },
    }
    
    framework_responses = responses.get(framework_id, responses["spin"])
    return framework_responses.get(objection_type, "Verstehe. Erzähl mir mehr darüber.")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "FrameworkType",
    "SalesFramework",
    "SALES_FRAMEWORKS",
    "CHIEF_SALES_FRAMEWORKS_PROMPT",
    "get_framework",
    "build_framework_prompt",
    "recommend_framework",
    "get_framework_questions",
    "get_objection_response_by_framework",
]

