import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createApiClient, type ApiClient } from './client';

export const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  children,
  client,
}: {
  children: ReactNode;
  client?: ApiClient;
}) {
  const value = useMemo(() => client ?? createApiClient(), [client]);
  return <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient must be used within ApiClientProvider.');
  return client;
}
