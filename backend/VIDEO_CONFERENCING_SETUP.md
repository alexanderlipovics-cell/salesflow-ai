# 🎥 Video Conferencing Setup Guide

Complete setup guide for Zoom, Microsoft Teams, and Google Meet integration.

---

## 📋 Overview

Sales Flow AI integrates with:
- ✅ **Zoom** - Schedule meetings, fetch recordings, transcripts
- ✅ **Microsoft Teams** - Schedule meetings via Graph API
- ✅ **Google Meet** - Schedule meetings via Calendar API

After meetings, the system:
1. Fetches recordings automatically (via webhooks)
2. Downloads transcripts
3. Runs AI analysis (key topics, action items, sentiment)
4. Saves results to database

---

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# ═══════════════════════════════════════════════════════════════
# ZOOM INTEGRATION
# ═══════════════════════════════════════════════════════════════

# Create app at: https://marketplace.zoom.us/develop/create
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_WEBHOOK_SECRET=your_webhook_secret_token

# OAuth redirect URL (after user connects Zoom)
ZOOM_REDIRECT_URI=https://yourdomain.com/api/integrations/zoom/callback


# ═══════════════════════════════════════════════════════════════
# MICROSOFT TEAMS INTEGRATION
# ═══════════════════════════════════════════════════════════════

# Create app at: https://portal.azure.com/ -> App registrations
MICROSOFT_CLIENT_ID=your_azure_app_client_id
MICROSOFT_CLIENT_SECRET=your_azure_app_secret
MICROSOFT_TENANT_ID=your_azure_tenant_id

# OAuth redirect URL
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/integrations/teams/callback


# ═══════════════════════════════════════════════════════════════
# GOOGLE MEET INTEGRATION
# ═══════════════════════════════════════════════════════════════

# Create project at: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth redirect URL
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/integrations/google/callback


# ═══════════════════════════════════════════════════════════════
# OPENAI (for AI analysis)
# ═══════════════════════════════════════════════════════════════

OPENAI_API_KEY=sk-...
```

---

## 🚀 Platform Setup

### 1. Zoom Setup

#### Step 1: Create Zoom App

1. Go to https://marketplace.zoom.us/develop/create
2. Choose **OAuth** app type
3. Fill in app details:
   - **App Name**: Sales Flow AI
   - **Short Description**: Sales meeting management
   - **Company Name**: Your company
4. Add **Redirect URL**: `https://yourdomain.com/api/integrations/zoom/callback`

#### Step 2: Configure Scopes

Add these OAuth scopes:
- `meeting:write` - Create meetings
- `meeting:read` - Read meeting details
- `recording:read` - Access recordings
- `recording:write` - Manage recordings

#### Step 3: Enable Webhooks

1. Go to **Features** → **Event Subscriptions**
2. Enable event subscriptions
3. Add **Event notification endpoint URL**: 
   ```
   https://yourdomain.com/api/webhooks/zoom
   ```
4. Subscribe to events:
   - `recording.completed`
   - `meeting.started`
   - `meeting.ended`

#### Step 4: Get Credentials

Copy:
- Client ID → `ZOOM_CLIENT_ID`
- Client Secret → `ZOOM_CLIENT_SECRET`
- Webhook Secret Token → `ZOOM_WEBHOOK_SECRET`

---

### 2. Microsoft Teams Setup

#### Step 1: Register App in Azure

1. Go to https://portal.azure.com/
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Sales Flow AI
   - **Supported account types**: Multitenant
   - **Redirect URI**: `https://yourdomain.com/api/integrations/teams/callback`

#### Step 2: Configure API Permissions

Add these Microsoft Graph permissions:
- `Calendars.ReadWrite` - Create calendar events
- `OnlineMeetings.ReadWrite` - Create Teams meetings
- `User.Read` - Basic user info

Grant admin consent.

#### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Copy the secret value immediately (you won't see it again)

#### Step 4: Get Credentials

Copy:
- Application (client) ID → `MICROSOFT_CLIENT_ID`
- Client secret → `MICROSOFT_CLIENT_SECRET`
- Directory (tenant) ID → `MICROSOFT_TENANT_ID`

---

### 3. Google Meet Setup

#### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create new project: **Sales Flow AI**
3. Enable APIs:
   - Google Calendar API
   - Google Meet API (if available)

#### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in app details:
   - **App name**: Sales Flow AI
   - **User support email**: Your email
   - **Developer contact**: Your email

#### Step 3: Add Scopes

Add these scopes:
- `https://www.googleapis.com/auth/calendar` - Calendar access
- `https://www.googleapis.com/auth/calendar.events` - Create events

#### Step 4: Create OAuth Credentials

1. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Add **Authorized redirect URIs**: 
   ```
   https://yourdomain.com/api/integrations/google/callback
   ```

#### Step 5: Get Credentials

Download JSON or copy:
- Client ID → `GOOGLE_CLIENT_ID`
- Client secret → `GOOGLE_CLIENT_SECRET`

---

## 📊 Database Migration

Run migration to create video meeting tables:

```bash
cd backend

# Apply migration
alembic revision --autogenerate -m "Add video meetings tables"
alembic upgrade head
```

Or manually run SQL:

```sql
-- Video meetings table
CREATE TABLE video_meetings (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    lead_id VARCHAR,
    platform VARCHAR NOT NULL,
    platform_meeting_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    join_url VARCHAR NOT NULL,
    host_url VARCHAR,
    password VARCHAR,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR DEFAULT 'scheduled',
    has_recording BOOLEAN DEFAULT FALSE,
    recording_url VARCHAR,
    recording_download_url VARCHAR,
    has_transcript BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    key_topics JSON,
    action_items JSON,
    sentiment_analysis JSON,
    duration_minutes INTEGER,
    participants_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE meeting_transcripts (
    id VARCHAR PRIMARY KEY,
    meeting_id VARCHAR NOT NULL REFERENCES video_meetings(id),
    transcript_text TEXT NOT NULL,
    transcript_vtt TEXT,
    language VARCHAR DEFAULT 'de',
    is_processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Participants table
CREATE TABLE meeting_participants (
    id VARCHAR PRIMARY KEY,
    meeting_id VARCHAR NOT NULL REFERENCES video_meetings(id),
    name VARCHAR NOT NULL,
    email VARCHAR,
    user_id VARCHAR,
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Video integrations (OAuth tokens)
CREATE TABLE video_integrations (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    access_token VARCHAR NOT NULL,
    refresh_token VARCHAR,
    token_expires_at TIMESTAMP,
    platform_user_id VARCHAR,
    platform_email VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_meetings_user ON video_meetings(user_id);
CREATE INDEX idx_video_meetings_lead ON video_meetings(lead_id);
CREATE INDEX idx_video_meetings_platform ON video_meetings(platform, platform_meeting_id);
CREATE INDEX idx_video_integrations_user ON video_integrations(user_id, platform);
```

---

## 🔗 Register Routes

Add to `backend/app/main.py`:

```python
from app.routers import video_meetings, video_webhooks

# Register video routes
app.include_router(video_meetings.router)
app.include_router(video_webhooks.router)
```

---

## 🧪 Testing

### Test Zoom Integration

```bash
# Create meeting
curl -X POST http://localhost:8000/api/video-meetings/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zoom",
    "title": "Test Sales Call",
    "start_time": "2024-12-10T15:00:00Z",
    "duration_minutes": 60
  }'

# List meetings
curl http://localhost:8000/api/video-meetings/meetings?upcoming=true

# Get meeting details
curl http://localhost:8000/api/video-meetings/meetings/{meeting_id}
```

### Test Webhook (Zoom)

```bash
# Simulate recording ready webhook
curl -X POST http://localhost:8000/api/webhooks/zoom \
  -H "Content-Type: application/json" \
  -d '{
    "event": "recording.completed",
    "payload": {
      "object": {
        "id": "123456789",
        "uuid": "abc-def-ghi"
      }
    }
  }'
```

---

## 🔐 User OAuth Flow

### Step 1: Connect Zoom

When user clicks "Connect Zoom":

```typescript
// Frontend: Redirect to OAuth
window.location.href = `https://zoom.us/oauth/authorize?` +
  `response_type=code&` +
  `client_id=${ZOOM_CLIENT_ID}&` +
  `redirect_uri=${ZOOM_REDIRECT_URI}`;
```

### Step 2: Handle Callback

Backend receives OAuth code and exchanges for access token:

```python
# In app/routers/integrations.py (to be created)

@router.get("/integrations/zoom/callback")
async def zoom_callback(code: str, user_id: str):
    # Exchange code for access token
    response = requests.post(
        'https://zoom.us/oauth/token',
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': ZOOM_REDIRECT_URI
        },
        auth=(ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)
    )
    
    tokens = response.json()
    
    # Save to video_integrations table
    integration = VideoIntegration(
        user_id=user_id,
        platform='zoom',
        access_token=tokens['access_token'],
        refresh_token=tokens['refresh_token'],
        token_expires_at=datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
    )
    
    db.add(integration)
    await db.commit()
    
    return {"success": True}
```

---

## 📱 Frontend Integration

### React Native (Mobile)

```typescript
import { useNavigation } from '@react-navigation/native';

// Navigate to schedule meeting screen
navigation.navigate('ScheduleMeeting', {
  leadId: lead.id,
  leadName: lead.name
});
```

### React Web

```typescript
import { VideoMeetingsPage } from './pages/VideoMeetingsPage';

// Add to router
<Route path="/video-meetings" component={VideoMeetingsPage} />
```

---

## 🤖 AI Analysis

AI analysis runs automatically after transcript is available:

```python
# Analyzes:
# - Key Topics: Main discussion points
# - Action Items: What needs to be done next
# - Sentiment: positive/neutral/negative
# - Summary: 2-3 sentence overview

# Results saved to:
meeting.ai_summary
meeting.key_topics = ["Pricing", "Timeline", "Features"]
meeting.action_items = ["Send proposal", "Schedule follow-up"]
meeting.sentiment_analysis = {"overall": "positive"}
```

---

## 🚀 Production Deployment

### 1. Secure Webhooks

Use ngrok for local testing:

```bash
ngrok http 8000
# Use ngrok URL as webhook endpoint
```

For production, ensure:
- HTTPS enabled
- Webhook signature verification enabled
- Rate limiting configured

### 2. Background Jobs

Use Celery or similar for processing:

```python
# Instead of BackgroundTasks, use Celery
from celery import Celery

celery = Celery('video_tasks')

@celery.task
def process_recording(meeting_id: str):
    await video_service.get_zoom_recording(meeting_id)
```

### 3. Storage

Store recordings in:
- AWS S3
- Google Cloud Storage
- Or keep Zoom/Teams cloud storage links

---

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] Zoom app created and webhooks enabled
- [ ] Microsoft Teams app registered
- [ ] Google Cloud project created
- [ ] Database tables created
- [ ] Routes registered in main.py
- [ ] Frontend screens implemented
- [ ] OAuth flows tested
- [ ] Webhooks tested
- [ ] AI analysis tested

---

## 🎉 Done!

Your video conferencing integration is complete! 🚀

Users can now:
- Schedule Zoom/Teams/Meet meetings from the app
- Auto-receive recordings after meetings
- Get AI-powered analysis with topics, actions, sentiment
- View all meetings in one place

