"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF ANALYST SYSTEM                                                      ║
║  Performance Intelligence - Daten die Menschen übersehen                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Der ANALYST ist der datengetriebene Teil von CHIEF der:
- Patterns erkennt die Menschen übersehen
- Datenbasierte Empfehlungen gibt
- Benchmarks und Vergleiche liefert
- Prognosen erstellt

Analyse-Ebenen:
1. INDIVIDUAL - Einzelner User
2. COMPARATIVE - Peer-Benchmarks
3. PREDICTIVE - Prognosen
4. TEAM - Für Manager/Uplines
"""

from typing import Optional, List
from dataclasses import dataclass
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# METRIC DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

class MetricCategory(str, Enum):
    """Kategorien von Metriken."""
    ACTIVITY = "activity"         # Outreach-Volumen, Aktivität
    CONVERSION = "conversion"     # Funnel-Conversion Rates
    EFFICIENCY = "efficiency"     # Zeit-Effizienz, ROI
    BEHAVIOR = "behavior"         # Konsistenz, Patterns
    PIPELINE = "pipeline"         # Lead-Wert, Forecast


@dataclass
class MetricDefinition:
    """Definition einer Metrik."""
    name: str
    category: MetricCategory
    description: str
    benchmark_avg: float
    benchmark_top20: float
    unit: str  # %, Anzahl, €, etc.
    higher_is_better: bool = True


METRICS_DATABASE = {
    # Activity Metrics
    "outreach_per_day": MetricDefinition(
        name="Outreaches pro Tag",
        category=MetricCategory.ACTIVITY,
        description="Anzahl neuer Kontaktaufnahmen pro Tag",
        benchmark_avg=10,
        benchmark_top20=20,
        unit="Anzahl",
    ),
    "followup_rate": MetricDefinition(
        name="Follow-up Rate",
        category=MetricCategory.ACTIVITY,
        description="% der Leads die Follow-up bekommen",
        benchmark_avg=0.65,
        benchmark_top20=0.90,
        unit="%",
    ),
    "response_time": MetricDefinition(
        name="Antwortzeit",
        category=MetricCategory.ACTIVITY,
        description="Durchschnittliche Zeit bis zur Antwort",
        benchmark_avg=4,  # Stunden
        benchmark_top20=1,
        unit="Stunden",
        higher_is_better=False,
    ),
    
    # Conversion Metrics
    "reply_rate": MetricDefinition(
        name="Reply Rate",
        category=MetricCategory.CONVERSION,
        description="% der Outreaches die Replies bekommen",
        benchmark_avg=0.25,
        benchmark_top20=0.40,
        unit="%",
    ),
    "conversation_rate": MetricDefinition(
        name="Gesprächs-Rate",
        category=MetricCategory.CONVERSION,
        description="% der Replies die zu Gesprächen werden",
        benchmark_avg=0.60,
        benchmark_top20=0.80,
        unit="%",
    ),
    "closing_rate": MetricDefinition(
        name="Closing Rate",
        category=MetricCategory.CONVERSION,
        description="% der Gespräche die zu Sales werden",
        benchmark_avg=0.25,
        benchmark_top20=0.40,
        unit="%",
    ),
    "objection_success_rate": MetricDefinition(
        name="Einwand-Erfolgsrate",
        category=MetricCategory.CONVERSION,
        description="% der Einwände die überwunden werden",
        benchmark_avg=0.35,
        benchmark_top20=0.60,
        unit="%",
    ),
    
    # Efficiency Metrics
    "cycle_time": MetricDefinition(
        name="Sales Cycle",
        category=MetricCategory.EFFICIENCY,
        description="Tage von Erstkontakt bis Abschluss",
        benchmark_avg=14,
        benchmark_top20=7,
        unit="Tage",
        higher_is_better=False,
    ),
    "touches_per_sale": MetricDefinition(
        name="Touchpoints pro Sale",
        category=MetricCategory.EFFICIENCY,
        description="Anzahl Kontakte bis zum Abschluss",
        benchmark_avg=8,
        benchmark_top20=5,
        unit="Anzahl",
        higher_is_better=False,
    ),
    
    # Behavior Metrics
    "consistency_score": MetricDefinition(
        name="Konsistenz-Score",
        category=MetricCategory.BEHAVIOR,
        description="Wie gleichmäßig ist die tägliche Aktivität",
        benchmark_avg=0.60,
        benchmark_top20=0.85,
        unit="%",
    ),
    "peak_hours_efficiency": MetricDefinition(
        name="Peak-Hours Nutzung",
        category=MetricCategory.BEHAVIOR,
        description="% der Aktivität in optimalen Zeiten",
        benchmark_avg=0.40,
        benchmark_top20=0.70,
        unit="%",
    ),
    
    # Pipeline Metrics
    "pipeline_value": MetricDefinition(
        name="Pipeline-Wert",
        category=MetricCategory.PIPELINE,
        description="Erwarteter Umsatz aus aktiven Leads",
        benchmark_avg=1500,
        benchmark_top20=5000,
        unit="€",
    ),
    "lead_score_avg": MetricDefinition(
        name="Ø Lead-Score",
        category=MetricCategory.PIPELINE,
        description="Durchschnittliche Lead-Qualität",
        benchmark_avg=45,
        benchmark_top20=65,
        unit="Score",
    ),
}


# ═══════════════════════════════════════════════════════════════════════════
# ANALYST SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════════════

CHIEF_ANALYST_PROMPT = """
# CHIEF ANALYST SYSTEM - Performance Intelligence

## DEINE ROLLE

Du bist der analytische Teil von CHIEF der:
- Patterns erkennt die Menschen übersehen
- Datenbasierte Empfehlungen gibt
- Benchmarks und Vergleiche liefert
- Prognosen erstellt

## ANALYSE-PRINZIPIEN

### 1. Zahlen statt Meinungen
❌ "Ich denke deine Nachrichten sind zu lang"
✅ "Deine Nachrichten mit <50 Wörtern: 40% Reply-Rate
    Deine Nachrichten mit >100 Wörtern: 15% Reply-Rate"

### 2. Vergleiche geben Kontext
❌ "Deine Reply-Rate ist 28%"
✅ "Deine Reply-Rate ist 28% (Team-Ø: 25%, Top 20%: 40%)"

### 3. Trends sind wichtiger als Snapshots
❌ "Du hast 5 Abschlüsse diese Woche"
✅ "5 Abschlüsse diese Woche (+25% vs. letzte Woche, Trend: ↗️)"

### 4. Immer mit Empfehlung enden
❌ "Deine Conversion ist niedrig"
✅ "Deine Conversion ist 15%. Wenn wir das auf 20% bringen, 
    bedeutet das +3 Abschlüsse/Monat bei gleichem Aufwand."

## OUTPUT FORMATE

### Quick Insight (für Chat)
```
💡 Insight: {Beobachtung}
📊 Daten: {Zahlen/Vergleich}
🎯 Aktion: {Konkrete Empfehlung}
```

### Performance Card
```
┌─────────────────────────────────────────┐
│ 📊 DEINE PERFORMANCE                    │
├─────────────────────────────────────────┤
│ Metrik        │ Du    │ Ø    │ Top 20% │
│───────────────│───────│──────│─────────│
│ Reply Rate    │ 28%   │ 25%  │ 40%     │
│ Closing Rate  │ 22%   │ 25%  │ 38%     │
│ ...           │       │      │         │
├─────────────────────────────────────────┤
│ 🎯 FOKUS: {Wichtigste Verbesserung}    │
└─────────────────────────────────────────┘
```

### Trend Report
```
📈 TREND-ANALYSE ({Zeitraum})

Metrik       │ Vorher │ Jetzt  │ Trend
─────────────│────────│────────│───────
{metrik}     │ {alt}  │ {neu}  │ {↗️/↘️/→}

📍 Insight: {Was bedeutet das?}
🎯 Empfehlung: {Was tun?}
```

### Forecast
```
📊 PROGNOSE ({Zeitraum})

Basierend auf deinen aktuellen Zahlen:
- Pipeline-Wert: {Wert}
- Erwartete Abschlüsse: {Anzahl} (±{Varianz})
- Wahrscheinlichkeit Ziel zu erreichen: {%}

⚠️ Um Ziel zu erreichen brauchst du:
{Konkrete Maßnahme}
```

## BENCHMARKING

### Peer Comparison (anonymisiert)
Vergleiche mit:
- Team-Durchschnitt
- Top 20% im Team
- Eigene Historie (letzte 30/60/90 Tage)

### Nie:
- Einzelne Personen nennen
- Demotivieren durch unrealistische Vergleiche
- Nur Negatives zeigen

## PATTERN DETECTION

Suche nach:
- 📅 Zeit-Patterns (Beste Wochentage, Uhrzeiten)
- 📱 Channel-Patterns (Instagram vs. LinkedIn vs. WhatsApp)
- 📝 Template-Patterns (Welche funktionieren?)
- 🎯 Lead-Type Patterns (Welche Leads konvertieren?)
"""


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class MetricAnalysis:
    """Analyse einer einzelnen Metrik."""
    metric_name: str
    current_value: float
    benchmark_avg: float
    benchmark_top20: float
    trend: str  # "improving", "stable", "declining"
    trend_percent: float
    insight: str
    recommendation: str


@dataclass
class PeerComparison:
    """Vergleich mit Peers."""
    metric_name: str
    user_value: float
    team_avg: float
    top_20_value: float
    percentile: int  # Wo steht der User (0-100)
    status: str  # "above_average", "average", "below_average"


@dataclass
class Forecast:
    """Prognose für zukünftige Performance."""
    metric_name: str
    current_value: float
    predicted_value: float
    confidence: float  # 0-1
    timeframe: str
    assumptions: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def analyze_metric(
    metric_key: str,
    current_value: float,
    previous_value: float,
) -> MetricAnalysis:
    """
    Analysiert eine einzelne Metrik.
    
    Args:
        metric_key: Key der Metrik
        current_value: Aktueller Wert
        previous_value: Vorheriger Wert
        
    Returns:
        MetricAnalysis mit Insights
    """
    metric_def = METRICS_DATABASE.get(metric_key)
    if not metric_def:
        return None
    
    # Trend berechnen
    if previous_value > 0:
        change = (current_value - previous_value) / previous_value
    else:
        change = 0
    
    if change > 0.10:
        trend = "improving"
    elif change < -0.10:
        trend = "declining"
    else:
        trend = "stable"
    
    # Insight generieren
    if current_value >= metric_def.benchmark_top20:
        insight = f"Du bist in den Top 20%! 🏆"
    elif current_value >= metric_def.benchmark_avg:
        insight = f"Über Durchschnitt, Luft nach oben zu Top 20%"
    else:
        insight = f"Unter Durchschnitt - hier ist Potenzial"
    
    # Recommendation generieren
    if trend == "declining":
        recommendation = f"Achtung: {metric_def.name} sinkt. Analysiere was sich geändert hat."
    elif current_value < metric_def.benchmark_avg:
        gap = metric_def.benchmark_avg - current_value
        recommendation = f"Steigere {metric_def.name} um {gap:.0f}{metric_def.unit} um Durchschnitt zu erreichen"
    else:
        recommendation = f"Weiter so! Ziel: Top 20% bei {metric_def.benchmark_top20}{metric_def.unit}"
    
    return MetricAnalysis(
        metric_name=metric_def.name,
        current_value=current_value,
        benchmark_avg=metric_def.benchmark_avg,
        benchmark_top20=metric_def.benchmark_top20,
        trend=trend,
        trend_percent=change * 100,
        insight=insight,
        recommendation=recommendation,
    )


def compare_with_peers(
    user_metrics: dict,
    team_metrics: dict,
) -> List[PeerComparison]:
    """
    Vergleicht User-Metriken mit Team-Metriken.
    
    Args:
        user_metrics: Dict mit {metric_key: value}
        team_metrics: Dict mit {metric_key: {avg, top_20, values}}
        
    Returns:
        Liste von PeerComparison
    """
    comparisons = []
    
    for metric_key, user_value in user_metrics.items():
        if metric_key not in team_metrics:
            continue
        
        team = team_metrics[metric_key]
        team_avg = team.get("avg", 0)
        top_20 = team.get("top_20", 0)
        
        # Percentile berechnen (vereinfacht)
        if top_20 > team_avg:
            if user_value >= top_20:
                percentile = 90
            elif user_value >= team_avg:
                percentile = 50 + (user_value - team_avg) / (top_20 - team_avg) * 40
            else:
                percentile = (user_value / team_avg) * 50 if team_avg > 0 else 0
        else:
            percentile = 50
        
        # Status
        if user_value >= top_20:
            status = "above_average"
        elif user_value >= team_avg * 0.9:
            status = "average"
        else:
            status = "below_average"
        
        metric_def = METRICS_DATABASE.get(metric_key)
        comparisons.append(PeerComparison(
            metric_name=metric_def.name if metric_def else metric_key,
            user_value=user_value,
            team_avg=team_avg,
            top_20_value=top_20,
            percentile=int(percentile),
            status=status,
        ))
    
    return comparisons


def generate_forecast(
    pipeline_leads: List[dict],
    conversion_rate: float,
    avg_deal_value: float,
    timeframe_days: int = 30,
) -> Forecast:
    """
    Generiert eine Umsatz-Prognose.
    
    Args:
        pipeline_leads: Liste von Leads mit {id, score, stage}
        conversion_rate: Historische Conversion Rate
        avg_deal_value: Durchschnittlicher Deal-Wert
        timeframe_days: Prognose-Zeitraum
        
    Returns:
        Forecast mit Prognose
    """
    # Lead-Scoring basierte Prognose
    total_expected = 0
    
    for lead in pipeline_leads:
        score = lead.get("score", 50)
        lead_probability = score / 100 * conversion_rate
        expected = lead_probability * avg_deal_value
        total_expected += expected
    
    # Confidence basierend auf Datenmenge
    confidence = min(0.9, len(pipeline_leads) / 50)  # Max 90% bei 50+ Leads
    
    return Forecast(
        metric_name="Erwarteter Umsatz",
        current_value=len(pipeline_leads),
        predicted_value=total_expected,
        confidence=confidence,
        timeframe=f"{timeframe_days} Tage",
        assumptions=[
            f"Basierend auf {len(pipeline_leads)} aktiven Leads",
            f"Historische Conversion Rate: {conversion_rate*100:.0f}%",
            f"Ø Deal-Wert: €{avg_deal_value:.0f}",
        ],
    )


# ═══════════════════════════════════════════════════════════════════════════
# PATTERN DETECTION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class DetectedPattern:
    """Ein erkanntes Pattern."""
    pattern_type: str
    description: str
    data: dict
    recommendation: str
    impact: str  # low, medium, high


def detect_time_patterns(activities: List[dict]) -> List[DetectedPattern]:
    """
    Erkennt Zeit-basierte Patterns.
    
    Args:
        activities: Liste von {timestamp, type, success}
        
    Returns:
        Liste von DetectedPatterns
    """
    patterns = []
    
    # Vereinfachte Pattern-Detection
    # In Produktion: Echte Statistik-Analyse
    
    # Beispiel: Beste Wochentage
    weekday_success = {}
    for a in activities:
        # Würde timestamp parsen und weekday extrahieren
        pass
    
    # Beispiel Pattern
    patterns.append(DetectedPattern(
        pattern_type="best_time",
        description="Deine erfolgreichste Zeit ist Dienstag 10-12 Uhr",
        data={"weekday": "Dienstag", "hours": "10-12"},
        recommendation="Plane wichtige Outreaches für diese Zeit",
        impact="medium",
    ))
    
    return patterns


def detect_channel_patterns(activities: List[dict]) -> List[DetectedPattern]:
    """
    Erkennt Channel-basierte Patterns.
    
    Args:
        activities: Liste von {channel, success, reply_rate}
        
    Returns:
        Liste von DetectedPatterns
    """
    patterns = []
    
    # Beispiel Pattern
    patterns.append(DetectedPattern(
        pattern_type="best_channel",
        description="Instagram hat 2x höhere Reply-Rate als LinkedIn",
        data={"instagram": 34, "linkedin": 17},
        recommendation="Fokussiere mehr auf Instagram",
        impact="high",
    ))
    
    return patterns


# ═══════════════════════════════════════════════════════════════════════════
# REPORT GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def generate_performance_card(
    user_metrics: dict,
    team_metrics: dict,
) -> str:
    """
    Generiert eine Performance-Card.
    
    Args:
        user_metrics: User-Metriken
        team_metrics: Team-Benchmarks
        
    Returns:
        Formatierte Performance-Card
    """
    comparisons = compare_with_peers(user_metrics, team_metrics)
    
    lines = [
        "┌─────────────────────────────────────────────────┐",
        "│ 📊 DEINE PERFORMANCE                            │",
        "├─────────────────────────────────────────────────┤",
        "│ Metrik          │ Du     │ Team Ø │ Top 20%    │",
        "│─────────────────│────────│────────│────────────│",
    ]
    
    for c in comparisons[:5]:
        status_icon = "✅" if c.status == "above_average" else "⚠️" if c.status == "below_average" else "→"
        line = f"│ {c.metric_name[:15]:<15} │ {c.user_value:>5.0f}% │ {c.team_avg:>5.0f}% │ {c.top_20_value:>5.0f}%     │ {status_icon}"
        lines.append(line)
    
    # Fokus-Empfehlung
    below_avg = [c for c in comparisons if c.status == "below_average"]
    if below_avg:
        focus = below_avg[0]
        lines.append("├─────────────────────────────────────────────────┤")
        lines.append(f"│ 🎯 FOKUS: {focus.metric_name} verbessern        │")
    
    lines.append("└─────────────────────────────────────────────────┘")
    
    return "\n".join(lines)


def generate_trend_report(
    current_metrics: dict,
    previous_metrics: dict,
    period: str = "7 Tage",
) -> str:
    """
    Generiert einen Trend-Report.
    
    Args:
        current_metrics: Aktuelle Werte
        previous_metrics: Vorherige Werte
        period: Betrachtungszeitraum
        
    Returns:
        Formatierter Trend-Report
    """
    lines = [f"📈 **TREND-ANALYSE** ({period})\n"]
    
    for metric_key, current in current_metrics.items():
        previous = previous_metrics.get(metric_key, current)
        
        if previous > 0:
            change = (current - previous) / previous * 100
        else:
            change = 0
        
        if change > 10:
            trend_icon = "↗️"
        elif change < -10:
            trend_icon = "↘️"
        else:
            trend_icon = "→"
        
        metric_def = METRICS_DATABASE.get(metric_key)
        name = metric_def.name if metric_def else metric_key
        
        lines.append(f"• {name}: {previous:.0f}% → {current:.0f}% {trend_icon} ({change:+.0f}%)")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# FULL ANALYST PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_analyst_prompt(
    user_metrics: Optional[dict] = None,
    team_benchmarks: Optional[dict] = None,
    detected_patterns: Optional[List[DetectedPattern]] = None,
) -> str:
    """
    Baut den kompletten Analyst-Prompt.
    
    Args:
        user_metrics: Aktuelle User-Metriken
        team_benchmarks: Team-Vergleichswerte
        detected_patterns: Erkannte Patterns
        
    Returns:
        Vollständiger Analyst-Prompt
    """
    prompt_parts = [CHIEF_ANALYST_PROMPT]
    
    # Aktuelle Metriken
    if user_metrics:
        prompt_parts.append("\n## 📊 AKTUELLE USER-METRIKEN")
        for key, value in user_metrics.items():
            metric_def = METRICS_DATABASE.get(key)
            if metric_def:
                status = "✅" if value >= metric_def.benchmark_avg else "⚠️"
                prompt_parts.append(f"- {metric_def.name}: {value:.1f}{metric_def.unit} {status}")
    
    # Benchmarks
    if team_benchmarks:
        prompt_parts.append("\n## 📈 TEAM-BENCHMARKS")
        for key, bench in team_benchmarks.items():
            metric_def = METRICS_DATABASE.get(key)
            name = metric_def.name if metric_def else key
            prompt_parts.append(f"- {name}: Team Ø {bench.get('avg', 0):.0f}%, Top 20%: {bench.get('top_20', 0):.0f}%")
    
    # Patterns
    if detected_patterns:
        prompt_parts.append("\n## 🔍 ERKANNTE PATTERNS")
        for pattern in detected_patterns[:3]:
            prompt_parts.append(f"- **{pattern.pattern_type}**: {pattern.description}")
            prompt_parts.append(f"  → Empfehlung: {pattern.recommendation}")
    
    return "\n".join(prompt_parts)

