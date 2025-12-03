# 🚀 Sales Flow AI - Power-Up System

> **Technische Dokumentation** | Version 1.0  
> Company Intelligence, Objection Library, Success Stories, Liability Rules & AI Prompts

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Architektur](#-architektur)
3. [Datenbank-Tabellen](#-datenbank-tabellen)
4. [Company Intelligence](#-company-intelligence)
5. [Objection Library](#-objection-library)
6. [Success Stories](#-success-stories)
7. [Liability Rules (Shield)](#-liability-rules-shield)
8. [AI Prompts](#-ai-prompts)
9. [Nutzung & Beispiele](#-nutzung--beispiele)

---

## 🎯 Überblick

Das **Power-Up System** ist das Wissens-Backend von Sales Flow AI und enthält:

- ✅ **Company Intelligence**: 10 MLM/Direktvertrieb-Unternehmen mit Sales-Daten
- ✅ **Objection Library**: 20+ Einwände mit DISG-spezifischen Antworten
- ✅ **Success Stories**: 10 Erfolgsgeschichten für Social Proof
- ✅ **Liability Rules**: 15 rechtliche Trigger-Wörter mit sicheren Alternativen
- ✅ **AI Prompts**: 10 spezialisierte Prompt-Templates für verschiedene Module

### Kernfunktion
Das System liefert kontextbezogene Verkaufsintelligenz für den KI-Coach CHIEF.

---

## 🏗 Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    POWER-UP DATENBANK                            │
├─────────────────────────────────────────────────────────────────┤
│  company_intelligence    → Firmendaten für 10 MLM-Companies     │
│  objection_library       → 20+ Einwände mit 3 Antwort-Strategien│
│  success_stories         → 10 Social-Proof Geschichten          │
│  liability_rules         → 15 rechtliche Compliance-Regeln      │
│  ai_prompts              → 10 spezialisierte Prompt-Templates   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AI COACH (CHIEF)                         │
├─────────────────────────────────────────────────────────────────┤
│  - Ruft Company Intelligence für kontextbezogene Antworten ab  │
│  - Nutzt Objection Library für Einwand-Behandlung               │
│  - Integriert Success Stories als Social Proof                   │
│  - Prüft Aussagen gegen Liability Rules                          │
│  - Verwendet AI Prompts für strukturierte Antworten              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄 Datenbank-Tabellen

**Migration:** `003_power_up_system.sql`

### Übersicht aller Tabellen

| Tabelle | Beschreibung | Datensätze |
|---------|--------------|------------|
| `company_intelligence` | Firmendaten & Sales-Intelligence | 10 Companies |
| `objection_library` | Einwände mit Antworten | 20+ Einwände |
| `success_stories` | Erfolgsgeschichten | 10 Stories |
| `liability_rules` | Rechtliche Trigger-Wörter | 15 Regeln |
| `ai_prompts` | Prompt-Templates | 10 Prompts |

### Indexes für Performance

```sql
CREATE INDEX idx_company_intelligence_name ON company_intelligence(company_name);
CREATE INDEX idx_company_intelligence_vertical ON company_intelligence(vertical);
CREATE INDEX idx_objection_library_category ON objection_library(objection_category);
CREATE INDEX idx_objection_library_vertical ON objection_library(vertical);
CREATE INDEX idx_success_stories_company ON success_stories(company_name);
CREATE INDEX idx_liability_rules_trigger ON liability_rules(trigger_word);
```

---

## 🏢 Company Intelligence

### Schema

```sql
CREATE TABLE company_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  vertical TEXT DEFAULT 'network_marketing',
  
  -- Basis-Info
  founded_year INTEGER,
  headquarters TEXT,
  website TEXT,
  logo_url TEXT,
  
  -- Produkte
  product_categories TEXT[],
  flagship_products TEXT[],
  price_range TEXT,
  
  -- Vergütungsplan
  comp_plan_type TEXT,
  entry_cost_min NUMERIC,
  entry_cost_max NUMERIC,
  monthly_autoship NUMERIC,
  
  -- Einwände & Antworten (JSONB für Flexibilität)
  common_objections JSONB DEFAULT '{}',
  unique_selling_points TEXT[],
  competitor_advantages JSONB DEFAULT '{}',
  
  -- Sales Intelligence
  best_opener TEXT,
  best_closing_technique TEXT,
  ideal_customer_profile TEXT,
  red_flags TEXT[],
  golden_questions TEXT[],
  
  -- Performance Data
  avg_closing_rate NUMERIC DEFAULT 0.15,
  avg_deal_size NUMERIC,
  best_contact_times TEXT[],
  best_channels TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enthaltene Companies (10)

| Company | Vertical | Produkte | Closing-Rate |
|---------|----------|----------|--------------|
| **Zinzino** | Omega-3, Nahrungsergänzung | BalanceOil, Xtend | 22% |
| **Herbalife** | Gewichtsmanagement | Formula 1 Shake | 18% |
| **PM International** | Nahrungsergänzung | FitLine PowerCocktail | 20% |
| **doTERRA** | Ätherische Öle | Lavendel, On Guard | 25% |
| **Forever Living** | Aloe Vera | Forever Aloe Vera Gel | 19% |
| **Juice Plus** | Obst-/Gemüse-Kapseln | Juice Plus+ Kapseln | 21% |
| **Nu Skin** | Anti-Aging | ageLOC LumiSpa | 15% |
| **Lifewave** | Phototherapie-Pflaster | X39 Stammzellen-Patch | 18% |
| **Vorwerk/Thermomix** | Küchengeräte | Thermomix TM6 | 28% |
| **Amway** | Nahrungsergänzung, Haushalt | Nutrilite Double X | 17% |

### Beispiel: Zinzino Datensatz

```sql
SELECT * FROM company_intelligence WHERE company_name = 'Zinzino';

-- Liefert:
{
  "company_name": "Zinzino",
  "founded_year": 2005,
  "headquarters": "Göteborg, Schweden",
  "flagship_products": ["BalanceOil", "Xtend", "Zinobiotic", "Skin Serum"],
  "unique_selling_points": [
    "Bluttest vor/nach (BalanceTest)",
    "Wissenschaftlich fundiert",
    "Personalisiert",
    "Sichtbare Ergebnisse nach 120 Tagen"
  ],
  "best_opener": "Wusstest du, dass 97% der Menschen ein unausgeglichenes Omega-Verhältnis haben?",
  "best_closing_technique": "Der BalanceTest zeigt dir schwarz auf weiß, ob es wirkt. Wenn nicht - Geld zurück.",
  "common_objections": {
    "zu teuer": "Der BalanceTest allein kostet beim Arzt 200€. Bei uns ist er inklusive.",
    "MLM Skepsis": "Verstehe ich. Aber schau - das Produkt funktioniert ob du es verkaufst oder nicht.",
    "keine Zeit": "Der Test dauert 2 Minuten Zuhause. Die Kapseln 10 Sekunden am Tag."
  },
  "avg_closing_rate": 0.22
}
```

---

## 🧠 Objection Library

### Schema

```sql
CREATE TABLE objection_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_text TEXT NOT NULL,
  objection_category TEXT NOT NULL,
  severity INTEGER DEFAULT 5,
  
  -- 3 Antwort-Strategien
  response_logical TEXT,
  response_emotional TEXT,
  response_provocative TEXT,
  
  -- DISG-spezifische Antworten
  response_for_d TEXT,  -- Dominant
  response_for_i TEXT,  -- Initiativ
  response_for_s TEXT,  -- Stetig
  response_for_g TEXT,  -- Gewissenhaft
  
  -- Follow-up
  follow_up_question TEXT,
  bridge_to_close TEXT,
  
  -- Meta
  success_rate NUMERIC DEFAULT 0.5,
  times_used INTEGER DEFAULT 0,
  vertical TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Einwand-Kategorien

| Kategorie | Beschreibung | Beispiele |
|-----------|--------------|-----------|
| `price` | Preis-Einwände | "Das ist mir zu teuer" |
| `stall` | Verzögerungstaktik | "Ich überlege es mir", "Muss mit Partner sprechen" |
| `time` | Zeit-Einwände | "Ich habe keine Zeit" |
| `mlm_stigma` | MLM-Vorurteile | "Das ist doch ein Schneeballsystem" |
| `limiting_belief` | Glaubenssätze | "Bei mir funktioniert sowas nicht" |
| `third_party` | Dritte-Person-Einwände | "Ich kenne jemanden bei dem das nicht funktioniert hat" |
| `business_objection` | Business-Einwände | "Ich will keine Produkte verkaufen" |
| `no_need` | Kein Bedarf | "Ich habe schon alles was ich brauche" |
| `skepticism` | Skepsis | "Das glaube ich nicht" |
| `authority` | Autoritäts-Einwände | "Mein Arzt hat mir davon abgeraten" |

### DISG-Persönlichkeitstypen

| Typ | Bezeichnung | Kommunikationsstil |
|-----|-------------|-------------------|
| **D** | Dominant | Direkt, faktenbasiert, ergebnisorientiert |
| **I** | Initiativ | Enthusiastisch, emotional, beziehungsorientiert |
| **S** | Stetig | Geduldig, verständnisvoll, sicherheitsorientiert |
| **G** | Gewissenhaft | Analytisch, detailliert, präzise |

### Beispiel: Preis-Einwand

```sql
SELECT * FROM objection_library WHERE objection_text LIKE '%teuer%';

-- Liefert:
{
  "objection_text": "Das ist mir zu teuer",
  "objection_category": "price",
  "severity": 7,
  
  "response_logical": "Verstehe ich. Lass uns mal rechnen: Was kostet dich das Problem das du JETZT hast?",
  "response_emotional": "Ich verstehe das Gefühl. Aber was ist dir deine Gesundheit wirklich wert?",
  "response_provocative": "Zu teuer im Vergleich wozu? Zu deiner Gesundheit? Zu den Chancen die du verpasst?",
  
  "response_for_d": "Hier sind die Zahlen: ROI ist nachweisbar in X Wochen.",
  "response_for_i": "Ich weiß, Geld ist ein Thema. Aber stell dir vor wie es sich anfühlt wenn das Problem gelöst ist!",
  "response_for_s": "Ich verstehe deine Bedenken total. Viele meiner besten Kunden hatten die am Anfang auch.",
  "response_for_g": "Lass mich dir die genaue Kosten-Nutzen-Analyse zeigen. Mit allen Zahlen, transparent.",
  
  "follow_up_question": "Wenn Geld keine Rolle spielen würde - wärst du dabei?",
  "bridge_to_close": "Lass uns einen Weg finden der für dein Budget passt."
}
```

---

## 📖 Success Stories

### Schema

```sql
CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  person_name TEXT,
  person_background TEXT,
  
  -- Story
  before_situation TEXT,
  turning_point TEXT,
  transformation TEXT,
  result TEXT,
  timeline TEXT,
  
  -- Verwendung
  use_case TEXT,
  best_for_objection TEXT,
  emotional_hook TEXT,
  
  -- Validierung
  is_verified BOOLEAN DEFAULT false,
  source_url TEXT,
  vertical TEXT DEFAULT 'network_marketing',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enthaltene Stories (10)

| Company | Person | Story-Hook | Timeline |
|---------|--------|------------|----------|
| Zinzino | Maria K., 43 | Alleinerziehende Mutter mit neuer Energie | 6 Monate |
| Herbalife | Thomas R., 52 | 23kg abgenommen, keine Blutdrucktabletten | 8 Monate |
| PM International | Sandra M., 38 | Von Burnout zu Work-Life-Balance | 3 Monate |
| doTERRA | Lisa S., 29 | Immunsystem gestärkt, weniger krank | 12 Monate |
| Forever Living | Helmut G., 61 | Verdauungsprobleme nach 20 Jahren gelöst | 2 Monate |
| Juice Plus | Anna B., 35 | Kinder bekommen endlich Nährstoffe | 4 Monate |
| Nu Skin | Petra W., 48 | Sieht 10 Jahre jünger aus ohne OP | 6 Wochen |
| Lifewave | Michael K., 55 | Chronische Knieschmerzen weg, joggt wieder | 1 Woche |
| Thermomix | Sabine L., 42 | Familie isst endlich zusammen | Sofort |
| Amway | Frank H., 50 | Skeptiker durch eigene Erfahrung überzeugt | 30 Tage |

### Beispiel-Abfrage

```sql
-- Finde Story für "funktioniert nicht"-Einwand
SELECT * FROM success_stories 
WHERE best_for_objection = 'funktioniert das wirklich';

-- Liefert: Maria K. von Zinzino
```

---

## 🛡️ Liability Rules (Shield)

### Schema

```sql
CREATE TABLE liability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_word TEXT NOT NULL,
  trigger_pattern TEXT,
  warning_message TEXT NOT NULL,
  safe_alternative TEXT NOT NULL,
  category TEXT,
  severity TEXT DEFAULT 'warning',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Severity-Levels

| Level | Beschreibung | Aktion |
|-------|--------------|--------|
| `info` | Hinweis | Gelbe Warnung |
| `warning` | Warnung | Orange Warnung + Alternative |
| `critical` | Kritisch | Rote Warnung + Blockierung |

### Enthaltene Regeln (15)

| Trigger | Kategorie | Severity | Sichere Alternative |
|---------|-----------|----------|---------------------|
| `garantiert` | legal | warning | "In vielen Fällen...", "Erfahrungsgemäß..." |
| `heilt` | health | **critical** | "Kann unterstützen bei...", "Viele berichten von..." |
| `100%` | legal | warning | "In den meisten Fällen...", "Sehr hohe Erfolgsquote..." |
| `immer` | legal | info | "Häufig...", "In der Regel..." |
| `nie` | legal | info | "Selten...", "In den wenigsten Fällen..." |
| `Wundermittel` | legal | **critical** | Beschreibe konkrete, belegbare Vorteile |
| `nachgewiesen` | legal | warning | "Laut Studie XY...", "Laut Hersteller..." |
| `Arzt empfiehlt` | health | **critical** | "Viele Anwender berichten..." |
| `wissenschaftlich` | legal | warning | "Laut [Studie/Quelle]..." |
| `alle` | legal | info | "Viele...", "Die meisten..." |
| `sofort` | legal | info | "Schnell...", "Zeitnah..." |
| `reich` | income | **critical** | "Möglichkeit für Zusatzeinkommen..." |
| `passives Einkommen` | income | warning | Erkläre dass Aufbauarbeit nötig ist |
| `nebenbei` | income | warning | "Mit X Stunden pro Woche ist Y möglich..." |
| `ohne Arbeit` | income | **critical** | Jedes Einkommen erfordert Arbeit |

### Beispiel: Prüfung einer Aussage

```sql
-- Prüfe ob "heilt Krebs" problematisch ist
SELECT * FROM liability_rules 
WHERE 'heilt Krebs' ILIKE '%' || trigger_pattern || '%';

-- Liefert:
{
  "trigger_word": "heilt",
  "severity": "critical",
  "warning_message": "🚨 ACHTUNG: Heilversprechen sind in Deutschland VERBOTEN!",
  "safe_alternative": "Sage stattdessen: 'Kann unterstützen bei...' oder 'Viele berichten von...'"
}
```

---

## 🤖 AI Prompts

### Schema

```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enthaltene Prompts (10)

| Name | Kategorie | Beschreibung |
|------|-----------|--------------|
| `LIABILITY-SHIELD` | compliance | Prüft Aussagen auf rechtliche Probleme |
| `SCREENSHOT-REACTIVATOR` | lead_gen | Extrahiert Leads aus Screenshots |
| `OPPORTUNITY-RADAR` | lead_gen | Findet potenzielle Leads in der Umgebung |
| `SPEED-HUNTER-LOOP` | workflow | Schneller Lead-Workflow |
| `SOCIAL-LINK-GENERATOR` | tools | Erstellt Magic Links für Social Media |
| `PORTFOLIO-SCANNER` | analysis | Analysiert Lead-Listen auf Potenzial |
| `BATTLE-CARD` | competitive | Vergleichskarten gegen Konkurrenz |
| `FEUERLÖSCHER-LEAF` | de_escalation | De-Eskalation mit L.E.A.F. Methode |
| `VERHANDLUNGS-JUDO` | negotiation | Preis-Verteidigung & Verhandlungstaktiken |
| `CLIENT-INTAKE` | tools | Erstellt personalisierte Fragebögen |

### Beispiel: LIABILITY-SHIELD Prompt

```sql
SELECT prompt_template FROM ai_prompts WHERE name = 'LIABILITY-SHIELD';

-- Liefert:
'Du bist ein Compliance-Experte. Analysiere folgende Aussage auf rechtlich problematische Formulierungen:

AUSSAGE: {{user_message}}

Prüfe auf:
1. Heilversprechen (verboten in DE)
2. Einkommensgarantien (irreführend)
3. Absolute Aussagen ("garantiert", "100%", "immer")
4. Vergleichende Werbung ohne Beleg
5. Falsche Tatsachenbehauptungen

Antworte im Format:
RISIKO-LEVEL: [GRÜN/GELB/ROT]
PROBLEME: [Liste der Probleme]
SICHERE ALTERNATIVE: [Umformulierter Text]
BEGRÜNDUNG: [Kurze rechtliche Erklärung]'
```

---

## 🚀 Nutzung & Beispiele

### 1. Company Intelligence abrufen

```javascript
// Für KI-Coach Kontext
const getCompanyContext = async (companyName) => {
  const { data } = await supabase
    .from('company_intelligence')
    .select('*')
    .eq('company_name', companyName)
    .single();
  
  return {
    opener: data.best_opener,
    closer: data.best_closing_technique,
    objections: data.common_objections,
    usps: data.unique_selling_points
  };
};
```

### 2. Einwand-Antwort holen

```javascript
// Mit DISG-Persönlichkeitstyp
const getObjectionResponse = async (objectionText, discType = 'd') => {
  const { data } = await supabase
    .from('objection_library')
    .select('*')
    .ilike('objection_text', `%${objectionText}%`)
    .limit(1);
  
  if (data[0]) {
    return data[0][`response_for_${discType}`] || data[0].response_logical;
  }
  return null;
};
```

### 3. Aussage auf Compliance prüfen

```javascript
const checkCompliance = async (statement) => {
  const { data: rules } = await supabase
    .from('liability_rules')
    .select('*')
    .eq('is_active', true);
  
  const violations = rules.filter(rule => 
    statement.toLowerCase().includes(rule.trigger_word.toLowerCase())
  );
  
  return {
    isCompliant: violations.length === 0,
    violations: violations.map(v => ({
      word: v.trigger_word,
      severity: v.severity,
      warning: v.warning_message,
      alternative: v.safe_alternative
    }))
  };
};
```

### 4. Success Story für Einwand finden

```javascript
const getStoryForObjection = async (objection) => {
  const { data } = await supabase
    .from('success_stories')
    .select('*')
    .eq('best_for_objection', objection)
    .limit(1);
  
  return data[0] || null;
};
```

---

## 📊 Zusammenfassung

| Komponente | Datensätze | Hauptnutzen |
|------------|------------|-------------|
| Company Intelligence | 10 | Kontextbezogene Sales-Daten |
| Objection Library | 20+ | DISG-spezifische Einwand-Antworten |
| Success Stories | 10 | Social Proof für Sales-Gespräche |
| Liability Rules | 15 | Rechtliche Compliance |
| AI Prompts | 10 | Strukturierte KI-Antworten |

---

## 🔧 Extending this Module

### Neue Firma hinzufügen

1. **Datenbank**: Neue Row in `company_intelligence` Tabelle

```sql
INSERT INTO company_intelligence (
  company_name, founded_year, headquarters, website,
  product_categories, flagship_products, price_range,
  unique_selling_points, best_opener, best_closing_technique,
  common_objections, avg_closing_rate
) VALUES (
  'Neue Firma',
  2020,
  'Berlin, Deutschland',
  'https://neue-firma.de',
  ARRAY['Wellness', 'Nutrition'],
  ARRAY['Produkt A', 'Produkt B'],
  'premium',
  ARRAY['USP 1', 'USP 2', 'USP 3'],
  'Dein bester Opener hier...',
  'Deine beste Closing-Technik...',
  '{"zu teuer": "Antwort...", "keine Zeit": "Antwort..."}',
  0.20
);
```

2. **Objection Library erweitern**

```sql
INSERT INTO objection_library (
  objection_text, objection_category,
  response_logical, response_emotional, response_provocative,
  response_for_d, response_for_i, response_for_s, response_for_g,
  vertical
) VALUES (
  'Neuer Einwand', 'category',
  'Logische Antwort', 'Emotionale Antwort', 'Provokative Antwort',
  'Für D-Typ', 'Für I-Typ', 'Für S-Typ', 'Für G-Typ',
  'neue_firma'
);
```

3. **Success Stories hinzufügen**

```sql
INSERT INTO success_stories (
  company_name, person_name, person_background,
  before_situation, turning_point, transformation, result,
  timeline, use_case, best_for_objection, emotional_hook
) VALUES (
  'Neue Firma', 'Max M., 35',
  'Hintergrund der Person',
  'Vorher-Situation', 'Wendepunkt', 'Transformation', 'Ergebnis',
  '3 Monate', 'social_proof', 'funktioniert nicht',
  'Emotionaler Hook'
);
```

### Power-Ups per UI auswählbar machen

- Tags nach Branchen: `wellness`, `nutrition`, `cosmetics`, `financial`
- Dropdown mit Suchfunktion in der UI
- Favoriten-System für häufig genutzte Firmen

### Versionierung

Felder `version` und `last_trained_at` für AI-Updates:

```sql
ALTER TABLE company_intelligence ADD COLUMN version INT DEFAULT 1;
ALTER TABLE company_intelligence ADD COLUMN last_trained_at TIMESTAMPTZ;
```

### Checkliste für neue Firma

- [ ] `company_intelligence` Row erstellt
- [ ] `objection_library` Einträge für neue Firma (min. 5)
- [ ] `success_stories` hinzugefügt (min. 2)
- [ ] UI Dropdown getestet
- [ ] AI Coach mit Firmenkontext getestet

---

## 📅 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2024 | Initial mit 10 Companies, 20 Einwänden, 10 Stories, 15 Rules, 10 Prompts |

---

## 🔧 Extending this Module

### Neue Firma hinzufügen

**1. Datenbank: Neue Row in `company_intelligence` Tabelle**

```sql
INSERT INTO company_intelligence (
  name, 
  industry, 
  founded, 
  products, 
  usp,
  compensation_plan,
  common_objections,
  talking_points,
  compliance_notes,
  ai_context
) VALUES (
  'Neue Firma GmbH',
  'wellness',
  2020,
  '["Produkt A - Basispaket", "Produkt B - Premium", "Produkt C - Business Kit"]',
  'Einzigartiger Vorteil der neuen Firma...',
  'Binärplan mit 3 Legs, bis zu 20% Direktbonus...',
  '["Zu teuer", "Ist das MLM?", "Hab keine Zeit"]',
  '["Wissenschaftlich belegt", "Über 100.000 zufriedene Kunden"]',
  'Nicht als Medizinprodukt bewerben',
  'Neue Firma ist ein Wellness-Unternehmen mit Fokus auf...'
);
```

**2. Objection Library erweitern**

```sql
-- Firmen-spezifische Einwände hinzufügen
INSERT INTO objection_library (
  company_id, category, objection_text,
  response_d, response_i, response_s, response_c,
  effectiveness_score
)
SELECT 
  (SELECT id FROM company_intelligence WHERE name = 'Neue Firma GmbH'),
  'price',
  'Das ist mir zu teuer',
  'Direkt auf den Punkt: Was ist dein Budget?...',
  'Ich verstehe! Lass mich dir zeigen, wie andere...',
  'Kein Problem, lass uns gemeinsam schauen...',
  'Gute Frage! Hier sind die Zahlen im Detail...',
  0.75;
```

**3. Frontend: Company-Auswahl erweitern**

```javascript
// In PowerUpSelector.tsx oder Settings
const COMPANY_OPTIONS = [
  { value: 'zinzino', label: '🧪 Zinzino' },
  { value: 'neue_firma', label: '🆕 Neue Firma' },  // NEU
  // ...
];
```

**4. Versionierung aktualisieren**

```sql
UPDATE company_intelligence 
SET 
  version = version + 1,
  last_trained_at = NOW(),
  updated_at = NOW()
WHERE name = 'Neue Firma GmbH';
```

---

### Power-Ups per UI auswählbar machen

**Tags nach Branchen:**
```typescript
type IndustryTag = 
  | 'wellness'    // Gesundheit & Wellness
  | 'nutrition'   // Nahrungsergänzung
  | 'cosmetics'   // Kosmetik & Beauty
  | 'financial'   // Finanzdienstleistungen
  | 'tech'        // Technologie & Software
  | 'energy';     // Energie & Utilities
```

**Dropdown mit Suchfunktion:**
```jsx
<SearchableDropdown
  items={companies.map(c => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    tags: c.tags
  }))}
  onItemSelect={(item) => setSelectedCompany(item.id)}
  placeholder="Firma suchen..."
  filterBy={['name', 'industry', 'tags']}
/>
```

**Favoriten-System:**
```sql
CREATE TABLE user_favorite_companies (
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES company_intelligence(id),
  position INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, company_id)
);
```

---

### Checkliste für neue Firma

- [ ] `company_intelligence` Row erstellt
- [ ] `objection_library` Einträge für neue Firma (mind. 5)
- [ ] `success_stories` hinzugefügt (mind. 2)
- [ ] `liability_rules` geprüft/erweitert
- [ ] `ai_context` für CHIEF Coach geschrieben
- [ ] Frontend Dropdown aktualisiert
- [ ] UI getestet mit neuer Firma

---

> **Erstellt für Sales Flow AI** | Power-Up System für Company Intelligence & Sales Knowledge

