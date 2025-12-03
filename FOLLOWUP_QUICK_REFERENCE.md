# 🚀 FOLLOW-UP SYSTEM - QUICK REFERENCE

## 📋 QUICK START (3 Minuten)

```bash
# 1. Deploy Database
psql $SUPABASE_DB_URL < backend/database/followup_system_migration.sql

# 2. Install Dependencies
pip install schedule==1.2.0

# 3. Start Backend
cd backend && uvicorn app.main:app --reload --port 8000

# 4. Start Cron Job (separate terminal)
cd backend && python app/jobs/daily_followup_check.py

# 5. Test
curl http://localhost:8000/api/followups/playbooks
```

---

## 🎯 CORE CONCEPTS

### Playbooks (Templates)

| ID | Name | Trigger | Delay |
|----|------|---------|-------|
| `proposal_no_response` | Proposal Follow-up | Angebot ohne Reaktion | 3d |
| `commitment_no_action` | Zusage ohne Aktion | Zusage ohne Schritte | 2d |
| `callback_missed` | Verpasster Rückruf | Lead meldet sich nicht | 1d |
| `ghosted_after_meeting` | Nach Meeting Ghost | Meeting ohne Antwort | 4d |
| `price_objection_silence` | Preis-Einwand Stille | Preis-Einwand ohne Reaktion | 3d |
| `nurture_30d` | Langzeit-Nurturing | 30 Tage inaktiv | 30d |

### Smart Channel Selection

```
Priority: WhatsApp > Email > In-App

Logic:
1. Check preferred_channel
2. Verify contact info available
3. Select best channel
4. Fallback to in_app
```

### Message Placeholders

```
{{first_name}}      → Lead's Vorname
{{promised_date}}   → Zugesagtes Datum
{{days_inactive}}   → Tage seit letztem Kontakt
{{success_story}}   → Dynamische Success Story
```

---

## 🌐 API ENDPOINTS

### Get Analytics

```bash
GET /api/followups/analytics?days=30
Authorization: Bearer YOUR_TOKEN
```

### Get Leads Needing Follow-up

```bash
GET /api/followups/leads-needing-followup?days_threshold=3
Authorization: Bearer YOUR_TOKEN
```

### Trigger Follow-up

```bash
POST /api/followups/trigger
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "lead_id": "uuid",
  "playbook_id": "proposal_no_response",
  "channel": "whatsapp"  // optional
}
```

### Get Playbooks

```bash
GET /api/followups/playbooks?category=reactivation
Authorization: Bearer YOUR_TOKEN
```

### Get Follow-up History

```bash
GET /api/followups/history/{lead_id}?limit=50
Authorization: Bearer YOUR_TOKEN
```

### Manual System Check

```bash
POST /api/followups/check-and-trigger
Authorization: Bearer YOUR_TOKEN
```

---

## 🗄️ DATABASE QUERIES

### Check Follow-ups Today

```sql
SELECT * FROM follow_ups 
WHERE sent_at >= CURRENT_DATE 
ORDER BY sent_at DESC;
```

### Channel Performance

```sql
SELECT * FROM channel_performance;
```

### Leads Needing Follow-up

```sql
SELECT * FROM get_leads_needing_followup(3);
```

### Top Playbooks

```sql
SELECT id, name, usage_count, success_rate 
FROM followup_playbooks 
ORDER BY success_rate DESC 
LIMIT 10;
```

### Response Heatmap

```sql
SELECT * FROM response_heatmap 
WHERE channel = 'whatsapp' 
ORDER BY response_count DESC 
LIMIT 10;
```

### Refresh Views

```sql
REFRESH MATERIALIZED VIEW response_heatmap;
REFRESH MATERIALIZED VIEW weekly_activity_trend;
REFRESH MATERIALIZED VIEW channel_performance;
REFRESH MATERIALIZED VIEW gpt_vs_human_messages;
```

---

## 🔧 CONFIGURATION

### Add Custom Playbook

```sql
INSERT INTO followup_playbooks (
  id, name, description, trigger_type, delay_days,
  preferred_channels, message_template, category, priority
) VALUES (
  'custom_id',
  'Custom Name',
  'Description',
  'custom_trigger',
  5,
  ARRAY['whatsapp', 'email'],
  'Message with {{first_name}}',
  'reactivation',
  8
);
```

### Update Playbook

```sql
UPDATE followup_playbooks
SET delay_days = 2,
    message_template = 'New message...'
WHERE id = 'proposal_no_response';
```

### Disable Playbook

```sql
UPDATE followup_playbooks
SET is_active = FALSE
WHERE id = 'nurture_30d';
```

---

## 📊 MONITORING

### Check Cron Job Status

```bash
# Linux/Mac
ps aux | grep daily_followup_check

# Windows
Get-Process | Where-Object {$_.ProcessName -like "*python*"}
```

### View Logs

```bash
tail -f followup_cron.log
tail -f logs/app.log | grep "follow"
```

### Test Cron Manually

```bash
cd backend
python app/jobs/daily_followup_check.py
```

### Health Check

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/followups/stats
```

---

## 🧪 TESTING

### Run Test Suite

```bash
cd backend
python scripts/test_followup_system.py
```

### Test Individual Components

```python
# In Python REPL
from app.services.followup_service import followup_service
import asyncio

# Test analytics
analytics = asyncio.run(followup_service.get_followup_analytics(days=30))
print(analytics)

# Test playbooks
playbooks = asyncio.run(followup_service.get_playbooks())
print(f"Found {len(playbooks)} playbooks")
```

---

## ⚡ COMMON TASKS

### Manually Trigger Follow-ups Now

```bash
curl -X POST http://localhost:8000/api/followups/check-and-trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Which Leads Need Follow-up

```bash
curl http://localhost:8000/api/followups/leads-needing-followup?days_threshold=3 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Analytics

```bash
curl http://localhost:8000/api/followups/analytics?days=30 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Schedule Follow-up

```bash
curl -X POST http://localhost:8000/api/followups/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "uuid",
    "playbook_id": "proposal_no_response",
    "scheduled_at": "2025-12-02T10:00:00Z"
  }'
```

---

## 🐛 TROUBLESHOOTING

### No Follow-ups Triggered

**Check:**
```sql
SELECT * FROM get_leads_needing_followup(3);
```

**Fix:**
- Verify leads have `status NOT IN ('won', 'lost')`
- Check `last_contact` timestamps
- Ensure playbooks `is_active = TRUE`

### Cron Job Not Running

**Check:**
```bash
ps aux | grep daily_followup_check
```

**Fix:**
```bash
pkill -f daily_followup_check
nohup python app/jobs/daily_followup_check.py > followup_cron.log 2>&1 &
```

### Analytics Empty

**Check:**
```sql
SELECT COUNT(*) FROM message_tracking;
SELECT COUNT(*) FROM follow_ups;
```

**Fix:**
```sql
REFRESH MATERIALIZED VIEW channel_performance;
REFRESH MATERIALIZED VIEW response_heatmap;
```

### API Returns 500

**Check:**
```bash
tail -f logs/app.log
```

**Fix:**
- Verify database connection
- Check environment variables
- Ensure all tables exist

---

## 📁 FILE LOCATIONS

```
backend/
├── database/
│   ├── followup_system_migration.sql          # Main migration
│   └── optional_scheduled_followups.sql       # Optional extension
├── app/
│   ├── services/
│   │   └── followup_service.py               # Core service
│   ├── routers/
│   │   └── followups.py                      # API endpoints
│   └── jobs/
│       └── daily_followup_check.py           # Cron job
└── scripts/
    └── test_followup_system.py               # Test suite

salesflow-ai/
└── src/
    └── pages/
        └── FollowUpAnalyticsPage.tsx         # Frontend dashboard

Root:
├── FOLLOWUP_SYSTEM_DEPLOYMENT_GUIDE.md       # Full guide
├── FOLLOWUP_SYSTEM_COMPLETE.md               # Summary
├── FOLLOWUP_QUICK_REFERENCE.md               # This file
├── deploy_followup_system.sh                 # Linux/Mac deploy
└── deploy_followup_system.ps1                # Windows deploy
```

---

## 🎯 KEY METRICS

Track these in production:

- **Follow-ups Sent** (daily/weekly)
- **Response Rate** (by channel)
- **Avg Response Time** (hours)
- **Playbook Success Rate** (%)
- **Leads Reactivated** (monthly)

---

## 🔗 LINKS

- **API Docs:** `http://localhost:8000/docs`
- **Frontend:** `http://localhost:3000/followups/analytics`
- **Full Guide:** `FOLLOWUP_SYSTEM_DEPLOYMENT_GUIDE.md`
- **Complete Docs:** `FOLLOWUP_SYSTEM_COMPLETE.md`

---

## 🚀 QUICK COMMANDS

```bash
# Deploy Everything
./deploy_followup_system.sh    # Linux/Mac
./deploy_followup_system.ps1   # Windows

# Start Backend
uvicorn app.main:app --reload --port 8000

# Start Cron
python app/jobs/daily_followup_check.py

# Run Tests
python scripts/test_followup_system.py

# Check Status
curl http://localhost:8000/api/followups/stats
```

---

**🤖 KEIN LEAD GEHT MEHR VERLOREN! 🎯**

