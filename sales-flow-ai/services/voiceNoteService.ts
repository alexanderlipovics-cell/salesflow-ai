import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../api/client';

export interface VoiceNote {
  id: string;
  audio_url: string;
  duration_seconds: number;
  transcription?: string | null;
  transcription_status: string;
  created_at: string;
}

export class VoiceNoteService {
  private static recording: Audio.Recording | null = null;

  static async startRecording(): Promise<void> {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    this.recording = recording;
  }

  static async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }
    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;
    return uri;
  }

  static async uploadVoiceNote(
    workspaceId: string,
    contactId: string,
    audioUri: string,
  ): Promise<VoiceNote> {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await apiClient<VoiceNote>('/api/voice-notes', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        contact_id: contactId,
        audio_data: base64,
        duration_seconds: Math.round((fileInfo.size || 0) / 16000),
      }),
    });

    return response;
  }

  static async getVoiceNotes(contactId: string): Promise<VoiceNote[]> {
    const response = await apiClient<{ voice_notes: VoiceNote[] }>(
      `/api/voice-notes/contact/${contactId}`,
    );
    return response.voice_notes ?? [];
  }

  static async playVoiceNote(audioUrl: string): Promise<void> {
    const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
    await sound.playAsync();
  }
}


