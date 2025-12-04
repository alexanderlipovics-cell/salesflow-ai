# ✅ Frontend-Test Checkliste

**Datum:** ___________  
**Tester:** ___________

---

## 🚀 Vorbereitung

- [ ] Backend läuft auf Port 8001
- [ ] Expo startet (`npx expo start`)
- [ ] App geöffnet (Expo Go oder Browser)

---

## 📱 Navigation

- [ ] Alle 5 Tabs sichtbar: Home, DMO, Kontakte, MENTOR, Team
- [ ] Navigation zwischen Tabs funktioniert
- [ ] Keine Fehler beim Wechseln

---

## 💬 MENTOR Chat Screen

### Quick Action Buttons
- [ ] **💪 Motivation** Button klicken → Antwort erhalten?
- [ ] **❓ Einwand-Hilfe** Button klicken → Antwort erhalten?
- [ ] **📋 Script für heute** Button klicken → Antwort erhalten?
- [ ] **📊 Mein DMO Status** Button klicken → Antwort erhalten?

### Chat-Funktionalität
- [ ] Normale Nachricht senden → Antwort erhalten?
- [ ] Action Tags werden geparst? (z.B. "Zeig mir meine Kontakte" → Button erscheint?)
- [ ] Buttons funktionieren?

### Fehlerbehandlung
- [ ] Backend stoppen → Nachricht senden → Fehlermeldung erscheint?
- [ ] Keine Legacy-Fallback-Aufrufe in Console?

---

## 📊 DMO Tracker Screen

- [ ] Screen lädt ohne Fehler
- [ ] DMO Status wird angezeigt
- [ ] Metriken können erhöht werden (Tap auf +)
- [ ] Fortschrittsbalken aktualisiert sich
- [ ] Datum wechseln funktioniert

---

## 👥 Kontakte Screen

- [ ] Kontakte werden geladen
- [ ] Liste wird angezeigt
- [ ] Neuer Kontakt erstellen funktioniert
- [ ] Kontakt bearbeiten funktioniert
- [ ] Kontakt löschen funktioniert
- [ ] Filter/Suche funktioniert

**Network-Tab prüfen:**
- [ ] Requests gehen an `/api/v2/contacts`?
- [ ] Keine Requests an `/api/leads` (alt)?

---

## 🧠 ObjectionBrain Screen

- [ ] Einwand eingeben (z.B. "keine Zeit")
- [ ] Vertical auswählen (Network Marketing)
- [ ] Channel auswählen (WhatsApp)
- [ ] "Analysieren" klicken
- [ ] Antwort wird angezeigt

**Network-Tab prüfen:**
- [ ] Request geht an `/api/v2/mentor/quick-action`?
- [ ] Keine Requests an `/api/objection-brain/generate` (alt)?

---

## 👨‍👩‍👧‍👦 Team Dashboard Screen

- [ ] Screen lädt ohne Fehler
- [ ] Team-Mitglieder werden angezeigt
- [ ] Team-Stats werden angezeigt
- [ ] Alerts werden angezeigt

---

## 🏠 Home Screen

- [ ] Dashboard lädt
- [ ] KPIs werden angezeigt
- [ ] Quick Actions funktionieren

---

## 🐛 Console-Fehler prüfen

1. Developer Tools öffnen (F12)
2. Console-Tab öffnen
3. Prüfe auf:
   - [ ] Keine 404-Fehler für alte Endpoints
   - [ ] Keine CORS-Fehler
   - [ ] Keine Auth-Fehler (außer wenn nicht eingeloggt)

---

## 🌐 Network-Tab prüfen

1. Network-Tab öffnen
2. Filter: "Fetch/XHR"
3. Prüfe:
   - [ ] Requests gehen an `/api/v2/*` oder `/api/v1/*`?
   - [ ] Keine Requests an `/api/ai/*` (alt)?
   - [ ] Keine Requests an `/api/leads` (alt)?
   - [ ] Keine Requests an `/api/objection-brain/*` (alt)?

---

## ✅ Erfolgskriterien

- [ ] Alle Buttons funktionieren
- [ ] Keine Legacy-Endpoint-Aufrufe
- [ ] Keine Console-Fehler
- [ ] Alle Screens laden korrekt

---

## 📝 Bemerkungen

_______________________________________
_______________________________________
_______________________________________

---

## 🎯 Status

- [ ] ✅ BEREIT FÜR PRODUCTION
- [ ] ⚠️  FEHLER GEFUNDEN (siehe Bemerkungen)
- [ ] ❌ NICHT BEREIT

