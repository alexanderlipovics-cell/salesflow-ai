# 📊 SQL Migrations & Schema Setup - Sales Flow AI

**Status:** Ready for Deployment ✅

---

## 🎯 Quick Overview

Dieses Verzeichnis enthält alle SQL Schemas für Sales Flow AI. Führe sie in der angegebenen Reihenfolge in Supabase aus.

---

## 📋 Execution Order & Checklist

### **Phase 1: Core Features** (Sequence Engine)

| # | Script | Purpose | Lines | Status |
|---|--------|---------|-------|--------|
| 1 | `sequences_schema.sql` | Multi-Touch Sales Campaigns | 284 | ⏳ Execute first |

**Features:**
- ✅ Sequences (Campaign Container)
- ✅ Sequence Steps (Email, Call, Task, etc.)
- ✅ Enrollments (Lead → Sequence Tracking)
- ✅ Enrollment History (Detailed Log)
- ✅ 2 Views: `due_enrollments`, `sequence_performance`
- ✅ 15 Performance Indexes
- ✅ Auto-Update Triggers

**To Execute:**
```bash
# In Supabase SQL Editor:
1. Open: backend/database/sequences_schema.sql
2. Copy all 284 lines
3. Paste & Run
```

**Expected Output:**
```
✅ Sequence Engine schema created successfully!
📋 Tables: sequences, sequence_steps, enrollments, enrollment_history
🔍 Indexes: 15 indexes created for performance
👁️  Views: due_enrollments, sequence_performance
⏰ Triggers: Auto-update timestamps and analytics
```

---

### **Phase 2: Revenue Intelligence** 💰

| # | Script | Purpose | Lines | Status |
|---|--------|---------|-------|--------|
| 2 | `revenue_schema.sql` | Revenue Intelligence System | 277 | ⏳ Execute second |

**Features:**
- ✅ Extends `leads` table with financial columns
- ✅ 4 SQL Views (Pipeline, Forecast, At-Risk, Won Deals)
- ✅ 5 Performance Indexes
- ✅ `calculate_deal_health()` Function
- ✅ Auto-Update Trigger for `last_activity_date`

**To Execute:**
```bash
# In Supabase SQL Editor:
1. Open: backend/database/revenue_schema.sql
2. Copy all 277 lines
3. Paste & Run
```

**Expected Output:**
```
✅ Revenue Intelligence schema created successfully!
💰 Views: revenue_pipeline_summary, revenue_forecast_monthly, 
          at_risk_deals, won_deals_summary
🔍 Indexes: 5 indexes created for performance
📊 Function: calculate_deal_health(lead_id)
```

**New Columns Added to `leads`:**
- `deal_value` (DECIMAL)
- `currency` (TEXT, default: 'EUR')
- `expected_close_date` (DATE)
- `win_probability` (INTEGER, 0-100)
- `deal_stage` (TEXT)
- `last_activity_date` (DATE)
- `days_in_stage` (INTEGER)

---

### **Phase 3: Objections Enhancement** 🧠

| # | Script | Purpose | Lines | Status |
|---|--------|---------|-------|--------|
| 3 | `objections_schema_enhancements.sql` | AI Knowledge Base Prep | ~80 | ⏳ Execute third |

**Features:**
- ✅ Adds `frequency_score` column (popularity tracking)
- ✅ Adds `psychology_tags` array (categorization)
- ✅ Index on `frequency_score` for performance
- ✅ Safe: Uses `IF NOT EXISTS` logic

**To Execute:**
```bash
# In Supabase SQL Editor:
1. Open: backend/database/objections_schema_enhancements.sql
2. Copy all content
3. Paste & Run
```

**Expected Output:**
```
✅ Objections schema enhancements completed!
📊 Added: frequency_score (for popularity tracking)
🏷️  Added: psychology_tags (for categorization)
🔍 Created: Index on frequency_score for performance
```

**Note:** This is **idempotent** - safe to run multiple times!

---

## 🧪 Verification Queries

After executing all schemas, verify with these queries:

### **Test 1: Sequences Tables**
```sql
-- Check sequences tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('sequences', 'sequence_steps', 'enrollments', 'enrollment_history')
  AND table_schema = 'public';

-- Should return 4 rows
```

### **Test 2: Revenue Views**
```sql
-- Check revenue views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_name IN ('revenue_pipeline_summary', 'revenue_forecast_monthly', 'at_risk_deals', 'won_deals_summary')
  AND table_schema = 'public';

-- Should return 4 rows
```

### **Test 3: Objections Enhancements**
```sql
-- Verify new objections columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'objections'
  AND column_name IN ('frequency_score', 'psychology_tags')
ORDER BY column_name;

-- Should return 2 rows:
-- frequency_score | integer      | 5
-- psychology_tags | ARRAY (text) | '{}'::text[]
```

### **Test 4: Leads Revenue Columns**
```sql
-- Verify leads has revenue columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('deal_value', 'expected_close_date', 'win_probability')
ORDER BY column_name;

-- Should return 3 rows
```

---

## 🚀 Post-Migration Steps

### **1. Import Data (Optional but Recommended)**

After schemas are deployed, import reference data:

```bash
cd backend

# Import Sequences (6 pre-built campaigns)
python scripts/import_sequences.py data/sequences_definitions.json

# Import Message Templates
python scripts/import_templates.py

# Import Objections (if available)
python scripts/import_objections.py data/objections_import.json

# Create Revenue Test Data (30 leads with financials)
python scripts/create_revenue_test_data.py
```

---

### **2. Test APIs**

Verify all endpoints are working:

```bash
# Health checks
curl http://localhost:8000/api/revenue/health-check
curl http://localhost:8000/api/sequences/

# Test dashboard
curl http://localhost:8000/api/revenue/dashboard

# Test at-risk alerts
curl http://localhost:8000/api/revenue/alerts/at-risk
```

---

### **3. Verify in Supabase UI**

1. Go to **Table Editor**
2. Check these tables exist:
   - ✅ `sequences`
   - ✅ `sequence_steps`
   - ✅ `enrollments`
   - ✅ `enrollment_history`
   - ✅ `leads` (with new revenue columns)
   - ✅ `objections` (with frequency_score & psychology_tags)

3. Go to **Database → Views**
4. Check these views exist:
   - ✅ `due_enrollments`
   - ✅ `sequence_performance`
   - ✅ `revenue_pipeline_summary`
   - ✅ `revenue_forecast_monthly`
   - ✅ `at_risk_deals`
   - ✅ `won_deals_summary`

---

## 🔧 Troubleshooting

### **Issue: "Table already exists"**
**Solution:** Script uses `CREATE TABLE IF NOT EXISTS` - this is safe. Ignore the warning.

### **Issue: "Column already exists"**
**Solution:** Objections enhancements script handles this automatically. No action needed.

### **Issue: "View depends on missing column"**
**Solution:** Execute schemas in order:
1. Sequences first (creates tables)
2. Revenue second (creates views)
3. Objections third (enhances existing)

### **Issue: "Function X does not exist"**
**Solution:** Make sure you executed the script that creates it:
- `calculate_deal_health()` → `revenue_schema.sql`

### **Issue: "Permission denied"**
**Solution:** Use Supabase Service Key (not Anon Key) in backend `.env`:
```bash
SUPABASE_KEY=eyJ... (your service_role key)
```

---

## 📊 Database Size Estimates

After full deployment with test data:

| Component | Tables | Views | Indexes | Est. Size |
|-----------|--------|-------|---------|-----------|
| Sequences | 4 | 2 | 15 | ~5 MB |
| Revenue | 0 | 4 | 5 | ~2 MB (views) |
| Objections | +2 cols | 0 | 1 | ~500 KB |
| **Total** | **4 new** | **6 total** | **21** | **~8 MB** |

**Note:** With 10,000 leads + 1,000 enrollments + test data

---

## 🔐 Security & RLS

**Important:** These schemas do NOT enable Row-Level Security (RLS) by default.

**For Production:**

1. **Enable RLS on tables:**
```sql
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
-- etc.
```

2. **Create RLS Policies:**
```sql
-- Example: Users can only see their own sequences
CREATE POLICY "Users see own sequences"
  ON sequences
  FOR SELECT
  USING (auth.uid() = created_by);
```

**TODO Comments** are included in the code for RLS reminders.

---

## 📝 Schema Documentation

### **Sequences Schema**
- **Purpose:** Multi-touch sales campaigns (email, call, LinkedIn sequences)
- **Key Features:** Auto-scheduling, step tracking, outcome logging
- **API:** `/api/sequences/*`
- **README:** `backend/README.md` (Sequences section)

### **Revenue Schema**
- **Purpose:** Revenue intelligence, forecasting, deal health
- **Key Features:** Weighted forecasts, at-risk detection, ML predictions
- **API:** `/api/revenue/*`
- **README:** `backend/REVENUE_INTELLIGENCE_README.md`

### **Objections Enhancements**
- **Purpose:** AI-powered objection handling with popularity & psychology
- **Key Features:** Frequency tracking, psychology tagging
- **API:** `/api/objection-brain/*`
- **README:** (Integrated in main docs)

---

## 🎯 Quick Command Reference

```bash
# Navigate to backend
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Mac/Linux

# Run all import scripts
python scripts/import_sequences.py data/sequences_definitions.json
python scripts/import_templates.py
python scripts/create_revenue_test_data.py

# Test API
curl http://localhost:8000/api/revenue/dashboard
curl http://localhost:8000/api/sequences/
```

---

## ✅ Deployment Checklist

Use this to track your migration:

- [ ] **Phase 1:** Execute `sequences_schema.sql`
- [ ] **Phase 2:** Execute `revenue_schema.sql`
- [ ] **Phase 3:** Execute `objections_schema_enhancements.sql`
- [ ] **Verify:** Run verification queries (see above)
- [ ] **Import:** Run `import_sequences.py`
- [ ] **Import:** Run `import_templates.py` (if available)
- [ ] **Test Data:** Run `create_revenue_test_data.py`
- [ ] **API Test:** Verify `/api/revenue/health-check`
- [ ] **API Test:** Verify `/api/sequences/`
- [ ] **Supabase UI:** Check tables & views exist
- [ ] **RLS:** (Optional) Enable RLS policies for production

---

## 🆘 Need Help?

**Backend Not Running?**
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

**Supabase Connection Issues?**
Check `backend/.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ... (service_role key)
```

**Import Errors?**
Make sure schemas are deployed first, then run imports.

---

**Last Updated:** November 30, 2025
**Version:** 1.0
**Status:** Production Ready ✅

