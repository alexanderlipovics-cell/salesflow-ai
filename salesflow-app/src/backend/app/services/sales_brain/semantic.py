# backend/app/services/sales_brain/semantic.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🧠 SALES BRAIN SEMANTIC ANALYZER                                           ║
║  Intelligente Text-Analyse für besseres Rule Matching                       ║
╚════════════════════════════════════════════════════════════════════════════╝

WARUM DIESE VERBESSERUNG?
========================
1. Besseres Matching: Semantik statt nur Wort-Vergleich
2. Auto-Detection: Use-Cases automatisch erkennen
3. Intent-Erkennung: Was will der Kunde?
4. Sentiment-Analyse: Ist der Kunde positiv/negativ?

FEATURES:
- Use-Case Klassifizierung
- Objection Detection
- Sentiment Analysis
- Keyword Extraction
"""

import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class UseCase(str, Enum):
    """Erkannte Use-Cases"""
    OBJECTION_PRICE = "objection_price"
    OBJECTION_TIME = "objection_time"
    OBJECTION_TRUST = "objection_trust"
    OBJECTION_COMPETITOR = "objection_competitor"
    APPOINTMENT_REQUEST = "appointment_request"
    APPOINTMENT_CANCEL = "appointment_cancel"
    APPOINTMENT_RESCHEDULE = "appointment_reschedule"
    PRODUCT_QUESTION = "product_question"
    FOLLOW_UP = "follow_up"
    COLD_OUTREACH = "cold_outreach"
    CLOSING = "closing"
    UPSELL = "upsell"
    REFERRAL = "referral"
    SUPPORT = "support"
    UNKNOWN = "unknown"


class Sentiment(str, Enum):
    """Sentiment des Textes"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


@dataclass
class TextAnalysis:
    """Ergebnis der Text-Analyse"""
    use_case: UseCase
    use_case_confidence: float  # 0-1
    sentiment: Sentiment
    sentiment_score: float  # -1 bis 1
    keywords: List[str]
    detected_objections: List[str]
    detected_intents: List[str]
    language: str


class SemanticAnalyzer:
    """
    🧠 Semantische Text-Analyse
    
    Ohne externe API (kein OpenAI nötig).
    Nutzt Keyword-basierte Heuristiken.
    """
    
    # ==========================================================================
    # USE-CASE PATTERNS
    # ==========================================================================
    
    USE_CASE_PATTERNS = {
        UseCase.OBJECTION_PRICE: [
            r"\bzu teuer\b",
            r"\bpreis\b.*\bhoch\b",
            r"\bkann mir.*nicht leisten\b",
            r"\bbudget\b",
            r"\bkosten\b.*\bzu\b",
            r"\bgeld\b",
            r"\bteuer\b",
            r"\bpreiswert\b",
            r"\bgünstiger\b",
            r"\brabatt\b",
        ],
        UseCase.OBJECTION_TIME: [
            r"\bkeine zeit\b",
            r"\bzu beschäftigt\b",
            r"\bspäter\b",
            r"\bnicht jetzt\b",
            r"\btermin.*schwierig\b",
            r"\bim stress\b",
            r"\bviel zu tun\b",
        ],
        UseCase.OBJECTION_TRUST: [
            r"\bvertrau.*nicht\b",
            r"\bskeptisch\b",
            r"\bsicher\b.*\?",
            r"\bgarantie\b",
            r"\bbeweis\b",
            r"\bfunktioniert.*wirklich\b",
            r"\bklingt zu gut\b",
        ],
        UseCase.OBJECTION_COMPETITOR: [
            r"\bkonkurrenz\b",
            r"\banderer anbieter\b",
            r"\balternative\b",
            r"\bvergleich\b",
            r"\bwarum.*euch\b",
            r"\bunterschied\b",
        ],
        UseCase.APPOINTMENT_REQUEST: [
            r"\btermin\b",
            r"\btreffen\b",
            r"\bbesprechen\b",
            r"\banrufen\b.*\bwann\b",
            r"\bzeit.*haben\b",
            r"\bverfügbar\b",
        ],
        UseCase.APPOINTMENT_CANCEL: [
            r"\btermin.*absagen\b",
            r"\bkann.*nicht\b.*\bkommen\b",
            r"\babsage\b",
            r"\bverschieben\b",
        ],
        UseCase.PRODUCT_QUESTION: [
            r"\bwie funktioniert\b",
            r"\bwas.*genau\b",
            r"\berkläre.*mir\b",
            r"\bfrage\b.*\bzu\b",
            r"\binfo\b",
            r"\bdetails\b",
        ],
        UseCase.FOLLOW_UP: [
            r"\bnachfassen\b",
            r"\bmelden.*wieder\b",
            r"\büberlegt\b",
            r"\bentschieden\b",
            r"\bnach.*gedacht\b",
        ],
        UseCase.CLOSING: [
            r"\bkaufen\b",
            r"\bbestellen\b",
            r"\babschließen\b",
            r"\bdabei\b",
            r"\bmache\b.*\bmit\b",
            r"\bstarten\b",
            r"\blos.*gehen\b",
        ],
        UseCase.UPSELL: [
            r"\bupgrade\b",
            r"\bzusätzlich\b",
            r"\berweitern\b",
            r"\bmehr.*produkte\b",
            r"\bpaket\b",
        ],
        UseCase.REFERRAL: [
            r"\bempfehl\b",
            r"\bweiterempfehl\b",
            r"\bfreund.*kennt\b",
            r"\bjemand.*kennt\b",
            r"\bkontakt.*geben\b",
        ],
    }
    
    # ==========================================================================
    # SENTIMENT PATTERNS
    # ==========================================================================
    
    POSITIVE_PATTERNS = [
        r"\bsuper\b", r"\btoll\b", r"\bklasse\b", r"\bgenial\b",
        r"\binteressant\b", r"\bgut\b", r"\bperfekt\b", r"\bdanke\b",
        r"\bfreue\b", r"\bgerne\b", r"\bja\b", r"\bokay\b", r"\bklar\b",
        r"👍", r"😊", r"🙂", r"❤️", r"🔥", r"💪",
    ]
    
    NEGATIVE_PATTERNS = [
        r"\bnein\b", r"\bnicht\b", r"\bkein\b", r"\bschlecht\b",
        r"\bärger\b", r"\bproblem\b", r"\bschwierig\b", r"\bleider\b",
        r"\bnervt\b", r"\bstört\b", r"\bunzufrieden\b", r"\benttäuscht\b",
        r"👎", r"😠", r"😤", r"😒",
    ]
    
    def __init__(self):
        # Compile patterns für Performance
        self.use_case_compiled = {
            uc: [re.compile(p, re.IGNORECASE) for p in patterns]
            for uc, patterns in self.USE_CASE_PATTERNS.items()
        }
        self.positive_compiled = [re.compile(p, re.IGNORECASE) for p in self.POSITIVE_PATTERNS]
        self.negative_compiled = [re.compile(p, re.IGNORECASE) for p in self.NEGATIVE_PATTERNS]
    
    def analyze(self, text: str) -> TextAnalysis:
        """
        Analysiert einen Text vollständig.
        
        Args:
            text: Der zu analysierende Text
            
        Returns:
            TextAnalysis mit Use-Case, Sentiment, Keywords
        """
        
        if not text:
            return TextAnalysis(
                use_case=UseCase.UNKNOWN,
                use_case_confidence=0,
                sentiment=Sentiment.NEUTRAL,
                sentiment_score=0,
                keywords=[],
                detected_objections=[],
                detected_intents=[],
                language="de",
            )
        
        # 1. Use-Case Detection
        use_case, confidence, objections = self._detect_use_case(text)
        
        # 2. Sentiment Analysis
        sentiment, sentiment_score = self._analyze_sentiment(text)
        
        # 3. Keyword Extraction
        keywords = self._extract_keywords(text)
        
        # 4. Intent Detection
        intents = self._detect_intents(text)
        
        # 5. Language Detection (simple)
        language = self._detect_language(text)
        
        return TextAnalysis(
            use_case=use_case,
            use_case_confidence=confidence,
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            keywords=keywords,
            detected_objections=objections,
            detected_intents=intents,
            language=language,
        )
    
    def _detect_use_case(self, text: str) -> Tuple[UseCase, float, List[str]]:
        """
        Erkennt den Use-Case des Textes.
        
        Returns:
            (UseCase, Confidence 0-1, List of matched objections)
        """
        
        scores: Dict[UseCase, float] = {}
        matched_objections: List[str] = []
        
        for use_case, patterns in self.use_case_compiled.items():
            matches = 0
            for pattern in patterns:
                if pattern.search(text):
                    matches += 1
                    if "objection" in use_case.value:
                        matched_objections.append(use_case.value)
            
            if matches > 0:
                # Normalisiere Score
                scores[use_case] = min(1.0, matches / len(patterns) * 2)
        
        if not scores:
            return UseCase.UNKNOWN, 0, []
        
        # Bester Match
        best_use_case = max(scores.keys(), key=lambda k: scores[k])
        confidence = scores[best_use_case]
        
        return best_use_case, confidence, list(set(matched_objections))
    
    def _analyze_sentiment(self, text: str) -> Tuple[Sentiment, float]:
        """
        Analysiert das Sentiment des Textes.
        
        Returns:
            (Sentiment, Score von -1 bis 1)
        """
        
        positive_count = sum(1 for p in self.positive_compiled if p.search(text))
        negative_count = sum(1 for p in self.negative_compiled if p.search(text))
        
        total = positive_count + negative_count
        if total == 0:
            return Sentiment.NEUTRAL, 0
        
        score = (positive_count - negative_count) / max(total, 1)
        
        if positive_count > 0 and negative_count > 0:
            return Sentiment.MIXED, score
        elif score > 0.2:
            return Sentiment.POSITIVE, score
        elif score < -0.2:
            return Sentiment.NEGATIVE, score
        else:
            return Sentiment.NEUTRAL, score
    
    def _extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """
        Extrahiert wichtige Keywords.
        
        Einfache Heuristik: Längere Wörter sind wichtiger.
        """
        
        # Entferne Sonderzeichen
        clean = re.sub(r'[^\w\s]', ' ', text.lower())
        words = clean.split()
        
        # Filtere Stopwords
        stopwords = {
            "der", "die", "das", "und", "oder", "aber", "wenn", "weil",
            "ich", "du", "er", "sie", "es", "wir", "ihr", "sie",
            "ein", "eine", "einer", "eines", "einem", "einen",
            "ist", "sind", "war", "waren", "bin", "bist", "sein",
            "hat", "haben", "hatte", "hatten", "wird", "werden",
            "kann", "können", "muss", "müssen", "soll", "sollen",
            "mit", "bei", "von", "zu", "für", "auf", "an", "in",
            "nicht", "kein", "keine", "auch", "nur", "noch", "schon",
            "ja", "nein", "ok", "okay", "hey", "hallo", "hi",
        }
        
        keywords = [w for w in words if len(w) > 3 and w not in stopwords]
        
        # Sortiere nach Länge (längere = wichtiger)
        keywords.sort(key=len, reverse=True)
        
        # Dedupliziere
        seen = set()
        unique = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique.append(kw)
        
        return unique[:max_keywords]
    
    def _detect_intents(self, text: str) -> List[str]:
        """
        Erkennt Intents (was will der User).
        """
        
        intents = []
        text_lower = text.lower()
        
        intent_patterns = {
            "question": [r"\?", r"\bwas\b", r"\bwie\b", r"\bwarum\b", r"\bwann\b"],
            "request": [r"\bkannst\b", r"\bkönntest\b", r"\bbitte\b", r"\bbrauche\b"],
            "confirmation": [r"\bokay\b", r"\bja\b", r"\bklar\b", r"\bpasst\b"],
            "rejection": [r"\bnein\b", r"\bnicht\b", r"\bkein interesse\b"],
            "urgency": [r"\bdringend\b", r"\bschnell\b", r"\bsofort\b", r"\basap\b"],
        }
        
        for intent, patterns in intent_patterns.items():
            for p in patterns:
                if re.search(p, text_lower):
                    intents.append(intent)
                    break
        
        return intents
    
    def _detect_language(self, text: str) -> str:
        """
        Einfache Sprach-Erkennung.
        """
        
        german_indicators = ["der", "die", "das", "und", "ist", "nicht", "ich", "du"]
        english_indicators = ["the", "and", "is", "not", "you", "are", "have"]
        
        text_lower = text.lower()
        
        german_count = sum(1 for w in german_indicators if f" {w} " in f" {text_lower} ")
        english_count = sum(1 for w in english_indicators if f" {w} " in f" {text_lower} ")
        
        if english_count > german_count:
            return "en"
        return "de"
    
    def calculate_semantic_similarity(
        self,
        text1: str,
        text2: str,
    ) -> float:
        """
        Berechnet semantische Ähnlichkeit zwischen zwei Texten.
        
        Nutzt Keyword-Overlap + Jaccard Similarity.
        
        WARUM BESSER ALS LEVENSHTEIN?
        - "Zu teuer" und "Preis zu hoch" sind semantisch gleich
        - Levenshtein würde 0% Ähnlichkeit zeigen
        - Keyword-basiert erkennt beide als "Preis-Einwand"
        """
        
        # Extrahiere Keywords
        kw1 = set(self._extract_keywords(text1, max_keywords=10))
        kw2 = set(self._extract_keywords(text2, max_keywords=10))
        
        if not kw1 or not kw2:
            return 0
        
        # Jaccard Similarity
        intersection = len(kw1 & kw2)
        union = len(kw1 | kw2)
        
        if union == 0:
            return 0
        
        jaccard = intersection / union
        
        # Use-Case Match Bonus
        analysis1 = self._detect_use_case(text1)
        analysis2 = self._detect_use_case(text2)
        
        use_case_bonus = 0.3 if analysis1[0] == analysis2[0] and analysis1[0] != UseCase.UNKNOWN else 0
        
        return min(1.0, jaccard + use_case_bonus)


# =============================================================================
# AUTO-TAG GENERATOR
# =============================================================================

class AutoTagGenerator:
    """
    Generiert automatische Tags für Regeln.
    
    WARUM?
    - User muss keine Tags eingeben
    - Konsistente Tag-Struktur
    - Besseres Filtering
    """
    
    def __init__(self):
        self.analyzer = SemanticAnalyzer()
    
    def generate_tags(self, text: str, context: Dict) -> List[str]:
        """
        Generiert Tags aus Text und Kontext.
        """
        
        tags = []
        
        # 1. Use-Case Tag
        analysis = self.analyzer.analyze(text)
        if analysis.use_case != UseCase.UNKNOWN:
            tags.append(analysis.use_case.value)
        
        # 2. Channel Tag
        channel = context.get("channel")
        if channel:
            tags.append(f"channel:{channel}")
        
        # 3. Sentiment Tag
        if analysis.sentiment != Sentiment.NEUTRAL:
            tags.append(f"sentiment:{analysis.sentiment.value}")
        
        # 4. Keyword Tags (top 2)
        for kw in analysis.keywords[:2]:
            tags.append(f"keyword:{kw}")
        
        # 5. Status Tag
        lead_status = context.get("lead_status")
        if lead_status:
            tags.append(f"status:{lead_status}")
        
        return tags
    
    def generate_rule_name(self, analysis: TextAnalysis) -> str:
        """
        Generiert lesbaren Namen für eine Regel.
        """
        
        use_case_names = {
            UseCase.OBJECTION_PRICE: "Preis-Einwand",
            UseCase.OBJECTION_TIME: "Zeit-Einwand",
            UseCase.OBJECTION_TRUST: "Vertrauens-Einwand",
            UseCase.OBJECTION_COMPETITOR: "Konkurrenz-Einwand",
            UseCase.APPOINTMENT_REQUEST: "Terminanfrage",
            UseCase.APPOINTMENT_CANCEL: "Terminabsage",
            UseCase.PRODUCT_QUESTION: "Produktfrage",
            UseCase.FOLLOW_UP: "Follow-Up",
            UseCase.CLOSING: "Abschluss",
            UseCase.UPSELL: "Upselling",
            UseCase.REFERRAL: "Empfehlung",
            UseCase.UNKNOWN: "Allgemein",
        }
        
        base_name = use_case_names.get(analysis.use_case, "Allgemein")
        
        if analysis.keywords:
            return f"{base_name}: {analysis.keywords[0].title()}"
        
        return base_name

