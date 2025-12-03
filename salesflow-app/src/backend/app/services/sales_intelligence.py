"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES INTELLIGENCE SERVICE v3.0                                           ║
║  Auto-Detection für Language, Buyer Type, Framework + Integration         ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieser Service bietet:
- Auto-Spracherkennung aus Chat-Text
- Auto-Buyer-Type-Erkennung aus Chat-Verlauf
- Framework-Empfehlung basierend auf Kontext
- Integration in CHIEF Context
"""

import json
import re
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from dataclasses import dataclass
from supabase import Client

from ..config.prompts import (
    # Multi-Language
    get_cultural_profile,
    build_multilang_prompt,
    get_localized_template,
    CULTURAL_PROFILES,
    # Buyer Psychology
    get_buyer_type_profile,
    build_adapted_response_prompt,
    get_objection_response_by_buyer_type,
    BUYER_TYPE_PROFILES,
    # Frameworks
    get_framework,
    build_framework_prompt,
    recommend_framework,
    get_framework_questions,
    SALES_FRAMEWORKS,
    # Industries
    get_industry_profile,
    build_industry_prompt,
    INDUSTRY_PROFILES,
    # Advanced
    calculate_momentum_score,
    get_micro_coaching_feedback,
    MomentumSignal,
)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class DetectedLanguage:
    """Ergebnis der Spracherkennung"""
    language_code: str
    regional_variant: Optional[str]
    confidence: float
    dialect_markers: List[str]
    formality: str


@dataclass
class DetectedBuyerType:
    """Ergebnis der Buyer Type Erkennung"""
    buyer_type: str
    confidence: float
    signals: List[str]
    buying_stage: str
    risk_profile: str


@dataclass
class FrameworkRecommendation:
    """Framework-Empfehlung"""
    framework_id: str
    framework_name: str
    reasoning: str
    key_questions: List[str]
    alternatives: List[str]


@dataclass
class SalesIntelligenceContext:
    """Vollständiger Sales Intelligence Context für CHIEF"""
    language: DetectedLanguage
    buyer_type: Optional[DetectedBuyerType]
    framework: Optional[FrameworkRecommendation]
    industry_prompt: str
    multilang_prompt: str
    buyer_adapted_prompt: str
    framework_prompt: str


# =============================================================================
# LANGUAGE DETECTION
# =============================================================================

class LanguageDetector:
    """
    Erkennt Sprache und regionale Varianten aus Text.
    Lightweight Heuristik-basiert (in Production: Claude API für präzisere Erkennung).
    """
    
    # Marker für regionale Varianten
    DIALECT_MARKERS = {
        "de-at": [
            "servus", "grüß gott", "grias di", "passt", "schau", "eh", "halt",
            "ur", "leiwand", "geil", "oida", "jo", "na", "gscheit", "pfiat di",
            "bussi", "habedere", "tschüss"
        ],
        "de-ch": [
            "grüezi", "merci", "gäll", "lueg", "sali", "tschau", "ade",
            "hoi", "ciao", "guet", "viel", "chli", "müesli", "schoggi"
        ],
        "en-us": [
            "awesome", "cool", "guys", "super", "gonna", "wanna", "gotta",
            "y'all", "awesome", "totally", "hey", "hi there"
        ],
        "en-uk": [
            "lovely", "brilliant", "cheers", "mate", "rubbish", "quid",
            "innit", "whilst", "rather", "quite", "splendid"
        ],
        "es-latam": [
            "che", "vos", "plata", "chido", "órale", "pues", "mande",
            "ahorita", "chévere", "bacán"
        ],
    }
    
    # Sprachmarker für Basis-Erkennung
    LANGUAGE_MARKERS = {
        "de": ["der", "die", "das", "und", "ich", "ist", "bin", "habe", "war", "mit", "für", "auf", "nicht", "auch"],
        "en": ["the", "and", "is", "are", "have", "was", "with", "for", "not", "you", "this", "that", "what", "how"],
        "es": ["el", "la", "los", "las", "que", "de", "en", "un", "una", "es", "con", "para", "por", "como"],
        "fr": ["le", "la", "les", "de", "du", "des", "et", "est", "un", "une", "que", "pour", "avec", "dans"],
        "it": ["il", "la", "di", "che", "e", "un", "una", "per", "con", "sono", "non", "come", "questo"],
        "pt": ["o", "a", "de", "que", "e", "do", "da", "em", "um", "uma", "para", "com", "não", "como"],
        "nl": ["de", "het", "een", "van", "en", "in", "is", "dat", "op", "te", "voor", "met", "niet", "zijn"],
        "pl": ["i", "w", "na", "do", "z", "to", "nie", "się", "co", "jest", "tak", "jak", "ale", "czy"],
        "tr": ["ve", "bir", "bu", "da", "ile", "için", "var", "ne", "ben", "sen", "o", "çok", "daha"],
    }
    
    # Formalitäts-Marker
    FORMAL_MARKERS = {
        "de": ["Sie", "Ihnen", "Ihr", "Sehr geehrte", "Mit freundlichen Grüßen"],
        "en": ["Dear", "Sincerely", "Best regards", "Would you", "I would like to"],
        "es": ["Usted", "Estimado", "Atentamente", "Le saluda"],
        "fr": ["Vous", "Monsieur", "Madame", "Veuillez", "Cordialement"],
    }
    
    INFORMAL_MARKERS = {
        "de": ["du", "dir", "dein", "hey", "hi", "hallo", "na", "was geht", "lg"],
        "en": ["hi", "hey", "gonna", "wanna", "u", "ur", "thx", "pls"],
        "es": ["tú", "hola", "oye", "mira", "dale"],
        "fr": ["tu", "salut", "t'", "t'es", "stp"],
    }
    
    @classmethod
    def detect(cls, text: str) -> DetectedLanguage:
        """
        Erkennt Sprache, regionale Variante und Formalität.
        
        Args:
            text: Zu analysierender Text
            
        Returns:
            DetectedLanguage mit allen erkannten Attributen
        """
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        
        if not words:
            return DetectedLanguage(
                language_code="de",
                regional_variant=None,
                confidence=0.5,
                dialect_markers=[],
                formality="semi_formal"
            )
        
        # 1. Basis-Spracherkennung
        language_scores = {}
        for lang, markers in cls.LANGUAGE_MARKERS.items():
            score = sum(1 for word in words if word in markers)
            language_scores[lang] = score / len(words) if words else 0
        
        detected_lang = max(language_scores, key=language_scores.get)
        confidence = min(language_scores[detected_lang] * 10, 0.95)
        
        # 2. Regionale Variante erkennen
        regional_variant = None
        dialect_markers = []
        
        for variant, markers in cls.DIALECT_MARKERS.items():
            found_markers = [m for m in markers if m in text_lower]
            if found_markers:
                dialect_markers.extend(found_markers)
                # Variante mit meisten Markern gewinnt
                if regional_variant is None or len(found_markers) > len(dialect_markers):
                    regional_variant = variant
        
        # 3. Formalität erkennen
        formal_count = 0
        informal_count = 0
        
        formal_markers = cls.FORMAL_MARKERS.get(detected_lang, [])
        informal_markers = cls.INFORMAL_MARKERS.get(detected_lang, [])
        
        for marker in formal_markers:
            if marker.lower() in text_lower:
                formal_count += 1
        
        for marker in informal_markers:
            if marker.lower() in text_lower:
                informal_count += 1
        
        if formal_count > informal_count:
            formality = "formal"
        elif informal_count > formal_count:
            formality = "casual"
        else:
            formality = "semi_formal"
        
        return DetectedLanguage(
            language_code=detected_lang,
            regional_variant=regional_variant or detected_lang,
            confidence=confidence,
            dialect_markers=dialect_markers,
            formality=formality
        )


# =============================================================================
# BUYER TYPE DETECTION
# =============================================================================

class BuyerTypeDetector:
    """
    Erkennt Buyer Type (DISC) aus Chat-Verlauf.
    Heuristik-basiert (in Production: Claude API für präzisere Analyse).
    """
    
    # Signale für jeden Buyer Type
    TYPE_SIGNALS = {
        "analytical": {
            "keywords": [
                "studie", "studien", "daten", "zahlen", "prozent", "beweis", 
                "recherche", "vergleich", "genau", "details", "wie genau",
                "statistik", "quelle", "belegt", "wissenschaftlich",
                "analyse", "prüfen", "nachdenken", "überlegen"
            ],
            "patterns": [
                r"gibt es dazu\s+\w+",  # "Gibt es dazu Studien/Belege/Quellen"
                r"wie genau\s+\w+",
                r"kannst du mir\s+\w+\s+zeigen",
                r"welche\s+\w+\s+gibt es",
            ],
        },
        "driver": {
            "keywords": [
                "schnell", "direkt", "ergebnis", "kosten", "preis", "zeit",
                "sofort", "jetzt", "kurz", "konkret", "bottom line",
                "was bringt", "roi", "return", "deal", "abschluss",
                "nächster schritt", "action"
            ],
            "patterns": [
                r"was kostet",
                r"wie schnell",
                r"bottom line",
                r"was bringt mir",
                r"nächster schritt",
            ],
        },
        "expressive": {
            "keywords": [
                "spannend", "interessant", "wow", "cool", "super", "toll",
                "begeistert", "aufregend", "story", "geschichte", "erzähl",
                "fühlt sich an", "vision", "traum", "community", "team",
                "zusammen", "wir", "teilen"
            ],
            "patterns": [
                r"das klingt\s+\w+",
                r"stell dir vor",
                r"wer macht das noch",
                r"erzähl mir",
            ],
        },
        "amiable": {
            "keywords": [
                "nachdenken", "überlegen", "partner", "familie", "freunde",
                "empfehlung", "erfahrung", "vertrauen", "sicher", "risiko",
                "garantie", "was wenn", "andere", "meinung", "bedenken",
                "unterstützung", "hilfe"
            ],
            "patterns": [
                r"muss (ich )?nachdenken",
                r"mit\s+\w+\s+besprechen",
                r"was sagen andere",
                r"wie sind die erfahrungen",
            ],
        },
    }
    
    # Buying Stage Signale
    STAGE_SIGNALS = {
        "awareness": ["was ist", "noch nie gehört", "erzähl mir mehr", "wie funktioniert"],
        "consideration": ["vergleich", "unterschied", "alternative", "optionen", "features"],
        "decision": ["preis", "kosten", "wann können wir", "wie geht's weiter", "start"],
        "validation": ["richtig entschieden", "erste schritte", "wie nutze ich", "was jetzt"],
    }
    
    # Risk Profile Signale
    RISK_SIGNALS = {
        "risk_averse": ["garantie", "risiko", "sicher", "wenn es nicht", "rückgabe", "testen"],
        "risk_neutral": [],  # Default
        "risk_taker": ["sofort", "jetzt", "erste", "exklusiv", "neu", "innovation"],
    }
    
    @classmethod
    def detect(cls, chat_text: str) -> DetectedBuyerType:
        """
        Erkennt Buyer Type aus Chat-Verlauf.
        
        Args:
            chat_text: Der Chat-Verlauf als Text
            
        Returns:
            DetectedBuyerType mit Typ, Confidence und Signalen
        """
        text_lower = chat_text.lower()
        
        # 1. Buyer Type Score berechnen
        type_scores = {}
        type_signals = {}
        
        for buyer_type, data in cls.TYPE_SIGNALS.items():
            score = 0
            found_signals = []
            
            # Keyword-Matching
            for keyword in data["keywords"]:
                if keyword in text_lower:
                    score += 1
                    found_signals.append(keyword)
            
            # Pattern-Matching
            for pattern in data["patterns"]:
                if re.search(pattern, text_lower):
                    score += 2  # Patterns sind stärker gewichtet
                    found_signals.append(f"Pattern: {pattern}")
            
            type_scores[buyer_type] = score
            type_signals[buyer_type] = found_signals
        
        # Top Buyer Type ermitteln
        total_score = sum(type_scores.values())
        if total_score == 0:
            # Default: amiable (am häufigsten)
            detected_type = "amiable"
            confidence = 0.5
        else:
            detected_type = max(type_scores, key=type_scores.get)
            confidence = min(type_scores[detected_type] / max(total_score, 1), 0.95)
        
        # 2. Buying Stage erkennen
        stage_scores = {}
        for stage, signals in cls.STAGE_SIGNALS.items():
            stage_scores[stage] = sum(1 for s in signals if s in text_lower)
        
        detected_stage = max(stage_scores, key=stage_scores.get)
        if stage_scores[detected_stage] == 0:
            detected_stage = "consideration"  # Default
        
        # 3. Risk Profile erkennen
        risk_scores = {}
        for risk, signals in cls.RISK_SIGNALS.items():
            risk_scores[risk] = sum(1 for s in signals if s in text_lower)
        
        detected_risk = max(risk_scores, key=risk_scores.get)
        if risk_scores[detected_risk] == 0:
            detected_risk = "risk_neutral"  # Default
        
        return DetectedBuyerType(
            buyer_type=detected_type,
            confidence=confidence,
            signals=type_signals.get(detected_type, [])[:5],  # Top 5 Signale
            buying_stage=detected_stage,
            risk_profile=detected_risk
        )


# =============================================================================
# FRAMEWORK RECOMMENDER
# =============================================================================

class FrameworkRecommender:
    """
    Empfiehlt das beste Sales Framework basierend auf Kontext.
    """
    
    @classmethod
    def recommend(
        cls,
        buyer_type: Optional[str] = None,
        buying_stage: Optional[str] = None,
        industry: Optional[str] = None,
        deal_size: Optional[str] = None,
        sales_cycle: Optional[str] = None,
        situation_description: Optional[str] = None,
    ) -> FrameworkRecommendation:
        """
        Empfiehlt Framework basierend auf Kontext.
        """
        # Kombiniere alle Faktoren
        situation = situation_description or ""
        
        # Buyer Type → Framework Mapping
        buyer_framework_map = {
            "analytical": "spin",  # Analytiker lieben strukturierte Fragen
            "driver": "gap",       # Macher wollen schnell zum Punkt
            "expressive": "challenger",  # Visionäre brauchen neue Perspektiven
            "amiable": "solution",  # Beziehungsmenschen brauchen Vertrauen
        }
        
        # Industry → Framework Mapping
        industry_framework_map = {
            "b2b_saas": "gap",
            "b2b_services": "spin",
            "network_marketing": "solution",
            "real_estate": "spin",
            "insurance": "spin",
            "finance": "meddic",
            "coaching": "challenger",
            "enterprise": "meddic",
        }
        
        # Stage → Framework Preference
        stage_framework_map = {
            "awareness": "challenger",  # Awareness = neue Perspektive bieten
            "consideration": "spin",    # Consideration = Fragen stellen
            "decision": "snap",         # Decision = schnell abschließen
            "validation": "solution",   # Validation = Support bieten
        }
        
        # Entscheidungslogik
        scores = {}
        
        for fw_id in SALES_FRAMEWORKS.keys():
            scores[fw_id] = 0
        
        # Buyer Type Gewichtung (stärkstes Signal)
        if buyer_type and buyer_type in buyer_framework_map:
            scores[buyer_framework_map[buyer_type]] += 3
        
        # Industry Gewichtung
        if industry and industry in industry_framework_map:
            scores[industry_framework_map[industry]] += 2
        
        # Stage Gewichtung
        if buying_stage and buying_stage in stage_framework_map:
            scores[stage_framework_map[buying_stage]] += 1
        
        # Deal Size → Enterprise
        if deal_size == "enterprise" or (sales_cycle and sales_cycle == "long"):
            scores["meddic"] += 2
        
        # Situation Keywords
        if situation:
            situation_lower = situation.lower()
            if "denkt nach" in situation_lower or "überlegen" in situation_lower:
                scores["sandler"] += 2
            if "busy" in situation_lower or "keine zeit" in situation_lower:
                scores["snap"] += 2
            if "skeptisch" in situation_lower or "status quo" in situation_lower:
                scores["challenger"] += 2
        
        # Best Framework ermitteln
        best_fw_id = max(scores, key=scores.get)
        fw = get_framework(best_fw_id)
        
        # Reasoning generieren
        reasons = []
        if buyer_type:
            reasons.append(f"Buyer Type: {buyer_type}")
        if industry:
            reasons.append(f"Industry: {industry}")
        if buying_stage:
            reasons.append(f"Stage: {buying_stage}")
        
        reasoning = f"Empfohlen basierend auf: {', '.join(reasons) if reasons else 'Standard-Analyse'}"
        
        # Alternativen
        sorted_fws = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        alternatives = [fw_id for fw_id, _ in sorted_fws[1:3]]
        
        return FrameworkRecommendation(
            framework_id=best_fw_id,
            framework_name=fw.name,
            reasoning=reasoning,
            key_questions=fw.key_questions,
            alternatives=alternatives
        )


# =============================================================================
# MAIN SERVICE
# =============================================================================

class SalesIntelligenceService:
    """
    Haupt-Service für Sales Intelligence Integration.
    """
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.language_detector = LanguageDetector()
        self.buyer_detector = BuyerTypeDetector()
        self.framework_recommender = FrameworkRecommender()
    
    async def analyze_chat_and_build_context(
        self,
        user_id: str,
        lead_id: Optional[str],
        chat_text: str,
        industry: str = "network_marketing",
        additional_context: Optional[Dict[str, Any]] = None,
    ) -> SalesIntelligenceContext:
        """
        Analysiert einen Chat und baut den kompletten Sales Intelligence Context.
        
        Args:
            user_id: User ID
            lead_id: Lead ID (optional)
            chat_text: Der Chat-Verlauf
            industry: Die aktuelle Industry
            additional_context: Zusätzlicher Kontext
            
        Returns:
            SalesIntelligenceContext für CHIEF Integration
        """
        # 1. Sprache erkennen
        language = self.language_detector.detect(chat_text)
        
        # 2. Buyer Type erkennen
        buyer_type = self.buyer_detector.detect(chat_text)
        
        # 3. Framework empfehlen
        framework = self.framework_recommender.recommend(
            buyer_type=buyer_type.buyer_type,
            buying_stage=buyer_type.buying_stage,
            industry=industry,
        )
        
        # 4. Prompts bauen
        multilang_prompt = build_multilang_prompt(
            detected_language=language.regional_variant or language.language_code,
            user_formality=language.formality,
        )
        
        buyer_adapted_prompt = build_adapted_response_prompt(
            buyer_type=buyer_type.buyer_type,
            buying_stage=buyer_type.buying_stage,
            message_intent="respond",
        )
        
        framework_prompt = build_framework_prompt(
            framework_id=framework.framework_id,
        )
        
        industry_prompt = build_industry_prompt(industry)
        
        # 5. Profil speichern (falls lead_id)
        if lead_id:
            await self._save_psychology_profile(
                user_id=user_id,
                lead_id=lead_id,
                language=language,
                buyer_type=buyer_type,
            )
        
        return SalesIntelligenceContext(
            language=language,
            buyer_type=buyer_type,
            framework=framework,
            industry_prompt=industry_prompt,
            multilang_prompt=multilang_prompt,
            buyer_adapted_prompt=buyer_adapted_prompt,
            framework_prompt=framework_prompt,
        )
    
    async def _save_psychology_profile(
        self,
        user_id: str,
        lead_id: str,
        language: DetectedLanguage,
        buyer_type: DetectedBuyerType,
    ) -> None:
        """Speichert das Psychology Profile in der DB."""
        try:
            data = {
                "user_id": user_id,
                "lead_id": lead_id,
                "buyer_type": buyer_type.buyer_type,
                "buyer_type_confidence": buyer_type.confidence,
                "buyer_type_signals": buyer_type.signals,
                "buyer_type_detected_at": datetime.now().isoformat(),
                "buying_stage": buyer_type.buying_stage,
                "buying_stage_confidence": buyer_type.confidence,
                "risk_profile": buyer_type.risk_profile,
                "updated_at": datetime.now().isoformat(),
            }
            
            # Upsert
            self.supabase.table("lead_psychology_profiles").upsert(
                data,
                on_conflict="user_id,lead_id"
            ).execute()
        except Exception as e:
            # Log but don't fail
            print(f"Warning: Could not save psychology profile: {e}")
    
    async def get_micro_coaching(
        self,
        action_type: str,
        context: Dict[str, Any],
    ) -> str:
        """
        Generiert Micro-Coaching Feedback.
        
        Args:
            action_type: "message_sent", "response_received", etc.
            context: Zusätzlicher Kontext
            
        Returns:
            Kurzes Coaching-Feedback
        """
        return get_micro_coaching_feedback(action_type, context)
    
    async def calculate_lead_momentum(
        self,
        user_id: str,
        lead_id: str,
    ) -> Dict[str, Any]:
        """
        Berechnet den Momentum Score für einen Lead.
        """
        try:
            # Signale aus DB laden
            result = self.supabase.table("deal_momentum_signals").select("*").eq(
                "user_id", user_id
            ).eq("lead_id", lead_id).order("detected_at", desc=True).limit(30).execute()
            
            if not result.data:
                return {"score": 5, "trend": "stable", "recommendation": "Mehr Daten sammeln"}
            
            # In MomentumSignal Format konvertieren
            signals = [
                MomentumSignal(
                    type=row["signal_type"],
                    signal=row["signal_name"],
                    weight=row.get("signal_weight", 1.0),
                    timestamp=datetime.fromisoformat(row["detected_at"].replace("Z", "+00:00")),
                    description=row.get("description", ""),
                )
                for row in result.data
            ]
            
            return calculate_momentum_score(signals)
        except Exception as e:
            print(f"Warning: Could not calculate momentum: {e}")
            return {"score": 5, "trend": "stable", "recommendation": "Fehler bei Berechnung"}
    
    def build_chief_context_section(
        self,
        context: SalesIntelligenceContext,
    ) -> str:
        """
        Baut den CHIEF Context Abschnitt für Sales Intelligence.
        """
        sections = []
        
        # Language Context
        if context.language.confidence > 0.7:
            sections.append(f"""
═══════════════════════════════════════════════════════════════════════════════
SPRACHE & KULTUR
═══════════════════════════════════════════════════════════════════════════════
Erkannte Sprache: {context.language.language_code} ({context.language.regional_variant})
Formalität: {context.language.formality}
Confidence: {context.language.confidence:.0%}

{context.multilang_prompt[:500]}...
""")
        
        # Buyer Type Context
        if context.buyer_type and context.buyer_type.confidence > 0.6:
            sections.append(f"""
═══════════════════════════════════════════════════════════════════════════════
BUYER PSYCHOLOGY
═══════════════════════════════════════════════════════════════════════════════
Buyer Type: {context.buyer_type.buyer_type.upper()} ({context.buyer_type.confidence:.0%})
Buying Stage: {context.buyer_type.buying_stage}
Risk Profile: {context.buyer_type.risk_profile}
Erkannte Signale: {', '.join(context.buyer_type.signals[:3])}

{context.buyer_adapted_prompt}
""")
        
        # Framework Context
        if context.framework:
            sections.append(f"""
═══════════════════════════════════════════════════════════════════════════════
EMPFOHLENES FRAMEWORK
═══════════════════════════════════════════════════════════════════════════════
Framework: {context.framework.framework_name}
Begründung: {context.framework.reasoning}

Key Questions:
{chr(10).join([f'• "{q}"' for q in context.framework.key_questions[:3]])}
""")
        
        return "\n".join(sections)


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "SalesIntelligenceService",
    "LanguageDetector",
    "BuyerTypeDetector",
    "FrameworkRecommender",
    "DetectedLanguage",
    "DetectedBuyerType",
    "FrameworkRecommendation",
    "SalesIntelligenceContext",
]

