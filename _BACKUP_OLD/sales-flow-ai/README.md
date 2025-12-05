# 🚀 Sales Flow AI

**KI-gestützter Vertriebs-Copilot für MLM, Immobilien & Finance**

## 📁 Projektstruktur

```
sales-flow-ai/
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── api/               # API Endpoints
│   │   │   ├── routes/        # Route Handlers
│   │   │   └── schemas/       # Pydantic Schemas
│   │   ├── domain/            # Business Logic
│   │   │   ├── compensation/  # Compensation Plans
│   │   │   └── goals/         # Goal Engine
│   │   ├── services/          # Application Services
│   │   ├── db/                # Database Layer
│   │   │   └── repositories/  # Data Access
│   │   └── config/            # Configuration
│   └── requirements.txt
│
└── frontend/                   # React Native / Expo
    └── src/
        ├── api/               # API Client
        │   └── types/         # TypeScript Types
        └── features/
            └── goals/         # Goal Engine Feature
```

## 🎯 Goal Engine

Das Herzstück: Berechnet aus Einkommenszielen die täglichen Aktivitäten.

```
User: "2.000 €/Monat in 6 Monaten mit Zinzino"
         ↓
Target Rank: Team Leader (400€ avg)
         ↓
Volume: 2.000 Credits benötigt
         ↓
Daily Targets:
• 2 neue Kontakte/Tag
• 3 Follow-ups/Tag
• 1 Reaktivierung/Tag
```

## 🚀 Quick Start

### Backend

```bash
cd backend

# Virtual Environment erstellen
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder: venv\Scripts\activate  # Windows

# Dependencies installieren
pip install -r requirements.txt

# Environment konfigurieren
cp .env.example .env
# .env bearbeiten mit Supabase-Credentials

# Server starten
uvicorn app.main:app --reload
```

**API Docs:** http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Dependencies installieren
npm install

# App starten
npm start
```

## 📡 API Endpoints

### Compensation Plans

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/compensation/companies` | GET | Liste aller Firmen |
| `/api/v1/compensation/plans/{id}` | GET | Compensation Plan |
| `/api/v1/compensation/plans/{id}/ranks` | GET | Ränge einer Firma |
| `/api/v1/compensation/find-rank` | POST | Rang nach Einkommen |

### Goals

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/goals/calculate` | POST | Ziel berechnen |
| `/api/v1/goals/save` | POST | Ziel speichern |
| `/api/v1/goals/daily-targets` | GET | Daily Targets |

## 📊 Unterstützte Firmen

| Firma | ID | Plan Type |
|-------|----|-----------| 
| Zinzino | `zinzino` | Unilevel |
| PM-International | `pm-international` | Unilevel |
| LR Health & Beauty | `lr-health` | Unilevel |

## 🔧 Neue Firma hinzufügen

1. **Backend:** `backend/app/domain/compensation/plans.py`
2. **Frontend:** API Types sind automatisch verfügbar

```python
# In plans.py
NEW_COMPANY = CompensationPlan(
    company_id="new-company",
    company_name="New Company",
    company_logo="🚀",
    region=Region.DE,
    plan_type=PlanType.UNILEVEL,
    # ... ranks
)

# Registry aktualisieren
COMPENSATION_PLANS.append(NEW_COMPANY)
```

## ⚠️ Disclaimer

Alle Einkommensangaben sind unverbindliche Beispielrechnungen und keine Verdienstgarantie.

---

**Built with ❤️ by Sales Flow AI Team**

