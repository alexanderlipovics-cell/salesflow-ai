# 🧪 PROMPT TESTING CHECKLIST

## ✅ Vorbereitung

### 1. Backend starten
```powershell
cd src/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Erwartete Ausgabe:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 2. Frontend starten
```powershell
npm start
```

### 3. API-Verbindung prüfen
- Öffne Browser DevTools → Console
- Prüfe ob `ERR_CONNECTION_REFUSED` Fehler verschwunden sind
- Backend sollte auf `http://localhost:8000` erreichbar sein

---

## 🧪 TEST 1: Network Marketing Vertical

### Setup
1. **Settings öffnen** → Einstellungen
2. **Vertical auswählen** → "Network Marketing" (👥)
3. **Module aktivieren:**
   - ✅ MENTOR Chat
   - ✅ DMO Tracker
   - ✅ Team Dashboard
   - ✅ Scripts Library
   - ✅ Kontakte

### Test-Nachrichten

#### Test 1.1: Motivation
**Nachricht:**
```
Ich brauche Motivation für heute. Push mich!
```

**Erwartetes Verhalten:**
- ✅ MENTOR antwortet (nicht CHIEF)
- ✅ Motivierender, Network Marketing-spezifischer Stil
- ✅ Erwähnt DMO Tracker, Team Dashboard
- ✅ Verwendet MLM-Terminologie:
  - "Kontakte" statt "Leads"
  - "Partner/Kunden" statt "Deals"
  - "Team-Aufbau" statt "Pipeline"
  - "Warm Market Gespräch" statt "Cold Call"

#### Test 1.2: Einwandbehandlung
**Nachricht:**
```
Mein Kontakt sagt "Das ist doch eine Pyramide". Wie reagiere ich?
```

**Erwartetes Verhalten:**
- ✅ MENTOR zeigt Verständnis
- ✅ Erklärt FTC-Unterschied
- ✅ Schlägt persönliche Story vor
- ✅ Fokus auf Produkt

#### Test 1.3: DMO Tracker
**Nachricht:**
```
Zeig mir meinen DMO Status
```

**Erwartetes Verhalten:**
- ✅ Erwähnt DMO Tracker
- ✅ Gibt Tipps für Daily Method of Operation
- ✅ Motiviert für tägliche Aktivitäten

---

## 🧪 TEST 2: Field Sales Vertical

### Setup
1. **Settings öffnen** → Einstellungen
2. **Vertical wechseln** → "Außendienst B2B" (💼)
3. **Module aktivieren:**
   - ✅ MENTOR Chat
   - ✅ Außendienst Cockpit
   - ✅ Phoenix Modul
   - ✅ DelayMaster
   - ✅ Route Planner
   - ✅ Industry Radar
   - ✅ Kontakte

### Test-Nachrichten

#### Test 2.1: Lead Wiederbelebung
**Nachricht:**
```
Ich habe einen kalten Lead, der nicht antwortet. Was soll ich tun?
```

**Erwartetes Verhalten:**
- ✅ CHIEF antwortet (nicht MENTOR)
- ✅ Schlägt Phoenix Modul vor (Lead Wiederbelebung)
- ✅ Erwähnt DelayMaster für Timing-Optimierung
- ✅ Verwendet B2B-Terminologie:
  - "Prospects/Accounts" statt "Kontakte"
  - "Follow-ups" statt "Check-ins"
  - "Territory" statt "Team"
- ✅ Fokus auf ROI und Entscheider

#### Test 2.2: Timing-Optimierung
**Nachricht:**
```
Wann ist der beste Zeitpunkt für einen Follow-up?
```

**Erwartetes Verhalten:**
- ✅ Erwähnt DelayMaster
- ✅ Gibt timing-spezifische Tipps
- ✅ Berücksichtigt Buying Signals

#### Test 2.3: Industry Radar
**Nachricht:**
```
Was sind die Trends in meiner Branche?
```

**Erwartetes Verhalten:**
- ✅ Erwähnt Industry Radar
- ✅ Gibt branchenspezifische Insights
- ✅ Fokus auf Go-to-Market Strategien

---

## 🧪 TEST 3: Vertical-Wechsel

### Setup
1. **Network Marketing** → Chat-Nachricht senden
2. **Vertical wechseln** → Field Sales
3. **Gleiche Nachricht erneut senden**

### Test-Nachricht
```
Ich brauche Hilfe bei einem schwierigen Gespräch
```

### Erwartetes Verhalten
- ✅ **Network Marketing:** MENTOR-Stil, MLM-Terminologie, DMO/Team-Fokus
- ✅ **Field Sales:** CHIEF-Stil, B2B-Terminologie, Phoenix/DelayMaster-Fokus
- ✅ Unterschiedliche Antworten je nach Vertical
- ✅ Unterschiedliche Module-Erwähnungen

---

## 🧪 TEST 4: Module-Aktivierung

### Setup
1. **Settings öffnen** → Module
2. **Module deaktivieren:** Phoenix, DelayMaster
3. **Chat öffnen** → Nachricht senden

### Test-Nachricht
```
Was kann ich heute tun, um mehr Abschlüsse zu machen?
```

### Erwartetes Verhalten
- ✅ Nur aktivierte Module werden erwähnt
- ✅ Phoenix/DelayMaster werden NICHT erwähnt
- ✅ Andere aktivierte Module werden erwähnt

---

## 🧪 TEST 5: Skill-Level

### Setup
1. **Profil prüfen** → Skill-Level setzen
2. **Chat öffnen** → Nachricht senden

### Test-Nachricht
```
Erkläre mir, wie ich einen Lead qualifiziere
```

### Erwartetes Verhalten

#### Rookie (Anfänger)
- ✅ Mehr Erklärungen
- ✅ Einfachere Sprache
- ✅ Schritt-für-Schritt Anleitung
- ✅ Grundlagen-Fokus

#### Intermediate (Fortgeschritten)
- ✅ Ausgewogene Erklärungen
- ✅ Strategische Tipps
- ✅ Best Practices

#### Expert (Experte)
- ✅ Direkter Stil
- ✅ Fortgeschrittene Strategien
- ✅ Optimierungs-Tipps
- ✅ Weniger Grundlagen

---

## 🧪 TEST 6: Action Tags

### Test-Nachricht
```
Zeig mir einen Kontakt mit hohem Score
```

### Erwartetes Verhalten
- ✅ Response enthält `[[ACTION:SHOW_CONTACT:id]]` Tag
- ✅ Frontend parst Action Tag
- ✅ Button "Kontakt öffnen" wird angezeigt
- ✅ Action wird korrekt ausgeführt

---

## 📊 Debugging

### Backend-Logs prüfen
```bash
# Im Backend-Terminal sollten erscheinen:
Loading prompt for vertical: network_marketing
Building context for user: ...
POST /api/v2/mentor/chat 200
```

### Frontend-Logs prüfen
```javascript
// In Browser Console:
API URL: http://localhost:8000/api/v2/mentor/chat
Response: { message: "...", actions: [...] }
```

### Häufige Fehler

#### ❌ ERR_CONNECTION_REFUSED
**Lösung:** Backend läuft nicht → Starte Backend

#### ❌ 404 Not Found
**Lösung:** API-URL falsch → Prüfe `apiConfig.js`

#### ❌ 500 Internal Server Error
**Lösung:** Backend-Fehler → Prüfe Backend-Logs

#### ❌ Prompt nicht geladen
**Lösung:** Prüfe ob `backend/prompts/` existiert

---

## ✅ Erfolgskriterien

- [ ] Backend läuft auf Port 8000
- [ ] Frontend verbunden
- [ ] Network Marketing Prompt funktioniert
- [ ] Field Sales Prompt funktioniert
- [ ] Vertical-Wechsel funktioniert
- [ ] Module-Aktivierung funktioniert
- [ ] Skill-Level wird berücksichtigt
- [ ] Action Tags werden geparst
- [ ] Keine Fehler in Console
- [ ] Unterschiedliche Terminologie je Vertical
- [ ] Unterschiedliche Module-Erwähnungen

---

## 🎯 Nächste Schritte

Nach erfolgreichem Testing:
1. ✅ Prompts dokumentieren
2. ✅ Edge Cases testen
3. ✅ Performance prüfen
4. ✅ User Feedback sammeln

