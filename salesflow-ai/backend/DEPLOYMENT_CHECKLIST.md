# ✅ Railway Deployment Checklist

## 📋 Pre-Deployment

### Code-Bereitschaft
- [x] `railway.toml` erstellt
- [x] `Procfile` erstellt (Backup)
- [x] `requirements.txt` vollständig (inkl. `pydantic-settings`)
- [x] `/health` Endpoint existiert
- [x] `.gitignore` vorhanden
- [ ] Tests laufen durch: `pytest backend/tests/`

### Konfiguration
- [ ] Supabase Projekt erstellt
- [ ] Supabase Service Role Key notiert
- [ ] OpenAI API Key bereit
- [ ] Frontend Domain bekannt (für CORS)

## 🚀 Deployment

### Railway Setup
- [ ] Railway Account erstellt
- [ ] GitHub Repository verknüpft
- [ ] Root Directory auf `/backend` gesetzt
- [ ] Deployment gestartet

### Environment Variables (Railway Dashboard)
```
- [ ] OPENAI_API_KEY=sk-proj-...
- [ ] SUPABASE_URL=https://xxxxx.supabase.co
- [ ] SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
- [ ] OPENAI_MODEL=gpt-4o-mini
```

## ✅ Post-Deployment Tests

### Basic Health
```bash
- [ ] curl https://your-app.railway.app/health
      Erwartung: {"status":"healthy"}

- [ ] curl https://your-app.railway.app/
      Erwartung: {"status":"ok","app":"SalesFlow AI"}

- [ ] Browser: https://your-app.railway.app/docs
      Erwartung: Swagger UI lädt
```

### API Endpoints
```bash
- [ ] GET /api/leads
- [ ] POST /api/chat
- [ ] GET /api/analytics
- [ ] POST /api/copilot/suggest
```

## 🔐 Security Check

### Kritische Punkte
- [ ] **CORS Produktion:** Ändere in `app/main.py`:
  ```python
  allow_origins=[
      "https://your-frontend-domain.com",
      "https://your-production-domain.com"
  ]
  # NICHT: allow_origins=["*"] ❌
  ```

- [ ] **Environment Variables:** Keine Secrets im Code!
- [ ] **Supabase RLS:** Row Level Security aktiviert
- [ ] **API Keys:** Nur Service Role Key, nicht anon key!

### Optional aber empfohlen
- [ ] Rate Limiting implementieren
- [ ] Request Logging aktivieren
- [ ] Error Tracking (z.B. Sentry)
- [ ] Monitoring Setup (Railway Metrics)

## 🌐 Frontend Integration

### Environment Variables (Frontend .env)
```env
- [ ] VITE_API_URL=https://your-app.railway.app
- [ ] VITE_SUPABASE_URL=https://xxxxx.supabase.co
- [ ] VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Test Frontend → Backend
```javascript
- [ ] API Call funktioniert
- [ ] CORS Errors gelöst
- [ ] Auth Flow funktioniert
- [ ] WebSocket Verbindung (falls vorhanden)
```

## 📊 Monitoring Setup

### Railway Dashboard
- [ ] Logs gecheckt: `railway logs`
- [ ] Metrics angeschaut (CPU, Memory)
- [ ] Deployment History überprüft
- [ ] Custom Domain verbunden (Optional)

### Alerts (Empfohlen)
- [ ] Railway Webhook für Deployment-Fehler
- [ ] Health Check Monitoring (z.B. UptimeRobot)
- [ ] Error Rate Alerts

## 🎯 Performance

### Optimierungen
- [ ] Railway Pro Tier erwägen (bessere Performance)
- [ ] Redis für Caching (Railway Plugin)
- [ ] Database Connection Pooling
- [ ] Async Endpoints nutzen (FastAPI)

### Load Testing (Optional)
```bash
- [ ] Apache Bench: ab -n 1000 -c 10 https://your-app.railway.app/health
- [ ] Artillery oder k6 für komplexere Tests
```

## 📝 Dokumentation

### Für Team
- [ ] API URL geteilt
- [ ] Environment Variables dokumentiert
- [ ] Deployment-Prozess erklärt
- [ ] Troubleshooting Guide erstellt

### Für Kunden/Stakeholder
- [ ] API Dokumentation: https://your-app.railway.app/docs
- [ ] Status Page (Optional)
- [ ] Support-Kontakt bereitgestellt

## 🐛 Troubleshooting Log

Falls Probleme auftreten, dokumentiere hier:

```
Problem: _______________
Logs: _______________
Solution: _______________
Timestamp: _______________
```

## ✨ Success Criteria

Deployment ist erfolgreich wenn:
- ✅ Health Check gibt 200 zurück
- ✅ API Docs erreichbar unter /docs
- ✅ Alle kritischen Endpoints funktionieren
- ✅ Frontend kann Backend erreichen
- ✅ Keine 500 Errors in Logs
- ✅ Response Time < 500ms (für /health)

## 🎉 Deployment Abgeschlossen!

**API URL:** `___________________________`

**Deployed am:** `___________________________`

**Deployed von:** `___________________________`

**Railway Project:** `___________________________`

---

### Nächste Steps:
1. [ ] Frontend deployen (Netlify/Vercel)
2. [ ] DNS/Domain konfigurieren
3. [ ] SSL/HTTPS verifizieren (Railway macht automatisch)
4. [ ] Team informieren
5. [ ] Monitoring für 24h beobachten

**Geschätzte Total-Zeit:** 30-45 Minuten (First-Time) | 10-15 Minuten (Routine)

