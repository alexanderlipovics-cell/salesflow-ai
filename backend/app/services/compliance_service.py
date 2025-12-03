# ============================================================================
# FILE: app/services/compliance_service.py
# DESCRIPTION: Compliance Service - LIABILITY-SHIELD Implementation
# ============================================================================

"""
Compliance Service für legal protection
- Filtert Heilversprechen und Garantien
- Nutzt Blacklist + OpenAI Moderation API
- Generiert Auto-Disclaimer
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple
import openai

from app.config import get_settings
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Blacklist kritischer Begriffe (deutsch + englisch)
BLACKLIST_TERMS = [
    # Heilversprechen
    r"\b(heilt|heilen|heilung|geheilt)\b",
    r"\b(kur|kuriert|kurier)\w*\b",
    r"\b(therapie|behandlung)\b",
    r"\b(medizinisch|ärztlich)\w*\b",
    
    # Gesundheitsversprechen
    r"\b(garantiert|garantie)\s+(gesund|gewicht|abnehm)\w*",
    r"\b(100%|hundertprozent)\s+(wirk|effekt|erfolg)\w*",
    r"\b(nachweislich|bewiesen)\s+(heilt|hilft|wirkt)",
    
    # Finanzielle Garantien
    r"\b(garantiert\s+\d+.*€)\b",
    r"\b(sicher\s+\d+.*verdien)\w*\b",
    r"\b(risikofrei|ohne\s+risiko)\s+(geld|einkommen)",
    
    # MLM-kritische Begriffe
    r"\b(schneeballsystem|pyramidensystem)\b",
    r"\b(schnell\s+reich)\b",
    r"\b(ohne\s+arbeit\s+geld)\b",
]


class ComplianceService:
    """Service for compliance checking and filtering"""

    def __init__(self):
        self.blacklist_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in BLACKLIST_TERMS
        ]

    async def check_compliance(
        self, 
        text: str,
        use_openai: bool = False
    ) -> Dict[str, any]:
        """
        Check text for compliance issues
        
        Args:
            text: Text to check
            use_openai: Use OpenAI Moderation API (optional, slower)
            
        Returns:
            {
                "is_compliant": bool,
                "issues": List[str],
                "filtered_text": str,
                "action_taken": str
            }
        """
        issues = []
        filtered_text = text
        
        # 1. Blacklist check (fast)
        for pattern in self.blacklist_patterns:
            matches = pattern.findall(text)
            if matches:
                issues.append(f"Blacklisted term detected: {matches[0]}")
                # Filter out problematic phrases
                filtered_text = pattern.sub("[ENTFERNT]", filtered_text)
        
        # 2. OpenAI Moderation (optional, requires API call)
        if use_openai and settings.OPENAI_API_KEY:
            try:
                moderation_result = await self._check_with_openai(text)
                if not moderation_result["is_safe"]:
                    issues.extend(moderation_result["flags"])
            except Exception as e:
                logger.warning(f"OpenAI moderation failed: {e}")
        
        # 3. Add disclaimer if issues found
        if issues:
            filtered_text = self._add_disclaimer(filtered_text)
        
        is_compliant = len(issues) == 0
        action_taken = "filtered" if issues else "passed"
        
        logger.info(
            f"Compliance check: {action_taken}",
            extra={
                "is_compliant": is_compliant,
                "issues_count": len(issues)
            }
        )
        
        return {
            "is_compliant": is_compliant,
            "issues": issues,
            "filtered_text": filtered_text,
            "action_taken": action_taken,
        }

    async def _check_with_openai(self, text: str) -> Dict[str, any]:
        """
        Use OpenAI Moderation API for additional checks
        """
        try:
            response = await openai.Moderation.acreate(input=text)
            result = response["results"][0]
            
            flags = []
            if result["flagged"]:
                for category, flagged in result["categories"].items():
                    if flagged:
                        flags.append(f"OpenAI: {category}")
            
            return {
                "is_safe": not result["flagged"],
                "flags": flags
            }
        except Exception as e:
            logger.error(f"OpenAI moderation error: {e}")
            return {"is_safe": True, "flags": []}

    def _add_disclaimer(self, text: str) -> str:
        """Add legal disclaimer to filtered text"""
        disclaimer = (
            "\n\n⚠️ HINWEIS: Dieses Tool gibt keine medizinischen Ratschläge "
            "oder Erfolgsgarantien. Konsultieren Sie bei gesundheitlichen Fragen "
            "einen Arzt. Finanzielle Ergebnisse sind individuell und nicht garantiert."
        )
        return text + disclaimer

    def generate_safe_alternative(self, original_text: str, issue_type: str) -> str:
        """
        Generate safe alternative phrasing
        
        Example:
            "garantiert 10kg abnehmen" → "kann beim Abnehmen unterstützen"
        """
        alternatives = {
            "heilung": "kann unterstützen",
            "garantiert": "kann helfen",
            "100% wirksam": "viele berichten von positiven Erfahrungen",
            "schnell reich": "Einkommenspotenzial",
        }
        
        safe_text = original_text
        for risky, safe in alternatives.items():
            safe_text = re.sub(
                risky, 
                safe, 
                safe_text, 
                flags=re.IGNORECASE
            )
        
        return safe_text


# Singleton instance
compliance_service = ComplianceService()

