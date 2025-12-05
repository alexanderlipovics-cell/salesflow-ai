import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface VariableInputModalProps {
  visible: boolean;
  scriptText: string;
  scriptId: string;
  onClose: () => void;
  onCopied: (finalText: string) => void;
}

// Regex um [Variable] zu finden
const VARIABLE_REGEX = /\[([^\]]+)\]/g;

export const VariableInputModal: React.FC<VariableInputModalProps> = ({
  visible,
  scriptText,
  scriptId,
  onClose,
  onCopied,
}) => {
  const [variables, setVariables] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    // Extrahiere alle [Variable] aus dem Text
    const matches = scriptText.match(VARIABLE_REGEX);
    if (matches) {
      const uniqueVars = [...new Set(matches.map(m => m.slice(1, -1)))];
      setVariables(uniqueVars);
      // Initialisiere leere Werte
      const initialValues: Record<string, string> = {};
      uniqueVars.forEach(v => initialValues[v] = '');
      setValues(initialValues);
    } else {
      setVariables([]);
    }
  }, [scriptText]);

  const handleCopy = async () => {
    let finalText = scriptText;
    
    // Ersetze alle Variablen
    variables.forEach(variable => {
      const value = values[variable] || `[${variable}]`;
      finalText = finalText.replace(new RegExp(`\\[${variable}\\]`, 'g'), value);
    });

    // In Clipboard kopieren
    await Clipboard.setStringAsync(finalText);
    
    // Callback
    onCopied(finalText);
    onClose();
  };

  const updateValue = (variable: string, value: string) => {
    setValues(prev => ({ ...prev, [variable]: value }));
  };

  // Wenn keine Variablen, direkt kopieren
  if (variables.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Personalisieren</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Vorschau */}
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>Vorschau:</Text>
            <Text style={styles.previewText}>
              {variables.reduce((text, variable) => {
                const value = values[variable] || `[${variable}]`;
                return text.replace(new RegExp(`\\[${variable}\\]`, 'g'), 
                  values[variable] ? value : `[${variable}]`);
              }, scriptText)}
            </Text>
          </View>

          {/* Input Felder */}
          <ScrollView style={styles.inputsContainer}>
            {variables.map((variable, index) => (
              <View key={variable} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{variable}:</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`${variable} eingeben...`}
                  placeholderTextColor="#71717a"
                  value={values[variable]}
                  onChangeText={(text) => updateValue(variable, text)}
                  autoFocus={index === 0}
                />
              </View>
            ))}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.copyText}>Kopieren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  previewBox: {
    backgroundColor: '#27272a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  previewLabel: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 14,
    color: '#e4e4e7',
    lineHeight: 20,
  },
  inputsContainer: {
    maxHeight: 200,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
  },
  cancelText: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VariableInputModal;

