# 🔗 SalesFlow AI - Integration Examples

## ✅ **EVENT HANDLER REGISTRIERT!**

Die Event Handler sind jetzt automatisch registriert und werden beim App-Start geladen.

---

## 📋 **BEISPIEL-INTEGRATIONEN**

### **1. Lead Service - Event Publishing**

```python
# backend/app/domain/leads/service.py

from app.domain.shared.events import EventBus, LeadCreatedEvent

class LeadService:
    def __init__(self, db: AsyncSession):
        self.event_bus = EventBus(db)
    
    async def create_lead(self, lead_data: dict, ctx: RequestContext):
        lead = await self.repo.add(lead)
        
        # Event publishen → Handler wird automatisch getriggert!
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

**Was passiert automatisch:**
1. ✅ Event wird in DB gespeichert
2. ✅ Celery Task wird getriggert
3. ✅ `handle_lead_created` Handler läuft
4. ✅ Analytics wird getrackt
5. ✅ Funnel wird aktualisiert

---

### **2. Message Service - Event Publishing**

```python
# backend/app/services/channels/whatsapp_adapter.py

from app.domain.shared.events import EventBus
from app.events.types import EventType
from app.events.models import EventCreate
from app.events.repository import EventRepository

async def send_message(lead_id: str, message: str, tenant_id: str):
    start = time.time()
    
    # Message senden
    result = await whatsapp_api.send(message)
    duration = (time.time() - start) * 1000
    
    # Event publishen
    repo = EventRepository(db)
    await repo.create(
        EventCreate(
            tenant_id=tenant_id,
            type=EventType.MESSAGE_SENT.value,
            payload={
                "lead_id": lead_id,
                "channel": "whatsapp",
                "message_type": "text",
                "latency_ms": int(duration),
                "success": True,
            },
            source="channel.whatsapp",
        )
    )
    
    return result
```

**Was passiert automatisch:**
1. ✅ SLO Tracking (Message Processing Latency)
2. ✅ Metrics Tracking
3. ✅ Analytics Integration

---

### **3. AI Service - Event Publishing**

```python
# backend/app/services/ai_service.py

from app.domain.shared.events import EventBus
from app.events.types import EventType
from app.events.models import EventCreate
from app.events.repository import EventRepository

async def generate_response(prompt: str, model: str, tenant_id: str):
    start = time.time()
    
    response = await openai_client.chat.completions.create(...)
    duration = (time.time() - start) * 1000
    
    # Event publishen für Autopilot Actions
    repo = EventRepository(db)
    await repo.create(
        EventCreate(
            tenant_id=tenant_id,
            type=EventType.AUTOPILOT_ACTION_EXECUTED.value,
            payload={
                "action_type": "ai_response_generation",
                "model": model,
                "cost": calculate_cost(response),
                "latency_ms": int(duration),
            },
            source="ai_service",
        )
    )
    
    return response
```

---

## 🎯 **VERFÜGBARE EVENT ENDPOINTS**

### **Event abrufen:**
```bash
GET /api/events/{event_id}
```

### **Event replayen:**
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

---

## ✅ **STATUS**

- ✅ Event Handler Registry implementiert
- ✅ 4 Beispiel-Handler erstellt
- ✅ Automatische Registrierung beim App-Start
- ✅ Event API Endpoints erstellt
- ✅ Integration in main.py

---

**Die Event Handler sind jetzt vollständig integriert!** 🚀🎯

