"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COMMAND LINE SERVICE                                                      ║
║  Verarbeitet explizite Befehle von Pro-Usern                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Beispiel-Befehle:
- "CHIEF, ab jetzt bei 'zu teuer' keine Rabatte"
- "Wenn jemand 'keine Zeit' sagt, immer mit Verständnis reagieren"
- "Regel: Bei Follow-ups immer eine Frage am Ende"

Das System:
1. Erkennt den Befehl (Pattern Matching)
2. Parst ihn (Trigger + Action extrahieren)
3. Erstellt strukturierte Regel
4. Wendet sie in Zukunft an
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
import re
import json

from supabase import Client


class CommandService:
    """
    Verarbeitet natürlichsprachliche Befehle und wandelt sie in Regeln um.
    
    Keine Admin-Menüs, keine Formulare - 
    Profis geben Befehle, das System gehorcht.
    """
    
    # Erkennungs-Patterns für Commands
    COMMAND_PATTERNS = [
        r"(?:CHIEF|Chief|chief)[,:]?\s*(.+)",
        r"(?:Ab jetzt|Ab sofort|Künftig|Immer)[,:]?\s*(.+)",
        r"(?:Regel|Rule)[,:]?\s*(.+)",
        r"(?:Merk dir|Merke dir)[,:]?\s*(.+)",
        r"(?:Wenn|Bei|Falls)\s+(.+?)[,:]?\s*(?:dann|immer|nie)\s*(.+)",
        r"(?:Nie mehr|Niemals|Nicht mehr)[,:]?\s*(.+)",
    ]
    
    # Trigger Keywords für verschiedene Szenarien
    TRIGGER_KEYWORDS = {
        'objection': ['einwand', 'zu teuer', 'kein budget', 'keine zeit', 'überlegen', 'später'],
        'follow_up': ['follow-up', 'followup', 'nachfassen', 'nachhaken'],
        'first_contact': ['erstkontakt', 'erster kontakt', 'anschreiben'],
        'closing': ['abschluss', 'close', 'closing', 'verkauf'],
        'reactivation': ['reaktivierung', 'wieder kontaktieren', 'lange nicht'],
    }
    
    def __init__(self, db: Client):
        self.db = db
    
    def is_command(self, text: str) -> bool:
        """Prüft ob Text ein Command ist"""
        for pattern in self.COMMAND_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    def parse_command(
        self,
        command_text: str,
        user_id: str,
        context: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Parst natürlichsprachlichen Befehl in strukturierte Regel.
        
        Returns:
            Dict mit parsed rule oder error
        """
        command_lower = command_text.lower()
        
        # Trigger erkennen
        trigger_type = 'all'
        trigger_pattern = []
        
        for ttype, keywords in self.TRIGGER_KEYWORDS.items():
            for keyword in keywords:
                if keyword in command_lower:
                    trigger_type = ttype
                    trigger_pattern.append(keyword)
        
        # Action Keywords erkennen
        action_keywords = self._extract_action_keywords(command_lower)
        
        # Rule Type bestimmen
        rule_type = self._determine_rule_type(command_lower)
        
        # Instruction extrahieren
        instruction = self._extract_instruction(command_text)
        
        # Examples versuchen zu extrahieren
        examples = self._extract_examples(command_text)
        
        parsed = {
            "understood": True,
            "rule_type": rule_type,
            "trigger_config": {
                "trigger_type": trigger_type if trigger_pattern else 'all',
                "trigger_pattern": trigger_pattern if trigger_pattern else ['alle Situationen'],
                "channels": ["all"],
                "lead_statuses": ["all"],
            },
            "action_config": {
                "actions": action_keywords,
                "instruction": instruction,
            },
            "examples": examples,
            "priority": self._calculate_priority(command_lower),
            "clarification_needed": None,
        }
        
        # Prüfen ob genug Info vorhanden
        if not instruction or len(instruction) < 10:
            parsed["clarification_needed"] = "Was genau soll CHIEF in dieser Situation tun?"
        
        return parsed
    
    def _extract_action_keywords(self, text: str) -> List[str]:
        """Extrahiert Action-Keywords aus dem Befehl"""
        actions = []
        
        action_mapping = {
            'keine rabatte': 'never_offer_discount',
            'kein rabatt': 'never_offer_discount',
            'nicht preisnachlass': 'never_offer_discount',
            'roi fragen': 'ask_roi_questions',
            'roi-fragen': 'ask_roi_questions',
            'frage stellen': 'ask_question',
            'fragen stellen': 'ask_questions',
            'verständnis zeigen': 'show_empathy',
            'empathisch': 'show_empathy',
            'kürzer': 'be_shorter',
            'kurz halten': 'be_shorter',
            'direkter': 'be_direct',
            'direkt': 'be_direct',
            'keine emojis': 'no_emojis',
            'ohne emojis': 'no_emojis',
            'mehr emojis': 'more_emojis',
            'persönlich': 'personalize',
            'social proof': 'use_social_proof',
            'beispiel geben': 'give_example',
            'termin vorschlagen': 'suggest_appointment',
        }
        
        for keyword, action in action_mapping.items():
            if keyword in text:
                actions.append(action)
        
        return actions if actions else ['custom_instruction']
    
    def _determine_rule_type(self, text: str) -> str:
        """Bestimmt den Typ der Regel"""
        if any(w in text for w in ['nie', 'niemals', 'nicht', 'kein']):
            return 'never_do'
        elif any(w in text for w in ['immer', 'stets', 'jedes mal']):
            return 'always_do'
        elif any(w in text for w in ['ton', 'stil', 'locker', 'formell', 'freundlich']):
            return 'tone'
        elif any(w in text for w in ['kurz', 'lang', 'struktur', 'format']):
            return 'structure'
        else:
            return 'reply_strategy'
    
    def _extract_instruction(self, text: str) -> str:
        """Extrahiert die Kern-Instruktion aus dem Befehl"""
        # Entferne Trigger-Wörter
        instruction = text
        for pattern in self.COMMAND_PATTERNS:
            instruction = re.sub(pattern, r'\1 \2' if '(.+?)' in pattern else r'\1', instruction, flags=re.IGNORECASE)
        
        # Clean up
        instruction = re.sub(r'\s+', ' ', instruction).strip()
        instruction = re.sub(r'^[,:\s]+', '', instruction)
        
        return instruction
    
    def _extract_examples(self, text: str) -> List[Dict[str, str]]:
        """Versucht Beispiele aus dem Befehl zu extrahieren"""
        examples = []
        
        # Pattern: "nicht X sondern Y" oder "statt X lieber Y"
        patterns = [
            r'nicht\s+"([^"]+)"\s+sondern\s+"([^"]+)"',
            r"nicht\s+'([^']+)'\s+sondern\s+'([^']+)'",
            r'statt\s+"([^"]+)"\s+lieber\s+"([^"]+)"',
            r"statt\s+'([^']+)'\s+lieber\s+'([^']+)'",
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                examples.append({
                    "bad": match[0],
                    "good": match[1],
                })
        
        return examples
    
    def _calculate_priority(self, text: str) -> int:
        """Berechnet die Priorität der Regel"""
        priority = 50  # Default
        
        # Höhere Priorität für absolute Aussagen
        if any(w in text for w in ['immer', 'niemals', 'nie', 'unbedingt']):
            priority += 20
        
        # Höhere Priorität für spezifische Trigger
        if any(w in text for w in ['zu teuer', 'keine zeit', 'einwand']):
            priority += 10
        
        # Niedrigere Priorität für vage Aussagen
        if any(w in text for w in ['manchmal', 'vielleicht', 'könnte']):
            priority -= 15
        
        return max(0, min(100, priority))  # Clamp to 0-100
    
    def create_rule(
        self,
        user_id: str,
        company_id: Optional[str],
        team_id: Optional[str],
        original_command: str,
        parsed: Dict[str, Any],
        scope: str = "personal",
    ) -> Dict[str, Any]:
        """Erstellt Command Rule in DB"""
        
        rule_data = {
            "user_id": user_id,
            "company_id": company_id,
            "team_id": team_id,
            "original_command": original_command,
            "rule_type": parsed.get("rule_type", "reply_strategy"),
            "trigger_config": parsed.get("trigger_config", {}),
            "action_config": parsed.get("action_config", {}),
            "examples": parsed.get("examples", []),
            "priority": parsed.get("priority", 50),
            "scope": scope,
        }
        
        result = self.db.table("command_rules").insert(rule_data).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to create command rule")
    
    def get_matching_rules(
        self,
        user_id: str,
        context: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Holt alle Regeln die auf den Kontext passen"""
        try:
            result = self.db.rpc(
                "get_matching_command_rules",
                {"p_user_id": user_id, "p_context": context}
            ).execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error getting matching rules: {e}")
            return []
    
    def get_user_rules(
        self,
        user_id: str,
        include_team: bool = True,
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Holt alle Regeln für einen User"""
        
        query = self.db.table("command_rules").select("*")
        
        if include_team:
            # Komplexere Query mit Team-Regeln
            # Hier vereinfacht: nur eigene Regeln
            query = query.eq("user_id", user_id)
        else:
            query = query.eq("user_id", user_id)
        
        if active_only:
            query = query.eq("is_active", True)
        
        result = query.order("priority", desc=True).order("created_at", desc=True).execute()
        
        # Follow Rate berechnen
        rules = []
        for rule in (result.data or []):
            if rule.get("times_applied", 0) > 0:
                rule["follow_rate"] = rule.get("times_followed", 0) / rule["times_applied"]
            else:
                rule["follow_rate"] = None
            rules.append(rule)
        
        return rules
    
    def update_rule(
        self,
        rule_id: str,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aktualisiert eine Regel"""
        allowed_updates = {
            k: v for k, v in updates.items()
            if k in ['trigger_config', 'action_config', 'examples', 'priority', 'is_active']
        }
        
        result = self.db.table("command_rules").update(allowed_updates).eq(
            "id", rule_id
        ).eq("user_id", user_id).execute()
        
        if result.data:
            return result.data[0]
        
        raise Exception("Failed to update rule")
    
    def delete_rule(
        self,
        rule_id: str,
        user_id: str,
    ) -> bool:
        """Deaktiviert eine Regel (soft delete)"""
        result = self.db.table("command_rules").update({
            "is_active": False
        }).eq("id", rule_id).eq("user_id", user_id).execute()
        
        return bool(result.data)
    
    def update_rule_stats(
        self,
        rule_id: str,
        was_followed: bool,
    ):
        """Aktualisiert Regel-Statistiken nach Anwendung"""
        
        # Increment times_applied
        # Increment times_followed or times_overridden
        updates = {
            "times_applied": self.db.table("command_rules").select("times_applied").eq("id", rule_id).execute().data[0]["times_applied"] + 1 if True else 0,
        }
        
        # Simpler approach: use RPC or just increment
        self.db.rpc("increment_rule_stats", {
            "p_rule_id": rule_id,
            "p_was_followed": was_followed,
        }).execute()
    
    def format_rules_for_prompt(
        self,
        rules: List[Dict[str, Any]],
    ) -> str:
        """Formatiert Regeln für CHIEF System Prompt"""
        if not rules:
            return "Keine aktiven Regeln."
        
        lines = []
        for rule in rules[:10]:  # Max 10 rules
            scope_emoji = "🔴" if rule.get("scope") == "personal" else "🟡"
            priority = rule.get("priority", 50)
            
            trigger = rule.get("trigger_config", {})
            action = rule.get("action_config", {})
            
            trigger_desc = trigger.get("trigger_pattern", ["alle Situationen"])
            if isinstance(trigger_desc, list):
                trigger_desc = ", ".join(trigger_desc[:3])
            
            instruction = action.get("instruction", "")
            
            lines.append(
                f"{scope_emoji} **[P{priority}]** Bei '{trigger_desc}':\n"
                f"   → {instruction}"
            )
            
            # Add example if available
            examples = rule.get("examples", [])
            if examples:
                ex = examples[0]
                if ex.get('bad'):
                    lines.append(f"   ❌ Nicht: {ex.get('bad', '')}")
                if ex.get('good'):
                    lines.append(f"   ✅ Besser: {ex.get('good', '')}")
        
        return "\n\n".join(lines)

