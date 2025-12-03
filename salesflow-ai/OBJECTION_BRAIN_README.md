# Objection Brain - KI-Einwand-Coach

## 🧠 Übersicht

Objection Brain ist ein KI-gestützter Einwand-Coach, der dir hilft, auf schwierige Kundeneinwände professionell und effektiv zu reagieren.

### Features

- **3 Varianten pro Einwand**: Empfohlen, Direkt, Weich
- **Branchenspezifisch**: Network Marketing, Immobilien, Finance, Allgemein
- **Kanaloptimiert**: WhatsApp, Instagram, Telefon, E-Mail
- **KI-Analyse**: Reasoning-Block mit Strategie-Hinweisen
- **Direkte Integration**: Kopiere Antworten oder öffne sie im KI-Assistenten

---

## 🚀 Setup

### Backend

Der Objection Brain nutzt das bestehende OpenAI-Setup:

```bash
# .env Datei (backend/)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini  # oder gpt-4o
```

**Mock-Modus**: Wenn kein API Key gesetzt ist, liefert das Backend intelligente Dummy-Antworten für häufige Einwände (Preis, Zeit, "Später").

### Frontend

Keine zusätzliche Konfiguration nötig. Die Seite ist unter `/objections` erreichbar.

---

## 📡 API

### POST `/api/objection-brain/generate`

Generiert KI-gestützte Antworten auf Kundeneinwände.

**Request:**
```json
{
  "vertical": "network",
  "channel": "whatsapp",
  "objection": "Das ist mir zu teuer",
  "context": "Erstes Gespräch, Angebot für Starter-Paket (299€)",
  "language": "de"
}
```

**Response:**
```json
{
  "primary": {
    "label": "Variante A (Empfohlen)",
    "message": "Verstehe ich total! 💰 Lass uns kurz schauen...",
    "summary": "Reframe auf Opportunitätskosten"
  },
  "alternatives": [
    {
      "label": "Variante B",
      "message": "Ja, ich höre dich...",
      "summary": "Direkter, Social Proof"
    },
    {
      "label": "Variante C",
      "message": "Totally fair! Kein Stress...",
      "summary": "No pressure, Door offen"
    }
  ],
  "reasoning": "Preis-Einwand → Nicht über Preis diskutieren..."
}
```

---

## 🎨 Frontend

### Navigation

```
Sidebar > TOOLS > Objection Brain
```

Oder direkt: `http://localhost:5173/objections`

### UI Flow

1. **Formular ausfüllen**
   - Branche wählen
   - Kanal wählen
   - Einwand eingeben (Pflichtfeld)
   - Optional: Kontext hinzufügen

2. **KI-Analyse starten**
   - Button "Antwort vorschlagen"
   - Loading-State: "KI denkt über deinen Einwand nach..."

3. **Ergebnisse anzeigen**
   - KI-Analyse (Reasoning)
   - 3 Varianten (Primary + 2 Alternatives)
   - Jede Variante:
     - Label + optional "Empfohlen"-Badge
     - Strategie-Hinweis (Summary)
     - Ausformulierte Nachricht
     - Buttons:
       - "Nachricht kopieren" → Clipboard
       - "Im KI-Assistent öffnen" → Chat mit Prefill

4. **Neuen Einwand eingeben**
   - Button "Neuen Einwand eingeben"
   - Formular wird zurückgesetzt

---

## 🧪 Testen

### Backend starten

```bash
cd salesflow-ai/backend
uvicorn app.main:app --reload
```

**Health Check:**
```bash
curl http://localhost:8000/health
```

**API Test:**
```bash
curl -X POST http://localhost:8000/api/objection-brain/generate \
  -H "Content-Type: application/json" \
  -d '{
    "vertical": "network",
    "channel": "whatsapp",
    "objection": "Ich habe keine Zeit dafür",
    "context": "Demo-Phase",
    "language": "de"
  }'
```

### Frontend starten

```bash
cd salesflow-ai
npm run dev
```

Navigiere zu: `http://localhost:5173/objections`

---

## 💡 Beispiel-Einwände zum Testen

### Preis
- "Das ist mir zu teuer"
- "Ich habe kein Budget dafür"
- "Das kann ich mir nicht leisten"

### Zeit
- "Ich habe keine Zeit"
- "Das passt gerade nicht"
- "Zu viel Aufwand"

### Timing
- "Lass mich drüber nachdenken"
- "Ich melde mich später"
- "Nicht jetzt, vielleicht nächsten Monat"

### Skepsis
- "Funktioniert das wirklich?"
- "Ich kenne jemanden, bei dem hat's nicht geklappt"
- "Das klingt zu gut, um wahr zu sein"

---

## 🎯 KI-Strategie

Das System nutzt ein ausgeklügeltes Prompt-Engineering:

### System Prompt
```
Du bist ein erfahrener Vertriebscoach für Einwandbehandlung.
Du hilfst deutschsprachigen Verkäufern dabei, auf Einwände 
kurz, klar und respektvoll zu antworten.

Regeln:
- Sprich den Kunden mit "du" an
- Bleib ruhig, wertschätzend, kein Druck
- Struktur: 1) Spiegeln, 2) Reframe, 3) Rückfrage/CTA
```

### Varianten-Strategie

1. **Variante A (Empfohlen)**: Ausgewogen, funktioniert in 80% der Fälle
2. **Variante B**: Direkter, für selbstbewusste Verkäufer
3. **Variante C**: Weicher, "no pressure", für skeptische Leads

---

## 🔧 Troubleshooting

### Problem: "Objection Brain konnte keine Antwort generieren"

**Lösung:**
1. Backend läuft? → `curl http://localhost:8000/health`
2. API URL korrekt? → Check `.env` → `VITE_API_URL=http://localhost:8000`
3. CORS aktiviert? → Sollte automatisch sein (siehe `main.py`)

### Problem: Mock-Antworten statt echte KI

**Lösung:**
- Setze `OPENAI_API_KEY` in `backend/.env`
- Starte Backend neu

### Problem: Parsing-Fehler "KI-Antwort konnte nicht verarbeitet werden"

**Lösung:**
- Das Modell liefert manchmal kein valides JSON
- Versuche ein anderes Modell (z.B. `gpt-4o` statt `gpt-4o-mini`)
- Check Backend-Logs für Details

---

## 🛠 Technische Details

### Backend
- **Router**: `backend/app/routers/objection_brain.py`
- **Endpoint**: `/api/objection-brain/generate`
- **AI Client**: Nutzt bestehenden `AIClient` aus `app.ai_client`
- **Mock-Modus**: Intelligente Fallback-Antworten ohne API Key

### Frontend
- **Service**: `src/services/objectionBrainService.ts`
- **Hook**: `src/hooks/useObjectionBrain.ts`
- **Page**: `src/pages/ObjectionBrainPage.tsx`
- **Route**: `/objections`
- **Navigation**: Sidebar > TOOLS > Objection Brain

### UI/UX
- **Dark Theme**: bg-slate-900, text-slate-50
- **Mobile-First**: Responsive Design
- **Icons**: Lucide React (Brain, Lightbulb, Copy, MessageSquare)
- **Styling**: Tailwind CSS

---

## 📊 Metriken (geplant)

Zukünftige Erweiterungen:

- [ ] Einwand-Kategorien tracking
- [ ] Success-Rate pro Variante
- [ ] A/B-Testing von Antworten
- [ ] Personalisierung basierend auf Branche
- [ ] Einwand-History pro Lead

---

## 🎓 Best Practices

### Kontext ist King
Je mehr Kontext du gibst, desto besser die Antworten:
- Stadium des Gesprächs (Erstkontakt, Demo, Verhandlung)
- Preis/Angebot
- Vorherige Gespräche
- Besonderheiten des Leads

### Kanal-Optimierung
- **WhatsApp**: Kurz, locker, Emojis ok
- **E-Mail**: Strukturiert, professionell
- **Telefon**: Gesprächsfluss, Pausen einbauen
- **Instagram DM**: Sehr kurz, visuell

### Varianten nutzen
- Teste verschiedene Varianten
- Passe sie an deinen Stil an
- Nutze den KI-Assistenten für Feinschliff

---

## 🚀 Nächste Schritte

- [ ] Einwand-Library (häufige Einwände speichern)
- [ ] Voice-Input für Einwände
- [ ] Video-Antworten generieren (Skript)
- [ ] Integration mit CRM (Lead-spezifische Einwände)
- [ ] Team-Sharing (Beste Antworten teilen)

---

**Happy Selling! 💪**

