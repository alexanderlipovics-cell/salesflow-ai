# 🏗️ SALESFLOW AI - Systemarchitektur Analyse

**Erstellt für:** Gemini / Claude / GPT-4  
**Datum:** 2025-01-XX  
**Zweck:** Vollständige strukturelle Analyse des Systems für AI-Agenten

---

## 📋 Inhaltsverzeichnis

1. [System-Übersicht](#system-übersicht)
2. [Frontend-Architektur](#frontend-architektur)
3. [Backend-Architektur](#backend-architektur)
4. [Authentifizierungssysteme](#authentifizierungssysteme)
5. [API-Struktur](#api-struktur)
6. [Datenbank-Architektur](#datenbank-architektur)
7. [Datenfluss](#datenfluss)
8. [Bekannte Probleme & Inkonsistenzen](#bekannte-probleme--inkonsistenzen)
9. [Abhängigkeiten](#abhängigkeiten)

---

## 🎯 System-Übersicht

### Tech Stack

**Frontend:**
- React 18.3.1 + TypeScript
- Vite 5.2.0 (Build Tool)
- React Router 6.30.2 (Routing)
- TailwindCSS 3.4.13 (Styling)
- Zustand (State Management, teilweise)
- React Query 5.17.19 (Data Fetching)

**Backend:**
- FastAPI 0.109.2 (Python Web Framework)
- Python 3.12
- Supabase 2.4.0 (PostgreSQL Database + Auth)
- Pydantic 2.6.1 (Data Validation)
- SQLAlchemy 2.0.25 (ORM)

**Mobile:**
- React Native (Expo)
- Separate Codebase in `closerclub-mobile/`

**Infrastructure:**
- Supabase (Database, Auth, Storage)
- Render.com (Backend Deployment)
- Vercel/Netlify (Frontend Deployment)

### Projektstruktur

```
salesflow-ai/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React Komponenten
│   ├── pages/              # Seiten/Routes
│   ├── services/           # API Services
│   ├── context/            # React Context (Auth, User, etc.)
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Utilities & API Clients
│   └── types/              # TypeScript Types
├── backend/                # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── routers/        # API Endpoints
│   │   ├── services/        # Business Logic
│   │   ├── schemas/         # Pydantic Models
│   │   ├── models/          # Database Models
│   │   └── core/            # Core Utilities
│   └── requirements.txt    # Python Dependencies
├── closerclub-mobile/      # Mobile App (React Native)
└── supabase/               # Database Migrations
```

---

## 🎨 Frontend-Architektur

### Entry Point

**`src/main.jsx`** → **`src/App.jsx`**

### Context Provider Hierarchie

```jsx
<AuthProvider>                    // src/context/AuthContext.tsx
  <UserProvider>                  // src/context/UserContext.jsx
    <SubscriptionProvider>        // src/hooks/useSubscription.ts
      <PricingModalProvider>      // src/context/PricingModalContext.jsx
        <FeatureGateProvider>      // src/context/FeatureGateContext.jsx
          <VerticalProvider>       // src/context/VerticalContext.tsx
            <BrowserRouter>
              <Routes>
                {/* Routes */}
              </Routes>
            </BrowserRouter>
          </VerticalProvider>
        </FeatureGateProvider>
      </PricingModalProvider>
    </SubscriptionProvider>
  </UserProvider>
</AuthProvider>
```

### Routing

**Haupt-Routes** (`src/App.jsx`):
- `/login` → `LoginPage.tsx`
- `/signup` → `SignupPage.tsx`
- `/auth` → `AuthPage.jsx` (Alternative Auth-Seite)
- `/dashboard` → `DashboardRouterPage.tsx`
- `/chat` → `ChatPage.tsx`
- `/crm/*` → CRM Pages (Contacts, Leads, Pipeline)
- `/commissions` → `CommissionTrackerPage.tsx`
- `/cold-call` → `ColdCallAssistantPage.tsx`
- `/closing-coach` → `ClosingCoachPage.tsx`
- `/performance` → `PerformanceInsightsPage.tsx`
- `/gamification` → `GamificationPage.tsx`
- ... (68+ Pages insgesamt)

### API Clients

**Mehrere API-Client-Implementierungen:**

1. **`src/lib/api.ts`** (Haupt-API-Client)
   - Automatischer Authorization-Header
   - Unterstützt beide Token-Speicherorte
   - Wird von vielen Komponenten verwendet

2. **`src/api/client.ts`** (Alternative API-Client)
   - Verwendet `authService.getAccessToken()`
   - Fallback zu Supabase Token

3. **`src/services/apiConfig.js`** (Legacy API Config)
   - `apiFetch()` Funktion
   - Manueller Token-Parameter

4. **`src/services/authService.ts`** (Auth-spezifische Calls)
   - Direkte `fetch()` Calls
   - Token-Management

### State Management

- **React Context** (Auth, User, Vertical, etc.)
- **React Query** (Server State Caching)
- **Local State** (useState, useReducer)
- **LocalStorage** (Token Storage, User Preferences)

---

## ⚙️ Backend-Architektur

### Entry Point

**`backend/app/main.py`**

### Router-Struktur

FastAPI Router werden in `main.py` registriert:

```python
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(crm.router, prefix="/api/crm", tags=["crm"])
# ... 50+ Router
```

### Haupt-Router (`backend/app/routers/`)

**Registriert in `backend/app/main.py` (40+ Router):**

**Core:**
- `auth.py` → `/api/auth/*` - Authentifizierung (Login, Signup, Token Refresh, /me)
- `chat.py` → `/api/chat` - AI Chat Endpoint (mit Vertical Context)
- `copilot.py` → `/api/copilot` - AI Copilot
- `leads.py` → `/api/leads` - Lead Management

**CRM:**
- `crm.py` → `/api/crm/*` - CRM Operations (Contacts, Pipeline)
- `zero_input_crm.py` → `/api/zero-input-crm` - Zero-Input CRM

**AI Features:**
- `closing_coach.py` → `/api/closing-coach/*` - Closing Coach AI
- `cold_call_assistant.py` → `/api/cold-call/*` - Cold Call Assistant
- `lead_qualifier.py` → `/api/lead-qualifier/*` - AI Lead Qualifier
- `lead_discovery.py` → `/api/lead-discovery/*` - Lead Discovery Engine

**Analytics & Performance:**
- `analytics.py` → `/api/analytics/*` - Analytics Dashboard
- `performance_insights.py` → `/api/performance-insights/*` - Performance Analytics
- `gamification.py` → `/api/gamification/*` - Gamification System

**Finance:**
- `commission_tracker.py` → `/api/commission-tracker/*` - Commission Tracking
- `compensation.py` → `/api/compensation/*` - Compensation Simulator

**Team & Network:**
- `genealogy.py` → `/api/genealogy/*` - Genealogy Tree & Downline
- `team_templates.py` → `/api/team-templates/*` - Team Duplikation

**Lead Generation:**
- `lead_generation.py` → `/api/lead-generation/*` - Lead Generation System
- `lead_hunter.py` → `/api/lead-hunter/*` - Lead Hunter
- `ad_webhooks.py` → `/api/ad-webhooks/*` - Ad Platform Webhooks

**Communication:**
- `idps.py` → `/api/idps/*` - Intelligent DM Persistence System
- `conversations.py` → `/api/conversations/*` - Conversation Memory
- `followups.py` → `/api/followups/*` - GPT Follow-Up Engine

**Other:**
- `onboarding.py` → `/api/onboarding/*` - Magic Onboarding
- `chat_import.py` → `/api/chat-import/*` - Chat Import
- `screenshot.py` → `/api/screenshot/*` - Screenshot-to-Lead (GPT-4o Vision)
- `consent.py` → `/api/consent/*` - GDPR Consent Management
- `privacy.py` → `/api/privacy/*` - GDPR Privacy Operations
- `user_learning.py` → `/api/user-learning/*` - User Learning & Personalization
- `events.py` → `/api/events/*` - Event Management
- `ops_deployments.py` → `/api/ops-deployments/*` - AI Ops Deployment
- ... (40+ Router insgesamt)

### Service Layer (`backend/app/services/`)

- `vertical_service.py` - Vertical Config Management
- `autopilot_engine.py` - Autopilot Logic
- `followup_service.py` - Follow-Up Engine
- `lead_generation_service.py` - Lead Generation
- ... (56+ Services)

### Schema Layer (`backend/app/schemas/`)

- `auth.py` - Auth Schemas (SignupRequest, LoginResponse, etc.)
- `vertical.py` - Vertical Config Schemas
- `crm.py` - CRM Entity Schemas
- `leads.py` - Lead Schemas
- ... (11+ Schema Files)

### Database Layer

- **Supabase Client** (`backend/app/supabase_client.py`)
- **SQLAlchemy Models** (`backend/app/models/`)
- **Direct Supabase Queries** (in Routers/Services)

---

## 🔐 Authentifizierungssysteme

### ⚠️ KRITISCH: Mehrere Auth-Systeme parallel!

Das System hat **3 verschiedene Auth-Implementierungen**, die parallel existieren:

### 1. AuthContext (src/context/AuthContext.tsx)

**Verwendung:** Haupt-Auth-System für Web-App

**Token-Speicherung:**
- `localStorage.setItem("salesflow_auth_session", JSON.stringify(session))`
- `localStorage.setItem("access_token", session.accessToken)` (seit Fix)
- `localStorage.setItem("refresh_token", session.refreshToken)` (seit Fix)

**API-Endpoints:**
- `${API_URL}/auth/login` (form-urlencoded, username/password)
- `${API_URL}/auth/signup` (JSON)
- `${API_URL}/auth/me` (GET/PATCH)
- `${API_URL}/auth/refresh` (POST)

**Token-Format:**
- `Bearer <access_token>`

**Verwendung:**
- `AuthPage.jsx` verwendet `useAuth()` aus `AuthContext`
- Viele Komponenten verwenden `useAuth()` aus `AuthContext`

### 2. authService (src/services/authService.ts)

**Verwendung:** Alternative Auth-Implementierung

**Token-Speicherung:**
- `localStorage.setItem("access_token", tokens.access_token)`
- `localStorage.setItem("refresh_token", tokens.refresh_token)`

**API-Endpoints:**
- `${cleanBaseUrl}/api/auth/login` (form-urlencoded, username/password)
- `${cleanBaseUrl}/api/auth/signup` (JSON)
- `${cleanBaseUrl}/api/auth/me` (GET)
- `${cleanBaseUrl}/api/auth/refresh` (POST)

**Token-Format:**
- `Bearer <access_token>`

**Verwendung:**
- `LoginPage.tsx` verwendet `useAuth()` aus `hooks/useAuth.ts`
- `hooks/useAuth.ts` verwendet `authService`
- Viele Services verwenden `authService.getAccessToken()`

### 3. Supabase Auth (src/services/supabase.ts)

**Verwendung:** Legacy/Alternative Auth (teilweise verwendet)

**Token-Speicherung:**
- Supabase Client verwaltet eigene Session
- `localStorage` via Supabase Storage Adapter

**Verwendung:**
- `AuthContext.jsx` (Legacy-Version)
- Einige mobile Komponenten

### Token-Synchronisation

**Problem:** Die beiden Haupt-Systeme (AuthContext + authService) speichern Token unterschiedlich:

- **AuthContext:** `salesflow_auth_session` (JSON) + `access_token` (String)
- **authService:** `access_token` (String) + `refresh_token` (String)

**Lösung:** `src/lib/api.ts` unterstützt beide Formate:

```typescript
function getAccessToken(): string | null {
  // Try authService format first
  const directToken = localStorage.getItem("access_token");
  if (directToken) return directToken;
  
  // Try AuthContext format
  const sessionJson = localStorage.getItem("salesflow_auth_session");
  if (sessionJson) {
    const session = JSON.parse(sessionJson);
    return session?.accessToken || null;
  }
  return null;
}
```

---

## 🌐 API-Struktur

### Base URLs

**Frontend Config:**
- `VITE_API_BASE_URL` (default: `/api`)
- `VITE_API_URL` (default: `http://localhost:8000`)

**Backend:**
- Production: `https://salesflow-ai.onrender.com`
- Local: `http://localhost:8000`

### API-Endpoint-Struktur

```
/api/auth/*
  POST   /api/auth/login          # Login (form-urlencoded)
  POST   /api/auth/signup         # Signup (JSON)
  GET    /api/auth/me             # Current User
  PATCH  /api/auth/me             # Update Profile
  POST   /api/auth/refresh        # Refresh Token
  POST   /api/auth/logout         # Logout

/api/chat
  POST   /api/chat                # AI Chat (mit Vertical Context)

/api/crm/*
  GET    /api/crm/contacts
  POST   /api/crm/contacts
  GET    /api/crm/leads
  POST   /api/crm/leads
  GET    /api/crm/pipeline

/api/closing-coach/*
  GET    /api/closing-coach/deals
  POST   /api/closing-coach/analyze/{deal_id}

/api/cold-call/*
  GET    /api/cold-call/contacts
  POST   /api/cold-call/sessions
  POST   /api/cold-call/script

/api/commission-tracker/*
  GET    /api/commission-tracker/commissions
  GET    /api/commission-tracker/summary

/api/performance-insights/*
  GET    /api/performance-insights/analyze

/api/gamification/*
  GET    /api/gamification/achievements
  GET    /api/gamification/leaderboard
```

### Request/Response Format

**Login Request:**
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=secret
```

**Login Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "vertical_id": "network_marketing"
  }
}
```

**Authenticated Request:**
```http
GET /api/auth/me
Authorization: Bearer eyJ...
```

---

## 🗄️ Datenbank-Architektur

### Supabase (PostgreSQL)

**Haupt-Tabellen:**
- `users` - User Accounts
- `verticals` - Vertical Configurations (JSONB)
- `contacts` - CRM Contacts
- `leads` - Leads mit P-Score
- `deals` - Deals/Pipeline
- `followups` - Follow-Up Tasks
- `autopilot_settings` - Autopilot Config
- `commissions` - Commission Tracking
- `gamification_achievements` - Achievements
- ... (50+ Tabellen)

### Vertical Architecture

**Tabelle: `verticals`**
```sql
CREATE TABLE verticals (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  config JSONB  -- VerticalConfig Schema
);
```

**VerticalConfig Schema:**
```typescript
{
  features: {
    crm: { leads: boolean, contacts: boolean, ... },
    ai: { copilot: boolean, closing_coach: boolean, ... },
    gamification: { achievements: boolean, ... },
    ...
  },
  terminology: {
    lead: "Interessent",
    deal: "Einschreibung",
    revenue: "Umsatz",
    ...
  },
  ai_context: {
    persona: "...",
    focus_topics: [...],
    tone_of_voice: "...",
    forbidden_phrases: [...]
  },
  routes: {
    hidden: ["/gamification", ...]
  }
}
```

**User-Vertical-Zuordnung:**
```sql
ALTER TABLE users ADD COLUMN vertical_id TEXT REFERENCES verticals(id);
```

---

## 🔄 Datenfluss

### Login-Flow

```
1. User klickt "Anmelden"
   ↓
2. LoginForm.tsx → handleSubmit()
   ↓
3. LoginPage.tsx → handleLogin()
   ↓
4a. useAuth() Hook (hooks/useAuth.ts)
    → authService.login()
    ↓
4b. ODER AuthContext.signIn()
    → fetch('/api/auth/login')
    ↓
5. Backend: auth.py → login()
    → Validierung
    → Token Generation
    → Response mit access_token
   ↓
6. Frontend: Token speichern
    → localStorage.setItem('access_token', ...)
    → localStorage.setItem('salesflow_auth_session', ...)
   ↓
7. Redirect zu /dashboard
   ↓
8. Dashboard lädt User-Daten
    → authService.getCurrentUser()
    → ODER AuthContext lädt Session
    → GET /api/auth/me mit Authorization Header
```

### API-Request-Flow

```
1. Component ruft API auf
   ↓
2. api.get('/auth/me') (src/lib/api.ts)
   ↓
3. getAccessToken() liest Token aus localStorage
   ↓
4. Authorization Header wird hinzugefügt
   ↓
5. fetch() Request zu Backend
   ↓
6. Backend: JWT Token Validierung
   ↓
7. Response zurück
```

### Vertical Context Flow

```
1. App Start
   ↓
2. VerticalProvider lädt User's vertical_id
   ↓
3. Fetch Vertical Config aus Supabase
   ↓
4. Config wird in Context gespeichert
   ↓
5. AI Chat: Vertical Context wird in System-Prompt injiziert
   ↓
6. Frontend: Features werden gefiltert basierend auf config.features
   ↓
7. Frontend: Terminologie wird via t('key') angepasst
```

---

## ⚠️ Bekannte Probleme & Inkonsistenzen

### 1. Mehrere Auth-Systeme

**Problem:** 3 verschiedene Auth-Implementierungen parallel

**Impact:**
- Token-Synchronisation notwendig
- Inkonsistente API-Endpoints (`/auth/login` vs `/api/auth/login`)
- Verwirrung bei Entwicklern

**Lösung:** 
- `src/lib/api.ts` unterstützt beide Token-Formate
- `AuthContext` speichert Token auch direkt als `access_token`

### 2. API-Client-Inkonsistenz

**Problem:** 4 verschiedene API-Client-Implementierungen

**Impact:**
- Unterschiedliche Token-Handling
- Inkonsistente Error-Handling
- Schwierige Wartung

**Lösung:**
- `src/lib/api.ts` ist der Haupt-Client (automatischer Token)
- Andere Clients sollten migriert werden

### 3. Proxy-Environment-Variablen

**Problem:** `httpx` (von Supabase verwendet) liest automatisch `HTTP_PROXY`/`HTTPS_PROXY`

**Lösung:**
- `backend/app/main.py` löscht Proxy-Variablen am Anfang
- Kommentare in `supabase_client.py` und `deps.py`

### 4. Pydantic V2 Migration

**Problem:** Einige Models verwenden noch `class Config` statt `model_config`

**Status:** 
- Meiste Models migriert
- `protected_namespaces=()` hinzugefügt

### 5. Dependency-Konflikte

**Problem:** `supabase-auth` und `supabase-functions` benötigen `httpx>=0.26`, aber `supabase==2.4.0` benötigt `httpx<0.26`

**Lösung:**
- `supabase-auth` und `supabase-functions` deinstalliert
- `httpx>=0.24.0,<0.26.0` in requirements.txt

---

## 📦 Abhängigkeiten

### Frontend Dependencies

**Kern:**
- `react@18.3.1`
- `react-dom@18.3.1`
- `react-router-dom@6.30.2`
- `@tanstack/react-query@5.17.19`

**UI:**
- `tailwindcss@3.4.13`
- `lucide-react@0.452.0`
- `framer-motion@12.23.24`

**Auth/Data:**
- `@supabase/supabase-js@2.86.0`
- `@stripe/stripe-js@8.5.3`

**Build:**
- `vite@5.2.0`
- `typescript@5.9.3`

### Backend Dependencies

**Kern:**
- `fastapi@0.109.2`
- `uvicorn@0.27.1`
- `pydantic@2.6.1`

**Database:**
- `supabase@2.4.0`
- `asyncpg@0.29.0`
- `sqlalchemy@2.0.25`

**AI:**
- `openai@1.12.0`
- `langchain@0.1.6`

**Auth:**
- `python-jose@3.3.0`
- `passlib[bcrypt]@1.7.4`
- `PyJWT>=2.8.0`

---

## 🔍 Wichtige Dateien für Debugging

### Frontend

- `src/App.jsx` - App Entry Point, Routes, Context Provider
- `src/context/AuthContext.tsx` - Haupt-Auth-System
- `src/services/authService.ts` - Alternative Auth-Service
- `src/lib/api.ts` - Haupt-API-Client (automatischer Token)
- `src/pages/LoginPage.tsx` - Login-Seite
- `src/components/auth/LoginForm.tsx` - Login-Formular

### Backend

- `backend/app/main.py` - FastAPI App, Router Registration
- `backend/app/routers/auth.py` - Auth Endpoints
- `backend/app/core/deps.py` - FastAPI Dependencies (Supabase Client)
- `backend/app/supabase_client.py` - Supabase Client Factory
- `backend/app/services/vertical_service.py` - Vertical Config Service
- `backend/app/core/vertical_prompts.py` - Vertical Prompt Builder

### Config

- `backend/requirements.txt` - Python Dependencies
- `package.json` - Frontend Dependencies
- `.env` / `env.local` - Environment Variables

---

## 🚀 Deployment

### Backend (Render.com)

- **Entry Point:** `backend/app/main.py`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel/Netlify)

- **Entry Point:** `src/main.jsx`
- **Build Command:** `npm run build`
- **Output:** `dist/`

### Environment Variables

**Backend:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`
- `OPENAI_API_KEY`

**Frontend:**
- `VITE_API_BASE_URL`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📝 Zusammenfassung für AI-Agenten

### Wichtigste Erkenntnisse

1. **Mehrere Auth-Systeme:** AuthContext + authService + Supabase Auth parallel
2. **Token-Synchronisation:** `src/lib/api.ts` unterstützt beide Formate
3. **Vertical Architecture:** Branchen-spezifische Anpassung via `verticals` Tabelle
4. **API-Client-Inkonsistenz:** 4 verschiedene Implementierungen
5. **Proxy-Problem:** Umgebungsvariablen müssen am Anfang gelöscht werden

### Häufige Probleme

1. **401 Unauthorized:** Token wird nicht gesendet → Prüfe `src/lib/api.ts` Token-Logik
2. **Login reloads page:** `preventDefault()` fehlt → Prüfe `LoginForm.tsx`
3. **Proxy Error:** `httpx` liest Proxy-Variablen → Prüfe `main.py` Proxy-Clearing
4. **Pydantic Warnings:** `protected_namespaces` fehlt → Prüfe Schema-Dateien

### Empfohlene Fixes

1. **Auth-System konsolidieren:** Ein einziges Auth-System verwenden
2. **API-Client vereinheitlichen:** Alle Calls über `src/lib/api.ts`
3. **TypeScript strict mode:** Alle `.js` Dateien zu `.ts` migrieren
4. **Error-Handling standardisieren:** Einheitliches Error-Handling Pattern

---

**Ende der Analyse**

