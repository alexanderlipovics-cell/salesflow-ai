# 🎯 Compensation Plan Simulator - Setup & Testing Guide

## ✅ Was wurde implementiert

1. **Frontend Komponente**: `src/components/compensation/CompensationSimulator.tsx`
2. **API Service**: `src/services/compensationApi.ts`
3. **Page**: `src/pages/CompensationSimulatorPage.tsx`
4. **Route**: `/compensation-simulator`

---

## 🚀 Was du jetzt machen musst

### Schritt 1: Backend starten

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Wichtig:** Stelle sicher, dass das Backend läuft, sonst funktioniert die API nicht!

---

### Schritt 2: Frontend starten

```bash
# Im Root-Verzeichnis
npm run dev
# oder
yarn dev
```

---

### Schritt 3: Simulator testen

1. **Öffne die App** im Browser: `http://localhost:5173` (oder dein Frontend-Port)

2. **Navigiere zum Simulator:**
   - URL: `http://localhost:5173/compensation-simulator`
   - Oder: Füge einen Link in die Navigation ein (siehe Schritt 4)

3. **Teste die Berechnung:**
   - Wähle eine Firma aus (z.B. "Herbalife")
   - Gib deine Daten ein:
     - Name: "Max Mustermann"
     - Rang: "Supervisor"
     - Personal Volume: 500
     - Group Volume: 3500
   - Füge Team-Mitglieder hinzu:
     - Klicke auf "+ Hinzufügen"
     - Name: "Anna Schmidt"
     - Rang: "Distributor"
     - Personal Volume: 200
   - Klicke auf "Provisionen berechnen"

4. **Ergebnis prüfen:**
   - Du solltest "Total Earnings" sehen
   - Commission Breakdown sollte angezeigt werden
   - Alle Commission-Typen sollten aufgelistet sein

---

### Schritt 4: Navigation erweitern (Optional)

Füge einen Link zum Simulator in die Navigation ein:

**Datei:** `src/layout/AppShell.tsx` oder `src/layout/AppShell.jsx`

**Hinzufügen:**
```typescript
{
  name: 'Compensation Simulator',
  href: '/compensation-simulator',
  icon: Calculator, // Import: import { Calculator } from 'lucide-react';
}
```

---

## 🔍 Mögliche Probleme & Lösungen

### Problem 1: "API request failed" oder CORS-Fehler

**Lösung:**
- Prüfe ob Backend läuft: `http://localhost:8000/health`
- Prüfe CORS-Einstellungen in `backend/app/main.py`
- Stelle sicher, dass `VITE_API_BASE_URL` in `.env` gesetzt ist

**Datei:** `.env` (im Root)
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

### Problem 2: "Plan nicht gefunden"

**Lösung:**
- Prüfe ob Company-ID korrekt ist (z.B. "herbalife", "doterra")
- Prüfe Backend-Logs für Fehler
- Stelle sicher, dass Compensation Plans in `backend/app/services/compensation_plans.py` vorhanden sind

---

### Problem 3: Keine Companies im Dropdown

**Lösung:**
- Prüfe `src/services/compensationService.ts` - `loadAvailableCompanies()`
- Stelle sicher, dass `src/config/compensation/index.ts` Companies exportiert

---

### Problem 4: TypeScript-Fehler

**Lösung:**
```bash
# TypeScript prüfen
npm run type-check
# oder
npx tsc --noEmit
```

Falls Fehler auftreten, prüfe:
- Alle Imports sind korrekt
- Types sind definiert in `src/services/compensationApi.ts`

---

## 📊 API-Endpoints die verwendet werden

### 1. GET `/api/compensation/plans`
Holt alle verfügbaren Plans

**Response:**
```json
{
  "plans": [
    {
      "id": "herbalife",
      "name": "Herbalife",
      "type": "breakaway"
    }
  ]
}
```

### 2. POST `/api/compensation/calculate`
Berechnet Provisionen

**Request:**
```json
{
  "company_id": "herbalife",
  "user": {
    "id": "user-1",
    "name": "Max Mustermann",
    "rank": "Supervisor",
    "personal_volume": 500.0,
    "group_volume": 3500.0
  },
  "team": [
    {
      "id": "team-1",
      "name": "Anna Schmidt",
      "rank": "Distributor",
      "personal_volume": 200.0
    }
  ]
}
```

**Response:**
```json
{
  "user_id": "user-1",
  "company_id": "herbalife",
  "rank": "Supervisor",
  "total_earnings": 1234.56,
  "commissions": [...],
  "summary": {...}
}
```

---

## 🧪 Test-Daten

### Beispiel 1: Herbalife (Breakaway Plan)

**User:**
- Name: "Max Mustermann"
- Rang: "Supervisor"
- Personal Volume: 500
- Group Volume: 3500

**Team:**
- Anna Schmidt, Distributor, PV: 200
- Peter Müller, Distributor, PV: 300

**Erwartetes Ergebnis:**
- Total Earnings: ~500-1000€ (je nach Plan-Details)
- Commission Types: Wholesale, Royalties, Production Bonus

---

## ✅ Checkliste

- [ ] Backend läuft (`http://localhost:8000/health`)
- [ ] Frontend läuft (`http://localhost:5173`)
- [ ] Simulator öffnet (`/compensation-simulator`)
- [ ] Company-Dropdown zeigt Firmen
- [ ] Formular kann ausgefüllt werden
- [ ] Team-Mitglieder können hinzugefügt werden
- [ ] Berechnung funktioniert
- [ ] Ergebnisse werden angezeigt
- [ ] Keine Console-Errors

---

## 🎯 Nächste Schritte (nach erfolgreichem Test)

### Phase 2: Genealogy Tree Integration

1. **Backend API erstellen** (`backend/app/routers/genealogy.py`)
2. **Frontend Tree-Visualisierung** (`src/components/genealogy/GenealogyTree.tsx`)
3. **Auto-Load Feature** im Simulator

**Vorteil:** User kann Team-Daten automatisch aus Genealogy laden!

---

## 📝 Notizen

- **PDF Export** ist vorbereitet, aber noch nicht implementiert
- **Charts/Visualisierung** kann später mit Chart.js oder Recharts erweitert werden
- **Offline-Modus** für Mobile App kann später hinzugefügt werden

---

## 🆘 Hilfe

Falls etwas nicht funktioniert:

1. **Backend-Logs prüfen:**
   ```bash
   # Im Backend-Terminal
   # Fehler sollten hier erscheinen
   ```

2. **Browser Console prüfen:**
   - F12 öffnen
   - Console-Tab checken
   - Network-Tab für API-Calls prüfen

3. **API direkt testen:**
   ```bash
   curl -X POST http://localhost:8000/api/compensation/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "company_id": "herbalife",
       "user": {
         "id": "user-1",
         "name": "Test",
         "rank": "Supervisor",
         "personal_volume": 500,
         "group_volume": 3500
       },
       "team": []
     }'
   ```

---

## ✅ Fertig!

Wenn alles funktioniert, kannst du mit **Phase 2: Genealogy Tree** weitermachen! 🚀

