# 🧠 Sales Brain System

> Das selbstlernende Gehirn von Sales Flow AI - der "Unfair Advantage"

## Übersicht

Das Sales Brain System macht Sales Flow AI intelligent und personalisiert:

1. **Sales Brain Rules** - Lernregeln aus User-Korrekturen
2. **Teach UI** - Frontend für Feedback-Erfassung
3. **Morning/Evening Push** - Aktive Führung durch Notifications

---

## 📁 Dateien

### Database
```
backend/migrations/20251203_sales_brain.sql
```

### Backend Services
```
backend/app/services/brain/__init__.py
backend/app/services/brain/service.py       # SalesBrainService
backend/app/services/push/__init__.py
backend/app/services/push/service.py        # PushService
```

### API Routes
```
backend/app/api/routes/brain.py             # /api/v1/brain/*
backend/app/api/schemas/brain.py            # Pydantic Schemas
```

### CHIEF Integration
```
backend/app/config/prompts/chief_brain_rules.py
```

### Cronjobs
```
backend/app/jobs/send_push_notifications.py
```

### Frontend
```
components/brain/TeachFeedbackModal.tsx
hooks/useSalesBrain.ts
```

---

## 🗄️ Database Schema

### Tables

| Table | Beschreibung |
|-------|--------------|
| `sales_brain_rules` | Gelernte Regeln aus Korrekturen |
| `rule_applications` | Log wann Regeln angewendet wurden |
| `user_corrections` | Rohdaten für Regel-Extraktion |
| `push_schedules` | User Push-Einstellungen |
| `push_history` | Gesendete Notifications |

### Enums

```sql
rule_type:     tone, structure, vocabulary, timing, channel, objection, persona, product, compliance, custom
rule_scope:    personal, team, global
rule_priority: override, high, normal, suggestion
```

---

## 🔗 API Endpoints

### Rules

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/brain/rules` | Neue Regel erstellen |
| GET | `/brain/rules` | Regeln für Kontext abrufen |
| GET | `/brain/rules/for-chief` | Formatiert für CHIEF Prompt |
| GET | `/brain/rules/{id}` | Einzelne Regel |
| PATCH | `/brain/rules/{id}` | Regel aktualisieren |
| DELETE | `/brain/rules/{id}` | Regel deaktivieren |

### Corrections

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/brain/corrections` | Korrektur loggen |
| GET | `/brain/corrections/pending` | Unverarbeitete Korrekturen |
| POST | `/brain/corrections/{id}/analyze` | Mit Claude analysieren |
| POST | `/brain/corrections/feedback` | Feedback verarbeiten |

### Push Notifications

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/brain/push/schedule` | Push-Schedule abrufen |
| PUT | `/brain/push/schedule` | Schedule aktualisieren |
| POST | `/brain/push/register-token` | Push Token registrieren |
| GET | `/brain/push/morning-briefing` | Morning Briefing |
| GET | `/brain/push/evening-recap` | Evening Recap |

---

## 🎯 Wie es funktioniert

### 1. User ändert CHIEF-Vorschlag

```
CHIEF: "Ich würde gerne mit dir über..."
User:  "Hey! Lass uns über..."
```

### 2. Korrektur wird geloggt

```typescript
const correctionId = await logCorrection({
  original_suggestion: "Ich würde gerne mit dir über...",
  user_final_text: "Hey! Lass uns über...",
  channel: "instagram_dm",
  message_type: "first_contact"
});
```

### 3. TeachFeedbackModal erscheint

```tsx
<TeachFeedbackModal
  visible={showModal}
  correctionId={correctionId}
  originalText={original}
  correctedText={corrected}
  onComplete={(feedback, rule) => {
    // 'personal' | 'team' | 'ignore'
  }}
/>
```

### 4. Claude analysiert die Änderung

```python
# Automatische Analyse
{
  "is_learnable": true,
  "rule_type": "tone",
  "rule_title": "Direkte Ansprache",
  "rule_instruction": "Beginne nie mit 'Ich würde gerne'. Nutze direkte Formulierungen."
}
```

### 5. Regel wird für CHIEF aktiviert

```
[PERSÖNLICHE LERNREGELN - HÖCHSTE PRIORITÄT]

🔴 **Regel 1: Direkte Ansprache**
   → Beginne nie mit 'Ich würde gerne'. Nutze direkte Formulierungen.
   ❌ Nicht: "Ich würde gerne mit dir über..."
   ✅ Besser: "Lass uns über..."
```

---

## ⏰ Push Notifications

### Morning Briefing (06:00 - 10:00)

```json
{
  "greeting": "Guten Morgen, Max! ☀️",
  "date": "Dienstag, 3. Dezember 2025",
  "daily_targets": {
    "new_contacts": 5,
    "followups": 3,
    "reactivations": 2
  },
  "top_leads": [
    {"name": "Anna Müller", "status": "hot", "priority": "high"}
  ],
  "streak_days": 7,
  "motivational_message": "🔥 7 Tage in Folge aktiv! Weiter so!"
}
```

### Evening Recap (17:00 - 21:00)

```json
{
  "greeting": "Super Tag, Max! 🏆",
  "completed": {"new_contacts": 6, "followups": 3},
  "targets": {"new_contacts": 5, "followups": 3},
  "completion_rate": 110.0,
  "wins": ["🎉 1 Deal abgeschlossen!", "✅ Tagesziel übertroffen!"],
  "lessons": ["📚 2 neue Regeln gelernt"]
}
```

---

## 🛠️ Installation

### 1. Migration ausführen

```bash
supabase db push
# oder
psql -f backend/migrations/20251203_sales_brain.sql
```

### 2. Server starten

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 3. Cronjobs einrichten

```bash
# crontab -e

# Morning Briefings (alle Stunden 6-10 Uhr)
0 6-10 * * * cd /path/to/backend && python -m app.jobs.send_push_notifications morning

# Evening Recaps (alle Stunden 17-21 Uhr)
0 17-21 * * * cd /path/to/backend && python -m app.jobs.send_push_notifications evening
```

---

## 🧪 Testing

### API testen

```bash
# Rule erstellen
curl -X POST http://localhost:8000/api/v1/brain/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "rule_type": "tone",
    "title": "Direkte Ansprache",
    "instruction": "Verwende nie Ich würde gerne. Nutze direkte Aussagen."
  }'

# Korrektur loggen
curl -X POST http://localhost:8000/api/v1/brain/corrections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "original_suggestion": "Ich würde gerne mit dir über...",
    "user_final_text": "Lass uns über... sprechen"
  }'

# Morning Briefing abrufen
curl http://localhost:8000/api/v1/brain/push/morning-briefing \
  -H "Authorization: Bearer $TOKEN"
```

### Cronjob testen

```bash
python -m app.jobs.send_push_notifications test <user_id>
```

---

## 📱 React Native Integration

```tsx
import { useSalesBrain } from '@/hooks/useSalesBrain';
import { TeachFeedbackModal } from '@/components/brain';

function ChatScreen() {
  const { logAndAnalyzeCorrection, submitFeedback } = useSalesBrain();
  const [showTeachModal, setShowTeachModal] = useState(false);
  const [correctionData, setCorrectionData] = useState(null);
  
  const handleSendMessage = async (originalSuggestion, userText) => {
    // Prüfe ob User den Text geändert hat
    if (originalSuggestion !== userText) {
      const { correctionId, analysis } = await logAndAnalyzeCorrection({
        original_suggestion: originalSuggestion,
        user_final_text: userText,
        channel: 'instagram_dm'
      });
      
      if (analysis.should_create_rule) {
        setCorrectionData({ correctionId, originalSuggestion, userText });
        setShowTeachModal(true);
      }
    }
    
    // Nachricht senden...
  };
  
  return (
    <>
      {/* Chat UI... */}
      
      <TeachFeedbackModal
        visible={showTeachModal}
        correctionId={correctionData?.correctionId}
        originalText={correctionData?.originalSuggestion}
        correctedText={correctionData?.userText}
        onClose={() => setShowTeachModal(false)}
        onComplete={(feedback, rule) => {
          console.log('Gelernt:', feedback, rule);
        }}
      />
    </>
  );
}
```

---

## 🔒 Security

- **RLS Policies**: User sehen nur eigene + Team-Regeln
- **Scope Enforcement**: Personal Rules nur für User selbst
- **Team Rules**: Nur Admins/Team Leads können Team-Regeln erstellen

---

## 📊 Analytics

### Regel-Effektivität tracken

```sql
-- Top 10 effektivste Regeln
SELECT title, times_applied, times_helpful, effectiveness_score
FROM sales_brain_rules
WHERE is_active = true
ORDER BY effectiveness_score DESC NULLS LAST
LIMIT 10;
```

### Korrektur-Patterns analysieren

```sql
-- Häufigste Korrektur-Typen
SELECT 
  detected_changes->>'change_type' as change_type,
  COUNT(*) as count
FROM user_corrections
WHERE rule_extracted = true
GROUP BY 1
ORDER BY 2 DESC;
```

---

## 🚀 Roadmap

- [ ] Auto-Suggest Regeln bei hoher Similarity-Rate
- [ ] Team Dashboard für Regel-Management
- [ ] A/B Testing von Regeln
- [ ] Regel-Vererbung (Company → Team → User)
- [ ] Regel-Export/Import

---

## 💡 Best Practices

1. **Regel-Titel kurz halten** (max 50 Zeichen)
2. **Instruktionen imperativ formulieren** ("Verwende...", "Beginne nie...")
3. **Beispiele always angeben** (example_bad + example_good)
4. **Kontext spezifisch setzen** (channel, lead_status)
5. **Override sparsam nutzen** (nur für absolute Regeln)

