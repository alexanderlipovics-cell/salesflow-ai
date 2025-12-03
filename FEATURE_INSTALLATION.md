# 🎯 Sales Flow AI - Feature Installation Quick Start

## ⚡ 3-Schritte Installation

Alle drei Features (Email, Import/Export, Gamification) in unter 5 Minuten aktivieren!

---

## 🚀 SCHRITT 1: Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Was wird installiert:**
- Gmail & Outlook Integration
- Excel Import/Export
- OpenAI für AI Field Mapping

---

## 🗄️ SCHRITT 2: Datenbank

```bash
# PostgreSQL
psql -U your_user -d salesflow_db -f backend/database/DEPLOY_ALL_FEATURES.sql

# Oder via Supabase SQL Editor:
# Kopiere Inhalt von DEPLOY_ALL_FEATURES.sql und führe aus
```

**Was wird erstellt:**
- 15+ neue Tabellen
- Email-Integration
- Import/Export Jobs
- Gamification (Badges, Streaks, Leaderboards)

---

## ⚙️ SCHRITT 3: Environment Variables

```bash
# Kopiere Template
cp backend/.env.features.template backend/.env.features

# Editiere .env.features und füge hinzu zu .env:
cat backend/.env.features >> backend/.env
```

**Minimale Config (für Dev):**

```bash
# OpenAI für AI Field Mapping
OPENAI_API_KEY="sk-..."

# Gmail (optional für Dev)
GMAIL_CLIENT_ID="optional"
GMAIL_CLIENT_SECRET="optional"

# Outlook (optional für Dev)
OUTLOOK_CLIENT_ID="optional"
OUTLOOK_CLIENT_SECRET="optional"
```

---

## 🔌 SCHRITT 4: Routes registrieren

**`backend/app/main.py`**

```python
# Add imports
from app.routers import email, import_export, gamification

# Register routes
app.include_router(email.router)
app.include_router(import_export.router)
app.include_router(gamification.router)
```

---

## 🧪 SCHRITT 5: Testen

```bash
# Server starten
cd backend
uvicorn app.main:app --reload

# API Docs öffnen
open http://localhost:8000/docs

# Teste Gamification (funktioniert ohne OAuth)
curl http://localhost:8000/api/gamification/badges

# Teste Import/Export (funktioniert mit OpenAI Key)
curl -X POST http://localhost:8000/api/import-export/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.csv"
```

---

## 📱 FRONTEND

**Screens sind fertig! Nur Navigation hinzufügen:**

```typescript
// sales-flow-ai/App.tsx
import EmailScreen from './screens/EmailScreen';
import AchievementsScreen from './screens/AchievementsScreen';

// Add to Navigator
<Stack.Screen name="Email" component={EmailScreen} />
<Stack.Screen name="Achievements" component={AchievementsScreen} />
```

---

## 🎉 FERTIG!

### Was funktioniert JETZT:

✅ **Gamification** - Badges, Streaks, Leaderboards  
✅ **Import/Export** - CSV mit AI Mapping, Excel/JSON Export  
⏸️ **Email** - Benötigt OAuth Setup (siehe unten)

---

## 🔑 Email OAuth Setup (Optional)

### Gmail

1. [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. Credentials → OAuth 2.0 Client ID
4. Redirect URI: `http://localhost:8000/api/email/callback/gmail`
5. Copy Client ID & Secret to `.env`

### Outlook

1. [Azure Portal](https://portal.azure.com/)
2. App registrations → New registration
3. Add redirect URI: `http://localhost:8000/api/email/callback/outlook`
4. API permissions: `Mail.ReadWrite`, `Mail.Send`
5. Copy Client ID & Secret to `.env`

---

## 📚 Dokumentation

**Vollständige Anleitung:**
- `backend/FEATURE_DEPLOYMENT_GUIDE.md`

**API Docs:**
- http://localhost:8000/docs

**Code:**
- Backend: `backend/app/routers/` & `backend/app/services/`
- Frontend: `sales-flow-ai/screens/`
- Database: `backend/database/migrations/`

---

## 🆘 Hilfe benötigt?

**Häufige Probleme:**

1. **Import fails** → OpenAI Key fehlt oder falsch
2. **OAuth Error** → Redirect URI muss exakt matchen
3. **Database Error** → Migration nicht ausgeführt

**Support:**
- Siehe `backend/FEATURE_DEPLOYMENT_GUIDE.md` → Troubleshooting
- API Docs: http://localhost:8000/docs
- GitHub Issues

---

## 🎯 Next Steps

1. **Production Setup:**
   - OAuth Credentials für Production Domain
   - S3 für File Storage
   - Background Workers für Email Sync

2. **Testing:**
   - Teste alle Endpoints via `/docs`
   - Teste Frontend Screens
   - Teste Badge-Unlocks

3. **Customization:**
   - Badges anpassen in DB
   - Email Templates erstellen
   - Import/Export Filter erweitern

**Viel Erfolg! 🚀**

