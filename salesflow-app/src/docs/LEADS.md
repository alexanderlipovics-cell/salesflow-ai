# 👥 Sales Flow AI - Leads

> **Technische Dokumentation** | Version 1.0  
> Lead-Verwaltung mit Auto-Reminder Integration

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Frontend: LeadsScreen](#-frontend-leadsscreen)
3. [Konfiguration](#-konfiguration)
4. [Auto-Reminder Integration](#-auto-reminder-integration)
5. [Datenmodell](#-datenmodell)
6. [API-Endpunkte](#-api-endpunkte)

---

## 🎯 Überblick

Das **Leads** Modul verwaltet alle Kontakte und Interessenten:

- ✅ **CRUD-Operationen**: Leads erstellen, bearbeiten, filtern
- ✅ **Status-Tracking**: Neu, Kontaktiert, Qualifiziert, Angebot, Verloren
- ✅ **Priorisierung**: Hoch, Mittel, Niedrig
- ✅ **Auto-Reminder**: Automatische Follow-ups bei Status-Änderung

---

## 📱 Frontend: LeadsScreen

**Datei:** `src/screens/main/LeadsScreen.js`

### State Management

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `leads` | `Array` | Liste aller Leads |
| `loading` | `Boolean` | Ladezustand |
| `refreshing` | `Boolean` | Pull-to-Refresh |
| `modalVisible` | `Boolean` | Neuer Lead Modal |
| `selectedLead` | `Object` | Lead-Detail Modal |
| `filterStatus` | `String` | Status-Filter |
| `newLead` | `Object` | Formular-Daten |

### Hauptfunktionen

```javascript
// Leads laden
const fetchLeads = useCallback(async () => {
  const response = await fetch(`${API_URL}/api/leads?user_id=${user?.id}`);
  const data = await response.json();
  setLeads(data.leads || data || []);
}, [user]);

// Lead erstellen
const createLead = async () => {
  await fetch(`${API_URL}/api/leads`, {
    method: 'POST',
    body: JSON.stringify({ ...newLead, user_id: user?.id })
  });
};

// Status ändern (mit Auto-Reminder!)
const updateLeadStatus = async (leadId, newStatus) => {
  await fetch(`${API_URL}/api/leads/${leadId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
  
  // Auto-Reminder bei proposal_sent
  if (hasAutoReminder(newStatus)) {
    const result = await createAutoReminder({
      leadId, leadName, userId, newStatus
    });
    if (result?.success) {
      Alert.alert('✅ Auto-Reminder erstellt');
    }
  }
};
```

---

## ⚙️ Konfiguration

### Status-Konfiguration

```javascript
const STATUS_CONFIG = {
  new: { label: 'Neu', color: '#3b82f6', bgColor: '#dbeafe' },
  contacted: { label: 'Kontaktiert', color: '#f59e0b', bgColor: '#fef3c7' },
  qualified: { label: 'Qualifiziert', color: '#10b981', bgColor: '#dcfce7' },
  proposal_sent: { label: 'Angebot gesendet', color: '#8b5cf6', bgColor: '#ede9fe' },
  lost: { label: 'Verloren', color: '#ef4444', bgColor: '#fee2e2' },
};
```

### Prioritäten

```javascript
const PRIORITY_CONFIG = {
  high: { label: '🔥 Hoch', color: '#ef4444' },
  medium: { label: '⚡ Mittel', color: '#f59e0b' },
  low: { label: '📌 Niedrig', color: '#64748b' },
};
```

---

## 🔔 Auto-Reminder Integration

Bei Status-Änderung auf `proposal_sent`:

```javascript
import { createAutoReminder, hasAutoReminder } from '../../services/autoReminderService';

// In updateLeadStatus:
if (hasAutoReminder(newStatus) && lead) {
  const result = await createAutoReminder({
    leadId: lead.id,
    leadName: lead.name,
    userId: user?.id,
    newStatus
  });

  if (result?.success) {
    Alert.alert(
      '✅ Auto-Reminder erstellt',
      `Follow-up für "${lead.name}" in 3 Tagen geplant.`
    );
  }
}
```

---

## 📊 Datenmodell

```typescript
interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'lost';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  last_contact?: string;
  user_id: string;
}
```

---

## 🌐 API-Endpunkte

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/leads?user_id=...` | Alle Leads laden |
| POST | `/api/leads` | Lead erstellen |
| PUT | `/api/leads/:id` | Lead aktualisieren |
| DELETE | `/api/leads/:id` | Lead löschen |

---

## 🎨 UI-Komponenten

- **Header**: Grün (#10b981) mit Lead-Anzahl
- **Status-Filter**: Horizontale Chip-Leiste
- **LeadCard**: Name, Firma, Status-Badge, Priorität, Notizen
- **FAB**: Grüner Button zum Erstellen
- **Detail-Modal**: Alle Lead-Infos + Status-Änderung
- **Formular-Modal**: Neuen Lead anlegen

---

## 🔧 Extending this Module

### 1. State Machine

```
new → contacted → active → won
                    ↓        ↓
                  lost    dormant
                    ↓
                on_hold → active
```

**Erlaubte Status-Transitionen:**

```typescript
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'new': ['contacted'],
  'contacted': ['active', 'lost'],
  'active': ['won', 'lost', 'on_hold'],
  'on_hold': ['active', 'lost'],
  'won': ['dormant'],
  'lost': ['new'],      // Reaktivierung möglich
  'dormant': ['new']    // Reaktivierung möglich
};

// Validierung
function canTransition(currentStatus: LeadStatus, newStatus: LeadStatus): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
```

---

### 2. Events / Webhooks

| Event | Trigger | Payload |
|-------|---------|---------|
| `on_lead_created` | Neuer Lead | `{ lead_id, source, created_by, timestamp }` |
| `on_status_changed` | Status-Wechsel | `{ lead_id, from_status, to_status, changed_by }` |
| `on_next_action_due` | Action fällig | `{ lead_id, action_type, due_at }` |
| `on_lead_assigned` | Neu zugewiesen | `{ lead_id, from_user, to_user }` |
| `on_lead_converted` | Lead → Won | `{ lead_id, conversion_value, user_id }` |

**Implementation:**
```typescript
// Event-Typ Definition
type LeadEvent = {
  type: 'lead_created' | 'status_changed' | 'next_action_due';
  lead_id: string;
  payload: Record<string, unknown>;
  timestamp: Date;
};

// Event emittieren
async function emitLeadEvent(event: LeadEvent) {
  // 1. In Events-Tabelle speichern
  await supabase.from('lead_events').insert(event);
  
  // 2. Webhook triggern (falls konfiguriert)
  const webhooks = await getActiveWebhooks(event.type);
  for (const webhook of webhooks) {
    await fetch(webhook.url, {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
}
```

---

### 3. Custom Fields (JSONB)

```typescript
interface LeadCustomFields {
  // Produkt-bezogen
  product_package?: string;
  contract_duration_months?: number;
  
  // Kontakt-Präferenzen
  preferred_contact_time?: 'morning' | 'afternoon' | 'evening';
  preferred_channel?: 'phone' | 'email' | 'whatsapp';
  
  // Akquise
  referral_source?: string;
  campaign_id?: string;
  
  // DISG Profil
  disc_profile?: 'D' | 'I' | 'S' | 'C';
  
  // Erweiterbar
  [key: string]: unknown;
}

// Verwendung
const lead = {
  name: 'Max Mustermann',
  status: 'new',
  custom_fields: {
    preferred_contact_time: 'morning',
    disc_profile: 'D',
    product_package: 'premium'
  }
};
```

**Migration für Custom Fields:**
```sql
-- Custom Fields Spalte hinzufügen
ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
  custom_fields JSONB DEFAULT '{}'::jsonb;

-- Index für häufig gefilterte Felder
CREATE INDEX idx_leads_custom_fields_disc 
  ON leads ((custom_fields->>'disc_profile'));
```

---

### 4. Neue Lead-Quelle hinzufügen

**Schritt 1: Type erweitern**
```typescript
// types/lead.ts
type LeadSource = 
  | 'manual'      // Manuell eingegeben
  | 'import'      // CSV/Excel Import
  | 'screenshot'  // OCR Screenshot
  | 'webhook'     // API Webhook
  | 'webform'     // Website Formular
  | 'linkedin'    // NEU: LinkedIn Import
  | 'referral';   // NEU: Empfehlung

// Status-Konfiguration erweitern
const SOURCE_CONFIG = {
  linkedin: { 
    label: 'LinkedIn', 
    icon: '💼',
    color: '#0A66C2' 
  },
  referral: { 
    label: 'Empfehlung', 
    icon: '👥',
    color: '#10b981' 
  }
};
```

**Schritt 2: UI Dropdown erweitern**
```javascript
// In LeadForm.tsx oder LeadsScreen.js
const SOURCE_OPTIONS = [
  { value: 'manual', label: '✍️ Manuell' },
  { value: 'import', label: '📄 Import' },
  { value: 'linkedin', label: '💼 LinkedIn' },  // NEU
  { value: 'referral', label: '👥 Empfehlung' }  // NEU
];

<Picker value={source} onValueChange={setSource}>
  {SOURCE_OPTIONS.map(opt => (
    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
  ))}
</Picker>
```

**Schritt 3: Analytics Query anpassen**
```sql
-- Leads nach Quelle
SELECT 
  source, 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'won') as converted,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'won')::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as conversion_rate
FROM leads
WHERE workspace_id = $1
GROUP BY source
ORDER BY total DESC;
```

---

### 5. Checkliste vor Merge

- [ ] **Types/Interfaces aktualisiert**
  - Lead Type erweitert
  - Status/Source Enums aktualisiert

- [ ] **Supabase Migration erstellt**
  - Neue Spalten hinzugefügt
  - Indexes erstellt
  - Bestehende Daten migriert

- [ ] **RLS Policies geprüft**
  - Neue Felder durch Policy abgedeckt
  - Team-Zugriff berücksichtigt

- [ ] **UI Formulare aktualisiert**
  - LeadsScreen.js
  - LeadForm Modal
  - Filter-Dropdowns

- [ ] **Follow-up Logik geprüft**
  - Auto-Reminder für neue Status?
  - Trigger-Bedingungen aktualisiert

- [ ] **Test-Lead durch Flow geschickt**
  - Neuen Lead erstellen
  - Alle Status durchlaufen
  - Follow-ups generiert?

---

> **Erstellt für Sales Flow AI** | Leads Modul mit Auto-Reminder

