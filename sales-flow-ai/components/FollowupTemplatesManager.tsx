import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal } from 'react-native';
import FollowupTemplateEditor from './FollowupTemplateEditor';

interface Template {
  id: string;
  name: string;
  trigger_key: string;
  channel: string;
  category?: string;
  usage_count?: number;
  success_rate?: number;
  created_at?: string;
}

export default function FollowupTemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [filterChannel]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      let url = '/api/followup-templates/list?is_active=true';
      if (filterChannel) {
        url += `&channel=${filterChannel}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Load Templates Error:', error);
      Alert.alert('Fehler', 'Templates konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    Alert.alert(
      'Template löschen',
      `Möchtest du "${templateName}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/followup-templates/${templateId}`, {
                method: 'DELETE'
              });
              
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Erfolg', 'Template wurde gelöscht');
                loadTemplates();
              } else {
                Alert.alert('Fehler', 'Löschen fehlgeschlagen');
              }
            } catch (error) {
              console.error('Delete Error:', error);
              Alert.alert('Fehler', 'Löschen fehlgeschlagen');
            }
          }
        }
      ]
    );
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (Kopie)`,
        trigger_key: `${template.trigger_key}_copy_${Date.now()}`
      };
      
      delete newTemplate.id;
      delete newTemplate.created_at;
      delete newTemplate.usage_count;
      delete newTemplate.success_rate;
      
      const response = await fetch('/api/followup-templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Erfolg', 'Template wurde dupliziert');
        loadTemplates();
      } else {
        Alert.alert('Fehler', 'Duplizieren fehlgeschlagen');
      }
    } catch (error) {
      console.error('Duplicate Error:', error);
      Alert.alert('Fehler', 'Duplizieren fehlgeschlagen');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/followup-templates/export');
      const data = await response.json();
      
      if (data.success) {
        // In einer echten App würdest du hier die Datei speichern oder teilen
        console.log('Export:', data.export);
        Alert.alert('Export', 'Templates wurden exportiert (siehe Console)');
      }
    } catch (error) {
      console.error('Export Error:', error);
      Alert.alert('Fehler', 'Export fehlgeschlagen');
    }
  };

  const handleSave = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
    loadTemplates();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
  };

  const getChannelIcon = (channel: string): string => {
    switch (channel) {
      case 'email': return '📧';
      case 'whatsapp': return '📲';
      case 'in_app': return '💬';
      default: return '📨';
    }
  };

  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'reactivation': return '#f59e0b';
      case 'reminder': return '#3b82f6';
      case 'nurture': return '#10b981';
      case 'objection': return '#ef4444';
      case 'closing': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (showEditor) {
    return (
      <Modal animationType="slide" visible={showEditor}>
        <FollowupTemplateEditor
          template={selectedTemplate}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📋 Follow-up Templates</Text>
          <Text style={styles.subtitle}>{templates.length} Templates verfügbar</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createButtonText}>➕ Neu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !filterChannel && styles.filterChipActive]}
          onPress={() => setFilterChannel(null)}
        >
          <Text style={[styles.filterChipText, !filterChannel && styles.filterChipTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        
        {['email', 'whatsapp', 'in_app'].map((channel) => (
          <TouchableOpacity
            key={channel}
            style={[styles.filterChip, filterChannel === channel && styles.filterChipActive]}
            onPress={() => setFilterChannel(channel)}
          >
            <Text style={[styles.filterChipText, filterChannel === channel && styles.filterChipTextActive]}>
              {getChannelIcon(channel)} {channel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Templates List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Templates...</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{item.name}</Text>
                  <View style={styles.templateMeta}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {getChannelIcon(item.channel)} {item.channel}
                      </Text>
                    </View>
                    
                    {item.category && (
                      <View style={[styles.badge, { backgroundColor: getCategoryColor(item.category) }]}>
                        <Text style={[styles.badgeText, { color: '#fff' }]}>
                          {item.category}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.templateTrigger}>🔑 {item.trigger_key}</Text>
                  
                  {item.usage_count !== undefined && item.usage_count > 0 && (
                    <Text style={styles.templateStats}>
                      📊 {item.usage_count} mal verwendet
                      {item.success_rate && ` • ${item.success_rate}% Erfolg`}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.templateActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDuplicate(item)}
                >
                  <Text style={styles.actionButtonText}>📋</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.actionButtonText}>✏️</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Noch keine Templates vorhanden</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
                <Text style={styles.emptyButtonText}>➕ Erstes Template erstellen</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    fontSize: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flex: 1,
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  templateTrigger: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  templateStats: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
    fontWeight: '500',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 18,
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

