"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEACH SERVICE                                                             ║
║  Core Logic für Learning System                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Verarbeitet Teach-Actions und Learning Signals.
Integration mit Living OS, Sales Brain und Gamification.
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
import json
import re
import os

from supabase import Client
import anthropic

from app.api.schemas.teach import (
    TeachRequestSchema,
    TeachResponseSchema,
    TeachStatsSchema,
    RuleScope,
    PatternDetectedSchema,
)


class TeachService:
    """
    Verarbeitet Teach-Actions und Learning Signals.
    
    Integration:
    - Living OS: learning_signals, learning_patterns, command_rules
    - Sales Brain: sales_brain_rules
    - Gamification: XP Events
    """
    
    # XP Rewards
    XP_SIGNAL_LOGGED = 5
    XP_RULE_CREATED = 25
    XP_PATTERN_DISCOVERED = 50
    XP_TEAM_ADOPTED = 100
    
    # Thresholds
    MIN_SIGNALS_FOR_PATTERN = 5
    MIN_SUCCESS_RATE_FOR_RULE = 0.3
    
    def __init__(self, db: Client):
        self.db = db
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.anthropic = anthropic.Anthropic(api_key=api_key) if api_key else None
    
    # =========================================================================
    # MAIN TEACH ACTION
    # =========================================================================
    
    def process_teach(
        self,
        user_id: str,
        company_id: Optional[str],
        request: TeachRequestSchema,
    ) -> TeachResponseSchema:
        """
        Verarbeitet eine Teach-Action.
        
        Flow:
        1. Learning Signal speichern
        2. Je nach Scope: Rule oder Signal
        3. Pattern Detection triggern
        4. XP vergeben
        5. Response bauen
        """
        
        created: Dict[str, Optional[str]] = {}
        xp_earned = 0
        pattern_detected = None
        
        # 1. Learning Signal speichern (immer)
        signal_id = self._log_learning_signal(
            user_id=user_id,
            company_id=company_id,
            original_text=request.override.original_text,
            final_text=request.override.final_text,
            similarity_score=request.override.similarity_score,
            detected_changes=request.override.detected_changes,
            context=request.override.context.model_dump(),
            note=request.note,
            tags=request.tags,
        )
        created["signal_id"] = signal_id
        xp_earned += self.XP_SIGNAL_LOGGED
        
        # 2. Je nach Scope
        if request.scope == RuleScope.personal:
            # Direkt als persönliche Regel speichern
            rule_id = self._create_command_rule(
                user_id=user_id,
                company_id=company_id,
                scope="personal",
                original_command=f"Override: {request.note or 'Korrektur gelernt'}",
                override=request.override,
                priority=request.rule_config.priority if request.rule_config else 50,
            )
            created["rule_id"] = rule_id
            xp_earned += self.XP_RULE_CREATED
            
        elif request.scope == RuleScope.team:
            # Als Team-Broadcast-Vorschlag
            broadcast_id = self._create_team_broadcast_suggestion(
                user_id=user_id,
                company_id=company_id,
                override=request.override,
                note=request.note,
            )
            created["broadcast_id"] = broadcast_id
            # XP erst bei Approval
        
        # 3. Pattern Detection
        pattern_result = self._check_for_patterns(user_id)
        if pattern_result:
            pattern_detected = PatternDetectedSchema(
                pattern_type=pattern_result["pattern_type"],
                signal_count=pattern_result["signal_count"],
                success_rate=pattern_result["success_rate"],
                will_become_rule=pattern_result["will_become_rule"],
            )
            if pattern_result.get("is_new"):
                xp_earned += self.XP_PATTERN_DISCOVERED
        
        # 4. XP speichern
        self._award_xp(user_id, xp_earned, "teach_action")
        
        return TeachResponseSchema(
            success=True,
            created=created,
            xp_earned=xp_earned,
            message=self._build_success_message(created, pattern_detected),
            pattern_detected=pattern_detected,
        )
    
    # =========================================================================
    # LEARNING SIGNAL
    # =========================================================================
    
    def _log_learning_signal(
        self,
        user_id: str,
        company_id: Optional[str],
        original_text: str,
        final_text: str,
        similarity_score: float,
        detected_changes: List[str],
        context: Dict,
        note: Optional[str],
        tags: Optional[List[str]],
    ) -> str:
        """Speichert Learning Signal."""
        
        signal_data = {
            "user_id": user_id,
            "company_id": company_id,
            "signal_type": "implicit_override",
            "original_text": original_text,
            "final_text": final_text,
            "context": context,
            "detected_changes": {
                "changes": detected_changes,
                "note": note,
                "tags": tags or [],
            },
            "similarity_score": similarity_score,
        }
        
        result = self.db.table("learning_signals").insert(signal_data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to log learning signal")
    
    # =========================================================================
    # COMMAND RULE
    # =========================================================================
    
    def _create_command_rule(
        self,
        user_id: str,
        company_id: Optional[str],
        scope: str,
        original_command: str,
        override: Any,
        priority: int = 50,
    ) -> str:
        """Erstellt Command Rule aus Override."""
        
        # Build trigger config
        trigger_config = {
            "trigger_type": "context_match",
            "channels": [override.context.channel] if override.context.channel else [],
            "message_types": [override.context.message_type] if override.context.message_type else [],
        }
        
        # Build action config
        action_config = {
            "instruction": f"Verwende ähnliche Formulierung wie: '{override.final_text[:100]}...'",
            "actions": ["apply_style"],
            "detected_changes": override.detected_changes,
        }
        
        # Examples
        examples = json.dumps([{
            "bad": override.original_text[:200],
            "good": override.final_text[:200],
        }])
        
        rule_data = {
            "user_id": user_id,
            "company_id": company_id,
            "original_command": original_command,
            "rule_type": "style_preference",
            "trigger_config": trigger_config,
            "action_config": action_config,
            "examples": examples,
            "priority": priority,
            "scope": scope,
            "is_active": True,
        }
        
        result = self.db.table("command_rules").insert(rule_data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to create command rule")
    
    # =========================================================================
    # TEAM BROADCAST
    # =========================================================================
    
    def _create_team_broadcast_suggestion(
        self,
        user_id: str,
        company_id: Optional[str],
        override: Any,
        note: Optional[str],
    ) -> str:
        """Erstellt Team Broadcast Suggestion (braucht Leader Approval)."""
        
        # Get user's team
        team_id = None
        if company_id:
            team_result = self.db.table("teams").select("id").eq(
                "company_id", company_id
            ).limit(1).execute()
            if team_result.data:
                team_id = team_result.data[0]["id"]
        
        broadcast_data = {
            "creator_user_id": user_id,
            "team_id": team_id,
            "broadcast_type": "rule",
            "source_type": "promoted_from_personal",
            "title": f"Stil-Regel: {override.detected_changes[0] if override.detected_changes else 'Anpassung'}",
            "description": note or "Aus persönlicher Korrektur gelernt",
            "content": {
                "original": override.original_text,
                "final": override.final_text,
                "changes": override.detected_changes,
            },
            "status": "suggested",
        }
        
        result = self.db.table("team_broadcasts").insert(broadcast_data).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        raise Exception("Failed to create team broadcast")
    
    # =========================================================================
    # PATTERN DETECTION
    # =========================================================================
    
    def _check_for_patterns(self, user_id: str) -> Optional[Dict]:
        """
        Prüft ob aus Signalen ein Pattern erkannt werden kann.
        """
        
        # Get recent signals grouped by change type
        try:
            result = self.db.table("learning_signals").select(
                "detected_changes"
            ).eq("user_id", user_id).order(
                "created_at", desc=True
            ).limit(100).execute()
            
            if not result.data:
                return None
            
            # Count change types
            change_counts: Dict[str, int] = {}
            for row in result.data:
                changes = row.get("detected_changes", {})
                if isinstance(changes, dict):
                    for change in changes.get("changes", []):
                        change_counts[change] = change_counts.get(change, 0) + 1
            
            # Find most common pattern
            if not change_counts:
                return None
            
            top_change = max(change_counts.items(), key=lambda x: x[1])
            pattern_type, signal_count = top_change
            
            if signal_count < self.MIN_SIGNALS_FOR_PATTERN:
                return None
            
            # Check if pattern already exists
            existing = self.db.table("learning_patterns").select(
                "id", "status"
            ).eq("user_id", user_id).eq("pattern_type", pattern_type).execute()
            
            is_new = not existing.data
            
            # Success rate (simplified - assume 50% for now)
            success_rate = 0.5
            
            # Create or update pattern
            if is_new:
                self.db.table("learning_patterns").insert({
                    "user_id": user_id,
                    "pattern_type": pattern_type,
                    "pattern_description": f"Automatisch erkannt: {pattern_type}",
                    "signal_count": signal_count,
                    "success_rate": success_rate,
                    "status": "candidate",
                }).execute()
            else:
                self.db.table("learning_patterns").update({
                    "signal_count": signal_count,
                    "success_rate": success_rate,
                }).eq("user_id", user_id).eq("pattern_type", pattern_type).execute()
            
            will_become_rule = success_rate >= self.MIN_SUCCESS_RATE_FOR_RULE
            
            return {
                "pattern_type": pattern_type,
                "signal_count": signal_count,
                "success_rate": success_rate,
                "will_become_rule": will_become_rule,
                "is_new": is_new,
            }
            
        except Exception as e:
            print(f"Pattern detection error: {e}")
            return None
    
    # =========================================================================
    # XP
    # =========================================================================
    
    def _award_xp(self, user_id: str, amount: int, reason: str):
        """Vergibt XP an User."""
        
        try:
            # Update user profile XP
            self.db.table("user_profiles").update({
                "xp": self.db.table("user_profiles").select("xp").eq(
                    "user_id", user_id
                ).single().execute().data.get("xp", 0) + amount
            }).eq("user_id", user_id).execute()
        except Exception:
            # User profile might not have xp column yet
            pass
        
        # Log XP event
        try:
            self.db.table("xp_events").insert({
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "source": "teach",
            }).execute()
        except Exception:
            # xp_events table might not exist
            pass
    
    # =========================================================================
    # STATS
    # =========================================================================
    
    def get_teach_stats(self, user_id: str) -> TeachStatsSchema:
        """Holt Teach-Statistiken für User."""
        
        # Signal count
        signals_result = self.db.table("learning_signals").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()
        signals = signals_result.count or 0
        
        # Rules created
        rules_result = self.db.table("command_rules").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("is_active", True).execute()
        rules = rules_result.count or 0
        
        # Patterns
        patterns_result = self.db.table("learning_patterns").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("status", "active").execute()
        patterns = patterns_result.count or 0
        
        # Pending patterns
        pending_result = self.db.table("learning_patterns").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("status", "candidate").execute()
        pending = pending_result.count or 0
        
        # XP from teaching
        xp = 0
        try:
            xp_result = self.db.table("xp_events").select(
                "amount"
            ).eq("user_id", user_id).eq("source", "teach").execute()
            xp = sum(row.get("amount", 0) for row in (xp_result.data or []))
        except Exception:
            pass
        
        return TeachStatsSchema(
            total_teach_actions=signals,
            rules_created=rules,
            patterns_discovered=patterns,
            pending_patterns=pending,
            total_xp_from_teaching=xp,
        )
    
    # =========================================================================
    # IGNORE ACTION
    # =========================================================================
    
    def log_ignore(
        self,
        user_id: str,
        company_id: Optional[str],
        original_text: str,
        final_text: str,
        similarity_score: float,
        context: Dict,
    ):
        """Loggt Ignore-Action für Analytics."""
        
        signal_data = {
            "user_id": user_id,
            "company_id": company_id,
            "signal_type": "implicit_override",
            "original_text": original_text,
            "final_text": final_text,
            "context": context,
            "detected_changes": {"ignored": True},
            "similarity_score": similarity_score,
        }
        
        self.db.table("learning_signals").insert(signal_data).execute()
    
    # =========================================================================
    # PENDING PATTERNS
    # =========================================================================
    
    def get_pending_patterns(self, user_id: str) -> List[Dict]:
        """Holt Pending Patterns."""
        
        result = self.db.table("learning_patterns").select(
            "id", "pattern_type", "signal_count", "success_rate", "updated_at"
        ).eq("user_id", user_id).eq("status", "candidate").order(
            "signal_count", desc=True
        ).execute()
        
        return [
            {
                "id": row["id"],
                "pattern_type": row["pattern_type"],
                "signal_count": row["signal_count"],
                "success_rate": row.get("success_rate", 0),
                "last_signal_at": row.get("updated_at"),
            }
            for row in (result.data or [])
        ]
    
    # =========================================================================
    # PATTERN ACTIVATION
    # =========================================================================
    
    def activate_pattern(self, user_id: str, pattern_id: str) -> Dict:
        """Aktiviert ein Pattern (wandelt es in Rule um)."""
        
        # Get pattern
        pattern_result = self.db.table("learning_patterns").select("*").eq(
            "id", pattern_id
        ).eq("user_id", user_id).single().execute()
        
        if not pattern_result.data:
            raise ValueError("Pattern nicht gefunden")
        
        pattern = pattern_result.data
        
        # Create rule from pattern
        rule_data = {
            "user_id": user_id,
            "original_command": f"Pattern: {pattern['pattern_type']}",
            "rule_type": "style_preference",
            "trigger_config": {"pattern_based": True},
            "action_config": {
                "instruction": pattern.get("pattern_description", ""),
                "pattern_type": pattern["pattern_type"],
            },
            "priority": 60,
            "scope": "personal",
            "is_active": True,
        }
        
        rule_result = self.db.table("command_rules").insert(rule_data).execute()
        rule_id = rule_result.data[0]["id"] if rule_result.data else None
        
        # Update pattern status
        self.db.table("learning_patterns").update({
            "status": "active",
            "promoted_to_rule_id": rule_id,
        }).eq("id", pattern_id).execute()
        
        # Award XP
        xp_earned = 50
        self._award_xp(user_id, xp_earned, "pattern_activated")
        
        return {"rule_id": rule_id, "xp_earned": xp_earned}
    
    def dismiss_pattern(self, user_id: str, pattern_id: str):
        """Lehnt ein Pattern ab."""
        
        self.db.table("learning_patterns").update({
            "status": "rejected"
        }).eq("id", pattern_id).eq("user_id", user_id).execute()
    
    # =========================================================================
    # DEEP ANALYSIS
    # =========================================================================
    
    def deep_analyze(self, original: str, final: str) -> Dict[str, Any]:
        """
        Tiefe Analyse mit Claude.
        Für komplexe Änderungen.
        """
        
        if not self.anthropic:
            return {
                "changes": ["custom"],
                "pattern": None,
                "insights": "Claude nicht verfügbar",
                "suggested_rule_name": "Eigene Anpassung",
            }
        
        prompt = f"""Analysiere diese zwei Texte und erkenne die Änderungen.

ORIGINAL (KI-Vorschlag):
{original}

FINAL (User-Version):
{final}

Analysiere:
1. Welche konkreten Änderungen wurden gemacht?
2. Gibt es ein erkennbares Pattern/Muster?
3. Was könnte die Intention des Users sein?
4. Vorschlag für einen Regel-Namen

Antworte NUR mit JSON:
```json
{{
    "changes": ["change1", "change2"],
    "pattern": "pattern_name oder null",
    "insights": "Kurze Erklärung der Intention",
    "suggested_rule_name": "z.B. 'Direkter bei Follow-ups'"
}}
```"""
        
        try:
            response = self.anthropic.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            
            # Parse JSON
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Try direct JSON parse
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                return json.loads(json_match.group())
            
            return {
                "changes": ["custom"],
                "pattern": None,
                "insights": "Analyse nicht möglich",
                "suggested_rule_name": "Eigene Anpassung",
            }
            
        except Exception as e:
            print(f"Deep analysis error: {e}")
            return {
                "changes": ["custom"],
                "pattern": None,
                "insights": str(e),
                "suggested_rule_name": "Eigene Anpassung",
            }
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _build_success_message(
        self,
        created: Dict,
        pattern: Optional[PatternDetectedSchema],
    ) -> str:
        """Baut User-freundliche Success Message."""
        
        parts = []
        
        if created.get("rule_id"):
            parts.append("✅ Regel gespeichert!")
        elif created.get("broadcast_id"):
            parts.append("📤 Zur Team-Freigabe eingereicht!")
        else:
            parts.append("📝 Korrektur notiert!")
        
        if pattern:
            if pattern.will_become_rule:
                parts.append(f"🎯 Pattern '{pattern.pattern_type}' erkannt!")
            else:
                parts.append(f"📊 {pattern.signal_count} ähnliche Korrekturen")
        
        return " ".join(parts)

