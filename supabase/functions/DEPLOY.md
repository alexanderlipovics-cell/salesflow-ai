# 🚀 Supabase Functions Deployment Guide

**Last Updated:** November 30, 2025

---

## ✅ STEP 1: Verify File Extensions

**WICHTIG:** Windows versteckt oft die `.txt` Extension!

### So machst du sie sichtbar:

1. **Windows Explorer öffnen**
2. **View Tab** → Check: **"File name extensions"**
3. **Prüfe die Dateien:**
   - `supabase\functions\assess-cure\index.ts` (NICHT `index.ts.txt`!)
   - `supabase\functions\predict-churn\index.ts` (NICHT `index.ts.txt`!)

### PowerShell Check:

```powershell
# Check Extension
Get-Item "supabase\functions\assess-cure\index.ts" | Select-Object Extension
# Should show: .ts (NOT .txt!)

Get-Item "supabase\functions\predict-churn\index.ts" | Select-Object Extension
# Should show: .ts (NOT .txt!)
```

### Falls `.txt` Extension vorhanden:

```powershell
# Rename (wenn nötig)
Rename-Item "supabase\functions\assess-cure\index.ts.txt" "index.ts"
Rename-Item "supabase\functions\predict-churn\index.ts.txt" "index.ts"
```

---

## ✅ STEP 2: Verify Structure

```powershell
# Check ob Files da sind
dir supabase\functions\assess-cure\
# Sollte zeigen: index.ts

dir supabase\functions\predict-churn\
# Sollte zeigen: index.ts
```

**Erwartete Ausgabe:**
```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        30.11.2025     13:05            422 index.ts
```

---

## ✅ STEP 3: Supabase CLI Setup

### Prüfe ob Supabase CLI installiert ist:

```powershell
supabase --version
```

### Falls nicht installiert:

```powershell
# Install Supabase CLI
npm install -g supabase

# Oder mit Scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Login zu Supabase:

```powershell
supabase login
```

### Link zu deinem Projekt:

```powershell
# Navigate to project root
cd "C:\Users\Akquise WinStage\Desktop\SALESFLOW"

# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**Wo findest du PROJECT_REF?**
- Supabase Dashboard → Project Settings → Reference ID

---

## ✅ STEP 4: DEPLOY Functions

### Deploy Function 1: assess-cure

```powershell
# Navigate to project root
cd "C:\Users\Akquise WinStage\Desktop\SALESFLOW"

# Deploy
supabase functions deploy assess-cure

# Warte ~20 Sekunden
# ✅ "Deployed function assess-cure"
```

### Deploy Function 2: predict-churn

```powershell
# Deploy
supabase functions deploy predict-churn

# Warte ~20 Sekunden
# ✅ "Deployed function predict-churn"
```

---

## ✅ STEP 5: Verify Deployment

### Check in Supabase Dashboard:

1. **Gehe zu:** https://supabase.com/dashboard
2. **Wähle dein Projekt**
3. **Edge Functions** (in der Sidebar)
4. **Sollte zeigen:**
   - ✅ `assess-cure` (Status: Active)
   - ✅ `predict-churn` (Status: Active)

### Test via API:

```powershell
# Test assess-cure
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/assess-cure `
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test predict-churn
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/predict-churn `
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Erwartete Response:**
```json
{
  "message": "assess-cure function - ready for implementation"
}
```

---

## 🐛 TROUBLESHOOTING

### Problem: "Function not found"

**Ursache:** Falsche Extension (.txt statt .ts)

**Lösung:**
```powershell
# Check Extension
Get-Item "supabase\functions\assess-cure\index.ts" | Select-Object Extension

# Falls .txt:
Rename-Item "supabase\functions\assess-cure\index.ts.txt" "index.ts"
```

---

### Problem: "supabase: command not found"

**Ursache:** Supabase CLI nicht installiert

**Lösung:**
```powershell
npm install -g supabase
```

---

### Problem: "Project not linked"

**Ursache:** Projekt nicht mit Supabase verlinkt

**Lösung:**
```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

---

### Problem: "Deployment failed"

**Ursache:** Syntax-Fehler in `index.ts`

**Lösung:**
1. Prüfe `index.ts` auf Syntax-Fehler
2. Teste lokal: `supabase functions serve assess-cure`
3. Fix Fehler
4. Deploy erneut

---

## 📋 QUICK DEPLOY SCRIPT

Erstelle `deploy-functions.ps1`:

```powershell
# deploy-functions.ps1

Write-Host "🚀 Deploying Supabase Functions..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Install with: npm install -g supabase" -ForegroundColor Red
    exit 1
}

# Navigate to project root
$projectRoot = "C:\Users\Akquise WinStage\Desktop\SALESFLOW"
Set-Location $projectRoot

# Verify files exist
if (-not (Test-Path "supabase\functions\assess-cure\index.ts")) {
    Write-Host "❌ assess-cure\index.ts not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "supabase\functions\predict-churn\index.ts")) {
    Write-Host "❌ predict-churn\index.ts not found!" -ForegroundColor Red
    exit 1
}

# Check extensions
$assessCure = Get-Item "supabase\functions\assess-cure\index.ts"
$predictChurn = Get-Item "supabase\functions\predict-churn\index.ts"

if ($assessCure.Extension -ne ".ts") {
    Write-Host "⚠️  assess-cure\index.ts has wrong extension: $($assessCure.Extension)" -ForegroundColor Yellow
    Write-Host "   Rename to .ts if needed!" -ForegroundColor Yellow
}

if ($predictChurn.Extension -ne ".ts") {
    Write-Host "⚠️  predict-churn\index.ts has wrong extension: $($predictChurn.Extension)" -ForegroundColor Yellow
    Write-Host "   Rename to .ts if needed!" -ForegroundColor Yellow
}

# Deploy Function 1
Write-Host "`n📦 Deploying assess-cure..." -ForegroundColor Cyan
supabase functions deploy assess-cure

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ assess-cure deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ assess-cure deployed successfully!" -ForegroundColor Green

# Deploy Function 2
Write-Host "`n📦 Deploying predict-churn..." -ForegroundColor Cyan
supabase functions deploy predict-churn

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ predict-churn deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ predict-churn deployed successfully!" -ForegroundColor Green

Write-Host "`n🎉 All functions deployed!" -ForegroundColor Green
```

**Usage:**
```powershell
.\deploy-functions.ps1
```

---

## 📚 NEXT STEPS

Nach erfolgreichem Deploy:

1. **Test Functions** in Supabase Dashboard
2. **Implement Logic** in `index.ts` (aktuell nur Platzhalter)
3. **Add Environment Variables** (falls nötig)
4. **Monitor Logs** in Supabase Dashboard

---

**Status:** ✅ Ready to Deploy!

