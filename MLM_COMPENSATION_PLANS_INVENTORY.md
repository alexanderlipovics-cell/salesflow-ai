# MLM Compensation Plans Inventory

**Datum:** 2025-01-XX  
**Status:** Vollständige Inventur aller MLM Compensation Plans im Projekt

---

## 📊 Übersicht

| Unternehmen | Frontend | Backend | AI Knowledge | Vollständigkeit |
|------------|----------|---------|--------------|-----------------|
| **Zinzino** | ✅ Vollständig | ✅ Vollständig | ✅ Vollständig | **100%** |
| **Herbalife** | ❌ Keine | ✅ Implementiert | ⚠️ Teilweise | **60%** |
| **PM-International** | ❌ Keine | ✅ Implementiert | ⚠️ Teilweise | **60%** |
| **doTERRA** | ❌ Keine | ✅ Implementiert | ⚠️ Teilweise | **60%** |
| **LR Health & Beauty** | ❌ Keine | ✅ Implementiert | ⚠️ Teilweise | **60%** |
| **Party Plan** | ❌ Keine | ✅ Generisch | ❌ Keine | **40%** |
| **Generation Plan** | ❌ Keine | ✅ Generisch | ❌ Keine | **40%** |

---

## 1. Zinzino 🧬

### **Status:** ✅ Vollständig implementiert (100%)

### **Dateien:**

#### Frontend:
- `src/data/zinzinoRanks.ts` - **Vollständige Rang-Definitionen**
  - 6 Customer Career Titles (Q-Team bis Top-Team 200)
  - 9 Partner Career Titles (Bronze bis Black Crown)
  - Fast Start Plan Milestones
  - CAB Bonus Tiers
  - Alle Requirements & Benefits

- `src/hooks/useZinzinoMLM.ts` - **React Hook für Rank Management**
  - Rank Data Loading
  - Rank Calculation
  - Progress Tracking
  - Earnings Calculation

- `src/components/mlm/RankProgressCard.tsx` - **UI Component**
- `src/components/mlm/FastStartProgress.tsx` - **UI Component**
- `src/components/mlm/EarningsCalculator.tsx` - **UI Component**

- `src/config/zinzinoRanks.ts` - **Alternative/Ältere Definition** (17 Ränge)
- `src/config/companies.ts` - **Company Registry** (Zinzino registriert)

#### Backend:
- `backend/app/routers/network.py` - **ZINZINO_RANKS Array** (9 Ränge, vereinfacht)
- `backend/app/services/compensation_plans.py` - **❌ KEINE Zinzino Implementation**
  - Zinzino fehlt in der Factory!

- `backend/app/ai/system_prompt.py` - **ZINZINO_KNOWLEDGE Block**
  - Vollständiger Compensation Plan
  - Customer & Partner Career Titles
  - Fast Start Plan
  - CAB Bonus
  - Mentor Matching
  - Compliance-Regeln
  - Einwandbehandlung

- `backend/app/ai/agent.py` - **MLM Data Loading**
  - Lädt `mlm_company`, `mlm_rank`, `mlm_rank_data` aus DB
  - Fügt User-spezifische Zinzino-Daten zum System Prompt hinzu

#### Datenbank:
- `backend/migrations/add_mlm_fields.sql` - **Migration**
  - `users.mlm_company` (TEXT)
  - `users.mlm_rank` (TEXT)
  - `users.mlm_rank_data` (JSONB)

### **Ränge:**

#### Customer Career Titles (6):
1. Q-Team (4 CP, 20 PCV, 10% Cash Bonus)
2. X-Team (10 CP, 50 PCV, 10% Cash Bonus)
3. A-Team (25 CP, 125 PCV, 20% Cash Bonus)
4. Pro-Team (50 CP, 250 PCV, 25% Cash Bonus)
5. Top-Team (100 CP, 500 PCV, 30% Cash Bonus)
6. Top-Team 200 (200 CP, 1000 PCV, 30% Cash Bonus)

#### Partner Career Titles (9):
1. Bronze (375 MCV, 4 PCP, 20 PCV, 10% Team Provision)
2. Silver (750 MCV, 4 PCP, 20 PCV, 10% + 100 PP Bonus)
3. Gold (1.500 MCV, 4 PCP, 20 PCV, 10% + 200 PP Bonus)
4. Executive (3.000 MCV, 10 PCP, 50 PCV, 15% + Z-Phone)
5. Platinum (6.000 MCV, 10 PCP, 50 PCV, 15% + 2% Volume)
6. Diamond (12.000 MCV, 10 PCP, 50 PCV, 15% + Z-Car + 3% Volume)
7. Crown (25.000 MCV, 10 PCP, 50 PCV, 15% + 4% Volume)
8. Royal Crown (50.000 MCV, 10 PCP, 50 PCV, 15% + 1% Bonus Pool)
9. Black Crown (100.000 MCV, 10 PCP, 50 PCV, 15% + 2% Bonus Pool)

### **Features:**
- ✅ **Provisionen:** Team Provision (10-15%), Cash Bonus (10-30%)
- ✅ **CAB Bonus:** 5 Tiers (S, M, L, XL, XXL)
- ✅ **Fast Start Plan:** 4 Milestones in 120 Tagen (650 PP total)
- ✅ **Mentor Matching:** Bis zu 25% + 5 Generationen
- ✅ **Dual-Team System:** 2:1 Ratio, Balanced Credits
- ✅ **Compliance-Regeln:** Vollständig dokumentiert
- ✅ **Einwandbehandlung:** Templates vorhanden

### **Vollständigkeit:** 100%

---

## 2. Herbalife 🌿

### **Status:** ⚠️ Backend implementiert, Frontend fehlt (60%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **HerbalifeCompensationPlan Class**
  - Vollständige Implementation mit Berechnungslogik
  - 9 Ränge definiert
  - Retail Profit, Wholesale Commission, Royalty Overrides, Production Bonus

- `src/config/companies.ts` - **Company Registry** (Herbalife registriert, `hasCompPlan: true`)

#### Frontend:
- ❌ **Keine spezifischen Komponenten**
- ❌ **Keine Rank-Definitionen**
- ❌ **Keine UI Components**

#### AI Knowledge:
- ⚠️ **Nur in VERTICAL_TEMPLATES** erwähnt (Network Marketing Templates)
- ❌ **Kein spezifisches Herbalife-Wissen** im System Prompt

### **Ränge (9):**
1. Distributor
2. Senior Consultant
3. Success Builder
4. Qualified Producer
5. Supervisor
6. World Team
7. Global Expansion Team (GET)
8. Millionaire Team
9. President's Team

### **Features:**
- ✅ **Retail Profit:** 25-50% basierend auf Rang
- ✅ **Wholesale Commission:** Differenz zwischen Discount-Levels
- ✅ **Royalty Overrides:** 5% auf 1-6 Levels (je nach Rang)
- ✅ **Production Bonus:** 1-2% auf Total Volume
- ✅ **Discount Levels:** 25-50% je nach Rang

### **Vollständigkeit:** 60%
- ✅ Backend: Vollständig
- ❌ Frontend: Fehlt komplett
- ⚠️ AI Knowledge: Nur generisch

---

## 3. PM-International 💪

### **Status:** ⚠️ Backend implementiert, Frontend fehlt (60%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **PMInternationalCompensationPlan Class**
  - Unilevel Plan Implementation
  - 6 Ränge definiert
  - Direct Sales Bonus, Unilevel Commissions, Leadership Bonus

- `src/config/companies.ts` - **Company Registry** (`hasCompPlan: true`)
- `src/screens/onboarding/NetworkSelectionScreen.tsx` - **Onboarding Option**

#### Frontend:
- ❌ **Keine spezifischen Komponenten**
- ❌ **Keine Rank-Definitionen**

#### AI Knowledge:
- ⚠️ **Nur in VERTICAL_TEMPLATES** erwähnt
- ❌ **Kein spezifisches PM-International-Wissen**

### **Ränge (6):**
1. Team Partner
2. Sales Manager
3. Director
4. Vice President
5. President
6. Chairman

### **Features:**
- ✅ **Direct Sales Bonus:** 25% auf persönliche Verkäufe
- ✅ **Unilevel Commissions:** 6-7 Generationen (6%, 6%, 6%, 4%, 4%, 2%, 2%)
- ✅ **Leadership Bonus:** 5% Matching für Directors+

### **Vollständigkeit:** 60%

---

## 4. doTERRA 🌸

### **Status:** ⚠️ Backend implementiert, Frontend fehlt (60%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **DoterraCompensationPlan Class**
  - Unilevel mit Fast Start
  - 13 Ränge definiert
  - Retail Profit, Fast Start Bonus, Unilevel, Power of 3

- `src/config/companies.ts` - **Company Registry** (`hasCompPlan: true`)
- `src/screens/onboarding/NetworkSelectionScreen.tsx` - **Onboarding Option**

#### Frontend:
- ❌ **Keine spezifischen Komponenten**

#### AI Knowledge:
- ⚠️ **Nur in VERTICAL_TEMPLATES** erwähnt

### **Ränge (13):**
1. Wellness Advocate
2. Manager
3. Director
4. Executive
5. Elite
6. Premier
7. Silver
8. Gold
9. Platinum
10. Diamond
11. Blue Diamond
12. Presidential Diamond

### **Features:**
- ✅ **Retail Profit:** 25% auf persönliche Verkäufe
- ✅ **Fast Start Bonus:** 20%, 10%, 5% auf 3 Levels (erste 60 Tage)
- ✅ **Unilevel Commissions:** Rang-abhängig (2-7 Levels, 2-3%)
- ✅ **Power of 3 Bonus:** $50, $250, $1500 (3, 9, 27 aktive Partner)

### **Vollständigkeit:** 60%

---

## 5. LR Health & Beauty 🌿

### **Status:** ⚠️ Backend implementiert, Frontend fehlt (60%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **LRHealthCompensationPlan Class**
  - Unilevel Plan
  - 7 Ränge definiert
  - Personal Sales Bonus, Generation Commissions, Car Bonus

- `src/config/companies.ts` - **Company Registry** (`hasCompPlan: true`)

#### Frontend:
- ❌ **Keine spezifischen Komponenten**

#### AI Knowledge:
- ⚠️ **Nur in VERTICAL_TEMPLATES** erwähnt

### **Ränge (7):**
1. Partner
2. Junior Partner
3. Senior Partner
4. 1-Star Manager
5. 2-Star Manager
6. 3-Star Manager
7. 4-Star Manager

### **Features:**
- ✅ **Personal Sales Bonus:** 21% auf persönliche Verkäufe
- ✅ **Generation Commissions:** 6 Generationen (21%, 7%, 5%, 3%, 2%, 2%)
- ✅ **Car Bonus:** $500 bei 50.000+ Volume

### **Vollständigkeit:** 60%

---

## 6. Party Plan (Generisch) 🎉

### **Status:** ⚠️ Backend generisch, keine spezifische Firma (40%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **PartyPlanCompensationPlan Class**
  - Generischer Party Plan
  - 6 Ränge definiert
  - Host Bonus, Booking Bonus, Team Bonus

#### Frontend:
- ❌ **Keine Komponenten**

#### AI Knowledge:
- ❌ **Keine**

### **Ränge (6):**
1. Consultant
2. Senior Consultant
3. Team Leader
4. Director
5. Executive Director
6. National Director

### **Features:**
- ✅ **Host Bonus:** 15% vom Party-Volumen
- ✅ **Booking Bonus:** $25 pro gebuchter Party
- ✅ **Team Bonus:** 5% vom Downline-Party-Volumen

### **Vollständigkeit:** 40%

---

## 7. Generation Plan (Generisch) 🔄

### **Status:** ⚠️ Backend generisch (40%)

### **Dateien:**

#### Backend:
- `backend/app/services/compensation_plans.py` - **GenerationPlanCompensationPlan Class**
  - Generischer Generation Plan
  - 6 Ränge definiert
  - Abnehmende Generation Rates

#### Frontend:
- ❌ **Keine Komponenten**

### **Ränge (6):**
1. Distributor
2. Senior Distributor
3. Team Leader
4. Manager
5. Director
6. Executive Director

### **Features:**
- ✅ **Generation Rates:** 6 Generationen (25%, 10%, 5%, 3%, 2%, 1%)

### **Vollständigkeit:** 40%

---

## ❌ Fehlende Unternehmen

### **In Company Registry, aber KEIN Compensation Plan:**

- [ ] **Amway** - Nur in `data/nm_companies_complete.json` erwähnt
- [ ] **Forever Living** - Nicht gefunden
- [ ] **Juice Plus** - Nicht gefunden
- [ ] **Nu Skin** - Nicht gefunden
- [ ] **Vorwerk** - Nur in `data/nm_companies_complete.json` (Party Plan)

---

## 📋 Zusammenfassung

### **Vollständig implementiert (100%):**
- ✅ **Zinzino** - Frontend + Backend + AI Knowledge

### **Backend implementiert (60%):**
- ⚠️ **Herbalife** - Backend ✅, Frontend ❌, AI Knowledge ⚠️
- ⚠️ **PM-International** - Backend ✅, Frontend ❌, AI Knowledge ⚠️
- ⚠️ **doTERRA** - Backend ✅, Frontend ❌, AI Knowledge ⚠️
- ⚠️ **LR Health & Beauty** - Backend ✅, Frontend ❌, AI Knowledge ⚠️

### **Generische Pläne (40%):**
- ⚠️ **Party Plan** - Backend ✅, Frontend ❌, AI Knowledge ❌
- ⚠️ **Generation Plan** - Backend ✅, Frontend ❌, AI Knowledge ❌

---

## 🎯 Empfehlungen

### **Priorität 1: Zinzino vervollständigen**
- ⚠️ **Problem:** Zinzino fehlt in `CompensationPlanFactory`!
- ✅ **Fix:** `backend/app/services/compensation_plans.py` erweitern:
  ```python
  _plans = {
      "zinzino": ZinzinoCompensationPlan,  # ← FEHLT!
      ...
  }
  ```

### **Priorität 2: Frontend für Backend-Pläne**
Für **Herbalife, PM-International, doTERRA, LR Health**:
1. Rank-Definitionen erstellen (ähnlich `zinzinoRanks.ts`)
2. React Hooks erstellen (ähnlich `useZinzinoMLM.ts`)
3. UI Components erstellen (RankProgressCard, EarningsCalculator)
4. Integration in NetworkSelectionScreen

### **Priorität 3: AI Knowledge erweitern**
Für jedes Unternehmen:
1. Spezifisches Wissen in `system_prompt.py` hinzufügen
2. Compliance-Regeln
3. Einwandbehandlung
4. Templates

### **Priorität 4: Fehlende Unternehmen**
- **Amway** - Sehr groß, sollte implementiert werden
- **Forever Living** - Wenn relevant für User-Base
- **Nu Skin** - Wenn relevant

---

## 📁 Datei-Struktur

```
Frontend:
├── src/data/
│   └── zinzinoRanks.ts ✅
│   └── [herbalifeRanks.ts] ❌
│   └── [pmInternationalRanks.ts] ❌
│   └── [doterraRanks.ts] ❌
│   └── [lrHealthRanks.ts] ❌
├── src/hooks/
│   └── useZinzinoMLM.ts ✅
│   └── [useHerbalifeMLM.ts] ❌
├── src/components/mlm/
│   ├── RankProgressCard.tsx ✅
│   ├── FastStartProgress.tsx ✅
│   ├── EarningsCalculator.tsx ✅
│   └── [HerbalifeRankCard.tsx] ❌
└── src/config/
    ├── companies.ts ✅
    └── zinzinoRanks.ts ✅ (alternative)

Backend:
├── backend/app/services/
│   └── compensation_plans.py ✅
│       ├── HerbalifeCompensationPlan ✅
│       ├── PMInternationalCompensationPlan ✅
│       ├── DoterraCompensationPlan ✅
│       ├── LRHealthCompensationPlan ✅
│       ├── PartyPlanCompensationPlan ✅
│       ├── GenerationPlanCompensationPlan ✅
│       └── [ZinzinoCompensationPlan] ❌ FEHLT!
├── backend/app/ai/
│   └── system_prompt.py
│       └── ZINZINO_KNOWLEDGE ✅
│       └── [HERBALIFE_KNOWLEDGE] ❌
│       └── [PM_INTERNATIONAL_KNOWLEDGE] ❌
└── backend/migrations/
    └── add_mlm_fields.sql ✅
```

---

**Letzte Aktualisierung:** 2025-01-XX

