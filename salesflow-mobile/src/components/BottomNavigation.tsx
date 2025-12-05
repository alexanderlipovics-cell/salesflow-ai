import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Tab {
  label: string;
  icon: string;
  route: string;
}

interface BottomNavigationProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const tabs: Tab[] = [
  { label: 'Home', icon: '🏠', route: 'Home' },
  { label: 'Chat', icon: '💬', route: 'Chat' },
  { label: 'Scripts', icon: '📝', route: 'Scripts' },
  { label: 'Leads', icon: '👥', route: 'Leads' },
  { label: 'Profil', icon: '⚙️', route: 'Profile' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentRoute,
  onNavigate,
}) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#0a0a0a']}
        style={styles.gradient}
      >
        {tabs.map((tab) => {
          const isActive = currentRoute === tab.route;
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tab}
              onPress={() => onNavigate(tab.route)}
              activeOpacity={0.7}
            >
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  gradient: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  labelActive: {
    color: '#10b981',
    fontWeight: '600',
  },
});

