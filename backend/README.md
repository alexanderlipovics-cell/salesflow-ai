# 🚀 SalesFlow AI - Backend API

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

[![Railway Deploy](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)](https://github.com)

**KI-gestützter Sales Copilot für Network Marketing**

[Features](#-features) •
[Quick Start](#-quick-start) •
[API Docs](#-api-dokumentation) •
[Deployment](#-deployment) •
[Contributing](#-contributing)

</div>

---

## 📖 Über das Projekt

SalesFlow AI ist ein intelligentes Backend-System für Network Marketing Professionals. Es bietet:

- 🤖 **AI Copilot** - Intelligente Gesprächsführung mit GPT-4
- 💬 **Chat System** - Echtzeit-Messaging mit KI-Unterstützung
- 📊 **Analytics** - Umfassende Performance-Metriken
- 🎯 **Lead Management** - Automatisierte Lead-Qualifizierung
- 🚀 **Autopilot** - Automatische Follow-up Sequenzen
- 🧠 **Collective Intelligence** - Lernendes System über alle User
- 📈 **Lead Generation** - KI-gestützte Leadgewinnung

---

## 🛠️ Tech Stack

| Technologie | Version | Verwendung |
|-------------|---------|------------|
| FastAPI | 0.115.0 | Web Framework |
| Python | 3.11+ | Backend Language |
| Pydantic | 2.9.2 | Data Validation |
| Supabase | 2.6.0 | Database & Auth |
| OpenAI | 1.52.2 | GPT-4 Integration |
| Anthropic | 0.18.0+ | Claude Integration |
| Uvicorn | 0.30.6 | ASGI Server |

---

## ⚡ Quick Start

### Voraussetzungen

```bash
- Python 3.11+
- OpenAI API Key
- Supabase Account
```

### 1. Repository klonen

```bash
git clone https://github.com/your-username/salesflow-ai.git
cd salesflow-ai/backend
```

### 2. Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Dependencies installieren

```bash
pip install -r requirements.txt
```

### 4. Environment Variables

```bash
# .env erstellen
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_MODEL=gpt-4o-mini
```

### 5. Server starten

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend läuft auf: **http://localhost:8000**

---

## 📚 API Dokumentation

### Interactive API Docs

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Hauptendpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/api/leads` | GET, POST | Lead Management |
| `/api/copilot/suggest` | POST | KI Suggestions |
| `/api/chat/messages` | GET, POST | Chat System |
| `/api/autopilot/sequences` | GET, POST | Autopilot Sequenzen |
| `/api/analytics/dashboard` | GET | Analytics Dashboard |
| `/api/collective-intelligence` | GET, POST | CI System |
| `/api/lead-generation` | POST | Lead Gen System |

### Beispiel Request

```bash
curl -X POST "http://localhost:8000/api/copilot/suggest" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_name": "Max Mustermann",
    "context": "Erstes Gespräch",
    "situation": "Interesse an Produkten"
  }'
```

### Beispiel Response

```json
{
  "suggestions": [
    "Frage nach aktuellen Gesundheitszielen",
    "Erwähne Success Stories",
    "Biete kostenlose Beratung an"
  ],
  "confidence": 0.92,
  "reasoning": "Basierend auf Gesprächskontext..."
}
```

---

## 🚀 Deployment

### Railway (Empfohlen)

```bash
# 1. Railway CLI installieren
npm i -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway up
```

**Ausführliche Anleitungen:**
- [Quick Start (3 Min)](RAILWAY_QUICKSTART.md)
- [Deployment Guide](RAILWAY_DEPLOYMENT.md)
- [Checkliste](DEPLOYMENT_CHECKLIST.md)

### Alternative Plattformen

- **Heroku:** Procfile bereits vorhanden
- **AWS ECS:** Docker Support geplant
- **Google Cloud Run:** In Vorbereitung

---

## 🏗️ Projektstruktur

```
backend/
├── app/
│   ├── main.py                    # FastAPI App Entry
│   ├── config.py                  # Configuration
│   ├── routers/                   # API Endpoints
│   │   ├── leads.py               # Lead Management
│   │   ├── copilot.py             # AI Copilot
│   │   ├── chat.py                # Chat System
│   │   ├── autopilot.py           # Autopilot
│   │   ├── analytics.py           # Analytics
│   │   └── ...
│   ├── schemas/                   # Pydantic Models
│   ├── services/                  # Business Logic
│   └── db/                        # Database
├── tests/                         # Tests
├── requirements.txt               # Python Dependencies
├── railway.toml                   # Railway Config
└── Procfile                       # Heroku Config
```

---

## 🧪 Testing

```bash
# Alle Tests ausführen
pytest

# Mit Coverage
pytest --cov=app tests/

# Spezifische Tests
pytest tests/test_leads.py
```

---

## 🔐 Security

### Wichtige Security Features

- ✅ Environment Variable Management
- ✅ Pydantic Input Validation
- ✅ Supabase Row Level Security
- ⚠️ CORS Configuration (siehe [SECURITY_AUDIT.md](SECURITY_AUDIT.md))
- 📋 Rate Limiting (in Planung)
- 📋 API Authentication (in Entwicklung)

**Vollständiger Security Audit:** [SECURITY_AUDIT.md](SECURITY_AUDIT.md)

---

## 📊 Features im Detail

### 🤖 AI Copilot
- Echtzeit-Suggestions während Gesprächen
- Kontext-bewusstes Coaching
- Multi-Model Support (GPT-4, Claude)

### 💬 Chat System
- Persistent Message History
- KI-gestützte Antworten
- Multi-Channel Support

### 📈 Analytics
- Real-time Dashboards
- Performance Tracking
- Predictive Insights

### 🎯 Autopilot
- Automatische Follow-ups
- Smart Scheduling
- A/B Testing

### 🧠 Collective Intelligence
- System lernt von allen Users
- Best Practice Sharing
- Adaptive Suggestions

---

## 🗺️ Roadmap

### Q1 2025
- [x] Core API Development
- [x] Railway Deployment
- [ ] JWT Authentication
- [ ] Rate Limiting

### Q2 2025
- [ ] WebSocket Support
- [ ] Real-time Notifications
- [ ] Advanced Analytics
- [ ] Mobile SDK

### Q3 2025
- [ ] Multi-Language Support
- [ ] WhatsApp Integration
- [ ] Voice AI Assistant
- [ ] Enterprise Features

---

## 🤝 Contributing

Wir freuen uns über Contributions!

```bash
# 1. Fork das Projekt
# 2. Feature Branch erstellen
git checkout -b feature/AmazingFeature

# 3. Changes committen
git commit -m 'Add some AmazingFeature'

# 4. Push zum Branch
git push origin feature/AmazingFeature

# 5. Pull Request öffnen
```

**Bitte beachte:** [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon)

---

## 📝 Changelog

### Version 1.0.0 (Dec 2025)
- ✨ Initial Release
- 🚀 Railway Deployment Support
- 🤖 AI Copilot Integration
- 📊 Analytics Dashboard
- 💬 Chat System

Vollständiger Changelog: [CHANGELOG.md](CHANGELOG.md) (coming soon)

---

## 📄 License

Dieses Projekt ist lizenziert unter der MIT License - siehe [LICENSE](LICENSE) für Details.

---

## 👥 Team

- **Backend Lead:** [Dein Name]
- **AI Integration:** [Name]
- **DevOps:** [Name]

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Excellent Web Framework
- [Supabase](https://supabase.com/) - Amazing Backend-as-a-Service
- [OpenAI](https://openai.com/) - Powerful AI Models
- [Railway](https://railway.app/) - Seamless Deployment

---

## 📞 Support

- 📧 Email: support@alsales.ai
- 💬 Discord: [Join our community](https://discord.gg/your-server)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/salesflow-ai/issues)
- 📖 Docs: [Full Documentation](https://docs.salesflow-ai.com)

---

## 🌟 Star History

Wenn dir dieses Projekt gefällt, gib uns einen ⭐ auf GitHub!

---

<div align="center">

**Made with ❤️ by the SalesFlow AI Team**

[Website](https://salesflow-ai.com) •
[Documentation](https://docs.salesflow-ai.com) •
[Blog](https://blog.salesflow-ai.com)

</div>

