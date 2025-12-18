# 📱 Mobile API Integration - SalesFlow AI

## ✅ Backend-Endpoints für Mobile App

Die Backend-Router wurden erweitert, um mobile-optimierte Response-Strukturen zu liefern.

---

## 🎯 Closing Coach

### GET /api/closing-coach/deals

**Response-Struktur:**
```json
[
  {
    "id": "D101",
    "deal_name": "Renewal: Enterprise Corp",
    "account": "Enterprise Corp",
    "closing_score": 85,
    "probability": 90,
    "blockers": [
      {
        "issue": "Legal Review Pending",
        "severity": "medium",
        "context": "Standard T&C check, 3 days outstanding."
      }
    ],
    "strategies": [
      {
        "name": "Commitment Anchor",
        "script": "Hallo [Name], basierend auf unserem [Datum] Gespräch...",
        "focus": "Timeline Pressure"
      }
    ],
    "last_analyzed": "2025-12-07T10:00:00Z"
  }
]
```

### POST /api/closing-coach/analyze/{deal_id}

**Response:** Gleiche Struktur wie oben, mit aktualisierten Werten.

---

## 📊 Performance Insights

### POST /api/performance-insights/analyze

**Query Parameters:**
- `period_start`: ISO Date String (z.B. "2025-11-01T00:00:00Z")
- `period_end`: ISO Date String (z.B. "2025-11-30T23:59:59Z")

**Response-Struktur:**
```json
{
  "id": "mobile-insight",
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "kpis": {
    "revenue": 54000.0,
    "calls": 450,
    "deals": 22,
    "conversion_rate": 0.048,
    "revenue_trend": 12.5,
    "calls_trend": 7.1,
    "deals_trend": 10.0,
    "conversion_trend": -0.004
  },
  "time_series": {
    "labels": ["Woche 1", "Woche 2", "Woche 3", "Woche 4"],
    "calls": [100, 120, 90, 140],
    "deals": [4, 6, 3, 9]
  },
  "issues": [
    {
      "id": "issue_0",
      "title": "Conversion Drop",
      "severity": "high",
      "description": "Closing-Technik bei Einwandbehandlung überprüfen."
    }
  ],
  "recommendations": [
    {
      "id": "rec_0",
      "title": "Abschlussquote verbessern",
      "description": "Die Conversion ist im Vergleich zum Vormonat um 0.4% gesunken.",
      "priority": "high"
    }
  ]
}
```

### GET /api/performance-insights/my-insights

**Response:** Liste von PerformanceInsight-Objekten (wie bisher).

---

## 🏆 Gamification

### GET /api/gamification/achievements?mobile=true

**Query Parameter:**
- `mobile=true` - Gibt mobile-optimierte Response zurück

**Response-Struktur (mit mobile=true):**
```json
[
  {
    "id": "uuid",
    "name": "Erstes Closing",
    "description": "Du hast deinen ersten Deal abgeschlossen!",
    "emoji": "🎯",
    "progress": 1,
    "target": 1,
    "xp": 100
  }
]
```

### GET /api/gamification/daily-activities?days=7&mobile=true

**Query Parameter:**
- `days=7` - Anzahl Tage (1-30)
- `mobile=true` - Gibt mobile-optimierte Response zurück

**Response-Struktur (mit mobile=true):**
```json
[
  {
    "id": "uuid",
    "title": "20 Calls, 1 Deals",
    "date": "2025-12-07",
    "completed": true,
    "xp": 150,
    "current_streak": 3,
    "longest_streak": 5
  }
]
```

### POST /api/gamification/daily-activities/track

**Body (Mobile App):**
```json
{
  "id": "task-id",
  "completed": true
}
```

**Response:** DailyActivity-Objekt

### GET /api/gamification/leaderboard?mobile=true

**Query Parameter:**
- `mobile=true` - Gibt mobile-optimierte Response zurück

**Response-Struktur (mit mobile=true):**
```json
[
  {
    "id": "user-uuid",
    "rank": 1,
    "name": "Sarah M.",
    "points": 12500,
    "trend": 0
  }
]
```

---

## 🔌 API-Integration in Mobile Screens

### 1. Closing Coach Screen

**Ersetze Mock-Funktionen:**

```typescript
// In ClosingCoachScreen.tsx:
import { supabaseClient } from '@/lib/supabaseClient';

const fetchDeals = async (): Promise<ClosingInsight[]> => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch('/api/closing-coach/deals', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to fetch deals');
  return await response.json();
};

const analyzeDeal = async (dealId: string): Promise<ClosingInsight> => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`/api/closing-coach/analyze/${dealId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('Failed to analyze deal');
  return await response.json();
};
```

### 2. Performance Insights Screen

**Ersetze Mock-Funktionen:**

```typescript
// In PerformanceInsightsScreen.js:
const fetchInsight = async (periodKey, isRefresh = false) => {
  const { start, end } = getPeriodRange(periodKey);
  const qs = `?period_start=${start.toISOString()}&period_end=${end.toISOString()}`;

  const data = await apiFetch(
    `/api/performance-insights/analyze${qs}`,
    { method: 'POST' }
  );

  setInsight(data);
};
```

### 3. Gamification Screen

**Ersetze Mock-Funktionen:**

```typescript
// In GamificationScreen.js:
const loadGamificationData = async (isRefresh = false) => {
  // Achievements (mit mobile=true für optimierte Response)
  const ach = await apiFetch('/api/gamification/achievements?mobile=true');
  setAchievements(ach || []);

  // Daily activities (mit mobile=true)
  const acts = await apiFetch('/api/gamification/daily-activities?days=7&mobile=true');
  const activities = acts || [];

  // Leaderboard (mit mobile=true)
  const lb = await apiFetch('/api/gamification/leaderboard?mobile=true');
  setLeaderboard(lb || []);

  // Streaks aus Aktivitäten
  const currentStreak = activities[0]?.current_streak || 0;
  const longest = activities[0]?.longest_streak || 0;
  setStreak(currentStreak);
  setLongestStreak(longest);
};
```

---

## 🔧 API-Base-URL konfigurieren

### Option 1: Environment Variable

```typescript
// In config/api.ts oder ähnlich:
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Dann in apiFetch:
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  // ...
};
```

### Option 2: Supabase Client (falls Backend über Supabase)

```typescript
// Nutze Supabase RPC oder direkt Supabase Client
import { supabaseClient } from '@/lib/supabaseClient';

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  // ...
};
```

---

## ✅ Checkliste

- [x] Backend-Endpoints erweitert
- [x] Mobile-optimierte Response-Strukturen
- [ ] API-Base-URL konfiguriert
- [ ] Mock-Funktionen durch echte API-Calls ersetzt
- [ ] Error Handling implementiert
- [ ] Loading States getestet
- [ ] Offline-Fallback (optional)

---

## 🐛 Troubleshooting

### Problem: 401 Unauthorized
- Prüfe, ob `accessToken` korrekt gesetzt ist
- Prüfe, ob Session noch gültig ist
- Prüfe, ob `Authorization` Header korrekt formatiert ist

### Problem: 404 Not Found
- Prüfe API-Base-URL
- Prüfe, ob Backend läuft
- Prüfe, ob Router in `main.py` registriert ist

### Problem: Response-Struktur passt nicht
- Prüfe, ob Backend-Endpoint die mobile-optimierte Struktur zurückgibt
- Prüfe TypeScript-Interfaces im Screen
- Prüfe Mapping-Logik

---

**Die API-Integration ist bereit! 🚀**

