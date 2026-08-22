import {
  createClient,
  type AuthChangeEvent,
  type Session,
} from '@supabase/supabase-js';

import { readPublicConfig } from '../config';

export type AuthSession = Session;

export type AuthClientError = {
  status?: number;
  code?: string;
  message?: string;
};

export type AuthSignOutOptions = {
  scope?: 'global' | 'local' | 'others';
};

export type AuthClient = {
  auth: {
    getSession(): Promise<{
      data: { session: AuthSession | null };
      error: AuthClientError | null;
    }>;
    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: AuthSession | null) => void | Promise<void>,
    ): { data: { subscription: { unsubscribe(): void } } };
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { session: AuthSession | null };
      error: AuthClientError | null;
    }>;
    signOut(options?: AuthSignOutOptions): Promise<{ error: AuthClientError | null }>;
  };
};

let browserAuthClient: AuthClient | null = null;

function readBrowserAuthConfig() {
  const { supabaseUrl, supabaseAnonKey } = readPublicConfig();
  return { url: supabaseUrl, anonymousKey: supabaseAnonKey };
}

export function getBrowserAuthClient(): AuthClient {
  if (browserAuthClient) {
    return browserAuthClient;
  }

  const { url, anonymousKey } = readBrowserAuthConfig();
  browserAuthClient = createClient(url, anonymousKey, {
    auth: {
      persistSession: true,
      storage: window.sessionStorage,
    },
  });
  return browserAuthClient;
}
