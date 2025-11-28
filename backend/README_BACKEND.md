# Sales Flow AI – Backend

FastAPI-Microservice, der die AI-Bridge für Chat, Follow-ups und Lead-Analysen abbildet.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional kannst du eine `.env` im Backend-Verzeichnis ablegen; Variablen werden automatisch geladen.

## Environment

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | API-Key für OpenAI Responses API |
| `OPENAI_MODEL` | ➖ | Optional, Default `gpt-4o-mini` |

## Server starten

```bash
uvicorn app.main:app --reload --port 8001
```

Der Health-Check liegt unter `GET /health`.

## Beispiel-Request

```bash
curl -X POST http://localhost:8001/ai \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_message",
    "data": {
      "messages": [
        {"role": "user", "content": "Schreib mir ein Follow-up für Lea"}
      ],
      "lead": {
        "name": "Lea Kramer",
        "status": "offen",
        "channel": "WhatsApp",
        "notes": "Hat Demo gesehen, wartet auf Angebot",
        "disg_type": "I",
        "extra": { "last_contact": "2024-11-20" }
      }
    }
  }'
```

Antwort:

```json
{
  "action": "generate_message",
  "reply": "Hey Lea! 👋 ..."
}
```
