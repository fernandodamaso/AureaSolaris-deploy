/**
 * Development fallback for helpers that do not consume the typed API provider.
 * Production/preview builds must supply VITE_AUREA_API_URL explicitly.
 */
export const LOCAL_API_URL = import.meta.env.VITE_AUREA_API_URL
  || 'http://127.0.0.1:8000';
