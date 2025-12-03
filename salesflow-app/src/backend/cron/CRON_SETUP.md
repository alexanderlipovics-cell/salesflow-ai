# 🕐 Sales Flow AI - Cron Jobs Setup

## Übersicht

Sales Flow AI nutzt automatische Cronjobs für:
- Morning Briefings & Evening Recaps (Push Notifications)
- Workflow-Automatisierungen (Recurring, Snooze, Payments)
- Tägliche Datenaufbereitung (Aggregates)

## Cronjob-Konfiguration

```bash
# ═══════════════════════════════════════════════════════════════════════════
# SALES FLOW AI - CRONTAB
# ═══════════════════════════════════════════════════════════════════════════

# Pfad zum Backend
BACKEND_PATH=/path/to/salesflow-app/src/backend

# ─────────────────────────────────────────────────────────────────────────────
# PUSH NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

# Morning Briefings (alle Stunden 6-10 Uhr)
0 6-10 * * * cd $BACKEND_PATH && python -m app.jobs.send_push_notifications morning >> /var/log/salesflow/morning.log 2>&1

# Evening Recaps (alle Stunden 17-21 Uhr)
0 17-21 * * * cd $BACKEND_PATH && python -m app.jobs.send_push_notifications evening >> /var/log/salesflow/evening.log 2>&1

# ─────────────────────────────────────────────────────────────────────────────
# WORKFLOW AUTOMATION
# ─────────────────────────────────────────────────────────────────────────────

# Alle Workflows täglich um 00:05 Uhr
5 0 * * * cd $BACKEND_PATH && python -m app.jobs.workflow_automation all >> /var/log/salesflow/workflow.log 2>&1

# Daily Flow Vorbereitung um 23:00 (für nächsten Tag)
0 23 * * * cd $BACKEND_PATH && python -m app.jobs.workflow_automation daily >> /var/log/salesflow/daily_prep.log 2>&1

# Zahlungsprüfungen alle 4 Stunden während Geschäftszeiten
0 8,12,16,20 * * * cd $BACKEND_PATH && python -m app.jobs.workflow_automation payments >> /var/log/salesflow/payments.log 2>&1

# Snooze-Reaktivierung stündlich
0 * * * * cd $BACKEND_PATH && python -m app.jobs.workflow_automation snooze >> /var/log/salesflow/snooze.log 2>&1

# ─────────────────────────────────────────────────────────────────────────────
# LEARNING & ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

# Learning Aggregation täglich um 02:00
0 2 * * * cd $BACKEND_PATH && python -m app.jobs.aggregate_learning >> /var/log/salesflow/learning.log 2>&1

# ─────────────────────────────────────────────────────────────────────────────
# MAINTENANCE
# ─────────────────────────────────────────────────────────────────────────────

# Log Rotation wöchentlich
0 3 * * 0 find /var/log/salesflow/*.log -mtime +30 -delete
```

## Workflow-Automatisierungen im Detail

### 1. Recurring Transactions
**Wann:** Täglich um 00:05
**Was:** 
- Prüft `finance_recurring` auf fällige Einträge
- Erstellt automatisch Transaktionen
- Aktualisiert `next_run` Datum

### 2. Snooze Reactivation
**Wann:** Stündlich
**Was:**
- Prüft `lead_pending_actions` mit `status='snoozed'`
- Reaktiviert Actions wenn `snoozed_until` erreicht

### 3. Payment Check Reminders
**Wann:** Alle 4 Stunden (8, 12, 16, 20 Uhr)
**Was:**
- Findet Leads mit `deal_state='pending_payment'`
- Erstellt `check_payment` Pending Action falls keine existiert
- Berechnet `due_date` basierend auf `payment_expected_date`

### 4. Inactive Lead Alerts
**Wann:** Täglich um 00:05
**Was:**
- Findet Leads ohne Kontakt seit 30+ Tagen
- Erstellt `reactivation` Pending Action
- Generiert Vorschlags-Nachricht

### 5. Daily Flow Preparation
**Wann:** Täglich um 23:00
**Was:**
- Erstellt `daily_flow_plans` für nächsten Tag
- Basiert auf `company_goal_configs`
- Berechnet Targets (New Contacts, Follow-ups, etc.)

### 6. Tax Reserve Warnings
**Wann:** Quartalsende (25. des Monats in 3, 6, 9, 12)
**Was:**
- Berechnet Jahresgewinn pro User
- Sendet Warnung bei hohem Gewinn ohne Reserve
- Nur Hinweis, keine Steuerberatung!

## Installation (Linux/Mac)

```bash
# Log-Verzeichnis erstellen
sudo mkdir -p /var/log/salesflow
sudo chmod 755 /var/log/salesflow

# Crontab editieren
crontab -e

# Cronjobs einfügen (siehe oben)

# Testen
python -m app.jobs.workflow_automation all
```

## Für Entwicklung (Windows)

Nutze Task Scheduler oder führe manuell aus:

```powershell
# PowerShell Script für lokales Testing
cd C:\path\to\salesflow-app\src\backend
python -m app.jobs.workflow_automation all
```

## Monitoring

### Logs prüfen
```bash
tail -f /var/log/salesflow/workflow.log
```

### Letzte Ausführungen
```bash
grep "Completed" /var/log/salesflow/*.log | tail -20
```

### Fehler finden
```bash
grep -i "error" /var/log/salesflow/*.log
```

## Fehlerbehebung

### Job läuft nicht
1. Pfad prüfen: `which python`
2. Virtual Environment aktiviert?
3. Logs prüfen: `cat /var/log/salesflow/workflow.log`

### DB-Fehler
1. Supabase-Credentials prüfen
2. `.env` Datei im Backend-Verzeichnis?

### Push Notifications kommen nicht
1. Expo Push Token gültig?
2. User-Settings: `morning_push_enabled: true`?
3. Zeitzone des Servers prüfen

---

## Alternative: Supabase Edge Functions + Cron

Für serverless Deployment:

```sql
-- Supabase pg_cron Extension
SELECT cron.schedule(
    'workflow-automation',
    '5 0 * * *',
    $$SELECT workflow_automation_daily()$$
);
```

Dann PL/pgSQL Funktion erstellen oder Edge Function triggern.

