import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { getNameFromEmail } from '../utils/greeting';

interface CurrentUserProfile {
  fullName: string | null;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  profile: CurrentUserProfile | null;
  displayName: string;
  signOut: () => Promise<void>;
}

function getMetadataName(session: Session | null): string | null {
  const metadata = session?.user?.user_metadata;
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  return null;
}

function resolveDisplayName(session: Session | null, profile: CurrentUserProfile | null): string {
  return (
    profile?.fullName?.trim() ||
    getMetadataName(session) ||
    getNameFromEmail(session?.user?.email)
  );
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  profile: null,
  displayName: 'Caregiver',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Read existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setProfile(null);

    void supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (cancelled) return;
          const fullName =
            typeof data?.full_name === 'string' && data.full_name.trim()
              ? data.full_name.trim()
              : null;
          setProfile({ fullName });
        },
        () => {
          if (!cancelled) {
            setProfile({ fullName: null });
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, profile, displayName: resolveDisplayName(session, profile), signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Auth context colocates its hook with the provider for this small app.
export const useAuth = () => useContext(AuthContext);