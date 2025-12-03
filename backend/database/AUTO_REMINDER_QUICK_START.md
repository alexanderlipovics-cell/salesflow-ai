# 🚀 AUTO-REMINDER SYSTEM - QUICK START

**Setup Zeit:** 2 Minuten  
**Status:** ✅ Ready to Deploy

---

## ⚡ SCHNELLSTART

### 1️⃣ SQL Schema deployen (30 Sekunden)

```bash
# Option A: Supabase Dashboard
# 1. Gehe zu: https://supabase.com/dashboard → SQL Editor
# 2. Kopiere Inhalt von: backend/database/008_auto_reminder_trigger.sql
# 3. Paste & Run

# Option B: CLI
supabase db execute < backend/database/008_auto_reminder_trigger.sql
```

### 2️⃣ Verify Installation (15 Sekunden)

```sql
-- Prüfe ob Tabellen existieren
SELECT COUNT(*) FROM reminder_rules;
-- Sollte 4 (default rules) zurückgeben

SELECT COUNT(*) FROM auto_reminders;
-- Sollte 0 zurückgeben (noch keine Reminders)
```

### 3️⃣ Test (30 Sekunden)

```bash
# Backend starten (falls nicht läuft)
uvicorn app.main:app --reload

# Test-Request
curl http://localhost:8000/api/auto-reminders/rules
# Sollte 4 Rules zurückgeben
```

### 4️⃣ Fertig! 🎉

Auto-Reminders laufen jetzt automatisch!

---

## 🎯 WAS PASSIERT JETZT?

### Automatisch

Bei jedem Lead-Update prüft das System:

```
Lead updated → Trigger fires → Check conditions → Create reminder (if needed)
```

### Bedingungen (Standard)

1. **Proposal No Reply (3 days)** → Reminder nach 3 Tagen
2. **VIP Going Cold (7 days)** → Reminder nach 7 Tagen
3. **Hot/Warm Going Cold (10 days)** → Reminder nach 10 Tagen
4. **Follow-up Overdue** → Sofort

---

## 📊 TESTEN

### Test 1: Manueller Trigger

```bash
# Lead-ID einfügen und ausführen
curl -X POST http://localhost:8000/api/auto-reminders/check/{LEAD_ID} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Output:
{
  "reminder_created": true/false,
  "message": "..."
}
```

### Test 2: Pending Reminders anzeigen

```bash
curl http://localhost:8000/api/auto-reminders/pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Output: Array of reminders
```

### Test 3: Statistics

```bash
curl http://localhost:8000/api/auto-reminders/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Output:
{
  "total_active": 0,
  "total_overdue": 0,
  "by_priority": {},
  "by_condition": {}
}
```

---

## 🔧 ERSTE SCHRITTE

### Reminder Rules anpassen

```sql
-- Standard-Rule anpassen
UPDATE reminder_rules
SET days_after = 5  -- Statt 3 Tagen
WHERE trigger_condition = 'proposal_no_reply';

-- Neue Rule hinzufügen
INSERT INTO reminder_rules (
  name,
  trigger_condition,
  days_after,
  priority,
  task_title_template
) VALUES (
  'Custom 14-Day Check',
  'custom_14day',
  14,
  'medium',
  '⏰ Check-in: {lead_name}'
);
```

### Via API (als Admin)

```bash
curl -X POST http://localhost:8000/api/auto-reminders/rules \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Rule",
    "trigger_condition": "my_condition",
    "days_after": 7,
    "priority": "high",
    "task_title_template": "⚡ {lead_name} needs attention",
    "is_active": true
  }'
```

---

## 📱 FRONTEND INTEGRATION

### React Hook

```typescript
// hooks/useAutoReminders.ts
import { useState, useEffect } from 'react';

export function useAutoReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auto-reminders/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setReminders(data);
      setLoading(false);
    });
  }, []);

  return { reminders, loading };
}
```

### Component

```tsx
// components/RemindersWidget.tsx
import { useAutoReminders } from '@/hooks/useAutoReminders';

export const RemindersWidget = () => {
  const { reminders, loading } = useAutoReminders();
  
  if (loading) return <Spinner />;
  
  return (
    <div className="reminders-widget">
      <h3>🔔 Pending Reminders ({reminders.length})</h3>
      {reminders.map(reminder => (
        <div key={reminder.reminder_id}>
          <strong>{reminder.task_title}</strong>
          <span>{reminder.lead_name}</span>
          <Badge>{reminder.task_priority}</Badge>
        </div>
      ))}
    </div>
  );
};
```

---

## 🐛 TROUBLESHOOTING

### Reminders werden nicht erstellt?

**Check 1: SQL Schema deployed?**
```sql
\dt reminder_rules
-- Sollte Tabelle zeigen
```

**Check 2: Trigger aktiv?**
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%reminder%';
-- Sollte trigger_auto_reminder_on_lead_change zeigen
```

**Check 3: Rules aktiv?**
```sql
SELECT * FROM reminder_rules WHERE is_active = true;
-- Sollte 4 Rules zeigen
```

**Check 4: Lead erfüllt Bedingungen?**
```sql
-- Beispiel: Proposal No Reply
SELECT 
  id,
  name,
  proposal_sent_date,
  last_reply_date,
  EXTRACT(DAY FROM now() - proposal_sent_date) as days_since_proposal
FROM leads
WHERE proposal_sent_date IS NOT NULL
AND last_reply_date IS NULL
AND EXTRACT(DAY FROM now() - proposal_sent_date) >= 3;
-- Sollte Leads zeigen, die Reminder bekommen sollten
```

---

## 💡 TIPPS

### 1. Starte mit Standard-Rules
Die 4 default Rules decken 90% der Use Cases ab.

### 2. Monitore Response Times
```sql
SELECT 
  trigger_condition,
  AVG(EXTRACT(EPOCH FROM completed_at - triggered_at)/3600) as avg_hours
FROM auto_reminders
WHERE completed_at IS NOT NULL
GROUP BY trigger_condition;
```

### 3. Passe Prioritäten an
VIP-Leads sollten `urgent` bekommen, normale Leads `medium`.

### 4. Nutze Template-Variablen
`{lead_name}`, `{company}`, `{days}` machen Tasks persönlicher.

---

## 📈 SUCCESS METRICS

### Woche 1
- ✅ System deployed & läuft
- ✅ Erste Reminders erstellt
- ✅ Team nutzt Tasks

### Woche 2-4
- 📊 Completion Rate > 80%
- ⏱️ Avg Response Time < 24h
- 🚨 Overdue Rate < 10%

### Monat 2+
- 🎯 No Lead Left Behind
- 📈 Conversion Rate steigt
- ⭐ Team-Zufriedenheit hoch

---

## 🔗 WEITERFÜHREND

- 📚 **Full Docs:** `docs/AUTO_REMINDER_SYSTEM.md`
- 🧪 **Tests:** `backend/tests/test_auto_reminders.py`
- 🔌 **API Docs:** `http://localhost:8000/docs` (search "auto-reminders")

---

**Fragen? → Siehe Full Documentation oder Team-Chat!**

✅ **Happy Reminding!** 🔔

