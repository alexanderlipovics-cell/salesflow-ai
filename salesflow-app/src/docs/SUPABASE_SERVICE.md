# 🗄️ Sales Flow AI - Supabase Service

> **Technische Dokumentation** | Version 1.0  
> Datenbank-Verbindung & Konfiguration

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Konfiguration](#-konfiguration)
3. [Client-Setup](#-client-setup)
4. [Nutzung](#-nutzung)

---

## 🎯 Überblick

Der **Supabase Service** stellt die Datenbankverbindung bereit:

- ✅ PostgreSQL-Datenbank
- ✅ Row Level Security (RLS)
- ✅ Auth mit AsyncStorage-Persistenz
- ✅ Auto-Refresh Token

---

## ⚙️ Konfiguration

**Datei:** `src/services/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://lncwvbhcafkdorypnpnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,       // Session in AsyncStorage speichern
    autoRefreshToken: true,      // Token automatisch erneuern
    persistSession: true,        // Session persistieren
    detectSessionInUrl: false,   // Nicht für React Native
  },
});
```

---

## 🔧 Client-Optionen

| Option | Wert | Beschreibung |
|--------|------|--------------|
| `storage` | `AsyncStorage` | Session-Speicher für React Native |
| `autoRefreshToken` | `true` | Token vor Ablauf automatisch erneuern |
| `persistSession` | `true` | Session beim Neustart wiederherstellen |
| `detectSessionInUrl` | `false` | Deaktiviert für mobile Apps |

---

## 🚀 Nutzung

### Auth

```javascript
import { supabase } from '../services/supabase';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Logout
await supabase.auth.signOut();

// Session holen
const { data: { session } } = await supabase.auth.getSession();
```

### Datenbank-Abfragen

```javascript
// Leads laden
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('user_id', userId);

// Lead erstellen
const { data, error } = await supabase
  .from('leads')
  .insert({ name: 'Max', status: 'new', user_id: userId });

// Lead aktualisieren
const { data, error } = await supabase
  .from('leads')
  .update({ status: 'qualified' })
  .eq('id', leadId);
```

### Realtime (optional)

```javascript
// Änderungen abonnieren
const subscription = supabase
  .channel('leads-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leads'
  }, (payload) => {
    console.log('Change:', payload);
  })
  .subscribe();
```

---

## 📊 Verfügbare Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `leads` | Lead-Daten |
| `follow_up_tasks` | Follow-up Tasks |
| `company_intelligence` | Firmendaten |
| `objection_library` | Einwand-Bibliothek |
| `success_stories` | Erfolgsgeschichten |
| `auto_reminder_config` | Reminder-Konfiguration |

---

## 🔒 Row Level Security

Alle Tabellen haben RLS aktiviert:

```sql
-- User sieht nur eigene Daten
CREATE POLICY "users_own_data"
ON leads FOR SELECT
USING (user_id = auth.uid());
```

---

## 📚 Abhängigkeiten

```json
{
  "@supabase/supabase-js": "^2.x",
  "@react-native-async-storage/async-storage": "^1.x"
}
```

---

## 🔧 Extending this Module

### Konventionen für neue Tabellen

```sql
-- Template für neue Tabelle
CREATE TABLE new_table (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamps (immer dabei)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ownership (für RLS)
  created_by UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  
  -- Daten
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  
  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Trigger für updated_at
CREATE TRIGGER update_timestamp
  BEFORE UPDATE ON new_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS aktivieren
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### RLS Policy Beispiele

```sql
-- 1. User sieht nur eigene Workspace-Daten
CREATE POLICY "workspace_isolation" ON new_table
FOR ALL USING (
  workspace_id = (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  )
);

-- 2. User sieht nur eigene Einträge
CREATE POLICY "owner_only" ON new_table
FOR ALL USING (created_by = auth.uid());

-- 3. Team Lead sieht Team-Daten
CREATE POLICY "team_access" ON new_table
FOR SELECT USING (
  created_by IN (
    SELECT user_id FROM workspace_users 
    WHERE team_id = (
      SELECT team_id FROM workspace_users WHERE user_id = auth.uid()
    )
  )
);

-- 4. Admin sieht alles im Workspace
CREATE POLICY "admin_all_access" ON new_table
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_users 
    WHERE user_id = auth.uid() 
    AND workspace_id = new_table.workspace_id
    AND role = 'admin'
  )
);
```

### Migrations-Strategie

```
backend/migrations/
├── 001_initial_schema.sql
├── 002_followup_templates.sql
├── 003_power_up_system.sql
├── 004_complete_rls_policies.sql
├── 005_follow_up_tasks_table.sql
├── 006_auto_reminder_trigger.sql
└── XXX_new_feature.sql   ← Neue Migration

Naming: {nummer}_{feature_name}.sql
Rollout: Sequentiell, keine Überspringung
```

### Rollback-Strategie

```sql
-- Jede Migration sollte Rollback-Kommentare haben
-- ROLLBACK:
-- DROP TABLE IF EXISTS new_table;
-- DROP FUNCTION IF EXISTS new_function();
-- DROP TRIGGER IF EXISTS new_trigger ON parent_table;
```

### Updated_at Trigger (wiederverwendbar)

```sql
-- Einmal erstellen, für alle Tabellen nutzen
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Checkliste für neue Tabelle

- [ ] Migration-Datei erstellt
- [ ] Primary Key (UUID)
- [ ] Timestamps (created_at, updated_at)
- [ ] Ownership-Spalten (user_id, workspace_id)
- [ ] RLS aktiviert
- [ ] RLS Policies erstellt
- [ ] Updated_at Trigger erstellt
- [ ] Indexes für häufige Queries
- [ ] Rollback-Kommentare

---

> **Erstellt für Sales Flow AI** | Supabase Service

