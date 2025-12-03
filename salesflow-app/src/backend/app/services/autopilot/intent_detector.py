"""
╔════════════════════════════════════════════════════════════════════════════╗
║  INTENT DETECTOR                                                           ║
║  Erkennt die Absicht hinter eingehenden Nachrichten                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import re
from typing import Optional, List, Tuple
from dataclasses import dataclass

from ...config.prompts.chief_autopilot import (
    MessageIntent,
    LeadTemperature,
    IntentAnalysis,
    INTENT_KEYWORDS,
    detect_intent_from_keywords
)


@dataclass
class IntentPattern:
    """Ein Pattern für Intent-Erkennung."""
    intent: MessageIntent
    patterns: List[str]  # Regex patterns
    keywords: List[str]
    priority: int  # Höher = wichtiger bei Konflikten
    temperature: LeadTemperature
    buying_signal: bool = False


# ═══════════════════════════════════════════════════════════════════════════
# INTENT PATTERNS - Erweiterte Erkennung mit Regex
# ═══════════════════════════════════════════════════════════════════════════

INTENT_PATTERNS: List[IntentPattern] = [
    # BUYING SIGNALS (höchste Priorität)
    IntentPattern(
        intent=MessageIntent.READY_TO_BUY,
        patterns=[
            r"ich (bin|will) dabei",
            r"wie kann ich (starten|anfangen|kaufen|bestellen)",
            r"wo kann ich (kaufen|bestellen|mich anmelden)",
            r"ich (nehme|möchte) (das|es)",
            r"ich (will|möchte) (starten|anfangen|loslegen)",
            r"okay,? (ich mach|ich bin|let'?s go)",
        ],
        keywords=["dabei", "starten", "kaufen", "bestellen", "anmelden", "ready"],
        priority=100,
        temperature=LeadTemperature.HOT,
        buying_signal=True
    ),
    
    IntentPattern(
        intent=MessageIntent.PRICE_INQUIRY,
        patterns=[
            r"was kostet (das|es|ihr)",
            r"wie (teuer|viel) ist",
            r"(preis|kosten|gebühren)",
            r"was (muss|würde) ich (zahlen|investieren)",
            r"welche (pakete|tarife|preise)",
        ],
        keywords=["kostet", "preis", "kosten", "teuer", "gebühren", "monatlich"],
        priority=90,
        temperature=LeadTemperature.HOT,
        buying_signal=True
    ),
    
    IntentPattern(
        intent=MessageIntent.BOOKING_REQUEST,
        patterns=[
            r"können wir (mal )?(telefonieren|sprechen|zoomen)",
            r"(lass uns|wollen wir) (mal )?(telefonieren|sprechen)",
            r"hast du (zeit|termine) (für|zum)",
            r"(termin|call|meeting) (machen|vereinbaren)",
            r"wann (hast du|passt es|können wir)",
        ],
        keywords=["telefonieren", "termin", "call", "meeting", "zoom", "gespräch"],
        priority=85,
        temperature=LeadTemperature.HOT,
        buying_signal=True
    ),
    
    # OBJECTIONS (mittlere Priorität)
    IntentPattern(
        intent=MessageIntent.PRICE_OBJECTION,
        patterns=[
            r"(zu |ist mir zu |bisschen )teuer",
            r"kann ich mir (nicht|gerade nicht) leisten",
            r"(kein|nicht genug) (geld|budget)",
            r"gibt es (was günstigeres|rabatt|angebote)",
            r"(zu viel|zu teuer) für mich",
        ],
        keywords=["teuer", "leisten", "budget", "günstiger", "rabatt"],
        priority=70,
        temperature=LeadTemperature.WARM
    ),
    
    IntentPattern(
        intent=MessageIntent.TIME_OBJECTION,
        patterns=[
            r"(habe?|hab) (gerade |momentan )?(keine |wenig )zeit",
            r"(später|ein andermal|irgendwann)",
            r"(gerade|momentan) (nicht|schlecht)",
            r"(muss|müsste) (ich |erst )?überlegen",
            r"(melde mich|komme zurück) (später|wenn)",
        ],
        keywords=["keine zeit", "später", "beschäftigt", "überlegen", "momentan"],
        priority=65,
        temperature=LeadTemperature.WARM
    ),
    
    IntentPattern(
        intent=MessageIntent.TRUST_OBJECTION,
        patterns=[
            r"muss (ich |erst )?drüber (nachdenken|schlafen)",
            r"klingt (zu gut|unseriös|komisch)",
            r"(kenne ich nicht|nie gehört)",
            r"(ist das|das ist) (seriös|echt|legitim)",
            r"woher (weiß ich|soll ich wissen)",
        ],
        keywords=["nachdenken", "unsicher", "vertrauen", "seriös"],
        priority=60,
        temperature=LeadTemperature.WARM
    ),
    
    IntentPattern(
        intent=MessageIntent.COMPLEX_OBJECTION,
        patterns=[
            r"(mein |die )(mann|frau|partner|familie) (ist|sagt|meint)",
            r"hatte (schlechte |negative )erfahrung",
            r"(wurde |bin )schon (mal )?enttäuscht",
            r"(glaube |traue )ich (nicht|dem nicht)",
            r"(MLM|Network|Pyramide|Schneeballsystem)",
        ],
        keywords=["partner", "familie", "erfahrung", "enttäuscht", "MLM"],
        priority=55,
        temperature=LeadTemperature.WARM
    ),
    
    # INFO REQUESTS
    IntentPattern(
        intent=MessageIntent.SIMPLE_INFO,
        patterns=[
            r"(erzähl|sag) (mir |)(mal |)mehr",
            r"was (macht|machst|bietet) (ihr|du)",
            r"worum geht('?s| es)",
            r"was ist (das|dein produkt|euer angebot)",
            r"(wie |)funktioniert (das|es)",
        ],
        keywords=["erzähl", "was macht ihr", "funktioniert", "worum geht"],
        priority=40,
        temperature=LeadTemperature.WARM
    ),
    
    IntentPattern(
        intent=MessageIntent.SPECIFIC_QUESTION,
        patterns=[
            r"(was ist |wie ist )(der unterschied|anders)",
            r"(wie |wann |wo |warum )(genau|konkret)",
            r"(kannst du|könntest du) (erklären|mir sagen)",
            r"(habe |hab |ich hätte )(eine |)(frage|fragen)",
        ],
        keywords=["unterschied", "genau", "frage", "erklären"],
        priority=35,
        temperature=LeadTemperature.WARM
    ),
    
    # ADMINISTRATIVE
    IntentPattern(
        intent=MessageIntent.SCHEDULING,
        patterns=[
            r"(ja,? )?(dienstag|montag|mittwoch|donnerstag|freitag|samstag|sonntag) passt",
            r"(um |)(10|11|12|13|14|15|16|17|18|19|20)( uhr| h)? (passt|geht|ist gut)",
            r"(okay|gut|super),? (dann |)machen wir (das|es|so)",
            r"(bin dabei|passt|geht klar|machen wir)",
        ],
        keywords=["passt", "geht", "okay", "machen wir"],
        priority=50,
        temperature=LeadTemperature.HOT
    ),
    
    IntentPattern(
        intent=MessageIntent.RESCHEDULE,
        patterns=[
            r"(können |müssen )wir (verschieben|verlegen)",
            r"(passt |geht )(mir |)(doch nicht|leider nicht)",
            r"(gibt es |hast du |geht auch )(ein )?alternativen?",
            r"(anders|neuen) termin",
        ],
        keywords=["verschieben", "verlegen", "alternative", "neuen termin"],
        priority=45,
        temperature=LeadTemperature.WARM
    ),
    
    IntentPattern(
        intent=MessageIntent.CANCELLATION,
        patterns=[
            r"(muss |ich )absagen",
            r"(kann |komme )(doch |leider |)(nicht|nicht mehr)",
            r"termin (fällt aus|absagen|stornieren)",
            r"(geht |klappt |schaffe )(leider |doch |)(nicht|nicht mehr)",
        ],
        keywords=["absagen", "stornieren", "nicht mehr", "fällt aus"],
        priority=45,
        temperature=LeadTemperature.COLD
    ),
    
    # NEGATIVE
    IntentPattern(
        intent=MessageIntent.NOT_INTERESTED,
        patterns=[
            r"(kein |nicht )interesse",
            r"(nein,? )?(danke|nicht|nö)",
            r"(lass mich|bitte) in ruhe",
            r"(nicht |kein )mein ding",
            r"(stopp?|abmelden|austragen)",
        ],
        keywords=["kein interesse", "nein danke", "in ruhe", "stopp"],
        priority=80,
        temperature=LeadTemperature.DEAD
    ),
    
    IntentPattern(
        intent=MessageIntent.SPAM,
        patterns=[
            r"(kaufe?|verkaufe?|biete) (an|dir|euch)",
            r"(werbung|angebot|rabatt) (für|von)",
            r"(verdiene?|geld|nebenjob|homeoffice)",
            r"https?://",
            r"(crypto|bitcoin|forex|trading)",
        ],
        keywords=["kaufe", "verkaufe", "crypto", "verdiene"],
        priority=85,
        temperature=LeadTemperature.DEAD
    ),
]


class IntentDetector:
    """
    Erkennt Intents aus eingehenden Nachrichten.
    
    Kombiniert:
    - Regex-Pattern Matching
    - Keyword Detection
    - Kontext-Analyse
    - LLM-Fallback für komplexe Fälle
    """
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: Optional LLM Client für komplexe Fälle
        """
        self.llm_client = llm_client
        self.patterns = INTENT_PATTERNS
        
    def analyze(
        self,
        message: str,
        conversation_history: Optional[List[dict]] = None,
        lead_context: Optional[dict] = None
    ) -> IntentAnalysis:
        """
        Analysiert eine Nachricht und erkennt den Intent.
        
        Args:
            message: Die zu analysierende Nachricht
            conversation_history: Bisherige Konversation
            lead_context: Zusätzlicher Lead-Kontext
            
        Returns:
            IntentAnalysis mit Intent, Confidence und Metadaten
        """
        message_lower = message.lower().strip()
        
        # Kurze Nachrichten speziell behandeln
        if len(message_lower) < 5:
            return self._handle_short_message(message_lower)
        
        # Pattern Matching
        pattern_result = self._match_patterns(message_lower)
        
        # Keyword Detection als Fallback/Verstärkung
        keyword_intent, keyword_confidence = detect_intent_from_keywords(message)
        
        # Beste Ergebnis wählen
        if pattern_result and pattern_result[1] >= keyword_confidence:
            intent, confidence, pattern = pattern_result
            temperature = pattern.temperature
            buying_signals = [message] if pattern.buying_signal else []
        elif keyword_confidence > 0.5:
            intent = keyword_intent
            confidence = keyword_confidence
            temperature = self._infer_temperature(intent)
            buying_signals = []
        else:
            # Unklar - ggf. LLM fragen
            intent = MessageIntent.UNCLEAR
            confidence = 0.3
            temperature = LeadTemperature.WARM
            buying_signals = []
        
        # Sentiment analysieren
        sentiment = self._analyze_sentiment(message_lower)
        
        # Urgency bestimmen
        urgency = self._determine_urgency(intent, message_lower)
        
        # Keywords extrahieren
        keywords = self._extract_keywords(message_lower)
        
        return IntentAnalysis(
            intent=intent,
            confidence=confidence,
            lead_temperature=temperature,
            sentiment=sentiment,
            urgency=urgency,
            keywords=keywords,
            buying_signals=buying_signals
        )
    
    def _match_patterns(
        self, 
        message: str
    ) -> Optional[Tuple[MessageIntent, float, IntentPattern]]:
        """Matched Patterns gegen die Nachricht."""
        best_match = None
        best_score = 0.0
        best_pattern = None
        
        for pattern in self.patterns:
            score = 0.0
            
            # Regex matching
            for regex in pattern.patterns:
                if re.search(regex, message, re.IGNORECASE):
                    score = max(score, 0.8 + (pattern.priority / 500))
                    break
            
            # Keyword matching als Verstärkung
            keyword_matches = sum(
                1 for kw in pattern.keywords 
                if kw.lower() in message
            )
            if keyword_matches > 0:
                keyword_score = min(0.6, keyword_matches * 0.15)
                score = max(score, keyword_score)
                if score > 0:  # Boost wenn beides matched
                    score = min(1.0, score + 0.1)
            
            # Priorität berücksichtigen bei gleichem Score
            if score > best_score or (score == best_score and pattern.priority > (best_pattern.priority if best_pattern else 0)):
                best_score = score
                best_match = pattern.intent
                best_pattern = pattern
        
        if best_match and best_score > 0.4:
            return (best_match, best_score, best_pattern)
        return None
    
    def _handle_short_message(self, message: str) -> IntentAnalysis:
        """Behandelt sehr kurze Nachrichten."""
        
        # Positive kurze Antworten
        if message in ["ja", "jo", "ok", "okay", "gut", "super", "klar", "gerne"]:
            return IntentAnalysis(
                intent=MessageIntent.SCHEDULING,  # Wahrscheinlich Bestätigung
                confidence=0.6,
                lead_temperature=LeadTemperature.HOT,
                sentiment="positive",
                urgency="medium",
                keywords=[message]
            )
        
        # Negative kurze Antworten
        if message in ["nein", "nö", "ne", "nope"]:
            return IntentAnalysis(
                intent=MessageIntent.NOT_INTERESTED,
                confidence=0.5,  # Nicht sicher, was genau
                lead_temperature=LeadTemperature.COLD,
                sentiment="negative",
                urgency="low",
                keywords=[message]
            )
        
        # Grüße
        if message in ["hey", "hi", "hallo", "moin", "servus"]:
            return IntentAnalysis(
                intent=MessageIntent.SIMPLE_INFO,
                confidence=0.4,
                lead_temperature=LeadTemperature.WARM,
                sentiment="neutral",
                urgency="low",
                keywords=[message]
            )
        
        # Unklar
        return IntentAnalysis(
            intent=MessageIntent.UNCLEAR,
            confidence=0.3,
            lead_temperature=LeadTemperature.WARM,
            sentiment="neutral",
            urgency="low",
            keywords=[message]
        )
    
    def _analyze_sentiment(self, message: str) -> str:
        """Einfache Sentiment-Analyse."""
        
        positive_words = [
            "super", "toll", "mega", "geil", "cool", "nice", "perfekt",
            "freue", "begeistert", "interessant", "spannend", "danke",
            "😊", "👍", "🎉", "❤️", "🔥", "💪"
        ]
        
        negative_words = [
            "schlecht", "blöd", "nervig", "teuer", "nicht", "kein",
            "leider", "schade", "enttäuscht", "ärgerlich", "problem",
            "😢", "😠", "👎", "😤"
        ]
        
        positive_count = sum(1 for w in positive_words if w in message)
        negative_count = sum(1 for w in negative_words if w in message)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        return "neutral"
    
    def _determine_urgency(self, intent: MessageIntent, message: str) -> str:
        """Bestimmt die Urgency basierend auf Intent und Message."""
        
        # Hohe Urgency
        high_urgency_intents = [
            MessageIntent.READY_TO_BUY,
            MessageIntent.PRICE_INQUIRY,
            MessageIntent.BOOKING_REQUEST
        ]
        if intent in high_urgency_intents:
            return "high"
        
        # Urgency-Keywords
        urgent_words = ["jetzt", "sofort", "heute", "dringend", "schnell", "asap"]
        if any(w in message for w in urgent_words):
            return "high"
        
        # Niedrige Urgency
        low_urgency_intents = [
            MessageIntent.NOT_INTERESTED,
            MessageIntent.SPAM,
            MessageIntent.IRRELEVANT
        ]
        if intent in low_urgency_intents:
            return "low"
        
        return "medium"
    
    def _infer_temperature(self, intent: MessageIntent) -> LeadTemperature:
        """Leitet die Lead-Temperatur aus dem Intent ab."""
        
        hot_intents = [
            MessageIntent.READY_TO_BUY,
            MessageIntent.PRICE_INQUIRY,
            MessageIntent.BOOKING_REQUEST,
            MessageIntent.SCHEDULING
        ]
        
        cold_intents = [
            MessageIntent.NOT_INTERESTED,
            MessageIntent.CANCELLATION
        ]
        
        dead_intents = [
            MessageIntent.SPAM,
            MessageIntent.IRRELEVANT
        ]
        
        if intent in hot_intents:
            return LeadTemperature.HOT
        elif intent in cold_intents:
            return LeadTemperature.COLD
        elif intent in dead_intents:
            return LeadTemperature.DEAD
        return LeadTemperature.WARM
    
    def _extract_keywords(self, message: str) -> List[str]:
        """Extrahiert relevante Keywords aus der Nachricht."""
        
        # Wichtige Wörter für Sales
        important_patterns = [
            r"\b(preis|kosten|euro|€|budget)\b",
            r"\b(termin|call|telefonat|meeting)\b",
            r"\b(interesse|neugierig|mehr wissen)\b",
            r"\b(problem|frage|verstehe nicht)\b",
            r"\b(starten|anfangen|kaufen|bestellen)\b",
        ]
        
        keywords = []
        for pattern in important_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            keywords.extend(matches)
        
        return list(set(keywords))[:10]  # Max 10 Keywords

