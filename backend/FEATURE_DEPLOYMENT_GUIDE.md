# 🚀 Sales Flow AI - Complete Feature Deployment Guide

Dieser Guide zeigt dir, wie du **Email Integration**, **Import/Export** und **Gamification** in Sales Flow AI aktivierst.

---

## 📋 Übersicht

Wir haben drei große Features implementiert:

1. **📧 Email Integration** - Gmail & Outlook/Exchange
2. **📊 Import/Export System** - CSV Import mit AI Field Mapping, Excel/JSON Export
3. **🎮 Gamification** - Badges, Streaks, Leaderboards

---

## 🛠️ INSTALLATION

### 1. Dependencies installieren

```bash
cd backend
pip install -r requirements.txt
```

**Neue Dependencies:**
- `google-auth` - Gmail OAuth2
- `google-auth-oauthlib` - Gmail OAuth Flow
- `google-api-python-client` - Gmail API
- `msal` - Microsoft Authentication (Outlook)
- `openpyxl` - Excel Export
- `requests` - HTTP Client

### 2. Datenbank migrieren

```bash
# Alle Features auf einmal deployen
psql -U your_user -d salesflow_db -f backend/database/DEPLOY_ALL_FEATURES.sql

# Oder einzeln:
psql -U your_user -d salesflow_db -f backend/database/migrations/001_email_integration.sql
psql -U your_user -d salesflow_db -f backend/database/migrations/002_import_export.sql
psql -U your_user -d salesflow_db -f backend/database/migrations/003_gamification.sql
```

### 3. Environment Variables

Erstelle/aktualisiere `.env`:

```bash
# Gmail OAuth2 (Google Cloud Console)
GMAIL_CLIENT_ID="your-gmail-client-id.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="your-gmail-secret"

# Outlook OAuth2 (Azure Portal)
OUTLOOK_CLIENT_ID="your-outlook-client-id"
OUTLOOK_CLIENT_SECRET="your-outlook-secret"

# OpenAI (für AI Field Mapping)
OPENAI_API_KEY="sk-..."
```

---

## 🔑 OAuth Setup

### Gmail (Google Cloud Console)

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle neues Projekt oder wähle bestehendes
3. Aktiviere **Gmail API**
4. Gehe zu **APIs & Services > Credentials**
5. Erstelle **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8000/api/email/callback/gmail`
     - `https://yourdomain.com/api/email/callback/gmail`
6. Kopiere Client ID und Secret in `.env`

**Scopes needed:**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.modify`

### Outlook (Azure Portal)

1. Gehe zu [Azure Portal](https://portal.azure.com/)
2. Registriere neue App unter **Azure Active Directory > App registrations**
3. Füge Redirect URI hinzu:
   - `http://localhost:8000/api/email/callback/outlook`
   - `https://yourdomain.com/api/email/callback/outlook`
4. Unter **API permissions**, füge hinzu:
   - `Mail.ReadWrite`
   - `Mail.Send`
5. Kopiere Application (client) ID und erstelle Client Secret
6. Kopiere beide in `.env`

---

## 🔌 Routes registrieren

Aktualisiere `backend/app/main.py`:

```python
from app.routers import (
    # ... existing imports
    email,
    import_export,
    gamification
)

# Register routes
app.include_router(email.router)
app.include_router(import_export.router)
app.include_router(gamification.router)
```

---

## 📧 EMAIL INTEGRATION - TESTING

### 1. Email-Account verbinden

```bash
# GET auth URL
curl -X POST http://localhost:8000/api/email/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "redirect_uri": "http://localhost:8000/api/email/callback/gmail"
  }'

# Response: {"auth_url": "https://accounts.google.com/o/oauth2/auth?..."}
# Öffne die auth_url im Browser
```

### 2. Emails abrufen

```bash
curl http://localhost:8000/api/email/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Email senden

```bash
curl -X POST http://localhost:8000/api/email/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "abc-123",
    "to": "kunde@example.com",
    "subject": "Hallo von Sales Flow AI",
    "body": "Das ist eine Test-Email!",
    "lead_id": "lead-456"
  }'
```

---

## 📊 IMPORT/EXPORT - TESTING

### 1. CSV Import mit AI Mapping

```bash
curl -X POST http://localhost:8000/api/import-export/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@leads.csv"

# Response: {"job_id": "...", "status": "processing"}
```

**AI Field Mapping:**
Das System erkennt automatisch Felder wie:
- "Email Address" → `email`
- "First Name" / "Vorname" → `name`
- "Company Name" / "Firma" → `company`

### 2. Job Status prüfen

```bash
curl http://localhost:8000/api/import-export/import/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Leads exportieren

```bash
# CSV Export
curl -X POST "http://localhost:8000/api/import-export/export/leads?export_format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Excel Export
curl -X POST "http://localhost:8000/api/import-export/export/leads?export_format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN"

# JSON Export (GDPR)
curl -X POST "http://localhost:8000/api/import-export/export/leads?export_format=json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. File herunterladen

```bash
curl -O http://localhost:8000/api/import-export/download/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎮 GAMIFICATION - TESTING

### 1. Badges abrufen

```bash
curl http://localhost:8000/api/gamification/badges
```

### 2. User Achievements

```bash
curl http://localhost:8000/api/gamification/achievements \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Streak abfragen

```bash
curl http://localhost:8000/api/gamification/streak \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Leaderboard

```bash
# Weekly Most Leads
curl "http://localhost:8000/api/gamification/leaderboard/most_leads?period=weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Monthly Most Deals
curl "http://localhost:8000/api/gamification/leaderboard/most_deals?period=monthly" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Longest Streaks
curl "http://localhost:8000/api/gamification/leaderboard/longest_streak?period=weekly" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Badge-Unlock prüfen

```bash
curl -X POST http://localhost:8000/api/gamification/check-badges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📱 FRONTEND INTEGRATION

Die Frontend-Screens sind bereits fertig:

1. **EmailScreen.tsx** - `sales-flow-ai/screens/EmailScreen.tsx`
2. **AchievementsScreen.tsx** - `sales-flow-ai/screens/AchievementsScreen.tsx`

### Navigation hinzufügen

```typescript
// App.tsx oder Navigation.tsx
import EmailScreen from './screens/EmailScreen';
import AchievementsScreen from './screens/AchievementsScreen';

// In Stack Navigator:
<Stack.Screen name="Email" component={EmailScreen} />
<Stack.Screen name="Achievements" component={AchievementsScreen} />
```

---

## 🔥 BACKGROUND JOBS

Für Production empfohlen:

### 1. Email Sync Worker

```python
# backend/workers/email_sync_worker.py
import asyncio
from app.services.email.gmail_service import GmailService
from app.services.email.outlook_service import OutlookService

async def sync_all_accounts():
    """Sync all email accounts every 5 minutes"""
    accounts = await db.fetch("""
        SELECT * FROM email_accounts 
        WHERE sync_enabled = TRUE
    """)
    
    for account in accounts:
        if account['provider'] == 'gmail':
            service = GmailService(db)
        else:
            service = OutlookService(db)
        
        await service.sync_emails(account['id'])

# Run with: while True: asyncio.run(sync_all_accounts()); sleep(300)
```

### 2. Badge Checker Worker

```python
# backend/workers/badge_checker_worker.py
async def check_all_badges():
    """Check badges for all users daily"""
    users = await db.fetch("SELECT id FROM users")
    
    for user in users:
        service = GamificationService(db)
        new_badges = await service.check_badge_unlock(user['id'])
        
        if new_badges:
            # Send notification
            pass

# Run daily at midnight
```

---

## 🎯 PRODUCTION CHECKLIST

- [ ] OAuth credentials in Production .env
- [ ] Database migrations deployed
- [ ] Email sync background worker running
- [ ] File storage konfiguriert (S3 statt local)
- [ ] Rate limiting für Import/Export aktiviert
- [ ] Webhook für Badge notifications
- [ ] Analytics tracking für Gamification events

---

## 🐛 TROUBLESHOOTING

### Gmail OAuth Error

```
Error: redirect_uri_mismatch
```

**Fix:** Redirect URI in Google Cloud Console muss exakt übereinstimmen (inkl. http/https)

### Import fails with "Field mapping error"

**Fix:** Manuelles Mapping übergeben:

```json
{
  "mapping": {
    "Email": "email",
    "Name": "name",
    "Phone Number": "phone"
  }
}
```

### Badges not unlocking

**Fix:** Manuell check-badges aufrufen:

```bash
curl -X POST http://localhost:8000/api/gamification/check-badges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 API DOCUMENTATION

Starte den Server und gehe zu:

```
http://localhost:8000/docs
```

Alle neuen Endpoints sind dort dokumentiert:
- `/api/email/*`
- `/api/import-export/*`
- `/api/gamification/*`

---

## 🚀 DEPLOYMENT SCRIPT

Alles auf einmal deployen:

```bash
#!/bin/bash
# deploy_features.sh

echo "🚀 Deploying Sales Flow AI Features..."

# 1. Install dependencies
pip install -r requirements.txt

# 2. Run migrations
psql -U $DB_USER -d $DB_NAME -f backend/database/DEPLOY_ALL_FEATURES.sql

# 3. Restart server
systemctl restart salesflow-backend

echo "✅ Deployment complete!"
```

---

## 🎉 FERTIG!

Alle drei Features sind jetzt live:

✅ **Email Integration** - Kommuniziere direkt aus der App  
✅ **Import/Export** - Migriere Leads in Sekunden  
✅ **Gamification** - Motiviere dein Team mit Achievements  

Bei Fragen: support@salesflow.ai

