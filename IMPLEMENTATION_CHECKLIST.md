# ✅ Implementation Checklist - Neue Features

## Was ist bereits fertig? ✅

1. ✅ **Datenbank-Migration** erstellt
   - Datei: `supabase/migrations/20250115_commission_tracker_and_features.sql`
   - Tabellen: commissions, closing_insights, performance_insights, gamification, cold_call_sessions, route_plans

2. ✅ **Backend-Router** erstellt
   - `backend/app/routers/commissions.py` - Provisions-Tracker
   - `backend/app/routers/closing_coach.py` - Closing Coach
   - `backend/app/routers/cold_call_assistant.py` - Kaltakquise-Assistent

3. ✅ **LLM-Prompts** erstellt
   - `backend/app/prompts/closing_coach_prompts.py`
   - `backend/app/prompts/cold_call_prompts.py`
   - `backend/app/prompts/performance_coach_prompts.py`

4. ✅ **Router registriert** in `backend/app/main.py`

---

## Was musst du jetzt machen? 📋

### Schritt 1: Datenbank-Migration ausführen ⚠️ WICHTIG

```bash
# Migration ausführen (Supabase CLI)
supabase migration up

# ODER manuell in Supabase Dashboard:
# 1. Gehe zu Supabase Dashboard → SQL Editor
# 2. Kopiere Inhalt von: supabase/migrations/20250115_commission_tracker_and_features.sql
# 3. Führe aus
```

**Prüfen ob Migration erfolgreich:**
```sql
-- In Supabase SQL Editor ausführen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('commissions', 'closing_insights', 'cold_call_sessions');
```

---

### Schritt 2: LLM-Integration in Router einbauen 🔧

Die Router haben aktuell **Placeholder-Logik**. Du musst die echten LLM-Calls einbauen.

#### Option A: Mit GPT (OpenAI)

1. **API Key setzen:**
```bash
# In .env oder Environment Variables
OPENAI_API_KEY=sk-...
```

2. **In `backend/app/routers/closing_coach.py` einbauen:**

```python
# Am Anfang der Datei hinzufügen:
import openai
import json
from app.prompts.closing_coach_prompts import get_closing_coach_gpt_prompt
from app.config import get_settings

settings = get_settings()

# Ersetze die Funktion analyze_deal_for_closing():
async def analyze_deal_for_closing(deal_data: dict, conversation_history: List[dict]) -> dict:
    """Analysiert Deal mit GPT."""
    try:
        prompt = get_closing_coach_gpt_prompt(deal_data, conversation_history)
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=prompt,
            temperature=0.3,
            max_tokens=2000
        )
        
        result_text = response.choices[0].message.content
        result = json.loads(result_text)
        return result
        
    except Exception as e:
        # Fallback auf Placeholder
        return {
            "detected_blockers": [],
            "closing_score": 50.0,
            "closing_probability": "medium",
            "recommended_strategies": [],
            "suggested_next_action": "Follow-up planen",
            "objection_count": 0,
            "price_mentioned_count": 0,
        }
```

#### Option B: Mit Claude (Anthropic)

```python
import anthropic
import json
from app.prompts.closing_coach_prompts import get_closing_coach_claude_prompt

async def analyze_deal_for_closing(deal_data: dict, conversation_history: List[dict]) -> dict:
    """Analysiert Deal mit Claude."""
    try:
        prompt = get_closing_coach_claude_prompt(deal_data, conversation_history)
        
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result_text = response.content[0].text
        result = json.loads(result_text)
        return result
        
    except Exception as e:
        # Fallback
        ...
```

#### Option C: Mit Gemini (Google)

```python
import google.generativeai as genai
import json
from app.prompts.closing_coach_prompts import get_closing_coach_gemini_prompt

async def analyze_deal_for_closing(deal_data: dict, conversation_history: List[dict]) -> dict:
    """Analysiert Deal mit Gemini."""
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = get_closing_coach_gemini_prompt(deal_data, conversation_history)
        response = await model.generate_content_async(prompt)
        
        result = json.loads(response.text)
        return result
        
    except Exception as e:
        # Fallback
        ...
```

**WICHTIG:** Mache das gleiche für:
- `cold_call_assistant.py` → `generate_personalized_script()`
- `performance_coach.py` (noch zu erstellen) → Performance-Analyse

---

### Schritt 3: Frontend-Komponenten erstellen 🎨

Erstelle React-Komponenten für die neuen Features:

#### 3.1 Provisions-Tracker Page

**Datei:** `src/pages/CommissionTrackerPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CommissionTrackerPage() {
  const [commissions, setCommissions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // API-Call: GET /api/commissions?month=2025-01-01
  useEffect(() => {
    fetchCommissions();
  }, [selectedMonth]);

  return (
    <div>
      <h1>Meine Provisionen</h1>
      {/* Monatsauswahl */}
      {/* Liste der Provisionen */}
      {/* PDF-Export Button */}
      {/* "An Buchhaltung" Button */}
    </div>
  );
}
```

#### 3.2 Closing Coach Page

**Datei:** `src/pages/ClosingCoachPage.tsx`

```typescript
export default function ClosingCoachPage() {
  // API-Call: GET /api/closing-coach/my-deals
  // Zeige Deals mit Closing-Score
  // Blocker-Anzeige
  // Empfohlene Strategien
}
```

#### 3.3 Cold Call Assistant Page

**Datei:** `src/pages/ColdCallAssistantPage.tsx`

```typescript
export default function ColdCallAssistantPage() {
  // API-Call: POST /api/cold-call/generate-script/{contact_id}
  // Zeige Script
  // Session-Manager
  // Übungsmodus
}
```

**Routing hinzufügen in `src/App.jsx`:**
```jsx
<Route path="commissions" element={<CommissionTrackerPage />} />
<Route path="closing-coach" element={<ClosingCoachPage />} />
<Route path="cold-call" element={<ColdCallAssistantPage />} />
```

---

### Schritt 4: API-Keys konfigurieren 🔑

**Datei:** `backend/app/config.py` oder `.env`

```python
# .env
OPENAI_API_KEY=sk-...
# ODER
ANTHROPIC_API_KEY=sk-ant-...
# ODER
GEMINI_API_KEY=...
```

**In `backend/app/config.py` hinzufügen:**
```python
class Settings(BaseSettings):
    # ... bestehende Settings
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
```

---

### Schritt 5: Testen 🧪

1. **Backend testen:**
```bash
cd backend
python -m pytest tests/test_commissions.py
python -m pytest tests/test_closing_coach.py
```

2. **API-Endpunkte testen:**
```bash
# Mit curl oder Postman
curl -X GET http://localhost:8000/api/commissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Frontend testen:**
- Öffne `/commissions` im Browser
- Öffne `/closing-coach` im Browser
- Öffne `/cold-call` im Browser

---

## Priorisierung 🎯

**Wenn du wenig Zeit hast, mache zuerst:**

1. ✅ Migration ausführen (5 Min)
2. ✅ Einen LLM-Provider wählen (GPT/Claude/Gemini) (10 Min)
3. ✅ LLM-Integration in **einen** Router (Closing Coach) (30 Min)
4. ✅ Eine Frontend-Page (Closing Coach) (1-2h)

**Dann später:**
- Restliche Router
- Restliche Frontend-Pages
- Gamification
- Route Planner

---

## Hilfe benötigt? 💬

- **Migration-Probleme?** → Prüfe Supabase Logs
- **LLM-Integration?** → Siehe `docs/LLM_PROMPTS_GUIDE.md`
- **Frontend?** → Nutze bestehende Pages als Vorlage (z.B. `ChatPage.tsx`)

---

## Zusammenfassung 📝

**Du musst JETZT machen:**
1. ⚠️ Migration ausführen (wichtig!)
2. 🔧 LLM-Integration in Router (wähle einen Provider)
3. 🎨 Frontend-Komponenten erstellen (oder später)

**Alles andere kann warten!**

