import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LeadService } from '../services/leadService';
import { BulkOperation } from '../types/leadCrud';

interface BulkOperationsScreenProps {
  navigation: any;
  route: {
    params: {
      selectedLeadIds: string[];
    };
  };
}

const OPERATIONS: BulkOperation['operation'][] = ['archive', 'delete', 'tag', 'assign', 'stage'];

export const BulkOperationsScreen: React.FC<BulkOperationsScreenProps> = ({ route, navigation }) => {
  const { selectedLeadIds } = route.params;
  const [processing, setProcessing] = useState(false);

  const handleOperation = async (operation: BulkOperation['operation']) => {
    setProcessing(true);
    try {
      await LeadService.bulkOperation({
        operation,
        lead_ids: selectedLeadIds,
      });
      Alert.alert('Success', `${operation} completed for ${selectedLeadIds.length} leads`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Bulk operation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulk Operations ({selectedLeadIds.length} selected)</Text>

      {OPERATIONS.map((operation) => (
        <TouchableOpacity
          key={operation}
          style={[styles.operationButton, processing && styles.operationButtonDisabled]}
          onPress={() => handleOperation(operation)}
          disabled={processing}
        >
          <Text style={styles.operationText}>{renderOperationLabel(operation)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const renderOperationLabel = (operation: BulkOperation['operation']) => {
  switch (operation) {
    case 'archive':
      return '📦 Archive Leads';
    case 'delete':
      return '🗑️ Delete Leads';
    case 'tag':
      return '🏷️ Add Tag';
    case 'assign':
      return '👥 Assign Owner';
    case 'stage':
      return '🔁 Change Stage';
    default:
      return operation;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  operationButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  operationButtonDisabled: {
    opacity: 0.6,
  },
  operationText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

