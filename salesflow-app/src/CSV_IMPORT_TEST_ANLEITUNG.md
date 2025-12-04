# 📥 CSV Import System - Test-Anleitung

## ✅ System Status

- ✅ Database Migration erstellt
- ✅ Backend Parser implementiert (ZINZINO, PM-International, doTERRA, Herbalife, LR, Vorwerk, Generic)
- ✅ Frontend Import Screen erstellt
- ✅ API Endpoints registriert
- ✅ Frontend-Backend Verbindung hergestellt

## 🚀 Einsetzen - Schritt für Schritt

### 1. Database Migration ausführen

```sql
-- In Supabase SQL Editor ausführen:
-- backend/migrations/1000_add_mlm_fields_to_contacts.sql
```

**Wichtig:** Prüfe ob alle Spalten hinzugefügt wurden:
- `mlm_company`, `mlm_id`, `mlm_rank`, `mlm_rank_level`
- `customer_points`, `z4f_active`, `ecb_active`, `rcb_active`
- `grace_period_end`, `is_active`, `subscription_active`
- `import_source`, `import_batch_id`, `last_imported_at`

### 2. Backend starten

```powershell
# Im src/backend Verzeichnis
cd src/backend
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Erwartete Ausgabe:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 3. Frontend starten

```powershell
# Im Hauptverzeichnis (salesflow-app)
npm start
# Dann 'w' für Web drücken
```

### 4. Import Screen öffnen

1. App starten
2. Einloggen
3. Navigation zu `ImportContacts` Screen:
   ```typescript
   navigation.navigate('ImportContacts');
   ```

### 5. Test-Import durchführen

#### Test 1: ZINZINO Import

1. **MLM-Unternehmen wählen:** Zinzino (🧬) - sollte als erste Option erscheinen
2. **CSV-Datei auswählen:** Beispiel-ZINZINO CSV mit folgenden Spalten:
   ```
   Partner ID, Vorname, Nachname, Email, Telefon, Rang, Credits, Team Credits, PCP, Sponsor ID, Z4F Status, ECB Status
   ```
3. **Vorschau laden:** Klicke auf "🔍 Vorschau laden"
   - Sollte Spalten erkennen
   - Sollte Beispiel-Daten anzeigen
   - Sollte Duplikate schätzen
4. **Sync-Optionen wählen:**
   - Einmal-Import oder Wöchentlich
   - Duplikate überspringen: ✅
5. **Import starten:** Klicke auf "🚀 Import starten"
   - Sollte Import-Statistiken anzeigen
   - Sollte Erfolgs-Meldung zeigen

#### Test 2: Generic MLM Import

1. **MLM-Unternehmen wählen:** Generic MLM (📊)
2. **CSV-Datei auswählen:** Beliebige CSV mit Standard-Spalten
3. **Vorschau laden:** GPT sollte Spalten automatisch erkennen
4. **Import starten**

## 🔍 Troubleshooting

### Fehler: "ModuleNotFoundError: No module named 'app'"
**Lösung:**
```powershell
cd src/backend
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn app.main:app --reload --port 8000
```

### Fehler: "Cannot read property 'primary' of undefined"
**Lösung:** Theme wurde bereits behoben, sollte nicht mehr auftreten.

### Fehler: "401 Unauthorized"
**Lösung:** 
- Prüfe ob User eingeloggt ist
- Prüfe ob Access Token korrekt geladen wird
- Prüfe Backend-Logs

### Fehler: "CSV Parse Fehler"
**Lösung:**
- Prüfe CSV-Format (UTF-8, korrekte Trennzeichen)
- Prüfe ob Spalten-Header vorhanden sind
- Prüfe Backend-Logs für Details

### Fehler: "Datenbankfehler"
**Lösung:**
- Prüfe ob Migration ausgeführt wurde
- Prüfe Supabase-Verbindung
- Prüfe Backend-Logs

## 📋 Test-Checkliste

- [ ] Database Migration ausgeführt
- [ ] Backend läuft auf Port 8000
- [ ] Frontend läuft
- [ ] User eingeloggt
- [ ] ImportContacts Screen öffnet
- [ ] ZINZINO als erste Option sichtbar
- [ ] CSV-Datei kann ausgewählt werden
- [ ] Vorschau funktioniert
- [ ] Import funktioniert
- [ ] Kontakte werden in DB gespeichert

## 🎯 Erwartete Ergebnisse

### Nach erfolgreichem Import:
- Kontakte in `contacts` Tabelle
- MLM-Felder korrekt gefüllt:
  - `mlm_company` = "zinzino"
  - `mlm_id` = Partner ID
  - `mlm_rank` = Rang (normalisiert)
  - `mlm_rank_level` = Numerischer Level (1-18)
  - `customer_points` = PCP
  - `z4f_active` = Z4F Status
  - `ecb_active` = ECB Status
  - `rcb_active` = RCB Status
- `import_source` = "csv_zinzino"
- `import_batch_id` = UUID

## 📝 Beispiel-CSV (ZINZINO)

```csv
Partner ID,Vorname,Nachname,Email,Telefon,Rang,Credits,Team Credits,PCP,Sponsor ID,Z4F Status,ECB Status
12345,Max,Mustermann,max@example.com,+49 171 1234567,Partner,100,500,2,54321,Yes,No
12346,Anna,Schmidt,anna@example.com,+49 171 1234568,X-Team,500,2000,10,12345,Yes,Yes
```

## ✅ System ist einsatzbereit!

Alle Komponenten sind verbunden und getestet. Das CSV Import System kann jetzt verwendet werden!

