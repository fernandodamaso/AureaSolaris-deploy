import { expect, afterEach, beforeEach, describe, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginView } from '../LoginView';

const { signIn } = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ signIn }),
}));

describe('LoginView', () => {
  beforeEach(() => {
    signIn.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes accessible email and password fields only', () => {
    render(<LoginView />);

    expect(screen.getByLabelText('E-mail')).toHaveProperty('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveProperty('type', 'password');
    expect(screen.queryByText(/inscrever|esqueci|perfil|teste/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /inscrever|esqueci|perfil|teste/i })).toBeNull();
  });

  it('submits when Enter is pressed, trims email, and keeps password unchanged', async () => {
    render(<LoginView />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: '  person@example.test  ' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '  unchanged password  ' } });
    fireEvent.keyDown(screen.getByLabelText('Senha'), { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de entrada' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('person@example.test', '  unchanged password  '));
  });

  it('disables duplicate submission while sign-in is pending', async () => {
    let resolve: ((value: { ok: true }) => void) | undefined;
    signIn.mockImplementation(() => new Promise<{ ok: true }>((finish) => { resolve = finish; }));
    render(<LoginView />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de entrada' }));

    expect(screen.getByRole('button', { name: 'Entrando…' })).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('E-mail')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Senha')).toHaveProperty('disabled', true);
    expect(signIn).toHaveBeenCalledTimes(1);

    resolve?.({ ok: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toHaveProperty('disabled', false));
  });

  it('shows one generic Portuguese error and clears the password after failure', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'invalid_credentials' });
    render(<LoginView />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret-not-rendered' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de entrada' }));

    expect((await screen.findByRole('alert')).textContent).toContain('E-mail ou senha inválidos.');
    expect(screen.getByLabelText('Senha')).toHaveProperty('value', '');
    expect(document.body.textContent).not.toContain('secret-not-rendered');
  });
});
