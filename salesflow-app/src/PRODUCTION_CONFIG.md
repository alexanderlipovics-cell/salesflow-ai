# Production Configuration Guide

## ═══════════════════════════════════════════════════════════════════════════
## RENDER PRODUCTION CONFIGURATION
## ═══════════════════════════════════════════════════════════════════════════

### 1. Environment Variables in Render

Gehe zu deinem Render Dashboard → Service → Environment und setze folgende Variablen:

```bash
# Environment
ENVIRONMENT=production
DEBUG=False

# URLs
API_URL=https://api.fello.app
FRONTEND_URL=https://fello.app

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Payment (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Security
SECRET_KEY=your_generated_secret_key  # Generiere mit: openssl rand -base64 32
CORS_ORIGINS=https://fello.app,https://www.fello.app,https://api.fello.app

# Logging & Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn  # Optional für Error Tracking
SENTRY_ENVIRONMENT=production
LOG_LEVEL=INFO
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=100
```

### 2. Render Service Configuration

#### Build Command:
```bash
pip install -r requirements.txt
```

#### Start Command:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT
```

#### Health Check Path:
```
/health
```

#### Health Check Interval:
```
30 seconds
```

### 3. Custom Domain Setup

1. Gehe zu Render Dashboard → Service → Settings → Custom Domains
2. Füge deine Domain hinzu: `api.fello.app`
3. Render zeigt dir die DNS-Einträge an
4. Folge den DNS-Setup-Anweisungen unten

### 4. SSL Certificate

Render stellt automatisch SSL-Zertifikate über Let's Encrypt bereit:
- SSL wird automatisch aktiviert, sobald die DNS-Einträge korrekt sind
- Erneuerung erfolgt automatisch

---

## ═══════════════════════════════════════════════════════════════════════════
## DNS SETUP ANLEITUNG
## ═══════════════════════════════════════════════════════════════════════════

### Schritt 1: Render IP-Adresse ermitteln

1. Gehe zu Render Dashboard → Service → Settings → Custom Domains
2. Notiere dir die angezeigte IP-Adresse (z.B. `123.45.67.89`)

### Schritt 2: DNS-Einträge bei deinem Domain-Provider

Gehe zu deinem Domain-Provider (z.B. Namecheap, GoDaddy, Cloudflare) und erstelle folgende Einträge:

#### A Record für API-Subdomain:
```
Type: A
Name: api
Value: [Render IP-Adresse]
TTL: 3600 (oder Auto)
```

#### A Record für Root-Domain (optional):
```
Type: A
Name: @
Value: [Render IP-Adresse]
TTL: 3600
```

#### CNAME für www-Subdomain:
```
Type: CNAME
Name: www
Value: fello.app
TTL: 3600
```

### Schritt 3: DNS-Propagierung prüfen

Nach dem Setzen der DNS-Einträge kann die Propagierung 5 Minuten bis 48 Stunden dauern.

Prüfe mit:
```bash
# Prüfe A Record
dig api.fello.app +short

# Prüfe CNAME
dig www.fello.app +short
```

### Schritt 4: SSL aktivieren

1. Warte bis DNS propagiert ist (ca. 5-30 Minuten)
2. Render erkennt automatisch die Domain
3. SSL-Zertifikat wird automatisch ausgestellt (Let's Encrypt)
4. Status in Render Dashboard prüfen: Settings → Custom Domains → SSL Status

---

## ═══════════════════════════════════════════════════════════════════════════
## PRODUCTION CHECKLIST
## ═══════════════════════════════════════════════════════════════════════════

### Backend (API)

- [ ] Environment Variables in Render gesetzt
- [ ] SECRET_KEY generiert und gesetzt
- [ ] CORS_ORIGINS auf Production URLs beschränkt
- [ ] Supabase Credentials gesetzt
- [ ] OpenAI/Anthropic API Keys gesetzt
- [ ] Stripe Keys gesetzt
- [ ] Custom Domain konfiguriert (api.fello.app)
- [ ] DNS-Einträge gesetzt
- [ ] SSL aktiviert
- [ ] Health Check konfiguriert (/health)
- [ ] Logging auf INFO/JSON gesetzt
- [ ] Rate Limiting aktiviert
- [ ] Security Headers aktiviert

### Frontend

- [ ] API_URL auf https://api.fello.app gesetzt
- [ ] Production Build erstellt
- [ ] Environment Variables gesetzt
- [ ] Legal Pages (Impressum, Datenschutz, AGB) erstellt
- [ ] Footer Links funktional

### Monitoring & Security

- [ ] Sentry DSN gesetzt (optional)
- [ ] Error Tracking aktiviert
- [ ] Logs werden gesammelt
- [ ] Backup-Strategie definiert
- [ ] Security Headers getestet

### Testing

- [ ] API Health Check funktioniert
- [ ] CORS funktioniert mit Frontend
- [ ] SSL-Zertifikat gültig
- [ ] Alle Endpoints erreichbar
- [ ] Rate Limiting funktioniert

---

## ═══════════════════════════════════════════════════════════════════════════
## TROUBLESHOOTING
## ═══════════════════════════════════════════════════════════════════════════

### Problem: DNS löst nicht auf

**Lösung:**
1. Prüfe DNS-Einträge mit `dig` oder `nslookup`
2. Warte auf DNS-Propagierung (kann bis zu 48h dauern)
3. Prüfe TTL-Werte (niedrigere TTL = schnellere Updates)

### Problem: SSL-Zertifikat wird nicht ausgestellt

**Lösung:**
1. Warte bis DNS vollständig propagiert ist
2. Prüfe ob Port 80 und 443 erreichbar sind
3. Kontaktiere Render Support falls Problem weiterhin besteht

### Problem: CORS-Fehler

**Lösung:**
1. Prüfe CORS_ORIGINS in Environment Variables
2. Stelle sicher, dass Frontend-URL in CORS_ORIGINS enthalten ist
3. Prüfe Backend-Logs für CORS-Fehler

### Problem: Health Check schlägt fehl

**Lösung:**
1. Prüfe ob `/health` Endpoint erreichbar ist
2. Prüfe Backend-Logs für Fehler
3. Stelle sicher, dass Database-Verbindung funktioniert

---

## ═══════════════════════════════════════════════════════════════════════════
## PRODUCTION COMMANDS
## ═══════════════════════════════════════════════════════════════════════════

### Secret Key generieren:
```bash
openssl rand -base64 32
```

### Health Check testen:
```bash
curl https://api.fello.app/health
```

### Readiness Check testen:
```bash
curl https://api.fello.app/health/ready
```

### API Status prüfen:
```bash
curl https://api.fello.app/
```

---

## ═══════════════════════════════════════════════════════════════════════════
## RENDER SPECIFIC NOTES
## ═══════════════════════════════════════════════════════════════════════════

### Auto-Deploy

Render deployt automatisch bei Git-Push:
- Main Branch → Production
- Feature Branches → Preview Deployments

### Scaling

Render unterstützt Auto-Scaling:
- Min Instances: 1
- Max Instances: 10 (je nach Plan)
- CPU/Memory Thresholds konfigurierbar

### Logs

Logs sind in Render Dashboard verfügbar:
- Real-time Logs
- Log Retention: 7 Tage (Free Plan), 30 Tage (Paid Plans)
- Export möglich

### Backups

Supabase Database Backups:
- Automatische tägliche Backups
- Point-in-time Recovery verfügbar

---

**Stand: 2024**

