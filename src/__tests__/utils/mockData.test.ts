import { describe, it, expect } from 'vitest';
import { MOCK_ASTRO_DATA, MOCK_AGENT_RESPONSES, getMockResponse } from '../../utils/mockData';

describe('MOCK_ASTRO_DATA', () => {
  it('has all 10 planets', () => {
    const planets = Object.keys(MOCK_ASTRO_DATA.planets);
    expect(planets).toHaveLength(10);
    expect(planets).toContain('Sun');
    expect(planets).toContain('Moon');
    expect(planets).toContain('Pluto');
  });

  it('each planet has degree, sign, and retrograde', () => {
    for (const planet of Object.values(MOCK_ASTRO_DATA.planets)) {
      expect(planet).toHaveProperty('degree');
      expect(planet).toHaveProperty('sign');
      expect(planet).toHaveProperty('retrograde');
      expect(typeof planet.degree).toBe('number');
      expect(typeof planet.sign).toBe('string');
    }
  });

  it('has aspects with expected structure', () => {
    expect(MOCK_ASTRO_DATA.aspects.length).toBeGreaterThan(0);
    for (const aspect of MOCK_ASTRO_DATA.aspects) {
      expect(aspect).toHaveProperty('p1');
      expect(aspect).toHaveProperty('p2');
      expect(aspect).toHaveProperty('type');
      expect(aspect).toHaveProperty('orb');
    }
  });

  it('has 12 houses', () => {
    expect(MOCK_ASTRO_DATA.houses).toHaveLength(12);
  });
});

describe('getMockResponse', () => {
  it('returns a string for known agents', () => {
    for (const agent of ['Rafiki', 'Alfred', 'Uncle Duck', 'Stark', 'Dr. Strange']) {
      const response = getMockResponse(agent);
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }
  });

  it('falls back to Rafiki for unknown agents', () => {
    const response = getMockResponse('UnknownAgent');
    expect(MOCK_AGENT_RESPONSES['Rafiki']).toContain(response);
  });
});
