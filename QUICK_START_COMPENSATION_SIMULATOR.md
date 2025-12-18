# ⚡ Quick Start: Compensation Plan Simulator

## 🚀 In 3 Schritten zum Testen

### 1️⃣ Backend starten
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
✅ Prüfen: `http://localhost:8000/health` sollte `{"status":"ok"}` zurückgeben

---

### 2️⃣ Frontend starten
```bash
# Im Root-Verzeichnis
npm run dev
```
✅ Prüfen: Browser öffnet sich automatisch

---

### 3️⃣ Simulator öffnen
- **URL:** `http://localhost:5173/compensation-simulator`
- **Oder:** Navigation → Tools → "Compensation Simulator"

---

## 🧪 Schnelltest

1. **Firma wählen:** "Herbalife" (oder andere)
2. **Deine Daten:**
   - Name: "Test User"
   - Rang: "Supervisor"
   - Personal Volume: `500`
   - Group Volume: `3500`
3. **Team hinzufügen:**
   - Klick "+ Hinzufügen"
   - Name: "Team Member"
   - Rang: "Distributor"
   - Personal Volume: `200`
4. **Berechnen:** Klick "Provisionen berechnen"
5. **Ergebnis prüfen:** Du solltest "Total Earnings" sehen!

---

## ❌ Wenn es nicht funktioniert

### Fehler: "API request failed"
- ✅ Backend läuft? (`http://localhost:8000/health`)
- ✅ CORS erlaubt? (Backend-Logs prüfen)
- ✅ `.env` Datei vorhanden? (`VITE_API_BASE_URL=http://localhost:8000`)

### Fehler: "Plan nicht gefunden"
- ✅ Company-ID korrekt? (z.B. "herbalife", nicht "Herbalife")
- ✅ Backend-Logs prüfen für Details

### Keine Companies im Dropdown
- ✅ `src/config/compensation/index.ts` prüfen
- ✅ Browser Console für Fehler checken

---

## ✅ Checkliste

- [ ] Backend läuft
- [ ] Frontend läuft
- [ ] Simulator öffnet
- [ ] Formular funktioniert
- [ ] Berechnung funktioniert
- [ ] Ergebnisse werden angezeigt

---

## 📚 Detaillierte Anleitung

Siehe: `docs/COMPENSATION_SIMULATOR_SETUP.md`

---

## 🎯 Nächster Schritt

Wenn alles funktioniert → **Phase 2: Genealogy Tree** starten! 🚀

