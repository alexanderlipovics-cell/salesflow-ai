# 🧪 TESTING GUIDE: Vertical System

## ✅ Voraussetzungen

1. **Migration ausgeführt**: `backend/migrations/999_add_vertical_support.sql` in Supabase ausgeführt
2. **Backend läuft**: Python Backend ist gestartet
3. **Frontend läuft**: React Native App ist gestartet

## 📋 Test-Checkliste

### 1. Migration prüfen

```sql
-- In Supabase SQL Editor ausführen:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('vertical', 'enabled_modules');

-- Sollte zurückgeben:
-- vertical | text
-- enabled_modules | ARRAY
```

### 2. Settings Screen testen

#### 2.1 Vertical Selector
- [ ] Settings Screen öffnen
- [ ] "Vertical" Sektion sollte sichtbar sein
- [ ] Aktuelles Vertical wird angezeigt (Standard: Network Marketing)
- [ ] Auf Vertical klicken → Modal öffnet sich
- [ ] Alle Verticals werden angezeigt:
  - Network Marketing
  - Außendienst B2B
  - Immobilien
  - Finanzvertrieb
  - Coaching
  - Allgemein
- [ ] Vertical auswählen → Speichert in Supabase
- [ ] Profile wird aktualisiert
- [ ] Erfolgs-Meldung wird angezeigt

#### 2.2 Module Selector
- [ ] "Module" Sektion sollte sichtbar sein
- [ ] Verfügbare Module für aktuelles Vertical werden angezeigt
- [ ] Switch für jedes Modul funktioniert
- [ ] Module aktivieren/deaktivieren → Speichert in Supabase
- [ ] Nicht verfügbare Module werden als "N/A" angezeigt

### 3. Chat mit CHIEF testen

#### 3.1 Network Marketing (MENTOR)
- [ ] Vertical auf "Network Marketing" setzen
- [ ] Chat Screen öffnen
- [ ] Nachricht senden: "Wie steh ich heute?"
- [ ] Antwort sollte MENTOR-Stil haben:
  - Motivierend
  - Network Marketing Terminologie
  - DMO Tracker erwähnt (wenn aktiviert)
- [ ] Nachricht senden: "Hilf mir bei dem Einwand: Das ist doch ein Schneeballsystem"
- [ ] Antwort sollte MLM-spezifische Einwandbehandlung haben

#### 3.2 Field Sales (CHIEF)
- [ ] Vertical auf "Außendienst B2B" setzen
- [ ] Phoenix Modul aktivieren
- [ ] Chat Screen öffnen
- [ ] Nachricht senden: "Bin 30 Minuten zu früh"
- [ ] Antwort sollte Phoenix aktivieren:
  - "Phoenix Mode aktiviert!"
  - Leads in der Nähe vorschlagen
  - Spontan-Nachrichten generieren
- [ ] Nachricht senden: "Wie optimiere ich Follow-up Timing?"
- [ ] Antwort sollte DelayMaster erwähnen (wenn aktiviert)

#### 3.3 General (Fallback)
- [ ] Vertical auf "Allgemein" setzen
- [ ] Chat Screen öffnen
- [ ] Nachricht senden: "Wie steh ich heute?"
- [ ] Antwort sollte allgemeinen Sales-Coach-Stil haben

### 4. Module-spezifische Features testen

#### 4.1 Phoenix Modul
- [ ] Phoenix Modul aktivieren (Field Sales)
- [ ] Chat: "Bin zu früh für meinen Termin"
- [ ] Erwartet: Phoenix Trigger erkannt
- [ ] Erwartet: Leads in der Nähe werden vorgeschlagen
- [ ] Erwartet: Spontan-Nachrichten werden generiert

#### 4.2 DelayMaster Modul
- [ ] DelayMaster Modul aktivieren (Field Sales)
- [ ] Chat: "Wann sollte ich Anna kontaktieren?"
- [ ] Erwartet: Timing-Empfehlung basierend auf Lead-Verhalten
- [ ] Erwartet: Beste Kontaktzeitpunkte werden genannt

#### 4.3 DMO Tracker Modul
- [ ] DMO Tracker Modul aktivieren (Network Marketing)
- [ ] Chat: "Wie läuft mein DMO heute?"
- [ ] Erwartet: DMO-spezifische Antwort
- [ ] Erwartet: Tägliche Routine wird getrackt

#### 4.4 Ghostbuster Modul
- [ ] Ghostbuster Modul aktivieren
- [ ] Chat: "Anna antwortet nicht mehr"
- [ ] Erwartet: Ghosting-Erkennung
- [ ] Erwartet: Reaktivierungs-Strategien werden vorgeschlagen

### 5. Backend-Logs prüfen

```bash
# Backend-Logs sollten zeigen:
# - Vertical wird aus Profil geladen
# - Module werden aus Profil geladen
# - Richtiger Prompt wird verwendet
# - Keine Fehler beim Laden der Prompts
```

### 6. Datenbank prüfen

```sql
-- Prüfe ob Vertical gespeichert wurde:
SELECT id, vertical, enabled_modules 
FROM profiles 
WHERE id = '<deine-user-id>';

-- Sollte zeigen:
-- vertical: 'network_marketing' oder 'field_sales' etc.
-- enabled_modules: ['mentor', 'dmo_tracker', ...]
```

## 🐛 Bekannte Probleme & Lösungen

### Problem: Vertical wird nicht gespeichert
**Lösung**: 
- Prüfe RLS Policies in Supabase
- Prüfe ob `profiles.vertical` Spalte existiert
- Prüfe Backend-Logs für Fehler

### Problem: Prompts werden nicht geladen
**Lösung**:
- Prüfe ob `backend/prompts/` im Python-Path ist
- Prüfe ob Migration ausgeführt wurde
- Prüfe Backend-Logs für Import-Fehler

### Problem: Module werden nicht angezeigt
**Lösung**:
- Prüfe ob `profiles.enabled_modules` Spalte existiert
- Prüfe ob Vertical korrekt gesetzt ist
- Prüfe `VerticalContext.ts` für verfügbare Module

## ✅ Erfolgskriterien

- [ ] Vertical kann in Settings geändert werden
- [ ] Module können aktiviert/deaktiviert werden
- [ ] Chat-Antworten passen sich an Vertical an
- [ ] Module-spezifische Features funktionieren
- [ ] Keine Fehler in Backend-Logs
- [ ] Daten werden korrekt in Supabase gespeichert

## 📝 Test-Protokoll

| Test | Status | Notizen |
|------|--------|---------|
| Migration ausführen | ⬜ | |
| Vertical Selector UI | ⬜ | |
| Module Selector UI | ⬜ | |
| Network Marketing Chat | ⬜ | |
| Field Sales Chat | ⬜ | |
| Phoenix Modul | ⬜ | |
| DelayMaster Modul | ⬜ | |
| DMO Tracker Modul | ⬜ | |
| Ghostbuster Modul | ⬜ | |

## 🚀 Nächste Schritte nach Testing

1. **Feedback sammeln**: Welche Prompts funktionieren gut? Was fehlt?
2. **Optimieren**: Prompts basierend auf Feedback anpassen
3. **Erweitern**: Weitere Module hinzufügen
4. **Dokumentieren**: User-Guide für Verticals erstellen

