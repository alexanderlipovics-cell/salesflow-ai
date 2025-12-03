#!/bin/bash

# =====================================================
# SALES FLOW AI - ALL FEATURES DEPLOYMENT SCRIPT
# =====================================================

echo "🚀 =========================================="
echo "🚀  SALES FLOW AI - FEATURE DEPLOYMENT"
echo "🚀 =========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =====================================================
# 1. CHECK PREREQUISITES
# =====================================================

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python 3 found${NC}"

# Check pip
if ! command -v pip &> /dev/null; then
    echo -e "${RED}❌ pip not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ pip found${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found (optional for local DB)${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
fi

echo ""

# =====================================================
# 2. INSTALL DEPENDENCIES
# =====================================================

echo -e "${BLUE}📦 Installing dependencies...${NC}"

cd backend || exit

pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# =====================================================
# 3. CHECK ENVIRONMENT VARIABLES
# =====================================================

echo -e "${BLUE}⚙️  Checking environment variables...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${YELLOW}   Creating from template...${NC}"
    
    if [ -f ENV_FEATURES_TEMPLATE.txt ]; then
        cp ENV_FEATURES_TEMPLATE.txt .env
        echo -e "${GREEN}✅ .env created from template${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and add your credentials!${NC}"
    else
        echo -e "${RED}❌ Template not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check OpenAI Key
if grep -q "OPENAI_API_KEY=\"sk-" .env; then
    echo -e "${GREEN}✅ OpenAI API Key configured${NC}"
else
    echo -e "${YELLOW}⚠️  OpenAI API Key not configured (needed for AI Field Mapping)${NC}"
fi

# Check Gmail
if grep -q "GMAIL_CLIENT_ID=\"your-" .env; then
    echo -e "${YELLOW}⚠️  Gmail OAuth not configured (optional)${NC}"
else
    echo -e "${GREEN}✅ Gmail OAuth configured${NC}"
fi

# Check Outlook
if grep -q "OUTLOOK_CLIENT_ID=\"your-" .env; then
    echo -e "${YELLOW}⚠️  Outlook OAuth not configured (optional)${NC}"
else
    echo -e "${GREEN}✅ Outlook OAuth configured${NC}"
fi

echo ""

# =====================================================
# 4. DATABASE MIGRATION
# =====================================================

echo -e "${BLUE}🗄️  Database migration...${NC}"

read -p "Do you want to run database migrations? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}   Running migrations...${NC}"
    
    # Check if DB credentials are set
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  DATABASE_URL not set${NC}"
        echo -e "${BLUE}   Please enter database credentials:${NC}"
        read -p "   Database user: " DB_USER
        read -p "   Database name: " DB_NAME
        read -s -p "   Database password: " DB_PASS
        echo ""
        
        export PGPASSWORD=$DB_PASS
        psql -U $DB_USER -d $DB_NAME -f database/DEPLOY_ALL_FEATURES.sql
    else
        psql $DATABASE_URL -f database/DEPLOY_ALL_FEATURES.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database migrations completed${NC}"
    else
        echo -e "${RED}❌ Database migration failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping database migrations${NC}"
fi

echo ""

# =====================================================
# 5. UPDATE MAIN.PY
# =====================================================

echo -e "${BLUE}🔌 Checking route registration...${NC}"

if grep -q "from app.routers import.*email" app/main.py; then
    echo -e "${GREEN}✅ Routes already registered${NC}"
else
    echo -e "${YELLOW}⚠️  Routes not registered in main.py${NC}"
    echo -e "${BLUE}   Please add these lines to app/main.py:${NC}"
    echo ""
    echo -e "${YELLOW}   from app.routers import email, import_export, gamification${NC}"
    echo -e "${YELLOW}   app.include_router(email.router)${NC}"
    echo -e "${YELLOW}   app.include_router(import_export.router)${NC}"
    echo -e "${YELLOW}   app.include_router(gamification.router)${NC}"
    echo ""
    echo -e "${BLUE}   See: app/main_routes_update.py for reference${NC}"
fi

echo ""

# =====================================================
# 6. CREATE EXPORTS DIRECTORY
# =====================================================

echo -e "${BLUE}📁 Creating exports directory...${NC}"

mkdir -p exports
chmod 755 exports

echo -e "${GREEN}✅ Exports directory ready${NC}"

echo ""

# =====================================================
# 7. TEST IMPORTS
# =====================================================

echo -e "${BLUE}🧪 Testing imports...${NC}"

python3 -c "
from app.services.email.gmail_service import GmailService
from app.services.email.outlook_service import OutlookService
from app.services.import_export_service import ImportExportService
from app.services.gamification_service import GamificationService
print('✅ All imports successful')
" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All services importable${NC}"
else
    echo -e "${RED}❌ Import errors detected${NC}"
    exit 1
fi

echo ""

# =====================================================
# 8. DEPLOYMENT SUMMARY
# =====================================================

echo ""
echo -e "${GREEN}🎉 =========================================="
echo -e "🎉  DEPLOYMENT COMPLETE!"
echo -e "🎉 ==========================================${NC}"
echo ""

echo -e "${BLUE}📧 Email Integration:${NC} ✅"
echo -e "${BLUE}📊 Import/Export System:${NC} ✅"
echo -e "${BLUE}🎮 Gamification:${NC} ✅"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. Edit .env and add OAuth credentials:"
echo "   - GMAIL_CLIENT_ID & GMAIL_CLIENT_SECRET"
echo "   - OUTLOOK_CLIENT_ID & OUTLOOK_CLIENT_SECRET"
echo "   - OPENAI_API_KEY"
echo ""
echo "2. Register routes in app/main.py (if not done)"
echo ""
echo "3. Start the server:"
echo "   cd backend"
echo "   uvicorn app.main:app --reload"
echo ""
echo "4. Test features:"
echo "   http://localhost:8000/docs"
echo ""
echo "5. Read documentation:"
echo "   - FEATURE_INSTALLATION.md (Quick Start)"
echo "   - FEATURE_DEPLOYMENT_GUIDE.md (Full Guide)"
echo "   - MEGA_FEATURES_README.md (Overview)"
echo ""

echo -e "${GREEN}🚀 Ready to launch! Good luck!${NC}"
echo ""

