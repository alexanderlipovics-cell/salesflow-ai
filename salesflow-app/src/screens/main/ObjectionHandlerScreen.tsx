/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  OBJECTION HANDLER SCREEN - Einwandbehandlung                             ║
 * ║  Sucht in objection_responses Tabelle                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { searchObjectionResponses } from '../../services/api';

interface ObjectionResponse {
  id: string;
  objection_type: string;
  response_short: string;
  response_full?: string;
  response_technique?: string;
  follow_up_question?: string;
  times_used?: number;
  success_rate?: number;
}

export default function ObjectionHandlerScreen() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [responses, setResponses] = useState<ObjectionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Bitte gib einen Suchbegriff ein');
      return;
    }

    setLoading(true);
    setError('');
    setResponses([]);

    try {
      const results = await searchObjectionResponses(
        searchTerm.trim(),
        user?.company_id
      );
      setResponses(results as ObjectionResponse[]);

      if (results.length === 0) {
        setError('Keine Antworten gefunden. Versuche andere Suchbegriffe.');
      }
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      setError('Fehler bei der Suche. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('✅ Kopiert', 'Antwort wurde in die Zwischenablage kopiert.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ Einwandbehandlung</Text>
        <Text style={styles.headerSubtitle}>
          Suche nach bewährten Antworten auf Einwände
        </Text>
      </View>

      <View style={styles.content}>
        {/* Suchfeld */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="z.B. 'zu teuer', 'keine Zeit', 'muss überlegen'..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.searchButtonText}>🔍 Suchen</Text>
            )}
          </Pressable>
        </View>

        {/* Fehleranzeige */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Ergebnisse */}
        {loading && responses.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Suche läuft...</Text>
          </View>
        ) : responses.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {responses.length} Antwort{responses.length !== 1 ? 'en' : ''} gefunden
            </Text>
            {responses.map((response) => (
              <View key={response.id} style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {response.objection_type || 'Einwand'}
                    </Text>
                  </View>
                  {response.times_used && response.times_used > 0 && (
                    <Text style={styles.usageText}>
                      {response.times_used}x verwendet
                      {response.success_rate &&
                        ` • ${Math.round(response.success_rate * 100)}% Erfolg`}
                    </Text>
                  )}
                </View>

                <Text style={styles.responseText}>
                  {response.response_full || response.response_short}
                </Text>

                {response.response_technique && (
                  <View style={styles.techniqueContainer}>
                    <Text style={styles.techniqueLabel}>Technik:</Text>
                    <Text style={styles.techniqueText}>
                      {response.response_technique}
                    </Text>
                  </View>
                )}

                {response.follow_up_question && (
                  <View style={styles.followUpContainer}>
                    <Text style={styles.followUpLabel}>💡 Follow-up:</Text>
                    <Text style={styles.followUpText}>
                      {response.follow_up_question}
                    </Text>
                  </View>
                )}

                <Pressable
                  style={styles.copyButton}
                  onPress={() =>
                    copyResponse(response.response_full || response.response_short)
                  }
                >
                  <Text style={styles.copyButtonText}>📋 Kopieren</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ef4444',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  responseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'capitalize',
  },
  usageText: {
    fontSize: 12,
    color: '#64748b',
  },
  responseText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 12,
  },
  techniqueContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  techniqueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 4,
  },
  techniqueText: {
    fontSize: 13,
    color: '#92400e',
  },
  followUpContainer: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  followUpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  followUpText: {
    fontSize: 13,
    color: '#047857',
    fontStyle: 'italic',
  },
  copyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

