"""
╔════════════════════════════════════════════════════════════════════════════╗
║  BEHAVIORAL ANALYSIS PROMPT                                                ║
║  Analysiert Emotion, Engagement, Entscheidungstendenz, Trust, Coherence    ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import json
from typing import Optional, Dict, Any

BEHAVIORAL_ANALYSIS_PROMPT = """
[MODUL: BEHAVIORAL_INTELLIGENCE – EMOTIONS- & VERHALTENSANALYSE]

═══════════════════════════════════════════════════════════════════════════════
DEINE ROLLE
═══════════════════════════════════════════════════════════════════════════════

Du analysierst einen Chatverlauf auf drei Ebenen:
1. WORT-EBENE (lexikalisch) - Welche Wörter, Floskeln, Emojis?
2. SATZ-EBENE (funktional) - Was ist die Absicht jeder Nachricht?
3. VERLAUF-EBENE (temporal) - Wie entwickelt sich das Gespräch über Zeit?

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Antworte NUR mit JSON (kein Markdown, kein Text davor/danach):

{
  "emotion_analysis": {
    "current_mood": "positive|enthusiastic|neutral|cautious|stressed|skeptical|annoyed|unknown",
    "mood_confidence": 0.85,
    "mood_indicators": ["freundliche Grüße", "Emojis", "entschuldigender Ton"],
    "sentiment_trajectory": "improving|stable|declining",
    "emotional_journey": [
      {"phase": "start", "mood": "neutral", "trigger": "Erstkontakt"},
      {"phase": "middle", "mood": "positive", "trigger": "Interesse gezeigt"},
      {"phase": "end", "mood": "stressed", "trigger": "Zeitdruck genannt"}
    ]
  },
  
  "engagement_analysis": {
    "engagement_level": 4,
    "engagement_indicators": {
      "response_speed": "fast|medium|slow|very_slow",
      "message_length": "short|medium|long",
      "asks_questions": true,
      "proactive_contact": false,
      "uses_emojis": true,
      "uses_names": true,
      "shares_personal_info": false
    },
    "engagement_trajectory": "increasing|stable|decreasing"
  },
  
  "decision_analysis": {
    "decision_tendency": "leaning_yes|leaning_no|undecided|deferred|committed|rejected",
    "commitment_strength": 3,
    "commitment_indicators": [
      {"statement": "Wäre Dienstag auch gegen 16 Uhr möglich?", "strength": "strong", "type": "scheduling"},
      {"statement": "Im Moment passt es mir zeitlich nicht", "strength": "weak", "type": "deferral"}
    ],
    "objections_raised": ["time"],
    "buying_signals": ["fragte nach Termin", "zeigte Interesse"],
    "hesitation_signals": ["verschob Termin", "nannte Zeitgründe"]
  },
  
  "trust_analysis": {
    "trust_level": 4,
    "trust_indicators": {
      "shares_contact_info": false,
      "agrees_to_calls": true,
      "asks_clarifying_questions": true,
      "shows_skepticism": false,
      "mentions_past_bad_experiences": false
    },
    "risk_flags": ["time_stress"],
    "risk_descriptions": {
      "time_stress": "Lead erwähnt mehrfach Zeitmangel/Projekte"
    }
  },
  
  "coherence_analysis": {
    "words_vs_behavior": "consistent|minor_inconsistency|major_inconsistency",
    "reliability_score": 3,
    "coherence_details": {
      "promises_made": ["Termin Dienstag 16 Uhr"],
      "promises_kept": [],
      "promises_broken": ["Termin abgesagt"],
      "pattern": "Sagt zu, verschiebt dann aus externen Gründen"
    },
    "coherence_interpretation": "Zeitliche Verschiebung erscheint authentisch (Projektfokus), kein verstecktes Nein"
  },
  
  "communication_style": {
    "formality": "formal|semi_formal|casual|very_casual",
    "tone": "warm|professional|playful|reserved|cold",
    "emoji_usage": "none|minimal|moderate|heavy",
    "message_length_preference": "very_short|short|medium|long",
    "response_pattern": "immediate|same_day|next_day|sporadic"
  },
  
  "strategic_recommendations": {
    "recommended_approach": "soft_nurture|value_first|direct_close|patience|takeaway",
    "recommended_tone": "warm|professional|playful|serious|empathetic",
    "recommended_message_length": "short|medium|long",
    "recommended_timing": "immediate|wait_few_days|wait_weeks",
    "recommended_channel": "same|voice_note|call|different_platform",
    "avoid": ["Druck machen", "zu lange Nachrichten", "zu häufig melden"],
    "do": ["Verständnis zeigen", "locker bleiben", "in 3 Wochen sanft reaktivieren"]
  },
  
  "dynamic_timing_v2_1": {
    "avg_response_time_hours": 12.5,
    "response_time_trend": "faster|stable|slower",
    "predicted_ghost_threshold_hours": 38,
    "ghost_type_if_unresponsive": "soft|hard",
    "ghost_type_reasoning": "Lead antwortet normalerweise schnell, daher wäre längeres Schweigen auffällig"
  },
  
  "key_insights": [
    "Lead ist grundsätzlich interessiert, aber aktuell überlastet",
    "Kein verstecktes Nein, sondern echte Zeitprobleme",
    "Hohe Responsivität wenn Zeit da ist"
  ]
}

═══════════════════════════════════════════════════════════════════════════════
ANALYSE-REGELN
═══════════════════════════════════════════════════════════════════════════════

1. WORT-EBENE ANALYSIEREN
   ───────────────────────
   • Höflichkeitsfloskeln: "Sorry", "Entschuldigung", "Danke" → wertschätzend
   • Abschwächungen: "vielleicht", "eventuell", "mal schauen" → unsicher
   • Verstärkungen: "sehr interessiert", "auf jeden Fall" → committed
   • Emojis: 😊🙏😅 = positiv/leicht, 😕😔 = unsicher/frustriert
   • Formell vs. Locker: "Sie" vs. "du", "Sehr geehrte" vs. "Hey"

2. SATZ-EBENE ANALYSIEREN (Dialog Acts)
   ─────────────────────────────────────
   • FRAGE: Infos einholen ("Was kostet das?")
   • EINWAND: Hindernis nennen ("Hab keine Zeit")
   • COMMITMENT: Zusage ("Ja, lass uns telefonieren")
   • DEFERRAL: Aufschieben ("Melde mich später")
   • ABSAGE: Ablehnung ("Möchte nicht")
   • BEZIEHUNG: Entschuldigen, danken, loben

3. VERLAUF-EBENE ANALYSIEREN
   ──────────────────────────
   • Antwortgeschwindigkeit über Zeit
   • Stimmungsentwicklung (besser/schlechter?)
   • Commitment-Stärke über Zeit
   • Zuverlässigkeit (hält Zusagen?)
   • Proaktivität (meldet sich selbst?)

4. COHERENCE PRÜFEN (Worte vs. Verhalten)
   ───────────────────────────────────────
   • Sagt "interessiert" + antwortet nicht → Inkonsistent
   • Sagt "keine Zeit" + ist freundlich → Konsistent (echte Zeitprobleme)
   • Sagt "melde mich" + meldet sich nie → Inkonsistent
   • Vereinbart Termin + sagt ab mit Grund → Mäßig konsistent

5. RISK FLAGS ERKENNEN
   ────────────────────
   • time_stress: Immer "keine Zeit", "busy", "Projekte"
   • money_concern: Preis kommt oft vor, "zu teuer", "Budget"
   • overwhelm: Zu viel Info, "muss nachdenken", "kompliziert"
   • skeptical: Zweifel, "zu schön um wahr zu sein", "MLM?"
   • distrust: Misstrauen, schlechte Erfahrungen erwähnt
   • external_blocker: Partner fragen, Chef fragen, Dritte

6. EMPFEHLUNGEN ABLEITEN
   ──────────────────────
   • stressed + positive → Verständnis zeigen, Druck raus, später reaktivieren
   • skeptical + interested → Beweise liefern, Social Proof, keine Versprechen
   • committed + reliable → Direkt zum Abschluss, nicht überreden
   • undecided + engaged → Mehr Info, Fragen beantworten, Zeit geben
   • annoyed + any → Takeaway, Rückzug, ggf. aufgeben

7. DYNAMIC TIMING v2.1 (NEU)
   ─────────────────────────
   • Schätze die durchschnittliche Antwortzeit basierend auf dem Verlauf
   • Bestimme den Trend (antwortet Lead schneller oder langsamer über Zeit?)
   • Berechne Ghost-Schwelle: avg_response * 3 (aber min 8h, max 168h)
   • Klassifiziere voraussichtlichen Ghost-Typ:
     - SOFT: Lead war bisher zuverlässig, Schweigen wäre ungewöhnlich
     - HARD: Lead zeigt bereits Muster von Ignorieren oder Verzögerung

═══════════════════════════════════════════════════════════════════════════════
BEISPIEL-ANALYSE
═══════════════════════════════════════════════════════════════════════════════

Chat-Auszug:
"Nadja: Sorry, hatte dir vergessen zu antworten, und du bist nicht nervig."
"Nadja: Wäre Dienstag auch gegen 16 Uhr möglich?"
"Nadja: Ich muss unser Telefonat heute leider absagen. Im Moment passt es mir
        zeitlich nicht, da ich mich auf laufende Projekte konzentriere."

Analyse:
- current_mood: "stressed" (Projekte, Zeitmangel) mit "positive" Unterton (freundlich, entschuldigt sich)
- engagement_level: 4 (antwortet, macht Vorschläge, erklärt Absage)
- decision_tendency: "deferred" (will, aber nicht jetzt)
- commitment_strength: 3 (hatte zugesagt, dann verschoben)
- trust_level: 4 (transparent, erklärt Gründe)
- reliability_score: 3 (Zusage nicht gehalten, aber mit gutem Grund)
- words_vs_behavior: "consistent" (Zeitprobleme wirken authentisch)
- recommended_approach: "patience" + "soft_nurture"
- recommended_timing: "wait_weeks" (3-4 Wochen)
- avoid: ["Druck", "zu oft melden", "Vorwürfe"]
- do: ["Verständnis", "locker bleiben", "sanfte Reaktivierung später"]

═══════════════════════════════════════════════════════════════════════════════
WICHTIG
═══════════════════════════════════════════════════════════════════════════════

• Antworte NUR mit dem JSON-Objekt
• Bei Unsicherheit: confidence-Werte entsprechend niedrig setzen
• Nie raten - wenn unklar, "unknown" oder null setzen
• Immer den KONTEXT beachten - einzelne Aussagen nie isoliert bewerten
• Kulturelle Unterschiede bedenken (österreichisch/deutsch = oft indirekter)
"""


def build_behavioral_analysis_prompt(
    raw_text: str,
    existing_profile: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Baut den vollständigen Behavioral Analysis Prompt.
    
    Args:
        raw_text: Der zu analysierende Chatverlauf
        existing_profile: Bisheriges Profil zur Referenz
        context: Zusätzlicher Kontext (z.B. Lead-Info, Produkt)
    
    Returns:
        Vollständiger Prompt für Claude
    """
    
    prompt_parts = [BEHAVIORAL_ANALYSIS_PROMPT]
    
    # Add existing profile if available
    if existing_profile:
        profile_json = json.dumps(existing_profile, indent=2, ensure_ascii=False)
        prompt_parts.append(f"""
═══════════════════════════════════════════════════════════════════════════════
BISHERIGES PROFIL (zur Referenz)
═══════════════════════════════════════════════════════════════════════════════

{profile_json}

Aktualisiere dieses Profil basierend auf dem neuen Chatverlauf.
""")
    
    # Add context
    if context:
        context_str = "\n".join([f"- {k}: {v}" for k, v in context.items()])
        prompt_parts.append(f"""
═══════════════════════════════════════════════════════════════════════════════
KONTEXT
═══════════════════════════════════════════════════════════════════════════════

{context_str}
""")
    
    # Add the chat
    prompt_parts.append(f"""
═══════════════════════════════════════════════════════════════════════════════
ZU ANALYSIERENDER CHATVERLAUF
═══════════════════════════════════════════════════════════════════════════════

{raw_text}

═══════════════════════════════════════════════════════════════════════════════
JETZT ANALYSIEREN
═══════════════════════════════════════════════════════════════════════════════

Analysiere den obigen Chatverlauf und gib das JSON-Ergebnis zurück:
""")
    
    return "\n".join(prompt_parts)


# =============================================================================
# GHOST BUSTER RECOMMENDATION PROMPT v2.1
# Mit Soft vs Hard Ghost Unterscheidung
# =============================================================================

GHOST_BUSTER_RECOMMENDATION_PROMPT = """
Du bist ein Experte für Follow-up Strategien bei "Ghosts" (Leads die gelesen aber nicht geantwortet haben).

KONTEXT:
- Lead: {lead_name}
- Kanal: {channel}
- Stunden seit Ghost: {hours_ghosted}
- Ghost-Typ: {ghost_type}
- Letzte Nachricht: {last_message}
- Mood: {mood}
- Decision Tendency: {decision_tendency}

GHOST-TYP ERKLÄRUNG (v2.1):
• SOFT GHOST: Kürzlich gesehen, Lead war evtl. nur busy, noch keine aktive Ignoranz
  → Strategie: Sanfter Check-in, kein Druck, Value-Add, Voice Note
  
• HARD GHOST: Lange her, Lead war seitdem online/aktiv, ignoriert bewusst
  → Strategie: Pattern Interrupt, Takeaway, Humor, Direktheit

VERFÜGBARE STRATEGIEN:
1. ghost_buster: Humorvoller Pattern-Interrupt ("Hab ich dich verschreckt?") - für HARD Ghost
2. takeaway: Druck rausnehmen ("Wenn's nicht passt, völlig okay") - für HARD Ghost
3. value_add: Mehrwert ohne Verkaufsdruck (Artikel, Tipp, Story) - für SOFT Ghost
4. voice_note: Persönliche Sprachnachricht - für SOFT Ghost
5. cross_channel: Andere Plattform nutzen (Kommentar, Story-Reaktion) - für beide
6. direct_ask: Direkte Ja/Nein Frage - für HARD Ghost

EMPFEHLE basierend auf Ghost-Typ:
1. Die beste Strategie für diesen Lead und Ghost-Typ
2. Einen konkreten Nachrichtentext
3. Das beste Timing

Antworte als JSON:
{{
  "recommended_strategy": "...",
  "message_text": "...",
  "reasoning": "...",
  "timing": "immediate|wait_1_day|wait_3_days",
  "confidence": 0.8,
  "alternative_strategy": "...",
  "ghost_type_match": "soft|hard",
  "why_this_strategy": "Erklärung warum diese Strategie zum Ghost-Typ passt"
}}
"""


def build_ghost_buster_prompt(
    lead_name: str,
    channel: str,
    hours_ghosted: float,
    last_message: str,
    mood: str = "unknown",
    decision_tendency: str = "undecided",
    ghost_type: str = "soft",  # NEU v2.1
) -> str:
    """Baut den Ghost-Buster Recommendation Prompt mit Soft/Hard Unterscheidung."""
    
    return GHOST_BUSTER_RECOMMENDATION_PROMPT.format(
        lead_name=lead_name,
        channel=channel,
        hours_ghosted=round(hours_ghosted),
        ghost_type=ghost_type.upper(),
        last_message=last_message[:200] + "..." if len(last_message) > 200 else last_message,
        mood=mood,
        decision_tendency=decision_tendency,
    )

