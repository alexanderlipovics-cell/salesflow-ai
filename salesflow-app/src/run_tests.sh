#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KOMPLETTES SYSTEM-TEST RUNNER
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🧪 KOMPLETTES SYSTEM-TEST"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Prüfe ob Backend läuft
echo "🔍 Prüfe Backend..."
if curl -s http://localhost:8001/api/v1/health > /dev/null; then
    echo "✅ Backend läuft auf Port 8001"
else
    echo "❌ Backend läuft NICHT!"
    echo "   Starte Backend: cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
    exit 1
fi

echo ""
echo "🧪 Starte Python Tests..."
echo ""

# Python Tests
if [ -z "$SUPABASE_TOKEN" ]; then
    echo "⚠️  Kein SUPABASE_TOKEN gesetzt"
    echo "   Setze: export SUPABASE_TOKEN=YOUR_TOKEN"
    echo "   Oder: python test_complete_system.py YOUR_TOKEN"
    echo ""
    python test_complete_system.py
else
    python test_complete_system.py "$SUPABASE_TOKEN"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "✅ Tests abgeschlossen"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Prüfe Ergebnisse oben"
echo "   2. Führe manuelle Frontend-Tests durch (siehe test_frontend_manual.md)"
echo "   3. Wenn alles OK: Altes Backend löschen (cleanup_old_backend.ps1)"
echo ""

