import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clipboard } from 'react-native';

/**
 * Zeigt 3 Einwand-Antworten aus der Datenbank formatiert an
 */
export const ObjectionResponsesCard = ({ 
  objectionType, 
  responses, 
  onCustomize,
  onCopy 
}) => {
  if (!responses || responses.length === 0) {
    return null;
  }

  const handleCopy = (responseText) => {
    Clipboard.setString(responseText);
    if (onCopy) {
      onCopy();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ Einwand erkannt: {objectionType}</Text>
        <Text style={styles.headerSubtitle}>
          {responses.length} bewährte Antwort{responses.length !== 1 ? 'en' : ''} aus der Bibliothek
        </Text>
      </View>

      {responses.map((response, index) => (
        <View key={response.id || index} style={styles.responseCard}>
          <View style={styles.responseHeader}>
            <Text style={styles.responseNumber}>#{index + 1}</Text>
            {response.technique && (
              <View style={styles.techniqueBadge}>
                <Text style={styles.techniqueText}>{response.technique}</Text>
              </View>
            )}
            {response.timesUsed > 0 && (
              <Text style={styles.usageText}>
                {response.timesUsed}x verwendet
                {response.successRate && ` • ${Math.round(response.successRate * 100)}% Erfolg`}
              </Text>
            )}
          </View>
          
          <Text style={styles.responseText}>{response.responseShort}</Text>
          
          {response.followUpQuestion && (
            <View style={styles.followUpContainer}>
              <Text style={styles.followUpLabel}>💡 Follow-up:</Text>
              <Text style={styles.followUpText}>{response.followUpQuestion}</Text>
            </View>
          )}
          
          <View style={styles.responseActions}>
            <Pressable
              style={styles.copyButton}
              onPress={() => handleCopy(response.responseShort)}
            >
              <Text style={styles.copyButtonText}>📋 Kopieren</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        style={styles.customizeButton}
        onPress={onCustomize}
      >
        <Text style={styles.customizeButtonText}>
          ✏️ Anpassen (KI-generiert)
        </Text>
        <Text style={styles.customizeButtonSubtext}>
          Personalisierte Antwort mit KI erstellen
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  responseCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  responseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  techniqueBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  techniqueText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
  },
  usageText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 'auto',
  },
  responseText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 10,
  },
  followUpContainer: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
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
  responseActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  copyButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  copyButtonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  customizeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  customizeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  customizeButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

