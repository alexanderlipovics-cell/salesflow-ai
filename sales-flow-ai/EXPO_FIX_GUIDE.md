# 🔧 Expo App Entry Point - Fix Guide

## ✅ Problem gelöst!

### **Was war das Problem?**
- `package.json` hatte `"main": "expo-router/entry"`
- Aber expo-router war aus `app.json` plugins entfernt
- → Expo konnte die App nicht finden

### **Die Lösung:**
1. ✅ `package.json` gefixt: `"main": "node_modules/expo/AppEntry.js"`
2. ✅ `App.tsx` erweitert mit besserer UI
3. ✅ `app.json` ist korrekt konfiguriert

---

## 🚀 App starten

```bash
# 1. Clear Cache (WICHTIG nach dem Fix!)
cd sales-flow-ai
npx expo start -c

# 2. Oder mit npm:
npm run start -- -c

# 3. Für Web:
npm run web

# 4. Für Android Emulator:
npm run android

# 5. Für iOS Simulator:
npm run ios
```

---

## 📋 Wenn immer noch Probleme:

### **1. Kompletter Cache Clear:**
```bash
# Stop alle Metro Bundler
# (Ctrl+C in allen Terminal-Windows)

# Delete all caches
rm -rf node_modules
rm -rf .expo
rm -rf ios/build (falls vorhanden)
rm -rf android/build (falls vorhanden)

# Reinstall
npm install

# Start clean
npx expo start -c
```

### **2. Watchman Reset (macOS/Linux):**
```bash
watchman watch-del-all
```

### **3. Metro Bundler Port Reset:**
```bash
# Kill process on port 8081
npx kill-port 8081

# Oder manual:
lsof -ti:8081 | xargs kill
```

---

## 📁 File Structure Check

Stelle sicher, dass diese Files existieren:

```
sales-flow-ai/
├── App.tsx ✅ (Main entry - this file should exist!)
├── app.json ✅
├── package.json ✅ (main: "node_modules/expo/AppEntry.js")
├── babel.config.js ✅
├── tsconfig.json ✅
└── assets/
    ├── icon.png
    ├── splash.png (oder splash-icon.png)
    ├── adaptive-icon.png
    └── favicon.png
```

---

## 🔍 Debug Checklist

- [ ] `App.tsx` existiert im Root (nicht in src/)
- [ ] `package.json` hat `"main": "node_modules/expo/AppEntry.js"`
- [ ] `app.json` ist valides JSON (keine Syntax-Errors)
- [ ] `node_modules` Ordner existiert (npm install lief durch)
- [ ] Keine laufenden Metro Bundler Prozesse
- [ ] Port 8081 ist frei

---

## 🐛 Häufige Fehler & Fixes

### **Error: "Unable to resolve module"**
```bash
# Fix: Clear Metro cache
npx expo start -c
```

### **Error: "App.tsx not found"**
```bash
# Fix: Check package.json main field
# Should be: "main": "node_modules/expo/AppEntry.js"
```

### **Error: "Metro bundler port in use"**
```bash
# Fix: Kill port 8081
npx kill-port 8081
```

### **Error: "Cannot read property 'addListener'"**
```bash
# Fix: Update expo packages
npx expo install --fix
```

---

## 📊 Verify Setup

```bash
# 1. Check Expo Doctor
npx expo-doctor

# 2. Check package versions
npx expo install --check

# 3. Verify app.json
cat app.json | grep "main\|plugins"

# Expected output:
# Should NOT show "main" in app.json (that's in package.json)
# plugins should be empty [] or not include expo-router
```

---

## ✅ Success Indicators

Nach erfolgreichem Start solltest du sehen:

```
Starting Metro Bundler
✓ Metro waiting on exp://192.168...
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

Im Browser/App:
```
Sales Flow AI
App läuft erfolgreich! 🚀
Version 1.0.0
Platform: web/ios/android
```

---

## 🔄 Migration from expo-router to Classic App

Wenn du von expo-router zur klassischen App migriert hast:

**Vorher:**
```json
// package.json
"main": "expo-router/entry"

// app.json
"plugins": ["expo-router"]
```

**Nachher:**
```json
// package.json
"main": "node_modules/expo/AppEntry.js"

// app.json
"plugins": []  // or remove expo-router
```

---

## 🚀 Next Steps

1. ✅ App läuft mit minimal UI
2. 🔄 Navigation hinzufügen (React Navigation)
3. 🔄 Authentication Flow
4. 🔄 State Management
5. 🔄 API Integration

---

## 📞 Still Having Issues?

1. Check Metro Bundler logs (im Terminal)
2. Check Browser Console (F12) für Web
3. Check Expo Go App logs
4. Run `npx expo-doctor` für Diagnose

---

**Fixed! 🎉**

