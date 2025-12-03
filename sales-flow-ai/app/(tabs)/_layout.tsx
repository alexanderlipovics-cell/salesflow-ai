import { Tabs } from 'expo-router';
import { LayoutDashboard, Crosshair, Car, Clock, Calendar, Zap, Users, User, Bell, Search } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a', // slate-900
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#10B981', // emerald-500
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginBottom: 10
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Suche',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hunter"
        options={{
          title: 'Hunter',
          tabBarIcon: ({ color }) => <Crosshair size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="follow_ups"
        options={{
          title: 'Follow-Ups',
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="field_ops"
        options={{
          title: 'Field Ops',
          tabBarIcon: ({ color }) => <Car size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="speed_hunter"
        options={{
          title: 'Speed',
          tabBarIcon: ({ color }) => <Zap size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Benachrichtigungen',
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

