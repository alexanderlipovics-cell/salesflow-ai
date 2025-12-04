# 🧪 Frontend Manuelle Tests

## 📱 Vorbereitung

1. **Backend starten:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

2. **Frontend starten:**
   ```bash
   npx expo start
   ```

3. **App öffnen:**
   - Expo Go auf Handy scannen
   - Oder: `w` für Web-Version

---

## ✅ Test-Checkliste

### 1. Navigation
- [ ] Alle 5 Tabs sichtbar: Home, DMO, Kontakte, MENTOR, Team
- [ ] Navigation zwischen Tabs funktioniert
- [ ] Keine Fehler beim Wechseln

---

### 2. MENTOR Chat Screen

#### Quick Action Buttons
- [ ] **💪 Motivation** Button klicken
  - Erwartet: MENTOR gibt Motivations-Tipp
  - Prüfe: Antwort erscheint im Chat
  
- [ ] **❓ Einwand-Hilfe** Button klicken
  - Erwartet: MENTOR fragt nach Einwand oder gibt Tipps
  - Prüfe: Antwort erscheint im Chat
  
- [ ] **📋 Script für heute** Button klicken
  - Erwartet: MENTOR gibt Script-Vorschläge
  - Prüfe: Antwort erscheint im Chat
  
- [ ] **📊 Mein DMO Status** Button klicken
  - Erwartet: MENTOR zeigt DMO-Zusammenfassung
  - Prüfe: Antwort erscheint im Chat

#### Chat-Funktionalität
- [ ] Normale Nachricht senden
  - Erwartet: MENTOR antwortet
  - Prüfe: Antwort erscheint
  
- [ ] Action Tags testen
  - Sende: "Zeig mir meine Kontakte"
  - Erwartet: Button "👤 Kontakt öffnen" erscheint
  - Prüfe: Button funktioniert

#### Fehlerbehandlung
- [ ] Backend stoppen → Nachricht senden
  - Erwartet: Fehlermeldung erscheint
  - Prüfe: Keine Legacy-Fallback-Aufrufe in Console

---

### 3. DMO Tracker Screen

- [ ] Screen lädt ohne Fehler
- [ ] DMO Status wird angezeigt
- [ ] Metriken können erhöht werden (Tap auf +)
- [ ] Fortschrittsbalken aktualisiert sich
- [ ] Datum wechseln funktioniert

---

### 4. Kontakte Screen

- [ ] Kontakte werden geladen
- [ ] Liste wird angezeigt
- [ ] Neuer Kontakt erstellen funktioniert
- [ ] Kontakt bearbeiten funktioniert
- [ ] Kontakt löschen funktioniert
- [ ] Filter/Suche funktioniert

**Prüfe Network-Tab:**
- [ ] Requests gehen an `/api/v2/contacts`
- [ ] Keine Requests an `/api/leads` (alt)

---

### 5. ObjectionBrain Screen

- [ ] Einwand eingeben (z.B. "keine Zeit")
- [ ] Vertical auswählen (Network Marketing)
- [ ] Channel auswählen (WhatsApp)
- [ ] "Analysieren" klicken
- [ ] Antwort wird angezeigt

**Prüfe Network-Tab:**
- [ ] Request geht an `/api/v2/mentor/quick-action`
- [ ] Keine Requests an `/api/objection-brain/generate` (alt)

---

### 6. Team Dashboard Screen

- [ ] Screen lädt ohne Fehler
- [ ] Team-Mitglieder werden angezeigt
- [ ] Team-Stats werden angezeigt
- [ ] Alerts werden angezeigt

---

### 7. Home Screen

- [ ] Dashboard lädt
- [ ] KPIs werden angezeigt
- [ ] Quick Actions funktionieren

---

## 🐛 Fehlerbehandlung

### Console-Fehler prüfen
1. Developer Tools öffnen (F12)
2. Console-Tab öffnen
3. Prüfe auf:
   - ❌ Keine 404-Fehler für alte Endpoints
   - ❌ Keine CORS-Fehler
   - ❌ Keine Auth-Fehler (außer wenn nicht eingeloggt)

### Network-Tab prüfen
1. Network-Tab öffnen
2. Filter: "Fetch/XHR"
3. Prüfe:
   - ✅ Requests gehen an `/api/v2/*` oder `/api/v1/*`
   - ❌ Keine Requests an `/api/ai/*` (alt)
   - ❌ Keine Requests an `/api/leads` (alt)
   - ❌ Keine Requests an `/api/objection-brain/*` (alt)

---

## ✅ Erfolgreicher Test

Wenn alle Tests erfolgreich:
- ✅ Alle Buttons funktionieren
- ✅ Keine Legacy-Endpoint-Aufrufe
- ✅ Keine Console-Fehler
- ✅ Alle Screens laden korrekt

**Dann kannst du:**
1. ✅ Altes Backend mit `cleanup_old_backend.ps1` löschen
2. ✅ Migration als abgeschlossen markieren

---

## 📊 Test-Report Vorlage

```
Datum: ___________
Tester: ___________

Navigation: ✅ / ❌
MENTOR Chat: ✅ / ❌
Quick Actions: ✅ / ❌
DMO Tracker: ✅ / ❌
Kontakte: ✅ / ❌
ObjectionBrain: ✅ / ❌
Team Dashboard: ✅ / ❌

Console-Fehler: Ja / Nein
Legacy-Endpoints: Ja / Nein

Bemerkungen:
_______________________________________
```

