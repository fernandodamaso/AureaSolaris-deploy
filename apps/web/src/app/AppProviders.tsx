import type { ReactNode } from 'react';
import { AstrologyPreferencesProvider } from '../features/astrology/AstrologyPreferencesContext';
import { IdentityProvider } from '../features/identity/IdentityContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <IdentityProvider>
      <AstrologyPreferencesProvider>{children}</AstrologyPreferencesProvider>
    </IdentityProvider>
  );
}
