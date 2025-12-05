import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { API_CONFIG } from '../../services/apiConfig';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { ObjectionResponsesCard } from '../../components/objection/ObjectionResponsesCard';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// Einwand-Kategorien
const OBJECTION_CATEGORIES = [
  { key: 'preis', label: '💰 Preis', color: '#ef4444', icon: '💰' },
  { key: 'zeit', label: '⏰ Zeit', color: '#f59e0b', icon: '⏰' },
  { key: 'interesse', label: '🤔 Interesse', color: '#8b5cf6', icon: '🤔' },
  { key: 'skepsis', label: '🛡️ Skepsis', color: '#06b6d4', icon: '🛡️' },
];

export default function ObjectionBrainScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [objection, setObjection] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');
  const [allResponses, setAllResponses] = useState([]); // Für Offline-Zugriff

  // Lade alle Einwände beim Start (Offline-fähig)
  useEffect(() => {
    loadAllObjections();
  }, []);

  const loadAllObjections = async () => {
    try {
      let query = supabase
        .from('objection_responses')
        .select('*')
        .eq('is_active', true)
        .order('times_used', { ascending: false })
        .limit(50); // Top 50 für Offline-Zugriff
      
      if (user?.company_id) {
        query = query.or(`company_id.eq.${user.company_id},company_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setAllResponses(data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Einwände:', err);
    }
  };

  const getCategoryLabel = (key) => {
    const labels = {
      preis: 'Preis',
      zeit: 'Zeit',
      interesse: 'Interesse',
      skepsis: 'Skepsis',
    };
    return labels[key] || key;
  };

  const browseByCategory = async (categoryKey) => {
    setSelectedCategory(categoryKey);
    setLoading(true);
    setError('');
    setResponses([]);

    try {
      let query = supabase
        .from('objection_responses')
        .select('*')
        .eq('is_active', true)
        .or(`objection_type.ilike.%${categoryKey}%,objection_type.ilike.%${getCategoryLabel(categoryKey)}%`)
        .order('times_used', { ascending: false })
        .limit(10);
      
      if (user?.company_id) {
        query = query.or(`company_id.eq.${user.company_id},company_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setResponses(data.map(item => ({
          id: item.id,
          type: item.objection_type,
          responseShort: item.response_short,
          responseFull: item.response_full || item.response_short,
          technique: item.response_technique,
          followUpQuestion: item.follow_up_question,
          timesUsed: item.times_used || 0,
          successRate: item.success_rate,
        })));
      } else {
        setError('Keine Antworten in dieser Kategorie gefunden.');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorie:', err);
      setError('Fehler beim Laden. Versuche es erneut.');
    }
    setLoading(false);
  };

  const analyzeObjection = async () => {
    if (!objection.trim()) {
      setError('Bitte gib einen Einwand ein');
      return;
    }
    setLoading(true);
    setError('');
    setResponses([]);

    try {
      // Zuerst aus Supabase (kostenlos)
      const { fetchObjectionResponses } = await import('../../services/objectionDetection');
      const dbResponses = await fetchObjectionResponses(
        objection.toLowerCase(),
        user?.company_id,
        'network_marketing' // TODO: Aus User-Context holen
      );
      
      if (dbResponses && dbResponses.length > 0) {
        setResponses(dbResponses);
        setLoading(false);
        return;
      }
      
      // Fallback: API (nur wenn keine DB-Antworten)
      const response = await fetch(`${getApiUrl()}/api/v2/mentor/quick-action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'objection_help',
          context: objection.trim()
        })
      });
      
      const data = await response.json();
      if (data.suggestion) {
        setResponses([{
          id: 'api-generated',
          type: 'KI-generiert',
          responseShort: data.suggestion,
          responseFull: data.suggestion,
          technique: 'KI-generiert',
          timesUsed: 0,
        }]);
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
        <Text style={styles.headerTitle}>🛡️ Einwand-Bibliothek</Text>
        <Text style={styles.headerSubtitle}>Durchstöbere bewährte Antworten • Offline-fähig</Text>
      </View>

      <View style={styles.content}>
        {/* Kategorien */}
        <Text style={styles.label}>Kategorien</Text>
        <View style={styles.categoriesGrid}>
          {OBJECTION_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryCard,
                selectedCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }
              ]}
              onPress={() => browseByCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                selectedCategory === cat.key && styles.categoryLabelActive
              ]}>
                {cat.label.replace(cat.icon + ' ', '')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Oder: Einwand eingeben */}
        <Text style={styles.label}>Oder: Einwand eingeben</Text>
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
          disabled={loading || !objection.trim()}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>🔍 Antworten suchen</Text>
          )}
        </Pressable>

        {/* Ergebnisse */}
        {loading && !responses.length && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Lade Antworten...</Text>
          </View>
        )}

        {responses.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              📚 {responses.length} Antwort{responses.length !== 1 ? 'en' : ''} gefunden
            </Text>
            <ObjectionResponsesCard
              objectionType={selectedCategory ? getCategoryLabel(selectedCategory) : 'Einwand'}
              responses={responses}
              onCustomize={async () => {
                if (!objection.trim()) {
                  Alert.alert('Info', 'Bitte gib zuerst einen Einwand ein.');
                  return;
                }
                setLoading(true);
                try {
                  const response = await fetch(`${getApiUrl()}/api/v2/mentor/quick-action`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action_type: 'objection_help',
                      context: objection.trim()
                    })
                  });
                  
                  const data = await response.json();
                  if (data.suggestion) {
                    setResponses([{
                      id: 'api-generated',
                      type: 'KI-generiert',
                      responseShort: data.suggestion,
                      responseFull: data.suggestion,
                      technique: 'KI-generiert',
                      timesUsed: 0,
                    }]);
                    Alert.alert('✅ Angepasst', 'KI-generierte Antwort wurde erstellt.');
                  }
                } catch (err) {
                  Alert.alert('Fehler', 'Antwort konnte nicht angepasst werden.');
                }
                setLoading(false);
              }}
              onCopy={() => {
                Alert.alert('✅ Kopiert', 'Antwort wurde in die Zwischenablage kopiert.');
              }}
            />
          </View>
        )}

        {/* Info: Offline-fähig */}
        {allResponses.length > 0 && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💾 {allResponses.length} Antworten offline verfügbar
            </Text>
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
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12, marginTop: 16 },
  categoriesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    marginBottom: 8,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: 'white',
  },
  textArea: { 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    minHeight: 100, 
    textAlignVertical: 'top', 
    color: '#1e293b' 
  },
  error: { color: '#ef4444', marginTop: 8, textAlign: 'center', fontSize: 14 },
  button: { 
    backgroundColor: '#8b5cf6', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 24 
  },
  buttonPressed: { backgroundColor: '#7c3aed' },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  resultsContainer: { marginTop: 32 },
  resultsTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 16 
  },
  infoBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  infoText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
});
