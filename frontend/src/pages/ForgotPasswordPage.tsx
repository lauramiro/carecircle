import { useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function validateEmail(email: string): string | null {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required.';
  if (!regex.test(email)) return 'Please enter a valid email address.';
  return null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail]           = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const eErr = validateEmail(email);
    setEmailError(eErr);
    if (eErr) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      setFormError('Something went wrong. Please check your connection and try again.');
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
            If an account exists for <strong>{email}</strong>, we sent a password reset link. It expires in 1 hour.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block', marginTop: '16px',
              color: 'var(--color-primary)', fontSize: '13px',
              fontWeight: 500, fontFamily: 'Plus Jakarta Sans, sans-serif',
              textDecoration: 'none'
            }}
          >
            Back to sign in
          </a>
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
            Reset your password
          </h1>
          <p className="mt-1" style={{
            fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7,
            textAlign: 'center'
          }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px'
        }}>
          <form onSubmit={handleSubmit} noValidate>

            <div className="mb-6">
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

          </form>

          <p className="text-center mt-5" style={{
            fontSize: '13px', color: 'var(--color-text-secondary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
          }}>
            <a href="/login" style={{
              color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none'
            }}>
              Back to sign in
            </a>
          </p>
        </div>

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
