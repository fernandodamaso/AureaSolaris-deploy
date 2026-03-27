import { Planet, Aspect } from '../components/MandalaChart';
import { getAspectOrbs } from './astro-settings';

export const calculateTransitAspects = (
  transitPlanets: Planet[],
  natalPlanets: Planet[]
): Aspect[] => {
  const aspects: Aspect[] = [];
  const ASPECT_CONFIG = Object.values(getAspectOrbs());

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
            symbol: asp.symbol,
            orb: distFromAngle,
          });
          break;
        }
      }
    }
  }

  return aspects;
};
