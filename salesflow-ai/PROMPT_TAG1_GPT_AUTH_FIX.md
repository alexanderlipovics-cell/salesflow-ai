# 🚨 URGENT: AUTHENTIFIZIERUNG KOMPLETT REPARIEREN

## 🎯 MISSION: SalesFlow AI production-ready Auth in 2-3 Stunden

### 🔥 KRITISCHE PROBLEME BEHEBEN:

#### 1. **Web-App Auth Context** - VERALTET!
**Datei:** `src/context/AuthContext.jsx`
**Problem:** JavaScript, kein TypeScript, kein Error Handling, keine Session Persistence

**LÖSUNG:**
```typescript
// src/context/AuthContext.tsx - NEU SCHREIBEN!
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  session: Session | null;
}

// MIT:
- JWT Token Auto-Renewal
- Session Persistence (AsyncStorage)
- Error Handling mit Toast Notifications
- Loading States
- TypeScript vollständig
```

#### 2. **Mobile Auth Context** - UNVOLLSTÄNDIG!
**Datei:** `closerclub-mobile/src/context/AuthContext.tsx`
**Problem:** Biometric Auth fehlt, Session Management unvollständig

**LÖSUNG:**
```typescript
// Biometric Authentication hinzufügen
import * as LocalAuthentication from 'expo-local-authentication';

const useBiometricAuth = () => {
  const authenticateBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Mit Biometrie anmelden',
        fallbackLabel: 'PIN verwenden'
      });
      return result.success;
    }
    return false;
  };
  return { authenticateBiometric };
};
```

#### 3. **Auth Middleware** - BACKEND PRÜFEN!
**Datei:** `backend/app/core/security.py`
**Problem:** Möglicherweise nicht alle Routes geschützt

**LÖSUNG:**
```python
# Alle kritischen Routes mit JWT schützen
from app.core.security import get_current_user, get_current_active_user

@app.get("/api/leads", dependencies=[Depends(get_current_active_user)])
async def get_leads(user: User = Depends(get_current_user)):
    # Nur eigene Leads oder Team-Leads
    pass
```

### 📋 DELIVERABLES (2-3 Stunden):

1. **✅ AuthContext.tsx** - Vollständig neu für Web-App
2. **✅ Mobile Auth** - Biometric + Auto-Login
3. **✅ Backend Routes** - Alle mit Auth geschützt
4. **✅ Error Handling** - User-friendly Auth Errors
5. **✅ Session Management** - Auto-Renewal + Persistence

### 🧪 TESTING:

```bash
# Auth Flow testen
- Login/Logout Web-App ✅
- Signup Flow ✅
- Password Reset ✅
- Biometric Mobile ✅
- Session Persistence ✅
- Protected Routes ✅
```

### 🚨 KRITISCH:
**Ohne funktionierende Auth kann NOTHING deployed werden!**

**Zeitbudget:** 2-3 Stunden MAXIMUM
**Priorität:** HIGHEST - BLOCKING DEPLOYMENT

**GO!** 🔥
