# 📋 Lead Management

Das Herzstück von **SalesFlow AI** ist das **Lead Management**. Hier erfassen, bearbeiten und konvertieren Sie potenzielle Kunden.

---

## 1. Übersicht (Lead Liste)

Wenn Sie auf **"Leads & Kontakte"** in der Sidebar klicken, sehen Sie die Übersicht aller aktiven Leads.

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/lead-list-page.png`

**Was zu sehen sein sollte:**
- Lead-Tabelle mit Spalten: Name, Email, Firma, Status, Score, Letzte Aktivität
- Suchleiste oben rechts (rot markieren)
- Filter-Tags unter der Suchleiste (z.B. "Status: Neu", "Score: Hoch") - grün markieren
- "+ Neuer Lead" Button oben rechts
- Pagination am unteren Rand

**Caption:** *Die Lead-Liste mit aktiven Filtern und Suchfunktion. Die Suchleiste durchsucht Namen, Firmen und E-Mails in Echtzeit.*

---

### Wichtige Funktionen

#### 🔍 Suche
- Durchsucht **Namen, Firmen und E-Mails** in Echtzeit
- Tippen Sie einfach in die Suchleiste
- Ergebnisse werden sofort gefiltert

#### 🏷️ Filter
Klicken Sie auf **"Filter"**, um Leads nach verschiedenen Kriterien zu filtern:

- **Status:** Neu, Qualifiziert, In Bearbeitung, Geschlossen
- **Score:** Niedrig (0-40), Mittel (41-70), Hoch (71-100)
- **Kanal:** Email, WhatsApp, LinkedIn, etc.
- **Datum:** Erstellt in den letzten 7/30/90 Tagen

#### ⚡ Quick Actions
Hovern Sie über eine Zeile, um **Edit/Delete Buttons** zu sehen:

- **✏️ Bearbeiten** - Öffnet das Lead-Formular
- **🗑️ Löschen** - Löscht den Lead (mit Bestätigung)
- **📧 Nachricht senden** - Öffnet Chat-Interface
- **🤖 Autopilot aktivieren** - Aktiviert Autopilot für diesen Lead

---

## 2. Neuen Lead erstellen

Um einen neuen Kontakt manuell hinzuzufügen:

1. Klicken Sie oben rechts auf den Button **"+ Neuer Lead"**
2. Das Modal-Fenster öffnet sich

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/lead-form-modal.png`

**Was zu sehen sein sollte:**
- Modal-Fenster mit Lead-Formular
- Felder: Name, Email, Telefon, Firma, Budget, Notizen
- **Budget-Feld** mit rotem Pfeil markiert (wichtig für AI-Score)
- "Speichern" Button unten rechts
- "Abbrechen" Button unten links

**State:** Formular mit Dummy-Daten gefüllt:
- Name: "Tony Stark"
- Firma: "Stark Industries"
- Email: "tony@starkindustries.com"
- Budget: "Hoch"

**Caption:** *Das Lead-Erfassungsformular mit Validierung. Das Budget-Feld ist wichtig für den AI-Score.*

---

### Formular-Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| **Name** | Text | ✅ Ja | Vollständiger Name des Leads |
| **Email** | Email | ✅ Ja | E-Mail-Adresse (wird validiert) |
| **Telefon** | Tel | ❌ Nein | Telefonnummer |
| **Firma** | Text | ❌ Nein | Firmenname |
| **Budget** | Select | ❌ Nein | Budget: Niedrig, Mittel, Hoch |
| **Status** | Select | ✅ Ja | Status: Neu, Qualifiziert, etc. |
| **Notizen** | Textarea | ❌ Nein | Zusätzliche Informationen |

**💡 Tipp:** Je mehr Informationen Sie eingeben, desto genauer kann der AI-Score berechnet werden.

---

## 3. Lead bearbeiten

1. Klicken Sie auf einen Lead in der Liste
2. Das Lead-Detail-Modal öffnet sich
3. Klicken Sie auf **"Bearbeiten"**
4. Ändern Sie die gewünschten Felder
5. Klicken Sie auf **"Speichern"**

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/lead-detail-modal.png`

**Was zu sehen sein sollte:**
- Lead-Details mit Tabs: Übersicht, Aktivitäten, Autopilot
- "Bearbeiten" Button oben rechts
- Lead-Informationen: Name, Email, Firma, Status, Score
- Aktivitäten-Timeline auf der rechten Seite

**Caption:** *Lead-Detailansicht mit allen Informationen und Aktivitäten.*

---

## 4. Lead importieren (CSV)

Sie können Leads auch per CSV-Datei importieren:

1. Klicken Sie auf **"Importieren"** in der Lead-Liste
2. Wählen Sie eine CSV-Datei aus
3. Prüfen Sie die Vorschau
4. Klicken Sie auf **"Importieren"**

### CSV-Format

Ihre CSV-Datei sollte folgende Spalten enthalten:

```csv
name,email,phone,company,budget,status
Max Mustermann,max@firma.de,+49123456789,Muster GmbH,Hoch,Neu
Jane Doe,jane@example.com,+49987654321,Example Inc,Mittel,Qualifiziert
```

**Unterstützte Spalten:**
- `name` (Pflicht)
- `email` (Pflicht)
- `phone`
- `company`
- `budget` (Niedrig, Mittel, Hoch)
- `status` (Neu, Qualifiziert, etc.)

---

## 5. API Import (für Developer)

Falls Sie Leads programmatisch importieren wollen:

### cURL Beispiel

```bash
curl -X POST https://api.salesflow.ai/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Max Mustermann",
    "email": "max@firma.de",
    "phone": "+49123456789",
    "company": "Muster GmbH",
    "budget": "high",
    "status": "new"
  }'
```

### JavaScript Beispiel

```javascript
const response = await fetch('https://api.salesflow.ai/api/leads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Max Mustermann',
    email: 'max@firma.de',
    company: 'Muster GmbH',
    budget: 'high'
  })
});

const lead = await response.json();
console.log('Lead erstellt:', lead);
```

### Python Beispiel

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

data = {
    'name': 'Max Mustermann',
    'email': 'max@firma.de',
    'company': 'Muster GmbH',
    'budget': 'high'
}

response = requests.post(
    'https://api.salesflow.ai/api/leads',
    headers=headers,
    json=data
)

lead = response.json()
print('Lead erstellt:', lead)
```

---

## 6. Lead Score verstehen

Jeder Lead erhält einen **AI-Score** (0-100), der basierend auf verschiedenen Faktoren berechnet wird:

- **Budget** (Hoch = +30 Punkte)
- **Firmengröße** (Groß = +20 Punkte)
- **Kontaktqualität** (Vollständige Daten = +15 Punkte)
- **Aktivität** (Kürzliche Interaktionen = +10 Punkte)
- **AI-Analyse** (Firmenprofil, Website, etc. = +25 Punkte)

**Score-Bereiche:**
- **0-40:** Niedrig - Grundlegende Follow-ups
- **41-70:** Mittel - Regelmäßige Kontakte
- **71-100:** Hoch - Priorität, schnelle Reaktion

---

## 7. Bulk-Aktionen

Sie können mehrere Leads gleichzeitig bearbeiten:

1. Aktivieren Sie die Checkboxen bei den gewünschten Leads
2. Klicken Sie auf **"Bulk-Aktionen"**
3. Wählen Sie eine Aktion:
   - Status ändern
   - Tags hinzufügen
   - Autopilot aktivieren
   - Exportieren

---

## Tipps & Best Practices

✅ **Vollständige Daten eingeben** - Je mehr Informationen, desto besser der AI-Score

✅ **Regelmäßig aktualisieren** - Führen Sie Status-Updates durch, wenn sich etwas ändert

✅ **Notizen nutzen** - Dokumentieren Sie wichtige Gespräche und Informationen

✅ **Tags verwenden** - Organisieren Sie Leads mit Tags (z.B. "Interessiert", "Follow-up nötig")

✅ **Autopilot aktivieren** - Lassen Sie die KI automatisch Follow-ups senden

---

## Häufige Fragen (FAQ)

**Q: Kann ich Leads löschen?**  
A: Ja, klicken Sie auf den Löschen-Button. Gelöschte Leads können innerhalb von 30 Tagen wiederhergestellt werden.

**Q: Wie oft wird der Score aktualisiert?**  
A: Der Score wird automatisch aktualisiert, wenn sich Lead-Daten ändern oder neue Aktivitäten hinzugefügt werden.

**Q: Kann ich Leads zwischen Benutzern übertragen?**  
A: Ja, Administratoren können Leads zwischen Team-Mitgliedern übertragen.

---

## Next Steps

- [ ] Add screenshots
- [ ] Add video tutorial
- [ ] Add advanced filtering guide
- [ ] Add lead scoring deep dive

