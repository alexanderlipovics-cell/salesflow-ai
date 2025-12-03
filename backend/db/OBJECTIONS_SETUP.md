# 📚 Objections Knowledge Base - Setup Anleitung

## 🎯 Übersicht

Das Objections-System speichert Einwände und passende Antwort-Techniken in Supabase. Diese Anleitung zeigt dir, wie du die Datenbank-Tabellen erstellst und Daten importierst.

---

## ⚙️ Setup-Schritte

### 1️⃣ **Supabase SQL Schema ausführen**

**Öffne:** https://app.supabase.com  
**Gehe zu:** SQL Editor → New Query

**Kopiere & Führe aus:**

```bash
# Kopiere den Inhalt aus:
backend/db/schema_objections.sql
```

**Was passiert:**
- ✅ Tabelle `objections` wird erstellt (Einwände)
- ✅ Tabelle `objection_responses` wird erstellt (Antworten)
- ✅ 6 Performance-Indexes werden angelegt
- ✅ Auto-Update Triggers für Timestamps

---

### 2️⃣ **Daten importieren**

**Aktiviere dein Virtual Environment:**

```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# oder: source venv/bin/activate  # Mac/Linux
```

**Führe das Import-Script aus:**

```bash
python scripts/import_objections.py data/objections_import.json
```

**Erwartete Ausgabe:**

```
📖 Reading data/objections_import.json...
📦 Found 15 objections to import.
🚀 Connecting to Supabase...
✅ [1/15] Imported: Das ist zu teuer. (2 responses)
✅ [2/15] Imported: Wir haben dafür gerade kein Budget. (2 responses)
...
🎉 Import complete!
   ✅ Imported: 15
   ⏭️  Skipped: 0
   📊 Total: 15
```

---

## 🧪 Testen

### Test 1: API Health Check

```bash
curl http://localhost:8000/health
```

### Test 2: Objections Search

```bash
curl "http://localhost:8000/api/objections/search?query=teuer&industry=finance"
```

**Erwartetes Ergebnis:**

```json
{
  "count": 2,
  "objections": [
    {
      "id": "uuid",
      "category": "preis",
      "objection_text_de": "Das ist zu teuer.",
      "industry": ["finance", "real_estate", "network_marketing"],
      "frequency_score": 95,
      "severity": 7,
      "responses": [
        {
          "technique": "Clarifying & ROI Reframe",
          "response_script": "Ich verstehe, {name}. Damit ich es besser einordnen kann...",
          "success_rate": "high",
          "tone": "empathetic"
        }
      ]
    }
  ]
}
```

### Test 3: Swagger UI

Öffne: http://localhost:8000/docs

- **Expand:** `GET /api/objections/search`
- **Try it out**
- **Query:** `teuer`
- **Industry:** `finance`
- **Execute**

---

## 📊 Datenbank-Struktur

### Tabelle: `objections`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `category` | TEXT | Kategorie (preis, zeit, konkurrenz, etc.) |
| `objection_text_de` | TEXT | Deutscher Einwand-Text |
| `psychology_tags` | TEXT[] | Psychologie-Tags (Loss Aversion, etc.) |
| `industry` | TEXT[] | Branchen (network_marketing, real_estate, finance) |
| `frequency_score` | INTEGER | Häufigkeit 0-100 |
| `severity` | INTEGER | Schwierigkeit 1-10 |

### Tabelle: `objection_responses`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `objection_id` | UUID | Fremdschlüssel → objections.id |
| `technique` | TEXT | Technik-Name |
| `response_script` | TEXT | Antwort-Script mit Platzhaltern |
| `success_rate` | TEXT | low / medium / high |
| `tone` | TEXT | Ton (empathetic, consultative, etc.) |

---

## 🔍 Nützliche SQL-Queries

### Alle Einwände zählen

```sql
SELECT COUNT(*) FROM objections;
```

### Top 5 häufigste Einwände

```sql
SELECT 
  category,
  objection_text_de,
  frequency_score
FROM objections
ORDER BY frequency_score DESC
LIMIT 5;
```

### Einwände nach Branche

```sql
SELECT 
  objection_text_de,
  industry
FROM objections
WHERE 'finance' = ANY(industry);
```

### Antworten mit hoher Erfolgsrate

```sql
SELECT 
  o.objection_text_de,
  r.technique,
  r.success_rate
FROM objections o
JOIN objection_responses r ON r.objection_id = o.id
WHERE r.success_rate = 'high'
LIMIT 10;
```

---

## 🛠️ Troubleshooting

### Problem: "Table does not exist"

**Lösung:** SQL-Schema wurde nicht ausgeführt
```bash
# Führe schema_objections.sql in Supabase SQL Editor aus
```

### Problem: "Column does not exist"

**Lösung:** Schema ist veraltet
```bash
# Lösche alte Tabellen und führe neues Schema aus
DROP TABLE IF EXISTS objection_responses CASCADE;
DROP TABLE IF EXISTS objections CASCADE;
# Dann schema_objections.sql erneut ausführen
```

### Problem: "Import script fails"

**Lösung:** Prüfe .env Konfiguration
```bash
# backend/.env muss enthalten:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

---

## 📝 Daten-Format (objections_import.json)

```json
{
  "objections": [
    {
      "category": "preis",
      "objection": "Das ist zu teuer.",
      "psychology": ["Loss Aversion", "ROI-Betrachtung"],
      "industry": ["network_marketing", "real_estate", "finance"],
      "frequency_score": 95,
      "severity": 7,
      "responses": [
        {
          "technique": "Clarifying & ROI Reframe",
          "script": "Ich verstehe, {name}...",
          "success_rate": "high",
          "tone": "empathetic"
        }
      ]
    }
  ]
}
```

---

## ✅ Checkliste

- [ ] SQL-Schema in Supabase ausgeführt
- [ ] Import-Script ausgeführt
- [ ] API-Test erfolgreich
- [ ] Swagger UI zeigt Daten
- [ ] `.env` enthält Supabase-Credentials

**🎉 Wenn alle Punkte ✅ sind, ist dein Objections-System einsatzbereit!**

