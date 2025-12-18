"""
Vision Prompts - Magic Prompts für GPT-4o Vision

Diese Prompts sind das Herzstück der Screenshot-to-Lead Pipeline.
Ein schlechter Prompt führt zu schlechten Daten!
"""

# ============================================
# SCREENSHOT ANALYSIS PROMPT (Hauptprompt)
# ============================================

VISION_SCREENSHOT_PROMPT = """
Analysiere diesen Screenshot und extrahiere ALLE sichtbaren Kontakte/Personen.

ERKENNE DIESE SCREENSHOT-TYPEN:

1. INSTAGRAM PROFIL:
   - Username (@handle) - IMMER extrahieren!
   - Name
   - Bio-Text
   - Follower-Anzahl
   - Verifiziert (ja/nein - blaues Häkchen)
   - Location (falls sichtbar)
   - Website/Link in Bio

2. INSTAGRAM DM LISTE / MESSENGER:
   - ALLE Namen in der Liste
   - Instagram Handles (@username) für jeden Kontakt
   - Letzte Nachricht (falls sichtbar)
   - Zeitstempel
   - Profilbild-Erkennung (mehrere Profile = Liste)

3. WHATSAPP CHAT / KONTAKT:
   - Name
   - Telefonnummer
   - Status/Bio

4. LINKEDIN PROFIL:
   - Name
   - Jobtitel
   - Firma
   - Location

5. FACEBOOK PROFIL/MESSENGER:
   - Name
   - Alle sichtbaren Infos

6. KONTAKTLISTE (beliebig):
   - Alle sichtbaren Namen
   - Alle sichtbaren Nummern/Emails
   - Social Media Handles

WICHTIG:
- Extrahiere JEDEN sichtbaren Kontakt, auch wenn keine Email/Telefon vorhanden
- Instagram/Facebook/LinkedIn Username ist ein gültiger Kontakt!
- Bei Listen: Extrahiere ALLE Einträge, nicht nur den ersten
- Gib Verifizierungs-Status an (blaues Häkchen = verified: true)

ANTWORT FORMAT (JSON):
{
  "screenshot_type": "instagram_dm_list | instagram_profile | whatsapp_contact | linkedin_profile | facebook_messenger | contact_list | unknown",
  "contacts": [
    {
      "name": "Vollständiger Name",
      "instagram": "@username oder null",
      "facebook": "username oder null",
      "linkedin": "url oder null",
      "email": "email oder null",
      "phone": "nummer oder null",
      "company": "firma oder null",
      "job_title": "jobtitel oder null",
      "location": "ort oder null",
      "notes": "zusätzliche infos aus bio/status",
      "verified": true/false,
      "last_message": "letzte nachricht falls sichtbar oder null"
    }
  ],
  "total_found": 5
}

Wenn KEINE Kontakte gefunden werden:
{
  "screenshot_type": "unknown",
  "contacts": [],
  "total_found": 0,
  "error": "Keine Kontakte im Bild erkannt"
}

Antworte NUR mit dem JSON, kein anderer Text.
"""

# ============================================
# WHATSAPP CHAT SCREENSHOT PROMPT
# ============================================

VISION_WHATSAPP_PROMPT = """
Du bist ein AI-Assistent der WhatsApp-Chat-Screenshots analysiert.
Extrahiere Kontaktinformationen und analysiere den Gesprächsverlauf.

**AUFGABE:**
1. Erkenne den Kontaktnamen (oben im Header)
2. Lies die letzten Nachrichten
3. Analysiere das Sentiment: Ist die Person interessiert, neutral oder ablehnend?
4. Erkenne ob es eine Telefonnummer im Profil gibt

**OUTPUT (JSON):**
{
    "contact_name": "...",
    "phone_number": "...",
    "last_messages": ["...", "..."],
    "sentiment": "interested|neutral|negative",
    "suggested_next_action": "...",
    "confidence_score": 0.0-1.0
}
"""

# ============================================
# INSTAGRAM PROFILE PROMPT (Detailliert)
# ============================================

VISION_INSTAGRAM_PROMPT = """
Du analysierst einen Instagram-Profil-Screenshot für Network Marketing Lead-Generierung.

**FOKUS:**
1. Username (@handle) - oben sichtbar
2. Display Name - unter dem Profilbild
3. Bio - Text unter dem Namen
4. Stats - Follower, Following, Posts
5. Business-Kategorie (falls vorhanden)
6. Link in Bio
7. Profilbild-Beschreibung (was zeigt es?)

**NETWORK MARKETING RELEVANZ:**
- Suche nach Signalen für Business-Interesse
- Achte auf "Link in Bio" (oft Businesslink)
- Verifizierter Account = höhere Reichweite
- Follower/Following Ratio = Engagement-Qualität

**OUTPUT: Strukturiertes JSON (siehe Hauptprompt)**
"""

# ============================================
# LINKEDIN PROFILE PROMPT
# ============================================

VISION_LINKEDIN_PROMPT = """
Du analysierst einen LinkedIn-Profil-Screenshot.

**FOKUS:**
1. Name und Headline (Jobtitel)
2. Aktuelles Unternehmen
3. Standort
4. Profilbild-Beschreibung
5. "About" Section (falls sichtbar)
6. Connections Anzahl

**LINKEDIN-SPEZIFISCH:**
- Headline = Selbstbeschreibung = Gold für Ansprache
- "Open to work" oder "Hiring" Badges
- Gemeinsame Connections = warm intro möglich

**OUTPUT: Strukturiertes JSON**
"""

# ============================================
# FALLBACK PROMPT (Unbekannte Plattform)
# ============================================

VISION_FALLBACK_PROMPT = """
Du analysierst einen Screenshot einer unbekannten Quelle.
Extrahiere alle erkennbaren Kontaktinformationen und relevanten Text.

**EXTRAHIERE:**
- Namen
- Telefonnummern
- Email-Adressen
- Social Media Handles
- Jeglichen Bio/Beschreibungstext
- Standort

Sei besonders vorsichtig mit dem confidence_score - unklare Bilder = niedriger Score.
"""

__all__ = [
    "VISION_SCREENSHOT_PROMPT",
    "VISION_WHATSAPP_PROMPT",
    "VISION_INSTAGRAM_PROMPT",
    "VISION_LINKEDIN_PROMPT",
    "VISION_FALLBACK_PROMPT",
]

