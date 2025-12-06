import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, GLOBAL_STYLES, SHADOWS } from '../config/theme';
import { Lead } from '../types/database';

export default function LeadDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { leadId } = route.params as { leadId: string };

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Data Fetching mit Relations
  useEffect(() => {
    fetchLeadDetails();

    // Realtime Subscription für Updates am aktuellen Lead
    const subscription = supabase
      .channel(`lead-${leadId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        (payload) => setLead(prev => ({ ...prev!, ...payload.new as Lead }))
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [leadId]);

  const fetchLeadDetails = async () => {
    // Wir holen Leads inkl. der Enrichment und Verification Daten
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        lead_verifications(*),
        lead_enrichments(*),
        lead_intents(*)
      `)
      .eq('id', leadId)
      .single();

    if (data) setLead(data);
    setLoading(false);
  };

  // 2. Action Handlers
  const handleCall = () => lead?.phone && Linking.openURL(`tel:${lead.phone}`);
  const handleEmail = () => lead?.email && Linking.openURL(`mailto:${lead.email}`);
  const handleLinkedIn = () => {
    const url = lead?.lead_enrichments?.[0]?.person_linkedin_url;
    if (url) Linking.openURL(url);
  };

  if (loading) return <View style={[GLOBAL_STYLES.container, {justifyContent:'center'}]}><ActivityIndicator color={COLORS.primary} /></View>;
  if (!lead) return <View style={GLOBAL_STYLES.container}><Text style={{color:'#fff'}}>Lead not found</Text></View>;

  const enrichment = lead.lead_enrichments?.[0];
  const intent = lead.lead_intents?.[0];

  return (
    <ScrollView style={GLOBAL_STYLES.container} contentContainerStyle={{padding: 16, paddingBottom: 40}}>

      {/* HEADER CARD */}
      <View style={styles.headerCard}>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{lead.p_score ?? 'N/A'}</Text>
        </View>
        <Text style={styles.name}>{lead.first_name} {lead.last_name}</Text>
        <Text style={styles.company}>{lead.company_name}</Text>
        <Text style={[styles.status, { color: lead.temperature === 'hot' ? COLORS.error : COLORS.primaryLight }]}>
          {lead.temperature?.toUpperCase()} • {lead.status.toUpperCase()}
        </Text>
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.actionRow}>
        <ActionButton icon="call" onPress={handleCall} disabled={!lead.phone} />
        <ActionButton icon="mail" onPress={handleEmail} disabled={!lead.email} />
        <ActionButton icon="logo-linkedin" onPress={handleLinkedIn} disabled={!enrichment?.person_linkedin_url} />
        <ActionButton icon="chatbubbles" onPress={() => console.log('Open AI Chat')} />
      </View>

      {/* ENRICHMENT DATA */}
      <View style={GLOBAL_STYLES.glassCard}>
        <Text style={styles.sectionTitle}>💡 Insights</Text>
        <InfoRow label="Position" value={enrichment?.person_seniority} />
        <InfoRow label="Industry" value={lead.company_name} />
        <InfoRow label="Intent Stage" value={intent?.intent_stage} />
        <InfoRow label="Last Activity" value={intent?.last_activity_at ? new Date(intent.last_activity_at).toLocaleDateString() : '-'} />
      </View>

      {/* CONTACT INFO */}
      <View style={GLOBAL_STYLES.glassCard}>
        <Text style={styles.sectionTitle}>📞 Contact Details</Text>
        <InfoRow label="Email" value={lead.email} verified={lead.lead_verifications?.[0]?.email_valid} />
        <InfoRow label="Phone" value={lead.phone} verified={lead.lead_verifications?.[0]?.phone_valid} />
      </View>

    </ScrollView>
  );
}

// Sub-Components for cleaner code
const ActionButton = ({ icon, onPress, disabled }: any) => (
  <TouchableOpacity
    style={[styles.actionBtn, disabled && { opacity: 0.3 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Ionicons name={icon} size={24} color="#fff" />
  </TouchableOpacity>
);

const InfoRow = ({ label, value, verified }: any) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <View style={{flexDirection:'row', alignItems:'center'}}>
      <Text style={styles.value}>{value || '-'}</Text>
      {verified === true && <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={{marginLeft:4}} />}
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerCard: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  scoreBadge: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
    marginBottom: 12, ...SHADOWS.glow
  },
  scoreText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 20 },
  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  company: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  status: { fontSize: 14, fontWeight: '600', marginTop: 8, letterSpacing: 1 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  actionBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border
  },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },
  label: { color: COLORS.textSecondary },
  value: { color: COLORS.text, fontWeight: '500' },
});