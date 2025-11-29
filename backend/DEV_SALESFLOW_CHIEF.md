# Sales Flow AI Chief Vertikale

- Die Master-Vertikale heißt `chief` und repräsentiert den Sales Flow AI Chief Operator.
- Der vollständige Systemprompt liegt in `backend/app/prompts_chief.py`.
- Alle vertikalen Konfigurationen werden in `backend/app/verticals.py` verwaltet.
- Jede `VerticalConfig` definiert `key`, `label`, `system_prompt` und optional ein Follow-up-Preset.
- `ActionData.industry` (siehe `backend/app/schemas.py`) bestimmt, welcher Vertical-Prompt genutzt wird.
- Fehlt das Feld, nutzt `/ai` automatisch den Chief als Standard.

Beispiel-Request für den Chief:
```json
{
  "action": "chat",
  "data": {
    "industry": "chief",
    "messages": [
      {"role": "user", "content": "Gib mir einen Plan für Networker"}
    ]
  }
}
```

Weitere Vertikalen wie `immo_pro`, `network_pro`, `finance_pro` oder `fitness_pro` lassen sich ergänzen, indem ein eigener Prompt erstellt und in `VERTICALS` registriert wird.
