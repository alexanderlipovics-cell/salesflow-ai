"""
Context Builder

Aggregiert Kontext für LLM-Calls.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ContextBuilder:
    """
    Baut strukturierten Kontext für LLM-Calls.
    """
    
    def __init__(self, max_tokens: int = 4000):
        self.max_tokens = max_tokens
        self.estimated_chars_per_token = 4
    
    def build_context(
        self,
        lead_context: Dict[str, Any],
        interactions: List[Dict[str, Any]],
        signals: List[Dict[str, Any]] = None
    ) -> str:
        """
        Baut den Kontext-String für das LLM.
        """
        parts = []
        
        # Lead Info
        parts.append(self._format_lead_context(lead_context))
        
        # Interaktionen
        if interactions:
            parts.append(self._format_interactions(interactions))
        
        # Signale
        if signals:
            parts.append(self._format_signals(signals))
        
        context = "\n\n".join(parts)
        
        # Truncate wenn nötig
        max_chars = self.max_tokens * self.estimated_chars_per_token
        if len(context) > max_chars:
            context = context[:max_chars] + "\n...[truncated]"
        
        return context
    
    def _format_lead_context(self, lead: Dict[str, Any]) -> str:
        return f"""## Lead
- Name: {lead.get('name', 'N/A')}
- Company: {lead.get('company', 'N/A')}
- Persona: {lead.get('persona_type', 'N/A')}
- Anrede: {lead.get('preferred_formality', 'Sie')}
- Dormant: {lead.get('days_dormant', 'N/A')} Tage"""
    
    def _format_interactions(self, interactions: List[Dict]) -> str:
        lines = ["## Interaktionen"]
        for i in interactions[:5]:
            lines.append(f"- [{i.get('interaction_date', '')[:10]}] {i.get('summary', '')}")
        return "\n".join(lines)
    
    def _format_signals(self, signals: List[Dict]) -> str:
        lines = ["## Signale"]
        for s in signals[:3]:
            lines.append(f"- {s.get('type', '')}: {s.get('title', '')}")
        return "\n".join(lines)

