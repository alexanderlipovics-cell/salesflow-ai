# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - MOBILE BUILD (EAS)                                       ║
# ╚════════════════════════════════════════════════════════════════════════════╝

Write-Host "📱 Mobile Build mit EAS" -ForegroundColor Cyan
Write-Host ""

# 1. EAS CLI installieren
Write-Host "📦 Prüfe EAS CLI..." -ForegroundColor Yellow
$easInstalled = npm list -g eas-cli 2>$null
if (-not $easInstalled) {
    Write-Host "   Installiere EAS CLI..."
    npm install -g eas-cli
}

# 2. Login
Write-Host ""
Write-Host "🔐 EAS Login..." -ForegroundColor Yellow
eas login

# 3. Build Configuration prüfen
Write-Host ""
Write-Host "📋 Build-Konfiguration:" -ForegroundColor Yellow
Write-Host "   - iOS: Production Build für App Store"
Write-Host "   - Android: APK/AAB für Play Store"
Write-Host ""

# 4. Build starten
Write-Host "🏗️ Starte Build..." -ForegroundColor Green
Write-Host ""

$choice = Read-Host "Build für welche Plattform? (ios/android/all)"

switch ($choice) {
    "ios" { eas build --platform ios --profile production }
    "android" { eas build --platform android --profile production }
    "all" { eas build --platform all --profile production }
    default { 
        Write-Host "Starte Build für alle Plattformen..."
        eas build --platform all --profile production 
    }
}

Write-Host ""
Write-Host "✅ Build gestartet! Check Status auf: https://expo.dev" -ForegroundColor Green

