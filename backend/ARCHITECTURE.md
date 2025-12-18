# 🏗️ SalesFlow AI - Architecture Overview

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React/Vite)  │  Mobile App (Planned)  │  Admin Panel │
└────────────┬────────────┴────────────┬───────────┴──────────────┘
             │                         │
             └─────────┬───────────────┘
                       │ HTTPS/REST
                       │
┌──────────────────────▼────────────────────────────────────────┐
│                    API GATEWAY LAYER                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            FastAPI Application                      │    │
│  │  - CORS Middleware                                  │    │
│  │  - Rate Limiting (Planned)                          │    │
│  │  - Authentication (Planned)                         │    │
│  │  - Request Logging                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Railway.app Hosting                                         │
│  - Auto-scaling                                              │
│  - Health Checks                                             │
│  - Auto-restart on failure                                   │
└──────────────────────┬────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         │             │             │
┌────────▼────┐ ┌──────▼──────┐ ┌──▼──────────┐
│  AI LAYER   │ │  DATA LAYER │ │  CACHE      │
│             │ │             │ │  (Planned)  │
│ OpenAI GPT-4│ │  Supabase   │ │             │
│ Anthropic   │ │  PostgreSQL │ │  Redis      │
│ Claude      │ │  - RLS      │ │             │
│             │ │  - Realtime │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🔄 Request Flow

```
1. Client Request
   │
   ├─→ CORS Check
   │   └─→ ❌ Reject if origin not allowed
   │
   ├─→ Rate Limiting (Planned)
   │   └─→ ❌ Reject if rate exceeded
   │
   ├─→ Authentication (Planned)
   │   └─→ ❌ Reject if token invalid
   │
   ├─→ Input Validation (Pydantic)
   │   └─→ ❌ Reject if invalid
   │
   ├─→ Business Logic
   │   ├─→ Database Query (Supabase)
   │   ├─→ AI Processing (OpenAI/Claude)
   │   └─→ Cache Check (Planned)
   │
   └─→ Response
       └─→ ✅ Return JSON
```

---

## 📦 API Endpoints Structure

```
/
├── /                           # Root (Status Check)
├── /health                     # Health Check
├── /docs                       # Swagger UI
├── /redoc                      # ReDoc
│
└── /api/
    ├── /leads                  # Lead Management
    │   ├── GET    /            # List leads
    │   ├── POST   /            # Create lead
    │   ├── GET    /{id}        # Get lead
    │   ├── PUT    /{id}        # Update lead
    │   └── DELETE /{id}        # Delete lead
    │
    ├── /copilot                # AI Copilot
    │   ├── POST /suggest       # Get suggestions
    │   ├── POST /analyze       # Analyze conversation
    │   └── POST /coach         # Get coaching tips
    │
    ├── /chat                   # Chat System
    │   ├── GET  /conversations # List conversations
    │   ├── POST /messages      # Send message
    │   └── GET  /messages/{id} # Get messages
    │
    ├── /autopilot              # Autopilot
    │   ├── GET  /sequences     # List sequences
    │   ├── POST /sequences     # Create sequence
    │   └── POST /trigger       # Trigger sequence
    │
    ├── /analytics              # Analytics
    │   ├── GET /dashboard      # Dashboard data
    │   ├── GET /metrics        # Metrics
    │   └── GET /reports        # Reports
    │
    ├── /webhooks               # Channel Webhooks
    │   ├── POST /whatsapp      # WhatsApp webhook
    │   └── POST /telegram      # Telegram webhook
    │
    ├── /collective-intelligence # CI System
    │   ├── GET  /insights      # Get insights
    │   └── POST /feedback      # Submit feedback
    │
    ├── /lead-generation        # Lead Gen
    │   ├── POST /discover      # Discover leads
    │   └── POST /qualify       # Qualify leads
    │
    └── /idps                   # DM Persistence
        ├── GET  /threads       # List threads
        └── POST /persist       # Persist DM
```

---

## 🗄️ Data Model

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │ 1:N
       │
┌──────▼──────┐      ┌─────────────┐
│   Leads     ├──N:1─┤ Lead Status │
└──────┬──────┘      └─────────────┘
       │ 1:N
       │
┌──────▼────────────┐
│  Conversations    │
└──────┬────────────┘
       │ 1:N
       │
┌──────▼────────────┐
│    Messages       │
└───────────────────┘

┌──────────────────┐
│ Autopilot        │
│ Sequences        │
└──────┬───────────┘
       │ 1:N
       │
┌──────▼───────────┐
│ Sequence Steps   │
└──────────────────┘

┌──────────────────┐
│   Analytics      │
│   Events         │
└──────────────────┘
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────┐
│ 1. Transport Security (HTTPS)               │
│    - Railway enforces HTTPS                 │
│    - TLS 1.2+                               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 2. CORS Protection                          │
│    - Whitelisted origins only               │
│    - Credentials allowed for trusted domains│
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 3. Authentication (Planned)                 │
│    - JWT tokens from Supabase               │
│    - API key validation                     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 4. Input Validation                         │
│    - Pydantic schemas                       │
│    - Type checking                          │
│    - Size limits                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 5. Database Security                        │
│    - Supabase Row Level Security (RLS)      │
│    - Parameterized queries                  │
│    - Service role key (backend only)        │
└─────────────────────────────────────────────┘
```

---

## 🚀 Deployment Pipeline

```
Developer           GitHub              Railway             Production
    │                 │                   │                     │
    │  git push       │                   │                     │
    ├────────────────>│                   │                     │
    │                 │  webhook          │                     │
    │                 ├──────────────────>│                     │
    │                 │                   │                     │
    │                 │                   │ 1. Clone Repo       │
    │                 │                   │ 2. Install Deps     │
    │                 │                   │ 3. Run Tests        │
    │                 │                   │ 4. Build Image      │
    │                 │                   │ 5. Deploy           │
    │                 │                   │                     │
    │                 │                   │ deployment         │
    │                 │                   ├────────────────────>│
    │                 │                   │                     │
    │                 │                   │ < Health Check >    │
    │                 │                   │<────────────────────│
    │                 │                   │                     │
    │  notification   │                   │                     │
    │<────────────────┴───────────────────┤                     │
    │                                     │                     │
    │                                     │   ✅ Live!          │
```

---

## 🔄 Auto-Restart Flow

```
Application Running
        │
        │ Error/Crash
        ▼
    [Failed]
        │
        ├─→ Railway detects failure
        │
        ├─→ Check restart count < 10?
        │   │
        │   ├─→ Yes: Restart app
        │   │         │
        │   │         ├─→ Health check /health
        │   │         │
        │   │         ├─→ ✅ Success: Continue
        │   │         └─→ ❌ Fail: Retry
        │   │
        │   └─→ No: Stop (too many retries)
        │
        └─→ Send notification
```

---

## 📊 Data Flow Example: Chat Message

```
1. User sends message via Frontend
          │
          ▼
2. POST /api/chat/messages
   {
     "conversation_id": "123",
     "content": "Wie spreche ich potenzielle Partner an?",
     "lead_id": "456"
   }
          │
          ▼
3. FastAPI receives & validates (Pydantic)
          │
          ▼
4. Save message to Supabase
   - conversations table
   - messages table
          │
          ▼
5. Call AI Copilot
   - OpenAI GPT-4 API
   - Context from conversation history
   - MLM knowledge base
          │
          ▼
6. Get AI response
   "Beginne mit Interesse-Fragen..."
          │
          ▼
7. Save AI response to DB
          │
          ▼
8. Return response to Frontend
   {
     "message": {...},
     "ai_suggestion": "...",
     "confidence": 0.92
   }
          │
          ▼
9. Frontend displays message + suggestion
```

---

## 🧩 Service Dependencies

```
┌──────────────────┐
│  FastAPI App     │
└────────┬─────────┘
         │
         ├─→ Supabase (REQUIRED)
         │   └─→ PostgreSQL Database
         │
         ├─→ OpenAI API (REQUIRED)
         │   └─→ GPT-4 Models
         │
         ├─→ Anthropic API (OPTIONAL)
         │   └─→ Claude Models
         │
         └─→ Redis (PLANNED)
             └─→ Caching Layer
```

---

## 📈 Scalability Strategy

### Current (v1.0)
- **Vertical Scaling:** Railway handles automatically
- **Database:** Supabase scales automatically
- **Stateless:** No local state, easy to scale

### Planned (v1.x)
- **Horizontal Scaling:** Multiple Railway instances
- **Load Balancing:** Railway built-in
- **Caching:** Redis for frequently accessed data
- **CDN:** Static assets via CDN

### Future (v2.x)
- **Microservices:** Split into smaller services
- **Message Queue:** RabbitMQ/Redis for async tasks
- **Database Read Replicas:** For analytics queries

---

## 🔧 Configuration Management

```
┌─────────────────────────────────────┐
│     Environment Variables           │
│  (Set in Railway Dashboard)         │
│                                     │
│  - OPENAI_API_KEY                   │
│  - SUPABASE_URL                     │
│  - SUPABASE_SERVICE_ROLE_KEY        │
│  - OPENAI_MODEL                     │
│  - (ALLOWED_ORIGINS - planned)      │
└──────────────┬──────────────────────┘
               │
               │ Loaded by
               │
┌──────────────▼──────────────────────┐
│     app/config.py                   │
│  (Pydantic Settings)                │
│                                     │
│  - Type validation                  │
│  - Default values                   │
│  - Required checks                  │
└──────────────┬──────────────────────┘
               │
               │ Used by
               │
┌──────────────▼──────────────────────┐
│     Application                     │
│  - Routers                          │
│  - Services                         │
│  - Clients                          │
└─────────────────────────────────────┘
```

---

## 🎯 Performance Metrics (Target)

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | < 200ms | ~150ms |
| Health Check | < 100ms | ~50ms |
| Database Query | < 50ms | ~30ms |
| AI API Call | < 2s | ~1.5s |
| Uptime | > 99.5% | TBD |
| Error Rate | < 0.1% | TBD |

---

## 🔍 Monitoring Stack (Planned)

```
┌──────────────────────────────────┐
│      Application Logs            │
│  - Request/Response logging      │
│  - Error tracking                │
│  - Performance metrics           │
└──────────────┬───────────────────┘
               │
               ├─→ Railway Logs
               ├─→ Sentry (Error Tracking)
               ├─→ DataDog (Metrics)
               └─→ LogRocket (Session Replay)
```

---

## 🛡️ Disaster Recovery

### Backup Strategy
- **Database:** Supabase automatic daily backups
- **Code:** GitHub repository
- **Config:** Railway project settings
- **Secrets:** Secure password manager

### Recovery Plan
1. **Database:** Restore from Supabase backup
2. **Application:** Redeploy from GitHub
3. **Config:** Restore ENV from backup
4. **Verify:** Run health checks
5. **Monitor:** Watch for errors

### RTO (Recovery Time Objective)
- **Target:** < 15 minutes
- **Steps:** Documented in SECURITY_AUDIT.md

---

## 🔮 Future Architecture (v2.0)

```
                    ┌─────────────┐
                    │   API GW    │
                    │  (Kong)     │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌────▼────┐
    │ Auth    │      │  Core API │    │ AI Svc  │
    │ Service │      │  Service  │    │ Service │
    └─────────┘      └───────────┘    └─────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Message   │
                    │   Queue     │
                    └─────────────┘
```

---

**Architecture Version:** 1.0.0  
**Last Updated:** 2025-12-05  
**Next Review:** 2026-01-05

