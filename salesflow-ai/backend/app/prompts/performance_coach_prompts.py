"""Stub prompts for Performance Coach."""

def get_performance_coach_gpt_prompt(*args, **kwargs) -> str:
    """Return a simple stub prompt."""
    return "You are a performance coach. Analyze metrics and suggest improvements."


__all__ = ["get_performance_coach_gpt_prompt"]
"""
Sales Flow AI - Performance Coach Prompts

Prompts für GPT, Claude und Gemini zur Performance-Analyse und Coaching-Empfehlungen
"""

# ============================================================================
# PERFORMANCE COACH - System Prompt
# ============================================================================

PERFORMANCE_COACH_SYSTEM_PROMPT = """Du bist ein datengetriebener Sales-Coach und Performance-Analyst. 
Deine Aufgabe ist es, Sales-Performance zu analysieren, Probleme zu identifizieren und konkrete, umsetzbare Empfehlungen zu geben.

Analysiere:
- Metriken-Vergleiche (aktuell vs. vorherige Periode)
- Conversion-Raten und Trends
- Verlorene Deals und deren Muster
- Follow-up-Geschwindigkeit
- Gesprächsqualität

Gib datenbasierte, spezifische Empfehlungen.

Antworte IMMER im JSON-Format."""

# ============================================================================
# PERFORMANCE COACH - User Prompt Template
# ============================================================================

PERFORMANCE_COACH_USER_PROMPT_TEMPLATE = """Analysiere diese Sales-Performance und gib Coaching-Empfehlungen:

AKTUELLE PERIODE ({period_start} - {period_end}):
- Gespräche geführt: {calls_made}
- Gespräche abgeschlossen: {calls_completed}
- Termine gebucht: {meetings_booked}
- Termine durchgeführt: {meetings_completed}
- Deals erstellt: {deals_created}
- Deals gewonnen: {deals_won}
- Deals verloren: {deals_lost}
- Umsatz: {revenue} EUR
- Conversion-Rate: {conversion_rate}%
- Durchschnittlicher Deal-Wert: {avg_deal_size} EUR
- Durchschnittliche Sales-Cycle: {avg_sales_cycle_days} Tage

VORHERIGE PERIODE (Vergleich):
- Gespräche: {prev_calls_made} → {calls_change_percent}%
- Deals: {prev_deals_won} → {deals_change_percent}%
- Conversion: {prev_conversion_rate}% → {conversion_change_percent}pp

VERLORENE DEALS ANALYSE:
{lost_deals_analysis}

FOLLOW-UP METRIKEN:
- Durchschnittliche Follow-up-Zeit: {avg_followup_days} Tage
- Benchmark: 1.5 Tage
- Follow-ups vergessen: {missed_followups}%

EINWÄNDE ANALYSE:
{objections_analysis}

FRAGE:
Analysiere diese Performance und identifiziere:
1. Hauptprobleme (mit Daten belegt)
2. Root Causes (warum passiert das?)
3. Konkrete, umsetzbare Empfehlungen
4. Priorisierung (was zuerst angehen?)

Antworte im folgenden JSON-Format:
{{
    "detected_issues": [
        {{
            "type": "slow_followup|early_proposal|price_objection|low_engagement|poor_qualification",
            "severity": "low|medium|high|critical",
            "metric": "average_followup_days",
            "value": 4.2,
            "benchmark": 1.5,
            "impact": "Beschreibung des Impacts auf Performance",
            "recommendation": "Konkrete Handlungsempfehlung",
            "priority": 1
        }}
    ],
    "recommendations": [
        {{
            "title": "Kurzer Titel der Empfehlung",
            "description": "Detaillierte Beschreibung",
            "action_items": [
                "Konkrete Aktion 1",
                "Konkrete Aktion 2"
            ],
            "expected_impact": "Was sich dadurch verbessert",
            "priority": 1,
            "effort": "low|medium|high"
        }}
    ],
    "strengths": [
        "Was läuft gut (z.B. 'Hohe Anzahl an Gesprächen')"
    ],
    "improvement_areas": [
        "Bereiche mit größtem Verbesserungspotenzial"
    ],
    "next_steps": [
        "Konkrete nächste Schritte (priorisiert)"
    ],
    "coaching_focus": "Worauf sollte der Coach sich konzentrieren?",
    "analysis_reasoning": "Kurze Erklärung der Analyse"
}}
"""

# ============================================================================
# PERFORMANCE COACH - Für GPT (OpenAI)
# ============================================================================

def get_performance_coach_gpt_prompt(metrics: dict, comparison: dict, lost_deals: list) -> list:
    """Format für OpenAI GPT API (ChatCompletion)."""
    return [
        {"role": "system", "content": PERFORMANCE_COACH_SYSTEM_PROMPT},
        {"role": "user", "content": PERFORMANCE_COACH_USER_PROMPT_TEMPLATE.format(
            period_start=metrics.get("period_start", "N/A"),
            period_end=metrics.get("period_end", "N/A"),
            calls_made=metrics.get("calls_made", 0),
            calls_completed=metrics.get("calls_completed", 0),
            meetings_booked=metrics.get("meetings_booked", 0),
            meetings_completed=metrics.get("meetings_completed", 0),
            deals_created=metrics.get("deals_created", 0),
            deals_won=metrics.get("deals_won", 0),
            deals_lost=metrics.get("deals_lost", 0),
            revenue=metrics.get("revenue", 0),
            conversion_rate=metrics.get("conversion_rate", 0),
            avg_deal_size=metrics.get("avg_deal_size", 0),
            avg_sales_cycle_days=metrics.get("avg_sales_cycle_days", 0),
            prev_calls_made=comparison.get("prev_calls_made", 0),
            calls_change_percent=comparison.get("calls_change_percent", 0),
            prev_deals_won=comparison.get("prev_deals_won", 0),
            deals_change_percent=comparison.get("deals_change_percent", 0),
            prev_conversion_rate=comparison.get("prev_conversion_rate", 0),
            conversion_change_percent=comparison.get("conversion_change_percent", 0),
            lost_deals_analysis=format_lost_deals(lost_deals),
            avg_followup_days=metrics.get("avg_followup_days", 0),
            missed_followups=metrics.get("missed_followups_percent", 0),
            objections_analysis=format_objections_analysis(metrics.get("objections", [])),
        )}
    ]


# ============================================================================
# PERFORMANCE COACH - Für Claude (Anthropic)
# ============================================================================

def get_performance_coach_claude_prompt(metrics: dict, comparison: dict, lost_deals: list) -> str:
    """Format für Anthropic Claude API."""
    return f"""{PERFORMANCE_COACH_SYSTEM_PROMPT}

{PERFORMANCE_COACH_USER_PROMPT_TEMPLATE.format(
    period_start=metrics.get("period_start", "N/A"),
    period_end=metrics.get("period_end", "N/A"),
    calls_made=metrics.get("calls_made", 0),
    calls_completed=metrics.get("calls_completed", 0),
    meetings_booked=metrics.get("meetings_booked", 0),
    meetings_completed=metrics.get("meetings_completed", 0),
    deals_created=metrics.get("deals_created", 0),
    deals_won=metrics.get("deals_won", 0),
    deals_lost=metrics.get("deals_lost", 0),
    revenue=metrics.get("revenue", 0),
    conversion_rate=metrics.get("conversion_rate", 0),
    avg_deal_size=metrics.get("avg_deal_size", 0),
    avg_sales_cycle_days=metrics.get("avg_sales_cycle_days", 0),
    prev_calls_made=comparison.get("prev_calls_made", 0),
    calls_change_percent=comparison.get("calls_change_percent", 0),
    prev_deals_won=comparison.get("prev_deals_won", 0),
    deals_change_percent=comparison.get("deals_change_percent", 0),
    prev_conversion_rate=comparison.get("prev_conversion_rate", 0),
    conversion_change_percent=comparison.get("conversion_change_percent", 0),
    lost_deals_analysis=format_lost_deals(lost_deals),
    avg_followup_days=metrics.get("avg_followup_days", 0),
    missed_followups=metrics.get("missed_followups_percent", 0),
    objections_analysis=format_objections_analysis(metrics.get("objections", [])),
)}

WICHTIG: Antworte NUR mit gültigem JSON, keine zusätzlichen Erklärungen."""


# ============================================================================
# PERFORMANCE COACH - Für Gemini (Google)
# ============================================================================

def get_performance_coach_gemini_prompt(metrics: dict, comparison: dict, lost_deals: list) -> str:
    """Format für Google Gemini API."""
    return f"""{PERFORMANCE_COACH_SYSTEM_PROMPT}

{PERFORMANCE_COACH_USER_PROMPT_TEMPLATE.format(
    period_start=metrics.get("period_start", "N/A"),
    period_end=metrics.get("period_end", "N/A"),
    calls_made=metrics.get("calls_made", 0),
    calls_completed=metrics.get("calls_completed", 0),
    meetings_booked=metrics.get("meetings_booked", 0),
    meetings_completed=metrics.get("meetings_completed", 0),
    deals_created=metrics.get("deals_created", 0),
    deals_won=metrics.get("deals_won", 0),
    deals_lost=metrics.get("deals_lost", 0),
    revenue=metrics.get("revenue", 0),
    conversion_rate=metrics.get("conversion_rate", 0),
    avg_deal_size=metrics.get("avg_deal_size", 0),
    avg_sales_cycle_days=metrics.get("avg_sales_cycle_days", 0),
    prev_calls_made=comparison.get("prev_calls_made", 0),
    calls_change_percent=comparison.get("calls_change_percent", 0),
    prev_deals_won=comparison.get("prev_deals_won", 0),
    deals_change_percent=comparison.get("deals_change_percent", 0),
    prev_conversion_rate=comparison.get("prev_conversion_rate", 0),
    conversion_change_percent=comparison.get("conversion_change_percent", 0),
    lost_deals_analysis=format_lost_deals(lost_deals),
    avg_followup_days=metrics.get("avg_followup_days", 0),
    missed_followups=metrics.get("missed_followups_percent", 0),
    objections_analysis=format_objections_analysis(metrics.get("objections", [])),
)}

Antworte ausschließlich mit gültigem JSON."""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_lost_deals(lost_deals: list) -> str:
    """Formatiere verlorene Deals für Analyse."""
    if not lost_deals:
        return "Keine verlorenen Deals in dieser Periode."
    
    analysis = []
    for deal in lost_deals[:10]:  # Top 10
        deal_name = deal.get("name") or deal.get("contact_name", "Unbekannt")
        deal_value = deal.get("value", 0)
        stage = deal.get("stage", "unknown")
        reason = deal.get("lost_reason") or deal.get("notes", "Keine Angabe")
        objections = deal.get("objections", [])
        
        obj_text = ", ".join([obj.get("type", "unknown") for obj in objections[:3]])
        analysis.append(f"- {deal_name} ({deal_value} EUR, Stage: {stage}): {reason}. Einwände: {obj_text or 'Keine'}")
    
    return "\n".join(analysis) if analysis else "Keine verlorenen Deals in dieser Periode."


def format_objections_analysis(objections: list) -> str:
    """Formatiere Einwände-Analyse."""
    if not objections:
        return "Keine Einwände-Daten verfügbar."
    
    # Gruppiere nach Typ
    objection_counts = {}
    for obj in objections:
        obj_type = obj.get("type", "unknown")
        objection_counts[obj_type] = objection_counts.get(obj_type, 0) + 1
    
    formatted = []
    for obj_type, count in sorted(objection_counts.items(), key=lambda x: x[1], reverse=True):
        formatted.append(f"- {obj_type}: {count}x erwähnt")
    
    return "\n".join(formatted) if formatted else "Keine Einwände-Daten verfügbar."

