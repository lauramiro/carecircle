import { useEffect, useRef, useState } from 'react';
import { Camera, CircleUserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, uploadAvatar, upsertProfile } from '../api/profile/profile.service';
import { useProfileForm } from '../hooks/profile/useProfileForm';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getErrorMessage } from '../utils/helper';

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

export default function ProfilePage() {
  const { session } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const userId = session?.user?.id ?? '';

  const { values, errors, updateField, validateField, validateForm, resetValues } =
    useProfileForm();

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    getProfile(userId).then((profile) => {
      if (profile) {
        resetValues({ fullName: profile.fullName, dateOfBirth: profile.dateOfBirth });
        setAvatarPreviewUrl(profile.avatarUrl ?? null);
      }
      setLoadingProfile(false);
    });
    // resetValues is stable — omitting from deps is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
        avatarUrl = await uploadAvatar(userId, pendingFile);
        setPendingFile(null);
        setAvatarPreviewUrl(avatarUrl);
      }

      await upsertProfile(userId, values.fullName, values.dateOfBirth, avatarUrl);
      setSavedAt(new Date());
    } catch (err: unknown) {
      setFormError(getErrorMessage(err) || 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  const today = new Date().toISOString().split('T')[0];

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <p style={{ fontSize: '15px', color: 'var(--color-text-hint)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 style={{
        fontFamily: 'Lora, serif',
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        Your Profile
      </h1>
      <p className="mt-1 mb-8" style={{
        fontSize: '15px',
        color: 'var(--color-text-secondary)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        lineHeight: 1.7,
      }}>
        Personal details shared with your care groups.
      </p>

      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '32px',
      }}>
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} noValidate>

          {/* Avatar upload */}
          <div className="flex flex-col items-center mb-8">
            <button
              type="button"
              aria-label="Upload profile photo"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: '2px solid var(--color-border)',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                background: 'var(--color-primary-light)',
                flexShrink: 0,
              }}
            >
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Profile photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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
              {/* Hover overlay */}
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
            </button>
            <p className="mt-2" style={{
              fontSize: '11px',
              color: 'var(--color-text-hint)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}>
              JPG, PNG or WebP
            </p>
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
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => { updateField('fullName', e.target.value); setFormError(null); }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
              }}
              onBlur={(e) => {
                validateField('fullName', e.target.value);
                e.target.style.borderColor = errors.fullName
                  ? 'var(--color-status-critical)' : 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Jane Smith"
              aria-required
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              style={inputStyle(Boolean(errors.fullName))}
            />
            {errors.fullName && (
              <p id="fullName-error" style={{
                fontSize: '12px',
                color: 'var(--color-status-critical)',
                marginTop: '4px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {errors.fullName}
              </p>
            )}
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
              value={values.dateOfBirth}
              onChange={(e) => { updateField('dateOfBirth', e.target.value); setFormError(null); }}
              onBlur={(e) => {
                validateField('dateOfBirth', e.target.value);
                e.target.style.borderColor = errors.dateOfBirth
                  ? 'var(--color-status-critical)' : 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
              aria-required
              aria-invalid={Boolean(errors.dateOfBirth)}
              aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
              style={{
                ...inputStyle(Boolean(errors.dateOfBirth)),
                colorScheme: 'light',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
              }}
            />
            {errors.dateOfBirth && (
              <p id="dateOfBirth-error" style={{
                fontSize: '12px',
                color: 'var(--color-status-critical)',
                marginTop: '4px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          {/* Form-level error */}
          {formError && (
            <div className="mb-4" style={{
              backgroundColor: 'var(--color-status-critical-bg)',
              border: '1px solid #F0BEBE',
              borderRadius: '8px',
              padding: '10px 14px',
            }}>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-status-critical)',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                margin: 0,
              }}>
                {formError}
              </p>
            </div>
          )}

          {/* Save button + confirmation */}
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
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-hint)',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                Saved
              </p>
            )}
          </div>

        </form>
      </div>

      {/* Avatar hover style */}
      <style>{`
        button:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
