# 🚀 APP STARTEN - KORREKTE BEFEHLE

## ⚠️ WICHTIG: Projektstruktur

Das Projekt hat folgende Struktur:
```
salesflow-app/
├── src/              ← Frontend Code (React Native)
├── backend/          ← Backend Code (Python)
└── package.json      ← Im Hauptverzeichnis!
```

## ✅ Korrekte Befehle

### Terminal 1: Backend starten

```bash
# Im src/backend Verzeichnis
cd src/backend
python -m uvicorn app.main:app --reload
```

**ODER** wenn du bereits im `src/backend` Verzeichnis bist:
```bash
python -m uvicorn app.main:app --reload
```

### Terminal 2: Frontend starten

```bash
# WICHTIG: Im Hauptverzeichnis (salesflow-app/), NICHT in src/!
cd ../..  # Von src/backend aus
# Oder direkt:
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-app

# Dann:
npm start
# ODER
npx expo start
```

**ODER** wenn package.json im src/ Verzeichnis ist:
```bash
# Im src/ Verzeichnis bleiben
cd src
npm start
# ODER
npx expo start
```

## 🔍 Prüfen wo package.json ist

Führe aus:
```bash
# Von src/ aus:
cd ..
ls package.json
# ODER
Get-ChildItem package.json -Recurse -ErrorAction SilentlyContinue
```

## 📋 Schnellstart-Checkliste

1. **Backend starten:**
   ```bash
   cd src/backend
   python -m uvicorn app.main:app --reload
   ```
   ✅ Erwartet: "Uvicorn running on http://127.0.0.1:8000"

2. **Frontend starten:**
   ```bash
   # Prüfe wo package.json ist:
   cd ..
   # Wenn package.json hier ist:
   npm start
   # Wenn nicht, gehe eine Ebene höher:
   cd ..
   npm start
   ```
   ✅ Erwartet: Expo DevTools öffnet sich

3. **App testen:**
   - Öffne Expo Go App auf dem Handy
   - Oder drücke `w` für Web
   - Oder drücke `a` für Android Emulator

## 🐛 Troubleshooting

### Problem: "package.json not found"
**Lösung:**
- Prüfe ob package.json im aktuellen Verzeichnis ist: `ls package.json`
- Wenn nicht, gehe eine Ebene höher: `cd ..`
- Oder finde package.json: `Get-ChildItem package.json -Recurse`

### Problem: "frontend directory not found"
**Lösung:**
- Es gibt kein `frontend/` Verzeichnis
- Frontend Code ist direkt in `src/`
- Starte von dort wo `package.json` ist

### Problem: "expo command not found"
**Lösung:**
```bash
npm install -g expo-cli
# ODER
npx expo start
```

## ✅ Erfolgskriterien

- [ ] Backend läuft auf Port 8000
- [ ] Frontend startet ohne Fehler
- [ ] Expo DevTools öffnet sich
- [ ] App kann auf Gerät/Emulator geladen werden

