# 🔄 INFO-PAKET FÜR GEMINI: BLOCKER-AUFLÖSUNG

## 🎯 **ANFORDERUNG ERHALTEN:**
- Datenbank-Schema (leads + activities Tabellen)
- Design Tokens & Color Palette (Web + Mobile)

## 📊 **DATENBANK-SCHEMA: LEADS-TABELLE**

### **Haupt-Tabelle: `public.leads`**
```sql
-- Basis Lead-Daten (bereits vorhanden)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- FK zu auth.users
    contact_id UUID, -- Optional FK zu leads (für Duplikate)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Basis-Informationen
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(200),

    -- Status & Priorität
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, won, lost, nurture
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    temperature VARCHAR(10), -- hot, warm, cold

    -- Scoring
    p_score NUMERIC(5,2), -- 0-100 Predictive Score
    p_score_trend TEXT, -- 'up', 'down', 'flat'
    last_scored_at TIMESTAMPTZ,

    -- Lead Source
    source_type VARCHAR(50), -- linkedin, facebook, instagram, web_form, manual
    source_campaign VARCHAR(200),
    acquisition_cost DECIMAL(10,2),

    -- Follow-up
    next_action_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    follow_up_count INTEGER DEFAULT 0,

    -- Zusätzliche Felder
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb
);
```

### **Erweiterte Tabellen (aus Migration)**

#### **`public.lead_verifications`** - Echtheits-Prüfung
```sql
CREATE TABLE public.lead_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Scores (0-100)
    v_score DECIMAL(5,2) DEFAULT 0, -- Composite Verification Score
    email_score DECIMAL(5,2) DEFAULT 0,
    phone_score DECIMAL(5,2) DEFAULT 0,
    social_score DECIMAL(5,2) DEFAULT 0,

    -- Validation Results
    email_valid BOOLEAN DEFAULT NULL,
    phone_valid BOOLEAN DEFAULT NULL,
    social_profiles_found INTEGER DEFAULT 0,

    -- Status
    is_duplicate BOOLEAN DEFAULT FALSE,
    verification_source VARCHAR(50),
    last_full_verification_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **`public.lead_enrichments`** - Datenanreicherung
```sql
CREATE TABLE public.lead_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Scores
    e_score DECIMAL(5,2) DEFAULT 0, -- Enrichment Score
    icp_match_score DECIMAL(5,2) DEFAULT 0, -- Ideal Customer Profile Match

    -- Company Data
    company_name VARCHAR(200),
    company_industry VARCHAR(100),
    company_size_range VARCHAR(50), -- 1-10, 11-50, 51-200, 201-500, 500+
    company_revenue_range VARCHAR(50),

    -- Contact Person
    person_title VARCHAR(200),
    person_seniority VARCHAR(50), -- C-Level, VP, Director, Manager
    person_linkedin_url VARCHAR(500),

    -- Tech Stack
    tech_stack JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **`public.lead_intents`** - Kaufabsicht
```sql
CREATE TABLE public.lead_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Scores
    i_score DECIMAL(5,2) DEFAULT 0, -- Intent Score

    -- Web Activity
    website_visits_30d INTEGER DEFAULT 0,
    pricing_page_visits INTEGER DEFAULT 0,
    demo_page_visits INTEGER DEFAULT 0,

    -- Direct Signals
    requested_demo BOOLEAN DEFAULT FALSE,
    asked_about_pricing BOOLEAN DEFAULT FALSE,
    intent_stage VARCHAR(30), -- awareness, consideration, decision

    last_activity_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **KEINE `activities` Tabelle** ❌
- Es gibt keine separate `activities`-Tabelle
- Activities werden in verschiedenen Tabellen gespeichert:
  - `web_tracking_events` - Website-Aktivitäten
  - `social_engagement_events` - Social Media Interaktionen
  - `dm_messages` - DM-Konversationen (IDPS System)

---

## 🎨 **DESIGN TOKENS & COLOR PALETTE**

### **WEB THEME** (`src/components/theme.js`)

#### **Colors:**
```javascript
export const COLORS = {
  // Primary Brand Colors
  primary: '#3b82f6',      // Blue
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  
  // Secondary Colors
  secondary: '#8b5cf6',    // Purple
  secondaryLight: '#a78bfa',
  secondaryDark: '#7c3aed',
  
  // Accent Colors
  accent: '#06b6d4',       // Cyan (dein Hauptbrand)
  accentLight: '#22d3ee',
  lime: '#a3e635',         // Lime for CTAs
  
  // Status Colors
  success: '#10b981',
  successBg: '#d1fae5',
  
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  
  error: '#ef4444',
  errorBg: '#fee2e2',
  
  // Background Colors
  background: '#f8fafc',
  backgroundDark: '#0f172a',
  card: '#ffffff',
  cardDark: '#1e293b',
  
  // Text Colors
  text: '#1e293b',
  textSecondary: '#64748b',
  textWhite: '#ffffff',
};
```

#### **Spacing:**
```javascript
export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32
};
```

#### **Typography:**
```javascript
export const TYPOGRAPHY = {
  h1: { fontSize: '32px', fontWeight: 'bold', lineHeight: '40px' },
  h2: { fontSize: '24px', fontWeight: 'bold', lineHeight: '32px' },
  h3: { fontSize: '20px', fontWeight: '600', lineHeight: '28px' },
  body: { fontSize: '16px', fontWeight: 'normal', lineHeight: '24px' },
  button: { fontSize: '16px', fontWeight: '600', lineHeight: '24px' },
};
```

### **MOBILE THEME** (`closerclub-mobile/src/config/theme.ts`)

#### **Colors (Dark Glassmorphism):**
```typescript
export const COLORS = {
  // Primary (Cyan - konsistent mit Web)
  primary: '#06b6d4', // Cyan
  primaryDark: '#0891b2',
  primaryLight: '#22d3ee',
  
  // Background (Dark Theme)
  background: '#0f172a', // Slate-900
  backgroundLight: '#1e293b', // Slate-800
  surface: '#1e293b',
  surfaceLight: '#334155',
  
  // Glass Effects
  glass: 'rgba(30, 41, 59, 0.7)',
  glassLight: 'rgba(51, 65, 85, 0.5)',
  
  // Text
  text: '#f8fafc', // Slate-50
  textSecondary: '#cbd5e1', // Slate-300
  
  // Status Colors
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};
```

#### **Shadows (für React Native):**
```typescript
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  glow: {
    shadowColor: '#06b6d4', // Cyan Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
};
```

---

## 🔗 **WICHTIGE INTEGRATIONSPUNKTE**

### **API Endpoints (bereits verfügbar):**
- `GET /api/leads/` - Lead Liste
- `GET /api/leads/{id}` - Einzelner Lead
- `POST /api/leads/` - Lead erstellen
- `PUT /api/leads/{id}` - Lead aktualisieren
- `GET /api/leads/{id}/activities` - Lead Aktivitäten

### **Real-time Subscriptions:**
```typescript
// Supabase Real-time für Live-Updates
const subscription = supabase
  .channel('leads')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leads'
  }, callback)
  .subscribe();
```

### **TypeScript Types (empfohlen):**
```typescript
interface Lead {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  status: string;
  priority: string;
  temperature?: string;
  p_score?: number;
  p_score_trend?: 'up' | 'down' | 'flat';
  source_type?: string;
  next_action_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🚀 **JETZT KANNST DU WEITERARBEITEN!**

Du hast jetzt alle nötigen Informationen:
- ✅ Komplettes Datenbank-Schema
- ✅ Design Tokens für Web & Mobile
- ✅ API Endpoints
- ✅ TypeScript Types

**Fahre fort mit deiner Mobile App Integration!** 🎯

Die wichtigsten Tabellen für dich:
- `leads` (Basis-Daten)
- `lead_verifications` (Echtheit)
- `lead_enrichments` (Unternehmensdaten)
- `lead_intents` (Kaufabsicht)

Benutze die Cyan-Farbe (#06b6d4) als Primary Color für Konsistenz!
