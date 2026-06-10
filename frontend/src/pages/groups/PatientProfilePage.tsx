import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CircleUserRound, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  DOCUMENT_FILE_TYPES_LABEL,
  PATIENT_DOCUMENT_MAX_BYTES,
  PATIENT_DOCUMENT_TYPE_OPTIONS,
  getPatientDocumentDownloadUrl,
  getPatientDocuments,
  uploadPatientDocument,
  type PatientDocument,
  type PatientDocumentType,
} from '../../api/groups/patientDocuments.service';
import type { Allergy } from '../../api/groups/patient.types';
import {
  getPatient,
  uploadPatientAvatar,
  updatePatient,
} from '../../api/groups/patient.service';
import { usePatientForm } from '../../hooks/groups/usePatientForm';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { canManageMembers } from '../../lib/carePermissions';
import { getErrorMessage } from '../../utils/helper';
import WellbeingTrendCharts from '../../components/checkins/WellbeingTrendCharts';

const inputStyle = (hasError: boolean) => ({
  width: '100%',
  height: '40px',
  padding: '0 12px',
  border: `1px solid ${hasError ? 'var(--color-status-critical)' : 'var(--color-border)'}`,
  borderRadius: '8px',
  fontSize: '13px',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-card)',
  outline: 'none',
  boxSizing: 'border-box' as const,
});

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
  letterSpacing: '0.01em',
};

const errorTextStyle = {
  fontSize: '12px',
  color: 'var(--color-status-critical)',
  marginTop: '4px',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
};

function formatDocumentTypeLabel(documentType: PatientDocumentType): string {
  const option = PATIENT_DOCUMENT_TYPE_OPTIONS.find((item) => item.value === documentType);
  return option?.label ?? documentType;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function formatUploadDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PatientProfilePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const isObserver = group?.role === 'observer';
  const canEditProfile = group ? canManageMembers(group.role) : false;

  const {
    values, chronicConditions, allergies, errors,
    updateField, validateField, validateForm, resetValues,
    addCondition, removeCondition, setConditionsNone,
    addAllergy, removeAllergy,
  } = usePatientForm();

  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [allergySeverity, setAllergySeverity] = useState<Allergy['severity']>(undefined);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<PatientDocumentType>('discharge_summary');
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const activePatientId = patientId ?? group?.patientId ?? null;
  const canUploadDocuments = !isObserver;

  useEffect(() => {
    if (!groupId) return;

    getPatient(groupId).then((patient) => {
      if (patient) {
        setPatientId(patient.id);
        resetValues({
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth,
          chronicConditions: patient.chronicConditions,
          allergies: patient.allergies.map(s => ({ description: s })),
        });
        setAvatarPreviewUrl(patient.avatarUrl ?? null);
      } else {
        setPatientId(null);
        resetValues({
          fullName: '',
          dateOfBirth: '',
          chronicConditions: [],
          allergies: [],
        });
        setAvatarPreviewUrl(null);
        setPendingFile(null);
      }
      setLoadingPatient(false);
    });
    // resetValues is stable — omitting from deps is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      if (!activePatientId) {
        setDocuments([]);
        setDocumentsLoading(false);
        setDocumentsError(null);
        return;
      }

      try {
        setDocumentsLoading(true);
        setDocumentsError(null);
        const documentRows = await getPatientDocuments(activePatientId);
        if (!active) return;
        setDocuments(documentRows);
      } catch (err: unknown) {
        if (!active) return;
        setDocumentsError(getErrorMessage(err) || 'Unable to load documents right now.');
      } finally {
        if (active) setDocumentsLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      active = false;
    };
  }, [activePatientId]);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function handleDocumentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedDocumentFile(file);
    setDocumentUploadError(null);
  }

  async function handleSubmit() {
    setFormError(null);
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (!patientId) {
        throw new Error('Patient profile not found.');
      }

      let avatarUrl: string | undefined;

      if (pendingFile) {
        avatarUrl = await uploadPatientAvatar(patientId, pendingFile);
        setPendingFile(null);
        setAvatarPreviewUrl(avatarUrl);
      }

      await updatePatient(
        patientId,
        values.fullName,
        values.dateOfBirth,
        chronicConditions,
        allergies.map(a => a.description),
        avatarUrl,
      );
      setSavedAt(new Date());
    } catch (err: unknown) {
      console.error('updatePatient failed:', err);
      setFormError(getErrorMessage(err) || 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  async function handleDocumentUpload() {
    if (!activePatientId) {
      setDocumentUploadError('Patient profile not found.');
      return;
    }

    if (!selectedDocumentFile) {
      setDocumentUploadError('Please choose a document to upload.');
      return;
    }

    setUploadingDocument(true);
    setDocumentUploadError(null);

    try {
      const uploadedDocument = await uploadPatientDocument(
        activePatientId,
        selectedDocumentFile,
        documentType,
      );

      setDocuments((current) => [uploadedDocument, ...current]);
      setSelectedDocumentFile(null);
      setDocumentType('discharge_summary');
      setDocumentsError(null);

      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      setDocumentUploadError(getErrorMessage(err) || 'Unable to upload this document.');
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleDocumentDownload(document: PatientDocument) {
    setDownloadingDocumentId(document.id);

    try {
      const signedUrl = await getPatientDocumentDownloadUrl(document.storagePath);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setDocumentsError(getErrorMessage(err) || 'Unable to open this document.');
    } finally {
      setDownloadingDocumentId(null);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const isLoading = groupLoading || loadingPatient;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ fontSize: '15px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--color-text-hint)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={14} />
        {group?.name ?? 'Back to group'}
      </button>

      <h1 style={{
        fontFamily: 'Lora, serif',
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        Loved One's Profile
      </h1>
      <p className="mt-1 mb-8" style={{
        fontSize: '15px',
        color: 'var(--color-text-secondary)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        lineHeight: 1.7,
      }}>
        {canEditProfile
          ? 'Medical and personal details for the person in your care.'
          : 'Medical and personal details for the person in your care. Only admins can edit this profile.'}
      </p>

      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '32px',
      }}>
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} noValidate>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <button
              type="button"
              aria-label="Upload photo"
              disabled={!canEditProfile}
              onClick={() => canEditProfile && fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: '2px solid var(--color-border)',
                overflow: 'hidden',
                cursor: canEditProfile ? 'pointer' : 'default',
                padding: 0,
                background: 'var(--color-primary-light)',
                flexShrink: 0,
              }}
            >
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="Profile photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <CircleUserRound
                  size={52}
                  strokeWidth={1.25}
                  style={{
                    color: 'var(--color-primary)',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              {canEditProfile && (
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.38)',
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                }}
                className="avatar-overlay"
                >
                  <Camera size={20} strokeWidth={1.8} color="#fff" />
                </span>
              )}
            </button>
            {canEditProfile && (
              <p className="mt-2" style={{ fontSize: '11px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                JPG, PNG or WebP
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Full name */}
          <div className="mb-5">
            <label htmlFor="fullName" style={labelStyle}>
              Full name <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              disabled={!canEditProfile}
              value={values.fullName}
              onChange={(e) => { updateField('fullName', e.target.value); setFormError(null); }}
              onFocus={(e) => {
                if (!canEditProfile) return;
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
              }}
              onBlur={(e) => {
                validateField('fullName', e.target.value);
                e.target.style.borderColor = errors.fullName ? 'var(--color-status-critical)' : 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Jane Smith"
              aria-required
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              style={{ ...inputStyle(Boolean(errors.fullName)), opacity: canEditProfile ? 1 : 0.7 }}
            />
            {errors.fullName && <p id="fullName-error" style={errorTextStyle}>{errors.fullName}</p>}
          </div>

          {/* Date of birth */}
          <div className="mb-6">
            <label htmlFor="dateOfBirth" style={labelStyle}>
              Date of birth <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            <input
              id="dateOfBirth"
              type="date"
              max={today}
              disabled={!canEditProfile}
              value={values.dateOfBirth}
              onChange={(e) => { updateField('dateOfBirth', e.target.value); setFormError(null); }}
              onBlur={(e) => {
                validateField('dateOfBirth', e.target.value);
                e.target.style.borderColor = errors.dateOfBirth ? 'var(--color-status-critical)' : 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
              aria-required
              aria-invalid={Boolean(errors.dateOfBirth)}
              aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
              style={{ ...inputStyle(Boolean(errors.dateOfBirth)), colorScheme: 'light', opacity: canEditProfile ? 1 : 0.7 }}
              onFocus={(e) => {
                if (!canEditProfile) return;
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
              }}
            />
            {errors.dateOfBirth && <p id="dateOfBirth-error" style={errorTextStyle}>{errors.dateOfBirth}</p>}
          </div>

          {/* Chronic Conditions */}
          <div className="mb-6">
            <label style={labelStyle}>
              Conditions <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            {canEditProfile && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCondition(conditionInput);
                      setConditionInput('');
                    }
                  }}
                  placeholder="e.g. Diabetes"
                  style={{ ...inputStyle(false), flex: 1 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => { addCondition(conditionInput); setConditionInput(''); }}
                  style={{
                    height: '40px',
                    padding: '0 14px',
                    backgroundColor: 'var(--color-accent-soft)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={setConditionsNone}
                  style={{
                    height: '40px',
                    padding: '0 14px',
                    backgroundColor: chronicConditions.includes('None') ? 'var(--color-primary)' : 'var(--color-card)',
                    color: chronicConditions.includes('None') ? '#ffffff' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  None
                </button>
              </div>
            )}
            {chronicConditions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chronicConditions.map((c) => (
                  <span
                    key={c}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--color-accent-soft)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {c}
                    {canEditProfile && c !== 'None' && (
                      <button
                        type="button"
                        aria-label={`Remove ${c}`}
                        onClick={() => removeCondition(c)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={12} color="var(--color-text-hint)" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {chronicConditions.length === 0 && !canEditProfile && (
              <p style={{ fontSize: '13px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                No conditions recorded.
              </p>
            )}
            {errors.chronicConditions && <p style={errorTextStyle}>{errors.chronicConditions}</p>}
          </div>

          {/* Allergies */}
          <div className="mb-6">
            <label style={labelStyle}>Allergies</label>
            {canEditProfile && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAllergy({ description: allergyInput, severity: allergySeverity });
                      setAllergyInput('');
                      setAllergySeverity(undefined);
                    }
                  }}
                  placeholder="e.g. Penicillin"
                  style={{ ...inputStyle(false), flex: 1 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <select
                  value={allergySeverity ?? ''}
                  onChange={(e) => setAllergySeverity((e.target.value || undefined) as Allergy['severity'])}
                  style={{
                    height: '40px',
                    padding: '0 10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    color: allergySeverity ? 'var(--color-text-primary)' : 'var(--color-text-hint)',
                    backgroundColor: 'var(--color-card)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Severity</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    addAllergy({ description: allergyInput, severity: allergySeverity });
                    setAllergyInput('');
                    setAllergySeverity(undefined);
                  }}
                  style={{
                    height: '40px',
                    padding: '0 14px',
                    backgroundColor: 'var(--color-accent-soft)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            )}
            {allergies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {allergies.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-accent-soft)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span>
                      {a.description}
                      {a.severity && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          color: a.severity === 'severe' ? 'var(--color-status-critical)' : 'var(--color-text-hint)',
                          textTransform: 'capitalize',
                        }}>
                          {a.severity}
                        </span>
                      )}
                    </span>
                    {canEditProfile && (
                      <button
                        type="button"
                        aria-label={`Remove allergy ${a.description}`}
                        onClick={() => removeAllergy(i)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={14} color="var(--color-text-hint)" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                No allergies recorded.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label style={labelStyle}>Documents</label>
            <p className="mb-3" style={{ fontSize: '12px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.6 }}>
              Upload {DOCUMENT_FILE_TYPES_LABEL} documents up to {Math.round(PATIENT_DOCUMENT_MAX_BYTES / (1024 * 1024))} MB.
              All uploaded files stay private to this care circle.
            </p>

            {canUploadDocuments && (
              <div className="mb-4" style={{ display: 'grid', gap: '10px' }}>
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value as PatientDocumentType);
                    setDocumentUploadError(null);
                  }}
                  style={{
                    ...inputStyle(false),
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {PATIENT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  ref={documentFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleDocumentFileChange}
                  style={{
                    ...inputStyle(false),
                    height: 'auto',
                    padding: '10px 12px',
                  }}
                />

                {selectedDocumentFile && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                    {selectedDocumentFile.name} · {formatFileSize(selectedDocumentFile.size)}
                  </p>
                )}

                <div>
                  <button
                    type="button"
                    disabled={uploadingDocument || !selectedDocumentFile}
                    onClick={() => { void handleDocumentUpload(); }}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      backgroundColor: uploadingDocument || !selectedDocumentFile
                        ? 'var(--color-accent-soft)'
                        : 'var(--color-primary)',
                      color: uploadingDocument || !selectedDocumentFile
                        ? 'var(--color-text-hint)'
                        : '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                      cursor: uploadingDocument || !selectedDocumentFile ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {uploadingDocument ? 'Uploading...' : 'Upload document'}
                  </button>
                </div>

                {documentUploadError && <p style={errorTextStyle}>{documentUploadError}</p>}
              </div>
            )}

            {documentsError && (
              <p style={{ ...errorTextStyle, marginBottom: '10px' }}>
                {documentsError}
              </p>
            )}

            {documentsLoading ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                Loading documents...
              </p>
            ) : documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-accent-soft)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', wordBreak: 'break-word' }}>
                        {document.fileName}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.6 }}>
                        {formatDocumentTypeLabel(document.documentType)} · Uploaded {formatUploadDate(document.uploadedAt)} · By {document.uploadedByName} · {formatFileSize(document.fileSize)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => { void handleDocumentDownload(document); }}
                      disabled={downloadingDocumentId === document.id}
                      style={{
                        alignSelf: 'center',
                        height: '36px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-card)',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        cursor: downloadingDocumentId === document.id ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {downloadingDocumentId === document.id ? 'Opening...' : 'Open'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                No documents uploaded yet.
              </p>
            )}
          </div>

          {/* Medical disclaimer */}
          <div className="mb-6" style={{
            backgroundColor: 'var(--color-accent-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '12px 14px',
          }}>
            <p style={{
              fontSize: '12px',
              color: 'var(--color-text-hint)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              margin: 0,
              lineHeight: 1.6,
            }}>
              This profile is for coordination purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider for medical decisions.
            </p>
          </div>

          {/* Form-level error */}
          {formError && (
            <div className="mb-4" style={{
              backgroundColor: 'var(--color-status-critical-bg)',
              border: '1px solid #F0BEBE',
              borderRadius: '8px',
              padding: '10px 14px',
            }}>
              <p style={{ fontSize: '13px', color: 'var(--color-status-critical)', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                {formError}
              </p>
            </div>
          )}

          {/* Save button — admins only */}
          {canEditProfile && (
            <div className="flex items-center gap-4">
              <motion.button
                type="submit"
                disabled={saving}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  backgroundColor: saving ? 'var(--color-accent-soft)' : 'var(--color-primary)',
                  color: saving ? 'var(--color-text-hint)' : '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                whileTap={shouldReduceMotion || saving ? undefined : { scale: 0.97 }}
              >
                {saving ? 'Saving...' : 'Save profile'}
              </motion.button>

              {savedAt && !saving && !formError && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Saved
                </p>
              )}
            </div>
          )}

        </form>
      </div>

      {/* Wellbeing trend charts — shown once a patientId is resolved */}
      {patientId && group?.id && (
        <WellbeingTrendCharts
          patientId={patientId}
          groupId={group.id}
          isObserver={isObserver}
        />
      )}

      <style>{`
        button:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
