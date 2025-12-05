import React, { useState, useRef } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, 
  SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'lead';
  timestamp: string;
}

const LEAD_DATA = {
  id: '1',
  name: 'Lisa Müller',
  status: 'GHOSTING',
  tags: ['Herbalife', 'Skeptisch', 'Mama'],
  temperature: 65,
};

const CHAT_HISTORY: Message[] = [
  { id: '1', text: 'Hey Lisa, danke für dein Interesse an der Challenge!', sender: 'user', timestamp: 'Mo. 10:00' },
  { id: '2', text: 'Hi! Ja klingt spannend, aber ich bin mir unsicher wegen dem Preis...', sender: 'lead', timestamp: 'Mo. 11:30' },
  { id: '3', text: 'Verstehe ich total. Aber denk dran: Es ist eine Investition in dich selbst. 💪', sender: 'user', timestamp: 'Mo. 11:35' },
];

export default function LeadDetailScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>(CHAT_HISTORY);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text: inputText, sender: 'user', timestamp: 'Gerade' }]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  const triggerMagicMoment = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('MagicScriptScreen', { leadName: LEAD_DATA.name, type: 'ghosting' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.leadName}>{LEAD_DATA.name}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.error }]} />
              <Text style={styles.statusText}>{LEAD_DATA.status}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.tagsContainer}>
            {LEAD_DATA.tags.map(tag => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>
            ))}
          </View>
          <View style={styles.tempContainer}>
            <Ionicons name="thermometer" size={16} color={LEAD_DATA.temperature > 50 ? COLORS.warning : COLORS.textMuted} />
            <Text style={styles.tempText}>{LEAD_DATA.temperature}%</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrapper, item.sender === 'user' ? styles.userWrapper : styles.leadWrapper]}>
            <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.leadBubble]}>
              <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.leadText]}>{item.text}</Text>
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputWrapper}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.magicBtn} onPress={triggerMagicMoment}>
            <Ionicons name="sparkles" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="Nachricht schreiben..." placeholderTextColor={COLORS.textMuted} value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={[styles.sendBtn, !inputText && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!inputText}>
            <Ionicons name="send" size={20} color={inputText ? COLORS.primary : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { padding: 8, marginLeft: -8 },
  menuBtn: { padding: 8, marginRight: -8 },
  profileInfo: { alignItems: 'center' },
  leadName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: COLORS.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagsContainer: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
  tempContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tempText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chatList: { padding: 16, paddingBottom: 32 },
  bubbleWrapper: { marginBottom: 16, maxWidth: '80%' },
  userWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  leadWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
  leadBubble: { backgroundColor: COLORS.card, borderBottomLeftRadius: 2 },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: COLORS.text },
  leadText: { color: COLORS.text },
  timestamp: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, marginHorizontal: 4 },
  inputWrapper: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  toolbar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10 },
  magicBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, maxHeight: 100, fontSize: 16 },
  sendBtn: { padding: 10, marginBottom: 2 },
  sendBtnDisabled: { opacity: 0.5 },
});
