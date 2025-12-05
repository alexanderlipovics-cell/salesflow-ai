import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

interface ScriptOption {
  id: string;
  label: string;
  tone: 'EMPATHIC' | 'DIRECT' | 'CREATIVE';
  content: string;
  tags: string[];
}

const generateMockOptions = (leadName: string): ScriptOption[] => [
  { id: 'opt_A', label: 'Verständnisvoll', tone: 'EMPATHIC', content: `Hey ${leadName}, ich verstehe total, dass du gerade viel um die Ohren hast. 🙏 Sollen wir nächste Woche nochmal quatschen?`, tags: ['soft'] },
  { id: 'opt_B', label: 'Direkt', tone: 'DIRECT', content: `Lass uns ehrlich sein ${leadName}: Wenn sich nichts ändert, ändert sich nichts. Lass uns starten.`, tags: ['action'] },
  { id: 'opt_C', label: 'Kreativ', tone: 'CREATIVE', content: `Wurde dein Handy von Aliens entführt? 🛸 Scherz ${leadName}, alles gut bei dir?`, tags: ['humor'] },
];

export default function MagicScriptScreen({ route, navigation }: any) {
  const { leadName = 'Lead' } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<ScriptOption[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setOptions(generateMockOptions(leadName));
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 2000);
  }, []);

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    await Haptics.selectionAsync();
    navigation.goBack();
  };

  const getToneColor = (tone: string) => {
    switch(tone) { case 'EMPATHIC': return COLORS.success; case 'DIRECT': return '#3B82F6'; default: return COLORS.warning; }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>AI Copilot</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="sparkles" size={48} color={COLORS.secondary} />
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 24 }} />
            <Text style={styles.loadingText}>Analysiere {leadName}...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.sectionTitle}>Wähle deine Strategie:</Text>
              {options.map((opt) => (
                <TouchableOpacity key={opt.id} style={[styles.optionCard, { borderLeftColor: getToneColor(opt.tone) }]} onPress={() => handleCopy(opt.content)}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.badgeText, { color: getToneColor(opt.tone) }]}>{opt.label}</Text>
                    <Ionicons name="copy-outline" size={20} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.scriptContent}>"{opt.content}"</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  closeBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.text, fontSize: 18, marginTop: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  optionCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  scriptContent: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 24 },
});
