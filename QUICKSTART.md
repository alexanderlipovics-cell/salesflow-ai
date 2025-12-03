# ⚡ Sales Flow AI Dashboard - QUICKSTART

> Von 0 auf Production-Ready Dashboard in **10 Minuten**

---

## 🎯 Was du bekommst

Ein vollständiges Analytics Dashboard mit:
- 📊 **Today Dashboard** (Tasks, Leads, Signups, Revenue)
- 📅 **Week Overview** mit Chart
- 🏆 **Top Templates** nach Conversion
- 👥 **Squad Coach** (Top Performer + Needs Help)
- ⏱️ **Funnel Stats** (Zeit bis Signup)

---

## 🚀 3-Schritt Installation

### ⏱️ STEP 1: Database Setup (5 Min)

1. **Öffne Supabase Dashboard**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt

2. **SQL Editor öffnen**
   - Linkes Menü → "SQL Editor"
   - Klick "New Query"

3. **RPC Functions erstellen**
   ```sql
   -- Öffne: backend/supabase/migrations/001_dashboard_rpc_functions.sql
   -- Copy GESAMTEN Inhalt
   -- Paste in SQL Editor
   -- Klick RUN ▶️
   ```

4. **Indexes erstellen**
   ```sql
   -- Öffne: backend/supabase/migrations/002_dashboard_indexes.sql
   -- Copy GESAMTEN Inhalt
   -- Paste in SQL Editor
   -- Klick RUN ▶️
   ```

5. **Testen (Optional)**
   ```sql
   -- Quick Test:
   SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
   -- Ersetze YOUR_WORKSPACE_ID mit echter UUID
   ```

✅ **Done!** Database ist fertig.

---

### ⏱️ STEP 2: Frontend Setup (3 Min)

1. **Dependencies installieren**
   ```bash
   cd sales-flow-ai
   npm install @supabase/supabase-js
   ```

2. **Environment Variables**
   ```bash
   # Erstelle .env.local (Next.js) oder .env (CRA)
   touch .env.local
   ```

   ```env
   # In .env.local eintragen:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   > **Credentials findest du hier:**
   > Supabase Dashboard → Settings → API

3. **Dateien prüfen**
   ```bash
   # Sollten existieren:
   sales-flow-ai/types/dashboard.ts                 ✅
   sales-flow-ai/hooks/useDashboardData.ts          ✅
   sales-flow-ai/components/dashboard/DashboardPage.tsx ✅
   ```

✅ **Done!** Frontend ist fertig.

---

### ⏱️ STEP 3: Dashboard verwenden (2 Min)

**Variante A: Next.js App Router**

```tsx
// app/dashboard/page.tsx
'use client';

import { DashboardPage } from '@/components/dashboard/DashboardPage';

export default function Dashboard() {
  const workspaceId = 'your-workspace-uuid-here'; // TODO: Get from auth
  
  return <DashboardPage workspaceId={workspaceId} />;
}
```

**Variante B: Next.js Pages Router**

```tsx
// pages/dashboard.tsx
import { DashboardPage } from '@/components/dashboard/DashboardPage';

export default function Dashboard() {
  const workspaceId = 'your-workspace-uuid-here';
  
  return <DashboardPage workspaceId={workspaceId} />;
}
```

**Variante C: Create React App**

```tsx
// src/pages/Dashboard.tsx
import { DashboardPage } from './components/dashboard/DashboardPage';

export default function Dashboard() {
  const workspaceId = 'your-workspace-uuid-here';
  
  return <DashboardPage workspaceId={workspaceId} />;
}
```

✅ **Done!** Dashboard läuft!

---

## 🧪 Testen

1. **Dev Server starten**
   ```bash
   npm run dev
   ```

2. **Dashboard öffnen**
   ```
   http://localhost:3000/dashboard
   ```

3. **Sollte zeigen:**
   - ✅ Today Overview Kacheln
   - ✅ Heute fällige Tasks
   - ✅ Wochen-Chart
   - ✅ Top Templates
   - ✅ Squad Coach Panel

---

## 🐛 Troubleshooting

### ❌ "Function does not exist"

**Problem:** RPC Functions wurden nicht erstellt

**Lösung:**
```sql
-- In Supabase SQL Editor nochmal ausführen:
-- backend/supabase/migrations/001_dashboard_rpc_functions.sql
```

Verifiziere:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'dashboard_%';

-- Sollte 8 Functions zeigen
```

---

### ❌ "No data returned"

**Problem:** Keine Events/Tasks in der Database

**Lösung:**
```sql
-- Check ob Daten existieren:
SELECT count(*) FROM events WHERE workspace_id = 'YOUR_WORKSPACE_ID';
SELECT count(*) FROM tasks WHERE workspace_id = 'YOUR_WORKSPACE_ID';

-- Falls 0: Erstelle Test-Daten oder warte auf echte User Activity
```

---

### ❌ "Supabase credentials missing"

**Problem:** Environment Variables nicht gesetzt

**Lösung:**
```bash
# 1. Prüfe ob .env.local existiert
ls -la .env.local

# 2. Prüfe Inhalt
cat .env.local

# 3. Restart Dev Server
npm run dev
```

---

### ❌ Dashboard lädt unendlich

**Problem:** Falsche workspace_id oder fehlende Permissions

**Lösung:**
```sql
-- 1. Finde eine gültige workspace_id:
SELECT DISTINCT workspace_id FROM events LIMIT 1;

-- 2. Prüfe RLS Policies:
SELECT * FROM pg_policies WHERE tablename = 'events';
```

---

## 📊 Performance Check

Nach dem Deployment solltest du folgende Performance haben:

```sql
-- Run Performance Test:
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');

-- Expected Output:
-- Execution Time: < 100ms ✅
-- Planning Time: < 10ms ✅
```

Falls langsamer:
```sql
-- 1. Check Indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- 2. Run VACUUM
VACUUM ANALYZE public.events;
VACUUM ANALYZE public.tasks;
```

---

## 🎨 Customization

### Dashboard anpassen

```tsx
// Eigene Farben, Layout, etc.
import { useDashboard } from '@/hooks/useDashboardData';

function MyCustomDashboard({ workspaceId }) {
  const dashboard = useDashboard(workspaceId);
  
  return (
    <div className="my-custom-layout">
      {/* Nur Today Overview zeigen */}
      <div>Tasks: {dashboard.todayOverview?.tasks_due_today}</div>
      <div>Leads: {dashboard.todayOverview?.leads_created_today}</div>
      
      {/* Oder volle Komponente */}
      <DashboardPage workspaceId={workspaceId} />
    </div>
  );
}
```

### Auto-Refresh aktivieren

```tsx
import { useDashboardRefresh } from '@/hooks/useDashboardData';

function LiveDashboard({ workspaceId }) {
  // Auto-refresh every 60 seconds
  const dashboard = useDashboardRefresh(workspaceId, 60000);
  
  return <DashboardPage workspaceId={workspaceId} />;
}
```

---

## 📚 Nächste Schritte

1. **Lies die vollständige Doku:**
   - [DASHBOARD_ANALYTICS_README.md](DASHBOARD_ANALYTICS_README.md)
   - [DEPLOYMENT_GUIDE.md](backend/supabase/DEPLOYMENT_GUIDE.md)

2. **Schau dir Examples an:**
   - [USAGE_EXAMPLES.md](sales-flow-ai/USAGE_EXAMPLES.md)

3. **Implementiere Features:**
   - [ ] Real-time Updates
   - [ ] Date Range Picker
   - [ ] Export Funktionen
   - [ ] Advanced Filtering

---

## ✅ Deployment Checklist

### Database ✅
- [x] RPC Functions erstellt (8 Functions)
- [x] Performance Indexes erstellt
- [x] Test Query erfolgreich

### Frontend ✅
- [x] Dependencies installiert
- [x] Environment Variables gesetzt
- [x] Dashboard Component läuft

### Testing ✅
- [x] Dev Server läuft
- [x] Dashboard zeigt Daten
- [x] Performance < 500ms

---

## 🎉 Done!

**Dein Dashboard ist live!**

Bei Fragen: Lies die [vollständige Dokumentation](DASHBOARD_ANALYTICS_README.md)

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Geschätzte Setup-Zeit:** 10 Minuten

