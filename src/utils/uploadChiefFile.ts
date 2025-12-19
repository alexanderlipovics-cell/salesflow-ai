import { supabaseClient } from '@/lib/supabaseClient';

export interface UploadedFile {
  path: string;
  signedUrl: string | undefined;
  type: string;
  name: string;
}

/**
 * Uploads a file to Supabase Storage bucket 'chief-uploads'
 * Files are stored in user-specific folders: {userId}/{filename}
 */
export async function uploadChiefFile(file: File, userId: string): Promise<UploadedFile> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabaseClient.storage
    .from('chief-uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  }

  // Signierte URL holen (gültig für 1 Stunde)
  const { data: urlData } = await supabaseClient.storage
    .from('chief-uploads')
    .createSignedUrl(filePath, 3600);

  return { 
    path: filePath, 
    signedUrl: urlData?.signedUrl,
    type: file.type,
    name: file.name
  };
}

