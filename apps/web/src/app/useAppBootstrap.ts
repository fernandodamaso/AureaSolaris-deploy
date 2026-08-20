import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiClientContext } from '../api/provider';
import type { ApiClient, BirthProfileResponse, ProfileResponse } from '../api/client';
import { ApiProblem } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import type { AuthActionResult } from '../auth/AuthProvider';

export type AppBootstrapState =
  | { status: 'restoring-session' }
  | { status: 'signed-out' }
  | { status: 'loading-account' }
  | { status: 'needs-profile' }
  | { status: 'needs-birth-profile'; profile: ProfileResponse }
  | { status: 'ready'; profile: ProfileResponse; birthProfile: BirthProfileResponse }
  | { status: 'service-unavailable'; message: string };

export type AppBootstrap = Readonly<{
  state: AppBootstrapState;
  retry(): void;
  signOut(): Promise<AuthActionResult>;
}>;

const SERVICE_MESSAGE = 'Não foi possível carregar sua conta. Tente novamente.';

function apiProblem(error: unknown): { status?: number; code?: string } {
  if (error instanceof ApiProblem) return error;
  if (typeof error !== 'object' || error === null) return {};
  const candidate = error as { status?: unknown; code?: unknown };
  return {
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
  };
}

function isUnauthorized(error: unknown): boolean {
  return apiProblem(error).status === 401;
}

function isMissing(error: unknown, code: string): boolean {
  const problem = apiProblem(error);
  return problem.status === 404 && (problem.code === code || problem.code === undefined);
}

export function useAppBootstrap(api?: ApiClient): AppBootstrap {
  const contextApi = useContext(ApiClientContext);
  const client = api ?? contextApi;
  if (!client) throw new Error('useAppBootstrap requires an ApiClientProvider or client.');
  const auth = useAuth();
  const authSignOut = auth.signOut;
  const authStatus = auth.status;
  const authUserId = auth.session?.user.id;
  const [retryCount, setRetryCount] = useState(0);
  const [accountState, setAccountState] = useState<AppBootstrapState>({ status: 'loading-account' });
  const [loadedAccountKey, setLoadedAccountKey] = useState('');
  const cancelRequest = useRef<(() => void) | null>(null);
  const accountKey = authStatus === 'authenticated' ? `${authUserId ?? ''}:${retryCount}` : '';
  const state: AppBootstrapState = authStatus === 'loading'
    ? { status: 'restoring-session' }
    : authStatus === 'anonymous'
      ? { status: 'signed-out' }
      : loadedAccountKey === accountKey
        ? accountState
        : { status: 'loading-account' };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const cancel = () => {
      active = false;
      controller.abort();
    };
    cancelRequest.current = cancel;

    if (authStatus === 'loading') {
      return () => {
        cancel();
        if (cancelRequest.current === cancel) cancelRequest.current = null;
      };
    }

    if (authStatus === 'anonymous') {
      return () => {
        cancel();
        if (cancelRequest.current === cancel) cancelRequest.current = null;
      };
    }

    const loadAccount = async () => {
      let profile: ProfileResponse;
      try {
        profile = await client.getProfile({ signal: controller.signal });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        if (isUnauthorized(error)) {
          await authSignOut();
          if (active && !controller.signal.aborted) {
            setAccountState({ status: 'signed-out' });
            setLoadedAccountKey(accountKey);
          }
          return;
        }
        if (isMissing(error, 'profile_not_found')) {
          setAccountState({ status: 'needs-profile' });
          setLoadedAccountKey(accountKey);
          return;
        }
        setAccountState({ status: 'service-unavailable', message: SERVICE_MESSAGE });
        setLoadedAccountKey(accountKey);
        return;
      }

      try {
        const birthProfile = await client.getBirthProfile({ signal: controller.signal });
        if (active && !controller.signal.aborted) {
          setAccountState({ status: 'ready', profile, birthProfile });
          setLoadedAccountKey(accountKey);
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        if (isUnauthorized(error)) {
          await authSignOut();
          if (active && !controller.signal.aborted) {
            setAccountState({ status: 'signed-out' });
            setLoadedAccountKey(accountKey);
          }
          return;
        }
        if (isMissing(error, 'birth_profile_not_found')) {
          setAccountState({ status: 'needs-birth-profile', profile });
          setLoadedAccountKey(accountKey);
          return;
        }
        setAccountState({ status: 'service-unavailable', message: SERVICE_MESSAGE });
        setLoadedAccountKey(accountKey);
      }
    };

    void loadAccount();
    return () => {
      cancel();
      if (cancelRequest.current === cancel) cancelRequest.current = null;
    };
  }, [accountKey, authSignOut, authStatus, client, retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  const signOut = useCallback(async () => {
    cancelRequest.current?.();
    const result = await authSignOut();
    if (result.ok) {
      setAccountState({ status: 'signed-out' });
      setLoadedAccountKey(accountKey);
    }
    return result;
  }, [accountKey, authSignOut]);

  return { state, retry, signOut };
}
