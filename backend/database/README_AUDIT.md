# Database Audit & Migration System

## Quick Start

### 1. Run Audit

```bash
cd backend
python scripts/audit_database.py
```

This will:
- ✅ Check which tables exist
- ✅ Check which views exist
- ✅ Check which functions exist
- ✅ Generate `audit_results.json`
- ✅ Generate `auto_migration.sql` template

### 2. Review Results

```bash
cat database/audit_results.json
```

Look for:
- `missing.tables` - Tables that need to be created
- `missing.views` - Views that need to be created
- `missing.functions` - Functions that need to be created

### 3. Apply Complete Migration

```bash
# Apply ALL missing components
psql $DATABASE_URL < database/complete_system_migration.sql
```

### 4. Verify

```bash
# Run SQL diagnosis
psql $DATABASE_URL < database/diagnose_db.sql

# Or run Python audit again
python scripts/audit_database.py
```

## Manual SQL Diagnosis

```bash
psql $DATABASE_URL < database/diagnose_db.sql > diagnosis_output.txt
```

## What Gets Created

### Email Integration
- `email_accounts` - Connected email accounts
- `email_messages` - All emails synced
- `email_threads` - Email conversations
- `email_sync_status` - Sync job tracking

### Import/Export
- `import_jobs` - CSV/Salesforce/HubSpot imports
- `export_jobs` - Data exports
- `data_mappings` - Field mapping templates

### Gamification
- `badges` - Achievement definitions
- `user_achievements` - Earned badges
- `daily_streaks` - Activity streaks
- `leaderboard_entries` - Rankings
- `squad_challenges` - Team challenges

### Video Conferencing
- `video_meetings` - Zoom/Teams meetings
- `meeting_recordings` - Meeting files
- `meeting_transcripts` - AI transcriptions

### Lead Enrichment
- `lead_enrichment_jobs` - Enrichment tasks
- `enriched_data_cache` - Cached external data

## Troubleshooting

### Extension Missing

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Permission Errors

Make sure your database user has:

```sql
GRANT CREATE ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Migration Failed

Check error logs:

```bash
psql $DATABASE_URL < database/complete_system_migration.sql 2> migration_errors.log
```

## 🎯 FINAL DEPLOYMENT STEPS

### Step 1: Install Dependencies

```bash
cd backend
pip install asyncpg
```

### Step 2: Set Environment Variable

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### Step 3: Run Audit

```bash
python scripts/audit_database.py
```

### Step 4: Apply Migrations

```bash
psql $DATABASE_URL < database/complete_system_migration.sql
```

### Step 5: Verify

```bash
python scripts/audit_database.py
```

**You should see:**
```
✅ All required components present!
```

## ✅ WHAT THIS GIVES YOU

1. **✅ Complete Database Diagnosis**
   - Knows exactly what exists vs what should exist
   - JSON report of current state
   - Visual summary in terminal

2. **✅ Auto-Migration Generation**
   - Generates SQL for all missing tables
   - Includes all new features (Email, Import, Gamification, etc.)
   - Ready to apply with one command

3. **✅ Comprehensive System**
   - Email Integration (Gmail + Outlook)
   - Import/Export (CSV, Salesforce, HubSpot)
   - Gamification (Badges, Streaks, Leaderboards)
   - Video Meetings (Zoom, Teams)
   - Lead Enrichment (Clearbit, Hunter)
   - All Premium Features
   - All Functions & Triggers

4. **✅ Easy Verification**
   - Re-run audit anytime
   - See exactly what's missing
   - Track migration progress

## Database Features Included

### ✅ Original Roadmap
- Core tables (users, leads, activities)
- AI & Knowledge tables
- Premium features
- Social media & lead gen
- Network marketing

### ✅ Email Integration
- Multi-account support (Gmail, Outlook, IMAP)
- Auto-sync with configurable frequency
- Thread management
- AI email analysis

### ✅ Import/Export
- CSV, Excel, JSON, PDF export
- Salesforce, HubSpot, Pipedrive import
- Field mapping templates
- Transformation rules

### ✅ Gamification
- Badge system with tiers
- Daily streaks
- Leaderboards
- Squad challenges

### ✅ Video Conferencing
- Zoom, Teams, Google Meet integration
- Meeting recordings
- AI transcriptions
- Action item extraction

### ✅ Lead Enrichment
- Clearbit, Hunter, ZoomInfo integration
- Data caching
- Auto-enrichment jobs

### ✅ Compliance & Audit
- GDPR compliance
- Data access logs
- Data deletion requests
- User consents

### ✅ Data Quality
- Duplicate detection
- Data completeness scoring
- Quality metrics

**ALLES DRIN! 💪 NICHTS VERGESSEN! 🚀**

