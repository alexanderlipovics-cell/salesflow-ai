# ⚡ SALES FLOW AI - QUICK START

## 🚀 5-Minuten Setup

```bash
# 1. Environment konfigurieren
cp .env.salesflow.example .env
nano .env  # API Keys eintragen

# 2. Setup-Script ausführen
bash setup_salesflow_complete.sh

# 3. Starten (3 Terminals)

# Terminal 1: Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd salesflow-ai && npm run dev

# Terminal 3: Cron Jobs
cd backend && source venv/bin/activate
python app/jobs/daily_followup_check.py &
```

## ✅ Zugriff

- 🖥️  **Frontend:** http://localhost:5173
- 🔧 **Backend:** http://localhost:8000
- 📚 **API Docs:** http://localhost:8000/docs

## 📋 Benötigte API Keys

### Pflicht:
- `OPENAI_API_KEY` - https://platform.openai.com/api-keys
- `DATABASE_URL` - PostgreSQL Connection String

### WhatsApp (einer):
- **UltraMsg:** https://ultramsg.com/ (Empfohlen)
- **360dialog:** https://www.360dialog.com/
- **Twilio:** https://www.twilio.com/

### Email (einer):
- **SendGrid:** https://sendgrid.com/ (Empfohlen)
- **Gmail:** Google Cloud Console
- **Outlook:** Microsoft Graph API

## 🧪 Test

```bash
# Backend testen
curl http://localhost:8000/api/followups/playbooks

# Analytics abrufen
curl http://localhost:8000/api/followups/analytics?days=30

# Templates auflisten
curl http://localhost:8000/api/templates/list
```

## 📚 Features

✅ **6 Follow-up Playbooks** (Proposal, Callback, Meeting, etc.)  
✅ **3 Advanced Templates** (WhatsApp, Email, In-App)  
✅ **12 AI Prompts** (Objection Handling, Coaching, Follow-ups)  
✅ **GPT Auto-Complete** für Templates  
✅ **Analytics Dashboard** mit 10 Materialized Views  
✅ **WhatsApp + Email Integration**  
✅ **Automatic Follow-up System**  
✅ **Message Tracking** (delivered/opened/responded)  

## 🐛 Troubleshooting

**Database Error?**
```bash
psql $DATABASE_URL -c "SELECT 1"
```

**OpenAI Error?**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Port already in use?**
```bash
# Change port in backend
uvicorn app.main:app --reload --port 8001
```

## 📖 Mehr Info

- **Complete Guide:** `DEPLOYMENT_GUIDE_COMPLETE.md`
- **API Docs:** http://localhost:8000/docs
- **Database Schema:** `backend/database/sql/`

---

**Ready? GO! 🚀**

