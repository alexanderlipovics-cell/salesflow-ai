# 🧪 Quick Actions Test-Anleitung

## ✅ Was wurde implementiert

### Backend
- ✅ `POST /api/v2/mentor/quick-action` Endpoint
- ✅ Unterstützt: `objection_help`, `opener_suggest`, `closing_tip`, `followup_suggest`, `motivation`, `dmo_status`

### Frontend
- ✅ ChatScreen: Quick Action Buttons verwenden neuen Endpoint
- ✅ Legacy-Fallbacks entfernt

---

## 🧪 Manuelle Tests

### 1. Quick Action Buttons im ChatScreen

**Schritte:**
1. App starten
2. Zum MENTOR Tab navigieren
3. Einen der Quick Action Buttons klicken:
   - 💪 **Motivation** → `action_type: "motivation"`
   - ❓ **Einwand-Hilfe** → `action_type: "objection_help"`
   - 📋 **Script für heute** → `action_type: "followup_suggest"`
   - 📊 **Mein DMO Status** → `action_type: "dmo_status"`

**Erwartetes Ergebnis:**
- Button zeigt Loading-State
- MENTOR antwortet mit passendem Tipp/Vorschlag
- Antwort erscheint im Chat

**Fehlerbehandlung:**
- Bei Verbindungsfehler: Zeigt Fehlermeldung
- Keine Legacy-Fallbacks mehr

---

### 2. API direkt testen (curl)

```bash
# Quick Action: Objection Help
curl -X POST http://localhost:8001/api/v2/mentor/quick-action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action_type": "objection_help",
    "context": "Der Kunde sagt 'keine Zeit'"
  }'

# Erwartete Response:
# {
#   "suggestion": "...",
#   "action_type": "objection_help",
#   "tokens_used": 150
# }
```

---

### 3. Contacts API testen

```bash
# Kontakte abrufen
curl http://localhost:8001/api/v2/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Erwartete Response:
# {
#   "contacts": [...],
#   "total": 10,
#   "page": 1,
#   "page_size": 20
# }
```

---

## ✅ Checkliste

- [ ] Quick Action Buttons funktionieren im ChatScreen
- [ ] MENTOR antwortet korrekt auf Quick Actions
- [ ] Keine Fehler in der Console
- [ ] Contacts API lädt Kontakte korrekt
- [ ] ObjectionBrainScreen funktioniert mit neuem Endpoint
- [ ] Keine Legacy-Endpoint-Aufrufe mehr in Network-Tab

---

## 🐛 Bekannte Probleme

### Falls Quick Actions nicht funktionieren:

1. **Backend läuft nicht:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

2. **Auth-Token fehlt:**
   - Prüfe ob `Authorization` Header gesendet wird
   - Prüfe ob User eingeloggt ist

3. **CORS-Fehler:**
   - Prüfe Backend CORS-Einstellungen
   - Prüfe ob Frontend-URL in CORS-Origins ist

---

## 📊 Erfolgreicher Test

Wenn alles funktioniert:
- ✅ Quick Actions geben sofort Antworten
- ✅ Keine Legacy-Endpoint-Aufrufe
- ✅ Alle Buttons funktionieren
- ✅ Contacts werden korrekt geladen

**Dann kannst du:**
1. Legacy-Fallbacks sind bereits entfernt ✅
2. Altes Backend mit `cleanup_old_backend.ps1` löschen

