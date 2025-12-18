# 🚀 URGENT: DEPLOYMENT INFRASTRUKTUR SETUP

## 🎯 MISSION: SalesFlow AI live deployen in 3-4 Stunden

### 🔥 DEPLOYMENT STACK:
- **Frontend:** Vercel (Web-App)
- **Backend:** Railway (FastAPI)
- **Database:** Supabase (PostgreSQL)
- **Mobile:** Expo EAS Build (für später)

### 📋 SCHRITT-FÜR-SCHRITT DEPLOYMENT:

#### 1. **VERCEL FRONTEND DEPLOYMENT** (30 min)
```bash
# 1. Vercel CLI installieren
npm i -g vercel

# 2. Projekt verbinden
cd salesflow-ai
vercel login
vercel link

# 3. Environment Variables setzen
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL

# 4. Deploy
vercel --prod
```

**Datei:** `vercel.json` - Bereits konfiguriert ✅

#### 2. **RAILWAY BACKEND DEPLOYMENT** (45 min)
```bash
# 1. Railway CLI installieren
npm install -g @railway/cli

# 2. Login & Projekt erstellen
railway login
railway init salesflow-ai-backend

# 3. Environment Variables setzen
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
railway variables set SECRET_KEY=...
railway variables set FACEBOOK_APP_SECRET=...
railway variables set LINKEDIN_CLIENT_SECRET=...
railway variables set INSTAGRAM_APP_SECRET=...

# 4. Deploy
railway up
```

#### 3. **SUPABASE PRODUCTION SETUP** (30 min)
```sql
-- 1. RLS Policies für Production
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Policies für authenticated users
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Webhook Secrets setzen
-- Facebook, LinkedIn, Instagram App Secrets
```

#### 4. **SSL & DOMAIN SETUP** (30 min)
```bash
# 1. Custom Domain auf Vercel
vercel domains add salesflow.ai

# 2. DNS Records setzen
# A Record: 76.76.21.21 (Vercel)
# CNAME: api.salesflow.ai -> railway.app

# 3. SSL automatisch durch Vercel/Railway
```

#### 5. **MONITORING & ERROR TRACKING** (45 min)
```typescript
// Sentry für Error Tracking
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});

// Backend Error Tracking
import sentry_sdk
sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
```

### 📋 DELIVERABLES (3-4 Stunden):

1. **✅ Live Web-App URL** - salesflow.ai
2. **✅ Live API URL** - api.salesflow.ai
3. **✅ SSL Zertifikate** - Alle HTTPS
4. **✅ Environment Variables** - Production Secrets
5. **✅ Error Monitoring** - Sentry konfiguriert
6. **✅ Database Security** - RLS Policies aktiv

### 🧪 TESTING DEPLOYMENT:

```bash
# 1. Web-App testen
curl https://salesflow.ai
# Sollte 200 OK zurückgeben

# 2. API testen
curl https://api.salesflow.ai/health
# Sollte {"status": "healthy"} zurückgeben

# 3. Auth testen
# Login Flow über Web-App

# 4. Database Connection testen
# Lead erstellen über API
```

### 🚨 KRITISCH:
- **Environment Variables** - Niemals im Code committen!
- **Database Backups** - Railway macht automatisch
- **Scaling** - Railway skaliert automatisch
- **Domain** - salesflow.ai muss verfügbar sein

### 📊 BUDGET:
- **Vercel:** $0-20/Monat (Hobby Plan)
- **Railway:** $5-10/Monat (Developer Plan)
- **Supabase:** $0-25/Monat (abhängig von Usage)

**Zeitbudget:** 3-4 Stunden MAXIMUM
**Priorität:** HIGH - BLOCKING TESTING

**GO!** 🚀
