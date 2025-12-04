# 🚀 BACKEND START - QUICK FIX

## ❌ Fehler:
```
ModuleNotFoundError: No module named 'app'
```

## ✅ Lösung:

### **WICHTIG:** Im richtigen Verzeichnis starten!

```powershell
# 1. Ins Backend-Verzeichnis wechseln
cd src/backend

# 2. Prüfen (sollte True sein)
Test-Path "app/main.py"

# 3. Backend starten
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🔍 Warum der Fehler auftritt:

Der Befehl `uvicorn app.main:app` sucht nach einem Modul namens `app` im aktuellen Verzeichnis. Wenn du im falschen Verzeichnis bist, findet Python das Modul nicht.

**Richtig:** `src/backend/` → `app/main.py` existiert ✅
**Falsch:** `src/backend/app/` → Python sucht nach `app/app/main.py` ❌

## 📋 Checkliste:

- [x] Im `src/backend` Verzeichnis sein
- [x] `app/main.py` existiert
- [x] `app/__init__.py` existiert
- [ ] Python verfügbar
- [ ] Dependencies installiert

## 🚀 Start-Script verwenden:

```powershell
# Im Hauptverzeichnis (salesflow-app)
.\src\backend\START_BACKEND_FIXED.ps1
```

## ✅ Erwartete Ausgabe:

```
INFO:     Will watch for changes in these directories: ['C:\\...\\src\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

