import { readPublicConfig } from '../config';
import { getBrowserAuthClient, type AuthClient } from '../auth/client';
import type { components } from './generated';
import { ApiProblem, type ApiProblemField } from './errors';

export type ProfileResponse = components['schemas']['ProfileResponse'];
export type ProfileUpdate = components['schemas']['ProfileUpdate'];
export type BirthProfileResponse = components['schemas']['BirthProfileResponse'];
export type BirthProfileUpdate = components['schemas']['BirthProfileUpdate'];
export type ReceiptResponse = components['schemas']['ReceiptResponse'];
export type TransitRequest = components['schemas']['TransitRequest'];
export type TransitRequestInput = Omit<TransitRequest, 'force'> & Partial<Pick<TransitRequest, 'force'>>;

export type ApiClientRequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

export type ApiClient = Readonly<{
  request<T>(path: string, init?: RequestInit, options?: ApiClientRequestOptions): Promise<T | undefined>;
  getProfile(options?: ApiClientRequestOptions): Promise<ProfileResponse>;
  updateProfile(input: ProfileUpdate, options?: ApiClientRequestOptions): Promise<ProfileResponse>;
  getBirthProfile(options?: ApiClientRequestOptions): Promise<BirthProfileResponse>;
  updateBirthProfile(input: BirthProfileUpdate, options?: ApiClientRequestOptions): Promise<BirthProfileResponse>;
  calculateNatal(input?: { force?: boolean }, options?: ApiClientRequestOptions): Promise<ReceiptResponse>;
  calculateTransits(input: TransitRequestInput, options?: ApiClientRequestOptions): Promise<ReceiptResponse>;
  getReceipt(receiptId: string, options?: ApiClientRequestOptions): Promise<ReceiptResponse>;
}>;

export type ApiClientOptions = Readonly<{
  baseUrl?: string;
  auth?: AuthClient;
  fetchImpl?: typeof fetch;
}>;

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  return `${normalizedBase}/${path.replace(/^\/+/, '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fieldsFrom(value: unknown): readonly ApiProblemField[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((field) => ({
    location: Array.isArray(field.location)
      ? field.location.filter((item): item is string => typeof item === 'string')
      : undefined,
    message: typeof field.message === 'string' ? field.message : undefined,
    type: typeof field.type === 'string' ? field.type : undefined,
  }));
}

function defaultProblemMessage(status: number): string {
  if (status === 401) return 'Authentication required.';
  if (status === 404) return 'Resource not found.';
  if (status === 422) return 'Request validation failed.';
  if (status >= 500) return 'Service unavailable.';
  return 'API request failed.';
}

function problemFromResponse(status: number, requestId: string | null, body: unknown): ApiProblem {
  if (!isRecord(body)) {
    return new ApiProblem(status, 'request_failed', defaultProblemMessage(status), requestId);
  }
  return new ApiProblem(
    status,
    typeof body.code === 'string' ? body.code : 'request_failed',
    typeof body.message === 'string' ? body.message : defaultProblemMessage(status),
    requestId,
    fieldsFrom(body.fields),
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const auth = options.auth;
  const getAuth = () => auth ?? getBrowserAuthClient();
  const getBaseUrl = () => options.baseUrl ?? readPublicConfig().apiUrl;

  async function request<T>(
    path: string,
    init: RequestInit = {},
    requestOptions: ApiClientRequestOptions = {},
  ): Promise<T | undefined> {
    const authClient = getAuth();
    let sessionResult: Awaited<ReturnType<AuthClient['auth']['getSession']>>;
    try {
      sessionResult = await authClient.auth.getSession();
    } catch {
      throw new ApiProblem(401, 'unauthorized', 'Authentication required.');
    }
    const token = sessionResult.data.session?.access_token;
    if (sessionResult.error || !token) {
      throw new ApiProblem(401, 'unauthorized', 'Authentication required.');
    }

    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
      response = await fetchImpl(joinUrl(getBaseUrl(), path), {
        ...init,
        headers,
        signal: requestOptions.signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ApiProblem(0, 'network_error', 'API request failed.');
    }

    const requestId = response.headers.get('X-Request-ID');
    if (response.status === 401) {
      try {
        await authClient.auth.signOut({ scope: 'local' });
      } catch {
        // Sign-out is best effort after an invalid session.
      }
    }
    if (response.status === 204) return undefined;

    const raw = await response.text();
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = undefined;
    }
    if (!response.ok) throw problemFromResponse(response.status, requestId, body);
    return body as T;
  }

  return {
    request,
    getProfile: (requestOptions) => request<ProfileResponse>('/v1/me', {}, requestOptions) as Promise<ProfileResponse>,
    updateProfile: (input, requestOptions) => request<ProfileResponse>('/v1/me/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }, requestOptions) as Promise<ProfileResponse>,
    getBirthProfile: (requestOptions) => request<BirthProfileResponse>('/v1/birth-profile', {}, requestOptions) as Promise<BirthProfileResponse>,
    updateBirthProfile: (input, requestOptions) => request<BirthProfileResponse>('/v1/birth-profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }, requestOptions) as Promise<BirthProfileResponse>,
    calculateNatal: (input = {}, requestOptions: ApiClientRequestOptions = {}) => request<ReceiptResponse>('/v1/astrology/natal', {
      method: 'POST',
      body: JSON.stringify(input),
    }, requestOptions) as Promise<ReceiptResponse>,
    calculateTransits: (input, requestOptions) => request<ReceiptResponse>('/v1/astrology/transits', {
      method: 'POST',
      body: JSON.stringify(input),
    }, requestOptions) as Promise<ReceiptResponse>,
    getReceipt: (receiptId, requestOptions) => request<ReceiptResponse>(`/v1/astrology/receipts/${encodeURIComponent(receiptId)}`, {}, requestOptions) as Promise<ReceiptResponse>,
  };
}

export { joinUrl };
