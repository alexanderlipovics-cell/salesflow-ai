import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  platform: 'instagram' | 'whatsapp' | 'facebook' | 'telegram';
}

const CHATS: ChatPreview[] = [
  { id: '1', name: 'Lisa Müller', lastMessage: 'Bin mir noch unsicher...', time: '2d', unread: 0, avatar: 'L', platform: 'instagram' },
  { id: '2', name: 'Markus Weber', lastMessage: 'Warte auf den Link!', time: '2h', unread: 3, avatar: 'M', platform: 'whatsapp' },
  { id: '3', name: 'Sarah K.', lastMessage: 'Was genau kostet das?', time: '5h', unread: 1, avatar: 'S', platform: 'instagram' },
  { id: '4', name: 'Tom B.', lastMessage: 'Interessantes Profil!', time: '1d', unread: 0, avatar: 'T', platform: 'facebook' },
  { id: '5', name: 'Julia F.', lastMessage: 'Danke für die Info! 🙏', time: '3d', unread: 0, avatar: 'J', platform: 'telegram' },
  { id: '6', name: 'Max Schneider', lastMessage: 'Klingt gut, erzähl mehr!', time: '4h', unread: 2, avatar: 'M', platform: 'whatsapp' },
];

const PLATFORMS = ['Alle', 'Instagram', 'WhatsApp', 'Facebook', 'Telegram'];

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'instagram': return 'logo-instagram';
    case 'whatsapp': return 'logo-whatsapp';
    case 'facebook': return 'logo-facebook';
    case 'telegram': return 'paper-plane';
    default: return 'chatbubble';
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform) {
    case 'instagram': return '#E4405F';
    case 'whatsapp': return '#25D366';
    case 'facebook': return '#1877F2';
    case 'telegram': return '#0088CC';
    default: return COLORS.textSecondary;
  }
};

export default function ChatScreen({ navigation }: any) {
  const [activePlatform, setActivePlatform] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = CHATS.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = activePlatform === 'Alle' || chat.platform.toLowerCase() === activePlatform.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  const renderChat = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => {
        Haptics.selectionAsync();
        navigation.navigate('LeadDetailScreen', { leadId: item.id });
      }}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.avatar}</Text>
        </View>
        <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(item.platform) }]}>
          <Ionicons name={getPlatformIcon(item.platform) as any} size={10} color={COLORS.text} />
        </View>
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.chatMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.syncBtn}>
          <Ionicons name="sync" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Chats durchsuchen..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Platform Filter */}
      <FlatList
        horizontal
        data={PLATFORMS}
        contentContainerStyle={styles.platformList}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.platformChip, activePlatform === item && styles.activePlatformChip]}
            onPress={() => {
              Haptics.selectionAsync();
              setActivePlatform(item);
            }}
          >
            <Text style={[styles.platformText, activePlatform === item && styles.activePlatformText]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChat}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Keine Chats gefunden</Text>
          </View>
        }
      />

      {/* Import FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // TODO: Chat Import
        }}
      >
        <Ionicons name="add" size={28} color={COLORS.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  syncBtn: { padding: 8 },
  searchContainer: { marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  platformList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  platformChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  activePlatformChip: { backgroundColor: COLORS.card, borderColor: COLORS.primary, borderWidth: 1 },
  platformText: { color: COLORS.textSecondary, fontWeight: '600' },
  activePlatformText: { color: COLORS.primary },
  chatList: { paddingHorizontal: 20, paddingBottom: 100 },
  chatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12 },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  platformBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surface },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  chatTime: { fontSize: 12, color: COLORS.textMuted },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { color: COLORS.background, fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: 16 },
  fab: { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
