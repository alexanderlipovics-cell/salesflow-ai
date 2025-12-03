# 🤖 AI PROMPTS SYSTEM - DEPLOYMENT GUIDE

Das **AI Prompts System** ist jetzt vollständig implementiert! 🎉

---

## 📋 WAS WURDE IMPLEMENTIERT?

### ✅ 1. Database Migration
- **File:** `backend/database/ai_prompts_migration.sql`
- **Tabellen:**
  - `ai_prompts` - Wiederverwendbare Prompt-Templates
  - `ai_prompt_executions` - Execution Log + User Feedback
- **Seed Data:** 12+ Standard-Prompts für Sales-Szenarien

### ✅ 2. Backend Services
- **AI Prompts Service** (`app/services/ai_prompts_service.py`)
  - Execute prompts mit GPT-4
  - Template-Platzhalter ersetzen
  - Usage-Statistiken tracken
  
- **WhatsApp Service** (`app/services/whatsapp_service.py`)
  - 3 Provider: UltraMsg, 360dialog, Twilio
  - Send message, send template
  
- **Interactive Chat Service** (`app/services/interactive_chat_service.py`)
  - GPT-Chat mit klickbaren Optionen
  - JSON-Response für UI-Elements
  
- **GPT Functions Service** (`app/services/gpt_functions_service.py`)
  - Function Calling: send_email, send_whatsapp, create_reminder
  - Autonome Aktionen durch GPT

### ✅ 3. API Routes
- **File:** `app/routers/ai_prompts.py`
  - `GET /api/ai-prompts/categories/{category}` - Get prompts by category
  - `POST /api/ai-prompts/execute` - Execute a prompt
  - `POST /api/ai-prompts/chat` - Interactive chat with GPT
  - `GET /api/ai-prompts/suggestions` - Get prompt suggestions for lead
  - `POST /api/ai-prompts/feedback` - Submit user feedback

- **File:** `app/routers/whatsapp.py`
  - `POST /api/whatsapp/send` - Send WhatsApp message
  - `POST /api/whatsapp/send-template` - Send template message
  - `GET /api/whatsapp/status` - Get integration status

### ✅ 4. Frontend Components
- **InteractiveChatMessage** - Message bubble mit klickbaren Optionen
- **AIPromptsPanel** - Browse + select prompts by category
- **WhatsAppIntegrationPanel** - Send WhatsApp direkt aus UI
- **GPTFunctionCallsDemo** - Full interactive chat demo
- **AIPromptsPage** - Complete page mit allen Features

---

## 🚀 DEPLOYMENT STEPS

### 1. Database Migration ausführen

```bash
cd backend
psql $DATABASE_URL -f database/ai_prompts_migration.sql
```

Oder via Supabase:
```bash
# Kopiere SQL-Inhalt aus ai_prompts_migration.sql
# Füge ein in Supabase Dashboard → SQL Editor → Run
```

### 2. Dependencies installieren

```bash
cd backend
pip install twilio --break-system-packages
# oder
pip install -r requirements.txt
```

### 3. Environment Variables setzen

Erstelle/aktualisiere `backend/.env`:

```bash
# REQUIRED
OPENAI_API_KEY=sk-...

# WhatsApp (choose one)
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your_token

# OR
WHATSAPP_PROVIDER=360dialog
DIALOG360_API_KEY=your_api_key

# OR
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 4. Backend starten

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 5. Frontend starten

```bash
cd salesflow-ai
npm run dev
```

### 6. Navigiere zu AI Prompts Page

```
http://localhost:5173/ai-prompts
```

---

## 🧪 TESTING

### Test 1: AI Prompt ausführen

```bash
curl -X POST http://localhost:8000/api/ai-prompts/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_id": "siehe_db_nach_migration",
    "input_values": {
      "lead_name": "Anna",
      "objection": "Das ist mir zu teuer",
      "personality_type": "Dominant",
      "context_summary": "Anna hat Interesse gezeigt, aber Preis-Einwand"
    }
  }'
```

### Test 2: WhatsApp senden

```bash
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Test von Sales Flow AI"
  }'
```

### Test 3: Interactive Chat

```bash
curl -X POST http://localhost:8000/api/ai-prompts/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Wie reagiere ich auf Preis-Einwände?"}
    ],
    "use_functions": false
  }'
```

### Test 4: GPT Function Calls

```bash
curl -X POST http://localhost:8000/api/ai-prompts/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Sende eine WhatsApp an Anna: Reminder für unser Meeting morgen"}
    ],
    "use_functions": true
  }'
```

---

## 📊 VERFÜGBARE PROMPT KATEGORIEN

1. **objection_handling** - Einwand-Behandlung (Preis, Zeit, etc.)
2. **upselling** - Upsell nach Erfolg
3. **coaching** - Meeting Prep, Win Probability, Tagesfokus
4. **followup** - Follow-ups nach Proposal, Demo, etc.
5. **leadgen** - Social DM Akquise
6. **nurture** - Lead Reaktivierung
7. **referral** - Empfehlungs-Bitten
8. **playbook_response** - FAQ-Antworten

---

## 🎯 USAGE IN FRONTEND

### Execute Prompt

```typescript
const executePrompt = async (promptId: string, inputValues: any) => {
  const response = await fetch('/api/ai-prompts/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt_id: promptId,
      input_values: inputValues,
      lead_id: currentLeadId  // optional
    })
  });
  
  const result = await response.json();
  console.log(result.output);  // GPT response
};
```

### Interactive Chat

```typescript
const sendMessage = async (messages: any[]) => {
  const response = await fetch('/api/ai-prompts/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages,
      use_functions: true  // Enable GPT function calling
    })
  });
  
  const result = await response.json();
  
  // result.message = GPT response text
  // result.options = [{ label, value, action }] or null
};
```

---

## 🔥 NEXT STEPS

1. **Custom Prompts erstellen:**
   - Füge eigene Prompts in `ai_prompts` Tabelle ein
   - Nutze `{{placeholders}}` für dynamische Werte

2. **Prompt Analytics:**
   - Tracke `usage_count`, `success_rate` in `ai_prompts`
   - User Feedback via `/api/ai-prompts/feedback`

3. **Auto-Suggestions:**
   - Nutze `/api/ai-prompts/suggestions?lead_id=xxx`
   - Zeige relevante Prompts basierend auf Lead-Kontext

4. **Multi-Channel Follow-ups:**
   - Kombiniere AI Prompts + WhatsApp + E-Mail
   - GPT kann autonom den besten Channel wählen

---

## 🎉 SUCCESS!

**Das AI Prompts System ist jetzt live!**

- ✅ 12+ Standard-Prompts
- ✅ GPT-4 Integration
- ✅ WhatsApp (3 Provider)
- ✅ Interactive Chat mit Optionen
- ✅ Function Calling (send_email, send_whatsapp, create_reminder)
- ✅ Frontend Components
- ✅ Full API

**DAS IST DER GAME-CHANGER FÜR SALES FLOW AI!** 🚀🤖📱

