# backend/app/services/sales_brain/service.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🧠 SALES BRAIN SERVICE                                                     ║
║  Teach-UI & Rule Learning System                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Regeln erstellen aus User-Overrides
- Regeln matchen basierend auf Kontext
- Accept/Reject Tracking
- Team-weite Regeln
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
import difflib

from supabase import Client


class SalesBrainService:
    """
    🧠 Sales Brain Service für Regel-Learning
    
    Hauptfunktionen:
    - create_rule() - Neue Regel aus Override erstellen
    - get_rules() - Regeln abrufen
    - match_rules() - Passende Regeln finden
    - apply_rule() - Regel anwenden (Tracking)
    - submit_feedback() - Feedback zu Regel
    """
    
    # XP Rewards
    XP_RULE_CREATED = 10
    XP_RULE_ACCEPTED = 2
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # CREATE RULE
    # =========================================================================
    
    def create_rule(
        self,
        user_id: str,
        team_id: Optional[str],
        scope: str,  # "user" | "team"
        override: Dict[str, Any],
        note: Optional[str] = None,
        auto_tag: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Erstellt eine neue Regel aus einem Override.
        
        Args:
            user_id: ID des Users
            team_id: ID des Teams (optional)
            scope: "user" oder "team"
            override: Override-Event mit original_text, final_text, context
            note: Optionaler Kommentar
            auto_tag: Auto-erkannter Tag
        """
        
        context = override.get("context", {})
        
        # Scope bestimmen
        owner_user_id = user_id if scope == "user" else None
        owner_team_id = team_id if scope == "team" else None
        
        # Use-Case aus Kontext oder Auto-Tag
        use_case = context.get("use_case") or auto_tag
        
        # Regel erstellen
        rule_data = {
            "owner_user_id": owner_user_id,
            "owner_team_id": owner_team_id,
            "scope": scope,
            
            # Context Filter
            "vertical_id": context.get("vertical_id"),
            "company_id": context.get("company_id"),
            "channel": context.get("channel"),
            "use_case": use_case,
            "language": context.get("language", "de"),
            "lead_status": context.get("lead_status"),
            "deal_state": context.get("deal_state"),
            
            # Text
            "original_text": override.get("original_text"),
            "preferred_text": override.get("final_text"),
            "similarity_score": override.get("similarity_score", 0),
            "override_type": override.get("override_type", "full_replace"),
            
            # Metadata
            "suggestion_id": override.get("suggestion_id"),
            "note": note,
            "status": "active",
            "priority": "medium",
            
            # Stats
            "apply_count": 0,
            "accept_count": 0,
            
            "created_by": user_id,
        }
        
        result = self.db.table("sales_brain_rules").insert(rule_data).execute()
        
        if not result.data:
            raise Exception("Regel konnte nicht erstellt werden")
        
        rule = result.data[0]
        
        # Optional: Template erstellen
        template_id = None
        template_created = False
        
        if self._should_create_template(override):
            template_id = self._create_template_from_rule(
                user_id=user_id,
                rule=rule,
            )
            template_created = template_id is not None
        
        # XP vergeben
        self._award_xp(user_id, self.XP_RULE_CREATED, "sales_brain_rule_created")
        
        return {
            "id": rule["id"],
            "message": f"Regel erfolgreich erstellt ({scope})",
            "template_created": template_created,
            "template_id": template_id,
        }
    
    # =========================================================================
    # GET RULES
    # =========================================================================
    
    def get_rules(
        self,
        user_id: str,
        team_id: Optional[str] = None,
        scope: Optional[str] = None,
        channel: Optional[str] = None,
        use_case: Optional[str] = None,
        status: str = "active",
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """
        Holt Regeln für User/Team.
        """
        
        # Base Query
        query = self.db.table("sales_brain_rules").select("*", count="exact")
        
        # Filter: User's own rules OR team rules
        if scope == "user":
            query = query.eq("owner_user_id", user_id)
        elif scope == "team" and team_id:
            query = query.eq("owner_team_id", team_id)
        else:
            # Alle Regeln die für diesen User gelten
            query = query.or_(
                f"owner_user_id.eq.{user_id},owner_team_id.eq.{team_id}"
            )
        
        # Weitere Filter
        if channel:
            query = query.eq("channel", channel)
        if use_case:
            query = query.eq("use_case", use_case)
        if status:
            query = query.eq("status", status)
        
        # Pagination
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)
        
        result = query.execute()
        
        return {
            "rules": result.data or [],
            "total": result.count or 0,
            "page": page,
            "page_size": page_size,
        }
    
    def get_rule(self, rule_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Holt eine einzelne Regel.
        """
        
        result = self.db.table("sales_brain_rules").select("*").eq(
            "id", rule_id
        ).single().execute()
        
        if not result.data:
            return None
        
        return result.data
    
    # =========================================================================
    # UPDATE RULE
    # =========================================================================
    
    def update_rule(
        self,
        rule_id: str,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Aktualisiert eine Regel.
        """
        
        allowed_fields = ["preferred_text", "note", "status", "priority"]
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
        
        if not filtered_updates:
            raise ValueError("Keine gültigen Updates")
        
        filtered_updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.db.table("sales_brain_rules").update(
            filtered_updates
        ).eq("id", rule_id).execute()
        
        if not result.data:
            raise Exception("Regel nicht gefunden")
        
        return result.data[0]
    
    # =========================================================================
    # DELETE RULE
    # =========================================================================
    
    def delete_rule(self, rule_id: str, user_id: str) -> bool:
        """
        Löscht eine Regel (soft delete via status).
        """
        
        self.db.table("sales_brain_rules").update({
            "status": "deleted",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", rule_id).execute()
        
        return True
    
    # =========================================================================
    # MATCH RULES
    # =========================================================================
    
    def match_rules(
        self,
        user_id: str,
        team_id: Optional[str] = None,
        channel: Optional[str] = None,
        use_case: Optional[str] = None,
        lead_status: Optional[str] = None,
        deal_state: Optional[str] = None,
        input_text: Optional[str] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Findet passende Regeln für einen Kontext.
        
        Matching-Logik:
        1. Exakte Matches auf channel, use_case, etc.
        2. Text-Ähnlichkeit zum input_text
        3. Priorisierung nach priority, accept_rate
        """
        
        # Base Query: Aktive Regeln für User/Team
        query = self.db.table("sales_brain_rules").select("*").eq(
            "status", "active"
        )
        
        # User's own rules OR team rules
        if team_id:
            query = query.or_(
                f"owner_user_id.eq.{user_id},owner_team_id.eq.{team_id}"
            )
        else:
            query = query.eq("owner_user_id", user_id)
        
        # Context Matching
        if channel:
            query = query.or_(f"channel.eq.{channel},channel.is.null")
        if use_case:
            query = query.or_(f"use_case.eq.{use_case},use_case.is.null")
        if lead_status:
            query = query.or_(f"lead_status.eq.{lead_status},lead_status.is.null")
        
        result = query.order("priority", desc=True).order(
            "accept_count", desc=True
        ).limit(limit * 3).execute()
        
        rules = result.data or []
        
        # Falls input_text gegeben, nach Ähnlichkeit sortieren
        if input_text and rules:
            rules = self._rank_by_text_similarity(rules, input_text)
        
        return rules[:limit]
    
    def _rank_by_text_similarity(
        self,
        rules: List[Dict[str, Any]],
        input_text: str,
    ) -> List[Dict[str, Any]]:
        """
        Rankt Regeln nach Text-Ähnlichkeit.
        """
        
        scored = []
        for rule in rules:
            original = rule.get("original_text", "")
            
            # Sequenz-Matching für Ähnlichkeit
            ratio = difflib.SequenceMatcher(None, input_text.lower(), original.lower()).ratio()
            
            # Kombinierter Score mit Priority
            priority_bonus = {"critical": 0.4, "high": 0.3, "medium": 0.2, "low": 0.1}
            total_score = ratio + priority_bonus.get(rule.get("priority", "medium"), 0.2)
            
            scored.append((rule, total_score))
        
        # Nach Score sortieren
        scored.sort(key=lambda x: x[1], reverse=True)
        
        return [rule for rule, _ in scored]
    
    # =========================================================================
    # FEEDBACK
    # =========================================================================
    
    def submit_feedback(
        self,
        rule_id: str,
        user_id: str,
        accepted: bool,
        modified: bool = False,
        final_text: Optional[str] = None,
    ) -> None:
        """
        Gibt Feedback zu einer angewendeten Regel.
        Aktualisiert accept_rate und apply_count.
        """
        
        # Hole aktuelle Stats
        rule = self.get_rule(rule_id, user_id)
        if not rule:
            return
        
        apply_count = rule.get("apply_count", 0) + 1
        accept_count = rule.get("accept_count", 0) + (1 if accepted else 0)
        accept_rate = accept_count / apply_count if apply_count > 0 else 0
        
        # Update Rule
        self.db.table("sales_brain_rules").update({
            "apply_count": apply_count,
            "accept_count": accept_count,
            "accept_rate": round(accept_rate, 2),
            "last_applied_at": datetime.utcnow().isoformat(),
        }).eq("id", rule_id).execute()
        
        # Feedback Event speichern
        self.db.table("sales_brain_feedback").insert({
            "rule_id": rule_id,
            "user_id": user_id,
            "accepted": accepted,
            "modified": modified,
            "final_text": final_text,
        }).execute()
        
        # XP wenn akzeptiert
        if accepted:
            self._award_xp(user_id, self.XP_RULE_ACCEPTED, "sales_brain_rule_applied")
    
    # =========================================================================
    # STATS
    # =========================================================================
    
    def get_stats(
        self,
        user_id: str,
        team_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Holt Sales Brain Statistiken.
        """
        
        # Eigene Regeln
        user_result = self.db.table("sales_brain_rules").select(
            "id", count="exact"
        ).eq("owner_user_id", user_id).eq("status", "active").execute()
        
        user_rules = user_result.count or 0
        
        # Team Regeln
        team_rules = 0
        if team_id:
            team_result = self.db.table("sales_brain_rules").select(
                "id", count="exact"
            ).eq("owner_team_id", team_id).eq("status", "active").execute()
            team_rules = team_result.count or 0
        
        # Applied this week
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        applied_result = self.db.table("sales_brain_feedback").select(
            "id", count="exact"
        ).eq("user_id", user_id).gte("created_at", week_ago).execute()
        
        applied_this_week = applied_result.count or 0
        
        # Top Use Cases
        use_cases_result = self.db.table("sales_brain_rules").select(
            "use_case"
        ).or_(
            f"owner_user_id.eq.{user_id}"
            + (f",owner_team_id.eq.{team_id}" if team_id else "")
        ).eq("status", "active").not_.is_("use_case", "null").execute()
        
        use_case_counts: Dict[str, int] = {}
        for row in use_cases_result.data or []:
            uc = row.get("use_case")
            if uc:
                use_case_counts[uc] = use_case_counts.get(uc, 0) + 1
        
        top_use_cases = [
            {"use_case": uc, "count": count}
            for uc, count in sorted(use_case_counts.items(), key=lambda x: -x[1])[:5]
        ]
        
        return {
            "total_rules": user_rules + team_rules,
            "user_rules": user_rules,
            "team_rules": team_rules,
            "applied_this_week": applied_this_week,
            "top_use_cases": top_use_cases,
        }
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _should_create_template(self, override: Dict[str, Any]) -> bool:
        """
        Entscheidet ob aus dem Override ein Template erstellt werden soll.
        """
        
        # Template erstellen wenn:
        # - Similarity < 0.5 (stark verändert)
        # - Text länger als 50 Zeichen
        similarity = override.get("similarity_score", 1)
        final_text = override.get("final_text", "")
        
        return similarity < 0.5 and len(final_text) > 50
    
    def _create_template_from_rule(
        self,
        user_id: str,
        rule: Dict[str, Any],
    ) -> Optional[str]:
        """
        Erstellt ein Template aus einer Regel.
        """
        
        try:
            result = self.db.table("sales_templates").insert({
                "user_id": user_id,
                "name": f"Auto: {rule.get('use_case', 'Generiert')}",
                "content": rule.get("preferred_text"),
                "channel": rule.get("channel"),
                "category": rule.get("use_case"),
                "source": "sales_brain",
                "source_rule_id": rule.get("id"),
            }).execute()
            
            return result.data[0]["id"] if result.data else None
        except Exception as e:
            print(f"Template creation failed: {e}")
            return None
    
    def _award_xp(self, user_id: str, amount: int, reason: str):
        """
        Vergibt XP.
        """
        try:
            self.db.table("xp_events").insert({
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "source": "sales_brain",
            }).execute()
        except Exception as e:
            print(f"XP award error: {e}")


# =============================================================================
# FACTORY
# =============================================================================

def get_sales_brain_service(db: Client) -> SalesBrainService:
    """Factory für SalesBrainService"""
    return SalesBrainService(db)

