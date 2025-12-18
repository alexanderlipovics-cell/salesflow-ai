# 🔧 TypeScript Linting Fixes - Quick Reference

## ✅ Angewandte Fixes

### 1. **Ungenutzte Variablen**

**Problem:**
```typescript
const data = await fetchData();  // ⚠️ 'data' is assigned but never used
const sessionId = generateId();  // ⚠️ 'sessionId' is assigned but never used
```

**Lösung Option 1 - Underscore Prefix (Empfohlen):**
```typescript
const _data = await fetchData();  // ✅ Zeigt absichtlich ungenutzt
const _sessionId = generateId();   // ✅ ESLint ignoriert _-prefix
```

**Lösung Option 2 - ESLint Disable:**
```typescript
/* eslint-disable @typescript-eslint/no-unused-vars */
const data = await fetchData();
const sessionId = generateId();
/* eslint-enable @typescript-eslint/no-unused-vars */
```

---

### 2. **Type Assertions für Status Codes**

**Problem:**
```typescript
const statusCode: number = response.status;
// Type 'number' is not assignable to type '500 | 408 | 429 | 503'
```

**Lösung:**
```typescript
const statusCode = response.status as 500 | 408 | 429 | 503;
```

**Oder mit Type Union:**
```typescript
type RetryableStatusCode = 500 | 408 | 429 | 503;
const statusCode = response.status as RetryableStatusCode;
```

---

### 3. **ESLint Konfiguration**

**File:** `.eslintrc.json`

```json
{
  "extends": ["expo", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ]
  }
}
```

**Was macht das?**
- `argsIgnorePattern: "^_"` → Ignoriert Funktions-Args mit _-Prefix
- `varsIgnorePattern: "^_"` → Ignoriert Variablen mit _-Prefix
- `caughtErrorsIgnorePattern: "^_"` → Ignoriert Errors mit _-Prefix

---

## 📋 Häufige Linting-Probleme & Fixes

### **Problem: Unused Import**
```typescript
import { SomeType } from './types';  // ⚠️ Unused

// Fix: Entfernen oder Type-Only Import
import type { SomeType } from './types';  // ✅
```

---

### **Problem: Any Type**
```typescript
const data: any = await fetch();  // ⚠️ Any type

// Fix: Spezifischen Type definieren
interface ApiResponse {
  data: unknown;
  status: number;
}
const data: ApiResponse = await fetch();  // ✅
```

---

### **Problem: Implicit Any in Function**
```typescript
function process(data) {  // ⚠️ Parameter 'data' implicitly has 'any' type

// Fix: Type annotation hinzufügen
function process(data: unknown): void {  // ✅
  // ...
}
```

---

### **Problem: Non-null Assertion**
```typescript
const user = users.find(u => u.id === id)!;  // ⚠️ Non-null assertion

// Fix: Optional Chaining + Null Check
const user = users.find(u => u.id === id);
if (!user) {
  throw new Error('User not found');
}
// ✅ TypeScript weiß jetzt dass user nicht undefined ist
```

---

## 🛠️ Nützliche ESLint Commands

```bash
# Check alle Dateien
npm run lint

# Auto-Fix wo möglich
npm run lint -- --fix

# Nur specific Datei
npx eslint src/api/client.ts

# Ignore bestimmte Regeln für File
# Am Anfang der Datei:
/* eslint-disable @typescript-eslint/no-explicit-any */
```

---

## 🎯 Best Practices

### ✅ **DO:**
```typescript
// Nutze Type-Only Imports wenn möglich
import type { User } from './types';

// Nutze _ für absichtlich ungenutzte Variablen
const _debugData = expensiveCalculation();

// Definiere spezifische Types
type ApiError = { message: string; code: number };
```

### ❌ **DON'T:**
```typescript
// Vermeide any
const data: any = ...;

// Vermeide Non-null Assertions ohne Check
const user = users[0]!;

// Vermeide @ts-ignore (nutze @ts-expect-error mit Kommentar)
// @ts-ignore
const weird = something.broken;
```

---

## 🔍 Debug Linting Issues

### **1. Check ESLint Config**
```bash
npx eslint --print-config src/api/client.ts | grep "no-unused-vars"
```

### **2. Run mit Details**
```bash
npx eslint src/api/client.ts --format=verbose
```

### **3. Check Prettier Conflicts**
```bash
npm run prettier -- --check "src/**/*.{ts,tsx}"
```

---

## 📝 TypeScript Strict Mode Settings

In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## ✅ Checklist vor Commit

- [ ] `npm run lint` zeigt keine Errors
- [ ] `npm run type-check` (tsc --noEmit) läuft durch
- [ ] Keine `any` Types ohne Grund
- [ ] Alle Imports genutzt
- [ ] Ungenutzte Variablen haben _ prefix oder sind entfernt

---

**Made with 🔧 by Sales Flow AI Team**

