# 🚀 TITANIUM LAUNCHER - Professional Backend Setup

## Overview

The Titanium Launcher provides a **production-ready**, **idempotent**, and **safe** way to set up your Sales Flow AI backend.

### Features

✅ **Safe Setup** - Uses isolated Python virtual environment  
✅ **Idempotent** - Can run multiple times without breaking anything  
✅ **Validates** - Checks `.env` and Python before proceeding  
✅ **Auto-Recovery** - Skips already imported data  
✅ **Professional** - Enterprise-grade error handling

---

## Quick Start (3 Steps)

### Step 1: Deploy Database Schema

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql)
2. Click **"New query"**
3. Copy & paste contents of `db/fix_schema_titanium.sql`
4. Click **"Run"** (or press `Ctrl+Enter`)
5. Wait for: `✅ TITANIUM SCHEMA FIX COMPLETED SUCCESSFULLY!`

**What it does:**
- Drops old conflicting tables
- Creates clean `objections` table with all required columns
- Creates `objection_responses` table
- Sets up 6 performance indexes
- Adds auto-update timestamps

---

### Step 2: Run Setup Script

Open PowerShell in the `backend/` directory:

```powershell
.\setup.ps1
```

**What it does:**
1. ✅ Checks for `.env` file
2. ✅ Verifies Python installation
3. ✅ Creates virtual environment (if needed)
4. ✅ Installs dependencies
5. ✅ Asks for schema confirmation
6. ✅ Runs Titanium Import Engine

**Interactive Prompts:**
- "Have you executed 'fix_schema_titanium.sql'?" → Press **Enter** if yes
- If no, press **Ctrl+C** and deploy schema first

---

### Step 3: Start Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Then open: http://localhost:8000/docs

---

## File Structure

```
backend/
├── setup.ps1                      # Main setup launcher
├── db/
│   └── fix_schema_titanium.sql    # Database schema fix
├── scripts/
│   └── titanium_import.py         # Import engine
├── data/
│   └── objections_import.json     # 20 objections to import
└── .env                           # Your credentials (required)
```

---

## Configuration

### Required `.env` File

Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
SUPABASE_KEY=your-anon-key-here
OPENAI_API_KEY=sk-your-key-here  # Optional for MVP
```

Get your Supabase credentials from:
https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/settings/api

---

## Troubleshooting

### Error: "No .env file found"

**Solution:** Create a `.env` file with your Supabase credentials (see Configuration above)

---

### Error: "Python not found"

**Solution:** Install Python 3.10 or 3.11 from https://www.python.org/downloads/

---

### Error: "Could not find the 'frequency_score' column"

**Solution:** You need to run `fix_schema_titanium.sql` first (Step 1)

---

### Error: "Failed to insert objection"

**Possible causes:**
1. Schema not deployed → Run `fix_schema_titanium.sql`
2. Wrong Supabase credentials → Check `.env` file
3. Network issue → Check internet connection

---

## Advanced Usage

### Manual Import (Without Setup Script)

If you want to skip the setup script and import manually:

```bash
cd backend
.\venv\Scripts\activate  # Or: source venv/bin/activate on Mac/Linux
python scripts/titanium_import.py
```

---

### Re-running the Import

The import engine is **idempotent** - it will:
- ✅ Skip already imported objections
- ✅ Only import new data
- ✅ Never duplicate entries

Safe to run multiple times!

---

### Verify Import

After import, check your data:

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM objections;
SELECT COUNT(*) FROM objection_responses;

-- Should show:
-- objections: 20
-- objection_responses: ~40-60 (varies)
```

---

## What Gets Imported?

### Objections (20 items)

- **Categories:** preis, zeit, konkurrenz, vertrauen, risiko, etc.
- **Psychology Tags:** Loss Aversion, Status Quo Bias, etc.
- **Industries:** network_marketing, real_estate, finance
- **Scores:** frequency_score (0-100), severity (1-10)

### Objection Responses (40-60 items)

- **Techniques:** ROI Reframe, Social Proof, Risk Reversal, etc.
- **Scripts:** Ready-to-use response templates with placeholders
- **Success Rates:** low, medium, high
- **Tones:** empathetic, consultative, confident

---

## Production Checklist

Before going live:

- [ ] Row Level Security (RLS) enabled in Supabase
- [ ] API rate limiting configured
- [ ] CORS origins restricted to your domains
- [ ] Environment variables secured
- [ ] Backup strategy in place
- [ ] Monitoring/logging enabled

---

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review Supabase logs in dashboard
3. Check backend logs for detailed errors

---

## Version

**Titanium Launcher v1.0**  
Last updated: November 2025  
Compatible with: Python 3.10+, Supabase PostgreSQL 15+

