"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CORRECTION DETECTION SERVICE                                              ║
║  Intelligente Erkennung signifikanter User-Korrekturen                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Entscheidet, wann das Teach-Modal getriggert wird.

Logik:
    1. Similarity Check: Texte unter 85% Ähnlichkeit → interessant
    2. Minimum Change: Mindestens 10 Zeichen oder 3 Wörter geändert
    3. Pattern Detection: Erkennt wichtige Änderungen (Ton, Formality, etc.)
    4. Ignore Patterns: Namen, Links, Zahlen werden ignoriert
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from difflib import SequenceMatcher
import re


@dataclass
class CorrectionDetectionResult:
    """Ergebnis der Korrektur-Erkennung."""
    should_show_modal: bool
    similarity_score: float
    char_diff: int
    word_diff: int
    change_significance: str  # 'minor', 'moderate', 'significant'
    detected_changes: Dict[str, Any]
    reason: Optional[str] = None


class CorrectionDetectionService:
    """
    Entscheidet, ob eine Änderung signifikant genug ist für das Teach-Modal.
    
    Das Ziel: Nur bei wirklich lernbaren Änderungen fragen, um User nicht
    mit zu vielen Popups zu nerven.
    """
    
    # Thresholds
    SIMILARITY_THRESHOLD = 0.85          # Unter 85% → Modal zeigen
    MIN_CHAR_DIFF = 10                   # Mindestens 10 Zeichen geändert
    MIN_WORD_DIFF = 3                    # Mindestens 3 Wörter geändert
    
    # Ignore patterns (keine Regel lernen für...)
    IGNORE_PATTERNS = [
        r'^[A-Z][a-z]+$',                # Nur Name geändert
        r'^\d+$',                         # Nur Zahlen geändert
        r'^https?://',                    # Nur Link geändert
        r'^@\w+$',                        # Nur @mention geändert
        r'^\+\d+',                        # Telefonnummern
    ]
    
    # Wichtige Phrasen die Ton-Änderungen signalisieren
    HEDGING_PHRASES = [
        'ich würde gerne',
        'ich wollte fragen',
        'ich wollte mal',
        'darf ich',
        'könntest du',
        'wäre es möglich',
        'wenn du zeit hast',
        'falls du magst',
        'vielleicht könnten wir',
        'ich dachte mir',
    ]
    
    APOLOGETIC_PHRASES = [
        'sorry für',
        'entschuldige',
        'entschuldigung',
        'tut mir leid',
        'ich hoffe ich störe nicht',
        'stör ich gerade',
    ]
    
    DIRECT_PHRASES = [
        'lass uns',
        'schau dir an',
        'check mal',
        'meld dich',
        'sag mir',
        'zeig ich dir',
    ]
    
    def detect(
        self, 
        original: str, 
        final: str,
        context: Optional[Dict] = None,
    ) -> CorrectionDetectionResult:
        """
        Analysiert Änderung und entscheidet über Modal-Anzeige.
        
        Args:
            original: Ursprünglicher KI-Vorschlag
            final: Vom User finalisierter Text
            context: Optionaler Kontext (channel, lead_status, etc.)
        
        Returns:
            CorrectionDetectionResult mit Entscheidung und Details
        """
        
        # Quick exit: identische Texte
        if original == final:
            return CorrectionDetectionResult(
                should_show_modal=False,
                similarity_score=1.0,
                char_diff=0,
                word_diff=0,
                change_significance="none",
                detected_changes={},
                reason="Keine Änderung",
            )
        
        # Normalize für Vergleich
        original_clean = self._normalize(original)
        final_clean = self._normalize(final)
        
        # Basic metrics
        similarity = self._calculate_similarity(original_clean, final_clean)
        char_diff = abs(len(final) - len(original))
        word_diff = abs(len(final.split()) - len(original.split()))
        
        # Detect specific changes
        changes = self._detect_changes(original, final, original_clean, final_clean)
        
        # Determine significance
        significance = self._determine_significance(similarity, char_diff, word_diff, changes)
        
        # Decision logic
        should_show = self._should_show_modal(
            similarity=similarity,
            char_diff=char_diff,
            word_diff=word_diff,
            changes=changes,
            significance=significance,
        )
        
        reason = None
        if not should_show:
            reason = self._get_skip_reason(similarity, char_diff, word_diff, changes)
        
        return CorrectionDetectionResult(
            should_show_modal=should_show,
            similarity_score=round(similarity, 3),
            char_diff=char_diff,
            word_diff=word_diff,
            change_significance=significance,
            detected_changes=changes,
            reason=reason,
        )
    
    def _normalize(self, text: str) -> str:
        """Normalisiert Text für Vergleich."""
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        return text
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Berechnet Ähnlichkeit (0-1) mit SequenceMatcher."""
        return SequenceMatcher(None, text1, text2).ratio()
    
    def _detect_changes(
        self, 
        original: str, 
        final: str,
        original_clean: str,
        final_clean: str,
    ) -> Dict[str, Any]:
        """Erkennt spezifische Änderungsmuster."""
        
        changes = {
            "tone_changed": False,
            "structure_changed": False,
            "length_changed": False,
            "greeting_changed": False,
            "closing_changed": False,
            "emoji_changed": False,
            "formality_changed": False,
            "hedging_removed": False,
            "made_more_direct": False,
            "specific_words": [],
            "patterns_found": [],
        }
        
        # 1. Length change (> 30% difference)
        orig_len = len(original)
        final_len = len(final)
        if orig_len > 0 and abs(orig_len - final_len) / orig_len > 0.3:
            changes["length_changed"] = True
            changes["patterns_found"].append("length_changed")
        
        # 2. Emoji change
        orig_emoji = len(re.findall(r'[\U0001F300-\U0001F9FF]', original))
        final_emoji = len(re.findall(r'[\U0001F300-\U0001F9FF]', final))
        if orig_emoji != final_emoji:
            changes["emoji_changed"] = True
            changes["patterns_found"].append(
                f"emoji_{'added' if final_emoji > orig_emoji else 'removed'}"
            )
        
        # 3. Greeting change
        greetings = ['hey', 'hi', 'hallo', 'servus', 'moin', 'guten tag', 'grüß gott', 'mahlzeit']
        orig_greeting = next((g for g in greetings if g in original_clean[:30]), None)
        final_greeting = next((g for g in greetings if g in final_clean[:30]), None)
        if orig_greeting != final_greeting:
            changes["greeting_changed"] = True
            changes["patterns_found"].append("greeting_changed")
        
        # 4. Formality (Sie vs. du)
        orig_formal = bool(re.search(r'\b(sie|ihnen|ihrer)\b', original_clean))
        final_formal = bool(re.search(r'\b(sie|ihnen|ihrer)\b', final_clean))
        orig_informal = bool(re.search(r'\bdu\b|\bdir\b|\bdein\b', original_clean))
        final_informal = bool(re.search(r'\bdu\b|\bdir\b|\bdein\b', final_clean))
        
        if orig_formal and final_informal:
            changes["formality_changed"] = True
            changes["tone_changed"] = True
            changes["patterns_found"].append("formal_to_informal")
        elif orig_informal and final_formal:
            changes["formality_changed"] = True
            changes["tone_changed"] = True
            changes["patterns_found"].append("informal_to_formal")
        
        # 5. Structure (number of sentences)
        orig_sentences = len(re.split(r'[.!?]+', original.strip()))
        final_sentences = len(re.split(r'[.!?]+', final.strip()))
        if abs(orig_sentences - final_sentences) >= 2:
            changes["structure_changed"] = True
            changes["patterns_found"].append("structure_changed")
        
        # 6. Hedging phrases removed
        for phrase in self.HEDGING_PHRASES:
            if phrase in original_clean and phrase not in final_clean:
                changes["hedging_removed"] = True
                changes["tone_changed"] = True
                changes["specific_words"].append({
                    "removed": phrase,
                    "type": "hedging"
                })
        
        # 7. Apologetic phrases removed
        for phrase in self.APOLOGETIC_PHRASES:
            if phrase in original_clean and phrase not in final_clean:
                changes["tone_changed"] = True
                changes["specific_words"].append({
                    "removed": phrase,
                    "type": "apologetic"
                })
        
        # 8. Made more direct
        for phrase in self.DIRECT_PHRASES:
            if phrase not in original_clean and phrase in final_clean:
                changes["made_more_direct"] = True
                changes["tone_changed"] = True
                changes["specific_words"].append({
                    "added": phrase,
                    "type": "direct"
                })
        
        # 9. Question marks changed
        orig_questions = original.count('?')
        final_questions = final.count('?')
        if abs(orig_questions - final_questions) >= 2:
            changes["structure_changed"] = True
            changes["patterns_found"].append("question_count_changed")
        
        return changes
    
    def _determine_significance(
        self,
        similarity: float,
        char_diff: int,
        word_diff: int,
        changes: Dict,
    ) -> str:
        """Bestimmt Signifikanz der Änderung."""
        
        # Very similar = minor
        if similarity > 0.95:
            return "minor"
        
        # Very different = significant
        if similarity < 0.7 or char_diff > 100 or word_diff > 10:
            return "significant"
        
        # Check for important pattern changes
        important_changes = [
            changes["tone_changed"],
            changes["formality_changed"],
            changes["structure_changed"],
            changes["hedging_removed"],
            changes["made_more_direct"],
            len(changes["specific_words"]) > 0,
        ]
        
        important_count = sum(important_changes)
        
        if important_count >= 2:
            return "significant"
        elif important_count >= 1:
            return "moderate"
        
        # Check similarity threshold
        if similarity < 0.85:
            return "moderate"
        
        return "minor"
    
    def _should_show_modal(
        self,
        similarity: float,
        char_diff: int,
        word_diff: int,
        changes: Dict,
        significance: str,
    ) -> bool:
        """Entscheidet, ob Modal gezeigt werden soll."""
        
        # Too similar → no modal
        if similarity > self.SIMILARITY_THRESHOLD:
            # Exception: Important tone changes even with high similarity
            if changes["tone_changed"] or changes["formality_changed"]:
                return True
            return False
        
        # Too small change → no modal
        if char_diff < self.MIN_CHAR_DIFF and word_diff < self.MIN_WORD_DIFF:
            return False
        
        # Minor significance → no modal
        if significance == "minor":
            return False
        
        # Important changes detected → show modal
        if changes["tone_changed"] or changes["formality_changed"]:
            return True
        
        if changes["hedging_removed"] or changes["made_more_direct"]:
            return True
        
        if len(changes["specific_words"]) > 0:
            return True
        
        # Moderate or significant → show modal
        if significance in ["moderate", "significant"]:
            return True
        
        return False
    
    def _get_skip_reason(
        self,
        similarity: float,
        char_diff: int,
        word_diff: int,
        changes: Dict,
    ) -> str:
        """Gibt Grund zurück, warum kein Modal gezeigt wird."""
        
        if similarity > 0.95:
            return "Änderung zu gering (>95% identisch)"
        
        if similarity > self.SIMILARITY_THRESHOLD:
            return f"Ähnlichkeit zu hoch ({similarity:.0%})"
        
        if char_diff < self.MIN_CHAR_DIFF and word_diff < self.MIN_WORD_DIFF:
            return f"Zu wenige Zeichen/Wörter geändert ({char_diff} chars, {word_diff} words)"
        
        return "Keine signifikante Muster-Änderung erkannt"
    
    def get_change_summary(self, changes: Dict) -> List[str]:
        """Erstellt lesbare Zusammenfassung der Änderungen."""
        
        summary = []
        
        if changes.get("formality_changed"):
            if "formal_to_informal" in changes.get("patterns_found", []):
                summary.append("Von Sie zu Du gewechselt")
            else:
                summary.append("Formalität geändert")
        
        if changes.get("hedging_removed"):
            summary.append("Unsichere Formulierungen entfernt")
        
        if changes.get("made_more_direct"):
            summary.append("Direkter formuliert")
        
        if changes.get("emoji_changed"):
            summary.append("Emoji-Nutzung geändert")
        
        if changes.get("greeting_changed"):
            summary.append("Begrüßung angepasst")
        
        if changes.get("length_changed"):
            summary.append("Länge stark verändert")
        
        if changes.get("structure_changed"):
            summary.append("Struktur angepasst")
        
        if not summary:
            summary.append("Text allgemein angepasst")
        
        return summary

