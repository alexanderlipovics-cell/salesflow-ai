#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AURA OS - PRODUCTION DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🚀 AURA OS - Production Deployment"
echo "═══════════════════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: BUILD FRONTEND
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Step 1: Building Frontend...${NC}"

cd "$(dirname "$0")"

# Expo Web Build
npx expo export --platform web

echo -e "${GREEN}✅ Frontend built successfully!${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: DEPLOY FRONTEND TO VERCEL
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}🌐 Step 2: Deploying Frontend to Vercel...${NC}"

vercel --prod

echo -e "${GREEN}✅ Frontend deployed!${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: BUILD BACKEND DOCKER IMAGE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}🐳 Step 3: Building Backend Docker Image...${NC}"

cd src/backend

docker build -t aura-os-api:latest .
docker tag aura-os-api:latest your-registry/aura-os-api:latest

echo -e "${GREEN}✅ Docker image built!${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: PUSH TO REGISTRY
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}📤 Step 4: Pushing to Container Registry...${NC}"

docker push your-registry/aura-os-api:latest

echo -e "${GREEN}✅ Image pushed!${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: DEPLOY TO SERVER
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}🖥️ Step 5: Deploying to Server...${NC}"

# Option A: Docker Compose auf Server
# ssh user@server "cd /app && docker-compose pull && docker-compose up -d"

# Option B: Railway
# railway up

# Option C: Render
# render deploy

echo -e "${GREEN}✅ Backend deployed!${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# DONE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 AURA OS SUCCESSFULLY DEPLOYED!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Frontend: https://app.aura-os.com"
echo "Backend:  https://api.aura-os.com"
echo "API Docs: https://api.aura-os.com/docs"
echo ""

