import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  companyName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    companyName?: string,
  ) => Promise<{ error: AuthError | null; needsConfirmation?: boolean; alreadyRegistered?: boolean }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SessionUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

const toUser = (sessionUser: SessionUser): User => ({
  id: sessionUser.id,
  email: sessionUser.email || '',
  companyName: String(sessionUser.user_metadata?.company_name || ''),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  // useNavigate changes on every route change; the auth listener should only subscribe once
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe first so no auth event between the two calls is missed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? toUser(session.user) : null);
      // A reset link can land on any page (Supabase falls back to the Site URL),
      // so send the visitor to the page where they choose the new password
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        navigateRef.current('/reset-password', { replace: true });
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? toUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error };
  };

  const signUp = async (email: string, password: string, companyName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { company_name: companyName?.trim() || '' },
        emailRedirectTo: `${window.location.origin}/my-jobs`,
      },
    });
    if (error) return { error };
    // For an email that already has a confirmed account, Supabase answers with a
    // placeholder user that has no identities instead of an error
    if (data.user && data.user.identities?.length === 0) return { error: null, alreadyRegistered: true };
    // With email confirmation on, Supabase returns no session until the link is clicked
    return { error: null, needsConfirmation: !data.session };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/my-jobs` },
    });
    return { error };
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, resendConfirmation, sendPasswordReset, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
