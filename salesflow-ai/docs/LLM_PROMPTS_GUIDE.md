# LLM Prompts Guide - SalesFlow AI

Dieses Dokument beschreibt die Prompts für die Integration von GPT, Claude und Gemini in SalesFlow AI.

## Übersicht

Wir verwenden 3 Haupt-Prompts für die wichtigsten Features:

1. **Closing Coach** - Deal-Analyse und Closing-Strategien
2. **Cold Call Assistant** - Script-Generierung für Kaltakquise
3. **Performance Coach** - Performance-Analyse und Coaching-Empfehlungen

## Verwendung

### 1. Closing Coach

**Datei:** `backend/app/prompts/closing_coach_prompts.py`

**Für GPT (OpenAI):**
```python
from app.prompts.closing_coach_prompts import get_closing_coach_gpt_prompt

prompt = get_closing_coach_gpt_prompt(deal_data, conversation_history)
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=prompt,
    temperature=0.3
)
```

**Für Claude (Anthropic):**
```python
from app.prompts.closing_coach_prompts import get_closing_coach_claude_prompt

prompt = get_closing_coach_claude_prompt(deal_data, conversation_history)
response = anthropic.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=2000,
    messages=[{"role": "user", "content": prompt}]
)
```

**Für Gemini (Google):**
```python
from app.prompts.closing_coach_prompts import get_closing_coach_gemini_prompt

prompt = get_closing_coach_gemini_prompt(deal_data, conversation_history)
response = gemini.generate_content(
    prompt,
    generation_config={"temperature": 0.3}
)
```

### 2. Cold Call Assistant

**Datei:** `backend/app/prompts/cold_call_prompts.py`

**Verwendung:**
```python
from app.prompts.cold_call_prompts import (
    get_cold_call_gpt_prompt,
    get_cold_call_claude_prompt,
    get_cold_call_gemini_prompt
)

# Für GPT
prompt = get_cold_call_gpt_prompt(contact_data, goal="book_meeting")

# Für Claude
prompt = get_cold_call_claude_prompt(contact_data, goal="book_meeting")

# Für Gemini
prompt = get_cold_call_gemini_prompt(contact_data, goal="book_meeting")
```

### 3. Performance Coach

**Datei:** `backend/app/prompts/performance_coach_prompts.py`

**Verwendung:**
```python
from app.prompts.performance_coach_prompts import (
    get_performance_coach_gpt_prompt,
    get_performance_coach_claude_prompt,
    get_performance_coach_gemini_prompt
)

# Metriken sammeln
metrics = {
    "period_start": "2025-01-01",
    "period_end": "2025-01-31",
    "calls_made": 45,
    "deals_won": 8,
    # ... weitere Metriken
}

comparison = {
    "prev_calls_made": 40,
    "calls_change_percent": 12.5,
    # ... weitere Vergleiche
}

lost_deals = [...]  # Liste von verlorenen Deals

# Für GPT
prompt = get_performance_coach_gpt_prompt(metrics, comparison, lost_deals)
```

## JSON-Response Parsing

Alle Prompts geben JSON zurück. Beispiel-Parsing:

```python
import json

# Response von LLM
llm_response = response.choices[0].message.content  # GPT
# oder
llm_response = response.content[0].text  # Claude
# oder
llm_response = response.text  # Gemini

# Parse JSON
try:
    result = json.loads(llm_response)
except json.JSONDecodeError:
    # Fallback: Versuche JSON aus Text zu extrahieren
    import re
    json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
    if json_match:
        result = json.loads(json_match.group())
    else:
        raise ValueError("No valid JSON found in response")
```

## Best Practices

1. **Temperature:** Verwende niedrige Temperature (0.2-0.3) für konsistente, strukturierte Antworten
2. **Max Tokens:** Setze ausreichend Tokens (2000-4000) für vollständige JSON-Responses
3. **Error Handling:** Immer JSON-Parsing mit Fallback implementieren
4. **Caching:** Cache häufige Anfragen (z.B. gleiche Kontakte)
5. **Rate Limiting:** Respektiere API-Limits der verschiedenen Provider

## Integration in bestehende Router

Die Prompts können direkt in die bestehenden Router integriert werden:

```python
# backend/app/routers/closing_coach.py
from app.prompts.closing_coach_prompts import get_closing_coach_gpt_prompt
import openai

async def analyze_deal_with_llm(deal_data, conversation_history):
    prompt = get_closing_coach_gpt_prompt(deal_data, conversation_history)
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=prompt,
        temperature=0.3
    )
    
    result = json.loads(response.choices[0].message.content)
    return result
```

## Testing

Teste die Prompts mit verschiedenen Szenarien:

1. **Closing Coach:**
   - Deal mit vielen Einwänden
   - Deal kurz vor Abschluss
   - Deal ohne Aktivität

2. **Cold Call Assistant:**
   - Neuer Kontakt (keine Historie)
   - Kontakt mit vorherigem Kontakt
   - Verschiedene Ziele (Termin, Qualifizierung)

3. **Performance Coach:**
   - Verbesserte Performance
   - Verschlechterte Performance
   - Stabile Performance

## Nächste Schritte

1. ✅ Prompts erstellt
2. ⏳ LLM-Integration in Router implementieren
3. ⏳ Error Handling und Fallbacks
4. ⏳ Caching-Strategie
5. ⏳ Testing mit echten Daten

