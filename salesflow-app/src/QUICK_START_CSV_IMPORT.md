# 🚀 CSV Import System - Quick Start

## ✅ System ist einsatzbereit!

### 1. Migration ausführen (Einmalig)

```sql
-- In Supabase SQL Editor:
-- backend/migrations/1000_add_mlm_fields_to_contacts.sql
```

### 2. Backend starten

```powershell
cd src/backend
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend starten

```powershell
npm start
# Dann 'w' für Web drücken
```

### 4. Import testen

1. App öffnen → Einloggen
2. Navigation zu Import Screen:
   ```typescript
   navigation.navigate('ImportContacts');
   ```
3. **ZINZINO** wählen (erste Option 🧬)
4. CSV-Datei auswählen
5. "🔍 Vorschau laden" klicken
6. "🚀 Import starten" klicken

## 📋 Unterstützte MLM-Unternehmen

1. **🧬 Zinzino** (als erste Option)
2. 💎 PM-International
3. 🌿 doTERRA
4. 🥤 Herbalife
5. ✨ LR
6. 🏠 Vorwerk
7. 📊 Generic MLM (GPT-Erkennung)

## ✅ Status

- ✅ Backend: Parser, API, Importer
- ✅ Frontend: Import Screen, Navigation
- ✅ Database: Migration erstellt
- ✅ Verbindung: Frontend ↔ Backend

**System ist einsatzbereit!**

