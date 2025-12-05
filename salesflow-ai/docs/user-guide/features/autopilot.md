# 🤖 AI Autopilot

Der **Autopilot** analysiert Ihre Leads und schlägt automatisch nächste Schritte vor. Er nutzt künstliche Intelligenz, um personalisierte Nachrichten zu generieren und den optimalen Zeitpunkt für Kontaktaufnahme zu bestimmen.

---

## Wie der Autopilot arbeitet

### 1. Analyse
Sobald ein Lead erstellt wird oder eine Nachricht eingeht, scannt die KI:
- Firmendaten und Website
- LinkedIn-Profil
- Vorherige Interaktionen
- Kontext und Timing

### 2. Scoring
Der Lead erhält einen **Confidence Score** (0-1):
- **≥ 0.85:** Automatische Generierung und Vorschlag
- **< 0.85:** Sendet zur manuellen Überprüfung in die Review Queue

### 3. Suggestion
Die KI generiert einen **personalisierten E-Mail-Entwurf** basierend auf:
- Lead-Profil
- Firmeninformationen
- Best Practices
- A/B Test Erkenntnissen

### 4. Scheduling
Der Autopilot bestimmt den **optimalen Zeitpunkt** basierend auf:
- Kontakt-Zeitzone
- Beste Kontaktzeit (aus historischen Daten)
- Rate Limiting (verhindert Spam)

### 5. Approval & Sending
- **Automatisch:** Wenn Confidence ≥ 0.85 und Auto-Approve aktiviert
- **Manuell:** Wenn Confidence < 0.85 oder Auto-Approve deaktiviert

---

## Screenshot: Autopilot Sidebar

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/autopilot-sidebar.png`

**Was zu sehen sein sollte:**
- Geöffneter Lead-Detail-View
- Autopilot Sidebar auf der rechten Seite
- Generierte E-Mail-Draft Box mit:
  - Betreff: "Ihr Interesse an [Produkt]"
  - Nachrichtentext (personalisiert)
  - Confidence Score: 0.92 (grün markiert)
- **"Approve & Send"** Button (rot umkreist)
- **"Edit"** Button
- **"Reject"** Button
- **"Schedule for later"** Option

**Annotation:**
- Pfeil auf Confidence Score: "92% Confidence - Auto-Approve möglich"
- Kreis um "Approve & Send" Button

**Caption:** *Der Autopilot schlägt eine personalisierte Intro-Email vor. Bei hohem Confidence Score kann die Nachricht automatisch gesendet werden.*

---

## Autopilot Einstellungen

### Zugriff
1. Klicken Sie auf **"Einstellungen"** in der Sidebar
2. Wählen Sie **"Autopilot"**

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/autopilot-settings.png`

**Was zu sehen sein sollte:**
- Autopilot Settings Seite
- Toggle: "Autopilot aktivieren" (AN)
- Toggle: "Auto-Approve bei hohem Confidence" (AUS)
- Slider: "Confidence Threshold" (0.85)
- Dropdown: "Standard Kanal" (Email)
- Checkboxen: "Kanäle aktivieren"
  - ☑ Email
  - ☑ WhatsApp
  - ☐ LinkedIn
  - ☐ Instagram

**Caption:** *Autopilot Einstellungen. Hier können Sie den Confidence Threshold anpassen und Kanäle aktivieren.*

---

### Wichtige Einstellungen

| Einstellung | Beschreibung | Empfohlen |
|-------------|-------------|-----------|
| **Autopilot aktivieren** | Aktiviert/deaktiviert den Autopilot | ✅ Aktiviert |
| **Auto-Approve** | Sendet automatisch bei Confidence ≥ Threshold | ⚠️ Vorsichtig nutzen |
| **Confidence Threshold** | Mindest-Confidence für Auto-Approve | 0.85 (85%) |
| **Standard Kanal** | Standard-Kanal für Nachrichten | Email |
| **Rate Limiting** | Max. Nachrichten pro Tag/Kontakt | 3 pro Tag |

---

## Review Queue

Wenn der Confidence Score unter dem Threshold liegt, werden Vorschläge in die **Review Queue** gesendet.

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/review-queue.png`

**Was zu sehen sein sollte:**
- Review Queue Seite
- Liste von Vorschlägen mit:
  - Lead Name
  - Confidence Score (z.B. 0.72 - gelb markiert)
  - Vorschlag-Vorschau
  - "Approve", "Edit", "Reject" Buttons
- Filter: "Nach Confidence Score", "Nach Kanal"
- Pagination

**Caption:** *Die Review Queue zeigt alle Vorschläge, die manuelle Überprüfung benötigen.*

---

## A/B Testing

Der Autopilot nutzt **A/B Testing**, um die besten Nachrichten-Templates zu finden.

### Wie es funktioniert

1. **Experiment erstellen:**
   - Definieren Sie Varianten (z.B. "Empathetic", "Direct", "Question")
   - Setzen Sie Traffic Split (z.B. 33% / 33% / 34%)
   - Wählen Sie Ziel-Metrik (z.B. Reply Rate)

2. **Automatische Verteilung:**
   - Der Autopilot verteilt Leads zufällig auf Varianten
   - Jede Variante wird gleich oft getestet

3. **Ergebnisse tracken:**
   - Reply Rate, Open Rate, Conversion Rate werden gemessen
   - Nach 30+ Nachrichten wird der Gewinner ermittelt

4. **Auto-Optimization:**
   - Die beste Variante wird automatisch bevorzugt
   - Neue Experimente können gestartet werden

### Screenshot Anweisung

**Datei:** `docs/user-guide/screenshots/ab-test-dashboard.png`

**Was zu sehen sein sollte:**
- A/B Test Dashboard
- Aktives Experiment: "Objection Handling V1"
- Drei Varianten mit Metriken:
  - Variant A (Empathetic): 45% Reply Rate
  - Variant B (Direct): 52% Reply Rate ⭐
  - Variant C (Question): 38% Reply Rate
- Graph zeigt Performance über Zeit
- "Variant B ist der Gewinner" Badge

**Caption:** *A/B Test Dashboard zeigt die Performance verschiedener Nachrichten-Varianten.*

---

## Rate Limiting

Der Autopilot verhindert Spam durch **Rate Limiting**:

- **Pro Kontakt:** Max. 3 Nachrichten pro Tag
- **Pro Kanal:** Max. 10 Nachrichten pro Tag
- **Global:** Max. 100 Nachrichten pro Tag (kann angepasst werden)

Wenn das Limit erreicht ist, werden Nachrichten automatisch für den nächsten Tag geplant.

---

## Intelligent Scheduling

Der Autopilot bestimmt den **optimalen Zeitpunkt** basierend auf:

### Faktoren

1. **Zeitzone des Kontakts**
   - Automatisch erkannt oder manuell gesetzt
   - Nachrichten werden zur lokalen Zeit gesendet

2. **Beste Kontaktzeit**
   - Aus historischen Daten gelernt
   - Standard: 14:00 Uhr (2 PM) lokale Zeit

3. **Wochentag**
   - Montag-Freitag bevorzugt
   - Wochenenden vermieden (außer konfiguriert)

4. **Rate Limiting**
   - Verhindert zu viele Nachrichten am selben Tag

### Beispiel

```
Kontakt: Max Mustermann (Berlin, UTC+1)
Beste Zeit: 14:00 Uhr
Geplante Nachricht: Morgen, 14:00 Uhr MEZ
```

---

## Kanäle

Der Autopilot unterstützt mehrere Kanäle:

| Kanal | Status | Features |
|-------|--------|----------|
| **Email** | ✅ Aktiv | Personalisierte E-Mails, HTML Templates |
| **WhatsApp** | ✅ Aktiv | Text-Nachrichten, Media Support |
| **LinkedIn** | 🟡 Beta | InMail, Connection Requests |
| **Instagram** | 🟡 Beta | Direct Messages |

### Kanal-Konfiguration

Jeder Kanal benötigt API-Credentials:

1. Gehen Sie zu **Einstellungen → Kanäle**
2. Wählen Sie einen Kanal
3. Geben Sie API-Keys ein:
   - **Email:** SMTP Credentials oder SendGrid API Key
   - **WhatsApp:** WhatsApp Business API Credentials
   - **LinkedIn:** LinkedIn API Credentials
   - **Instagram:** Instagram Graph API Credentials

---

## Monitoring & Analytics

### Autopilot Dashboard

**Screenshot Anweisung**

**Datei:** `docs/user-guide/screenshots/autopilot-dashboard.png`

**Was zu sehen sein sollte:**
- Autopilot Dashboard
- Metriken:
  - Gesendete Nachrichten: 1,234
  - Reply Rate: 23.5%
  - Average Confidence: 0.87
  - Pending in Queue: 12
- Graph: Nachrichten über Zeit
- Top Performing Templates Liste

**Caption:** *Das Autopilot Dashboard zeigt alle wichtigen Metriken und Performance-Indikatoren.*

---

## Best Practices

✅ **Confidence Threshold anpassen** - Starten Sie mit 0.85, senken Sie bei Bedarf

✅ **Review Queue regelmäßig prüfen** - Auch bei Auto-Approve sollten Sie die Queue überwachen

✅ **A/B Tests nutzen** - Testen Sie verschiedene Ansätze, um die beste Performance zu finden

✅ **Rate Limiting respektieren** - Zu viele Nachrichten schaden Ihrer Reputation

✅ **Kanäle diversifizieren** - Nutzen Sie verschiedene Kanäle für verschiedene Kontakte

✅ **Zeitzonen beachten** - Stellen Sie sicher, dass Kontakte ihre Zeitzone korrekt haben

---

## Häufige Fragen (FAQ)

**Q: Kann ich den Autopilot für bestimmte Leads deaktivieren?**  
A: Ja, Sie können den Autopilot pro Lead in den Lead-Einstellungen deaktivieren.

**Q: Wie oft werden Nachrichten gesendet?**  
A: Das hängt von Ihren Einstellungen ab. Standard: Max. 3 Nachrichten pro Tag pro Kontakt.

**Q: Kann ich eigene Templates erstellen?**  
A: Ja, Sie können eigene Templates in den Einstellungen erstellen und für A/B Tests nutzen.

**Q: Was passiert, wenn ein Kontakt "Opt-Out" wählt?**  
A: Der Kontakt wird automatisch zur Opt-Out-Liste hinzugefügt und erhält keine weiteren Nachrichten.

---

## Next Steps

- [ ] Add video tutorial
- [ ] Add advanced A/B testing guide
- [ ] Add template creation guide
- [ ] Add troubleshooting section

