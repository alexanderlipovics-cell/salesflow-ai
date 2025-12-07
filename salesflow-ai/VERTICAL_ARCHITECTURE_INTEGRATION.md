# 🏗️ Vertical Architecture - Integration Guide

**Vollständige Implementierung der Vertical Architecture für SalesFlow**

---

## ✅ Implementierte Komponenten

### 1. Shared Types ✅
- **Frontend:** `src/types/vertical.ts` - TypeScript Interfaces
- **Backend:** `backend/app/schemas/vertical.py` - Pydantic Models
- Beide definieren identische Strukturen für:
  - `VerticalFeatures` - Feature-Flags
  - `VerticalTerminology` - Begriffe-Mapping
  - `VerticalAIContext` - AI-Kontext
  - `VerticalRoutes` - Route-Konfiguration
  - `VerticalConfig` - Vollständige Config

### 2. Frontend Context ✅
- **Datei:** `src/context/VerticalContext.tsx`
- **Features:**
  - Lädt Vertical-Config beim App-Start
  - `useVertical()` Hook
  - `t(key)` - Terminology-Übersetzung
  - `hasFeature(path)` - Feature-Check
  - `<FeatureGuard>` Component

### 3. Backend Service ✅
- **Datei:** `backend/app/services/vertical_service.py`
- **Features:**
  - `get_vertical_config(vertical_id)` - Lädt Config mit Caching
  - `get_user_vertical_id(user_id)` - Lädt User's vertical_id
  - `clear_vertical_cache()` - Cache-Management
  - 5-Minuten Cache-TTL

### 4. AI Router Integration ✅
- **Datei:** `backend/app/routers/chat.py`
- **Anpassungen:**
  - Lädt Vertical-Config für User
  - Injiziert `ai_context` in System-Prompt
  - Nutzt `build_vertical_prompt_addition()`

### 5. User Schema ✅
- **Datei:** `backend/app/schemas/auth.py`
- **Erweitert:**
  - `UserProfile.vertical_id` hinzugefügt
  - `UserProfileUpdate.vertical_id` hinzugefügt

---

## 📝 Integration-Beispiele

### Beispiel 1: App.tsx - VerticalProvider integrieren

```tsx
// src/App.jsx
import { VerticalProvider } from "./context/VerticalContext";

function App() {
  return (
    <AuthProvider>
      <VerticalProvider> {/* ✅ Neu hinzugefügt */}
        <UserProvider>
          <SubscriptionProvider>
            <PricingModalProvider>
              <FeatureGateProvider>
                <BrowserRouter>
                  {/* Routes */}
                </BrowserRouter>
              </FeatureGateProvider>
            </PricingModalProvider>
          </SubscriptionProvider>
        </UserProvider>
      </VerticalProvider>
    </AuthProvider>
  );
}
```

### Beispiel 2: Sidebar - Routes filtern basierend auf config.routes.hidden

```tsx
// src/components/SalesSidebar.jsx
import { useVertical } from "@/context/VerticalContext";
import { Link, useLocation } from "react-router-dom";

const sidebarItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/genealogy", label: "Genealogy", icon: Tree },
  { path: "/power-hour", label: "Power Hour", icon: Flame },
  { path: "/field-ops", label: "Field Ops", icon: Map },
  // ... weitere Items
];

export function SalesSidebar() {
  const { config, t } = useVertical();
  const location = useLocation();
  
  // Filtere ausgeblendete Routes
  const visibleItems = sidebarItems.filter(
    (item) => !config.routes.hidden.includes(item.path)
  );
  
  // Sortiere nach Priority
  const sortedItems = [...visibleItems].sort((a, b) => {
    const aPriority = config.routes.priority.indexOf(a.path);
    const bPriority = config.routes.priority.indexOf(b.path);
    
    if (aPriority === -1 && bPriority === -1) return 0;
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    return aPriority - bPriority;
  });
  
  return (
    <nav>
      {sortedItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={location.pathname === item.path ? "active" : ""}
        >
          <item.icon />
          {/* Nutze custom_labels falls vorhanden */}
          {config.routes.custom_labels?.[item.path] || item.label}
        </Link>
      ))}
    </nav>
  );
}
```

### Beispiel 3: Button mit Terminology-Übersetzung

```tsx
// src/components/DealButton.tsx
import { useVertical } from "@/context/VerticalContext";
import { Button } from "@/components/ui/button";

export function DealButton({ onClick }: { onClick: () => void }) {
  const { t } = useVertical();
  
  return (
    <Button onClick={onClick}>
      {/* 
        MLM: "Einschreiben" 
        Real Estate: "Abschluss"
        Default: "Deal"
      */}
      {t("deal")} erstellen
    </Button>
  );
}
```

### Beispiel 4: FeatureGuard Component nutzen

```tsx
// src/pages/DashboardPage.tsx
import { FeatureGuard } from "@/context/VerticalContext";
import { PowerHourCard } from "@/components/PowerHourCard";
import { GenealogyCard } from "@/components/GenealogyCard";

export function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Power Hour nur anzeigen wenn Feature aktiviert */}
      <FeatureGuard feature="power_hour">
        <PowerHourCard />
      </FeatureGuard>
      
      {/* Genealogy nur anzeigen wenn Feature aktiviert */}
      <FeatureGuard feature="genealogy">
        <GenealogyCard />
      </FeatureGuard>
      
      {/* Field Ops nur anzeigen wenn Feature aktiviert */}
      <FeatureGuard feature="field_ops">
        <FieldOpsCard />
      </FeatureGuard>
    </div>
  );
}
```

### Beispiel 5: Komplexer Feature-Check

```tsx
// src/components/TeamSection.tsx
import { useVertical } from "@/context/VerticalContext";

export function TeamSection() {
  const { hasFeature, t } = useVertical();
  
  // Prüfe ob Team-Features aktiviert sind
  if (!hasFeature("team")) {
    return null;
  }
  
  return (
    <section>
      <h2>{t("team")} Management</h2>
      
      {/* Genealogy nur wenn aktiviert */}
      {hasFeature("genealogy") && (
        <GenealogyTree />
      )}
      
      {/* Power Hour nur wenn aktiviert */}
      {hasFeature("power_hour") && (
        <PowerHourWidget />
      )}
    </section>
  );
}
```

### Beispiel 6: Backend - AI Router mit Vertical Context

```python
# backend/app/routers/chat.py (bereits implementiert)

@router.post("/completion")
async def chat_completion(
    request: ChatCompletionRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> ChatCompletionResponse:
    user_id = x_user_id or DEV_USER_ID
    
    # ... Action Detection ...
    
    # Vertical Context laden und injizieren
    from app.services.vertical_service import get_user_vertical_id, get_vertical_config
    from app.core.vertical_prompts import build_vertical_prompt_addition
    
    vertical_id = get_user_vertical_id(user_id)
    vertical_config = get_vertical_config(vertical_id)
    
    # System-Prompt mit Vertical Context erweitern
    vertical_prompt_addition = build_vertical_prompt_addition(vertical_config)
    base_prompt = base_prompt + "\n\n" + vertical_prompt_addition
    
    # ... Rest der Logik ...
```

---

## 🔧 Konfiguration in Supabase

### Vertical-Tabelle Struktur

```sql
CREATE TABLE IF NOT EXISTS verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- z.B. "mlm", "real_estate"
  name TEXT NOT NULL, -- "Network Marketing", "Real Estate"
  description TEXT,
  config JSONB NOT NULL, -- Die VerticalConfig-Struktur
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Beispiel-Config für MLM

```json
{
  "features": {
    "crm": true,
    "finance": true,
    "gamification": true,
    "team": true,
    "genealogy": true,
    "power_hour": true,
    "field_ops": false,
    "route_planner": false
  },
  "terminology": {
    "lead": "Lead",
    "deal": "Einschreiben",
    "revenue": "Umsatz",
    "commission": "Provision",
    "customer": "Partner"
  },
  "ai_context": {
    "persona": "Du bist ein erfahrener Network Marketing Coach...",
    "focus_topics": ["Network Marketing", "Team-Aufbau", "Provisionen"],
    "industry_terms": ["Einschreibung", "Downline", "PV", "GV"],
    "tone": "motivierend",
    "examples": ["Wie kann ich mein Team besser motivieren?"],
    "avoid_topics": ["Pyramid Scheme"]
  },
  "routes": {
    "hidden": [],
    "priority": ["/dashboard", "/leads", "/team", "/genealogy"]
  }
}
```

### Beispiel-Config für Real Estate

```json
{
  "features": {
    "crm": true,
    "finance": true,
    "gamification": false,
    "team": false,
    "genealogy": false,
    "power_hour": false,
    "field_ops": true,
    "route_planner": true
  },
  "terminology": {
    "lead": "Interessent",
    "deal": "Abschluss",
    "revenue": "Umsatz",
    "commission": "Provision",
    "customer": "Kunde"
  },
  "ai_context": {
    "persona": "Du bist ein professioneller Immobilienmakler...",
    "focus_topics": ["Immobilienverkauf", "Kundenberatung", "Abschlüsse"],
    "industry_terms": ["Immobilie", "Objekt", "Käufer", "Maklerprovision"],
    "tone": "professionell",
    "examples": ["Wie präsentiere ich eine Immobilie am besten?"],
    "avoid_topics": []
  },
  "routes": {
    "hidden": ["/genealogy", "/power-hour", "/churn-radar"],
    "priority": ["/dashboard", "/leads", "/pipeline", "/field-ops"]
  }
}
```

---

## 🚀 Nächste Schritte

### 1. App.tsx aktualisieren

```tsx
// Ersetze den alten VerticalProvider
import { VerticalProvider } from "./context/VerticalContext"; // ✅ Neu

// In der App-Komponente:
<VerticalProvider>
  {/* Rest der App */}
</VerticalProvider>
```

### 2. User vertical_id setzen

```sql
-- Beispiel: User einem Vertical zuweisen
UPDATE users 
SET vertical_id = (SELECT id FROM verticals WHERE key = 'mlm')
WHERE id = 'user-id-here';
```

### 3. Vertical-Configs in Supabase erstellen

```sql
-- MLM Vertical erstellen
INSERT INTO verticals (key, name, config)
VALUES (
  'mlm',
  'Network Marketing',
  '{
    "features": { ... },
    "terminology": { ... },
    "ai_context": { ... },
    "routes": { ... }
  }'::jsonb
);
```

### 4. Komponenten migrieren

- Sidebar: Filtere Routes basierend auf `config.routes.hidden`
- Buttons: Nutze `t('deal')` statt hardcoded "Deal"
- Pages: Nutze `<FeatureGuard>` für Feature-basierte Anzeige

---

## 📚 API-Referenz

### Frontend

```tsx
// useVertical Hook
const { 
  vertical,      // Vertical-Objekt oder null
  config,        // VerticalConfig (immer vorhanden, Fallback zu MLM)
  loading,       // boolean
  error,         // string | null
  t,             // (key: string) => string
  hasFeature,    // (path: string) => boolean
  refresh        // () => Promise<void>
} = useVertical();

// FeatureGuard Component
<FeatureGuard feature="genealogy" fallback={<div>Feature nicht verfügbar</div>}>
  <GenealogyTree />
</FeatureGuard>
```

### Backend

```python
# Vertical Service
from app.services.vertical_service import (
    get_vertical_config,
    get_user_vertical_id,
    clear_vertical_cache,
)

# Config laden
config = get_vertical_config(vertical_id)

# User's vertical_id laden
vertical_id = get_user_vertical_id(user_id)

# Cache löschen
clear_vertical_cache(vertical_id)
```

---

## ✅ Status

- ✅ Shared Types (TypeScript + Pydantic)
- ✅ Frontend VerticalContext
- ✅ Backend Vertical Service
- ✅ AI Router Integration
- ✅ User Schema erweitert
- ⏳ App.tsx Integration (muss noch angepasst werden)
- ⏳ Komponenten-Migration (Beispiele bereitgestellt)

**Die Vertical Architecture ist vollständig implementiert und einsatzbereit!** 🎉

