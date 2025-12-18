# ✅ Testing Checklist - Alle Features

## 🚀 Vorbereitung

- [ ] Backend starten: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
- [ ] Frontend starten: `npm run dev`
- [ ] Browser öffnen: `http://localhost:5173`

---

## 1️⃣ Compensation Plan Simulator

### Basis-Test:
- [ ] Route öffnet: `/compensation-simulator`
- [ ] Navigation Link funktioniert (Tools → Compensation Simulator)
- [ ] Company-Dropdown zeigt Firmen
- [ ] Formular kann ausgefüllt werden
- [ ] Team-Mitglieder können hinzugefügt werden
- [ ] Team-Mitglieder können entfernt werden

### Berechnung-Test:
- [ ] Firma wählen: "herbalife"
- [ ] Name eingeben: "Test User"
- [ ] Rang: "Supervisor"
- [ ] Personal Volume: `500`
- [ ] Group Volume: `3500`
- [ ] Team-Mitglied hinzufügen:
  - Name: "Anna"
  - Rang: "Distributor"
  - Personal Volume: `200`
- [ ] "Provisionen berechnen" klicken
- [ ] Ergebnis wird angezeigt:
  - [ ] Total Earnings
  - [ ] Total Volume
  - [ ] Rang
  - [ ] Commission Breakdown

### Auto-Load Test (Genealogy Integration):
- [ ] "Aus Genealogy laden" Button ist sichtbar
- [ ] Button ist aktiv (wenn Company gewählt)
- [ ] Klick auf "Aus Genealogy laden"
- [ ] Team-Daten werden geladen (wenn vorhanden)
- [ ] User-Daten werden auto-gefüllt
- [ ] Berechnung funktioniert mit geladenen Daten

---

## 2️⃣ Genealogy Tree

### Basis-Test:
- [ ] Route öffnet: `/genealogy`
- [ ] Navigation Link funktioniert (Tools → Genealogy Tree)
- [ ] Tree wird geladen (oder "Keine Daten" Message)

### Visualisierung-Test:
- [ ] Tree-Struktur wird angezeigt (wenn Daten vorhanden)
- [ ] Nodes sind sichtbar
- [ ] Node-Size entspricht Volumen
- [ ] Node-Color zeigt Status
- [ ] Klick auf Node zeigt Details

### Filter-Test:
- [ ] Search-Feld funktioniert
- [ ] Rang-Filter funktioniert
- [ ] Filter ändert Tree-Anzeige

### Statistiken-Test:
- [ ] Total Members wird angezeigt
- [ ] Active Count wird angezeigt
- [ ] Total Volume wird angezeigt
- [ ] Levels werden angezeigt

---

## 3️⃣ Integration (Simulator + Genealogy)

- [ ] Im Simulator: "Aus Genealogy laden" klicken
- [ ] Team-Daten werden geladen
- [ ] Formular wird auto-gefüllt
- [ ] Berechnung funktioniert mit geladenen Daten
- [ ] Keine Fehler in Console

---

## 4️⃣ Mobile App

### Screen-Test:
- [ ] `CompensationSimulatorScreen.tsx` existiert
- [ ] Screen kann gerendert werden
- [ ] Formular funktioniert auf Mobile
- [ ] Berechnung funktioniert
- [ ] Ergebnisse werden angezeigt

**Hinweis:** Navigation muss noch in `AppNavigator.tsx` hinzugefügt werden!

---

## 5️⃣ Mehr Comp Plans

### Party Plan Test:
- [ ] Im Simulator: Company "party-plan" wählen
- [ ] Berechnung funktioniert
- [ ] Host Bonus wird berechnet
- [ ] Booking Bonus wird berechnet
- [ ] Team Bonus wird berechnet

### Generation Plan Test:
- [ ] Im Simulator: Company "generation-plan" wählen
- [ ] Berechnung funktioniert
- [ ] Generation 1-6 Commissions werden berechnet
- [ ] Abnehmende Prozentsätze werden angewendet

---

## 🔍 API-Tests (Optional)

### Backend API direkt testen:

```bash
# Compensation Calculate
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

# Genealogy Tree
curl http://localhost:8000/api/genealogy/downline/{user_id}?max_levels=5

# Genealogy Stats
curl http://localhost:8000/api/genealogy/stats/{user_id}
```

---

## ❌ Fehler-Check

- [ ] Keine Console-Errors im Browser
- [ ] Keine Backend-Errors in Terminal
- [ ] API-Calls funktionieren (Network-Tab prüfen)
- [ ] CORS funktioniert (keine CORS-Errors)

---

## ✅ Fertig!

Wenn alle Tests erfolgreich sind → **Alle Features funktionieren!** 🎉

