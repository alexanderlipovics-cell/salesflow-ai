import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../api/client';

export interface SalesFlowDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  description?: string | null;
  created_at: string;
  public_url?: string | null;
}

export class DocumentService {
  static async pickDocument(): Promise<DocumentPicker.DocumentPickerResult> {
    return DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
  }

  static async uploadDocument(
    workspaceId: string,
    contactId: string,
    file: { uri: string; name: string; type?: string },
    description?: string,
  ): Promise<SalesFlowDocument> {
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await apiClient<SalesFlowDocument>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        contact_id: contactId,
        filename: file.name,
        file_type: file.type ?? 'application/octet-stream',
        file_data: base64,
        description,
      }),
    });

    return response;
  }

  static async getDocuments(contactId: string): Promise<SalesFlowDocument[]> {
    const response = await apiClient<{ documents: SalesFlowDocument[] }>(
      `/api/documents/contact/${contactId}`,
    );
    return response.documents ?? [];
  }

  static async downloadDocument(documentId: string): Promise<string> {
    const response = await apiClient<{ filename: string; url: string }>(
      `/api/documents/${documentId}/download`,
    );

    const targetPath = `${FileSystem.documentDirectory}${response.filename}`;
    await FileSystem.downloadAsync(response.url, targetPath);
    return targetPath;
  }
}


