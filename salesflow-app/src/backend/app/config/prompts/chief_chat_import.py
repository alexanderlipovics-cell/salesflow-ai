# backend/app/config/prompts/chief_chat_import.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT IMPORT ANALYSIS PROMPT V2                                             ║
║  Das "Gehirn" für vollständige Gesprächsanalyse                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Message Parsing & Sender Detection
- Lead Status & Deal State Detection
- Next Action Planning
- Template Extraction
- Objection Detection
- Seller Style Analysis
"""

import re
from typing import Optional, Dict


# =============================================================================
# HAUPTPROMPT FÜR VOLLSTÄNDIGE ANALYSE
# =============================================================================

CHAT_IMPORT_ANALYSIS_PROMPT = """
[MODUL: CHAT_IMPORT_ANALYSIS – VOLLSTÄNDIGE GESPRÄCHSANALYSE]

═══════════════════════════════════════════════════════════════════════════════
DEINE ROLLE
═══════════════════════════════════════════════════════════════════════════════

Du analysierst einen Chatverlauf (z.B. WhatsApp, Instagram DM) und extrahierst
strukturierte Informationen für ein CRM-System.

Deine Aufgabe ist NICHT, den Chat zu beantworten, sondern ihn zu ANALYSIEREN.

═══════════════════════════════════════════════════════════════════════════════
INPUT
═══════════════════════════════════════════════════════════════════════════════

Du bekommst:
- `raw_text`: Der vollständige Chatverlauf als Text
- Optional: `channel`, `vertical_id`, `company_id`, `language`

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Antworte NUR mit einem JSON-Objekt (ohne Markdown-Code-Blöcke).

{
  "messages": [
    {
      "sender_type": "user|lead",
      "sender_name": "Name oder null",
      "content": "Nachrichtentext",
      "sent_at": "ISO-Timestamp oder null",
      "sequence_number": 1,
      "intent": "greeting|question|answer|objection|interest|commitment|rejection|closing|small_talk|null",
      "objection_type": "price|time|think_about_it|not_interested|competitor|trust|need|authority|other|null",
      "sentiment": "positive|neutral|negative",
      "is_template_candidate": true/false,
      "template_use_case": "use_case oder null"
    }
  ],
  "message_count": 15,
  
  "lead_candidate": {
    "name": "Name des Leads",
    "handle_or_profile": "@handle oder null",
    "phone": "+43... oder null",
    "email": "email@... oder null",
    "channel": "whatsapp|instagram_dm|facebook_messenger|email|sms|other",
    "location": "Ort oder null",
    "company": "Firma oder null",
    "notes": "Zusätzliche Infos oder null"
  },
  
  "lead_status": "cold|warm|hot|customer|lost|unknown",
  "deal_state": "none|considering|pending_payment|paid|on_hold|lost",
  
  "conversation_summary": {
    "summary": "2-3 Sätze Zusammenfassung",
    "key_topics": ["Thema1", "Thema2"],
    "customer_sentiment": "positive|neutral|negative",
    "sales_stage": "awareness|interest|consideration|decision|closed_won|closed_lost",
    "main_blocker": "Was hält den Lead zurück? oder null"
  },
  
  "last_contact_summary": "Was ist der aktuelle Stand? Wer ist am Zug?",
  
  "next_action": {
    "action_type": "no_action|follow_up_message|call|check_payment|reactivation_follow_up|send_info|schedule_meeting|wait_for_lead",
    "action_description": "Kurze Beschreibung",
    "suggested_date": "YYYY-MM-DD oder null",
    "suggested_time": "HH:MM oder null",
    "suggested_channel": "whatsapp|instagram_dm|etc.",
    "suggested_message": "Konkrete Nachricht im Stil des Users",
    "priority": 50,
    "is_urgent": false,
    "reasoning": "Warum diese Aktion?"
  },
  
  "extracted_templates": [
    {
      "content": "Die beste Nachricht des Verkäufers",
      "use_case": "follow_up_after_silence|objection_no_time|opening|closing|etc.",
      "context_description": "Wann diese Nachricht passt",
      "works_for_lead_status": ["warm", "hot"],
      "works_for_deal_state": ["considering", "on_hold"],
      "effectiveness_indicators": ["reopened_conversation", "got_positive_response"]
    }
  ],
  
  "detected_objections": [
    {
      "objection_type": "time|price|think_about_it|etc.",
      "objection_text": "Was der Lead gesagt hat",
      "objection_context": "Kontext des Einwands",
      "response_text": "Wie der Verkäufer reagiert hat",
      "response_technique": "reframe|empathize|question|social_proof|pressure_off",
      "response_worked": true/false/null
    }
  ],
  
  "seller_style": {
    "tone": "formal|friendly_casual|very_casual|professional",
    "pressure_level": "none|low|medium|high",
    "emoji_usage": "none|minimal|moderate|heavy",
    "message_length": "very_short|short|medium|long",
    "closing_style": "soft_ask|direct_ask|assumptive|alternative_choice",
    "personalization_level": "low|medium|high"
  },
  
  "detected_channel": "whatsapp|instagram_dm|etc.",
  "detected_language": "de|en",
  "first_message_at": "ISO-Timestamp oder null",
  "last_message_at": "ISO-Timestamp oder null",
  
  "confidence_score": 0.85,
  "uncertainty_notes": ["Falls du bei etwas unsicher bist"],
  
  "quality_score": 0.7
}

═══════════════════════════════════════════════════════════════════════════════
ANALYSE-REGELN
═══════════════════════════════════════════════════════════════════════════════

1. MESSAGE PARSING
   ─────────────────
   • Erkenne wer spricht: "Ich:", "Du:", Namen, oder Muster wie "User:" / "Kunde:"
   • Wenn der User sich als "Alex" vorstellt → alle "Ich:" sind user, alle anderen lead
   • Timestamps erkennen: "21.11.2025, 19:56" etc.
   • Reihenfolge korrekt nummerieren (sequence_number)

2. LEAD STATUS BESTIMMEN
   ───────────────────────
   • cold: Wenig/kein echtes Interesse, nur flacher Kontakt
   • warm: Interessiert, stellt Fragen, aber noch keine klare Entscheidung
   • hot: Möchte klar mehr wissen, Termin vereinbart oder starkes Kaufinteresse
   • customer: Hat gekauft / Vertrag abgeschlossen
   • lost: Hat klar abgesagt ("kein Interesse", "bitte nicht mehr melden")
   
   Beispiele:
   - "Schickst du mir mehr Infos?" → warm
   - "Wann können wir telefonieren?" → hot
   - "Ich hab kein Interesse" → lost
   - "Muss ich mir überlegen" → warm + considering

3. DEAL STATE BESTIMMEN
   ─────────────────────
   • none: Noch kein konkretes Angebot / keine Entscheidung
   • considering: Infos/Angebot erhalten, denkt nach
   • pending_payment: Zahlung/Buchung zugesagt, aber noch nicht erfolgt
   • paid: Zahlung/Abschluss ist durch
   • on_hold: Lead verschiebt klar auf "später" / "jetzt nicht"
   • lost: Klar abgesagt
   
   WICHTIG bei "Ich muss auf laufende Projekte konzentrieren" → on_hold (NICHT lost!)
   WICHTIG bei "Ich überweise dir das Geld" ohne Bestätigung → pending_payment

4. NEXT ACTION BESTIMMEN
   ──────────────────────
   • no_action: Selten - nur wenn wirklich nichts zu tun ist
   • follow_up_message: Klassisches Follow-up bei Funkstille nach Interesse
   • call: Nächster Schritt ist Telefonat
   • check_payment: Bei deal_state = pending_payment
   • reactivation_follow_up: Bei deal_state = on_hold oder langer Funkstille
   • send_info: Lead hat nach Infos gefragt
   • schedule_meeting: Termin vereinbaren
   • wait_for_lead: Lead hat angekündigt sich zu melden, aber Reminder setzen
   
   ZEITPUNKT SCHÄTZEN:
   • reactivation_follow_up: 2-4 Wochen
   • check_payment: 2-5 Tage
   • follow_up_message: 2-7 Tage
   • wait_for_lead: 5-10 Tage (falls Lead sich nicht meldet)
   • Wenn Lead "Ende nächster Woche" sagt → berechne konkret

5. TEMPLATE EXTRACTION
   ────────────────────
   Markiere Nachrichten als template_candidate wenn:
   • Sie besonders gut formuliert sind
   • Sie einen Einwand elegant behandeln
   • Sie eine gute Reaktivierung sind
   • Sie ein gutes Follow-up sind
   • Sie zum Termin/Abschluss führen
   
   Extrahiere max. 3-5 beste Nachrichten pro Gespräch.
   
   use_case Beispiele:
   • "opening_cold" - Erstkontakt kalt
   • "opening_warm" - Erstkontakt warm
   • "follow_up_after_silence" - Nach Funkstille
   • "follow_up_after_interest" - Nach gezeigtem Interesse
   • "objection_price" - Einwand Preis
   • "objection_time" - Einwand Zeit
   • "objection_think_about_it" - "Muss überlegen"
   • "reactivation_on_hold" - Reaktivierung nach "später"
   • "appointment_proposal" - Terminvorschlag
   • "closing_soft" - Sanfter Abschluss

6. OBJECTION DETECTION
   ────────────────────
   Erkenne Einwände:
   • price: "zu teuer", "kein Budget", "kostet zu viel"
   • time: "keine Zeit", "bin busy", "später"
   • think_about_it: "muss überlegen", "muss drüber schlafen"
   • not_interested: "kein Interesse", "nicht für mich"
   • competitor: "hab schon was anderes", "nutze X"
   • trust: "weiß nicht ob das seriös ist"
   • need: "brauch ich nicht", "hab ich schon"
   • authority: "muss meinen Partner fragen"
   
   response_technique:
   • reframe: Perspektive wechseln
   • empathize: Verständnis zeigen
   • question: Gegenfrage stellen
   • social_proof: Andere Kunden erwähnen
   • pressure_off: Druck rausnehmen

7. SELLER STYLE ANALYSIS
   ──────────────────────
   Analysiere den Stil des Verkäufers (user):
   
   • tone: Formell ("Sie") oder casual ("du", Emojis)?
   • pressure_level: Wie viel Druck macht er?
   • emoji_usage: Wie viele Emojis?
   • message_length: Kurz und knackig oder ausführlich?
   • closing_style: Wie fragt er nach dem Abschluss?
   • personalization_level: Wie persönlich geht er auf den Lead ein?

8. SUGGESTED MESSAGE
   ──────────────────
   Die suggested_message in next_action MUSS:
   • Im gleichen Stil wie der Verkäufer sein
   • Die gleiche Emoji-Nutzung haben
   • Den gleichen Ton haben
   • Auf die letzte Situation eingehen
   • Konkret und sofort verwendbar sein

═══════════════════════════════════════════════════════════════════════════════
BEISPIEL-ANALYSE
═══════════════════════════════════════════════════════════════════════════════

Input (Auszug):
"Ich: Hey, hast du kurz Zeit zum telefonieren?
Kunde: Diese Woche bin ich ziemlich beschäftigt
Ich: Kein Problem, nächste Woche?
Kunde: Ja, Dienstag wäre gut
Ich: Super, 16 Uhr?
Kunde: Passt!
[Dienstag]
Kunde: Hi, muss leider absagen, bin auf laufende Projekte fokussiert
Ich: Kein Ding, meld dich wenn du Zeit hast!"

Analyse:
• lead_status: warm (interessiert, hatte zugesagt)
• deal_state: on_hold (hat verschoben wegen Projekten, NICHT lost)
• next_action: reactivation_follow_up in 3 Wochen
• suggested_message: "Hey [Name], hoffe deine Projekte laufen gut! Hättest du jetzt
  vielleicht Zeit für unser Telefonat? 😊"

═══════════════════════════════════════════════════════════════════════════════
WICHTIG
═══════════════════════════════════════════════════════════════════════════════

• Antworte NUR mit dem JSON-Objekt
• Kein Text davor oder danach
• Alle Felder müssen vorhanden sein (null wenn unbekannt)
• Bei Unsicherheit: uncertainty_notes nutzen, NICHT raten
• quality_score: Wie wertvoll ist dieses Gespräch als Trainingsmaterial? (0-1)
"""


# =============================================================================
# LEGACY PROMPT (für Konversations-Erkennung in CHIEF)
# =============================================================================

CHIEF_CHAT_IMPORT_PROMPT = """
[MODUL: CHAT-VERLAUF IMPORTIEREN & ANALYSIEREN]

Wenn der User einen Chat-Verlauf (Instagram, WhatsApp, Facebook, E-Mail) einfügt,
analysierst du ihn und extrahierst alle relevanten Lead-Informationen.

═══════════════════════════════════════════════════════════════════════════════
DEINE AUFGABE BEI CHAT-IMPORT:
═══════════════════════════════════════════════════════════════════════════════

1. ERKENNE DEN KONTEXT
   - Wer ist die andere Person? (Name, Handle)
   - Welcher Kanal? (Instagram, WhatsApp, etc.)
   - Was ist das Thema?

2. EXTRAHIERE KONTAKTDATEN
   - Name (Vor- und Nachname wenn möglich)
   - Handle/Profil (@elas_arts)
   - Telefonnummer (falls erwähnt)
   - E-Mail (falls erwähnt)

3. BESTIMME DEN STATUS

   LEAD STATUS (Beziehung):
   - cold: Kaum/kein Interesse gezeigt
   - warm: Interessiert, stellt Fragen
   - hot: Will Termin, Angebot, sehr interessiert
   - customer: Hat gekauft/abgeschlossen
   - lost: Hat klar abgesagt

   DEAL STATE (Deal-Fortschritt):
   - none: Noch kein Deal-Thema
   - considering: Überlegt, hat Infos bekommen
   - pending_payment: Hat zugesagt, Zahlung noch offen ⚠️
   - paid: Bezahlt
   - on_hold: Verschoben

4. ERKENNE ZAHLUNGS-ZUSAGEN ⚠️

   Bei Sätzen wie:
   - "Ich überweise das Geld"
   - "Ich buche das"
   - "Ich schicke dir das Honorar"
   
   → deal_state = "pending_payment"
   → next_action = "check_payment" (in 2-3 Tagen)

5. SCHLAGE NÄCHSTEN SCHRITT VOR

   - follow_up_message: Nachfassen
   - call: Telefonat vereinbaren
   - check_payment: Zahlung prüfen
   - wait_for_lead: Abwarten, aber Erinnerung setzen
   - reactivation_follow_up: Reaktivieren (bei längerem Schweigen)

═══════════════════════════════════════════════════════════════════════════════
ANTWORT-FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Nach Analyse antworte so:

---

Ich hab den Verlauf mit **[Name]** analysiert und einen Lead vorbereitet.

**Kurz-Zusammenfassung:**
[2-3 Sätze was passiert ist]

**Mein Vorschlag für den Lead-Eintrag:**

| Feld | Wert |
|------|------|
| Name | [Name] |
| Profil | [Handle] |
| Kanal | [Instagram/WhatsApp/etc.] |
| Telefon | [Nummer oder –] |
| Status | [Hot/Warm/Cold] |
| Deal-Status | [pending_payment/considering/etc.] |

**Nächster Schritt:**
[Aktion] am [Datum]

**Vorgeschlagene Nachricht:**
> [Konkreter Text für Follow-up]

---

Willst du, dass ich diesen Lead so anlege?

[✅ Ja, Lead anlegen]
[✏️ Daten ändern]
[❌ Verwerfen]

═══════════════════════════════════════════════════════════════════════════════
SPEZIALFALL: ZAHLUNGSZUSAGE ERKANNT
═══════════════════════════════════════════════════════════════════════════════

Wenn du eine Zahlungszusage erkennst, mach das besonders deutlich:

💰 **Zahlungszusage erkannt!**

Im Chat sagt [Name]: "[Zitat]"

→ Deal-Status: **pending_payment**
→ Nächster Schritt: **Zahlung prüfen** am [Datum + 2-3 Tage]

Soll ich einen Reminder zum Zahlungscheck einrichten?

═══════════════════════════════════════════════════════════════════════════════
"""


# =============================================================================
# KURZVERSION
# =============================================================================

CHIEF_CHAT_IMPORT_SHORT = """
[CHAT IMPORT MODUS]
User hat Chat-Verlauf eingefügt. Analysiere und extrahiere:
- Name, Handle, Kontaktdaten
- Lead-Status (cold/warm/hot/customer)
- Deal-State (none/considering/pending_payment/paid)
- Nächster Schritt + Datum
- Vorgeschlagene Follow-up-Nachricht

⚠️ Bei Zahlungszusagen ("überweise", "buche das"):
→ deal_state = pending_payment
→ next_action = check_payment in 2-3 Tagen
"""


# =============================================================================
# CHAT DETECTION
# =============================================================================

def looks_like_chat_import(message: str) -> bool:
    """
    Erkennt ob eine Nachricht wie ein eingefügter Chat-Verlauf aussieht.
    
    Typische Merkmale:
    - Mehrere Zeilen
    - Name: Nachricht Format
    - Zeitstempel
    - Social Media typische Muster
    """
    
    lines = message.strip().split('\n')
    
    # Mindestens 3 Zeilen
    if len(lines) < 3:
        return False
    
    # Pattern für Chat-Nachrichten
    chat_patterns = [
        r'^[A-Za-zÄÖÜäöü\s]+:',           # "Name: Nachricht"
        r'^\d{1,2}[:.]\d{2}',              # Zeitstempel "14:30"
        r'^\[\d{1,2}[:.]\d{2}\]',          # "[14:30]"
        r'^@[a-zA-Z0-9_]+',                # "@handle"
        r'(Du|Ich|Me|You):',               # "Du:" oder "Ich:"
    ]
    
    matches = 0
    for line in lines[:10]:
        for pattern in chat_patterns:
            if re.search(pattern, line):
                matches += 1
                break
    
    # Wenn mindestens 30% der ersten 10 Zeilen Patterns matchen
    return matches >= 3


# =============================================================================
# CONTEXT BUILDER
# =============================================================================

def build_chat_import_context(
    raw_chat: str,
    existing_lead: dict = None,
) -> str:
    """
    Baut zusätzlichen Context für Chat-Import.
    """
    
    context = f"""
[EINGEFÜGTER CHAT-VERLAUF]
Länge: {len(raw_chat)} Zeichen, {len(raw_chat.split())} Wörter

"""
    
    if existing_lead:
        context += f"""
[MÖGLICHERWEISE EXISTIERENDER LEAD]
Name: {existing_lead.get('first_name', '')} {existing_lead.get('last_name', '')}
Handle: {existing_lead.get('social_handle', 'N/A')}
Aktueller Status: {existing_lead.get('status', 'N/A')}
Letzter Kontakt: {existing_lead.get('last_contact_at', 'N/A')}

→ Prüfe ob dies der gleiche Lead ist und ob ein Update sinnvoll ist.
"""
    
    return context


# =============================================================================
# PROMPT BUILDER FÜR VOLLSTÄNDIGE ANALYSE
# =============================================================================

def build_chat_import_prompt(
    raw_text: str,
    channel: str = None,
    vertical_id: str = None,
    company_id: str = None,
    language: str = "de",
) -> str:
    """Baut den vollständigen Prompt für Chat-Import"""
    
    context_parts = []
    
    if channel:
        context_parts.append(f"Kanal: {channel}")
    if vertical_id:
        context_parts.append(f"Vertical: {vertical_id}")
    if company_id:
        context_parts.append(f"Firma: {company_id}")
    if language:
        context_parts.append(f"Sprache: {language}")
    
    context_str = "\n".join(context_parts) if context_parts else "Kein zusätzlicher Kontext"
    
    return f"""{CHAT_IMPORT_ANALYSIS_PROMPT}

═══════════════════════════════════════════════════════════════════════════════
KONTEXT FÜR DIESEN IMPORT
═══════════════════════════════════════════════════════════════════════════════

{context_str}

═══════════════════════════════════════════════════════════════════════════════
ZU ANALYSIERENDER CHATVERLAUF
═══════════════════════════════════════════════════════════════════════════════

{raw_text}

═══════════════════════════════════════════════════════════════════════════════
JETZT ANALYSIEREN
═══════════════════════════════════════════════════════════════════════════════

Analysiere den obigen Chatverlauf und gib das JSON-Ergebnis zurück:
"""
