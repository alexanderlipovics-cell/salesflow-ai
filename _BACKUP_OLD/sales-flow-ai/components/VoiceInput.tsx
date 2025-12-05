import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [partialResults, setPartialResults] = useState('');

  React.useEffect(() => {
    Voice.onSpeechStart = () => setIsRecording(true);
    Voice.onSpeechEnd = () => setIsRecording(false);
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        onResult(e.value[0]);
      }
    };
    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value[0]) {
        setPartialResults(e.value[0]);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startRecording = async () => {
    try {
      await Voice.start('en-US');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <View style={styles.container}>
      {partialResults && (
        <View style={styles.partialResults}>
          <Text style={styles.partialText}>{partialResults}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Ionicons
          name={isRecording ? 'stop-circle' : 'mic'}
          size={32}
          color={isRecording ? '#FF3B30' : '#007AFF'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FFE5E5',
  },
  partialResults: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  partialText: {
    fontSize: 14,
    color: '#666',
  },
});

