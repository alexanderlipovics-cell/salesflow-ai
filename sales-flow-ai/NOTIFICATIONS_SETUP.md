# 🔔 Notification System Setup Guide

**Production-Ready Notification System für React Native Expo**

---

## 📋 Übersicht

Das Notification-System bietet:

- ✅ **User Preferences** - Vollständige Kontrolle über Benachrichtigungen
- ✅ **Timezone Handling** - Korrekte Zeitbehandlung
- ✅ **Quiet Hours** - Ruhige Stunden konfigurierbar
- ✅ **Deep Linking** - Navigation zu spezifischen Screens
- ✅ **Analytics** - Tracking von Engagement (sent, opened, dismissed)
- ✅ **Badge Management** - Automatisches Badge-Counting
- ✅ **Push Token Registration** - Automatische Backend-Registrierung

---

## 🚀 Installation

### **1. Dependencies installieren**

```bash
cd sales-flow-ai

# Core notification packages
npx expo install expo-notifications expo-device expo-constants

# Storage für Preferences
npx expo install @react-native-async-storage/async-storage

# Deep Linking (bereits installiert)
# expo-linking ist bereits in package.json
```

### **2. Prüfe package.json**

Stelle sicher, dass folgende Dependencies vorhanden sind:

```json
{
  "dependencies": {
    "expo-notifications": "~0.28.0",
    "expo-device": "~6.0.0",
    "expo-constants": "~18.0.0",
    "@react-native-async-storage/async-storage": "~2.0.0",
    "expo-linking": "~8.0.0"
  }
}
```

---

## 📁 Dateien-Struktur

```
sales-flow-ai/
├── types/
│   └── notifications.ts              ✅ Erstellt
├── utils/
│   ├── notificationPreferences.ts   ✅ Erstellt
│   ├── notificationAnalytics.ts      ✅ Erstellt
│   └── notifications.ts              ✅ Erstellt
├── app/
│   ├── _layout.tsx                   ✅ Aktualisiert (Initialisierung)
│   └── (tabs)/
│       └── notifications.tsx          ✅ Erstellt (Settings Screen)
└── app.json                          ✅ Aktualisiert (Notification Config)
```

---

## ⚙️ Konfiguration

### **app.json wurde aktualisiert:**

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "permissions": ["NOTIFICATIONS", "VIBRATE"],
      "useNextNotificationsApi": true
    },
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#FF9800"
    }
  }
}
```

---

## 🔧 Integration

### **1. App Initialisierung**

Die Initialisierung erfolgt automatisch in `app/_layout.tsx`:

```typescript
useEffect(() => {
  const init = async () => {
    await notificationPreferences.initialize();
    await notificationAnalytics.initialize();
    await notificationManager.initialize();
    await notificationManager.requestPermissions();
  };
  init();
}, []);
```

### **2. Daily Reminder in Context**

Füge in `context/SalesFlowContext.tsx` hinzu:

```typescript
import { notificationManager } from '../utils/notifications';

// Nach dem Laden von todayData
useEffect(() => {
  if (state.todayData) {
    const target = state.todayData.user_stats.today_contacts_target;
    notificationManager.scheduleDailyReminder(target);
  }
}, [state.todayData]);
```

### **3. Lead Reminders**

Wenn ein Follow-up erstellt wird:

```typescript
import { notificationManager } from '../utils/notifications';

// Beim Erstellen eines Follow-ups
await notificationManager.scheduleLeadReminder(
  leadName,
  leadId,
  dueAt // ISO string
);
```

---

## 🧪 Testing

### **1. Daily Reminder testen**

```typescript
// Temporär: Setze Zeit auf 1 Minute von jetzt
const testTime = new Date();
testTime.setMinutes(testTime.getMinutes() + 1);
const testTimeStr = `${testTime.getHours()}:${testTime.getMinutes().toString().padStart(2, '0')}`;

await notificationPreferences.setDailyReminderTime(testTimeStr);
await notificationManager.scheduleDailyReminder(10);
```

### **2. Lead Reminder testen**

```typescript
const testDueAt = new Date();
testDueAt.setMinutes(testDueAt.getMinutes() + 1); // 1 Minute von jetzt

await notificationManager.scheduleLeadReminder(
  'Test Lead',
  'test-lead-id',
  testDueAt.toISOString()
);
```

### **3. Quiet Hours testen**

```typescript
// Setze Quiet Hours auf jetzt
const now = new Date();
const nowStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
const endStr = `${(now.getHours() + 1) % 24}:${now.getMinutes().toString().padStart(2, '0')}`;

await notificationPreferences.setQuietHours(nowStr, endStr);

// Versuche Notification zu senden - sollte nicht angezeigt werden
await notificationManager.sendLocalNotification(
  'Test',
  'Should not show',
  { category: NotificationCategory.DAILY_REMINDER }
);
```

---

## 📊 Analytics

### **Analytics abrufen:**

```typescript
import { notificationAnalytics } from '../utils/notificationAnalytics';
import { NotificationCategory } from '../types/notifications';

const analytics = notificationAnalytics.getAnalytics();
const openRate = notificationAnalytics.getOpenRate(NotificationCategory.DAILY_REMINDER);

console.log('Daily Reminder Open Rate:', openRate, '%');
```

---

## 🔗 Deep Linking

### **Navigation Setup**

Das System verwendet `expo-linking` für Deep Linking:

```typescript
// Notification öffnet automatisch:
// salesflow://lead-detail?leadId=123
// salesflow://squad?challengeId=456
// salesflow://today
```

### **Deep Link Handler in app/_layout.tsx**

Füge hinzu (falls noch nicht vorhanden):

```typescript
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

useEffect(() => {
  const subscription = Linking.addEventListener('url', (event) => {
    const { path, queryParams } = Linking.parse(event.url);
    
    if (path === 'lead-detail' && queryParams?.leadId) {
      router.push(`/lead-detail?id=${queryParams.leadId}`);
    } else if (path === 'squad' && queryParams?.challengeId) {
      router.push(`/squad?challengeId=${queryParams.challengeId}`);
    } else if (path === 'today') {
      router.push('/today');
    }
  });

  return () => subscription.remove();
}, []);
```

---

## 🐛 Troubleshooting

### **Problem: Notifications funktionieren nicht**

**Lösung:**
1. Prüfe ob auf physischem Gerät getestet wird (Simulator unterstützt keine Push)
2. Prüfe Permissions: `await Notifications.getPermissionsAsync()`
3. Prüfe ob `Device.isDevice` true ist

### **Problem: Push Token wird nicht registriert**

**Lösung:**
1. Prüfe `EXPO_PROJECT_ID` in `.env` oder `app.json`
2. Prüfe Backend-Integration in `registerTokenWithBackend()`
3. Prüfe Supabase Connection

### **Problem: Badge Count stimmt nicht**

**Lösung:**
1. Prüfe `updateBadgeCount()` wird aufgerufen
2. Prüfe ob `cancelAllAppNotifications()` nur App-Notifications löscht
3. Manuell zurücksetzen: `await Notifications.setBadgeCountAsync(0)`

---

## ✅ Checklist

- [ ] Dependencies installiert
- [ ] app.json aktualisiert
- [ ] Notification Manager initialisiert in _layout.tsx
- [ ] Daily Reminder in Context integriert
- [ ] Lead Reminders beim Follow-up-Erstellen integriert
- [ ] Deep Linking konfiguriert
- [ ] Push Token wird an Backend gesendet
- [ ] Settings Screen getestet
- [ ] Quiet Hours getestet
- [ ] Analytics getestet

---

## 📚 Weitere Ressourcen

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Linking Docs](https://docs.expo.dev/versions/latest/sdk/linking/)
- [AsyncStorage Docs](https://react-native-async-storage.github.io/async-storage/)

---

**Fertig! 🎉**

Das Notification-System ist production-ready und einsatzbereit!

