# 🎯 CURSOR AI - ZERO-TOUCH INSTALLATION

**Sales Flow AI - Komplette Setup-Anleitung**

**Einfach Copy & Paste - Fertig!**

---

## 📋 VORAUSSETZUNGEN (5 Minuten Check)

```bash
# 1. Check ob alles da ist
node --version          # Sollte v18+ sein
npm --version           # Sollte 9+ sein
python --version        # Sollte 3.10+ sein

# 2. Supabase CLI installieren (falls nicht da)
npm install -g supabase

# 3. Login Supabase
supabase login

# 4. Check ob Projekt linked ist
cd salesflow-ai
supabase status
```

**Falls noch KEIN Supabase-Projekt:**

```bash
# Mit deinem Projekt verbinden
cd salesflow-ai
supabase link --project-ref lncwvbhcafkdorypnpnz
```

---

## 🗂️ STEP 1: PROJECT SETUP (Terminal)

### **Frontend Dependencies**

```bash
cd salesflow-ai

# Dependencies installieren (falls noch nicht geschehen)
npm install

# Zusätzliche Dependencies für neue Features
npm install framer-motion
npm install zustand
npm install @tanstack/react-query
npm install class-variance-authority tailwind-merge

echo "✅ Frontend Dependencies installiert!"
```

### **Backend Dependencies**

```bash
cd backend

# Virtual Environment erstellen (falls noch nicht vorhanden)
python -m venv venv

# Aktivieren (Windows)
.\venv\Scripts\Activate.ps1

# Aktivieren (Mac/Linux)
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

echo "✅ Backend Dependencies installiert!"
```

### **Environment Files erstellen**

**Frontend (.env):**

```bash
cd salesflow-ai

cat > .env << 'EOF'
# Sales Flow AI - Frontend Environment Variables

# API Configuration
VITE_API_BASE_URL=/api

# Supabase Configuration
VITE_SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_ANON_KEY_HIER

# OpenAI (für Edge Functions)
VITE_OPENAI_API_KEY=sk-DEIN_OPENAI_KEY_HIER
EOF

echo "✅ Frontend .env erstellt!"
```

**Backend (.env):**

```bash
cd backend

cat > .env << 'EOF'
# Sales Flow AI Backend - Environment Variables

# OpenAI API Configuration
OPENAI_API_KEY=sk-DEIN_OPENAI_KEY_HIER

# Supabase Configuration
SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
SUPABASE_KEY=DEIN_ANON_KEY_HIER
SUPABASE_SERVICE_KEY=DEIN_SERVICE_ROLE_KEY_HIER

# Server Configuration
PORT=8000
HOST=0.0.0.0

# Environment
ENVIRONMENT=development
DEBUG=True
BACKEND_PORT=8000
EOF

echo "✅ Backend .env erstellt!"
```

**🔑 API Keys holen:**

1. **Supabase:** https://lncwvbhcafkdorypnpnz.supabase.co/project/settings/api
   - Kopiere `anon/public` Key → `VITE_SUPABASE_ANON_KEY` und `SUPABASE_KEY`
   - Kopiere `service_role` Key → `SUPABASE_SERVICE_KEY`

2. **OpenAI:** https://platform.openai.com/api-keys
   - Erstelle neuen API Key → `OPENAI_API_KEY` und `VITE_OPENAI_API_KEY`

---

## 🗄️ STEP 2: DATABASE SETUP (Supabase Dashboard)

### **Option A: Alles in einem (EMPFOHLEN)**

**1. Öffne Supabase SQL Editor:**

```
https://lncwvbhcafkdorypnpnz.supabase.co/project/_/sql/new
```

**2. Führe diese Schemas nacheinander aus:**

#### **Schema 1: Multi-Language / Company Core**

```bash
# Kopiere gesamten Inhalt von:
# backend/db/schema_multi_language_core.sql

# In Supabase SQL Editor einfügen und RUN!
```

**Erwartete Ausgabe:**
```
✅ Multi-Language / Company Core Schema erfolgreich erstellt!
📋 Tabellen: mlm_companies, templates, template_translations, template_performance
🧠 Neuro-Profiler: leads erweitert, disc_analyses
🎮 Speed-Hunter: speed_hunter_sessions, speed_hunter_actions
💪 Einwand-Killer: objection_templates, objection_logs
🛡️ Liability-Shield: compliance_rules, compliance_violations
```

#### **Schema 2: Bestehende Migrationen (falls noch nicht ausgeführt)**

Führe nacheinander aus (falls noch nicht geschehen):

```bash
# In Supabase SQL Editor:
# 1. 20251128_add_followup_fields.sql
# 2. 20251128_add_import_columns.sql
# 3. 20251129_add_next_action_at_to_leads.sql
# 4. 20251129_create_followup_tasks_table.sql
# 5. 20251129_create_sales_scenarios_table.sql
# 6. 20251129_create_template_performance.sql
# 7. 20251129_disable_rls_leads.sql
# 8. 20251130_create_sales_content_waterfall.sql
```

### **Option B: Über Supabase CLI (Automatisch)**

```bash
cd salesflow-ai

# 1. Multi-Language Core Migration erstellen
cp ../backend/db/schema_multi_language_core.sql supabase/migrations/20250101_multi_language_core.sql

# 2. Push to Supabase
supabase db push

echo "✅ Database deployed!"
```

---

## ☁️ STEP 3: EDGE FUNCTION DEPLOY (Optional)

**Falls du die analyze-profile Edge Function brauchst:**

```bash
cd salesflow-ai

# 1. Edge Function Ordner erstellen
mkdir -p supabase/functions/analyze-profile

# 2. Function Code erstellen (siehe NEURO_PROFILER/02_edge_function.ts)
# → Kopiere den Code in supabase/functions/analyze-profile/index.ts

# 3. Secrets setzen
supabase secrets set OPENAI_API_KEY=sk-DEIN_KEY_HIER

# 4. Deploy
supabase functions deploy analyze-profile

# 5. Test
curl -i --location --request POST \
  'https://lncwvbhcafkdorypnpnz.supabase.co/functions/v1/analyze-profile' \
  --header 'Authorization: Bearer DEIN_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"lead_id":"test","chat_messages":["Hey","Cool"]}'

echo "✅ Edge Function deployed!"
```

---

## 🤖 STEP 4: CURSOR AI PROMPTS (In Cursor einfügen)

### **PROMPT 1: Multi-Language Core Types**

```
📋 TASK: Create TypeScript types for Multi-Language Core Schema

Create these files:

1. src/types/multiLanguageCore.ts

Export types matching the database schema:

- MLMCompany (id, slug, display_name, default_language, allowed_languages, compliance_profile, risk_level, brand_tone)
- Template (id, company_id, funnel_stage, channel, use_case, persona_hint, is_active)
- TemplateTranslation (id, template_id, language_code, region, subject, body, tone_variation, compliance_status, version)
- TemplatePerformance (id, template_id, translation_id, company_id, language_code, funnel_stage, channel, times_used, times_sent, delivery_rate, open_rate, response_rate, conversion_rate, performance_score)

2. src/types/speedHunter.ts

- SpeedHunterSession (id, user_id, started_at, ended_at, daily_goal, mode, total_contacts, total_points, streak_day)
- SpeedHunterAction (id, session_id, user_id, lead_id, action_type, outcome, points)

3. src/types/compliance.ts

- ComplianceRule (id, locale, company_id, category, pattern_type, pattern, severity, suggestion, legal_reference_url, is_active)
- ComplianceViolation (id, user_id, company_id, rule_id, category, severity, locale, original_text, suggested_text, status, metadata)

Use existing database types from src/types/database.ts as reference.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 2: Supabase Client Setup (falls noch nicht vorhanden)**

```
📋 TASK: Set up Supabase clients with TypeScript

Check if these files exist:

1. src/lib/supabase.ts oder src/lib/supabaseClient.ts

If not, create:

- Browser client with VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- Export: createClient() function

If exists, verify it uses:
- process.env.VITE_SUPABASE_URL
- process.env.VITE_SUPABASE_ANON_KEY

Ensure TypeScript types are properly imported.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 3: Database Types Generation**

```
📋 TASK: Generate TypeScript types from Supabase

Run this command to generate types:

npx supabase gen types typescript --project-id lncwvbhcafkdorypnpnz > src/types/database.ts

Then verify these types exist:

1. src/types/leads.ts
   - Lead, LeadStatus, LeadSource
   - DISCType, DISCProfile (disc_primary, disc_secondary, disc_confidence)
   - SpeedQueueLead

2. src/types/templates.ts
   - Template, TemplateCategory
   - TemplatePerformance
   - SalesContent

If types don't match new schema, update them to include:
- disc_primary, disc_secondary, disc_confidence in Lead
- mlm_companies, template_translations types
- speed_hunter_sessions, speed_hunter_actions types
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 4: Multi-Language Core Hooks**

```
📋 TASK: Create React hooks for Multi-Language Core

Create these hooks:

1. src/hooks/useMLMCompanies.ts

- Fetch all companies: getCompanies()
- Get company by slug: getCompanyBySlug(slug)
- Create company: createCompany(data)
- Update company: updateCompany(id, data)

2. src/hooks/useTemplates.ts

- Fetch templates: getTemplates(filters: { company_id?, funnel_stage?, channel?, use_case? })
- Get template with translations: getTemplateWithTranslations(template_id, language_code)
- Create template: createTemplate(data)
- Create translation: createTranslation(template_id, translation_data)
- Get best performing template: getBestTemplate(filters, language_code)

3. src/hooks/useTemplatePerformance.ts

- Track usage: trackTemplateUsage(template_id, translation_id, event_type)
- Get performance: getTemplatePerformance(template_id, translation_id)
- Update metrics: updateMetrics(template_id, translation_id, metrics)

Use Supabase client from src/lib/supabase.ts
Use React Query (@tanstack/react-query) for caching
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 5: Speed-Hunter Integration**

```
📋 TASK: Create Speed-Hunter component and hooks

Create:

1. src/hooks/useSpeedHunter.ts

- Start session: startSession(daily_goal, mode)
- Get active session: getActiveSession()
- End session: endSession(session_id)
- Get session stats: getSessionStats(session_id)
- Log action: logAction(session_id, lead_id, action_type, outcome, points)

2. src/components/speedhunter/SpeedHunterInterface.tsx

- Full-screen overlay
- Lead queue display
- Action buttons (Call, Message, Snooze, Done)
- Points counter
- Progress bar (current/total_goal)
- Session stats

3. src/pages/SpeedHunterPage.tsx

- Button to launch SpeedHunterInterface
- Stats from previous sessions
- Daily goal setting
- Leaderboard (optional)

Use existing SpeedHunter component as reference if available.
Ensure it uses new speed_hunter_sessions and speed_hunter_actions tables.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 6: Compliance Layer Integration**

```
📋 TASK: Create Compliance checking system

Create:

1. src/hooks/useCompliance.ts

- Check text: checkCompliance(text, locale, company_id)
- Returns: { violations: ComplianceViolation[], safe_text: string, warnings: string[] }
- Get rules: getComplianceRules(locale, company_id, category?)
- Create violation: createViolation(violation_data)

2. src/services/complianceService.ts

- scanText(text, locale, company_id): Scan text against compliance_rules
- generateSafeText(original_text, violations): Generate AI-safe alternative
- applyPatterns(text, patterns): Apply regex/keyword patterns

3. src/components/common/ComplianceWarning.tsx

- Display compliance warnings
- Show original vs suggested text
- Accept/Override buttons
- Status: pending, accepted, overridden

Integrate into template preview/editor components.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 7: DISG Profiler Integration**

```
📋 TASK: Enhance DISG Profiler with new schema

Update existing DISG components to use new schema:

1. Check if src/hooks/useSalesPersona.ts exists
   - Update to use disc_primary, disc_secondary, disc_confidence from leads table
   - Add disc_analyses logging

2. Create src/hooks/useDISCAnalysis.ts

- Analyze lead: analyzeLead(lead_id, source, chat_messages?)
- Get analysis history: getAnalysisHistory(lead_id)
- Update lead DISG: updateLeadDISG(lead_id, disc_data)

3. Update src/components/leads/LeadDetail.tsx (or similar)

- Display disc_primary, disc_secondary, disc_confidence
- Show analysis history
- Button to re-analyze

Use existing Neuro-Profiler code as reference.
Ensure it writes to disc_analyses table.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 8: Template Editor with Multi-Language**

```
📋 TASK: Create Multi-Language Template Editor

Create:

1. src/components/templates/TemplateEditor.tsx

- Template metadata form (funnel_stage, channel, use_case, persona_hint)
- Multi-language translation tabs
- Add/remove languages
- Tone variation selector (formal, casual, soft, direct)
- Compliance status indicator
- Preview with variable substitution

2. src/components/templates/TranslationEditor.tsx

- Language selector
- Subject field (for email)
- Body textarea with variable hints
- Tone variation selector
- Save as draft / Submit for approval

3. src/pages/TemplatesPage.tsx

- List all templates with filters
- Create new template button
- Edit template
- View performance metrics
- Language switcher

Use existing template components as reference.
Integrate with useTemplates hook.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 9: Objection Templates Integration**

```
📋 TASK: Integrate Objection Templates with new schema

Update existing objection handling:

1. Check src/hooks/useObjectionBrain.ts
   - Update to use objection_templates table
   - Filter by company_id, objection_key, funnel_stage, disc_type
   - Log to objection_logs after response

2. Create src/hooks/useObjectionTemplates.ts

- Get templates: getObjectionTemplates(filters)
- Get best template: getBestTemplate(objection_key, funnel_stage, disc_type, language_code)
- Log outcome: logObjectionOutcome(lead_id, objection_key, template_id, outcome)

3. Update src/components/objections/ObjectionBrain.tsx

- Use new objection_templates table
- Show style (logical, emotional, provocative)
- Show step (acknowledge, clarify, reframe, close)
- Track outcome in objection_logs

Ensure backward compatibility with existing objections table.
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

### **PROMPT 10: Testing & Cleanup**

```
📋 TASK: Add error handling and testing

1. Add error boundaries to all pages
2. Add loading states with React Suspense
3. Add toast notifications for user actions (use existing toast system if available)
4. Test all Supabase queries work
5. Test Multi-Language template creation
6. Test Speed-Hunter session works
7. Test Compliance checking works
8. Test DISG analysis works
9. Clean up any unused imports
10. Format all files with Prettier

Verify:
- No TypeScript errors
- No console errors
- All pages render
- Database queries work
- New features integrate with existing code
```

**→ Drücke Enter in Cursor, lass AI arbeiten**

---

## ✅ VERIFICATION CHECKLIST

Nach jedem Cursor Prompt:

```bash
# Check TypeScript Errors
cd salesflow-ai
npm run build

# Check if app runs
npm run dev
# → Open http://localhost:5173

# Check Backend runs
cd backend
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate      # Mac/Linux
python -m uvicorn app.main:app --reload --port 8000
# → Open http://localhost:8000/docs

# Check Supabase connection
# → Login sollte funktionieren
# → Leads page sollte laden

# Check Multi-Language Core
# → Templates page öffnen
# → Neues Template erstellen
# → Übersetzung hinzufügen

# Check Speed-Hunter
# → Speed Hunter page öffnen
# → Session starten
# → Leads sollten erscheinen

# Check Compliance
# → Template erstellen mit problematischem Text
# → Compliance-Warnung sollte erscheinen
```

---

## 🚀 DEPLOYMENT (Vercel/Netlify - Optional)

### **Frontend (Vercel)**

```bash
# 1. Vercel CLI installieren
npm i -g vercel

# 2. Deploy
cd salesflow-ai
vercel

# 3. Environment Variables in Vercel Dashboard setzen
# → VITE_SUPABASE_URL
# → VITE_SUPABASE_ANON_KEY
# → VITE_OPENAI_API_KEY

# 4. Production Deploy
vercel --prod
```

### **Backend (Railway/Render/Fly.io)**

```bash
# 1. Railway CLI installieren
npm i -g @railway/cli

# 2. Login
railway login

# 3. Deploy
cd backend
railway up

# 4. Environment Variables in Railway Dashboard setzen
# → SUPABASE_URL
# → SUPABASE_KEY
# → SUPABASE_SERVICE_KEY
# → OPENAI_API_KEY
```

---

## 📊 POST-INSTALLATION

```bash
# 1. Test mit echten Daten

# - MLM Company anlegen
# - Templates mit Übersetzungen erstellen
# - Speed Hunter Session testen
# - Compliance-Regeln testen
# - DISG Analyse laufen lassen

# 2. Performance Check

# - Lighthouse Score
# - Bundle Size
# - Database Query Performance

# 3. Security Check

# - RLS Policies testen
# - Auth middleware testen
# - Edge Function Auth testen
```

---

## 🎯 SUMMARY

**Was passiert:**

1. ✅ Dependencies installiert (5 min)
2. ✅ Environment Files erstellt (2 min)
3. ✅ Database deployed (5 min)
4. ✅ Cursor AI erstellt alle Components (45 min)
5. ✅ Testing & Cleanup (15 min)

**Total: ~70 Minuten Zero-Touch Installation**

---

## 🆘 TROUBLESHOOTING

### TypeScript Errors

```bash
# Regenerate types
cd salesflow-ai
npx supabase gen types typescript --project-id lncwvbhcafkdorypnpnz > src/types/database.ts

# Clear cache
rm -rf node_modules/.vite
npm run build
```

### Supabase Connection Errors

```bash
# Check environment variables
cat salesflow-ai/.env
cat backend/.env

# Test connection
node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

### Database Schema Errors

```bash
# Check if tables exist
# In Supabase SQL Editor:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# Should show:
# - mlm_companies
# - templates
# - template_translations
# - template_performance
# - speed_hunter_sessions
# - speed_hunter_actions
# - objection_templates
# - objection_logs
# - compliance_rules
# - compliance_violations
# - disc_analyses
```

### Backend Connection Errors

```bash
# Check if backend is running
curl http://localhost:8000/health

# Should return:
# {"status":"online","database":"connected"}

# If not, start backend:
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

---

## 📚 WEITERE RESSOURCEN

- **Schema Dokumentation:** `backend/db/README_MULTI_LANGUAGE_CORE.md`
- **Backend Setup:** `backend/README.md`
- **Frontend Setup:** `salesflow-ai/README.md`
- **Supabase Migration Guide:** `backend/SUPABASE_MIGRATION_GUIDE.md`

---

## ✨ FERTIG!

**Du hast jetzt:**

✅ Komplettes Vite/React Projekt  
✅ Supabase Integration  
✅ Multi-Language Core Schema  
✅ Speed-Hunter System  
✅ Compliance Layer  
✅ DISG Profiler  
✅ Template Management  
✅ Production-Ready!  

**Next: Add mehr Features aus dem 18-Feature Plan!** 🚀

