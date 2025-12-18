# 🔌 API Reference

Vollständige API-Dokumentation für SalesFlow AI Backend (FastAPI).

---

## Base URL

```
Production: https://api.salesflow.ai
Development: http://localhost:8000
```

## Authentication

Alle geschützten Endpoints erfordern einen JWT Bearer Token:

```http
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST `/api/auth/signup`

Registriert einen neuen Benutzer.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "Max",
  "last_name": "Mustermann",
  "company": "Muster GmbH"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "Max",
    "last_name": "Mustermann"
  }
}
```

### POST `/api/auth/login`

Authentifiziert einen Benutzer.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### POST `/api/auth/refresh`

Erneuert Access Token mit Refresh Token.

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### POST `/api/auth/logout`

Invalidiert den aktuellen Token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

## Lead Endpoints

### GET `/api/leads`

Listet alle Leads mit Pagination und Filterung.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Seitennummer |
| page_size | int | 20 | Items pro Seite (max 100) |
| status | string | - | Filter: new, contacted, qualified, etc. |
| priority | string | - | Filter: low, medium, high, urgent |
| source | string | - | Filter: website, linkedin, etc. |
| search | string | - | Suche in Name, Email, Company |
| sort_by | string | created_at | Sortierfeld |
| sort_order | string | desc | asc oder desc |

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "first_name": "Max",
      "last_name": "Mustermann",
      "email": "max@firma.de",
      "company": "Muster GmbH",
      "status": "qualified",
      "priority": "high",
      "score": 85,
      "created_at": "2024-12-05T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### POST `/api/leads`

Erstellt einen neuen Lead.

**Request:**
```json
{
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@firma.de",
  "company": "Muster GmbH",
  "phone": "+49123456789",
  "source": "website",
  "priority": "medium",
  "notes": "Interessiert an Enterprise Plan",
  "tags": ["enterprise", "q1-2025"]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@firma.de",
  "status": "new",
  "score": 0,
  "created_at": "2024-12-05T10:00:00Z"
}
```

### GET `/api/leads/{id}`

Ruft einen spezifischen Lead ab.

**Response (200):**
```json
{
  "id": "uuid",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@firma.de",
  "company": "Muster GmbH",
  "status": "qualified",
  "priority": "high",
  "score": 85,
  "estimated_value": 15000.00,
  "contacts": [...],
  "activities": [...],
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T12:00:00Z"
}
```

### PATCH `/api/leads/{id}`

Aktualisiert einen Lead (partial update).

**Request:**
```json
{
  "status": "contacted",
  "notes": "Anruf geplant für Montag"
}
```

### DELETE `/api/leads/{id}`

Soft-Delete eines Leads.

**Response (200):**
```json
{
  "message": "Lead deleted",
  "id": "uuid"
}
```

### POST `/api/leads/{id}/status`

Ändert den Lead-Status.

**Request:**
```json
{
  "status": "qualified",
  "reason": "Budget bestätigt"
}
```

---

## Deal Endpoints

### GET `/api/deals`

Listet alle Deals.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| stage | string | discovery, qualification, proposal, etc. |
| min_value | decimal | Minimum Deal-Wert |
| max_value | decimal | Maximum Deal-Wert |

### POST `/api/deals`

Erstellt einen neuen Deal.

**Request:**
```json
{
  "lead_id": "uuid",
  "name": "Enterprise License Q1",
  "value": 50000.00,
  "currency": "EUR",
  "stage": "discovery",
  "expected_close_date": "2025-03-31",
  "products": ["Enterprise License", "Support Package"]
}
```

### PATCH `/api/deals/{id}/stage`

Ändert die Deal-Stage.

**Request:**
```json
{
  "stage": "proposal",
  "notes": "Angebot versendet"
}
```

---

## Copilot Endpoints

### POST `/api/copilot/generate`

Generiert AI-Antwort für Sales-Kontext.

**Request:**
```json
{
  "context": "Lead hat nach Pricing gefragt",
  "lead_id": "uuid",
  "action": "generate_reply",
  "options": {
    "tone": "professional",
    "length": "short"
  }
}
```

**Response (200):**
```json
{
  "suggestion": "Vielen Dank für Ihr Interesse an unseren Lösungen...",
  "confidence": 0.92,
  "model_used": "gpt-4o",
  "alternatives": [...]
}
```

### POST `/api/copilot/analyze`

Analysiert einen Lead mit AI.

**Request:**
```json
{
  "lead_id": "uuid",
  "include": ["sentiment", "score", "next_steps"]
}
```

---

## Autopilot Endpoints

### GET `/api/autopilot/suggestions`

Ruft Autopilot-Vorschläge ab.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, approved, dismissed |
| min_confidence | float | Minimum Confidence (0-1) |

### POST `/api/autopilot/suggestions/{id}/approve`

Genehmigt einen Vorschlag.

### POST `/api/autopilot/suggestions/{id}/dismiss`

Lehnt einen Vorschlag ab.

---

## Error Responses

Alle Fehler folgen diesem Format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {
    "field": "Specific field error"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | Resource nicht gefunden |
| VALIDATION_ERROR | 422 | Ungültige Request-Daten |
| PERMISSION_DENIED | 403 | Keine Berechtigung |
| CONFLICT | 409 | Resource-Konflikt |
| INVALID_STATE | 400 | Ungültiger Status-Übergang |
| RATE_LIMIT_EXCEEDED | 429 | Zu viele Requests |
| INTERNAL_ERROR | 500 | Server-Fehler |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Auth (Login/Signup) | 5 | 5 min |
| API (Standard) | 100 | 1 min |
| AI (Copilot) | 20 | 1 min |
| Bulk Operations | 10 | 1 min |

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1733426400
```

---

## Interactive Docs

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

