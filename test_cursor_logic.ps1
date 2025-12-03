# CURSOR AGENT LOGIC - TEST SCRIPT
# Testet ob der Logic-Aware Agent korrekt funktioniert

Write-Host ""
Write-Host "CURSOR AGENT LOGIC SYSTEM - TESTS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Configuration Files vorhanden
Write-Host "TEST 1: Configuration Files" -ForegroundColor Yellow
Write-Host "-----------------------------" -ForegroundColor DarkGray

$test1Pass = $true

if (Test-Path ".cursorrules") {
    Write-Host "[OK] .cursorrules gefunden" -ForegroundColor Green
    $cursorRulesContent = Get-Content ".cursorrules" -Raw
    if ($cursorRulesContent -match "LOGIC RULES") {
        Write-Host "[OK] Logic Rules enthalten" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] Logic Rules fehlen" -ForegroundColor Red
        $test1Pass = $false
    }
}
else {
    Write-Host "[FAIL] .cursorrules nicht gefunden" -ForegroundColor Red
    $test1Pass = $false
}

if (Test-Path ".cursor/settings.json") {
    Write-Host "[OK] .cursor/settings.json gefunden" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] .cursor/settings.json nicht gefunden" -ForegroundColor Red
    $test1Pass = $false
}

Write-Host ""
if ($test1Pass) {
    Write-Host "[PASSED] TEST 1" -ForegroundColor Green
}
else {
    Write-Host "[FAILED] TEST 1" -ForegroundColor Red
}
Write-Host ""

# Test 2: Logic Rules Struktur
Write-Host "TEST 2: Logic Rules Struktur" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor DarkGray

$test2Pass = $true
$requiredSections = @(
    "STATUS CHECK FIRST",
    "AVOID DUPLICATES",
    "RESPECT RUNNING WORK",
    "INCREMENTAL MODE",
    "ACTION GATES",
    "ANTI-PATTERNS"
)

$cursorRulesContent = Get-Content ".cursorrules" -Raw

foreach ($section in $requiredSections) {
    if ($cursorRulesContent -match $section) {
        Write-Host "[OK] Section '$section' vorhanden" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] Section '$section' fehlt" -ForegroundColor Red
        $test2Pass = $false
    }
}

Write-Host ""
if ($test2Pass) {
    Write-Host "[PASSED] TEST 2" -ForegroundColor Green
}
else {
    Write-Host "[FAILED] TEST 2" -ForegroundColor Red
}
Write-Host ""

# Test 3: Settings.json Struktur
Write-Host "TEST 3: Settings.json Konfiguration" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor DarkGray

$test3Pass = $true

if (Test-Path ".cursor/settings.json") {
    try {
        $settingsContent = Get-Content ".cursor/settings.json" -Raw | ConvertFrom-Json
        
        # Check basic settings
        if ($settingsContent.'cursor.agent.mode' -eq "efficient") {
            Write-Host "[OK] Agent mode = efficient" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] Agent mode nicht korrekt" -ForegroundColor Red
            $test3Pass = $false
        }
        
        if ($settingsContent.'cursor.agent.checkStatusFirst' -eq $true) {
            Write-Host "[OK] checkStatusFirst aktiviert" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] checkStatusFirst nicht aktiviert" -ForegroundColor Red
            $test3Pass = $false
        }
        
        if ($settingsContent.'cursor.agent.avoidDuplicates' -eq $true) {
            Write-Host "[OK] avoidDuplicates aktiviert" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] avoidDuplicates nicht aktiviert" -ForegroundColor Red
            $test3Pass = $false
        }
        
        if ($settingsContent.'cursor.agent.maxSuggestions' -eq 2) {
            Write-Host "[OK] maxSuggestions = 2" -ForegroundColor Green
        }
        else {
            Write-Host "[FAIL] maxSuggestions nicht korrekt" -ForegroundColor Red
            $test3Pass = $false
        }
    }
    catch {
        Write-Host "[FAIL] settings.json konnte nicht gelesen werden" -ForegroundColor Red
        $test3Pass = $false
    }
}
else {
    Write-Host "[FAIL] settings.json nicht gefunden" -ForegroundColor Red
    $test3Pass = $false
}

Write-Host ""
if ($test3Pass) {
    Write-Host "[PASSED] TEST 3" -ForegroundColor Green
}
else {
    Write-Host "[FAILED] TEST 3" -ForegroundColor Red
}
Write-Host ""

# Test 4: Documentation Files
Write-Host "TEST 4: Documentation" -ForegroundColor Yellow
Write-Host "---------------------" -ForegroundColor DarkGray

$test4Pass = $true
$docFiles = @(
    "CURSOR_AGENT_LOGIC_GUIDE.md",
    "CURSOR_LOGIC_CHEAT_SHEET.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file gefunden" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $file nicht gefunden" -ForegroundColor Red
        $test4Pass = $false
    }
}

Write-Host ""
if ($test4Pass) {
    Write-Host "[PASSED] TEST 4" -ForegroundColor Green
}
else {
    Write-Host "[FAILED] TEST 4" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $test1Pass -and $test2Pass -and $test3Pass -and $test4Pass

if ($allPassed) {
    Write-Host "[SUCCESS] ALLE TESTS BESTANDEN!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Der Cursor Agent ist logic-aware und ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Naechste Schritte:" -ForegroundColor Yellow
    Write-Host "1. Oeffne Cursor IDE" -ForegroundColor White
    Write-Host "2. Teste mit: @workspace Erstelle .cursorrules" -ForegroundColor White
    Write-Host "3. Agent sollte sagen: Existiert bereits" -ForegroundColor White
    Write-Host ""
    Write-Host "Dokumentation: CURSOR_AGENT_LOGIC_GUIDE.md" -ForegroundColor Cyan
    Write-Host "Quick Reference: CURSOR_LOGIC_CHEAT_SHEET.md" -ForegroundColor Cyan
}
else {
    Write-Host "[FAILED] EINIGE TESTS FEHLGESCHLAGEN" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte pruefe die fehlgeschlagenen Tests oben." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Schnell-Fix:" -ForegroundColor Yellow
    Write-Host "1. Stelle sicher dass .cursorrules Logic Rules enthaelt" -ForegroundColor White
    Write-Host "2. Erstelle .cursor/settings.json falls fehlend" -ForegroundColor White
    Write-Host "3. Fuehre Test erneut aus" -ForegroundColor White
}

Write-Host ""

# File Statistics
Write-Host "FILE STATISTICS" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor DarkGray

if (Test-Path ".cursorrules") {
    $lines = (Get-Content ".cursorrules").Count
    Write-Host ".cursorrules: $lines Zeilen" -ForegroundColor White
}

if (Test-Path ".cursor/settings.json") {
    $size = (Get-Item ".cursor/settings.json").Length
    Write-Host ".cursor/settings.json: $size bytes" -ForegroundColor White
}

if (Test-Path "CURSOR_AGENT_LOGIC_GUIDE.md") {
    $lines = (Get-Content "CURSOR_AGENT_LOGIC_GUIDE.md").Count
    Write-Host "CURSOR_AGENT_LOGIC_GUIDE.md: $lines Zeilen" -ForegroundColor White
}

if (Test-Path "CURSOR_LOGIC_CHEAT_SHEET.md") {
    $lines = (Get-Content "CURSOR_LOGIC_CHEAT_SHEET.md").Count
    Write-Host "CURSOR_LOGIC_CHEAT_SHEET.md: $lines Zeilen" -ForegroundColor White
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Return exit code
if ($allPassed) {
    exit 0
}
else {
    exit 1
}
