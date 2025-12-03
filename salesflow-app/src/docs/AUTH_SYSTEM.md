# 🔐 Sales Flow AI - Authentifizierung

> **Technische Dokumentation** | Version 1.0  
> Supabase-basierte Authentifizierung

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [AuthContext](#-authcontext)
3. [Login Screen](#-login-screen)
4. [Register Screen](#-register-screen)
5. [Nutzung](#-nutzung)

---

## 🎯 Überblick

Das Auth-System nutzt **Supabase Auth**:

- ✅ Email/Password Authentifizierung
- ✅ Session-Persistenz mit AsyncStorage
- ✅ Auto-Refresh Token
- ✅ User Metadata (Name)

---

## 🔧 AuthContext

**Datei:** `src/context/AuthContext.js`

### Provider

```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session beim Start laden
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Auth-State Änderungen abonnieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Exportierte Funktionen

| Funktion | Parameter | Beschreibung |
|----------|-----------|--------------|
| `signIn` | `email, password` | Login mit Email/Passwort |
| `signUp` | `email, password, metadata` | Registrierung |
| `signOut` | - | Logout |

### Verwendung

```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, loading, signIn, signOut } = useAuth();
  
  if (loading) return <Loading />;
  if (!user) return <LoginScreen />;
  
  return <Dashboard user={user} />;
};
```

---

## 📱 Login Screen

**Datei:** `src/screens/auth/LoginScreen.js`

### Features
- Email-Eingabe
- Passwort-Eingabe
- Fehleranzeige
- Link zu Registrierung

### Flow

```javascript
const handleLogin = async () => {
  if (!email || !password) { 
    setError('Bitte alle Felder ausfüllen'); 
    return; 
  }
  setLoading(true);
  const { error } = await signIn(email, password);
  if (error) setError(error.message);
  setLoading(false);
};
```

---

## 📝 Register Screen

**Datei:** `src/screens/auth/RegisterScreen.js`

### Features
- Name, Email, Passwort, Bestätigung
- Passwort-Validierung (min. 6 Zeichen)
- Erfolgs-Screen mit Email-Hinweis

### Flow

```javascript
const handleRegister = async () => {
  // Validierung
  if (password !== confirmPassword) { 
    setError('Passwörter stimmen nicht überein'); 
    return; 
  }
  if (password.length < 6) { 
    setError('Passwort muss mindestens 6 Zeichen haben'); 
    return; 
  }
  
  const { error } = await signUp(email, password, { full_name: name });
  if (error) setError(error.message);
  else setSuccess(true);  // Zeigt Erfolgs-Screen
};
```

---

## 🔑 User Object

```typescript
interface User {
  id: string;                    // UUID
  email: string;
  user_metadata: {
    full_name?: string;          // Bei Registrierung gesetzt
  };
  // ... weitere Supabase-Felder
}
```

---

## 🎨 Styling

| Element | Farbe |
|---------|-------|
| Logo | 🚀 Emoji |
| Primary Button | Blau `#3b82f6` |
| Error Text | Rot `#ef4444` |
| Link | Blau `#3b82f6` |
| Success Icon | ✅ Grün |

---

## 🔧 Extending this Module

### Rollen & Rechte Matrix

| Permission | rep | team_lead | admin | enterprise_admin |
|------------|-----|-----------|-------|------------------|
| Leads sehen (eigene) | ✅ | ✅ | ✅ | ✅ |
| Leads sehen (Team) | ❌ | ✅ | ✅ | ✅ |
| Leads sehen (alle) | ❌ | ❌ | ✅ | ✅ |
| Leads bearbeiten | ✅ | ✅ | ✅ | ✅ |
| Leads löschen | ❌ | ✅ | ✅ | ✅ |
| Playbooks erstellen | ❌ | ✅ | ✅ | ✅ |
| Team verwalten | ❌ | ✅ | ✅ | ✅ |
| Settings ändern | ❌ | ❌ | ✅ | ✅ |
| Billing verwalten | ❌ | ❌ | ✅ | ✅ |
| Workspaces verwalten | ❌ | ❌ | ❌ | ✅ |

### Neue Rolle hinzufügen

1. **Type erweitern**

```typescript
// types/auth.ts
type UserRole = 'rep' | 'team_lead' | 'admin' | 'partner' | 'enterprise_admin';
```

2. **Permissions definieren**

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'partner': [
    'view_own_leads', 
    'view_analytics', 
    'manage_referrals',
    'view_commissions'
  ],
  'enterprise_admin': [
    ...ADMIN_PERMISSIONS, 
    'manage_workspaces',
    'view_all_workspaces',
    'manage_billing'
  ]
};
```

3. **RLS Policies erweitern**

```sql
-- Partner kann nur Referral-Leads sehen
CREATE POLICY "partner_view_referrals"
ON leads FOR SELECT
USING (
  referred_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_users 
    WHERE id = auth.uid() AND role = 'partner'
  )
);
```

### Session Handling

| Setting | Wert | Beschreibung |
|---------|------|--------------|
| Access Token Lifetime | 1 Stunde | JWT gültig |
| Refresh Token Lifetime | 7 Tage | Refresh möglich |
| Session Timeout | 30 Minuten | Inaktivität |
| Max Sessions | 5 | Pro User |

### Multi-Factor Authentication (geplant)

```typescript
// MFA Setup
async function setupMFA(user_id: string) {
  const { data } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Sales Flow AI'
  });
  
  return {
    qr_code: data.totp.qr_code,
    secret: data.totp.secret
  };
}

// MFA Verify
async function verifyMFA(factor_id: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId: factor_id,
    code: code
  });
  return !error;
}
```

### Checkliste

- [ ] Neue Rolle in ROLE_PERMISSIONS
- [ ] RLS Policies aktualisiert
- [ ] UI Zugriffsprüfung erweitert
- [ ] Backend Authorization erweitert
- [ ] Tests für Rollenzugriff

---

## 🔧 Extending this Module

### Rollen & Rechte Matrix

| Permission | rep | team_lead | admin | enterprise_admin |
|------------|:---:|:---------:|:-----:|:----------------:|
| Leads sehen (eigene) | ✅ | ✅ | ✅ | ✅ |
| Leads sehen (Team) | ❌ | ✅ | ✅ | ✅ |
| Leads sehen (alle) | ❌ | ❌ | ✅ | ✅ |
| Leads bearbeiten | ✅* | ✅ | ✅ | ✅ |
| Leads löschen | ❌ | ✅ | ✅ | ✅ |
| Playbooks erstellen | ❌ | ✅ | ✅ | ✅ |
| Team verwalten | ❌ | ✅ | ✅ | ✅ |
| Settings ändern | ❌ | ❌ | ✅ | ✅ |
| Billing verwalten | ❌ | ❌ | ✅ | ✅ |
| Workspaces verwalten | ❌ | ❌ | ❌ | ✅ |

*\* = Nur eigene*

---

### Neue Rolle hinzufügen

**1. Type erweitern**

```typescript
// types/auth.ts
type UserRole = 
  | 'rep'              // Vertriebsmitarbeiter
  | 'team_lead'        // Team-Leiter
  | 'admin'            // Workspace Admin
  | 'partner'          // Partner-Account (NEU)
  | 'enterprise_admin' // Multi-Workspace Admin
  | 'viewer';          // Nur-Lesen Zugang (NEU)
```

**2. Permissions definieren**

```typescript
// In AuthContext oder separater permissions.ts
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'rep': [
    'view_own_leads',
    'edit_own_leads',
    'view_own_followups',
    'use_ai_chat',
    'view_playbooks'
  ],
  'partner': [
    'view_own_leads',
    'view_analytics',
    'manage_referrals',
    'view_commission_reports'
  ],
  'viewer': [
    'view_own_leads',
    'view_playbooks',
    'view_analytics'
    // Keine Edit-Rechte
  ],
  // ... andere Rollen
};
```

**3. Supabase RLS Policies erweitern**

```sql
-- Neue Rolle in User-Tabelle
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_role 
CHECK (role IN ('rep', 'team_lead', 'admin', 'partner', 'enterprise_admin', 'viewer'));

-- Policy für Partner
CREATE POLICY "partner_view_referrals" ON referrals
FOR SELECT
USING (
  partner_id = auth.uid()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'partner'
);

-- Policy für Viewer (nur lesen)
CREATE POLICY "viewer_readonly" ON leads
FOR SELECT
USING (
  workspace_id = get_user_workspace()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'viewer'
);
```

**4. Frontend Permission Check**

```javascript
// hooks/usePermission.js
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS } from '../config/permissions';

export const usePermission = (permission) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

// Verwendung
const CanDeleteButton = ({ leadId }) => {
  const canDelete = usePermission('delete_leads');
  
  if (!canDelete) return null;
  
  return (
    <Button onPress={() => deleteLead(leadId)}>
      🗑️ Löschen
    </Button>
  );
};
```

---

### Session Handling

| Setting | Wert | Beschreibung |
|---------|------|--------------|
| Access Token Lifetime | 1 Stunde | JWT gültig |
| Refresh Token Lifetime | 7 Tage | Refresh möglich |
| Session Timeout | 30 Minuten | Bei Inaktivität |
| Max Sessions | 5 | Pro User gleichzeitig |

**Implementation:**

```javascript
// services/supabase.js
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Session-Check bei App-Start
const checkSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    // Redirect to Login
    navigation.replace('Login');
    return;
  }
  
  // Token Refresh falls nötig
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const minutesUntilExpiry = (expiresAt - now) / 1000 / 60;
  
  if (minutesUntilExpiry < 10) {
    await supabase.auth.refreshSession();
  }
};
```

---

### OAuth Provider hinzufügen

```javascript
// Google OAuth
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'salesflow://auth/callback',
      scopes: 'email profile'
    }
  });
};

// Apple Sign In (iOS)
const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: 'salesflow://auth/callback'
    }
  });
};

// LinkedIn (für B2B)
const signInWithLinkedIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin',
    options: {
      redirectTo: 'salesflow://auth/callback',
      scopes: 'r_liteprofile r_emailaddress'
    }
  });
};
```

---

### Checkliste für Auth-Erweiterungen

- [ ] Neue Rolle in TypeScript definiert
- [ ] Permissions in `ROLE_PERMISSIONS` hinzugefügt
- [ ] Supabase RLS Policies aktualisiert
- [ ] Frontend Permission Checks implementiert
- [ ] UI-Elemente nach Rolle ein-/ausgeblendet
- [ ] Session Handling getestet
- [ ] Logout funktioniert korrekt
- [ ] Dokumentation aktualisiert

---

> **Erstellt für Sales Flow AI** | Auth System

