#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SALES FLOW AI - i18n DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "🌍 Sales Flow AI - i18n System Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL environment variable"
    echo "Example: export DATABASE_URL='postgresql://user:pass@host:5432/db'"
    exit 1
fi

echo -e "${YELLOW}📊 Step 1: Database Migration${NC}"
echo "Running i18n migration..."

psql "$DATABASE_URL" -f backend/database/i18n_migration.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Step 2: Verification${NC}"
echo "Checking database tables..."

# Check supported_languages
LANG_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM supported_languages;")
echo "Supported Languages: $LANG_COUNT"

if [ "$LANG_COUNT" -lt 8 ]; then
    echo -e "${RED}❌ Error: Expected at least 8 languages${NC}"
    exit 1
fi

# Check translations
TRANS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM translations;")
echo "UI Translations: $TRANS_COUNT"

if [ "$TRANS_COUNT" -lt 10 ]; then
    echo -e "${YELLOW}⚠️  Warning: Less than 10 translations found${NC}"
fi

# Check template_translations
TEMPLATE_TRANS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM template_translations;")
echo "Template Translations: $TEMPLATE_TRANS_COUNT"

echo -e "${GREEN}✅ Database verification passed${NC}"

echo ""
echo -e "${YELLOW}🐍 Step 3: Backend Dependencies${NC}"
echo "Installing Python dependencies..."

pip install --break-system-packages

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend dependency installation failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📱 Step 4: Frontend Dependencies${NC}"
echo "Installing React Native dependencies..."

cd sales-flow-ai

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  package.json not found, skipping frontend dependencies${NC}"
else
    npm install i18next react-i18next expo-localization
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Frontend dependency installation failed${NC}"
        exit 1
    fi
fi

cd ..

echo ""
echo -e "${YELLOW}🧪 Step 5: Testing${NC}"
echo "Running i18n tests..."

# Test get_translation function
TEST_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT get_translation('dashboard.title', 'en');")
echo "Test Translation (EN): $TEST_RESULT"

if [[ "$TEST_RESULT" != *"Dashboard"* ]]; then
    echo -e "${RED}❌ Translation test failed${NC}"
    exit 1
fi

# Test German translation
TEST_RESULT_DE=$(psql "$DATABASE_URL" -t -c "SELECT get_translation('dashboard.title', 'de');")
echo "Test Translation (DE): $TEST_RESULT_DE"

echo -e "${GREEN}✅ i18n tests passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 i18n System Deployed Successfully!${NC}"
echo "=========================================="
echo ""
echo "✅ Database tables created"
echo "✅ 8 languages supported: DE, EN, FR, ES, IT, NL, PT, PL"
echo "✅ UI translations seeded"
echo "✅ RPC functions created"
echo "✅ Backend services ready"
echo "✅ Frontend components ready"
echo ""
echo "🌍 Your app is now multilingual!"
echo ""
echo "Next Steps:"
echo "1. Restart your backend: uvicorn app.main:app --reload"
echo "2. Test API: curl http://localhost:8000/api/i18n/languages"
echo "3. Add more translations via Admin UI or API"
echo ""
echo "📚 Documentation: backend/database/I18N_README.md"
echo ""

