#!/bin/bash
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - BACKEND DEPLOYMENT (Render.com)                          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

echo "🚀 Backend Deployment für Render.com"
echo ""

# 1. GitHub Repository erstellen (manuell auf github.com)
echo "📋 SCHRITT 1: GitHub Repository"
echo "   1. Gehe zu: https://github.com/new"
echo "   2. Repository Name: salesflow-api"
echo "   3. Private: Ja"
echo "   4. Erstellen klicken"
echo ""

# 2. Remote hinzufügen
read -p "GitHub Username eingeben: " GITHUB_USER
git remote add origin "https://github.com/$GITHUB_USER/salesflow-api.git"

# 3. Push
echo ""
echo "📤 Pushe zu GitHub..."
git push -u origin master

# 4. Render.com Setup
echo ""
echo "📋 SCHRITT 2: Render.com"
echo "   1. Gehe zu: https://dashboard.render.com"
echo "   2. New → Web Service"
echo "   3. Connect GitHub Repository: salesflow-api"
echo "   4. render.yaml wird automatisch erkannt"
echo ""
echo "⚠️  WICHTIG: Environment Variables setzen!"
echo "   - ANTHROPIC_API_KEY"
echo "   - SECRET_KEY (generieren mit: openssl rand -base64 32)"
echo ""
echo "✅ Fertig! Render deployed automatisch bei jedem Push."

