# Brand Storybook System

## Übersicht

Das Brand Storybook System ermöglicht die Integration von Unternehmens-Storybooks (PDFs, Dokumente) in Sales Flow AI. Es bietet:

1. **Company Knowledge** - Marke, Vision, Produkte, USPs pro Firma
2. **Compliance Guardrails** - Rechtssichere Kommunikation pro Branche/Firma
3. **Sales Stories** - Elevator Pitches, Produktgeschichten, Einwandbehandlung
4. **Vertical Presets** - Fertige Konfigurationen pro MLM-Firma

## Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BRAND STORYBOOK SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📖 COMPANY STORIES                                                        │
│  ─────────────────                                                         │
│  • Elevator Pitch (30s, 1min, 2min Versionen)                              │
│  • Founder Story, Why Story, Product Stories                               │
│  • Für verschiedene Zielgruppen (Consumer, Pro, Skeptiker)                 │
│  • CHIEF kann passende Story für Situation wählen                          │
│                                                                             │
│  📦 COMPANY PRODUCTS                                                       │
│  ─────────────────                                                         │
│  • Alle Produkte mit Beschreibung, Benefits, Science                       │
│  • "How to explain" für CHIEF                                              │
│  • Common Objections pro Produkt                                           │
│                                                                             │
│  🛡️ COMPLIANCE GUARDRAILS                                                  │
│  ───────────────────────                                                   │
│  • Heilversprechen verhindern                                              │
│  • Einkommensgarantien blockieren                                          │
│  • Richtige Formulierungen vorschlagen                                     │
│  • Real-time Check vor Senden                                              │
│                                                                             │
│  🔄 STORYBOOK IMPORT                                                       │
│  ─────────────────────                                                     │
│  • PDF hochladen → Claude extrahiert                                       │
│  • Stories, Products, Guardrails automatisch                               │
│  • Für jede MLM-Firma nutzbar                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Datenbank-Schema

### Tabellen

- `company_stories` - Sales Stories und Elevator Pitches
- `company_products` - Produkt-Katalog mit CHIEF-optimierten Beschreibungen
- `company_guardrails` - Compliance-Regeln und verbotene Formulierungen
- `storybook_imports` - Import-Log für Brand-Storybooks

### Enums

```sql
-- Story Types
CREATE TYPE story_type AS ENUM (
    'elevator_pitch',    -- 30 Sekunden
    'short_story',       -- 1-2 Minuten
    'founder_story',     -- Gründer-Geschichte
    'product_story',     -- Produkt-Erklärung
    'why_story',         -- Warum dieses Unternehmen?
    'objection_story',   -- Einwand-Antwort als Story
    'success_story',     -- Erfolgsgeschichte
    'science_story'      -- Wissenschaft erklärt
);

-- Zielgruppen
CREATE TYPE story_audience AS ENUM (
    'consumer',          -- Endkunde
    'business_partner',  -- Potentieller Partner
    'health_professional', -- Arzt/Therapeut
    'skeptic',           -- Skeptiker/Kritiker
    'warm_contact',      -- Warmer Kontakt
    'cold_contact'       -- Kalter Kontakt
);

-- Guardrail Severity
CREATE TYPE guardrail_severity AS ENUM (
    'block',    -- Komplett verhindern
    'warn',     -- Warnen, aber erlauben
    'suggest'   -- Bessere Alternative vorschlagen
);
```

## API Endpoints

### Import

```bash
# PDF Storybook importieren
POST /api/v1/storybook/import/{company_id}
Content-Type: multipart/form-data
file: <PDF oder DOCX>

# Seed Data importieren (z.B. Zinzino)
POST /api/v1/storybook/import/{company_id}/seed
{
    "seed_type": "zinzino"
}
```

### Query

```bash
# Stories abrufen
GET /api/v1/storybook/stories/{company_id}
GET /api/v1/storybook/stories/{company_id}?story_type=elevator_pitch&audience=consumer

# Story für Kontext finden
GET /api/v1/storybook/stories/{company_id}/for-context?context_type=intro&audience=consumer

# Produkte abrufen
GET /api/v1/storybook/products/{company_id}
GET /api/v1/storybook/products/{company_id}/{product_slug}

# Guardrails abrufen
GET /api/v1/storybook/guardrails/{company_id}

# Kompletten Company-Kontext für CHIEF
GET /api/v1/storybook/context/{company_id}
```

### Compliance Check

```bash
# Text auf Compliance prüfen
POST /api/v1/storybook/compliance/check
{
    "text": "BalanceOil heilt Entzündungen garantiert!",
    "company_id": "uuid-here"
}

# Response:
{
    "compliant": false,
    "violations": [...],
    "has_blockers": true
}

# Verbesserungsvorschläge
POST /api/v1/storybook/compliance/suggest
{
    "text": "...",
    "company_id": "uuid-here"
}
```

## CHIEF Integration

### Company Mode Prompt

```python
from app.config.prompts import inject_company_context

# Base Prompt mit Company-Kontext erweitern
enhanced_prompt = inject_company_context(
    base_prompt=CHIEF_SYSTEM_PROMPT,
    company_id="uuid-here",
    db_session=db
)
```

### Stories in Kontext

```python
from app.config.prompts import get_company_stories_context

# Relevante Stories für CHIEF holen
stories_context = get_company_stories_context(
    company_id="uuid-here",
    db_session=db,
    story_type="elevator_pitch",
    audience="consumer"
)
```

### Compliance Check vor Senden

```python
from app.config.prompts import check_message_compliance

# Nachricht prüfen bevor sie gesendet wird
result = check_message_compliance(
    message="...",
    company_id="uuid-here",
    db_session=db
)

if result["has_blockers"]:
    # Nachricht nicht senden
    pass
```

## Zinzino Beispiel

Zinzino ist das erste vollständige Beispiel mit:

- **6 Stories**: Elevator Pitch, 2-Min Story, Therapeuten-Story, Business-Story, Founder Story, Einwand-Story
- **4 Produkte**: BalanceTest, BalanceOil+, ZinoBiotic+, Health Protocol
- **5 Guardrails**: Heilversprechen, Einkommensgarantien, Medizinische Beratung, Wissenschaftliche Übertreibung, Partner vs. Mitarbeiter

### Quick Start

```bash
# 1. Migration ausführen
# In Supabase SQL Editor die Datei ausführen:
# backend/migrations/20251206_brand_storybook.sql

# 2. Zinzino Company anlegen (falls nicht vorhanden)
curl -X POST http://localhost:8000/api/v1/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "Zinzino", "slug": "zinzino", "vertical": "network_marketing"}'

# 3. Zinzino Seed Data importieren
curl -X POST "http://localhost:8000/api/v1/storybook/import/{company_id}/seed" \
  -H "Content-Type: application/json" \
  -d '{"seed_type": "zinzino"}'

# 4. Stories abrufen
curl "http://localhost:8000/api/v1/storybook/stories/{company_id}"

# 5. Compliance Check testen
curl -X POST http://localhost:8000/api/v1/storybook/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "BalanceOil heilt Entzündungen garantiert!",
    "company_id": "{company_id}"
  }'
# Expected: {compliant: false, violations: [...], has_blockers: true}
```

## Weitere Companies hinzufügen

### Seed Data erstellen

```python
# backend/app/seeds/herbalife_seed.py

HERBALIFE_COMPANY = {
    "name": "Herbalife",
    "slug": "herbalife",
    "vertical": "network_marketing",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#00A94F",
        "country": "US",
        "founded_year": 1980,
        "product_focus": ["nutrition", "weight_management", "fitness"],
        "tagline": "Nutrition for a Better Life",
    }
}

HERBALIFE_STORIES = [
    # ... Stories definieren
]

HERBALIFE_PRODUCTS = [
    # ... Produkte definieren
]

HERBALIFE_GUARDRAILS = [
    # ... Guardrails definieren
]

def get_herbalife_seed_data():
    return {
        "company": HERBALIFE_COMPANY,
        "stories": HERBALIFE_STORIES,
        "products": HERBALIFE_PRODUCTS,
        "guardrails": HERBALIFE_GUARDRAILS,
    }
```

### PDF Import nutzen

Alternativ kann ein Brand-Storybook als PDF hochgeladen werden. Das System extrahiert automatisch:

1. Stories (Elevator Pitches, Produktgeschichten, etc.)
2. Produkte (Name, Beschreibung, Benefits)
3. Compliance-Regeln (Was darf nicht gesagt werden)

## Dateien

```
backend/
├── migrations/
│   └── 20251206_brand_storybook.sql    # Database Schema
├── app/
│   ├── seeds/
│   │   ├── __init__.py
│   │   └── zinzino_seed.py             # Zinzino Seed Data
│   ├── services/
│   │   └── storybook/
│   │       ├── __init__.py
│   │       └── service.py              # Storybook Service
│   ├── config/
│   │   └── prompts/
│   │       └── chief_company_mode.py   # CHIEF Integration
│   ├── api/
│   │   ├── routes/
│   │   │   └── storybook.py            # API Routes
│   │   └── schemas/
│   │       └── storybook.py            # Pydantic Schemas
│   └── utils/
│       ├── __init__.py
│       ├── pdf.py                      # PDF Extraction
│       └── docx.py                     # DOCX Extraction
```

## Nächste Schritte

1. **Weitere Seed Data**: Herbalife, LR, PM-International, Amway
2. **Frontend UI**: Story-Browser, Compliance-Checker, Import-Wizard
3. **CHIEF Deep Integration**: Automatische Story-Auswahl basierend auf Kontext
4. **Analytics**: Welche Stories funktionieren am besten?

