/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  A/B TEST DASHBOARD                                                        ║
 * ║  Übersicht über laufende A/B Tests und deren Ergebnisse                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// TYPES
// =============================================================================

interface ABVariant {
  id: string;
  name: string;
  weight: number;
  users: number;
  conversions: number;
  conversionRate: number;
}

interface ABExperiment {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'paused' | 'completed';
  startDate: string;
  variants: ABVariant[];
  winner?: string;
  confidence?: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_EXPERIMENTS: ABExperiment[] = [
  {
    id: 'tone_test',
    name: 'Tonalität Test',
    description: 'Testet verschiedene Kommunikationstöne bei Einwandbehandlung',
    status: 'running',
    startDate: '2024-11-15',
    variants: [
      { id: 'neutral', name: 'Neutral', weight: 33, users: 156, conversions: 23, conversionRate: 14.7 },
      { id: 'evidence_based', name: 'Faktenbasiert', weight: 33, users: 148, conversions: 31, conversionRate: 20.9 },
      { id: 'value_focused', name: 'Wertorientiert', weight: 34, users: 152, conversions: 28, conversionRate: 18.4 },
    ],
    confidence: 78,
  },
  {
    id: 'response_length',
    name: 'Antwortlänge',
    description: 'Kurze vs. ausführliche Antworten bei Quick Facts',
    status: 'running',
    startDate: '2024-11-20',
    variants: [
      { id: 'short', name: 'Kurz (< 50 Wörter)', weight: 50, users: 89, conversions: 12, conversionRate: 13.5 },
      { id: 'detailed', name: 'Ausführlich (> 100 Wörter)', weight: 50, users: 94, conversions: 18, conversionRate: 19.1 },
    ],
    confidence: 65,
  },
  {
    id: 'objection_technique',
    name: 'Einwandtechnik',
    description: 'Verschiedene Techniken für Preis-Einwände',
    status: 'completed',
    startDate: '2024-10-01',
    variants: [
      { id: 'feel_felt_found', name: 'Feel-Felt-Found', weight: 25, users: 234, conversions: 42, conversionRate: 17.9 },
      { id: 'reframe', name: 'Reframe', weight: 25, users: 228, conversions: 51, conversionRate: 22.4 },
      { id: 'agree_pivot', name: 'Agree & Pivot', weight: 25, users: 241, conversions: 38, conversionRate: 15.8 },
      { id: 'evidence_first', name: 'Evidence First', weight: 25, users: 237, conversions: 58, conversionRate: 24.5 },
    ],
    winner: 'evidence_first',
    confidence: 94,
  },
  {
    id: 'follow_up_style',
    name: 'Follow-Up Stil',
    description: 'Fragen vs. Statements nach Antworten',
    status: 'paused',
    startDate: '2024-11-01',
    variants: [
      { id: 'question', name: 'Gegenfrage', weight: 50, users: 67, conversions: 9, conversionRate: 13.4 },
      { id: 'statement', name: 'Statement', weight: 50, users: 71, conversions: 8, conversionRate: 11.3 },
    ],
    confidence: 42,
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

const StatusBadge = ({ status }: { status: ABExperiment['status'] }) => {
  const config = {
    running: { color: '#22C55E', bg: '#22C55E20', label: '🟢 Aktiv' },
    paused: { color: '#F59E0B', bg: '#F59E0B20', label: '⏸️ Pausiert' },
    completed: { color: '#3B82F6', bg: '#3B82F620', label: '✅ Abgeschlossen' },
  };
  
  const c = config[status];
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

const VariantBar = ({ 
  variant, 
  isWinner, 
  maxRate 
}: { 
  variant: ABVariant; 
  isWinner: boolean;
  maxRate: number;
}) => {
  const width = maxRate > 0 ? (variant.conversionRate / maxRate) * 100 : 0;
  
  return (
    <View style={styles.variantRow}>
      <View style={styles.variantInfo}>
        <Text style={styles.variantName}>
          {isWinner && '🏆 '}{variant.name}
        </Text>
        <Text style={styles.variantStats}>
          {variant.users} Users • {variant.conversions} Conversions
        </Text>
      </View>
      <View style={styles.variantBarContainer}>
        <View style={styles.variantBarTrack}>
          <View 
            style={[
              styles.variantBarFill, 
              { 
                width: `${width}%`,
                backgroundColor: isWinner ? '#22C55E' : '#3B82F6',
              }
            ]} 
          />
        </View>
        <Text style={[
          styles.variantRate,
          isWinner && styles.variantRateWinner
        ]}>
          {variant.conversionRate.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
};

const ExperimentCard = ({ experiment }: { experiment: ABExperiment }) => {
  const [expanded, setExpanded] = useState(false);
  const maxRate = Math.max(...experiment.variants.map(v => v.conversionRate));
  
  return (
    <View style={styles.experimentCard}>
      <TouchableOpacity 
        style={styles.experimentHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.experimentTitleRow}>
          <Text style={styles.experimentName}>{experiment.name}</Text>
          <StatusBadge status={experiment.status} />
        </View>
        <Text style={styles.experimentDescription}>{experiment.description}</Text>
        <View style={styles.experimentMeta}>
          <Text style={styles.experimentMetaText}>
            📅 Start: {experiment.startDate}
          </Text>
          {experiment.confidence && (
            <Text style={styles.experimentMetaText}>
              📊 Konfidenz: {experiment.confidence}%
            </Text>
          )}
        </View>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#9CA3AF" 
          style={styles.expandIcon}
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.experimentBody}>
          {experiment.variants.map(variant => (
            <VariantBar 
              key={variant.id} 
              variant={variant}
              isWinner={experiment.winner === variant.id}
              maxRate={maxRate}
            />
          ))}
          
          {experiment.winner && (
            <View style={styles.winnerBanner}>
              <Ionicons name="trophy" size={20} color="#F59E0B" />
              <Text style={styles.winnerText}>
                Gewinner: {experiment.variants.find(v => v.id === experiment.winner)?.name}
              </Text>
            </View>
          )}
          
          <View style={styles.experimentActions}>
            {experiment.status === 'running' && (
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="pause" size={16} color="#F59E0B" />
                <Text style={styles.actionButtonText}>Pausieren</Text>
              </TouchableOpacity>
            )}
            {experiment.status === 'paused' && (
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                  Fortsetzen
                </Text>
              </TouchableOpacity>
            )}
            {experiment.status !== 'completed' && (
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.actionButtonText}>Abschließen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ABTestDashboard() {
  const experiments = MOCK_EXPERIMENTS;
  
  const stats = {
    running: experiments.filter(e => e.status === 'running').length,
    completed: experiments.filter(e => e.status === 'completed').length,
    totalUsers: experiments.reduce((sum, e) => 
      sum + e.variants.reduce((s, v) => s + v.users, 0), 0
    ),
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="flask" size={28} color="#8B5CF6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>🧪 A/B Testing</Text>
          <Text style={styles.headerSubtitle}>Experiment-Übersicht</Text>
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.running}</Text>
          <Text style={styles.statLabel}>Aktiv</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Abgeschlossen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Test-Users</Text>
        </View>
      </View>
      
      {/* Create New Button */}
      <TouchableOpacity style={styles.createButton}>
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Neues Experiment</Text>
      </TouchableOpacity>
      
      {/* Experiments List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Experimente</Text>
        {experiments.map(experiment => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </View>
      
      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#3B82F6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>So funktioniert's</Text>
          <Text style={styles.infoText}>
            A/B Tests vergleichen verschiedene Varianten von Antworten, um die effektivste zu finden. 
            Nutzer werden automatisch in Gruppen eingeteilt. Bei 95% Konfidenz gilt ein Ergebnis als statistisch signifikant.
          </Text>
        </View>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tipp: Mindestens 100 Users pro Variante für aussagekräftige Ergebnisse
        </Text>
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B5CF620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Section
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  
  // Experiment Card
  experimentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  experimentHeader: {
    padding: 16,
  },
  experimentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  experimentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  experimentDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  experimentMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  experimentMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  
  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Experiment Body
  experimentBody: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  
  // Variant Row
  variantRow: {
    marginBottom: 12,
  },
  variantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  variantName: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  variantStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  variantBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  variantBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  variantRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    width: 50,
    textAlign: 'right',
  },
  variantRateWinner: {
    color: '#22C55E',
  },
  
  // Winner Banner
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  winnerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  
  // Actions
  experimentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#F8FAFC',
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

