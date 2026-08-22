import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V1Navigation, resolveV1Page } from '../V1Navigation';

describe('V1Navigation', () => {
  it('renders only the scoped Astrology destination', () => {
    render(<V1Navigation currentPage="astrologia" onNavigate={vi.fn()} collapsed={false} />);

    expect(screen.getByTitle('Astrologia')).toBeTruthy();
    expect(screen.queryByTitle('Agenda Preditiva')).toBeNull();
    expect(screen.queryByTitle('Caderno Vivo')).toBeNull();
    expect(screen.queryByTitle('Memórias')).toBeNull();
  });

  it('normalizes any legacy or deep-link value to Astrology', () => {
    expect(resolveV1Page('agenda')).toBe('astrologia');
    expect(resolveV1Page('mesa-criacao')).toBe('astrologia');
    expect(resolveV1Page(undefined)).toBe('astrologia');
  });

  it('reports the scoped destination when selected', () => {
    const onNavigate = vi.fn();
    render(<V1Navigation currentPage="astrologia" onNavigate={onNavigate} collapsed={false} />);
    fireEvent.click(screen.getByTitle('Astrologia'));
    expect(onNavigate).toHaveBeenCalledWith('astrologia');
  });
});
