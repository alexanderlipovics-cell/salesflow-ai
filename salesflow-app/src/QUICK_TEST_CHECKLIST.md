# ⚡ QUICK TEST CHECKLIST

## 🚀 Schnellstart

### 1. Migration prüfen (wichtig!)
```sql
-- In Supabase SQL Editor:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('vertical', 'enabled_modules');
```

**Erwartet**: Beide Spalten sollten existieren.

### 2. App starten

#### Backend starten:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

#### Frontend starten:
```bash
# Im Hauptverzeichnis
npm start
# oder
npx expo start
```

### 3. Settings Screen testen

✅ **Vertical Selector**
- [ ] Settings öffnen
- [ ] "Vertical" Sektion sichtbar
- [ ] Aktuelles Vertical wird angezeigt
- [ ] Auf Vertical klicken → Modal öffnet
- [ ] "Außendienst B2B" auswählen
- [ ] Erfolgs-Meldung erscheint

✅ **Module Selector**
- [ ] "Module" Sektion sichtbar
- [ ] Verfügbare Module werden angezeigt
- [ ] Phoenix aktivieren (Switch)
- [ ] DelayMaster aktivieren (Switch)
- [ ] Änderungen werden gespeichert

### 4. Chat testen

✅ **Network Marketing (MENTOR)**
- [ ] Vertical auf "Network Marketing" setzen
- [ ] Chat öffnen
- [ ] Nachricht: "Wie steh ich heute?"
- [ ] Antwort sollte MENTOR-Stil haben

✅ **Field Sales (CHIEF + Phoenix)**
- [ ] Vertical auf "Außendienst B2B" setzen
- [ ] Phoenix aktivieren
- [ ] Chat öffnen
- [ ] Nachricht: "Bin 30 Minuten zu früh"
- [ ] Erwartet: "Phoenix Mode aktiviert!" + Leads in der Nähe

✅ **Field Sales (DelayMaster)**
- [ ] DelayMaster aktivieren
- [ ] Nachricht: "Wann sollte ich Anna kontaktieren?"
- [ ] Erwartet: Timing-Empfehlung

## 🐛 Troubleshooting

### Problem: Vertical wird nicht gespeichert
- Prüfe Supabase RLS Policies
- Prüfe Backend-Logs
- Prüfe ob Migration ausgeführt wurde

### Problem: Module werden nicht angezeigt
- Prüfe ob `enabled_modules` Spalte existiert
- Prüfe ob Vertical korrekt gesetzt ist
- Prüfe Console für Fehler

### Problem: Prompts werden nicht geladen
- Prüfe Backend-Logs für Import-Fehler
- Prüfe ob `backend/prompts/` existiert
- Prüfe Python-Path

## ✅ Erfolgskriterien

- [ ] Vertical kann geändert werden
- [ ] Module können aktiviert werden
- [ ] Chat-Antworten passen sich an Vertical an
- [ ] Phoenix funktioniert bei "Bin zu früh"
- [ ] DelayMaster gibt Timing-Empfehlungen
- [ ] Keine Fehler in Console/Logs

## 📝 Test-Protokoll

| Test | Status | Zeit | Notizen |
|------|--------|------|---------|
| Migration | ⬜ | | |
| Vertical Selector | ⬜ | | |
| Module Selector | ⬜ | | |
| Network Marketing Chat | ⬜ | | |
| Field Sales Chat | ⬜ | | |
| Phoenix Feature | ⬜ | | |
| DelayMaster Feature | ⬜ | | |

## 🎯 Nächste Schritte

Nach erfolgreichem Testing:
1. Feedback sammeln
2. Prompts optimieren
3. Weitere Module testen
4. User-Guide erstellen

