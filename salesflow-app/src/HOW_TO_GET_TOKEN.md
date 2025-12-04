# 🔑 Wie man einen gültigen Auth-Token bekommt

## Problem
Der bereitgestellte Token ist kein gültiger JWT-Token. Das Backend erwartet einen Supabase JWT-Token im Format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Ein JWT hat **3 Teile** getrennt durch Punkte (`.`).

---

## ✅ Lösung: Token aus der App holen

### Option 1: Browser Console (Web-App)

1. **App öffnen** (Expo Web oder Browser)
2. **Developer Tools öffnen** (F12)
3. **Console-Tab** öffnen
4. **Eingeben:**
   ```javascript
   // Token aus localStorage holen
   const session = JSON.parse(localStorage.getItem('supabase.auth.token'));
   console.log('Access Token:', session?.currentSession?.access_token);
   ```

5. **Token kopieren** und für Tests verwenden

---

### Option 2: React Native Debugger

1. **App auf Handy/Emulator öffnen**
2. **React Native Debugger öffnen**
3. **Console öffnen**
4. **Eingeben:**
   ```javascript
   // Token aus AsyncStorage holen
   import AsyncStorage from '@react-native-async-storage/async-storage';
   AsyncStorage.getItem('supabase.auth.token').then(console.log);
   ```

---

### Option 3: Supabase Dashboard

1. **Supabase Dashboard öffnen**
2. **Authentication → Users**
3. **User auswählen**
4. **Access Token kopieren** (falls verfügbar)

---

### Option 4: Direkt aus der App (Code)

Füge temporär in eine Screen-Datei ein:

```javascript
import { useAuth } from '../context/AuthContext';

// In einer Komponente:
const { user } = useAuth();
console.log('Access Token:', user?.access_token);
```

---

## 🧪 Token für Tests verwenden

```powershell
# Token setzen
$env:SUPABASE_TOKEN = "DEIN_JWT_TOKEN_HIER"

# Tests ausführen
python test_complete_system.py $env:SUPABASE_TOKEN
```

---

## ⚠️ Wichtig

- **Token ist geheim** - Nicht in Git committen!
- **Token läuft ab** - Nach ~1 Stunde erneuern
- **Token ist user-spezifisch** - Jeder User hat eigenen Token

---

## 🎯 Alternative: Tests ohne Auth

Die meisten Tests können auch **ohne Token** gemacht werden, wenn:
- Backend Auth optional macht (nicht empfohlen für Production)
- Mock-Token verwendet wird (nur für Development)

**Aktuell funktionieren ohne Token:**
- ✅ Health Check
- ✅ MENTOR Status (öffentlich)

**Benötigen Token:**
- ❌ Quick Actions
- ❌ MENTOR Chat
- ❌ Contacts API
- ❌ DMO API
- etc.

---

## 💡 Empfehlung

**Für vollständige Tests:**
1. App starten (`npx expo start`)
2. Einloggen
3. Token aus Browser Console holen
4. Tests mit Token ausführen

**Oder:**
- Frontend-Tests machen (Token wird automatisch verwendet)
- Siehe: `test_frontend_manual.md`

