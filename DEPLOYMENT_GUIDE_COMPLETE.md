# 🚀 SALES FLOW AI - COMPLETE DEPLOYMENT GUIDE

## Overview

Dieses Deployment-Guide führt dich durch die komplette Installation des **Sales Flow AI Systems** basierend auf den 12 Cursor-Prompts.

**Was ist implementiert:**

✅ Database (Tabellen, Views, Functions, Triggers)  
✅ Backend Services (Python FastAPI)  
✅ API Endpoints (Follow-ups, Templates)  
✅ WhatsApp Integration (360dialog, UltraMsg, Twilio)  
✅ Email Integration (SendGrid, Gmail, Outlook)  
✅ Follow-up Automation (Playbooks + Templates)  
✅ GPT Auto-Complete für Templates  
✅ Analytics Dashboard  
✅ Cron Jobs (Daily Follow-up Check)  
✅ Frontend Components (Template Editor, Analytics)  

---

## 🎯 Quick Start (5 Minutes)

```bash
# 1. Clone/Extract project
cd SALESFLOW

# 2. Copy environment file
cp .env.salesflow.example .env

# 3. Edit .env with your API keys
nano .env

# 4. Run setup script
bash setup_salesflow_complete.sh

# 5. Start services (3 terminals)

# Terminal 1: Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd salesflow-ai && npm run dev

# Terminal 3: Cron Jobs
cd backend && source venv/bin/activate
python app/jobs/daily_followup_check.py &
python app/jobs/refresh_analytics_views.py &
```

**Done!** 🎉 

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
SALESFLOW/
├── backend/
│   ├── database/
│   │   └── sql/
│   │       ├── tables/
│   │       │   ├── 01_core_tables.sql       # Alle Tabellen
│   │       │   └── 02_seed_data.sql         # Seed Data (6 Playbooks, 3 Templates, 12 AI Prompts)
│   │       ├── views/
│   │       │   └── analytics_views.sql      # 10 Materialized Views
│   │       ├── rpc/
│   │       │   └── followup_functions.sql   # 12 RPC Functions
│   │       └── triggers/
│   │           └── auto_update_triggers.sql # 10 Auto-Triggers
│   ├── app/
│   │   ├── services/
│   │   │   ├── followup_service.py          # Follow-up Logic
│   │   │   ├── template_service.py          # Template Management + GPT
│   │   │   ├── whatsapp_service.py          # WhatsApp Integration
│   │   │   └── email_service.py             # Email Integration
│   │   ├── routers/
│   │   │   ├── followups_advanced.py        # Follow-up API
│   │   │   └── templates_advanced.py        # Template API
│   │   └── jobs/
│   │       ├── daily_followup_check.py      # Daily Cron Job
│   │       └── refresh_analytics_views.py   # Analytics Refresh
│   └── requirements.txt
├── salesflow-ai/
│   └── src/
│       └── components/
│           └── followup/
│               ├── FollowupTemplateEditor.tsx      # Template Editor
│               └── FollowUpAnalyticsDashboard.tsx  # Analytics Dashboard
├── .env.salesflow.example
├── setup_salesflow_complete.sh
└── DEPLOYMENT_GUIDE_COMPLETE.md (this file)
```

---

## 🔧 Configuration (.env)

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/salesflow

# OpenAI (für GPT Auto-Complete)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

### WhatsApp (wähle einen Provider)

**Option 1: UltraMsg** (Empfohlen für Einsteiger)
```bash
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=instance123
ULTRAMSG_TOKEN=your_token
```

**Option 2: 360dialog** (Enterprise)
```bash
WHATSAPP_PROVIDER=360dialog
DIALOG360_API_KEY=your_key
DIALOG360_PHONE_NUMBER_ID=your_number_id
```

**Option 3: Twilio** (Alternative)
```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Email (wähle einen Provider)

**Option 1: SendGrid** (Empfohlen)
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@salesflow.ai
```

**Option 2: Gmail**
```bash
EMAIL_PROVIDER=gmail
GMAIL_CREDENTIALS_FILE=path/to/credentials.json
```

**Option 3: Outlook**
```bash
EMAIL_PROVIDER=outlook
OUTLOOK_ACCESS_TOKEN=your_token
```

### Optional

```bash
# Lead Enrichment
CLEARBIT_API_KEY=sk_xxx
HUNTER_API_KEY=xxx

# Cron Jobs
FOLLOWUP_CRON_TIME=09:00
FOLLOWUP_CRON_ENABLED=true
ANALYTICS_REFRESH_INTERVAL_MINUTES=60
```

---

## 📊 Database Setup

### Manual Installation (if setup script fails)

```bash
# 1. Core Tables
psql $DATABASE_URL -f backend/database/sql/tables/01_core_tables.sql

# 2. Seed Data
psql $DATABASE_URL -f backend/database/sql/tables/02_seed_data.sql

# 3. Analytics Views
psql $DATABASE_URL -f backend/database/sql/views/analytics_views.sql

# 4. RPC Functions
psql $DATABASE_URL -f backend/database/sql/rpc/followup_functions.sql

# 5. Triggers
psql $DATABASE_URL -f backend/database/sql/triggers/auto_update_triggers.sql

# 6. Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM followup_playbooks" # Should be 6
psql $DATABASE_URL -c "SELECT COUNT(*) FROM followup_templates" # Should be 3
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ai_prompts"         # Should be 12
psql $DATABASE_URL -c "SELECT COUNT(*) FROM badges"             # Should be 12
```

---

## 🐍 Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Test Backend:**
```bash
curl http://localhost:8000/api/followups/playbooks
```

---

## 📱 Frontend Setup

```bash
cd salesflow-ai

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Access:** http://localhost:5173

---

## ⏰ Cron Jobs

### Start Manually

```bash
cd backend
source venv/bin/activate

# Follow-up Check (runs daily at 9:00 AM)
python app/jobs/daily_followup_check.py &

# Analytics Refresh (runs hourly)
python app/jobs/refresh_analytics_views.py &
```

### Systemd (Linux Production)

```bash
# Backend Service
sudo systemctl start salesflow-backend
sudo systemctl enable salesflow-backend

# Cron Service
sudo systemctl start salesflow-cron
sudo systemctl enable salesflow-cron

# Check status
sudo systemctl status salesflow-backend
sudo systemctl status salesflow-cron
```

---

## 🧪 Testing

### Test Follow-up System

```bash
# 1. Get leads needing follow-up
curl http://localhost:8000/api/followups/leads-needing-followup

# 2. Trigger follow-ups manually
curl -X POST http://localhost:8000/api/followups/trigger-all \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get analytics
curl http://localhost:8000/api/followups/analytics?days=30
```

### Test Template System

```bash
# 1. List templates
curl http://localhost:8000/api/templates/list

# 2. GPT Auto-Complete
curl -X POST http://localhost:8000/api/templates/autocomplete \
  -H "Content-Type: application/json" \
  -d '{"template_id": "TEMPLATE_UUID"}'

# 3. Preview template
curl -X POST http://localhost:8000/api/templates/preview \
  -H "Content-Type: application/json" \
  -d '{"template_id": "TEMPLATE_UUID", "context": {"first_name": "Max"}}'
```

### Test WhatsApp

```python
from app.services.whatsapp_service import whatsapp_service

result = await whatsapp_service.send_message(
    to="+4367612345678",
    message="Test from Sales Flow AI"
)
```

### Test Email

```python
from app.services.email_service import email_service

result = await email_service.send_email(
    to="test@example.com",
    subject="Test Email",
    body="This is a test from Sales Flow AI"
)
```

---

## 📈 Analytics Dashboard

**Access:** http://localhost:5173/followup-analytics

**Features:**
- Overall Stats (Sent, Delivered, Opened, Responded)
- Channel Performance (WhatsApp vs Email vs In-App)
- Weekly Activity Trend
- Response Heatmap (Best times to send)
- Playbook Performance
- GPT vs Human Messages

**Refresh:** Materialized Views refresh automatically every hour

---

## 🎨 Template Editor

**Access:** http://localhost:5173/templates

**Features:**
- Create/Edit templates
- Multi-field support (Body, Reminder, Fallback)
- GPT Auto-Complete (generates Reminder + Fallback)
- Live Preview
- Version History
- Multi-channel (WhatsApp, Email, In-App)

**Usage:**
1. Create template with body_template
2. Click "🤖 Generate Reminder + Fallback mit GPT"
3. Review auto-generated content
4. Edit if needed
5. Save & Preview

---

## 🚀 Production Deployment

### Supabase

```bash
# 1. Create Supabase project at https://supabase.com

# 2. Get connection string
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# 3. Run SQL files in Supabase SQL Editor
# (Copy-paste content of each SQL file)

# 4. Deploy backend to Heroku/Railway/DigitalOcean
# 5. Deploy frontend to Netlify/Vercel
# 6. Setup cron on Heroku Scheduler / Upstash
```

### Docker

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### OpenAI API Error

```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### WhatsApp Send Failed

```bash
# Check provider configuration
echo $WHATSAPP_PROVIDER
echo $ULTRAMSG_INSTANCE_ID
echo $ULTRAMSG_TOKEN

# Test API directly
curl "https://api.ultramsg.com/$ULTRAMSG_INSTANCE_ID/messages/chat" \
  -d "token=$ULTRAMSG_TOKEN&to=+4367612345678&body=Test"
```

### Cron Job Not Running

```bash
# Check if process is running
ps aux | grep daily_followup_check

# Check logs
tail -f backend/logs/followup_cron.log

# Run manually
cd backend
python app/jobs/daily_followup_check.py
```

---

## 📚 API Documentation

**Access:** http://localhost:8000/docs

### Key Endpoints

**Follow-ups:**
- `GET /api/followups/analytics` - Get analytics
- `GET /api/followups/leads-needing-followup` - Get leads
- `POST /api/followups/send` - Send follow-up
- `POST /api/followups/trigger-all` - Trigger all
- `GET /api/followups/playbooks` - List playbooks
- `GET /api/followups/channel-performance` - Channel stats
- `GET /api/followups/response-heatmap` - Best send times

**Templates:**
- `GET /api/templates/list` - List templates
- `GET /api/templates/{id}` - Get template
- `POST /api/templates/create` - Create template
- `PUT /api/templates/{id}` - Update template
- `POST /api/templates/autocomplete` - GPT auto-complete
- `POST /api/templates/preview` - Preview template
- `GET /api/templates/{id}/versions` - Version history

---

## ✅ Deployment Checklist

### Pre-Launch

- [ ] Database setup complete
- [ ] .env configured with all API keys
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] WhatsApp sends test message
- [ ] Email sends test message
- [ ] Cron jobs running
- [ ] Analytics views populated

### Testing

- [ ] Create test lead
- [ ] Trigger manual follow-up
- [ ] Check follow-up analytics
- [ ] Test template editor
- [ ] Test GPT auto-complete
- [ ] Test template preview
- [ ] Verify cron job execution

### Production

- [ ] Production database configured
- [ ] All API keys in production .env
- [ ] SSL certificates configured
- [ ] Domain configured
- [ ] Backups enabled
- [ ] Monitoring enabled
- [ ] Error tracking (Sentry) configured

---

## 🎉 Success Criteria

Nach erfolgreicher Installation hast du:

✅ **Komplette Database** mit 12 Tabellen, 10 Views, 12 Functions, 10 Triggers  
✅ **6 Follow-up Playbooks** (proposal_no_response, callback_missed, etc.)  
✅ **3 Advanced Templates** mit Multi-Step Sequenzen  
✅ **12 AI Prompts** für Objection Handling, Coaching, Follow-ups  
✅ **12 Gamification Badges**  
✅ **WhatsApp Integration** (3 Provider-Optionen)  
✅ **Email Integration** (3 Provider-Optionen)  
✅ **Message Tracking** (delivered/opened/responded)  
✅ **Analytics Dashboard** mit 10 Materialized Views  
✅ **Template Editor** mit GPT Auto-Complete  
✅ **Cron Jobs** für automatische Follow-ups  
✅ **API Endpoints** für alle Features  

---

## 📞 Support

**Dokumentation:**
- Backend Services: `backend/app/services/`
- API Routes: `backend/app/routers/`
- Database Schema: `backend/database/sql/`
- Frontend Components: `salesflow-ai/src/components/`

**Logs:**
- Backend: `backend/logs/`
- Cron Jobs: `backend/logs/followup_cron.log`

---

## 🚀 Ready to Launch!

**Duration:** 6-12 Stunden mit Cursor Agent  
**Result:** Production-ready Premium CRM System  
**Value:** €100/Monat pricing justified!

**GO! 🎉**

