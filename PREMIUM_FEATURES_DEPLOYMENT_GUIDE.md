# 🚀 SALES FLOW AI: PREMIUM FEATURES DEPLOYMENT GUIDE

## 🎯 Übersicht

Dieses Deployment bringt Sales Flow AI von einem **€29 CRM** zu einem **€100 Lead-Generation-Beast** mit:

- ✅ **Intelligent Chat** mit Auto-Extraction
- ✅ **RAG Knowledge Base** mit Semantic Search
- ✅ **Predictive AI** (Win Probability, Optimal Timing)
- ✅ **Active Lead Generation** aus Social Media
- ✅ **Tier Enforcement** (Free, Starter, Pro, Premium, Enterprise)
- ✅ **Frontend Chat UI** mit Auto-Actions

---

## 📊 TIER STRUCTURE

### FREE (€0/Monat)
- ✅ 25 Leads max
- ✅ 5 AI-Chats/Tag
- ✅ Basic Features
- ✅ 1 Playbook (DEAL-MEDIC)

### STARTER (€29/Monat)
- ✅ 200 Leads max
- ✅ **Unlimited AI-Chats**
- ✅ Knowledge Base (100 MB)
- ✅ Core Playbooks
- ✅ RAG-basierte Suche

### PRO (€59/Monat)
- ✅ 500 Leads max
- ✅ **ALL Playbooks** (12 Stück)
- ✅ Squad Management (5 Users)
- ✅ Advanced Analytics
- ✅ Social Media Import (passive)

### PREMIUM (€100/Monat) 🔥
- ✅ **UNLIMITED Leads**
- ✅ **Active Lead Generation** (Instagram, Facebook, LinkedIn)
- ✅ **Autonomous Agent 24/7**
- ✅ **Predictive AI** (Win Probability, Optimal Timing)
- ✅ Multi-Channel Orchestration
- ✅ Knowledge Base (1 GB)

### ENTERPRISE (Custom)
- ✅ Everything Premium
- ✅ Unlimited Users
- ✅ White-Label
- ✅ Custom Features
- ✅ Priority Support

---

## 🗄️ STEP 1: DATABASE MIGRATION

### 1.1 Run Migration

```bash
cd backend

# Connect to your Supabase database
# Then run the migration SQL
psql $DATABASE_URL < database/premium_features_migration.sql
```

### 1.2 Verify Tables

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_subscriptions',
    'user_usage_tracking',
    'intelligent_chat_logs',
    'bant_assessments',
    'personality_profiles',
    'lead_generation_jobs',
    'auto_generated_leads',
    'lead_win_probability',
    'optimal_contact_times'
);
```

### 1.3 Seed Default Tier Configurations

Die Tier-Konfigurationen werden automatisch mit dem Migration Script angelegt. Prüfe:

```sql
SELECT * FROM tier_configurations;
```

---

## ⚙️ STEP 2: BACKEND SETUP

### 2.1 Update Environment Variables

Erstelle/Update `.env` im `backend/` Verzeichnis:

```bash
# OpenAI (REQUIRED for Premium Features)
OPENAI_API_KEY=sk-...

# Supabase (Already configured)
SUPABASE_URL=https://...
SUPABASE_KEY=...

# Social Media APIs (Optional - for Active Lead Gen)
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Feature Flags
ENABLE_INTELLIGENT_CHAT=true
ENABLE_PREDICTIVE_AI=true
ENABLE_LEAD_GENERATION=true
ENABLE_RAG_SEARCH=true
```

### 2.2 Install Dependencies

```bash
cd backend

# Ensure all dependencies are installed
pip install -r requirements.txt

# Verify OpenAI is installed
python -c "import openai; print(openai.__version__)"
```

### 2.3 Start Backend

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

### 2.4 Verify API Endpoints

```bash
# Check Intelligent Chat
curl http://localhost:8000/api/intelligent-chat/status

# Check Predictive AI
curl http://localhost:8000/api/predictive-ai/status

# Check Knowledge RAG
curl http://localhost:8000/api/knowledge/status

# Check Lead Generation
curl http://localhost:8000/api/lead-gen/status
```

---

## 📱 STEP 3: FRONTEND SETUP

### 3.1 Install Frontend

```bash
cd sales-flow-ai

# Install dependencies
npm install
```

### 3.2 Update API Config

File: `sales-flow-ai/services/api.ts`

```typescript
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds for AI requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 3.3 Add Screen to Navigation

File: `sales-flow-ai/app/(tabs)/_layout.tsx`

```tsx
import IntelligentChatScreen from '../../screens/IntelligentChatScreen';

// Add to tab navigator
<Tab.Screen
  name="intelligent-chat"
  component={IntelligentChatScreen}
  options={{
    title: 'AI Chat',
    tabBarIcon: ({ color }) => <TabBarIcon name="chatbubbles" color={color} />,
  }}
/>
```

### 3.4 Start Frontend

```bash
cd sales-flow-ai

# Start Expo
npx expo start --clear

# Or for specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

---

## 🧪 STEP 4: TESTING

### 4.1 Test Intelligent Chat

```bash
# Backend test
curl -X POST http://localhost:8000/api/intelligent-chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Gespräch mit Anna: Sie will Business starten, hat €500 Budget, möchte sofort starten. Telefon: 0176-12345678",
    "lead_id": null
  }'

# Expected response:
# {
#   "ai_response": "...",
#   "actions_taken": ["✅ Lead 'Anna' erstellt", "✅ BANT-Score berechnet: 72/100"],
#   "lead_id": "uuid",
#   "suggestions": ["🔥 HOT Lead! Priorität: Sofort Call buchen"],
#   "extracted_data": {...}
# }
```

### 4.2 Test RAG Knowledge Search

```bash
curl -X GET "http://localhost:8000/api/knowledge/search?query=einwand+preis&limit=3" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: List of relevant knowledge items
```

### 4.3 Test Predictive AI

```bash
curl -X GET http://localhost:8000/api/predictive-ai/win-probability/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected:
# {
#   "win_probability": 75,
#   "confidence": "high",
#   "factors": {"bant": 36, "engagement": 15, ...},
#   "recommendations": [...]
# }
```

### 4.4 Test Lead Generation Job

```bash
curl -X POST http://localhost:8000/api/lead-gen/start-job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "instagram",
    "job_type": "hashtag_monitor",
    "config": {
      "hashtags": ["#entrepreneur"],
      "max_profiles": 10,
      "min_followers": 100,
      "max_followers": 5000
    }
  }'

# Expected:
# {
#   "job_id": "uuid",
#   "status": "pending",
#   "message": "Lead generation job created..."
# }
```

### 4.5 Test Tier Enforcement

```bash
# Create a test user with FREE tier
# Try to create 26 leads (should fail)

# Or test via Python:
from app.services.tier_enforcement_service import TierEnforcementService
service = TierEnforcementService()
result = await service.check_can_create_lead(user_id='test-user')
print(result)
```

---

## 🚀 STEP 5: PRODUCTION DEPLOYMENT

### 5.1 Backend Deployment (Railway/Render/Heroku)

```bash
# Build Docker image
docker build -t salesflow-ai-backend .

# Run container
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_KEY=$SUPABASE_KEY \
  salesflow-ai-backend

# Or deploy to Railway
railway up
```

### 5.2 Frontend Deployment (Expo EAS)

```bash
cd sales-flow-ai

# Build for production
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### 5.3 Database Scaling (Supabase)

1. **Enable pgvector extension** (for RAG)
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Setup Connection Pooling**
   - Go to Supabase Dashboard → Settings → Database
   - Enable Connection Pooling
   - Update DATABASE_URL to use pooler

3. **Enable Row Level Security (RLS)**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE intelligent_chat_logs ENABLE ROW LEVEL SECURITY;
   -- ... etc for all tables
   
   -- Create policies (example)
   CREATE POLICY "Users can only see their own data"
     ON intelligent_chat_logs
     FOR SELECT
     USING (auth.uid() = user_id);
   ```

### 5.4 Monitoring & Observability

1. **Setup Error Tracking** (Sentry)
   ```bash
   pip install sentry-sdk
   ```
   
   ```python
   # In app/main.py
   import sentry_sdk
   sentry_sdk.init(dsn="YOUR_SENTRY_DSN")
   ```

2. **Setup Analytics** (PostHog/Mixpanel)
   ```typescript
   // In frontend
   import posthog from 'posthog-react-native';
   posthog.init('YOUR_API_KEY');
   ```

3. **Setup API Monitoring** (Better Uptime/Pingdom)
   - Monitor: `/health` endpoint
   - Alert on: 500 errors, slow responses

---

## 🔒 STEP 6: SECURITY CHECKLIST

- [ ] **OpenAI API Key** is stored securely (environment variables, not in code)
- [ ] **Rate Limiting** is enabled (already configured via SlowAPI)
- [ ] **CORS** is properly configured (only allow your domains)
- [ ] **Authentication** is required for all premium endpoints
- [ ] **RLS Policies** are set up on Supabase tables
- [ ] **Input Validation** on all API endpoints
- [ ] **SQL Injection Protection** (using parameterized queries)
- [ ] **Tier Enforcement** is active (users can't access features above their tier)
- [ ] **Usage Tracking** is logging correctly
- [ ] **GDPR Compliance** (users can delete their data)

---

## 📈 STEP 7: TIER ENFORCEMENT IN PRACTICE

### 7.1 Create User Subscription

```sql
-- Assign user to PREMIUM tier
INSERT INTO user_subscriptions (
    user_id, tier, status, max_leads, max_ai_chats_per_day,
    max_knowledge_base_mb, max_squad_users,
    price_monthly, currency
) VALUES (
    'user-uuid-here',
    'premium',
    'active',
    -1, -- Unlimited
    -1, -- Unlimited
    1000,
    10,
    100.00,
    'EUR'
);
```

### 7.2 Middleware für Tier-Checks

```python
# In app/middleware/tier_check.py
from fastapi import HTTPException
from app.services.tier_enforcement_service import TierEnforcementService

async def require_tier(required_tier: str):
    """Middleware to check if user has required tier."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            user_id = kwargs.get('current_user', {}).get('id')
            tier_service = TierEnforcementService()
            user_tier = await tier_service._get_user_tier_and_limits(user_id)
            
            tier_hierarchy = ['free', 'starter', 'pro', 'premium', 'enterprise']
            if tier_hierarchy.index(user_tier[0]) < tier_hierarchy.index(required_tier):
                raise HTTPException(
                    status_code=403,
                    detail=f"This feature requires {required_tier} tier or higher"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

---

## 🎉 DEPLOYMENT COMPLETE!

Nach erfolgreichem Deployment hast du:

✅ **Intelligent Chat** - Automatische Lead-Extraktion & Qualifizierung  
✅ **RAG Knowledge Base** - Semantic Search für Best Practices  
✅ **Predictive AI** - Win Probability & Optimal Timing  
✅ **Lead Generation** - Autonome Social Media Lead-Akquise  
✅ **Tier Enforcement** - Saubere Monetarisierung  
✅ **Frontend UI** - Modernes Chat-Interface  

---

## 🐛 TROUBLESHOOTING

### Problem: OpenAI API Fehler

```bash
# Check if API key is valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# If invalid, get new key from:
# https://platform.openai.com/api-keys
```

### Problem: Database Connection Fehler

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# If fails, check:
# 1. Supabase is running
# 2. DATABASE_URL is correct
# 3. IP is whitelisted in Supabase settings
```

### Problem: Frontend kann Backend nicht erreichen

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check frontend API URL
cat sales-flow-ai/.env | grep API_URL

# Update if needed
echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:8000" > sales-flow-ai/.env
```

### Problem: Tier Enforcement greift nicht

```sql
-- Check user subscription
SELECT * FROM user_subscriptions WHERE user_id = 'USER_ID';

-- If missing, create one
INSERT INTO user_subscriptions (user_id, tier, status, ...)
VALUES ('USER_ID', 'free', 'active', ...);
```

---

## 📚 NEXT STEPS

1. **Seed Knowledge Base** mit deinen Playbooks und Best Practices
2. **Setup Social Media Apps** (Instagram, LinkedIn, Facebook APIs)
3. **Configure Email Notifications** für neue Leads
4. **Setup Webhooks** für Stripe/Payment Processing
5. **Create Admin Dashboard** für User-Management
6. **Add A/B Testing** für Feature Optimization

---

## 🎯 SUCCESS METRICS

Track these KPIs post-launch:

- **Lead Creation Rate** (via Intelligent Chat)
- **BANT Completion Rate** (% of leads with BANT data)
- **Win Probability Accuracy** (actual vs. predicted)
- **Auto-Generated Leads** (from social media)
- **Tier Conversion Rate** (Free → Paid)
- **Feature Usage** (which premium features are used most)
- **User Retention** (churn rate per tier)
- **API Response Times** (keep < 2s)

---

## 💬 SUPPORT

Bei Fragen oder Problemen:

1. **Check Logs**
   ```bash
   # Backend logs
   tail -f logs/backend.log
   
   # Frontend logs
   npx expo start --clear
   ```

2. **Check Supabase Logs**
   - Go to Supabase Dashboard → Logs

3. **Check OpenAI Usage**
   - https://platform.openai.com/usage

---

**🚀 VIEL ERFOLG MIT SALES FLOW AI PREMIUM!**

