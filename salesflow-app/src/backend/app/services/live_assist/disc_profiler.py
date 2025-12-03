"""
================================================================================
DISC NEURO-PROFILER
================================================================================

Erkennt den Kunden-Typ (DISC) basierend auf Kommunikationsmustern und
passt die Tonalität automatisch an.

DISC-Typen:
    D = Dominant (Macher) - direkt, ergebnisorientiert
    I = Initiativ (Entertainer) - enthusiastisch, beziehungsorientiert
    S = Stetig (Teamplayer) - ruhig, harmoniebedürftig
    C = Gewissenhaft (Analytiker) - detailorientiert, vorsichtig

================================================================================
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# DISC TYPES
# =============================================================================

class DISCType(Enum):
    DOMINANT = "D"
    INITIATIVE = "I"
    STEADY = "S"
    CONSCIENTIOUS = "C"
    UNKNOWN = "?"


@dataclass
class DISCProfile:
    """Erkanntes DISC-Profil eines Kontakts."""
    
    primary_type: DISCType
    secondary_type: Optional[DISCType]
    scores: Dict[str, float]  # D, I, S, C scores (0-1)
    confidence: float
    signals_detected: List[str]
    communication_style: str
    tone_recommendation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "primary_type": self.primary_type.value,
            "secondary_type": self.secondary_type.value if self.secondary_type else None,
            "scores": self.scores,
            "confidence": self.confidence,
            "signals_detected": self.signals_detected,
            "communication_style": self.communication_style,
            "tone_recommendation": self.tone_recommendation,
        }


# =============================================================================
# DETECTION SIGNALS
# =============================================================================

DISC_SIGNALS = {
    DISCType.DOMINANT: {
        "keywords": [
            # Direktheit
            "schnell", "sofort", "jetzt", "ergebnis", "bottom line",
            "kurz", "knapp", "punkt", "ohne umschweife",
            # Kontrolle
            "ich will", "ich brauche", "zeig mir", "was bringt",
            "ergebnis", "resultat", "outcome", "roi",
            # Ungeduld
            "komm zum punkt", "keine zeit", "schneller", "weiter"
        ],
        "patterns": [
            "was kostet", "was bringt mir", "wie schnell", "wann fertig",
            "kurz und knapp", "ohne blabla", "konkret bitte",
            "entscheidung jetzt", "deal oder nicht"
        ],
        "behaviors": [
            "short_messages",  # Kurze Nachrichten
            "interrupts",       # Unterbricht
            "demands_answers",  # Fordert Antworten
            "uses_imperatives"  # Benutzt Imperative
        ],
        "weight": 1.0
    },
    DISCType.INITIATIVE: {
        "keywords": [
            # Begeisterung
            "super", "toll", "cool", "mega", "krass", "geil", "wow",
            "fantastisch", "unglaublich", "genial",
            # Beziehung
            "leute", "freunde", "team", "zusammen", "gemeinsam",
            # Stories
            "erzähl", "story", "erlebnis", "letzte woche", "kennst du"
        ],
        "patterns": [
            "das ist ja", "stell dir vor", "weißt du was",
            "ich kenn jemanden", "ein freund von mir", "hab ich gehört",
            "so aufregend", "das musst du hören"
        ],
        "behaviors": [
            "long_messages",    # Lange Nachrichten
            "uses_emojis",      # Viele Emojis
            "tells_stories",    # Erzählt Geschichten
            "jumps_topics"      # Springt zwischen Themen
        ],
        "weight": 1.0
    },
    DISCType.STEADY: {
        "keywords": [
            # Harmonie
            "team", "zusammen", "gemeinsam", "alle", "wir",
            "sicher", "stabil", "verlässlich", "vertrauen",
            # Vorsicht
            "langsam", "schritt für schritt", "erstmal", "mal sehen",
            "in ruhe", "ohne stress"
        ],
        "patterns": [
            "lass mich überlegen", "ich schau mal", "kein stress",
            "alles in ruhe", "muss ich erst", "mit meinem team",
            "was meinen die anderen", "alle mitnehmen"
        ],
        "behaviors": [
            "asks_for_time",    # Bittet um Zeit
            "avoids_conflict",  # Vermeidet Konflikt
            "mentions_team",    # Erwähnt Team/Familie
            "seeks_consensus"   # Sucht Konsens
        ],
        "weight": 1.0
    },
    DISCType.CONSCIENTIOUS: {
        "keywords": [
            # Analytik
            "daten", "zahlen", "fakten", "statistik", "prozent",
            "studie", "forschung", "beweis", "evidenz",
            # Detail
            "genau", "präzise", "detail", "spezifisch", "konkret",
            # Skepsis
            "aber", "jedoch", "allerdings", "wie genau", "warum genau"
        ],
        "patterns": [
            "wie funktioniert das genau", "zeig mir die zahlen",
            "welche studien", "wo steht das", "hast du daten",
            "was ist mit", "und wenn", "aber was passiert wenn"
        ],
        "behaviors": [
            "asks_many_questions",  # Viele Detail-Fragen
            "requests_docs",        # Fordert Dokumente
            "points_out_risks",     # Zeigt Risiken auf
            "needs_time"           # Braucht Bedenkzeit
        ],
        "weight": 1.0
    }
}


# =============================================================================
# COMMUNICATION STYLES
# =============================================================================

COMMUNICATION_STYLES = {
    DISCType.DOMINANT: {
        "name": "Direkt & Ergebnisorientiert",
        "description": "Kurz, knapp, auf den Punkt. ROI und Ergebnisse zuerst.",
        "do": [
            "Komm sofort zum Punkt",
            "Zeig Ergebnisse und ROI",
            "Biete Optionen an",
            "Sei selbstbewusst"
        ],
        "dont": [
            "Keine langen Einleitungen",
            "Nicht zu viele Details",
            "Nicht emotional argumentieren",
            "Nicht zögerlich wirken"
        ],
        "opening": "3 Zahlen, die für dich relevant sind...",
        "tone": "direct"
    },
    DISCType.INITIATIVE: {
        "name": "Enthusiastisch & Persönlich",
        "description": "Begeistert, Stories erzählen, Beziehung aufbauen.",
        "do": [
            "Sei begeistert",
            "Erzähle Stories",
            "Mach es persönlich",
            "Zeig die Vision"
        ],
        "dont": [
            "Nicht zu viele Zahlen",
            "Nicht trocken und sachlich",
            "Nicht unpersönlich",
            "Nicht zu detailliert"
        ],
        "opening": "Ich hab letzte Woche mit einem Kunden gesprochen...",
        "tone": "enthusiastic"
    },
    DISCType.STEADY: {
        "name": "Ruhig & Vertrauensvoll",
        "description": "Geduldig, Sicherheit betonen, keinen Druck machen.",
        "do": [
            "Gib Zeit zum Nachdenken",
            "Betone Sicherheit",
            "Schritt für Schritt erklären",
            "Zeig Stabilität"
        ],
        "dont": [
            "Nicht drängen",
            "Nicht aggressiv verkaufen",
            "Keine schnellen Entscheidungen fordern",
            "Nicht ungeduldig wirken"
        ],
        "opening": "Ich zeig dir erstmal in Ruhe, wie das funktioniert...",
        "tone": "reassuring"
    },
    DISCType.CONSCIENTIOUS: {
        "name": "Präzise & Faktenbasiert",
        "description": "Zahlen, Daten, Fakten. Logisch und detailliert.",
        "do": [
            "Bring Zahlen und Daten",
            "Sei präzise",
            "Biete Dokumentation an",
            "Argumentiere logisch"
        ],
        "dont": [
            "Nicht übertreiben",
            "Nicht emotional verkaufen",
            "Details nicht überspringen",
            "Keine vagen Aussagen"
        ],
        "opening": "Die wichtigsten Zahlen im Überblick...",
        "tone": "evidence_based"
    }
}


# =============================================================================
# PROFILER ENGINE
# =============================================================================

def profile_disc(
    messages: List[str],
    context: Optional[Dict[str, Any]] = None
) -> DISCProfile:
    """
    Analysiert Nachrichten und erstellt ein DISC-Profil.
    
    Args:
        messages: Liste von Nachrichten des Kontakts
        context: Optionaler Kontext (z.B. bisherige Interaktionen)
        
    Returns:
        DISCProfile mit erkanntem Typ und Empfehlungen
    """
    if not messages:
        return DISCProfile(
            primary_type=DISCType.UNKNOWN,
            secondary_type=None,
            scores={"D": 0, "I": 0, "S": 0, "C": 0},
            confidence=0.0,
            signals_detected=[],
            communication_style="neutral",
            tone_recommendation="neutral"
        )
    
    # Kombiniere alle Nachrichten
    combined_text = " ".join(messages).lower()
    
    # Berechne Scores pro Typ
    scores = {}
    signals_found = []
    
    for disc_type, signals in DISC_SIGNALS.items():
        score = 0.0
        
        # Keyword-Matching
        keyword_matches = sum(1 for kw in signals["keywords"] if kw in combined_text)
        score += keyword_matches * 0.1
        
        # Pattern-Matching
        pattern_matches = sum(1 for p in signals["patterns"] if p in combined_text)
        score += pattern_matches * 0.15
        
        # Behavior-Analyse
        behavior_score = _analyze_behaviors(messages, signals["behaviors"])
        score += behavior_score * 0.2
        
        # Normalisieren
        scores[disc_type.value] = min(score * signals["weight"], 1.0)
        
        # Signale sammeln
        if keyword_matches > 0:
            signals_found.append(f"{disc_type.value}: {keyword_matches} keywords")
        if pattern_matches > 0:
            signals_found.append(f"{disc_type.value}: {pattern_matches} patterns")
    
    # Primären und sekundären Typ bestimmen
    sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    primary_value = sorted_types[0][0]
    primary_type = DISCType(primary_value)
    
    secondary_type = None
    if len(sorted_types) > 1 and sorted_types[1][1] > 0.2:
        secondary_type = DISCType(sorted_types[1][0])
    
    # Confidence berechnen
    max_score = sorted_types[0][1] if sorted_types else 0
    second_score = sorted_types[1][1] if len(sorted_types) > 1 else 0
    confidence = min(max_score * 2, 1.0) * (1 - (second_score / max(max_score, 0.01)) * 0.3)
    
    # Kommunikationsstil
    style_info = COMMUNICATION_STYLES.get(primary_type, COMMUNICATION_STYLES[DISCType.STEADY])
    
    return DISCProfile(
        primary_type=primary_type,
        secondary_type=secondary_type,
        scores=scores,
        confidence=confidence,
        signals_detected=signals_found,
        communication_style=style_info["name"],
        tone_recommendation=style_info["tone"]
    )


def _analyze_behaviors(messages: List[str], behaviors: List[str]) -> float:
    """
    Analysiert Verhaltensmerkmale in den Nachrichten.
    
    Args:
        messages: Nachrichten-Liste
        behaviors: Zu prüfende Verhaltensmerkmale
        
    Returns:
        Score 0-1
    """
    score = 0.0
    
    for msg in messages:
        # Short messages (< 50 chars)
        if "short_messages" in behaviors and len(msg) < 50:
            score += 0.1
        
        # Long messages (> 200 chars)
        if "long_messages" in behaviors and len(msg) > 200:
            score += 0.1
        
        # Uses emojis
        if "uses_emojis" in behaviors:
            emoji_count = sum(1 for c in msg if ord(c) > 127)
            if emoji_count > 0:
                score += 0.05 * min(emoji_count, 5)
        
        # Uses imperatives
        if "uses_imperatives" in behaviors:
            imperatives = ["zeig", "gib", "sag", "mach", "schick"]
            if any(imp in msg.lower() for imp in imperatives):
                score += 0.1
        
        # Asks many questions
        if "asks_many_questions" in behaviors:
            question_count = msg.count("?")
            if question_count >= 2:
                score += 0.15
        
        # Asks for time
        if "asks_for_time" in behaviors:
            time_phrases = ["später", "überlegen", "zeit", "ruhe"]
            if any(tp in msg.lower() for tp in time_phrases):
                score += 0.1
    
    return min(score, 1.0)


# =============================================================================
# PROMPT ADAPTATION
# =============================================================================

def get_disc_system_instruction(profile: DISCProfile) -> str:
    """
    Generiert System-Instruktionen basierend auf DISC-Profil.
    
    Args:
        profile: Erkanntes DISC-Profil
        
    Returns:
        System-Instruktion für den Prompt
    """
    style = COMMUNICATION_STYLES.get(
        profile.primary_type, 
        COMMUNICATION_STYLES[DISCType.STEADY]
    )
    
    instruction = f"""
## DISC-Profil des Kontakts: {profile.primary_type.value} ({style['name']})

### Kommunikationsstil:
{style['description']}

### TU DAS:
{chr(10).join('- ' + item for item in style['do'])}

### VERMEIDE DAS:
{chr(10).join('- ' + item for item in style['dont'])}

### Empfohlener Einstieg:
"{style['opening']}"

### Ton:
Nutze einen **{profile.tone_recommendation}** Ton.
"""
    
    if profile.secondary_type:
        secondary_style = COMMUNICATION_STYLES.get(profile.secondary_type)
        if secondary_style:
            instruction += f"""
### Sekundärer Typ: {profile.secondary_type.value}
Berücksichtige auch Aspekte von: {secondary_style['name']}
"""
    
    return instruction


# =============================================================================
# QUICK PROFILER
# =============================================================================

def quick_profile(message: str) -> Tuple[str, str]:
    """
    Schnelle DISC-Einschätzung für eine einzelne Nachricht.
    
    Args:
        message: Die Nachricht
        
    Returns:
        Tuple von (DISC-Typ-Buchstabe, Ton-Empfehlung)
    """
    profile = profile_disc([message])
    return profile.primary_type.value, profile.tone_recommendation


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "DISCType",
    "DISCProfile",
    "profile_disc",
    "quick_profile",
    "get_disc_system_instruction",
    "DISC_SIGNALS",
    "COMMUNICATION_STYLES",
]

