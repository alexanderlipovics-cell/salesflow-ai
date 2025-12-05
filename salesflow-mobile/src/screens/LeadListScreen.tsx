import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

interface Lead { id: string; name: string; status: 'NEW' | 'CONVERSATION' | 'CLOSING' | 'GHOSTING'; lastMsg: string; time: string; temperature: number; unread: boolean; }

const LEADS_DATA: Lead[] = [
  { id: '1', name: 'Lisa Müller', status: 'GHOSTING', lastMsg: 'Bin mir noch unsicher...', time: '2d', temperature: 65, unread: true },
  { id: '2', name: 'Markus Weber', status: 'CLOSING', lastMsg: 'Warte auf den Link!', time: '2h', temperature: 95, unread: true },
  { id: '3', name: 'Sarah K.', status: 'CONVERSATION', lastMsg: 'Was genau kostet das?', time: '5h', temperature: 40, unread: false },
  { id: '4', name: 'Tom B.', status: 'NEW', lastMsg: 'Interessantes Profil!', time: '1d', temperature: 10, unread: false },
];

const TABS = ['Alle', 'Hot 🔥', 'Ghosting 👻', 'Neu ✨'];

export default function LeadListScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = LEADS_DATA.filter(lead => {
    if (!lead.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    switch (activeTab) {
      case 'Hot 🔥': return lead.temperature > 70;
      case 'Ghosting 👻': return lead.status === 'GHOSTING';
      case 'Neu ✨': return lead.status === 'NEW';
      default: return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) { case 'CLOSING': return COLORS.success; case 'GHOSTING': return COLORS.error; case 'NEW': return '#3B82F6'; default: return COLORS.textSecondary; }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meine Kontakte</Text>
        <TouchableOpacity style={styles.addBtn}><Ionicons name="add" size={24} color={COLORS.background} /></TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Suchen..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <FlatList horizontal data={TABS} contentContainerStyle={styles.tabsList} keyExtractor={item => item} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.tabChip, activeTab === item && styles.activeTabChip]} onPress={() => { Haptics.selectionAsync(); setActiveTab(item); }}>
          <Text style={[styles.tabText, activeTab === item && styles.activeTabText]}>{item}</Text>
        </TouchableOpacity>
      )} />
      <FlatList data={filteredLeads} keyExtractor={item => item.id} contentContainerStyle={styles.listContent} renderItem={({ item }) => (
        <TouchableOpacity style={styles.leadCard} onPress={() => { Haptics.selectionAsync(); navigation.navigate('LeadDetailScreen', { leadId: item.id }); }}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
          <View style={styles.cardContent}>
            <Text style={styles.leadName}>{item.name}</Text>
            <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      )} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  tabsList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  activeTabChip: { backgroundColor: COLORS.card, borderColor: COLORS.primary, borderWidth: 1 },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  activeTabText: { color: COLORS.primary },
  listContent: { paddingHorizontal: 20 },
  leadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  cardContent: { flex: 1 },
  leadName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  lastMsg: { color: COLORS.textSecondary, fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
