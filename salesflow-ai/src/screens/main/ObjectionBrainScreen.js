import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { API_CONFIG } from '../../services/apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');
const getAutonomousApiUrl = () => `${API_CONFIG.baseUrl}/autonomous`;

const VERTICALS = [
  { key: 'network', label: '🌐 Network Marketing', color: '#8b5cf6' },
  { key: 'real_estate', label: '🏠 Immobilien', color: '#10b981' },
  { key: 'finance', label: '💰 Finanzvertrieb', color: '#f59e0b' },
];

const CHANNELS = [
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'instagram', label: '📸 Instagram' },
  { key: 'phone', label: '📞 Telefon' },
  { key: 'email', label: '📧 E-Mail' },
];

export default function ObjectionBrainScreen() {
  const [objection, setObjection] = useState('');
  const [vertical, setVertical] = useState('network');
  const [channel, setChannel] = useState('whatsapp');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyzeObjection = async () => {
    if (!objection.trim()) {
      setError('Bitte gib einen Einwand ein');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Verwende MENTOR Quick Action für Objection Help
      const response = await fetch(`${getApiUrl()}/api/v2/mentor/quick-action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'objection_help',
          context: `${objection.trim()} (Branche: ${vertical}, Kanal: ${channel})`
        })
      });
      
      const data = await response.json();
      if (data.suggestion) {
        // Konvertiere neue Response-Struktur zu alter (für Kompatibilität)
        setResult({
          variants: [
            {
              label: '💡 Antwort',
              message: data.suggestion,
              summary: `Action: ${data.action_type}`
            }
          ],
          tokens_used: data.tokens_used || 0
        });
      } else {
        setError('Keine Antwort generiert');
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧠 Objection Brain</Text>
        <Text style={styles.headerSubtitle}>KI-gestützte Einwand-Behandlung</Text>
      </View>

      <View style={styles.content}>
        {/* Vertical Selection */}
        <Text style={styles.label}>Branche</Text>
        <View style={styles.optionsRow}>
          {VERTICALS.map((v) => (
            <Pressable
              key={v.key}
              style={[styles.optionChip, vertical === v.key && { backgroundColor: v.color }]}
              onPress={() => setVertical(v.key)}
            >
              <Text style={[styles.optionText, vertical === v.key && styles.optionTextActive]}>{v.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Channel Selection */}
        <Text style={styles.label}>Kanal</Text>
        <View style={styles.optionsRow}>
          {CHANNELS.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.optionChip, channel === c.key && styles.optionChipActive]}
              onPress={() => setChannel(c.key)}
            >
              <Text style={[styles.optionText, channel === c.key && styles.optionTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Objection Input */}
        <Text style={styles.label}>Einwand des Kunden</Text>
        <TextInput
          style={styles.textArea}
          value={objection}
          onChangeText={setObjection}
          placeholder="z.B. 'Ich habe keine Zeit' oder 'Das ist mir zu teuer'"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable 
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={analyzeObjection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>🎯 Antworten generieren</Text>
          )}
        </Pressable>

        {/* Results */}
        {result && result.variants && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>💡 Empfohlene Antworten</Text>
            {result.variants.map((variant, index) => (
              <View key={index} style={styles.variantCard}>
                <Text style={styles.variantLabel}>{variant.label}</Text>
                <Text style={styles.variantMessage}>{variant.message}</Text>
                {variant.summary && (
                  <Text style={styles.variantSummary}>💭 {variant.summary}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#8b5cf6', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8, marginTop: 16 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  optionChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  optionText: { fontSize: 14, color: '#64748b' },
  optionTextActive: { color: 'white', fontWeight: '600' },
  textArea: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', color: '#1e293b' },
  error: { color: '#ef4444', marginTop: 8, textAlign: 'center' },
  button: { backgroundColor: '#8b5cf6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonPressed: { backgroundColor: '#7c3aed' },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  resultsContainer: { marginTop: 32 },
  resultsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  variantCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  variantLabel: { fontSize: 14, fontWeight: '600', color: '#8b5cf6', marginBottom: 8 },
  variantMessage: { fontSize: 16, color: '#1e293b', lineHeight: 24 },
  variantSummary: { fontSize: 14, color: '#64748b', marginTop: 12, fontStyle: 'italic' },
});

