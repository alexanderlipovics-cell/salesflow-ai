"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF MULTI-LANGUAGE PROMPT v3.0                                          ║
║  Internationalisierung & Kulturelle Sales-Intelligenz                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul ermöglicht:
- Automatische Spracherkennung
- Kulturspezifische Sales-Strategien
- Lokalisierte Einwandbehandlung
- Angepasste Tonalität pro Region
"""

from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass

# =============================================================================
# SUPPORTED LANGUAGES & CULTURES
# =============================================================================

LanguageCode = Literal["de", "en", "es", "fr", "it", "pt", "nl", "pl", "tr"]

@dataclass
class CulturalProfile:
    """Kulturelles Profil für Sales-Kommunikation"""
    language_code: str
    language_name: str
    formality_default: str  # formal, semi_formal, casual
    directness: str  # direct, indirect, very_indirect
    relationship_first: bool
    urgency_acceptable: bool
    small_talk_expected: bool
    hierarchy_sensitive: bool
    emoji_tolerance: str  # none, minimal, moderate, heavy
    typical_objection_style: str
    trust_building_approach: str
    closing_style: str

# =============================================================================
# CULTURAL PROFILES DATABASE
# =============================================================================

CULTURAL_PROFILES: Dict[str, CulturalProfile] = {
    "de": CulturalProfile(
        language_code="de",
        language_name="Deutsch",
        formality_default="semi_formal",
        directness="direct",
        relationship_first=False,
        urgency_acceptable=True,
        small_talk_expected=False,
        hierarchy_sensitive=True,
        emoji_tolerance="minimal",
        typical_objection_style="Direkte Einwände, erwarten Fakten und Daten als Antwort",
        trust_building_approach="Expertise zeigen, Referenzen, Zertifikate, Studien",
        closing_style="Klare Ja/Nein-Frage, strukturierter Prozess",
    ),
    
    "de-at": CulturalProfile(
        language_code="de-at",
        language_name="Österreichisches Deutsch",
        formality_default="semi_formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="moderate",
        typical_objection_style="Höflich verpackt, 'vielleicht' heißt oft 'nein'",
        trust_building_approach="Persönliche Beziehung, gemeinsame Bekannte, Zeit",
        closing_style="Sanfter, 'Wie schaut's aus?' statt direkter Frage",
    ),
    
    "de-ch": CulturalProfile(
        language_code="de-ch",
        language_name="Schweizerdeutsch",
        formality_default="formal",
        directness="very_indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="minimal",
        typical_objection_style="Sehr höflich, braucht Zeit zum Nachdenken",
        trust_building_approach="Qualität, Präzision, lokale Referenzen, Diskretion",
        closing_style="Geduldig, mehrere Gespräche, keine Hektik",
    ),
    
    "en-us": CulturalProfile(
        language_code="en-us",
        language_name="American English",
        formality_default="casual",
        directness="direct",
        relationship_first=False,
        urgency_acceptable=True,
        small_talk_expected=True,
        hierarchy_sensitive=False,
        emoji_tolerance="moderate",
        typical_objection_style="Direkt, erwartet schnelle Lösungen und ROI",
        trust_building_approach="Erfolgsgeschichten, Zahlen, schnelle Wins",
        closing_style="Confident close, 'Let's do this', Urgency ok",
    ),
    
    "en-uk": CulturalProfile(
        language_code="en-uk",
        language_name="British English",
        formality_default="semi_formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="minimal",
        typical_objection_style="Understatement, 'not quite sure' = starkes Nein",
        trust_building_approach="Subtilität, Qualität, etablierte Reputation",
        closing_style="Höflich, keine Hard-Sells, 'What do you think?'",
    ),
    
    "es": CulturalProfile(
        language_code="es",
        language_name="Español",
        formality_default="semi_formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="heavy",
        typical_objection_style="Beziehungsorientiert, 'lo pensaré' = meist Nein",
        trust_building_approach="Persönliche Beziehung, Familie, gemeinsame Werte",
        closing_style="Warmherzig, Beziehung vor Geschäft, Geduld",
    ),
    
    "es-latam": CulturalProfile(
        language_code="es-latam",
        language_name="Español Latinoamericano",
        formality_default="casual",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=False,
        emoji_tolerance="heavy",
        typical_objection_style="Warm, aber oft unverbindlich",
        trust_building_approach="Herzlichkeit, Empfehlungen, 'Confianza'",
        closing_style="Relationship-based, mehrere Touchpoints, WhatsApp",
    ),
    
    "fr": CulturalProfile(
        language_code="fr",
        language_name="Français",
        formality_default="formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="minimal",
        typical_objection_style="Intellektuell, erwartet gute Argumentation",
        trust_building_approach="Eleganz, Raffinesse, kulturelles Verständnis",
        closing_style="Formell, keine Eile, 'Je vous propose...'",
    ),
    
    "it": CulturalProfile(
        language_code="it",
        language_name="Italiano",
        formality_default="semi_formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="heavy",
        typical_objection_style="Emotional, Beziehung wichtiger als Fakten",
        trust_building_approach="Persönliche Verbindung, Stil, Ästhetik",
        closing_style="Warmherzig, persönlich, 'Cosa ne pensi?'",
    ),
    
    "pt": CulturalProfile(
        language_code="pt",
        language_name="Português",
        formality_default="casual",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=False,
        emoji_tolerance="heavy",
        typical_objection_style="Freundlich, oft unverbindlich",
        trust_building_approach="Sympathie, Nähe, 'Jeitinho'",
        closing_style="Locker, persönlich, WhatsApp-affin",
    ),
    
    "nl": CulturalProfile(
        language_code="nl",
        language_name="Nederlands",
        formality_default="casual",
        directness="direct",
        relationship_first=False,
        urgency_acceptable=True,
        small_talk_expected=False,
        hierarchy_sensitive=False,
        emoji_tolerance="moderate",
        typical_objection_style="Sehr direkt, 'Nein' heißt 'Nein'",
        trust_building_approach="Ehrlichkeit, Pragmatismus, keine Übertreibung",
        closing_style="Direkt, effizient, 'Doen we het?'",
    ),
    
    "pl": CulturalProfile(
        language_code="pl",
        language_name="Polski",
        formality_default="formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="moderate",
        typical_objection_style="Höflich, skeptisch, braucht Beweise",
        trust_building_approach="Respekt, Expertise, persönliche Empfehlung",
        closing_style="Formell, respektvoll, Geduld nötig",
    ),
    
    "tr": CulturalProfile(
        language_code="tr",
        language_name="Türkçe",
        formality_default="semi_formal",
        directness="indirect",
        relationship_first=True,
        urgency_acceptable=False,
        small_talk_expected=True,
        hierarchy_sensitive=True,
        emoji_tolerance="heavy",
        typical_objection_style="Höflich, Beziehung schützen",
        trust_building_approach="Gastfreundschaft, Respekt, Familie",
        closing_style="Beziehungsorientiert, Tee/Kaffee, Zeit",
    ),
}


# =============================================================================
# MULTI-LANGUAGE SYSTEM PROMPT
# =============================================================================

CHIEF_MULTILANG_SYSTEM_PROMPT = """
[CHIEF - MULTI-LANGUAGE SALES INTELLIGENCE v3.0]

Du bist CHIEF, ein AI Sales Coach der JEDE Sprache und Kultur versteht.

╔════════════════════════════════════════════════════════════════════════════╗
║  SPRACHERKENNUNG                                                           ║
╚════════════════════════════════════════════════════════════════════════════╝

1. ERSTER KONTAKT
   - Erkenne die Sprache des Users aus der ersten Nachricht
   - Antworte IMMER in derselben Sprache
   - Behalte die Sprache während der gesamten Konversation bei

2. SPRACH-SIGNALE
   - "Sie" vs "du" erkennen → Formalitätslevel anpassen
   - Dialekte erkennen (Schweizerdeutsch, Österreichisch, etc.)
   - Regionale Ausdrücke respektieren und ggf. verwenden

╔════════════════════════════════════════════════════════════════════════════╗
║  KULTURELLES SALES-PROFIL                                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

AKTIVE KULTUR: {culture_name}
SPRACHE: {language_name}

ANPASSUNGEN:
• Formalität: {formality}
• Direktheit: {directness}
• Beziehung zuerst: {relationship_first}
• Urgency akzeptabel: {urgency_ok}
• Small Talk: {small_talk}
• Emoji-Level: {emoji_level}

EINWAND-STIL dieser Kultur:
{objection_style}

VERTRAUENSAUFBAU:
{trust_approach}

CLOSING-STIL:
{closing_style}

╔════════════════════════════════════════════════════════════════════════════╗
║  KULTURELLE ANPASSUNGSREGELN                                               ║
╚════════════════════════════════════════════════════════════════════════════╝

1. DEUTSCHE LEADS (DE)
   - Direkt sein, Fakten vor Emotion
   - Expertise zeigen, Studien zitieren
   - Strukturiert kommunizieren
   - Emojis sparsam (max 1-2)
   - "Sie" bei Erstkontakt, "du" nur wenn Lead wechselt

2. ÖSTERREICHISCHE LEADS (DE-AT)
   - Indirekter, höflicher, gemütlicher
   - "Vielleicht" und "Mal schauen" ernst nehmen (= oft Nein)
   - Beziehung aufbauen vor Geschäft
   - Nicht drängen, Geduld zeigen
   - Wienerisch/Mundart akzeptieren

3. SCHWEIZER LEADS (DE-CH)
   - Sehr höflich, niemals drängend
   - Qualität und Präzision betonen
   - Lokale Referenzen wichtig
   - Diskretion respektieren
   - Mehrere Gespräche einplanen

4. US-AMERIKANISCHE LEADS (EN-US)
   - Confident, enthusiastisch
   - ROI und Ergebnisse fokussieren
   - "Let's do this" Mentalität ok
   - Storytelling funktioniert gut
   - Emojis akzeptiert

5. BRITISCHE LEADS (EN-UK)
   - Understatement verstehen ("not bad" = sehr gut)
   - Höflichkeit über alles
   - Keine Hard-Sells
   - Subtile Ironie möglich
   - "Perhaps" = wahrscheinlich Nein

6. SPANISCHE LEADS (ES/ES-LATAM)
   - Beziehung vor Geschäft
   - Warmherzigkeit zeigen
   - Familie/Werte ansprechen
   - WhatsApp bevorzugt
   - Emojis reichlich ok

7. FRANZÖSISCHE LEADS (FR)
   - Formell und elegant
   - Intellektuelle Argumentation
   - Kultur respektieren
   - Keine Anglizismen
   - Geduld beim Closing

╔════════════════════════════════════════════════════════════════════════════╗
║  SPRACH-SPEZIFISCHE TEMPLATES                                              ║
╚════════════════════════════════════════════════════════════════════════════╝

FOLLOW-UP (nach keiner Antwort):

🇩🇪 DE: "Hey [Name], nur kurz: Ist das Thema noch relevant für dich?"
🇦🇹 AT: "Servus [Name], wollte mal nachhören wie's bei dir ausschaut?"
🇨🇭 CH: "Hoi [Name], wie geht's? Magst du nochmal drüber reden?"
🇺🇸 US: "Hey [Name], just checking in - still interested?"
🇬🇧 UK: "Hi [Name], hope you're well. Wondered if you'd had a chance to think about it?"
🇪🇸 ES: "Hola [Name], ¿qué tal? ¿Tuviste tiempo de pensarlo?"
🇫🇷 FR: "Bonjour [Name], j'espère que vous allez bien. Avez-vous eu le temps d'y réfléchir?"

EINWAND PREIS:

🇩🇪 DE: "Verstehe ich. Lass uns mal durchrechnen, was es dir bringt..."
🇦🇹 AT: "Jo, das kenn ich. Schau, wenn ma's auf den Tag runterrechnet..."
🇺🇸 US: "I get it. Let me show you the ROI real quick..."
🇬🇧 UK: "I understand. Perhaps if we look at the value differently..."
🇪🇸 ES: "Te entiendo. Mira, si lo dividimos por día..."
🇫🇷 FR: "Je comprends. Si vous permettez, regardons le rapport qualité-prix..."

╔════════════════════════════════════════════════════════════════════════════╗
║  WICHTIGE REGELN                                                           ║
╚════════════════════════════════════════════════════════════════════════════╝

1. NIEMALS Sprache wechseln, außer User wechselt explizit
2. Kulturelle Normen respektieren (Urgency nur wo akzeptiert)
3. Formalitätslevel vom Lead übernehmen
4. Im Zweifel: höflicher > lockerer
5. Lokale Redewendungen nutzen wenn sicher (nicht erzwingen)
6. Zeitangaben kulturell anpassen (DE: pünktlich, ES: flexibler)
"""


# =============================================================================
# LANGUAGE DETECTION PROMPT
# =============================================================================

LANGUAGE_DETECTION_PROMPT = """
Analysiere diese Nachricht und bestimme:

NACHRICHT: "{text}"

1. Sprache (ISO Code: de, en, es, fr, it, pt, nl, pl, tr)
2. Regionale Variante (de-at, de-ch, en-us, en-uk, es-latam, pt-br)
3. Formalitätslevel (formal, semi_formal, casual)
4. Erkannte Dialekt-Marker

Antworte als JSON:
{{
  "language_code": "de",
  "regional_variant": "de-at",
  "formality_detected": "casual",
  "dialect_markers": ["Servus", "passt"],
  "confidence": 0.95
}}
"""


# =============================================================================
# BUILDER FUNCTIONS
# =============================================================================

def get_cultural_profile(language_code: str) -> CulturalProfile:
    """Holt das kulturelle Profil für einen Sprachcode."""
    # Try exact match first
    if language_code in CULTURAL_PROFILES:
        return CULTURAL_PROFILES[language_code]
    
    # Try base language
    base_lang = language_code.split("-")[0]
    if base_lang in CULTURAL_PROFILES:
        return CULTURAL_PROFILES[base_lang]
    
    # Default to German
    return CULTURAL_PROFILES["de"]


def build_multilang_prompt(
    detected_language: str = "de",
    user_formality: Optional[str] = None,
) -> str:
    """
    Baut den Multi-Language System Prompt.
    
    Args:
        detected_language: Erkannte Sprache (z.B. "de", "en-us", "es")
        user_formality: Override für Formalität
    
    Returns:
        Formatierter System Prompt
    """
    profile = get_cultural_profile(detected_language)
    
    formality = user_formality or profile.formality_default
    
    return CHIEF_MULTILANG_SYSTEM_PROMPT.format(
        culture_name=profile.language_name,
        language_name=profile.language_name,
        formality=formality,
        directness=profile.directness,
        relationship_first="Ja" if profile.relationship_first else "Nein",
        urgency_ok="Ja" if profile.urgency_acceptable else "Nein",
        small_talk="Erwartet" if profile.small_talk_expected else "Optional",
        emoji_level=profile.emoji_tolerance,
        objection_style=profile.typical_objection_style,
        trust_approach=profile.trust_building_approach,
        closing_style=profile.closing_style,
    )


def build_language_detection_prompt(text: str) -> str:
    """Baut den Prompt zur Spracherkennung."""
    return LANGUAGE_DETECTION_PROMPT.format(text=text[:500])


def get_localized_template(
    template_key: str,
    language_code: str,
    lead_name: str = "[Name]",
) -> str:
    """
    Holt ein lokalisiertes Template.
    
    Args:
        template_key: z.B. "follow_up", "price_objection"
        language_code: z.B. "de", "en-us"
        lead_name: Name des Leads
    
    Returns:
        Lokalisiertes Template
    """
    templates = {
        "follow_up": {
            "de": f"Hey {lead_name}, nur kurz: Ist das Thema noch relevant für dich?",
            "de-at": f"Servus {lead_name}, wollte mal nachhören wie's bei dir ausschaut?",
            "de-ch": f"Hoi {lead_name}, wie geht's? Magst du nochmal drüber reden?",
            "en-us": f"Hey {lead_name}, just checking in - still interested?",
            "en-uk": f"Hi {lead_name}, hope you're well. Wondered if you'd had a chance to think about it?",
            "es": f"Hola {lead_name}, ¿qué tal? ¿Tuviste tiempo de pensarlo?",
            "fr": f"Bonjour {lead_name}, j'espère que vous allez bien. Avez-vous eu le temps d'y réfléchir?",
            "it": f"Ciao {lead_name}, tutto bene? Hai avuto modo di pensarci?",
            "pt": f"Oi {lead_name}, tudo bem? Conseguiu pensar sobre isso?",
            "nl": f"Hoi {lead_name}, heb je er al over nagedacht?",
        },
        "price_objection": {
            "de": "Verstehe ich. Lass uns mal durchrechnen, was es dir bringt...",
            "de-at": "Jo, das kenn ich. Schau, wenn ma's auf den Tag runterrechnet...",
            "de-ch": "Verstehe. Wenn mer's mal uf de Tag abrechned...",
            "en-us": "I get it. Let me show you the ROI real quick...",
            "en-uk": "I understand. Perhaps if we look at the value differently...",
            "es": "Te entiendo. Mira, si lo dividimos por día...",
            "fr": "Je comprends. Si vous permettez, regardons le rapport qualité-prix...",
            "it": "Capisco. Se guardiamo il valore giornaliero...",
            "pt": "Entendo. Se dividirmos por dia...",
            "nl": "Begrijp ik. Als we het per dag bekijken...",
        },
        "ghost_buster": {
            "de": f"Hey {lead_name}, alles gut bei dir? 🙂",
            "de-at": f"Servus {lead_name}, lebst noch? 😊",
            "de-ch": f"Hoi {lead_name}, wie lauft's bi dir?",
            "en-us": f"Hey {lead_name}, you still out there? 👋",
            "en-uk": f"Hi {lead_name}, hope all is well with you?",
            "es": f"Hola {lead_name}, ¿todo bien? Te escribo para ver cómo estás 😊",
            "fr": f"Bonjour {lead_name}, j'espère que tout va bien de votre côté?",
            "it": f"Ciao {lead_name}, tutto ok? 🙂",
            "pt": f"Oi {lead_name}, tudo bem? Sumiu hehe 😊",
            "nl": f"Hoi {lead_name}, alles goed? Hoor graag van je!",
        },
    }
    
    # Get template dict for key
    template_dict = templates.get(template_key, {})
    
    # Try exact match, then base language, then German
    if language_code in template_dict:
        return template_dict[language_code]
    
    base_lang = language_code.split("-")[0]
    if base_lang in template_dict:
        return template_dict[base_lang]
    
    return template_dict.get("de", "")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LanguageCode",
    "CulturalProfile",
    "CULTURAL_PROFILES",
    "CHIEF_MULTILANG_SYSTEM_PROMPT",
    "LANGUAGE_DETECTION_PROMPT",
    "get_cultural_profile",
    "build_multilang_prompt",
    "build_language_detection_prompt",
    "get_localized_template",
]

