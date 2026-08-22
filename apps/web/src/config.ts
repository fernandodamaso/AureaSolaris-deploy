export type PublicConfig = Readonly<{
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
}>;

type PublicEnv = Record<string, unknown>;

const SAFE_NAMES = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_AUREA_API_URL',
]);

const FORBIDDEN_NAME_PARTS = [
  'DATABASE',
  'PASSWORD',
  'PRIVATE',
  'SECRET',
  'SERVICE_ROLE',
  'TOKEN',
  'JWT',
];

export class PublicConfigError extends Error {
  constructor(code: string) {
    super(`Public configuration is invalid (${code}).`);
    this.name = 'PublicConfigError';
  }
}

function assertNoForbiddenNames(env: PublicEnv) {
  for (const name of Object.keys(env)) {
    const upperName = name.toUpperCase();
    if (
      upperName.startsWith('VITE_') &&
      !SAFE_NAMES.has(upperName) &&
      FORBIDDEN_NAME_PARTS.some((part) => upperName.includes(part))
    ) {
      throw new PublicConfigError(`forbidden_variable_${upperName}`);
    }
  }
}

function requiredValue(env: PublicEnv, name: string): string {
  const value = env[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new PublicConfigError(`missing_${name}`);
  }
  return value.trim();
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function normalizeUrl(env: PublicEnv, name: string, mode: string): string {
  const value = requiredValue(env, name);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PublicConfigError(`invalid_${name}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new PublicConfigError(`invalid_${name}`);
  }
  if (parsed.hostname.includes('*')) {
    throw new PublicConfigError(`invalid_${name}`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new PublicConfigError(`invalid_${name}`);
  }
  if (mode === 'production') {
    if (parsed.protocol !== 'https:') {
      throw new PublicConfigError(`https_${name}`);
    }
    if (isLoopback(parsed.hostname)) {
      throw new PublicConfigError(`localhost_${name}`);
    }
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${pathname}`;
}

function normalizeAnonymousKey(env: PublicEnv): string {
  const value = requiredValue(env, 'VITE_SUPABASE_ANON_KEY');
  if (/\s/.test(value)) {
    throw new PublicConfigError('invalid_VITE_SUPABASE_ANON_KEY');
  }
  return value;
}

export function readPublicConfig(
  env: PublicEnv = import.meta.env as unknown as PublicEnv,
  mode = typeof import.meta.env.MODE === 'string' ? import.meta.env.MODE : 'development',
): PublicConfig {
  assertNoForbiddenNames(env);
  return Object.freeze({
    supabaseUrl: normalizeUrl(env, 'VITE_SUPABASE_URL', mode),
    supabaseAnonKey: normalizeAnonymousKey(env),
    apiUrl: normalizeUrl(env, 'VITE_AUREA_API_URL', mode),
  });
}
