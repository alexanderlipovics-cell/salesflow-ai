"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CORRECTION ANALYSIS SERVICE                                               ║
║  Nutzt Claude für intelligente Regel-Extraktion                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Analysiert User-Korrekturen und extrahiert lernbare Regeln.

Flow:
    1. Korrektur wird eingereicht (original vs. corrected)
    2. Service analysiert mit Claude was geändert wurde
    3. Claude schlägt generalisierbare Regel vor
    4. Regel wird mit Confidence-Score zurückgegeben
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
import json
import re
import os

import anthropic
from pydantic import BaseModel, Field


class SuggestedRule(BaseModel):
    """Vorgeschlagene Regel aus Korrektur-Analyse."""
    rule_type: str = Field(..., description="tone, structure, vocabulary, etc.")
    title: str = Field(..., max_length=100)
    description: str
    instruction: str = Field(..., max_length=200)
    examples: List[Dict[str, str]] = []  # [{"bad": "...", "good": "..."}]
    confidence: float = Field(ge=0.0, le=1.0)  # 0-1


class AnalysisResult(BaseModel):
    """Ergebnis der Korrektur-Analyse."""
    is_learnable: bool
    change_type: str
    change_description: str
    suggested_rule: Optional[SuggestedRule] = None
    reasoning: str


class CorrectionAnalysisService:
    """
    Analysiert Korrekturen mit Claude und extrahiert lernbare Regeln.
    
    Das Ziel ist es, aus User-Korrekturen GENERALISIERBARE Regeln zu
    extrahieren, die auf andere Situationen übertragbar sind.
    """
    
    SYSTEM_PROMPT = """Du bist ein Experte für Sales-Kommunikation und analysierst 
Textkorrekturen um daraus lernbare Regeln für einen KI-Sales-Coach zu extrahieren.

WICHTIG:
- Nur GENERALISIERBARE Regeln sind wertvoll
- Zu spezifische Änderungen (nur ein Name, nur eine Zahl) sind NICHT lernbar
- Die Regel muss auf ANDERE Situationen übertragbar sein
- Instruktionen müssen KLAR und UMSETZBAR sein (imperativ formuliert)

REGEL-TYPEN:
- tone: Wie der Text klingen soll (formell/locker, direkt/höflich, selbstbewusst)
- structure: Aufbau (kurz/lang, Fragen am Ende, Absätze)
- vocabulary: Bestimmte Wörter nutzen/vermeiden
- emoji: Emoji-Nutzung (mehr/weniger, welche)
- greeting: Art der Begrüßung
- closing: Art des Abschlusses
- formality: Sie vs. du
- length: Nachrichtenlänge
- custom: Andere

GUTE INSTRUKTIONS-BEISPIELE:
- "Verwende 'du' statt 'Sie'"
- "Beginne Nachrichten nie mit 'Ich würde gerne...'"
- "Halte erste Nachrichten unter 3 Sätzen"
- "Nutze maximal 1 Emoji pro Nachricht"
- "Beende Nachrichten mit einer offenen Frage"
- "Vermeide unsichere Formulierungen wie 'vielleicht' oder 'eventuell'"

SCHLECHTE INSTRUKTIONEN (zu spezifisch):
- "Nenne den Interessenten Anna" (nur ein Name)
- "Erwähne das Meeting am Dienstag" (zu situationsspezifisch)
- "Schreib 147 Zeichen" (zu präzise)"""

    def __init__(self):
        self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    def analyze(
        self,
        original: str,
        corrected: str,
        context: Optional[Dict] = None,
    ) -> AnalysisResult:
        """
        Analysiert eine Korrektur und extrahiert lernbare Regeln.
        
        Args:
            original: Ursprünglicher KI-Vorschlag
            corrected: Vom User korrigierter Text
            context: Optionaler Kontext (channel, lead_status, etc.)
        
        Returns:
            AnalysisResult mit Regel-Vorschlag (wenn lernbar)
        """
        
        context_str = ""
        if context:
            parts = []
            if context.get("channel"):
                parts.append(f"Kanal: {context['channel']}")
            if context.get("lead_status"):
                parts.append(f"Lead-Status: {context['lead_status']}")
            if context.get("message_type"):
                parts.append(f"Nachrichtentyp: {context['message_type']}")
            if context.get("disg_type"):
                parts.append(f"DISG-Typ: {context['disg_type']}")
            
            if parts:
                context_str = f"\n\nKONTEXT:\n- " + "\n- ".join(parts)
        
        prompt = f"""Analysiere diese Textkorrektur und extrahiere eine lernbare Regel.

ORIGINAL (KI-Vorschlag):
"{original}"

KORRIGIERT (vom User):
"{corrected}"
{context_str}

DEINE AUFGABE:
1. Was wurde geändert? (Ton, Struktur, Wortwahl, Länge, Emojis, etc.)
2. Warum könnte der User das geändert haben?
3. Ist daraus eine GENERALISIERBARE Regel ableitbar?

Antworte NUR mit diesem JSON:
{{
    "is_learnable": true/false,
    "change_type": "tone|structure|vocabulary|emoji|greeting|closing|formality|length|custom",
    "change_description": "Was wurde geändert? (1 Satz)",
    "suggested_rule": {{
        "rule_type": "tone|structure|vocabulary|emoji|greeting|closing|formality|length|custom",
        "title": "Kurzer Titel (max 50 Zeichen)",
        "description": "Was soll die KI anders machen? (1-2 Sätze)",
        "instruction": "Konkrete Anweisung für die KI, imperativ (max 100 Zeichen)",
        "examples": [
            {{"bad": "Beispiel wie NICHT schreiben", "good": "Beispiel wie BESSER schreiben"}}
        ],
        "confidence": 0.0-1.0
    }},
    "reasoning": "Kurze Begründung warum lernbar oder nicht (1-2 Sätze)"
}}

Bei is_learnable=false: setze suggested_rule auf null."""

        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                
                suggested_rule = None
                if data.get("suggested_rule") and data.get("is_learnable"):
                    rule_data = data["suggested_rule"]
                    suggested_rule = SuggestedRule(
                        rule_type=rule_data.get("rule_type", "custom"),
                        title=rule_data.get("title", "Gelernte Präferenz")[:100],
                        description=rule_data.get("description", ""),
                        instruction=rule_data.get("instruction", "")[:200],
                        examples=rule_data.get("examples", []),
                        confidence=float(rule_data.get("confidence", 0.5)),
                    )
                
                return AnalysisResult(
                    is_learnable=data.get("is_learnable", False),
                    change_type=data.get("change_type", "custom"),
                    change_description=data.get("change_description", "Unbekannte Änderung"),
                    suggested_rule=suggested_rule,
                    reasoning=data.get("reasoning", ""),
                )
        
        except json.JSONDecodeError as e:
            print(f"JSON parse error in analysis: {e}")
            print(f"Response content: {content if 'content' in dir() else 'N/A'}")
        except Exception as e:
            print(f"Analysis error: {e}")
        
        # Fallback
        return AnalysisResult(
            is_learnable=False,
            change_type="unknown",
            change_description="Analyse fehlgeschlagen",
            suggested_rule=None,
            reasoning="Technischer Fehler bei der Analyse",
        )
    
    def batch_analyze(
        self,
        corrections: List[Dict[str, Any]],
    ) -> List[AnalysisResult]:
        """
        Analysiert mehrere Korrekturen.
        
        Args:
            corrections: Liste von {"original": str, "corrected": str, "context": dict}
        
        Returns:
            Liste von AnalysisResult
        """
        results = []
        for corr in corrections:
            result = self.analyze(
                original=corr.get("original", ""),
                corrected=corr.get("corrected", ""),
                context=corr.get("context"),
            )
            results.append(result)
        
        return results
    
    def extract_common_patterns(
        self,
        corrections: List[Dict[str, Any]],
    ) -> List[SuggestedRule]:
        """
        Analysiert mehrere Korrekturen und extrahiert gemeinsame Muster.
        
        Nützlich für Batch-Verarbeitung von vielen Korrekturen um
        übergreifende Regeln zu finden.
        """
        
        if len(corrections) < 2:
            return []
        
        # Sammle alle Korrekturen in einem Prompt
        correction_texts = []
        for i, corr in enumerate(corrections[:10], 1):  # Max 10 für Prompt-Länge
            correction_texts.append(
                f"{i}. ORIGINAL: \"{corr.get('original', '')[:150]}\"\n"
                f"   KORRIGIERT: \"{corr.get('corrected', '')[:150]}\""
            )
        
        prompt = f"""Analysiere diese {len(correction_texts)} Korrekturen und finde GEMEINSAME MUSTER.

{chr(10).join(correction_texts)}

Gibt es wiederkehrende Änderungsmuster? Wenn ja, welche generalisierbaren Regeln 
lassen sich daraus ableiten?

Antworte mit JSON:
{{
    "patterns_found": [
        {{
            "pattern_description": "Was wurde wiederholt geändert?",
            "frequency": 1-10,
            "rule": {{
                "rule_type": "tone|structure|vocabulary|...",
                "title": "Kurzer Titel",
                "description": "Beschreibung",
                "instruction": "Anweisung (imperativ)",
                "confidence": 0.0-1.0
            }}
        }}
    ],
    "no_patterns_reason": "Warum keine Muster (falls keine gefunden)"
}}"""

        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            json_match = re.search(r'\{[\s\S]*\}', content)
            
            if json_match:
                data = json.loads(json_match.group())
                patterns = data.get("patterns_found", [])
                
                rules = []
                for pattern in patterns:
                    if pattern.get("rule") and pattern.get("frequency", 0) >= 2:
                        rule_data = pattern["rule"]
                        rules.append(SuggestedRule(
                            rule_type=rule_data.get("rule_type", "custom"),
                            title=rule_data.get("title", "")[:100],
                            description=rule_data.get("description", ""),
                            instruction=rule_data.get("instruction", "")[:200],
                            examples=[],
                            confidence=float(rule_data.get("confidence", 0.5)),
                        ))
                
                return rules
        
        except Exception as e:
            print(f"Pattern extraction error: {e}")
        
        return []

