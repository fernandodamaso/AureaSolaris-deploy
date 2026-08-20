export const GENERIC_LOGIN_ERROR = 'E-mail ou senha inválidos.';

export function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Use uma senha com pelo menos 12 caracteres.';
  return null;
}
