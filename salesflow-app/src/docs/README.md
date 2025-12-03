# 📚 Sales Flow AI - Dokumentation

> Technische Dokumentation aller Module | Version 2.0

---

## 📖 Pflichtlektüre für neue Entwickler

1. 🏗️ [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) - **Starte hier!**
2. 📊 [DATA_MODEL.md](./DATA_MODEL.md) - Entities & Beziehungen
3. 🔐 [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) - Auth & DSGVO

---

## 📑 Modul-Übersicht

| # | Modul | Datei | Beschreibung |
|---|-------|-------|--------------|
| **Meta-Dokumente** |||
| 0.1 | 🏗️ **Architektur** | [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | System-Architektur & Flows |
| 0.2 | 📊 **Datenmodell** | [DATA_MODEL.md](./DATA_MODEL.md) | Entities & ER-Diagramm |
| 0.3 | 🔐 **Security** | [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) | Auth, RLS, DSGVO |
| **Kern-Module** |||
| 1 | 🚀 **Power-Up System** | [POWER_UP_SYSTEM.md](./POWER_UP_SYSTEM.md) | Company Intelligence, Objection Library, Success Stories |
| 2 | 🧠 **Objection Brain** | [OBJECTION_BRAIN.md](./OBJECTION_BRAIN.md) | KI-gestützte Einwand-Behandlung |
| 3 | 🎯 **Next Best Actions** | [NEXT_BEST_ACTIONS.md](./NEXT_BEST_ACTIONS.md) | KI-priorisierte Verkaufsaktionen |
| 4 | 📚 **Playbooks** | [PLAYBOOKS.md](./PLAYBOOKS.md) | Bewährte Sales-Strategien |
| 5 | 👥 **Leads** | [LEADS.md](./LEADS.md) | Lead-Verwaltung mit Auto-Reminder |
| 6 | 💬 **KI-Chat (CHIEF)** | [AI_CHAT.md](./AI_CHAT.md) | Sales AI Coach mit Memory |
| 7 | 📋 **Follow-up System** | [FOLLOW_UP_SYSTEM.md](./FOLLOW_UP_SYSTEM.md) | Follow-ups & Auto-Reminder |
| 8 | 🏆 **Squad Coach** | [SQUAD_COACH_SYSTEM.md](./SQUAD_COACH_SYSTEM.md) | Team-Performance & Coaching |
| **Infrastruktur** |||
| 9 | 🔐 **Authentifizierung** | [AUTH_SYSTEM.md](./AUTH_SYSTEM.md) | Supabase Auth System |
| 10 | 🗄️ **Supabase Service** | [SUPABASE_SERVICE.md](./SUPABASE_SERVICE.md) | Datenbank-Konfiguration |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React Native)                      │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ Dashboard│  Leads   │FollowUps │  Chat    │ Playbooks│Objection│
│          │          │          │  (CHIEF) │          │  Brain  │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      SERVICES                                    │
├─────────────────────┬───────────────────────────────────────────┤
│   AuthContext       │   autoReminderService                     │
│   supabase.js       │                                           │
└─────────────────────┴───────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    BACKEND API (localhost:8000)                  │
├─────────────────────────────────────────────────────────────────┤
│  /api/leads  │  /api/follow-ups  │  /api/ai/chat  │  /api/...  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    DATABASE (Supabase/PostgreSQL)                │
├─────────────────────────────────────────────────────────────────┤
│  leads │ follow_up_tasks │ company_intelligence │ objection_... │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Dateistruktur

```
src/
├── backend/
│   └── migrations/
│       ├── 003_power_up_system.sql      ← Company Intelligence, Objections
│       ├── 004_complete_rls_policies.sql
│       ├── 005_follow_up_tasks_table.sql
│       └── 006_auto_reminder_trigger.sql
├── components/
├── context/
│   └── AuthContext.js                   ← Auth Provider
├── docs/                                ← 📚 Dokumentation
│   ├── README.md (diese Datei)
│   ├── POWER_UP_SYSTEM.md
│   ├── OBJECTION_BRAIN.md
│   ├── NEXT_BEST_ACTIONS.md
│   ├── PLAYBOOKS.md
│   ├── LEADS.md
│   ├── AI_CHAT.md
│   ├── AUTH_SYSTEM.md
│   ├── SUPABASE_SERVICE.md
│   └── FOLLOW_UP_SYSTEM.md
├── navigation/
│   └── AppNavigator.js
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   └── main/
│       ├── AIChatScreen.js
│       ├── ChatScreen.js
│       ├── DashboardScreen.js
│       ├── FollowUpsScreen.js
│       ├── LeadsScreen.js
│       ├── NextBestActionsScreen.js
│       ├── ObjectionBrainScreen.js
│       └── PlaybooksScreen.js
└── services/
    ├── autoReminderService.js
    └── supabase.js
```

---

## 🚀 Quick Start

### 1. Backend starten
```bash
cd backend
python main.py  # oder uvicorn main:app --reload
# Läuft auf http://localhost:8000
```

### 2. Frontend starten
```bash
npm start
# oder
npx expo start
```

### 3. Datenbank migrieren
```sql
-- In Supabase SQL Editor ausführen:
-- 1. 003_power_up_system.sql
-- 2. 005_follow_up_tasks_table.sql
-- 3. 006_auto_reminder_trigger.sql
```

---

## 🔑 Wichtige Konfigurationen

| Konfiguration | Wert | Datei |
|---------------|------|-------|
| API URL | `http://localhost:8000` | Alle Screens |
| Supabase URL | `https://lncwvbhcafkdorypnpnz.supabase.co` | `supabase.js` |
| Auto-Reminder Tage | `3` | `autoReminderService.js` |

---

## 📞 Support

Bei Fragen zur Dokumentation oder zum Code – siehe die jeweilige Modul-Dokumentation.

---

> **Sales Flow AI** | Technische Dokumentation | 2024

