# 🚀 ADVANCED FOLLOW-UP TEMPLATES - QUICK START

**In 5 Minuten einsatzbereit!**

---

## ✅ SCHRITT 1: SQL MIGRATION

1. Öffne **Supabase Dashboard** → SQL Editor
2. Kopiere Inhalt von: `backend/database/advanced_templates_migration.sql`
3. Führe SQL aus
4. Verifiziere: 3 Templates sollten erstellt sein

```sql
SELECT COUNT(*) FROM followup_templates;
-- Erwartetes Ergebnis: 3
```

---

## ✅ SCHRITT 2: OPENAI API KEY

1. Öffne `.env` Datei
2. Füge hinzu:

```env
OPENAI_API_KEY=sk-...
```

3. Speichern

**Hinweis:** Ohne API Key funktioniert GPT Auto-Complete nicht (Templates funktionieren trotzdem)

---

## ✅ SCHRITT 3: BACKEND DEPENDENCIES

```bash
# Python Package installieren
pip install openai

# Oder mit --break-system-packages
pip install openai --break-system-packages
```

---

## ✅ SCHRITT 4: BACKEND NEU STARTEN

```bash
cd backend
python main.py
```

Oder:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## ✅ SCHRITT 5: API TESTEN

```bash
# Health Check
curl http://localhost:8000/api/followup-templates/health

# Templates auflisten
curl http://localhost:8000/api/followup-templates/list

# Channels abrufen
curl http://localhost:8000/api/followup-templates/meta/channels
```

---

## 🎨 FRONTEND NUTZEN

### **Option 1: Komponente direkt einbinden**

```tsx
import FollowupTemplatesManager from './components/FollowupTemplatesManager';

function SettingsScreen() {
  return (
    <View>
      <FollowupTemplatesManager />
    </View>
  );
}
```

### **Option 2: In Navigation einbinden**

```tsx
<Stack.Screen 
  name="TemplatesManager" 
  component={FollowupTemplatesManager}
  options={{ title: '📋 Follow-up Templates' }}
/>
```

---

## 🤖 ERSTES TEMPLATE ERSTELLEN

### **Via UI:**

1. Öffne Templates Manager
2. Klicke "➕ Neu"
3. Fülle Formular aus:
   - Name: z.B. "Test Template"
   - Trigger Key: z.B. "test_trigger"
   - Channel: WhatsApp
   - Body: "Hey {{first_name}}, das ist ein Test!"
4. Klicke "💾 Speichern"

### **Via API:**

```bash
curl -X POST http://localhost:8000/api/followup-templates/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "trigger_key": "test_trigger",
    "channel": "whatsapp",
    "body_template": "Hey {{first_name}}, das ist ein Test!",
    "preview_context": {
      "first_name": "Max"
    }
  }'
```

---

## 🤖 GPT AUTO-COMPLETE TESTEN

1. Template erstellen (siehe oben)
2. Template speichern
3. GPT Prompt hinzufügen:

```
Generiere für {{first_name}} nach 14 Tagen Inaktivität:
1. Reminder (2 Tage): freundlich nachfassen
2. Fallback (5 Tage): Opt-Out anbieten

Ton: empathisch, WhatsApp-Stil
```

4. Klicke "🤖 Reminder + Fallback generieren"
5. Warte 3-5 Sekunden
6. Reminder und Fallback werden automatisch gefüllt! 🎉

---

## 👁️ PREVIEW TESTEN

1. Template öffnen
2. Preview Context ausfüllen:
   - `first_name`: Max
   - `last_name`: Mustermann
3. Klicke "👁️ Vorschau"
4. Sehe gerenderte Nachrichten! 🎉

---

## 🔄 INTEGRATION MIT AUTO-FOLLOW-UP

Templates werden **automatisch** verwendet, wenn:

1. Ein Lead einen Trigger auslöst (z.B. `inactivity_14d`)
2. Ein Template mit diesem `trigger_key` existiert
3. Das Template für den gewählten Channel (WhatsApp/Email/In-App) vorhanden ist

**Beispiel:**

```
Lead: Max (inaktiv seit 14 Tagen)
Trigger: inactivity_14d
Channel: WhatsApp
→ System sucht Template mit trigger_key="inactivity_14d" und channel="whatsapp"
→ Findet Template? → Nutzt Advanced Template ✅
→ Kein Template? → Fallback auf Playbook ✅
```

**Dual-System Vorteil:**
- **Advanced Templates** = Feintuning
- **Playbooks** = Fallback
- Beide arbeiten zusammen! 🔥

---

## 📊 3 VORGEFERTIGTE TEMPLATES

Nach SQL Migration sind folgende Templates verfügbar:

### **1. Inaktivität 14 Tage (WhatsApp)**
- **Trigger:** `inactivity_14d`
- **Channel:** WhatsApp
- **Body:** Empathische Nachfrage
- **Reminder:** Freundliches Nachfassen
- **Fallback:** Opt-Out Angebot

### **2. Proposal No Response (Email)**
- **Trigger:** `proposal_no_response`
- **Channel:** Email
- **Body:** Angebot ansprechen
- **Reminder:** Gesprächsangebot
- **Fallback:** Pause-Option

### **3. Commitment No Meeting (In-App)**
- **Trigger:** `commitment_no_meeting`
- **Channel:** In-App
- **Body:** Termin-Buchung
- **Reminder:** Timeslot anbieten
- **Fallback:** Alternative

---

## 🎯 HÄUFIGSTE USE CASES

### **1. Lead Reactivation**

```
Trigger: inactivity_7d / inactivity_14d / inactivity_30d
Channels: WhatsApp (erste Wahl), Email (Fallback)
Goal: Lead wieder aktivieren
```

### **2. Proposal Follow-up**

```
Trigger: proposal_sent / proposal_no_response
Channels: Email (erste Wahl), In-App (Fallback)
Goal: Angebot abschließen
```

### **3. Meeting Reminder**

```
Trigger: meeting_scheduled / meeting_tomorrow
Channels: WhatsApp (erste Wahl), In-App (Fallback)
Goal: Erscheinen sicherstellen
```

### **4. Objection Handling**

```
Trigger: objection_price / objection_time
Channels: WhatsApp (erste Wahl), Email (Fallback)
Goal: Einwand entkräften
```

---

## 🛠️ TROUBLESHOOTING

### **❌ "Template not found"**

**Lösung:**
- SQL Migration ausgeführt?
- Backend neu gestartet?
- Health Check: `curl http://localhost:8000/api/followup-templates/health`

### **❌ GPT Auto-Complete funktioniert nicht**

**Lösung:**
- `OPENAI_API_KEY` in `.env` gesetzt?
- OpenAI Package installiert? `pip show openai`
- Backend-Logs prüfen

### **❌ Rendering zeigt {{placeholders}}**

**Lösung:**
- Preview Context gesetzt?
- Placeholders korrekt geschrieben? `{{first_name}}` (doppelte geschweifte Klammern)

### **❌ Templates werden nicht auto-getriggert**

**Lösung:**
- `trigger_key` stimmt mit Playbook-Trigger überein?
- Template ist `is_active = true`?
- Channel passt zum Lead? (Lead hat WhatsApp/Email?)

---

## 📁 ERSTELLTE DATEIEN

### **Backend:**
- `backend/database/advanced_templates_migration.sql` - Database Migration
- `backend/app/services/template_service.py` - Template Service
- `backend/app/routers/followup_templates.py` - API Router
- `backend/app/services/followup_service.py` - Integration (erweitert)
- `backend/main.py` - Router Registration (erweitert)

### **Frontend:**
- `sales-flow-ai/components/FollowupTemplateEditor.tsx` - Template Editor
- `sales-flow-ai/components/FollowupTemplatesManager.tsx` - Template Manager

### **Deployment:**
- `deploy_advanced_templates.ps1` - PowerShell Deploy Script
- `backend/database/ADVANCED_TEMPLATES_README.md` - Vollständige Doku
- `ADVANCED_TEMPLATES_QUICK_START.md` - Diese Quick Start Guide

---

## 🎉 FERTIG!

**Du bist jetzt bereit, Advanced Follow-up Templates zu nutzen!**

**Nächste Schritte:**
1. ✅ SQL Migration ausführen
2. ✅ Backend neu starten
3. ✅ Templates Manager öffnen
4. ✅ Erstes Template erstellen
5. ✅ GPT Auto-Complete testen
6. 🚀 **Live gehen!**

---

## 📚 WEITERFÜHRENDE DOKU

- **Vollständige Doku:** `backend/database/ADVANCED_TEMPLATES_README.md`
- **Deployment Guide:** `deploy_advanced_templates.ps1`
- **Follow-up System:** `FOLLOWUP_SYSTEM_COMPLETE.md`
- **AI Prompts:** `AI_PROMPTS_COMPLETE_SYSTEM.md`

---

## 💡 SUPPORT

Bei Fragen oder Problemen:

1. Prüfe `backend/database/ADVANCED_TEMPLATES_README.md`
2. Prüfe Backend-Logs
3. Teste API mit curl
4. Verifiziere SQL Migration

**Viel Erfolg! 🎯**

