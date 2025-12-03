# 🔍 SALES FLOW AI - COMPLETE DATABASE AUDIT SYSTEM

## 📋 Übersicht

Dieses System ermöglicht es dir, **automatisch** zu diagnostizieren welche Tabellen/Views/Functions in deiner Datenbank existieren und was fehlt. Es generiert dann automatisch die fehlenden Migrations!

## 🗂️ Erstellte Dateien

### 1️⃣ Diagnose-Dateien

#### `backend/database/diagnose_db.sql`
**Was:** SQL-Script für manuelle Diagnose
**Wann nutzen:** Wenn du manuell alle DB-Objekte inspizieren willst
```bash
psql $DATABASE_URL < backend/database/diagnose_db.sql > db_report.txt
```

#### `backend/scripts/audit_database.py`
**Was:** Python-Script für automatisches Audit
**Wann nutzen:** Haupttool für regelmäßige Audits
**Output:** 
- `backend/database/audit_results.json` - Detaillierte Ergebnisse
- `backend/database/auto_migration.sql` - Template für fehlende Items

```bash
python backend/scripts/audit_database.py
```

### 2️⃣ Migration-Dateien

#### `backend/database/complete_system_migration.sql`
**Was:** KOMPLETTE Migration für alle Features
**Enthält:**
- ✅ Email Integration (Gmail, Outlook, IMAP)
- ✅ Import/Export (CSV, Salesforce, HubSpot)
- ✅ Gamification (Badges, Streaks, Leaderboards)
- ✅ Video Conferencing (Zoom, Teams, Google Meet)
- ✅ Lead Enrichment (Clearbit, Hunter, ZoomInfo)
- ✅ Alle Functions & Triggers
- ✅ Materialized Views
- ✅ Seed Data (Default Badges)

**Wann nutzen:** Wenn Audit zeigt, dass Tabellen fehlen

```bash
psql $DATABASE_URL < backend/database/complete_system_migration.sql
```

### 3️⃣ Quick-Scripts

#### `backend/scripts/quick_audit.sh` (Linux/Mac)
#### `backend/scripts/quick_audit.bat` (Windows)
**Was:** One-Click Audit mit schönem Output
**Macht:**
1. Prüft ob DATABASE_URL gesetzt ist
2. Installiert asyncpg falls nötig
3. Führt Audit aus
4. Zeigt Summary an
5. Gibt Next-Steps aus

```bash
# Linux/Mac
./backend/scripts/quick_audit.sh

# Windows
backend\scripts\quick_audit.bat
```

#### `backend/scripts/apply_migration.sh` (Linux/Mac)
#### `backend/scripts/apply_migration.bat` (Windows)
**Was:** Sichere Migration mit Confirmation
**Macht:**
1. Prüft ob DATABASE_URL gesetzt ist
2. Zeigt Warning mit Details
3. Fragt nach Bestätigung
4. Führt Migration aus
5. Verifiziert mit Audit

```bash
# Linux/Mac
./backend/scripts/apply_migration.sh

# Windows
backend\scripts\apply_migration.bat
```

### 4️⃣ Dokumentation

#### `backend/database/README_AUDIT.md`
**Was:** Komplette Dokumentation des Audit-Systems
**Enthält:**
- Quick Start Guide
- Troubleshooting
- Feature-Übersicht
- Deployment Steps

## 🚀 Schnellstart (3 Schritte)

### Schritt 1: DATABASE_URL setzen

```bash
# Linux/Mac
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Windows (CMD)
set DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Schritt 2: Audit durchführen

```bash
# Linux/Mac
./backend/scripts/quick_audit.sh

# Windows
backend\scripts\quick_audit.bat
```

**Output Beispiel:**
```
🔍 Starting Database Audit...

✅ Audit Complete!

📊 SUMMARY:
  Tables: 15 / 56
  Views: 0 / 6
  Functions: 3 / 17
  Extensions: 2 / 2

⚠️  MISSING COMPONENTS: 61

  Missing Tables (41):
    - email_accounts
    - email_messages
    - email_threads
    - badges
    - user_achievements
    ... and 36 more
```

### Schritt 3: Migration anwenden (wenn nötig)

```bash
# Linux/Mac
./backend/scripts/apply_migration.sh

# Windows
backend\scripts\apply_migration.bat
```

## 📊 Was wird überprüft?

### Tabellen (56 insgesamt)

#### Core (6)
- users, squads, leads, activities, messages, notes

#### AI & Knowledge (15)
- lead_context_summaries, lead_embeddings, ai_recommendations
- ai_coaching_sessions, compliance_logs, bant_assessments
- personality_profiles, success_patterns, playbook_executions
- channel_performance_metrics, knowledge_base, objection_library
- products, lead_product_interactions, success_stories

#### Premium Features (7)
- user_subscriptions, subscription_tiers, usage_tracking
- feature_access_log, intelligent_chat_logs
- win_probability_cache, optimal_contact_times

#### Social Media & Lead Gen (5)
- social_media_accounts, lead_generation_jobs
- auto_generated_leads, social_media_interactions
- automation_rules

#### Network Marketing (3)
- squad_hierarchy, lead_relationships, lead_content_references

#### **Email Integration (4) 📧 NEU**
- email_accounts, email_messages, email_threads, email_sync_status

#### **Import/Export (3) 📥📤 NEU**
- import_jobs, export_jobs, data_mappings

#### **Gamification (5) 🏆 NEU**
- badges, user_achievements, daily_streaks
- leaderboard_entries, squad_challenges

#### **Video Conferencing (3) 🎥 NEU**
- video_meetings, meeting_recordings, meeting_transcripts

#### **Lead Enrichment (2) 🔍 NEU**
- lead_enrichment_jobs, enriched_data_cache

#### Compliance & Audit (4)
- data_access_log, data_deletion_requests
- data_export_requests, user_consents

#### Data Quality (2)
- data_quality_metrics, potential_duplicates

### Materialized Views (6)
- view_leads_scored
- view_followups_scored
- view_conversion_microsteps
- view_personality_insights
- view_squad_performance
- view_user_activity_summary

### Functions (17+)
- generate_disg_recommendations
- update_lead_memory
- log_ai_output_compliance
- recommend_followup_actions
- get_best_contact_window
- calculate_team_size
- get_lead_network
- find_common_connections
- recommend_leads_from_network
- search_knowledge_base
- find_objection_response
- recommend_upsells
- export_user_data
- anonymize_lead
- detect_duplicate_leads
- merge_leads
- calculate_lead_completeness_score
- **check_lead_limit 🆕**
- **auto_link_email_to_lead 🆕**
- **calculate_badge_progress 🆕**
- **refresh_all_materialized_views 🆕**

### Extensions (2)
- uuid-ossp
- vector (pgvector für AI Embeddings)

## 🔧 Erweiterte Nutzung

### Nur Diagnose (ohne Python)

```bash
psql $DATABASE_URL < backend/database/diagnose_db.sql > full_report.txt
less full_report.txt
```

### Audit-Ergebnisse parsen

```bash
# Zeige nur fehlende Tabellen
cat backend/database/audit_results.json | jq '.missing.tables'

# Zeige vorhandene vs. Soll
cat backend/database/audit_results.json | jq '{
  tables: .tables.count, 
  required: 56,
  missing: (.missing.tables | length)
}'
```

### Regelmäßiges Audit (Cron Job)

```bash
# Täglich um 2 Uhr morgens
0 2 * * * cd /path/to/project && python backend/scripts/audit_database.py && \
  if [ -s backend/database/auto_migration.sql ]; then \
    mail -s "DB Audit: Missing Components" admin@salesflow.ai < backend/database/auto_migration.sql; \
  fi
```

### Nur bestimmte Features migrieren

Du kannst `complete_system_migration.sql` editieren und nur die Sektionen ausführen, die du brauchst:

```bash
# Nur Email Integration
sed -n '/EMAIL INTEGRATION/,/IMPORT\/EXPORT/p' backend/database/complete_system_migration.sql | \
  psql $DATABASE_URL
```

## 📈 Monitoring & Wartung

### Check DB Size

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Refresh Materialized Views

```sql
-- Manuell
REFRESH MATERIALIZED VIEW CONCURRENTLY view_user_activity_summary;

-- Alle auf einmal (via Function)
SELECT refresh_all_materialized_views();
```

### Check Missing Indexes

Das Audit-System prüft nur Existenz, nicht Performance. Für Index-Optimierung:

```sql
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5
ORDER BY n_distinct DESC;
```

## 🐛 Troubleshooting

### Error: "relation does not exist"

**Problem:** Migration versucht auf nicht-existierende Tabelle zu referenzieren
**Lösung:** Stelle sicher, dass Core-Tabellen (users, leads, squads) existieren

```bash
# Check Core Tables
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('users', 'leads', 'squads', 'activities');"
```

### Error: "extension vector not found"

**Problem:** pgvector Extension nicht installiert
**Lösung:** Installiere pgvector auf deinem DB-Server

```bash
# Für Supabase: Automatisch verfügbar
# Für eigene Postgres-Installation:
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
psql $DATABASE_URL -c "CREATE EXTENSION vector;"
```

### Error: "permission denied"

**Problem:** DB-User hat keine CREATE-Rechte
**Lösung:** Vergebe notwendige Rechte

```sql
GRANT CREATE ON SCHEMA public TO your_db_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_db_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
```

### Audit findet alles, aber Frontend zeigt Fehler

**Problem:** Möglicherweise RLS (Row Level Security) Policies fehlen
**Lösung:** Check RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🎯 Best Practices

### 1. Immer zuerst Audit laufen lassen

Bevor du Änderungen machst, führe ein Audit durch:
```bash
./backend/scripts/quick_audit.sh
```

### 2. Backup vor Migration

```bash
# Backup erstellen
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Migration durchführen
./backend/scripts/apply_migration.sh

# Bei Problemen: Restore
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

### 3. Test-Environment zuerst

```bash
# Test-DB
export DATABASE_URL="postgresql://...test..."
./backend/scripts/apply_migration.sh

# Wenn OK → Production
export DATABASE_URL="postgresql://...production..."
./backend/scripts/apply_migration.sh
```

### 4. Audit nach jedem Deploy

```bash
# In CI/CD Pipeline
./backend/scripts/quick_audit.sh
if [ -s backend/database/auto_migration.sql ]; then
  echo "WARNING: Missing DB components!"
  exit 1
fi
```

## 📚 Weitere Ressourcen

- **Full Migration SQL:** `backend/database/complete_system_migration.sql`
- **Audit Results:** `backend/database/audit_results.json` (nach erstem Run)
- **Usage Guide:** `backend/database/README_AUDIT.md`
- **Python Script:** `backend/scripts/audit_database.py`

## 🎉 Das wars!

Du hast jetzt ein **vollautomatisches Database Audit & Migration System** das:
- ✅ Automatisch erkennt was fehlt
- ✅ Migrations generiert
- ✅ Sicher anwendet
- ✅ Verifiziert

**NICHTS VERGESSEN! ALLES DRIN! 💪🚀**

