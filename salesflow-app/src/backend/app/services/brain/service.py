"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES BRAIN SERVICE                                                       ║
║  Self-Learning Rules Engine                                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
    - Regel-Management (CRUD)
    - Korrektur-Analyse mit Claude
    - Regel-Anwendungs-Tracking
    - Effektivitäts-Scoring
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import json
import re
from difflib import SequenceMatcher

from supabase import Client
import anthropic
import os

from app.api.schemas.brain import (
    RuleCreate, RuleUpdate, RuleResponse, RulesForContext,
    CorrectionCreate, CorrectionResponse, CorrectionFeedback, CorrectionAnalysis,
    RuleType, RuleScope, RulePriority, RulesForChief,
)


class SalesBrainService:
    """
    Sales Brain Service - Self-Learning Rules Engine.
    
    Das Gehirn von Sales Flow AI, das aus User-Korrekturen lernt.
    """
    
    def __init__(self, db: Client):
        self.db = db
        self.anthropic = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # =========================================================================
    # RULES MANAGEMENT
    # =========================================================================
    
    def create_rule(
        self, 
        company_id: str, 
        user_id: str, 
        rule: RuleCreate,
        source_correction_id: Optional[str] = None,
        original_text: Optional[str] = None,
        corrected_text: Optional[str] = None,
    ) -> RuleResponse:
        """
        Erstellt eine neue Lernregel.
        
        Args:
            company_id: Company ID
            user_id: User ID
            rule: Regel-Daten
            source_correction_id: Optional - ID der Korrektur aus der die Regel stammt
            original_text: Optional - Originaler KI-Vorschlag
            corrected_text: Optional - Korrigierter Text vom User
        
        Returns:
            Die erstellte Regel
        """
        
        data = {
            "company_id": company_id,
            "user_id": user_id if rule.scope == RuleScope.personal else None,
            "rule_type": rule.rule_type.value,
            "scope": rule.scope.value if isinstance(rule.scope, RuleScope) else rule.scope,
            "priority": rule.priority.value if isinstance(rule.priority, RulePriority) else rule.priority,
            "context": rule.context or {},
            "title": rule.title,
            "description": rule.description,
            "instruction": rule.instruction,
            "example_bad": rule.example_bad,
            "example_good": rule.example_good,
            "source_type": "user_correction" if source_correction_id else "manual",
            "source_message_id": source_correction_id,
            "original_text": original_text,
            "corrected_text": corrected_text,
        }
        
        result = self.db.table("sales_brain_rules").insert(data).execute()
        
        if not result.data:
            raise ValueError("Failed to create rule")
        
        rule_id = result.data[0]["id"]
        
        # Mark correction as extracted
        if source_correction_id:
            self.db.table("user_corrections").update({
                "rule_extracted": True,
                "extracted_rule_id": rule_id
            }).eq("id", source_correction_id).execute()
        
        return self.get_rule(rule_id)
    
    def get_rule(self, rule_id: str) -> Optional[RuleResponse]:
        """Holt eine einzelne Regel."""
        
        result = self.db.table("sales_brain_rules") \
            .select("*") \
            .eq("id", rule_id) \
            .single() \
            .execute()
        
        if not result.data:
            return None
        
        return self._map_rule_response(result.data)
    
    def get_rules_for_context(
        self,
        company_id: str,
        user_id: str,
        context: RulesForContext,
    ) -> List[RuleResponse]:
        """
        Holt alle relevanten Regeln für einen Kontext.
        Verwendet für CHIEF Prompt-Building.
        """
        
        # Basis-Query: Personal + Team + Global Rules
        query = self.db.table("sales_brain_rules") \
            .select("*") \
            .eq("company_id", company_id) \
            .eq("is_active", True)
        
        # Scope Filter: Personal für diesen User ODER Team/Global
        # Supabase doesn't support complex OR, so we'll filter in Python
        
        result = query.execute()
        
        if not result.data:
            return []
        
        # Filter rules based on scope and context
        filtered_rules = []
        for row in result.data:
            # Check scope
            scope = row.get("scope", "personal")
            rule_user_id = row.get("user_id")
            
            if scope == "personal" and rule_user_id != user_id:
                continue
            
            # Check context match
            rule_context = row.get("context", {}) or {}
            
            if context.channel and rule_context.get("channel"):
                if rule_context["channel"] != context.channel:
                    continue
            
            if context.lead_status and rule_context.get("lead_status"):
                if rule_context["lead_status"] != context.lead_status:
                    continue
            
            if context.message_type and rule_context.get("message_type"):
                if rule_context["message_type"] != context.message_type:
                    continue
            
            filtered_rules.append(row)
        
        # Sort by priority and effectiveness
        priority_order = {"override": 0, "high": 1, "normal": 2, "suggestion": 3}
        filtered_rules.sort(key=lambda r: (
            priority_order.get(r.get("priority", "normal"), 2),
            -(r.get("effectiveness_score") or 0),
            -(r.get("times_applied") or 0)
        ))
        
        return [self._map_rule_response(row) for row in filtered_rules]
    
    def update_rule(
        self,
        rule_id: str,
        user_id: str,
        update: RuleUpdate,
    ) -> Optional[RuleResponse]:
        """Aktualisiert eine Regel."""
        
        data = {k: v for k, v in update.model_dump().items() if v is not None}
        
        if not data:
            return self.get_rule(rule_id)
        
        data["updated_at"] = datetime.utcnow().isoformat()
        
        # Nur eigene Regeln oder Team-Regeln (wenn Admin)
        result = self.db.table("sales_brain_rules") \
            .update(data) \
            .eq("id", rule_id) \
            .execute()
        
        return self.get_rule(rule_id)
    
    def deactivate_rule(self, rule_id: str, user_id: str) -> bool:
        """Deaktiviert eine Regel (soft delete)."""
        
        self.db.table("sales_brain_rules") \
            .update({"is_active": False, "updated_at": datetime.utcnow().isoformat()}) \
            .eq("id", rule_id) \
            .eq("user_id", user_id) \
            .execute()
        
        return True
    
    def format_rules_for_chief(
        self,
        rules: List[RuleResponse],
        max_rules: int = 10,
    ) -> RulesForChief:
        """
        Formatiert Regeln als Prompt-Block für CHIEF.
        """
        if not rules:
            return RulesForChief(
                rules_count=0,
                formatted_prompt="",
                rule_ids=[]
            )
        
        # Limit to most important rules
        rules = rules[:max_rules]
        
        lines = [
            "[PERSÖNLICHE LERNREGELN - HÖCHSTE PRIORITÄT]",
            "",
            "Diese Regeln wurden aus deinen Korrekturen gelernt. Wende sie IMMER an:",
            ""
        ]
        
        rule_ids = []
        
        for i, rule in enumerate(rules, 1):
            priority_marker = {
                "override": "🔴",
                "high": "🟡",
                "normal": "⚪",
                "suggestion": "💡"
            }.get(rule.priority, "⚪")
            
            lines.append(f"{priority_marker} **Regel {i}: {rule.title}**")
            lines.append(f"   → {rule.instruction}")
            
            if rule.example_bad and rule.example_good:
                bad_preview = rule.example_bad[:50] + "..." if len(rule.example_bad) > 50 else rule.example_bad
                good_preview = rule.example_good[:50] + "..." if len(rule.example_good) > 50 else rule.example_good
                lines.append(f'   ❌ Nicht: "{bad_preview}"')
                lines.append(f'   ✅ Besser: "{good_preview}"')
            
            lines.append("")
            rule_ids.append(rule.id)
        
        return RulesForChief(
            rules_count=len(rules),
            formatted_prompt="\n".join(lines),
            rule_ids=rule_ids
        )
    
    # =========================================================================
    # CORRECTION ANALYSIS
    # =========================================================================
    
    def log_correction(
        self,
        company_id: str,
        user_id: str,
        correction: CorrectionCreate,
    ) -> str:
        """Loggt eine User-Korrektur."""
        
        # Calculate similarity
        similarity = self._calculate_similarity(
            correction.original_suggestion,
            correction.user_final_text
        )
        
        data = {
            "company_id": company_id,
            "user_id": user_id,
            "lead_id": str(correction.lead_id) if correction.lead_id else None,
            "original_suggestion": correction.original_suggestion,
            "user_final_text": correction.user_final_text,
            "channel": correction.channel,
            "lead_status": correction.lead_status,
            "message_type": correction.message_type,
            "similarity_score": similarity,
        }
        
        result = self.db.table("user_corrections").insert(data).execute()
        
        if not result.data:
            raise ValueError("Failed to log correction")
        
        return result.data[0]["id"]
    
    def get_correction(self, correction_id: str) -> Optional[CorrectionResponse]:
        """Holt eine Korrektur."""
        
        result = self.db.table("user_corrections") \
            .select("*") \
            .eq("id", correction_id) \
            .single() \
            .execute()
        
        if not result.data:
            return None
        
        return CorrectionResponse(**result.data)
    
    def get_pending_corrections(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[CorrectionResponse]:
        """Holt unverarbeitete Korrekturen."""
        
        result = self.db.table("user_corrections") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("rule_extracted", False) \
            .is_("user_feedback", "null") \
            .lt("similarity_score", 0.9) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        if not result.data:
            return []
        
        return [CorrectionResponse(**row) for row in result.data]
    
    def analyze_correction(self, correction_id: str) -> CorrectionAnalysis:
        """
        Analysiert eine Korrektur und schlägt ggf. eine Regel vor.
        Nutzt Claude für intelligente Analyse.
        """
        
        # Get correction
        correction = self.get_correction(correction_id)
        if not correction:
            raise ValueError("Correction not found")
        
        original = correction.original_suggestion
        final = correction.user_final_text
        similarity = correction.similarity_score or 0.0
        
        # Quick check: If too similar, no rule needed
        if similarity > 0.9:
            return CorrectionAnalysis(
                correction_id=UUID(correction_id),
                similarity_score=similarity,
                detected_changes={},
                suggested_rule=None,
                should_create_rule=False,
            )
        
        # Use Claude to analyze the difference
        analysis = self._analyze_with_claude(original, final)
        
        # Create suggested rule if meaningful change detected
        suggested_rule = None
        should_create = False
        
        if analysis.get("is_learnable", False):
            rule_type_str = analysis.get("rule_type", "custom")
            try:
                rule_type = RuleType(rule_type_str)
            except ValueError:
                rule_type = RuleType.custom
            
            suggested_rule = RuleCreate(
                rule_type=rule_type,
                scope=RuleScope.personal,
                priority=RulePriority.normal,
                title=analysis.get("rule_title", "Gelernte Präferenz")[:100],
                description=analysis.get("rule_description"),
                instruction=analysis.get("rule_instruction", "Wende diese Präferenz an."),
                example_bad=original[:200],
                example_good=final[:200],
            )
            should_create = True
        
        # Update correction with analysis
        self.db.table("user_corrections") \
            .update({"detected_changes": analysis}) \
            .eq("id", correction_id) \
            .execute()
        
        return CorrectionAnalysis(
            correction_id=UUID(correction_id),
            similarity_score=similarity,
            detected_changes=analysis,
            suggested_rule=suggested_rule,
            should_create_rule=should_create,
        )
    
    def process_feedback(
        self,
        company_id: str,
        user_id: str,
        feedback: CorrectionFeedback,
    ) -> Optional[RuleResponse]:
        """
        Verarbeitet User-Feedback zu einer Korrektur.
        Erstellt ggf. eine Regel.
        """
        
        correction_id = str(feedback.correction_id)
        
        if feedback.feedback.value == "ignore":
            # Mark as processed, no rule
            self.db.table("user_corrections") \
                .update({
                    "user_feedback": "ignore",
                    "rule_extracted": True
                }) \
                .eq("id", correction_id) \
                .execute()
            return None
        
        # Analyze and create rule
        analysis = self.analyze_correction(correction_id)
        
        if not analysis.should_create_rule or not analysis.suggested_rule:
            return None
        
        # Set scope based on feedback
        rule = analysis.suggested_rule
        rule.scope = RuleScope.personal if feedback.feedback.value == "personal" else RuleScope.team
        
        # Get original/corrected text
        correction = self.get_correction(correction_id)
        
        # Update feedback
        self.db.table("user_corrections") \
            .update({"user_feedback": feedback.feedback.value}) \
            .eq("id", correction_id) \
            .execute()
        
        return self.create_rule(
            company_id=company_id,
            user_id=user_id,
            rule=rule,
            source_correction_id=correction_id,
            original_text=correction.original_suggestion if correction else None,
            corrected_text=correction.user_final_text if correction else None,
        )
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Berechnet Ähnlichkeit zwischen zwei Texten (0-1)."""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def _analyze_with_claude(self, original: str, corrected: str) -> Dict[str, Any]:
        """Nutzt Claude um Korrektur zu analysieren."""
        
        prompt = f"""Analysiere diese Textkorrektur und extrahiere eine lernbare Regel.

ORIGINAL (von KI vorgeschlagen):
{original}

KORRIGIERT (vom User):
{corrected}

Antworte NUR mit einem JSON-Objekt:
{{
    "is_learnable": true/false,  // Ist eine sinnvolle Regel ableitbar?
    "change_type": "tone|structure|vocabulary|timing|channel|objection|persona|product|compliance|custom",
    "change_description": "Was wurde geändert?",
    "rule_type": "tone|structure|vocabulary|timing|channel|objection|persona|product|compliance|custom",
    "rule_title": "Kurzer Titel (max 50 Zeichen)",
    "rule_description": "Was soll die KI anders machen?",
    "rule_instruction": "Konkrete Anweisung für die KI (imperativ formuliert)"
}}

Beispiele für gute Instruktionen:
- "Verwende 'du' statt 'Sie'"
- "Beginne Nachrichten nie mit 'Ich würde gerne...'"
- "Halte erste Nachrichten unter 3 Sätzen"
- "Nutze Emojis sparsam, maximal 1 pro Nachricht"

Wenn die Änderung zu spezifisch oder nicht generalisierbar ist, setze is_learnable auf false."""

        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse JSON from response
            content = response.content[0].text
            # Extract JSON
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
        except Exception as e:
            print(f"Claude analysis error: {e}")
        
        return {"is_learnable": False}
    
    # =========================================================================
    # RULE APPLICATION TRACKING
    # =========================================================================
    
    def log_rule_application(
        self,
        rule_id: str,
        user_id: str,
        message_id: Optional[str] = None,
        context: Optional[Dict] = None,
    ) -> str:
        """Loggt dass eine Regel angewendet wurde."""
        
        data = {
            "rule_id": rule_id,
            "user_id": user_id,
            "message_id": message_id,
            "context_snapshot": context or {},
        }
        
        result = self.db.table("rule_applications").insert(data).execute()
        
        # Increment counter
        self.db.rpc("increment_rule_applied", {"rule_id": rule_id}).execute()
        
        return result.data[0]["id"] if result.data else None
    
    def log_rule_feedback(
        self,
        application_id: str,
        was_helpful: bool,
        user_modified: bool,
    ):
        """Loggt Feedback zu einer Regel-Anwendung."""
        
        self.db.table("rule_applications") \
            .update({
                "was_helpful": was_helpful,
                "user_modified": user_modified
            }) \
            .eq("id", application_id) \
            .execute()
        
        # Get rule_id for updating counters
        app = self.db.table("rule_applications") \
            .select("rule_id") \
            .eq("id", application_id) \
            .single() \
            .execute()
        
        if app.data:
            rule_id = app.data["rule_id"]
            
            if was_helpful:
                # Increment helpful counter
                current = self.db.table("sales_brain_rules") \
                    .select("times_helpful, times_applied") \
                    .eq("id", rule_id) \
                    .single() \
                    .execute()
                
                if current.data:
                    new_helpful = (current.data["times_helpful"] or 0) + 1
                    times_applied = current.data["times_applied"] or 1
                    new_score = new_helpful / times_applied if times_applied > 0 else None
                    
                    self.db.table("sales_brain_rules") \
                        .update({
                            "times_helpful": new_helpful,
                            "effectiveness_score": new_score
                        }) \
                        .eq("id", rule_id) \
                        .execute()
            
            if user_modified:
                # Increment ignored counter
                self.db.table("sales_brain_rules") \
                    .update({
                        "times_ignored": self.db.table("sales_brain_rules")
                            .select("times_ignored")
                            .eq("id", rule_id)
                            .single()
                            .execute()
                            .data.get("times_ignored", 0) + 1
                    }) \
                    .eq("id", rule_id) \
                    .execute()
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _map_rule_response(self, data: Dict) -> RuleResponse:
        """Mappt DB-Daten zu RuleResponse."""
        return RuleResponse(
            id=UUID(data["id"]),
            rule_type=data["rule_type"],
            scope=data["scope"],
            priority=data["priority"],
            context=data.get("context"),
            title=data["title"],
            description=data.get("description"),
            instruction=data["instruction"],
            example_bad=data.get("example_bad"),
            example_good=data.get("example_good"),
            times_applied=data.get("times_applied", 0),
            times_helpful=data.get("times_helpful", 0),
            times_ignored=data.get("times_ignored", 0),
            effectiveness_score=data.get("effectiveness_score"),
            is_active=data.get("is_active", True),
            is_verified=data.get("is_verified", False),
            source_type=data.get("source_type"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
                if data.get("updated_at") and isinstance(data["updated_at"], str) 
                else data.get("updated_at"),
        )

