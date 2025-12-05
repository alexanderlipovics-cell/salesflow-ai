# 🎓 Onboarding Flow - Integration Guide

## 📦 Komponenten-Übersicht

Der Onboarding Flow besteht aus 5 Hauptkomponenten:

1. **OnboardingScreen.tsx** - Welcome Screens beim ersten App-Start
2. **InteractiveTutorial.tsx** - Interaktives Tutorial nach Onboarding
3. **QuickStartChecklist.tsx** - Checkliste für erste Schritte
4. **Tooltip.tsx** - Kontextuelle Tooltips für First-time User
5. **EmptyState.tsx** - Empty States mit klaren CTAs

## 🔧 Installation & Setup

### 1. Wrapper in App.tsx hinzufügen

```tsx
import { OnboardingProvider } from './context/OnboardingContext';

export default function App() {
  return (
    <OnboardingProvider>
      {/* Deine App-Komponenten */}
    </OnboardingProvider>
  );
}
```

### 2. Navigation Setup

In deinem Navigation-Stack:

```tsx
import { useOnboarding } from './context/OnboardingContext';
import OnboardingScreen from './screens/OnboardingScreen';

function RootNavigator() {
  const { isOnboardingComplete } = useOnboarding();

  return (
    <Stack.Navigator>
      {!isOnboardingComplete ? (
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          {/* Deine normalen Screens */}
        </>
      )}
    </Stack.Navigator>
  );
}
```

### 3. Tutorial nach Onboarding anzeigen

```tsx
import { useOnboarding } from './context/OnboardingContext';
import InteractiveTutorial from './components/InteractiveTutorial';

function HomeScreen() {
  const { showTutorial, completeTutorial } = useOnboarding();

  return (
    <View>
      {/* Dein Screen Content */}
      
      <InteractiveTutorial 
        visible={showTutorial}
        onComplete={completeTutorial}
      />
    </View>
  );
}
```

### 4. Quick Start Checklist einbinden

```tsx
import QuickStartChecklist from './components/QuickStartChecklist';

function DashboardScreen({ navigation }) {
  return (
    <View>
      <QuickStartChecklist navigation={navigation} />
      {/* Rest deines Dashboards */}
    </View>
  );
}
```

### 5. Tooltips für First-time Actions

```tsx
import { useOnboardingTooltips } from './hooks/useOnboardingTooltips';
import Tooltip from './components/Tooltip';

function AddLeadButton() {
  const { currentTooltip, showTooltip, dismissTooltip } = useOnboardingTooltips();
  
  useEffect(() => {
    // Zeige Tooltip beim ersten Besuch
    showTooltip('add_lead_button');
  }, []);

  return (
    <View>
      <TouchableOpacity onPress={handleAddLead}>
        <Text>+ Lead hinzufügen</Text>
      </TouchableOpacity>
      
      <Tooltip
        visible={currentTooltip?.id === 'add_lead_button'}
        text={currentTooltip?.text || ''}
        onDismiss={() => dismissTooltip('add_lead_button')}
      />
    </View>
  );
}
```

### 6. Empty States verwenden

```tsx
import EmptyState from './components/EmptyState';

function LeadsListScreen({ navigation }) {
  const leads = useLeads();

  if (leads.length === 0) {
    return (
      <EmptyState
        icon="Users"
        title="Noch keine Leads"
        description="Füge deinen ersten Lead hinzu und starte deine Sales-Pipeline."
        actionText="Lead hinzufügen"
        onAction={() => navigation.navigate('LeadForm')}
      />
    );
  }

  return <LeadsList leads={leads} />;
}
```

## 🎯 Checkliste Items automatisch markieren

Wenn ein User eine Aktion ausführt, markiere das Item als erledigt:

```tsx
import { OnboardingHelper } from './utils/onboardingHelper';

// Wenn User einen Lead hinzufügt
async function handleLeadAdded() {
  await OnboardingHelper.markChecklistItemComplete('add_lead');
}

// Wenn User zum ersten Mal chattet
async function handleFirstChat() {
  await OnboardingHelper.markChecklistItemComplete('chat_ai');
}

// Wenn User ein Squad erstellt
async function handleSquadCreated() {
  await OnboardingHelper.markChecklistItemComplete('create_squad');
}

// Wenn User Email verbindet
async function handleEmailConnected() {
  await OnboardingHelper.markChecklistItemComplete('connect_email');
}
```

## 🔄 Onboarding zurücksetzen (für Testing)

```tsx
import { useOnboarding } from './context/OnboardingContext';

function SettingsScreen() {
  const { resetOnboarding } = useOnboarding();

  return (
    <TouchableOpacity onPress={resetOnboarding}>
      <Text>Onboarding zurücksetzen</Text>
    </TouchableOpacity>
  );
}
```

## 📊 Tracking & Analytics

Füge Analytics-Events hinzu, um das Onboarding zu optimieren:

```tsx
// Im OnboardingScreen
const handleGetStarted = async () => {
  // Analytics Event
  analytics.track('onboarding_completed');
  
  await AsyncStorage.setItem('onboarding_completed', 'true');
  navigation.replace('Main');
};

// Im Tutorial
const handleComplete = () => {
  analytics.track('tutorial_completed', {
    steps_completed: tutorialSteps.length
  });
  
  onComplete();
};
```

## 🎨 Anpassung & Styling

### Farben ändern

In jedem Component-File kannst du die Farben anpassen:

```tsx
const styles = StyleSheet.create({
  // Primärfarbe (Buttons, Active States)
  primaryColor: '#007AFF', // ← Hier ändern
  
  // Success-Farbe (Checkboxen, Progress)
  successColor: '#34C759', // ← Hier ändern
  
  // Text-Farben
  textPrimary: '#333',
  textSecondary: '#666',
});
```

### Slides anpassen

In `OnboardingScreen.tsx`:

```tsx
const slides = [
  {
    key: 'slide1',
    title: 'Dein Custom Title',
    description: 'Deine Custom Description',
    icon: '🎉', // Emoji oder Lucide Icon
  },
  // Weitere Slides...
];
```

### Tutorial-Steps anpassen

In `InteractiveTutorial.tsx`:

```tsx
const tutorialSteps: TutorialStep[] = [
  {
    id: 'custom_step',
    title: 'Dein Custom Step',
    description: 'Deine Anleitung',
    targetComponent: 'component-id',
    position: 'bottom',
  },
  // Weitere Steps...
];
```

## ✅ Success Criteria Checklist

- [x] Welcome Screens zeigen beim ersten App-Start
- [x] Interactive Tutorial startet nach Onboarding
- [x] Quick Start Checklist trackt User-Progress
- [x] Tooltips erscheinen bei First-time Actions
- [x] Empty States haben klare CTAs
- [x] User kann Onboarding überspringen
- [x] Progress wird lokal gespeichert (AsyncStorage)
- [x] Alle Komponenten sind typsicher (TypeScript)
- [x] Deutsche Texte durchgehend verwendet
- [x] Responsive Design für verschiedene Screen-Größen

## 🐛 Troubleshooting

### Problem: Onboarding zeigt nicht an

```tsx
// Lösung: AsyncStorage zurücksetzen
import { OnboardingHelper } from './utils/onboardingHelper';
await OnboardingHelper.resetOnboarding();
```

### Problem: Navigation funktioniert nicht

```tsx
// Stelle sicher, dass die Screen-Namen in der Navigation registriert sind
<Stack.Screen name="LeadForm" component={LeadFormScreen} />
<Stack.Screen name="IntelligentChat" component={IntelligentChatScreen} />
```

### Problem: Tooltips zeigen nicht

```tsx
// Prüfe, ob useOnboardingTooltips korrekt importiert ist
import { useOnboardingTooltips } from './hooks/useOnboardingTooltips';

// Stelle sicher, dass showTooltip aufgerufen wird
useEffect(() => {
  showTooltip('tooltip_id');
}, []);
```

## 📝 Best Practices

1. **Keep it Short**: Max. 5 Onboarding-Slides
2. **Value First**: Zeige sofort den Nutzen
3. **Skip Option**: Immer eine Skip-Option anbieten
4. **Progressive Disclosure**: Nicht alles auf einmal zeigen
5. **Track Progress**: Speichere jeden Schritt
6. **Test Regularly**: Teste mit echten First-time Usern

## 🚀 Next Steps

- [ ] A/B Testing für Onboarding-Varianten
- [ ] Video-Tutorials einbauen (optional)
- [ ] Gamification mit Badges & Achievements
- [ ] Personalisierte Onboarding-Flows je nach User-Typ
- [ ] Multi-Language Support für EN/DE

---

**Du hast einen vollständigen, produktionsreifen Onboarding Flow! 🎉**

