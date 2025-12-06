# ⚡ URGENT: SYSTEM OPTIMIZATION & PERFORMANCE

## 🎯 MISSION: SalesFlow AI für 1000+ Users skalieren (Tag 2)

### 🔥 PERFORMANCE & SCALABILITY UPGRADES:

#### 1. **Database Indexing** - QUERY PERFORMANCE OPTIMIERUNG
**Dateien:** `supabase/migrations/`, Database Schema

**IMPLEMENTIEREN:**
```sql
-- Critical Indexes für Lead Queries
CREATE INDEX CONCURRENTLY idx_leads_user_status ON leads(user_id, status);
CREATE INDEX CONCURRENTLY idx_leads_created_score ON leads(created_at DESC, p_score DESC);
CREATE INDEX CONCURRENTLY idx_leads_email ON leads(email) WHERE email IS NOT NULL;

-- Conversation Performance
CREATE INDEX CONCURRENTLY idx_messages_conversation_created ON dm_messages(conversation_id, created_at DESC);

-- Analytics Queries
CREATE INDEX CONCURRENTLY idx_events_lead_timestamp ON web_tracking_events(lead_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_social_engagement_lead ON social_engagement_events(lead_id, engagement_type);
```

#### 2. **Caching Strategy** - REDIS IMPLEMENTATION
**Dateien:** `backend/app/core/cache.py`, `backend/app/services/cache_service.py`

**IMPLEMENTIEREN:**
```python
from redis.asyncio import Redis
import json

class CacheService:
    """Redis-based Caching für Performance."""

    def __init__(self, redis_url: str):
        self.redis = Redis.from_url(redis_url)

    async def cache_lead_data(self, lead_id: str, data: dict, ttl: int = 300):
        """Cache Lead Data für 5 Minuten."""
        key = f"lead:{lead_id}"
        await self.redis.setex(key, ttl, json.dumps(data))

    async def get_cached_lead(self, lead_id: str) -> dict | None:
        """Get cached Lead Data."""
        key = f"lead:{lead_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def cache_user_dashboard(self, user_id: str, dashboard_data: dict):
        """Cache Dashboard Stats für User."""
        key = f"dashboard:{user_id}"
        await self.redis.setex(key, 600, json.dumps(dashboard_data))  # 10 min

    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all User-related Cache."""
        keys = await self.redis.keys(f"*{user_id}*")
        if keys:
            await self.redis.delete(*keys)
```

#### 3. **API Rate Limiting** - ADVANCED PROTECTION
**Dateien:** `backend/app/middleware/rate_limit.py`, `backend/app/core/config.py`

**IMPLEMENTIEREN:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

# Advanced Rate Limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="redis://localhost:6379"
)

# User-specific Limits
@user_limiter.limit("50/minute")
async def create_lead(request: Request, current_user: User):
    """Limit Lead Creation per User."""
    pass

# IP-based Limits für Public Endpoints
@limiter.limit("10/minute")
async def request_password_reset(email: str):
    """Strenge Limits für Password Reset."""
    pass

# Burst Protection
@limiter.limit("5/second")
async def auth_login(form_data: OAuth2PasswordRequestForm):
    """Anti-Bruteforce Protection."""
    pass
```

#### 4. **Error Monitoring** - SENTRY INTEGRATION
**Dateien:** `backend/app/core/sentry.py`, `frontend/src/utils/sentry.ts`

**IMPLEMENTIEREN:**
```python
# Backend Sentry
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastAPIIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment="production",
    integrations=[
        FastAPIIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)

# Frontend Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: 'production',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### 5. **Database Connection Pooling** - CONNECTION OPTIMIZATION
**Datei:** `backend/app/db/session.py`

**IMPLEMENTIEREN:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Optimized Connection Pool
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,          # Max connections
    max_overflow=30,       # Extra connections bei Bedarf
    pool_timeout=30,       # Connection timeout
    pool_recycle=3600,     # Recycle connections after 1h
    echo=False
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

### 📋 DELIVERABLES (3-4 Stunden):

1. **✅ Database Indexes** - Query Performance 10x schneller
2. **✅ Redis Caching** - Response Times <200ms
3. **✅ Advanced Rate Limiting** - DDoS Protection
4. **✅ Sentry Monitoring** - Full Error Tracking
5. **✅ Connection Pooling** - 1000+ Concurrent Users

### 🧪 TESTING:

```bash
# Performance Tests
ab -n 1000 -c 50 http://localhost:8000/api/leads
# Sollte <500ms Response Time haben

# Cache Tests
curl -X GET /api/leads/123  # First call: DB Query
curl -X GET /api/leads/123  # Second call: Cache Hit

# Rate Limit Tests
for i in {1..20}; do curl -X POST /auth/login -d "username=test&password=test"; done
# Sollte nach 5 Versuchen 429 zurückgeben
```

### 🚨 KRITISCH:
- **Database Performance** - Indexes für alle häufigen Queries
- **Cache Hit Rate** - >90% für Dashboard Data
- **Error Monitoring** - 100% Error Visibility
- **Rate Limiting** - Protection gegen Abuse
- **Connection Pooling** - Keine Connection Exhaustion

**Zeitbudget:** 3-4 Stunden MAXIMUM
**Priorität:** HIGH - ENABLES SCALING
**GO!** ⚡
