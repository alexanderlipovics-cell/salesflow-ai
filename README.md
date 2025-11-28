# salesflow-ai
KI-gestütztes Vertriebs-CRM

## Bestandskunden-Import

Der Bulk-Import ermöglicht es neuen User:innen, bestehende Kontakte als CSV oder JSON hochzuladen und direkt per KI analysieren zu lassen.

- **Endpoint**: `POST /import/leads` (FastAPI-Backend)
- **Erwartete Felder**: `name`, `email`, `phone`, `company`, `last_status`, `last_contact`, `notes`, `deal_value`, `tags`
- **Antwort**:
  ```json
  {
    "total": 42,
    "with_ai_status": 29,
    "without_status": 13
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
    {"name": "Marco", "last_status": "Abgelehnt"}
  ]'
```

> Eine Beispiel-CSV liegt unter `backend/sample_data/import_example.csv`.

Nach dem Import setzt die AI – sofern Kontext vorhanden ist – `status`, `next_action`, `last_contact` und deaktiviert `needs_action`. Kontakte ohne Infos werden als `status = neu` gespeichert und mit `needs_action = true` markiert, sodass sie im UI gefiltert werden können.

Zusätzlich stellt `GET /leads/needs-action` eine kompakte Liste (default 8 Einträge) aller Leads bereit, die noch eine manuelle Aktion benötigen. Dieses Endpoint wird von der Sidebar genutzt, um „Kontakte ohne Status“ direkt anzuzeigen.
