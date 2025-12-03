# 🔌 API Specification - Sales Flow AI

> **Referenzdokumentation für Backend-Entwickler & AI-Agenten**  
> FastAPI Backend | Version 2.0

---

## 📑 Inhaltsverzeichnis

1. [Übersicht](#-übersicht)
2. [Authentifizierung](#-authentifizierung)
3. [API Endpunkte](#-api-endpunkte)
4. [Schemas](#-schemas)
5. [Error Handling](#-error-handling)

---

## 🎯 Übersicht

### Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8000/api` |
| Production | `https://api.salesflow.ai/api` |

### Tech Stack

- **Framework:** FastAPI 0.109+
- **Python:** 3.11+
- **Database:** Supabase PostgreSQL
- **Auth:** JWT (Supabase Auth)
- **AI:** OpenAI GPT-4, Claude

---

## 🔐 Authentifizierung

### JWT Token

Alle Endpoints erfordern einen Bearer Token:

```http
Authorization: Bearer <supabase_jwt_token>
```

### Token-Validierung

```python
from fastapi import Depends
from ...db.deps import get_current_user

@router.get("/protected")
async def protected_route(user = Depends(get_current_user)):
    return {"user_id": user.id}
```

---

## 📡 API Endpunkte

### Daily Flow

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/daily-flow/unified-actions` | Alle Tages-Actions |
| GET | `/daily-flow/summary` | Tages-Zusammenfassung |
| POST | `/daily-flow/actions/{id}/complete` | Action abschließen |
| POST | `/daily-flow/actions/{id}/snooze` | Action verschieben |
| GET | `/daily-flow/urgent-actions` | Nur dringende Actions |
| GET | `/daily-flow/payment-checks` | Zahlungsprüfungen |

#### GET `/daily-flow/summary`

**Query Parameters:**
- `for_date` (optional): ISO-Datum (YYYY-MM-DD)

**Response:**
```json
{
  "date": "2024-12-03",
  "total_actions": 15,
  "completed_actions": 8,
  "completion_rate": 53.3,
  "payment_checks": 2,
  "follow_ups": 6,
  "new_contacts": 4,
  "reactivations": 2,
  "calls": 1,
  "overdue_count": 3,
  "urgent_count": 2,
  "estimated_time_minutes": 45
}
```

---

### Pulse Tracker

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/pulse/outreach` | Neue Outreach erstellen |
| PATCH | `/pulse/outreach/{id}/status` | Status aktualisieren |
| GET | `/pulse/checkins` | Fällige Check-ins |
| GET | `/pulse/ghosts` | Ghost-Leads |
| POST | `/pulse/ghosts/{id}/bust` | Ghost-Buster senden |
| GET | `/pulse/funnel` | Conversion Funnel |
| POST | `/pulse/behavior/analyze` | Verhaltensanalyse |

#### POST `/pulse/outreach`

**Request:**
```json
{
  "lead_id": "uuid",
  "channel": "instagram",
  "message_text": "Hey! Hab dein Profil gesehen...",
  "intent": "intro"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "sent",
  "scheduled_checkin": "2024-12-04T10:00:00Z"
}
```

---

### CHIEF AI Chat

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/chief/chat` | Chat mit CHIEF |
| GET | `/chief/context` | Aktueller Kontext |
| POST | `/chief/feedback` | Feedback zu Antwort |

#### POST `/chief/chat`

**Request:**
```json
{
  "message": "Wie steh ich heute?",
  "include_context": true
}
```

**Response:**
```json
{
  "response": "Hey! Du hast heute schon 5/8 Kontakte...",
  "actions": [
    {"action": "FOLLOWUP_LEADS", "params": ["lead-001", "lead-002"]}
  ],
  "tokens_used": 450,
  "context_summary": {
    "daily_flow_completion": 62,
    "suggested_leads_count": 5
  }
}
```

---

### Knowledge Base

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/knowledge/upload` | Dokument hochladen |
| GET | `/knowledge/documents` | Alle Dokumente |
| DELETE | `/knowledge/documents/{id}` | Dokument löschen |
| POST | `/knowledge/query` | Knowledge abfragen |

#### POST `/knowledge/upload`

**Request (multipart/form-data):**
- `file`: PDF/TXT Datei
- `category`: "products" | "pricing" | "objections" | "scripts"

**Response:**
```json
{
  "id": "uuid",
  "filename": "preisliste.pdf",
  "chunks": 42,
  "status": "processed"
}
```

---

### Leads

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/leads` | Alle Leads |
| POST | `/leads` | Lead erstellen |
| GET | `/leads/{id}` | Lead Details |
| PATCH | `/leads/{id}` | Lead aktualisieren |
| GET | `/leads/{id}/timeline` | Lead Timeline |
| POST | `/leads/{id}/disc-analyze` | DISC analysieren |

---

### Analytics

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/analytics/dashboard` | Dashboard Metriken |
| GET | `/analytics/performance` | Performance Trends |
| GET | `/analytics/conversion` | Conversion Rates |
| GET | `/analytics/leaderboard` | Team Leaderboard |

---

## 📋 Schemas

### UnifiedAction

```typescript
interface UnifiedAction {
  id: string;
  source: "pending_action" | "daily_flow";
  action_type: "check_payment" | "follow_up" | "new_contact" | "reactivation" | "call";
  priority: 1 | 2 | 3 | 4 | 5;
  
  lead_id?: string;
  lead_name?: string;
  lead_channel?: "instagram" | "linkedin" | "whatsapp" | "email";
  lead_status?: string;
  lead_deal_state?: string;
  
  title: string;
  reason?: string;
  suggested_message?: string;
  due_date?: string;
  due_time?: string;
  
  status: "pending" | "in_progress" | "completed" | "snoozed";
  is_urgent: boolean;
  is_overdue: boolean;
}
```

### MessageStatus

```typescript
type MessageStatus = 
  | "sent"      // Gesendet
  | "seen"      // Gesehen
  | "replied"   // Geantwortet
  | "ghosted"   // Ghosted
  | "invisible" // Nicht gelesen
  | "stale";    // Veraltet
```

### MessageIntent

```typescript
type MessageIntent =
  | "intro"      // Erstansprache
  | "discovery"  // Bedarfsanalyse
  | "pitch"      // Angebot
  | "closing"    // Abschluss
  | "followup"   // Nachfassen
  | "reactivation"; // Reaktivierung
```

### GhostType

```typescript
type GhostType = "soft" | "hard";

// Soft: < 7 Tage, evtl. busy
// Hard: > 7 Tage, aktiv aber ignoriert
```

### BehaviorProfile

```typescript
interface BehaviorProfile {
  lead_id: string;
  disc_d: number;  // 0-1
  disc_i: number;  // 0-1
  disc_s: number;  // 0-1
  disc_g: number;  // 0-1
  dominant_style: "D" | "I" | "S" | "G";
  confidence: number;  // 0-1
  mood?: "enthusiastic" | "cautious" | "skeptical" | "neutral";
  decision_tendency?: "fast" | "slow" | "analytical";
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "detail": "Error message",
  "code": "ERROR_CODE",
  "field": "optional_field_name"
}
```

### HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Server Error |

### Common Error Codes

| Code | Beschreibung |
|------|--------------|
| `AUTH_EXPIRED` | Token abgelaufen |
| `AUTH_INVALID` | Token ungültig |
| `LEAD_NOT_FOUND` | Lead existiert nicht |
| `QUOTA_EXCEEDED` | AI-Quota überschritten |
| `RATE_LIMITED` | Zu viele Requests |

---

## 🔧 Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/chief/chat` | 60/Minute |
| `/pulse/*` | 120/Minute |
| `/knowledge/upload` | 10/Stunde |
| Standard | 300/Minute |

---

> **Sales Flow AI** | API Specification v2.0 | 2024

