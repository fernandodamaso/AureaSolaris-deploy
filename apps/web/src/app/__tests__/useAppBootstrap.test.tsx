import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiProblem } from '../../api/errors';
import type { ApiClient, BirthProfileResponse, ProfileResponse } from '../../api/client';
import { AuthContext, type AuthContextValue } from '../../auth/AuthProvider';
import type { AuthSession } from '../../auth/client';
import { useAppBootstrap } from '../useAppBootstrap';

const profile = { id: 'profile-1', display_name: 'Pessoa', locale: 'pt-BR', timezone: 'America/Sao_Paulo' } as ProfileResponse;
const birthProfile = { id: 'birth-1', label: 'Nascimento', birth_date: '2000-01-01', birth_time: '12:00:00', timezone: 'America/Sao_Paulo' } as BirthProfileResponse;
const session = { user: { id: 'user-1' } } as AuthSession;

function authValue(status: AuthContextValue['status'], signOut = vi.fn(async () => ({ ok: true as const }))): AuthContextValue {
  return {
    status,
    session: status === 'authenticated' ? session : null,
    signIn: vi.fn(),
    signOut,
  } as AuthContextValue;
}

function Probe({ api, auth }: { api: ApiClient; auth: AuthContextValue }) {
  const bootstrap = useAppBootstrap(api);
  return (
    <div>
      <output data-testid="state">{bootstrap.state.status}</output>
      <button type="button" onClick={() => { void bootstrap.retry(); }}>retry</button>
      <button type="button" onClick={() => { void bootstrap.signOut(); }}>logout</button>
      <output data-testid="auth-status">{auth.status}</output>
    </div>
  );
}

function renderBootstrap(api: ApiClient, auth: AuthContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <Probe api={api} auth={auth} />
    </AuthContext.Provider>,
  );
}

function apiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    request: vi.fn(),
    getProfile: vi.fn(async () => profile),
    updateProfile: vi.fn(),
    getBirthProfile: vi.fn(async () => birthProfile),
    updateBirthProfile: vi.fn(),
    calculateNatal: vi.fn(),
    calculateTransits: vi.fn(),
    getReceipt: vi.fn(),
    ...overrides,
  } as ApiClient;
}

describe('useAppBootstrap', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('represents restoring and signed-out session states', async () => {
    const api = apiClient();
    const restoring = renderBootstrap(api, authValue('loading'));
    expect(screen.getByTestId('state').textContent).toBe('restoring-session');
    restoring.unmount();

    renderBootstrap(api, authValue('anonymous'));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('signed-out'));
    expect(api.getProfile).not.toHaveBeenCalled();
  });

  it('stops at stable profile onboarding when the account is missing', async () => {
    const getProfile = vi.fn(async () => { throw new ApiProblem(404, 'profile_not_found', 'provider detail'); });
    const getBirthProfile = vi.fn(async () => birthProfile);
    const api = apiClient({ getProfile, getBirthProfile });

    renderBootstrap(api, authValue('authenticated'));

    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('needs-profile'));
    expect(getBirthProfile).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('provider detail');
  });

  it('stops at birth-profile onboarding after a profile succeeds', async () => {
    const api = apiClient({ getBirthProfile: vi.fn(async () => { throw new ApiProblem(404, 'birth_profile_not_found', 'provider detail'); }) });

    renderBootstrap(api, authValue('authenticated'));

    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('needs-birth-profile'));
  });

  it('reaches ready only after both account resources load', async () => {
    const api = apiClient();
    renderBootstrap(api, authValue('authenticated'));

    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('ready'));
    expect(api.getProfile).toHaveBeenCalledTimes(1);
    expect(api.getBirthProfile).toHaveBeenCalledTimes(1);
  });

  it('shows a safe degraded state and retries after a transient failure', async () => {
    const getProfile = vi.fn()
      .mockRejectedValueOnce(new ApiProblem(503, 'upstream_failure', 'raw provider detail'))
      .mockResolvedValue(profile);
    const api = apiClient({ getProfile });
    renderBootstrap(api, authValue('authenticated'));

    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('service-unavailable'));
    expect(document.body.textContent).not.toContain('raw provider detail');
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('ready'));
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it('signs out on an API 401', async () => {
    const signOut = vi.fn(async () => ({ ok: true as const }));
    const api = apiClient({ getProfile: vi.fn(async () => { throw new ApiProblem(401, 'unauthorized', 'raw provider detail'); }) });
    renderBootstrap(api, authValue('authenticated', signOut));

    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('signed-out'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-flight account request on logout and unmount', async () => {
    let resolveProfile: ((value: ProfileResponse) => void) | undefined;
    let requestSignal: AbortSignal | undefined;
    const getProfile = vi.fn(async (options?: { signal?: AbortSignal }) => {
      requestSignal = options?.signal;
      return new Promise<ProfileResponse>((resolve) => { resolveProfile = resolve; });
    });
    const signOut = vi.fn(async () => ({ ok: true as const }));
    const api = apiClient({ getProfile });
    const view = renderBootstrap(api, authValue('authenticated', signOut));

    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(requestSignal?.aborted).toBe(true);
    resolveProfile?.(profile);
    view.unmount();
    expect(api.getBirthProfile).not.toHaveBeenCalled();
  });
});
