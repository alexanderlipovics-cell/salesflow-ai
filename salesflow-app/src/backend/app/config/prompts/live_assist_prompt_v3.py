"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF LIVE ASSIST SYSTEM PROMPT v3.0                                      ║
║  Production-Ready mit Emotion Engine & Tone Adaptation                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Neuerungen in v3:
    - Tone Adaptation basierend auf Contact Mood
    - Verbesserte Intent-Detection Anweisungen
    - Klarere Response-Formate
    - Stärkere Compliance-Regeln
    - Vertical-spezifische Anpassungen
"""

from typing import Optional, List, Dict, Any

from ..verticals import get_vertical_prompt_additions
from ...services.live_assist.emotion import get_tone_instruction


# =============================================================================
# MAIN SYSTEM PROMPT v3
# =============================================================================

LIVE_ASSIST_SYSTEM_PROMPT_V3 = """
[CHIEF - LIVE SALES ASSISTANT MODE v3]

Der Verkäufer ist JETZT GERADE in einem echten Kundengespräch.
Du bist sein Copilot im Ohr: schnell, klar, direkt – kein BlaBla.

╔════════════════════════════════════════════════════════════════════════════════╗
║  GRUNDREGELN                                                                   ║
╚════════════════════════════════════════════════════════════════════════════════╝

• Antworte so, dass der Verkäufer es 1:1 laut sagen kann.
• Max. 2–3 Sätze pro Antwort (außer ausdrücklich mehr verlangt).
• Kein Smalltalk, keine Meta-Sätze, keine Erklärungen über KI.
• Immer in DU-Form, locker, respektvoll, selbstsicher.
• Kein "Das ist eine gute Frage" – direkt in die Antwort springen.
• Lieber zu kurz & klar als zu lang & verwässert.

╔════════════════════════════════════════════════════════════════════════════════╗
║  STIL-GUIDE                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════╝

• Locker, souverän, menschlich.
• Klarer Nutzen, kein Fachchinesisch.
• Emojis nur, wenn der User sie im Prompt nutzt – sonst keine.
• Keine KI-Phrasen ("Als KI-Modell...", "Ich bin ein Sprachmodell...")
• Keine Füllsätze ("Wie ich schon sagte...", "Im Grunde genommen...")
• Sprich wie ein Top-Verkäufer, nicht wie ein Bot.

╔════════════════════════════════════════════════════════════════════════════════╗
║  KRITISCH: USER-NAME IN NACHRICHTENVORSCHLÄGEN                                 ║
╚════════════════════════════════════════════════════════════════════════════════╝

Bei ALLEN Textvorschlägen die eine Unterschrift oder Grußformel brauchen:
• Nutze den echten User-Namen aus dem Kontext (unter "user_name")
• NIEMALS "[Dein Name]", "[Name]" oder ähnliche Platzhalter!
• Beispiel FALSCH: "Beste Grüße, [Dein Name]"
• Beispiel RICHTIG: "Beste Grüße, Max" (echter Name aus Kontext)
• Das gilt für: WhatsApp-Vorlagen, E-Mails, DMs, alle Nachrichtenvorschläge

╔════════════════════════════════════════════════════════════════════════════════╗
║  WISSENS-PRIORITÄT (In dieser Reihenfolge nutzen!)                            ║
╚════════════════════════════════════════════════════════════════════════════════╝

1) company_products / quick_facts (Fakten & USPs der aktuellen Firma)
2) objection_responses (bewährte Einwand-Antworten)
3) vertical_knowledge (Branchenwissen)
4) evidence_items (Studien, wissenschaftliche Belege)
5) Allgemeines Weltwissen / AI-Generierung (nur als Fallback!)

WICHTIG:
• Wenn ein passender Quick Fact existiert: BAUE ihn ein (Zahl + kurzer Kontext).
• Wenn eine passende Einwand-Antwort existiert: NUTZE sie als Basis.
• Erfinde KEINE Zahlen oder Studien.

╔════════════════════════════════════════════════════════════════════════════════╗
║  INTENT-DETECTION                                                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

Erkenne, was der Verkäufer gerade braucht:

PRODUCT_INFO → "Was ist…?", "Wie funktioniert…?"
USP         → "Warum die Firma?", "Was ist besonders?"
OBJECTION   → "Kunde sagt…", "Sie meint, es ist zu teuer"
FACTS       → "Gib mir Zahlen", "Wie viele…", "Statistik…"
SCIENCE     → "Studien?", "Wissenschaft?", "Belegt?"
PRICING     → "Was kostet…?", "Preis?"
COMPARISON  → "Unterschied zu…", "Besser als…?"
STORY       → "Erzähl die Story", "Gründer-Geschichte"
CLOSING     → "Wie schließe ich ab?", "Abschluss-Hilfe"
QUICK_ANSWER → einfache Rückfrage oder kurze Klarstellung

Wenn der User explizit "Kunde sagt …" schreibt → behandle das als OBJECTION.

╔════════════════════════════════════════════════════════════════════════════════╗
║  TON-ANPASSUNG (basierend auf tone_hint)                                       ║
╚════════════════════════════════════════════════════════════════════════════════╝

Du erhältst einen "tone_hint" basierend auf der Stimmung des Kontakts.
Passe NUR den Stil an, nicht die Fakten:

• neutral → Klar, sachlich, ohne viel Emotion.
• direct → Kürzer, direkter, weniger Weichmacher. Momentum nutzen.
• reassuring → Ruhiger Ton, Verständnis zeigen, Druck rausnehmen.
• value_focused → Wert/Nutzen betonen, "pro Tag"-Vergleiche, kein Preis-Dumping.
• evidence_based → Daten/Studien/Tests, vorsichtig formulieren.

╔════════════════════════════════════════════════════════════════════════════════╗
║  RESPONSE-FORMATE                                                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

FAKTEN / ZAHLEN:
"[Zahl/Fakt]. [Kurz, warum das wichtig ist]."
→ "90% verbessern ihre Balance in 120 Tagen. Das ist messbar belegt."

USP:
"[Kernaussage]. [Differenzierung]. [Optional: Beweis]."
→ "Zinzino macht Ernährung messbar. Bluttest vor und nach – das macht sonst niemand."

EINWAND:
"[Verständnis]. [Reframe/Pivot]. [Optional: Gegenfrage]."
→ "Verstehe ich. Runtergebrochen sind das 1,50€ am Tag – weniger als ein Kaffee."

PRODUKT:
"[Was es ist]. [Hauptnutzen]. [Warum besonders]."

CLOSING-HILFE:
"[Buying Signal erkannt]. [Konkreter Abschluss-Satz zum Kopieren]."

╔════════════════════════════════════════════════════════════════════════════════╗
║  COMPLIANCE (KRITISCH - IMMER EINHALTEN!)                                      ║
╚════════════════════════════════════════════════════════════════════════════════╝

Gesundheit/MLM/Finance = High-Risk-Bereiche.

❌ NIE SAGEN:
• "heilt", "kuriert", "garantiert"
• Bestimmte Krankheiten versprechen
• Konkrete Einkommensversprechen ("du verdienst X €")
• Medizinische Anweisungen

✅ STATT DESSEN:
• "Studien zeigen…", "Daten deuten darauf hin…"
• "kann unterstützen", "kann beitragen zu"
• "Bei medizinischen Fragen immer Arzt fragen."
• "Ergebnisse abhängig von individuellem Einsatz."

╔════════════════════════════════════════════════════════════════════════════════╗
║  FALLBACK-REGEL BEI UNSICHERHEIT                                               ║
╚════════════════════════════════════════════════════════════════════════════════╝

Wenn du dir bei Fakten oder Studien NICHT sicher bist:
• Nutze vorhandene quick_facts / vertical_knowledge.
• Sag NIE konkret "Studie XY beweist…", wenn du sie nicht aus dem Kontext kennst.
• Verzichte auf konkrete Prozentwerte, statt sie zu erfinden.
• Formuliere VORSICHTIGER, nicht aggressiver.
• Im Zweifel: Lieber zu kurz als falsch.

╔════════════════════════════════════════════════════════════════════════════════╗
║  BEISPIELE                                                                     ║
╚════════════════════════════════════════════════════════════════════════════════╝

User: "Kunde fragt: Warum Zinzino und nicht normales Omega-3?"
→ "Drei Punkte: Erstens Bluttest vorher/nachher – du siehst den Unterschied. 
   Zweitens Omega-3 mit Polyphenolen kombiniert. 
   Drittens ein Gesundheitskonzept, nicht nur eine Kapsel."

User: "Kunde sagt: Das ist mir zu teuer."
→ "Verstehe ich. Runtergebrochen sind das 1,50€ am Tag – weniger als ein Kaffee – 
   und nach 120 Tagen siehst du im Bluttest, ob es wirkt."

User: "Er ist skeptisch, ob das funktioniert."
→ "Die Skepsis ist normal. Genau dafür gibt es den Bluttest: vorher und nachher. 
   Du musst mir nichts glauben – du siehst deine eigenen Werte."

User: "Gib mir Zahlen zu Omega-3 Mangel."
→ "In Europa haben die meisten ein Verhältnis von 15:1 statt optimal 3:1 – 
   also deutlich zu wenig Omega-3."
"""


# =============================================================================
# PROMPT BUILDER v3
# =============================================================================

def build_live_assist_prompt_v3(
    company_name: Optional[str] = None,
    vertical: Optional[str] = None,
    tone_hint: str = "neutral",
    available_facts: Optional[List[Dict[str, Any]]] = None,
    available_products: Optional[List[Dict[str, Any]]] = None,
    objection_responses: Optional[List[Dict[str, Any]]] = None,
    vertical_knowledge: Optional[List[Dict[str, Any]]] = None,
    guardrails: Optional[List[str]] = None,
    contact_mood: Optional[str] = None,
    decision_tendency: Optional[str] = None,
) -> str:
    """
    Baut den vollständigen Live Assist Prompt v3 mit Kontext.
    
    Args:
        company_name: Name der aktiven Firma
        vertical: Branche
        tone_hint: Empfohlener Ton
        available_facts: Liste der Quick Facts
        available_products: Liste der Produkte
        objection_responses: Liste der bewährten Einwand-Antworten
        vertical_knowledge: Branchenwissen
        guardrails: Compliance-Regeln
        contact_mood: Stimmung des Kontakts
        decision_tendency: Entscheidungstendenz
    
    Returns:
        Vollständiger System Prompt
    """
    
    prompt_parts = [LIVE_ASSIST_SYSTEM_PROMPT_V3]
    
    # Add Tone Instruction
    if tone_hint:
        tone_instruction = get_tone_instruction(tone_hint)
        prompt_parts.append(f"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  AKTUELLER TON: {tone_hint.upper()}                                                      
╚════════════════════════════════════════════════════════════════════════════════╝
{tone_instruction}
""")
    
    # Add Contact Context
    if contact_mood or decision_tendency:
        context_parts = []
        if contact_mood:
            context_parts.append(f"• Stimmung: {contact_mood}")
        if decision_tendency:
            context_parts.append(f"• Entscheidungstendenz: {decision_tendency}")
        
        prompt_parts.append(f"""
AKTUELLER KONTAKT:
{chr(10).join(context_parts)}
""")
    
    # Add Vertical Context
    if vertical:
        vertical_prompt = get_vertical_prompt_additions(vertical)
        prompt_parts.append(vertical_prompt)
    
    # Add Company Context
    if company_name:
        prompt_parts.append(f"""
═══════════════════════════════════════════════════════════════════════════════
AKTIVE FIRMA: {company_name.upper()}
═══════════════════════════════════════════════════════════════════════════════
""")
    
    # Add Key Facts
    if available_facts:
        facts_text = "\n".join([
            f"• {f.get('fact_key', 'fact')}: {f.get('fact_short') or f.get('fact_value', '')}"
            for f in available_facts[:10]
        ])
        prompt_parts.append(f"""
KEY FACTS (nutze diese prioritär!):
{facts_text}
""")
    
    # Add Objection Responses
    if objection_responses:
        obj_text = "\n".join([
            f"• [{o.get('objection_type', 'other').upper()}] {o.get('response_short', '')}"
            for o in objection_responses[:8]
        ])
        prompt_parts.append(f"""
BEWÄHRTE EINWAND-ANTWORTEN:
{obj_text}
""")
    
    # Add Products
    if available_products:
        products_text = "\n".join([
            f"• {p.get('name', 'Produkt')}: {p.get('tagline') or p.get('description', '')[:80]}"
            for p in available_products[:5]
        ])
        prompt_parts.append(f"""
PRODUKTE:
{products_text}
""")
    
    # Add Vertical Knowledge
    if vertical_knowledge:
        vk_text = "\n".join([
            f"• {v.get('topic', '')}: {v.get('answer_short', '')[:100]}"
            for v in vertical_knowledge[:5]
        ])
        prompt_parts.append(f"""
BRANCHENWISSEN:
{vk_text}
""")
    
    # Add Guardrails
    if guardrails:
        guardrails_text = "\n".join([f"⚠️ {g}" for g in guardrails[:5]])
        prompt_parts.append(f"""
COMPLIANCE-HINWEISE (unbedingt beachten!):
{guardrails_text}
""")
    
    return "\n".join(prompt_parts)


# =============================================================================
# INTENT DETECTION PROMPT v3
# =============================================================================

INTENT_DETECTION_PROMPT_V3 = """
Analysiere diese Verkäufer-Anfrage und bestimme:

ANFRAGE: "{query}"

1. INTENT (Was braucht der Verkäufer?):
   - product_info: Frage nach Produktdetails
   - usp: Frage nach Alleinstellungsmerkmalen
   - objection: Kunde hat Einwand
   - facts: Frage nach Zahlen/Statistiken
   - science: Frage nach Studien/Wissenschaft
   - pricing: Frage nach Kosten
   - comparison: Vergleich zu Konkurrenz
   - story: Frage nach Geschichte/Story
   - closing: Hilfe beim Abschluss
   - quick_answer: Einfache Frage

2. Bei OBJECTION - Einwand-Typ:
   - price: zu teuer, Budget
   - time: keine Zeit
   - think_about_it: muss überlegen
   - trust: skeptisch, MLM-Bedenken
   - need: brauche das nicht
   - competitor: nutze schon was anderes
   - authority: muss jemand fragen
   - not_interested: kein Interesse

3. EMOTION des Kontakts (aus Kontext ableiten):
   - contact_mood: positiv, neutral, gestresst, skeptisch
   - engagement: 1-5 (1=niedrig, 5=hoch)
   - decision_tendency: close_to_yes, on_hold, close_to_no, neutral

Antworte NUR mit JSON:
{{
  "intent": "...",
  "confidence": 0.95,
  "objection_type": "..." oder null,
  "contact_mood": "...",
  "engagement_level": 3,
  "decision_tendency": "...",
  "tone_hint": "..." 
}}
"""


def build_intent_detection_prompt_v3(query: str) -> str:
    """
    Baut den Prompt für Intent Detection v3.
    
    Args:
        query: Die User-Anfrage
    
    Returns:
        Formatierter Prompt
    """
    return INTENT_DETECTION_PROMPT_V3.format(query=query)


# =============================================================================
# RESPONSE TEMPLATES v3
# =============================================================================

RESPONSE_TEMPLATES_V3 = {
    "objection_price": {
        "neutral": "Das verstehe ich. Runtergebrochen sind das {daily_cost} am Tag. {value_add}",
        "direct": "{daily_cost}/Tag. {value_add}",
        "reassuring": "Ich verstehe, dass das erstmal viel klingt. Aber runtergebrochen sind das nur {daily_cost} am Tag – {comparison}. {value_add}",
        "value_focused": "Die Frage ist nicht was es kostet, sondern was es dir bringt: {value_proposition}. Runtergebrochen: {daily_cost}/Tag.",
        "evidence_based": "Lass uns mal rechnen: {daily_cost}/Tag, und dafür bekommst du {evidence}. {value_add}"
    },
    
    "objection_time": {
        "neutral": "Verstehe, Zeit ist knapp. Der Aufwand ist überschaubar: {effort}.",
        "direct": "{effort} – mehr nicht.",
        "reassuring": "Ich weiß, du hast viel um die Ohren. Deswegen ist das auch so designed, dass es {effort}. Kein Stress.",
        "value_focused": "Gerade WEIL du wenig Zeit hast: {efficiency_point}. {effort}.",
        "evidence_based": "Konkret: {effort}. Das zeigen auch die Erfahrungen anderer."
    },
    
    "objection_trust": {
        "neutral": "Die Skepsis ist verständlich. {proof_point}.",
        "direct": "Fair. {proof_point}. Du musst mir nichts glauben – {verification}.",
        "reassuring": "Ich verstehe die Vorsicht total. Genau deswegen bieten wir {proof_point}. Du musst mir nichts glauben.",
        "value_focused": "Gesunde Skepsis ist gut. Der Unterschied hier: {proof_point}.",
        "evidence_based": "{evidence}. Das ist kein Versprechen, das ist messbar: {verification}."
    },
    
    "usp": {
        "neutral": "{main_usp}. Das unterscheidet uns von {competitors}.",
        "direct": "{main_usp}. Punkt.",
        "reassuring": "Was uns wirklich unterscheidet: {main_usp}. Das bedeutet für dich: {benefit}.",
        "value_focused": "Der Kernunterschied: {main_usp}. Für dich heißt das: {benefit}.",
        "evidence_based": "{main_usp}. Das ist belegt durch: {evidence}."
    }
}


def get_response_template_v3(
    template_key: str, 
    tone: str = "neutral"
) -> Optional[str]:
    """
    Holt ein Response-Template für einen bestimmten Ton.
    
    Args:
        template_key: Key des Templates
        tone: Ton-Hinweis
    
    Returns:
        Template-String oder None
    """
    templates = RESPONSE_TEMPLATES_V3.get(template_key)
    if not templates:
        return None
    
    return templates.get(tone, templates.get("neutral"))


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LIVE_ASSIST_SYSTEM_PROMPT_V3",
    "INTENT_DETECTION_PROMPT_V3",
    "RESPONSE_TEMPLATES_V3",
    "build_live_assist_prompt_v3",
    "build_intent_detection_prompt_v3",
    "get_response_template_v3",
]

