# 🔍 VOLLSTÄNDIGER SYSTEM-AUDIT - SALES FLOW AI

> **Erstellt:** 2024-12-04
> **Analysiert:** Frontend, Backend, Services, Migrationen

---

## 📊 EXECUTIVE SUMMARY

| Kategorie | Erwartet | Existiert | Status |
|-----------|----------|-----------|--------|
| **Tabellen (Core)** | ~140 | ~135 | ⚠️ 96% |
| **Views** | 3 | 3 | ✅ 100% |
| **API Endpoints** | 56 | 56 | ✅ 100% |
| **Kritische Spalten** | 18 | ~12 | ⚠️ 67% |

---

## 🔴 KRITISCHE ISSUES (JETZT FIXEN!)

### Issue #1: Fehlende Tabellen

| Tabelle | Referenziert in | Impact | Fix |
|---------|-----------------|--------|-----|
| `intent_events` | `agents/reactivation/nodes/signal_detection.py` | 🔴 Hoch | `AUDIT_FEHLENDE_TABELLEN.sql` |
| `interactions` | `agents/reactivation/nodes/perception.py` | 🔴 Hoch | `AUDIT_FEHLENDE_TABELLEN.sql` |
| `chat_feedback` | `docs/AI_CHAT.md` | 🟡 Mittel | `AUDIT_FEHLENDE_TABELLEN.sql` |
| `lead_events` | `docs/LEADS.md` | 🟡 Mittel | `AUDIT_FEHLENDE_TABELLEN.sql` |
| `tasks` | `services/proposalReminderService.js` | 🔴 Hoch | `AUDIT_FEHLENDE_TABELLEN.sql` |
| `user_business_profile` | `backend_app/domain/goals/adapters/` | 🟡 Mittel | `AUDIT_FEHLENDE_TABELLEN.sql` |

### Issue #2: Fehlende Spalten in `profiles`

| Spalte | Erwartet von | Impact | Fix |
|--------|--------------|--------|-----|
| `company_slug` | `AuthContext.js` | 🔴 Hoch | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `first_name` | `AuthContext.js` | 🔴 Hoch | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `last_name` | `AuthContext.js` | 🔴 Hoch | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `subscription_tier` | `AuthContext.js` | 🟡 Mittel | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `skill_level` | `AuthContext.js` | 🟡 Mittel | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `vertical` | `AuthContext.js` | 🟡 Mittel | `AUDIT_FEHLENDE_SPALTEN.sql` |

### Issue #3: Fehlende Spalten in anderen Tabellen

| Tabelle.Spalte | Erwartet von | Fix |
|----------------|--------------|-----|
| `companies.brand_config` | `AuthContext.js` | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `leads.first_name` | Data Import | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `leads.last_name` | Data Import | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `ai_interactions.lead_id` | AI Services | `AUDIT_FEHLENDE_SPALTEN.sql` |
| `ai_interactions.channel` | AI Services | `AUDIT_FEHLENDE_SPALTEN.sql` |

---

## ✅ EXISTIERENDE TABELLEN (Verifiziert)

### Core Tables
- [x] `profiles`
- [x] `companies`
- [x] `leads`
- [x] `contacts`

### Activities & Interactions
- [x] `activities`
- [x] `lead_activities`
- [x] `activity_log`
- [x] `ai_interactions`

### Follow-Ups
- [x] `follow_ups`
- [x] `follow_up_tasks`
- [x] `followups`
- [x] `lead_pending_actions`

### Daily Flow / DMO
- [x] `dmo_entries`
- [x] `daily_flow_status`
- [x] `daily_flows`
- [x] `daily_flow_actions`
- [x] `daily_flow_plans`
- [x] `daily_plans`
- [x] `daily_analytics`

### Goals
- [x] `goals`
- [x] `user_goals`
- [x] `company_goal_configs`
- [x] `user_daily_flow_targets`

### Team
- [x] `teams`
- [x] `team_members`
- [x] `team_broadcasts`
- [x] `team_nudges`
- [x] `team_templates`

### Scripts & Templates
- [x] `scripts`
- [x] `script_usage_logs`
- [x] `templates`
- [x] `template_performance`
- [x] `template_metrics`
- [x] `message_templates`
- [x] `sales_templates`

### Sequences
- [x] `sequences`
- [x] `sequence_steps`
- [x] `sequence_enrollments`
- [x] `sequence_actions`
- [x] `sequence_action_queue`
- [x] `sequence_daily_stats`
- [x] `email_tracking_events`
- [x] `email_accounts`

### Knowledge & Learning
- [x] `knowledge_items`
- [x] `knowledge_embeddings`
- [x] `company_knowledge`
- [x] `learning_events`
- [x] `learning_aggregates`
- [x] `learning_signals`
- [x] `learning_patterns`
- [x] `learning_cases`
- [x] `command_rules`

### Live Assist
- [x] `quick_facts`
- [x] `objection_responses`
- [x] `vertical_knowledge`
- [x] `live_assist_sessions`
- [x] `live_assist_queries`
- [x] `la_quick_facts`
- [x] `la_objection_responses`
- [x] `la_vertical_knowledge`
- [x] `la_sessions`
- [x] `la_queries`
- [x] `la_company_products`
- [x] `la_company_guardrails`
- [x] `la_intent_learning_patterns`
- [x] `la_objection_learning_patterns`

### Outreach & Messaging
- [x] `outreach_messages`
- [x] `outreach_campaigns`
- [x] `pulse_outreach_messages`
- [x] `messages`
- [x] `lead_messages`
- [x] `message_logs`
- [x] `voice_messages`
- [x] `conversations`
- [x] `communications`

### Ghost Buster
- [x] `ghost_buster_templates`
- [x] `ghost_followup_queue`

### Sales Intelligence
- [x] `ab_tests`
- [x] `ab_test_results`
- [x] `ab_experiment_assignments`
- [x] `ab_experiment_outcomes`
- [x] `framework_usage_stats`
- [x] `buyer_type_stats`
- [x] `industry_stats`
- [x] `momentum_signals`
- [x] `momentum_scores`
- [x] `deal_momentum_signals`
- [x] `deal_framework_usage`
- [x] `micro_coaching_logs`
- [x] `phone_mode_sessions`
- [x] `daily_effectiveness`
- [x] `vertical_configs`
- [x] `framework_effectiveness_daily`
- [x] `conversion_funnel_daily`
- [x] `cross_channel_strategies`
- [x] `performer_benchmarks`

### Personality & Contact Plans
- [x] `lead_personality_profiles`
- [x] `lead_behavior_profiles`
- [x] `lead_psychology_profiles`
- [x] `contact_plans`

### Autonomous Brain
- [x] `brain_decisions`
- [x] `brain_learnings`
- [x] `autopilot_settings`
- [x] `autopilot_actions`
- [x] `autopilot_drafts`
- [x] `lead_autopilot_overrides`

### Reactivation
- [x] `reactivation_runs`
- [x] `reactivation_drafts`
- [x] `reactivation_queue`
- [x] `lead_interactions_embeddings`

### Integrations
- [x] `user_integrations`
- [x] `oauth_states`
- [x] `channel_mappings`

### Feature Flags
- [x] `feature_flags`

### Notifications
- [x] `notifications`
- [x] `push_schedules`
- [x] `push_history`
- [x] `alerts`

### Gamification
- [x] `user_profiles`
- [x] `xp_events`
- [x] `user_achievements`
- [x] `achievement_definitions`
- [x] `user_streaks`
- [x] `user_wins`

### Finance
- [x] `finance_transactions`
- [x] `finance_accounts`
- [x] `finance_goals`
- [x] `finance_recurring`
- [x] `finance_tax_profiles`
- [x] `finance_mileage_log`
- [x] `finance_exports`

### Billing
- [x] `subscriptions`
- [x] `subscription_items`
- [x] `invoices`
- [x] `usage_records`
- [x] `items`
- [x] `monthly_offers`

### Company Settings
- [x] `company_settings`
- [x] `company_products`
- [x] `company_stories`
- [x] `company_guardrails`

### User Settings
- [x] `user_settings`
- [x] `user_onboarding`
- [x] `user_territories`
- [x] `user_corrections`
- [x] `intent_corrections`
- [x] `user_company_selections`
- [x] `compensation_plan_cache`

### Chat Import
- [x] `imported_chats`
- [x] `extracted_objections`

### Phoenix (Retention)
- [x] `phoenix_sessions`
- [x] `phoenix_alerts`
- [x] `retention_contacts`

### Collective Intelligence
- [x] `collective_insights`
- [x] `collective_adoptions`
- [x] `rule_applications`

### Sales Brain
- [x] `sales_brain_rules`
- [x] `sales_brain_feedback`

### Field Visits
- [x] `field_visits`

### Import
- [x] `import_logs`

---

## ✅ VIEWS (Verifiziert)

- [x] `view_leads_full_context`
- [x] `view_contact_plan_stats`
- [x] `v_pending_proposal_reminders`

---

## 🚀 FIX-ANLEITUNG

### Schritt 1: Fehlende Tabellen erstellen

```sql
-- In Supabase SQL Editor ausführen:
\i AUDIT_FEHLENDE_TABELLEN.sql
```

### Schritt 2: Fehlende Spalten hinzufügen

```sql
-- In Supabase SQL Editor ausführen:
\i AUDIT_FEHLENDE_SPALTEN.sql
```

### Schritt 3: Verifizieren

```sql
-- Alle Tabellen zählen
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Kritische Tabellen prüfen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'leads', 'contacts', 'tasks', 
    'interactions', 'intent_events', 'user_business_profile'
)
ORDER BY table_name;

-- Profiles Spalten prüfen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

---

## 📋 MIGRATIONS-REIHENFOLGE

Wenn du alle Migrationen neu ausführen musst:

```
1. COMPLETE_SCHEMA_MIGRATION.sql (Basis ~140 Tabellen)
2. AUDIT_FEHLENDE_TABELLEN.sql (6 zusätzliche Tabellen)
3. AUDIT_FEHLENDE_SPALTEN.sql (18 zusätzliche Spalten)
4. Seed-Daten (scripts, companies, etc.)
```

---

## 🎯 NÄCHSTE SCHRITTE

1. ⬜ Führe `AUDIT_FEHLENDE_TABELLEN.sql` aus
2. ⬜ Führe `AUDIT_FEHLENDE_SPALTEN.sql` aus
3. ⬜ Verifiziere mit den SQL-Queries oben
4. ⬜ Teste Frontend-Funktionen:
   - Login & Onboarding
   - Lead Import
   - DMO Tracker
   - Live Assist
   - Sales Brain

---

## 📞 SUPPORT

Bei Problemen:
1. Prüfe die Supabase Logs
2. Prüfe die Backend-Logs (`/backend/app/main.py`)
3. Prüfe Browser Console für Frontend-Fehler


