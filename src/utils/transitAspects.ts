import { Planet, Aspect } from '../components/MandalaChart';

const ASPECT_CONFIG = [
  { type: 'Conjunção', angle: 0, orb: 8.0 },
  { type: 'Oposição', angle: 180, orb: 8.0 },
  { type: 'Trígono', angle: 120, orb: 8.0 },
  { type: 'Quadratura', angle: 90, orb: 6.0 },
  { type: 'Sextil', angle: 60, orb: 4.0 },
  { type: 'Quincúncio', angle: 150, orb: 3.0 },
];

export const calculateTransitAspects = (
  transitPlanets: Planet[],
  natalPlanets: Planet[]
): Aspect[] => {
  const aspects: Aspect[] = [];

  for (const t of transitPlanets) {
    for (const n of natalPlanets) {
      if (t.name === 'ASC' || t.name === 'MC' || n.name === 'ASC' || n.name === 'MC') continue;

      const diff = Math.abs(t.degree - n.degree) % 360;
      const dist = diff > 180 ? 360 - diff : diff;

      for (const asp of ASPECT_CONFIG) {
        const distFromAngle = Math.abs(dist - asp.angle);
        if (distFromAngle < asp.orb) {
          aspects.push({
            p1: t.name,
            p2: n.name,
            type: asp.type,
            symbol: getAspectSymbol(asp.type),
            orb: distFromAngle,
          });
          break;
        }
      }
    }
  }

  return aspects;
};

function getAspectSymbol(type: string): string {
  const symbols: Record<string, string> = {
    'Conjunção': '☌',
    'Oposição': '☍',
    'Trígono': '△',
    'Quadratura': '□',
    'Sextil': '＊',
    'Quincúncio': '⚹',
  };
  return symbols[type] || '?';
}
