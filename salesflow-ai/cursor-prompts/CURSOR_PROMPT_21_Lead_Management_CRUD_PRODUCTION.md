# REACT NATIVE - LEAD MANAGEMENT CRUD (PRODUCTION-READY)

**⚠️ ANALYSIS REPORT:**
No CRUD operations for leads. Users cannot:
1. Create new lead (must come from backend)
2. Edit lead details (typos stay forever)
3. Delete/Archive lead (no cleanup)
4. Bulk operations (can't tag/assign multiple)
5. Import from contacts (manual entry only)
6. Import from CSV (no data migration)
7. Duplicate detection (same lead added twice)
8. Required field validation (incomplete leads saved)
9. Custom fields (locked to preset fields)
10. Audit log (no history of changes)

---

## PART 1: LEAD CRUD TYPES

```typescript
// types/leadCrud.ts

export interface LeadFormData {
  name: string;
  email?: string;
  phone: string;
  company_id: string;
  stage: Stage;
  source: LeadSource;
  segment?: LeadSegment;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface BulkOperation {
  operation: 'tag' | 'assign' | 'stage' | 'delete' | 'archive';
  lead_ids: string[];
  value?: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: { row: number; reason: string }[];
}
```

---

## PART 2: LEAD SERVICE

```typescript
// services/leadService.ts

import { apiClient } from '../api/client';
import { LeadFormData, BulkOperation, ImportResult } from '../types/leadCrud';
import * as Contacts from 'expo-contacts';

export class LeadService {
  
  static async createLead(data: LeadFormData) {
    return await apiClient('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static async updateLead(leadId: string, data: Partial<LeadFormData>) {
    return await apiClient(`/api/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
  
  static async deleteLead(leadId: string) {
    return await apiClient(`/api/leads/${leadId}`, {
      method: 'DELETE'
    });
  }
  
  static async archiveLead(leadId: string) {
    return await apiClient(`/api/leads/${leadId}/archive`, {
      method: 'POST'
    });
  }
  
  static async bulkOperation(operation: BulkOperation) {
    return await apiClient('/api/leads/bulk', {
      method: 'POST',
      body: JSON.stringify(operation)
    });
  }
  
  static async importFromContacts(): Promise<ImportResult> {
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Contacts permission denied');
    }
    
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails]
    });
    
    const leads = data.map(contact => ({
      name: contact.name || 'Unknown',
      phone: contact.phoneNumbers?.[0]?.number || '',
      email: contact.emails?.[0]?.email
    })).filter(l => l.phone);
    
    return await apiClient('/api/leads/import', {
      method: 'POST',
      body: JSON.stringify({ leads })
    });
  }
  
  static async importFromCSV(csvData: string): Promise<ImportResult> {
    return await apiClient('/api/leads/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csv_data: csvData })
    });
  }
  
  static async checkDuplicate(phone: string): Promise<boolean> {
    const response = await apiClient<{ exists: boolean }>(
      `/api/leads/check-duplicate?phone=${encodeURIComponent(phone)}`
    );
    return response.exists;
  }
}
```

---

## PART 3: LEAD FORM SCREEN

```tsx
// screens/LeadFormScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { LeadService } from '../services/leadService';
import { LeadFormData } from '../types/leadCrud';

interface Props {
  route: {
    params?: {
      leadId?: string;
      initialData?: Partial<LeadFormData>;
    };
  };
  navigation: any;
}

export const LeadFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const isEdit = !!route.params?.leadId;
  
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    company_id: '',
    stage: 'new',
    source: 'manual',
    notes: '',
    ...route.params?.initialData
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    
    try {
      // Check duplicate
      if (!isEdit) {
        const isDuplicate = await LeadService.checkDuplicate(formData.phone);
        if (isDuplicate) {
          Alert.alert(
            'Duplicate Lead',
            'A lead with this phone number already exists.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Save Anyway', onPress: () => saveLeadData() }
            ]
          );
          setSaving(false);
          return;
        }
      }
      
      await saveLeadData();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setSaving(false);
    }
  };
  
  const saveLeadData = async () => {
    if (isEdit) {
      await LeadService.updateLead(route.params!.leadId!, formData);
      Alert.alert('Success', 'Lead updated');
    } else {
      await LeadService.createLead(formData);
      Alert.alert('Success', 'Lead created');
    }
    
    navigation.goBack();
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Edit Lead' : 'New Lead'}</Text>
      
      {/* Name */}
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={formData.name}
        onChangeText={name => setFormData(prev => ({ ...prev, name }))}
        placeholder="Enter full name"
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      
      {/* Phone */}
      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={[styles.input, errors.phone && styles.inputError]}
        value={formData.phone}
        onChangeText={phone => setFormData(prev => ({ ...prev, phone }))}
        placeholder="+43 123 456789"
        keyboardType="phone-pad"
      />
      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      
      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        value={formData.email}
        onChangeText={email => setFormData(prev => ({ ...prev, email }))}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      
      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.notes}
        onChangeText={notes => setFormData(prev => ({ ...prev, notes }))}
        placeholder="Add notes..."
        multiline
        numberOfLines={4}
      />
      
      {/* Buttons */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Lead'}
        </Text>
      </TouchableOpacity>
      
      {isEdit && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete Lead',
              'Are you sure? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await LeadService.deleteLead(route.params!.leadId!);
                    navigation.goBack();
                  }
                }
              ]
            );
          }}
        >
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
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  inputError: {
    borderColor: '#F44336'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4
  },
  saveButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

---

## PART 4: BULK OPERATIONS SCREEN

```tsx
// screens/BulkOperationsScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LeadService } from '../services/leadService';

interface Props {
  route: {
    params: {
      selectedLeadIds: string[];
    };
  };
  navigation: any;
}

export const BulkOperationsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { selectedLeadIds } = route.params;
  const [processing, setProcessing] = useState(false);
  
  const handleOperation = async (operation: string) => {
    setProcessing(true);
    
    try {
      await LeadService.bulkOperation({
        operation: operation as any,
        lead_ids: selectedLeadIds
      });
      
      Alert.alert('Success', `${operation} completed for ${selectedLeadIds.length} leads`);
      navigation.goBack();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Bulk Operations ({selectedLeadIds.length} selected)
      </Text>
      
      <TouchableOpacity
        style={styles.operationButton}
        onPress={() => handleOperation('archive')}
        disabled={processing}
      >
        <Text style={styles.operationText}>📦 Archive Leads</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.operationButton}
        onPress={() => handleOperation('delete')}
        disabled={processing}
      >
        <Text style={styles.operationText}>🗑️ Delete Leads</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.operationButton}
        onPress={() => handleOperation('tag')}
        disabled={processing}
      >
        <Text style={styles.operationText}>🏷️ Add Tag</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24
  },
  operationButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  operationText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
```

---

## IMPLEMENTATION CHECKLIST

**Backend API:**
- [ ] POST `/api/leads` - Create lead
- [ ] PATCH `/api/leads/:id` - Update lead
- [ ] DELETE `/api/leads/:id` - Delete lead
- [ ] POST `/api/leads/:id/archive` - Archive lead
- [ ] POST `/api/leads/bulk` - Bulk operations
- [ ] POST `/api/leads/import` - Import from contacts
- [ ] POST `/api/leads/import-csv` - Import CSV
- [ ] GET `/api/leads/check-duplicate` - Check duplicate

**Services:**
- [ ] Create `services/leadService.ts`
- [ ] Test duplicate detection
- [ ] Test CSV import

**Screens:**
- [ ] Create `screens/LeadFormScreen.tsx`
- [ ] Create `screens/BulkOperationsScreen.tsx`
- [ ] Add to navigation

**Testing:**
- [ ] Test create lead
- [ ] Test edit lead
- [ ] Test delete lead
- [ ] Test duplicate detection
- [ ] Test validation
- [ ] Test import contacts
- [ ] Test bulk operations

---

BEGIN IMPLEMENTATION.
