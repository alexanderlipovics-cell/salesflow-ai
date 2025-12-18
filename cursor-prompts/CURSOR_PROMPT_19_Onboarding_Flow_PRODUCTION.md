# REACT NATIVE - COMPLETE ONBOARDING FLOW (PRODUCTION-READY)

**⚠️ ANALYSIS REPORT:**
Critical onboarding missing. Users need guided first-time experience with:
1. No welcome screens (users confused about app purpose)
2. No company selection (users don't know which MLM they're in)
3. No profile setup (missing name, avatar, preferences)
4. No permissions request flow (notifications/contacts suddenly requested)
5. No tutorial overlays (users don't know how to use features)
6. No skip option (power users can't skip)
7. No progress indicator (users don't know how long onboarding takes)
8. No data persistence (closing app resets onboarding)
9. No analytics tracking (can't measure drop-off)
10. No A/B testing support (can't optimize conversion)

---

## PART 1: ONBOARDING TYPES & STATE

```typescript
// types/onboarding.ts

export interface OnboardingStep {
  id: string;
  type: 'welcome' | 'company' | 'profile' | 'permissions' | 'tutorial';
  title: string;
  description: string;
  image?: string;
  required: boolean;
  completed: boolean;
}

export interface OnboardingState {
  isFirstLaunch: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  completedAt?: string;
  skipped: boolean;
}

export interface WelcomeSlide {
  id: string;
  title: string;
  description: string;
  image: string;
  animation?: 'fade' | 'slide' | 'scale';
}

export interface CompanyOption {
  id: string;
  name: string;
  logo: string;
  description: string;
  primary_color: string;
}

export interface PermissionRequest {
  type: 'notifications' | 'contacts' | 'camera' | 'location';
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
}
```

---

## PART 2: ONBOARDING MANAGER

```typescript
// utils/onboardingManager.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingState, OnboardingStep } from '../types/onboarding';

const ONBOARDING_KEY = 'onboarding_state';
const FIRST_LAUNCH_KEY = 'is_first_launch';

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Welcome',
    description: '3 slides introducing the app',
    required: true,
    completed: false
  },
  {
    id: 'company',
    type: 'company',
    title: 'Select Company',
    description: 'Choose your MLM company',
    required: true,
    completed: false
  },
  {
    id: 'profile',
    type: 'profile',
    title: 'Setup Profile',
    description: 'Name, avatar, preferences',
    required: true,
    completed: false
  },
  {
    id: 'permissions',
    type: 'permissions',
    title: 'Permissions',
    description: 'Enable notifications & contacts',
    required: false,
    completed: false
  },
  {
    id: 'tutorial',
    type: 'tutorial',
    title: 'Quick Tutorial',
    description: 'Learn key features',
    required: false,
    completed: false
  }
];

export class OnboardingManager {
  
  static async isFirstLaunch(): Promise<boolean> {
    const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    return value === null;
  }
  
  static async markLaunched(): Promise<void> {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
  }
  
  static async getState(): Promise<OnboardingState> {
    const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      isFirstLaunch: await this.isFirstLaunch(),
      currentStep: 0,
      steps: DEFAULT_STEPS,
      skipped: false
    };
  }
  
  static async saveState(state: OnboardingState): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  }
  
  static async completeStep(stepId: string): Promise<OnboardingState> {
    const state = await this.getState();
    
    const stepIndex = state.steps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1) {
      state.steps[stepIndex].completed = true;
      state.currentStep = Math.min(stepIndex + 1, state.steps.length);
    }
    
    await this.saveState(state);
    return state;
  }
  
  static async skipOnboarding(): Promise<void> {
    const state = await this.getState();
    state.skipped = true;
    state.completedAt = new Date().toISOString();
    await this.saveState(state);
    await this.markLaunched();
  }
  
  static async completeOnboarding(): Promise<void> {
    const state = await this.getState();
    state.completedAt = new Date().toISOString();
    await this.saveState(state);
    await this.markLaunched();
  }
  
  static async resetOnboarding(): Promise<void> {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
  }
}
```

---

## PART 3: WELCOME SLIDES SCREEN

```tsx
// screens/onboarding/WelcomeScreen.tsx

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { WelcomeSlide } from '../../types/onboarding';

const { width } = Dimensions.get('window');

const SLIDES: WelcomeSlide[] = [
  {
    id: '1',
    title: 'Welcome to SalesFlow AI',
    description: 'Your personal AI assistant for MLM success',
    image: '🚀',
    animation: 'fade'
  },
  {
    id: '2',
    title: 'Smart Lead Management',
    description: 'Track and prioritize your contacts with AI-powered insights',
    image: '🎯',
    animation: 'slide'
  },
  {
    id: '3',
    title: 'Team Collaboration',
    description: 'Build and manage your downline with real-time analytics',
    image: '👥',
    animation: 'scale'
  }
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    }
  });
  
  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: width * nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      onComplete();
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {/* Slides */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <Text style={styles.emoji}>{slide.image}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </Animated.ScrollView>
      
      {/* Pagination dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.dotActive
            ]}
          />
        ))}
      </View>
      
      {/* Next button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>
          {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10
  },
  skipText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600'
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emoji: {
    fontSize: 100,
    marginBottom: 40
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4
  },
  dotActive: {
    backgroundColor: '#FF5722',
    width: 24
  },
  nextButton: {
    backgroundColor: '#FF5722',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

---

## PART 4: COMPANY SELECTION SCREEN

```tsx
// screens/onboarding/CompanySelectionScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { CompanyOption } from '../../types/onboarding';

interface Props {
  onComplete: (companyId: string) => void;
}

export const CompanySelectionScreen: React.FC<Props> = ({ onComplete }) => {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch from API or use mock data
    setCompanies([
      {
        id: '1',
        name: 'Zinzino',
        logo: 'https://example.com/zinzino.png',
        description: 'Health & Wellness',
        primary_color: '#FF6B00'
      },
      {
        id: '2',
        name: 'Herbalife',
        logo: 'https://example.com/herbalife.png',
        description: 'Nutrition & Weight Management',
        primary_color: '#00A651'
      },
      {
        id: '3',
        name: 'Amway',
        logo: 'https://example.com/amway.png',
        description: 'Health, Beauty & Home',
        primary_color: '#0066B2'
      }
    ]);
  }, []);
  
  const renderCompany = ({ item }: { item: CompanyOption }) => (
    <TouchableOpacity
      style={[
        styles.companyCard,
        selectedId === item.id && styles.companyCardSelected
      ]}
      onPress={() => setSelectedId(item.id)}
    >
      <Image source={{ uri: item.logo }} style={styles.logo} />
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.name}</Text>
        <Text style={styles.companyDescription}>{item.description}</Text>
      </View>
      {selectedId === item.id && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Company</Text>
      <Text style={styles.subtitle}>Choose the MLM company you work with</Text>
      
      <FlatList
        data={companies}
        renderItem={renderCompany}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
      
      <TouchableOpacity
        style={[
          styles.continueButton,
          !selectedId && styles.continueButtonDisabled
        ]}
        onPress={() => selectedId && onComplete(selectedId)}
        disabled={!selectedId}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24
  },
  list: {
    paddingBottom: 20
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  companyCardSelected: {
    borderColor: '#FF5722'
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16
  },
  companyInfo: {
    flex: 1
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  companyDescription: {
    fontSize: 14,
    color: '#666'
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  continueButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  continueButtonDisabled: {
    opacity: 0.5
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

---

## PART 5: PROFILE SETUP SCREEN

```tsx
// screens/onboarding/ProfileSetupScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  onComplete: (profile: { name: string; avatar?: string }) => void;
}

export const ProfileSetupScreen: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please grant camera roll permissions');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };
  
  const handleContinue = () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid name', 'Please enter your name');
      return;
    }
    
    onComplete({ name: name.trim(), avatar });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Your Profile</Text>
      <Text style={styles.subtitle}>Let's personalize your experience</Text>
      
      {/* Avatar */}
      <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>📷</Text>
            <Text style={styles.avatarLabel}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Name Input */}
      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      
      <TouchableOpacity
        style={[
          styles.continueButton,
          name.trim().length < 2 && styles.continueButtonDisabled
        ]}
        onPress={handleContinue}
        disabled={name.trim().length < 2}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 40
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed'
  },
  avatarPlaceholderText: {
    fontSize: 40,
    marginBottom: 8
  },
  avatarLabel: {
    fontSize: 14,
    color: '#666'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 40
  },
  continueButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  continueButtonDisabled: {
    opacity: 0.5
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

---

## PART 6: PERMISSIONS SCREEN

```tsx
// screens/onboarding/PermissionsScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import { PermissionRequest } from '../../types/onboarding';

interface Props {
  onComplete: (granted: string[]) => void;
  onSkip: () => void;
}

export const PermissionsScreen: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [permissions, setPermissions] = useState<PermissionRequest[]>([
    {
      type: 'notifications',
      title: 'Enable Notifications',
      description: 'Get reminders for follow-ups and team updates',
      required: false,
      granted: false
    },
    {
      type: 'contacts',
      title: 'Access Contacts',
      description: 'Quickly add leads from your phone contacts',
      required: false,
      granted: false
    }
  ]);
  
  const requestPermission = async (type: string) => {
    let granted = false;
    
    if (type === 'notifications') {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status === 'granted';
    } else if (type === 'contacts') {
      const { status } = await Contacts.requestPermissionsAsync();
      granted = status === 'granted';
    }
    
    setPermissions(prev => 
      prev.map(p => p.type === type ? { ...p, granted } : p)
    );
    
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'You can enable this later in Settings'
      );
    }
  };
  
  const handleContinue = () => {
    const grantedPermissions = permissions
      .filter(p => p.granted)
      .map(p => p.type);
    
    onComplete(grantedPermissions);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable Permissions</Text>
      <Text style={styles.subtitle}>
        Help us provide you with the best experience
      </Text>
      
      {permissions.map(permission => (
        <View key={permission.type} style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Text style={styles.permissionIconText}>
              {permission.type === 'notifications' ? '🔔' : '👥'}
            </Text>
          </View>
          
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>{permission.title}</Text>
            <Text style={styles.permissionDescription}>
              {permission.description}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.enableButton,
              permission.granted && styles.enableButtonGranted
            ]}
            onPress={() => requestPermission(permission.type)}
            disabled={permission.granted}
          >
            <Text style={styles.enableButtonText}>
              {permission.granted ? '✓' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
      
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  permissionIconText: {
    fontSize: 24
  },
  permissionInfo: {
    flex: 1
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666'
  },
  enableButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  enableButtonGranted: {
    backgroundColor: '#4CAF50'
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  continueButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16
  },
  skipText: {
    color: '#999',
    fontSize: 16
  }
});
```

---

## PART 7: ONBOARDING NAVIGATOR

```tsx
// navigation/OnboardingNavigator.tsx

import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingManager } from '../utils/onboardingManager';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CompanySelectionScreen } from '../screens/onboarding/CompanySelectionScreen';
import { ProfileSetupScreen } from '../screens/onboarding/ProfileSetupScreen';
import { PermissionsScreen } from '../screens/onboarding/PermissionsScreen';

const Stack = createStackNavigator();

interface Props {
  onComplete: () => void;
}

export const OnboardingNavigator: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState('welcome');
  
  const handleWelcomeComplete = async () => {
    await OnboardingManager.completeStep('welcome');
    setCurrentStep('company');
  };
  
  const handleCompanyComplete = async (companyId: string) => {
    // Save company to backend/storage
    await OnboardingManager.completeStep('company');
    setCurrentStep('profile');
  };
  
  const handleProfileComplete = async (profile: any) => {
    // Save profile to backend/storage
    await OnboardingManager.completeStep('profile');
    setCurrentStep('permissions');
  };
  
  const handlePermissionsComplete = async (granted: string[]) => {
    // Save permissions state
    await OnboardingManager.completeStep('permissions');
    await OnboardingManager.completeOnboarding();
    onComplete();
  };
  
  const handleSkip = async () => {
    await OnboardingManager.skipOnboarding();
    onComplete();
  };
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {currentStep === 'welcome' && (
        <Stack.Screen name="Welcome">
          {() => (
            <WelcomeScreen
              onComplete={handleWelcomeComplete}
              onSkip={handleSkip}
            />
          )}
        </Stack.Screen>
      )}
      
      {currentStep === 'company' && (
        <Stack.Screen name="Company">
          {() => (
            <CompanySelectionScreen
              onComplete={handleCompanyComplete}
            />
          )}
        </Stack.Screen>
      )}
      
      {currentStep === 'profile' && (
        <Stack.Screen name="Profile">
          {() => (
            <ProfileSetupScreen
              onComplete={handleProfileComplete}
            />
          )}
        </Stack.Screen>
      )}
      
      {currentStep === 'permissions' && (
        <Stack.Screen name="Permissions">
          {() => (
            <PermissionsScreen
              onComplete={handlePermissionsComplete}
              onSkip={handleSkip}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
};
```

---

## IMPLEMENTATION CHECKLIST

**Dependencies:**
- [ ] `npm install react-native-reanimated`
- [ ] `npx expo install expo-image-picker`
- [ ] `npx expo install expo-contacts`

**State Management:**
- [ ] Create `types/onboarding.ts`
- [ ] Create `utils/onboardingManager.ts`
- [ ] Test persistence across app restarts

**Screens:**
- [ ] Create `screens/onboarding/WelcomeScreen.tsx`
- [ ] Create `screens/onboarding/CompanySelectionScreen.tsx`
- [ ] Create `screens/onboarding/ProfileSetupScreen.tsx`
- [ ] Create `screens/onboarding/PermissionsScreen.tsx`

**Navigation:**
- [ ] Create `navigation/OnboardingNavigator.tsx`
- [ ] Integrate with App.tsx (show if first launch)
- [ ] Test skip functionality
- [ ] Test back navigation blocked

**Testing:**
- [ ] Test first launch detection
- [ ] Test each step completion
- [ ] Test skip onboarding
- [ ] Test permissions denied
- [ ] Test image upload
- [ ] Test company selection
- [ ] Reset and retry onboarding

---

BEGIN IMPLEMENTATION.
