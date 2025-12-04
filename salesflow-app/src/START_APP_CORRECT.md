# ✅ KORREKTE BEFEHLE ZUM APP-STARTEN

## 📁 Projektstruktur

```
salesflow-app/              ← HIER ist package.json!
├── src/                    ← Frontend Code
│   ├── components/
│   ├── screens/
│   └── ...
├── backend/                ← Backend Code (separat)
└── package.json            ← ✅ HIER!
```

## 🚀 Schritt-für-Schritt

### Terminal 1: Backend starten

```powershell
# Von salesflow-app/ aus:
cd src/backend
python -m uvicorn app.main:app --reload
```

**ODER** wenn du bereits in `src/backend` bist:
```powershell
python -m uvicorn app.main:app --reload
```

✅ **Erwartet:** `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2: Frontend starten

```powershell
# WICHTIG: Im Hauptverzeichnis salesflow-app/, NICHT in src/!
# Von src/backend aus:
cd ..\..\..
# Oder direkt:
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-app

# Dann:
npm start
```

✅ **Erwartet:** Expo DevTools öffnet sich im Browser

## 📋 Komplette Befehle (Copy-Paste)

### Backend:
```powershell
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-app\src\backend
python -m uvicorn app.main:app --reload
```

### Frontend:
```powershell
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-app
npm start
```

## 🎯 Nach dem Start

1. **Expo DevTools** öffnet sich automatisch
2. **QR-Code** wird angezeigt
3. **Optionen:**
   - `w` = Web öffnen
   - `a` = Android Emulator
   - `i` = iOS Simulator
   - QR-Code scannen mit Expo Go App

## ✅ Testing-Checkliste

Nachdem beide laufen:

1. **Settings öffnen**
   - [ ] Vertical Selector sichtbar
   - [ ] Module Selector sichtbar

2. **Vertical wechseln**
   - [ ] "Außendienst B2B" auswählen
   - [ ] Erfolgs-Meldung

3. **Module aktivieren**
   - [ ] Phoenix aktivieren
   - [ ] DelayMaster aktivieren

4. **Chat testen**
   - [ ] "Bin 30 Minuten zu früh" → Phoenix aktiviert
   - [ ] "Wann sollte ich Anna kontaktieren?" → DelayMaster

## 🐛 Falls Fehler auftreten

### "package.json not found"
→ Du bist im falschen Verzeichnis. Gehe zu `salesflow-app/`

### "expo command not found"
```powershell
npm install -g expo-cli
# ODER einfach:
npx expo start
```

### Backend-Fehler
→ Prüfe ob Python und alle Dependencies installiert sind:
```powershell
cd src/backend
pip install -r requirements.txt
```

