# 🚀 Expo App starten

## Option 1: Ohne Login (Empfohlen für lokale Entwicklung)

Du kannst die App auch ohne Expo-Account starten:

```bash
# Starte Expo im lokalen Modus
npx expo start --offline

# Oder einfach:
npm start
```

Dann wähle im Terminal:
- `a` für Android Emulator
- `i` für iOS Simulator
- `w` für Web Browser
- `r` zum Neuladen

---

## Option 2: Mit Expo Login (Optional)

Falls du Expo-Features wie EAS Build nutzen möchtest:

```bash
# Login bei Expo
npx expo login

# Dann normal starten
npm start
```

**Hinweis:** Für lokale Entwicklung ist kein Login erforderlich!

---

## Option 3: Anonym fortfahren

Wenn Expo nach Login fragt, wähle:
- `Proceed anonymously` (Anonym fortfahren)

---

## Troubleshooting

### Problem: "AssertionError" beim Login
- Lösung: Wähle "Proceed anonymously" oder starte mit `--offline`

### Problem: App startet nicht
- Prüfe, ob alle Dependencies installiert sind: `npm install`
- Prüfe, ob Node.js und npm aktuell sind

### Problem: Metro Bundler startet nicht
- Lösche Cache: `npx expo start --clear`
- Prüfe, ob Port 8081 frei ist

---

## Nächste Schritte

1. **App starten:**
   ```bash
   npm start
   ```

2. **QR-Code scannen** (mit Expo Go App auf dem Handy) oder
   **Emulator starten** (Android Studio / Xcode)

3. **App testen:**
   - Alle 5 Screens sollten in der Bottom Tab Bar sichtbar sein
   - Navigation zwischen Screens testen
   - API-Calls testen (falls Backend läuft)

