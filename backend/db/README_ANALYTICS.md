# 📊 Analytics & Events Schema

Dieser Ordner enthält alle Migrationen für das produktionsreife Analytics-System.

## 🚀 Migrationen

| Datei | Inhalt |
|-------|--------|
| `20250101_events_system.sql` | Events-Tabelle inkl. Partitionierung, Enums, RLS |
| `20250102_tasks_system.sql` | Aufgaben-System mit Prioritäten, Notizen, Recurring Rules |
| `20250103_contacts_extensions.sql` | Erweiterte Kontaktfelder (Status, Lead Score, Next Action) |
| `20250104_materialized_views.sql` | Materialized Views für Events-, Template- und User-Performance |
| `20250105_analytics_functions.sql` | SQL-Funktionen für Dashboards und Funnels |

## ✅ Setup Reihenfolge

```
psql < backend/db/migrations/20250101_events_system.sql
psql < backend/db/migrations/20250102_tasks_system.sql
psql < backend/db/migrations/20250103_contacts_extensions.sql
psql < backend/db/migrations/20250104_materialized_views.sql
psql < backend/db/migrations/20250105_analytics_functions.sql
```

## 🧩 Hinweise

- Events-Tabelle ist monatlich partitioniert und legt neue Partitionen via Trigger automatisch an.
- Materialized Views sollten stündlich über `refresh_analytics_materialized_views()` aktualisiert werden (pg_cron empfohlen).
- RLS setzt `workspace_users`-Mapping voraus.
- Tasks nutzen Enums (`task_type_enum`, `task_status_enum`, `task_priority_enum`).
- Kontakte erhalten `contact_status_enum`, Lead-Scoring und nächste Aktionen für Intelligence-Features.

## 🧪 Testing

- Partition Auto-Creation testen: Insert mit zukünftigen Monaten → Partition sollte automatisch entstehen.
- RLS prüfen: User darf nur Events/Tasks seines Workspace sehen.
- MVs: `SELECT * FROM mv_events_daily_summary LIMIT 10;`
- Funktionen: `SELECT * FROM get_today_overview('<workspace_uuid>');`

## 📅 Maintenance

- Monatliche Partitionen frühzeitig anlegen (Cron-Job mit `generate_series`).
- Datenaufbewahrung definieren (z. B. Events > 12 Monate archivieren).
- MV-Refresh überwachen (Laufzeit < 30s).

Happy Analytics! 🚀

