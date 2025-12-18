# Sales Flow AI - Chat Assistent "BRAIN"

## 🧠 Übersicht

Der Chat-Assistent "BRAIN" ist ein KI-gestützter Vertriebs-Copilot, der dir bei folgenden Aufgaben hilft:

- **Lead-Analyse & Scoring**
- **Follow-up-Sequenzen erstellen**
- **Einwandbehandlung**
- **Abschluss-Strategien**
- **Skripte & Nachrichten schreiben**
- **Reaktivierungs-Kampagnen (Phoenix)**

---

## 🚀 Setup

### Backend

#### 1. Mit OpenAI API (Empfohlen)

Füge deinen OpenAI API Key zur `.env` Datei hinzu:

```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini  # oder gpt-4o für bessere Qualität
```

#### 2. Mock-Modus (Ohne API Key)

Wenn **kein** `OPENAI_API_KEY` gesetzt ist, läuft der Chat im **Mock-Modus**.

- ✅ Die App crasht **nicht**
- ✅ Du erhältst intelligente Dummy-Antworten basierend auf Keywords
- ⚠️ Keine echte KI-Verarbeitung

**Perfekt für Development & Testing!**

---

## 📡 API Endpoints

### POST `/chat/completion`

Sendet eine Nachricht an den Chat-Assistenten und erhält eine Antwort.

**Request:**
```json
{
  "message": "Wie schreibe ich ein gutes Follow-up?",
  "history": [
    {
      "role": "user",
      "content": "Hallo"
    },
    {
      "role": "assistant",
      "content": "Hey! Was können wir heute bewegen?"
    }
  ]
}
```

**Response:**
```json
{
  "reply": "Follow-ups sind der Game-Changer! 🎯 Die meisten Deals passieren zwischen Tag 3-7..."
}
```

---

## 🎨 Frontend

### URL
```
http://localhost:5173/chat
```

### Features

1. **Modernes Chat-Interface**
   - Nachrichten-Bubbles (User rechts/blau, AI links/grau)
   - Auto-Scroll zu neuesten Nachrichten
   - "Tippt..." Animation während des Wartens

2. **Quick Actions**
   - Vordefinierte Buttons für häufige Anfragen
   - Ein Klick sendet sofort eine Nachricht

3. **Lead-Kontext**
   - Sidebar mit Lead-Informationen
   - JSON-Editor für strukturierte Daten
   - Wird an den Copilot übergeben (zukünftig)

4. **Keyboard Shortcuts**
   - `Enter` → Nachricht senden
   - `Shift + Enter` → Neue Zeile

---

## 🧪 Testen

### 1. Backend starten

```bash
cd salesflow-ai/backend
uvicorn app.main:app --reload
```

**Health Check:**
```bash
curl http://localhost:8000/health
```

### 2. Frontend starten

```bash
cd salesflow-ai
npm run dev
```

### 3. Chat testen

Navigiere zu: `http://localhost:5173/chat`

**Test-Nachrichten:**
- "Hallo" → Begrüßung
- "Lead analysieren" → Lead-Analyse
- "Follow-up schreiben" → Follow-up-Strategie
- "Einwand behandeln: zu teuer" → Preis-Einwand
- "Abschluss-Strategie" → Closing-Tipps

---

## 🎭 Persönlichkeit

Der Chat-Assistent hat eine spezifische **Vertriebs-Persönlichkeit**:

- ✅ Kurz & knackig
- ✅ Umsatzorientiert
- ✅ Duzt den User (Alex)
- ✅ Keine langen Romane
- ✅ Konkrete, sofort umsetzbare Tipps
- ✅ Sales-Slang ist ok, aber nicht übertrieben

**System Prompt:**
```
Du bist Sales Flow AI, der strategische Vertriebs-Copilot.
Antworte kurz, knackig und umsatzorientiert.
Du hilfst bei Einwandbehandlung, Skripten und Strategie.
Du duzt den User (Alex). Keine langen Romane, nur Resultate.
```

---

## 🔧 Troubleshooting

### Problem: "Ups, da ist was schiefgelaufen"

**Lösung:**
1. Backend läuft? → `curl http://localhost:8000/health`
2. API URL korrekt? → Check `.env` → `VITE_API_URL=http://localhost:8000`
3. CORS aktiviert? → Sollte automatisch sein (siehe `main.py`)

### Problem: Mock-Antworten statt echte KI

**Lösung:**
- Setze `OPENAI_API_KEY` in `.env`
- Starte Backend neu

### Problem: "OPENAI_API_KEY ist nicht gesetzt"

**Lösung:**
- Erstelle `.env` Datei in `backend/`
- Füge `OPENAI_API_KEY=sk-proj-...` hinzu

---

## 📦 Abhängigkeiten

### Backend
- `fastapi` → Web Framework
- `openai` → OpenAI API Client
- `pydantic` → Validierung

### Frontend
- `react` → UI Framework
- `lucide-react` → Icons
- `clsx` → CSS Classes

---

## 🚢 Deployment

### Backend
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
npm run build
# Deploy ./dist zu Netlify, Vercel, etc.
```

---

## 🎯 Nächste Schritte

- [ ] Lead-Kontext an Backend übergeben
- [ ] Chat-History in Supabase speichern
- [ ] Datei-Uploads (PDFs, CSVs) verarbeiten
- [ ] Multi-User Support
- [ ] Voice-Input (Speech-to-Text)

---

## 💬 Beispiel-Konversationen

### Beispiel 1: Lead-Analyse

**User:** "Lead analysieren"

**AI:** "Zeig mir den Lead! Ich analysiere Status, Deal-Value und schlage dir die beste Follow-up-Strategie vor. Hast du schon einen ersten Kontakt gehabt?"

---

### Beispiel 2: Einwandbehandlung

**User:** "Lead sagt 'zu teuer'"

**AI:** "Classic Preis-Einwand! 💰 Hier der Move: 'Verstehe ich. Lass uns kurz schauen, was es dich kostet, NICHTS zu machen.' Dann ROI rechnen. Funktioniert bei 80% der Cases."

---

### Beispiel 3: Follow-up

**User:** "Follow-up schreiben für Demo-Kontakt"

**AI:** "Follow-ups sind der Game-Changer! 🎯 Die meisten Deals passieren zwischen Tag 3-7. Ich empfehle: Tag 1 (Wert), Tag 3 (Social Proof), Tag 7 (Dringlichkeit). Welche Stage ist dein Lead?"

---

## 📝 Lizenz

Teil von Sales Flow AI - Internes Projekt

---

**Happy Selling! 🚀**

