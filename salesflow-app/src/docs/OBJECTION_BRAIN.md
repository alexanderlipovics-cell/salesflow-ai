# 🧠 Sales Flow AI - Objection Brain

> **Technische Dokumentation** | Version 1.0  
> KI-gestützte Einwand-Behandlung mit branchenspezifischen Antworten

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Architektur](#-architektur)
3. [Frontend: ObjectionBrainScreen](#-frontend-objectionbrainscreen)
4. [API-Integration](#-api-integration)
5. [Konfiguration](#-konfiguration)
6. [Datenmodell](#-datenmodell)
7. [Nutzung & Beispiele](#-nutzung--beispiele)

---

## 🎯 Überblick

Das **Objection Brain** ist ein KI-gestütztes Modul zur Generierung von Antworten auf Kundeneinwände:

- ✅ **Branchenspezifisch**: Network Marketing, Immobilien, Finanzvertrieb
- ✅ **Kanaloptimiert**: WhatsApp, Instagram, Telefon, E-Mail
- ✅ **Mehrsprachig**: Primär Deutsch
- ✅ **Multiple Varianten**: Verschiedene Antwort-Strategien

### Kernfunktion
Der Nutzer gibt einen Kundeneinwand ein und erhält KI-generierte Antwortvorschläge, optimiert für die gewählte Branche und den Kommunikationskanal.

---

## 🏗 Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React Native)                         │
├─────────────────────────────────────────────────────────────────┤
│  ObjectionBrainScreen.js                                         │
│  - Branche wählen (Network, Immobilien, Finance)                │
│  - Kanal wählen (WhatsApp, Instagram, Telefon, E-Mail)          │
│  - Einwand eingeben                                              │
│  - Antworten anzeigen                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /api/objection-brain/generate
┌─────────────────────────────────────────────────────────────────┐
│                         API (Backend)                            │
├─────────────────────────────────────────────────────────────────┤
│  - Objection Library durchsuchen                                 │
│  - KI-Antworten generieren                                       │
│  - Branche & Kanal berücksichtigen                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Frontend: ObjectionBrainScreen

**Datei:** `src/screens/main/ObjectionBrainScreen.js`

### Beschreibung
React Native Screen zur Eingabe von Kundeneinwänden und Anzeige KI-generierter Antworten.

### State Management

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `objection` | `String` | Eingegebener Kundeneinwand |
| `vertical` | `String` | Gewählte Branche |
| `channel` | `String` | Gewählter Kommunikationskanal |
| `loading` | `Boolean` | Ladezustand |
| `result` | `Object` | Generierte Antworten |
| `error` | `String` | Fehlermeldung |

### Konfiguration

#### Branchen (Verticals)

```javascript
const VERTICALS = [
  { key: 'network', label: '🌐 Network Marketing', color: '#8b5cf6' },
  { key: 'real_estate', label: '🏠 Immobilien', color: '#10b981' },
  { key: 'finance', label: '💰 Finanzvertrieb', color: '#f59e0b' },
];
```

#### Kommunikationskanäle

```javascript
const CHANNELS = [
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'instagram', label: '📸 Instagram' },
  { key: 'phone', label: '📞 Telefon' },
  { key: 'email', label: '📧 E-Mail' },
];
```

### Hauptfunktion

```javascript
const analyzeObjection = async () => {
  if (!objection.trim()) {
    setError('Bitte gib einen Einwand ein');
    return;
  }
  setLoading(true);
  setError('');
  setResult(null);

  try {
    const response = await fetch(`${API_URL}/api/objection-brain/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objection: objection.trim(),
        vertical,
        channel,
        language: 'de'
      })
    });
    
    const data = await response.json();
    if (data.variants) {
      setResult(data);
    } else {
      setError('Keine Antwort generiert');
    }
  } catch (err) {
    setError('Verbindungsfehler. Bitte versuche es erneut.');
  }
  setLoading(false);
};
```

### UI-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| Header | Titel "🧠 Objection Brain" mit Untertitel |
| Vertical Selection | Chip-Auswahl für Branchen |
| Channel Selection | Chip-Auswahl für Kanäle |
| TextArea | Eingabefeld für den Einwand |
| Button | "🎯 Antworten generieren" |
| Results Container | Liste der generierten Antwort-Varianten |
| Variant Card | Einzelne Antwortvariante mit Label, Message, Summary |

---

## 🌐 API-Integration

### Endpoint

**POST** `/api/objection-brain/generate`

### Request Body

```json
{
  "objection": "Das ist mir zu teuer",
  "vertical": "network",
  "channel": "whatsapp",
  "language": "de"
}
```

### Request Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `objection` | `string` | ✅ | Der Kundeneinwand |
| `vertical` | `string` | ✅ | Branche: `network`, `real_estate`, `finance` |
| `channel` | `string` | ✅ | Kanal: `whatsapp`, `instagram`, `phone`, `email` |
| `language` | `string` | ❌ | Sprache (default: `de`) |

### Response

```json
{
  "variants": [
    {
      "label": "💡 Logisch",
      "message": "Verstehe ich. Lass uns mal rechnen: Was kostet dich das Problem das du JETZT hast? Pro Monat, pro Jahr?",
      "summary": "Fokus auf ROI und langfristige Kosten"
    },
    {
      "label": "❤️ Emotional",
      "message": "Ich verstehe das Gefühl. Aber was ist dir deine Gesundheit/Zeit/Erfolg wirklich wert? Manche Dinge sind unbezahlbar.",
      "summary": "Fokus auf persönliche Werte"
    },
    {
      "label": "🔥 Provokativ",
      "message": "Zu teuer im Vergleich wozu? Zu deiner Gesundheit? Zu den Chancen die du verpasst?",
      "summary": "Herausfordernde Gegenfrage"
    }
  ]
}
```

---

## ⚙️ Konfiguration

### API URL

```javascript
const API_URL = 'http://localhost:8000';
```

### Styling

| Element | Farbe | Beschreibung |
|---------|-------|--------------|
| Header | `#8b5cf6` (Lila) | Hintergrundfarbe |
| Button | `#8b5cf6` (Lila) | Primärer Action-Button |
| Error | `#ef4444` (Rot) | Fehlermeldungen |
| Card Background | `white` | Antwort-Karten |
| Variant Label | `#8b5cf6` (Lila) | Label der Antwortvariante |

---

## 📊 Datenmodell

### Result Object

```typescript
interface ObjectionResult {
  variants: ObjectionVariant[];
}

interface ObjectionVariant {
  label: string;     // z.B. "💡 Logisch"
  message: string;   // Die eigentliche Antwort
  summary?: string;  // Optionale Kurzbeschreibung
}
```

### Einwand-Kategorien

Basierend auf der Objection Library aus dem Power-Up System:

| Kategorie | Beispiele |
|-----------|-----------|
| `price` | "Das ist mir zu teuer", "Zu teuer" |
| `stall` | "Ich überlege es mir", "Muss mit Partner sprechen" |
| `time` | "Ich habe keine Zeit" |
| `mlm_stigma` | "Das ist doch ein Schneeballsystem" |
| `limiting_belief` | "Bei mir funktioniert sowas nicht" |
| `skepticism` | "Das glaube ich nicht" |

---

## 🚀 Nutzung & Beispiele

### Beispiel 1: Preis-Einwand (Network Marketing, WhatsApp)

**Eingabe:**
- Branche: Network Marketing
- Kanal: WhatsApp
- Einwand: "Das ist mir zu teuer"

**Erwartete Antworten:**

```
💡 Logisch:
"Verstehe ich. Lass uns mal rechnen: Was kostet dich das Problem 
das du JETZT hast? Pro Monat, pro Jahr?"

❤️ Emotional:
"Ich verstehe das Gefühl. Aber was ist dir deine Gesundheit 
wirklich wert? Manche Dinge sind unbezahlbar."

🔥 Provokativ:
"Zu teuer im Vergleich wozu? Zu deiner Gesundheit? 
Zu den Chancen die du verpasst?"
```

### Beispiel 2: MLM-Skepsis (Network Marketing, Telefon)

**Eingabe:**
- Branche: Network Marketing
- Kanal: Telefon
- Einwand: "Das ist doch ein Schneeballsystem"

**Erwartete Antworten:**

```
💡 Logisch:
"Fakten: X Jahre am Markt, X Milliarden Umsatz. 
Schneeballsysteme überleben keine 2 Jahre."

❤️ Emotional:
"Ich hatte dieselbe Angst am Anfang. Aber dann habe ich 
die Produkte selbst probiert und gesehen: Die funktionieren."

🔥 Provokativ:
"Ist dein Arbeitgeber auch ein Schneeballsystem? 
Da verdient der Chef auch mehr als du, oder?"
```

### Beispiel 3: Zeit-Einwand (Immobilien, E-Mail)

**Eingabe:**
- Branche: Immobilien
- Kanal: E-Mail
- Einwand: "Ich habe gerade keine Zeit"

**Erwartete Antworten:**

```
💡 Logisch:
"Das verstehe ich gut. Gerade WEIL du keine Zeit hast, 
ist das hier relevant. Es spart dir langfristig Zeit."

❤️ Emotional:
"Zeit ist unser wertvollstes Gut. Aber diese 30 Minuten 
könnten dein Leben verändern."

🔥 Provokativ:
"Keine Zeit für was genau? Für deine Zukunft? 
Für mehr Geld? Für deine Familie?"
```

---

## 🎨 UI/UX Flow

```
┌─────────────────────────────────────────┐
│  🧠 Objection Brain                     │
│  KI-gestützte Einwand-Behandlung        │
├─────────────────────────────────────────┤
│                                         │
│  Branche                                │
│  [🌐 Network] [🏠 Immobilien] [💰 Finance]│
│                                         │
│  Kanal                                  │
│  [💬 WhatsApp] [📸 Instagram]           │
│  [📞 Telefon] [📧 E-Mail]               │
│                                         │
│  Einwand des Kunden                     │
│  ┌─────────────────────────────────┐    │
│  │ z.B. "Das ist mir zu teuer"    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [🎯 Antworten generieren]              │
│                                         │
├─────────────────────────────────────────┤
│  💡 Empfohlene Antworten                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 💡 Logisch                      │    │
│  │ "Verstehe ich. Lass uns mal..." │    │
│  │ 💭 Fokus auf ROI                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ❤️ Emotional                    │    │
│  │ "Ich verstehe das Gefühl..."   │    │
│  │ 💭 Fokus auf persönliche Werte  │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Fehlerbehebung

### "Verbindungsfehler"
- Prüfe ob Backend unter `http://localhost:8000` läuft
- Prüfe Netzwerkverbindung

### "Keine Antwort generiert"
- Einwand war möglicherweise zu unspezifisch
- Backend konnte keine passende Antwort generieren

### Leere Ergebnisse
- Prüfe API-Response im Network-Tab
- Prüfe ob `variants` Array im Response vorhanden ist

---

## 📚 Abhängigkeiten

- `react-native` – UI Framework
- Backend API unter `http://localhost:8000`
- Objection Library aus Power-Up System (optional für erweiterte Antworten)

---

## 🔧 Extending this Module

### Neue Branche hinzufügen

1. **Type erweitern** in Frontend:

```typescript
// ObjectionBrainScreen.js
const VERTICALS = [
  { key: 'network', label: '🌐 Network Marketing', color: '#8b5cf6' },
  { key: 'real_estate', label: '🏠 Immobilien', color: '#10b981' },
  { key: 'finance', label: '💰 Finanzvertrieb', color: '#f59e0b' },
  { key: 'insurance', label: '🛡️ Versicherung', color: '#3b82f6' },  // NEU
];
```

2. **Backend anpassen**:

```python
# api/objection_brain.py
@router.get("/verticals")
async def get_verticals():
    return {
        "verticals": [
            {"key": "network", "label": "🌐 Network Marketing"},
            {"key": "real_estate", "label": "🏠 Immobilien"},
            {"key": "finance", "label": "💰 Finanzvertrieb"},
            {"key": "insurance", "label": "🛡️ Versicherung"},  # NEU
        ]
    }
```

### Neuen Kanal hinzufügen

```typescript
const CHANNELS = [
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'instagram', label: '📸 Instagram' },
  { key: 'phone', label: '📞 Telefon' },
  { key: 'email', label: '📧 E-Mail' },
  { key: 'linkedin', label: '💼 LinkedIn' },  // NEU
];
```

### Einwand-Typen Naming Convention

| Key | Kategorie | Beispiele |
|-----|-----------|-----------|
| `price` | Preiseinwände | "Zu teuer", "Kein Budget" |
| `time` | Zeiteinwände | "Keine Zeit", "Später" |
| `trust` | Vertrauenseinwände | "Kenne ich nicht" |
| `company` | Firmen-Skepsis | "MLM-Skepsis" |
| `product` | Produktzweifel | "Funktioniert nicht" |
| `authority` | Autoritätseinwände | "Arzt sagt nein" |
| `stall` | Verzögerung | "Muss überlegen" |

### RAG / Vektorstore Integration (geplant)

```python
# Embeddings für Einwände
from openai import OpenAI

def generate_embedding(text: str) -> list:
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# Similarity Search
def find_similar_objection(query: str, top_k: int = 3):
    query_embedding = generate_embedding(query)
    # Vector DB Query
    results = vector_store.similarity_search(query_embedding, top_k)
    return results
```

### Checkliste

- [ ] Neue Einwände in `objection_library` Tabelle
- [ ] DISG-Varianten für jeden Einwand (D, I, S, G)
- [ ] Branche/Kanal im Frontend hinzugefügt
- [ ] API Endpoint aktualisiert
- [ ] UI getestet

---

## 📅 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2024 | Initial mit 3 Branchen, 4 Kanälen, Variant-basierte Antworten |

---

## 🔧 Extending this Module

### Neue Branche + Kanal hinzufügen

**1. Branchen-Definition erweitern**

```typescript
// types/objection.ts
type Industry = 
  | 'wellness'      // Gesundheit & Wellness
  | 'nutrition'     // Nahrungsergänzung
  | 'cosmetics'     // Kosmetik & Beauty
  | 'financial'     // Finanzdienstleistungen
  | 'tech'          // Tech & Software (NEU)
  | 'energy';       // Energie (NEU)

// Konfiguration
const INDUSTRY_CONFIG: Record<Industry, IndustryConfig> = {
  tech: {
    label: 'Tech & Software',
    icon: '💻',
    color: '#3b82f6',
    commonObjections: ['price', 'complexity', 'support']
  },
  energy: {
    label: 'Energie',
    icon: '⚡',
    color: '#eab308',
    commonObjections: ['price', 'switching', 'trust']
  }
};
```

**2. Kanal-Definition erweitern**

```typescript
type Channel = 
  | 'whatsapp'    // WhatsApp Nachricht
  | 'email'       // E-Mail
  | 'phone'       // Telefon
  | 'linkedin'    // LinkedIn (NEU)
  | 'instagram'   // Instagram DM (NEU)
  | 'zoom';       // Video Call (NEU)

const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    maxLength: 300,
    formality: 'professional',
    emoji: false
  },
  instagram: {
    label: 'Instagram',
    icon: '📸',
    maxLength: 1000,
    formality: 'casual',
    emoji: true
  }
};
```

**3. Backend anpassen**

```python
# backend/app/routers/objection_brain.py

SUPPORTED_INDUSTRIES = ['wellness', 'nutrition', 'cosmetics', 'financial', 'tech', 'energy']
SUPPORTED_CHANNELS = ['whatsapp', 'email', 'phone', 'linkedin', 'instagram', 'zoom']

@router.post("/generate")
async def generate_response(
    objection: str,
    industry: str = Query(..., enum=SUPPORTED_INDUSTRIES),
    channel: str = Query(..., enum=SUPPORTED_CHANNELS)
):
    # ...
```

---

### Einwand-Typen (Naming Convention)

| Typ | Beschreibung | Beispiele |
|-----|--------------|-----------|
| `price` | Preiseinwände | "Zu teuer", "Kann ich mir nicht leisten" |
| `time` | Zeiteinwände | "Hab keine Zeit", "Vielleicht später" |
| `trust` | Vertrauenseinwände | "Kenne euch nicht", "Klingt unseriös" |
| `company` | Firmen-Skepsis | "Hab schlechtes gehört", "Ist das legal?" |
| `product` | Produktzweifel | "Funktioniert das wirklich?", "Brauche ich nicht" |
| `mlm` | MLM-Vorurteile | "Ist das Schneeballsystem?", "Pyramide" |
| `partner` | Partner/Familie | "Mein Partner ist dagegen" |
| `experience` | Erfahrung | "Hab schon mal was ähnliches probiert" |

**Neue Kategorie hinzufügen:**

```sql
-- 1. Enum erweitern (falls verwendet)
ALTER TYPE objection_category ADD VALUE 'experience';

-- 2. Einwände hinzufügen
INSERT INTO objection_library (
  category, objection_text,
  response_d, response_i, response_s, response_c
) VALUES (
  'experience',
  'Hab schon mal was ähnliches probiert',
  'D: "Was genau hast du probiert und was war das Ergebnis?"',
  'I: "Oh interessant! Erzähl mal - was hat gefehlt?"',
  'S: "Das verstehe ich. Darf ich fragen, was dich diesmal neugierig macht?"',
  'C: "Welche Aspekte haben nicht funktioniert? Lass uns vergleichen."'
);
```

---

### RAG / Vektorstore Integration

**Einwände als Embeddings:**

```python
from openai import OpenAI

client = OpenAI()

async def generate_objection_embedding(objection_text: str) -> list[float]:
    """Generiert Embedding für einen Einwand."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=objection_text
    )
    return response.data[0].embedding
```

**Index-Strategie:**

```sql
-- pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding-Spalte hinzufügen
ALTER TABLE objection_library 
ADD COLUMN embedding vector(1536);

-- Index für Similarity Search
CREATE INDEX idx_objection_embedding 
ON objection_library 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Similarity Search:**

```python
async def find_similar_objections(
    user_objection: str,
    industry: str,
    limit: int = 3
) -> list[ObjectionMatch]:
    """Findet ähnliche Einwände via Vektorsuche."""
    
    # 1. Embedding generieren
    embedding = await generate_objection_embedding(user_objection)
    
    # 2. Similarity Search
    result = await supabase.rpc(
        'match_objections',
        {
            'query_embedding': embedding,
            'match_threshold': 0.7,
            'match_count': limit,
            'filter_industry': industry
        }
    ).execute()
    
    return result.data
```

**Supabase RPC:**

```sql
CREATE OR REPLACE FUNCTION match_objections(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_industry text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  objection_text text,
  response_d text,
  response_i text,
  response_s text,
  response_c text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ol.id,
    ol.objection_text,
    ol.response_d,
    ol.response_i,
    ol.response_s,
    ol.response_c,
    1 - (ol.embedding <=> query_embedding) as similarity
  FROM objection_library ol
  WHERE 
    (filter_industry IS NULL OR ol.industry = filter_industry)
    AND 1 - (ol.embedding <=> query_embedding) > match_threshold
  ORDER BY ol.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Checkliste für Erweiterungen

- [ ] Neue Einwände in `objection_library` (mit allen DISG-Varianten)
- [ ] Embeddings für neue Einwände generiert
- [ ] Industry/Channel Config im Frontend aktualisiert
- [ ] Backend Enums erweitert
- [ ] API getestet mit neuen Parametern
- [ ] UI Dropdowns aktualisiert

---

> **Erstellt für Sales Flow AI** | Objection Brain Modul

