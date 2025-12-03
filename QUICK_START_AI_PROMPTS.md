# ⚡ QUICK START - AI PROMPTS SYSTEM

## 🚀 IN 5 MINUTEN STARTKLAR!

---

## STEP 1: DATABASE MIGRATION

```bash
cd backend

# Option A: PostgreSQL
psql $DATABASE_URL -f database/ai_prompts_migration.sql

# Option B: Supabase Dashboard
# 1. Öffne Supabase Dashboard → SQL Editor
# 2. Kopiere Inhalt aus database/ai_prompts_migration.sql
# 3. Run SQL
```

**✅ Ergebnis:** 2 neue Tabellen + 12 Standard-Prompts

---

## STEP 2: DEPENDENCIES

```bash
cd backend
pip install twilio
```

---

## STEP 3: ENVIRONMENT VARIABLES

Erstelle/ergänze `backend/.env`:

```bash
# REQUIRED
OPENAI_API_KEY=sk-proj-...

# WhatsApp (WÄHLE EINEN - Empfehlung: UltraMsg)
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your_token_here
```

**WhatsApp Setup:**
- **UltraMsg:** https://ultramsg.com/ (5 Min Setup)
- **360dialog:** https://www.360dialog.com/ (Business API)
- **Twilio:** https://www.twilio.com/ (Enterprise)

Siehe: `backend/WHATSAPP_SETUP_GUIDE.md`

---

## STEP 4: BACKEND STARTEN

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**✅ Check:** http://localhost:8000/docs

---

## STEP 5: FRONTEND STARTEN

```bash
cd salesflow-ai
npm run dev
```

**✅ Check:** http://localhost:5173/ai-prompts

---

## STEP 6: TESTEN! 🧪

### Test 1: WhatsApp Status
```bash
curl http://localhost:8000/api/whatsapp/status
```

**Erwartete Response:**
```json
{
  "provider": "ultramsg",
  "configured": true,
  "ready": true
}
```

### Test 2: AI Prompt ausführen

```bash
curl -X POST http://localhost:8000/api/ai-prompts/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_id": "siehe_db_nach_migration",
    "input_values": {
      "lead_name": "Anna",
      "objection": "zu teuer",
      "personality_type": "Dominant",
      "context_summary": "Hat Interesse gezeigt"
    }
  }'
```

### Test 3: WhatsApp senden

```bash
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Test von Sales Flow AI 🚀"
  }'
```

### Test 4: Interactive Chat

Öffne Frontend:
```
http://localhost:5173/ai-prompts
```

Klicke auf:
1. Kategorie (z.B. "🛡️ Einwand-Behandlung")
2. Prompt auswählen
3. Im Chat testen

---

## ✅ FERTIG!

**Du hast jetzt:**
- ✅ 12+ AI Prompts ready
- ✅ WhatsApp Integration
- ✅ Interactive GPT Chat
- ✅ Function Calling
- ✅ Frontend UI

---

## 🔥 NÄCHSTE SCHRITTE

1. **Custom Prompts erstellen:**
   ```sql
   INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema)
   VALUES (
     'Mein Custom Prompt',
     'coaching',
     'Beschreibung',
     'Template mit {{placeholders}}',
     '{"placeholder":"string"}'
   );
   ```

2. **WhatsApp in Workflows integrieren:**
   - Objection Brain → WhatsApp
   - Follow-up Engine → WhatsApp
   - Squad Coach → WhatsApp

3. **Analytics nutzen:**
   ```sql
   SELECT 
     name, 
     usage_count, 
     success_rate 
   FROM ai_prompts 
   ORDER BY usage_count DESC;
   ```

---

## 🚨 TROUBLESHOOTING

### "OPENAI_API_KEY not set"
→ Füge `OPENAI_API_KEY=sk-...` in `backend/.env` hinzu

### "WhatsApp credentials not configured"
→ Füge WhatsApp Provider Credentials in `.env` hinzu  
→ Check: `curl http://localhost:8000/api/whatsapp/status`

### Frontend zeigt 404
→ Backend muss auf Port 8000 laufen  
→ Check: `curl http://localhost:8000/api/health`

### Database Migration Error
→ Nutze Supabase SQL Editor statt psql  
→ Copy/Paste SQL direkt

---

## 📚 MEHR INFOS

- **Full Guide:** `AI_PROMPTS_COMPLETE_SYSTEM.md`
- **WhatsApp Setup:** `backend/WHATSAPP_SETUP_GUIDE.md`
- **Deployment:** `backend/AI_PROMPTS_DEPLOYMENT.md`
- **API Docs:** http://localhost:8000/docs

---

**🎉 VIEL ERFOLG MIT DEM AI PROMPTS SYSTEM! 🚀**

