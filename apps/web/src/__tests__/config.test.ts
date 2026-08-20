import { describe, expect, it } from 'vitest';

import { PublicConfigError, readPublicConfig } from '../config';

const validEnv = {
  VITE_SUPABASE_URL: 'https://example.supabase.co/',
  VITE_SUPABASE_ANON_KEY: 'anon-key-value',
  VITE_AUREA_API_URL: 'https://api.example.test///',
};

describe('readPublicConfig', () => {
  it('returns only normalized browser-safe values', () => {
    const config = readPublicConfig(
      { ...validEnv, VITE_UNRELATED_PUBLIC_VALUE: 'ignored' },
      'production',
    );

    expect(config).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key-value',
      apiUrl: 'https://api.example.test',
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('rejects missing and malformed values without exposing input', () => {
    const secret = 'do-not-print-this-value';

    expect(() => readPublicConfig({ ...validEnv, VITE_AUREA_API_URL: '' }, 'development'))
      .toThrow(PublicConfigError);
    expect(() => readPublicConfig({ ...validEnv, VITE_AUREA_API_URL: secret }, 'development'))
      .toThrow(PublicConfigError);

    try {
      readPublicConfig({ ...validEnv, VITE_AUREA_API_URL: secret }, 'development');
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('rejects loopback URLs in production but allows them in development', () => {
    expect(() => readPublicConfig({ ...validEnv, VITE_AUREA_API_URL: 'http://localhost:9876/' }, 'production'))
      .toThrow(PublicConfigError);
    expect(readPublicConfig({ ...validEnv, VITE_AUREA_API_URL: 'http://localhost:9876/' }, 'development').apiUrl)
      .toBe('http://localhost:9876');
  });

  it('rejects forbidden secret variable names without exposing values', () => {
    const secret = 'service-role-secret-value';

    try {
      readPublicConfig({ ...validEnv, VITE_SUPABASE_SERVICE_ROLE_KEY: secret }, 'development');
      throw new Error('expected configuration failure');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicConfigError);
      expect(String(error)).not.toContain(secret);
      expect(String(error)).toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
    }
  });
});
