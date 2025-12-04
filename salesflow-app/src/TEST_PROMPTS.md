# 🧪 PROMPT TESTING GUIDE

## Vorbereitung

### 1. Backend starten
```powershell
cd src/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend starten
```powershell
npm start
```

## Test-Szenarien

### Test 1: Network Marketing Vertical
1. **Settings öffnen** → Vertical auf "Network Marketing" setzen
2. **Chat öffnen** → MENTOR sollte aktiv sein
3. **Test-Nachricht senden:**
   ```
   "Ich brauche Motivation für heute. Push mich!"
   ```
4. **Erwartetes Verhalten:**
   - MENTOR antwortet mit motivierendem, Network Marketing-spezifischem Stil
   - Verwendet MLM-Terminologie (Kontakte, Partner, Team-Aufbau)
   - Erwähnt DMO Tracker, Team Dashboard, Scripts

### Test 2: Field Sales Vertical
1. **Settings öffnen** → Vertical auf "Außendienst B2B" setzen
2. **Chat öffnen** → CHIEF sollte aktiv sein
3. **Test-Nachricht senden:**
   ```
   "Ich habe einen kalten Lead, der nicht antwortet. Was soll ich tun?"
   ```
4. **Erwartetes Verhalten:**
   - CHIEF schlägt Phoenix Modul vor (Lead Wiederbelebung)
   - Erwähnt DelayMaster für Timing-Optimierung
   - Verwendet B2B-Terminologie (Prospects, Accounts, Follow-ups)
   - Fokus auf ROI und Entscheider

### Test 3: Vertical-Wechsel
1. **Network Marketing** → Chat-Nachricht senden
2. **Vertical wechseln** → Field Sales
3. **Gleiche Nachricht erneut senden**
4. **Erwartetes Verhalten:**
   - Unterschiedliche Antworten je nach Vertical
   - Unterschiedliche Terminologie
   - Unterschiedliche Module-Erwähnungen

### Test 4: Module-Aktivierung
1. **Settings öffnen** → Module aktivieren/deaktivieren
2. **Chat öffnen** → Nachricht senden
3. **Erwartetes Verhalten:**
   - Nur aktivierte Module werden erwähnt
   - Deaktivierte Module werden nicht erwähnt

### Test 5: Skill-Level Testing
1. **Profil prüfen** → Skill-Level setzen (rookie, intermediate, expert)
2. **Chat öffnen** → Nachricht senden
3. **Erwartetes Verhalten:**
   - Rookie: Mehr Erklärungen, einfachere Sprache
   - Expert: Direkter, fortgeschrittene Strategien

## Checkliste

- [ ] Backend läuft auf Port 8000
- [ ] Frontend verbunden
- [ ] Network Marketing Prompt funktioniert
- [ ] Field Sales Prompt funktioniert
- [ ] Vertical-Wechsel funktioniert
- [ ] Module-Aktivierung funktioniert
- [ ] Skill-Level wird berücksichtigt
- [ ] Action Tags werden korrekt geparst
- [ ] Keine Fehler in Console

## Debugging

### Backend-Logs prüfen
- Prompts werden geladen: `Loading prompt for vertical: ...`
- User-Context wird gebaut: `Building context for user: ...`
- API-Call erfolgreich: `POST /api/v2/mentor/chat 200`

### Frontend-Logs prüfen
- API-URL korrekt: `http://127.0.0.1:8000/api/v2/mentor/chat`
- Response enthält `message` und `actions`
- Keine Connection-Errors

