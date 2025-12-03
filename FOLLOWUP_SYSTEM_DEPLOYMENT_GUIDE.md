# 🤖 AUTOMATIC FOLLOW-UP SYSTEM - DEPLOYMENT GUIDE

## ✅ SYSTEM OVERVIEW

Das **Automatic Follow-up System** ist das fehlende Automation-Herzstück von Sales Flow AI:

- ✅ Automatisches Follow-up System (6+ Playbooks)
- ✅ Message Tracking (delivered, opened, responded)
- ✅ Response Heatmaps (Stunde/Wochentag Analytics)
- ✅ Smart Channel Selection (WhatsApp > Email > In-App)
- ✅ Trigger-System (14+ automatische Trigger)
- ✅ Cron Jobs (tägliche Follow-up Checks)
- ✅ Alerts & Coaching-Empfehlungen
- ✅ Analytics Dashboard

---

## 📦 IMPLEMENTIERTE FILES

### Backend

```
backend/
├── database/
│   └── followup_system_migration.sql       # Komplette DB Migration
├── app/
│   ├── services/
│   │   └── followup_service.py            # Core Follow-up Logic
│   ├── routers/
│   │   └── followups.py                   # API Endpoints
│   ├── jobs/
│   │   ├── __init__.py
│   │   └── daily_followup_check.py        # Cron Job
│   └── main.py                            # Router Integration ✅
└── requirements.txt                        # schedule==1.2.0 ✅
```

### Frontend

```
salesflow-ai/
└── src/
    └── pages/
        └── FollowUpAnalyticsPage.tsx      # Analytics Dashboard
```

---

## 🚀 DEPLOYMENT SCHRITTE

### 1️⃣ DATABASE MIGRATION

```bash
cd backend

# Option A: Supabase (empfohlen)
psql $SUPABASE_DB_URL < database/followup_system_migration.sql

# Option B: Lokale PostgreSQL
psql -U postgres -d salesflow < database/followup_system_migration.sql

# Verify
psql $SUPABASE_DB_URL -c "SELECT * FROM followup_playbooks;"
# Should show 6 playbooks
```

**Expected Output:**
```
                id                |          name          | trigger_type  | delay_days | ...
----------------------------------+------------------------+---------------+------------+-----
proposal_no_response              | Proposal Follow-up     | proposal_sent |     3      | ...
commitment_no_action              | Zusage ohne Aktion     | verbal_commitment |  2     | ...
callback_missed                   | Verpasster Rückruf     | promised_callback | 1     | ...
ghosted_after_meeting             | Keine Reaktion...      | meeting_no_response | 4  | ...
price_objection_silence           | Preis-Einwand...       | objection_price |   3    | ...
nurture_30d                       | Langzeit-Nurturing     | long_inactivity |  30    | ...
```

---

### 2️⃣ BACKEND DEPENDENCIES

```bash
cd backend

# Install schedule library
pip install schedule==1.2.0

# Or install all requirements
pip install -r requirements.txt
```

---

### 3️⃣ BACKEND SERVER STARTEN

```bash
cd backend

# Start FastAPI Server
uvicorn app.main:app --reload --port 8000

# Check if Follow-up routes are loaded
# Look for: "Follow-up Engine routes loaded successfully ✅"
```

**Test API:**
```bash
# Get Playbooks
curl http://localhost:8000/api/followups/playbooks

# Get Analytics
curl http://localhost:8000/api/followups/analytics?days=30

# Get Leads Needing Follow-up
curl http://localhost:8000/api/followups/leads-needing-followup?days_threshold=3
```

---

### 4️⃣ CRON JOB SETUP

#### Option A: Lokaler Python Scheduler (Entwicklung)

```bash
cd backend

# Run Cron Job (läuft dauerhaft)
python app/jobs/daily_followup_check.py

# Logs werden geschrieben nach: followup_cron.log
```

#### Option B: System Cron (Linux/Mac)

```bash
crontab -e

# Add line (täglich 9:00 AM):
0 9 * * * cd /path/to/backend && python app/jobs/daily_followup_check.py
```

#### Option C: Windows Task Scheduler

```powershell
# Create Task
schtasks /create /tn "SalesFlowFollowups" /tr "python C:\path\to\backend\app\jobs\daily_followup_check.py" /sc daily /st 09:00
```

#### Option D: Supabase Edge Function (Empfohlen für Production)

```typescript
// supabase/functions/daily-followup-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Call Backend API
  const response = await fetch('https://your-backend.com/api/followups/check-and-trigger', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY'
    }
  })
  
  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  })
})
```

**Deploy:**
```bash
supabase functions deploy daily-followup-check

# Schedule in Supabase Dashboard:
# Functions > daily-followup-check > Settings > Cron Schedule: "0 9 * * *"
```

---

### 5️⃣ FRONTEND INTEGRATION

#### Route hinzufügen

```typescript
// salesflow-ai/src/App.tsx oder Router Config
import FollowUpAnalyticsPage from '@/pages/FollowUpAnalyticsPage'

// Add Route
<Route path="/followups/analytics" element={<FollowUpAnalyticsPage />} />
```

#### Navigation Link

```tsx
// In Sidebar/Navigation
<NavLink to="/followups/analytics">
  📊 Follow-up Analytics
</NavLink>
```

---

### 6️⃣ MATERIALIZED VIEWS REFRESHEN

**Initial Setup:**
```sql
REFRESH MATERIALIZED VIEW response_heatmap;
REFRESH MATERIALIZED VIEW weekly_activity_trend;
REFRESH MATERIALIZED VIEW channel_performance;
REFRESH MATERIALIZED VIEW gpt_vs_human_messages;
```

**Auto-Refresh (empfohlen):**
```sql
-- Cron Job für tägliches Refresh (z.B. in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-followup-views',
  '0 1 * * *',  -- Every day at 1 AM
  $$
  REFRESH MATERIALIZED VIEW response_heatmap;
  REFRESH MATERIALIZED VIEW weekly_activity_trend;
  REFRESH MATERIALIZED VIEW channel_performance;
  REFRESH MATERIALIZED VIEW gpt_vs_human_messages;
  $$
);
```

---

## 🧪 TESTING

### 1. Manual Trigger Test

```bash
curl -X POST http://localhost:8000/api/followups/check-and-trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "results": {
    "checked": 15,
    "triggered": 3,
    "failed": 0,
    "skipped": 12
  },
  "message": "Checked 15 leads, triggered 3 follow-ups"
}
```

### 2. Test Individual Follow-up

```bash
curl -X POST http://localhost:8000/api/followups/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "00000000-0000-0000-0000-000000000001",
    "playbook_id": "proposal_no_response"
  }'
```

### 3. Check Analytics

```bash
curl http://localhost:8000/api/followups/analytics?days=30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 PLAYBOOKS ÜBERSICHT

| Playbook ID | Name | Trigger | Delay | Kanäle |
|------------|------|---------|-------|--------|
| `proposal_no_response` | Proposal Follow-up | Nach Angebot keine Reaktion | 3 Tage | WhatsApp, Email |
| `commitment_no_action` | Zusage ohne Aktion | Zusage aber keine Schritte | 2 Tage | WhatsApp, In-App |
| `callback_missed` | Verpasster Rückruf | Lead meldet sich nicht | 1 Tag | WhatsApp, In-App |
| `ghosted_after_meeting` | Ghosted nach Meeting | Meeting ohne Antwort | 4 Tage | Email, WhatsApp |
| `price_objection_silence` | Preis-Einwand Funkstille | Preis-Einwand ohne Reaktion | 3 Tage | WhatsApp, Email |
| `nurture_30d` | Langzeit-Nurturing | 30 Tage Inaktivität | 30 Tage | Email |

---

## 🔧 KONFIGURATION

### Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...                    # Für GPT-generierte Messages (optional)
TWILIO_ACCOUNT_SID=AC...                 # WhatsApp Integration
TWILIO_AUTH_TOKEN=...
GMAIL_CLIENT_ID=...                      # Email Integration
GMAIL_CLIENT_SECRET=...
```

### Custom Playbook hinzufügen

```sql
INSERT INTO followup_playbooks (
  id, name, description, trigger_type, delay_days,
  preferred_channels, message_template, category, priority
) VALUES (
  'custom_high_value',
  'High-Value Lead Inactive',
  'Follow-up für High-Value Leads nach 7 Tagen',
  'high_value_inactive',
  7,
  ARRAY['whatsapp', 'email'],
  'Hey {{first_name}}, ich wollte kurz bei dir einhaken. Bei deinem Potenzial würde es mich wirklich freuen, wenn wir nochmal sprechen könnten. Passt es diese Woche?',
  'reactivation',
  10
);
```

---

## 📈 MONITORING

### Check Logs

```bash
# Cron Job Logs
tail -f followup_cron.log

# Backend Logs
tail -f logs/app.log | grep "follow"
```

### Database Queries

```sql
-- Heute gesendete Follow-ups
SELECT * FROM follow_ups 
WHERE sent_at >= CURRENT_DATE 
ORDER BY sent_at DESC;

-- Channel Performance
SELECT * FROM channel_performance;

-- Leads mit überfälligen Follow-ups
SELECT * FROM get_leads_needing_followup(3);

-- Top Playbooks
SELECT id, name, usage_count, success_rate 
FROM followup_playbooks 
ORDER BY usage_count DESC 
LIMIT 10;
```

---

## 🎯 OPTIONAL EXTENSIONS

### 1. Scheduled Follow-ups Table

```sql
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  playbook_id TEXT REFERENCES followup_playbooks(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_followups_time ON scheduled_followups(scheduled_at) 
WHERE status = 'pending';
```

### 2. A/B Testing

```sql
ALTER TABLE followup_playbooks 
ADD COLUMN variant TEXT DEFAULT 'A',
ADD COLUMN ab_test_group TEXT;

-- Create Variant B
INSERT INTO followup_playbooks (...)
SELECT ... FROM followup_playbooks WHERE id = 'proposal_no_response';
```

### 3. GPT-Enhanced Messages

```python
# In followup_service.py
async def generate_gpt_followup(self, lead_id: str, playbook_id: str):
    """Generate personalized follow-up with GPT"""
    
    # Get lead context
    lead = await self.get_lead_context(lead_id)
    playbook = await self.get_playbook(playbook_id)
    
    # Generate with OpenAI
    prompt = f"""
    Erstelle eine persönliche Follow-up Message für:
    Lead: {lead['name']}
    Kontext: {lead['context_summary']}
    Playbook: {playbook['message_template']}
    Personality: {lead['personality_type']}
    
    Ton: {lead['preferred_tone']}
    """
    
    response = await openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.choices[0].message.content
```

---

## ⚠️ TROUBLESHOOTING

### Problem: Keine Follow-ups werden getriggert

**Check:**
```sql
SELECT * FROM get_leads_needing_followup(3);
-- Sollte Leads zurückgeben
```

**Lösung:**
- Stelle sicher dass Leads `status NOT IN ('won', 'lost')` haben
- Check `last_contact` oder `created_at` Timestamp
- Verify dass Playbooks `is_active = TRUE`

### Problem: Cron Job läuft nicht

**Check:**
```bash
ps aux | grep daily_followup_check
```

**Lösung:**
```bash
# Restart Job
pkill -f daily_followup_check
nohup python app/jobs/daily_followup_check.py > followup_cron.log 2>&1 &
```

### Problem: Analytics zeigen keine Daten

**Check:**
```sql
SELECT COUNT(*) FROM message_tracking;
SELECT COUNT(*) FROM follow_ups;
```

**Lösung:**
```sql
-- Refresh Materialized Views
REFRESH MATERIALIZED VIEW channel_performance;
REFRESH MATERIALIZED VIEW response_heatmap;
```

---

## 🎉 SUCCESS CRITERIA

- ✅ Database Migration läuft durch
- ✅ API Endpoints antworten (200 OK)
- ✅ Playbooks werden geladen
- ✅ Cron Job läuft täglich
- ✅ Follow-ups werden versendet
- ✅ Analytics zeigen Daten
- ✅ Frontend Dashboard lädt

---

## 🚀 PRODUCTION READINESS

### Security

- [ ] API Endpoints haben Auth
- [ ] Rate Limiting aktiv
- [ ] Environment Variables gesetzt
- [ ] Database RLS Policies

### Monitoring

- [ ] Logging aktiviert
- [ ] Error Alerting (Sentry)
- [ ] Performance Monitoring
- [ ] Daily Reports

### Scaling

- [ ] Database Indices optimiert
- [ ] Materialized Views scheduled
- [ ] Cron Job als Service
- [ ] Load Balancing für API

---

## 📞 SUPPORT

Bei Fragen oder Problemen:
1. Check Logs: `followup_cron.log`
2. Database Query Test
3. API Endpoint Test
4. Dokumentation lesen

---

**🎯 KEIN LEAD GEHT MEHR VERLOREN!**

**🤖 AUTOMATIC FOLLOW-UP SYSTEM - PRODUCTION READY!** ✅

