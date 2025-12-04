# 📋 VOLLSTÄNDIGE TABELLEN-INVENTUR - SALES FLOW AI

> Erstellt: 2024-12-04  
> Gefunden durch Code-Analyse: `grep -r "\.table\(" | unique`

---

## 📊 ZUSAMMENFASSUNG

| Kategorie | Anzahl |
|-----------|--------|
| **Core Tables** | 6 |
| **Leads & Contacts** | 2 |
| **Activities** | 4 |
| **Follow-Ups** | 4 |
| **Daily Flow / DMO** | 7 |
| **Goals** | 3 |
| **Team** | 5 |
| **Scripts & Templates** | 7 |
| **Sequences** | 8 |
| **Scheduled Jobs** | 1 |
| **Knowledge & Learning** | 8 |
| **Teach System** | 1 |
| **Live Assist** | 14 |
| **Outreach & Messaging** | 8 |
| **Ghost Buster** | 2 |
| **Sales Intelligence** | 19 |
| **Personality Profiles** | 4 |
| **Autonomous Brain** | 5 |
| **Integrations** | 3 |
| **Feature Flags** | 1 |
| **Notifications** | 4 |
| **Gamification** | 6 |
| **Finance** | 7 |
| **Billing** | 5 |
| **Company Settings** | 4 |
| **User Settings** | 5 |
| **Chat Import** | 2 |
| **Phoenix (Retention)** | 3 |
| **Collective Intelligence** | 3 |
| **Sales Brain** | 2 |
| **Field Visits** | 1 |
| **TOTAL** | **~140 Tabellen** |

---

## 📋 DETAILLIERTE LISTE

### 1️⃣ CORE TABLES (Basis)
```
profiles              ← Supabase Auth Erweiterung
companies             ← Firmen/Verticals
```

### 2️⃣ LEADS & CONTACTS
```
leads                 ← Haupttabelle Leads
contacts              ← Kontakte (getrennt von Leads)
```

### 3️⃣ ACTIVITIES & INTERACTIONS
```
activities            ← Allgemeine Aktivitäten
lead_activities       ← Lead-spezifische Aktivitäten
activity_log          ← Audit-Log
ai_interactions       ← KI-Interaktionen (Chat, etc.)
```

### 4️⃣ FOLLOW-UPS
```
follow_ups            ← Haupt Follow-Up Tabelle
follow_up_tasks       ← Einfache Tasks
followups             ← Alternative Tabelle (Legacy?)
lead_pending_actions  ← Ausstehende Lead-Aktionen
```

### 5️⃣ DAILY FLOW / DMO
```
dmo_entries           ← Daily Method of Operation
daily_flow_status     ← Tagesstatus
daily_flows           ← Flow-Sessions
daily_flow_actions    ← Aktionen im Flow
daily_flow_plans      ← Tagespläne
daily_plans           ← Alternative Pläne
daily_analytics       ← Tägliche Metriken
```

### 6️⃣ GOALS
```
goals                 ← Ziele
user_goals            ← User-spezifische Ziele
company_goal_configs  ← Firmen-Zielkonfiguration
```

### 7️⃣ TEAM
```
teams                 ← Teams
team_members          ← Team-Mitglieder
team_broadcasts       ← Team-Nachrichten
team_nudges           ← Motivations-Nudges
team_templates        ← Team-Templates
```

### 8️⃣ SCRIPTS & TEMPLATES
```
scripts               ← Vertriebsskripte (52 Seed-Einträge)
script_usage_logs     ← Nutzungs-Tracking
templates             ← Nachrichtenvorlagen
template_performance  ← Template-Performance
template_metrics      ← Template-Metriken
message_templates     ← User-eigene Templates
sales_templates       ← Verkaufs-Templates
```

### 9️⃣ SEQUENCES (Email Automation)
```
sequences             ← Sequenz-Definitionen
sequence_steps        ← Sequenz-Schritte
sequence_enrollments  ← Einschreibungen
sequence_actions      ← Ausgeführte Aktionen
sequence_action_queue ← Warteschlange
sequence_daily_stats  ← Tägliche Statistiken
email_tracking_events ← Email-Tracking
email_accounts        ← Email-Konten
```

### 🔟 SCHEDULED JOBS
```
scheduled_jobs        ← Geplante Hintergrund-Jobs
```

### 1️⃣1️⃣ KNOWLEDGE & LEARNING
```
knowledge_items       ← Wissens-Einträge
knowledge_embeddings  ← Vector-Embeddings
company_knowledge     ← Firmen-Wissen
learning_events       ← Lern-Events
learning_aggregates   ← Aggregierte Lern-Daten
learning_signals      ← Lern-Signale
learning_patterns     ← Erkannte Muster
learning_cases        ← Lern-Fälle
```

### 1️⃣2️⃣ TEACH SYSTEM
```
command_rules         ← Benutzer-Regeln
```

### 1️⃣3️⃣ LIVE ASSIST
```
quick_facts                    ← Schnelle Fakten
objection_responses            ← Einwand-Antworten
vertical_knowledge             ← Branchen-Wissen
live_assist_sessions           ← Live-Assist Sessions
live_assist_queries            ← Anfragen
la_quick_facts                 ← (Prefix-Variante)
la_objection_responses         ← (Prefix-Variante)
la_vertical_knowledge          ← (Prefix-Variante)
la_sessions                    ← (Prefix-Variante)
la_queries                     ← (Prefix-Variante)
la_company_products            ← Produkte
la_company_guardrails          ← Guardrails
la_intent_learning_patterns    ← Intent-Muster
la_objection_learning_patterns ← Einwand-Muster
```

### 1️⃣4️⃣ OUTREACH & MESSAGING
```
outreach_messages        ← Outreach-Nachrichten
outreach_campaigns       ← Kampagnen
pulse_outreach_messages  ← Pulse-Nachrichten
messages                 ← Allgemeine Nachrichten
lead_messages            ← Lead-Nachrichten
message_logs             ← Nachrichtenlog
voice_messages           ← Sprachnachrichten
conversations            ← Konversationen
communications           ← Kommunikation
```

### 1️⃣5️⃣ GHOST BUSTER
```
ghost_buster_templates  ← Ghost-Templates
ghost_followup_queue    ← Ghost Follow-Up Queue
```

### 1️⃣6️⃣ SALES INTELLIGENCE
```
ab_tests                     ← A/B Tests
ab_test_results              ← Test-Ergebnisse
ab_experiment_assignments    ← Experiment-Zuweisungen
ab_experiment_outcomes       ← Experiment-Ergebnisse
framework_usage_stats        ← Framework-Nutzung
buyer_type_stats             ← Käufertyp-Statistiken
industry_stats               ← Branchen-Statistiken
momentum_signals             ← Momentum-Signale
momentum_scores              ← Momentum-Scores
deal_momentum_signals        ← Deal-Signale
deal_framework_usage         ← Framework pro Deal
micro_coaching_logs          ← Micro-Coaching
phone_mode_sessions          ← Telefon-Sessions
daily_effectiveness          ← Tägliche Effektivität
vertical_configs             ← Vertikal-Konfiguration
framework_effectiveness_daily← Framework-Effektivität
conversion_funnel_daily      ← Conversion-Funnel
cross_channel_strategies     ← Cross-Channel
performer_benchmarks         ← Performer-Benchmarks
```

### 1️⃣7️⃣ PERSONALITY PROFILES
```
lead_personality_profiles ← DISC-Profile
lead_behavior_profiles    ← Verhaltensprofile
lead_psychology_profiles  ← Psychologie-Profile
contact_plans             ← Kontaktpläne
```

### 1️⃣8️⃣ AUTONOMOUS BRAIN
```
brain_decisions           ← Brain-Entscheidungen
brain_learnings           ← Brain-Lernungen
autopilot_settings        ← Autopilot-Einstellungen
autopilot_actions         ← Autopilot-Aktionen
autopilot_drafts          ← Autopilot-Entwürfe
lead_autopilot_overrides  ← Autopilot-Überschreibungen
```

### 1️⃣9️⃣ INTEGRATIONS
```
user_integrations  ← User-Integrationen
oauth_states       ← OAuth-States
channel_mappings   ← Channel-Mappings
```

### 2️⃣0️⃣ FEATURE FLAGS
```
feature_flags  ← Feature-Flags
```

### 2️⃣1️⃣ NOTIFICATIONS & PUSH
```
notifications   ← Benachrichtigungen
push_schedules  ← Push-Zeitpläne
push_history    ← Push-Verlauf
alerts          ← Alerts
```

### 2️⃣2️⃣ GAMIFICATION
```
user_profiles          ← User-Profile (XP, Level)
xp_events              ← XP-Events
user_achievements      ← Achievements
achievement_definitions← Achievement-Definitionen
user_streaks           ← Streaks
user_wins              ← Wins
```

### 2️⃣3️⃣ FINANCE
```
finance_transactions  ← Transaktionen
finance_accounts      ← Konten
finance_goals         ← Finanzziele
finance_recurring     ← Wiederkehrende Ausgaben
finance_tax_profiles  ← Steuerprofile
finance_mileage_log   ← Fahrtenbuch
finance_exports       ← Exports
```

### 2️⃣4️⃣ BILLING & SUBSCRIPTIONS
```
subscriptions       ← Abos
subscription_items  ← Abo-Items
invoices            ← Rechnungen
usage_records       ← Nutzungs-Records
items               ← Items
monthly_offers      ← Monatsangebote
```

### 2️⃣5️⃣ COMPANY SETTINGS
```
company_settings    ← Firmen-Einstellungen
company_products    ← Firmen-Produkte
company_stories     ← Firmen-Geschichten
company_guardrails  ← Firmen-Guardrails
```

### 2️⃣6️⃣ USER SETTINGS & ONBOARDING
```
user_settings      ← User-Einstellungen
user_onboarding    ← Onboarding-Status
user_territories   ← Territorien
user_corrections   ← Korrekturen
intent_corrections ← Intent-Korrekturen
```

### 2️⃣7️⃣ CHAT IMPORT
```
imported_chats       ← Importierte Chats
extracted_objections ← Extrahierte Einwände
```

### 2️⃣8️⃣ PHOENIX (Retention)
```
phoenix_sessions    ← Phoenix-Sessions
phoenix_alerts      ← Phoenix-Alerts
retention_contacts  ← Retention-Kontakte
```

### 2️⃣9️⃣ COLLECTIVE INTELLIGENCE
```
collective_insights   ← Kollektive Insights
collective_adoptions  ← Adoptionen
rule_applications     ← Regel-Anwendungen
```

### 3️⃣0️⃣ SALES BRAIN
```
sales_brain_rules     ← Sales-Brain Regeln
sales_brain_feedback  ← Feedback
```

### 3️⃣1️⃣ FIELD VISITS
```
field_visits  ← Außendienst-Besuche
```

---

## ⚠️ BEKANNT FEHLEND (User-Report)

Diese wurden vom User als fehlend gemeldet:

| Tabelle | Status | Notiz |
|---------|--------|-------|
| `today_follow_ups` | ❓ Nicht im Code gefunden | Möglicherweise View oder Frontend-Variable |
| `user_business_profile.commission_per_deal` | ❌ Spalte fehlt | Nur als Konstante in `real_estate_adapter.py` |

---

## 🚀 MIGRATION AUSFÜHREN

```bash
# Option 1: Über Supabase Dashboard
# 1. Dashboard öffnen → SQL Editor
# 2. COMPLETE_SCHEMA_MIGRATION.sql einfügen
# 3. Ausführen

# Option 2: Über CLI
psql $DATABASE_URL -f migrations/COMPLETE_SCHEMA_MIGRATION.sql

# Option 3: Über Python-Script
python run_migration_direct.py
```

---

## ✅ NACH MIGRATION PRÜFEN

```sql
-- Alle Tabellen zählen
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Kritische Tabellen prüfen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'leads', 'contacts', 'dmo_entries', 'scripts', 'ai_interactions')
ORDER BY table_name;
```

