# 🧬 ZINZINO zum CSV Import System hinzugefügt

## ✅ Implementiert

### 1. Backend Parser
- ✅ **ZinzinoParser Klasse** erstellt
- ✅ **ZINZINO_RANKS Mapping** (Partner → Crown Elite, Level 1-10)
- ✅ **Spezielle Felder:**
  - Partner ID
  - Credits (Personal Volume)
  - Team Credits (Group Volume)
  - Z4F Status / Auto Order
  - Active Status

### 2. MLMCompany Enum
- ✅ ZINZINO als erste Option hinzugefügt
- ✅ Factory erweitert
- ✅ Auto-Detection erweitert

### 3. Field Mapping
- ✅ ZINZINO-spezifische Mappings hinzugefügt:
  - `mlm_id`: Partner ID, PartnerID, ID
  - `mlm_pv`: Credits, Volume
  - `mlm_gv`: Team Credits
  - `sponsor_id`: Sponsor ID, Sponsor, Upline

### 4. Frontend
- ✅ ZINZINO als **erste Option** in MLM_COMPANIES Array
- ✅ Icon: 🧬
- ✅ Beschreibung: "Partner ID, Vorname, Nachname, Email, Telefon, Rang, Credits, Sponsor ID, Z4F"

### 5. Database Migration
- ✅ Zusätzliche Felder:
  - `mlm_rank_level` (INTEGER) - Numerischer Rang-Level
  - `is_active` (BOOLEAN) - Partner Status
  - `subscription_active` (BOOLEAN) - Z4F / Auto Order Status

### 6. API
- ✅ `/api/v1/mlm-import/companies` erweitert
- ✅ ZINZINO als erste Option in der Liste

## 📋 ZINZINO Rank Levels

```python
ZINZINO_RANKS = {
    'partner': 1,
    'bronze': 2,
    'silver': 3,
    'gold': 4,
    'platinum': 5,
    'diamond': 6,
    'blue_diamond': 7,
    'black_diamond': 8,
    'crown': 9,
    'crown_elite': 10,
}
```

## 📝 CSV Format

ZINZINO erwartet folgende Spalten:
- Partner ID / PartnerID / ID
- Vorname / First Name
- Nachname / Last Name
- Email / E-Mail
- Telefon / Phone / Mobile
- Rang / Rank / Title
- Credits / Volume
- Team Credits
- Sponsor ID / Sponsor / Upline
- Z4F Status / Auto Order
- Status (Active/Inactive)

## ✅ Status

- ✅ Backend Parser
- ✅ Field Mapping
- ✅ Frontend UI (als erste Option)
- ✅ Database Migration
- ✅ API Endpoints

ZINZINO ist jetzt vollständig integriert und erscheint als erste Option im Import-Screen!

