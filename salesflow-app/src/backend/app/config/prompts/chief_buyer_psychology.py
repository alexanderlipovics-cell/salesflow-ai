"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF BUYER PSYCHOLOGY MODULE v3.0                                        ║
║  Tiefe Käuferpsychologie für maximale Conversion                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul ermöglicht:
- DISC-basierte Persönlichkeitserkennung
- Buying Stage Detection
- Risk Profile Assessment
- Decision Authority Mapping
- Psychologisch optimierte Kommunikation
"""

from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass
import json

# =============================================================================
# BUYER TYPES (DISC MODEL ADAPTED FOR SALES)
# =============================================================================

BuyerType = Literal["analytical", "driver", "expressive", "amiable"]
BuyingStage = Literal["awareness", "consideration", "decision", "validation"]
RiskProfile = Literal["risk_averse", "risk_neutral", "risk_taker"]
AuthorityLevel = Literal["decision_maker", "influencer", "gatekeeper", "champion", "user"]


@dataclass
class BuyerProfile:
    """Vollständiges Käuferprofil"""
    buyer_type: BuyerType
    buying_stage: BuyingStage
    risk_profile: RiskProfile
    authority_level: AuthorityLevel
    primary_motivation: str
    communication_preference: str
    decision_speed: str
    objection_style: str
    trust_triggers: List[str]
    red_flags: List[str]


# =============================================================================
# BUYER TYPE CHARACTERISTICS
# =============================================================================

BUYER_TYPE_PROFILES = {
    "analytical": {
        "name": "Der Analytiker",
        "emoji": "🧮",
        "characteristics": [
            "Braucht Daten, Fakten, Beweise",
            "Recherchiert ausgiebig vor Entscheidung",
            "Stellt viele detaillierte Fragen",
            "Vermeidet Risiko, plant voraus",
            "Entscheidet langsam aber gründlich",
        ],
        "communication_style": {
            "do": [
                "Zahlen und Statistiken liefern",
                "Vergleiche und Benchmarks anbieten",
                "Detaillierte Dokumentation bereitstellen",
                "Logisch argumentieren, nicht emotional",
                "Zeit zum Nachdenken geben",
                "Quellen und Studien zitieren",
            ],
            "dont": [
                "Druck machen oder Urgency erzeugen",
                "Emotionale Appelle verwenden",
                "Zu schnell zum Abschluss drängen",
                "Behauptungen ohne Belege aufstellen",
                "Smalltalk erzwingen",
            ],
        },
        "ideal_pitch": "Daten-zuerst, ROI-Kalkulation, Fallstudien, Risikoanalyse",
        "objection_handling": "Mit Fakten kontern, Studien zitieren, Vergleichstabellen",
        "closing_approach": "Strukturierter Prozess, Pro/Contra-Liste, Trial anbieten",
        "typical_questions": [
            "Gibt es dazu Studien?",
            "Wie ist die genaue Zusammensetzung?",
            "Welche Garantien gibt es?",
            "Kann ich das irgendwo nachlesen?",
        ],
    },
    
    "driver": {
        "name": "Der Macher",
        "emoji": "🎯",
        "characteristics": [
            "Will schnelle Ergebnisse",
            "Entscheidet zügig und selbstbewusst",
            "Fokussiert auf Bottom Line / ROI",
            "Mag keine langen Erklärungen",
            "Will Kontrolle über den Prozess",
        ],
        "communication_style": {
            "do": [
                "Direkt auf den Punkt kommen",
                "Ergebnisse und Resultate fokussieren",
                "Optionen mit klaren Vorteilen präsentieren",
                "Schnell antworten, keine Verzögerungen",
                "Autonomie respektieren",
                "Kompetenz und Stärke zeigen",
            ],
            "dont": [
                "Zu viele Details auf einmal",
                "Zögern oder unsicher wirken",
                "Zu viel Smalltalk",
                "Lange E-Mails oder Nachrichten",
                "Entscheidungen abnehmen wollen",
            ],
        },
        "ideal_pitch": "Kurz, knackig, Ergebnis im ersten Satz, klarer ROI",
        "objection_handling": "Direkt adressieren, Lösung präsentieren, weitermachen",
        "closing_approach": "Direkte Frage: 'Machen wir's?', klare Optionen A/B",
        "typical_questions": [
            "Was bringt mir das konkret?",
            "Was kostet es und was spare ich?",
            "Wie schnell kann ich starten?",
            "Was ist der nächste Schritt?",
        ],
    },
    
    "expressive": {
        "name": "Der Visionär",
        "emoji": "✨",
        "characteristics": [
            "Reagiert auf Emotionen und Visionen",
            "Liebt Storytelling und Inspiration",
            "Entscheidet oft aus dem Bauch",
            "Braucht Begeisterung und Energie",
            "Teilt gerne und will Teil von etwas sein",
        ],
        "communication_style": {
            "do": [
                "Geschichten und Erfolgsbeispiele erzählen",
                "Vision und Möglichkeiten malen",
                "Emotionale Benefits betonen",
                "Begeisterung zeigen",
                "Gemeinschaft und Zugehörigkeit betonen",
                "Kreativ und inspirierend kommunizieren",
            ],
            "dont": [
                "Zu trocken und faktisch sein",
                "Lange Datenkolonnen präsentieren",
                "Skeptisch oder zurückhaltend wirken",
                "Nur rationale Argumente bringen",
                "Begeisterung dämpfen",
            ],
        },
        "ideal_pitch": "Story first, Vision malen, 'Stell dir vor...', Testimonials",
        "objection_handling": "Empathie zeigen, Story erzählen, Social Proof",
        "closing_approach": "'Bist du dabei?', Gemeinschaftsgefühl, exklusiver Zugang",
        "typical_questions": [
            "Wer macht das noch?",
            "Was ist die Geschichte dahinter?",
            "Wie fühlt sich das an?",
            "Kann ich das meinen Freunden zeigen?",
        ],
    },
    
    "amiable": {
        "name": "Der Beziehungsmensch",
        "emoji": "🤝",
        "characteristics": [
            "Beziehung ist wichtiger als Produkt",
            "Braucht Vertrauen vor Entscheidung",
            "Vermeidet Konflikte",
            "Fragt andere um Rat",
            "Entscheidet langsam, will Sicherheit",
        ],
        "communication_style": {
            "do": [
                "Beziehung aufbauen vor Geschäft",
                "Empathie und Verständnis zeigen",
                "Sich Zeit nehmen, nicht hetzen",
                "Sicherheit und Unterstützung betonen",
                "Referenzen und Empfehlungen geben",
                "Geduldig sein, zuhören",
            ],
            "dont": [
                "Druck machen oder fordern",
                "Zu schnell zum Geschäft kommen",
                "Konfrontativ sein",
                "Ungeduld zeigen",
                "Nur über Produkt reden",
            ],
        },
        "ideal_pitch": "Beziehung first, Vertrauen aufbauen, Sicherheit, Unterstützung",
        "objection_handling": "Verständnis zeigen, Zeit geben, Unterstützung anbieten",
        "closing_approach": "Sanft, kein Druck, 'Wenn du bereit bist...', Trial/Garantie",
        "typical_questions": [
            "Was sagen andere darüber?",
            "Wer hilft mir wenn ich Fragen habe?",
            "Kann ich mir das nochmal überlegen?",
            "Was passiert wenn es nicht klappt?",
        ],
    },
}


# =============================================================================
# BUYING STAGE DEFINITIONS
# =============================================================================

BUYING_STAGES = {
    "awareness": {
        "name": "Awareness (Problem erkannt)",
        "description": "Lead weiß noch nicht, dass er ein Problem hat oder sucht keine aktive Lösung",
        "signals": [
            "Allgemeine Neugier ohne konkretes Ziel",
            "Stellt keine spezifischen Fragen",
            "Kein Zeitdruck erkennbar",
            "Informiert sich breit",
        ],
        "strategy": "Educate & Inspire - Problem bewusst machen, nicht verkaufen",
        "content_types": ["Educational Content", "Stories", "Statistics", "Problem-Awareness"],
        "avoid": ["Hard Sell", "Preise nennen", "Dringlichkeit"],
    },
    
    "consideration": {
        "name": "Consideration (Optionen prüfen)",
        "description": "Lead vergleicht aktiv Optionen und informiert sich gezielt",
        "signals": [
            "Vergleicht mit Alternativen",
            "Fragt nach Features/Details",
            "Recherchiert aktiv",
            "Hat Zeitrahmen aber nicht dringend",
        ],
        "strategy": "Differentiate & Position - Zeige warum du besser bist",
        "content_types": ["Comparison Guides", "Feature Deep-Dives", "Case Studies", "Expert Content"],
        "avoid": ["Zu pushy", "Konkurrenz schlecht reden", "Zu früher Close"],
    },
    
    "decision": {
        "name": "Decision (Kurz vor Kauf)",
        "description": "Lead hat sich fast entschieden und sucht letzte Bestätigung",
        "signals": [
            "Fragt nach Preis/Konditionen",
            "Will Details zum Ablauf",
            "Spricht über Timing",
            "Involviert andere (Partner, Chef)",
        ],
        "strategy": "Reassure & Close - Bestätigen und Abschluss erleichtern",
        "content_types": ["Testimonials", "Guarantees", "Onboarding Info", "Quick Wins"],
        "avoid": ["Neue Features einführen", "Unsicherheit zeigen", "Zu viel Info"],
    },
    
    "validation": {
        "name": "Validation (Nach-Kauf)",
        "description": "Lead hat gekauft und sucht Bestätigung für seine Entscheidung",
        "signals": [
            "Fragt ob richtig entschieden",
            "Sucht erste Erfolge",
            "Will Bestätigung von anderen",
            "Teilt evtl. Zweifel",
        ],
        "strategy": "Celebrate & Support - Erfolge feiern, Buyer's Remorse vermeiden",
        "content_types": ["Onboarding", "Quick Wins", "Community", "Success Stories"],
        "avoid": ["Neue Entscheidungen fordern", "Upsell zu früh", "Probleme ignorieren"],
    },
}


# =============================================================================
# BUYER PSYCHOLOGY SYSTEM PROMPT
# =============================================================================

CHIEF_BUYER_PSYCHOLOGY_PROMPT = """
[CHIEF - BUYER PSYCHOLOGY ENGINE v3.0]

Du analysierst Käuferverhalten auf psychologischer Tiefe und passt 
deine Kommunikation entsprechend an.

╔════════════════════════════════════════════════════════════════════════════╗
║  ERKENNUNGS-FRAMEWORK                                                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Für jeden Lead analysierst du 4 Dimensionen:

1. BUYER TYPE (Persönlichkeit)
   ┌─────────────────┬─────────────────┐
   │   ANALYTICAL    │     DRIVER      │
   │   🧮 Fakten     │    🎯 Tempo     │
   │   Langsam       │    Schnell      │
   │   Detailliert   │    Direkt       │
   ├─────────────────┼─────────────────┤
   │   EXPRESSIVE    │     AMIABLE     │
   │   ✨ Vision     │    🤝 Beziehung │
   │   Emotional     │    Vertrauen    │
   │   Begeistert    │    Vorsichtig   │
   └─────────────────┴─────────────────┘

2. BUYING STAGE (Wo im Prozess?)
   AWARENESS → CONSIDERATION → DECISION → VALIDATION
   
3. RISK PROFILE (Risikobereitschaft)
   RISK_AVERSE ← RISK_NEUTRAL → RISK_TAKER
   
4. AUTHORITY LEVEL (Entscheidungsmacht)
   DECISION_MAKER | CHAMPION | INFLUENCER | GATEKEEPER | USER

╔════════════════════════════════════════════════════════════════════════════╗
║  ERKENNUNG AUS CHAT-SIGNALEN                                               ║
╚════════════════════════════════════════════════════════════════════════════╝

ANALYTICAL erkennen:
- "Gibt es dazu Studien?" / "Wie genau funktioniert das?"
- Lange, detaillierte Nachrichten
- Viele Fragen auf einmal
- Skepsis, will Beweise

DRIVER erkennen:
- "Was kostet das?" / "Was bringt mir das?"
- Kurze, direkte Nachrichten
- Wenig Smalltalk
- Will schnelle Antworten

EXPRESSIVE erkennen:
- "Das klingt spannend!" / "Wer macht das noch?"
- Emojis und Ausrufezeichen
- Teilt eigene Stories
- Enthusiastisch

AMIABLE erkennen:
- "Ich muss mal drüber nachdenken" / "Was sagt mein Partner?"
- Fragt nach Erfahrungen anderer
- Höflich, freundlich, aber zögerlich
- Vermeidet direkte Antworten

╔════════════════════════════════════════════════════════════════════════════╗
║  KOMMUNIKATIONS-ANPASSUNG                                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

ANALYTICAL:
→ Fakten vor Emotion
→ Studien und Daten zitieren
→ Strukturiert antworten (1., 2., 3.)
→ Zeit geben, nicht drängen
→ "Die Daten zeigen...", "Studien belegen..."

DRIVER:
→ Kurz und knackig
→ Ergebnis im ersten Satz
→ Keine langen Erklärungen
→ Direkte Fragen stellen
→ "Bottom Line:", "Das Ergebnis:", "Nächster Schritt:"

EXPRESSIVE:
→ Mit Story starten
→ Vision malen ("Stell dir vor...")
→ Begeisterung zeigen
→ Gemeinschaft betonen
→ "Das Spannende ist...", "Andere berichten..."

AMIABLE:
→ Beziehung aufbauen
→ Kein Druck, keine Eile
→ Sicherheit betonen
→ Referenzen und Empfehlungen
→ "Ich verstehe...", "Nimm dir Zeit...", "Wir unterstützen dich..."

╔════════════════════════════════════════════════════════════════════════════╗
║  STAGE-SPEZIFISCHE TAKTIKEN                                                ║
╚════════════════════════════════════════════════════════════════════════════╝

AWARENESS STAGE:
❌ Nicht: Preis, Features, Abschluss
✅ Statt: Problem bewusst machen, educate, inspirieren
Beispiel: "Wusstest du, dass 67% der Leads durch schlechtes Follow-up verloren gehen?"

CONSIDERATION STAGE:
❌ Nicht: Hard close, Dringlichkeit
✅ Statt: Differenzieren, Vergleiche, Case Studies
Beispiel: "Im Vergleich zu [Alternative] bieten wir..."

DECISION STAGE:
❌ Nicht: Neue Features, mehr Info
✅ Statt: Bestätigen, Risiko reduzieren, Easy Start
Beispiel: "Du kannst jederzeit pausieren. Der Start ist risikofrei."

VALIDATION STAGE:
❌ Nicht: Upsell, neue Entscheidungen
✅ Statt: Erfolge feiern, Support bieten
Beispiel: "Super, dass du dabei bist! Hier ist dein erster Quick Win..."

╔════════════════════════════════════════════════════════════════════════════╗
║  RISIKO-ANPASSUNG                                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

RISK_AVERSE:
- Garantien betonen
- Testimonials und Social Proof
- Easy Exit / Rückgabe erwähnen
- Kleine Schritte vorschlagen
- "Kein Risiko", "Jederzeit kündbar", "30 Tage testen"

RISK_NEUTRAL:
- Standard Approach
- Balance aus Features und Sicherheit
- Normale Urgency ok

RISK_TAKER:
- Early Adopter / Exclusiv Appeal
- Innovation betonen
- FOMO kann funktionieren
- "Als einer der Ersten...", "Exklusiver Zugang..."

╔════════════════════════════════════════════════════════════════════════════╗
║  AUTHORITY-NAVIGATION                                                      ║
╚════════════════════════════════════════════════════════════════════════════╝

DECISION_MAKER:
→ Direkt zum Abschluss arbeiten
→ ROI und strategische Benefits
→ Respekt für ihre Zeit

CHAMPION (Will intern verkaufen):
→ Munition liefern für interne Präsentation
→ Einwände antizipieren die intern kommen
→ Slides / Zusammenfassung anbieten

INFLUENCER:
→ Herausfinden wer entscheidet
→ Beziehung pflegen, aber weiterkommen
→ Meeting mit Decision Maker vorschlagen

GATEKEEPER:
→ Respekt zeigen, nicht umgehen
→ Value für IHREN Job zeigen
→ Fragen was nötig ist um weitergeleitet zu werden

USER (Endnutzer, nicht Entscheider):
→ Begeisterung erzeugen
→ Internal Champion aufbauen
→ Fragen wer entscheidet
"""


# =============================================================================
# BUYER PROFILE DETECTION PROMPT
# =============================================================================

BUYER_PROFILE_DETECTION_PROMPT = """
Analysiere diesen Chat und erstelle ein Buyer Profile:

CHAT:
{chat_text}

KONTEXT:
{context}

Bestimme:
1. Buyer Type (analytical, driver, expressive, amiable)
2. Buying Stage (awareness, consideration, decision, validation)
3. Risk Profile (risk_averse, risk_neutral, risk_taker)
4. Authority Level (decision_maker, influencer, gatekeeper, champion, user)

Antworte als JSON:
{{
  "buyer_profile": {{
    "buyer_type": "analytical",
    "buyer_type_confidence": 0.85,
    "buyer_type_signals": ["fragt nach Studien", "detaillierte Fragen"],
    
    "buying_stage": "consideration",
    "buying_stage_confidence": 0.80,
    "buying_stage_signals": ["vergleicht Optionen", "fragt nach Features"],
    
    "risk_profile": "risk_averse",
    "risk_profile_confidence": 0.75,
    "risk_profile_signals": ["fragt nach Garantie", "zögert"],
    
    "authority_level": "decision_maker",
    "authority_level_confidence": 0.70,
    "authority_level_signals": ["spricht in Ich-Form", "keine Erwähnung von anderen"]
  }},
  
  "communication_recommendations": {{
    "tone": "professional, fact-based",
    "message_length": "detailed",
    "emphasis": ["Daten", "Studien", "ROI"],
    "avoid": ["Druck", "Emotion", "Urgency"],
    "ideal_next_message": "Detaillierte Info mit Studienlink senden"
  }},
  
  "objection_prediction": {{
    "likely_objections": ["Brauche mehr Daten", "Muss recherchieren"],
    "preemptive_strategy": "Proaktiv Studien und Vergleiche liefern"
  }}
}}
"""


# =============================================================================
# BUILDER FUNCTIONS
# =============================================================================

def get_buyer_type_profile(buyer_type: BuyerType) -> Dict[str, Any]:
    """Holt das vollständige Profil für einen Buyer Type."""
    return BUYER_TYPE_PROFILES.get(buyer_type, BUYER_TYPE_PROFILES["amiable"])


def get_buying_stage_info(stage: BuyingStage) -> Dict[str, Any]:
    """Holt Informationen zu einer Buying Stage."""
    return BUYING_STAGES.get(stage, BUYING_STAGES["consideration"])


def build_buyer_profile_prompt(
    chat_text: str,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """Baut den Prompt zur Buyer Profile Detection."""
    context_str = json.dumps(context or {}, ensure_ascii=False)
    return BUYER_PROFILE_DETECTION_PROMPT.format(
        chat_text=chat_text,
        context=context_str,
    )


def build_adapted_response_prompt(
    buyer_type: BuyerType,
    buying_stage: BuyingStage,
    message_intent: str,
) -> str:
    """
    Baut einen Prompt der für den spezifischen Buyer Type angepasst ist.
    
    Args:
        buyer_type: Der erkannte Buyer Type
        buying_stage: Die aktuelle Buying Stage
        message_intent: Was der User erreichen will (z.B. "follow_up", "objection_price")
    
    Returns:
        Angepasster Prompt-Abschnitt
    """
    bt = get_buyer_type_profile(buyer_type)
    bs = get_buying_stage_info(buying_stage)
    
    dos = "\n".join([f"  ✅ {d}" for d in bt["communication_style"]["do"]])
    donts = "\n".join([f"  ❌ {d}" for d in bt["communication_style"]["dont"]])
    
    return f"""
[BUYER-ANPASSUNG]

Dieser Lead ist ein {bt['emoji']} {bt['name'].upper()}:
{chr(10).join([f"• {c}" for c in bt['characteristics'][:3]])}

KOMMUNIKATIONSSTIL:
{dos}

VERMEIDE:
{donts}

BUYING STAGE: {bs['name']}
→ Strategie: {bs['strategy']}
→ Vermeide: {', '.join(bs['avoid'])}

IDEALER PITCH-STIL:
{bt['ideal_pitch']}

CLOSING-APPROACH:
{bt['closing_approach']}
"""


def get_objection_response_by_buyer_type(
    buyer_type: BuyerType,
    objection_type: str,
) -> Dict[str, str]:
    """
    Gibt eine angepasste Einwandbehandlung basierend auf Buyer Type.
    
    Args:
        buyer_type: Der Buyer Type des Leads
        objection_type: Art des Einwands (price, time, trust, etc.)
    
    Returns:
        Dict mit angepasster Strategie und Beispielformulierung
    """
    
    responses = {
        ("analytical", "price"): {
            "strategy": "ROI-Kalkulation mit konkreten Zahlen",
            "example": "Lass mich das mal durchrechnen: Bei [X] kommst du auf [Y] pro Tag. Studien zeigen einen ROI von durchschnittlich [Z]%.",
        },
        ("analytical", "trust"): {
            "strategy": "Studien und Zertifikate zeigen",
            "example": "Verstehe die Skepsis. Hier sind 3 peer-reviewed Studien die das belegen: [Link]. Außerdem sind wir [Zertifikat]-zertifiziert.",
        },
        ("driver", "price"): {
            "strategy": "Direkt auf ROI/Ergebnis fokussieren",
            "example": "Unterm Strich: Du investierst [X], bekommst [Y] zurück. Das ist [Z]x ROI. Machen wir's?",
        },
        ("driver", "time"): {
            "strategy": "Zeitersparnis quantifizieren",
            "example": "10 Minuten pro Tag, das war's. Das spart dir [X] Stunden pro Monat. Starten wir diese Woche?",
        },
        ("expressive", "price"): {
            "strategy": "Emotionalen Wert + Community betonen",
            "example": "Ich verstehe. Aber stell dir vor: [Vision]. Andere wie du sagen nach 3 Monaten: '[Testimonial]'. Ist es das nicht wert?",
        },
        ("expressive", "trust"): {
            "strategy": "Stories und Social Proof",
            "example": "Das hab ich oft gehört. Dann hat [Name] es ausprobiert und schrieb mir: '[Story]'. Willst du ihre Nummer? Sie erzählt gern.",
        },
        ("amiable", "price"): {
            "strategy": "Kein Druck, Sicherheit betonen",
            "example": "Absolut verständlich. Es gibt keine Verpflichtung. Viele starten erstmal klein und schauen wie es läuft. Kein Risiko.",
        },
        ("amiable", "trust"): {
            "strategy": "Persönliche Beziehung und Unterstützung",
            "example": "Das verstehe ich total. Wir können auch erstmal telefonieren, ganz unverbindlich. Ich bin da um zu helfen, nicht zu verkaufen.",
        },
    }
    
    key = (buyer_type, objection_type)
    
    if key in responses:
        return responses[key]
    
    # Fallback: generische Antwort basierend auf Buyer Type
    return {
        "strategy": get_buyer_type_profile(buyer_type)["objection_handling"],
        "example": "Verstehe ich. Lass uns darüber reden.",
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "BuyerType",
    "BuyingStage",
    "RiskProfile",
    "AuthorityLevel",
    "BuyerProfile",
    "BUYER_TYPE_PROFILES",
    "BUYING_STAGES",
    "CHIEF_BUYER_PSYCHOLOGY_PROMPT",
    "BUYER_PROFILE_DETECTION_PROMPT",
    "get_buyer_type_profile",
    "get_buying_stage_info",
    "build_buyer_profile_prompt",
    "build_adapted_response_prompt",
    "get_objection_response_by_buyer_type",
]

