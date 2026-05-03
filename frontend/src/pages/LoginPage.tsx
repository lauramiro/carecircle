import { useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../utils/helper';
import { buildInviteConfirmationPath, getPendingInvite } from '../utils/inviteStorage';

function mapErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return "That email and password don't match. Please try again.";
  return "Something went wrong. Please check your connection and try again.";
}

export default function LoginPage() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [magicSent, setMagicSent]   = useState(false);
  const [showMagic, setShowMagic]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email) { setEmailError('Email is required.'); return; }
    if (!showMagic && !password) { setFormError('Password is required.'); return; }

    setLoading(true);
    try {
      if (showMagic) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMagicSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const pendingInvite = getPendingInvite();
        if (pendingInvite && pendingInvite.email.toLowerCase() === email.toLowerCase()) {
          window.location.href = buildInviteConfirmationPath(pendingInvite);
          return;
        }
        window.location.href = '/';
      }
    } catch (err: unknown) {
      setFormError(mapErrorMessage(getErrorMessage(err)));
    }
    setLoading(false);
  };

  if (magicSent) {
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
            We sent a magic link to <strong>{email}</strong>. It expires in 1 hour.
          </p>
          <button
            onClick={() => { setMagicSent(false); setShowMagic(false); }}
            style={{
              marginTop: '16px', background: 'none', border: 'none',
              color: 'var(--color-primary)', fontSize: '13px',
              fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif'
            }}
          >
            Back to sign in
          </button>
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
            Welcome back
          </h1>
          <p className="mt-1" style={{
            fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7
          }}>
            Sign in to your CareCircle account
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px'
        }}>
          <form onSubmit={handleLogin} noValidate>

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
                  width: '100%', height: '40px', padding: '0 12px',
                  border: `1px solid ${emailError ? 'var(--color-status-critical)' : 'var(--color-border)'}`,
                  borderRadius: '8px', fontSize: '13px',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-card)',
                  outline: 'none', boxSizing: 'border-box' as const,
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-border-focus)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(58,111,191,0.12)';
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

            {/* Password — hidden in magic link mode */}
            {!showMagic && (
              <div className="mb-6">
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
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFormError(null); }}
                  placeholder="Your password"
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    border: `1px solid ${formError ? 'var(--color-status-critical)' : 'var(--color-border)'}`,
                    borderRadius: '8px', fontSize: '13px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-card)',
                    outline: 'none', boxSizing: 'border-box' as const,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--color-border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(58,111,191,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = formError
                      ? 'var(--color-status-critical)' : 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

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
              {loading
                ? (showMagic ? 'Sending link...' : 'Signing in...')
                : (showMagic ? 'Send magic link' : 'Sign in')
              }
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center my-5">
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            <span style={{
              padding: '0 12px', fontSize: '12px',
              color: 'var(--color-text-hint)',
              fontFamily: 'Plus Jakarta Sans, sans-serif'
            }}>
              or
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
          </div>

          {/* Magic link toggle */}
          <button
            type="button"
            onClick={() => { setShowMagic(!showMagic); setFormError(null); }}
            disabled={loading}
            style={{
              width: '100%', height: '40px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary-dark)',
              border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 500,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {showMagic ? 'Sign in with password instead' : 'Send me a magic link instead'}
          </button>

          {/* Link to signup */}
          <p className="text-center mt-5" style={{
            fontSize: '13px', color: 'var(--color-text-secondary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}>
            Don't have an account?{' '}
            <a href="/signup" style={{
              color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none'
            }}>
              Create one
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