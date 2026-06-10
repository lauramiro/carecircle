import { supabase } from '../../lib/supabaseClient';

const DOCUMENT_BUCKET = 'care-documents';
const UUID_PATH_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

export const PATIENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_FILE_TYPES_LABEL = 'PDF, JPEG, or PNG';
export const PATIENT_DOCUMENT_TYPE_OPTIONS = [
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'test_result', label: 'Test Result' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
] as const;

export type PatientDocumentType = typeof PATIENT_DOCUMENT_TYPE_OPTIONS[number]['value'];

export interface PatientDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: PatientDocumentType;
  uploadedAt: string;
  uploadedByName: string;
  storagePath: string;
}

type PatientDocumentRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  document_type: PatientDocumentType | null;
  created_at: string | null;
  storage_path: string;
  uploader: { full_name: string | null } | null;
};

const patientDocumentSelect = `
  id,
  file_name,
  file_size,
  file_type,
  document_type,
  created_at,
  storage_path,
  uploader:profiles!documents_uploaded_by_fkey (
    full_name
  )
`;

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? '' : '';
}

function sanitizeFileName(fileName: string): string {
  const extension = getFileExtension(fileName);
  const baseName = extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
  const sanitizedBaseName = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';

  return extension ? `${sanitizedBaseName}.${extension}` : sanitizedBaseName;
}

function assertDocumentPath(path: string): void {
  const segments = path.split('/');
  if (segments.length < 3 || !UUID_PATH_SEGMENT.test(segments[0])) {
    throw new Error('Invalid document path.');
  }
}

function mapPatientDocument(row: PatientDocumentRow): PatientDocument {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size ?? 0,
    fileType: row.file_type,
    documentType: row.document_type ?? 'other',
    uploadedAt: row.created_at ?? new Date().toISOString(),
    uploadedByName: row.uploader?.full_name?.trim() || 'Unknown carer',
    storagePath: row.storage_path,
  };
}

export function validatePatientDocument(file: File): void {
  const fileExtension = getFileExtension(file.name);
  const hasAcceptedMimeType = ACCEPTED_MIME_TYPES.has(file.type);
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.has(fileExtension);

  if (!hasAcceptedMimeType && !hasAcceptedExtension) {
    throw new Error('Accepted formats: PDF, JPEG, PNG.');
  }

  if (file.size > PATIENT_DOCUMENT_MAX_BYTES) {
    throw new Error('Files above 10 MB are not allowed.');
  }
}

export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(patientDocumentSelect)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PatientDocumentRow[]).map(mapPatientDocument);
}

export async function uploadPatientDocument(
  patientId: string,
  file: File,
  documentType: PatientDocumentType,
): Promise<PatientDocument> {
  validatePatientDocument(file);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const documentId = crypto.randomUUID();
  const storagePath = `${patientId}/${documentId}/${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      patient_id: patientId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      file_url: storagePath,
      storage_path: storagePath,
      document_type: documentType,
      uploaded_by: user.id,
    })
    .select(patientDocumentSelect)
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return mapPatientDocument(data as PatientDocumentRow);
}

export async function getPatientDocumentDownloadUrl(storagePath: string): Promise<string> {
  assertDocumentPath(storagePath);

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to create a download link.');
  }

  return data.signedUrl;
}