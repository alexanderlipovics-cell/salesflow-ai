"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ACTION TAG PARSER                                                         ║
║  Extrahiert und verarbeitet Action Tags aus AI Responses                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Action Tags Format: [[ACTION:TYPE:PARAMS]]

Beispiele:
- [[ACTION:FOLLOWUP_LEADS:lead-001,lead-002]]
- [[ACTION:NEW_CONTACT_LIST]]
- [[ACTION:COMPOSE_MESSAGE:lead-001]]
- [[ACTION:LOG_ACTIVITY:call,lead-001]]
- [[ACTION:OBJECTION_HELP:keine_zeit]]
"""

import re
from typing import List, Optional
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class ActionType(str, Enum):
    """Verfügbare Action Types."""
    FOLLOWUP_LEADS = "FOLLOWUP_LEADS"
    NEW_CONTACT_LIST = "NEW_CONTACT_LIST"
    COMPOSE_MESSAGE = "COMPOSE_MESSAGE"
    LOG_ACTIVITY = "LOG_ACTIVITY"
    OBJECTION_HELP = "OBJECTION_HELP"
    SHOW_LEAD = "SHOW_LEAD"
    COMPLETE_TASK = "COMPLETE_TASK"
    OPEN_SCRIPT = "OPEN_SCRIPT"
    START_DMO = "START_DMO"
    CELEBRATE = "CELEBRATE"


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION TAG DATA CLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ActionTag:
    """Einzelner Action Tag aus einer AI Response."""
    action: str
    params: List[str] = field(default_factory=list)
    raw: str = ""
    
    def to_dict(self) -> dict:
        """Konvertiert zu Dictionary für JSON Response."""
        return {
            "action": self.action,
            "params": self.params,
        }
    
    @property
    def first_param(self) -> Optional[str]:
        """Gibt den ersten Parameter zurück (oder None)."""
        return self.params[0] if self.params else None
    
    def is_type(self, action_type: ActionType) -> bool:
        """Prüft ob dieser Tag vom angegebenen Typ ist."""
        return self.action == action_type.value


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION PARSER
# ═══════════════════════════════════════════════════════════════════════════════

class ActionParser:
    """
    Parser für Action Tags in AI Responses.
    
    Usage:
        parser = ActionParser()
        result = parser.parse(ai_response)
        
        print(result.clean_text)  # Text ohne Action Tags
        print(result.actions)     # Liste von ActionTag Objekten
    """
    
    # Regex Pattern für Action Tags: [[ACTION:TYPE:PARAMS]] oder [[ACTION:TYPE]]
    ACTION_PATTERN = re.compile(r'\[\[ACTION:([A-Z_]+)(?::([^\]]+))?\]\]')
    
    @dataclass
    class ParseResult:
        """Ergebnis des Parsens."""
        clean_text: str
        actions: List[ActionTag]
        raw_text: str
        
        @property
        def has_actions(self) -> bool:
            """Ob Actions gefunden wurden."""
            return len(self.actions) > 0
        
        def get_actions_by_type(self, action_type: ActionType) -> List[ActionTag]:
            """Filtert Actions nach Typ."""
            return [a for a in self.actions if a.is_type(action_type)]
        
        def to_dict(self) -> dict:
            """Konvertiert zu Dictionary."""
            return {
                "text": self.clean_text,
                "actions": [a.to_dict() for a in self.actions],
            }
    
    def parse(self, text: str) -> ParseResult:
        """
        Parst einen Text und extrahiert alle Action Tags.
        
        Args:
            text: Der zu parsende Text (AI Response)
            
        Returns:
            ParseResult mit clean_text und actions
        """
        if not text:
            return self.ParseResult(
                clean_text="",
                actions=[],
                raw_text=""
            )
        
        actions = []
        
        for match in self.ACTION_PATTERN.finditer(text):
            action_type = match.group(1)
            params_str = match.group(2)
            
            # Params parsen (komma-separiert)
            params = []
            if params_str:
                params = [p.strip() for p in params_str.split(",")]
            
            action = ActionTag(
                action=action_type,
                params=params,
                raw=match.group(0)
            )
            actions.append(action)
        
        # Text ohne Action Tags
        clean_text = self.ACTION_PATTERN.sub("", text).strip()
        
        # Mehrfache Leerzeichen/Newlines bereinigen
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
        clean_text = re.sub(r' +', ' ', clean_text)
        
        return self.ParseResult(
            clean_text=clean_text,
            actions=actions,
            raw_text=text
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

_parser = ActionParser()


def extract_action_tags(response: str) -> List[ActionTag]:
    """
    Extrahiert alle Action Tags aus einer AI Response.
    
    Args:
        response: Die AI Response
        
    Returns:
        Liste von ActionTag Objekten
    """
    result = _parser.parse(response)
    return result.actions


def strip_action_tags(response: str) -> str:
    """
    Entfernt alle Action Tags aus einer AI Response.
    
    Args:
        response: Die AI Response
        
    Returns:
        Bereinigter Text ohne Action Tags
    """
    result = _parser.parse(response)
    return result.clean_text


def parse_response(response: str) -> dict:
    """
    Parst eine AI Response komplett.
    
    Args:
        response: Die AI Response
        
    Returns:
        Dict mit 'text' und 'actions'
    """
    result = _parser.parse(response)
    return result.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def build_action_tag(action_type: ActionType, params: List[str] = None) -> str:
    """
    Baut einen Action Tag String.
    
    Args:
        action_type: Der Action Typ
        params: Optionale Parameter
        
    Returns:
        Action Tag String (z.B. "[[ACTION:FOLLOWUP_LEADS:id1,id2]]")
    """
    if params:
        params_str = ",".join(params)
        return f"[[ACTION:{action_type.value}:{params_str}]]"
    return f"[[ACTION:{action_type.value}]]"

