# 🧪 **TESTING GUIDE - SalesFlow AI Event System**

## ✅ **SYSTEM TESTEN**

### **1. App starten**

```bash
cd backend
uvicorn app.main:app --reload
```

**Erwartete Ausgabe:**
```
INFO:     Event handlers imported and registered
INFO:     🚀 SalesFlow AI starting up...
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

### **2. Event-Flow testen**

#### **2.1 Lead erstellen (sollte Event triggern)**

```bash
# Via API
curl -X POST http://localhost:8000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Lead",
    "status": "NEW",
    "platform": "WhatsApp"
  }'
```

**Oder via Frontend:**
- Lead erstellen
- Event sollte automatisch getriggert werden

---

#### **2.2 Event Status prüfen**

**Via API:**
```bash
# Pending Events
curl http://localhost:8000/api/events/status/pending

# Alle Events
curl http://localhost:8000/api/events
```

**Via SQL (Supabase):**
```sql
-- Alle Events
SELECT 
    id,
    type,
    status,
    created_at,
    processed_at,
    error_message
FROM public.events
ORDER BY created_at DESC
LIMIT 10;

-- Failed Events
SELECT * FROM public.events
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Pending Events
SELECT * FROM public.events
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

### **3. Handler testen**

#### **3.1 Handler-Logs prüfen**

**In App-Logs nach folgenden Meldungen suchen:**
- `"Event published"` - Event wurde erstellt
- `"Event processed"` - Handler hat Event verarbeitet
- `"Error processing event"` - Handler-Fehler

**Beispiel-Logs:**
```
INFO: Lead created event published, event_id=..., lead_id=...
INFO: Event handlers imported and registered
INFO: Lead created event received, lead_id=..., source=manual
INFO: Analytics tracked, lead_id=...
```

---

#### **3.2 Event Replay testen**

```bash
# Event replayen (für Testing)
curl -X POST http://localhost:8000/api/events/{event_id}/replay \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **4. Follow-Ups testen**

#### **4.1 Follow-Up generieren**

```bash
curl -X POST http://localhost:8000/api/follow-ups/{lead_id}/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Erwartetes Event:**
- `sequence.step_executed` sollte getriggert werden

---

#### **4.2 Batch Follow-Ups**

```bash
curl -X POST http://localhost:8000/api/follow-ups/batch/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_ids": ["lead-id-1", "lead-id-2"]
  }'
```

---

### **5. Autopilot testen**

#### **5.1 Autopilot ausführen**

```bash
curl -X POST http://localhost:8000/api/autopilot/run-once?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartetes Event:**
- `autopilot.action_executed` sollte getriggert werden

---

#### **5.2 Message Event erstellen**

```bash
curl -X POST http://localhost:8000/api/autopilot/message-event \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "direction": "inbound",
    "text": "Hallo, ich interessiere mich für dein Angebot"
  }'
```

**Erwartetes Event:**
- `message.sent` sollte getriggert werden

---

## 🔍 **DEBUGGING**

### **Event nicht getriggert?**

1. **Prüfe App-Logs:**
   ```bash
   # Suche nach "Event" in Logs
   grep -i "event" logs/app.log
   ```

2. **Prüfe Handler-Registrierung:**
   - Beim App-Start sollte stehen: `"Event handlers imported and registered"`

3. **Prüfe Event in DB:**
   ```sql
   SELECT * FROM public.events 
   WHERE type = 'lead.created' 
   ORDER BY created_at DESC LIMIT 5;
   ```

---

### **Handler läuft nicht?**

1. **Prüfe Event Status:**
   ```sql
   SELECT status, error_message 
   FROM public.events 
   WHERE status = 'failed';
   ```

2. **Prüfe Celery:**
   - Ist Celery Worker gestartet?
   - Prüfe Celery-Logs

3. **Manueller Replay:**
   ```bash
   curl -X POST http://localhost:8000/api/events/{event_id}/replay
   ```

---

### **Tenant-ID Problem?**

**Aktuell:** Tenant-ID wird als Placeholder verwendet (`uuid.uuid4()`)

**Lösung:**
1. User-Model erweitern (tenant_id Feld)
2. Tenant-ID aus User-Context extrahieren
3. Helper-Funktionen anpassen

**Temporär:** System funktioniert mit Placeholder, aber Events sind nicht tenant-isoliert.

---

## ✅ **CHECKLISTE**

- [ ] App startet ohne Fehler
- [ ] Event Handler werden registriert
- [ ] Lead erstellen triggert Event
- [ ] Event wird in DB gespeichert
- [ ] Handler läuft automatisch
- [ ] Analytics wird getrackt
- [ ] Follow-Ups triggern Events
- [ ] Autopilot triggert Events
- [ ] Event Replay funktioniert

---

## 🚀 **NÄCHSTE SCHRITTE**

1. **System testen** ✅ (Jetzt)
2. **Tenant-ID Problem lösen** (Diese Woche)
3. **Monitoring Dashboard** (Nächste Woche)
4. **Integration Tests** (Nächste Woche)

---

**Viel Erfolg beim Testen!** 🎯

