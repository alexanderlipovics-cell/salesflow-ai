#!/bin/bash

# ╔════════════════════════════════════════════════════════════════╗
# ║  SALES FLOW AI - COMPLETE SETUP SCRIPT                        ║
# ║  Installs database, backend, frontend, and cron jobs          ║
# ╚════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 SALES FLOW AI - COMPLETE SETUP                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════
# 1. CHECK PREREQUISITES
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Copying .env.salesflow.example to .env..."
    cp .env.salesflow.example .env
    echo -e "${RED}❗ IMPORTANT: Edit .env file with your API keys before continuing!${NC}"
    read -p "Press Enter after you've edited .env..."
fi

# Source .env
export $(cat .env | grep -v '^#' | xargs)

# Check PostgreSQL connection
echo "Checking database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL in .env"
    exit 1
fi

echo -e "${GREEN}✅ Database connection OK${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# 2. DATABASE SETUP
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}📊 Setting up database...${NC}"

echo "  → Running 01_core_tables.sql..."
psql "$DATABASE_URL" -f backend/database/sql/tables/01_core_tables.sql

echo "  → Running 02_seed_data.sql..."
psql "$DATABASE_URL" -f backend/database/sql/tables/02_seed_data.sql

echo "  → Running analytics_views.sql..."
psql "$DATABASE_URL" -f backend/database/sql/views/analytics_views.sql

echo "  → Running followup_functions.sql..."
psql "$DATABASE_URL" -f backend/database/sql/rpc/followup_functions.sql

echo "  → Running auto_update_triggers.sql..."
psql "$DATABASE_URL" -f backend/database/sql/triggers/auto_update_triggers.sql

echo -e "${GREEN}✅ Database setup complete${NC}"

# Verify installation
echo "Verifying database setup..."
PLAYBOOK_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM followup_playbooks")
TEMPLATE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM followup_templates")
AI_PROMPT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ai_prompts")
BADGE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM badges")

echo "  ✓ Playbooks: $PLAYBOOK_COUNT (expected: 6)"
echo "  ✓ Templates: $TEMPLATE_COUNT (expected: 3)"
echo "  ✓ AI Prompts: $AI_PROMPT_COUNT (expected: 12)"
echo "  ✓ Badges: $BADGE_COUNT (expected: 12)"

echo ""

# ═══════════════════════════════════════════════════════════════
# 3. BACKEND SETUP
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 Installing backend dependencies...${NC}"

cd backend

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Backend dependencies installed${NC}"

cd ..

echo ""

# ═══════════════════════════════════════════════════════════════
# 4. FRONTEND SETUP
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}📱 Installing frontend dependencies...${NC}"

cd salesflow-ai

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "node_modules already exists, skipping..."
fi

echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

cd ..

echo ""

# ═══════════════════════════════════════════════════════════════
# 5. CREATE SYSTEMD SERVICES (Optional, Linux only)
# ═══════════════════════════════════════════════════════════════

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${BLUE}🔧 Setting up systemd services...${NC}"
    
    read -p "Do you want to create systemd services for auto-start? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create backend service
        sudo tee /etc/systemd/system/salesflow-backend.service > /dev/null <<EOF
[Unit]
Description=Sales Flow AI Backend
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment="PATH=$(pwd)/backend/venv/bin"
EnvironmentFile=$(pwd)/.env
ExecStart=$(pwd)/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

        # Create cron job service
        sudo tee /etc/systemd/system/salesflow-cron.service > /dev/null <<EOF
[Unit]
Description=Sales Flow AI Follow-up Cron Job
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment="PATH=$(pwd)/backend/venv/bin"
EnvironmentFile=$(pwd)/.env
ExecStart=$(pwd)/backend/venv/bin/python app/jobs/daily_followup_check.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

        # Reload systemd and enable services
        sudo systemctl daemon-reload
        sudo systemctl enable salesflow-backend.service
        sudo systemctl enable salesflow-cron.service
        
        echo -e "${GREEN}✅ Systemd services created${NC}"
        echo "Start with:"
        echo "  sudo systemctl start salesflow-backend"
        echo "  sudo systemctl start salesflow-cron"
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# 6. SETUP COMPLETE
# ═══════════════════════════════════════════════════════════════

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETE!                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 Sales Flow AI is ready to launch!${NC}"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start Backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. Start Frontend (new terminal):"
echo "   cd salesflow-ai"
echo "   npm run dev"
echo ""
echo "3. Start Cron Jobs (new terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python app/jobs/daily_followup_check.py &"
echo "   python app/jobs/refresh_analytics_views.py &"
echo ""
echo "4. Access Application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📚 Documentation:"
echo "   - Database: backend/database/sql/"
echo "   - API: http://localhost:8000/docs"
echo "   - Frontend: salesflow-ai/src/"
echo ""
echo -e "${BLUE}🚀 Ready to build your Sales Empire!${NC}"
echo ""

