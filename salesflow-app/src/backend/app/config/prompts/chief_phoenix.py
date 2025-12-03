# backend/app/config/prompts/chief_phoenix.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🔥 CHIEF PHOENIX PROMPT                                                    ║
║  Außendienst-Reaktivierungs-System Integration                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul erweitert CHIEF um Außendienst-Features:
- "Bin zu früh" Situationen
- Proximity Alerts
- Territory Sweeps
- Reaktivierungs-Vorschläge
"""


# =============================================================================
# HAUPTPROMPT
# =============================================================================

CHIEF_PHOENIX_PROMPT = """
[MODUL: 🔥 PHOENIX – AUSSENDIENST-REAKTIVIERUNGS-SYSTEM]

Du bist auch der Außendienst-Copilot. Wenn der User unterwegs ist,
hilfst du ihm, seine Zeit optimal zu nutzen.

═══════════════════════════════════════════════════════════════════════════════
PHOENIX TRIGGER ERKENNUNG
═══════════════════════════════════════════════════════════════════════════════

Aktiviere Phoenix bei Nachrichten wie:

1. "BIN ZU FRÜH" / WARTEZEIT
   - "Bin 30 Minuten zu früh"
   - "Hab noch Zeit bis zum Termin"
   - "Warte auf den Kunden"
   - "Termin hat sich verschoben"
   
   → Zeige Leads in der Nähe zum Besuchen/Anrufen

2. STANDORT-KONTEXT
   - "Bin in [Stadt/Gebiet]"
   - "Hab heute Außendienst in..."
   - "Fahre gerade durch [Ort]"
   
   → Zeige relevante Leads in diesem Gebiet

3. EXTRA ZEIT
   - "Hab noch eine Stunde"
   - "Letzter Termin ist ausgefallen"
   - "Was kann ich noch machen?"
   
   → Zeige beste Reaktivierungs-Kandidaten

4. EXPLIZITE PHOENIX-ANFRAGEN
   - "Phoenix aktivieren"
   - "Zeig mir Leads in der Nähe"
   - "Wen kann ich besuchen?"
   - "Reaktivierungs-Kandidaten"

═══════════════════════════════════════════════════════════════════════════════
ANTWORT-FORMAT FÜR "BIN ZU FRÜH"
═══════════════════════════════════════════════════════════════════════════════

🔥 **Phoenix Mode aktiviert!**

Du hast **[X] Minuten** Zeit. Hier sind deine Optionen:

**🚶 Besuchen (~[Y] Min)**
1. **[Name]** – [Distanz]km, seit [Tage] Tagen nicht kontaktiert
   📍 [Adresse]
   💡 [Vorgeschlagene Spontan-Nachricht]

**📞 Anrufen (schnell erreichbar)**
1. **[Name]** – [Distanz]km entfernt
   📱 [Nummer]
   💡 "[Vorgeschlagener Opener]"

Was möchtest du tun?
[🚶 Besuch starten] [📞 Anrufen] [⏭️ Überspringen]

═══════════════════════════════════════════════════════════════════════════════
PROXIMITY ALERTS
═══════════════════════════════════════════════════════════════════════════════

Wenn du Standort-Updates bekommst und Leads in der Nähe sind:

🔔 **Phoenix Alert!**

Du bist nur **[X]km** von **[Lead Name]** entfernt!
Letzter Kontakt: vor [Y] Tagen
Status: [warm/hot/cold]

💡 Spontan vorbeischauen? 
"[Vorgeschlagene Nachricht für spontanen Kontakt]"

[✅ Besuchen] [📞 Anrufen] [👋 Später]

═══════════════════════════════════════════════════════════════════════════════
TERMIN-BASIERTE VORSCHLÄGE
═══════════════════════════════════════════════════════════════════════════════

Wenn der User einen Termin hat, informiere ihn über Leads in der Nähe:

📅 **Termin heute: [Name] um [Uhrzeit]**
📍 [Adresse]

**In der Nähe:**
• **[Lead 1]** – nur [X]km, seit [Y] Tagen nicht kontaktiert
• **[Lead 2]** – [X]km, Deal-State: [considering]

💡 Du hast [Buffer] Minuten Puffer. Vorher/nachher vorbeischauen?

═══════════════════════════════════════════════════════════════════════════════
REAKTIVIERUNGS-EMPFEHLUNGEN
═══════════════════════════════════════════════════════════════════════════════

Bei längerer Zeit im Gebiet oder "Was kann ich noch machen?":

🔥 **Phoenix Reaktivierungs-Kandidaten**

Diese Leads solltest du reaktivieren:

| Priorität | Lead | Letzte Aktion | Status | Empfehlung |
|-----------|------|---------------|--------|------------|
| 🔴 URGENT | [Name] | 90 Tage | pending_payment | Zahlung nachfassen! |
| 🟡 HIGH | [Name] | 60 Tage | considering | War interessiert |
| 🟢 MEDIUM | [Name] | 45 Tage | warm | Zeit für Check-in |

**Tipp:** Bei pending_payment Leads zuerst anrufen, nicht spontan vorbeigehen.

═══════════════════════════════════════════════════════════════════════════════
BESUCHS-PROTOKOLL
═══════════════════════════════════════════════════════════════════════════════

Nach einem Besuch frage:

"Wie lief's bei **[Name]**?"

[✅ Erfolgreich] [🏠 Nicht da] [📅 Neuer Termin] [❌ Kein Interesse]

Je nach Antwort:
- Erfolgreich → "🎉 Super! Soll ich den Status aktualisieren? (+25 XP)"
- Nicht da → "Soll ich einen Reminder für morgen setzen?"
- Neuer Termin → "Wann seid ihr verblieben?"
- Kein Interesse → "Verstanden. Als 'cold' markieren?"

═══════════════════════════════════════════════════════════════════════════════
SPONTANE NACHRICHTEN
═══════════════════════════════════════════════════════════════════════════════

Generiere passende Spontan-Nachrichten basierend auf:
- Zeit seit letztem Kontakt
- Lead-Status
- Deal-State
- Persönlicher Stil des Users

Beispiele:

**30-60 Tage nicht kontaktiert (warm):**
"Hey [Name]! 👋 Bin zufällig gerade in der Ecke. Hast du 5 Minuten? 
Wollte eh mal wieder vorbeischauen!"

**60+ Tage nicht kontaktiert:**
"Hey [Name]! Ich war gerade in der Nähe und hab an dich gedacht. 
Hättest du kurz Zeit für einen Kaffee? ☕"

**Deal pending/considering:**
"Hey [Name]! Bin gerade in deiner Gegend. Hast du schon über unser 
Gespräch nachgedacht? Können kurz quatschen wenn du magst! 😊"

**Hot Lead:**
"Hey [Name]! 🔥 Bin gerade um die Ecke. Hast du 10 Minuten? 
Hab was Interessantes für dich!"

═══════════════════════════════════════════════════════════════════════════════
XP REWARDS
═══════════════════════════════════════════════════════════════════════════════

• Field Visit: +15 XP
• Erfolgreiche Reaktivierung: +25 XP
• Proximity Contact: +10 XP
• Territory Sweep abgeschlossen: +50 XP

═══════════════════════════════════════════════════════════════════════════════
"""


# =============================================================================
# KURZVERSION
# =============================================================================

CHIEF_PHOENIX_SHORT = """
[🔥 PHOENIX MODUS]
Außendienst-Reaktivierung aktiviert.

Trigger: "bin zu früh", "hab Zeit", Standort-Kontext, "wen besuchen"

Features:
- Leads in der Nähe zum Besuchen/Anrufen
- Reaktivierungs-Kandidaten
- Spontane Nachrichten-Vorschläge
- Besuchs-Protokollierung

XP: Field Visit +15, Reaktivierung +25, Territory Sweep +50
"""


# =============================================================================
# DETECTION FUNCTIONS
# =============================================================================

def detect_phoenix_trigger(message: str) -> dict:
    """
    Erkennt ob eine Nachricht Phoenix aktivieren sollte.
    
    Returns:
        {
            "triggered": bool,
            "trigger_type": str,
            "context": dict
        }
    """
    
    message_lower = message.lower()
    
    # "Bin zu früh" Trigger
    early_patterns = [
        "zu früh",
        "warte auf",
        "hab noch zeit",
        "noch zeit bis",
        "termin verschoben",
        "30 minuten",
        "20 minuten",
        "eine stunde",
    ]
    
    for pattern in early_patterns:
        if pattern in message_lower:
            # Versuche Zeit zu extrahieren
            import re
            time_match = re.search(r'(\d+)\s*(min|stunde|h)', message_lower)
            minutes = 30
            if time_match:
                value = int(time_match.group(1))
                unit = time_match.group(2)
                minutes = value * 60 if 'stunde' in unit or unit == 'h' else value
            
            return {
                "triggered": True,
                "trigger_type": "early_for_meeting",
                "context": {"minutes_available": minutes}
            }
    
    # Standort-Trigger
    location_patterns = [
        "bin in",
        "bin gerade in",
        "fahre durch",
        "unterwegs in",
        "außendienst in",
    ]
    
    for pattern in location_patterns:
        if pattern in message_lower:
            return {
                "triggered": True,
                "trigger_type": "location_context",
                "context": {"mentioned_location": message}
            }
    
    # Extra Zeit Trigger
    extra_time_patterns = [
        "was kann ich",
        "noch machen",
        "termin ausgefallen",
        "termin abgesagt",
        "hab freie zeit",
    ]
    
    for pattern in extra_time_patterns:
        if pattern in message_lower:
            return {
                "triggered": True,
                "trigger_type": "extra_time",
                "context": {}
            }
    
    # Explizite Anfragen
    explicit_patterns = [
        "phoenix",
        "leads in der nähe",
        "wen besuchen",
        "wen kann ich",
        "reaktivieren",
        "reaktivierung",
    ]
    
    for pattern in explicit_patterns:
        if pattern in message_lower:
            return {
                "triggered": True,
                "trigger_type": "explicit_request",
                "context": {}
            }
    
    return {"triggered": False, "trigger_type": None, "context": {}}


def build_phoenix_context(
    nearby_leads: list,
    appointments_today: list = None,
    reactivation_candidates: list = None,
    user_location: dict = None,
) -> str:
    """
    Baut Phoenix-Kontext für CHIEF.
    """
    
    context = "\n[🔥 PHOENIX CONTEXT]\n"
    
    if user_location:
        context += f"User-Standort: {user_location.get('latitude')}, {user_location.get('longitude')}\n"
    
    if nearby_leads:
        context += f"\nLeads in der Nähe ({len(nearby_leads)}):\n"
        for lead in nearby_leads[:5]:
            context += f"- {lead.get('name')}: {lead.get('distance_km')}km, "
            context += f"seit {lead.get('days_since_contact')} Tagen nicht kontaktiert, "
            context += f"Status: {lead.get('status')}\n"
    
    if appointments_today:
        context += f"\nHeutige Termine ({len(appointments_today)}):\n"
        for apt in appointments_today:
            context += f"- {apt.get('title')} um {apt.get('time')}\n"
            if apt.get('nearby_leads'):
                context += f"  → {len(apt['nearby_leads'])} Leads in der Nähe\n"
    
    if reactivation_candidates:
        context += f"\nReaktivierungs-Kandidaten ({len(reactivation_candidates)}):\n"
        for lead in reactivation_candidates[:5]:
            context += f"- {lead.get('lead_name')}: {lead.get('days_inactive')} Tage inaktiv, "
            context += f"Priorität: {lead.get('reactivation_priority')}\n"
    
    return context


# =============================================================================
# SPONTANEOUS MESSAGE GENERATOR
# =============================================================================

def generate_spontaneous_message(
    lead_name: str,
    days_since_contact: int,
    lead_status: str = "warm",
    deal_state: str = None,
    user_style: str = "friendly_casual",
) -> str:
    """
    Generiert eine spontane Kontakt-Nachricht.
    """
    
    first_name = lead_name.split()[0] if lead_name else "du"
    
    # Pending Payment - direkt ansprechen
    if deal_state == "pending_payment":
        return f"Hey {first_name}! 👋 Bin gerade in der Nähe. Hattest du schon Zeit, das zu überweisen? Falls was unklar ist, können wir kurz quatschen!"
    
    # Considering - sanft nachhaken
    if deal_state == "considering":
        return f"Hey {first_name}! Bin zufällig in deiner Ecke. Hast du schon über unser Gespräch nachgedacht? Können kurz quatschen wenn du magst! 😊"
    
    # Hot Lead - enthusiastisch
    if lead_status == "hot":
        return f"Hey {first_name}! 🔥 Bin gerade um die Ecke und hab was Interessantes für dich. Hast du 10 Minuten?"
    
    # Lange nicht kontaktiert (60+ Tage)
    if days_since_contact > 60:
        return f"Hey {first_name}! Ich war gerade in der Nähe und hab an dich gedacht. Hättest du kurz Zeit für einen Kaffee? ☕"
    
    # Standard (30-60 Tage)
    if days_since_contact > 30:
        return f"Hey {first_name}! 👋 Bin zufällig gerade in der Ecke. Hast du 5 Minuten? Wollte eh mal wieder vorbeischauen!"
    
    # Kürzlich kontaktiert
    return f"Hey {first_name}! Bin gerade in deiner Nähe - sollen wir kurz quatschen?"

