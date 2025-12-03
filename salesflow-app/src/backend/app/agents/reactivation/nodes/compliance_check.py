"""
Reactivation Agent - Compliance Check Node

DSGVO und Liability Compliance Prüfung für Nachrichten.
Kritisch für den DACH-Markt.
"""

import re
import logging
from typing import List, Tuple

from ..state import ReactivationState

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# LIABILITY PATTERNS (DACH-spezifisch)
# ═══════════════════════════════════════════════════════════════════════════

LIABILITY_PATTERNS = [
    # Garantien
    (r"\bgarantier(e|t|en|te)\b", "Garantie-Versprechen sind rechtlich problematisch"),
    (r"\b100\s*%\s*(sicher|garantiert|erfolg)", "Absolute Zusicherungen vermeiden"),
    
    # Heilversprechen (kritisch für Network Marketing)
    (r"\b(heilt?|heilung|kur(iert|en)?)\b", "Heilversprechen sind verboten (HWG)"),
    (r"\b(gesund(heit)?|krankheit|therap)", "Gesundheitsbezogene Aussagen prüfen"),
    
    # Finanzielle Versprechen
    (r"\breich\s*werden\b", "Unrealistische Einkommensversprechen"),
    (r"\bschnell(es)?\s*geld\b", "Unrealistische Einkommensversprechen"),
    (r"\b\d+\.?\d*\s*€?\s*(pro|im)\s*(tag|woche|monat)\b", "Konkrete Einkommensangaben problematisch"),
    
    # Aggressive Aussagen
    (r"\b(kündigen\s*sie|wechseln\s*sie\s*sofort)\b", "Aggressive Aufforderungen vermeiden"),
    (r"\bletztes?\s*angebot\b", "Drucktaktiken vermeiden"),
]

# Formality Markers (Sie vs Du)
INFORMAL_MARKERS = [" du ", " dir ", " dein", " dich ", " deine"]
FORMAL_MARKERS = [" Sie ", " Ihnen ", " Ihr ", " Ihre"]


class ComplianceChecker:
    """
    Compliance-Prüfung für den DACH-Markt.
    
    Prüft:
    1. Liability: Keine verbotenen Aussagen
    2. Formality: Korrekte Anrede (Sie/Du)
    3. DSGVO: Abmelde-Hinweis bei Email
    4. Credentials: Keine API-Keys/Passwörter
    """
    
    def check(self, state: ReactivationState) -> Tuple[bool, List[str]]:
        """
        Führt alle Compliance-Checks durch.
        
        Returns:
            (passed: bool, issues: List[str])
        """
        issues = []
        message = state.get("draft_message", "")
        
        if not message:
            return False, ["Keine Nachricht zum Prüfen"]
        
        # 1. Liability Check
        liability_issues = self._check_liability(message)
        issues.extend(liability_issues)
        
        # 2. Formality Check
        formality_issue = self._check_formality(
            message=message,
            expected=state.get("lead_context", {}).get("preferred_formality", "Sie")
        )
        if formality_issue:
            issues.append(formality_issue)
        
        # 3. Unsubscribe Check (nur Email)
        if state.get("suggested_channel") == "email":
            if not self._has_unsubscribe_option(message):
                issues.append("⚠️ Email ohne Abmelde-Hinweis (DSGVO)")
        
        # 4. Sensitive Data Check
        sensitive_issues = self._check_sensitive_data(message)
        issues.extend(sensitive_issues)
        
        # 5. Length Check
        length_issue = self._check_length(
            message=message,
            channel=state.get("suggested_channel", "email")
        )
        if length_issue:
            issues.append(length_issue)
        
        passed = len(issues) == 0
        
        logger.info(
            f"[{state.get('run_id', 'unknown')}] Compliance Check: "
            f"{'PASSED' if passed else f'FAILED ({len(issues)} issues)'}"
        )
        
        return passed, issues
    
    def _check_liability(self, message: str) -> List[str]:
        """
        Prüft auf rechtlich problematische Aussagen.
        """
        issues = []
        message_lower = message.lower()
        
        for pattern, description in LIABILITY_PATTERNS:
            if re.search(pattern, message_lower, re.IGNORECASE):
                issues.append(f"⚠️ Liability: {description}")
        
        return issues
    
    def _check_formality(self, message: str, expected: str) -> str | None:
        """
        Prüft korrekte Anrede (Sie vs Du).
        
        Kritisch im DACH-Raum: Falsche Anrede = Unprofessionell!
        """
        message_lower = f" {message.lower()} "  # Padding für Word Boundaries
        
        has_informal = any(marker in message_lower for marker in INFORMAL_MARKERS)
        has_formal = any(marker in message_lower for marker in FORMAL_MARKERS)
        
        if expected == "Sie":
            if has_informal and not has_formal:
                return "❌ Falsche Anrede: 'Du' verwendet statt 'Sie'"
            if has_informal and has_formal:
                return "⚠️ Gemischte Anrede: 'Du' und 'Sie' gemischt"
        
        elif expected == "Du":
            if has_formal and not has_informal:
                return "❌ Falsche Anrede: 'Sie' verwendet statt 'Du'"
        
        return None
    
    def _has_unsubscribe_option(self, message: str) -> bool:
        """
        Prüft auf Abmelde-Hinweis (DSGVO-Pflicht für Email-Marketing).
        """
        unsubscribe_patterns = [
            r"abmeld",
            r"abbestell",
            r"newsletter.*beenden",
            r"nicht\s*mehr.*kontaktieren",
            r"unsubscribe",
            r"austragen"
        ]
        
        message_lower = message.lower()
        return any(re.search(p, message_lower) for p in unsubscribe_patterns)
    
    def _check_sensitive_data(self, message: str) -> List[str]:
        """
        Prüft auf exponierte sensible Daten.
        """
        issues = []
        message_lower = message.lower()
        
        # API Keys / Credentials
        if re.search(r"(api[-_]?key|password|passwort|token|secret)", message_lower):
            issues.append("🔐 Potenzielle Credential-Exposition erkannt")
        
        # Interne Preise/Rabatte
        if re.search(r"intern(er)?\s*(preis|rabatt)", message_lower):
            issues.append("💰 Interne Preisinformationen erkannt")
        
        return issues
    
    def _check_length(self, message: str, channel: str) -> str | None:
        """
        Prüft die Nachrichtenlänge für den Kanal.
        """
        char_count = len(message)
        
        if channel == "linkedin":
            # LinkedIn Connection Request: 300 Zeichen
            # LinkedIn Message: 3000 Zeichen
            if char_count > 1000:
                return f"📏 Nachricht zu lang für LinkedIn ({char_count} Zeichen)"
        
        elif channel == "email":
            if char_count > 2000:
                return f"📏 Email sehr lang ({char_count} Zeichen) - Kürzung empfohlen"
        
        return None


# ═══════════════════════════════════════════════════════════════════════════
# NODE FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

async def run(state: ReactivationState) -> dict:
    """
    Compliance Check Node: Prüft die generierte Nachricht.
    
    Output:
    - compliance_passed: bool
    - compliance_issues: List[str]
    - requires_review: bool (True wenn Issues oder niedrige Confidence)
    """
    run_id = state.get("run_id", "unknown")
    
    logger.info(f"[{run_id}] Compliance Check: Starting...")
    
    checker = ComplianceChecker()
    passed, issues = checker.check(state)
    
    # Review erforderlich wenn:
    # - Compliance Issues
    # - Confidence < 0.9
    # - Email Kanal (DSGVO)
    requires_review = (
        not passed
        or state.get("confidence_score", 0) < 0.9
        or state.get("suggested_channel") == "email"
    )
    
    review_reasons = []
    if not passed:
        review_reasons.append("Compliance Issues gefunden")
    if state.get("confidence_score", 0) < 0.9:
        review_reasons.append(f"Confidence unter 90% ({state.get('confidence_score', 0):.0%})")
    if state.get("suggested_channel") == "email":
        review_reasons.append("Email erfordert DSGVO-Review")
    
    return {
        "compliance_passed": passed,
        "compliance_issues": issues,
        "requires_review": requires_review,
        "review_reason": "; ".join(review_reasons) if review_reasons else None,
    }

