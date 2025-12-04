# 🚀 BACKEND START - ANLEITUNG

## ❌ Problem:
```
ModuleNotFoundError: No module named 'app'
```

## ✅ Lösung: PYTHONPATH setzen

### **Option 1: PowerShell Script (Empfohlen)**

```powershell
# Im Hauptverzeichnis (salesflow-app)
.\SOFORT_START_BACKEND.ps1
```

### **Option 2: Manuell im Terminal**

```powershell
# 1. Ins Backend-Verzeichnis wechseln
cd src/backend

# 2. PYTHONPATH setzen (WICHTIG!)
$env:PYTHONPATH = (Get-Location).Path

# 3. Backend starten
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Option 3: Python Script**

```powershell
cd src/backend
python start_backend.py
```

## 🔍 Warum funktioniert es jetzt?

Python findet das `app` Modul nicht, weil das aktuelle Verzeichnis nicht automatisch im Python-Path ist. Durch Setzen von `PYTHONPATH` wird das aktuelle Verzeichnis zum Python-Path hinzugefügt.

## ✅ Erwartete Ausgabe:

```
INFO:     Will watch for changes in these directories: ['C:\\...\\src\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 📋 Checkliste:

- [x] Im `src/backend` Verzeichnis sein
- [x] `app/main.py` existiert
- [x] `app/__init__.py` existiert
- [x] PYTHONPATH setzen
- [ ] Backend starten

## 🎯 Status:

✅ **Problem identifiziert:** Python-Path fehlt
✅ **Lösung gefunden:** PYTHONPATH setzen
✅ **Scripts erstellt:** `SOFORT_START_BACKEND.ps1`, `start_backend.py`
✅ **Dokumentation:** `BACKEND_START_ANLEITUNG.md`

---

## 🚀 JETZT STARTEN:

```powershell
.\SOFORT_START_BACKEND.ps1
```

Oder manuell:
```powershell
cd src/backend
$env:PYTHONPATH = $PWD
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

