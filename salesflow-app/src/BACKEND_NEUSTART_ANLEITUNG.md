# 🔄 Backend Neustart - Anleitung

## 🎯 Schnellstart

### Option 1: Automatisches Skript (Empfohlen)

```powershell
# Im src/backend Verzeichnis
cd src/backend
.\RESTART_BACKEND.ps1
```

### Option 2: Manuell

#### Schritt 1: Backend stoppen

**Methode A: Port 8000 belegen**
```powershell
# Finde Prozess auf Port 8000
$process = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | 
    ForEach-Object { Get-Process -Id $_.OwningProcess }

# Stoppe Prozess
if ($process) {
    Stop-Process -Id $process.Id -Force
    Write-Host "✅ Backend gestoppt" -ForegroundColor Green
}
```

**Methode B: Alle Python-Prozesse stoppen (Vorsicht!)**
```powershell
# Finde uvicorn-Prozesse
Get-Process python | Where-Object {
    $_.CommandLine -like "*uvicorn*"
} | Stop-Process -Force
```

**Methode C: Task Manager**
1. Öffne Task Manager (Ctrl+Shift+Esc)
2. Suche nach "python.exe"
3. Rechtsklick → "Task beenden"

#### Schritt 2: Backend neu starten

```powershell
# Ins Backend-Verzeichnis wechseln
cd src/backend

# PYTHONPATH setzen
$env:PYTHONPATH = (Get-Location).Path

# Backend starten
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ✅ Erfolgreicher Neustart

Du siehst diese Ausgabe:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using WatchFiles
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## 🔍 Prüfen ob Backend läuft

```powershell
# Prüfe ob Port 8000 belegt ist
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# Oder teste die API
curl http://127.0.0.1:8000/docs
```

## ⚠️ Troubleshooting

### Fehler: "Port 8000 bereits belegt"

**Lösung:**
```powershell
# Finde und stoppe Prozess auf Port 8000
$process = Get-NetTCPConnection -LocalPort 8000 | 
    ForEach-Object { Get-Process -Id $_.OwningProcess }
Stop-Process -Id $process.Id -Force
```

### Fehler: "ModuleNotFoundError: No module named 'app'"

**Lösung:**
```powershell
# Stelle sicher, dass du im src/backend Verzeichnis bist
cd src/backend

# Setze PYTHONPATH
$env:PYTHONPATH = (Get-Location).Path

# Dann starte Backend
python -m uvicorn app.main:app --reload --port 8000
```

### Fehler: "Python nicht gefunden"

**Lösung:**
```powershell
# Prüfe ob Python installiert ist
python --version

# Falls nicht: Python installieren oder PATH setzen
```

## 📝 Nach Neustart

Nach dem Neustart werden die neuen Prompts (Alexander's Sales Style) automatisch geladen, da sie beim Start importiert werden.

**Test:**
1. Backend läuft auf http://127.0.0.1:8000
2. API Docs: http://127.0.0.1:8000/docs
3. Chat mit MENTOR testen - sollte jetzt Alexander's Style nutzen

## 🎯 Quick Commands

```powershell
# Neustart (alles in einem)
cd src/backend; $env:PYTHONPATH = (Get-Location).Path; python -m uvicorn app.main:app --reload --port 8000
```

