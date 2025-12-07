# 🚀 SCHNELLSTART - Was du JETZT machen musst

## Schritt 1: Migration ausführen (5 Minuten) ⚠️

**Gehe zu Supabase Dashboard:**
1. Öffne https://supabase.com/dashboard
2. Wähle dein Projekt
3. Gehe zu "SQL Editor"
4. Kopiere den Inhalt von: `supabase/migrations/20250115_commission_tracker_and_features.sql`
5. Füge ein und klicke "Run"

**Fertig!** ✅

---

## Schritt 2: LLM wählen und einbauen (30 Minuten)

### Option A: Mit GPT (Empfohlen - am einfachsten)

**1. API Key holen:**
- Gehe zu https://platform.openai.com/api-keys
- Erstelle neuen Key
- Kopiere den Key

**2. In `.env` Datei (im `backend/` Ordner) hinzufügen:**
```
OPENAI_API_KEY=sk-dein-key-hier
```

**3. In `backend/app/routers/closing_coach.py` ersetzen:**

**Öffne die Datei und finde die Funktion `analyze_deal_for_closing()` (ca. Zeile 71)**

**Ersetze die GESAMTE Funktion mit diesem Code:**

```python
import openai
import json
from app.prompts.closing_coach_prompts import get_closing_coach_gpt_prompt
from app.config import get_settings

settings = get_settings()

async def analyze_deal_for_closing(deal_data: dict, conversation_history: List[dict]) -> dict:
    """Analysiert Deal mit GPT."""
    if not settings.openai_api_key:
        # Fallback wenn kein API Key
        return {
            "detected_blockers": [],
            "closing_score": 50.0,
            "closing_probability": "medium",
            "recommended_strategies": [],
            "suggested_next_action": "Follow-up planen",
            "objection_count": 0,
            "price_mentioned_count": 0,
        }
    
    try:
        prompt = get_closing_coach_gpt_prompt(deal_data, conversation_history)
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=prompt,
            temperature=0.3,
            max_tokens=2000,
            api_key=settings.openai_api_key
        )
        result_text = response.choices[0].message.content
        result = json.loads(result_text)
        return result
    except Exception as e:
        print(f"LLM Error: {e}")
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

**WICHTIG:** Am Anfang der Datei (nach den Imports) hinzufügen:
```python
import openai
import json
from app.prompts.closing_coach_prompts import get_closing_coach_gpt_prompt
from app.config import get_settings
```

**TIPP:** Siehe auch `backend/app/routers/closing_coach_mit_llm.py.example` für vollständiges Beispiel!

**4. Config prüfen:**
Die `openai_api_key` ist bereits in `backend/app/config.py` vorhanden (Zeile 136) ✅

**5. Package installieren:**
```bash
cd backend
pip install openai
```

**FERTIG!** ✅ Jetzt nutzt der Closing Coach echte KI!

---

## Schritt 3: Frontend-Seite erstellen (Optional - später)

**Erstelle:** `src/pages/ClosingCoachPage.tsx`

```typescript
import { useState, useEffect } from 'react';

export default function ClosingCoachPage() {
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    // API-Call
    fetch('/api/closing-coach/my-deals', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDeals(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Closing Coach</h1>
      
      {deals.map(deal => (
        <div key={deal.id} className="border p-4 mb-4">
          <h3>Deal: {deal.deal_id}</h3>
          <p>Closing Score: {deal.closing_score}/100</p>
          <p>Wahrscheinlichkeit: {deal.closing_probability}</p>
          
          {deal.detected_blockers.map(blocker => (
            <div key={blocker.type} className="bg-yellow-100 p-2 mt-2">
              <strong>{blocker.type}</strong>: {blocker.context}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**In `src/App.jsx` Route hinzufügen:**
```jsx
<Route path="closing-coach" element={<ClosingCoachPage />} />
```

---

## Das war's! 🎉

**Zusammenfassung:**
1. ✅ Migration ausführen (Supabase Dashboard)
2. ✅ GPT API Key setzen
3. ✅ Code in `closing_coach.py` ersetzen
4. ✅ `pip install openai`
5. ✅ Testen: `GET /api/closing-coach/my-deals`

**Alles andere kann später kommen!**

---

## Hilfe? 💬

- **Migration funktioniert nicht?** → Prüfe Supabase Logs
- **GPT gibt Fehler?** → Prüfe API Key
- **Frontend später?** → Kein Problem, Backend funktioniert auch so!

