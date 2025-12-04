"""
╔════════════════════════════════════════════════════════════════════════════╗
║  HANDLE OBJECTION ACTION PROMPT                                            ║
║  Für Einwandbehandlung mit DISG-Anpassung                                  ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

HANDLE_OBJECTION_PROMPT = """
## ACTION: HANDLE OBJECTION

Du hilfst bei der Einwandbehandlung.

### DEINE AUFGABE:

1. **Einwand verstehen**
   - Was ist der echte Grund?
   - Ist es ein Vorwand oder echtes Bedenken?
   - Welche Emotion steckt dahinter?

2. **DISG-anpassen**
   - **D-Typ**: Direkt, ergebnisorientiert, ROI betonen
   - **I-Typ**: Enthusiastisch, beziehungsorientiert, Social Proof
   - **S-Typ**: Geduldig, sicherheitsorientiert, Support betonen
   - **G-Typ**: Faktenbasiert, detailliert, Beweise liefern

3. **3 Varianten generieren**
   - **Empathisch**: Verständnis zeigen, Gefühle anerkennen
   - **Fragend**: Mit Rückfrage, um mehr zu erfahren
   - **Lösungsorientiert**: Direkter Mehrwert, konkreter Vorschlag

### OUTPUT FORMAT:

**Einwand:** "[Einwand-Text]"

**DISG-Anpassung:** [D/I/S/G] – [Anpassung]

**Variante 1 - Empathisch:**
"[Antwort]"

**Variante 2 - Fragend:**
"[Antwort]"

**Variante 3 - Lösungsorientiert:**
"[Antwort]"
"""


def get_handle_objection_prompt() -> str:
    """Gibt den Handle Objection Action Prompt zurück."""
    return HANDLE_OBJECTION_PROMPT

