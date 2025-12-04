# 📥 CSV Import System - Dokumentation

## ✅ Implementiert

### 1. Database Migration
- ✅ **Datei:** `backend/migrations/1000_add_mlm_fields_to_contacts.sql`
- ✅ **Felder hinzugefügt:**
  - `mlm_company` - MLM-Unternehmen
  - `mlm_id` - Interne MLM-ID
  - `mlm_rank` - Rang im MLM-System
  - `team_position` - Position im Team
  - `mlm_pv`, `mlm_gv`, `mlm_ov`, `mlm_vp`, `mlm_pp` - MLM-Metriken
  - `team_id`, `sponsor_id`, `sponsor_name`, `mlm_level` - Team-Informationen
  - `import_source`, `import_batch_id`, `last_imported_at` - Import-Metadaten

### 2. Backend Parser
- ✅ **Datei:** `backend/app/services/csv_import/parser.py`
- ✅ **Unterstützte Formate:**
  - PM-International: Name, Email, Telefon, Team-ID, Rang, PV, GV
  - doTERRA: Vorname, Nachname, Email, Telefon, Rank, OV
  - Herbalife: Name, ID, Sponsor, Level, VP, PP
  - LR: Ähnlich Herbalife
  - Vorwerk: Ähnlich PM-International
  - Generic MLM: Automatische Spalten-Erkennung

### 3. Mapping-Logik
- ✅ **Datei:** `backend/app/services/csv_import/mapping.py`
- ✅ **Features:**
  - Standard-Mapping basierend auf Spaltennamen
  - GPT-basierte automatische Spalten-Erkennung
  - Fallback zu Standard-Mapping

### 4. Import-Service
- ✅ **Datei:** `backend/app/services/csv_import/importer.py`
- ✅ **Features:**
  - Kontakt-Normalisierung
  - Duplikat-Erkennung
  - Batch-Import mit Metadaten
  - Sync-Mode (Einmal/Wöchentlich)

### 5. Backend API
- ✅ **Datei:** `backend/app/api/routes/mlm_import.py`
- ✅ **Endpoints:**
  - `POST /api/v1/mlm-import/preview` - Vorschau mit Mapping
  - `POST /api/v1/mlm-import/execute` - Import ausführen
  - `GET /api/v1/mlm-import/companies` - Verfügbare MLM-Unternehmen

### 6. Frontend Import Screen
- ✅ **Datei:** `screens/import/ImportContactsScreen.tsx`
- ✅ **Features:**
  - MLM-Unternehmen Auswahl (PM-International, doTERRA, Herbalife, LR, Vorwerk, Generic)
  - CSV-Datei Upload
  - Vorschau mit Beispiel-Daten
  - Sync-Optionen (Einmal/Wöchentlich)
  - Duplikat-Erkennung Toggle

### 7. Navigation
- ✅ **Datei:** `navigation/AppNavigator.js`
- ✅ **Screen:** `ImportContacts` hinzugefügt

## 📋 Verwendung

### 1. Migration ausführen
```sql
-- In Supabase SQL Editor ausführen:
-- backend/migrations/1000_add_mlm_fields_to_contacts.sql
```

### 2. Frontend verwenden
```typescript
// Navigation zum Import Screen
navigation.navigate('ImportContacts');
```

### 3. Import-Flow
1. MLM-Unternehmen wählen
2. CSV-Datei auswählen
3. Vorschau laden (automatisches Mapping)
4. Sync-Optionen konfigurieren
5. Import starten

## 🔧 Erweiterungen

### Feld-Mapping UI (Optional)
- Manuelle Feld-Zuordnung
- Mapping speichern für nächsten Import
- Mapping-Vorlagen pro MLM-Unternehmen

### Sync-Jobs (Zukünftig)
- Wöchentliche Re-Imports
- Automatische Duplikat-Erkennung
- Update bestehender Kontakte

## 📝 API Beispiele

### Preview
```bash
curl -X POST "http://localhost:8000/api/v1/mlm-import/preview" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@contacts.csv" \
  -F "mlm_company=pm_international"
```

### Execute
```bash
curl -X POST "http://localhost:8000/api/v1/mlm-import/execute" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@contacts.csv" \
  -F "mlm_company=pm_international" \
  -F "skip_duplicates=true" \
  -F "sync_mode=once"
```

## ✅ Status

- ✅ Database Migration
- ✅ Backend Parser
- ✅ Mapping-Logik
- ✅ Import-Service
- ✅ Backend API
- ✅ Frontend Screen
- ✅ Navigation
- ⏳ Feld-Mapping UI (Optional)
- ⏳ Sync-Jobs (Zukünftig)

