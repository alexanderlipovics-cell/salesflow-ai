# 🔴 BACKEND START - FINALE LÖSUNG

## ❌ Fehler:
```
ModuleNotFoundError: No module named 'app'
```

## ✅ Lösung 1: PYTHONPATH setzen (Empfohlen)

```powershell
# Im src/backend Verzeichnis
cd src/backend

# PYTHONPATH setzen
$env:PYTHONPATH = (Get-Location).Path

# Backend starten
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ✅ Lösung 2: Python Start-Script verwenden

```powershell
# Im src/backend Verzeichnis
cd src/backend

# Python Script verwenden
python start_backend.py
```

## ✅ Lösung 3: Verbessertes PowerShell Script

```powershell
# Im Hauptverzeichnis
.\START_BACKEND_SIMPLE.ps1
```

## 🔍 Warum der Fehler auftritt:

Python findet das `app` Modul nicht, weil:
1. Das aktuelle Verzeichnis nicht im Python-Path ist
2. Oder das Verzeichnis falsch ist

## ✅ Fix: PYTHONPATH setzen

```powershell
# Im src/backend Verzeichnis
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn app.main:app --reload --port 8000
```

## 📋 Checkliste:

- [x] Im `src/backend` Verzeichnis sein
- [x] `app/main.py` existiert
- [x] `app/__init__.py` existiert
- [ ] PYTHONPATH setzen
- [ ] Backend starten

## 🚀 SOFORT-FIX:

```powershell
cd src/backend
$env:PYTHONPATH = $PWD
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

