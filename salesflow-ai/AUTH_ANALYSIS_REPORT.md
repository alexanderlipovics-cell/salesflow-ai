# 🔐 Vollständige Authentifizierungs-Analyse - SalesFlow AI

**Datum:** 2024-12-19  
**Zweck:** Identifikation aller Inkonsistenzen im Auth-System, die zu 401-Fehlern führen

---

## 📋 EXECUTIVE SUMMARY

**HAUPTPROBLEM:** Es existieren **ZWEI PARALLELE JWT-IMPLEMENTIERUNGEN** im Backend, die unterschiedliche Secret-Keys und Algorithmen verwenden können. Die Token-Erstellung verwendet eine Implementierung, die Token-Validierung eine andere.

**KRITISCHER MISMATCH:**
- **Token-Erstellung:** `backend/app/core/security/main.py` → verwendet `settings.jwt_secret_key` (Fallback: `settings.secret_key`)
- **Token-Validierung:** `backend/app/core/security/main.py` → verwendet `settings.jwt_secret_key` (Fallback: `settings.secret_key`)
- **ABER:** Es gibt auch `backend/app/core/security/jwt.py` mit einer **komplett anderen Implementierung**, die `settings.JWT_SECRET_KEY` (Property) verwendet!

---

## 1️⃣ TOKEN-ERSTELLUNG (Backend)

### A) Login-Funktion

**Datei:** `backend/app/routers/auth.py`  
**Funktion:** `login()` (Zeile 123-172)

```python
# Create tokens
tokens = create_token_pair(user["id"], user["email"])
```

**Import:**
```python
from ..core.security import create_token_pair
```

**Wichtig:** Importiert aus `backend/app/core/security/__init__.py`, welches aus `.main` importiert.

### B) Token-Erstellung (main.py)

**Datei:** `backend/app/core/security/main.py`  
**Funktion:** `create_token_pair()` (Zeile 147-151)

```python
def create_token_pair(user_id: str, email: Optional[str] = None) -> Dict[str, str]:
    access_token = create_access_token({"sub": user_id, "email": email})
    refresh_token = create_refresh_token({"sub": user_id, "email": email})
    return {"access_token": access_token, "refresh_token": refresh_token}
```

**Funktion:** `create_access_token()` (Zeile 63-74)

```python
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
    secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)  # ⚠️ WICHTIG
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)  # ALGORITHM = "HS256"
    return encoded_jwt
```

**Secret Key Variable:** `settings.jwt_secret_key` (Fallback: `settings.secret_key`)  
**Algorithmus:** `HS256` (konstant in `ALGORITHM = "HS256"`)

### C) Alternative Token-Erstellung (jwt.py) - NICHT VERWENDET

**Datei:** `backend/app/core/security/jwt.py`  
**Funktion:** `create_access_token()` (Zeile 116-153)

```python
def create_access_token(user_id: UUID, role: str, ...) -> tuple[str, str]:
    settings = get_settings()
    # ...
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,  # ⚠️ ANDERE SECRET-KEY-VARIABLE!
        algorithm=settings.JWT_ALGORITHM  # ⚠️ ANDERER ALGORITHM-WEG!
    )
```

**Secret Key Variable:** `settings.JWT_SECRET_KEY` (Property, das auf `jwt_secret_key` oder `secret_key` zeigt)  
**Algorithmus:** `settings.JWT_ALGORITHM` (Property, das auf `jwt_algorithm` zeigt)

**⚠️ PROBLEM:** Diese Implementierung wird **NICHT** verwendet, aber existiert parallel!

---

## 2️⃣ TOKEN-SPEICHERUNG (Frontend)

### Methode 1: authService.ts

**Datei:** `src/services/authService.ts`  
**Funktion:** `setTokens()` (Zeile ~120-140)

```typescript
private setTokens(tokens: AuthTokens): void {
  if (!tokens || !tokens.access_token) {
    throw new Error('Cannot save tokens: access_token is missing');
  }
  try {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    // ...
  }
}
```

**Speicher-Keys:**
- `localStorage.setItem('access_token', ...)`
- `localStorage.setItem('refresh_token', ...)`

### Methode 2: AuthContext.tsx

**Datei:** `src/context/AuthContext.tsx`  
**Funktion:** `storeSession()` (Zeile 71-81)

```typescript
const storeSession = (session: Session) => {
  try {
    // Store full session object (for AuthContext)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));  // STORAGE_KEY = "salesflow_auth_session"
    // Also store access_token directly (for compatibility with authService and api.ts)
    localStorage.setItem("access_token", session.accessToken);
    localStorage.setItem("refresh_token", session.refreshToken);
  } catch (e) {
    console.error("Failed to store session", e);
  }
};
```

**Speicher-Keys:**
- `localStorage.setItem('salesflow_auth_session', JSON.stringify(session))`
- `localStorage.setItem('access_token', ...)` (für Kompatibilität)
- `localStorage.setItem('refresh_token', ...)` (für Kompatibilität)

**⚠️ PROBLEM:** Zwei verschiedene Speicher-Methoden, aber beide speichern auch `access_token` direkt.

---

## 3️⃣ TOKEN-LESEN & SENDEN (Frontend)

### A) src/lib/api.ts

**Datei:** `src/lib/api.ts`  
**Funktion:** `getAccessToken()` (Zeile 37-62)

```typescript
function getAccessToken(): string | null {
  // Try authService format first (direct access_token key)
  const directToken = localStorage.getItem("access_token");
  if (directToken) return directToken;
  
  // Try AuthContext format (JSON object in salesflow_auth_session)
  try {
    const sessionJson = localStorage.getItem("salesflow_auth_session");
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      if (session?.accessToken) {
        return session.accessToken;
      }
    }
  } catch (e) { /* ignore */ }
  
  return null;
}
```

**Lese-Reihenfolge:**
1. `localStorage.getItem("access_token")` (direkt)
2. `localStorage.getItem("salesflow_auth_session")` → JSON.parse → `session.accessToken`

**Verwendung:** Automatisch in `request()` Funktion (Zeile 101-112)

```typescript
const token = getAccessToken();
if (token) {
  requestHeaders["Authorization"] = `Bearer ${token}`;
}
```

### B) src/services/authService.ts

**Datei:** `src/services/authService.ts`  
**Funktion:** `getAccessToken()` (Zeile ~150-160)

```typescript
getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}
```

**Lese-Methode:** Nur `localStorage.getItem('access_token')`

### C) src/context/AuthContext.tsx

**Datei:** `src/context/AuthContext.tsx`  
**Funktion:** `loadStoredSession()` (Zeile 83-96)

```typescript
const loadStoredSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);  // STORAGE_KEY = "salesflow_auth_session"
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse stored session", e);
    return null;
  }
};
```

**Lese-Methode:** Nur `localStorage.getItem('salesflow_auth_session')` → JSON.parse

**Verwendung in API-Calls:** Direkt `session.accessToken` verwendet (z.B. Zeile 362)

```typescript
headers: {
  Authorization: `Bearer ${session.accessToken}`,
}
```

---

## 4️⃣ TOKEN-VALIDIERUNG (Backend)

### A) /me Endpoint

**Datei:** `backend/app/routers/auth.py`  
**Funktion:** `get_current_user_profile()` (Zeile 270-297)

```python
@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
) -> UserProfile:
```

**Dependency:** `get_current_active_user` aus `..core.security`

### B) get_current_active_user

**Datei:** `backend/app/core/security/main.py`  
**Funktion:** `get_current_active_user()` (Zeile 151-152)

```python
async def get_current_active_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    return await get_current_user(token)
```

**Funktion:** `get_current_user()` (Zeile 139-160)

```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    try:
        payload = verify_access_token(token)
        return payload
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
```

### C) verify_access_token

**Datei:** `backend/app/core/security/main.py`  
**Funktion:** `verify_access_token()` (Zeile 125-150)

```python
def verify_access_token(token: str) -> Dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise InvalidTokenError("Invalid token type")
    return payload
```

### D) decode_token

**Datei:** `backend/app/core/security/main.py`  
**Funktion:** `decode_token()` (Zeile 91-122)

```python
def decode_token(token: str) -> Dict[str, Any]:
    secret_key = getattr(settings, "jwt_secret_key", settings.secret_key)  # ⚠️ WICHTIG
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])  # ALGORITHM = "HS256"
        return payload
    except jwt.ExpiredSignatureError:
        raise InvalidTokenError("Token has expired")
    except jwt.InvalidSignatureError:
        raise InvalidTokenError(f"Invalid token signature: {str(e)}")
    except PyJWTError as e:
        raise InvalidTokenError(f"Invalid token: {str(e)}")
```

**Secret Key Variable:** `settings.jwt_secret_key` (Fallback: `settings.secret_key`)  
**Algorithmus:** `HS256` (konstant in `ALGORITHM = "HS256"`)

---

## 5️⃣ SECRET-KEY-KONFIGURATION

### Backend Config

**Datei:** `backend/app/config.py`  
**Klasse:** `Settings` (Zeile 110-131)

```python
jwt_secret_key: str = Field(default="", description="Secret key for JWT access tokens. Uses secret_key if not set.")
jwt_refresh_secret_key: str = Field(default="", description="Secret key for JWT refresh tokens. Uses secret_key if not set.")

@property
def JWT_SECRET_KEY(self) -> str:
    """Alias for jwt_secret_key (uppercase for compatibility). Falls leer, wird secret_key verwendet."""
    return self.jwt_secret_key or self.secret_key
```

**Wichtig:**
- `jwt_secret_key` (snake_case) ist das primäre Feld
- `JWT_SECRET_KEY` (Property) ist ein Alias, der auf `jwt_secret_key` oder `secret_key` zeigt
- `main.py` verwendet `getattr(settings, "jwt_secret_key", settings.secret_key)` → **KORREKT**
- `jwt.py` verwendet `settings.JWT_SECRET_KEY` (Property) → **ANDERE METHODE, ABER GLEICHER WERT**

---

## 6️⃣ API BASE URL KONFIGURATIONEN

### A) src/lib/api.ts

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api`
  : (import.meta.env.PROD ? "https://salesflow-ai.onrender.com/api" : "/api");
```

**Verwendet:** `VITE_API_BASE_URL` oder Production-Fallback

### B) src/services/authService.ts

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');
const cleanBaseUrl = API_BASE_URL.replace(/(\/api)+\/?$/, '').replace(/\/+$/, '');
// Verwendet: ${cleanBaseUrl}/api/auth/login
```

**Verwendet:** `VITE_API_BASE_URL` oder Production-Fallback (OHNE `/api`)

### C) src/context/AuthContext.tsx

```typescript
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? "https://salesflow-ai.onrender.com" : "http://localhost:8000");
// Verwendet: ${API_URL}/auth/login
```

**Verwendet:** `VITE_API_URL` oder Production-Fallback (OHNE `/api`)

**⚠️ PROBLEM:** Unterschiedliche Environment-Variablen:
- `src/lib/api.ts` → `VITE_API_BASE_URL`
- `src/services/authService.ts` → `VITE_API_BASE_URL`
- `src/context/AuthContext.tsx` → `VITE_API_URL`

---

## 7️⃣ ZUSAMMENFASSUNG DER MISMATCHES

### ✅ KORREKT (Konsistent)

1. **Token-Erstellung & Validierung verwenden dieselbe Implementierung:**
   - Beide verwenden `backend/app/core/security/main.py`
   - Beide verwenden `settings.jwt_secret_key` (Fallback: `settings.secret_key`)
   - Beide verwenden `HS256` Algorithmus

2. **Token-Speicherung ist kompatibel:**
   - Beide Methoden speichern `access_token` direkt in localStorage
   - `src/lib/api.ts` kann beide Formate lesen

### ⚠️ POTENTIELLE PROBLEME

1. **Zwei parallele JWT-Implementierungen:**
   - `backend/app/core/security/main.py` (wird verwendet)
   - `backend/app/core/security/jwt.py` (wird NICHT verwendet, aber existiert)
   - **Risiko:** Verwechslung bei zukünftigen Änderungen

2. **Unterschiedliche Environment-Variablen:**
   - `VITE_API_BASE_URL` vs `VITE_API_URL`
   - Könnte zu unterschiedlichen API-URLs führen

3. **Token-Payload-Unterschiede:**
   - `main.py` erstellt: `{"sub": user_id, "email": email, "type": "access", "exp": ..., "iat": ...}`
   - `jwt.py` würde erstellen: `{"sub": str(user_id), "type": TokenType.ACCESS.value, "role": role, "jti": ..., ...}`
   - **Aktuell kein Problem**, da `jwt.py` nicht verwendet wird

### 🔴 KRITISCHER MISMATCH (Wahrscheinliche Ursache für 401)

**KEIN MISMATCH GEFUNDEN in der aktuellen Implementierung!**

Die Token-Erstellung und -Validierung verwenden:
- ✅ Dieselbe Datei: `backend/app/core/security/main.py`
- ✅ Dasselbe Secret-Key-Feld: `settings.jwt_secret_key` (Fallback: `settings.secret_key`)
- ✅ Dasselbe Algorithmus: `HS256`

**MÖGLICHE URSACHEN FÜR 401:**

1. **Secret-Key ist leer oder unterschiedlich:**
   - Prüfe Environment-Variable `JWT_SECRET_KEY` in Production
   - Prüfe, ob `settings.secret_key` gesetzt ist

2. **Token wird nicht korrekt gesendet:**
   - Prüfe Browser DevTools → Network Tab → `/api/auth/me` Request
   - Prüfe, ob `Authorization: Bearer <token>` Header vorhanden ist

3. **Token ist abgelaufen:**
   - Prüfe `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (Standard: 30 Minuten)
   - Prüfe Token-Payload `exp` Feld

4. **Token-Typ ist falsch:**
   - Prüfe, ob Token `"type": "access"` enthält
   - Prüfe, ob Refresh-Token statt Access-Token gesendet wird

---

## 8️⃣ EMPFOHLENE FIXES

### Sofortige Fixes

1. **Secret-Key prüfen:**
   ```bash
   # In Production (Render.com)
   # Prüfe Environment Variables:
   JWT_SECRET_KEY=<sollte gesetzt sein>
   SECRET_KEY=<sollte gesetzt sein>
   ```

2. **Debug-Logs aktivieren:**
   - Backend-Logs zeigen jetzt detaillierte Informationen
   - Prüfe Logs für: `decode_token: Invalid signature` oder `Token expired`

3. **Token im Frontend prüfen:**
   ```javascript
   // In Browser Console:
   console.log('Token:', localStorage.getItem('access_token'));
   // Prüfe Token auf jwt.io
   ```

### Langfristige Fixes

1. **JWT-Implementierung konsolidieren:**
   - Entweder `main.py` ODER `jwt.py` verwenden
   - Nicht beide parallel

2. **Environment-Variablen vereinheitlichen:**
   - Nur `VITE_API_BASE_URL` verwenden
   - `VITE_API_URL` entfernen oder als Alias behandeln

3. **Token-Speicherung vereinheitlichen:**
   - Nur eine Methode verwenden (z.B. nur `access_token` direkt)
   - Oder nur `salesflow_auth_session` JSON-Objekt

---

## 9️⃣ DEBUGGING-CHECKLISTE

- [ ] Prüfe Backend-Logs für `decode_token: Invalid signature`
- [ ] Prüfe Browser DevTools → Network → `/api/auth/me` → Request Headers
- [ ] Prüfe `localStorage.getItem('access_token')` im Browser
- [ ] Prüfe Environment-Variable `JWT_SECRET_KEY` in Production
- [ ] Prüfe Token auf jwt.io (decode und prüfe `exp`, `type`, `sub`)
- [ ] Prüfe, ob Token abgelaufen ist (`exp` < aktueller Zeitstempel)
- [ ] Prüfe, ob `Authorization: Bearer <token>` Header gesendet wird

---

**Ende des Berichts**

