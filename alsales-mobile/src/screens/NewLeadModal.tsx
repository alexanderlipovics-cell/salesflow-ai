import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://salesflow-ai.onrender.com';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
}

const STATUS_OPTIONS = [
  { key: 'new', label: 'Neu', color: '#3B82F6' },
  { key: 'contacted', label: 'Kontaktiert', color: '#8B5CF6' },
  { key: 'qualified', label: 'Qualifiziert', color: '#F59E0B' },
  { key: 'won', label: 'Gewonnen', color: '#10B981' },
];

const TEMP_OPTIONS = [
  { key: 'cold', label: '❄️ Cold', color: '#3B82F6' },
  { key: 'warm', label: '☀️ Warm', color: '#F59E0B' },
  { key: 'hot', label: '🔥 Hot', color: '#EF4444' },
];

export default function NewLeadModal({ visible, onClose, onLeadCreated }: Props) {
  const [mode, setMode] = useState<'select' | 'manual' | 'chief'>('select');
  const [loading, setLoading] = useState(false);
  const [chiefInput, setChiefInput] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    instagram: '',
    whatsapp: '',
    linkedin: '',
    status: 'new',
    temperature: 'cold',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      instagram: '',
      whatsapp: '',
      linkedin: '',
      status: 'new',
      temperature: 'cold',
      notes: '',
    });
    setMode('select');
    setChiefInput('');
    setExtractedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleScreenshot = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube Zugriff auf deine Fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        setMode('chief');

        try {
          const token = await AsyncStorage.getItem('access_token');
          const formData = new FormData();
          formData.append('file', {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'screenshot.jpg',
          } as any);

          const response = await fetch(`${API_BASE}/api/vision/analyze-screenshot`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await response.json();
          
          if (data.success && data.contact) {
            setExtractedData(data.contact);
            setFormData(prev => ({
              ...prev,
              name: data.contact.name || '',
              phone: data.contact.phone || '',
              email: data.contact.email || '',
              instagram: data.contact.instagram || '',
              company: data.contact.company || '',
            }));
          } else {
            Alert.alert('Nicht erkannt', 'Konnte keine Kontaktdaten im Bild finden.');
          }
        } catch (error) {
          Alert.alert('Fehler', 'Screenshot konnte nicht analysiert werden.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  };

  const handleChiefParse = async () => {
    if (!chiefInput.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `Extrahiere die Kontaktdaten aus diesem Text und gib sie als JSON zurück mit den Feldern: name, email, phone, company, position, instagram. Text: "${chiefInput}"`,
        }),
      });

      const data = await response.json();
      const reply = data?.message || data?.reply || '';
      
      // Try to parse JSON from response
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          company: parsed.company || prev.company,
          position: parsed.position || prev.position,
          instagram: parsed.instagram || prev.instagram,
        }));
        setExtractedData(parsed);
      } else {
        // Fallback: just use the name
        setFormData(prev => ({ ...prev, name: chiefInput }));
      }
    } catch (error) {
      setFormData(prev => ({ ...prev, name: chiefInput }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Name fehlt', 'Bitte gib mindestens einen Namen ein.');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          platform: formData.instagram ? 'Instagram' : formData.whatsapp ? 'WhatsApp' : 'Web',
          bant_score: formData.temperature === 'hot' ? 70 : formData.temperature === 'warm' ? 50 : 30,
        }),
      });

      if (response.ok) {
        Alert.alert('Erfolg! 🎉', 'Lead wurde erstellt.');
        onLeadCreated();
        handleClose();
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Lead konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'select' ? '+ Neuer Lead' : mode === 'manual' ? '✏️ Manuell' : '🤖 Chief'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Selection */}
          {mode === 'select' && (
            <View style={styles.modeSelect}>
              <Text style={styles.modeSubtitle}>Wie möchtest du den Lead erstellen?</Text>
              
              <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('manual')}>
                <Text style={styles.modeBtnIcon}>✏️</Text>
                <View style={styles.modeBtnContent}>
                  <Text style={styles.modeBtnTitle}>Manuell eingeben</Text>
                  <Text style={styles.modeBtnDesc}>Kontaktdaten selbst eintragen</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modeBtn} onPress={handleScreenshot}>
                <Text style={styles.modeBtnIcon}>📸</Text>
                <View style={styles.modeBtnContent}>
                  <Text style={styles.modeBtnTitle}>Screenshot analysieren</Text>
                  <Text style={styles.modeBtnDesc}>Chief extrahiert die Daten</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('chief')}>
                <Text style={styles.modeBtnIcon}>🤖</Text>
                <View style={styles.modeBtnContent}>
                  <Text style={styles.modeBtnTitle}>Chief fragen</Text>
                  <Text style={styles.modeBtnDesc}>Text oder Voice eingeben</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Chief Input Mode */}
          {mode === 'chief' && !extractedData && (
            <View style={styles.chiefMode}>
              <Text style={styles.chiefLabel}>Sag dem Chief die Kontaktdaten:</Text>
              <TextInput
                style={styles.chiefInput}
                placeholder="z.B. Max Müller, +49 151 12345, max@firma.de, Instagram: @maxm"
                placeholderTextColor="#6B7280"
                value={chiefInput}
                onChangeText={setChiefInput}
                multiline
              />
              <TouchableOpacity 
                style={[styles.chiefBtn, !chiefInput.trim() && styles.chiefBtnDisabled]}
                onPress={handleChiefParse}
                disabled={!chiefInput.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.chiefBtnText}>✨ Chief, extrahiere!</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          {(mode === 'manual' || extractedData) && (
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              {extractedData && (
                <View style={styles.extractedBanner}>
                  <Text style={styles.extractedText}>✅ Chief hat Daten extrahiert - bitte prüfen:</Text>
                </View>
              )}

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData(p => ({ ...p, name: t }))}
                placeholder="Max Mustermann"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(t) => setFormData(p => ({ ...p, phone: t }))}
                placeholder="+49 151 12345678"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(t) => setFormData(p => ({ ...p, email: t }))}
                placeholder="max@beispiel.de"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Firma</Text>
              <TextInput
                style={styles.input}
                value={formData.company}
                onChangeText={(t) => setFormData(p => ({ ...p, company: t }))}
                placeholder="Firma GmbH"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Position</Text>
              <TextInput
                style={styles.input}
                value={formData.position}
                onChangeText={(t) => setFormData(p => ({ ...p, position: t }))}
                placeholder="Geschäftsführer"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={formData.instagram}
                onChangeText={(t) => setFormData(p => ({ ...p, instagram: t }))}
                placeholder="@username"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={formData.whatsapp}
                onChangeText={(t) => setFormData(p => ({ ...p, whatsapp: t }))}
                placeholder="+49 151..."
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>LinkedIn</Text>
              <TextInput
                style={styles.input}
                value={formData.linkedin}
                onChangeText={(t) => setFormData(p => ({ ...p, linkedin: t }))}
                placeholder="linkedin.com/in/..."
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.optionRow}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionBtn,
                      formData.status === opt.key && { backgroundColor: opt.color + '30', borderColor: opt.color }
                    ]}
                    onPress={() => setFormData(p => ({ ...p, status: opt.key }))}
                  >
                    <Text style={[
                      styles.optionText,
                      formData.status === opt.key && { color: opt.color }
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Temperatur</Text>
              <View style={styles.optionRow}>
                {TEMP_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionBtn,
                      formData.temperature === opt.key && { backgroundColor: opt.color + '30', borderColor: opt.color }
                    ]}
                    onPress={() => setFormData(p => ({ ...p, temperature: opt.key }))}
                  >
                    <Text style={[
                      styles.optionText,
                      formData.temperature === opt.key && { color: opt.color }
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notizen</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(t) => setFormData(p => ({ ...p, notes: t }))}
                placeholder="Notizen zum Lead..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
              />

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Save Button */}
          {(mode === 'manual' || extractedData) && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('select'); setExtractedData(null); }}>
                <Text style={styles.backBtnText}>← Zurück</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>💾 Lead speichern</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    fontSize: 22,
    color: '#6B7280',
    padding: 4,
  },
  // Mode Selection
  modeSelect: {
    padding: 20,
  },
  modeSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.4)',
  },
  modeBtnIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  modeBtnContent: {
    flex: 1,
  },
  modeBtnTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modeBtnDesc: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  // Chief Mode
  chiefMode: {
    padding: 20,
  },
  chiefLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  chiefInput: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.4)',
    marginBottom: 16,
  },
  chiefBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chiefBtnDisabled: {
    backgroundColor: '#374151',
  },
  chiefBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Form
  form: {
    padding: 20,
  },
  extractedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  extractedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.4)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.4)',
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
  },
  optionText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  backBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#374151',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

