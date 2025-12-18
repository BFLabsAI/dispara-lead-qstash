// Supabase Storage service for file uploads
// Replaces legacy file upload with direct Supabase integration

const SUPABASE_URL = 'https://iixeygzkgfwetchjvpvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeGV5Z3prZ2Z3ZXRjaGp2cHZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwNzk2MywiZXhwIjoyMDcxMTgzOTYzfQ.bD-BNU1r3UYLHpRLvHQ4gn3jplRdYq8TZRHa54UCmbc';

const BUCKET_NAME = 'media_dispara_lead_saas';

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
    const fileName = `${sanitizedName}-${timestamp}`;

    // Create form data for the upload
    const formData = new FormData();
    formData.append('file', file);

    // Upload to Supabase Storage
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': file.type,
        },
        body: file,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase upload error: ${response.status} - ${errorText}`);
    }

    // Get the public URL
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;

    return {
      fileUrl,
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
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase delete error: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    throw error;
  }
}

// Get public URL for a file
export function getPublicFileUrl(fileName: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
}