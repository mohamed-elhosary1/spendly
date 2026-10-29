import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Online Supabase Production Project
export const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://fdtinjhomdpxzcvfmsev.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdGluamhvbWRweHpjdmZtc2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDgzNTIsImV4cCI6MjA5OTcyNDM1Mn0.fWq8wl9qS1WLUDBDvrfnCUEpkOWOOWLFDbwM2_nuF8Y';

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export async function signInUser(email: string, password: string): Promise<{ user: User | null; session: Session | null; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }
  return { user: data.user, session: data.session };
}

export async function signUpUser(
  email: string,
  password: string,
  displayName: string,
  currency: string = 'EGP'
): Promise<{ user: User | null; session: Session | null; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: displayName.trim(),
        display_name: displayName.trim(),
        currency,
        language: 'en',
      },
    },
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }
  return { user: data.user, session: data.session };
}

export async function signOutUser(): Promise<{ error?: string }> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getSupabase();
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
