import { parseResponseJson } from '../../utils/helper';
import { supabase } from '../../lib/supabaseClient';

const DOCUMENT_BUCKET = 'care-documents';
const UUID_PATH_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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
  includeInHospitalSummary: boolean;
}

export interface DocumentStorageUsage {
  usedBytes: number;
  limitBytes: number;
  usageRatio: number;
  warningThresholdRatio: number;
  isWarning: boolean;
}

type PatientDocumentRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  document_type: PatientDocumentType | null;
  created_at: string | null;
  storage_path: string;
  include_in_hospital_summary: boolean | null;
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
  include_in_hospital_summary,
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

function normalizeDocumentStorageError(message: string): string {
  if (/(quota|storage limit|limit exceeded|exceeded.+limit|space left|insufficient storage|capacity)/i.test(message)) {
    return 'Storage limit reached. Delete older documents to free up space and try again.';
  }

  return message;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to manage documents.');
  }

  return session.access_token;
}

async function authenticatedApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getAccessToken();
  const url = apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  return response;
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
    includeInHospitalSummary: row.include_in_hospital_summary ?? false,
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
    throw new Error(normalizeDocumentStorageError(uploadError.message));
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

export async function deletePatientDocument(document: PatientDocument): Promise<void> {
  assertDocumentPath(document.storagePath);

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.storagePath]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', document.id);

  if (error) {
    throw new Error('The file was removed, but its document record could not be cleaned up. Refresh and try again.');
  }
}

export async function getDocumentStorageUsage(groupId: string): Promise<DocumentStorageUsage> {
  if (!groupId.trim()) {
    throw new Error('groupId is required to load document storage usage.');
  }

  const response = await authenticatedApiFetch(
    `/api/document-storage/groups/${encodeURIComponent(groupId)}/usage`,
  );

  return parseResponseJson<DocumentStorageUsage>(response);
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

export async function getPatientDocumentBlob(document: PatientDocument): Promise<Blob> {
  const signedUrl = await getPatientDocumentDownloadUrl(document.storagePath);
  const response = await fetch(signedUrl);

  if (!response.ok) {
    throw new Error('Unable to download this document.');
  }

  return response.blob();
}

export async function setPatientDocumentHospitalSummaryFlag(
  documentId: string,
  include: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_document_include_in_hospital_summary', {
    p_document_id: documentId,
    p_include: include,
  });

  if (error) {
    throw new Error(error.message);
  }
}