# 🏗️ System Architecture

SalesFlow AI folgt einer modernen Service-Architektur mit klarer Trennung zwischen Frontend, Backend und AI-Services.

---

## High-Level Overview

```mermaid
graph TD
    subgraph Client ["Frontend (React/Vite)"]
        UI[React 18 SPA]
        Store[TanStack Query Cache]
        Auth[Auth Context]
    end

    subgraph Backend ["FastAPI Backend"]
        Gateway[API Gateway]
        AuthSvc[Auth Service - JWT]
        Middleware[Security Middleware]
    end

    subgraph Services ["Business Services"]
        LeadSvc[Lead Service]
        DealSvc[Deal Service]
        ContactSvc[Contact Service]
        CopilotSvc[Copilot Service]
        AutopilotSvc[Autopilot Service]
    end

    subgraph AI ["AI Integration Layer"]
        AIRouter[AI Router]
        OpenAI[OpenAI GPT-4o]
        Claude[Claude 3.5]
    end

    subgraph Data ["Persistence Layer"]
        Supabase[(Supabase PostgreSQL)]
        Redis[(Redis Cache)]
    end

    UI -->|HTTPS/JSON| Gateway
    Gateway -->|JWT Verify| AuthSvc
    Gateway -->|Rate Limit| Middleware
    
    Gateway --> LeadSvc
    Gateway --> DealSvc
    Gateway --> CopilotSvc
    
    LeadSvc --> Supabase
    DealSvc --> Supabase
    CopilotSvc --> AIRouter
    AutopilotSvc --> AIRouter
    
    AIRouter -->|Primary| OpenAI
    AIRouter -->|Fallback| Claude
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant M as Middleware
    participant R as Router
    participant S as Service
    participant DB as Supabase

    U->>F: Click Action
    F->>M: POST /api/leads
    M->>M: Rate Limit Check
    M->>M: JWT Validation
    M->>M: Add Request ID
    M->>R: Forward Request
    R->>S: Call Service
    S->>S: Permission Check
    S->>DB: CRUD Operation
    DB-->>S: Result
    S->>S: Audit Log
    S-->>R: Response
    R-->>M: JSON Response
    M->>M: Add Security Headers
    M-->>F: Response
    F-->>U: Update UI
```

---

## Layer Architecture

```mermaid
graph TB
    subgraph Presentation ["Presentation Layer"]
        Router[FastAPI Routers]
    end

    subgraph Business ["Business Layer"]
        Service[Services]
        Permissions[Permission Checker]
        AuditLog[Audit Logger]
    end

    subgraph Data ["Data Access Layer"]
        Repo[Repositories]
        Cache[Cache Layer]
    end

    subgraph Infrastructure ["Infrastructure"]
        DB[(Database)]
        AI[AI Providers]
        External[External APIs]
    end

    Router --> Service
    Service --> Permissions
    Service --> AuditLog
    Service --> Repo
    Repo --> Cache
    Cache --> DB
    Service --> AI
```

---

## Directory Structure

```
salesflow-ai/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI Entry Point
│       ├── config.py            # Settings
│       ├── core/
│       │   ├── exceptions.py    # Custom Exceptions
│       │   ├── ai_types.py      # AI Type Definitions
│       │   ├── ai_policies.py   # Routing Policies
│       │   ├── ai_clients.py    # OpenAI/Claude Clients
│       │   ├── ai_router.py     # Smart AI Router
│       │   └── security/        # JWT, Password, Encryption
│       ├── middleware/
│       │   ├── rate_limiter.py
│       │   ├── security_headers.py
│       │   └── request_id.py
│       ├── services/
│       │   ├── base.py          # BaseService + Decorators
│       │   ├── lead_service.py
│       │   ├── deal_service.py
│       │   ├── contact_service.py
│       │   └── copilot_service.py
│       └── routers/
│           ├── auth.py
│           ├── leads.py
│           ├── copilot.py
│           └── ...
├── src/                         # Frontend (React)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── services/
└── docs/
    ├── developer/
    └── user-guide/
```

---

## Key Design Decisions

### 1. Service-Repository Pattern
- **Router**: HTTP Layer (nur Request/Response Handling)
- **Service**: Business Logic, Permissions, Audit
- **Repository**: Data Access (Supabase Queries)

### 2. AI Multi-Model Support
- **Smart Routing**: Task-basierte Modellauswahl
- **Fallback Chain**: GPT-4o → Claude → GPT-4o-mini
- **Cost Optimization**: Automatisches Downgrade bei einfachen Tasks

### 3. Security by Default
- **Rate Limiting**: Tiered (Auth: 5/5min, API: 100/min)
- **JWT + Refresh Tokens**: Mit Rotation
- **Input Sanitization**: XSS, SQL Injection Protection
- **Field Encryption**: Sensitive Daten verschlüsselt

---

## Environment Variables

```bash
# Backend (.env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
JWT_SECRET_KEY=xxx
JWT_REFRESH_SECRET_KEY=xxx
ENCRYPTION_KEY=xxx
```

---

## Next Steps

- [Database Schema](./database-schema.md)
- [Local Setup](./setup.md)
- [API Reference](./api-reference.md)
