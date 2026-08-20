import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiClientProvider } from '../../api/provider';
import { ApiProblem } from '../../api/errors';
import type { ApiClient } from '../../api/client';
import { ProfileOnboarding } from '../ProfileOnboarding';

function apiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    request: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(async () => ({})),
    getBirthProfile: vi.fn(),
    updateBirthProfile: vi.fn(async () => ({})),
    calculateNatal: vi.fn(),
    calculateTransits: vi.fn(),
    getReceipt: vi.fn(),
    ...overrides,
  } as ApiClient;
}

function renderOnboarding(api: ApiClient, onComplete = vi.fn()) {
  return {
    onComplete,
    ...render(
      <ApiClientProvider client={api}>
        <ProfileOnboarding mode="profile" onComplete={onComplete} onLogout={vi.fn()} />
      </ApiClientProvider>,
    ),
  };
}

function fillBirth() {
  fireEvent.change(screen.getByLabelText('Nome do perfil'), { target: { value: 'Pessoa Teste' } });
  fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '01/01/2000' } });
  fireEvent.change(screen.getByLabelText('Hora de nascimento'), { target: { value: '12:30' } });
  fireEvent.change(screen.getByLabelText('Local de nascimento'), { target: { value: 'São Paulo' } });
  fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '0' } });
}

describe('ProfileOnboarding', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders empty fields with the São Paulo timezone and validates before saving', () => {
    const api = apiClient();
    renderOnboarding(api);

    expect(screen.getByLabelText('Fuso horário IANA')).toHaveProperty('value', 'America/Sao_Paulo');
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de perfil' }));
    expect(screen.getByRole('alert').textContent).toContain('Informe seu nome.');
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('accepts coordinate zero and saves profile before birth profile on keyboard submit', async () => {
    const events: string[] = [];
    const api = apiClient({
      updateProfile: vi.fn(async () => { events.push('profile'); return {} as never; }),
      updateBirthProfile: vi.fn(async () => { events.push('birth'); return {} as never; }),
    });
    const onComplete = vi.fn();
    renderOnboarding(api, onComplete);
    fillBirth();
    fireEvent.keyDown(screen.getByLabelText('Hora de nascimento'), { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de perfil' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(events).toEqual(['profile', 'birth']);
    expect(api.updateBirthProfile).toHaveBeenCalledWith(expect.objectContaining({
      birth_date: '2000-01-01',
      latitude: 0,
      longitude: 0,
      house_system: 'P',
      timezone: 'America/Sao_Paulo',
    }));
  });

  it('prefills existing profile and birth values', () => {
    const api = apiClient();
    render(
      <ApiClientProvider client={api}>
        <ProfileOnboarding
          mode="birth-profile"
          profile={{ display_name: 'Pessoa', locale: 'pt-BR', timezone: 'Europe/Lisbon' } as never}
          birthProfile={{ label: 'Nascimento', birth_date: '2001-02-03', birth_time: '04:05:00', place: 'Lisboa', latitude: '10', longitude: '-20', timezone: 'Europe/Lisbon' } as never}
          onComplete={vi.fn()}
          onLogout={vi.fn()}
        />
      </ApiClientProvider>,
    );

    expect(screen.getByLabelText('Data de nascimento')).toHaveProperty('value', '03/02/2001');
    expect(screen.getByLabelText('Hora de nascimento')).toHaveProperty('value', '04:05');
    expect(screen.getByLabelText('Fuso horário IANA')).toHaveProperty('value', 'Europe/Lisbon');
  });

  it('keeps entered values after a birth save failure and succeeds on retry', async () => {
    const updateBirthProfile = vi.fn()
      .mockRejectedValueOnce(new ApiProblem(503, 'temporary', 'secret provider detail'))
      .mockResolvedValue({});
    const api = apiClient({ updateBirthProfile });
    const onComplete = vi.fn();
    renderOnboarding(api, onComplete);
    fillBirth();
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de perfil' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(document.body.textContent).not.toContain('secret provider detail');
    expect(screen.getByLabelText('Data de nascimento')).toHaveProperty('value', '01/01/2000');
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de perfil' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('maps server field errors to safe Portuguese text', async () => {
    const api = apiClient({
      updateProfile: vi.fn(async () => {
        throw new ApiProblem(422, 'invalid', 'secret provider detail', null, [{ location: ['body', 'timezone'] }]);
      }),
    });
    renderOnboarding(api);
    fillBirth();
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de perfil' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('fuso horário'));
    expect(document.body.textContent).not.toContain('secret provider detail');
  });
});
