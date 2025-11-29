# Sales Flow AI Chief Vertikale

- Die Master-Vertikale heißt `chief` und repräsentiert den Sales Flow AI Chief Operator.
- Der vollständige Systemprompt liegt in `backend/app/prompts_chief.py`.
- Alle vertikalen Konfigurationen werden in `backend/app/verticals.py` verwaltet.
- Jede `VerticalConfig` definiert `key`, `label`, `system_prompt` und optional ein Follow-up-Preset.
- `ActionData.industry` (siehe `backend/app/schemas.py`) bestimmt, welcher Vertical-Prompt genutzt wird.
- Fehlt das Feld, nutzt `/ai` automatisch den Chief als Standard.

Beispiel-Request für den Chief:
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
      {"role": "user", "content": "Gib mir einen Plan für Networker"}
    ]
  }
}
```

Weitere Vertikalen wie `immo_pro`, `network_pro`, `finance_pro` oder `fitness_pro` lassen sich ergänzen, indem ein eigener Prompt erstellt und in `VERTICALS` registriert wird.
      {
        "role": "user",
        "content": "Zielbranche: Network Marketing Leader in DACH. Analysiere die Branche und baue mir ein Einstiegsangebot plus 5 DM-Vorlagen und ein Reel-Skript für die ersten 10 Kunden."
      }
    ]
  }
}

## Network Marketing Leader – Launch Kit

### 1) Kurz-Analyse & Einstiegsangebot

**Zielkunde**
- Network-Leader im DACH-Raum
- 30–55 Jahre mit bestehenden Teams (10–500 Partner)
- Aktive Kanäle: WhatsApp, Instagram, Facebook, teilweise Telegram

**Probleme**
- Business wird über Chat/Screenshots/Notizen geführt → Chaos
- Warme Kontakte versanden mangels Follow-up-Struktur
- Team dupliziert sich nicht sauber, jeder nutzt einen eigenen Stil
- Launches & Promotions laufen ohne klaren Plan

**Einstiegsangebot**
- „Sales Flow AI – Network Leader Launch Kit“

**Positionierung**
- „Dein KI-Vertriebsassistent, der deine Kontakte sortiert, Follow-ups durchzieht und deinem Team fertige Skripte liefert – damit du als Leader nur noch die richtigen Gespräche führst.“

**Lieferumfang**
- Setup & Customizing (Done-with-you)
- Import/Anbindung der bestehenden Kontaktliste (CSV, Screenshot-Scanner)
- Branding + Sprache auf Company & Produkt abgestimmt
- Laden der wichtigsten Infos (Comp-Plan, Produkt-Vorteile, Einwand-Handling)
- Branchenspezifische Follow-up-Engine (Network Preset)
  - Vorkonfigurierte Sequenzen (90 Tage)
  - Interessent / schlafende Partner / Kunden
- Speed-Hunter + Phoenix für Network
  - Speed-Hunter: Batch-Nachrichten mit persönlichem Touch für z.B. 50 alte Kontakte
  - Phoenix: Reaktivierung alter Kontakte nach Zeitraum X
- Leader-Dashboard
  - Heute fällige Follow-ups
  - „Heißeste Kontakte“ inklusive Status und letztem Kontakt

**Preis-Idee**
- Setup: 1.490 € (Pilot)
- Monatlich: 349 € (bis 50 aktive Team-User)
- Optionaler Downsell: 990 € Setup / 297 € monatlich
- Immer als Business-Investment verkaufen („ein zusätzlicher Teampartner/Monat reicht als ROI“)

### 2) DM-Sequenz für Network-Leader (DACH)
- DM 1 – Erstkontakt / Re-Activation (Tag 0) [Text wie im Original]
- DM 2 – Problem + Hook (Tag 2–3) [Text wie im Original]
- DM 3 – Social Proof + Mini-Story (Tag 5) [Text wie im Original]
- DM 4 – Letzter Push / Klarheit (Tag 10) [Text wie im Original]

### 3) Reel-Skript für Network Leader
- Szenen 1–6 mit Hook, Problem, Schmerz, Lösung, Ergebnissen, CTA
- On-Screen-Text + Voiceover wie im Originaltext.

### 4) Beispiel-Backend-Call für CHIEF (/ai)

```json
{
  "action": "chat",
  "data": {
    "industry": "chief",
    "messages": [
      {
        "role": "user",
        "content": "Zielbranche: Network Marketing Leader in DACH. Analysiere die Branche, formuliere ein Einstiegsangebot für Sales Flow AI, erstelle eine DM-Sequenz (4 Nachrichten) für die Akquise dieser Leader und schreibe ein detailliertes Reel-Skript (60 Sekunden) mit Hook, Szenenbeschreibung, On-Screen-Text und CTA."
      }
    ]
  }
}
```
