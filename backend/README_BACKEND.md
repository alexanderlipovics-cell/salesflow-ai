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
| `SUPABASE_URL` | ✅ | Supabase Project URL (https://xyz.supabase.co) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-Role-Key für Inserts |

## Server starten

```bash
uvicorn app.main:app --reload --port 8001
```

Der Health-Check liegt unter `GET /health`.

## Bestandskunden-Import

Endpoint: `POST /import/leads`

- Content-Type `text/csv`: CSV direkt im Body (siehe `sample_data/import_example.csv`)
- Content-Type `application/json`: Entweder `{ "csv": "..." }` oder ein Array von Objekten
- Antwort: `{"total_rows": 12, "imported_count": 12, "needs_action_count": 5, "without_last_contact_count": 2, "errors": []}`

Die Daten werden in die Tabelle `leads` geschrieben. Falls vorhanden, analysiert die KI jedes Lead über `AIClient.generate` und setzt `status`, `needs_action`, `next_action_at`, `next_action_description`, `last_contact` sowie das Flag `import_batch_id`.

### Leads ohne Status anzeigen

- Endpoint: `GET /leads/needs-action?limit=8`
- Antwort: `{"leads": [{"name": "...", "email": "..."}]}`
- Verwendet von der Sidebar im Frontend, um Kontakte ohne Status/AI-Analyse hervorzuheben.

### Beispiel-Request (CSV)

```bash
curl -X POST http://localhost:8001/import/leads \
  -H "Content-Type: text/csv" \
  --data-binary @sample_data/import_example.csv
```

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
