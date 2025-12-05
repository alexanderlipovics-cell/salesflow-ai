/**
 * TaxPrepSection
 * ==============
 * Tax Prep Sektion für das Finance Dashboard
 * 
 * ⚠️ WICHTIG: Keine Steuerberatung! Nur Vorbereitung.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { API_CONFIG } from '../../services/apiConfig';

// =============================================================================
// TYPES
// =============================================================================

interface TaxPrepSummary {
  year: number;
  total_income: number;
  total_expenses: number;
  profit: number;
  income_by_source: { source: string; total: number; count: number }[];
  expenses_by_category: { category: string; total: number; deductible: number; count: number }[];
  mileage: { total_km: number; total_amount: number };
  receipts: { count: number; missing: number };
  disclaimer: string;
}

interface TaxReserve {
  profit: number;
  estimated_tax: number;
  reserve_amount: number;
  reserve_percentage: number;
  disclaimer: string;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'incomplete' | 'pending' | 'review';
  details?: string;
}

interface TaxPrepSectionProps {
  year?: number;
  userId: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatMoney = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete': return '#10B981';
    case 'incomplete': return '#EF4444';
    case 'pending': return '#F59E0B';
    case 'review': return '#06b6d4';
    default: return '#64748b';
  }
};

const getStatusEmoji = (status: string) => {
  switch (status) {
    case 'complete': return '✅';
    case 'incomplete': return '❌';
    case 'pending': return '⏳';
    case 'review': return '👁️';
    default: return '❓';
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TaxPrepSection({ year, userId }: TaxPrepSectionProps) {
  const currentYear = year || new Date().getFullYear();
  
  const [summary, setSummary] = useState<TaxPrepSummary | null>(null);
  const [reserve, setReserve] = useState<TaxReserve | null>(null);
  const [checklist, setChecklist] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'reserve' | 'checklist'>('overview');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [currentYear, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, reserveRes, checklistRes] = await Promise.all([
        fetch(`${API_CONFIG.baseUrl}/finance/tax-prep/${currentYear}`, {
          credentials: 'include',
        }),
        fetch(`${API_CONFIG.baseUrl}/finance/tax-prep/${currentYear}/reserve`, {
          credentials: 'include',
        }),
        fetch(`${API_CONFIG.baseUrl}/finance/tax-prep/${currentYear}/checklist`, {
          credentials: 'include',
        }),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      
      if (reserveRes.ok) {
        const data = await reserveRes.json();
        setReserve(data);
      }
      
      if (checklistRes.ok) {
        const data = await checklistRes.json();
        setChecklist(data);
      }
    } catch (error) {
      console.error('Tax prep fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Lade Steuer-Vorbereitung...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📋 Steuer-Vorbereitung {currentYear}</Text>
        <Text style={styles.subtitle}>Nicht Steuerberatung – nur Struktur!</Text>
      </View>

      {/* Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>
          Dies ist KEINE Steuerberatung. Alle Berechnungen sind nur Schätzungen.
          Bitte konsultiere deinen Steuerberater!
        </Text>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabs}>
        {['overview', 'reserve', 'checklist'].map((section) => (
          <TouchableOpacity
            key={section}
            style={[styles.tab, activeSection === section && styles.tabActive]}
            onPress={() => setActiveSection(section as any)}
          >
            <Text style={[styles.tabText, activeSection === section && styles.tabTextActive]}>
              {section === 'overview' && '📊 Übersicht'}
              {section === 'reserve' && '💰 Reserve'}
              {section === 'checklist' && '✅ Checkliste'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeSection === 'overview' && summary && (
          <OverviewSection summary={summary} />
        )}
        
        {activeSection === 'reserve' && reserve && (
          <ReserveSection reserve={reserve} />
        )}
        
        {activeSection === 'checklist' && (
          <ChecklistSection items={checklist} />
        )}
      </ScrollView>

      {/* Export Button */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => {
          Alert.alert(
            '📄 Export erstellen',
            'Möchtest du einen Export für deinen Steuerberater erstellen?',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Ja, erstellen', onPress: () => handleExport() },
            ]
          );
        }}
      >
        <Text style={styles.exportButtonText}>📄 Steuerberater-Export erstellen</Text>
      </TouchableOpacity>
    </View>
  );

  async function handleExport() {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/finance/tax-prep/${currentYear}/export`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        Alert.alert('✅ Erfolg', 'Export wurde erstellt! Du findest ihn in deinen Downloads.');
      } else {
        Alert.alert('Fehler', 'Export konnte nicht erstellt werden.');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Export konnte nicht erstellt werden.');
    }
  }
}

// =============================================================================
// SUB COMPONENTS
// =============================================================================

function OverviewSection({ summary }: { summary: TaxPrepSummary }) {
  return (
    <View>
      {/* Main KPIs */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiEmoji}>📈</Text>
          <Text style={styles.kpiLabel}>Einnahmen</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            {formatMoney(summary.total_income)}
          </Text>
        </View>
        
        <View style={styles.kpiCard}>
          <Text style={styles.kpiEmoji}>📉</Text>
          <Text style={styles.kpiLabel}>Ausgaben</Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
            {formatMoney(summary.total_expenses)}
          </Text>
        </View>
        
        <View style={[styles.kpiCard, styles.kpiCardWide]}>
          <Text style={styles.kpiEmoji}>💰</Text>
          <Text style={styles.kpiLabel}>Gewinn</Text>
          <Text style={[styles.kpiValue, { color: summary.profit >= 0 ? '#10B981' : '#EF4444' }]}>
            {formatMoney(summary.profit)}
          </Text>
        </View>
      </View>

      {/* Mileage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Fahrtenbuch</Text>
        <View style={styles.mileageCard}>
          <View style={styles.mileageRow}>
            <Text style={styles.mileageLabel}>Gefahrene Kilometer:</Text>
            <Text style={styles.mileageValue}>{summary.mileage.total_km.toLocaleString('de-DE')} km</Text>
          </View>
          <View style={styles.mileageRow}>
            <Text style={styles.mileageLabel}>Absetzbarer Betrag*:</Text>
            <Text style={styles.mileageValue}>{formatMoney(summary.mileage.total_amount)}</Text>
          </View>
          <Text style={styles.mileageHint}>*Viele Selbstständige behandeln dies als Betriebsausgabe</Text>
        </View>
      </View>

      {/* Receipts Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📎 Belege</Text>
        <View style={styles.receiptsCard}>
          <View style={styles.receiptsRow}>
            <Text style={styles.receiptsLabel}>Belege erfasst:</Text>
            <Text style={[styles.receiptsValue, { color: '#10B981' }]}>{summary.receipts.count}</Text>
          </View>
          {summary.receipts.missing > 0 && (
            <View style={styles.receiptsRow}>
              <Text style={styles.receiptsLabel}>Fehlende Belege (≥50€):</Text>
              <Text style={[styles.receiptsValue, { color: '#EF4444' }]}>{summary.receipts.missing}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ReserveSection({ reserve }: { reserve: TaxReserve }) {
  return (
    <View>
      {/* Reserve Calculation */}
      <View style={styles.reserveCard}>
        <Text style={styles.reserveTitle}>💰 Geschätzte Steuer-Reserve</Text>
        
        <View style={styles.reserveCalc}>
          <View style={styles.reserveRow}>
            <Text style={styles.reserveLabel}>Gewinn:</Text>
            <Text style={styles.reserveValue}>{formatMoney(reserve.profit)}</Text>
          </View>
          <View style={styles.reserveRow}>
            <Text style={styles.reserveLabel}>× Reserve-Rate:</Text>
            <Text style={styles.reserveValue}>{reserve.reserve_percentage}%</Text>
          </View>
          <View style={[styles.reserveRow, styles.reserveTotal]}>
            <Text style={[styles.reserveLabel, styles.reserveTotalLabel]}>= Empfohlene Rücklage:</Text>
            <Text style={[styles.reserveValue, styles.reserveTotalValue]}>
              {formatMoney(reserve.reserve_amount)}
            </Text>
          </View>
        </View>

        <View style={styles.reserveDisclaimer}>
          <Text style={styles.reserveDisclaimerIcon}>⚠️</Text>
          <Text style={styles.reserveDisclaimerText}>{reserve.disclaimer}</Text>
        </View>
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 Tipp</Text>
        <Text style={styles.tipText}>
          Lege lieber etwas mehr zurück als diese Schätzung! Die tatsächliche 
          Steuerlast hängt von vielen Faktoren ab (Familienstand, andere 
          Einkünfte, Abzüge etc.).
        </Text>
      </View>
    </View>
  );
}

function ChecklistSection({ items }: { items: Checklist[] }) {
  return (
    <View>
      <Text style={styles.checklistIntro}>
        Prüfe diese Punkte vor der Steuererklärung:
      </Text>
      
      {items.map((item) => (
        <View key={item.id} style={styles.checklistItem}>
          <View style={styles.checklistHeader}>
            <Text style={styles.checklistEmoji}>{getStatusEmoji(item.status)}</Text>
            <View style={styles.checklistContent}>
              <Text style={styles.checklistTitle}>{item.title}</Text>
              <Text style={styles.checklistDesc}>{item.description}</Text>
              {item.details && (
                <Text style={[styles.checklistDetails, { color: getStatusColor(item.status) }]}>
                  {item.details}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  
  // Header
  header: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  
  // Disclaimer
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#F59E0B',
    lineHeight: 18,
  },
  
  // Tabs
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#06b6d4',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#020617',
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiCardWide: {
    width: '100%',
    flexBasis: '100%',
  },
  kpiEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  
  // Mileage
  mileageCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mileageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mileageLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  mileageValue: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  mileageHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // Receipts
  receiptsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  receiptsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptsLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  receiptsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Reserve
  reserveCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  reserveTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  reserveCalc: {
    marginBottom: 16,
  },
  reserveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  reserveTotal: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#06b6d4',
  },
  reserveLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  reserveValue: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  reserveTotalLabel: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  reserveTotalValue: {
    fontSize: 18,
    color: '#06b6d4',
    fontWeight: '700',
  },
  reserveDisclaimer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  reserveDisclaimerIcon: {
    marginRight: 8,
  },
  reserveDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 16,
  },
  
  // Tip
  tipCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  
  // Checklist
  checklistIntro: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  checklistItem: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checklistEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  checklistDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  checklistDetails: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Export Button
  exportButton: {
    backgroundColor: '#06b6d4',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { TaxPrepSection };

