# 🔴 BACKEND START FEHLER - FIX

## ❌ Fehler:
```
ModuleNotFoundError: No module named 'app'
```

## 🔍 Ursache:
Der Befehl `python -m uvicorn app.main:app --reload --port 8000` muss **im `src/backend` Verzeichnis** ausgeführt werden, nicht in `src/backend/app`.

## ✅ Lösung:

### Option 1: Korrektes Verzeichnis verwenden
```powershell
# WICHTIG: Im src/backend Verzeichnis sein!
cd src/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Option 2: Start-Script verwenden
```powershell
# Im Hauptverzeichnis (salesflow-app)
.\src\backend\START_BACKEND_FIXED.ps1
```

### Option 3: Mit absoluten Pfaden
```powershell
cd src/backend
$env:PYTHONPATH = "$PWD"
python -m uvicorn app.main:app --reload --port 8000
```

## 📋 Checkliste:

- [ ] Im richtigen Verzeichnis: `src/backend`
- [ ] `app/main.py` existiert
- [ ] `app/__init__.py` existiert
- [ ] Python verfügbar
- [ ] Dependencies installiert (`pip install -r requirements.txt`)

## 🚀 Korrekter Start-Befehl:

```powershell
# 1. Ins Backend-Verzeichnis wechseln
cd src/backend

# 2. Prüfen ob alles vorhanden ist
Test-Path "app/main.py"  # Sollte True sein

# 3. Backend starten
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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

