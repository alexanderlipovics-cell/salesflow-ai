# 🚀 ADVANCED FOLLOW-UP TEMPLATES SYSTEM

**Multi-Field Templates mit GPT Auto-Complete, Preview & Admin-UI**

---

## 📋 ÜBERSICHT

Das **Advanced Follow-up Templates System** erweitert das bestehende Follow-up System (Prompt 11) mit:

✅ **Editierbare Multi-Field Templates** (subject, short, body, reminder, fallback)  
✅ **GPT Auto-Complete** (generiert Reminder/Fallback automatisch)  
✅ **Preview Context & Rendering** (Vorschau vor Versand)  
✅ **Admin-UI** für Template-Editor  
✅ **Template Validation**  
✅ **Channel-spezifische Vorschauen** (WhatsApp, Email, In-App)  
✅ **Template Import/Export**  
✅ **Version History** (Template-Änderungen werden getrackt)

---

## 🏗️ ARCHITEKTUR

### **Dual-System Ansatz**

```
┌─────────────────────────────────────┐
│  followup_playbooks (Prompt 11)     │  ← Simple Auto-Trigger
│  Hardcoded Templates                 │
└─────────────────────────────────────┘
              +
┌─────────────────────────────────────┐
│  followup_templates (Prompt 12)     │  ← Advanced Editable
│  Multi-Field, GPT, Preview          │
└─────────────────────────────────────┘
              =
     PERFECT FOLLOW-UP SYSTEM! 🔥
```

### **Priority Logic**

Wenn ein Follow-up getriggert wird:

1. **Advanced Template vorhanden?** → Nutze Advanced Template ✅
2. **Kein Advanced Template?** → Fallback auf Playbook ✅

Das ermöglicht:
- Schnelle Einrichtung mit Playbooks
- Feintuning mit Advanced Templates
- Graduelle Migration von Playbooks zu Templates

---

## 📊 DATABASE SCHEMA

### **followup_templates** (Haupttabelle)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `name` | TEXT | Template Name (z.B. "Inaktivität 14 Tage") |
| `trigger_key` | TEXT | Trigger Identifier (z.B. "inactivity_14d") |
| `channel` | TEXT | Channel (whatsapp, email, in_app) |
| `category` | TEXT | Kategorie (objection, nurture, reminder, etc.) |
| `subject_template` | TEXT | Email Betreff (nur für Email) |
| `short_template` | TEXT | WhatsApp/In-App Vorschau |
| `body_template` | TEXT | Haupttext mit {{placeholders}} |
| `reminder_template` | TEXT | Follow-up nach 2 Tagen |
| `fallback_template` | TEXT | Letzter Versuch nach 5 Tagen |
| `gpt_autocomplete_prompt` | TEXT | Prompt für GPT |
| `preview_context` | JSONB | Beispiel-Daten für Preview |
| `is_active` | BOOLEAN | Template aktiv/inaktiv |
| `version` | INTEGER | Version (auto-incrementiert) |
| `usage_count` | INTEGER | Anzahl Verwendungen |
| `success_rate` | DECIMAL | Erfolgsrate in % |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `updated_at` | TIMESTAMPTZ | Aktualisiert am |

**Unique Constraint:** `(trigger_key, channel)`

### **template_versions** (Version History)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `template_id` | UUID | Referenz zu followup_templates |
| `version` | INTEGER | Version Number |
| `body_template` | TEXT | Snapshot Body |
| `reminder_template` | TEXT | Snapshot Reminder |
| `fallback_template` | TEXT | Snapshot Fallback |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `created_by` | UUID | User ID |
| `change_note` | TEXT | Änderungsnotiz |

---

## 🔧 RPC FUNCTIONS

### **render_template(p_template_text, p_context)**

Rendert einen Template-String mit Context.

```sql
SELECT render_template(
  'Hey {{first_name}}, wie geht es dir?',
  '{"first_name": "Sarah"}'::jsonb
);
-- Ergebnis: "Hey Sarah, wie geht es dir?"
```

### **get_template_preview(p_template_id)**

Gibt Template mit gerenderten Vorschauen zurück.

```sql
SELECT get_template_preview('123e4567-e89b-12d3-a456-426614174000');
-- Ergebnis: JSON mit gerenderten Feldern
```

### **upsert_followup_template(...)**

Fügt neues Template hinzu oder aktualisiert bestehendes (bei Duplikat).

```sql
SELECT upsert_followup_template(
  'Inaktivität 14 Tage',
  'inactivity_14d',
  'whatsapp',
  NULL,
  'Hey {{first_name}}, alles gut?',
  'Hey {{first_name}}, ...',
  NULL,
  NULL,
  'Generiere Reminder und Fallback...',
  '{"first_name": "Sarah"}'::jsonb
);
```

---

## 🔌 API ENDPOINTS

### **Template CRUD**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/list` | GET | Alle Templates mit Filtern |
| `/api/followup-templates/{id}` | GET | Einzelnes Template |
| `/api/followup-templates/create` | POST | Neues Template erstellen |
| `/api/followup-templates/{id}` | PUT | Template aktualisieren |
| `/api/followup-templates/{id}` | DELETE | Template löschen (soft delete) |

### **Preview & Rendering**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/{id}/preview` | GET | Vorschau mit preview_context |
| `/api/followup-templates/render` | POST | Rendering mit custom context |

### **GPT Auto-Complete**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/autocomplete` | POST | GPT generiert Reminder + Fallback |

### **Import/Export**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/export` | GET | Templates als JSON exportieren |
| `/api/followup-templates/import` | POST | Templates aus JSON importieren |

### **Statistics**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/{id}/stats` | GET | Usage Stats für Template |

### **Metadata**

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/followup-templates/meta/channels` | GET | Verfügbare Channels |
| `/api/followup-templates/meta/categories` | GET | Verfügbare Kategorien |
| `/api/followup-templates/health` | GET | Health Check |

---

## 🎨 FRONTEND COMPONENTS

### **FollowupTemplateEditor.tsx**

Template-Editor mit:
- Multi-Field Editing (Subject, Short, Body, Reminder, Fallback)
- Channel Selection (Email, WhatsApp, In-App)
- GPT Auto-Complete Button
- Live Preview
- Preview Context Editor

### **FollowupTemplatesManager.tsx**

Template-Manager mit:
- Template List mit Filtern
- Create, Edit, Delete Actions
- Template Duplication
- Export Functionality
- Usage Statistics

---

## 💡 VERWENDUNG

### **1. Template erstellen (UI)**

```typescript
// In Frontend App
import FollowupTemplatesManager from './components/FollowupTemplatesManager';

// In Screen:
<FollowupTemplatesManager />
```

### **2. Template erstellen (API)**

```bash
curl -X POST http://localhost:8000/api/followup-templates/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Inaktivität 14 Tage",
    "trigger_key": "inactivity_14d",
    "channel": "whatsapp",
    "body_template": "Hey {{first_name}}, alles gut bei dir? 😊",
    "gpt_autocomplete_prompt": "Generiere Reminder und Fallback...",
    "preview_context": {
      "first_name": "Sarah"
    }
  }'
```

### **3. GPT Auto-Complete nutzen**

```bash
curl -X POST http://localhost:8000/api/followup-templates/autocomplete \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "123e4567-e89b-12d3-a456-426614174000",
    "lead_context": {
      "first_name": "Max"
    }
  }'
```

### **4. Template Preview**

```bash
curl http://localhost:8000/api/followup-templates/123e4567-e89b-12d3-a456-426614174000/preview
```

### **5. Template Export**

```bash
curl http://localhost:8000/api/followup-templates/export
```

---

## 🔄 INTEGRATION MIT FOLLOWUP SERVICE

Der `followup_service.py` wurde erweitert:

```python
# Priority Logic:
# 1. Check for Advanced Template
# 2. Fallback to Playbook

async def generate_followup(lead_id, playbook_id, trigger_type):
    # 1. Try Advanced Template
    template = await template_service.get_template_by_trigger(
        trigger_key=trigger_type,
        channel=channel
    )
    
    if template:
        # Use Advanced Template
        rendered = await template_service.render_template_with_context(
            template_id=template['id'],
            context=lead_context
        )
        return rendered
    
    # 2. Fallback to Playbook
    return await generate_from_playbook(lead_id, playbook_id)
```

---

## 🧪 TESTING

### **1. Health Check**

```bash
curl http://localhost:8000/api/followup-templates/health
```

Expected:
```json
{
  "success": true,
  "service": "follow-up-templates",
  "status": "healthy"
}
```

### **2. List Templates**

```bash
curl http://localhost:8000/api/followup-templates/list
```

Expected:
```json
{
  "success": true,
  "count": 3,
  "templates": [...]
}
```

### **3. Create Template**

```bash
curl -X POST http://localhost:8000/api/followup-templates/create \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### **4. GPT Auto-Complete**

```bash
curl -X POST http://localhost:8000/api/followup-templates/autocomplete \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Wichtig:** Benötigt `OPENAI_API_KEY` in `.env`!

---

## 🚀 DEPLOYMENT

### **1. SQL Migration ausführen**

```bash
# In Supabase SQL Editor:
backend/database/advanced_templates_migration.sql
```

### **2. OpenAI Package installieren**

```bash
pip install openai
```

### **3. Environment Variables**

```bash
# .env
OPENAI_API_KEY=sk-...
```

### **4. Backend neu starten**

```bash
cd backend
python main.py
```

### **5. Frontend testen**

Öffne App und navigiere zu Templates Manager.

---

## 📈 VORTEILE

### **Vs. Hardcoded Playbooks:**

✅ **Editierbar** in UI (kein Code-Deployment)  
✅ **GPT Auto-Complete** (spart Zeit)  
✅ **Preview** vor Versand  
✅ **Multi-Step** (Body → Reminder → Fallback)  
✅ **Channel-spezifisch** (unterschiedliche Texte pro Kanal)  
✅ **Version History** (Änderungen nachvollziehbar)  
✅ **Import/Export** (Templates teilen)  

### **Vs. Einfache Templates:**

✅ **Multi-Field** (Subject, Short, Body, Reminder, Fallback)  
✅ **Trigger-basiert** (automatisch zugeordnet)  
✅ **GPT Integration** (automatische Generierung)  
✅ **Preview Context** (Rendering vor Versand)  

---

## 🎯 USE CASES

### **1. Lead Reactivation**

```
Trigger: inactivity_14d
Channel: WhatsApp
Body: Hey {{first_name}}, alles gut? 🙌
Reminder (Tag 2): Wollte nur kurz nachfassen...
Fallback (Tag 5): Letzter Check-In – kein Interesse? Kein Problem 🙏
```

### **2. Proposal Follow-up**

```
Trigger: proposal_no_response
Channel: Email
Subject: Noch Fragen zum Angebot, {{first_name}}?
Body: Hi {{first_name}}, hast du das Angebot gesehen?
Reminder (Tag 2): Ich bin morgen flexibel für ein Gespräch...
Fallback (Tag 5): Wenn du pausieren willst, gib Bescheid.
```

### **3. Commitment Reminder**

```
Trigger: commitment_no_meeting
Channel: In-App
Short: Hey {{first_name}}, du bist dabei! 🙌
Body: Super! Buche hier deinen Termin: {{booking_link}}
Reminder (Tag 2): Ich block dir gern einen Slot...
Fallback (Tag 5): Passt es doch nicht? Alles gut 🙏
```

---

## 🔐 SICHERHEIT

- **RLS Policies:** Templates sind user-spezifisch (wenn `created_by` gesetzt)
- **Validation:** Channel, Trigger Key werden validiert
- **Soft Delete:** Templates werden nicht gelöscht, nur deaktiviert
- **Version History:** Alle Änderungen werden getrackt

---

## 🐛 TROUBLESHOOTING

### **Problem: GPT Auto-Complete funktioniert nicht**

**Lösung:**
1. `OPENAI_API_KEY` in `.env` prüfen
2. OpenAI Package installiert? `pip show openai`
3. Backend-Logs prüfen

### **Problem: Templates werden nicht geladen**

**Lösung:**
1. SQL Migration ausgeführt?
2. Backend neu gestartet?
3. API Health Check: `curl http://localhost:8000/api/followup-templates/health`

### **Problem: Rendering funktioniert nicht**

**Lösung:**
1. Preview Context gesetzt?
2. Placeholders korrekt? `{{first_name}}` (doppelte geschweifte Klammern)
3. RPC Function `render_template` existiert?

---

## 📚 WEITERFÜHRENDE DOKU

- **AI Prompts System:** `AI_PROMPTS_COMPLETE_SYSTEM.md`
- **Follow-up System:** `FOLLOWUP_SYSTEM_COMPLETE.md`
- **Playbooks:** `backend/database/followup_system_migration.sql`

---

## 🎉 READY TO LAUNCH!

**Das Advanced Follow-up Templates System ist einsatzbereit!**

Starte jetzt:
1. SQL Migration ausführen
2. Backend neu starten
3. Templates Manager öffnen
4. Erstes Template erstellen
5. GPT Auto-Complete testen

**Viel Erfolg! 🚀**

