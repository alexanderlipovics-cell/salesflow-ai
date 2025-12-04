# 🧪 Test-Status Übersicht

**Letzte Aktualisierung:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📁 Test-Dateien

| Datei | Beschreibung | Status |
|------|-------------|--------|
| `test_complete_system.py` | Automatische Backend-Tests | ✅ Bereit |
| `test_frontend_manual.md` | Manuelle Frontend-Tests | ✅ Bereit |
| `run_tests.ps1` | PowerShell Test-Runner | ✅ Bereit |
| `run_tests.sh` | Bash Test-Runner (Linux/Mac) | ✅ Bereit |
| `TESTING_GUIDE.md` | Vollständige Test-Dokumentation | ✅ Bereit |
| `cleanup_old_backend.ps1` | Backend-Cleanup Script | ✅ Bereit |

---

## 🚀 Schnellstart

### 1. Backend starten
```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 2. Automatische Tests
```powershell
# Ohne Token (nur Health Checks)
python test_complete_system.py

# Mit Token (alle Tests)
$env:SUPABASE_TOKEN = "YOUR_TOKEN"
python test_complete_system.py $env:SUPABASE_TOKEN

# Oder mit Script
.\run_tests.ps1
```

### 3. Frontend starten
```powershell
# In neuem Terminal
npx expo start
```

### 4. Manuelle Tests
Siehe: `test_frontend_manual.md`

---

## ✅ Test-Checkliste

### Backend API Tests
- [ ] Health Check (`GET /api/v1/health`)
- [ ] MENTOR Status (`GET /api/v2/mentor/status`)
- [ ] Quick Actions (`POST /api/v2/mentor/quick-action`)
- [ ] MENTOR Chat (`POST /api/v2/mentor/chat`)
- [ ] MENTOR Context (`GET /api/v2/mentor/context`)
- [ ] Contacts API (`GET /api/v2/contacts`)
- [ ] DMO API (`GET /api/v2/dmo/summary`)
- [ ] Scripts API (`GET /api/v2/scripts`)
- [ ] Team API (`GET /api/v2/team/dashboard`)
- [ ] Brain API (`POST /api/v1/brain/rules`)

### Frontend UI Tests
- [ ] Navigation (5 Tabs)
- [ ] MENTOR Chat Screen
  - [ ] Quick Action Buttons
  - [ ] Chat-Funktionalität
  - [ ] Action Tags
- [ ] DMO Tracker Screen
- [ ] Kontakte Screen
- [ ] ObjectionBrain Screen
- [ ] Team Dashboard Screen

### Integration Tests
- [ ] Keine Legacy-Endpoint-Aufrufe
- [ ] Keine Console-Fehler
- [ ] Auth-Token wird gesendet
- [ ] CORS funktioniert

---

## 📊 Erwartete Ergebnisse

### Backend Tests
```
✅ Health Check: OK
✅ MENTOR Status: Version 2.0
✅ Quick Actions: 3/3 erfolgreich
✅ MENTOR Chat: Antwort erhalten
✅ MENTOR Context: Kontext geladen
✅ Contacts: X Kontakte gefunden
✅ DMO: Status geladen
✅ Scripts: X Scripts gefunden
✅ Team: Dashboard geladen
✅ Brain: Rule erstellt
```

### Frontend Tests
```
✅ Navigation: Alle Tabs funktionieren
✅ MENTOR Chat: Quick Actions funktionieren
✅ DMO Tracker: Metriken funktionieren
✅ Kontakte: CRUD funktioniert
✅ ObjectionBrain: Einwand-Analyse funktioniert
✅ Team Dashboard: Team-Übersicht geladen
```

---

## 🐛 Bekannte Probleme

### Backend läuft nicht
**Lösung:**
```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Auth-Fehler
**Lösung:**
```powershell
$env:SUPABASE_TOKEN = "YOUR_TOKEN"
```

### Port bereits belegt
**Lösung:**
```powershell
# Prüfe welcher Prozess Port 8001 nutzt
netstat -ano | findstr :8001

# Oder ändere Port in backend/app/main.py
```

---

## 🎯 Nächste Schritte

1. **Backend starten** → `cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001`
2. **Automatische Tests** → `python test_complete_system.py`
3. **Frontend starten** → `npx expo start`
4. **Manuelle Tests** → Siehe `test_frontend_manual.md`
5. **Cleanup** → `.\cleanup_old_backend.ps1` (nach erfolgreichem Test)

---

## 📝 Test-Report Vorlage

```
Datum: ___________
Tester: ___________

Backend Tests: X/10 ✅
Frontend Tests: X/Y ✅
Legacy-Endpoints: 0 ❌
Console-Fehler: 0 ❌

Status: ✅ BEREIT / ❌ FEHLER

Bemerkungen:
_______________________________________
```

---

## 🔗 Weitere Dokumentation

- **Vollständige Anleitung:** `TESTING_GUIDE.md`
- **Frontend Tests:** `test_frontend_manual.md`
- **Migration Status:** `MIGRATION_COMPLETED.md`
- **Cleanup:** `cleanup_old_backend.ps1`

