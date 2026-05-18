import { useState } from 'react';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../utils/helper';
import { buildInviteConfirmationPath, getPendingInvite } from '../utils/inviteStorage';

const ALLOWED_SPECIAL_CHARS = '! @ # $ % & *';

function validateEmail(email: string): string | null {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required.';
  if (!regex.test(email)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[!@#$%&*]/.test(password)) return `Password must include at least one special character: ${ALLOWED_SPECIAL_CHARS}`;
  return null;
}

function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

const inputStyle = (hasError: boolean) => ({
  width: '100%', height: '40px', padding: '0 40px 0 12px',
  border: `1px solid ${hasError ? 'var(--color-status-critical)' : 'var(--color-border)'}`,
  borderRadius: '8px', fontSize: '13px',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-card)',
  outline: 'none', boxSizing: 'border-box' as const,
});

export default function SignupPage() {
  const [email, setEmail]                           = useState('');
  const [password, setPassword]                     = useState('');
  const [confirmPassword, setConfirmPassword]       = useState('');
  const [showPassword, setShowPassword]             = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError]                 = useState<string | null>(null);
  const [passwordError, setPasswordError]           = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError]                   = useState<string | null>(null);
  const [loading, setLoading]                       = useState(false);
  const [submitted, setSubmitted]                   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(password, confirmPassword);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);
    if (eErr || pErr || cErr) return;

    setLoading(true);
    try {
      const pendingInvite = getPendingInvite();
      const inviteMatches = pendingInvite && pendingInvite.email.toLowerCase() === email.toLowerCase();
      const emailRedirectTo = inviteMatches
        ? `${window.location.origin}${buildInviteConfirmationPath(pendingInvite!)}`
        : undefined;
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: unknown) {
      if (getErrorMessage(err).includes('already registered')) {
        setEmailError('An account with this email already exists.');
      } else {
        setFormError('Something went wrong. Please check your connection and try again.');
      }
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center max-w-sm">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Heart size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </div>
          <p style={{
            fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0
          }}>
            Check your email
          </p>
          <p className="mt-2" style={{
            fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7
          }}>
            We sent a confirmation link to <strong>{email}</strong>.<br />
            It expires in 1 hour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Heart size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 style={{
            fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0
          }}>
            Create your account
          </h1>
          <p className="mt-1" style={{
            fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7
          }}>
            Start coordinating care for your family
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px'
        }}>
          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                style={{
                  display: 'block', fontSize: '12px', fontWeight: 500,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px', letterSpacing: '0.01em'
                }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(null); setFormError(null); }}
                placeholder="you@example.com"
                style={{
                  ...inputStyle(!!emailError),
                  padding: '0 12px',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-border-focus)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = emailError
                    ? 'var(--color-status-critical)' : 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {emailError && (
                <p style={{
                  fontSize: '12px', color: 'var(--color-status-critical)',
                  marginTop: '4px', fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-5">
              <label
                htmlFor="password"
                style={{
                  display: 'block', fontSize: '12px', fontWeight: 500,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px', letterSpacing: '0.01em'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(null); setConfirmPasswordError(null); setFormError(null); }}
                  placeholder="Min. 8 characters, 1 number"
                  style={inputStyle(!!passwordError)}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--color-border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = passwordError
                      ? 'var(--color-status-critical)' : 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', color: 'var(--color-text-hint)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError ? (
                <p style={{
                  fontSize: '12px', color: 'var(--color-status-critical)',
                  marginTop: '4px', fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}>
                  {passwordError}
                </p>
              ) : (
                <p style={{
                  fontSize: '11px', color: 'var(--color-text-hint)',
                  marginTop: '4px', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.5
                }}>
                  At least 8 characters, 1 number, and 1 special character: {ALLOWED_SPECIAL_CHARS}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                style={{
                  display: 'block', fontSize: '12px', fontWeight: 500,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px', letterSpacing: '0.01em'
                }}
              >
                Confirm password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setConfirmPasswordError(null); setFormError(null); }}
                  placeholder="Re-enter your password"
                  style={inputStyle(!!confirmPasswordError)}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--color-border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(74,111,165,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = confirmPasswordError
                      ? 'var(--color-status-critical)' : 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', color: 'var(--color-text-hint)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPasswordError && (
                <p style={{
                  fontSize: '12px', color: 'var(--color-status-critical)',
                  marginTop: '4px', fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}>
                  {confirmPasswordError}
                </p>
              )}
            </div>

            {/* Form-level error */}
            {formError && (
              <div
                className="mb-4"
                style={{
                  backgroundColor: 'var(--color-status-critical-bg)',
                  border: '1px solid #F0BEBE',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
              >
                <p style={{
                  fontSize: '13px', color: 'var(--color-status-critical)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0
                }}>
                  {formError}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '48px',
                backgroundColor: loading ? 'var(--color-accent-soft)' : 'var(--color-primary)',
                color: loading ? 'var(--color-text-hint)' : '#ffffff',
                border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

          </form>

          {/* Link to login */}
          <p className="text-center mt-5" style={{
            fontSize: '13px', color: 'var(--color-text-secondary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}>
            Already have an account?{' '}
            <a href="/login" style={{
              color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none'
            }}>
              Sign in
            </a>
          </p>
        </div>

        {/* Medical disclaimer */}
        <p className="text-center mt-6" style={{
          fontSize: '11px', color: 'var(--color-text-hint)',
          fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.6
        }}>
          CareCircle is a coordination tool, not a medical device.<br />
          Always consult a doctor for medical decisions.
        </p>

      </div>
    </div>
  );
}