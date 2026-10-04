import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearLocalData } from '@/db/client';

type Result = { error?: string };

type AuthState = {
  session: Session | null;
  initialized: boolean;
  /** Starts listening to auth changes; returns the unsubscribe function. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<Result & { needsConfirmation?: boolean }>;
  sendReset: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,

  init: () => {
    void supabase.auth
      .getSession()
      .then(({ data }) => set({ session: data.session, initialized: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      set({ session, initialized: true }),
    );
    return () => data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  },

  signUp: async (fullName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  },

  sendReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    await supabase.auth.signOut({ scope: 'local' }); // local scope works offline
    await clearLocalData(); // SEC-11
    set({ session: null });
  },
}));
