/**
 * Medical/astrological correspondences are intentionally not shipped as
 * product facts. They belong to the externally audited Engineering Astral
 * knowledge base and will be versioned before they can appear here.
 */
export interface MedicalPlanet {
  name: string;
  organ: string;
  chakra: string;
  herbs: string[];
  frequency: string;
  imbalance: string;
  remedy: string;
}

export const MEDICAL_ASTROLOGY: Record<string, MedicalPlanet> = {};

export function getMedicalPlanetInfo(_planet: string): MedicalPlanet | null {
  return null;
}

export function getLunarAlchemyAdvice(_moonSign: string): string | null {
  return null;
}
