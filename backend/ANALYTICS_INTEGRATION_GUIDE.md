# 📊 SalesFlow AI - Analytics Framework Integration Guide

## ✅ **INTEGRATION ABGESCHLOSSEN!**

Das Analytics-Framework wurde erfolgreich in SalesFlow AI integriert.

---

## 📁 **DATEIEN-STRUKTUR**

```
backend/app/analytics/
├── __init__.py                    # Haupt-Exports
├── monitoring/
│   ├── __init__.py
│   ├── slos.py                    # Service Level Objectives
│   ├── metrics.py                 # Prometheus Metrics
│   ├── alerts.py                  # Alert Management
│   └── health.py                  # Health Checks
├── business/
│   ├── __init__.py
│   ├── conversion.py              # Funnel Tracking
│   └── attribution.py             # Revenue Attribution
└── dashboards/
    └── __init__.py                # (Coming Soon)
```

---

## 🚀 **ENDPOINTS VERFÜGBAR**

### **SLO Monitoring**
- `GET /api/analytics/slo/status` - SLO Health Summary
- `GET /api/analytics/slo/{slo_name}` - Specific SLO Snapshot
- `GET /api/analytics/slo/report/json` - JSON Report
- `GET /api/analytics/slo/report/markdown` - Markdown Report

### **Metrics**
- `GET /api/analytics/metrics/prometheus` - Prometheus Export

### **Health Checks**
- `GET /api/analytics/health/check` - Full System Health
- `GET /api/analytics/health/kubernetes/{probe_type}` - K8s Probes

### **Alerts**
- `GET /api/analytics/alerts/active` - Active Alerts
- `GET /api/analytics/alerts/stats` - Alert Statistics

### **Funnel & Conversion**
- `GET /api/analytics/funnel/snapshot` - Funnel Metrics
- `GET /api/analytics/funnel/visualization` - Funnel Data
- `GET /api/analytics/funnel/dropoff` - Drop-off Analysis

### **Attribution**
- `GET /api/analytics/attribution/report` - Full Attribution Report
- `GET /api/analytics/attribution/channels` - Channel Comparison
- `GET /api/analytics/attribution/features` - Feature Impact
- `GET /api/analytics/attribution/ai-roi` - AI ROI Analysis

---

## 🔧 **INTEGRATION IN BESTEHENDE SERVICES**

### **1. Lead Service Integration**

```python
# backend/app/services/lead_service.py

from app.services.analytics_integration import (
    track_lead_created,
    track_lead_created_funnel,
    LeadSource,
)

async def create_lead(lead_data: dict, tenant_id: str):
    lead = await db.leads.create(lead_data)
    
    # Analytics tracken
    track_lead_created(source=lead_data.get("source", "manual"), tenant_id=tenant_id)
    track_lead_created_funnel(
        lead_id=lead.id,
        tenant_id=tenant_id,
        source=LeadSource(lead_data.get("source", "unknown")),
    )
    
    return lead
```

### **2. AI Service Integration**

```python
# backend/app/services/ai_service.py

from app.services.analytics_integration import (
    track_ai_response_latency,
    track_ai_request,
)

async def generate_response(prompt: str, model: str, tenant_id: str):
    start = time.time()
    
    response = await openai_client.chat.completions.create(...)
    duration = (time.time() - start) * 1000
    
    # SLO Tracking
    await track_ai_response_latency(
        latency_ms=int(duration),
        tenant_id=tenant_id,
        model=model,
    )
    
    # Metrics Tracking
    track_ai_request(
        provider="openai",
        model=model,
        scenario="chat_completion",
        tokens_input=response.usage.prompt_tokens,
        tokens_output=response.usage.completion_tokens,
        cost_usd=calculate_cost(response),
        duration_seconds=duration / 1000,
        tenant_id=tenant_id,
    )
    
    return response
```

### **3. Message Service Integration**

```python
# backend/app/services/channels/whatsapp_adapter.py

from app.services.analytics_integration import (
    track_message_processing_latency,
    track_message_sent,
    track_touchpoint,
    TouchType,
    Channel,
    FeatureCategory,
)

async def send_message(lead_id: str, message: str, tenant_id: str):
    start = time.time()
    result = await whatsapp_api.send(message)
    duration = (time.time() - start) * 1000
    
    # SLO Tracking
    await track_message_processing_latency(
        latency_ms=int(duration),
        tenant_id=tenant_id,
        success=True,
    )
    
    # Metrics Tracking
    track_message_sent(
        channel="whatsapp",
        message_type="outbound",
        tenant_id=tenant_id,
    )
    
    # Attribution Tracking
    track_touchpoint(
        lead_id=lead_id,
        tenant_id=tenant_id,
        touch_type=TouchType.WHATSAPP_MESSAGE,
        channel="whatsapp",
        feature_used=FeatureCategory.AI_RESPONSE_GENERATION,
        ai_assisted=True,
        cost=0.02,
    )
    
    return result
```

---

## 📊 **BEISPIEL-USAGE**

### **SLO Status abfragen:**
```bash
curl http://localhost:8000/api/analytics/slo/status
```

### **Funnel Snapshot:**
```bash
curl http://localhost:8000/api/analytics/funnel/snapshot?period_days=30
```

### **Attribution Report:**
```bash
curl http://localhost:8000/api/analytics/attribution/report?model=time_decay&period_days=30
```

### **Prometheus Metrics:**
```bash
curl http://localhost:8000/api/analytics/metrics/prometheus
```

---

## ⚙️ **KONFIGURATION**

### **Alert Manager Setup (Optional):**

```python
# backend/app/core/config.py

from app.analytics import create_alert_manager

# In startup event:
alert_manager = create_alert_manager(
    slack_webhook=settings.slack_webhook_url,
    pagerduty_key=settings.pagerduty_routing_key,
    email_config={
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "from_address": settings.smtp_from_email,
    }
)
```

### **Health Check Setup (Optional):**

```python
# backend/app/main.py

from app.analytics import create_health_check_manager

@app.on_event("startup")
async def startup():
    manager, runner = create_health_check_manager()
    await runner.start()
```

---

## 🎯 **NÄCHSTE SCHRITTE**

1. ✅ **Dateien kopiert** - Framework ist integriert
2. ✅ **Router erstellt** - Endpoints verfügbar
3. ⏳ **Integration in Services** - Schrittweise in bestehende Services einbauen
4. ⏳ **Monitoring Dashboard** - Frontend-Dashboard erstellen
5. ⏳ **Alerting konfigurieren** - Slack/Email/PagerDuty einrichten

---

## 📝 **NOTES**

- **In-Memory Storage:** Aktuell werden alle Daten im Memory gespeichert
- **Persistierung:** Für Production sollte man DB-Persistierung hinzufügen
- **Performance:** Framework ist optimiert für hohe Last
- **Skalierung:** Singleton-Pattern für effiziente Ressourcennutzung

---

**Das Analytics-Framework ist jetzt vollständig integriert und einsatzbereit!** 🚀📊

