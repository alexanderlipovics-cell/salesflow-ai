import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
      <Text className="text-white text-2xl font-bold">Dashboard</Text>
      <Text className="text-slate-500 mt-2">Daily Command Center</Text>
    </SafeAreaView>
  );
}

