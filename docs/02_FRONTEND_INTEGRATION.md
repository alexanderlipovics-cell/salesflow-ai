# 🎨 FRONTEND INTEGRATION GUIDE

**Verbinde React UI (Port 5173) mit FastAPI Backend (Port 8000)**

---

## 🏗️ ARCHITECTURE

```
[React UI :5173] 
    ↓ (JSON/HTTP via Proxy)
[FastAPI :8000]
    ↓ (SQL)
[Supabase PostgreSQL]
```

**Key Principle:** Frontend spricht mit API, nicht direkt mit Datenbank (außer Auth)

---

## ✅ WAS BEREITS EXISTIERT

### Frontend (`salesflow-ai/`)
- ✅ Komplette React/Vite App
- ✅ UI-Komponenten für alle Features
- ✅ API-Layer (`src/lib/api.ts`)
- ✅ Services für Backend-Kommunikation
- ✅ TypeScript Types
- ✅ Supabase Client für Auth

### Backend Integration
- ✅ CORS bereits konfiguriert (`allow_origins: localhost:5173`)
- ✅ Alle API-Endpoints implementiert
- ✅ JSON-Response Format standardisiert

---

## 🔧 DER FEHLENDE LINK - PROXY CONFIG

**Problem:**
- Frontend macht Calls zu `/api/*`
- Backend läuft auf `http://localhost:8000/api/*`
- Vite weiß nicht, wohin mit den Requests!

**Lösung:** Vite Proxy konfigurieren

---

## ⚡ FIX IT NOW (2 Minuten)

### Schritt 1: Vite Config Anpassen

**Datei:** `salesflow-ai/vite.config.js`

**Vorher:**
```javascript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
```

**Nachher:**
```javascript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path, // Optional: Keep /api prefix
      }
    }
  },
});
```

---

### Schritt 2: Frontend Neu Starten

```bash
# Stop frontend (Ctrl+C)
# Start wieder:
npm run dev
```

**Fertig! 🎉 Integration sollte jetzt funktionieren!**

---

## 🧪 INTEGRATION TESTEN

### Test 1: Health Check
1. Backend läuft auf :8000
2. Frontend läuft auf :5173
3. Browser Console öffnen
4. Frontend sollte automatisch Backend pingen

**Erwartete Console-Ausgabe:**
```
✅ API Connected: { status: "online" }
```

---

### Test 2: Objection Search (Die Killer-Feature!)

1. Navigiere zu **Objection Brain** Seite
2. Gib ein: "Das ist zu teuer"
3. Klicke: **Suchen** oder **Generieren**
4. Backend sollte Antworten zurückgeben
5. UI zeigt Objection-Responses

**Erwartete Response:**
```json
{
  "primary": {
    "label": "ROI Reframe",
    "message": "Ich verstehe, dass der Preis eine Überlegung ist...",
    "summary": "Fokussiert auf Return on Investment"
  },
  "alternatives": [...]
}
```

---

### Test 3: Templates Laden

1. Navigiere zu **Templates** oder **Follow-Up** Seite
2. Templates sollten aus Backend geladen werden
3. Dropdown zeigt verfügbare Templates

**API Call:**
```
GET /api/templates?category=followup
```

---

## 📊 API ENDPOINTS MAPPING

### Objections
```typescript
// Frontend Service: src/services/objectionBrainService.ts
POST /api/objection-brain/generate
POST /api/objection-brain/log

// Legacy:
GET /api/objections
GET /api/objections/search?query=...
```

### Templates
```typescript
// Frontend Hook: src/hooks/useMessageTemplates.ts
GET /api/templates
GET /api/templates?category=followup
POST /api/templates (Admin only)
```

### Follow-Up Engine
```typescript
// Frontend Hook: src/hooks/useFollowUpEngine.ts
POST /api/sequences/enroll
GET /api/sequences
GET /api/sequences/{id}/analytics
```

### Revenue Intelligence
```typescript
GET /api/revenue/dashboard
GET /api/revenue/alerts/at-risk
POST /api/revenue/scenario-calculator
```

---

## 🔄 ALTERNATIVE: .env VARIABLE

**Wenn Proxy nicht funktioniert:**

### Schritt 1: Create `.env` File

**Datei:** `salesflow-ai/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Schritt 2: Update `api.ts`

**Datei:** `salesflow-ai/src/lib/api.ts`

**Zeile 19 ändern:**
```typescript
// Vorher:
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

// Nachher (expliziter):
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
```

### Schritt 3: Frontend Neu Starten
```bash
npm run dev
```

**Hinweis:** Für Production müssen beide URLs (Frontend & Backend) HTTPS sein!

---

## 🐛 TROUBLESHOOTING

### CORS Error: "Access-Control-Allow-Origin header is missing"

**Prüfen:** Backend `app/main.py` Zeile 84-94

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # ← Frontend URL
        "http://localhost:3000",  # Alternative Port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Fix:** Stelle sicher, Frontend URL ist in `allow_origins` Liste!

---

### Connection Refused Error

**Symptom:** `Failed to fetch`

**Checks:**
1. ✅ Backend läuft? → `curl http://localhost:8000/health`
2. ✅ Port 8000 frei? → `netstat -an | findstr 8000`
3. ✅ Firewall blockiert? → Windows Firewall prüfen

---

### 404 Not Found

**Symptom:** `404 GET /api/objections/search`

**Checks:**
1. ✅ Endpoint existiert im Backend?
2. ✅ Router korrekt eingebunden in `main.py`?
3. ✅ API Prefix korrekt? (`/api` vs `/api/v1`)

**Test mit curl:**
```bash
curl http://localhost:8000/api/objections
```

---

### Requests gehen an falschen Host

**Symptom:** Browser macht Request zu `http://localhost:5173/api/...` statt `:8000`

**Fix:** Vite Proxy nicht konfiguriert!
- Siehe oben: "Schritt 1: Vite Config Anpassen"
- Nach Änderung: Frontend NEU STARTEN!

---

## ✅ SUCCESS CHECKLIST

Nach Integration:

- [ ] Frontend lädt ohne Fehler
- [ ] Backend Connection established
- [ ] Objection Search gibt Results zurück
- [ ] Dashboard zeigt Daten
- [ ] Keine CORS Errors in Browser Console
- [ ] Templates laden erfolgreich
- [ ] Follow-Up Engine funktioniert
- [ ] Error Messages erscheinen bei Backend-Down

**Alle Checks ✅? INTEGRATION COMPLETE! 🎉**

---

## 🎯 NÄCHSTE SCHRITTE

### Diese Woche:
1. **Testing:** Alle Features durchklicken
2. **Bug Fixes:** Kleinere UI/UX Issues beheben
3. **Performance:** Loading States optimieren
4. **Error Handling:** User-freundliche Fehlermeldungen

### Nächster Monat:
1. **Authentication:** Supabase Auth vollständig integrieren
2. **RLS Policies:** Row Level Security implementieren
3. **Production Deployment:** Vercel + Railway/Render
4. **Custom Domain:** salesflow.ai aufschalten

---

## 💎 DAS DEMO-FLOW (Für Investoren)

**"Schau dir das an..."**

1. **App öffnen** → Professionelles Dashboard
2. **Einwand eingeben** → "Dein Produkt ist zu teuer"
3. **KI antwortet** → Zeigt 3 psychologisch validierte Responses
4. **Response klicken** → Kopiert in Clipboard
5. **Analytics zeigen** → Echtzeit-Pipeline-Value, Forecast
6. **Betonen:** "All dies läuft auf unserem Titanium Backend"

**Investor Reaktion:** 🤯

---

## 📊 INTEGRATION METRICS

**Nach erfolgreicher Integration:**

| Metric | Status |
|--------|--------|
| Backend Health | ✅ Connected |
| API Response Time | < 200ms |
| Frontend Load Time | < 2s |
| CORS Configured | ✅ Yes |
| Error Handling | ✅ Implemented |
| TypeScript Types | ✅ Synced |

---

## 🔒 SECURITY NOTES

**Für Production (WICHTIG!):**

1. **HTTPS Only:** Kein HTTP in Production!
2. **API Keys:** Nie im Frontend-Code! (nur in Backend .env)
3. **CORS:** Nur eigene Domains erlauben
4. **RLS Policies:** Supabase Row Level Security aktivieren
5. **Rate Limiting:** API-Calls limitieren (100/min pro User)
6. **Input Validation:** Alle User-Inputs validieren

---

**Integration Ready! 🚀 Weiter mit Testing & Deployment →**

