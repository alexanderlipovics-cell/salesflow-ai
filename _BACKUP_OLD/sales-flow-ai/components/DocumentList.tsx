import React, { useCallback, useEffect, useState } from 'react';
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
  DocumentService,
  SalesFlowDocument,
} from '../services/documentService';

interface DocumentListProps {
  workspaceId: string;
  contactId: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  workspaceId,
  contactId,
}) => {
  const [documents, setDocuments] = useState<SalesFlowDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const response = await DocumentService.getDocuments(contactId);
      setDocuments(response);
    } catch (error) {
      console.error('[DocumentList] Failed to load documents', error);
      Alert.alert('Fehler', 'Dokumente konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async () => {
    try {
      const result = await DocumentService.pickDocument();
      if (result.type !== 'success' || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setUploading(true);
      await DocumentService.uploadDocument(
        workspaceId,
        contactId,
        {
          uri: asset.uri,
          name: asset.name ?? 'upload',
          type: asset.mimeType ?? 'application/octet-stream',
        },
        '',
      );
      await loadDocuments();
    } catch (error) {
      console.error('[DocumentList] Upload failed', error);
      Alert.alert('Fehler', 'Dokument konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const renderDocument = ({ item }: { item: SalesFlowDocument }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.fileName}>{item.filename}</Text>
        <Text style={styles.meta}>
          {(item.file_size / 1024).toFixed(1)} KB •{' '}
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={async () => {
          try {
            const path = await DocumentService.downloadDocument(item.id);
            Alert.alert('Download gestartet', `Gespeichert unter ${path}`);
          } catch (error) {
            console.error('[DocumentList] download failed', error);
            Alert.alert('Fehler', 'Download fehlgeschlagen.');
          }
        }}
      >
        <Text style={styles.downloadText}>⬇️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📎 Dokumente</Text>
        <TouchableOpacity
          onPress={handleUpload}
          style={styles.uploadButton}
          disabled={uploading}
        >
          <Text style={styles.uploadText}>
            {uploading ? 'Lädt...' : 'Upload'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1d4ed8" />
      ) : documents.length === 0 ? (
        <Text style={styles.emptyState}>Noch keine Dateien vorhanden.</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={documents}
          keyExtractor={item => item.id}
          renderItem={renderDocument}
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
  uploadButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  fileName: {
    color: '#fff',
    fontWeight: '600',
  },
  meta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  downloadButton: {
    padding: 6,
  },
  downloadText: {
    fontSize: 18,
  },
});


