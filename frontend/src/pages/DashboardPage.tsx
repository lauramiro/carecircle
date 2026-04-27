import { useAuth } from '../contexts/AuthContext';
import { Heart, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { session, signOut } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div className="w-full max-w-md text-center">

        <div
          className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-blue-light)' }}
        >
          <Heart size={24} strokeWidth={1.75} style={{ color: 'var(--color-blue)' }} />
        </div>

        <h1 style={{
          fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0
        }}>
          Welcome to CareCircle
        </h1>

        <p className="mt-2" style={{
          fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7
        }}>
          Signed in as <strong>{session?.user?.email}</strong>
        </p>

        <button
          onClick={signOut}
          className="flex items-center gap-2 mx-auto mt-6"
          style={{
            height: '40px', padding: '0 20px',
            backgroundColor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>

        <p className="mt-8" style={{
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