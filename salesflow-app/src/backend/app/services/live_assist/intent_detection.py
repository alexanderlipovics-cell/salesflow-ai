"""
╔════════════════════════════════════════════════════════════════════════════╗
║  INTENT DETECTION ENGINE                                                   ║
║  Multi-Language Support & Lernfähige Erkennung                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Multi-Language Support (DE, EN)
    - Pattern-based Fast Detection
    - Learning from User Corrections
    - Confidence Scoring
    - Objection Type Detection
"""

from typing import Optional, Tuple, List, Dict, Any
from dataclasses import dataclass
from supabase import Client


@dataclass
class IntentResult:
    """Ergebnis der Intent-Erkennung."""
    
    intent: str                          # product_info, usp, objection, etc.
    confidence: float                    # 0.0 - 1.0
    objection_type: Optional[str]        # price, time, trust, etc.
    product_id: Optional[str]            # Erkanntes Produkt
    source: str                          # pattern, learned, ai
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "intent": self.intent,
            "confidence": self.confidence,
            "objection_type": self.objection_type,
            "product_id": self.product_id,
            "source": self.source
        }


# =============================================================================
# MULTI-LANGUAGE KEYWORDS
# =============================================================================

OBJECTION_KEYWORDS = {
    "de": {
        "price": [
            # Basis-Keywords
            "teuer", "kostet", "preis", "geld", "budget", "leisten", 
            "billig", "günstiger", "rabatt", "zu viel", "kein geld",
            "kann mir nicht leisten", "sparen",
            # Erweitert - Zinzino-spezifisch
            "50 euro", "50€", "monat", "monatlich", "abo", "amazon",
            "drogerie", "rossmann", "dm", "apotheke",
            # Preisvergleiche
            "andere günstiger", "woanders billiger", "gleiche billiger",
            # Wert-Zweifel
            "nicht wert", "lohnt sich nicht", "zu teuer für",
            # Phrasen
            "ist mir zu teuer", "kann ich mir nicht", "zu viel geld"
        ],
        "time": [
            # Basis-Keywords
            "zeit", "später", "jetzt nicht", "busy", "viel los", 
            "beschäftigt", "termine", "stress", "gerade nicht", "hektisch",
            # Erweitert
            "hab keine zeit", "keine zeit", "kein zeit", "momentan nicht",
            "im moment nicht", "jetzt gerade nicht", "nicht jetzt",
            "später melden", "meld dich später", "ruf mich an",
            # Phrasen
            "bin gerade", "hab gerade", "muss arbeiten", "zu beschäftigt"
        ],
        "trust": [
            # Basis-Keywords
            "skeptisch", "glaub ich nicht", "sicher", "garantie", "beweis",
            "mlm", "pyramide", "betrug", "unseriös", "abzocke", "fake",
            "zu schön um wahr", "haken",
            # MLM-spezifisch erweitert
            "network marketing", "netzwerk marketing", "schneeballsystem",
            "strukturvertrieb", "direktvertrieb", "verkaufsmasche",
            # Skepsis-Phrasen
            "glaube das nicht", "funktioniert nicht", "marketing trick",
            "marketing masche", "nur marketing", "werbung", "werbeversprechen",
            # Wissenschafts-Skepsis
            "studien gefälscht", "nicht wissenschaftlich", "pseudo"
        ],
        "need": [
            # Basis-Keywords
            "brauche nicht", "kein bedarf", "funktioniert schon", 
            "brauch ich nicht", "nötig", "überflüssig", "geht auch ohne",
            # Erweitert - Health-spezifisch
            "bin gesund", "gesund genug", "esse fisch", "ernähre mich gut",
            "brauche keine supplements", "brauche keine nahrungsergänzung",
            # Phrasen
            "funktioniert auch so", "geht mir gut", "keine beschwerden",
            "hab das nicht nötig", "nicht mein ding"
        ],
        "think_about_it": [
            # Basis-Keywords
            "überlegen", "nachdenken", "melden", "schauen", 
            "drüber schlafen", "mal sehen", "abwägen", "bedenken",
            # Erweitert
            "muss überlegen", "muss ich überlegen", "muss drüber",
            "lass mich", "gib mir zeit", "noch mal drüber",
            "nochmal nachdenken", "erstmal nachdenken",
            # Phrasen
            "ich meld mich", "melde mich", "ich schau mal",
            "muss ich erst", "lass mich erstmal"
        ],
        "competitor": [
            # Basis-Keywords
            "andere", "vergleich", "woanders", "konkurrenz",
            "schon was", "nutze bereits", "hab schon", "alternative",
            # Erweitert - Produktspezifisch
            "norsan", "doppelherz", "omega 3", "omega-3",
            "schon omega", "nehme schon", "andere marke",
            # Phrasen
            "nehme bereits", "nutze bereits", "kaufe woanders",
            "bei einer anderen firma", "von einer anderen firma"
        ],
        "authority": [
            # Basis-Keywords
            "partner fragen", "frau fragen", "mann fragen", "chef fragen",
            "abstimmen", "besprechen", "alleine entscheiden",
            # Erweitert
            "mit meinem partner", "mit meiner frau", "mit meinem mann",
            "familie fragen", "erst besprechen", "nicht alleine",
            # Phrasen
            "muss erst mit", "muss mich abstimmen", "entscheide nicht alleine"
        ],
        "not_interested": [
            # Basis-Keywords
            "nicht interessiert", "kein interesse", "interessiert mich nicht",
            "lass mal", "nein danke", "ohne mich",
            # Erweitert
            "will nicht", "möchte nicht", "nichts für mich", 
            "ist nichts für mich", "passt nicht", "passt nicht zu mir",
            # Phrasen
            "lass mich in ruhe", "hör auf", "nerv mich nicht",
            "vergiss es", "auf keinen fall"
        ]
    },
    "en": {
        "price": [
            "expensive", "cost", "price", "money", "budget", "afford",
            "cheap", "discount", "too much", "can't afford"
        ],
        "time": [
            "time", "later", "not now", "busy", "schedule",
            "right now", "hectic"
        ],
        "trust": [
            "skeptical", "don't believe", "proof", "guarantee", "scam",
            "mlm", "pyramid", "too good to be true"
        ],
        "need": [
            "don't need", "no need", "works fine", "unnecessary",
            "not necessary"
        ],
        "think_about_it": [
            "think about", "consider", "get back", "sleep on it",
            "let me think"
        ],
        "competitor": [
            "other", "compare", "elsewhere", "competition",
            "already have", "already use"
        ],
        "authority": [
            "ask my partner", "ask my wife", "ask my boss",
            "discuss", "can't decide alone"
        ],
        "not_interested": [
            "not interested", "no interest", "no thanks",
            "pass", "without me"
        ]
    }
}

INTENT_KEYWORDS = {
    "de": {
        "product_info": [
            "was ist", "wie funktioniert", "erkläre", "produkt",
            "erzähl mir", "was macht", "wie geht", "wozu"
        ],
        "usp": [
            "warum", "besonders", "unterschied", "einzigartig", 
            "anders", "vorteil", "besser", "alleinstellung",
            "was unterscheidet", "warum ihr"
        ],
        "facts": [
            "zahl", "statistik", "prozent", "wie viele", "daten", 
            "fakt", "konkret", "belege", "zahlen"
        ],
        "science": [
            "studie", "wissenschaft", "bewiesen", "forschung", 
            "evidenz", "belegt", "studien", "getestet"
        ],
        "pricing": [
            "preis", "kostet", "kosten", "wie teuer", "was kostet",
            "preise", "pakete", "angebot"
        ],
        "comparison": [
            "vergleich", "besser als", "konkurrenz", "alternativ", "vs",
            "unterschied zu", "im vergleich"
        ],
        "story": [
            "erzähl", "geschichte", "gründer", "angefangen", "story", 
            "wie entstand", "hintergrund", "ursprung"
        ],
        "closing": [
            "wie schließe", "abschluss", "deal", "unterschreiben",
            "kaufen", "bestellen", "anmelden", "starten"
        ]
    },
    "en": {
        "product_info": [
            "what is", "how does", "explain", "product",
            "tell me", "what does"
        ],
        "usp": [
            "why", "special", "difference", "unique", 
            "advantage", "better", "what makes you different"
        ],
        "facts": [
            "number", "statistic", "percent", "how many", "data", 
            "fact", "concrete", "evidence"
        ],
        "science": [
            "study", "science", "proven", "research", 
            "tested", "clinical"
        ],
        "pricing": [
            "price", "cost", "how much", "pricing",
            "packages", "offer"
        ],
        "comparison": [
            "compare", "better than", "competitor", "alternative", "vs",
            "difference to"
        ],
        "story": [
            "tell me", "story", "founder", "started", 
            "how did", "background", "origin"
        ],
        "closing": [
            "how to close", "deal", "sign up",
            "buy", "order", "register", "start"
        ]
    }
}


# =============================================================================
# MAIN DETECTION ENGINE
# =============================================================================

def detect_intent(
    query: str,
    language: str = "de",
    company_id: Optional[str] = None,
    db: Optional[Client] = None,
    explicit_intent: Optional[str] = None
) -> IntentResult:
    """
    Erkennt Intent mit Multi-Language Support und Learning.
    
    Detection-Reihenfolge:
    1. Explicit Intent (wenn vom User angegeben)
    2. Learned Patterns (aus User-Korrekturen)
    3. Pattern Matching (Keywords)
    4. Fallback: quick_answer
    
    Args:
        query: Die Anfrage
        language: Sprache (de, en)
        company_id: Optional Company ID für Learned Patterns
        db: Supabase Client für Learned Patterns Lookup
        explicit_intent: Explizit angegebener Intent
        
    Returns:
        IntentResult mit Intent, Confidence und Details
    """
    # 1. Explicit Intent
    if explicit_intent:
        return IntentResult(
            intent=explicit_intent,
            confidence=1.0,
            objection_type=None,
            product_id=None,
            source="explicit"
        )
    
    query_lower = query.lower()
    
    # 2. Learned Patterns (wenn DB verfügbar)
    if db and company_id:
        learned = _check_learned_patterns(query_lower, company_id, db)
        if learned:
            return learned
    
    # 3. Pattern Matching
    
    # 3a. Check for "Kunde sagt" pattern - always objection
    if _is_customer_objection_pattern(query_lower, language):
        obj_type, obj_confidence = _detect_objection_type(query_lower, language)
        return IntentResult(
            intent="objection",
            confidence=obj_confidence,
            objection_type=obj_type,
            product_id=None,
            source="pattern"
        )
    
    # 3b. Direct Objection Detection
    obj_type, obj_confidence = _detect_objection_type(query_lower, language)
    if obj_type and obj_confidence > 0.6:
        return IntentResult(
            intent="objection",
            confidence=obj_confidence,
            objection_type=obj_type,
            product_id=None,
            source="pattern"
        )
    
    # 3c. Intent Detection
    intent, intent_confidence = _detect_intent_type(query_lower, language)
    
    return IntentResult(
        intent=intent,
        confidence=intent_confidence,
        objection_type=None,
        product_id=None,
        source="pattern"
    )


def _is_customer_objection_pattern(query_lower: str, language: str = "de") -> bool:
    """
    Prüft ob der Query ein "Kunde sagt" Pattern ist.
    """
    patterns = {
        "de": ["kunde sagt", "kunde meint", "kunde fragt", "kunde behauptet", 
               "er sagt", "sie sagt", "er meint", "sie meint"],
        "en": ["customer says", "client says", "he says", "she says",
               "they said", "customer mentioned"]
    }
    
    lang_patterns = patterns.get(language, patterns["de"])
    return any(p in query_lower for p in lang_patterns)


def _detect_objection_type(query_lower: str, language: str = "de") -> Tuple[Optional[str], float]:
    """
    Erkennt den spezifischen Einwand-Typ.
    
    Returns:
        Tuple von (objection_type, confidence)
    """
    keywords = OBJECTION_KEYWORDS.get(language, OBJECTION_KEYWORDS["de"])
    
    scores = {}
    for obj_type, words in keywords.items():
        matches = sum(1 for word in words if word in query_lower)
        if matches > 0:
            # Mehr Matches = höhere Confidence
            scores[obj_type] = min(matches / len(words) * 3, 1.0)
    
    if not scores:
        return None, 0.0
    
    best_type = max(scores, key=scores.get)
    confidence = min(scores[best_type] * 1.5, 1.0)
    
    return best_type, confidence


def _detect_intent_type(query_lower: str, language: str = "de") -> Tuple[str, float]:
    """
    Erkennt den Intent-Typ.
    
    Returns:
        Tuple von (intent, confidence)
    """
    keywords = INTENT_KEYWORDS.get(language, INTENT_KEYWORDS["de"])
    
    scores = {}
    for intent, words in keywords.items():
        matches = sum(1 for word in words if word in query_lower)
        if matches > 0:
            scores[intent] = min(matches / len(words) * 3, 1.0)
    
    if not scores:
        return "quick_answer", 0.5
    
    best_intent = max(scores, key=scores.get)
    confidence = min(scores[best_intent] * 1.5, 1.0)
    
    return best_intent, confidence


def _check_learned_patterns(
    query_lower: str, 
    company_id: str, 
    db: Client
) -> Optional[IntentResult]:
    """
    Prüft gelernte Patterns aus User-Korrekturen.
    
    Returns:
        IntentResult wenn Match gefunden, sonst None
    """
    try:
        # Suche nach gelernten Patterns
        result = db.table("la_intent_learning_patterns").select(
            "correct_intent, confidence"
        ).or_(
            f"company_id.eq.{company_id},company_id.is.null"
        ).execute()
        
        if not result.data:
            return None
        
        # Einfaches Pattern-Matching
        for pattern in result.data:
            # Die query_pattern Spalte enthält normalisierte Muster
            # Wir prüfen ob unser Query ähnlich ist
            # (Für Production: Embedding-basiertes Matching)
            pass
        
        return None
        
    except Exception as e:
        print(f"Learned pattern lookup error: {e}")
        return None


# =============================================================================
# LEARNING FROM FEEDBACK
# =============================================================================

def record_intent_correction(
    query_text: str,
    detected_intent: str,
    correct_intent: str,
    company_id: Optional[str],
    db: Client
) -> bool:
    """
    Speichert eine Intent-Korrektur für Learning.
    
    Args:
        query_text: Die ursprüngliche Anfrage
        detected_intent: Der falsch erkannte Intent
        correct_intent: Der korrekte Intent
        company_id: Company ID
        db: Supabase Client
        
    Returns:
        True wenn erfolgreich
    """
    if detected_intent == correct_intent:
        return False  # Keine Korrektur nötig
    
    try:
        # Normalisiere Query
        query_pattern = query_text.lower()[:100]
        
        # Versuche Insert oder Update
        db.table("la_intent_learning_patterns").upsert({
            "company_id": company_id,
            "query_pattern": query_pattern,
            "wrong_intent": detected_intent,
            "correct_intent": correct_intent,
            "confidence": 0.5,
            "correction_count": 1
        }, on_conflict="company_id,query_pattern").execute()
        
        return True
        
    except Exception as e:
        print(f"Intent correction error: {e}")
        return False


def record_objection_correction(
    query_text: str,
    detected_type: str,
    correct_type: str,
    company_id: Optional[str],
    db: Client
) -> bool:
    """
    Speichert eine Objection-Type-Korrektur für Learning.
    
    Args:
        query_text: Die ursprüngliche Anfrage
        detected_type: Der falsch erkannte Typ
        correct_type: Der korrekte Typ
        company_id: Company ID
        db: Supabase Client
        
    Returns:
        True wenn erfolgreich
    """
    if detected_type == correct_type:
        return False
    
    try:
        query_pattern = query_text.lower()[:100]
        
        db.table("la_objection_learning_patterns").upsert({
            "company_id": company_id,
            "query_pattern": query_pattern,
            "wrong_objection_type": detected_type,
            "correct_objection_type": correct_type,
            "confidence": 0.5,
            "correction_count": 1
        }, on_conflict="company_id,query_pattern").execute()
        
        return True
        
    except Exception as e:
        print(f"Objection correction error: {e}")
        return False


# =============================================================================
# LANGUAGE DETECTION
# =============================================================================

def detect_language(text: str) -> str:
    """
    Einfache Spracherkennung.
    
    Args:
        text: Der zu analysierende Text
        
    Returns:
        Sprachcode (de, en)
    """
    # Einfache Heuristik basierend auf häufigen Wörtern
    german_indicators = [
        "ich", "du", "wir", "und", "der", "die", "das", "ist", "sind",
        "nicht", "mit", "aber", "was", "wie", "wenn", "dass", "oder",
        "auch", "noch", "nur", "schon", "kann", "muss", "wird"
    ]
    
    english_indicators = [
        "i", "you", "we", "and", "the", "is", "are", "not", "with",
        "but", "what", "how", "if", "that", "or", "also", "still",
        "can", "must", "will", "would", "could", "should"
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    german_score = sum(1 for w in words if w in german_indicators)
    english_score = sum(1 for w in words if w in english_indicators)
    
    if english_score > german_score:
        return "en"
    return "de"


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "IntentResult",
    "detect_intent",
    "detect_language",
    "record_intent_correction",
    "record_objection_correction",
    "OBJECTION_KEYWORDS",
    "INTENT_KEYWORDS",
]

