export interface Planet {
  name: string;
  degree: number;
  sign?: string;
  color?: string;
  symbol?: string;
  retrograde?: boolean;
  isAngle?: boolean;
  stationary?: boolean;
  applying?: boolean;
  speed?: number;
  house?: number;
}

export interface House {
  house: number;
  degree: number;
  sign?: string;
}

export interface Aspect {
  p1: string;
  p2: string;
  type: string;
  orb: number;
  symbol: string;
}

export interface MandalaChartProps {
  size?: number;
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
  transitPlanets?: Planet[];
  transitAspects?: Aspect[];
  showPanel?: boolean;
  calculationCertified?: boolean;
}

export interface MandalaLayout {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  degreeRadius: number;
  signRadius: number;
  decanateRadius: number;
  termRadius: number;
  houseRadius: number;
  planetRadius: number;
  aspectRadius: number;
  transitRadius: number;
}

export interface MandalaPlanetPosition {
  degree: number;
  house?: number;
}
