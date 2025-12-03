"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CONFIDENCE ENGINE                                                         ║
║  Berechnet Trust Scores für Autopilot-Entscheidungen                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Faktoren:
1. Knowledge Match (0-30) - Wie gut passt die Antwort zur Knowledge Base
2. Intent Clarity (0-25) - Wie klar ist der Intent erkennbar
3. Response Fit (0-25) - Wie gut passt die Response zum Lead
4. Risk Assessment (0-20) - Wie riskant ist die Auto-Aktion
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from ...config.prompts.chief_autopilot import (
    MessageIntent,
    LeadTemperature,
    ConfidenceBreakdown,
    AutopilotAction,
    AutopilotSettings,
    LeadAutopilotOverride,
    calculate_confidence_score,
    decide_action
)


@dataclass
class ConfidenceResult:
    """Vollständiges Ergebnis der Confidence-Berechnung."""
    score: int
    breakdown: ConfidenceBreakdown
    action: AutopilotAction
    reasoning: str
    recommendations: List[str]
    risk_factors: List[str]


class ConfidenceEngine:
    """
    Berechnet Confidence Scores für Autopilot-Aktionen.
    
    Das Sicherheitsnetz das verhindert, dass die KI:
    - Falsche Infos rausschickt
    - Unpassende Antworten sendet
    - In heiklen Situationen automatisch handelt
    """
    
    def __init__(self, knowledge_service=None):
        """
        Args:
            knowledge_service: Service für Knowledge Base Lookup
        """
        self.knowledge_service = knowledge_service
        
        # Intent → Basis-Risiko Mapping
        self.intent_risk_map = {
            # Niedriges Risiko
            MessageIntent.SIMPLE_INFO: "low",
            MessageIntent.SPECIFIC_QUESTION: "low",
            MessageIntent.SCHEDULING: "low",
            
            # Mittleres Risiko
            MessageIntent.PRICE_INQUIRY: "medium",
            MessageIntent.BOOKING_REQUEST: "medium",
            MessageIntent.TIME_OBJECTION: "medium",
            MessageIntent.RESCHEDULE: "medium",
            
            # Hohes Risiko
            MessageIntent.READY_TO_BUY: "high",  # Hohes Risiko = wichtig!
            MessageIntent.PRICE_OBJECTION: "high",
            MessageIntent.TRUST_OBJECTION: "high",
            MessageIntent.COMPLEX_OBJECTION: "high",
            MessageIntent.CANCELLATION: "high",
            MessageIntent.NOT_INTERESTED: "high",
            
            # Spam/Unclear
            MessageIntent.SPAM: "low",  # Auto-Archive ist ok
            MessageIntent.IRRELEVANT: "low",
            MessageIntent.UNCLEAR: "high",  # Unsicher = Risiko
        }
    
    def calculate(
        self,
        intent: MessageIntent,
        intent_confidence: float,
        response_message: str,
        lead_context: Optional[Dict[str, Any]] = None,
        knowledge_match: Optional[Dict[str, Any]] = None,
        settings: Optional[AutopilotSettings] = None,
        lead_override: Optional[LeadAutopilotOverride] = None
    ) -> ConfidenceResult:
        """
        Berechnet den vollständigen Confidence Score.
        
        Args:
            intent: Der erkannte Intent
            intent_confidence: Wie sicher ist der Intent (0-1)
            response_message: Die geplante Antwort
            lead_context: Kontext über den Lead
            knowledge_match: Ergebnis aus Knowledge Base Suche
            settings: User Autopilot-Settings
            lead_override: Per-Lead Override
            
        Returns:
            ConfidenceResult mit Score, Action und Empfehlungen
        """
        settings = settings or AutopilotSettings()
        lead_context = lead_context or {}
        knowledge_match = knowledge_match or {}
        
        # 1. Knowledge Match Score (0-30)
        km_score, km_type = self._score_knowledge_match(knowledge_match)
        
        # 2. Intent Clarity Score (0-25)
        ic_score = self._score_intent_clarity(intent_confidence, intent)
        
        # 3. Response Fit Score (0-25)
        rf_score, rf_type = self._score_response_fit(
            intent, 
            response_message, 
            lead_context
        )
        
        # 4. Risk Assessment Score (0-20)
        ra_score, risk_level = self._score_risk(intent, lead_context, lead_override)
        
        # Breakdown erstellen
        breakdown = ConfidenceBreakdown(
            knowledge_match=km_score,
            intent_clarity=ic_score,
            response_fit=rf_score,
            risk_assessment=ra_score,
            total=km_score + ic_score + rf_score + ra_score
        )
        
        # Action bestimmen
        action = decide_action(
            confidence_score=breakdown.total,
            threshold=settings.confidence_threshold,
            lead_override=lead_override
        )
        
        # Reasoning generieren
        reasoning = self._generate_reasoning(
            breakdown, km_type, rf_type, risk_level, intent
        )
        
        # Recommendations
        recommendations = self._generate_recommendations(
            breakdown, action, intent, lead_context
        )
        
        # Risk Factors
        risk_factors = self._identify_risk_factors(
            intent, lead_context, breakdown
        )
        
        return ConfidenceResult(
            score=breakdown.total,
            breakdown=breakdown,
            action=action,
            reasoning=reasoning,
            recommendations=recommendations,
            risk_factors=risk_factors
        )
    
    def _score_knowledge_match(
        self, 
        knowledge_match: Dict[str, Any]
    ) -> tuple[int, str]:
        """Bewertet wie gut die Knowledge Base zur Frage passt."""
        
        if not knowledge_match:
            return 10, "inferred"  # Generische Antwort
        
        match_type = knowledge_match.get("match_type", "none")
        similarity = knowledge_match.get("similarity", 0)
        
        if match_type == "exact" or similarity > 0.95:
            return 30, "exact"
        elif match_type == "similar" or similarity > 0.8:
            return 20, "similar"
        elif similarity > 0.6:
            return 15, "partial"
        elif similarity > 0.4:
            return 10, "inferred"
        
        return 5, "none"
    
    def _score_intent_clarity(
        self, 
        intent_confidence: float, 
        intent: MessageIntent
    ) -> int:
        """Bewertet wie klar der Intent erkennbar ist."""
        
        # Klare Intents bekommen Bonus
        clear_intents = [
            MessageIntent.PRICE_INQUIRY,
            MessageIntent.READY_TO_BUY,
            MessageIntent.NOT_INTERESTED,
            MessageIntent.SCHEDULING
        ]
        
        base_score = 0
        if intent_confidence > 0.9:
            base_score = 25
        elif intent_confidence > 0.8:
            base_score = 20
        elif intent_confidence > 0.7:
            base_score = 15
        elif intent_confidence > 0.5:
            base_score = 10
        else:
            base_score = 5
        
        # Bonus für eindeutige Intents
        if intent in clear_intents and intent_confidence > 0.7:
            base_score = min(25, base_score + 5)
        
        return base_score
    
    def _score_response_fit(
        self,
        intent: MessageIntent,
        response: str,
        lead_context: Dict[str, Any]
    ) -> tuple[int, str]:
        """Bewertet wie gut die Response zum Lead passt."""
        
        # Basis-Score nach Intent-Matching
        score = 15  # Default: "good"
        fit_type = "good"
        
        # Prüfe ob Response zur Lead-Situation passt
        lead_status = lead_context.get("status", "new")
        interaction_count = lead_context.get("interaction_count", 0)
        
        # Neue Leads brauchen mehr Kontext
        if interaction_count == 0 and len(response) > 200:
            score = 20
            fit_type = "detailed_for_new"
        
        # Bekannte Leads können kürzer sein
        elif interaction_count > 5:
            score = 22
            fit_type = "familiar"
        
        # Prüfe Response-Länge
        if len(response) < 20:
            score = min(score, 10)
            fit_type = "too_short"
        elif len(response) > 500:
            score = min(score, 12)
            fit_type = "too_long"
        
        # VIP Leads
        if lead_context.get("is_vip", False):
            # VIP braucht extra Sorgfalt
            score = min(score, 15)
            fit_type = "vip_needs_review"
        
        return score, fit_type
    
    def _score_risk(
        self,
        intent: MessageIntent,
        lead_context: Dict[str, Any],
        lead_override: Optional[LeadAutopilotOverride]
    ) -> tuple[int, str]:
        """Bewertet das Risiko der Auto-Aktion."""
        
        base_risk = self.intent_risk_map.get(intent, "medium")
        
        # Lead-Override erhöht ggf. das Risiko
        if lead_override:
            if lead_override.is_vip:
                base_risk = "high"
            elif lead_override.mode == "careful":
                base_risk = "high"
        
        # High-Value Leads = höheres Risiko
        if lead_context.get("estimated_value", 0) > 1000:
            if base_risk == "low":
                base_risk = "medium"
            elif base_risk == "medium":
                base_risk = "high"
        
        # Beschwerden in History = höheres Risiko
        if lead_context.get("has_complaints", False):
            base_risk = "high"
        
        # Score zuweisen
        risk_scores = {
            "low": 20,
            "medium": 10,
            "high": 0
        }
        
        return risk_scores.get(base_risk, 10), base_risk
    
    def _generate_reasoning(
        self,
        breakdown: ConfidenceBreakdown,
        km_type: str,
        rf_type: str,
        risk_level: str,
        intent: MessageIntent
    ) -> str:
        """Generiert eine menschenlesbare Begründung."""
        
        parts = []
        
        # Knowledge Match
        km_reasons = {
            "exact": "Antwort direkt aus Knowledge Base",
            "similar": "Ähnlicher Case in Knowledge Base gefunden",
            "partial": "Teilweise relevante Knowledge verfügbar",
            "inferred": "Generalisierte Antwort ohne exakte Knowledge",
            "none": "Keine passende Knowledge gefunden"
        }
        parts.append(km_reasons.get(km_type, "Knowledge Match unklar"))
        
        # Intent
        if breakdown.intent_clarity >= 20:
            parts.append(f"Intent '{intent.value}' ist klar erkennbar")
        elif breakdown.intent_clarity >= 15:
            parts.append(f"Intent '{intent.value}' ist wahrscheinlich")
        else:
            parts.append("Intent ist unklar")
        
        # Response Fit
        rf_reasons = {
            "detailed_for_new": "Ausführliche Antwort für neuen Lead",
            "familiar": "Lead ist bekannt, kurze Antwort ok",
            "too_short": "Antwort möglicherweise zu kurz",
            "too_long": "Antwort möglicherweise zu lang",
            "vip_needs_review": "VIP Lead - extra Prüfung empfohlen",
            "good": "Antwort passt zum Lead-Profil"
        }
        parts.append(rf_reasons.get(rf_type, "Response Fit ok"))
        
        # Risk
        risk_reasons = {
            "low": "Niedriges Risiko",
            "medium": "Mittleres Risiko - Vorsicht geboten",
            "high": "Hohes Risiko - menschliche Prüfung empfohlen"
        }
        parts.append(risk_reasons.get(risk_level, "Risiko unklar"))
        
        return ". ".join(parts) + f". Score: {breakdown.total}/100."
    
    def _generate_recommendations(
        self,
        breakdown: ConfidenceBreakdown,
        action: AutopilotAction,
        intent: MessageIntent,
        lead_context: Dict[str, Any]
    ) -> List[str]:
        """Generiert Handlungsempfehlungen."""
        
        recs = []
        
        if action == AutopilotAction.AUTO_SEND:
            recs.append("✅ Auto-Send freigegeben - hohe Confidence")
            
        elif action == AutopilotAction.DRAFT_REVIEW:
            recs.append("📝 Entwurf prüfen - Confidence im Grenzbereich")
            
            if breakdown.knowledge_match < 20:
                recs.append("💡 Tipp: Knowledge Base um diesen Fall ergänzen")
            
            if breakdown.response_fit < 15:
                recs.append("✏️ Antwort ggf. personalisieren")
                
        elif action == AutopilotAction.HUMAN_NEEDED:
            recs.append("🚨 Menschliche Antwort erforderlich")
            
            if breakdown.intent_clarity < 15:
                recs.append("❓ Intent unklar - Rückfrage stellen")
            
            if breakdown.risk_assessment == 0:
                recs.append("⚠️ Heikle Situation - vorsichtig antworten")
            
            if intent == MessageIntent.COMPLEX_OBJECTION:
                recs.append("💬 Emotionaler Einwand - empathisch reagieren")
        
        # Lead-spezifische Empfehlungen
        if lead_context.get("is_vip"):
            recs.append("👑 VIP Lead - persönliche Note einbauen")
        
        if lead_context.get("days_since_last_contact", 0) > 7:
            recs.append("📅 Lange her - Kontext wieder aufbauen")
        
        return recs
    
    def _identify_risk_factors(
        self,
        intent: MessageIntent,
        lead_context: Dict[str, Any],
        breakdown: ConfidenceBreakdown
    ) -> List[str]:
        """Identifiziert potenzielle Risikofaktoren."""
        
        risks = []
        
        # Intent-basierte Risiken
        if intent == MessageIntent.PRICE_OBJECTION:
            risks.append("Preis-Einwand kann eskalieren")
        
        if intent == MessageIntent.COMPLEX_OBJECTION:
            risks.append("Emotionale Situation erfordert Fingerspitzengefühl")
        
        if intent == MessageIntent.READY_TO_BUY:
            risks.append("Closing-Phase - Fehler kostet den Deal")
        
        # Context-basierte Risiken
        if lead_context.get("previous_negative_response"):
            risks.append("Lead hatte zuvor negative Reaktion")
        
        if lead_context.get("estimated_value", 0) > 1000:
            risks.append("High-Value Deal - besondere Sorgfalt")
        
        if lead_context.get("is_vip"):
            risks.append("VIP Status - Reputation wichtig")
        
        # Score-basierte Risiken
        if breakdown.knowledge_match < 15:
            risks.append("Antwort nicht durch Knowledge Base gestützt")
        
        if breakdown.intent_clarity < 15:
            risks.append("Intent-Erkennung unsicher")
        
        return risks


def quick_confidence_check(
    intent: MessageIntent,
    intent_confidence: float,
    is_vip: bool = False,
    has_knowledge_match: bool = True
) -> tuple[int, AutopilotAction]:
    """
    Schneller Confidence-Check ohne vollständige Analyse.
    
    Für einfache Fälle wo eine schnelle Entscheidung reicht.
    """
    
    # Basis-Score
    score = 70
    
    # Intent Confidence
    if intent_confidence > 0.9:
        score += 15
    elif intent_confidence > 0.7:
        score += 10
    else:
        score -= 10
    
    # Knowledge
    if has_knowledge_match:
        score += 10
    else:
        score -= 15
    
    # VIP
    if is_vip:
        score -= 20  # Immer vorsichtiger bei VIPs
    
    # Risiko-Intents
    high_risk_intents = [
        MessageIntent.READY_TO_BUY,
        MessageIntent.COMPLEX_OBJECTION,
        MessageIntent.PRICE_OBJECTION
    ]
    if intent in high_risk_intents:
        score -= 15
    
    # Low-Risk Intents
    low_risk_intents = [
        MessageIntent.SIMPLE_INFO,
        MessageIntent.SCHEDULING,
        MessageIntent.SPAM
    ]
    if intent in low_risk_intents:
        score += 10
    
    # Clamp
    score = max(0, min(100, score))
    
    # Action
    if score >= 90:
        action = AutopilotAction.AUTO_SEND
    elif score >= 70:
        action = AutopilotAction.DRAFT_REVIEW
    else:
        action = AutopilotAction.HUMAN_NEEDED
    
    return score, action

