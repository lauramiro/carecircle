import { useEffect, useState } from 'react';
import { AlertCircle, Heart, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isUserInGroup } from '../services/inviteService';

interface GroupPageProps {
  groupId: string;
}

type GuardState = 'checking' | 'allowed' | 'signed-out' | 'forbidden';

function navigateTo(path: string) {
  window.location.href = path;
}

export default function GroupPage({ groupId }: GroupPageProps) {
  const { session } = useAuth();
  const [guardState, setGuardState] = useState<GuardState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const email = session?.user?.email;
      if (!email) {
        setGuardState('signed-out');
        return;
      }

      const allowed = await isUserInGroup(groupId, email);
      if (!cancelled) setGuardState(allowed ? 'allowed' : 'forbidden');
    }

    checkAccess().catch(() => {
      if (!cancelled) setGuardState('forbidden');
    });

    return () => {
      cancelled = true;
    };
  }, [groupId, session?.user?.email]);

  if (guardState === 'checking') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <p style={{
          fontSize: '15px',
          color: 'var(--color-text-hint)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          Checking group access...
        </p>
      </div>
    );
  }

  if (guardState !== 'allowed') {
    const signedOut = guardState === 'signed-out';

    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center max-w-sm">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-status-critical-bg)' }}
          >
            <AlertCircle size={24} strokeWidth={1.75} style={{ color: 'var(--color-status-critical)' }} />
          </div>
          <h1 style={{
            fontFamily: 'Lora, serif',
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            {signedOut ? 'Sign in required' : 'Group access unavailable'}
          </h1>
          <p className="mt-2 mb-6" style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
          }}>
            {signedOut
              ? 'Please sign in with the invited account to view this group.'
              : 'You need to be a member of this group to view its dashboard.'}
          </p>
          <button
            type="button"
            onClick={() => navigateTo(signedOut ? '/login' : '/')}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              cursor: 'pointer',
            }}
          >
            {signedOut ? 'Go to sign in' : 'Go home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-blue-light, var(--color-primary-light))' }}
        >
          <Users size={24} strokeWidth={1.75} style={{ color: 'var(--color-blue, var(--color-primary))' }} />
        </div>
        <h1 style={{
          fontFamily: 'Lora, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Group dashboard
        </h1>
        <p className="mt-2" style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}>
          You are viewing <strong>{groupId}</strong> as <strong>{session?.user?.email}</strong>.
        </p>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mt-8"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Heart size={20} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>
    </div>
  );
}
