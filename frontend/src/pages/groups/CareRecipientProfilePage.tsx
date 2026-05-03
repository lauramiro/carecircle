import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CircleUserRound, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Allergy } from '../../api/groups/care-recipient.types';
import {
  getCareRecipient,
  uploadCareRecipientAvatar,
  upsertCareRecipient,
} from '../../api/groups/care-recipient.service';
import { useCareRecipientForm } from '../../hooks/groups/useCareRecipientForm';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getErrorMessage } from '../../utils/helper';

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

export default function CareRecipientProfilePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const isAdmin = group?.role === 'Admin';

  const {
    values, conditions, allergies, errors,
    updateField, validateField, validateForm, resetValues,
    addCondition, removeCondition, setConditionsNone,
    addAllergy, removeAllergy,
  } = useCareRecipientForm();

  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [allergySeverity, setAllergySeverity] = useState<Allergy['severity']>(undefined);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loadingRecipient, setLoadingRecipient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!groupId) return;

    getCareRecipient(groupId).then((recipient) => {
      if (recipient) {
        resetValues({
          fullName: recipient.fullName,
          dateOfBirth: recipient.dateOfBirth,
          conditions: recipient.conditions,
          allergies: recipient.allergies,
        });
        setAvatarPreviewUrl(recipient.avatarUrl ?? null);
      }
      setLoadingRecipient(false);
    });
    // resetValues is stable — omitting from deps is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setFormError(null);
    if (!validateForm()) return;

    setSaving(true);
    try {
      let avatarUrl: string | undefined;

      if (pendingFile) {
        avatarUrl = await uploadCareRecipientAvatar(groupId, pendingFile);
        setPendingFile(null);
        setAvatarPreviewUrl(avatarUrl);
      }

      await upsertCareRecipient(
        groupId,
        values.fullName,
        values.dateOfBirth,
        conditions,
        allergies,
        avatarUrl,
      );
      setSavedAt(new Date());
    } catch (err: unknown) {
      setFormError(getErrorMessage(err) || 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const isLoading = groupLoading || loadingRecipient;

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
        {isAdmin
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
              disabled={!isAdmin}
              onClick={() => isAdmin && fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: '2px solid var(--color-border)',
                overflow: 'hidden',
                cursor: isAdmin ? 'pointer' : 'default',
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
              {isAdmin && (
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
            {isAdmin && (
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
              disabled={!isAdmin}
              value={values.fullName}
              onChange={(e) => { updateField('fullName', e.target.value); setFormError(null); }}
              onFocus={(e) => {
                if (!isAdmin) return;
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
              style={{ ...inputStyle(Boolean(errors.fullName)), opacity: isAdmin ? 1 : 0.7 }}
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
              disabled={!isAdmin}
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
              style={{ ...inputStyle(Boolean(errors.dateOfBirth)), colorScheme: 'light', opacity: isAdmin ? 1 : 0.7 }}
              onFocus={(e) => {
                if (!isAdmin) return;
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
              }}
            />
            {errors.dateOfBirth && <p id="dateOfBirth-error" style={errorTextStyle}>{errors.dateOfBirth}</p>}
          </div>

          {/* Conditions */}
          <div className="mb-6">
            <label style={labelStyle}>
              Conditions <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            {isAdmin && (
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
                    backgroundColor: conditions.includes('None') ? 'var(--color-primary)' : 'var(--color-card)',
                    color: conditions.includes('None') ? '#ffffff' : 'var(--color-text-secondary)',
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
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conditions.map((c) => (
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
                    {isAdmin && c !== 'None' && (
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
            {conditions.length === 0 && !isAdmin && (
              <p style={{ fontSize: '13px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                No conditions recorded.
              </p>
            )}
            {errors.conditions && <p style={errorTextStyle}>{errors.conditions}</p>}
          </div>

          {/* Allergies */}
          <div className="mb-6">
            <label style={labelStyle}>Allergies</label>
            {isAdmin && (
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
                    {isAdmin && (
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
          {isAdmin && (
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

      <style>{`
        button:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
