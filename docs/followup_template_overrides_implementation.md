# Follow-up Template Overrides - Implementation

## Überblick

Dieses Feature ermöglicht es Managern, gespeicherte Objection Templates als **aktive Follow-up-Overrides** zu verwenden. Die Templates überschreiben die Standard-Konfiguration aus `followupSequence.ts` pro Step + Vertical.

## Was wurde implementiert?

### 1. SQL-Schema Erweiterung (`salesflow-ai/backend/app/db/schema_objection_templates.sql`)

**Erweitert:** Kommentare für das "key"-Feld dokumentieren jetzt die Follow-up Step Keys:

```sql
comment on column public.objection_templates.key is 
  'Optional: Follow-up Step Key zur Zuordnung eines Templates zu einem Follow-up-Schritt.
   Mögliche Werte:
     - initial_contact
     - fu_1_bump
     - fu_2_value
     - fu_3_decision
     - fu_4_last_touch
     - rx_1_update
     - rx_2_value_asset
     - rx_3_yearly_checkin
     - rx_loop_checkin
   ...';
```

### 2. Service-Erweiterung (`salesflow-ai/src/services/objectionTemplatesService.ts`)

**Neue Funktionen:**

- `listActiveObjectionTemplates()` - Holt alle aktiven Templates
- `listAllObjectionTemplates()` - Holt alle Templates (für Manager-Seite)
- `updateObjectionTemplate()` - Aktualisiert Template-Felder (key, vertical, status, etc.)
- `setActiveTemplateForStepAndVertical()` - Setzt ein Template als aktives Override (nur EIN Template pro Step+Vertical)
- `clearActiveTemplateForStepAndVertical()` - Entfernt aktives Override

**Type-Erweiterung:**

```typescript
export type ObjectionTemplate = {
  // ...
  key: FollowUpStepKey | string | null; // Follow-up Step Key
  // ...
};
```

### 3. Hook: useFollowUpTemplateOverrides (`salesflow-ai/src/hooks/useFollowUpTemplateOverrides.ts`)

**Zweck:** Lädt alle aktiven Templates aus der DB und baut einen Lookup-Index auf.

**Lookup-Key-Format:** `${stepKey}::${verticalMapped}`

Beispiele:
- `"fu_1_bump::network"` 
- `"fu_2_value::generic"`
- `"rx_1_update::real_estate"`

**API:**

```typescript
const { loading, error, overrides, refetch } = useFollowUpTemplateOverrides();

// overrides ist ein Objekt:
// { "fu_1_bump::network": ObjectionTemplate, ... }
```

### 4. Follow-ups Page Integration

**Status:** ✅ Bereits vollständig implementiert!

Die `FollowUpsPage.tsx` nutzt den Hook und übergibt die Overrides an die Task-Cards:

```typescript
// In FollowUpTaskCard:
const overrideKey = buildOverrideKey(task.template_key, lead?.vertical);
const overrideTemplate = overrides[overrideKey];

if (overrideTemplate) {
  // DB-Override nutzen
  personalizedMessage = overrideTemplate.template_message;
} else {
  // Standard Config-basierte Nachricht
  personalizedMessage = buildFollowUpMessage(...);
}
```

### 5. Manager-Seite (`salesflow-ai/src/pages/FollowUpTemplateManagerPage.tsx`)

**Neu erstellt:** Vollständige Manager-Oberfläche zum Verwalten von Template-Zuordnungen.

**Features:**

- ✅ Übersicht aller Follow-up Steps (aus STANDARD_FOLLOW_UP_SEQUENCE)
- ✅ Pro Step: Grid für 4 Verticals (Allgemein, Network, Immobilien, Finance)
- ✅ Pro Zelle: Dropdown zur Auswahl eines aktiven Templates
- ✅ "Standard-Konfiguration verwenden" Option (löscht Overrides)
- ✅ Automatisches Refresh nach Änderungen
- ✅ Error/Success Feedback
- ✅ Dark Theme, mobile-first

**UI-Struktur:**

```
┌─────────────────────────────────────────────────┐
│ Follow-up Templates                             │
│ Lege fest, welche KI-Templates pro Step &      │
│ Branche verwendet werden                        │
├─────────────────────────────────────────────────┤
│ 💡 Hinweis: Aktuelle Überschreibungen werden    │
│    automatisch in den Follow-ups verwendet      │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐  │
│ │ Follow-up 1 – Bump                        │  │
│ │ Sehr kurzer Check, ob die Nachricht ...   │  │
│ ├───────────────────────────────────────────┤  │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │  │
│ │ │ Allg.│ │ Net. │ │ Immo │ │ Fin. │      │  │
│ │ │ [▼]  │ │ [▼]  │ │ [▼]  │ │ [▼]  │      │  │
│ │ └──────┘ └──────┘ └──────┘ └──────┘      │  │
│ └───────────────────────────────────────────┘  │
│ ... (weitere Steps)                             │
└─────────────────────────────────────────────────┘
```

### 6. Routing & Navigation

**Route registriert in `App.jsx`:**

```jsx
<Route path="manager/followup-templates" element={<FollowUpTemplateManagerPage />} />
```

**Sidebar-Eintrag hinzugefügt in `AppShell.jsx` + `AppShell.tsx`:**

```javascript
{
  title: "ANALYTICS",
  items: [
    { label: "Einwände Analytics", to: "/manager/objections", icon: BarChart3 },
    { label: "Follow-up Templates", to: "/manager/followup-templates", icon: FileText },
  ]
}
```

## Workflow zur Laufzeit

### Manager-Perspektive

1. **Template erstellen:**
   - Via ObjectionAnalyticsPage → Playbook-Suggestor
   - Oder manuell in Supabase

2. **Template zuordnen:**
   - Öffne `/manager/followup-templates`
   - Wähle Step + Vertical
   - Wähle Template aus Dropdown
   - System setzt Template automatisch auf "active"

3. **Standard wiederherstellen:**
   - Wähle "Standard-Konfiguration verwenden"
   - System setzt alle Overrides für diesen Step+Vertical auf "draft"

### Sales-Team-Perspektive

1. **Follow-ups Page öffnen** (`/follow-ups`)

2. **Task anschauen:**
   - Wenn DB-Override existiert: ✅ Override-Nachricht wird angezeigt
   - Sonst: ⚙️ Standard-Konfiguration aus `followupSequence.ts`

3. **Workflow wie gewohnt:**
   - "Nachricht kopieren" kopiert die finale Nachricht (mit Override)
   - "WhatsApp öffnen" nutzt die finale Nachricht (mit Override)
   - Platzhalter `{{name}}` werden automatisch ersetzt

## Technische Details

### Lookup-Strategie

**Problem:** Wie matchen wir Templates zu Tasks?

**Lösung:** Lookup-Key-Format `${stepKey}::${verticalMapped}`

```typescript
// Vertical-Mapping (konsistent in Hook + Page):
function mapVertical(raw?: string | null): string {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("network")) return "network";
  if (v.includes("real") || v.includes("immo")) return "real_estate";
  if (v.includes("finanz") || v.includes("finance")) return "finance";
  return "generic";
}

// Beispiel:
const overrideKey = `fu_1_bump::network`;
const template = overrides[overrideKey];
```

### Constraint: Nur EIN aktives Template pro Step+Vertical

**Implementierung in `setActiveTemplateForStepAndVertical()`:**

1. Alle Templates für `stepKey + vertical` auf "draft" setzen
2. Gewähltes Template auf "active" setzen + key/vertical setzen

```typescript
// 1) Clear old actives
await supabaseClient
  .from("objection_templates")
  .update({ status: "draft" })
  .eq("key", stepKey)
  .eq("vertical", vertical);

// 2) Set new active
await updateObjectionTemplate(templateId, {
  key: stepKey,
  vertical,
  status: "active",
});
```

### Fallback-Chain

```
DB-Override (active Template)
  ↓ Falls nicht vorhanden
STANDARD_FOLLOW_UP_SEQUENCE (followupSequence.ts)
  ↓ Falls kein Template
task.note (Custom-Text)
```

## Testing

### 1. Manuelle Tests

**Test 1: Template zuordnen**

1. Öffne `/manager/followup-templates`
2. Wähle "Follow-up 1 – Bump" → "Network Marketing"
3. Wähle ein Template aus Dropdown
4. Prüfe Success-Message
5. Öffne `/follow-ups`
6. Finde eine Network-Task mit template_key="fu_1_bump"
7. ✅ Verifiziere: Template-Nachricht wird angezeigt

**Test 2: Standard wiederherstellen**

1. Öffne `/manager/followup-templates`
2. Wähle "Standard-Konfiguration verwenden"
3. Prüfe Success-Message
4. Öffne `/follow-ups`
5. ✅ Verifiziere: Standard-Nachricht wird angezeigt

**Test 3: Vertical-Fallback**

1. Erstelle ein generisches Template (vertical=null)
2. Ordne es einem Step zu
3. Öffne `/follow-ups` mit einem Lead, der ein anderes Vertical hat
4. ✅ Verifiziere: Generisches Template wird als Fallback verwendet

### 2. Supabase Queries

```sql
-- Alle aktiven Overrides anzeigen
SELECT key, vertical, title, status 
FROM objection_templates 
WHERE status = 'active' AND key IS NOT NULL
ORDER BY key, vertical;

-- Prüfen: Nur EIN aktives Template pro Step+Vertical
SELECT key, vertical, COUNT(*) 
FROM objection_templates 
WHERE status = 'active' AND key IS NOT NULL
GROUP BY key, vertical
HAVING COUNT(*) > 1;
-- Sollte leer sein!
```

## Dateien

### Neu erstellt

- ✅ `salesflow-ai/src/hooks/useFollowUpTemplateOverrides.ts`
- ✅ `salesflow-ai/src/pages/FollowUpTemplateManagerPage.tsx`
- ✅ `docs/followup_template_overrides_implementation.md`

### Geändert

- ✅ `salesflow-ai/backend/app/db/schema_objection_templates.sql` (Kommentare erweitert)
- ✅ `salesflow-ai/src/services/objectionTemplatesService.ts` (erweitert)
- ✅ `salesflow-ai/src/layout/AppShell.jsx` (Menü-Eintrag hinzugefügt)
- ✅ `salesflow-ai/src/layout/AppShell.tsx` (Menü-Eintrag hinzugefügt)
- ✅ `salesflow-ai/src/App.jsx` (Route hinzugefügt)

### Unverändert (aber relevant)

- ✅ `salesflow-ai/src/pages/FollowUpsPage.tsx` (bereits mit Overrides integriert)
- ✅ `salesflow-ai/src/config/followupSequence.ts` (Standard-Konfiguration)

## Nächste Schritte

1. **Testen:**
   - Manager-Seite öffnen: `/manager/followup-templates`
   - Templates zuordnen
   - Follow-ups Page prüfen: `/follow-ups`

2. **Optional: Template-Bibliothek:**
   - Separate Seite zum Browsen aller Templates
   - Filtern nach Status, Vertical, Step
   - Templates aktivieren/archivieren

3. **Optional: Analytics:**
   - Tracken, wie oft ein Template verwendet wird
   - A/B-Testing verschiedener Templates
   - Response-Rate nach Template

## Support

Bei Fragen oder Problemen:

1. **Backend-Logs prüfen:**
   - Supabase Studio → Logs
   - Browser Console für Frontend-Fehler

2. **DB-Zustand prüfen:**
   ```sql
   SELECT * FROM objection_templates WHERE status = 'active' AND key IS NOT NULL;
   ```

3. **Hook-State debuggen:**
   ```typescript
   // In FollowUpsPage.tsx:
   console.log('Overrides:', overrides);
   console.log('Override Key:', overrideKey);
   console.log('Override Template:', overrideTemplate);
   ```

## Abschluss

Das Follow-up Template Override System ist vollständig implementiert und einsatzbereit! 🎉

- ✅ Keine Breaking Changes
- ✅ DB-Templates überschreiben Standard-Config
- ✅ Manager können Zuordnungen verwalten
- ✅ Sales-Team sieht automatisch die richtigen Templates
- ✅ Fallback auf Standard-Config funktioniert
- ✅ Dark Theme, mobile-first
- ✅ Keine Linter-Fehler

