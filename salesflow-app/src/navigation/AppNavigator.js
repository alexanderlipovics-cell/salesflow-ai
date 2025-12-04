import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { AURA_COLORS, AURA_SHADOWS } from '../components/aura';
import { MentorLearning } from '../services/mentorLearning';
import { isFeatureEnabled } from '../config/feature_flags';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import ChatScreen from '../screens/main/ChatScreen';
import PlaybooksScreen from '../screens/main/PlaybooksScreen';
import LeadsScreen from '../screens/main/LeadsScreen';
import FollowUpsScreen from '../screens/main/FollowUpsScreen';
import TeamPerformanceScreen from '../screens/main/TeamPerformanceScreen';
import DailyFlowScreen from '../screens/main/DailyFlowScreen';
import DailyFlowSetupScreen from '../screens/main/DailyFlowSetupScreen';
import DailyFlowStatusScreen from '../screens/main/DailyFlowStatusScreen';
import ProposalRemindersScreen from '../screens/main/ProposalRemindersScreen';
import FinanceOverviewScreen from '../screens/main/FinanceOverviewScreen';
import CompanyGoalWizardScreen from '../screens/main/CompanyGoalWizardScreen';
import TemplateAnalyticsScreen from '../screens/main/TemplateAnalyticsScreen';
import AnalyticsDashboardScreen from '../screens/main/AnalyticsDashboardScreen';
import OutreachScreen from '../screens/main/OutreachScreen';

// CHIEF v3.0 Screens
import GhostBusterScreen from '../screens/main/GhostBusterScreen';
import TeamLeaderScreen from '../screens/main/TeamLeaderScreen';
import DataImportScreen from '../screens/main/DataImportScreen';
import { PhoenixScreen } from '../screens/main/PhoenixScreen';

// MLM Import Screen
import ImportContactsScreen from '../screens/import/ImportContactsScreen';

// Onboarding Screens (neues erweitertes System)
import { OnboardingScreen } from '../screens/onboarding';

// Autopilot Screens
import AutopilotSettingsScreen from '../screens/main/AutopilotSettingsScreen';
import AutopilotDraftsScreen from '../screens/main/AutopilotDraftsScreen';

// Reactivation Agent Screens
import ReactivationScreen from '../screens/main/ReactivationScreen';
import ReviewQueueScreen from '../screens/main/ReviewQueueScreen';

// Sequencer Engine
import SequencesListScreen from '../screens/main/SequencesListScreen';
import SequenceBuilderScreen from '../screens/main/SequenceBuilderScreen';
import EmailAccountsScreen from '../screens/main/EmailAccountsScreen';
import SequenceTemplatesScreen from '../screens/main/SequenceTemplatesScreen';
import SequenceAnalyticsScreen from '../screens/main/SequenceAnalyticsScreen';

// Marketing Screens
import LandingPage from '../screens/marketing/LandingPage';

// Admin Screens
import SecurityDashboard from '../screens/admin/SecurityDashboard';
import ComplianceReport from '../screens/admin/ComplianceReport';
import ABTestDashboard from '../screens/admin/ABTestDashboard';

// Onboarding Screens
import NetworkSelectionScreen from '../screens/onboarding/NetworkSelectionScreen';

// KI-Autonomie System
import BrainScreen from '../screens/main/BrainScreen';

// AURA OS Premium Dashboard
import AuraOsDashboardScreen from '../screens/main/AuraOsDashboardScreen';

// NetworkerOS Screens
import DMOTrackerScreen from '../screens/main/DMOTrackerScreen';
import GuidedDailyFlowScreen from '../screens/main/GuidedDailyFlowScreen';
import TeamDashboardScreen from '../screens/main/TeamDashboardScreen';

// Billing/Pricing/Settings Screens
import PricingScreen from '../screens/settings/PricingScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { TestCheckoutScreen } from '../screens/billing';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Component
const TabIcon = ({ icon, label, focused }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    {label && <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>}
  </View>
);

// Main Tab Navigator - 5 Tabs: Home, DMO, Kontakte, MENTOR, Team
function MainTabs() {
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label={t('navigation.home')} focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="DMO" 
        component={DMOTrackerScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🎯" label={t('navigation.dmo')} focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Kontakte" 
        component={LeadsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label={t('navigation.kontakte')} focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="MENTOR" 
        component={ChatScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label={t('navigation.mentor')} focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Team" 
        component={TeamDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label={t('navigation.team')} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack - Landing Page first, dann Login/Register
function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Landing"
    >
      <Stack.Screen name="Landing" component={LandingPage} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// App Stack (after login)
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="TeamPerformance" 
        component={TeamPerformanceScreen}
        options={{
          headerShown: true,
          headerTitle: 'Team Performance',
          headerBackTitle: 'Zurück',
          headerStyle: { backgroundColor: '#3b82f6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="ProposalReminders" 
        component={ProposalRemindersScreen}
        options={{
          headerShown: true,
          headerTitle: 'Proposal Reminders',
          headerBackTitle: 'Zurück',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="DailyFlowSetup" 
        component={DailyFlowSetupScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="Playbooks" 
        component={PlaybooksScreen}
        options={{
          headerShown: true,
          headerTitle: 'Playbooks',
          headerBackTitle: 'Zurück',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="Finance" 
        component={FinanceOverviewScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="DailyFlowStatus" 
        component={DailyFlowStatusScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="GoalWizard" 
        component={CompanyGoalWizardScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="TemplateAnalytics" 
        component={TemplateAnalyticsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AnalyticsDashboard" 
        component={AnalyticsDashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Outreach" 
        component={OutreachScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* CHIEF v3.0 Screens */}
      <Stack.Screen 
        name="GhostBuster" 
        component={GhostBusterScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TeamLeader" 
        component={TeamLeaderScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="DataImport" 
        component={DataImportScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="ImportContacts" 
        component={ImportContactsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      {/* Phoenix - Deactivated */}
      {isFeatureEnabled('phoenix') && (
        <Stack.Screen 
          name="Phoenix" 
          component={PhoenixScreen}
          options={{
            headerShown: false,
          }}
        />
      )}
      
      {/* Sequencer Engine - Deactivated */}
      {isFeatureEnabled('sequencer') && (
        <>
          <Stack.Screen 
            name="Sequences" 
            component={SequencesListScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="SequenceBuilder" 
            component={SequenceBuilderScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="EmailAccounts" 
            component={EmailAccountsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="SequenceTemplates" 
            component={SequenceTemplatesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="SequenceAnalytics" 
            component={SequenceAnalyticsScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
      
      {/* Marketing Screens */}
      <Stack.Screen 
        name="LandingPage" 
        component={LandingPage}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      
      {/* Autopilot Screens */}
      <Stack.Screen 
        name="AutopilotSettings" 
        component={AutopilotSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AutopilotDrafts" 
        component={AutopilotDraftsScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Reactivation Agent Screens - Deactivated */}
      {isFeatureEnabled('reactivation_agent') && (
        <>
          <Stack.Screen 
            name="Reactivation" 
            component={ReactivationScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="ReviewQueue" 
            component={ReviewQueueScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
      
      {/* Admin Screens */}
      <Stack.Screen 
        name="SecurityDashboard" 
        component={SecurityDashboard}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ComplianceReport" 
        component={ComplianceReport}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ABTestDashboard" 
        component={ABTestDashboard}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Onboarding Screens */}
      <Stack.Screen 
        name="NetworkSelection" 
        component={NetworkSelectionScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      
      {/* KI-Autonomie System - Deactivated */}
      {isFeatureEnabled('brain_dashboard') && (
        <Stack.Screen 
          name="Brain" 
          component={BrainScreen}
          options={{
            headerShown: false,
          }}
        />
      )}
      
      {/* AURA OS Premium Dashboard - Deactivated */}
      {isFeatureEnabled('aura_os') && (
        <Stack.Screen 
          name="AuraOsDashboard" 
          component={AuraOsDashboardScreen}
          options={{
            headerShown: false,
          }}
        />
      )}
      
      {/* Billing/Pricing */}
      <Stack.Screen 
        name="Pricing" 
        component={PricingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TestCheckout" 
        component={TestCheckoutScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Settings */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* NetworkerOS Screens */}
      <Stack.Screen 
        name="DMOTracker" 
        component={DMOTrackerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="GuidedDailyFlow" 
        component={GuidedDailyFlowScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TeamDashboard" 
        component={TeamDashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Legacy Screens - Hidden from tabs but accessible */}
      <Stack.Screen 
        name="FollowUps" 
        component={FollowUpsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="DailyFlow" 
        component={DailyFlowScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Onboarding Stack - wird gezeigt wenn User noch nicht onboarded ist
function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingMain" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, needsOnboarding } = useAuth();

  // 🆕 MENTOR LEARNING: Daily Profile Update (einmal pro Tag)
  useEffect(() => {
    if (user) {
      MentorLearning.updateProfileIfNeeded();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>AURA OS lädt...</Text>
      </View>
    );
  }

  // Prüfe ob User eingeloggt ist
  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  // Prüfe ob User Onboarding braucht (Vorname, Branche, etc.)
  if (needsOnboarding) {
    return (
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>
    );
  }

  // Normaler App-Flow
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: AURA_COLORS.text.muted,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // FLOATING DOCK NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 28,
    height: 72,
    paddingBottom: 0,
    paddingTop: 0,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
    // Glow effect simuliert durch Text Shadow
    textShadowColor: AURA_COLORS.neon.cyanGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tabLabel: {
    fontSize: 9,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '700',
  },
});
