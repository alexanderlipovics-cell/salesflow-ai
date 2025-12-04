"""
SalesFlow AI - Compliance Sentinel
===================================
Automatische Prüfung von Nachrichten auf:
- HWG (Heilmittelwerbegesetz) - Keine Heilversprechen
- UWG (Gesetz gegen unlauteren Wettbewerb) - Keine falschen Versprechen
- DSGVO - Datenschutz-sensible Inhalte
- MLM-spezifische Compliance

Usage:
    from compliance_sentinel import ComplianceSentinel
    
    sentinel = ComplianceSentinel(company="doterra")
    result = sentinel.check("Dieses Öl heilt Krebs!")
    
    if not result.is_compliant:
        print(result.violations)
        print(result.suggestions)
"""

import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

class ViolationType(Enum):
    """Arten von Compliance-Verstößen"""
    HWG = "hwg"  # Heilmittelwerbegesetz
    UWG = "uwg"  # Unlauterer Wettbewerb
    DSGVO = "dsgvo"  # Datenschutz
    MLM = "mlm"  # MLM-spezifische Regeln
    INCOME = "income"  # Einkommensversprechen

@dataclass
class Violation:
    """Ein einzelner Compliance-Verstoß"""
    type: ViolationType
    severity: str  # "warning", "error", "critical"
    matched_text: str
    rule_id: str
    explanation: str
    suggestion: Optional[str] = None

@dataclass
class ComplianceResult:
    """Ergebnis einer Compliance-Prüfung"""
    is_compliant: bool
    violations: List[Violation] = field(default_factory=list)
    risk_score: float = 0.0  # 0-100
    checked_text: str = ""
    company: Optional[str] = None
    
    @property
    def has_critical(self) -> bool:
        return any(v.severity == "critical" for v in self.violations)
    
    @property
    def has_errors(self) -> bool:
        return any(v.severity == "error" for v in self.violations)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_compliant": self.is_compliant,
            "risk_score": self.risk_score,
            "violation_count": len(self.violations),
            "has_critical": self.has_critical,
            "violations": [
                {
                    "type": v.type.value,
                    "severity": v.severity,
                    "matched_text": v.matched_text,
                    "explanation": v.explanation,
                    "suggestion": v.suggestion,
                }
                for v in self.violations
            ],
        }

# =============================================================================
# COMPLIANCE RULES
# =============================================================================

COMPLIANCE_RULES: Dict[str, Dict[str, Any]] = {
    
    # =========================================================================
    # HWG - Heilmittelwerbegesetz (KRITISCH für doTERRA, Zinzino etc.)
    # =========================================================================
    "hwg_heal": {
        "type": ViolationType.HWG,
        "severity": "critical",
        "patterns": [
            r"\bheilt?\b",
            r"\bheilung\b",
            r"\bgeheilt\b",
        ],
        "explanation": "Heilversprechen sind nach HWG verboten für nicht zugelassene Arzneimittel.",
        "suggestion": "Verwende stattdessen: 'unterstützt das Wohlbefinden' oder 'kann zur Entspannung beitragen'",
    },
    
    "hwg_against": {
        "type": ViolationType.HWG,
        "severity": "critical",
        "patterns": [
            r"hilft\s+(gegen|bei)\s+\w+",
            r"wirkt\s+(gegen|bei)\s+\w+",
            r"bekämpft\s+\w+",
        ],
        "explanation": "Wirkversprechen gegen Krankheiten/Symptome sind nach HWG verboten.",
        "suggestion": "Beschreibe das Produkt ohne Bezug zu Krankheiten: 'hat einen beruhigenden Duft'",
    },
    
    "hwg_anti": {
        "type": ViolationType.HWG,
        "severity": "critical",
        "patterns": [
            r"\banti[-\s]?(viral|bakteriell|biotisch|septisch|mykotisch)\b",
            r"\bantibiotika\b",
            r"\bdesinfizier\w+\b",
        ],
        "explanation": "Medizinische Wirkbehauptungen (antiviral etc.) sind nach HWG verboten.",
        "suggestion": "Vermeide medizinische Begriffe. Nutze: 'reinigend' oder 'erfrischend'",
    },
    
    "hwg_diseases": {
        "type": ViolationType.HWG,
        "severity": "error",
        "patterns": [
            r"\b(krebs|tumor|diabetes|alzheimer|parkinson|depression|angst|panik)\b",
            r"\b(migräne|arthritis|rheuma|asthma|epilepsie|ms|multiple\s*sklerose)\b",
            r"\b(grippe|erkältung|corona|covid|infektion|entzündung)\b",
        ],
        "explanation": "Nennung von Krankheiten im Zusammenhang mit Produktwirkung verstößt gegen HWG.",
        "suggestion": "Nenne keine spezifischen Krankheiten. Fokussiere auf allgemeines Wohlbefinden.",
    },
    
    "hwg_medicine_replacement": {
        "type": ViolationType.HWG,
        "severity": "critical",
        "patterns": [
            r"(statt|anstatt|ersetzt?|alternative\s+zu)\s+(medikament|arzt|antibiotika|tablette)",
            r"natürliche\s+(medizin|heilmittel|arznei)",
            r"pflanzliche\s+medizin",
        ],
        "explanation": "Produkte dürfen nicht als Medikamenten-Ersatz beworben werden.",
        "suggestion": "Betone, dass das Produkt kein Ersatz für ärztliche Behandlung ist.",
    },
    
    # =========================================================================
    # UWG - Unlauterer Wettbewerb (Einkommens- und Erfolgsversprechen)
    # =========================================================================
    "uwg_guaranteed_income": {
        "type": ViolationType.UWG,
        "severity": "critical",
        "patterns": [
            r"garantiert\s+\d+\s*[€$]",
            r"verdien(st|en)\s+garantiert",
            r"sicher(es?)?\s+einkommen",
            r"\d+\s*[€$]\s+(garantiert|sicher|versprochen)",
        ],
        "explanation": "Einkommensgarantien sind nach UWG verboten.",
        "suggestion": "Nutze: 'Einkommensmöglichkeiten' oder 'Verdienstpotenzial' ohne Garantien.",
    },
    
    "uwg_get_rich_quick": {
        "type": ViolationType.UWG,
        "severity": "error",
        "patterns": [
            r"schnell\s+reich",
            r"über\s*nacht\s+(reich|verdien)",
            r"mühe?los(es?)?\s+(geld|einkommen|verdien)",
            r"passives?\s+einkommen\s+ohne\s+arbeit",
            r"geld\s+im\s+schlaf",
        ],
        "explanation": "Schnell-Reich-Versprechen sind irreführend und nach UWG verboten.",
        "suggestion": "Sei ehrlich: 'Erfolg erfordert Arbeit und Zeit'",
    },
    
    "uwg_false_claims": {
        "type": ViolationType.UWG,
        "severity": "error",
        "patterns": [
            r"(beste|einzige|führende)\s+(produkt|lösung|system)\s+(der|am)\s+markt",
            r"100\s*%\s*(erfolg|wirkung|zufriedenheit)",
            r"wissenschaftlich\s+bewiesen",  # Ohne Quellenangabe
            r"klinisch\s+getestet",  # Ohne Quellenangabe
        ],
        "explanation": "Superlative und unbelegte Behauptungen können irreführend sein.",
        "suggestion": "Belege Behauptungen mit Quellen oder formuliere vorsichtiger.",
    },
    
    # =========================================================================
    # MLM-spezifische Compliance
    # =========================================================================
    "mlm_pyramid_language": {
        "type": ViolationType.MLM,
        "severity": "warning",
        "patterns": [
            r"(früh|rechtzeitig)\s+einsteigen",
            r"(ground\s*floor|von\s+anfang\s+an)",
            r"position\s+sichern",
        ],
        "explanation": "Diese Sprache kann als Pyramidensystem-Werbung interpretiert werden.",
        "suggestion": "Fokussiere auf Produktwert, nicht auf Timing des Einstiegs.",
    },
    
    "mlm_recruitment_pressure": {
        "type": ViolationType.MLM,
        "severity": "warning",
        "patterns": [
            r"(letzte|einmalige)\s+chance",
            r"nur\s+noch\s+(heute|\d+\s+tage)",
            r"jetzt\s+oder\s+nie",
            r"(deadline|frist)\s+(läuft|endet)",
        ],
        "explanation": "Zeitdruck bei der Rekrutierung kann als unseriös wahrgenommen werden.",
        "suggestion": "Vermeide künstlichen Zeitdruck. Das Angebot sollte für sich sprechen.",
    },
    
    # =========================================================================
    # DSGVO - Datenschutz
    # =========================================================================
    "dsgvo_personal_data": {
        "type": ViolationType.DSGVO,
        "severity": "warning",
        "patterns": [
            r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+(hat|kaufte|bestellte|verdient)",  # Name + Aktion
            r"mein\s+(kunde|partner|kontakt)\s+[A-Z][a-z]+",
        ],
        "explanation": "Personenbezogene Daten Dritter sollten nicht ohne Einwilligung geteilt werden.",
        "suggestion": "Anonymisiere Beispiele oder hole Einwilligung ein.",
    },
    
    # =========================================================================
    # Einkommensversprechen (Income Claims)
    # =========================================================================
    "income_specific_amounts": {
        "type": ViolationType.INCOME,
        "severity": "error",
        "patterns": [
            r"ich\s+verdien\w*\s+\d+[\.,]?\d*\s*[€$k]",
            r"\d+[\.,]?\d*\s*[€$]\s+(pro|im|jeden)\s+(monat|woche|tag)",
            r"monatlich\s+\d+[\.,]?\d*\s*[€$k]",
        ],
        "explanation": "Konkrete Einkommensbeträge können als Versprechen interpretiert werden.",
        "suggestion": "Nutze Disclaimer: 'Individuelles Ergebnis, abhängig von persönlichem Einsatz'",
    },
}

# =============================================================================
# COMPANY-SPECIFIC RULES
# =============================================================================

COMPANY_SPECIFIC_RULES: Dict[str, List[str]] = {
    "doterra": [
        "hwg_heal", "hwg_against", "hwg_anti", "hwg_diseases", 
        "hwg_medicine_replacement", "mlm_pyramid_language",
    ],
    "zinzino": [
        "hwg_heal", "hwg_against", "hwg_diseases",
        "mlm_pyramid_language", "income_specific_amounts",
    ],
    "pm-international": [
        "hwg_heal", "hwg_against", "hwg_diseases",
        "mlm_pyramid_language", "income_specific_amounts",
    ],
    "herbalife": [
        "hwg_heal", "hwg_against", "hwg_diseases",
        "mlm_pyramid_language", "uwg_get_rich_quick", "income_specific_amounts",
    ],
}

# =============================================================================
# COMPLIANT ALTERNATIVES DATABASE
# =============================================================================

COMPLIANT_ALTERNATIVES: Dict[str, str] = {
    # HWG-konforme Alternativen
    "heilt": "unterstützt das Wohlbefinden",
    "hilft gegen": "kann hilfreich sein bei",
    "wirkt gegen": "wird traditionell verwendet bei",
    "antiviral": "reinigend",
    "antibakteriell": "erfrischend",
    "bekämpft": "unterstützt",
    "statt Medikamente": "als Ergänzung (nicht als Ersatz für ärztliche Behandlung)",
    "natürliche Medizin": "natürliche Wellness-Produkte",
    
    # UWG-konforme Alternativen
    "garantiert verdienen": "Verdienstmöglichkeit",
    "schnell reich": "Einkommenspotenzial bei entsprechendem Einsatz",
    "passives Einkommen ohne Arbeit": "Möglichkeit für zusätzliches Einkommen",
    "100% Erfolg": "hohe Zufriedenheit bei vielen Kunden",
    
    # MLM-konforme Alternativen
    "früh einsteigen": "Teil unserer Community werden",
    "Position sichern": "dein Business aufbauen",
    "letzte Chance": "aktuelle Möglichkeit",
}

# =============================================================================
# COMPLIANCE SENTINEL CLASS
# =============================================================================

class ComplianceSentinel:
    """
    Hauptklasse für Compliance-Prüfungen
    
    Usage:
        sentinel = ComplianceSentinel(company="doterra")
        result = sentinel.check("Dieses Öl heilt Krebs!")
    """
    
    def __init__(self, company: Optional[str] = None, strict_mode: bool = False):
        """
        Args:
            company: MLM-Unternehmen für spezifische Regeln
            strict_mode: Wenn True, werden auch Warnings als Fehler behandelt
        """
        self.company = company
        self.strict_mode = strict_mode
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Kompiliert Regex-Patterns für Performance"""
        self._compiled_rules = {}
        for rule_id, rule in COMPLIANCE_RULES.items():
            self._compiled_rules[rule_id] = {
                **rule,
                "compiled_patterns": [
                    re.compile(p, re.IGNORECASE) for p in rule["patterns"]
                ]
            }
    
    def check(self, text: str) -> ComplianceResult:
        """
        Prüft Text auf Compliance-Verstöße
        
        Args:
            text: Zu prüfender Text
            
        Returns:
            ComplianceResult mit allen gefundenen Verstößen
        """
        if not text or not text.strip():
            return ComplianceResult(is_compliant=True, checked_text=text)
        
        violations: List[Violation] = []
        
        # Bestimme welche Regeln anzuwenden sind
        rules_to_check = self._get_applicable_rules()
        
        # Prüfe jede Regel
        for rule_id in rules_to_check:
            rule = self._compiled_rules.get(rule_id)
            if not rule:
                continue
            
            for pattern in rule["compiled_patterns"]:
                matches = pattern.finditer(text)
                for match in matches:
                    violation = Violation(
                        type=rule["type"],
                        severity=rule["severity"],
                        matched_text=match.group(),
                        rule_id=rule_id,
                        explanation=rule["explanation"],
                        suggestion=rule.get("suggestion"),
                    )
                    violations.append(violation)
        
        # Berechne Risk Score
        risk_score = self._calculate_risk_score(violations)
        
        # Bestimme Compliance-Status
        if self.strict_mode:
            is_compliant = len(violations) == 0
        else:
            is_compliant = not any(
                v.severity in ("critical", "error") for v in violations
            )
        
        return ComplianceResult(
            is_compliant=is_compliant,
            violations=violations,
            risk_score=risk_score,
            checked_text=text,
            company=self.company,
        )
    
    def _get_applicable_rules(self) -> List[str]:
        """Gibt Liste der anzuwendenden Regel-IDs zurück"""
        if self.company and self.company in COMPANY_SPECIFIC_RULES:
            # Company-spezifische Regeln + allgemeine
            company_rules = COMPANY_SPECIFIC_RULES[self.company]
            general_rules = ["uwg_guaranteed_income", "uwg_get_rich_quick", 
                          "dsgvo_personal_data", "income_specific_amounts"]
            return list(set(company_rules + general_rules))
        else:
            # Alle Regeln
            return list(COMPLIANCE_RULES.keys())
    
    def _calculate_risk_score(self, violations: List[Violation]) -> float:
        """Berechnet Risk Score (0-100)"""
        if not violations:
            return 0.0
        
        severity_weights = {
            "critical": 40,
            "error": 25,
            "warning": 10,
        }
        
        total_score = sum(
            severity_weights.get(v.severity, 5) for v in violations
        )
        
        return min(100.0, total_score)
    
    def suggest_alternatives(self, text: str) -> str:
        """
        Schlägt compliant-Alternativen für Text vor
        
        Args:
            text: Originaltext
            
        Returns:
            Text mit Ersetzungsvorschlägen
        """
        result = text
        for original, replacement in COMPLIANT_ALTERNATIVES.items():
            pattern = re.compile(re.escape(original), re.IGNORECASE)
            result = pattern.sub(f"[{replacement}]", result)
        return result
    
    def get_quick_fix(self, violation: Violation) -> Optional[str]:
        """Gibt Quick-Fix für einen Verstoß zurück"""
        return violation.suggestion

# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def check_message(text: str, company: Optional[str] = None) -> ComplianceResult:
    """
    Quick-Check für eine Nachricht
    
    Usage:
        result = check_message("Dieses Öl heilt Krebs!", company="doterra")
    """
    sentinel = ComplianceSentinel(company=company)
    return sentinel.check(text)

def is_compliant(text: str, company: Optional[str] = None) -> bool:
    """
    Einfacher Compliant/Nicht-Compliant Check
    
    Usage:
        if is_compliant(message_text):
            send_message()
    """
    return check_message(text, company).is_compliant

def get_violations_summary(result: ComplianceResult) -> str:
    """Gibt lesbare Zusammenfassung der Verstöße zurück"""
    if result.is_compliant:
        return "✅ Keine Compliance-Verstöße gefunden."
    
    lines = [f"⚠️ {len(result.violations)} Compliance-Verstoß(e) gefunden:"]
    
    for i, v in enumerate(result.violations, 1):
        severity_icon = {"critical": "🔴", "error": "🟠", "warning": "🟡"}.get(v.severity, "⚪")
        lines.append(f"\n{i}. {severity_icon} [{v.type.value.upper()}] {v.severity.upper()}")
        lines.append(f"   Gefunden: \"{v.matched_text}\"")
        lines.append(f"   Problem: {v.explanation}")
        if v.suggestion:
            lines.append(f"   💡 Vorschlag: {v.suggestion}")
    
    return "\n".join(lines)

# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    "ComplianceSentinel",
    "ComplianceResult",
    "Violation",
    "ViolationType",
    "check_message",
    "is_compliant",
    "get_violations_summary",
    "COMPLIANCE_RULES",
    "COMPANY_SPECIFIC_RULES",
    "COMPLIANT_ALTERNATIVES",
]

