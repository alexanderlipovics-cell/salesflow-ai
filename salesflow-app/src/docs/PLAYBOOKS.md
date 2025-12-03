# 📚 Sales Flow AI - Playbooks

> **Technische Dokumentation** | Version 1.0  
> Bewährte Sales-Strategien für systematischen Erfolg

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Architektur](#-architektur)
3. [Frontend: PlaybooksScreen](#-frontend-playbooksscreen)
4. [Konfiguration](#-konfiguration)
5. [Datenmodell](#-datenmodell)
6. [UI-Komponenten](#-ui-komponenten)
7. [Nutzung & Beispiele](#-nutzung--beispiele)

---

## 🎯 Überblick

Das **Playbooks** Modul bietet strukturierte Sales-Strategien:

- ✅ **Kategorisiert**: Opener, Follow-up, Closing, Einwände
- ✅ **Schritt-für-Schritt**: Detaillierte Anleitungen
- ✅ **Effectiveness Score**: Erfolgsquote pro Playbook
- ✅ **KI-Generator**: Personalisierte Playbooks erstellen (geplant)

### Kernfunktion
Zugang zu bewährten Verkaufsstrategien mit messbarer Erfolgsquote und konkreten Handlungsanweisungen.

---

## 🏗 Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React Native)                         │
├─────────────────────────────────────────────────────────────────┤
│  PlaybooksScreen.js                                              │
│  - Kategorie-Filter                                              │
│  - Playbook-Karten mit Schritten                                 │
│  - Effectiveness Score Anzeige                                   │
│  - KI-Generator CTA                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Geplant: API Integration)
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYBOOK DATABASE                             │
├─────────────────────────────────────────────────────────────────┤
│  - Vordefinierte Playbooks                                       │
│  - Custom Playbooks (User-erstellt)                              │
│  - Analytics (Nutzung, Erfolg)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Frontend: PlaybooksScreen

**Datei:** `src/screens/main/PlaybooksScreen.js`

### Beschreibung
React Native Screen zur Anzeige und Nutzung von Sales-Playbooks.

### State Management

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `selectedCategory` | `String` | Gewählte Kategorie-Filter |
| `playbooks` | `Array` | Liste aller Playbooks |
| `loading` | `Boolean` | Ladezustand |
| `expandedId` | `String` | ID des aufgeklappten Playbooks |
| `refreshing` | `Boolean` | Pull-to-Refresh aktiv |

### Hauptfunktionen

```javascript
// Filter anwenden
const filteredPlaybooks = selectedCategory 
  ? playbooks.filter(p => p.category === selectedCategory)
  : playbooks;

// Pull-to-Refresh
const onRefresh = async () => {
  setRefreshing(true);
  // TODO: Fetch from API
  await new Promise(resolve => setTimeout(resolve, 1000));
  setRefreshing(false);
};
```

---

## ⚙️ Konfiguration

### Kategorien

```javascript
const PLAYBOOK_CATEGORIES = [
  { key: 'opener', label: '🎬 Opener', color: '#3b82f6' },
  { key: 'followup', label: '📬 Follow-up', color: '#10b981' },
  { key: 'closing', label: '🎯 Closing', color: '#f59e0b' },
  { key: 'objection', label: '🧠 Einwände', color: '#8b5cf6' },
];
```

### Sample Playbooks (Demo-Daten)

```javascript
const SAMPLE_PLAYBOOKS = [
  {
    id: '1',
    category: 'opener',
    title: 'Cold Outreach - LinkedIn',
    description: 'Erste Kontaktaufnahme über LinkedIn mit Value-First-Ansatz',
    steps: [
      'Profil recherchieren & personalisieren',
      'Value-Hook in der ersten Nachricht',
      'Keine Verkaufsintention zeigen',
      'Interesse wecken mit Mehrwert'
    ],
    effectiveness: 78
  },
  {
    id: '2',
    category: 'followup',
    title: '3-Touch Follow-up Sequenz',
    description: 'Strukturierte Nachfass-Sequenz nach Erstkontakt',
    steps: [
      'Tag 1: Danke + Zusammenfassung',
      'Tag 3: Mehrwert-Content teilen',
      'Tag 7: Soft-CTA mit Terminvorschlag'
    ],
    effectiveness: 85
  },
  // ... weitere Playbooks
];
```

---

## 📊 Datenmodell

### Playbook Object

```typescript
interface Playbook {
  id: string;
  category: 'opener' | 'followup' | 'closing' | 'objection';
  title: string;
  description: string;
  steps: string[];
  effectiveness: number;  // 0-100
}
```

### Kategorien erklärt

| Kategorie | Beschreibung | Beispiele |
|-----------|--------------|-----------|
| **Opener** | Erste Kontaktaufnahme | LinkedIn Cold Outreach, Warm Intro |
| **Follow-up** | Nachfass-Strategien | 3-Touch Sequenz, Re-Engagement |
| **Closing** | Abschluss-Techniken | Assumptive Close, Trial Close |
| **Objection** | Einwand-Behandlung | Preis-Einwand, Zeit-Einwand |

### Effectiveness Score

| Score | Bewertung | Farbe |
|-------|-----------|-------|
| 80-100 | Exzellent | Grün `#16a34a` |
| 60-79 | Gut | Orange `#d97706` |
| 40-59 | Mittel | Gelb |
| 0-39 | Niedrig | Rot |

---

## 🎨 UI-Komponenten

### Kategorie-Filter

```
┌──────────────────────────────────────────────────┐
│ [Alle] [🎬 Opener] [📬 Follow-up] [🎯 Closing]  │
│ [🧠 Einwände]                                    │
└──────────────────────────────────────────────────┘
```

### Playbook Card (Collapsed)

```
┌──────────────────────────────────────────────────┐
│ Cold Outreach - LinkedIn              [78%]     │
│                                                  │
│ Erste Kontaktaufnahme über LinkedIn mit         │
│ Value-First-Ansatz                              │
│                                                  │
│               ▼ Mehr anzeigen                    │
└──────────────────────────────────────────────────┘
```

### Playbook Card (Expanded)

```
┌──────────────────────────────────────────────────┐
│ Cold Outreach - LinkedIn              [78%]     │
│                                                  │
│ Erste Kontaktaufnahme über LinkedIn mit         │
│ Value-First-Ansatz                              │
├──────────────────────────────────────────────────┤
│ 📋 Schritte:                                     │
│                                                  │
│ ① Profil recherchieren & personalisieren        │
│                                                  │
│ ② Value-Hook in der ersten Nachricht            │
│                                                  │
│ ③ Keine Verkaufsintention zeigen                │
│                                                  │
│ ④ Interesse wecken mit Mehrwert                 │
│                                                  │
│      [🚀 Playbook verwenden]                     │
│                                                  │
│               ▲ Weniger                          │
└──────────────────────────────────────────────────┘
```

### KI-Generator CTA

```
┌──────────────────────────────────────────────────┐
│ ✨                                               │
│                                                  │
│ KI Playbook Generator                            │
│ Lass die KI ein personalisiertes Playbook       │
│ für deinen Use-Case erstellen                    │
│                                          →       │
└──────────────────────────────────────────────────┘
```

---

## 🚀 Nutzung & Beispiele

### Beispiel 1: Cold Outreach - LinkedIn

**Kategorie:** 🎬 Opener  
**Effectiveness:** 78%

**Schritte:**
1. **Profil recherchieren & personalisieren**
   - Aktuelle Rolle, Unternehmen, gemeinsame Kontakte
   - Letzte Posts/Aktivitäten checken
   
2. **Value-Hook in der ersten Nachricht**
   - Kein "Ich verkaufe X"
   - Stattdessen: Relevante Insight teilen
   
3. **Keine Verkaufsintention zeigen**
   - Erst Beziehung aufbauen
   - Mehrwert bieten
   
4. **Interesse wecken mit Mehrwert**
   - Artikel, Studie oder Tool teilen
   - Frage stellen die Engagement erzeugt

### Beispiel 2: 3-Touch Follow-up Sequenz

**Kategorie:** 📬 Follow-up  
**Effectiveness:** 85%

**Schritte:**
1. **Tag 1: Danke + Zusammenfassung**
   ```
   "Hey [Name], danke für unser Gespräch heute! 
   Kurze Zusammenfassung: [Key Points]
   Freue mich auf [nächster Schritt]!"
   ```

2. **Tag 3: Mehrwert-Content teilen**
   ```
   "Hey [Name], hab hier einen Artikel gefunden 
   der perfekt zu unserem Gespräch passt: [Link]
   Was denkst du darüber?"
   ```

3. **Tag 7: Soft-CTA mit Terminvorschlag**
   ```
   "Hey [Name], ich wollte kurz nachhaken - 
   hattest du die Chance, dir das anzuschauen?
   Wann passt ein kurzer Call diese Woche?"
   ```

### Beispiel 3: Assumptive Close

**Kategorie:** 🎯 Closing  
**Effectiveness:** 72%

**Schritte:**
1. **Zusammenfassung der Vorteile**
   - Nochmal Key Benefits nennen
   - Pain Points adressieren

2. **Annahme der Entscheidung**
   - "Sollen wir mit dem Solo- oder Team-Paket starten?"
   - Nicht "Willst du kaufen?"

3. **Konkrete nächste Schritte vorschlagen**
   - "Ich schicke dir den Vertrag, du unterschreibst digital"
   - Timeline kommunizieren

4. **Einwände proaktiv adressieren**
   - "Falls Budget ein Thema ist, können wir..."
   - Alternativen anbieten

---

## 🎨 Styling

### Farben

| Element | Farbe | Hex |
|---------|-------|-----|
| Header | Blau | `#3b82f6` |
| Opener | Blau | `#3b82f6` |
| Follow-up | Grün | `#10b981` |
| Closing | Orange | `#f59e0b` |
| Einwände | Lila | `#8b5cf6` |
| Effectiveness ≥80 | Grün | `#16a34a` |
| Effectiveness <80 | Orange | `#d97706` |

### Card Styling

```javascript
playbookCard: { 
  backgroundColor: 'white', 
  borderRadius: 16, 
  padding: 16, 
  marginBottom: 12,
  borderLeftWidth: 4,  // Kategorie-Farbe
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2
}
```

---

## 🔮 Geplante Features

### KI Playbook Generator

```javascript
// Geplant: Personalisierte Playbooks generieren
const generatePlaybook = async (params) => {
  const response = await fetch(`${API_URL}/api/playbooks/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      use_case: 'cold_outreach_saas',
      vertical: 'network_marketing',
      target_persona: 'decision_maker',
      channel: 'linkedin'
    })
  });
  
  return await response.json();
};
```

### Playbook Analytics

- Nutzungshäufigkeit tracken
- Erfolgsquote messen (wenn mit Leads verknüpft)
- A/B-Testing von Varianten

### Custom Playbooks

- User-erstellte Playbooks speichern
- Team-Playbooks teilen
- Best Practices importieren

---

## 📚 Abhängigkeiten

- `react-native` – UI Framework
- Sample Data (aktuell)
- Geplant: Backend API für Playbook-Management

---

## 🔧 Extending this Module

### Was ist ein "gutes" Playbook?

| Kriterium | Beschreibung |
|-----------|--------------|
| **Ziel** | Klar definiertes Outcome (z.B. "Erstgespräch vereinbaren") |
| **Steps** | 3-7 konkrete Schritte |
| **Trigger** | Wann wird es aktiviert? |
| **KPI** | Wie wird Erfolg gemessen? |

### Effectiveness Score Berechnung

```typescript
function calculateEffectiveness(playbook: Playbook): number {
  const conversionRate = playbook.conversions / playbook.uses;  // 40% Gewicht
  const responseRate = playbook.responses / playbook.sends;     // 30% Gewicht
  const manualRating = playbook.avg_rating / 5;                 // 30% Gewicht
  
  const score = (conversionRate * 0.4) + (responseRate * 0.3) + (manualRating * 0.3);
  return Math.round(score * 100);  // 0-100
}
```

### Neue Kategorie hinzufügen

```typescript
// PlaybooksScreen.js
const PLAYBOOK_CATEGORIES = [
  { key: 'opener', label: '🎬 Opener', color: '#3b82f6' },
  { key: 'followup', label: '📬 Follow-up', color: '#10b981' },
  { key: 'closing', label: '🎯 Closing', color: '#f59e0b' },
  { key: 'objection', label: '🧠 Einwände', color: '#8b5cf6' },
  { key: 'reactivation', label: '🔄 Reaktivierung', color: '#ec4899' },  // NEU
];
```

### Schnittstelle zu Templates & CHIEF

```typescript
// Playbook Steps → Prompt Chunks für CHIEF
interface PlaybookWithChief {
  playbook: Playbook;
  chiefPrompt: string;  // Generiert aus Steps
}

function generateChiefPrompt(playbook: Playbook): string {
  return `
    Du hilfst bei: ${playbook.title}
    
    Schritte die der User befolgen sollte:
    ${playbook.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
    
    Ziel: ${playbook.description}
  `;
}
```

### Datenbank-Schema für Custom Playbooks

```sql
CREATE TABLE custom_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  steps TEXT[] NOT NULL,
  
  -- Analytics
  effectiveness INT DEFAULT 0,
  uses_count INT DEFAULT 0,
  conversions_count INT DEFAULT 0,
  
  -- Sharing
  is_public BOOLEAN DEFAULT false,  -- Team-sichtbar?
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Checkliste

- [ ] Kategorie in `PLAYBOOK_CATEGORIES` hinzugefügt
- [ ] Farbe definiert
- [ ] Sample Playbooks erstellt
- [ ] CHIEF-Integration getestet
- [ ] Effectiveness Tracking funktioniert

---

## 📅 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2024 | Initial mit 4 Sample Playbooks, Kategorie-Filter, Expand/Collapse |

---

> **Erstellt für Sales Flow AI** | Playbooks Modul

