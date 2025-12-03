"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMOTION & STIMMUNGS-ENGINE                                                ║
║  Erkennt Mood, Engagement & Decision-Tendency des Kontakts                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Contact Mood Detection (positiv, neutral, gestresst, skeptisch)
    - Engagement Level (1-5)
    - Decision Tendency (on_hold, close_to_yes, close_to_no, neutral)
    - Tone Hint Recommendation (neutral, direct, reassuring, value_focused, evidence_based)
"""

from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class EmotionAnalysis:
    """Ergebnis der Emotions-Analyse."""
    
    contact_mood: str           # positiv, neutral, gestresst, skeptisch
    engagement_level: int       # 1-5
    decision_tendency: str      # on_hold, close_to_yes, close_to_no, neutral
    tone_hint: str              # neutral, direct, reassuring, value_focused, evidence_based
    confidence: float           # 0.0 - 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "contact_mood": self.contact_mood,
            "engagement_level": self.engagement_level,
            "decision_tendency": self.decision_tendency,
            "tone_hint": self.tone_hint,
            "confidence": self.confidence
        }


# =============================================================================
# MOOD DETECTION SIGNALS
# =============================================================================

MOOD_SIGNALS = {
    "gestresst": {
        "keywords": [
            "viel los", "keine zeit", "stress", "später", "busy", "hektisch",
            "gerade nicht", "im moment nicht", "zeitdruck", "termine",
            # Erweitert
            "hab zu tun", "volles programm", "vollgestopft", "überlastet",
            "chaos", "durcheinander", "muss weg", "eilig", "dringend"
        ],
        "patterns": [
            "sorry", "muss schnell", "bin gerade", "hab wenig zeit",
            "mach's kurz", "nur ganz kurz", "bin im stress",
            # Erweitert
            "kann nicht lange", "muss gleich", "hab nur 5 minuten",
            "lass uns das kurz", "bin unterwegs"
        ],
        "weight": 1.0
    },
    "skeptisch": {
        "keywords": [
            "skeptisch", "glaub ich nicht", "zu gut", "wirklich", "sicher", 
            "beweis", "klingt nach", "übertrieben", "versprochen", "garantie",
            "mlm", "pyramide", "betrug", "unseriös",
            # Erweitert
            "abzocke", "fake", "scam", "masche", "trick", "verarsche",
            "märchen", "lüge", "blödsinn", "quatsch", "unsinn"
        ],
        "patterns": [
            "klingt nach", "wie soll das", "woher weiß ich", "kann das sein",
            "stimmt das wirklich", "zu schön um wahr", "was ist der haken",
            "funktioniert das auch",
            # Erweitert
            "glaub ich dir nicht", "erzähl mir nichts", "bin nicht blöd",
            "kennst du das überhaupt", "hast du das getestet"
        ],
        "weight": 1.0
    },
    "positiv": {
        "keywords": [
            "interessant", "spannend", "cool", "geil", "super", "toll", "mega",
            "klasse", "genial", "wow", "krass", "top", "perfekt", "fantastisch",
            "beeindruckend", "überzeugt",
            # Erweitert
            "hammer", "wahnsinn", "unglaublich", "heftig", "stark",
            "liebe", "freue mich", "aufgeregt", "gespannt", "neugierig"
        ],
        "patterns": [
            "klingt gut", "erzähl mehr", "will wissen", "gefällt mir",
            "bin begeistert", "hört sich an", "das ist ja", "find ich gut",
            "klingt spannend",
            # Erweitert
            "das will ich", "zeig mir", "wie mache ich", "wo bekomme ich",
            "wann kann ich", "lass uns machen"
        ],
        "weight": 1.0
    },
    "vorsichtig": {
        "keywords": [
            "vorsichtig", "langsam", "erstmal", "schauen", "informieren",
            "vergleichen", "nachdenken", "prüfen",
            # Erweitert
            "abwägen", "recherchieren", "checken", "klären"
        ],
        "patterns": [
            "muss erst", "will noch", "mal schauen", "schau mal",
            "lass mich", "bevor ich",
            # Erweitert
            "will mehr wissen", "kannst du mir schicken", "gibt es infos"
        ],
        "weight": 0.7
    },
    "frustriert": {
        "keywords": [
            "nervig", "genervt", "frustriert", "ätzend", "anstrengend",
            "schwierig", "kompliziert", "umständlich", "mühsam"
        ],
        "patterns": [
            "das nervt", "immer das gleiche", "schon wieder",
            "ich hab schon x mal", "warum ist das so", "funktioniert nicht"
        ],
        "weight": 0.9
    },
    "überfordert": {
        "keywords": [
            "überfordert", "verwirrt", "verstehe nicht", "kompliziert",
            "zu viel", "kapiere nicht", "blick nicht durch"
        ],
        "patterns": [
            "was meinst du damit", "kannst du das erklären", 
            "ich check das nicht", "verstehe ich nicht"
        ],
        "weight": 0.8
    }
}


# =============================================================================
# DECISION TENDENCY SIGNALS
# =============================================================================

DECISION_SIGNALS = {
    "close_to_yes": {
        "keywords": [
            "termin", "wann", "wie starte", "anmelden", "bestellen", "kaufen",
            "buchen", "registrieren", "unterschreiben", "abschließen",
            "mitmachen", "anfangen", "loslegen", "starten",
            # Erweitert
            "los gehts", "dabei", "mache mit", "teste das", "probiere",
            "nehme das", "will das", "schick mir", "link", "formular"
        ],
        "patterns": [
            "lass uns", "bin dabei", "klingt gut", "machen wir",
            "ich will", "ich möchte", "wann können wir", "wie geht's weiter",
            "nächster schritt", "was muss ich tun",
            # Erweitert
            "wie läuft das ab", "was brauchst du", "schick mir die",
            "lass mich das machen", "ich bin ready", "let's go"
        ],
        "weight": 1.0
    },
    "close_to_no": {
        "keywords": [
            "nein", "nicht interessiert", "kein interesse", "lass mal",
            "vergiss es", "nicht für mich", "niemals", "auf keinen fall",
            # Erweitert
            "definitiv nicht", "absolut nicht", "keine chance",
            "wirklich nicht", "echt nicht", "null interesse"
        ],
        "patterns": [
            "brauch ich nicht", "passt nicht", "nicht für mich",
            "will nicht", "hab kein", "ohne mich", "lass mich in ruhe",
            # Erweitert
            "hör auf", "nerv nicht", "lösch meine nummer",
            "schreib mir nicht mehr", "das war's"
        ],
        "weight": 1.0
    },
    "on_hold": {
        "keywords": [
            "überlegen", "nachdenken", "melden", "schauen", "später",
            "drüber schlafen", "bedenken", "abwägen",
            # Erweitert
            "überdenken", "prüfen", "checken", "nächste woche",
            "nächsten monat", "nach dem urlaub"
        ],
        "patterns": [
            "muss erst", "will noch", "weiß nicht", "mal sehen",
            "meld mich", "ruf zurück", "schreib mir", "lass mir zeit",
            "brauch zeit",
            # Erweitert
            "nicht jetzt", "gerade nicht", "momentan nicht",
            "erst wenn", "sobald ich", "wenn ich zeit habe"
        ],
        "weight": 1.0
    },
    "warming_up": {
        "keywords": [
            "interessant", "spannend", "erzähl mir", "mehr infos",
            "wie funktioniert", "was kostet", "gibt es"
        ],
        "patterns": [
            "klingt interessant", "will mehr wissen", "erzähl weiter",
            "das ist ja", "nicht schlecht"
        ],
        "weight": 0.8
    }
}


# =============================================================================
# ENGAGEMENT LEVEL DESCRIPTORS
# =============================================================================

ENGAGEMENT_DESCRIPTORS = {
    1: {
        "label": "Sehr niedrig",
        "description": "Kontakt zeigt kaum Interesse, einsilbige Antworten",
        "recommendation": "Kurz halten, offene Frage stellen, ggf. Pause anbieten"
    },
    2: {
        "label": "Niedrig",
        "description": "Höflich aber distanziert, wenig Eigeninitiative",
        "recommendation": "Auf Pain Points eingehen, Relevanz aufzeigen"
    },
    3: {
        "label": "Mittel",
        "description": "Stellt Fragen, zeigt grundsätzliches Interesse",
        "recommendation": "Konkrete nächste Schritte anbieten"
    },
    4: {
        "label": "Hoch",
        "description": "Aktiv interessiert, detaillierte Fragen",
        "recommendation": "Momentum nutzen, zum Abschluss führen"
    },
    5: {
        "label": "Sehr hoch",
        "description": "Begeistert, fragt aktiv nach nächsten Schritten",
        "recommendation": "Direkt closen, keine Zeit verlieren"
    }
}


def get_engagement_recommendation(engagement_level: int) -> str:
    """
    Gibt eine Empfehlung basierend auf dem Engagement-Level.
    
    Args:
        engagement_level: 1-5
        
    Returns:
        Empfehlung als String
    """
    descriptor = ENGAGEMENT_DESCRIPTORS.get(engagement_level, ENGAGEMENT_DESCRIPTORS[3])
    return descriptor["recommendation"]


# =============================================================================
# EMOTION ANALYSIS ENGINE
# =============================================================================

def analyze_emotion(
    query: str,
    intent: Optional[str] = None,
    objection_type: Optional[str] = None,
    conversation_history: Optional[List[str]] = None,
    vertical: Optional[str] = None
) -> EmotionAnalysis:
    """
    Analysiert Emotion, Engagement und Entscheidungstendenz.
    
    Args:
        query: Die aktuelle Anfrage
        intent: Erkannter Intent
        objection_type: Erkannter Einwand-Typ
        conversation_history: Bisherige Konversation
        vertical: Branche für spezifische Anpassungen
        
    Returns:
        EmotionAnalysis Objekt
    """
    query_lower = query.lower()
    
    # 1. Mood Detection
    mood, mood_confidence = _detect_mood(query_lower)
    
    # 2. Decision Tendency
    decision, decision_confidence = _detect_decision_tendency(query_lower)
    
    # Objection-basierte Anpassung
    if objection_type == "price" and decision == "neutral":
        decision = "on_hold"
    elif objection_type == "not_interested":
        decision = "close_to_no"
    
    # 3. Engagement Level (1-5)
    engagement = _calculate_engagement(
        query=query,
        mood=mood,
        decision=decision,
        has_history=bool(conversation_history)
    )
    
    # 4. Tone Hint
    tone_hint = _determine_tone_hint(
        mood=mood,
        decision=decision,
        objection_type=objection_type,
        vertical=vertical
    )
    
    # Gesamt-Confidence
    overall_confidence = max(mood_confidence, decision_confidence)
    
    return EmotionAnalysis(
        contact_mood=mood,
        engagement_level=engagement,
        decision_tendency=decision,
        tone_hint=tone_hint,
        confidence=overall_confidence
    )


def _detect_mood(query_lower: str) -> Tuple[str, float]:
    """
    Erkennt die Stimmung des Kontakts.
    
    Returns:
        Tuple von (mood, confidence)
    """
    scores = {}
    
    for mood_type, signals in MOOD_SIGNALS.items():
        keyword_matches = sum(1 for kw in signals["keywords"] if kw in query_lower)
        pattern_matches = sum(1 for p in signals["patterns"] if p in query_lower)
        
        # Gewichtete Summe
        total_possible = len(signals["keywords"]) + len(signals["patterns"]) * 1.5
        score = (keyword_matches * 0.3 + pattern_matches * 0.5) * signals["weight"]
        
        if score > 0:
            scores[mood_type] = min(score / 2, 1.0)  # Normalisieren
    
    if not scores:
        return "neutral", 0.5
    
    best_mood = max(scores, key=scores.get)
    confidence = min(scores[best_mood] * 2, 1.0)
    
    return best_mood, confidence


def _detect_decision_tendency(query_lower: str) -> Tuple[str, float]:
    """
    Erkennt die Entscheidungstendenz.
    
    Returns:
        Tuple von (decision, confidence)
    """
    scores = {}
    
    for decision_type, signals in DECISION_SIGNALS.items():
        keyword_matches = sum(1 for kw in signals["keywords"] if kw in query_lower)
        pattern_matches = sum(1 for p in signals["patterns"] if p in query_lower)
        
        score = (keyword_matches * 0.3 + pattern_matches * 0.5) * signals["weight"]
        
        if score > 0:
            scores[decision_type] = min(score / 2, 1.0)
    
    if not scores:
        return "neutral", 0.5
    
    best_decision = max(scores, key=scores.get)
    confidence = min(scores[best_decision] * 2, 1.0)
    
    return best_decision, confidence


def _calculate_engagement(
    query: str,
    mood: str,
    decision: str,
    has_history: bool
) -> int:
    """
    Berechnet das Engagement-Level (1-5) mit erweiterten Faktoren.
    
    Engagement-Faktoren:
        - Nachrichtenlänge
        - Fragezeichen (Neugier)
        - Ausrufezeichen (Emotion)
        - Spezifische Keywords (Detail-Interesse)
        - Mood & Decision
        - Konversationshistorie
    
    Args:
        query: Die Anfrage
        mood: Erkannte Stimmung
        decision: Erkannte Entscheidungstendenz
        has_history: Gibt es Konversationshistorie?
        
    Returns:
        Engagement Level 1-5
    """
    engagement_score = 0.0  # Floating point für präzisere Berechnung
    query_lower = query.lower()
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 1: Nachrichtenlänge (max +1.0, min -1.5)
    # ═══════════════════════════════════════════════════════════════════════
    length = len(query)
    if length > 200:
        engagement_score += 1.0  # Sehr detailliert
    elif length > 100:
        engagement_score += 0.7  # Ausführlich
    elif length > 50:
        engagement_score += 0.4  # Normal
    elif length > 20:
        engagement_score += 0.0  # Kurz
    elif length > 10:
        engagement_score -= 0.8  # Sehr kurz
    else:
        engagement_score -= 1.5  # Einsilbig = sehr wenig Engagement
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 2: Interpunktion & Formatierung (max +0.8)
    # ═══════════════════════════════════════════════════════════════════════
    question_count = query.count("?")
    exclamation_count = query.count("!")
    
    if question_count >= 2:
        engagement_score += 0.5  # Mehrere Fragen = hohes Interesse
    elif question_count == 1:
        engagement_score += 0.3
    
    if exclamation_count >= 1:
        engagement_score += 0.3  # Emotion/Begeisterung
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 3: Detail-Keywords (max +0.8)
    # ═══════════════════════════════════════════════════════════════════════
    high_interest_keywords = [
        "genau", "konkret", "spezifisch", "wie genau", "was genau",
        "erzähl mir mehr", "erkläre", "zeig mir", "beispiel",
        "preis", "kosten", "wann", "wie lange", "termin",
        "studie", "beweis", "zahlen", "statistik"
    ]
    
    disinterest_keywords = [
        "egal", "keine ahnung", "weiß nicht", "mir egal",
        "ist ok", "passt schon", "whatever", "nee", "nö", "ne"
    ]
    
    interest_matches = sum(1 for kw in high_interest_keywords if kw in query_lower)
    disinterest_matches = sum(1 for kw in disinterest_keywords if kw in query_lower)
    
    engagement_score += min(interest_matches * 0.2, 0.8)
    engagement_score -= min(disinterest_matches * 0.5, 1.0)  # Stärkere Gewichtung
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 4: Aktionswörter (max +0.6)
    # ═══════════════════════════════════════════════════════════════════════
    action_keywords = [
        "will", "möchte", "brauche", "suche", "plane",
        "muss", "soll", "kann ich", "wie kann ich"
    ]
    action_matches = sum(1 for kw in action_keywords if kw in query_lower)
    engagement_score += min(action_matches * 0.2, 0.6)
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 5: Mood-basierte Anpassung (max +1.0)
    # ═══════════════════════════════════════════════════════════════════════
    mood_modifiers = {
        "positiv": 0.8,
        "skeptisch": 0.3,  # Skeptisch = kritisches Interesse
        "vorsichtig": 0.2,
        "neutral": 0.0,
        "frustriert": -0.2,
        "gestresst": -0.5,
        "überfordert": -0.3
    }
    engagement_score += mood_modifiers.get(mood, 0.0)
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 6: Decision-basierte Anpassung (max +0.8)
    # ═══════════════════════════════════════════════════════════════════════
    decision_modifiers = {
        "close_to_yes": 1.0,
        "on_hold": 0.2,
        "neutral": 0.0,
        "close_to_no": -0.5
    }
    engagement_score += decision_modifiers.get(decision, 0.0)
    
    # ═══════════════════════════════════════════════════════════════════════
    # FAKTOR 7: Konversationshistorie (max +0.5)
    # ═══════════════════════════════════════════════════════════════════════
    if has_history:
        engagement_score += 0.5  # Bleibt dran = Interesse
    
    # ═══════════════════════════════════════════════════════════════════════
    # KONVERTIERUNG ZU 1-5 SKALA
    # ═══════════════════════════════════════════════════════════════════════
    # Mapping: -1.5 bis +4.5 → 1 bis 5
    # Baseline: 0 → 3 (mittel)
    
    engagement = 3.0 + engagement_score
    engagement = max(1, min(5, round(engagement)))  # Clamp to 1-5
    
    return int(engagement)


def _determine_tone_hint(
    mood: str,
    decision: str,
    objection_type: Optional[str],
    vertical: Optional[str]
) -> str:
    """
    Bestimmt den optimalen Ton für die Antwort.
    
    Args:
        mood: Erkannte Stimmung
        decision: Erkannte Entscheidungstendenz
        objection_type: Einwand-Typ
        vertical: Branche
        
    Returns:
        Ton-Hinweis
    """
    # Mood-basierte Defaults
    tone_map = {
        "gestresst": "reassuring",
        "skeptisch": "evidence_based",
        "positiv": "direct",
        "vorsichtig": "neutral",
        "neutral": "neutral"
    }
    
    base_tone = tone_map.get(mood, "neutral")
    
    # Objection-Override (hat Priorität)
    if objection_type == "price":
        return "value_focused"
    elif objection_type in ("trust", "bad_experience"):
        return "evidence_based"
    elif objection_type == "time":
        return "reassuring"
    
    # Decision-Override
    if decision == "close_to_yes":
        return "direct"  # Momentum nutzen
    elif decision == "close_to_no":
        return "reassuring"  # Nicht aufgeben, aber sanft
    
    # Vertical-spezifische Anpassungen
    if vertical == "real_estate":
        if mood == "neutral":
            return "value_focused"  # Immobilien: immer Wert betonen
    elif vertical == "health_wellness":
        if mood != "positiv":
            return "evidence_based"  # Gesundheit: immer mit Beweisen
    elif vertical == "financial_services":
        return "neutral"  # Finanzen: sachlich bleiben
    
    return base_tone


# =============================================================================
# TONE INSTRUCTIONS
# =============================================================================

TONE_INSTRUCTIONS = {
    "neutral": """
Nutze einen neutralen, klaren Ton ohne viel Emotion.
Fokus auf Verständlichkeit.
Normale Länge, sachlich.
""",
    
    "direct": """
Formuliere kurz und auf den Punkt.
Entferne Weichmacher ("vielleicht", "eventuell", "könnte").
Max 2 Sätze wenn möglich.
Momentum nutzen, nicht zögern.
Klare Handlungsaufforderung.
""",
    
    "reassuring": """
Formuliere ruhig und verständnisvoll.
Zeige Verständnis für die Situation.
Nimm Druck raus ("Kein Stress", "Ganz in Ruhe", "Alles in deinem Tempo").
Biete einfache, kleine nächste Schritte an.
Sei geduldig und empathisch.
""",
    
    "value_focused": """
Stelle den Wert/Nutzen in den Vordergrund, NICHT den Preis.
Nutze Vergleiche ("weniger als ein Kaffee pro Tag", "kostet dich X, spart dir Y").
Betone ROI, Ergebnisse, messbare Vorteile.
Vermeide Preis-Rechtfertigung.
Zeige auf, was der Kontakt GEWINNT, nicht was er ZAHLT.
""",
    
    "evidence_based": """
Beziehe dich auf Daten, Studien, messbare Effekte.
Nutze vorsichtige Formulierungen ("kann unterstützen", "Studien zeigen", "Daten deuten darauf hin").
Biete Beweise an (Tests, Testimonials, Zahlen).
Keine Übertreibungen, keine Garantien.
Zeige Transparenz und Ehrlichkeit.
"""
}


def get_tone_instruction(tone_hint: str) -> str:
    """
    Holt die Ton-Anweisung für den Prompt.
    
    Args:
        tone_hint: Der Ton-Hinweis
        
    Returns:
        Ton-Anweisung als String
    """
    return TONE_INSTRUCTIONS.get(tone_hint, TONE_INSTRUCTIONS["neutral"])


# =============================================================================
# EMOTION SUMMARY FOR COACH
# =============================================================================

def summarize_emotions_for_coach(
    mood_counts: Dict[str, int],
    decision_counts: Dict[str, int],
    vertical: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Erstellt Coach-Tipps basierend auf Emotions-Patterns.
    
    Args:
        mood_counts: Anzahl pro Mood-Typ
        decision_counts: Anzahl pro Decision-Typ
        vertical: Branche
        
    Returns:
        Liste von Coach-Tipps
    """
    tips = []
    total_moods = sum(mood_counts.values()) or 1
    total_decisions = sum(decision_counts.values()) or 1
    
    # Helper
    def share(counts: Dict[str, int], key: str) -> float:
        return (counts.get(key, 0) / total_moods * 100)
    
    def share_dec(counts: Dict[str, int], key: str) -> float:
        return (counts.get(key, 0) / total_decisions * 100)
    
    # 1. Gestresste Kontakte
    stress_share = share(mood_counts, "gestresst")
    if stress_share >= 40:
        tips.append({
            "id": "high_stress",
            "title": "Viele gestresste Kontakte – Intro anpassen",
            "description": f"Etwa {round(stress_share)}% deiner Kontakte wirken gestresst. "
                          f"Teste kürzere, entlastende Einstiege wie: "
                          f"'Ich weiß, du hast viel um die Ohren – ich halt's kurz.'",
            "priority": "high",
            "action_type": "script_change"
        })
    
    # 2. Hohe Skepsis
    skeptic_share = share(mood_counts, "skeptisch")
    if skeptic_share >= 30:
        tips.append({
            "id": "high_skepticism",
            "title": "Viele skeptische Kontakte – mehr Beweise",
            "description": f"Etwa {round(skeptic_share)}% deiner Kontakte sind skeptisch. "
                          f"Nutze mehr evidenzbasierte Antworten (Tests, Studien, Testimonials) "
                          f"und weniger 'Hype'.",
            "priority": "high",
            "action_type": "script_change"
        })
    
    # 3. Viele "on hold"
    on_hold_share = share_dec(decision_counts, "on_hold")
    if on_hold_share >= 35:
        tips.append({
            "id": "high_on_hold",
            "title": "Viele Deals bleiben auf 'mal schauen'",
            "description": f"Rund {round(on_hold_share)}% deiner Kontakte landen auf 'ich überlege noch'. "
                          f"Vereinbare konkrete nächste Schritte statt 'meld dich einfach'.",
            "priority": "medium",
            "action_type": "follow_up"
        })
    
    # 4. Close-to-yes aber nicht geclosed
    close_yes_share = share_dec(decision_counts, "close_to_yes")
    if close_yes_share >= 30 and on_hold_share >= 25:
        tips.append({
            "id": "closing_opportunity",
            "title": "Viele Interessenten kurz vor Ja – aktiver closen",
            "description": "Du hast viele Interessenten kurz vor Ja, die dann doch zögern. "
                          "Baue früher klare nächste Schritte ein.",
            "priority": "high",
            "action_type": "training"
        })
    
    # 5. Vertical-spezifisch: Network Marketing
    if vertical == "network_marketing" and skeptic_share >= 25:
        tips.append({
            "id": "mlm_skepticism",
            "title": "MLM-Skepsis aktiv adressieren",
            "description": "Viele deiner Kontakte sind skeptisch gegenüber dem Geschäftsmodell. "
                          "Trenne früh Produkt-Nutzen von Business-Opportunity.",
            "priority": "high",
            "action_type": "training"
        })
    
    # 6. Vertical-spezifisch: Real Estate
    if vertical == "real_estate" and close_yes_share >= 30:
        tips.append({
            "id": "re_closing",
            "title": "Immobilien: Concrete Next Steps",
            "description": "Bei Immobilien sind konkrete Schritte wichtig: "
                          "Zweitbesichtigung, Bankunterlagen, Notartermin. "
                          "Biete immer den nächsten konkreten Schritt an.",
            "priority": "high",
            "action_type": "training"
        })
    
    return tips


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "EmotionAnalysis",
    "analyze_emotion",
    "get_tone_instruction",
    "get_engagement_recommendation",
    "summarize_emotions_for_coach",
    "MOOD_SIGNALS",
    "DECISION_SIGNALS",
    "TONE_INSTRUCTIONS",
    "ENGAGEMENT_DESCRIPTORS",
]

