# Autopilot-System Analyse

## ✅ Bugs behoben

### Bug 1: save_user_preference
**Problem:** Query mit Sonderzeichen schlug fehl (`ilike.default_message_format%3A%25` → 400 Bad Request)

**Lösung:** 
- `.ilike("content", f"{key}:%")` → `.like("content", f"{key}:%")` geändert
- Datei: `backend/app/ai/tool_executor.py` Zeile 831

### Bug 2: ai_usage INSERT statt UPSERT
**Problem:** `duplicate key value violates unique constraint "ai_usage_user_date_unique"`

**Lösung:**
- `insert()` → `upsert()` mit `on_conflict="user_id,usage_date"` geändert
- `usage_date` Feld hinzugefügt (extrahiert aus `created_at`)
- Datei: `backend/app/ai/cost_tracker.py` Zeile 81

---

## 📊 Autopilot-System: Was existiert bereits

### 1. **Autopilot Engine V2** (`backend/app/services/autopilot_engine_v2.py`)
- ✅ Multi-Channel Support (WhatsApp, Email, LinkedIn, Instagram)
- ✅ Intelligent Scheduling (Timezone-aware, Best send time)
- ✅ **Confidence-based Gating** (>85% = auto-send, <85% = review)
- ✅ A/B Testing (Template variants mit auto-optimization)
- ✅ Rate Limiting (Spam prevention)
- ✅ Quality Gates (Safety checks, Opt-out detection)
- ✅ AI Response Generation mit Confidence Scoring

### 2. **Autopilot Router** (`backend/app/routers/autopilot.py`)
- ✅ Settings Management (GET/POST `/autopilot/settings`)
- ✅ Message Events Management
- ✅ Autopilot Engine Endpoint (`POST /autopilot/run-once`)
- ✅ Status Updates für Events

### 3. **Datenbank-Tabellen**
- ✅ `autopilot_settings` - User/Contact-spezifische Einstellungen
- ✅ `message_events` - Message Events für Autopilot-Verarbeitung
- ✅ `autopilot_jobs` - Geplante Nachrichten
- ✅ `rate_limit_counters` - Rate Limiting
- ✅ `ab_test_experiments` - A/B Testing
- ✅ `ab_test_results` - A/B Test Metriken
- ✅ `channel_credentials` - API Credentials für Kanäle

### 4. **Schemas & Models**
- ✅ `AutopilotSettings` (Pydantic)
- ✅ `AutopilotMode` Enum (off, assist, one_click, auto)
- ✅ `MessageEvent` Schema
- ✅ `AutopilotStatus` Enum

### 5. **Services & Utilities**
- ✅ `confidence_gating.py` - Confidence-basierte Entscheidungen
- ✅ `scheduler.py` - Beste Sendezeit-Berechnung
- ✅ `rate_limiter.py` - Rate Limiting
- ✅ `ab_testing.py` - A/B Test Varianten-Auswahl
- ✅ `channels/` - Channel Adapter für verschiedene Kanäle

### 6. **Event Integration**
- ✅ Event Publishing (`publish_autopilot_action_event`)
- ✅ Event Handler (`handle_autopilot_action`)
- ✅ Message Events werden in Chat/Copilot geloggt

---

## ❌ Was fehlt für das Autopilot-Feature

### 1. **Follow-up Suggestions Integration**
**Problem:** `followup_suggestions` Tabelle hat **KEINE** `execution_mode` und `confidence_score` Felder

**Aktuelle Struktur:**
```sql
followup_suggestions (
  id, user_id, lead_id, flow, stage, template_key, channel,
  suggested_message, reason, due_at, status, sent_at, snoozed_until,
  title, priority, task_type, created_by, source, created_at
)
```

**Fehlende Felder:**
- ❌ `execution_mode` (manual, assist, auto) - Wie soll das Follow-up ausgeführt werden?
- ❌ `confidence_score` (0.0-1.0) - Confidence-Score für AI-generierte Nachrichten

**Empfehlung:** Migration erstellen:
```sql
ALTER TABLE followup_suggestions
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'manual'
    CHECK (execution_mode IN ('manual', 'assist', 'auto')),
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT NULL
    CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0));
```

### 2. **Autopilot für Follow-ups**
**Fehlende Integration:**
- ❌ Autopilot Engine verarbeitet nur `message_events`, nicht `followup_suggestions`
- ❌ Keine automatische Verarbeitung von fälligen Follow-ups durch Autopilot
- ❌ Keine Confidence-basierte Entscheidung für Follow-up-Nachrichten

**Benötigt:**
- Service, der fällige Follow-ups mit `execution_mode='auto'` verarbeitet
- Integration in Autopilot Engine V2 für Follow-up-Suggestions
- Confidence-Score-Berechnung für Follow-up-Nachrichten

### 3. **Frontend Integration**
**Fehlende UI-Komponenten:**
- ❌ Autopilot Settings UI (Mode, Channels, Limits)
- ❌ Review Queue für niedrige Confidence-Scores
- ❌ Autopilot Status-Anzeige in Follow-up-Liste
- ❌ Execution Mode Auswahl beim Erstellen von Follow-ups

### 4. **Background Jobs**
**Fehlende Automatisierung:**
- ❌ Cron Job / Scheduled Task für regelmäßige Autopilot-Ausführung
- ❌ Automatische Verarbeitung von `autopilot_jobs` (Scheduled Messages)
- ❌ Automatische Verarbeitung von fälligen Follow-ups mit `execution_mode='auto'`

### 5. **Dokumentation**
**Fehlende Dokumentation:**
- ❌ Keine spezifische Autopilot-Dokumentation im FOLLOW_UP_SYSTEM_DOKUMENTATION.md
- ❌ Keine API-Dokumentation für Autopilot-Endpoints
- ❌ Keine Anleitung für Autopilot-Setup

---

## 🔧 Empfohlene nächste Schritte

### Priorität 1: Datenbank-Migration
1. Migration erstellen für `execution_mode` und `confidence_score` in `followup_suggestions`
2. Migration ausführen

### Priorität 2: Backend-Integration
1. Autopilot Engine erweitern um Follow-up-Suggestions zu verarbeiten
2. Service erstellen: `process_autopilot_followups()` 
3. Confidence-Score-Berechnung für Follow-up-Nachrichten

### Priorität 3: Background Jobs
1. Celery Task / Background Job für regelmäßige Autopilot-Ausführung
2. Job für automatisches Senden von `autopilot_jobs`

### Priorität 4: Frontend
1. Autopilot Settings UI
2. Review Queue UI
3. Execution Mode Auswahl

### Priorität 5: Dokumentation
1. Autopilot-Sektion in FOLLOW_UP_SYSTEM_DOKUMENTATION.md
2. API-Dokumentation
3. Setup-Anleitung

---

## 📝 Zusammenfassung

**Bereits implementiert:**
- ✅ Vollständiges Autopilot Engine V2 System
- ✅ Confidence-based Gating
- ✅ Rate Limiting & Safety Checks
- ✅ A/B Testing
- ✅ Multi-Channel Support
- ✅ Settings Management
- ✅ Message Events System

**Fehlt für vollständige Integration:**
- ❌ `execution_mode` und `confidence_score` in `followup_suggestions`
- ❌ Autopilot-Verarbeitung für Follow-up-Suggestions
- ❌ Background Jobs für automatische Ausführung
- ❌ Frontend UI
- ❌ Dokumentation

**Status:** Autopilot-System ist **technisch vollständig**, aber noch **nicht vollständig integriert** mit dem Follow-up-System.

