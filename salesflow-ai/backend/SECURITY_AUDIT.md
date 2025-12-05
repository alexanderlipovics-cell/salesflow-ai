# 🔐 Security Audit - SalesFlow AI Backend

## ⚠️ Kritische Findings

### 1. CORS Configuration - HOCH KRITISCH ❌

**Location:** `backend/app/main.py:17-22`

**Problem:**
```python
allow_origins=["*"]  # ❌ Erlaubt ALLE Domains
```

**Risk:** Cross-Site Request Forgery (CSRF), Unauthorized API Access

**Fix:**
```python
# In app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-production-frontend.netlify.app",
        "https://your-custom-domain.com",
        "http://localhost:5173",  # Nur für Development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)
```

**Environment-basiert (Empfohlen):**
```python
import os
from dotenv import load_dotenv

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)
```

**Railway Environment Variable:**
```env
ALLOWED_ORIGINS=https://production.com,https://app.netlify.app
```

---

### 2. API Authentication - MITTEL ⚠️

**Problem:** Keine sichtbare API-Key oder Token-Validierung in main.py

**Risk:** Unautorisierte API Calls, Data Leaks

**Empfohlener Fix:**

**Option A - API Key Header:**
```python
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("API_SECRET_KEY"):
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

# In Router:
@app.get("/api/leads", dependencies=[Depends(verify_api_key)])
async def get_leads():
    ...
```

**Option B - JWT Tokens (Supabase):**
```python
from supabase import create_client
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user = supabase.auth.get_user(credentials.credentials)
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# In Router:
@app.get("/api/leads")
async def get_leads(user = Depends(verify_token)):
    ...
```

---

### 3. Environment Variables Exposure - MITTEL ⚠️

**Problem:** Keine Validierung ob kritische ENV vars gesetzt sind

**Fix in config.py:**
```python
class Settings(BaseSettings):
    """Zentrale App-Einstellungen"""

    project_name: str = Field(default="Sales Flow AI Backend")
    openai_api_key: str = Field(...)  # Required! (kein default)
    openai_model: str = Field(default="gpt-4o-mini")
    supabase_url: str = Field(...)  # Required!
    supabase_service_role_key: str = Field(...)  # Required!
    
    @validator('openai_api_key', 'supabase_url', 'supabase_service_role_key')
    def check_not_empty(cls, v):
        if not v or v == "":
            raise ValueError("This field is required!")
        return v
```

---

### 4. Supabase Row Level Security - ZU PRÜFEN 🔍

**Checklist für Supabase Dashboard:**

```sql
-- ✅ Für jede Tabelle RLS aktivieren:
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- ✅ Policy für User-Zugriff (Beispiel):
CREATE POLICY "Users can only see their own leads"
  ON leads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own leads"
  ON leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ✅ Policy für Service Role (Backend):
CREATE POLICY "Service role has full access"
  ON leads
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

**Verification:**
```sql
-- Check welche Tabellen KEINE RLS haben:
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = pg_tables.tablename
  );
```

---

### 5. Rate Limiting - EMPFOHLEN 💡

**Problem:** Keine Rate Limiting → API Abuse möglich

**Fix mit SlowAPI:**
```bash
pip install slowapi
```

```python
# In app/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/chat")
@limiter.limit("10/minute")  # Max 10 requests pro Minute
async def chat(request: Request):
    ...
```

---

### 6. Logging & Monitoring - EMPFOHLEN 💡

**Aktuell:** Basic logging in main.py

**Verbesserung:**
```python
import logging
from datetime import datetime

# Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

# Middleware für Request Logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    response = await call_next(request)
    duration = (datetime.utcnow() - start_time).total_seconds()
    
    logger.info(f"{request.method} {request.url} - {response.status_code} - {duration}s")
    return response
```

---

### 7. Input Validation - MITTEL ⚠️

**Problem:** Keine sichtbare Input Sanitization

**Fix mit Pydantic (bereits vorhanden, sicherstellen dass überall genutzt):**
```python
from pydantic import BaseModel, validator, constr

class LeadCreate(BaseModel):
    name: constr(min_length=1, max_length=100)
    email: constr(regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    phone: Optional[constr(regex=r'^\+?[1-9]\d{1,14}$')]
    
    @validator('name')
    def sanitize_name(cls, v):
        # Remove potential XSS
        return v.strip().replace('<', '').replace('>', '')

# In Router:
@app.post("/api/leads")
async def create_lead(lead: LeadCreate):  # Pydantic validiert automatisch
    ...
```

---

## 📊 Security Checklist

### Immediate Actions (JETZT)
- [ ] CORS auf spezifische Domains einschränken
- [ ] API Authentication implementieren (JWT oder API Key)
- [ ] Environment Variables Required machen
- [ ] Supabase RLS für alle Tabellen aktivieren

### High Priority (Diese Woche)
- [ ] Rate Limiting hinzufügen
- [ ] Request Logging verbessern
- [ ] Error Handling mit weniger Details für Client
- [ ] HTTPS erzwingen (Railway macht automatisch)

### Medium Priority (Diesen Monat)
- [ ] Input Validation für alle Endpoints
- [ ] SQL Injection Prevention prüfen (Supabase ORM ist safe)
- [ ] Secret Rotation Strategy
- [ ] Penetration Testing

### Nice to Have
- [ ] Web Application Firewall (WAF)
- [ ] DDoS Protection (Railway Pro)
- [ ] Security Headers (HSTS, CSP, etc.)
- [ ] Audit Logging für sensitive Operations

---

## 🛡️ Quick Security Headers Fix

```python
# In app/main.py nach CORS:
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

---

## 🚨 Incident Response Plan

Falls Security Breach:

1. **Sofort:**
   - Railway Service pausieren
   - API Keys rotieren (OpenAI, Supabase)
   - Logs sichern

2. **Analyse:**
   - Railway Logs durchsuchen: `railway logs`
   - Supabase Audit Logs prüfen
   - Betroffene User identifizieren

3. **Fix & Recovery:**
   - Vulnerability patchen
   - Neue Keys generieren
   - Service wieder starten
   - User informieren (GDPR!)

4. **Post-Mortem:**
   - Incident dokumentieren
   - Security Audit wiederholen
   - Team Training

---

## 📞 Security Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **FastAPI Security:** https://fastapi.tiangolo.com/tutorial/security/
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Railway Security:** https://docs.railway.app/reference/security

---

**Last Audit:** `[DATUM EINTRAGEN]`
**Audited by:** `[NAME EINTRAGEN]`
**Next Audit:** `[DATUM + 3 MONATE]`

