# Sales Flow AI - LinkedIn Browser Extension

## 🧪 Quick Test

1. Extension installieren (siehe unten)
2. Popup öffnen → Auth Token eingeben
3. Auf LinkedIn gehen
4. "Fetch Actions" klicken
5. Bei Actions in Queue → "Process" klicken

## Installation (Chrome)

1. Öffne `chrome://extensions/`
2. Aktiviere "Entwicklermodus" (oben rechts)
3. Klicke "Entpackte Erweiterung laden"
4. Wähle diesen `browser-extension` Ordner

## Features

### 🔗 Connection Requests
- Sendet automatisch Connection Requests mit personalisierter Notiz
- Respektiert LinkedIn Rate Limits
- Randomisierte Verzögerungen für natürliches Verhalten

### 💬 Direct Messages
- Sendet DMs an bestehende Connections
- Personalisierung mit Variablen ({{name}}, {{company}}, etc.)

### 📩 InMail (Premium)
- Für Kontakte die keine Connection sind
- Benötigt LinkedIn Premium

### 🚀 Quick Actions
- Button auf LinkedIn-Profilen zum schnellen Hinzufügen zu Sequences
- Scraped automatisch Profil-Daten

## Sicherheit

⚠️ **Wichtig:** Diese Extension automatisiert LinkedIn-Aktionen. Das kann gegen LinkedIns Terms of Service verstoßen. Verwende auf eigenes Risiko:

- **Langsame Geschwindigkeit**: Max. 20-30 Connections/Tag
- **Randomisierte Delays**: Menschliches Verhalten simulieren
- **Account Warmup**: Langsam starten mit neuen Accounts
- **Keine Spam-Nachrichten**: Personalisierte, relevante Nachrichten

## API Token

1. Gehe zu Sales Flow AI App
2. Einstellungen → API → Token generieren
3. Kopiere Token in Extension

## Development

```bash
# Extension neu laden nach Änderungen:
# Chrome → Extensions → Reload Button (🔄)
```

## Troubleshooting

### "Connect Button not found"
- LinkedIn hat das Layout geändert
- Button-Selektoren in content.js anpassen

### "Message not sent"
- Prüfe ob du mit dem Kontakt connected bist
- LinkedIn Message-Limit erreicht?

### Extension lädt nicht
- Prüfe chrome://extensions/ auf Fehler
- Console im Extension-Popup öffnen

