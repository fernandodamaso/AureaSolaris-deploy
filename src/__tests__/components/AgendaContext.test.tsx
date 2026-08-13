import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaProvider, useAgendaContext } from '../../context/AgendaContext';

function AgendaProbe() {
  const { activeProfileId, activeSubjectId, setActiveProfileId, updateProfile } = useAgendaContext();

  return (
    <div>
      <output data-testid="active-profile">{activeProfileId}</output>
      <output data-testid="active-subject">{activeSubjectId}</output>
      <button type="button" onClick={() => setActiveProfileId('profile-b')}>Trocar para B</button>
      <button type="button" onClick={() => setActiveProfileId('profile-a')}>Trocar para A</button>
      <button type="button" onClick={() => updateProfile('profile-a', { connections: [] })}>
        Remover conexão A
      </button>
    </div>
  );
}

describe('AgendaProvider subject selection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      {
        id: 'profile-a',
        name: 'Perfil A',
        active: true,
        connections: [{ id: 'connection-a', name: 'Conexão A' }],
      },
      {
        id: 'profile-b',
        name: 'Perfil B',
        active: true,
        connections: [{ id: 'connection-b', name: 'Conexão B' }],
      },
    ]));
    localStorage.setItem('aurea_active_id', 'profile-a');
    localStorage.setItem('aurea_active_subject:profile-a', 'connection-a');
  });

  it('persists the profile fallback so a previous subject does not return', async () => {
    render(
      <AgendaProvider>
        <AgendaProbe />
      </AgendaProvider>,
    );

    expect(screen.getByTestId('active-subject').textContent).toBe('connection-a');

    fireEvent.click(screen.getByRole('button', { name: 'Trocar para B' }));
    await waitFor(() => expect(screen.getByTestId('active-subject').textContent).toBe('profile-b'));
    expect(localStorage.getItem('aurea_active_subject:profile-b')).toBe('profile-b');

    fireEvent.click(screen.getByRole('button', { name: 'Trocar para A' }));
    await waitFor(() => expect(screen.getByTestId('active-subject').textContent).toBe('profile-a'));
    expect(localStorage.getItem('aurea_active_subject:profile-a')).toBe('profile-a');
  });

  it('persists the resolved profile fallback for an invalid initial subject', async () => {
    localStorage.setItem('aurea_active_subject:profile-a', 'missing-subject');

    render(
      <AgendaProvider>
        <AgendaProbe />
      </AgendaProvider>,
    );

    expect(screen.getByTestId('active-subject').textContent).toBe('profile-a');
    await waitFor(() => {
      expect(localStorage.getItem('aurea_active_subject:profile-a')).toBe('profile-a');
    });
  });

  it('does not crash when legacy connections data is malformed', () => {
    localStorage.setItem('aurea_profiles', JSON.stringify([
      {
        id: 'profile-a',
        name: 'Perfil A',
        active: true,
        connections: { id: 'legacy-connection' },
      },
    ]));
    localStorage.removeItem('aurea_active_subject:profile-a');

    render(
      <AgendaProvider>
        <AgendaProbe />
      </AgendaProvider>,
    );

    expect(screen.getByTestId('active-profile').textContent).toBe('profile-a');
    expect(screen.getByTestId('active-subject').textContent).toBe('profile-a');
  });

  it('falls back to the active profile when its active connection is removed', async () => {
    render(
      <AgendaProvider>
        <AgendaProbe />
      </AgendaProvider>,
    );

    expect(screen.getByTestId('active-subject').textContent).toBe('connection-a');

    fireEvent.click(screen.getByRole('button', { name: 'Remover conexão A' }));

    await waitFor(() => expect(screen.getByTestId('active-subject').textContent).toBe('profile-a'));
    expect(localStorage.getItem('aurea_active_subject:profile-a')).toBe('profile-a');
  });
});

function LocalOwnerProbe({ ownerId, displayName }: { ownerId: string; displayName: string }) {
  const { profiles, activeProfileId, activeSubjectId, ensureLocalUiProfile } = useAgendaContext();
  const owner = profiles.find((profile) => profile.id === ownerId);

  return (
    <div>
      <output data-testid="profile-count">{profiles.filter((profile) => profile.id === ownerId).length}</output>
      <output data-testid="active-profile">{activeProfileId}</output>
      <output data-testid="active-subject">{activeSubjectId}</output>
      <output data-testid="owner-name">{owner?.name ?? ''}</output>
      <output data-testid="owner-birth">{owner?.birthDate ?? ''}</output>
      <output data-testid="owner-connections">{JSON.stringify(owner?.connections ?? [])}</output>
      <output data-testid="owner-active">{String(owner?.active ?? false)}</output>
      <button type="button" onClick={() => ensureLocalUiProfile(ownerId, displayName)}>Ativar dono local</button>
    </div>
  );
}

function storedProfiles() {
  return JSON.parse(localStorage.getItem('aurea_profiles') || '[]') as Array<Record<string, unknown>>;
}

describe('AgendaProvider ensureLocalUiProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds one profile for a missing owner and activates it as owner and subject', () => {
    render(
      <AgendaProvider>
        <LocalOwnerProbe ownerId="owner-1" displayName="Aurea Local" />
      </AgendaProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));

    expect(screen.getByTestId('profile-count').textContent).toBe('1');
    expect(screen.getByTestId('active-profile').textContent).toBe('owner-1');
    expect(screen.getByTestId('active-subject').textContent).toBe('owner-1');
    expect(screen.getByTestId('owner-name').textContent).toBe('Aurea Local');
    expect(storedProfiles()).toEqual([
      { id: 'owner-1', name: 'Aurea Local', active: true, connections: [] },
    ]);
    expect(localStorage.getItem('aurea_active_id')).toBe('owner-1');
    expect(localStorage.getItem('aurea_active_subject:owner-1')).toBe('owner-1');
  });

  it('preserves an existing UI name instead of overwriting it from the account display name', () => {
    localStorage.setItem('aurea_profiles', JSON.stringify([
      {
        id: 'owner-1',
        name: 'Nome antigo',
        active: false,
        birthDate: '1990-01-15',
        birthTime: '08:30',
        connections: [{ id: 'conn-1', name: 'Conexão' }],
      },
    ]));
    localStorage.setItem('aurea_active_id', 'owner-1');

    render(
      <AgendaProvider>
        <LocalOwnerProbe ownerId="owner-1" displayName="Nome novo" />
      </AgendaProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));

    expect(screen.getByTestId('owner-name').textContent).toBe('Nome antigo');
    expect(screen.getByTestId('owner-birth').textContent).toBe('1990-01-15');
    expect(screen.getByTestId('owner-connections').textContent).toBe(JSON.stringify([{ id: 'conn-1', name: 'Conexão' }]));
    expect(screen.getByTestId('owner-active').textContent).toBe('true');
    expect(storedProfiles()[0]).toMatchObject({
      id: 'owner-1',
      name: 'Nome antigo',
      active: true,
      birthDate: '1990-01-15',
      birthTime: '08:30',
      connections: [{ id: 'conn-1', name: 'Conexão' }],
    });
    expect(storedProfiles()[0]).not.toHaveProperty('password');
  });

  it('does not duplicate the profile when called repeatedly', () => {
    render(
      <AgendaProvider>
        <LocalOwnerProbe ownerId="owner-1" displayName="Aurea Local" />
      </AgendaProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));

    expect(screen.getByTestId('profile-count').textContent).toBe('1');
    expect(storedProfiles().filter((profile) => profile.id === 'owner-1')).toHaveLength(1);
  });

  it('switches a stale active profile and subject in the same operation', () => {
    localStorage.setItem('aurea_profiles', JSON.stringify([
      {
        id: 'profile-a',
        name: 'Perfil A',
        active: true,
        connections: [{ id: 'connection-a', name: 'Conexão A' }],
      },
      {
        id: 'profile-b',
        name: 'Perfil B',
        active: true,
        connections: [{ id: 'connection-b', name: 'Conexão B' }],
      },
    ]));
    localStorage.setItem('aurea_active_id', 'profile-a');
    localStorage.setItem('aurea_active_subject:profile-a', 'connection-a');

    render(
      <AgendaProvider>
        <LocalOwnerProbe ownerId="profile-b" displayName="Perfil B atualizado" />
      </AgendaProvider>,
    );

    expect(screen.getByTestId('active-profile').textContent).toBe('profile-a');
    expect(screen.getByTestId('active-subject').textContent).toBe('connection-a');

    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));

    expect(screen.getByTestId('active-profile').textContent).toBe('profile-b');
    expect(screen.getByTestId('active-subject').textContent).toBe('profile-b');
    expect(screen.getByTestId('owner-name').textContent).toBe('Perfil B');
    expect(localStorage.getItem('aurea_active_id')).toBe('profile-b');
    expect(localStorage.getItem('aurea_active_subject:profile-b')).toBe('profile-b');
  });

  it('persists aurea_profiles, aurea_active_id, and aurea_active_subject to match React state', () => {
    render(
      <AgendaProvider>
        <LocalOwnerProbe ownerId="owner-1" displayName="" />
      </AgendaProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ativar dono local' }));

    expect(screen.getByTestId('active-profile').textContent).toBe(localStorage.getItem('aurea_active_id'));
    expect(screen.getByTestId('active-subject').textContent).toBe(localStorage.getItem('aurea_active_subject:owner-1'));
    expect(screen.getByTestId('owner-name').textContent).toBe('Aurea');
    expect(JSON.parse(localStorage.getItem('aurea_profiles') || '[]')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'owner-1',
          name: 'Aurea',
          active: true,
        }),
      ]),
    );
  });
});
