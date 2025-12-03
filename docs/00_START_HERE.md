# 🚀 SALESFLOW AI - START HERE

**Version:** Titanium v1.0
**Status:** MVP Ready (Integration erforderlich)
**Last Updated:** 30. November 2025

---

## ⚡ QUICK START - 3 SCHRITTE ZUM LAUFEN

### SCHRITT 1: Backend Setup (5 Minuten)

1. **SQL Schema deployen:**
   - Öffne: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql
   - Führe aus: `backend/db/fix_schema_titanium.sql`
   - Warte auf: ✅ Success Message

2. **Titanium Setup ausführen:**
   ```powershell
   cd backend
   .\setup.ps1
   ```

3. **Backend starten:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

**Test:** http://localhost:8000/docs sollte API-Dokumentation zeigen

---

### SCHRITT 2: Frontend Setup (2 Minuten)

1. **Vite Proxy konfigurieren** (siehe unten)
2. **Dependencies installieren:**
   ```bash
   cd salesflow-ai
   npm install
   ```
3. **Frontend starten:**
   ```bash
   npm run dev
   ```

**Test:** http://localhost:5173 sollte die App zeigen

---

### SCHRITT 3: Integration Test

1. Öffne die Objection Brain Seite
2. Gib einen Einwand ein: "Das ist zu teuer"
3. Backend sollte KI-Antworten generieren
4. ✅ Erfolg! System läuft!

---

## 📂 PROJEKT-STRUKTUR

```
SALESFLOW/
├── backend/              # FastAPI Backend (Port 8000)
│   ├── app/              # FastAPI Application
│   ├── data/             # JSON Seed Data
│   ├── db/               # SQL Schemas
│   ├── scripts/          # Import Scripts
│   └── setup.ps1         # One-Click Setup
│
├── salesflow-ai/         # React Frontend (Port 5173)
│   ├── src/
│   │   ├── components/   # UI Components
│   │   ├── services/     # API Services
│   │   ├── hooks/        # React Hooks
│   │   └── pages/        # Page Components
│   └── vite.config.js    # Vite Config (Proxy!)
│
└── docs/                 # Diese Dokumentation
    ├── 00_START_HERE.md
    ├── 01_BACKEND_SETUP.md
    ├── 02_FRONTEND_INTEGRATION.md
    └── 03_ROADMAP_TO_UNICORN.md
```

---

## 🔧 KRITISCHE INTEGRATION-FIX

**Problem:** Frontend ruft `/api/*` auf, Backend läuft auf `localhost:8000/api/*`

**Lösung:** Vite Proxy hinzufügen

**Datei:** `salesflow-ai/vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

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
      }
    }
  },
});
```

**Nach dem Ändern:** Frontend neu starten!

---

## 📊 AKTUELLER STATUS

### Was funktioniert:
- ✅ Backend mit allen Endpunkten
- ✅ Frontend mit allen UI-Komponenten
- ✅ Titanium Setup-System
- ✅ Database Schema ready
- ✅ API-Layer im Frontend

### Was zu tun ist:
- ⚠️ Vite Proxy Config hinzufügen (siehe oben)
- ⚠️ SQL Schema in Supabase ausführen
- ⚠️ Titanium Import ausführen
- ⚠️ Integration testen

### Geschätzter Zeitaufwand:
**10 Minuten** bis zur funktionierenden Integration!

---

## 🎯 NÄCHSTE SCHRITTE

**Heute (10 Min):**
1. Vite Config anpassen (Proxy)
2. Backend Setup ausführen
3. Integration testen

**Diese Woche:**
1. Features testen
2. Bugs fixen
3. Erste User-Tests

**Dieser Monat:**
1. Production Deployment
2. Authentication implementieren
3. Erster zahlender Kunde

---

## 📚 WEITERE DOKUMENTATION

- **Backend Details:** → `docs/01_BACKEND_SETUP.md`
- **Frontend Integration:** → `docs/02_FRONTEND_INTEGRATION.md`
- **Roadmap & Vision:** → `docs/03_ROADMAP_TO_UNICORN.md`
- **API Dokumentation:** → http://localhost:8000/docs (wenn Backend läuft)

---

## 🆘 HILFE & TROUBLESHOOTING

### Backend startet nicht
- ✅ `.env` Datei vorhanden?
- ✅ Python 3.10+ installiert?
- ✅ Virtual Environment aktiv?

### Frontend zeigt Fehler
- ✅ `npm install` ausgeführt?
- ✅ Backend läuft auf Port 8000?
- ✅ Vite Proxy konfiguriert?

### API-Calls schlagen fehl
- ✅ CORS in Backend aktiviert? (ist bereits konfiguriert)
- ✅ Backend erreichbar unter http://localhost:8000/health?
- ✅ Browser Console für Fehlermeldungen prüfen

---

**Los geht's! 🚀 Fix die Vite Config und dann läuft's!**

