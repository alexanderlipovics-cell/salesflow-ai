import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  VoiceNoteService,
  VoiceNote,
} from '../services/voiceNoteService';

interface VoiceNotesSectionProps {
  workspaceId: string;
  contactId: string;
}

export const VoiceNotesSection: React.FC<VoiceNotesSectionProps> = ({
  workspaceId,
  contactId,
}) => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadNotes = async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const response = await VoiceNoteService.getVoiceNotes(contactId);
      setNotes(response);
    } catch (error) {
      console.error('[VoiceNotes] load failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [contactId]);

  const toggleRecording = async () => {
    try {
      if (!recording) {
        await VoiceNoteService.startRecording();
        setRecording(true);
        return;
      }

      const uri = await VoiceNoteService.stopRecording();
      setRecording(false);
      if (!uri) return;

      setProcessing(true);
      await VoiceNoteService.uploadVoiceNote(workspaceId, contactId, uri);
      await loadNotes();
    } catch (error) {
      console.error('[VoiceNotes] recording error', error);
      Alert.alert('Fehler', 'Voice Note konnte nicht verarbeitet werden.');
    } finally {
      setProcessing(false);
      setRecording(false);
    }
  };

  const renderItem = ({ item }: { item: VoiceNote }) => (
    <View style={styles.noteRow}>
      <View>
        <Text style={styles.noteTitle}>
          🎙️ {Math.round(item.duration_seconds)}s
        </Text>
        <Text style={styles.noteMeta}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
        {item.transcription && (
          <Text style={styles.transcription}>{item.transcription}</Text>
        )}
        {!item.transcription && (
          <Text style={styles.pending}>
            {item.transcription_status === 'failed'
              ? 'Transkription fehlgeschlagen'
              : 'Transkription läuft...'}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => VoiceNoteService.playVoiceNote(item.audio_url)}
        style={styles.playButton}
      >
        <Text style={styles.playText}>▶️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗣️ Voice Notes</Text>
        <TouchableOpacity
          onPress={toggleRecording}
          style={[
            styles.recordButton,
            recording && { backgroundColor: '#dc2626' },
          ]}
          disabled={processing}
        >
          <Text style={styles.recordText}>
            {recording ? 'Stop' : 'Aufnehmen'}
          </Text>
        </TouchableOpacity>
      </View>

      {processing && (
        <Text style={styles.processingText}>
          Upload / Transkription gestartet...
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color="#38bdf8" />
      ) : notes.length === 0 ? (
        <Text style={styles.emptyState}>
          Noch keine Voice Notes gespeichert.
        </Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={notes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  recordText: {
    color: '#fff',
    fontWeight: '700',
  },
  processingText: {
    color: '#fde047',
    marginBottom: 8,
  },
  emptyState: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  noteTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  noteMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginVertical: 2,
  },
  transcription: {
    color: '#e2e8f0',
    marginTop: 6,
  },
  pending: {
    color: '#f97316',
    marginTop: 4,
    fontStyle: 'italic',
  },
  playButton: {
    padding: 8,
  },
  playText: {
    fontSize: 24,
  },
});


