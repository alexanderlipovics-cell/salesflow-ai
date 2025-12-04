# ═══════════════════════════════════════════════════════════════════════════
# BACKEND NEUSTART
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🔄 Backend Neustart..." -ForegroundColor Cyan

# 1. Stoppe laufende Backend-Prozesse
Write-Host "⏹️  Stoppe laufende Backend-Prozesse..." -ForegroundColor Yellow

# Finde uvicorn-Prozesse
$uvicornProcesses = Get-Process | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or 
    ($_.ProcessName -eq "python" -and $_.CommandLine -like "*app.main*")
} -ErrorAction SilentlyContinue

# Alternative: Stoppe alle Python-Prozesse auf Port 8000
$port8000Processes = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | 
    ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }

# Kombiniere beide Listen
$allProcesses = @()
if ($uvicornProcesses) { $allProcesses += $uvicornProcesses }
if ($port8000Processes) { $allProcesses += $port8000Processes }

# Entferne Duplikate
$uniqueProcesses = $allProcesses | Sort-Object -Unique -Property Id

if ($uniqueProcesses) {
    foreach ($proc in $uniqueProcesses) {
        Write-Host "   Stoppe Prozess: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "   ⚠️  Konnte Prozess $($proc.Id) nicht stoppen" -ForegroundColor Yellow
        }
    }
    Write-Host "✅ Prozesse gestoppt" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "ℹ️  Keine laufenden Backend-Prozesse gefunden" -ForegroundColor Gray
}

# 2. Warte kurz
Write-Host ""
Write-Host "⏳ Warte 2 Sekunden..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# 3. Ins Backend-Verzeichnis wechseln
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "📂 Arbeitsverzeichnis: $(Get-Location)" -ForegroundColor Yellow

# 4. Prüfe ob app/main.py existiert
if (-not (Test-Path "app\main.py")) {
    Write-Host "❌ app/main.py nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte im src/backend Verzeichnis ausführen." -ForegroundColor Yellow
    exit 1
}

# 5. PYTHONPATH setzen
$env:PYTHONPATH = (Get-Location).Path
Write-Host "✅ PYTHONPATH gesetzt: $env:PYTHONPATH" -ForegroundColor Green

# 6. Starte Backend neu
Write-Host ""
Write-Host "🚀 Starte Backend neu..." -ForegroundColor Cyan
Write-Host "🌐 Backend läuft auf: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "📚 Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tipp: Drücke Ctrl+C zum Stoppen" -ForegroundColor Gray
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

