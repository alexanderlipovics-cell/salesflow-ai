/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REACTIVATION AGENT SCREEN                                                 ║
 * ║  Dashboard für dormante Lead-Reaktivierung                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { reactivationApi, type DormantLead, type ReactivationRun } from '../../api/reactivation';
import { AURA_COLORS } from '../../components/aura';

export default function ReactivationScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dormantLeads, setDormantLeads] = useState<DormantLead[]>([]);
  const [recentRuns, setRecentRuns] = useState<ReactivationRun[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leads, runs] = await Promise.all([
        reactivationApi.getDormantLeads(90, 20),
        reactivationApi.getRuns(undefined, undefined, 10),
      ]);
      setDormantLeads(leads);
      setRecentRuns(runs);
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartReactivation = async (leadId: string) => {
    try {
      setProcessing(leadId);
      await reactivationApi.startReactivation(leadId);
      Alert.alert('Erfolg', 'Reactivation Agent gestartet!');
      await loadData();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim Starten der Reaktivierung');
    } finally {
      setProcessing(null);
    }
  };

  const handleBatchReactivation = async () => {
    Alert.alert(
      'Batch-Reaktivierung',
      'Soll für alle dormanten Leads eine Reaktivierung gestartet werden? (Max. 10 Leads)',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              setProcessing('batch');
              const result = await reactivationApi.startBatchReactivation(90, 10);
              Alert.alert('Erfolg', `${result.count} Leads werden reaktiviert!`);
              await loadData();
            } catch (error: any) {
              Alert.alert('Fehler', error.message || 'Fehler bei Batch-Reaktivierung');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={AURA_COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: AURA_COLORS.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: AURA_COLORS.text.primary }}>
            🔄 Reactivation Agent
          </Text>
          <Text style={{ fontSize: 16, color: AURA_COLORS.text.secondary, marginTop: 4 }}>
            Dormante Leads intelligent reaktivieren
          </Text>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: AURA_COLORS.surface,
              padding: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: AURA_COLORS.primary }}>
              {dormantLeads.length}
            </Text>
            <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary }}>
              Dormante Leads
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: AURA_COLORS.surface,
              padding: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: AURA_COLORS.success }}>
              {recentRuns.filter((r) => r.status === 'completed').length}
            </Text>
            <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary }}>
              Abgeschlossen
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              backgroundColor: AURA_COLORS.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={() => navigation.navigate('ReviewQueue' as never)}
            disabled={processing !== null}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              📋 Review Queue öffnen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: AURA_COLORS.surface,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: AURA_COLORS.primary,
            }}
            onPress={handleBatchReactivation}
            disabled={processing !== null || dormantLeads.length === 0}
          >
            {processing === 'batch' ? (
              <ActivityIndicator color={AURA_COLORS.primary} />
            ) : (
              <Text style={{ color: AURA_COLORS.primary, fontSize: 16, fontWeight: 'bold' }}>
                🚀 Batch-Reaktivierung starten ({dormantLeads.length} Leads)
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Dormant Leads */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            Dormante Leads
          </Text>
          {dormantLeads.length === 0 ? (
            <View
              style={{
                backgroundColor: AURA_COLORS.surface,
                padding: 24,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: AURA_COLORS.text.secondary }}>
                Keine dormanten Leads gefunden ✨
              </Text>
            </View>
          ) : (
            dormantLeads.slice(0, 10).map((lead) => (
              <View
                key={lead.id}
                style={{
                  backgroundColor: AURA_COLORS.surface,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: AURA_COLORS.text.primary }}>
                    {lead.name}
                  </Text>
                  {lead.company && (
                    <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary }}>
                      {lead.company}
                    </Text>
                  )}
                  {lead.days_dormant && (
                    <Text style={{ fontSize: 12, color: AURA_COLORS.warning, marginTop: 4 }}>
                      {lead.days_dormant} Tage kein Kontakt
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: AURA_COLORS.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={() => handleStartReactivation(lead.id)}
                  disabled={processing === lead.id}
                >
                  {processing === lead.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Reaktivieren</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Recent Runs */}
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            Letzte Runs
          </Text>
          {recentRuns.length === 0 ? (
            <View
              style={{
                backgroundColor: AURA_COLORS.surface,
                padding: 24,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: AURA_COLORS.text.secondary }}>
                Noch keine Runs vorhanden
              </Text>
            </View>
          ) : (
            recentRuns.map((run) => (
              <View
                key={run.id}
                style={{
                  backgroundColor: AURA_COLORS.surface,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: AURA_COLORS.text.primary }}>
                    {run.status.toUpperCase()}
                  </Text>
                  {run.confidence_score && (
                    <Text style={{ fontSize: 12, color: AURA_COLORS.text.secondary }}>
                      Confidence: {Math.round(run.confidence_score * 100)}%
                    </Text>
                  )}
                </View>
                {run.signals_found !== undefined && (
                  <Text style={{ fontSize: 12, color: AURA_COLORS.text.secondary }}>
                    {run.signals_found} Signale gefunden
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: AURA_COLORS.text.secondary, marginTop: 4 }}>
                  {new Date(run.started_at).toLocaleString('de-DE')}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

