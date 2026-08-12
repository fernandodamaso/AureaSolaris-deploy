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
