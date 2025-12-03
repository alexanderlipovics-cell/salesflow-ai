# Objection Brain Analytics

## Übersicht

Das Objection Brain Modul loggt ab sofort alle Nutzungen in der Tabelle `objection_sessions`.
Dies ermöglicht detaillierte Analytics über:

- Häufigste Einwände
- Genutzte Varianten pro Vertical/Channel
- Outcome-Tracking (sobald implementiert)

---

## Tabelle: `objection_sessions`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `lead_id` | UUID | Optional: Verknüpfung zum Lead |
| `user_id` | UUID | Optional: Für spätere Auth |
| `vertical` | TEXT | Branche (network, real_estate, finance) |
| `channel` | TEXT | Kanal (whatsapp, instagram, phone, email) |
| `objection_text` | TEXT | Original-Einwand des Kunden |
| `chosen_variant_label` | TEXT | Gewählte Variante (z.B. "Wert-Perspektive") |
| `chosen_message` | TEXT | Die kopierte Nachricht |
| `model_reasoning` | TEXT | KI-Strategie/Reasoning |
| `outcome` | TEXT | Ergebnis: pending, positive, neutral, negative |
| `source` | TEXT | Quelle: objection_brain_page, follow_ups, etc. |
| `created_at` | TIMESTAMPTZ | Erstellungszeitpunkt |

---

## Analytics-Queries

### Top 10 häufigste Einwände

```sql
SELECT 
    objection_text,
    COUNT(*) as count,
    COUNT(DISTINCT lead_id) as unique_leads
FROM public.objection_sessions
GROUP BY objection_text
ORDER BY count DESC
LIMIT 10;
```

### Genutzte Varianten pro Vertical

```sql
SELECT 
    vertical,
    chosen_variant_label,
    COUNT(*) as count
FROM public.objection_sessions
WHERE vertical IS NOT NULL
GROUP BY vertical, chosen_variant_label
ORDER BY vertical, count DESC;
```

### Outcome-Verteilung

```sql
SELECT 
    outcome,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.objection_sessions
WHERE outcome IS NOT NULL
GROUP BY outcome
ORDER BY count DESC;
```

### Nutzung nach Kanal

```sql
SELECT 
    channel,
    COUNT(*) as total_uses,
    COUNT(CASE WHEN outcome = 'positive' THEN 1 END) as positive_outcomes
FROM public.objection_sessions
WHERE channel IS NOT NULL
GROUP BY channel
ORDER BY total_uses DESC;
```

### Tägliche Nutzungsstatistik (letzte 30 Tage)

```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as sessions,
    COUNT(DISTINCT lead_id) as unique_leads
FROM public.objection_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Einwand-Kategorien (Pattern Matching)

```sql
SELECT 
    CASE 
        WHEN objection_text ILIKE '%teuer%' OR objection_text ILIKE '%preis%' THEN 'Preis'
        WHEN objection_text ILIKE '%zeit%' OR objection_text ILIKE '%später%' THEN 'Timing'
        WHEN objection_text ILIKE '%brauch%' OR objection_text ILIKE '%interesse%' THEN 'Bedarf'
        ELSE 'Sonstiges'
    END as category,
    COUNT(*) as count
FROM public.objection_sessions
GROUP BY category
ORDER BY count DESC;
```

---

## Geplante Erweiterungen

### 1. Outcome Tracking
- Nach Nutzung einer Antwort das Ergebnis erfassen
- Verknüpfung mit Follow-up Sequenz Outcomes
- A/B Testing verschiedener Varianten

### 2. Lead-Kontext Integration
- Wenn Objection Brain aus Lead-Karte geöffnet wird: `lead_id` automatisch setzen
- Lead-History für kontextbezogene Antworten nutzen

### 3. Analytics Dashboard
- Visualisierung der häufigsten Einwände
- Trend-Analyse über Zeit
- Erfolgsquoten pro Variante

### 4. ML-basierte Verbesserungen
- Erfolgreiche Antworten priorisieren
- Automatische Kategorisierung von Einwänden
- Personalisierte Varianten-Empfehlungen

---

## API Endpoints

### POST `/api/objection-brain/generate`
Generiert Antwort-Varianten für einen Einwand.

### POST `/api/objection-brain/log`
Loggt die Verwendung einer Antwort.

**Request:**
```json
{
  "lead_id": "optional-uuid",
  "vertical": "network",
  "channel": "whatsapp",
  "objection_text": "Das ist mir zu teuer",
  "chosen_variant_label": "Wert-Perspektive",
  "chosen_message": "Die gewählte Nachricht...",
  "model_reasoning": "Optional: KI-Reasoning",
  "outcome": null,
  "source": "objection_brain_page"
}
```

**Response:**
```json
{
  "id": "created-uuid"
}
```

---

## Setup

1. SQL-Schema in Supabase ausführen:
   - Datei: `backend/app/db/schema_objection_sessions.sql`
   
2. Backend-Router ist automatisch aktiv unter `/api/objection-brain/`

3. Frontend nutzt "Diese Antwort verwenden" Button zum Loggen

