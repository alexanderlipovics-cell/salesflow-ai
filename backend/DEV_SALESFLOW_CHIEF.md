# SALES FLOW AI CHIEF – Developer Notes

**Zweck**

Der CHIEF ist der interne Master-Assistent von Alexander:
- Branchen-Analyst
- Vertriebs- & Angebots-Architekt
- Fullstack-/KI-Programmierer
- Marketing-Genie (Reels, Slides, Carousels)

Er wird NICHT direkt an Endkunden ausgeliefert, sondern hilft beim Bauen und Verkaufen von Sales Flow AI.

---

## Dateien

- `backend/app/prompts_chief.py`
  - Enthält `CHIEF_SYSTEM_PROMPT`.
  - Beschreibt Verhalten, Module und Ausrichtung des CHIEF.

- `backend/app/verticals.py`
  - Enthält `VerticalConfig` und das Dictionary `VERTICALS`.
  - Aktuell nur Eintrag `"chief"` → Sales Flow AI Chief.
  - Weitere Vertikalen (z.B. `immo_pro`, `network_pro`) können hier ergänzt werden.

- `backend/app/prompts.py`
  - `build_system_prompt(action, data)` sollte `VERTICALS` verwenden:
    - `data.industry` (falls gesetzt) wählt die Vertikale.
    - Fallback ist `"chief"`.

- `backend/app/schemas.py`
  - `ActionData` sollte ein optionales Feld `industry: Optional[str]` besitzen,
    damit das Frontend steuern kann, ob CHIEF oder eine andere Vertikale genutzt wird.

---

## Beispiel /ai-Call im CHIEF-Modus

```json
{
  "action": "chat",
  "data": {
    "industry": "chief",
    "messages": [
      {
        "role": "user",
        "content": "Zielbranche: Network Marketing Leader in DACH. Analysiere die Branche und baue mir ein Einstiegsangebot plus 5 DM-Vorlagen und ein Reel-Skript für die ersten 10 Kunden."
      }
    ]
  }
}
