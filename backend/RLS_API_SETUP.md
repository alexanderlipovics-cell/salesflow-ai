# 🔒 RLS & API Setup - Complete Guide

## Overview

This guide covers the complete Row Level Security (RLS) setup and API endpoints for Sales Flow AI's multi-tenant architecture.

---

## 📋 Part 1: RLS Policies Setup

### Step 1: Deploy RLS Policies

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/sql
2. Run: `backend/db/rls_policies_complete.sql`

This creates:
- ✅ User-Company mapping tables (`user_profiles`, `user_company_members`)
- ✅ RLS policies for all tables
- ✅ Multi-tenancy isolation
- ✅ Role-based access control (member/leader/admin)

### What Gets Protected

| Table | Read Access | Write Access |
|-------|------------|--------------|
| `user_profiles` | Own profile only | Own profile only |
| `mlm_companies` | All authenticated users | Service-Role only |
| `templates` | Company members | Company leaders/admins |
| `leads` | Own leads only | Own leads only |
| `speed_hunter_sessions` | Own sessions | Own sessions |
| `objection_logs` | Own logs | Own logs |
| `compliance_violations` | Own violations + company admins | Own violations |

---

## 🚀 Part 2: API Endpoints

### 2.1 Speed Hunter APIs

**Start Session**
```
POST /api/speed-hunter/session
```
Request:
```json
{
  "company_id": "uuid",
  "daily_goal": 20,
  "mode": "points"
}
```

**Get Next Lead**
```
GET /api/speed-hunter/session/{session_id}/next-lead
```

**Log Action**
```
POST /api/speed-hunter/action
```
Request:
```json
{
  "session_id": "uuid",
  "lead_id": "uuid",
  "action_type": "message",
  "outcome": "follow_up_scheduled",
  "points": 4,
  "template_id": "uuid",
  "channel": "whatsapp"
}
```

---

### 2.2 CHIEF Gateway - Message Recommendation

**Core Endpoint**
```
POST /api/messages/recommend
```

This is the **central intelligence hub** that combines:
- DISC Analysis (Neuro-Profiler)
- Template Selection (Data Core)
- Objection Handling (Einwand-Killer)
- Compliance Check (Liability-Shield)

Request:
```json
{
  "lead_id": "uuid",
  "company_id": "uuid",
  "funnel_stage": "early_follow_up",
  "channel": "whatsapp",
  "language_code": "de-DE",
  "use_case": "intro",
  "objection_key": "too_expensive",
  "preferred_style": "logical",
  "disc_override": "D"
}
```

Response:
```json
{
  "template": {
    "template_id": "uuid",
    "translation_id": "uuid",
    "body": "Hey Lisa, kurze Rückmeldung...",
    "meta": {
      "funnel_stage": "early_follow_up",
      "channel": "whatsapp",
      "disc_target": "I",
      "source": "data_driven"
    }
  },
  "compliance": {
    "status": "ok",
    "violations": []
  },
  "alternatives": [...]
}
```

---

### 2.3 Compliance Check (Liability-Shield)

```
POST /api/compliance/check
```

Request:
```json
{
  "text": "Mit unserem Produkt wirst du garantiert abnehmen!",
  "company_id": "uuid",
  "locale": "de-DE",
  "channel": "whatsapp"
}
```

Response:
```json
{
  "status": "block",
  "violations": [
    {
      "category": "health_claim",
      "severity": "block",
      "message": "Gesundheitsbezogene Wirkung wird als garantiert dargestellt.",
      "suggested_text": "Viele Nutzer berichten von positiven Erfahrungen..."
    }
  ],
  "safe_text": "Viele Nutzer berichten von positiven Erfahrungen..."
}
```

---

### 2.4 Objection Logging

```
POST /api/objections/log
```

Request:
```json
{
  "lead_id": "uuid",
  "company_id": "uuid",
  "objection_key": "too_expensive",
  "funnel_stage": "closing",
  "disc_type": "G",
  "template_id": "uuid",
  "response_style": "logical",
  "outcome": "won",
  "notes": "Er hat verstanden, dass ROI passt."
}
```

---

### 2.5 Neuro-Profiler (DISC Analysis)

```
POST /api/neuro/profile
```

Request:
```json
{
  "lead_id": "uuid",
  "sample_text": "Ich brauche erst einmal mehr Informationen..."
}
```

Response:
```json
{
  "disc_primary": "G",
  "disc_secondary": "S",
  "confidence": 0.86,
  "rationale": "Lead stellt viele Detailfragen, wirkt vorsichtig..."
}
```

---

## 🔄 Complete End-to-End Flow

### Full Speed-Hunting Workflow

1. **Start Session**
   ```
   POST /api/speed-hunter/session
   ```
   → Returns session_id + first prioritized lead

2. **Get Recommendation** (CHIEF Gateway)
   ```
   POST /api/messages/recommend
   {
     "lead_id": "...",
     "company_id": "...",
     "funnel_stage": "early_follow_up",
     "use_case": "intro"
   }
   ```
   → Returns safe, personalized template + compliance check

3. **User edits & sends** (WhatsApp/IG)

4. **Log Action**
   ```
   POST /api/speed-hunter/action
   ```
   → Updates analytics, template performance, squad scores

5. **If Objection Encountered**
   ```
   POST /api/objections/log
   ```
   → Tracks objection handling success for analytics

---

## 📊 Database Tables Required

Make sure these tables exist before deploying RLS:

- ✅ `user_profiles`
- ✅ `user_company_members`
- ✅ `mlm_companies`
- ✅ `templates` + `template_translations` + `template_performance`
- ✅ `leads` + `disc_analyses`
- ✅ `speed_hunter_sessions` + `speed_hunter_actions`
- ✅ `objection_templates` + `objection_logs`
- ✅ `compliance_rules` + `compliance_violations`

---

## 🔐 Security Notes

### Service-Role vs Anon Key

- **Anon Key**: Used by frontend, respects RLS policies
- **Service-Role Key**: Used by backend, bypasses RLS (admin access)

### Best Practices

1. **Never expose Service-Role key** to frontend
2. **Always validate** company membership in backend
3. **Log all compliance violations** for audit
4. **Use RLS as defense-in-depth** - don't rely solely on backend validation

---

## 🧪 Testing

After deploying RLS policies:

1. **Test as User A**:
   - Should see only own leads
   - Should see only company templates
   - Should NOT see other users' data

2. **Test as Admin**:
   - Should see all company data
   - Should be able to modify templates

3. **Test Compliance**:
   - Send block-worthy text → Should get `status: "block"`
   - Send safe text → Should get `status: "ok"`

---

## 📝 Next Steps

1. ✅ Deploy RLS policies (`rls_policies_complete.sql`)
2. ✅ Backend automatically has new endpoints
3. ⏳ Implement business logic in routers (currently mock data)
4. ⏳ Create missing database tables if needed
5. ⏳ Test with real frontend requests

---

## 🐛 Troubleshooting

### "Row Level Security policy violation"

**Cause**: User trying to access data they don't have permission for.

**Solution**: Check:
- User is authenticated (`auth.uid()` exists)
- User is member of the company
- RLS policies are correctly deployed

### "Table does not exist"

**Cause**: Tables not created yet.

**Solution**: Run base schema SQL files before RLS policies.

---

**Version**: 1.0  
**Last Updated**: November 2025

