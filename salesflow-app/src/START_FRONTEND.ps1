# ═══════════════════════════════════════════════════════════════════════════
# FRONTEND START SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starte Frontend..." -ForegroundColor Cyan

# Prüfe ob wir im richtigen Verzeichnis sind
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json nicht gefunden! Bitte im Hauptverzeichnis ausführen." -ForegroundColor Red
    exit 1
}

# Prüfe ob node_modules existiert
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installiere Dependencies..." -ForegroundColor Yellow
    npm install
}

# Starte Expo
Write-Host "✅ Starte Expo Dev Server..." -ForegroundColor Green
Write-Host "📱 Öffne Expo Go App auf deinem Handy und scanne den QR-Code" -ForegroundColor Yellow
Write-Host "🌐 Oder drücke 'w' für Web, 'a' für Android, 'i' für iOS" -ForegroundColor Yellow
Write-Host ""

npm start

