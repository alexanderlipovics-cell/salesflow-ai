# 🧪 Komplettes System-Test Guide

## 📋 Übersicht

Dieses Guide führt dich durch alle Tests für das komplette System:
- ✅ Backend API Tests (automatisch)
- ✅ Frontend UI Tests (manuell)
- ✅ Integration Tests

---

## 🚀 Schnellstart

### 1. Backend starten
```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 2. Automatische Tests ausführen
```powershell
# Mit Token
$env:SUPABASE_TOKEN = "YOUR_TOKEN"
.\run_tests.ps1

# Oder ohne Token (nur Health Checks)
python test_complete_system.py
```

### 3. Frontend starten
```powershell
# In neuem Terminal
npx expo start
```

### 4. Manuelle Frontend-Tests
Siehe: `test_frontend_manual.md`

---

## 📊 Test-Übersicht

### Backend Tests (automatisch)

| Test | Endpoint | Status |
|------|----------|--------|
| Health Check | `GET /api/v1/health` | ✅ |
| MENTOR Status | `GET /api/v2/mentor/status` | ✅ |
| Quick Actions | `POST /api/v2/mentor/quick-action` | ✅ |
| MENTOR Chat | `POST /api/v2/mentor/chat` | ✅ |
| MENTOR Context | `GET /api/v2/mentor/context` | ✅ |
| Contacts | `GET /api/v2/contacts` | ✅ |
| DMO | `GET /api/v2/dmo/summary` | ✅ |
| Scripts | `GET /api/v2/scripts` | ✅ |
| Team | `GET /api/v2/team/dashboard` | ✅ |
| Brain | `POST /api/v1/brain/rules` | ✅ |

### Frontend Tests (manuell)

| Screen | Tests |
|--------|-------|
| MENTOR Chat | Quick Actions, Chat, Action Tags |
| DMO Tracker | Status laden, Metriken erhöhen |
| Kontakte | Liste, Erstellen, Bearbeiten |
| ObjectionBrain | Einwand analysieren |
| Team Dashboard | Team-Übersicht |

---

## 🔍 Detaillierte Tests

### Backend API Tests

**Datei:** `test_complete_system.py`

**Ausführen:**
```bash
# Ohne Auth (nur Health Checks)
python test_complete_system.py

# Mit Auth (alle Tests)
python test_complete_system.py YOUR_SUPABASE_TOKEN
```

**Was wird getestet:**
1. ✅ Health Check - Backend erreichbar?
2. ✅ MENTOR Status - Service online?
3. ✅ Quick Actions - Alle 3 Action Types
4. ✅ MENTOR Chat - Normale Nachricht
5. ✅ MENTOR Context - Kontext laden
6. ✅ Contacts API - Liste + Erstellen
7. ✅ DMO API - Status abrufen
8. ✅ Scripts API - Scripts abrufen
9. ✅ Team API - Dashboard laden
10. ✅ Brain API - Rules erstellen

---

### Frontend UI Tests

**Datei:** `test_frontend_manual.md`

**Wichtige Tests:**

#### MENTOR Chat Screen
1. **Quick Action Buttons:**
   - 💪 Motivation → Antwort erhalten?
   - ❓ Einwand-Hilfe → Antwort erhalten?
   - 📋 Script für heute → Antwort erhalten?
   - 📊 Mein DMO Status → Antwort erhalten?

2. **Chat:**
   - Normale Nachricht senden → Antwort?
   - Action Tags werden geparst?
   - Buttons erscheinen?

3. **Fehlerbehandlung:**
   - Backend offline → Fehlermeldung?
   - Keine Legacy-Fallbacks?

#### Kontakte Screen
1. Kontakte werden geladen?
2. Neuer Kontakt erstellen funktioniert?
3. Bearbeiten funktioniert?
4. Network-Tab: Requests an `/api/v2/contacts`?

#### ObjectionBrain Screen
1. Einwand eingeben → Antwort erhalten?
2. Network-Tab: Request an `/api/v2/mentor/quick-action`?

---

## ✅ Erfolgskriterien

### Backend Tests
- ✅ Alle 10 Tests erfolgreich
- ✅ Keine 500-Fehler
- ✅ Response-Zeiten < 2 Sekunden

### Frontend Tests
- ✅ Alle Screens laden ohne Fehler
- ✅ Alle Buttons funktionieren
- ✅ Keine Legacy-Endpoint-Aufrufe
- ✅ Keine Console-Fehler

---

## 🐛 Fehlerbehandlung

### Backend läuft nicht
```powershell
# Prüfe ob Port belegt
netstat -ano | findstr :8001

# Backend starten
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Auth-Fehler
```powershell
# Token setzen
$env:SUPABASE_TOKEN = "YOUR_TOKEN"

# Oder in .env Datei
SUPABASE_TOKEN=YOUR_TOKEN
```

### CORS-Fehler
- Prüfe Backend CORS-Einstellungen
- Prüfe ob Frontend-URL in erlaubten Origins

---

## 📊 Test-Report

Nach allen Tests:

```
✅ Backend Tests: X/10 erfolgreich
✅ Frontend Tests: X/Y erfolgreich
✅ Legacy-Endpoints: 0 Aufrufe
✅ Console-Fehler: 0

Status: ✅ BEREIT FÜR PRODUCTION
```

---

## 🎯 Nächste Schritte nach erfolgreichem Test

1. ✅ Altes Backend löschen: `.\cleanup_old_backend.ps1`
2. ✅ Migration dokumentieren
3. ✅ Deployment vorbereiten

