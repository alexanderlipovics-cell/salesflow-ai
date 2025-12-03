# 🌍 Multi-Language / Company Core - Architektur & Request Flow

**Status:** ✅ Schema erstellt  
**Datei:** `backend/db/schema_multi_language_core.sql`

---

## 📋 ÜBERSICHT

Dieses Schema implementiert 5 Kern-Module für Sales Flow AI:

1. **Multi-Language / Company Core** - Zentrale Firmen-Konfiguration mit Multi-Language-Support
2. **Neuro-Profiler (DISG)** - DISG-Persona-Tracking für Leads
3. **Speed-Hunter** - Gamification-Loop für tägliche Ziele
4. **Einwand-Killer** - Sales Intelligence für Objection Handling
5. **Liability-Shield** - Compliance-Checking für rechtssichere Kommunikation

---

## 🗄️ DATENSTRUKTUR

### **1️⃣ Multi-Language / Company Core**

#### `mlm_companies`
Zentrale Firmen-Konfiguration:
- `slug`: Eindeutiger Identifier (z.B. 'zinzino', 'herbalife')
- `default_language`: Standard-Sprache (z.B. 'de-DE')
- `allowed_languages`: Array der unterstützten Sprachen
- `compliance_profile`: Compliance-Profil ('health', 'finance', 'standard')
- `brand_tone`: JSON mit Brand-Tone-Einstellungen

#### `templates`
Sprachunabhängiger Template-Kern (Metadaten):
- `funnel_stage`: 'cold', 'early_follow_up', 'closing', etc.
- `channel`: 'whatsapp', 'instagram_dm', 'email', 'phone'
- `use_case`: 'intro', 'objection', 'referral', 'reactivation'
- `persona_hint`: 'D', 'I', 'S', 'G', 'generic'

#### `template_translations`
Multi-Language Layer (tatsächliche Texte):
- `language_code`: 'de-DE', 'de-AT', 'en-US', etc.
- `body`: Der tatsächliche Template-Text
- `tone_variation`: 'formal', 'casual', 'soft', 'direct'
- `compliance_status`: 'approved', 'flagged', 'pending'

#### `template_performance`
Analytics-Tracking:
- Metriken: `times_used`, `times_sent`, `times_delivered`, `times_opened`, etc.
- Rates: `delivery_rate`, `open_rate`, `response_rate`, `conversion_rate`
- `performance_score`: Gewichteter Score für Template-Ranking

### **2️⃣ Neuro-Profiler (DISG)**

#### `leads` (Erweiterung)
DISG-Felder:
- `disc_primary`: 'D', 'I', 'S', 'G'
- `disc_secondary`: Optionaler Sekundärtyp
- `disc_confidence`: 0.00 - 1.00
- `disc_last_source`: 'ai_chat', 'intake_form', 'manual'

#### `disc_analyses`
Historie aller DISG-Einschätzungen:
- `source`: 'ai_chat', 'import', 'manual'
- `rationale`: Kurze Erklärung der Einschätzung

### **3️⃣ Speed-Hunter (Gamification)**

#### `speed_hunter_sessions`
Tägliche Sessions:
- `daily_goal`: Z.B. 20 Kontakte oder 20 Punkte
- `mode`: 'contacts' oder 'points'
- `streak_day`: Optional für Streak-Logik

#### `speed_hunter_actions`
Log aller Aktionen:
- `action_type`: 'call', 'message', 'snooze', 'done'
- `outcome`: 'no_answer', 'interested', 'not_interested', etc.
- `points`: Punkte für diese Aktion

### **4️⃣ Einwand-Killer (Sales Intelligence)**

#### `objection_templates`
Templates für Einwand-Behandlung:
- `objection_key`: 'no_time', 'too_expensive', 'mlm_skeptic', etc.
- `style`: 'logical', 'emotional', 'provocative'
- `step`: 'acknowledge', 'clarify', 'reframe', 'close'
- `disc_type`: DISG-Persona-spezifisch

#### `objection_logs`
Tracking der Einwand-Behandlung:
- `outcome`: 'won', 'lost', 'pending', 'neutral'
- `response_style`: Welcher Stil wurde verwendet

### **5️⃣ Liability-Shield (Compliance)**

#### `compliance_rules`
Compliance-Regeln:
- `category`: 'health_claim', 'income_claim', 'time_pressure', etc.
- `pattern_type`: 'regex' oder 'keyword'
- `pattern`: Regex oder Keyword-Liste (JSON)
- `severity`: 'info', 'warn', 'block'

#### `compliance_violations`
Log aller Compliance-Verstöße:
- `original_text`: Ursprünglicher Text
- `suggested_text`: AI-generierte sichere Alternative
- `status`: 'pending', 'accepted', 'overridden'

---

## 🔄 REQUEST FLOW: Speed-Hunter → Text-Generierung

### **Schritt 1: User startet Speed-Hunter**

```
User → Frontend (React)
  ↓
POST /speed-hunter/session
  ↓
Backend → DB
  ↓
INSERT speed_hunter_sessions
```

### **Schritt 2: Nächsten Lead finden**

```
Backend → DB Query:
  SELECT * FROM leads
  JOIN portfolio_scans (optional)
  JOIN template_performance (optional)
  WHERE ...
  ORDER BY priority_score DESC
  LIMIT 1
  ↓
Backend → Frontend
  { lead, stage, company, language, disc }
```

### **Schritt 3: CHIEF (LLM) – Neuro + Templates**

**Input an CHIEF:**
- Lead-Daten (Name, Stage, letzte Events, DISG-Potential)
- Company (Zinzino/Herbalife...)
- Sprache (z.B. de-DE)
- Kanal (WhatsApp, IG)
- Ziel (Follow-up / Closing / Reaktivierung)

**CHIEF-Prozess:**

1. **Neuro-Profiler:**
   ```
   IF lead.disc_primary IS NULL:
     → DISG aus Text/History schätzen
     → INSERT disc_analyses
     → UPDATE lead.disc_primary
   ```

2. **Template-Auswahl:**
   ```
   SELECT t.*, tt.*
   FROM templates t
   JOIN template_translations tt ON t.id = tt.template_id
   WHERE t.company_id = :company_id
     AND t.funnel_stage = :stage
     AND t.channel = :channel
     AND tt.language_code = :language
     AND (t.persona_hint = :disc_type OR t.persona_hint = 'generic')
   ORDER BY tp.performance_score DESC
   LIMIT 1
   ```

3. **Falls Einwand-Situation:**
   ```
   SELECT *
   FROM objection_templates
   WHERE company_id = :company_id
     AND objection_key = :objection_key
     AND funnel_stage = :stage
     AND (disc_type = :disc_type OR disc_type = 'generic')
     AND language_code = :language
     AND is_active = true
   ```

### **Schritt 4: Liability-Shield (Compliance-Check)**

```
Backend → Compliance-Layer:
  1. Lade compliance_rules für locale + company_id
  2. Wende Patterns (Regex/Keywords) auf Text an
  3. Falls Treffer:
     - severity = 'block' → Alternativtext generieren
     - severity = 'warn' → Hinweis + optional Rewrite
  4. INSERT compliance_violations (falls Treffer)
  5. Return: safe_text + warnings
```

### **Schritt 5: Frontend → User**

UI zeigt:
- Vorschlagstext (editierbar)
- Info: "Empfohlen basierend auf deiner Company & bisherigen Erfolgen"
- Bei Warnung: Banner/Tooltip mit Vorschlag

### **Schritt 6: Versand & Logging**

```
User klickt "Senden"
  ↓
Frontend → POST /speed-hunter/action
  {
    lead_id,
    action_type: 'message',
    points,
    template_id,
    translation_id
  }
  ↓
Backend → DB:
  INSERT speed_hunter_actions
  UPDATE speed_hunter_sessions (total_contacts, total_points)
  UPDATE template_performance (times_used, times_sent)
```

### **Schritt 7: Antwort-Tracking (später)**

```
Provider (WhatsApp/IG/etc) → Webhook
  ↓
Backend:
  UPDATE template_performance (times_replied, times_converted)
  INSERT objection_logs (wenn Einwand erkannt)
  UPDATE lead.stage, lead.next_contact_due_at
```

---

## 🚀 DEPLOYMENT

### **Schritt 1: Schema ausführen**

1. Öffne Supabase SQL Editor
2. Kopiere gesamten Inhalt von `backend/db/schema_multi_language_core.sql`
3. Führe aus (RUN)
4. Warte auf ✅ Success

**Erwartete Ausgabe:**
```
✅ Multi-Language / Company Core Schema erfolgreich erstellt!
📋 Tabellen: mlm_companies, templates, template_translations, template_performance
🧠 Neuro-Profiler: leads erweitert, disc_analyses
🎮 Speed-Hunter: speed_hunter_sessions, speed_hunter_actions
💪 Einwand-Killer: objection_templates, objection_logs
🛡️ Liability-Shield: compliance_rules, compliance_violations
```

### **Schritt 2: Test-Daten einfügen (optional)**

```sql
-- Beispiel: MLM Company
INSERT INTO public.mlm_companies (slug, display_name, default_language, allowed_languages)
VALUES ('zinzino', 'Zinzino', 'de-DE', ARRAY['de-DE', 'en-US']);

-- Beispiel: Template
INSERT INTO public.templates (company_id, funnel_stage, channel, use_case, persona_hint)
VALUES (
  (SELECT id FROM mlm_companies WHERE slug = 'zinzino'),
  'cold',
  'whatsapp',
  'intro',
  'generic'
);

-- Beispiel: Template-Translation
INSERT INTO public.template_translations (template_id, language_code, body, tone_variation)
VALUES (
  (SELECT id FROM templates LIMIT 1),
  'de-DE',
  'Hallo {{name}}, ich habe gesehen, dass du dich für ... interessierst.',
  'casual'
);
```

---

## 📊 ANALYTICS & VIEWS (Optional)

### **Template-Performance-View**

```sql
CREATE OR REPLACE VIEW template_performance_summary AS
SELECT 
  t.id,
  t.funnel_stage,
  t.channel,
  tt.language_code,
  tp.times_used,
  tp.conversion_rate,
  tp.performance_score
FROM templates t
JOIN template_translations tt ON t.id = tt.template_id
LEFT JOIN template_performance tp ON t.id = tp.template_id
WHERE t.is_active = true
ORDER BY tp.performance_score DESC;
```

### **Speed-Hunter-Leaderboard**

```sql
CREATE OR REPLACE VIEW speed_hunter_leaderboard AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT s.id) as total_sessions,
  SUM(s.total_points) as total_points,
  MAX(s.streak_day) as max_streak
FROM auth.users u
JOIN speed_hunter_sessions s ON u.id = s.user_id
WHERE s.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.email
ORDER BY total_points DESC;
```

---

## 🔗 INTEGRATION MIT BESTEHENDEN MODULEN

### **Bestehende Tabellen:**
- ✅ `leads` - Erweitert um DISG-Felder
- ✅ `auth.users` - Referenziert in speed_hunter_sessions, disc_analyses, etc.

### **Kompatibilität:**
- ✅ Funktioniert mit bestehenden `message_templates` (falls vorhanden)
- ✅ Funktioniert mit bestehenden `objections` (falls vorhanden)
- ✅ Kann parallel zu bestehenden Schemas existieren

---

## 🎯 NÄCHSTE SCHRITTE

1. **Backend-Integration:**
   - API-Endpoints für Speed-Hunter erstellen
   - CHIEF-Integration für Template-Auswahl
   - Compliance-Layer implementieren

2. **Frontend-Integration:**
   - Speed-Hunter UI
   - Template-Vorschau mit Compliance-Warnungen
   - DISG-Anzeige in Lead-Details

3. **Analytics:**
   - Dashboard für Template-Performance
   - Leaderboard für Speed-Hunter
   - Compliance-Report

---

## 📝 NOTIZEN

- **DISG-Erweiterung:** Die `leads`-Tabelle wird nur erweitert, falls die Spalten noch nicht existieren (idempotent)
- **Multi-Language:** Templates sind sprachunabhängig, Übersetzungen in `template_translations`
- **Compliance:** Patterns können Regex oder Keywords sein (als JSON gespeichert)
- **Performance:** Alle wichtigen Spalten sind indexiert für schnelle Queries

---

**Erstellt:** 2025-01-XX  
**Version:** 1.0.0

