import { describe, expect, it, vi } from 'vitest';

import type { AuthClient, AuthSession } from '../../auth/client';
import { ApiProblem } from '../errors';
import { createApiClient, joinUrl } from '../client';

function session(token: string): AuthSession {
  return { access_token: token } as AuthSession;
}

function fakeAuth(initialToken: string | null) {
  let currentToken = initialToken;
  const signOut = vi.fn(async () => ({ error: null }));
  const auth = {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: currentToken ? session(currentToken) : null },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut,
    },
  } as unknown as AuthClient;
  return {
    auth,
    signOut,
    setToken(token: string | null) {
      currentToken = token;
    },
  };
}

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('createApiClient', () => {
  it('joins base URLs without duplicate slashes', () => {
    expect(joinUrl('https://api.example.test///', '/v1/me')).toBe('https://api.example.test/v1/me');
  });

  it('reads the current session token for every request', async () => {
    const auth = fakeAuth('token-a');
    const requests: Request[] = [];
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      auth: auth.auth,
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        return response({ id: 'profile-1' });
      },
    });

    await client.getProfile();
    auth.setToken('token-b');
    await client.getProfile();

    expect(requests.map((request) => request.url)).toEqual([
      'https://api.example.test/v1/me',
      'https://api.example.test/v1/me',
    ]);
    expect(requests.map((request) => request.headers.get('Authorization'))).toEqual([
      'Bearer token-a',
      'Bearer token-b',
    ]);
  });

  it('rejects an absent session without making a request', async () => {
    const auth = fakeAuth(null);
    const fetchImpl = vi.fn();
    const client = createApiClient({ baseUrl: 'https://api.example.test', auth: auth.auth, fetchImpl });

    await expect(client.getProfile()).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('decodes safe problem fields and request ID without exposing response text', async () => {
    const auth = fakeAuth('session-token');
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      auth: auth.auth,
      fetchImpl: async () => response({
        code: 'calculation_invalid',
        message: 'Calculation input is invalid.',
        request_id: 'request-123',
        fields: [{ location: ['body', 'as_of'], message: 'Invalid value.', type: 'datetime' }],
        secret: 'must-not-be-copied',
      }, 422, { 'X-Request-ID': 'request-123' }),
    });

    await expect(client.calculateTransits({ as_of: '2026-08-20T15:00:00Z' })).rejects.toEqual(
      expect.objectContaining({
        status: 422,
        code: 'calculation_invalid',
        message: 'Calculation input is invalid.',
        requestId: 'request-123',
        fields: [{ location: ['body', 'as_of'], message: 'Invalid value.', type: 'datetime' }],
      }),
    );
  });

  it('supports 204 responses and caller abort signals', async () => {
    const auth = fakeAuth('session-token');
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      auth: auth.auth,
      fetchImpl: async (_input, init) => {
        if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
        return response(undefined, 204);
      },
    });

    await expect(client.request('/v1/no-content', { method: 'DELETE' })).resolves.toBeUndefined();
    const controller = new AbortController();
    controller.abort();
    await expect(client.request('/v1/no-content', {}, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });

  it('signs out locally on 401 and does not log tokens or bodies', async () => {
    const auth = fakeAuth('session-token');
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      auth: auth.auth,
      fetchImpl: async (_input, init) => {
        expect(init?.body).toBe(JSON.stringify({ force: true }));
        return response({ code: 'unauthorized', message: 'Authentication required.' }, 401);
      },
    });

    await expect(client.calculateNatal({ force: true })).rejects.toBeInstanceOf(ApiProblem);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });
});
