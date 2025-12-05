# Testing Setup - Installationsanleitung

## 🚀 Schritt 1: Dependencies installieren

Führen Sie diesen Befehl im Terminal aus (im `sales-flow-ai` Verzeichnis):

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native jest-expo react-test-renderer@19.1.0 @types/react-test-renderer @testing-library/jest-native --legacy-peer-deps
```

**Hinweis:** `--legacy-peer-deps` ist notwendig, da es einen Konflikt zwischen React 19.1.0 und react-test-renderer gibt.

## ✅ Schritt 2: Verifizierung

Nach der Installation sollten Sie folgende Dateien haben:

- ✅ `jest-setup.js` (bereits erstellt)
- ✅ `package.json` mit Jest-Konfiguration (bereits angepasst)
- ✅ Test-Dateien:
  - `utils/date.test.ts`
  - `components/ProgressCard.test.tsx`
  - `context/SalesFlowContext.test.tsx`

## 🧪 Schritt 3: Tests ausführen

```bash
npm test
```

Oder für Watch-Mode:

```bash
npm test -- --watch
```

## 📝 Erstellte Dateien

### 1. `utils/date.ts`
- Refactored `formatDueDate` Funktion aus `today.tsx`
- Wiederverwendbar und testbar

### 2. `jest-setup.js`
- Setup für Jest mit React Native Testing Library
- Mocking für Expo Modules und AsyncStorage

### 3. Test-Dateien:
- **`utils/date.test.ts`**: Testet die Datumsformatierung mit gemockten Zeiten
- **`components/ProgressCard.test.tsx`**: Testet das Rendering der ProgressCard-Komponente
- **`context/SalesFlowContext.test.tsx`**: Testet den globalen State Management Context

## 🔧 Bekannte Probleme

Falls die Installation fehlschlägt:

1. **Dependency-Konflikte**: Verwenden Sie `--legacy-peer-deps`
2. **Expo-Version**: Stellen Sie sicher, dass Ihre Expo-Version kompatibel ist
3. **TypeScript-Fehler**: Nach der Installation sollten die TypeScript-Fehler verschwinden

## 📚 Nächste Schritte

Nach erfolgreicher Installation können Sie:
- Weitere Tests für andere Komponenten hinzufügen
- Integration-Tests für Screens erstellen
- E2E-Tests mit Detox oder ähnlichen Tools einrichten

