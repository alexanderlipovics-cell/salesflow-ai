"""
SalesFlow AI - MENTOR Knowledge System
=======================================
Company-spezifische Coaching-Logik für MLM-Unternehmen

Enthält:
- Company Profiles (Strategie, Stärken, Schwächen)
- Coaching Guidance (was MENTOR empfehlen soll)
- DACH Compliance Rules
- Winning Phrases Templates
- Common Objections & Responses
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# COMPANY KNOWLEDGE PROFILES
# =============================================================================

COMPANY_KNOWLEDGE = {
    
    # =========================================================================
    # DOTERRA
    # =========================================================================
    "doterra": {
        "meta": {
            "name": "doTERRA",
            "founded": 2008,
            "headquarters": "Pleasant Grove, Utah, USA",
            "annual_revenue": "2+ Milliarden USD (2024)",
            "retention_rate": 0.70,  # 70% - Branchenbester!
            "markets": "155+ Länder",
        },
        
        "compensation_type": "unilevel_with_compression",
        
        "key_insights": [
            "Tiefe > Breite: 7% auf Level 7, nur 2% auf Level 1",
            "Dynamische Kompression schützt vor Inaktivität",
            "70% Retention Rate = stabiles Einkommen",
            "92% der US-Einschreibungen sind reine Endkunden",
            "Power of 3 Boost belohnt Neukunden-Gewinnung",
        ],
        
        "strategic_focus": {
            "primary": "Retention-First - bestehende Kunden halten",
            "secondary": "Tiefe Strukturen aufbauen (nicht breit)",
            "avoid": "Schnelle Breiten-Rekrutierung ohne Tiefe",
        },
        
        "rank_progression_tips": {
            "to_elite": "15-20 aktive Nutzer aufbauen",
            "to_silver": "3 Elite-Beine entwickeln (je 3.000 OV)",
            "to_diamond": "4 Silver-Beine + Mentoring-Fokus",
        },
        
        "coaching_guidance": {
            "new_partner": [
                "Erst eigene Produkterfahrung sammeln (LRP aufsetzen)",
                "Familie & Freunde als erste Kunden",
                "3 Partner für Power of 3 Level 1 finden",
                "NICHT: Sofort rekrutieren ohne eigene Erfahrung",
            ],
            "building_partner": [
                "Tiefe vor Breite: Hilf deinen Partnern, ihre 3 zu finden",
                "LRP-Compliance aller Partner sicherstellen",
                "Elite als Zwischenziel (stabiles Fundament)",
                "Power of 3 Boost durch PGV aktivieren",
            ],
            "leader": [
                "Leg-Qualifikation im Blick behalten",
                "Events nutzen (Summer Academy, Convention)",
                "Founders Club 2.0 als Zusatz-Incentive",
                "Duplikation lehren, nicht selbst alles machen",
            ],
        },
        
        "dach_compliance": {
            "critical_rules": [
                "KEINE Health Claims (HWG verbietet das)",
                "KEINE Krankheitsnamen nennen",
                "KEINE Heilversprechen",
                "NUR: Wellness, Lifestyle, Wohlbefinden",
            ],
            "allowed_claims": [
                "kosmetische Claims (klärendes Hautbild)",
                "emotionale Claims (stimmungsaufhellend, erdend)",
                "Duft-Beschreibungen",
                "Anwendungstipps (Diffuser, Massage)",
            ],
            "forbidden_phrases": [
                "hilft gegen [Krankheit]",
                "heilt [Symptom]",
                "wirkt antiviral/antibakteriell",
                "statt Antibiotika",
                "natürliche Medizin",
            ],
            "ai_content_warning": (
                "doTERRA scannt Social Media mit AI auf Verstöße. "
                "Bei HWG-Verstoß droht Abmahnung bis Account-Kündigung."
            ),
        },
        
        "objection_responses": {
            "zu_teuer": {
                "response": (
                    "Verstehe ich. Schau mal: Ein Fläschchen Lavendel hat ~250 Tropfen. "
                    "Bei 1-2 Tropfen pro Anwendung kommst du auf 3-6 Monate. "
                    "Das sind dann ~10 Cent pro Anwendung für Premiumqualität."
                ),
                "focus": "Value per use, nicht Gesamtpreis",
            },
            "mlm_skeptisch": {
                "response": (
                    "Total verständlich, da gibt's viel Schrott. Was doTERRA anders macht: "
                    "92% unserer Mitglieder sind reine Kunden, die nur die Produkte wollen. "
                    "Du kannst auch einfach nur Kunde sein ohne Business."
                ),
                "focus": "Keine Verpflichtung zum Business",
            },
            "gibt_es_billiger": {
                "response": (
                    "Ja, es gibt günstigere Öle. Der Unterschied: doTERRA testet jede Charge "
                    "mit CPTG (Certified Pure Tested Grade). Bei den meisten günstigen Ölen "
                    "sind Füllstoffe oder synthetische Zusätze drin."
                ),
                "focus": "Qualität und Reinheit",
            },
        },
        
        "winning_phrases": {
            "opener": [
                "Kennst du ätherische Öle oder hast du schon mal was damit gemacht?",
                "Ich hab da was entdeckt, das mir bei [Thema] echt geholfen hat...",
            ],
            "follow_up": [
                "Wie war dein erstes Erlebnis mit dem Öl?",
                "Hast du schon eine Lieblingsanwendung gefunden?",
            ],
            "close": [
                "Soll ich dir ein Starterset zusammenstellen?",
                "Magst du erstmal als Kunde starten oder interessiert dich auch das Business?",
            ],
        },
        
        "mentor_personality": {
            "tone": "warmherzig, product-lover, nicht pushy",
            "focus": "Produkterfahrung vor Business",
            "avoid": "aggressive Rekrutierung, Einkommensversprechen",
        },
    },
    
    # =========================================================================
    # HERBALIFE
    # =========================================================================
    "herbalife": {
        "meta": {
            "name": "Herbalife",
            "founded": 1980,
            "headquarters": "Los Angeles, California, USA",
            "annual_revenue": "~5 Milliarden USD (2024)",
            "stock": "NYSE: HLF",
            "markets": "90+ Länder",
        },
        
        "compensation_type": "breakaway",
        
        "key_insights": [
            "Breite > Tiefe: Royalty nur auf 3 Ebenen",
            "Supervisor-Status ist das kritische Nadelöhr",
            "Jährliche Re-Qualifikation PFLICHT (Downline-Verlust möglich!)",
            "50% Retail-Marge = sofortiges Einkommen möglich",
            "GLP-1 Medikamente disruptieren den Diätmarkt",
        ],
        
        "strategic_focus": {
            "primary": "Breite Strukturen aufbauen (First-Lines)",
            "secondary": "Supervisor schnell erreichen und HALTEN",
            "avoid": "Tiefe ohne Breite (Einkommen endet bei Level 3)",
        },
        
        "gpl1_pivot": {
            "context": (
                "GLP-1 Medikamente (Wegovy, Ozempic) haben 2024 ca. 2 Mrd. USD "
                "aus dem Diätmarkt abgezogen. Kunden wählen Spritzen statt Shakes."
            ),
            "new_positioning": "Companion Nutrition für GLP-1 Nutzer",
            "key_message": (
                "GLP-1 verursacht oft Muskelabbau. Unsere proteinreichen Shakes "
                "helfen, die Muskelmasse während der Therapie zu erhalten."
            ),
            "coaching_adjustment": [
                "NICHT: 'Abnehmen mit Shakes' pushen",
                "SONDERN: 'Optimale Ernährung während deiner Gewichtsreise'",
                "Fokus auf Protein und Mikronährstoffe",
            ],
        },
        
        "supervisor_guidance": {
            "importance": (
                "Supervisor ist DER kritische Rang. Ohne Supervisor: "
                "- Keine Royalty Overrides\n"
                "- Nur 42% statt 50% Rabatt\n"
                "- Kein passives Einkommen möglich"
            ),
            "qualification_paths": {
                "fast": "4.000 VP in einem Monat (1.000 unbelastet)",
                "steady": "2.500 VP × 2 Monate",
                "slow": "4.000 VP in 12 Monaten (2.000 PPV)",
            },
            "requalification_warning": (
                "⚠️ KRITISCH: Jedes Jahr bis 31. Januar neu qualifizieren! "
                "Bei Versäumnis: Rückstufung + VERLUST DER KOMPLETTEN DOWNLINE "
                "an die nächste Upline. Das ist DAUERHAFT."
            ),
        },
        
        "coaching_guidance": {
            "new_partner": [
                "Sofort Produkterfahrung sammeln (selbst nutzen)",
                "10 Retail-Kunden als erstes Ziel (Compliance!)",
                "Supervisor-Qualifikation planen (welcher Weg?)",
                "70% Rule verstehen (nicht nur kaufen, auch VERKAUFEN)",
            ],
            "building_partner": [
                "Breite bauen: Neue First-Lines rekrutieren",
                "Retail-Kunden-Basis pflegen (10 Minimum!)",
                "Auf Re-Qualifikation achten (Countdown!)",
                "TAB Team als nächstes Ziel (GET Team = 1.000 RO)",
            ],
            "leader": [
                "Downline-Supervisors zum Erfolg führen",
                "Royalty auf 3 Ebenen maximieren (2.500 TV!)",
                "Production Bonus durch TAB Team freischalten",
                "Compliance-Kultur im Team etablieren",
            ],
        },
        
        "dach_compliance": {
            "nutrition_club_rules": [
                "KEINE Außenwerbung (blickdichte Fenster!)",
                "NUR auf persönliche Einladung (Tür verschlossen)",
                "Mitgliedschaftsmodell, KEIN direkter Verkauf",
                "Darf NICHT wie Einzelhandel aussehen",
            ],
            "legal_risk": (
                "Nutrition Clubs in DE bewegen sich in rechtlicher Grauzone. "
                "Gaststättengesetz und Gewerbeordnung können greifen. "
                "Betrieb als 'geschlossener Club' mit Vorsicht."
            ),
            "gold_standard_guarantee": [
                "100% Rückerstattung auf ungeöffnete Produkte (12 Monate)",
                "Keine Mindestkäufe",
                "Transparente Verdienstoffenlegung",
            ],
        },
        
        "objection_responses": {
            "zu_teuer": {
                "response": (
                    "Pro Shake kostet das etwa 2-3€. Vergleich das mal mit einem "
                    "Frühstück auswärts oder einem Snack am Kiosk. "
                    "Und du bekommst alle Nährstoffe, die du brauchst."
                ),
                "focus": "Preis pro Mahlzeit",
            },
            "mlm_skeptisch": {
                "response": (
                    "Verstehe ich. Herbalife hat die 'Gold Standard Guarantee': "
                    "100% Rückerstattung wenn's nicht passt, keine Mindestkäufe. "
                    "Du kannst auch einfach nur Kunde sein."
                ),
                "focus": "Risikofreier Einstieg",
            },
            "ozempic_besser": {
                "response": (
                    "GLP-1 Medikamente funktionieren, ja. Was viele nicht wissen: "
                    "Sie können zu Muskelabbau führen. Unsere Shakes sind perfekt "
                    "als Begleitung, um deine Muskeln zu erhalten und dich "
                    "mit allen Nährstoffen zu versorgen."
                ),
                "focus": "Companion Nutrition, nicht Konkurrenz",
            },
        },
        
        "winning_phrases": {
            "opener": [
                "Wie ernährst du dich so im Alltag?",
                "Hast du schon mal was von personalisierten Ernährungsplänen gehört?",
            ],
            "follow_up": [
                "Wie geht's dir mit dem Shake? Merkst du schon was?",
                "Hast du dich an den Geschmack gewöhnt?",
            ],
            "close": [
                "Soll ich dir ein Starter-Paket zusammenstellen?",
                "Willst du erstmal als Kunde starten oder auch was verdienen?",
            ],
        },
        
        "alerts_config": {
            "requalification": {
                "days_before": [90, 60, 30, 14, 7, 3, 1],
                "severity_map": {
                    90: "info",
                    60: "info",
                    30: "warning",
                    14: "high",
                    7: "critical",
                    3: "critical",
                    1: "critical",
                },
            },
            "retail_compliance": {
                "threshold": 10,
                "check_frequency": "weekly",
            },
        },
        
        "mentor_personality": {
            "tone": "business-fokussiert, strukturiert, direkt",
            "focus": "Supervisor erreichen und halten",
            "avoid": "GLP-1 schlecht reden, unrealistische Einkommensversprechen",
        },
    },
}


# =============================================================================
# MENTOR PROMPT ADDITIONS
# =============================================================================

def get_company_context(company_id: str) -> str:
    """Generiert Company-Kontext für MENTOR Prompt"""
    
    knowledge = COMPANY_KNOWLEDGE.get(company_id)
    if not knowledge:
        return ""
    
    context = f"""
## COMPANY KNOWLEDGE: {knowledge['meta']['name']}

### Schlüssel-Insights:
{chr(10).join('- ' + i for i in knowledge['key_insights'])}

### Strategischer Fokus:
- Primär: {knowledge['strategic_focus']['primary']}
- Sekundär: {knowledge['strategic_focus']['secondary']}
- Vermeide: {knowledge['strategic_focus']['avoid']}

### DACH Compliance:
{chr(10).join('- ' + r for r in knowledge['dach_compliance']['critical_rules'])}

### Coaching-Persönlichkeit:
- Ton: {knowledge['mentor_personality']['tone']}
- Fokus: {knowledge['mentor_personality']['focus']}
- Vermeide: {knowledge['mentor_personality']['avoid']}
"""
    
    # Company-spezifische Zusätze
    if company_id == "herbalife":
        context += f"""
### ⚠️ KRITISCH - Re-Qualifikation:
{knowledge['supervisor_guidance']['requalification_warning']}

### GLP-1 Pivot:
{knowledge['gpl1_pivot']['key_message']}
"""
    
    if company_id == "doterra":
        context += f"""
### HWG-Warnung:
{knowledge['dach_compliance']['ai_content_warning']}

### Verbotene Phrasen:
{chr(10).join('- "' + p + '"' for p in knowledge['dach_compliance']['forbidden_phrases'])}
"""
    
    return context


def get_coaching_tips(company_id: str, partner_stage: str) -> List[str]:
    """Gibt Coaching-Tipps basierend auf Partner-Stage zurück"""
    
    knowledge = COMPANY_KNOWLEDGE.get(company_id)
    if not knowledge:
        return []
    
    stage_map = {
        "new": "new_partner",
        "building": "building_partner",
        "leader": "leader",
    }
    
    stage_key = stage_map.get(partner_stage, "new_partner")
    return knowledge.get("coaching_guidance", {}).get(stage_key, [])


def get_objection_response(company_id: str, objection_key: str) -> Optional[Dict[str, str]]:
    """Gibt Einwandbehandlung für ein Unternehmen zurück"""
    
    knowledge = COMPANY_KNOWLEDGE.get(company_id)
    if not knowledge:
        return None
    
    return knowledge.get("objection_responses", {}).get(objection_key)


def get_winning_phrases(company_id: str, phase: str) -> List[str]:
    """Gibt Winning Phrases für eine Phase zurück"""
    
    knowledge = COMPANY_KNOWLEDGE.get(company_id)
    if not knowledge:
        return []
    
    return knowledge.get("winning_phrases", {}).get(phase, [])


# =============================================================================
# MENTOR SYSTEM PROMPT INJECTION
# =============================================================================

def build_mentor_system_prompt_addition(
    company_id: str,
    partner_stage: str = "new",
    include_objections: bool = True,
    include_compliance: bool = True,
) -> str:
    """
    Baut Zusatz für MENTOR System Prompt basierend auf Company
    
    Args:
        company_id: MLM Company ID
        partner_stage: new, building, leader
        include_objections: Einwandbehandlung einbeziehen
        include_compliance: Compliance-Regeln einbeziehen
        
    Returns:
        String für System Prompt
    """
    
    knowledge = COMPANY_KNOWLEDGE.get(company_id)
    if not knowledge:
        return ""
    
    sections = []
    
    # Company Context
    sections.append(get_company_context(company_id))
    
    # Stage-spezifische Tipps
    tips = get_coaching_tips(company_id, partner_stage)
    if tips:
        sections.append(f"""
### Coaching-Tipps für diese Phase ({partner_stage}):
{chr(10).join('- ' + t for t in tips)}
""")
    
    # Winning Phrases
    for phase in ["opener", "follow_up", "close"]:
        phrases = get_winning_phrases(company_id, phase)
        if phrases:
            sections.append(f"""
### Beispiel-Phrasen ({phase}):
{chr(10).join('- "' + p + '"' for p in phrases)}
""")
    
    return "\n".join(sections)


# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    "COMPANY_KNOWLEDGE",
    "get_company_context",
    "get_coaching_tips",
    "get_objection_response",
    "get_winning_phrases",
    "build_mentor_system_prompt_addition",
]
