# salesflow-ai
KI-gestütztes Vertriebs-CRM

## KI-Cloud-Bridge Test

Manueller Test der Netlify Function mit Lead-Kontext:

```
curl -X POST https://<netlify-url>/.netlify/functions/ai \
  -H "Content-Type: application/json" \
  -d '{"message":"Schreib mir ein Follow-up","leadId":"<lead_id>","userId":"<user_id>"}'
```

Optional kannst du statt `leadId` auch `leadName` mitsenden. Die Response enthält stets `reply` und `leadContext`.
## Bestandskunden-Import

Der Bulk-Import ermöglicht es neuen User:innen, bestehende Kontakte als CSV oder JSON hochzuladen und direkt per KI analysieren zu lassen.

- **Endpoint**: `POST /import/leads` (FastAPI-Backend)
- **Erwartete Felder**: `name`, `email`, `phone`, `company`, `status`, `last_contact`, `notes`, `deal_value`, `tags`
- **Antwort**:
  ```json
  {
    "total_rows": 42,
    "imported_count": 42,
    "needs_action_count": 18,
    "without_last_contact_count": 7,
    "errors": []
  }
  ```

### CSV oder JSON senden

```bash
curl -X POST http://localhost:8001/import/leads \
  -H "Content-Type: text/csv" \
  --data-binary @backend/sample_data/import_example.csv
```

oder alternativ JSON:

```bash
curl -X POST http://localhost:8001/import/leads \
  -H "Content-Type: application/json" \
  -d '[
    {"name": "Anna", "email": "anna@example.com", "notes": "Hot Lead"},
    {"name": "Marco", "status": "Abgelehnt"}
  ]'
```

> Eine Beispiel-CSV liegt unter `backend/sample_data/import_example.csv`.

Nach dem Import setzt die AI – sofern Kontext vorhanden ist – `status`, `needs_action`, `next_action_at` und `next_action_description`. Kontakte ohne Kontext landen als `status = new` im CRM, bekommen kein `last_contact` und werden automatisch mit `needs_action = true` sowie Fehlermeldung im ImportSummary markiert.

Zusätzlich stellt `GET /leads/needs-action` eine kompakte Liste (default 8 Einträge) aller Leads bereit, die noch eine manuelle Aktion benötigen. Dieses Endpoint wird von der Sidebar genutzt, um „Kontakte ohne Status“ direkt anzuzeigen.
