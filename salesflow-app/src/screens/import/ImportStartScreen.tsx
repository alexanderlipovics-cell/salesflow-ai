/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORT START SCREEN                                                        ║
 * ║  Startbildschirm für CSV Import mit MLM Parser Support                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Clipboard,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';
import {
  AURA_COLORS,
  AURA_SHADOWS,
  GlassCard,
} from '../../components/aura';

interface ImportStartScreenProps {
  navigation: any;
  route?: any;
}

export default function ImportStartScreen({ navigation }: ImportStartScreenProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE PICKER
  // ═══════════════════════════════════════════════════════════════════════════

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        // Navigate to Preview Screen with file
        navigation.navigate('ImportPreview', {
          file,
          source: 'file',
        });
      }
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
    }
  }, [navigation, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIPBOARD IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const importFromClipboard = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      
      if (!clipboardContent || clipboardContent.trim().length === 0) {
        Alert.alert(
          'Zwischenablage leer',
          'Bitte kopiere zuerst CSV-Daten in die Zwischenablage.'
        );
        return;
      }

      // Check if it looks like CSV
      const lines = clipboardContent.trim().split('\n');
      if (lines.length < 2) {
        Alert.alert(
          'Ungültiges Format',
          'Die Zwischenablage enthält keine gültigen CSV-Daten.'
        );
        return;
      }

      // Create a virtual file object
      const virtualFile = {
        uri: 'clipboard://csv',
        name: 'clipboard.csv',
        type: 'text/csv',
        content: clipboardContent,
      };

      navigation.navigate('ImportPreview', {
        file: virtualFile,
        source: 'clipboard',
      });
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
    }
  }, [navigation, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📥 Kontakte importieren</Text>
        <Text style={styles.subtitle}>
          Importiere deine MLM-Kontakte aus CSV-Dateien
        </Text>
      </View>

      {/* Supported Formats Info */}
      <GlassCard style={styles.infoCard}>
        <Text style={styles.infoTitle}>Unterstützte Formate</Text>
        <View style={styles.formatList}>
          <Text style={styles.formatItem}>✓ doTERRA Virtual Office</Text>
          <Text style={styles.formatItem}>✓ Herbalife MyHerbalife</Text>
          <Text style={styles.formatItem}>✓ Standard CSV</Text>
          <Text style={styles.formatItem}>✓ Zinzino, PM-International, LR, Vorwerk</Text>
        </View>
      </GlassCard>

      {/* Import Options */}
      <View style={styles.optionsContainer}>
        {/* File Picker Option */}
        <TouchableOpacity
          style={[styles.optionButton, styles.fileButton]}
          onPress={pickFile}
          disabled={loading}
        >
          <Text style={styles.optionIcon}>📁</Text>
          <Text style={styles.optionTitle}>CSV Datei auswählen</Text>
          <Text style={styles.optionDescription}>
            Wähle eine CSV-Datei von deinem Gerät
          </Text>
        </TouchableOpacity>

        {/* Clipboard Option */}
        <TouchableOpacity
          style={[styles.optionButton, styles.clipboardButton]}
          onPress={importFromClipboard}
          disabled={loading}
        >
          <Text style={styles.optionIcon}>📋</Text>
          <Text style={styles.optionTitle}>Aus Zwischenablage</Text>
          <Text style={styles.optionDescription}>
            Importiere CSV-Daten aus der Zwischenablage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Link */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => navigation.navigate('ImportHelp')}
      >
        <Text style={styles.helpButtonText}>
          ❓ Wie exportiere ich meine Kontakte?
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: 24,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 12,
  },
  formatList: {
    gap: 8,
  },
  formatItem: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionButton: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    ...AURA_SHADOWS.lg,
  },
  fileButton: {
    backgroundColor: AURA_COLORS.accent.primary,
  },
  clipboardButton: {
    backgroundColor: AURA_COLORS.accent.secondary,
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  helpButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  helpButtonText: {
    fontSize: 16,
    color: AURA_COLORS.accent.primary,
    textDecorationLine: 'underline',
  },
});

