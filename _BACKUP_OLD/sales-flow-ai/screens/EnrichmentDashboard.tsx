import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../services/api';

interface EnrichmentJob {
  id: string;
  lead_id: string;
  enrichment_type: string;
  status: string;
  data_found: boolean;
  sources_queried: string[];
  enriched_fields: string[];
  created_at: string;
  completed_at: string;
  leads: {
    name: string;
    email: string;
    company: string;
  };
}

interface Stats {
  jobs: {
    total_jobs: number;
    completed: number;
    failed: number;
    enriched: number;
    avg_fields_found: number;
  };
  cache: {
    total_cached: number;
    total_hits: number;
    avg_hits: number;
  };
}

export default function EnrichmentDashboard({ navigation }: any) {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        apiClient.get('/enrichment/jobs?limit=20'),
        apiClient.get('/enrichment/stats')
      ]);

      setJobs(jobsResponse.data.jobs);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load enrichment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      case 'processing': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⏳';
      default: return '⚪';
    }
  };

  const renderJob = ({ item }: { item: EnrichmentJob }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('EnrichmentJobDetails', { jobId: item.id })}
    >
      <View style={styles.jobHeader}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{item.leads.name}</Text>
          <Text style={styles.leadCompany}>{item.leads.company || 'Unknown Company'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusIcon(item.status)} {item.status}
          </Text>
        </View>
      </View>

      {item.status === 'completed' && (
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fields Found:</Text>
            <Text style={styles.detailValue}>{item.enriched_fields?.length || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sources:</Text>
            <Text style={styles.detailValue}>
              {item.sources_queried?.join(', ') || 'None'}
            </Text>
          </View>
          {item.enriched_fields && item.enriched_fields.length > 0 && (
            <View style={styles.fieldsContainer}>
              {item.enriched_fields.map((field, index) => (
                <View key={index} style={styles.fieldChip}>
                  <Text style={styles.fieldText}>{field}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleString('de-DE')}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Lead Enrichment</Text>
        <Text style={styles.subtitle}>Auto-enrich leads with external data</Text>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>{stats.jobs.total_jobs || 0}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{stats.jobs.completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statValue}>{stats.jobs.enriched || 0}</Text>
            <Text style={styles.statLabel}>Enriched</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💾</Text>
            <Text style={styles.statValue}>{stats.cache.total_hits || 0}</Text>
            <Text style={styles.statLabel}>Cache Hits</Text>
          </View>
        </View>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>💡</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            We use Clearbit and Hunter.io to automatically find missing information about your leads.
          </Text>
        </View>
      </View>

      {/* Recent Jobs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Enrichments</Text>

        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No enrichments yet</Text>
            <Text style={styles.emptySubtext}>
              Click "Auto-Enrich" on any lead to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJob}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  leadCompany: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  fieldChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  fieldText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

