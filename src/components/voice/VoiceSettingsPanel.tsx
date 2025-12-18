/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - VOICE SETTINGS PANEL                                           ║
 * ║  Einstellungen für Spracheingabe & Sprachausgabe                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AURA_COLORS } from '../aura';
import { useVoice } from '../../hooks/useVoice';
import {
  getGermanVoices,
  getSelectedVoice,
  setPreferredVoice,
  VOICE_CONFIG,
  SoundEffects,
} from '../../services/voiceService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface VoiceOption {
  name: string;
  lang: string;
  localService: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const VoiceSettingsPanel: React.FC = () => {
  const { t } = useTranslation();
  const voice = useVoice();
  
  // State
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(VOICE_CONFIG.tts.rate);
  const [showVoiceList, setShowVoiceList] = useState(false);
  
  // Load available voices
  useEffect(() => {
    if (Platform.OS === 'web') {
      const germanVoices = getGermanVoices();
      setVoices(germanVoices.map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService,
      })));
      
      const selected = getSelectedVoice();
      if (selected) {
        setSelectedVoiceName(selected.name);
      }
    }
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleVoiceSelect = (voiceName: string) => {
    const voiceObj = getGermanVoices().find(v => v.name === voiceName);
    if (voiceObj) {
      setPreferredVoice(voiceObj);
      setSelectedVoiceName(voiceName);
      setShowVoiceList(false);
      
      // Test the voice
      voice.speak('Das ist meine Stimme. Gefällt sie dir?');
    }
  };
  
  const handleTestVoice = () => {
    voice.speak('Hallo! Ich bin CHIEF, dein persönlicher Sales-Coach. Wie kann ich dir heute helfen?');
  };
  
  const handleTestMic = () => {
    voice.startRecording('normal');
    SoundEffects.startListening?.();
    
    // Auto-stop after 5 seconds
    setTimeout(() => {
      voice.stopRecording();
    }, 5000);
  };
  
  const handleSpeedChange = (delta: number) => {
    const newRate = Math.max(0.5, Math.min(2.0, speechRate + delta));
    setSpeechRate(newRate);
    VOICE_CONFIG.tts.rate = newRate;
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎤</Text>
        <Text style={styles.headerTitle}>Voice-Einstellungen</Text>
      </View>
      
      {/* Support Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>
            {voice.isSupported.stt ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusLabel}>Spracheingabe</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>
            {voice.isSupported.tts ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusLabel}>Sprachausgabe</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>
            {voice.isSupported.wakeWord ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusLabel}>Wake Word</Text>
        </View>
      </View>
      
      {/* Settings */}
      <View style={styles.settingsContainer}>
        {/* Auto-Read */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>🔊 Auto-Vorlesen</Text>
            <Text style={styles.settingDescription}>
              CHIEF-Antworten automatisch vorlesen
            </Text>
          </View>
          <Switch
            value={voice.autoReadEnabled}
            onValueChange={voice.toggleAutoRead}
            trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
            thumbColor={voice.autoReadEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {/* Wake Word */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>👋 "Hey CHIEF"</Text>
            <Text style={styles.settingDescription}>
              Aktivierung per Sprachbefehl
            </Text>
          </View>
          <Switch
            value={wakeWordEnabled}
            onValueChange={setWakeWordEnabled}
            trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
            thumbColor={wakeWordEnabled ? '#fff' : '#f4f3f4'}
            disabled={!voice.isSupported.wakeWord}
          />
        </View>
        
        {/* Sound Effects */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>🎵 Sound-Effekte</Text>
            <Text style={styles.settingDescription}>
              Audio-Feedback bei Aktionen
            </Text>
          </View>
          <Switch
            value={soundsEnabled}
            onValueChange={setSoundsEnabled}
            trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
            thumbColor={soundsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {/* Speech Rate */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>⚡ Sprechgeschwindigkeit</Text>
            <Text style={styles.settingDescription}>
              {speechRate.toFixed(1)}x
            </Text>
          </View>
          <View style={styles.speedControls}>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => handleSpeedChange(-0.1)}
            >
              <Text style={styles.speedButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.speedValue}>{speechRate.toFixed(1)}</Text>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => handleSpeedChange(0.1)}
            >
              <Text style={styles.speedButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Voice Selection */}
        {voices.length > 0 && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🗣️ Stimme</Text>
              <Text style={styles.settingDescription}>
                {selectedVoiceName || 'Standard'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowVoiceList(!showVoiceList)}
            >
              <Text style={styles.selectButtonText}>
                {showVoiceList ? 'Schließen' : 'Ändern'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Voice List */}
        {showVoiceList && (
          <View style={styles.voiceList}>
            {voices.map((v) => (
              <TouchableOpacity
                key={v.name}
                style={[
                  styles.voiceOption,
                  v.name === selectedVoiceName && styles.voiceOptionActive,
                ]}
                onPress={() => handleVoiceSelect(v.name)}
              >
                <View>
                  <Text style={[
                    styles.voiceName,
                    v.name === selectedVoiceName && styles.voiceNameActive,
                  ]}>
                    {v.name}
                  </Text>
                  <Text style={styles.voiceLang}>
                    {v.lang} {v.localService ? '(Lokal)' : '(Cloud)'}
                  </Text>
                </View>
                {v.name === selectedVoiceName && (
                  <Text style={styles.voiceCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {/* Test Buttons */}
      <View style={styles.testButtons}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestVoice}
          disabled={!voice.isSupported.tts}
        >
          <Text style={styles.testButtonText}>🔊 Stimme testen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.testButton, styles.testButtonSecondary]}
          onPress={handleTestMic}
          disabled={!voice.isSupported.stt}
        >
          <Text style={styles.testButtonText}>🎤 Mikrofon testen</Text>
        </TouchableOpacity>
      </View>
      
      {/* Voice State Indicator */}
      {voice.voiceState !== 'idle' && (
        <View style={styles.stateIndicator}>
          <Text style={styles.stateText}>
            {voice.voiceState === 'listening' && '🎤 Zuhören...'}
            {voice.voiceState === 'hearing' && '👂 Höre dich...'}
            {voice.voiceState === 'processing' && '⏳ Verarbeite...'}
            {voice.voiceState === 'speaking' && '🔊 Spreche...'}
            {voice.voiceState === 'paused' && '⏸️ Pausiert'}
          </Text>
          {voice.partialTranscript && (
            <Text style={styles.partialText}>{voice.partialTranscript}</Text>
          )}
        </View>
      )}
      
      {/* Voice Commands Info */}
      <View style={styles.commandsInfo}>
        <Text style={styles.commandsTitle}>📢 Sprachbefehle</Text>
        <Text style={styles.commandsText}>
          • "Hey CHIEF" - Aktivieren{'\n'}
          • "Neuer Lead" - Lead erstellen{'\n'}
          • "Follow ups" - Follow-ups öffnen{'\n'}
          • "Tagesplan" - Daily Flow öffnen{'\n'}
          • "Stopp" - Zuhören beenden
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  
  // Settings
  settingsContainer: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  settingDescription: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  
  // Speed Controls
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  speedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
    minWidth: 40,
    textAlign: 'center',
  },
  
  // Select Button
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AURA_COLORS.glass.border,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  
  // Voice List
  voiceList: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    marginTop: 12,
    maxHeight: 200,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  voiceOptionActive: {
    backgroundColor: AURA_COLORS.neon.cyan + '15',
  },
  voiceName: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
  },
  voiceNameActive: {
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  voiceLang: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  voiceCheck: {
    fontSize: 16,
    color: AURA_COLORS.neon.cyan,
    fontWeight: '700',
  },
  
  // Test Buttons
  testButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  testButton: {
    flex: 1,
    backgroundColor: AURA_COLORS.neon.cyan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonSecondary: {
    backgroundColor: AURA_COLORS.glass.border,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // State Indicator
  stateIndicator: {
    backgroundColor: AURA_COLORS.neon.cyan + '20',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  partialText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // Commands Info
  commandsInfo: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  commandsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  commandsText: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    lineHeight: 20,
  },
});

export default VoiceSettingsPanel;

