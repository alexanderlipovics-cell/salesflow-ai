# 🔌 API SPECIFICATION
## NetworkerOS Backend v2.0

---

## BASE CONFIGURATION

```yaml
Base URL: https://api.networkeros.app/api/v2
Authentication: Bearer Token (JWT)
Content-Type: application/json
Rate Limits:
  - Free: 100 requests/hour
  - Pro: 1000 requests/hour
  - Leader: 5000 requests/hour
```

---

## AUTHENTICATION

### POST /auth/register
Registriert neuen User

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Max Mustermann",
  "company_name": "PM International",
  "product_category": "wellness",
  "referral_code": "ABC123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "Max Mustermann"
    },
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "expires_in": 3600
    }
  }
}
```

### POST /auth/login
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### POST /auth/refresh
```json
{
  "refresh_token": "eyJ..."
}
```

### POST /auth/logout
Header: `Authorization: Bearer {access_token}`

---

## CONTACTS (Prospects & Customers)

### GET /contacts
Liste aller Kontakte

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `new`, `contacted`, `presented`, `followup`, `customer`, `rejected` |
| `type` | string | `prospect`, `customer`, `team` |
| `disg` | string | `D`, `I`, `S`, `G` |
| `sort` | string | `name`, `last_contact`, `created_at`, `score` |
| `order` | string | `asc`, `desc` |
| `limit` | int | Max 100, default 20 |
| `offset` | int | Pagination offset |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "con_abc123",
        "name": "Maria Schmidt",
        "email": "maria@example.com",
        "phone": "+49123456789",
        "type": "prospect",
        "status": "followup",
        "disg_type": "I",
        "disg_confidence": 0.85,
        "relationship": "warm",
        "source": "instagram",
        "score": 75,
        "tags": ["interested", "health-focus"],
        "last_contact": "2025-12-01T14:30:00Z",
        "next_followup": "2025-12-04T10:00:00Z",
        "notes": "Hat Interesse an Abnehmen gezeigt",
        "created_at": "2025-11-15T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### POST /contacts
Neuen Kontakt erstellen

**Request:**
```json
{
  "name": "Thomas Müller",
  "email": "thomas@example.com",
  "phone": "+49987654321",
  "type": "prospect",
  "relationship": "cold",
  "source": "facebook",
  "notes": "Über Anzeige gekommen",
  "tags": ["ad-lead"]
}
```

### GET /contacts/:id
Einzelnen Kontakt abrufen

### PUT /contacts/:id
Kontakt aktualisieren

### DELETE /contacts/:id
Kontakt löschen (soft delete)

### POST /contacts/:id/analyze
DISG-Analyse aus Nachrichten

**Request:**
```json
{
  "messages": [
    {
      "content": "Hey, das klingt interessant! Erzähl mir mehr 🎉",
      "direction": "inbound",
      "timestamp": "2025-12-01T14:30:00Z"
    },
    {
      "content": "Super! Ich schick dir gleich ein Video!",
      "direction": "outbound",
      "timestamp": "2025-12-01T14:32:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "disg_type": "I",
    "confidence": 0.78,
    "indicators": [
      "Enthusiastische Sprache",
      "Emoji-Verwendung",
      "Schnelle Reaktion"
    ],
    "communication_tips": [
      "Bleib enthusiastisch und persönlich",
      "Nutze Stories und soziale Beweise",
      "Vermeide zu viele Zahlen und Details"
    ]
  }
}
```

### GET /contacts/:id/health
Deal Health Check

**Response:**
```json
{
  "success": true,
  "data": {
    "health_score": 65,
    "status": "at_risk",
    "risk_factors": [
      {
        "factor": "Lange ohne Kontakt",
        "impact": "high",
        "days_since_contact": 7
      },
      {
        "factor": "Kein Follow-Up geplant",
        "impact": "medium"
      }
    ],
    "recommendations": [
      {
        "action": "followup",
        "urgency": "high",
        "suggested_script": "script_followup_ghosted"
      }
    ]
  }
}
```

---

## DMO (Daily Method of Operation)

### GET /dmo/today
Heutiger DMO-Status

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-12-03",
    "activities": [
      {
        "id": "new_contacts",
        "label": "Neue Kontakte",
        "target": 5,
        "completed": 3,
        "progress": 60
      },
      {
        "id": "followups",
        "label": "Follow-Ups",
        "target": 3,
        "completed": 1,
        "progress": 33
      },
      {
        "id": "presentations",
        "label": "Präsentationen",
        "target": 1,
        "completed": 0,
        "progress": 0
      },
      {
        "id": "social_posts",
        "label": "Social Posts",
        "target": 2,
        "completed": 2,
        "progress": 100
      }
    ],
    "overall_progress": 50,
    "streak": {
      "current": 7,
      "best": 14
    },
    "points": {
      "today": 60,
      "total": 2450
    }
  }
}
```

### POST /dmo/log
Aktivität loggen

**Request:**
```json
{
  "activity_type": "new_contacts",
  "count": 1,
  "contact_id": "con_abc123",
  "notes": "Auf Instagram angeschrieben"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activity": {
      "id": "act_xyz789",
      "type": "new_contacts",
      "count": 1,
      "timestamp": "2025-12-03T15:30:00Z"
    },
    "dmo_update": {
      "new_contacts": {
        "target": 5,
        "completed": 4,
        "progress": 80
      }
    },
    "points_earned": 10,
    "achievements_unlocked": []
  }
}
```

### PUT /dmo/targets
Ziele anpassen

**Request:**
```json
{
  "activities": [
    { "id": "new_contacts", "target": 7 },
    { "id": "followups", "target": 5 }
  ]
}
```

### GET /dmo/history
Verlauf abrufen

**Query Parameters:**
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "date": "2025-12-02",
        "completed": true,
        "activities": {...},
        "points": 100
      },
      {
        "date": "2025-12-01",
        "completed": true,
        "activities": {...},
        "points": 85
      }
    ],
    "summary": {
      "total_days": 30,
      "completed_days": 22,
      "completion_rate": 73,
      "total_contacts": 124,
      "total_presentations": 18
    }
  }
}
```

### GET /dmo/streak
Streak-Informationen

---

## MENTOR AI (Chat)

### POST /mentor/chat
Nachricht an MENTOR AI

**Request:**
```json
{
  "message": "Ein Prospect sagt immer 'Ich muss mit meinem Mann sprechen'. Was soll ich antworten?",
  "context": {
    "current_prospect_id": "con_abc123",
    "conversation_stage": "objection"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Klassiker! 👊 Das höre ich oft.\n\nErstmal: Das kann echt sein ODER ein Vorwand...",
    "actions": [
      {
        "type": "SCRIPT_SUGGEST",
        "params": ["einwand", "partner"]
      },
      {
        "type": "START_ROLEPLAY",
        "params": ["partner_einwand"]
      }
    ],
    "detected_intent": "objection_help",
    "suggested_scripts": [
      {
        "id": "script_partner_standard",
        "title": "Partner-Einwand (Standard)",
        "preview": "Absolut! Wichtige Entscheidungen sollte man..."
      }
    ]
  }
}
```

### POST /mentor/objection
Einwand analysieren

**Request:**
```json
{
  "objection_text": "Das ist mir zu teuer",
  "prospect_id": "con_abc123",
  "conversation_context": "Nach Präsentation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "objection_type": "price",
    "is_real_objection": true,
    "confidence": 0.82,
    "analysis": {
      "likely_meaning": "Sieht den Wert noch nicht",
      "buying_signals": ["Hat sich Zeit genommen", "Fragt nach Details"],
      "red_flags": []
    },
    "recommended_responses": [
      {
        "approach": "value_reframe",
        "script": "Ich verstehe, dass der Preis ein Faktor ist...",
        "success_rate": 0.68
      },
      {
        "approach": "comparison",
        "script": "Wenn du das mit [X] vergleichst...",
        "success_rate": 0.54
      }
    ]
  }
}
```

### POST /mentor/roleplay
Rollenspiel starten

**Request:**
```json
{
  "scenario": "closing_call",
  "prospect_persona": {
    "disg": "S",
    "objections": ["unsicher", "partner"],
    "buying_signals": ["interessiert", "fragt nach"]
  }
}
```

### GET /mentor/history
Chat-Verlauf

---

## SCRIPTS

### GET /scripts
Script-Library abrufen

**Query Parameters:**
- `category`: `erstkontakt`, `followup`, `einwand`, `closing`, `onboarding`
- `subcategory`: z.B. `keine_zeit`, `kein_geld`, `partner`, etc.
- `disg`: `D`, `I`, `S`, `G` (optimiert für Typ)
- `language`: `de`, `en`

**Response:**
```json
{
  "success": true,
  "data": {
    "scripts": [
      {
        "id": "script_einwand_partner_standard",
        "category": "einwand",
        "subcategory": "partner",
        "title": "Partner-Einwand (Standard)",
        "content": "Absolut! Wichtige Entscheidungen sollte man zusammen treffen. 👍\n\nWas genau möchtest du mit [Partner] besprechen?...",
        "disg_optimized": null,
        "tags": ["classic", "proven"],
        "usage_count": 1245,
        "success_rate": 0.72
      }
    ]
  }
}
```

### GET /scripts/:id
Einzelnes Script

### POST /scripts/:id/use
Script-Nutzung tracken

**Request:**
```json
{
  "prospect_id": "con_abc123",
  "outcome": "positive",
  "notes": "Hat gut reagiert"
}
```

### POST /scripts/generate
KI-generiertes Script

**Request:**
```json
{
  "context": {
    "scenario": "followup",
    "prospect_name": "Maria",
    "disg_type": "I",
    "last_interaction": "Präsentation vor 3 Tagen",
    "prospect_interests": ["Gesundheit", "Familie"],
    "tone": "casual"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generated_script": "Hey Maria! 🎉\n\nIch hoffe, du hattest ein tolles Wochenende mit der Familie!...",
    "personalization_applied": [
      "Name verwendet",
      "DISG I-Optimierung (enthusiastisch, Emojis)",
      "Familien-Interesse eingebaut"
    ],
    "alternative_versions": [
      "...",
      "..."
    ]
  }
}
```

---

## TEAM

### GET /team
Team-Übersicht

**Response:**
```json
{
  "success": true,
  "data": {
    "team_stats": {
      "total_members": 23,
      "active_members": 18,
      "inactive_members": 5,
      "at_risk_members": 3
    },
    "members": [
      {
        "id": "mem_abc123",
        "name": "Maria Schmidt",
        "level": 1,
        "joined_at": "2025-10-15",
        "status": "active",
        "health_score": 85,
        "dmo_completion_rate": 78,
        "last_activity": "2025-12-02",
        "alerts": []
      },
      {
        "id": "mem_xyz789",
        "name": "Thomas Müller",
        "level": 1,
        "joined_at": "2025-11-01",
        "status": "at_risk",
        "health_score": 35,
        "dmo_completion_rate": 23,
        "last_activity": "2025-11-25",
        "alerts": [
          {
            "type": "dropout_risk",
            "severity": "high",
            "message": "Keine Aktivität seit 8 Tagen"
          }
        ]
      }
    ]
  }
}
```

### GET /team/:id
Team-Mitglied Details

### GET /team/:id/activity
Aktivitäten eines Team-Mitglieds

### POST /team/:id/nudge
Erinnerung/Motivation senden

**Request:**
```json
{
  "type": "motivation",
  "template": "check_in",
  "custom_message": "Hey, wie läuft's bei dir?"
}
```

### GET /team/alerts
Alle Team-Alerts

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_001",
        "member_id": "mem_xyz789",
        "member_name": "Thomas Müller",
        "type": "dropout_risk",
        "severity": "high",
        "message": "Keine Aktivität seit 8 Tagen",
        "suggested_action": "Persönlicher Check-in Call",
        "created_at": "2025-12-03T08:00:00Z"
      }
    ]
  }
}
```

### POST /team/alerts/:id/dismiss
Alert als bearbeitet markieren

---

## ACHIEVEMENTS & GAMIFICATION

### GET /achievements
Alle Achievements

**Response:**
```json
{
  "success": true,
  "data": {
    "unlocked": [
      {
        "id": "first_contact",
        "title": "Ice Breaker",
        "description": "Erster Kontakt aufgenommen",
        "emoji": "🎯",
        "points": 50,
        "unlocked_at": "2025-11-15T10:00:00Z"
      },
      {
        "id": "streak_7",
        "title": "Woche der Konstanz",
        "description": "7-Tage DMO Streak",
        "emoji": "🔥",
        "points": 100,
        "unlocked_at": "2025-11-22T23:59:00Z"
      }
    ],
    "locked": [
      {
        "id": "first_recruit",
        "title": "Team Builder",
        "description": "Erstes Team-Mitglied rekrutiert",
        "emoji": "👥",
        "points": 200,
        "progress": 0,
        "requirement": "Rekrutiere dein erstes Team-Mitglied"
      }
    ],
    "total_points": 2450,
    "rank": "Rising Star",
    "next_rank": {
      "name": "Pro Networker",
      "points_needed": 5000,
      "progress": 49
    }
  }
}
```

### GET /leaderboard
Rangliste

**Query Parameters:**
- `scope`: `global`, `team`, `friends`
- `period`: `today`, `week`, `month`, `all_time`

---

## FOLLOW-UPS

### GET /followups
Ausstehende Follow-Ups

**Query Parameters:**
- `status`: `pending`, `completed`, `overdue`
- `date_range`: `today`, `week`, `custom`

**Response:**
```json
{
  "success": true,
  "data": {
    "followups": [
      {
        "id": "fu_abc123",
        "contact": {
          "id": "con_abc123",
          "name": "Maria Schmidt",
          "disg_type": "I"
        },
        "due_date": "2025-12-03T10:00:00Z",
        "type": "check_in",
        "reason": "Nach Präsentation - 3 Tage",
        "suggested_script_id": "script_followup_day3",
        "priority": "high",
        "status": "pending"
      }
    ],
    "summary": {
      "today": 5,
      "overdue": 2,
      "this_week": 12
    }
  }
}
```

### POST /followups
Follow-Up erstellen

### PUT /followups/:id/complete
Als erledigt markieren

### PUT /followups/:id/snooze
Verschieben

---

## ANALYTICS

### GET /analytics/overview
Dashboard-Übersicht

**Query Parameters:**
- `period`: `week`, `month`, `quarter`, `year`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "kpis": {
      "total_contacts": 156,
      "contacts_change": 23,
      "conversion_rate": 15.4,
      "conversion_change": 2.3,
      "presentations": 18,
      "presentations_change": 5,
      "new_customers": 8,
      "customers_change": 3,
      "team_members": 2,
      "team_change": 1
    },
    "pipeline": {
      "new": 45,
      "contacted": 38,
      "presented": 22,
      "followup": 15,
      "customer": 8
    },
    "activity_chart": [
      { "date": "2025-11-03", "contacts": 5, "followups": 3, "presentations": 1 },
      { "date": "2025-11-04", "contacts": 7, "followups": 4, "presentations": 0 }
    ]
  }
}
```

### GET /analytics/conversion
Conversion-Analyse

### GET /analytics/sources
Lead-Quellen Analyse

---

## SUBSCRIPTION

### GET /subscription
Aktuelles Abo

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active",
    "billing_cycle": "monthly",
    "price": 999,
    "currency": "EUR",
    "current_period_start": "2025-12-01",
    "current_period_end": "2025-12-31",
    "cancel_at_period_end": false,
    "features": {
      "contacts_limit": -1,
      "mentor_messages": -1,
      "team_members": 0,
      "advanced_analytics": true
    }
  }
}
```

### POST /subscription/upgrade
Plan upgraden

### POST /subscription/cancel
Kündigen

### GET /subscription/invoices
Rechnungen

---

## ERROR RESPONSES

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": null
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## WEBHOOKS

### Available Events

```
contact.created
contact.updated
contact.converted
followup.due
followup.overdue
dmo.completed
achievement.unlocked
team.member_at_risk
team.member_inactive
subscription.upgraded
subscription.cancelled
```

### Webhook Payload

```json
{
  "event": "achievement.unlocked",
  "timestamp": "2025-12-03T15:30:00Z",
  "data": {
    "achievement_id": "streak_7",
    "user_id": "usr_abc123"
  }
}
```

---

## RATE LIMITS

| Plan | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 100 | 20/min |
| Pro | 1000 | 100/min |
| Leader | 5000 | 500/min |
| Enterprise | Custom | Custom |

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1701619200
```

---

*API Version: 2.0*
*Last Updated: December 2025*
