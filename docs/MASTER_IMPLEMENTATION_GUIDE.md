# MASTER IMPLEMENTATION GUIDE – ALLE 33 PROMPTS  

Komplettes Schritt-für-Schritt-Playbook, um sämtliche Features in der richtigen Reihenfolge umzusetzen.

---

## Inhaltsverzeichnis

1. [Prerequisites](#prerequisites)  
2. [Implementation Phases](#implementation-phases)  
3. [Phase 1 – Foundation (Prompts 1-7)](#phase-1-foundation)  
4. [Phase 2 – Backend & Infrastructure (Prompts 8-11)](#phase-2-backend)  
5. [Phase 3 – Bug Fixes (Prompt 4)](#phase-3-bug-fixes)  
6. [Phase 4 – Extended Features (Prompts 12-18)](#phase-4-extended)  
7. [Phase 5 – Critical UX (Prompts 19-26)](#phase-5-critical)  
8. [Phase 6 – Analytics (Prompt 27)](#phase-6-analytics)  
9. [Phase 7 – Launch Features (Prompts 28-33)](#phase-7-launch)  
10. [Testing Strategy](#testing-strategy)  
11. [Deployment Checklist](#deployment-checklist)  

---

## Prerequisites

### Tools & SDKs

```bash
# Node.js & Package Manager
node --version     # >= 18
npm --version      # >= 9

# Expo / React Native
npm install -g expo-cli
expo --version     # SDK 50+

# iOS (Mac)
xcode-select --install
pod --version

# Android
# Install Android Studio + SDK + set ANDROID_HOME

# Backend / Python
python3 --version  # >= 3.11
pip3 install pipenv

# Datenbank
brew install postgresql@15   # oder Supabase nutzen
```

### Repository Setup

```bash
mkdir salesflow-ai
cd salesflow-ai

# Frontend
npx create-expo-app sales-flow-ai --template blank-typescript

# Backend
mkdir backend && cd backend
pipenv install fastapi uvicorn[standard] sqlalchemy psycopg2-binary
pipenv install alembic python-multipart openai python-jose[cryptography] passlib[bcrypt]
```

### Environment Files

```bash
# sales-flow-ai/.env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/salesflow
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_secret_key
ENVIRONMENT=development
```

---

## Implementation Phases

| Phase | Prompts | Dauer | Prio | Abhängigkeiten |
|-------|---------|-------|------|----------------|
| 1     | 1-7     | 2 Wochen | Hoch | – |
| 2     | 8-11    | 1 Woche  | Hoch | Phase 1 |
| 3     | 4       | 3 Tage   | Hoch | Phase 1 |
| 4     | 12-18   | 2 Wochen | Hoch | Phase 2 |
| 5     | 19-26   | 2 Wochen | Kritisch | Phase 4 |
| 6     | 27      | 1 Woche  | Hoch | Phase 2 |
| 7     | 28-33   | 2 Wochen | Mittel | Phase 6 |

Geschätzte Gesamtdauer: **10–12 Wochen**

---

## Phase 1: Foundation

### Prompt 1 – Today Screen & SpeedHunter

1. Projektstruktur (`src/{screens,components,types,context,api,hooks}`)  
2. Dependencies: `expo-router`, `react-native-reanimated`, `react-native-gesture-handler`  
3. Umsetzen: `types/lead.ts`, `screens/TodayScreen.tsx`, `components/LeadCard.tsx`, `components/QuickActionButton.tsx`  
4. Mockdaten einbinden, UI testen (iOS/Android)

### Prompt 2 – Squad & Profile Screens

- `screens/SquadScreen.tsx`, `components/RankRow.tsx`  
- `screens/ProfileScreen.tsx`, `components/StatCard.tsx`  
- Navigation zwischen Tabs sicherstellen

### Prompt 3 – TEAM-CHIEF Coach

- `npm install openai`  
- `context/CoachContext.tsx`, `utils/coachingEngine.ts`, `components/CoachBubble.tsx`, `CoachModal.tsx`  
- Testfälle: keine API-Key, langer Prompt, Timeout

### Prompt 8 – API Client & Offline Queue

- Dependencies: `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`  
- `api/client.ts`, `api/endpoints.ts`, `utils/offlineQueue.ts`  
- `SalesFlowContext` auf echten API-Client umstellen, Mock Toggle implementieren

### Prompt 10 – Expo Notifications

- Dependencies: `expo-notifications`, `expo-device`, `expo-constants`  
- `services/notificationService.ts`  
- Permission Flow + Handler (foreground/background/tap)

### Prompt 7 – Detox Setup

- `npm install --save-dev detox jest`  
- `npx detox init -r jest`  
- Tests: Today, Squad, Navigation

---

## Phase 2: Backend & Infrastruktur

### Prompt 6 – FastAPI Backend

- Backend-Struktur: `app/{api,models,schemas,services,db}`  
- Endpunkte für TEAM-CHIEF (`app/api/coach.py`)  
- OpenAI-Service, DB-Verbindung, CORS

### Prompt 11 – SQL Schema & RLS

- Alembic Migration, Tabellen (workspaces, contacts, events, tasks …)  
- Indexe, RLS Policies, Testdaten

### Prompt 27 (Teil 1) – Analytics Funktionen

- 8 Funktionen + 3 Materialized Views  
- Refresh-Job (pg_cron)  
- Tests: `SELECT * FROM get_today_overview('workspace-id');`

---

## Phase 3: Bug Fixes (Prompt 4)

- TodayScreen Scroll-Fix  
- LeadDetail Navigation  
- Squad Sorting  
- Coach Modal Dismiss  
- Regression-Tests auf allen betroffenen Screens

---

## Phase 4: Extended Features

### Prompt 12 – Filter & Segmente

- `types/leads.ts` erweitern  
- `utils/filterManager.ts`, `utils/filterEngine.ts`  
- `components/FilterBar.tsx`  
- Tests mit 1000+ Leads

### Prompt 14 – Error Handling/Sentry

- `types/errors.ts`, `utils/errorManager.ts`, `components/EnhancedErrorBanner.tsx`  
- Sentry Setup (`@sentry/react-native`)  
- Netzwerk- & Auth-Fehler testen

### Prompt 17 – Authentifizierung

- Dependencies: `expo-secure-store`, `expo-local-authentication`, `jwt-decode`  
- `utils/secureStorage.ts`, `tokenManager.ts`, `biometricAuth.ts`  
- `context/AuthContext.tsx`, `screens/LoginScreen.tsx`

### Prompt 18 – Performance

- `react-native-fast-image`, `react-native-performance`  
- `React.memo`, `useCallback`, FlatList Optimierung  
- Benchmarks: Render <100ms, Scroll 60FPS, Memory <150MB

---

## Phase 5: Critical UX

### Prompt 19 – Onboarding Flow

- `screens/onboarding/*`, `navigation/OnboardingNavigator.tsx`  
- Steps: Welcome → Company → Profile → Permissions  
- Skip + Persistenz

### Prompt 20 – Messaging

- `services/messagingService.ts`, `screens/ChatScreen.tsx`  
- `components/MessageBubble.tsx`, `TemplateSelector.tsx`  
- WhatsApp/Telegram Deep Links, Übersetzungs-API

### Prompt 21 – Lead CRUD

- ✅ Bereits umgesetzt: `services/leadService.ts`, `LeadFormScreen.tsx`, `BulkOperationsScreen.tsx`

### Prompt 22-26 – Critical Pack

- Action Tracker, Team Management, Gamification, Offline Sync, Settings  
- Implementierung in Services + Screens

---

## Phase 6: Analytics (Prompt 27 Rest)

- Backend Analytics Endpoints  
- Frontend: `types/analytics.ts`, `hooks/useAnalytics.ts`  
- Performance <200ms, Materialized Views Refresh

---

## Phase 7: Launch Features

### Prompt 28 – Advanced Search

- Backend FTS Migration + Endpoints  
- Frontend Search Screen, Voice Input (`@react-native-voice/voice`)

### Prompts 29-33 – Calendar, Documents, Voice, Maps, Analytics UI

- Calendar (`expo-calendar`), Documents (`expo-document-picker`, `expo-file-system`), Voice (`expo-av`), Location (`expo-location`, `react-native-maps`), Analytics UI (`recharts`)

---

## Testing Strategy

### Unit & Integration

```bash
npm install --save-dev jest @testing-library/react-native
```

- Utils ≥80 %, Services ≥70 %, Components ≥60 %, Screens ≥50 %  
- Cypress für Integrations-Tests (Auth, CRUD, Messaging, Team)

### E2E

- Detox: Onboarding → Login → Today, Lead CRUD Flow, Squad/Profile, Search/Filter

### Performance

- `utils/performanceTesting.ts` → `measureRenderTime`, `measureScrollPerformance`

---

## Deployment Checklist

### Code Quality

- [ ] Keine TS-Errors  
- [ ] Kein `console.log`  
- [ ] Prettier + ESLint clean  
- [ ] TODOs entfernt

### Testing

- [ ] Unit Tests (≥70 % Coverage)  
- [ ] E2E Tests grün  
- [ ] Manuelle Tests + Beta Feedback

### Performance

- App Size <50MB, Cold Start <3s, Memory <150MB

### Security

- ENV Variablen, Secrets verschlüsselt, SSL/TLS, RLS aktiv

### Docs

- README, API Docs, User Guide, Admin Guide

### Build & Submit

```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

- App Store / Play Store Assets + Texte finalisieren und einreichen

---

## Timeline (12 Wochen)

| Woche | Fokus | Ergebnis |
|-------|-------|----------|
| 1-2   | Phase 1 | Core UI steht |
| 3     | Phase 2 | Backend bereit |
| 4-5   | Phase 4 | Filter, Auth, Performance |
| 6-7   | Phase 5 | Onboarding, Chat, CRUD |
| 8     | Phase 6 | Analytics |
| 9-10  | Phase 7 | Search, Calendar, Maps |
| 11    | Testing | Alle Tests grün |
| 12    | Release | Deployment eingereicht |

---

## Ressourcen

- Expo Docs: https://docs.expo.dev  
- React Native: https://reactnative.dev  
- FastAPI: https://fastapi.tiangolo.com  
- Supabase: https://supabase.com/docs  
- Community: Expo Discord, StackOverflow, Reddit r/reactnative

---

## Erfolgsfaktoren

1. Phase für Phase abarbeiten – keine Sprünge  
2. Nach jedem großen Feature-Block testen  
3. Frühzeitiges User-Feedback (Beta Test)  
4. Performance laufend messen  
5. Sicherheit stets beachten

**Ready for Launch – Let’s ship! 🚀**

