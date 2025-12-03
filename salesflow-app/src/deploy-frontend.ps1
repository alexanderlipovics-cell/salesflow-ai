# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - FRONTEND DEPLOYMENT (Vercel)                             ║
# ╚════════════════════════════════════════════════════════════════════════════╝

Write-Host "🚀 Frontend Deployment für Vercel" -ForegroundColor Cyan
Write-Host ""

# 1. Vercel CLI installieren falls nötig
Write-Host "📦 Prüfe Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = npm list -g vercel 2>$null
if (-not $vercelInstalled) {
    Write-Host "   Installiere Vercel CLI..."
    npm install -g vercel
}

# 2. Login
Write-Host ""
Write-Host "🔐 Vercel Login..." -ForegroundColor Yellow
vercel login

# 3. Deploy
Write-Host ""
Write-Host "🚀 Deploying zu Vercel..." -ForegroundColor Green
vercel --prod

Write-Host ""
Write-Host "✅ Frontend Deployment abgeschlossen!" -ForegroundColor Green

