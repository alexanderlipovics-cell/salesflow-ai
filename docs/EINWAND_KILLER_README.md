# 🛡️ EINWAND-KILLER (Objection Solver) - Implementation Guide

**Status:** ✅ Vollständig implementiert

---

## 📋 Übersicht

Das **EINWAND-KILLER** Modul ist ein KI-gestützter Real-time Negotiation Coach, der 3 personalisierte Antwort-Strategien generiert basierend auf:

1. **Company Truth** (aus der `sales_content` Tabelle)
2. **Lead DISG-Profil** (aus `lead_profiles`)
3. **AI-Generierung** (GPT-4o-mini)

---

## 🏗️ Architektur

### **1. SQL Migration** ✅
**Datei:** `supabase/migrations/20251130_create_sales_content_waterfall.sql`

**Was es macht:**
- Erstellt `sales_content` Tabelle mit Multi-Tenant, Multi-Language Support
- Implementiert Waterfall-Logik: `Company Specific > Language > Global Fallback`
- Erstellt RPC Funktion `get_optimized_content()` für Content-Retrieval
- Aktiviert Row Level Security (RLS)

**Ausführen:**
```sql
-- In Supabase SQL Editor:
-- 1. Öffne: supabase/migrations/20251130_create_sales_content_waterfall.sql
-- 2. Copy & Paste in Supabase SQL Editor
-- 3. RUN ▶️
```

### **2. Supabase Edge Function** ✅
**Datei:** `supabase/functions/solve-objection/index.ts`

**Was es macht:**
- Lädt Lead-Profil mit DISG-Daten
- Lädt Company Truth via Waterfall RPC
- Generiert 3 Antwort-Varianten mit GPT-4o-mini:
  - `logical`: Datenbasiert (für C/S Typen)
  - `emotional`: Story-basiert (für I/S Typen)
  - `provocative`: Challenger-Sale (für D Typen)

**Deploy:**
```bash
# Install Supabase CLI (falls noch nicht installiert)
npm install -g supabase

# Login
supabase login

# Link zu deinem Projekt
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Function
supabase functions deploy solve-objection

# Set Environment Variables
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### **3. React Hook** ✅
**Datei:** `src/hooks/useObjectionSolver.ts`

**Features:**
- Nutzt `@tanstack/react-query` für Caching & State Management
- Optimistic Updates (zeigt gecachte Ergebnisse sofort)
- Fallback: Falls AI fehlschlägt, nutzt rohen DB-Content

**Verwendung:**
```typescript
import { useObjectionSolver } from "@/hooks/useObjectionSolver";

const { data, isLoading, error, responses } = useObjectionSolver(
  {
    objection_key: "price_too_high",
    lead_id: "uuid-here",
    user_id: "uuid-here",
  },
  { enabled: true }
);
```

### **4. UI Component** ✅
**Datei:** `src/components/objections/ObjectionSolver.tsx`

**Features:**
- Popover/Slide-over Modal
- Category Grid (6 häufige Einwände)
- 3-Card Layout mit Farbcodierung:
  - 🔵 Blue: Logical
  - 🟣 Purple: Emotional
  - 🟠 Orange: Provocative
- Copy-to-Clipboard + Auto-Close
- DISG-Badge zeigt passende Strategie

**Integration in ChatPage:**
```tsx
import ObjectionSolver from "@/components/objections/ObjectionSolver";

// In ChatPage.jsx, füge Button hinzu:
<button onClick={() => setShowObjectionSolver(true)}>
  <ShieldAlert /> Handle Objection
</button>

{showObjectionSolver && (
  <ObjectionSolver
    leadId={currentLeadId}
    onClose={() => setShowObjectionSolver(false)}
    onMessageCopied={(msg) => {
      // Optional: Füge Nachricht direkt in Chat ein
      setInputValue(msg);
    }}
  />
)}
```

---

## 🚀 Deployment Checklist

### **Phase 1: Database Setup**

- [ ] **SQL Migration ausführen**
  - Öffne Supabase Dashboard → SQL Editor
  - Kopiere Inhalt von `supabase/migrations/20251130_create_sales_content_waterfall.sql`
  - RUN ▶️
  - Verifiziere: `sales_content` Tabelle existiert

- [ ] **Seed Data hinzufügen** (Optional)
  ```sql
  INSERT INTO sales_content (
    company_id, language_code, category, key_identifier, payload
  ) VALUES (
    NULL, -- Global fallback
    'de',
    'objection',
    'price_too_high',
    '{
      "title": "Preis-Argument",
      "script": "Ich verstehe deine Bedenken. Lass uns die Wertschöpfung durchgehen...",
      "ai_hints": "Betone ROI, Vergleich mit Wettbewerbern, Flexibilität"
    }'::jsonb
  );
  ```

### **Phase 2: Edge Function Deploy**

- [ ] **Supabase CLI installieren**
  ```bash
  npm install -g supabase
  ```

- [ ] **Function deployen**
  ```bash
  cd salesflow-ai
  supabase functions deploy solve-objection
  ```

- [ ] **Environment Variables setzen**
  ```bash
  supabase secrets set OPENAI_API_KEY=sk-your-key-here
  ```

- [ ] **Test Function**
  ```bash
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/solve-objection \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "objection_key": "price_too_high",
      "lead_id": "uuid-here",
      "user_id": "uuid-here"
    }'
  ```

### **Phase 3: Frontend Integration**

- [ ] **React Query prüfen**
  ```bash
  # Falls noch nicht installiert:
  npm install @tanstack/react-query
  ```

- [ ] **Component importieren**
  - In `ChatPage.jsx` oder wo gewünscht
  - Button hinzufügen mit ShieldAlert Icon
  - Modal triggern

- [ ] **Test im Browser**
  - Klicke "Handle Objection"
  - Wähle Kategorie
  - Warte auf AI-Generierung
  - Kopiere Antwort

---

## 🎨 UI Features

### **Category Grid**
- 6 häufige Einwände:
  - 💰 Zu teuer
  - 📊 Pyramidenschema
  - ⏰ Keine Zeit
  - 👥 Partner entscheidet
  - 📉 Markt gesättigt
  - 🤔 Zu gut um wahr zu sein

### **3-Card Layout**
- **The Logician 🧠** (Blue)
  - Datenbasiert, ruhig
  - Passt zu: DISG Typ G, S

- **The Empath ❤️** (Purple)
  - Story-basiert, empathisch
  - Passt zu: DISG Typ I, S

- **The Challenger ⚡** (Orange)
  - Direkt, provokant
  - Passt zu: DISG Typ D

### **Animations**
- Slide-in from bottom (Mobile)
- Fade-in (Desktop)
- Card hover effects
- Copy confirmation (CheckCircle)

---

## 🔧 Troubleshooting

### **Problem: Edge Function gibt 401 Unauthorized**

**Lösung:**
- Prüfe, ob `Authorization: Bearer TOKEN` Header gesetzt ist
- Token muss vom aktuellen User-Session kommen
- Teste mit Supabase Dashboard → Edge Functions → Invoke

### **Problem: Keine Company Content gefunden**

**Lösung:**
- Prüfe `sales_content` Tabelle: Gibt es Einträge für dein `objection_key`?
- Prüfe `company_id`: Ist NULL (global) oder spezifisch?
- Prüfe `language_code`: Stimmt es mit User-Sprache überein?

### **Problem: AI-Generierung schlägt fehl**

**Lösung:**
- Prüfe `OPENAI_API_KEY` in Supabase Secrets
- Prüfe OpenAI API Quota
- Fallback wird automatisch genutzt (roher DB-Content)

### **Problem: DISG-Profil fehlt**

**Lösung:**
- Prüfe `lead_profiles` Tabelle: Gibt es `disg_type` für den Lead?
- Falls NULL, funktioniert es trotzdem (generische Antworten)

---

## 📚 Weitere Ressourcen

- **Objection Brain:** Siehe `OBJECTION_BRAIN_README.md`
- **DISG System:** Siehe `sales_persona_system_implementation.md`
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

---

## ✅ Status

- [x] SQL Migration erstellt
- [x] Edge Function erstellt
- [x] React Hook erstellt
- [x] UI Component erstellt
- [ ] SQL Migration ausgeführt (User)
- [ ] Edge Function deployed (User)
- [ ] Frontend integriert (User)

**Nächste Schritte:** Folge der Deployment Checklist oben! 🚀

