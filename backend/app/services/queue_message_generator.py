"""
CHIEF Queue Message Generator
High-Level AI-powered message generation for follow-up sequences
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Psychologie pro State - was der Lead denkt/fühlt
STATE_PSYCHOLOGY = {
    "new": {
        "mindset": "Neugierig aber skeptisch. Kennt dich noch nicht. Wird täglich von vielen angeschrieben.",
        "goal": "Aus der Masse herausstechen, echtes Interesse zeigen, Neugier wecken",
        "tone": "Authentisch, persönlich, interessiert an IHREM Leben - nicht deinem Produkt",
        "avoid": "Produkt-Pitches, Copy-Paste Gefühl, zu viel über dich reden",
        "success_metric": "Antwort bekommen",
    },
    "engaged": {
        "mindset": "Hat Interesse gezeigt. Will verstehen ob es für sie/ihn passt. Vergleicht vielleicht.",
        "goal": "Wert demonstrieren ohne zu pushen, als Experte positionieren, Vertrauen vertiefen",
        "tone": "Hilfreich, informativ, geduldig, beratend statt verkaufend",
        "avoid": "Zu früh auf Abschluss drängen, Informationsflut, ungeduldig wirken",
        "success_metric": "Termin oder konkrete nächste Frage",
    },
    "opportunity": {
        "mindset": "Kurz vor Entscheidung. Hat letzte Zweifel oder braucht nur den letzten Anstoß.",
        "goal": "Entscheidung erleichtern, Risiko minimieren, sanfte Dringlichkeit",
        "tone": "Selbstbewusst, unterstützend, Klarheit gebend",
        "avoid": "Verzweifelt wirken, Druck der abschreckt, zu viele neue Infos",
        "success_metric": "Abschluss oder klares Commitment",
    },
    "won": {
        "mindset": "Ist Kunde. Erfahrung bestimmt ob loyal oder enttäuscht. Offen für mehr wenn happy.",
        "goal": "Beziehung pflegen, Erfolge feiern, langfristigen Wert aufbauen",
        "tone": "Wertschätzend, persönlich, als Partner auf Augenhöhe",
        "avoid": "Sofort nächsten Sale pushen, transaktional wirken, ignorieren nach Kauf",
        "success_metric": "Wiederkauf oder Empfehlung",
    },
    "lost": {
        "mindset": "Hat nein gesagt. Gründe können sich geändert haben. Will nicht belästigt werden.",
        "goal": "Sanft Tür offen halten, neuen Mehrwert bieten, Timing respektieren",
        "tone": "Respektvoll, nicht aufdringlich, wertschätzend trotz Ablehnung",
        "avoid": "Vorwürfe, Guilt-Tripping, sofort wieder pitchen, zu häufig melden",
        "success_metric": "Positive Reaktion, zweite Chance",
    },
    "dormant": {
        "mindset": "Lange nichts gehört. Hat dich vielleicht vergessen. Leben hat sich verändert.",
        "goal": "Wieder relevant werden, sanft erinnern, neuen Anlass bieten",
        "tone": "Locker, freundlich, ohne Erwartungsdruck, neugierig auf ihr Leben",
        "avoid": "So tun als wäre nichts gewesen, zu formell, zu verkäuferisch",
        "success_metric": "Wieder im Gespräch sein",
    },
}

# Template-spezifische Anweisungen mit Beispiel-Strukturen
TEMPLATE_PROMPTS = {
    # === NEW STATE ===
    "mlm_first_contact": {
        "intent": "Allererster Kontakt - muss aus der Masse herausstechen",
        "structure": """
        1. Persönlicher Hook (beziehe dich auf ihr Profil/Post/Story)
        2. Echte Neugier zeigen (eine Frage über SIE)
        3. Kein Pitch, kein Produkt, nur Mensch zu Mensch
        """,
        "example_angles": [
            "Auf einen Post/Story reagieren",
            "Gemeinsamkeit finden",
            "Ihre Arbeit/Passion würdigen",
        ],
        "max_length": "2-3 kurze Sätze",
    },
    "mlm_curiosity_hook": {
        "intent": "Zweiter Kontakt wenn keine Antwort - Neugier wecken",
        "structure": """
        1. Kurzer, intrigierender Einstieg
        2. Etwas Interessantes teilen (Ergebnis, Insight)
        3. Offene Frage die zum Antworten einlädt
        """,
        "example_angles": [
            "Interessante Beobachtung teilen",
            "Ergebnis eines Kunden erwähnen (ohne Pitch)",
            "Relevante Frage zu ihrem Bereich",
        ],
        "max_length": "2-3 Sätze",
    },
    "mlm_soft_reminder": {
        "intent": "Dritter sanfter Reminder - letzte Chance in New Phase",
        "structure": """
        1. Locker, ohne Druck
        2. Tür offen lassen
        3. Einfacher Call-to-Action
        """,
        "example_angles": [
            "Kurz und direkt fragen ob Interesse",
            "Alternative anbieten (später melden)",
            "Humorvoll die Stille ansprechen",
        ],
        "max_length": "1-2 Sätze",
    },
    
    # === ENGAGED STATE ===
    "mlm_product_info": {
        "intent": "Deep-Dive - Sie wollen mehr wissen",
        "structure": """
        1. An vorheriges Gespräch anknüpfen
        2. Relevanten Wert/Nutzen erklären (für IHRE Situation)
        3. Nächsten Schritt vorschlagen
        """,
        "example_angles": [
            "Spezifischen Nutzen für ihre Situation",
            "Wie andere in ähnlicher Lage profitiert haben",
            "Antwort auf eine Frage die sie hatten",
        ],
        "max_length": "3-4 Sätze",
    },
    "mlm_testimonial": {
        "intent": "Social Proof - Vertrauen durch Erfolgsgeschichten",
        "structure": """
        1. Relevante Erfolgsgeschichte (ähnliche Person)
        2. Konkretes Ergebnis
        3. Brücke zu ihrer Situation
        """,
        "example_angles": [
            "Kunde mit ähnlichem Hintergrund",
            "Überraschendes Ergebnis",
            "Transformation die resoniert",
        ],
        "max_length": "3-4 Sätze",
    },
    "mlm_limited_offer": {
        "intent": "Sanfte Dringlichkeit - zum Handeln bewegen",
        "structure": """
        1. Zeitlich begrenzter Anlass (authentisch, nicht fake)
        2. Konkreter Vorteil jetzt zu handeln
        3. Einfacher nächster Schritt
        """,
        "example_angles": [
            "Echtes zeitlich begrenztes Angebot",
            "Persönliche Verfügbarkeit diese Woche",
            "Bonus der bald ausläuft",
        ],
        "max_length": "2-3 Sätze",
    },
    
    # === OPPORTUNITY STATE ===
    "mlm_final_push": {
        "intent": "Closing - sie sind fast soweit",
        "structure": """
        1. Zusammenfassung warum es passt
        2. Letzte Bedenken adressieren
        3. Klarer, einfacher Abschluss-CTA
        """,
        "example_angles": [
            "Recap der Benefits für sie",
            "Risiko-Umkehr (Garantie, Testphase)",
            "Direkt fragen ob sie starten wollen",
        ],
        "max_length": "3-4 Sätze",
    },
    "mlm_handle_doubt": {
        "intent": "Einwand-Behandlung - Zweifel ausräumen",
        "structure": """
        1. Verständnis für Bedenken zeigen
        2. Direkt und ehrlich adressieren
        3. Perspektivwechsel oder Lösung bieten
        """,
        "example_angles": [
            "Häufige Bedenken vorwegnehmen",
            "Ehrliche Antwort ohne Übertreibung",
            "Alternative Sichtweise anbieten",
        ],
        "max_length": "3-4 Sätze",
    },
    "mlm_last_chance": {
        "intent": "Letzter Versuch vor Lost - alles oder nichts",
        "structure": """
        1. Direkt und ehrlich
        2. Respekt für ihre Entscheidung zeigen
        3. Tür offen lassen für später
        """,
        "example_angles": [
            "Ehrlich fragen was sie zurückhält",
            "Akzeptieren wenn nicht der richtige Zeitpunkt",
            "Angebot für späteren Kontakt",
        ],
        "max_length": "2-3 Sätze",
    },
    
    # === WON STATE ===
    "mlm_welcome_checkin": {
        "intent": "Onboarding Check-in - Erfolg sicherstellen",
        "structure": """
        1. Persönliche Gratulation/Willkommen
        2. Frage nach ersten Erfahrungen
        3. Hilfe anbieten
        """,
        "example_angles": [
            "Erste Woche erfragen",
            "Tipps für besten Start geben",
            "Für Fragen da sein",
        ],
        "max_length": "2-3 Sätze",
    },
    "mlm_product_reorder": {
        "intent": "Nachbestellung - rechtzeitig erinnern",
        "structure": """
        1. An positives Erlebnis anknüpfen
        2. Rechtzeitig auf Nachschub hinweisen
        3. Einfache Bestellmöglichkeit
        """,
        "example_angles": [
            "Fragen wie es mit Produkt läuft",
            "Rechtzeitig vor leer werden",
            "Vorteil für Abo/Repeat",
        ],
        "max_length": "2-3 Sätze",
    },
    "mlm_upgrade_offer": {
        "intent": "Upsell - mehr Wert anbieten",
        "structure": """
        1. Erfolg würdigen
        2. Passende Erweiterung vorschlagen
        3. Konkreten Mehrwert erklären
        """,
        "example_angles": [
            "Basierend auf ihrer Nutzung empfehlen",
            "Premium/Erweiterung die Sinn macht",
            "Exklusiver Kunden-Vorteil",
        ],
        "max_length": "3-4 Sätze",
    },
    
    # === LOST STATE ===
    "mlm_soft_return": {
        "intent": "Sanfte Rückkehr - nach Ablehnung wieder melden",
        "structure": """
        1. Zeit respektieren die vergangen ist
        2. Neuen Anlass/Wert bieten
        3. Keine Erwartung, nur Tür öffnen
        """,
        "example_angles": [
            "Etwas Neues das relevant sein könnte",
            "Einfach mal wieder hören wie es geht",
            "Interessanter Content/Insight teilen",
        ],
        "max_length": "2-3 Sätze",
    },
    "mlm_new_product_info": {
        "intent": "Neuer Wert - vielleicht passt das besser",
        "structure": """
        1. Neues Angebot/Produkt vorstellen
        2. Warum es für sie relevant sein könnte
        3. Unverbindlich, kein Druck
        """,
        "example_angles": [
            "Neues Produkt das anders ist",
            "Geändertes Angebot/Preismodell",
            "Andere Einstiegsmöglichkeit",
        ],
        "max_length": "2-3 Sätze",
    },
    
    # === DORMANT STATE ===
    "mlm_quarterly_checkin": {
        "intent": "Quartals-Check - wieder auf dem Radar",
        "structure": """
        1. Lockerer, freundlicher Einstieg
        2. Echtes Interesse an ihrem Leben/Business
        3. Keine Sales-Agenda
        """,
        "example_angles": [
            "Einfach mal hören wie es läuft",
            "Auf ihre Posts/Updates reagieren",
            "Saisonaler Anlass (Neujahr, Sommer, etc.)",
        ],
        "max_length": "2-3 Sätze",
    },
    "mlm_special_comeback": {
        "intent": "Special Comeback - besonderer Anlass für Reaktivierung",
        "structure": """
        1. Spezieller Anlass (Event, Aktion, Änderung)
        2. Warum sie es wissen sollten
        3. Einladung ohne Druck
        """,
        "example_angles": [
            "Großes Event/Launch",
            "Besondere einmalige Aktion",
            "Persönliche Einladung",
        ],
        "max_length": "2-3 Sätze",
    },
}


def build_queue_message_prompt(
    lead: Dict[str, Any],
    template_key: str,
    state: str,
    user_patterns: List[Dict[str, Any]] = None,
    interaction_history: List[Dict[str, Any]] = None,
) -> str:
    """
    Baut einen hochoptimierten Prompt für die Nachrichtengenerierung.
    """
    
    # State Psychology
    psychology = STATE_PSYCHOLOGY.get(state, STATE_PSYCHOLOGY["new"])
    
    # Template Info
    template = TEMPLATE_PROMPTS.get(template_key, {})
    
    # Lead Kontext aufbauen
    lead_name = lead.get("name", "").split()[0] if lead.get("name") else "du"
    lead_context = f"""
LEAD INFORMATIONEN:
- Name: {lead.get('name', 'Unbekannt')}
- Quelle: {lead.get('source', lead.get('instagram', 'Unbekannt'))}
- Firma: {lead.get('company', 'Nicht angegeben')}
- Position: {lead.get('position', 'Nicht angegeben')}
- Instagram: {lead.get('instagram', 'Nicht vorhanden')}
- Notizen: {lead.get('notes', 'Keine')}
"""

    # Interaktions-History
    history_context = ""
    if interaction_history:
        history_context = "\nLETZTE INTERAKTIONEN:\n"
        for interaction in interaction_history[-5:]:  # Letzte 5
            history_context += f"- {interaction.get('type', 'Kontakt')}: {interaction.get('notes', '')[:100]}\n"
    
    # User Patterns (gelernte Präferenzen)
    pattern_context = ""
    if user_patterns:
        pattern_context = "\nGELERNTE USER-PRÄFERENZEN:\n"
        for pattern in user_patterns:
            pattern_context += f"- {pattern.get('instruction', '')}\n"
    
    # Template-spezifische Anweisungen
    template_instructions = ""
    if template:
        template_instructions = f"""
TEMPLATE: {template_key}
INTENT: {template.get('intent', '')}

STRUKTUR:
{template.get('structure', '')}

MÖGLICHE ANSÄTZE:
{chr(10).join('- ' + angle for angle in template.get('example_angles', []))}

LÄNGE: {template.get('max_length', '2-3 Sätze')}
"""

    # Haupt-Prompt
    prompt = f"""Du bist CHIEF, ein Elite-Sales-Coach der Nachrichten schreibt die wirklich konvertieren.

=== PSYCHOLOGIE FÜR "{state.upper()}" STATE ===
Mindset des Leads: {psychology['mindset']}
Dein Ziel: {psychology['goal']}
Ton: {psychology['tone']}
VERMEIDE: {psychology['avoid']}
Erfolgsmessung: {psychology['success_metric']}

{lead_context}
{history_context}
{pattern_context}
{template_instructions}

=== DEINE AUFGABE ===
Schreibe eine Nachricht für {lead_name} die:
1. Sich NATÜRLICH anfühlt (kein Bot, kein Template)
2. IHRE Situation/Interessen anspricht
3. Den nächsten logischen Schritt ermöglicht
4. Emojis nutzt aber dezent (1-2 max)

WICHTIG:
- Schreibe wie ein echter Mensch, nicht wie ein Verkäufer
- Kurz und prägnant - Respektiere ihre Zeit
- Personalisiere basierend auf dem was du weißt
- Keine "Ich hoffe es geht dir gut" Floskeln
- Antworte NUR mit der Nachricht, keine Erklärungen

NACHRICHT:"""

    return prompt


async def generate_queue_message(
    db,
    queue_id: str,
    user_id: str,
    ai_client,
) -> Dict[str, Any]:
    """
    Generiert eine Nachricht für ein Queue Item und speichert sie.
    """
    
    try:
        # 1. Queue Item mit Cycle laden
        queue_result = db.table("contact_follow_up_queue")\
            .select("*, follow_up_cycles(*)")\
            .eq("id", queue_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not queue_result.data:
            return {"success": False, "error": "Queue item not found"}
        
        queue_item = queue_result.data
        cycle = queue_item.get("follow_up_cycles", {})
        contact_id = queue_item.get("contact_id")
        
        # 2. Lead-Daten separat laden
        if not contact_id:
            return {"success": False, "error": "Contact ID not found in queue item"}
        
        lead_result = db.table("leads")\
            .select("*")\
            .eq("id", contact_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not lead_result.data:
            return {"success": False, "error": "Lead not found"}
        
        lead = lead_result.data
        
        # 3. User Patterns laden (gelernte Präferenzen)
        patterns = []
        try:
            patterns_result = db.table("chief_learned_patterns")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("pattern_type", "auto_apply")\
                .execute()
            patterns = patterns_result.data or []
        except Exception:
            pass
        
        # 4. Interaktions-History laden
        history = []
        try:
            history_result = db.table("lead_activities")\
                .select("*")\
                .eq("lead_id", lead.get("id"))\
                .order("created_at", desc=True)\
                .limit(5)\
                .execute()
            history = history_result.data or []
        except Exception:
            pass
        
        # 5. Prompt bauen
        prompt = build_queue_message_prompt(
            lead=lead,
            template_key=cycle.get("template_key", "mlm_first_contact"),
            state=queue_item.get("current_state", "new"),
            user_patterns=patterns,
            interaction_history=history,
        )
        
        # 6. AI generieren
        message = await ai_client.generate_async(
            system_prompt="Du bist CHIEF, ein Elite-Sales-Coach. Du schreibst Nachrichten die natürlich klingen und konvertieren.",
            messages=[{"role": "user", "content": prompt}],
        )
        
        generated_message = message.strip()
        
        # 7. In DB speichern
        db.table("contact_follow_up_queue")\
            .update({"ai_generated_content": generated_message})\
            .eq("id", queue_id)\
            .execute()
        
        return {
            "success": True,
            "message": generated_message,
            "queue_id": queue_id,
            "template_key": cycle.get("template_key"),
            "state": queue_item.get("current_state"),
            "lead_name": lead.get("name"),
        }
        
    except Exception as e:
        logger.error(f"Error generating queue message: {e}")
        return {"success": False, "error": str(e)}

