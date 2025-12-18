# 🎯 SalesFlow AI - Event Handlers Guide

## ✅ **EVENT HANDLER IMPLEMENTIERT!**

Ich habe Beispiel-Event-Handler für alle Lead-Events erstellt.

---

## 📁 **DATEIEN-STRUKTUR**

```
backend/app/events/handlers/
├── __init__.py              # Importiert alle Handler
└── lead_handlers.py         # Lead Event Handlers
```

---

## 🎯 **IMPLEMENTIERTE HANDLER**

### **1. handle_lead_created**
**Event:** `lead.created`

**Aktionen:**
- ✅ Analytics Tracking (Funnel, Attribution)
- ✅ Autopilot Trigger (vorbereitet)
- ✅ Notification (vorbereitet)

**Wird getriggert wenn:**
- Neuer Lead erstellt wird
- Zero-Input Lead extrahiert wird

---

### **2. handle_autopilot_action**
**Event:** `autopilot.action_executed`

**Aktionen:**
- ✅ Analytics Tracking
- ✅ Attribution Tracking (AI ROI)

**Wird getriggert wenn:**
- Autopilot eine Aktion ausführt
- AI-basierte Automation läuft

---

### **3. handle_message_sent**
**Event:** `message.sent`

**Aktionen:**
- ✅ SLO Tracking (Message Processing Latency)
- ✅ Metrics Tracking

**Wird getriggert wenn:**
- Nachricht über einen Kanal gesendet wird
- WhatsApp, Email, LinkedIn, etc.

---

### **4. handle_sequence_step**
**Event:** `sequence.step_executed`

**Aktionen:**
- ✅ Analytics Tracking
- ✅ Funnel Tracking

**Wird getriggert wenn:**
- Email-Sequence Schritt ausgeführt wird
- Marketing Automation läuft

---

## 🔧 **INTEGRATION IN BESTEHENDE SERVICES**

### **Beispiel: Lead Service**

```python
# backend/app/domain/leads/service.py

from app.domain.shared.events import EventBus, LeadCreatedEvent

class LeadService:
    def __init__(self, db: AsyncSession):
        self.event_bus = EventBus(db)
    
    async def create_lead(self, lead_data: dict, ctx: RequestContext):
        lead = await self.repo.add(lead)
        
        # Event publishen
        await self.event_bus.publish(
            LeadCreatedEvent(
                tenant_id=ctx.tenant_id,
                occurred_at=lead.created_at,
                lead_id=lead.id,
                source=lead_data.get("source", "manual"),
            ),
            request_id=ctx.request_id,
        )
        
        return lead
```

**Der Handler wird automatisch getriggert!** 🎉

---

## 🚀 **EVENT API ENDPOINTS**

### **Event abrufen:**
```bash
GET /api/events/{event_id}
```

### **Event replayen (für Testing):**
```bash
POST /api/events/{event_id}/replay
```

### **Batch Replay:**
```bash
POST /api/events/replay/batch?event_type=lead.created&limit=10
```

### **Pending Events:**
```bash
GET /api/events/status/pending
```

---

## 📊 **WIE ES FUNKTIONIERT**

1. **Service publisht Event:**
   ```python
   await event_bus.publish(LeadCreatedEvent(...))
   ```

2. **Event wird in DB gespeichert:**
   - Status: `pending`
   - Celery Task wird getriggert

3. **Handler wird ausgeführt:**
   - Automatisch durch Event Handler Registry
   - Alle registrierten Handler für diesen Event-Type

4. **Event Status aktualisiert:**
   - `processed` bei Erfolg
   - `failed` bei Fehler

---

## 🔍 **DEBUGGING**

### **Event Status prüfen:**
```sql
SELECT 
    id,
    type,
    status,
    created_at,
    processed_at,
    error_message
FROM public.events
WHERE tenant_id = '<your-tenant-id>'
ORDER BY created_at DESC
LIMIT 10;
```

### **Failed Events:**
```sql
SELECT * FROM public.events
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### **Event Replay (für Testing):**
```python
from app.events.replay import replay_event

await replay_event(db, event_id)
```

---

## ➕ **NEUE HANDLER HINZUFÜGEN**

### **Beispiel: Custom Handler**

```python
# backend/app/events/handlers/custom_handlers.py

from app.events.handler import register_event_handler
from app.events.types import EventType

@register_event_handler(EventType.LEAD_CREATED)
async def my_custom_handler(db: AsyncSession, event: Event):
    # Deine Logik hier
    pass
```

**Wichtig:** Handler muss beim App-Start importiert werden (in `handlers/__init__.py`).

---

## ✅ **STATUS**

- ✅ Event Handler Registry implementiert
- ✅ 4 Beispiel-Handler erstellt
- ✅ Integration in main.py (automatische Registrierung)
- ✅ Event API Endpoints erstellt
- ✅ Analytics Integration vorbereitet

---

**Die Event Handler sind jetzt registriert und einsatzbereit!** 🚀🎯

