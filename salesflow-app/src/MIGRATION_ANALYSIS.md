# 🔄 Backend-Migration: Altes → Neues Backend

## 📊 Übersicht

**Altes Backend:** `backend/` (Root)  
**Neues Backend:** `src/backend/` (Haupt-Backend)

---

## ✅ Was bereits im neuen Backend existiert

### 1. AI/Chat Endpoints
- ✅ **`/api/v1/ai/chief/chat`** (neues Backend)
  - Ersetzt: `/api/ai/chat` (altes Backend)
  - Status: **BEREITS VORHANDEN** - sogar besser (v3.1)
  
- ✅ **`/api/v2/mentor/chat`** (neues Backend)
  - Ersetzt: `/api/ai/chief/chat` (altes Backend)
  - Status: **BEREITS VORHANDEN** - neuer Endpoint

### 2. Follow-ups
- ✅ **`/api/v1/daily-flow/*`** (neues Backend)
  - Ersetzt: `/api/followups` (altes Backend)
  - Status: **BEREITS VORHANDEN** - erweitert

### 3. Leads/Contacts
- ✅ **`/api/v2/contacts/*`** (neues Backend)
  - Ersetzt: `/api/leads` (altes Backend)
  - Status: **BEREITS VORHANDEN** - neuer Endpoint

### 4. Objection Brain
- ✅ **`/api/v1/brain/*`** (neues Backend)
  - Ersetzt: `/api/objection-brain/generate` (altes Backend)
  - Status: **BEREITS VORHANDEN** - erweitert

### 5. Health Check
- ✅ **`/api/v1/health`** (neues Backend)
  - Ersetzt: `/api/health` (altes Backend)
  - Status: **BEREITS VORHANDEN**

---

## ⚠️ Was MIGRIERT werden muss

### 1. **Chief Context Service** ⭐ WICHTIG
**Datei:** `backend/app/services/chief_context.py`

**Status:** ❌ **FEHLT im neuen Backend**

**Was macht es:**
- Baut kompletten Kontext für CHIEF/MENTOR
- Daily Flow Status
- Remaining Counts
- Lead Suggestions
- Vertical Profile
- Goal Summary

**Aktion:** ✅ **MIGRIEREN** - Wird vom Frontend verwendet!

**Ziel:** `src/backend/app/services/chief_context.py`

---

### 2. **AI Service (vereinfachte Version)**
**Datei:** `backend/app/services/ai_service.py`

**Status:** ⚠️ **TEILWEISE vorhanden**

**Unterschiede:**
- Altes Backend: Einfache `handle_objection()` Methode
- Neues Backend: Komplexere Brain-Services

**Aktion:** ⚠️ **PRÜFEN** - Die `handle_objection()` Logik könnte nützlich sein

---

### 3. **Cache Service**
**Datei:** `backend/app/services/cache_service.py`

**Status:** ⚠️ **PRÜFEN** - Möglicherweise bereits vorhanden

**Aktion:** Prüfen ob im neuen Backend vorhanden, sonst migrieren

---

### 4. **Config (Settings)**
**Datei:** `backend/app/config.py`

**Status:** ⚠️ **PRÜFEN** - Neue Backend hat `app/core/config.py`

**Unterschiede:**
- Altes Backend: Einfache Settings
- Neues Backend: Erweiterte Settings mit Pydantic v2

**Aktion:** ⚠️ **PRÜFEN** - Settings sollten bereits besser sein

---

## 🎯 Einzigartige Features im alten Backend

### 1. **Quick Actions Endpoint**
```python
POST /api/ai/quick-action
```
- Action Types: `objection_help`, `opener_suggest`, `closing_tip`, `followup_suggest`
- Status: ❌ **FEHLT im neuen Backend**

**Aktion:** ✅ **MIGRIEREN** - Nützliches Feature!

---

### 2. **Feedback Endpoint**
```python
POST /api/ai/feedback
```
- Speichert Feedback zu KI-Antworten
- Status: ❌ **FEHLT im neuen Backend**

**Aktion:** ⚠️ **OPTIONAL** - Kann später hinzugefügt werden

---

### 3. **Chief Context Endpoint**
```python
POST /api/ai/chief/context
```
- Holt kompletten CHIEF Context
- Status: ❌ **FEHLT im neuen Backend**

**Aktion:** ✅ **MIGRIEREN** - Wird vom Frontend verwendet!

---

## 📋 Migrations-Plan

### Phase 1: Kritische Services migrieren
1. ✅ **Chief Context Service** → `src/backend/app/services/chief_context.py`
2. ✅ **Chief Context Endpoint** → `src/backend/app/api/routes/mentor.py` (oder neue Route)

### Phase 2: Nützliche Features migrieren
3. ✅ **Quick Actions** → `src/backend/app/api/routes/mentor.py`
4. ⚠️ **Feedback Endpoint** → Optional

### Phase 3: Cleanup
5. ✅ Altes Backend löschen (nach Migration)
6. ✅ Frontend-URLs aktualisieren (falls nötig)

---

## 🔍 Frontend-Check

Prüfe ob Frontend noch alte Endpoints verwendet:
- `/api/ai/chat` → `/api/v2/mentor/chat`
- `/api/ai/chief/chat` → `/api/v2/mentor/chat`
- `/api/ai/chief/context` → **NEU MIGRIEREN**
- `/api/followups` → `/api/v1/daily-flow/*`
- `/api/leads` → `/api/v2/contacts/*`
- `/api/objection-brain/generate` → `/api/v1/brain/*`

---

## ✅ Zusammenfassung

**Kann gelöscht werden:**
- ❌ Altes Backend (`backend/`) - **NACH Migration**

**Muss migriert werden:**
- ✅ `chief_context.py` Service
- ✅ `/api/ai/chief/context` Endpoint
- ✅ `/api/ai/quick-action` Endpoint

**Optional:**
- ⚠️ Feedback Endpoint
- ⚠️ Vereinfachte AI Service Methoden

**Bereits vorhanden:**
- ✅ Alle anderen Endpoints existieren bereits (besser) im neuen Backend

