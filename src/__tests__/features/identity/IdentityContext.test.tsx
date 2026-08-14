import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IdentityProvider, useIdentity } from '../../../features/identity/IdentityContext';
import type { IdentityStorage } from '../../../features/identity/identityStorage';
import type { AureaProfile } from '../../../features/identity/types';

function memoryIdentityStorage(seed: {
  profiles: AureaProfile[];
  activeProfileId?: string;
  subjects?: Record<string, string>;
}): IdentityStorage & { state: typeof seed } {
  const state = {
    profiles: structuredClone(seed.profiles),
    activeProfileId: seed.activeProfileId ?? '',
    subjects: { ...(seed.subjects ?? {}) },
  };
  return {
    state,
    loadProfiles: () => structuredClone(state.profiles),
    saveProfiles: (profiles) => { state.profiles = structuredClone(profiles); },
    loadActiveProfileId: () => state.activeProfileId,
    saveActiveProfileId: (id) => { state.activeProfileId = id; },
    loadActiveSubjectId: (profileId) => state.subjects[profileId] ?? '',
    saveActiveSubjectId: (profileId, subjectId) => { state.subjects[profileId] = subjectId; },
  };
}

function Probe() {
  const identity = useIdentity();
  return (
    <div>
      <output data-testid="profile">{identity.activeProfileId}</output>
      <output data-testid="subject">{identity.activeSubjectId}</output>
      <output data-testid="profiles">{JSON.stringify(identity.profiles)}</output>
      <button type="button" onClick={() => identity.setActiveProfileId('profile-b')}>switch</button>
      <button type="button" onClick={() => identity.ensureLocalUiProfile('profile-a', 'Account name')}>ensure</button>
    </div>
  );
}

describe('IdentityProvider', () => {
  it('persists the resolved fallback for an invalid initial subject', async () => {
    const storage = memoryIdentityStorage({
      profiles: [{ id: 'profile-a', name: 'Perfil A', active: true, connections: [] }],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'missing' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);

    expect(screen.getByTestId('subject').textContent).toBe('profile-a');
    await waitFor(() => expect(storage.state.subjects?.['profile-a']).toBe('profile-a'));
  });

  it('switches profile and subject together without restoring a previous connection', async () => {
    const storage = memoryIdentityStorage({
      profiles: [
        { id: 'profile-a', name: 'Perfil A', active: true, connections: [{ id: 'connection-a', name: 'A' }] },
        { id: 'profile-b', name: 'Perfil B', active: true, connections: [{ id: 'connection-b', name: 'B' }] },
      ],
      activeProfileId: 'profile-a',
      subjects: { 'profile-a': 'connection-a', 'profile-b': 'connection-b' },
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    await waitFor(() => expect(screen.getByTestId('profile').textContent).toBe('profile-b'));
    expect(screen.getByTestId('subject').textContent).toBe('profile-b');
    expect(storage.state.subjects?.['profile-b']).toBe('profile-b');
  });

  it('ensures a local owner idempotently while preserving existing identity data', () => {
    const storage = memoryIdentityStorage({
      profiles: [{
        id: 'profile-a',
        name: 'Existing name',
        active: false,
        birthDate: '1990-01-15',
        connections: [{ id: 'connection-a', name: 'A' }],
      }],
      activeProfileId: 'profile-a',
    });

    render(<IdentityProvider storage={storage} referenceNatalEnabled={false}><Probe /></IdentityProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'ensure' }));
    fireEvent.click(screen.getByRole('button', { name: 'ensure' }));

    const profiles = JSON.parse(screen.getByTestId('profiles').textContent || '[]') as AureaProfile[];
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: 'profile-a',
      name: 'Existing name',
      active: true,
      birthDate: '1990-01-15',
      connections: [{ id: 'connection-a', name: 'A' }],
    });
  });
});
