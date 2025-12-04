# 🔔 Signal API Configuration Guide

## Übersicht

Der Reactivation Agent nutzt externe Signal-Quellen, um relevante Trigger für Lead-Reaktivierung zu erkennen. Diese APIs sind **optional** - der Agent funktioniert auch ohne, sammelt dann aber weniger Signale.

---

## 📡 Verfügbare Signal-Quellen

### 1. Google News API ⭐ (Empfohlen)

**Was:** Erkennt Unternehmensnachrichten (Funding, Expansion, neue Produkte)

**Setup:**
1. Gehe zu: https://developers.google.com/custom-search/v1/overview
2. Erstelle ein Custom Search Engine
3. Aktiviere die Custom Search JSON API
4. Kopiere den API Key

**ENV Variable:**
```bash
GOOGLE_NEWS_API_KEY=your_api_key_here
```

**Alternative:** SerpAPI (einfacher, kostenpflichtig)
```bash
SERP_API_KEY=your_serp_api_key
```

---

### 2. NewsAPI.org (Alternative zu Google News)

**Was:** Kostenlose News API für Unternehmensnachrichten

**Setup:**
1. Registriere dich: https://newsapi.org/
2. Erhalte kostenlosen API Key (100 Requests/Tag)

**ENV Variable:**
```bash
NEWS_API_KEY=your_newsapi_key
```

---

### 3. LinkedIn API (Optional)

**Was:** Job Changes des Ansprechpartners erkennen

**Setup:**
1. Erstelle LinkedIn App: https://www.linkedin.com/developers/apps
2. Request "Marketing Developer Platform" Access
3. Erstelle OAuth Credentials

**ENV Variables:**
```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

**⚠️ Hinweis:** LinkedIn API ist restriktiv. Alternative: Proxycurl API (kostenpflichtig)

---

### 4. Website Change Detection (Optional)

**Was:** Änderungen auf Unternehmenswebsites erkennen

**Setup:**
- Automatisch via Cron Job
- Nutzt Website Change Detection Service (z.B. ChangeDetection.io API)

**ENV Variable:**
```bash
WEBSITE_MONITOR_API_KEY=your_api_key
```

---

### 5. Intent Tracking (Bereits vorhanden)

**Was:** Pricing Page Visits, Demo Requests

**Status:** ✅ Bereits implementiert via Tracking Pixel Events

---

## 🔧 Konfiguration in .env

Füge diese Variablen zu deiner `.env` Datei hinzu:

```bash
# Signal APIs (optional)
GOOGLE_NEWS_API_KEY=your_google_news_api_key
# ODER
SERP_API_KEY=your_serp_api_key
# ODER
NEWS_API_KEY=your_newsapi_key

# LinkedIn (optional)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Website Monitor (optional)
WEBSITE_MONITOR_API_KEY=your_website_monitor_key
```

---

## 💡 Empfehlung

**Minimum Setup (funktioniert sofort):**
- Keine APIs erforderlich! Der Agent nutzt:
  - Intent Tracking (Pricing Page Visits)
  - Interaktionshistorie (RAG Memory)
  - Lead-Kontext

**Empfohlenes Setup:**
- **Google News API** oder **NewsAPI.org** → Für Unternehmensnachrichten
- (LinkedIn optional für Job Changes)

**Premium Setup:**
- Alle APIs aktiviert → Maximale Signal-Abdeckung

---

## 🧪 Testen

Nach der Konfiguration:

```python
# Test Signal Detection
from app.services.signals.google_news import GoogleNewsService

news = GoogleNewsService()
articles = await news.search_funding("Zinzino")
print(f"Found {len(articles)} funding news")
```

---

## 📊 Signal-Priorität

1. **Intent** (90% Relevanz) - Pricing Page Visit
2. **Funding** (90% Relevanz) - Investment Runde
3. **Job Change** (85% Relevanz) - Ansprechpartner gewechselt
4. **News** (60% Relevanz) - Generelle Unternehmensnachricht
5. **Website Change** (70% Relevanz) - Website-Updates

---

## 🔐 Sicherheit

- **Niemals** API Keys in Git committen
- Nutze `.env` Datei (in `.gitignore`)
- Rotiere Keys regelmäßig
- Rate Limits beachten

---

*Erstellt für SALES FLOW AI - Reactivation Agent*

