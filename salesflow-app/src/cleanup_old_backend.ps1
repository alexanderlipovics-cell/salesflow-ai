# ═══════════════════════════════════════════════════════════════════════════
# CLEANUP SCRIPT - Altes Backend löschen
# ═══════════════════════════════════════════════════════════════════════════
#
# WICHTIG: Führt KEINE automatischen Löschungen durch!
# Erstellt nur ein Backup und zeigt was gelöscht werden würde.
#
# Verwendung:
#   .\cleanup_old_backend.ps1
#

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════
# KONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

$OldBackendPath = "..\backend"
$BackupPath = "backend_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$CurrentDir = Get-Location

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧹 CLEANUP SCRIPT - Altes Backend" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# PRÜFUNG
# ═══════════════════════════════════════════════════════════════════════════

if (-not (Test-Path $OldBackendPath)) {
    Write-Host "❌ Altes Backend nicht gefunden: $OldBackendPath" -ForegroundColor Red
    Write-Host "   Nichts zu löschen." -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Altes Backend gefunden: $OldBackendPath" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# DATEIEN AUFLISTEN
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📋 Dateien die gelöscht würden:" -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path $OldBackendPath -Recurse -File | Select-Object FullName
$fileCount = $files.Count
$totalSize = (Get-ChildItem -Path $OldBackendPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "   Anzahl Dateien: $fileCount" -ForegroundColor White
Write-Host "   Gesamtgröße: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
Write-Host ""

# Zeige wichtige Dateien
Write-Host "   Wichtige Dateien:" -ForegroundColor Yellow
Get-ChildItem -Path $OldBackendPath -Recurse -File -Include "*.py", "*.txt", "*.md" | 
    Select-Object -First 10 FullName | 
    ForEach-Object { Write-Host "   - $($_.FullName.Replace($PWD.Path + '\', ''))" -ForegroundColor Gray }
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# BACKUP ERSTELLEN
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📦 Erstelle Backup..." -ForegroundColor Yellow

try {
    Copy-Item -Path $OldBackendPath -Destination $BackupPath -Recurse -Force
    Write-Host "✅ Backup erstellt: $BackupPath" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Backup fehlgeschlagen: $_" -ForegroundColor Red
    Write-Host "   ABBRUCH - Keine Löschung ohne Backup!" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# BESTÄTIGUNG
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⚠️  WICHTIG: Du bist dabei, das alte Backend zu löschen!" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Backup wurde erstellt: $BackupPath" -ForegroundColor Green
Write-Host ""
Write-Host "Möchtest du das alte Backend jetzt löschen?" -ForegroundColor Yellow
Write-Host ""
Write-Host "   [J] Ja, löschen" -ForegroundColor Red
Write-Host "   [N] Nein, abbrechen" -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Eingabe (J/N)"

if ($confirmation -ne "J" -and $confirmation -ne "j") {
    Write-Host ""
    Write-Host "❌ Abgebrochen. Altes Backend bleibt erhalten." -ForegroundColor Yellow
    Write-Host "   Backup: $BackupPath" -ForegroundColor Gray
    exit 0
}

# ═══════════════════════════════════════════════════════════════════════════
# LÖSCHUNG
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "🗑️  Lösche altes Backend..." -ForegroundColor Yellow

try {
    Remove-Item -Path $OldBackendPath -Recurse -Force
    Write-Host "✅ Altes Backend gelöscht!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Löschung fehlgeschlagen: $_" -ForegroundColor Red
    Write-Host "   Backup bleibt erhalten: $BackupPath" -ForegroundColor Yellow
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# ZUSAMMENFASSUNG
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ CLEANUP ABGESCHLOSSEN" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Backup: $BackupPath" -ForegroundColor Green
Write-Host "🗑️  Gelöscht: $OldBackendPath" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tipp: Teste die App jetzt, bevor du das Backup löschst!" -ForegroundColor Yellow
Write-Host ""

