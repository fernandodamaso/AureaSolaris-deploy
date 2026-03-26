import { describe, it, expect } from 'vitest';
import { calculateTransitAspects } from '../../utils/transitAspects';
import { Planet } from '../../components/MandalaChart';

const makePlanet = (name: string, degree: number): Planet => ({
  name,
  degree,
  sign: 'Áries',
  color: '#fff',
});

describe('calculateTransitAspects', () => {
  it('detects conjunction when planets are at the same degree', () => {
    const transit = [makePlanet('Sun', 10)];
    const natal = [makePlanet('Moon', 10)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Conjunção');
    expect(aspects[0].p1).toBe('Sun');
    expect(aspects[0].p2).toBe('Moon');
    expect(aspects[0].symbol).toBe('☌');
  });

  it('detects opposition at 180 degrees', () => {
    const transit = [makePlanet('Sun', 10)];
    const natal = [makePlanet('Moon', 190)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Oposição');
  });

  it('detects trine at 120 degrees', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 120)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Trígono');
  });

  it('detects square at 90 degrees', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 90)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Quadratura');
  });

  it('detects sextile at 60 degrees', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 60)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Sextil');
  });

  it('detects quincunx at 150 degrees', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 150)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Quincúncio');
  });

  it('calculates orb correctly', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 5)]; // 5° from conjunction
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Conjunção');
    expect(aspects[0].orb).toBeCloseTo(5, 1);
  });

  it('ignores ASC in transit planets', () => {
    const transit = [makePlanet('ASC', 10)];
    const natal = [makePlanet('Moon', 10)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(0);
  });

  it('ignores MC in transit planets', () => {
    const transit = [makePlanet('MC', 10)];
    const natal = [makePlanet('Moon', 10)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(0);
  });

  it('ignores ASC in natal planets', () => {
    const transit = [makePlanet('Sun', 10)];
    const natal = [makePlanet('ASC', 10)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(0);
  });

  it('ignores MC in natal planets', () => {
    const transit = [makePlanet('Sun', 10)];
    const natal = [makePlanet('MC', 10)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(0);
  });

  it('returns no aspect when outside orb', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 12)]; // 12° > 8° conjunction orb
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(0);
  });

  it('handles degree wrapping correctly (0/360 boundary)', () => {
    const transit = [makePlanet('Sun', 358)];
    const natal = [makePlanet('Moon', 2)];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Conjunção');
  });

  it('detects multiple aspects across multiple planet pairs', () => {
    const transit = [
      makePlanet('Sun', 0),
      makePlanet('Moon', 90),
    ];
    const natal = [
      makePlanet('Mercury', 3), // 3° from Sun → conjunction
      makePlanet('Venus', 60), // 60° from Sun → sextile
    ];
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects.length).toBeGreaterThanOrEqual(2);
    expect(aspects.some(a => a.p1 === 'Sun' && a.p2 === 'Mercury' && a.type === 'Conjunção')).toBe(true);
    expect(aspects.some(a => a.p1 === 'Sun' && a.p2 === 'Venus' && a.type === 'Sextil')).toBe(true);
  });

  it('prefers tighter aspect over wider orb aspect', () => {
    const transit = [makePlanet('Sun', 0)];
    const natal = [makePlanet('Moon', 125)]; // 5° orb from trine
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Trígono');
  });

  it('handles opposition wrapping across 0/360 boundary', () => {
    const transit = [makePlanet('Sun', 10)];
    const natal = [makePlanet('Moon', 190)]; // 180° apart
    const aspects = calculateTransitAspects(transit, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('Oposição');
  });
});
