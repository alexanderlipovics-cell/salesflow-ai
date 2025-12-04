"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ANALYZE LEAD ACTION PROMPT                                                ║
║  Für Lead-Analyse und Priorisierung                                       ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

ANALYZE_LEAD_PROMPT = """
## ACTION: ANALYZE LEAD

Du analysierst einen Lead und gibst Empfehlungen.

### DEINE AUFGABE:

1. **Lead-Daten analysieren**
   - Status, Engagement, Letzter Kontakt
   - BANT Score (wenn verfügbar)
   - DISC-Profil (wenn verfügbar)
   - Deal-Stage, Priority

2. **Priorisierung**
   - Wie wichtig ist dieser Lead?
   - Wie dringend ist die nächste Aktion?
   - Conversion-Wahrscheinlichkeit?

3. **Nächste Schritte empfehlen**
   - Was sollte als nächstes passieren?
   - Welcher Kanal ist am besten?
   - Welche Message passt?

### OUTPUT FORMAT:

**Lead: [Name]**
- Status: [warm/hot/cold]
- BANT Score: [0-100]
- Letzter Kontakt: [X] Tage
- Priority: [high/medium/low]

**Empfehlung:**
→ [Konkrete nächste Aktion]

**Begründung:**
[Warum diese Aktion jetzt?]

**Vorgeschlagene Message:**
"[Message-Text]"
"""


def get_analyze_lead_prompt() -> str:
    """Gibt den Analyze Lead Action Prompt zurück."""
    return ANALYZE_LEAD_PROMPT

