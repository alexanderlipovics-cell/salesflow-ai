import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

interface Template {
  id?: string;
  name: string;
  trigger_key: string;
  channel: 'whatsapp' | 'email' | 'in_app';
  subject_template?: string;
  short_template?: string;
  body_template: string;
  reminder_template?: string;
  fallback_template?: string;
  gpt_autocomplete_prompt?: string;
  preview_context?: any;
  category?: string;
}

interface Props {
  template?: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

export default function FollowupTemplateEditor({ template, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Template>(template || {
    name: '',
    trigger_key: '',
    channel: 'email',
    body_template: '',
    preview_context: {
      first_name: 'Max',
      last_name: 'Mustermann'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const update = (key: keyof Template, value: any) => {
    setForm({ ...form, [key]: value });
  };

  const updatePreviewContext = (key: string, value: string) => {
    setForm({
      ...form,
      preview_context: {
        ...form.preview_context,
        [key]: value
      }
    });
  };

  const handleGptAutocomplete = async () => {
    if (!form.id) {
      Alert.alert('Hinweis', 'Bitte speichere das Template zuerst, bevor du GPT Auto-Complete nutzt.');
      return;
    }

    setGptLoading(true);
    
    try {
      const response = await fetch('/api/followup-templates/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: form.id,
          lead_context: form.preview_context
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setForm({
          ...form,
          reminder_template: data.reminder_template,
          fallback_template: data.fallback_template
        });
        Alert.alert('Erfolg! 🤖', 'Reminder und Fallback wurden von GPT generiert.');
      } else {
        Alert.alert('Fehler', data.error || 'GPT Autocomplete fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('GPT Autocomplete Error:', error);
      Alert.alert('Fehler', 'Fehler beim Generieren. Bitte OpenAI API Key prüfen.');
    } finally {
      setGptLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!form.id) {
      // Local preview for unsaved templates
      const rendered = {
        subject: renderLocal(form.subject_template || ''),
        short: renderLocal(form.short_template || ''),
        body: renderLocal(form.body_template),
        reminder: renderLocal(form.reminder_template || ''),
        fallback: renderLocal(form.fallback_template || '')
      };
      setPreview(rendered);
      setShowPreview(true);
      return;
    }

    try {
      const response = await fetch(`/api/followup-templates/${form.id}/preview`);
      const data = await response.json();
      
      if (data.success && data.preview) {
        setPreview(data.preview.preview);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview Error:', error);
      Alert.alert('Fehler', 'Vorschau konnte nicht geladen werden');
    }
  };

  const renderLocal = (template: string): string => {
    if (!template) return '';
    
    let result = template;
    const context = form.preview_context || {};
    
    Object.keys(context).forEach(key => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), context[key]);
    });
    
    return result;
  };

  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }
    if (!form.trigger_key.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Trigger Key ein');
      return;
    }
    if (!form.body_template.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Haupttext ein');
      return;
    }

    setLoading(true);
    
    try {
      if (form.id) {
        // Update existing template
        const response = await fetch(`/api/followup-templates/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: form })
        });
        
        const data = await response.json();
        
        if (data.success) {
          Alert.alert('Erfolg! ✅', 'Template wurde aktualisiert');
          onSave(form);
        } else {
          Alert.alert('Fehler', 'Update fehlgeschlagen');
        }
      } else {
        // Create new template
        const response = await fetch('/api/followup-templates/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        
        const data = await response.json();
        
        if (data.success) {
          Alert.alert('Erfolg! ✅', 'Template wurde erstellt');
          onSave({ ...form, id: data.template_id });
        } else {
          Alert.alert('Fehler', 'Erstellen fehlgeschlagen');
        }
      }
      
    } catch (error) {
      console.error('Save Error:', error);
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>✏️ Template Editor</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. Inaktivität 14 Tage"
            value={form.name}
            onChangeText={(v) => update('name', v)}
          />
        </View>

        {/* Trigger Key */}
        <View style={styles.field}>
          <Text style={styles.label}>Trigger Key * <Text style={styles.hint}>(eindeutig)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. inactivity_14d"
            value={form.trigger_key}
            onChangeText={(v) => update('trigger_key', v)}
            autoCapitalize="none"
          />
        </View>

        {/* Channel */}
        <View style={styles.field}>
          <Text style={styles.label}>Kanal *</Text>
          <View style={styles.channelButtons}>
            {[
              { value: 'email', icon: '📧', label: 'Email' },
              { value: 'whatsapp', icon: '📲', label: 'WhatsApp' },
              { value: 'in_app', icon: '💬', label: 'In-App' }
            ].map((ch) => (
              <TouchableOpacity
                key={ch.value}
                style={[styles.channelButton, form.channel === ch.value && styles.channelButtonActive]}
                onPress={() => update('channel', ch.value)}
              >
                <Text style={[styles.channelButtonText, form.channel === ch.value && styles.channelButtonTextActive]}>
                  {ch.icon} {ch.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Kategorie <Text style={styles.hint}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. reactivation, reminder, nurture"
            value={form.category}
            onChangeText={(v) => update('category', v)}
          />
        </View>

        {/* Subject (Email only) */}
        {form.channel === 'email' && (
          <View style={styles.field}>
            <Text style={styles.label}>Betreff (Email)</Text>
            <TextInput
              style={styles.input}
              placeholder="Noch Fragen zum Angebot, {{"{{"}}first_name{{"}}"}}?"
              value={form.subject_template}
              onChangeText={(v) => update('subject_template', v)}
            />
          </View>
        )}

        {/* Short (WhatsApp/In-App) */}
        {(form.channel === 'whatsapp' || form.channel === 'in_app') && (
          <View style={styles.field}>
            <Text style={styles.label}>Kurz-Vorschau</Text>
            <TextInput
              style={styles.input}
              placeholder="Hey {{"{{"}}first_name{{"}}"}}, alles gut?"
              value={form.short_template}
              onChangeText={(v) => update('short_template', v)}
            />
          </View>
        )}

        {/* Body */}
        <View style={styles.field}>
          <Text style={styles.label}>Haupttext (Body) *</Text>
          <Text style={styles.hint}>Nutze {"{{"}}{"{"}placeholder{"}}"}{"}"} für dynamische Inhalte</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={"Hey {{first_name}},\n\nich hoffe, es geht dir gut...\n\nBeste Grüße"}
            multiline
            numberOfLines={8}
            value={form.body_template}
            onChangeText={(v) => update('body_template', v)}
          />
        </View>

        {/* GPT Auto-Complete Section */}
        <View style={styles.gptSection}>
          <Text style={styles.sectionTitle}>🤖 GPT Auto-Complete</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>GPT Prompt</Text>
            <Text style={styles.hint}>Beschreibe, wie Reminder und Fallback aussehen sollen</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Generiere für {{"{{"}}first_name{{"}}"}} nach 14 Tagen Inaktivität:\n1. Reminder (2 Tage später): freundlich nachfassen\n2. Fallback (5 Tage): Opt-Out anbieten\n\nTon: empathisch, WhatsApp-Stil"
              multiline
              numberOfLines={6}
              value={form.gpt_autocomplete_prompt}
              onChangeText={(v) => update('gpt_autocomplete_prompt', v)}
            />
          </View>
          
          {form.gpt_autocomplete_prompt && (
            <TouchableOpacity
              style={[styles.gptButton, gptLoading && styles.buttonDisabled]}
              onPress={handleGptAutocomplete}
              disabled={gptLoading || !form.id}
            >
              {gptLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.gptButtonText}>
                  🤖 Reminder + Fallback generieren
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Reminder */}
        <View style={styles.field}>
          <Text style={styles.label}>Reminder (2 Tage später)</Text>
          <Text style={styles.hint}>Falls keine Antwort auf erste Nachricht</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Automatisch von GPT generiert oder manuell eingeben..."
            multiline
            numberOfLines={5}
            value={form.reminder_template}
            onChangeText={(v) => update('reminder_template', v)}
          />
        </View>

        {/* Fallback */}
        <View style={styles.field}>
          <Text style={styles.label}>Fallback (5 Tage später)</Text>
          <Text style={styles.hint}>Letzter Versuch / Opt-Out Angebot</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Automatisch von GPT generiert oder manuell eingeben..."
            multiline
            numberOfLines={5}
            value={form.fallback_template}
            onChangeText={(v) => update('fallback_template', v)}
          />
        </View>

        {/* Preview Context */}
        <View style={styles.previewContextSection}>
          <Text style={styles.sectionTitle}>👁️ Vorschau-Daten</Text>
          <Text style={styles.hint}>Beispieldaten für Template-Vorschau</Text>
          
          <View style={styles.contextRow}>
            <View style={styles.contextField}>
              <Text style={styles.contextLabel}>first_name</Text>
              <TextInput
                style={styles.contextInput}
                value={form.preview_context?.first_name || ''}
                onChangeText={(v) => updatePreviewContext('first_name', v)}
                placeholder="Max"
              />
            </View>
            
            <View style={styles.contextField}>
              <Text style={styles.contextLabel}>last_name</Text>
              <TextInput
                style={styles.contextInput}
                value={form.preview_context?.last_name || ''}
                onChangeText={(v) => updatePreviewContext('last_name', v)}
                placeholder="Mustermann"
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={onCancel}
          >
            <Text style={styles.buttonSecondaryText}>Abbrechen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonPreview]}
            onPress={handlePreview}
          >
            <Text style={styles.buttonText}>👁️ Vorschau</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>💾 Speichern</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview Modal */}
        {showPreview && preview && (
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>👁️ Vorschau</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Text style={styles.previewClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {preview.subject && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Betreff:</Text>
                <Text style={styles.previewText}>{preview.subject}</Text>
              </View>
            )}
            
            {preview.short && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Kurz:</Text>
                <Text style={styles.previewText}>{preview.short}</Text>
              </View>
            )}
            
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Body:</Text>
              <Text style={styles.previewText}>{preview.body}</Text>
            </View>
            
            {preview.reminder && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Reminder (Tag 2):</Text>
                <Text style={styles.previewText}>{preview.reminder}</Text>
              </View>
            )}
            
            {preview.fallback && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Fallback (Tag 5):</Text>
                <Text style={styles.previewText}>{preview.fallback}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'normal',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  channelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  channelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  channelButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  channelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  channelButtonTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  gptSection: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  gptButton: {
    marginTop: 12,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  gptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  previewContextSection: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  contextRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contextField: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  contextInput: {
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonPreview: {
    backgroundColor: '#6366f1',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonSecondaryText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  previewModal: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  previewClose: {
    fontSize: 24,
    color: '#666',
  },
  previewSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
});

