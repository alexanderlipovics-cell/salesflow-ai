"""
╔════════════════════════════════════════════════════════════════════════════╗
║  OVERRIDE LOOP SERVICE                                                     ║
║  Erkennt und lernt aus User-Korrekturen von CHIEF-Vorschlägen             ║
╚════════════════════════════════════════════════════════════════════════════╝

Was passiert:
1. CHIEF schlägt Text A vor
2. User modifiziert zu Text B und sendet
3. System erkennt die Korrektur
4. System analysiert: Was wurde geändert? Warum?
5. System speichert als "Learning Signal"
6. Nach mehreren ähnlichen Signalen → Template/Regel entsteht

Wichtig: Nicht jede Korrektur wird sofort zur Regel!
- Einmalige "Laune" → nur Signal speichern
- Wiederkehrendes Muster → Template-Kandidat
- Expliziter Befehl → sofort Regel
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
from dataclasses import dataclass
import os
import json
import re

from supabase import Client


@dataclass
class OverrideAnalysis:
    """Analyse einer User-Korrektur"""
    is_significant: bool
    similarity_score: float
    detected_changes: List[str]
    pattern: Optional[str]
    significance: str  # 'low', 'medium', 'high'
    
    # Für Template-Extraktion
    could_be_template: bool
    template_use_case: Optional[str]
    template_instruction: Optional[str]


class OverrideService:
    """
    Erkennt und analysiert User-Korrekturen von KI-Vorschlägen.
    
    Der Override Loop ist das Herzstück des selbstlernenden Systems:
    - Jede Korrektur ist ein Signal
    - Wiederkehrende Muster werden zu Regeln
    - Das System wird jeden Tag besser für DIESEN User
    """
    
    # Minimum Unterschied für "echte" Korrektur
    MIN_CHAR_DIFF = 10
    MIN_WORD_DIFF = 3
    SIMILARITY_THRESHOLD = 0.85  # Unter diesem Wert = signifikante Änderung
    
    # Patterns die wir erkennen
    DETECTABLE_PATTERNS = [
        'shorter_more_direct',
        'longer_more_detailed',
        'informal_tone',
        'formal_tone',
        'emoji_added',
        'emoji_removed',
        'question_added',
        'cta_changed',
        'greeting_changed',
        'closing_changed',
        'personalization_added',
        'urgency_added',
        'urgency_removed',
        'social_proof_added',
    ]
    
    def __init__(self, db: Client):
        self.db = db
    
    def detect_override(
        self,
        original_text: str,
        final_text: str,
        context: Dict[str, Any],
    ) -> OverrideAnalysis:
        """
        Analysiert ob eine signifikante Korrektur stattfand.
        
        Args:
            original_text: Der CHIEF-Vorschlag
            final_text: Was der User tatsächlich gesendet hat
            context: Kontext (channel, message_type, lead_status, etc.)
            
        Returns:
            OverrideAnalysis mit Details zur Korrektur
        """
        
        # Quick check: Identisch?
        if original_text == final_text:
            return OverrideAnalysis(
                is_significant=False,
                similarity_score=1.0,
                detected_changes=[],
                pattern=None,
                significance='none',
                could_be_template=False,
                template_use_case=None,
                template_instruction=None,
            )
        
        # Calculate similarity
        similarity = self._calculate_similarity(original_text, final_text)
        
        # Quick client-side detection
        quick_changes = self._quick_detect_changes(original_text, final_text)
        
        # Determine if significant
        char_diff = abs(len(original_text) - len(final_text))
        word_diff = abs(len(original_text.split()) - len(final_text.split()))
        
        is_significant = (
            similarity < self.SIMILARITY_THRESHOLD
            or char_diff >= self.MIN_CHAR_DIFF
            or word_diff >= self.MIN_WORD_DIFF
            or len(quick_changes) >= 2
        )
        
        if not is_significant:
            return OverrideAnalysis(
                is_significant=False,
                similarity_score=similarity,
                detected_changes=quick_changes,
                pattern=None,
                significance='low',
                could_be_template=False,
                template_use_case=None,
                template_instruction=None,
            )
        
        # Deep analysis (kann auch mit Claude gemacht werden, hier regelbasiert)
        deep_analysis = self._deep_analyze_local(original_text, final_text, context)
        
        return OverrideAnalysis(
            is_significant=True,
            similarity_score=similarity,
            detected_changes=deep_analysis.get('changes', quick_changes),
            pattern=deep_analysis.get('pattern'),
            significance=deep_analysis.get('significance', 'medium'),
            could_be_template=deep_analysis.get('could_be_template', False),
            template_use_case=deep_analysis.get('template_use_case'),
            template_instruction=deep_analysis.get('template_instruction'),
        )
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Berechnet Ähnlichkeit zwischen zwei Texten (0-1)"""
        # Simple Jaccard similarity
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 and not words2:
            return 1.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union) if union else 1.0
    
    def _quick_detect_changes(self, original: str, final: str) -> List[str]:
        """Schnelle regelbasierte Änderungserkennung"""
        changes = []
        
        # Length
        if len(final) < len(original) * 0.7:
            changes.append('length_reduced')
        elif len(final) > len(original) * 1.3:
            changes.append('length_increased')
        
        # Emojis
        original_emojis = sum(1 for c in original if ord(c) > 127000)
        final_emojis = sum(1 for c in final if ord(c) > 127000)
        if final_emojis > original_emojis:
            changes.append('emoji_added')
        elif final_emojis < original_emojis:
            changes.append('emoji_removed')
        
        # Questions
        original_questions = original.count('?')
        final_questions = final.count('?')
        if final_questions > original_questions:
            changes.append('question_added')
        elif final_questions < original_questions:
            changes.append('question_removed')
        
        # Formality (Sie vs du)
        if 'Sie' in original and 'du' in final.lower():
            changes.append('informal_tone')
        elif 'du' in original.lower() and 'Sie' in final:
            changes.append('formal_tone')
        
        # Greeting changes
        greetings = ['hallo', 'hey', 'hi', 'guten', 'liebe', 'servus', 'moin']
        orig_has_greeting = any(g in original.lower()[:50] for g in greetings)
        final_has_greeting = any(g in final.lower()[:50] for g in greetings)
        if orig_has_greeting != final_has_greeting:
            changes.append('greeting_changed')
        
        # Exclamation marks (Enthusiasm)
        if final.count('!') > original.count('!') + 1:
            changes.append('enthusiasm_added')
        elif final.count('!') < original.count('!') - 1:
            changes.append('enthusiasm_reduced')
        
        return changes
    
    def _deep_analyze_local(
        self,
        original: str,
        final: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Lokale tiefe Analyse ohne LLM-Call.
        
        Für produktiven Einsatz kann hier Claude eingebunden werden.
        """
        changes = self._quick_detect_changes(original, final)
        
        # Pattern bestimmen basierend auf Changes
        pattern = None
        if 'length_reduced' in changes:
            pattern = 'shorter_more_direct'
        elif 'length_increased' in changes:
            pattern = 'longer_more_detailed'
        elif 'informal_tone' in changes:
            pattern = 'casual_friendly'
        elif 'formal_tone' in changes:
            pattern = 'professional_formal'
        elif 'emoji_removed' in changes:
            pattern = 'no_emojis'
        elif 'emoji_added' in changes:
            pattern = 'more_emojis'
        elif 'question_added' in changes:
            pattern = 'more_questions'
        
        # Significance
        significance = 'low'
        if len(changes) >= 3:
            significance = 'high'
        elif len(changes) >= 1:
            significance = 'medium'
        
        # Template-Potential
        could_be_template = (
            significance in ['medium', 'high']
            and context.get('message_type') in ['follow_up', 'objection_handler', 'first_contact']
        )
        
        template_use_case = None
        template_instruction = None
        
        if could_be_template and context.get('message_type'):
            template_use_case = f"{context['message_type']}_{pattern or 'custom'}"
            if pattern:
                template_instruction = f"Stil: {pattern.replace('_', ' ')}"
        
        return {
            'changes': changes,
            'pattern': pattern,
            'significance': significance,
            'could_be_template': could_be_template,
            'template_use_case': template_use_case,
            'template_instruction': template_instruction,
        }
    
    def log_signal(
        self,
        user_id: str,
        company_id: Optional[str],
        original_text: str,
        final_text: str,
        context: Dict[str, Any],
        analysis: OverrideAnalysis,
    ) -> str:
        """
        Speichert Learning Signal in der Datenbank.
        
        Returns:
            Signal ID
        """
        signal_data = {
            "user_id": user_id,
            "company_id": company_id,
            "signal_type": "implicit_override",
            "original_text": original_text,
            "final_text": final_text,
            "context": context,
            "detected_changes": {
                "changes": analysis.detected_changes,
                "pattern": analysis.pattern,
                "significance": analysis.significance,
            },
            "similarity_score": analysis.similarity_score,
        }
        
        result = self.db.table("learning_signals").insert(signal_data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to log learning signal")
    
    def update_signal_outcome(
        self,
        signal_id: str,
        got_reply: bool,
        reply_sentiment: Optional[str] = None,
    ):
        """Aktualisiert ein Signal mit dem Outcome (Antwort erhalten?)"""
        self.db.table("learning_signals").update({
            "got_reply": got_reply,
            "reply_sentiment": reply_sentiment,
        }).eq("id", signal_id).execute()
    
    def check_for_patterns(self, user_id: str) -> List[Dict]:
        """
        Prüft ob neue Patterns entstanden sind.
        
        Ruft die detect_patterns_for_user Funktion auf und gibt
        neu entstandene aktive Patterns zurück.
        """
        # Trigger pattern detection
        try:
            self.db.rpc("detect_patterns_for_user", {"p_user_id": user_id}).execute()
        except Exception as e:
            print(f"Pattern detection failed: {e}")
        
        # Get newly promoted patterns (active but not yet promoted to rule)
        result = self.db.table("learning_patterns").select("*").eq(
            "user_id", user_id
        ).eq("status", "active").is_("promoted_to_rule_id", "null").order(
            "signal_count", desc=True
        ).execute()
        
        return result.data or []
    
    def get_user_patterns(
        self,
        user_id: str,
        status: Optional[str] = None,
    ) -> List[Dict]:
        """Holt alle Patterns für einen User"""
        query = self.db.table("learning_patterns").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("signal_count", desc=True).execute()
        
        return result.data or []
    
    def get_recent_signals(
        self,
        user_id: str,
        limit: int = 20,
        signal_type: Optional[str] = None,
    ) -> List[Dict]:
        """Holt die letzten Signals für einen User"""
        query = self.db.table("learning_signals").select("*").eq("user_id", user_id)
        
        if signal_type:
            query = query.eq("signal_type", signal_type)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return result.data or []

