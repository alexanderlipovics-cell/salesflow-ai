import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LeadService } from '../services/leadService';
import { LeadFormData, Stage, LeadSource } from '../types/leadCrud';

interface LeadFormScreenProps {
  navigation: any;
  route: {
    params?: {
      leadId?: string;
      initialData?: Partial<LeadFormData>;
    };
  };
}

const DEFAULT_STAGE: Stage = 'new';
const DEFAULT_SOURCE: LeadSource = 'manual';

export const LeadFormScreen: React.FC<LeadFormScreenProps> = ({ route, navigation }) => {
  const isEdit = Boolean(route.params?.leadId);

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    company_id: '',
    stage: DEFAULT_STAGE,
    source: DEFAULT_SOURCE,
    notes: '',
    ...route.params?.initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\+?[0-9\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.company_id.trim()) {
      newErrors.company_id = 'Company ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      if (!isEdit) {
        const isDuplicate = await LeadService.checkDuplicate(formData.phone);
        if (isDuplicate) {
          Alert.alert('Duplicate Lead', 'A lead with this phone number already exists.', [
            { text: 'Cancel', style: 'cancel', onPress: () => setSaving(false) },
            {
              text: 'Save Anyway',
              onPress: async () => {
                setSaving(true);
                await saveLeadData();
              },
            },
          ]);
          return;
        }
      }

      await saveLeadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not save lead.');
      setSaving(false);
    }
  };

  const saveLeadData = async () => {
    try {
      if (isEdit && route.params?.leadId) {
        await LeadService.updateLead(route.params.leadId, formData);
        Alert.alert('Success', 'Lead updated');
      } else {
        await LeadService.createLead(formData);
        Alert.alert('Success', 'Lead created');
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!route.params?.leadId) return;
    Alert.alert('Delete Lead', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await LeadService.deleteLead(route.params.leadId!);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Edit Lead' : 'New Lead'}</Text>

      {/* Name */}
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={formData.name}
        onChangeText={(name) => updateField('name', name)}
        placeholder="Enter full name"
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

      {/* Phone */}
      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={[styles.input, errors.phone && styles.inputError]}
        value={formData.phone}
        onChangeText={(phone) => updateField('phone', phone)}
        placeholder="+43 123 456789"
        keyboardType="phone-pad"
      />
      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        value={formData.email}
        onChangeText={(email) => updateField('email', email)}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      {/* Company */}
      <Text style={styles.label}>Company ID *</Text>
      <TextInput
        style={[styles.input, errors.company_id && styles.inputError]}
        value={formData.company_id}
        onChangeText={(company_id) => updateField('company_id', company_id)}
        placeholder="company-zinzino-1"
      />
      {errors.company_id && <Text style={styles.errorText}>{errors.company_id}</Text>}

      {/* Stage */}
      <Text style={styles.label}>Stage *</Text>
      <TextInput
        style={styles.input}
        value={formData.stage}
        onChangeText={(stage) => updateField('stage', stage as Stage)}
        placeholder="new / early_follow_up / ..."
      />

      {/* Source */}
      <Text style={styles.label}>Source *</Text>
      <TextInput
        style={styles.input}
        value={formData.source}
        onChangeText={(source) => updateField('source', source as LeadSource)}
        placeholder="manual / web_form / ..."
      />

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.notes}
        onChangeText={(notes) => updateField('notes', notes)}
        placeholder="Add notes..."
        multiline
        numberOfLines={4}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Lead'}</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Lead</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#F44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});

