# Datenbank-Analyse: SalesFlow AI

**Datum:** 2025-01-15  
**Status:** KRITISCH - Viele Probleme identifiziert

---

## 1. TABELLEN-ÜBERSICHT

### 1.1 Auth & User Management

#### ✅ **auth.users** (Supabase System-Tabelle)
- **Status:** ✅ AKTIV - Wird verwendet
- **Zweck:** Supabase Auth System
- **Beziehung:** Master-Tabelle für alle User
- **Problem:** Keine direkte App-Zugriffe, nur über Supabase Auth API

#### ⚠️ **users** (App-Tabelle)
- **Status:** ⚠️ PROBLEMATISCH
- **Zweck:** Eigene User-Tabelle mit `password_hash`
- **Spalten:** `id`, `email`, `password_hash`, `name`, `company`, `role`, `is_active`
- **Problem:** 
  - **DUPLIKAT** zu `auth.users`
  - `password_hash` wird NICHT mehr verwendet (Login über Supabase Auth)
  - Referenzen: `token_blacklist.user_id` → `users.id` (falsch, sollte `auth.users.id` sein)
- **Empfehlung:** 
  - **OPTION A:** Löschen, alles über `auth.users` + `profiles`
  - **OPTION B:** Behalten als App-spezifische Metadaten, aber `password_hash` entfernen

#### ❓ **profiles** (App-Tabelle)
- **Status:** ❓ UNKLAR - Wird erwähnt, aber keine CREATE TABLE gefunden
- **Zweck:** User-Profil-Daten (Onboarding, Verticals, etc.)
- **Problem:** 
  - Tabelle wird in Code verwendet, aber keine Migration gefunden
  - Wird nur in ALTER TABLE Statements erwähnt
  - Trigger erstellt Einträge mit `id = auth.users.id`
- **Empfehlung:** Migration erstellen oder finden

#### ✅ **user_learning_profile**
- **Status:** ✅ AKTIV
- **Zweck:** AI Learning Profile (Ebene 1)
- **Beziehung:** `user_id UUID NOT NULL UNIQUE` (vermutlich `auth.users.id`)

#### ✅ **user_business_profile**
- **Status:** ✅ AKTIV
- **Zweck:** Business Profile für Goal Engine
- **Beziehung:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`

#### ✅ **sales_agent_personas**
- **Status:** ✅ AKTIV
- **Beziehung:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`

#### ✅ **sales_company_knowledge**
- **Status:** ✅ AKTIV
- **Beziehung:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`

#### ⚠️ **sales_rep_profiles**
- **Status:** ⚠️ PROBLEMATISCH
- **Problem:** `user_id UUID NOT NULL` - **KEIN FOREIGN KEY** zu `auth.users`
- **Empfehlung:** Foreign Key hinzufügen

### 1.2 Lead Management

#### ✅ **leads** (Haupttabelle)
- **Status:** ✅ AKTIV
- **Zweck:** Haupt-Lead-Tabelle
- **Beziehungen:** Viele Tabellen referenzieren `leads.id`

#### ✅ **lead_verifications**
- **Status:** ✅ AKTIV
- **Beziehung:** `lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE`

#### ✅ **lead_enrichments**
- **Status:** ✅ AKTIV
- **Beziehung:** `lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE`

#### ✅ **lead_intents**
- **Status:** ✅ AKTIV
- **Beziehung:** `lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE`

#### ✅ **lead_interactions**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `user_id uuid references auth.users(id) on delete cascade`
  - `lead_id uuid references leads(id) on delete cascade`

#### ✅ **lead_assignments**
- **Status:** ✅ AKTIV
- **Beziehung:** `lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE`

### 1.3 Messaging & Communication

#### ✅ **dm_conversations**
- **Status:** ✅ AKTIV
- **Beziehung:** `contact_id UUID REFERENCES public.leads(id) ON DELETE SET NULL`
- **Problem:** `user_id UUID NOT NULL` - **KEIN FOREIGN KEY**

#### ✅ **dm_messages**
- **Status:** ✅ AKTIV
- **Beziehung:** `conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE`

#### ✅ **message_events**
- **Status:** ✅ AKTIV

#### ✅ **email_accounts**
- **Status:** ✅ AKTIV
- **Beziehung:** `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`

#### ✅ **emails**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
  - `email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE`
  - `lead_id UUID REFERENCES leads(id) ON DELETE SET NULL`

#### ✅ **email_threads**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
  - `lead_id UUID REFERENCES leads(id) ON DELETE SET NULL`

### 1.4 OAuth & Integrations

#### ✅ **oauth_tokens**
- **Status:** ✅ AKTIV
- **Beziehung:** `user_id UUID NOT NULL` - **KEIN FOREIGN KEY**

#### ✅ **webhook_subscriptions**
- **Status:** ✅ AKTIV

#### ✅ **webhook_events_log**
- **Status:** ✅ AKTIV
- **Beziehung:** `subscription_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE SET NULL`

### 1.5 AI & Learning

#### ✅ **user_session_cache**
- **Status:** ✅ AKTIV

#### ✅ **rlhf_feedback_sessions**
- **Status:** ✅ AKTIV

#### ✅ **training_data_pool**
- **Status:** ✅ AKTIV

#### ✅ **knowledge_graph_nodes**
- **Status:** ✅ AKTIV

#### ✅ **knowledge_graph_edges**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `source_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE`
  - `target_node_id UUID NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE`

#### ✅ **global_insights**
- **Status:** ✅ AKTIV

### 1.6 Content & Templates

#### ✅ **sales_content**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `company_id UUID REFERENCES companies(id) ON DELETE CASCADE`
  - `created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`

#### ✅ **message_templates**
- **Status:** ✅ AKTIV

#### ✅ **template_performance**
- **Status:** ✅ AKTIV

#### ✅ **sales_scenarios**
- **Status:** ✅ AKTIV

### 1.7 Follow-up & Automation

#### ✅ **followup_tasks**
- **Status:** ✅ AKTIV

#### ✅ **followup_rules**
- **Status:** ✅ AKTIV
- **Beziehung:** `template_key text references message_templates(template_key)`

#### ✅ **followup_suggestions**
- **Status:** ✅ AKTIV
- **Beziehung:** 
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `lead_id uuid not null references leads(id) on delete cascade`
  - `template_key text references message_templates(template_key)`

### 1.8 Settings & Configuration

#### ✅ **autopilot_settings**
- **Status:** ✅ AKTIV

#### ✅ **consent_records**
- **Status:** ✅ AKTIV

#### ✅ **cookie_categories**
- **Status:** ✅ AKTIV

#### ✅ **deployment_runs**
- **Status:** ✅ AKTIV

---

## 2. BEZIEHUNGEN & FOREIGN KEYS

### 2.1 ✅ Korrekte Foreign Keys

- `lead_verifications.lead_id` → `leads.id`
- `lead_enrichments.lead_id` → `leads.id`
- `lead_intents.lead_id` → `leads.id`
- `lead_interactions.lead_id` → `leads.id`
- `lead_assignments.lead_id` → `leads.id`
- `user_business_profile.user_id` → `auth.users.id`
- `sales_agent_personas.user_id` → `auth.users.id`
- `sales_company_knowledge.user_id` → `auth.users.id`
- `email_accounts.user_id` → `auth.users.id`
- `emails.user_id` → `auth.users.id`
- `email_threads.user_id` → `auth.users.id`
- `followup_suggestions.user_id` → `auth.users.id`
- `followup_suggestions.lead_id` → `leads.id`
- `knowledge_graph_edges.source_node_id` → `knowledge_graph_nodes.id`
- `knowledge_graph_edges.target_node_id` → `knowledge_graph_nodes.id`

### 2.2 ❌ Fehlende Foreign Keys

1. **sales_rep_profiles.user_id** → `auth.users.id`
   - **Problem:** Nur Kommentar "Referenz zum auth.users", kein FK
   - **Fix:** `ALTER TABLE sales_rep_profiles ADD CONSTRAINT fk_sales_rep_profiles_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`

2. **dm_conversations.user_id** → `auth.users.id`
   - **Problem:** `user_id UUID NOT NULL` ohne FK
   - **Fix:** `ALTER TABLE dm_conversations ADD CONSTRAINT fk_dm_conversations_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`

3. **oauth_tokens.user_id** → `auth.users.id`
   - **Problem:** `user_id UUID NOT NULL` ohne FK
   - **Fix:** `ALTER TABLE oauth_tokens ADD CONSTRAINT fk_oauth_tokens_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`

4. **token_blacklist.user_id** → `users.id` (FALSCH!)
   - **Problem:** Referenziert `users.id` statt `auth.users.id`
   - **Fix:** Migration erstellen um FK zu ändern

### 2.3 ⚠️ Inkonsistente Referenzen

- **users vs auth.users:** Viele Tabellen verwenden `auth.users.id`, aber `users` Tabelle existiert parallel
- **profiles:** Wird verwendet, aber keine klare Beziehung definiert

---

## 3. DUPLIKATE & REDUNDANZEN

### 3.1 ❌ KRITISCH: users vs auth.users

**Problem:**
- Zwei User-Tabellen existieren parallel
- `users` Tabelle mit `password_hash` (nicht mehr verwendet)
- `auth.users` ist die echte Auth-Quelle
- Code verwendet beide

**Lösung:**
1. **Option A (Empfohlen):** `users` Tabelle löschen
   - Alle Referenzen auf `auth.users.id` umstellen
   - `profiles` als einzige App-User-Tabelle verwenden
   - `token_blacklist.user_id` auf `auth.users.id` ändern

2. **Option B:** `users` Tabelle behalten als Metadaten
   - `password_hash` Spalte entfernen
   - `users.id` sollte `auth.users.id` sein (1:1 Beziehung)
   - Foreign Key: `users.id` → `auth.users.id`

### 3.2 ❓ profiles Tabelle

**Problem:**
- Wird im Code verwendet (`supabase.table("profiles")`)
- Wird in ALTER TABLE Statements erwähnt
- **KEINE CREATE TABLE Migration gefunden**
- Trigger erstellt Einträge mit `id = auth.users.id`

**Empfehlung:**
- Migration erstellen die `profiles` Tabelle definiert
- Oder bestehende Migration finden
- Klare Beziehung: `profiles.id` = `auth.users.id` (1:1)

### 3.3 ⚠️ Mehrfache Profile-Tabellen

- `profiles` (Onboarding, Verticals)
- `user_learning_profile` (AI Learning)
- `user_business_profile` (Goal Engine)
- `sales_rep_profiles` (Lead Assignment)
- `sales_agent_personas` (AI Persona)

**Empfehlung:** Dokumentieren welche Tabelle wofür ist

---

## 4. AUTH-FLOW ANALYSE

### 4.1 Aktueller Flow (PROBLEMATISCH)

```
1. Frontend: supabase.auth.signUp()
   → Erstellt User in auth.users
   → Trigger erstellt Eintrag in profiles (wenn Migration ausgeführt)

2. Backend: /signup Endpoint
   → Erstellt User in users Tabelle
   → Erstellt Eintrag in profiles Tabelle
   → Problem: Zwei User-Einträge!

3. Login: /login Endpoint
   → Nutzt jetzt Supabase Auth API ✅
   → Holt User-Daten aus users Tabelle (falls vorhanden)
   → Problem: users Tabelle kann leer sein!
```

### 4.2 Empfohlener Flow

```
1. Frontend: supabase.auth.signUp()
   → Erstellt User in auth.users
   → Trigger erstellt Eintrag in profiles

2. Backend: /signup Endpoint (optional, für Legacy)
   → Erstellt User in auth.users (über Supabase Auth API)
   → Erstellt Eintrag in profiles
   → NICHT in users Tabelle!

3. Login: /login Endpoint
   → Supabase Auth API ✅
   → User-Daten aus profiles (nicht users)
```

### 4.3 Beziehungen

```
auth.users (Master)
  ├── profiles (1:1, id = auth.users.id)
  ├── user_learning_profile (1:1, user_id = auth.users.id)
  ├── user_business_profile (1:1, user_id = auth.users.id)
  ├── sales_agent_personas (1:1, user_id = auth.users.id)
  ├── sales_company_knowledge (1:1, user_id = auth.users.id)
  └── sales_rep_profiles (1:1, user_id = auth.users.id)

users (DEPRECATED - sollte gelöscht werden)
  └── token_blacklist (user_id → users.id) ❌ FALSCH
```

---

## 5. FEHLENDE CONSTRAINTS

### 5.1 NOT NULL Constraints

1. **sales_rep_profiles.user_id** → `NOT NULL` vorhanden, aber kein FK
2. **dm_conversations.user_id** → `NOT NULL` vorhanden, aber kein FK
3. **oauth_tokens.user_id** → `NOT NULL` vorhanden, aber kein FK

### 5.2 CHECK Constraints

- ✅ Viele Tabellen haben CHECK Constraints (z.B. `platform IN (...)`)
- ✅ `user_learning_profile` hat gute CHECK Constraints

### 5.3 UNIQUE Constraints

- ✅ `user_learning_profile.user_id` → `UNIQUE` ✅
- ✅ `user_business_profile.user_id` → `UNIQUE` (implizit durch FK)
- ❓ `profiles.id` → Sollte UNIQUE sein (ist Primary Key)

### 5.4 Indexes

- ✅ Viele Tabellen haben Indexes
- ⚠️ Prüfen ob alle Foreign Keys indexiert sind

---

## 6. KONKRETE PROBLEME

### 6.1 ❌ KRITISCH: users Tabelle

**Problem:**
- `password_hash` wird nicht mehr verwendet
- Duplikat zu `auth.users`
- `token_blacklist` referenziert falsche Tabelle

**Fix:**
```sql
-- Option A: Löschen
DROP TABLE IF EXISTS token_blacklist CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Option B: Umstellen
ALTER TABLE token_blacklist 
  DROP CONSTRAINT token_blacklist_user_id_fkey;
ALTER TABLE token_blacklist 
  ADD CONSTRAINT token_blacklist_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### 6.2 ❌ KRITISCH: profiles Tabelle fehlt Definition

**Problem:**
- Tabelle wird verwendet, aber keine CREATE TABLE Migration

**Fix:**
```sql
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    vertical_id TEXT,
    skill_level TEXT,
    company_name TEXT,
    company_id UUID,
    company_slug TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    language_code TEXT DEFAULT 'de',
    region_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 ⚠️ Fehlende Foreign Keys

**Fix:**
```sql
-- sales_rep_profiles
ALTER TABLE sales_rep_profiles 
  ADD CONSTRAINT fk_sales_rep_profiles_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- dm_conversations
ALTER TABLE dm_conversations 
  ADD CONSTRAINT fk_dm_conversations_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- oauth_tokens
ALTER TABLE oauth_tokens 
  ADD CONSTRAINT fk_oauth_tokens_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### 6.4 ⚠️ user_learning_profile.user_id

**Problem:**
- `user_id UUID NOT NULL UNIQUE` aber **KEIN FOREIGN KEY**

**Fix:**
```sql
ALTER TABLE user_learning_profile 
  ADD CONSTRAINT fk_user_learning_profile_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

## 7. EMPFOHLENE VEREINFACHUNGEN

### 7.1 Auth-System vereinfachen

**Aktuell:**
- `auth.users` (Supabase)
- `users` (App, deprecated)
- `profiles` (App)

**Empfohlen:**
- `auth.users` (Supabase, Master)
- `profiles` (App, 1:1 mit auth.users)

**Aktion:**
1. `users` Tabelle löschen oder umstellen
2. Alle Code-Referenzen auf `profiles` umstellen
3. `token_blacklist` auf `auth.users.id` umstellen

### 7.2 Profile-Tabellen dokumentieren

**Erstellen:**
- `docs/PROFILE_TABLES.md` mit Übersicht:
  - `profiles` → Onboarding, Verticals, Company
  - `user_learning_profile` → AI Learning
  - `user_business_profile` → Goal Engine
  - `sales_rep_profiles` → Lead Assignment
  - `sales_agent_personas` → AI Persona

### 7.3 Foreign Keys standardisieren

**Regel:**
- Alle `user_id` Spalten → `auth.users.id` mit FK
- Alle `lead_id` Spalten → `leads.id` mit FK
- ON DELETE CASCADE für User-Daten
- ON DELETE SET NULL für optionale Lead-Referenzen

---

## 8. TABELLEN-STATUS ZUSAMMENFASSUNG

### ✅ BEHALTEN (Aktiv genutzt)

- `auth.users` (Supabase System)
- `profiles` (nach Migration-Fix)
- `user_learning_profile`
- `user_business_profile`
- `sales_agent_personas`
- `sales_company_knowledge`
- `sales_rep_profiles` (nach FK-Fix)
- Alle `lead_*` Tabellen
- Alle `dm_*` Tabellen
- Alle `email_*` Tabellen
- Alle OAuth/Webhook Tabellen
- Alle AI/Learning Tabellen

### ⚠️ ÜBERARBEITEN

- `users` → Löschen oder umstellen
- `token_blacklist` → FK auf `auth.users.id` ändern

### ❓ PRÜFEN

- `profiles` → CREATE TABLE Migration erstellen
- Alle Tabellen ohne Foreign Keys → FK hinzufügen

---

## 9. PRIORITÄTEN

### 🔴 HOCH (Sofort fixen)

1. **profiles Tabelle definieren** (CREATE TABLE Migration)
2. **users Tabelle löschen oder umstellen**
3. **token_blacklist.user_id** auf `auth.users.id` ändern
4. **Fehlende Foreign Keys hinzufügen**

### 🟡 MITTEL (Bald fixen)

1. **Dokumentation** der Profile-Tabellen
2. **Indexes prüfen** für alle Foreign Keys
3. **RLS Policies** für neue Tabellen

### 🟢 NIEDRIG (Später)

1. **Code-Refactoring** um `users` Tabelle zu entfernen
2. **Performance-Optimierung** der Queries
3. **Archivierung** alter Daten

---

## 10. NÄCHSTE SCHRITTE

1. ✅ Migration für `profiles` CREATE TABLE erstellen
2. ✅ Migration für Foreign Keys erstellen
3. ✅ Migration für `users` Tabelle (löschen oder umstellen)
4. ✅ Code-Refactoring um `users` Tabelle zu entfernen
5. ✅ Dokumentation aktualisieren

---

**Ende der Analyse**

