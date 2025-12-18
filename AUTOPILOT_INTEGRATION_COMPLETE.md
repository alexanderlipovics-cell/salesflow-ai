# Autopilot Integration für Follow-ups - Implementierung abgeschlossen

## ✅ Implementierte Features

### 1. Follow-up Generierung mit Confidence Score

**Datei:** `backend/app/services/followup_autopilot.py`

- ✅ `generate_followup_with_confidence()` - Generiert Follow-up Nachricht mit Confidence Score (0-100)
- ✅ AI-basierte Confidence-Bewertung mit klaren Regeln:
  - 90-100: Standard Follow-up, kann automatisch gesendet werden
  - 70-89: Kontext-spezifisch, User entscheidet
  - 50-69: Komplex, sollte geprüft werden
  - <50: Riskant, manuelle Prüfung nötig
- ✅ Automatische Bestimmung von `execution_mode` basierend auf Confidence:
  - `autopilot`: >= 90% (kann automatisch gesendet werden)
  - `prepared`: 70-89% (User entscheidet)
  - `manual`: <70% (sollte geprüft werden)

**Integration:**
- ✅ `generate_suggestions_for_user()` in `followups.py` erweitert
- ✅ Speichert `confidence_score`, `confidence_reason`, `execution_mode` in DB

### 2. Email Auto-Send (Gmail OAuth)

**Datei:** `backend/app/services/followup_autopilot.py`

- ✅ `process_autopilot_sends()` - Verarbeitet Autopilot Follow-ups für einen User
- ✅ Lädt User Settings aus `autopilot_settings`
- ✅ Findet high-confidence Follow-ups (>= min_confidence)
- ✅ Sendet Emails automatisch via Gmail API (wenn Gmail verbunden)
- ✅ WhatsApp/Instagram bleiben "prepared" (kein Auto-Send)
- ✅ Loggt Interaktionen nach erfolgreichem Versand

**Voraussetzungen:**
- Gmail OAuth muss verbunden sein (`email_accounts` Tabelle)
- Autopilot Settings müssen aktiviert sein
- `min_confidence` Threshold muss erreicht werden

### 3. Background Job für Autopilot

**Datei:** `backend/app/services/scheduler.py`

- ✅ `run_autopilot_for_all_users()` Job hinzugefügt
- ✅ Läuft alle 15 Minuten automatisch
- ✅ Verarbeitet alle User mit aktivem Autopilot
- ✅ Loggt Statistiken (processed, sent, skipped)

**Integration:**
- ✅ Job wird beim Server-Start registriert
- ✅ Verwendet AsyncIOScheduler (async-fähig)

### 4. API Endpoints für Autopilot Settings

**Datei:** `backend/app/routers/followups.py`

- ✅ `GET /followups/autopilot/settings` - Holt Autopilot-Settings
- ✅ `PUT /followups/autopilot/settings` - Aktualisiert Autopilot-Settings

**Settings-Felder:**
- `enabled` / `is_active`: Autopilot aktiviert/deaktiviert
- `min_confidence`: Minimaler Confidence Score für Auto-Send (default: 90.0)
- `auto_channels`: Kanäle für Auto-Send (z.B. ["email"])
- `daily_limit`: Maximale automatische Antworten pro Tag
- `mode`: Betriebsmodus (off, assist, one_click, auto)

**Erweiterte Schemas:**
- ✅ `AutopilotSettingsBase` erweitert um `min_confidence` Feld
- ✅ Default-Werte in `_build_default_settings()` aktualisiert

### 5. Follow-up Liste mit Confidence anzeigen

**Datei:** `backend/app/routers/followups.py`

- ✅ `GET /followups/pending` - Sortiert nach Confidence Score (High zuerst)
- ✅ `GET /followups/today` - Sortiert nach Confidence Score (High zuerst)
- ✅ Enrichiert Follow-ups mit `confidence_display`:
  - 🟢 95% - High Confidence (>=90%)
  - 🟡 72% - Medium Confidence (70-89%)
  - 🔴 45% - Low Confidence (<70%)
  - ⚪ N/A - Kein Score vorhanden

## 📋 Datenbank-Felder (bereits vorhanden)

Die folgenden Felder existieren bereits in `followup_suggestions`:
- ✅ `confidence_score` (DECIMAL)
- ✅ `confidence_reason` (TEXT)
- ✅ `execution_mode` (TEXT: 'manual', 'autopilot', 'prepared')
- ✅ `auto_send_at` (TIMESTAMPTZ)
- ✅ `sent_at` (TIMESTAMPTZ)

## 🔧 Verwendete Services

### Gmail Service
- ✅ `backend/app/services/gmail_service.py` - Bereits vorhanden
- ✅ `GmailService.send_message()` - Wird für Auto-Send verwendet

### Autopilot Settings
- ✅ `backend/app/routers/autopilot.py` - Bereits vorhanden
- ✅ `autopilot_settings` Tabelle - Bereits vorhanden

## 📊 Workflow

### Follow-up Generierung
1. User erstellt Follow-up oder System generiert automatisch
2. `generate_followup_with_confidence()` wird aufgerufen
3. AI generiert Nachricht + Confidence Score
4. Follow-up wird gespeichert mit:
   - `suggested_message`
   - `confidence_score`
   - `confidence_reason`
   - `execution_mode` (autopilot/prepared/manual)

### Autopilot Verarbeitung (alle 15 Minuten)
1. `run_autopilot_for_all_users()` wird ausgeführt
2. Lädt alle User mit aktivem Autopilot
3. Für jeden User: `process_autopilot_sends()`
4. Findet high-confidence Follow-ups (>= min_confidence)
5. Sendet Emails automatisch (wenn Gmail verbunden)
6. Aktualisiert Status: `status='sent'`, `execution_mode='autopilot'`

### User-Interaktion
1. User sieht Follow-up Liste mit Confidence-Anzeige
2. High Confidence (🟢): Kann direkt gesendet werden
3. Medium Confidence (🟡): User prüft und entscheidet
4. Low Confidence (🔴): Sollte manuell geprüft werden

## 🎯 Erwartetes Ergebnis

1. ✅ Follow-ups werden mit Confidence Score generiert
2. ✅ User sieht: "🟢 95% - Standard Bump" oder "🟡 72% - Komplex, prüfen"
3. ✅ Emails mit Score >90% werden automatisch gesendet (wenn Autopilot an)
4. ✅ WhatsApp/Instagram: 1-Klick öffnet App mit vorgefülltem Text (bleibt "prepared")

## ⚠️ Wichtige Hinweise

- **Email Auto-Send nur wenn Gmail OAuth verbunden ist**
- **WhatsApp/Instagram bleiben "prepared" (kein Auto-Send)**
- **Nichts gelöscht** - Alle existierenden Funktionen bleiben erhalten
- **Background Job läuft alle 15 Minuten** - Automatische Verarbeitung

## 🧪 Testing

### Manuell testen:
1. Autopilot Settings setzen:
   ```bash
   PUT /api/followups/autopilot/settings
   {
     "enabled": true,
     "min_confidence": 90.0,
     "auto_channels": ["email"],
     "daily_limit": 50
   }
   ```

2. Follow-up generieren (sollte Confidence Score haben):
   ```bash
   POST /api/followups/generate
   ```

3. Follow-ups abrufen (sollte Confidence anzeigen):
   ```bash
   GET /api/followups/pending
   ```

4. Autopilot manuell ausführen:
   ```bash
   # Wird automatisch alle 15 Minuten ausgeführt
   # Oder über Background Job
   ```

## 📝 Nächste Schritte (Optional)

- [ ] Frontend UI für Autopilot Settings
- [ ] Review Queue für niedrige Confidence-Scores
- [ ] Execution Mode Auswahl beim Erstellen von Follow-ups
- [ ] Statistiken: Wie viele Follow-ups wurden automatisch gesendet?
- [ ] Opt-out Detection für Follow-ups

