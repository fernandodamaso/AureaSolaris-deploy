import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculationEvidence } from '../../components/common/CalculationEvidence';

const meta = {
  receipt: {
    input_hash: 'verified-hash',
    engine: { name: 'aurea-solaris-astro-engine', version: '2026.08' },
    resolved_time: { utc: '2026-08-21T18:00:00Z', iana_timezone: 'UTC' },
    ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    zodiac: 'tropical',
  },
};

describe('CalculationEvidence', () => {
  it('uses the supplied accessible name for a receipt region', () => {
    render(
      <CalculationEvidence
        ariaLabel="Proveniência dos trânsitos atuais"
        meta={meta}
        loading={false}
      />,
    );

    expect(screen.getByRole('region', { name: 'Proveniência dos trânsitos atuais' })).toBeTruthy();
  });
});
