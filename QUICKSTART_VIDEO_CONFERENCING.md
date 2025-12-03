# 🎥 Video Conferencing - Quick Start

Schnellstart-Anleitung für die Video Conferencing Integration.

---

## ⚡ 5-Minuten Setup

### 1. Environment Variables

```bash
cd backend
cp .env.video-conferencing.example .env
```

Füge mindestens hinzu:
```env
OPENAI_API_KEY=sk-...
```

Für vollständige Integration (später):
```env
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
# etc.
```

### 2. Database Migration

```bash
cd backend
psql -U postgres -d salesflow < db/migrations/video_meetings_schema.sql
```

Oder wenn du Alembic verwendest:
```bash
alembic upgrade head
```

### 3. Backend starten

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Test API

```bash
chmod +x backend/test_video_api.sh
./backend/test_video_api.sh
```

Oder manuell:
```bash
curl -X POST http://localhost:8000/api/video-meetings/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zoom",
    "title": "Test Call",
    "start_time": "2024-12-15T15:00:00Z",
    "duration_minutes": 60
  }'
```

---

## 🎯 Core Features Testen

### 1. Meeting erstellen (Mock Mode)

Ohne OAuth kannst du Meetings im "Mock Mode" erstellen:

```bash
# Backend API aufrufen
curl -X POST http://localhost:8000/api/video-meetings/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zoom",
    "title": "Demo Sales Call",
    "start_time": "2024-12-20T10:00:00Z",
    "duration_minutes": 60
  }'
```

**Response:**
```json
{
  "meeting_id": "abc-123-xyz",
  "join_url": "https://zoom.us/j/123456789",
  "platform": "zoom"
}
```

### 2. Meetings auflisten

```bash
# Upcoming meetings
curl http://localhost:8000/api/video-meetings/meetings?upcoming=true

# Past meetings
curl http://localhost:8000/api/video-meetings/meetings?upcoming=false
```

### 3. AI Analysis Test

```bash
# 1. Create meeting with mock transcript
# 2. Trigger analysis
curl -X POST http://localhost:8000/api/video-meetings/meetings/{id}/analyze

# 3. Check results
curl http://localhost:8000/api/video-meetings/meetings/{id}
```

---

## 🔗 OAuth Setup (Production)

### Zoom

1. **Create App**: https://marketplace.zoom.us/develop/create
2. **App Type**: OAuth
3. **Redirect URL**: `http://localhost:8000/api/integrations/zoom/callback`
4. **Scopes**: 
   - `meeting:write`
   - `meeting:read`
   - `recording:read`

5. **Add to .env**:
```env
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_secret
ZOOM_REDIRECT_URI=http://localhost:8000/api/integrations/zoom/callback
```

6. **Test OAuth Flow**:
```bash
# Open in browser:
http://localhost:8000/api/integrations/zoom/authorize
```

### Microsoft Teams

1. **Register App**: https://portal.azure.com/ → App registrations
2. **Redirect URI**: `http://localhost:8000/api/integrations/teams/callback`
3. **API Permissions**:
   - `Calendars.ReadWrite`
   - `OnlineMeetings.ReadWrite`
   - `User.Read`

4. **Add to .env**:
```env
MICROSOFT_CLIENT_ID=your_app_id
MICROSOFT_CLIENT_SECRET=your_secret
MICROSOFT_TENANT_ID=common
```

### Google Meet

1. **Create Project**: https://console.cloud.google.com/
2. **Enable APIs**: Calendar API
3. **OAuth Consent Screen**: External
4. **Credentials**: OAuth 2.0 Client ID
5. **Redirect URI**: `http://localhost:8000/api/integrations/google/callback`

6. **Add to .env**:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
```

---

## 📱 Frontend Integration

### React Native (Mobile)

```typescript
// 1. Add to navigation
import ScheduleMeetingScreen from './screens/ScheduleMeetingScreen';

// 2. Navigate from lead detail
navigation.navigate('ScheduleMeeting', {
  leadId: lead.id,
  leadName: lead.name
});
```

### React Web

```typescript
// 1. Add to router
import VideoMeetingsPage from './pages/VideoMeetingsPage';

<Route path="/video-meetings" element={<VideoMeetingsPage />} />

// 2. Add to sidebar navigation
<Link to="/video-meetings">🎥 Meetings</Link>
```

---

## 🧪 Webhook Testing (Ngrok)

### Setup Ngrok

```bash
# Install ngrok
brew install ngrok  # Mac
# or download from https://ngrok.com/

# Start tunnel
ngrok http 8000
```

### Configure Webhook in Zoom

1. Go to your Zoom App → Features → Event Subscriptions
2. Add Event notification endpoint: `https://your-ngrok-url.ngrok.io/api/webhooks/zoom`
3. Subscribe to events:
   - `recording.completed`
   - `meeting.started`
   - `meeting.ended`

### Test Webhook

```bash
# 1. Start a real Zoom meeting (with cloud recording enabled)
# 2. End the meeting
# 3. Wait for recording to process (~5 minutes)
# 4. Check backend logs for webhook received
# 5. Check database for recording URL and AI analysis
```

---

## 📊 Database Queries

### Check meetings

```sql
-- All meetings
SELECT id, title, platform, status, scheduled_start 
FROM video_meetings 
ORDER BY scheduled_start DESC;

-- Meetings with recordings
SELECT id, title, has_recording, has_transcript, ai_summary
FROM video_meetings
WHERE has_recording = TRUE;

-- Meetings with AI analysis
SELECT id, title, key_topics, action_items, sentiment_analysis
FROM video_meetings
WHERE ai_summary IS NOT NULL;
```

### Check integrations

```sql
-- Connected platforms
SELECT user_id, platform, platform_email, is_active, connected_at
FROM video_integrations
ORDER BY connected_at DESC;
```

---

## 🐛 Troubleshooting

### "Platform not connected" Error

**Problem**: User hasn't connected Zoom/Teams/Google yet

**Solution**:
1. User muss OAuth Flow durchlaufen
2. Browser öffnen: `http://localhost:8000/api/integrations/zoom/authorize`
3. Bei Zoom einloggen und genehmigen
4. User wird zurück geleitet
5. Token in `video_integrations` Tabelle gespeichert

### "Recording not found" Error

**Problem**: Recording noch nicht verfügbar

**Mögliche Ursachen**:
1. Meeting noch nicht beendet
2. Recording wird noch von Zoom verarbeitet (kann 5-10 Min dauern)
3. Cloud Recording nicht aktiviert
4. Webhook nicht konfiguriert

**Lösung**:
1. Warte bis Meeting endet
2. Warte zusätzliche 5-10 Min für Processing
3. Check Zoom Meeting Settings: "Cloud Recording" enabled
4. Manuell fetchen: `POST /api/video-meetings/meetings/{id}/fetch-recording`

### AI Analysis failed

**Problem**: Transcript vorhanden, aber keine AI-Analyse

**Debug**:
```sql
SELECT 
    m.id, 
    m.title,
    m.has_transcript,
    t.is_processed,
    t.processing_error
FROM video_meetings m
LEFT JOIN meeting_transcripts t ON m.id = t.meeting_id
WHERE m.has_transcript = TRUE;
```

**Mögliche Ursachen**:
1. OpenAI API Key fehlt oder ungültig
2. Transcript zu lang (>8000 tokens)
3. OpenAI Rate Limit

**Lösung**:
1. Check `.env`: `OPENAI_API_KEY=sk-...`
2. Check `processing_error` in DB
3. Manuell re-triggern: `POST /api/video-meetings/meetings/{id}/analyze`

---

## 📈 Next Steps

### 1. Production Deployment

```bash
# 1. Update environment variables
ZOOM_REDIRECT_URI=https://yourdomain.com/api/integrations/zoom/callback
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/integrations/teams/callback
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/integrations/google/callback

# 2. Update redirect URIs in platform developer consoles

# 3. Enable HTTPS

# 4. Configure webhooks with production URLs
```

### 2. Frontend Polish

- [ ] Add loading skeletons
- [ ] Add error boundaries
- [ ] Add success/error toasts
- [ ] Add meeting calendar view
- [ ] Add search/filter

### 3. Advanced Features

- [ ] Calendar sync
- [ ] Email reminders
- [ ] Meeting templates
- [ ] Team dashboard
- [ ] Analytics

---

## 🎉 Success!

Du hast jetzt:
- ✅ Video Meeting Integration
- ✅ Auto-Recording Fetch
- ✅ AI Analysis Pipeline
- ✅ Beautiful Frontend

**Ready to rock! 🚀**

---

## 📚 Documentation

- **Full Setup**: `backend/VIDEO_CONFERENCING_SETUP.md`
- **Complete Overview**: `VIDEO_CONFERENCING_COMPLETE.md`
- **API Docs**: `http://localhost:8000/docs`
- **Database Schema**: `backend/db/migrations/video_meetings_schema.sql`

