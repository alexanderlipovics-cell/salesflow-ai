# 📦 Import Scripts - Sales Flow AI

**Professional data import tools for Sales Flow AI backend**

---

## 🎯 Quick Start

### **Option 1: Master Import (Recommended)** 🚀

**Imports everything in correct order:**

```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
# or: source venv/bin/activate  # Mac/Linux

python scripts/master_import.py
```

**This will import:**
- ✅ Objections (20+ with responses)
- ✅ Message Templates (10+)
- ✅ Playbooks (5+)
- ✅ Sequences (6 pre-built campaigns)

**Expected Output:**
```
================================================================================
🚀 SALES FLOW AI - MASTER DATA IMPORT
================================================================================

[1/4] OBJECTIONS - Import knowledge base
----------------------------------------------------------------------
✅ Imported: 20, Skipped: 0

[2/4] MESSAGE TEMPLATES - Import email/DM templates
----------------------------------------------------------------------
✅ Imported: 10, Skipped: 0

[3/4] PLAYBOOKS - Import sales playbooks
----------------------------------------------------------------------
✅ Imported: 5, Skipped: 0

[4/4] SEQUENCES - Import multi-touch campaigns
----------------------------------------------------------------------
✅ Imported: 6, Skipped: 0

================================================================================
📊 IMPORT SUMMARY
================================================================================
  ✅ Total Imported:  41
  ⏭️  Total Skipped:   0
  ❌ Total Errors:    0

🎉 ALL IMPORTS COMPLETED SUCCESSFULLY!
```

---

### **Option 2: Individual Imports** 📋

If you need to run imports separately:

#### **1. Import Objections**
```bash
python scripts/import_objections.py data/objections_import.json
```

#### **2. Import Message Templates**
```bash
python scripts/import_templates.py
# Auto-finds: data/message_templates_chatgpt.json
```

#### **3. Import Playbooks**
```bash
python scripts/import_playbooks.py
# Auto-finds: data/playbooks_import.json or similar
```

#### **4. Import Sequences**
```bash
python scripts/import_sequences.py data/sequences_definitions.json
```

#### **5. Create Revenue Test Data**
```bash
python scripts/create_revenue_test_data.py
# Creates 30 test leads with financial data
```

---

## 📂 Available Scripts

| Script | Purpose | Input File | Idempotent |
|--------|---------|------------|------------|
| `master_import.py` | Run all imports in order | Multiple | ✅ Yes |
| `import_objections.py` | Import objections KB | `data/objections_import.json` | ✅ Yes |
| `import_templates.py` | Import message templates | `data/message_templates_chatgpt.json` | ✅ Yes |
| `import_playbooks.py` | Import sales playbooks | `data/playbooks_import.json` | ✅ Yes |
| `import_sequences.py` | Import multi-touch campaigns | `data/sequences_definitions.json` | ✅ Yes |
| `create_revenue_test_data.py` | Create test leads with financials | None (generated) | ⚠️ Creates new |

**Note:** "Idempotent" means safe to run multiple times - skips existing data.

---

## 🔧 Script Features

### **All Import Scripts Include:**

✅ **Automatic File Discovery**
- Searches in multiple locations (data/, outputs/, current dir)
- Smart fallbacks if file not found

✅ **Duplicate Prevention**
- Checks for existing records before inserting
- Reports what was skipped

✅ **Robust Error Handling**
- Detailed error messages
- Continues on partial failures
- Summary report at end

✅ **Progress Tracking**
- Real-time import status
- Final statistics (new, skipped, errors)

✅ **Professional Output**
- Colored terminal output (Windows/Mac/Linux)
- Clear success/warning/error messages
- Summary tables

---

## 📊 Data Files Required

Make sure these files exist in `backend/data/`:

```
backend/data/
├── objections_import.json              ✅ Required for objections
├── message_templates_chatgpt.json      ✅ Required for templates
├── playbooks_import.json               ⚠️ Optional (or similar)
└── sequences_definitions.json          ✅ Required for sequences
```

**If a file is missing:**
- Script will report it
- Other imports continue normally
- Master import shows as "Skipped"

---

## 🧪 Testing After Import

### **1. Verify in Supabase UI**
```
1. Go to: https://supabase.com/dashboard
2. Open: Table Editor
3. Check counts:
   - objections: ~20 rows
   - message_templates: ~10 rows
   - playbooks: ~5 rows
   - sequences: 6 rows
   - sequence_steps: ~40 rows
```

### **2. Test APIs**
```bash
# Test sequences
curl http://localhost:8000/api/sequences/

# Test templates
curl http://localhost:8000/api/templates/

# Test objections
curl http://localhost:8000/api/objections/

# Or use Swagger UI:
# http://localhost:8000/docs
```

### **3. Check Logs**
```bash
# Backend logs should show:
# INFO: ✅ Supabase connected successfully
# INFO: 📝 Creating sequence: 7-Day Cold Lead Nurture
# etc.
```

---

## 🔥 Common Issues & Solutions

### **Issue: "Could not import config"**
**Cause:** Virtual environment not activated
**Solution:**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Mac/Linux
```

### **Issue: "File not found: objections_import.json"**
**Cause:** Data file missing
**Solution:**
```bash
# Check if file exists:
ls backend/data/

# If missing, scripts will skip gracefully
# Master import continues with other imports
```

### **Issue: "Supabase connection failed"**
**Cause:** Missing or wrong credentials in `.env`
**Solution:**
```bash
# Check backend/.env:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ... (service_role key, not anon key!)
```

### **Issue: "Foreign key constraint failed"**
**Cause:** Database schemas not deployed yet
**Solution:**
```bash
# Execute SQL schemas first:
1. sequences_schema.sql
2. revenue_schema.sql
3. objections_schema_enhancements.sql

# See: backend/database/README_SQL_MIGRATIONS.md
```

### **Issue: "All items skipped"**
**Cause:** Data already imported (this is normal!)
**Solution:** No action needed - scripts are idempotent

---

## 🎯 Import Order (Important!)

**Correct Order:**

1. ✅ **SQL Schemas first** (in Supabase SQL Editor)
   - sequences_schema.sql
   - revenue_schema.sql
   - objections_schema_enhancements.sql

2. ✅ **Then run imports** (via Python scripts)
   - master_import.py (recommended)
   - or individual scripts

**Why?**
- Scripts insert data into tables
- Tables must exist first
- Foreign keys must be valid

---

## 📝 Adding Your Own Data

### **Create Custom Objections:**
```json
// data/my_objections.json
{
  "objections": [
    {
      "objection_text": "I need to think about it",
      "category": "stalling",
      "response_template": "I understand. What specific aspect would you like to think about?",
      "source": "custom",
      "frequency_score": 8,
      "psychology_tags": ["stalling", "indecision"]
    }
  ]
}
```

Then import:
```bash
python scripts/import_objections.py data/my_objections.json
```

### **Create Custom Templates:**
```json
// data/my_templates.json
{
  "templates": [
    {
      "template_name": "Custom Follow-up",
      "category": "follow_up",
      "channel": "email",
      "subject_line": "Quick question",
      "body_template": "Hi {{name}}, just checking in...",
      "tone": "casual"
    }
  ]
}
```

---

## 🚀 Advanced Usage

### **Re-Import After Changes**

Scripts are idempotent, but to force re-import:

```bash
# Option 1: Delete old data in Supabase first
DELETE FROM objections WHERE source = 'chatgpt';
DELETE FROM message_templates WHERE name LIKE '%[TEST]%';

# Option 2: Update JSON with new data
# Scripts will skip existing, import only new
```

### **Import Only Specific Categories**

Edit JSON files to include only what you need:

```json
{
  "objections": [
    // Only price objections
  ]
}
```

Then run import - it will only process what's in the file.

---

## 📖 Related Documentation

- **SQL Schemas:** `backend/database/README_SQL_MIGRATIONS.md`
- **Backend API:** `backend/REVENUE_INTELLIGENCE_README.md`
- **Frontend Integration:** `FRONTEND_REVENUE_INTEGRATION.md`

---

## ✅ Quick Checklist

Use this to verify your setup:

- [ ] Backend virtual environment activated
- [ ] All SQL schemas executed in Supabase
- [ ] `.env` file configured with Supabase credentials
- [ ] Data files exist in `backend/data/`
- [ ] Run `python scripts/master_import.py`
- [ ] Verify data in Supabase UI
- [ ] Test APIs at `http://localhost:8000/docs`
- [ ] (Optional) Create test data: `create_revenue_test_data.py`

---

**Need Help?** Check the main backend README or open an issue.

**Last Updated:** November 30, 2025
**Version:** 1.0

