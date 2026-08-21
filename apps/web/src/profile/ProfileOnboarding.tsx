import { useState, type FormEvent } from 'react';
import { useApiClient } from '../api/provider';
import type { BirthProfileResponse, BirthProfileUpdate, ProfileResponse, ProfileUpdate } from '../api/client';
import { ApiProblem } from '../api/errors';

type OnboardingMode = 'profile' | 'birth-profile';

export interface ProfileOnboardingProps {
  mode: OnboardingMode;
  profile?: ProfileResponse;
  birthProfile?: BirthProfileResponse;
  onComplete: () => void | Promise<void>;
  onLogout: () => void;
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

function displayDate(value?: string): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function storageDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

function validTimezone(value: string): boolean {
  const timezone = value.trim();
  if (timezone === 'UTC') return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone.includes('/');
  } catch {
    return false;
  }
}

function coordinate(value: string, minimum: number, maximum: number): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function safeApiError(error: unknown): string {
  const fields = error instanceof ApiProblem
    ? error.fields
    : typeof error === 'object' && error !== null && Array.isArray((error as { fields?: unknown }).fields)
      ? (error as { fields: Array<{ location?: string[] }> }).fields
      : [];
  const location = fields[0]?.location?.join('.') ?? '';
  if (location.includes('display_name')) return 'Informe um nome para o perfil.';
  if (location.includes('birth_date')) return 'Verifique a data de nascimento.';
  if (location.includes('birth_time')) return 'Verifique a hora de nascimento.';
  if (location.includes('timezone')) return 'Verifique o fuso horário IANA.';
  if (location.includes('latitude')) return 'Verifique a latitude.';
  if (location.includes('longitude')) return 'Verifique a longitude.';
  if (location.includes('place')) return 'Informe o local de nascimento.';
  return 'Não foi possível salvar os dados. Tente novamente.';
}

export function ProfileOnboarding({ mode, profile, birthProfile, onComplete, onLogout }: ProfileOnboardingProps) {
  const api = useApiClient();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [locale, setLocale] = useState(profile?.locale ?? 'pt-BR');
  const [label, setLabel] = useState(birthProfile?.label ?? 'Meu nascimento');
  const [date, setDate] = useState(displayDate(birthProfile?.birth_date));
  const [time, setTime] = useState(birthProfile?.birth_time.slice(0, 5) ?? '');
  const [place, setPlace] = useState(birthProfile?.place ?? '');
  const [latitude, setLatitude] = useState(birthProfile?.latitude ?? '');
  const [longitude, setLongitude] = useState(birthProfile?.longitude ?? '');
  const [timezone, setTimezone] = useState(birthProfile?.timezone ?? profile?.timezone ?? DEFAULT_TIMEZONE);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const birthDate = storageDate(date);
    const lat = coordinate(latitude, -90, 90);
    const lon = coordinate(longitude, -180, 180);
    const hasBirthInput = [date, time, place, latitude, longitude].some((value) => value.trim().length > 0);
    const shouldSaveBirth = mode === 'birth-profile' || hasBirthInput;

    if (mode === 'profile' && !displayName.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (shouldSaveBirth && (!label.trim() || !birthDate || !time || !place.trim() || lat === null || lon === null || !validTimezone(timezone))) {
      setError('Revise os dados de nascimento.');
      return;
    }

    const birthPayload: BirthProfileUpdate | null = shouldSaveBirth && birthDate && lat !== null && lon !== null ? {
      label: label.trim(),
      birth_date: birthDate,
      birth_time: time,
      place: place.trim(),
      latitude: lat,
      longitude: lon,
      timezone: timezone.trim(),
      house_system: 'P',
    } : null;
    const profilePayload: ProfileUpdate = {
      display_name: displayName.trim(),
      locale: locale.trim() || 'pt-BR',
      timezone: timezone.trim(),
    };

    setError('');
    setIsSaving(true);
    try {
      if (mode === 'profile') await api.updateProfile(profilePayload);
      if (birthPayload) await api.updateBirthProfile(birthPayload);
      await onComplete();
    } catch (saveError) {
      setError(safeApiError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/40 p-4 font-sans" role="dialog" aria-modal="true" aria-labelledby="profile-onboarding-title">
      <form aria-label="Formulário de perfil" className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-2xl" onSubmit={handleSubmit} noValidate>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Aurea Solaris</p>
          <h1 id="profile-onboarding-title" className="mt-2 text-2xl font-black text-gray-800">
            {mode === 'profile' ? 'Configure seu perfil' : 'Adicione seus dados de nascimento'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">Seus dados ficam vinculados somente à sua conta privada.</p>
        </div>

        {mode === 'profile' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Nome
              <input aria-label="Nome do perfil" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" autoComplete="name" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Idioma
              <input aria-label="Idioma" value={locale} onChange={(event) => setLocale(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
          </div>
        )}

        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-5">
          <legend className="px-2 text-sm font-black text-gray-700">Dados de nascimento</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Rótulo
              <input aria-label="Rótulo do mapa" value={label} onChange={(event) => setLabel(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Data de nascimento
              <input aria-label="Data de nascimento" inputMode="numeric" placeholder="DD/MM/AAAA" value={date} onChange={(event) => setDate(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Hora local
              <input aria-label="Hora de nascimento" type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Local
              <input aria-label="Local de nascimento" value={place} onChange={(event) => setPlace(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Latitude
              <input aria-label="Latitude" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-gray-700">
              Longitude
              <input aria-label="Longitude" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-semibold text-gray-700">
            Fuso horário IANA
            <input aria-label="Fuso horário IANA" value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={isSaving} className="w-full rounded-lg border p-3" placeholder="America/Sao_Paulo" />
          </label>
          <p className="text-xs text-gray-500">Sistema de casas V1: Placidus.</p>
        </fieldset>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={onLogout} disabled={isSaving} className="rounded-lg border border-red-200 px-5 py-3 text-sm font-bold text-red-600">Sair</button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Salvando…' : 'Salvar e continuar'}</button>
        </div>
      </form>
    </div>
  );
}
