# 🧠 AI Memory System - Setup Guide

## Übersicht

Das AI Memory System erweitert Sales Flow AI um:
- **RAG (Retrieval Augmented Generation)**: Semantische Suche in vergangenen Gesprächen
- **Vector Embeddings**: 1536-dimensionale Embeddings mit OpenAI text-embedding-3-small
- **Pattern Learning**: Lernt aus positivem/negativem Feedback
- **Audit Logging**: DSGVO-konforme Protokollierung aller AI-Interaktionen

## 🚀 Quick Setup

### 1. Supabase pgvector aktivieren

Führe im Supabase SQL Editor aus:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Migration ausführen

Führe die komplette Migration aus:
```bash
# Option A: Über Supabase CLI
supabase db push

# Option B: Manuell im SQL Editor
# Kopiere den Inhalt von migrations/002_ai_memory_system.sql
```

### 3. Environment konfigurieren

Stelle sicher, dass in `.env`:
```
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 4. Dependencies installieren

```bash
cd backend
pip install -r requirements.txt
```

### 5. Backend starten

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📡 API Endpoints

### Chat mit CHIEF
```bash
POST /api/ai/chat
{
  "message": "Wie behandle ich den Einwand 'zu teuer'?",
  "conversation_history": [],
  "user_id": "user-uuid",
  "lead_id": "optional-lead-uuid"
}
```

### Feedback geben
```bash
POST /api/ai/feedback
{
  "message": "ursprüngliche Frage",
  "response": "AI Antwort",
  "feedback": "positive",  // oder "negative"
  "pattern_type": "objection"
}
```

### Follow-up generieren
```bash
POST /api/ai/generate-followup
{
  "lead_id": "lead-uuid",
  "trigger_type": "inactivity",
  "channel": "email"
}
```

### Quick Actions
```bash
POST /api/ai/quick-action
{
  "action_type": "objection_help",
  "context": "Kunde sagt es ist zu teuer"
}
```

### Insights abrufen
```bash
GET /api/ai/insights?limit=10
```

### Gelernte Patterns abrufen
```bash
GET /api/ai/patterns?pattern_type=objection&min_success_rate=0.7
```

## 🗄️ Datenbank-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `ai_memories` | Konversationen mit Vector Embeddings |
| `learned_patterns` | Gelernte Muster aus Feedback |
| `ai_strategic_insights` | Aggregierte Erkenntnisse |
| `gpt_prompt_logs` | Audit-Log aller AI-Calls |
| `followup_templates` | Follow-up Vorlagen |

## 🔧 RPC Functions

### match_memories
Sucht semantisch ähnliche Memories:
```sql
SELECT * FROM match_memories(
  query_embedding := '[...]'::vector,
  match_user_id := 'user-uuid',
  match_count := 5,
  similarity_threshold := 0.5
);
```

### match_patterns
Sucht ähnliche gelernte Patterns:
```sql
SELECT * FROM match_patterns(
  query_embedding := '[...]'::vector,
  filter_type := 'objection',
  match_count := 3,
  similarity_threshold := 0.6
);
```

## 🔒 Sicherheit

- Row Level Security (RLS) auf allen Tabellen
- Nutzer sehen nur eigene Memories
- Patterns sind geteilt, aber Source wird getrackt
- Prompt Logs nur für eigenen User sichtbar

## 📊 Monitoring

Health Check:
```bash
GET /api/ai/health
```

Response:
```json
{
  "status": "healthy",
  "service": "CHIEF AI Coach",
  "model": "gpt-4-turbo-preview",
  "embedding_model": "text-embedding-3-small"
}
```

## 🎯 Best Practices

1. **Feedback nutzen**: Thumbs up/down hilft dem System zu lernen
2. **Kontext geben**: Lead-ID mitgeben für personalisierte Antworten
3. **Patterns prüfen**: Regelmäßig gelernte Patterns reviewen
4. **Logs auswerten**: GPT Prompt Logs für Optimierung nutzen

## 🐛 Troubleshooting

### "pgvector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### "Embedding failed"
- OpenAI API Key prüfen
- Rate Limits beachten

### "Memory search returns empty"
- Mindestens eine Konversation führen
- Similarity threshold ggf. senken (0.3-0.5)

