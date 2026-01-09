import { supabase, SUPABASE_URL } from './supabaseClient';

const BUCKET_NAME = 'campaign_media';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  size: number;
  contentType: string;
}

// Sanitize filename for Supabase storage
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase();
}

// Upload file to Supabase Storage
export async function uploadFileToSupabase(file: File): Promise<UploadResult> {
  try {
    const sanitizedName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      fileUrl: publicUrl,
      fileName,
      size: file.size,
      contentType: file.type,
    };

  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    throw error;
  }
}

// Delete file from Supabase Storage
export async function deleteFileFromSupabase(fileName: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    throw error;
  }
}

// Get public URL for a file
export function getPublicFileUrl(fileName: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);
  return publicUrl;
}