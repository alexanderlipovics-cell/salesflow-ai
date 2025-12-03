import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { API_CONFIG } from '../../services/apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

const PLAYBOOK_CATEGORIES = [
  { key: 'opener', label: '🎬 Opener', color: '#3b82f6' },
  { key: 'followup', label: '📬 Follow-up', color: '#10b981' },
  { key: 'closing', label: '🎯 Closing', color: '#f59e0b' },
  { key: 'objection', label: '🧠 Einwände', color: '#8b5cf6' },
];

const SAMPLE_PLAYBOOKS = [
  {
    id: '1',
    category: 'opener',
    title: 'Cold Outreach - LinkedIn',
    description: 'Erste Kontaktaufnahme über LinkedIn mit Value-First-Ansatz',
    steps: [
      'Profil recherchieren & personalisieren',
      'Value-Hook in der ersten Nachricht',
      'Keine Verkaufsintention zeigen',
      'Interesse wecken mit Mehrwert'
    ],
    effectiveness: 78
  },
  {
    id: '2',
    category: 'followup',
    title: '3-Touch Follow-up Sequenz',
    description: 'Strukturierte Nachfass-Sequenz nach Erstkontakt',
    steps: [
      'Tag 1: Danke + Zusammenfassung',
      'Tag 3: Mehrwert-Content teilen',
      'Tag 7: Soft-CTA mit Terminvorschlag'
    ],
    effectiveness: 85
  },
  {
    id: '3',
    category: 'closing',
    title: 'Assumptive Close',
    description: 'Selbstbewusstes Closing bei warmen Leads',
    steps: [
      'Zusammenfassung der Vorteile',
      'Annahme der Entscheidung',
      'Konkrete nächste Schritte vorschlagen',
      'Einwände proaktiv adressieren'
    ],
    effectiveness: 72
  },
  {
    id: '4',
    category: 'objection',
    title: 'Preis-Einwand Treatment',
    description: 'Effektive Strategien bei "Zu teuer"',
    steps: [
      'Wert vs. Preis Framework',
      'ROI-Berechnung präsentieren',
      'Vergleich mit Alternativen',
      'Ratenzahlung anbieten'
    ],
    effectiveness: 81
  }
];

export default function PlaybooksScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [playbooks, setPlaybooks] = useState(SAMPLE_PLAYBOOKS);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPlaybooks = selectedCategory 
    ? playbooks.filter(p => p.category === selectedCategory)
    : playbooks;

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Playbooks</Text>
        <Text style={styles.headerSubtitle}>Bewährte Sales-Strategien</Text>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        <Pressable 
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>Alle</Text>
        </Pressable>
        {PLAYBOOK_CATEGORIES.map((cat) => (
          <Pressable 
            key={cat.key}
            style={[styles.categoryChip, selectedCategory === cat.key && { backgroundColor: cat.color }]}
            onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.key && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Playbooks List */}
      <View style={styles.content}>
        {filteredPlaybooks.map((playbook) => {
          const category = PLAYBOOK_CATEGORIES.find(c => c.key === playbook.category);
          const isExpanded = expandedId === playbook.id;
          
          return (
            <Pressable 
              key={playbook.id}
              style={[styles.playbookCard, { borderLeftColor: category?.color || '#3b82f6' }]}
              onPress={() => setExpandedId(isExpanded ? null : playbook.id)}
            >
              <View style={styles.playbookHeader}>
                <View style={styles.playbookTitleRow}>
                  <Text style={styles.playbookTitle}>{playbook.title}</Text>
                  <View style={[styles.effectivenessBadge, { backgroundColor: playbook.effectiveness >= 80 ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={[styles.effectivenessText, { color: playbook.effectiveness >= 80 ? '#16a34a' : '#d97706' }]}>
                      {playbook.effectiveness}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.playbookDescription}>{playbook.description}</Text>
              </View>
              
              {isExpanded && (
                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>📋 Schritte:</Text>
                  {playbook.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                  <Pressable style={styles.useButton}>
                    <Text style={styles.useButtonText}>🚀 Playbook verwenden</Text>
                  </Pressable>
                </View>
              )}
              
              <Text style={styles.expandHint}>{isExpanded ? '▲ Weniger' : '▼ Mehr anzeigen'}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* AI Playbook Generator CTA */}
      <Pressable style={styles.aiGeneratorCard}>
        <Text style={styles.aiGeneratorIcon}>✨</Text>
        <View style={styles.aiGeneratorContent}>
          <Text style={styles.aiGeneratorTitle}>KI Playbook Generator</Text>
          <Text style={styles.aiGeneratorDescription}>
            Lass die KI ein personalisiertes Playbook für deinen Use-Case erstellen
          </Text>
        </View>
        <Text style={styles.aiGeneratorArrow}>→</Text>
      </Pressable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#3b82f6', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  categoriesContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  categoryChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: 'white', 
    borderRadius: 20, 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  categoryChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryText: { fontSize: 14, color: '#64748b' },
  categoryTextActive: { color: 'white', fontWeight: '600' },
  content: { paddingHorizontal: 16 },
  playbookCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  playbookHeader: {},
  playbookTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playbookTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  effectivenessBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  effectivenessText: { fontSize: 12, fontWeight: '600' },
  playbookDescription: { fontSize: 14, color: '#64748b', marginTop: 8 },
  stepsContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  stepsTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNumber: { 
    width: 24, 
    height: 24, 
    backgroundColor: '#3b82f6', 
    borderRadius: 12, 
    textAlign: 'center', 
    lineHeight: 24, 
    color: 'white', 
    fontSize: 12, 
    fontWeight: '600',
    marginRight: 12
  },
  stepText: { fontSize: 14, color: '#475569', flex: 1, lineHeight: 22 },
  useButton: { 
    backgroundColor: '#3b82f6', 
    borderRadius: 12, 
    padding: 14, 
    alignItems: 'center', 
    marginTop: 16 
  },
  useButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  expandHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  aiGeneratorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed'
  },
  aiGeneratorIcon: { fontSize: 32, marginRight: 12 },
  aiGeneratorContent: { flex: 1 },
  aiGeneratorTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  aiGeneratorDescription: { fontSize: 14, color: '#64748b', marginTop: 4 },
  aiGeneratorArrow: { fontSize: 24, color: '#8b5cf6' },
  bottomSpacer: { height: 100 }
});

