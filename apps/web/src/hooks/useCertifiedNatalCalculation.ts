import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../api/provider';
import { AstrologyApiError, requestNatal } from '../services/astrologyApi';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import type { AstrologyCalculationRequest, CertifiedAstrologyResult } from '../types/astrology';

const ASPECT_MAP: Record<string, string> = {
  Conjunction: 'Conjunção',
  Opposition: 'Oposição',
  Trine: 'Trígono',
  Square: 'Quadratura',
  Sextile: 'Sextil',
  Quincunx: 'Quincúncio',
  Quintile: 'Quintil',
  BiQuintile: 'Bi-Quintil',
  SemiSextile: 'Semi-Sextil',
  SemiSquare: 'Semi-Quadratura',
  SesquiQuadrature: 'Sesqui-Quadratura',
};

function hasDisplayableNatalShape(value: CertifiedAstrologyResult): boolean {
  const requiredPoints = ['Sun', 'Moon', 'ASC', 'MC'];
  const hasDegree = (point: unknown) => {
    const degree = (point as { degree?: unknown } | null)?.degree;
    return typeof degree === 'number' && Number.isFinite(degree) && degree >= 0 && degree < 360;
  };

  return requiredPoints.every((name) => hasDegree(value?.planets?.[name])) &&
    Array.isArray(value?.houses) && value.houses.length === 12 &&
    value.houses.every((house: unknown) => hasDegree(house));
}

function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError');
}

export const useCertifiedNatalCalculation = (birthData?: AstrologyCalculationRequest, enabled = true) => {
  const api = useApiClient();
  const [data, setData] = useState<CertifiedAstrologyResult | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const birthDataKey = JSON.stringify(birthData ?? null);

  const calculate = useCallback(async (force = false, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const receipt = await requestNatal(api, signal, force);
      const parsed = receipt.result_payload as unknown as CertifiedAstrologyResult;
      const displayable = {
        ...parsed,
        aspects: parsed.aspects?.map((aspect) => ({
          ...aspect,
          type: ASPECT_MAP[aspect.type] || aspect.type,
        })),
      };

      if (displayable.error) {
        setError(displayable.error);
      } else if (!readCertifiedCalculation(displayable, 'natal')) {
        setError('O motor respondeu sem recibo auditável. Nenhuma mandala será exibida.');
      } else if (!hasDisplayableNatalShape(displayable)) {
        setError('O recibo natal não contém os pontos e casas necessários para desenhar uma mandala confiável.');
      } else {
        setData(displayable);
      }
    } catch (caught: unknown) {
      if (isAbortError(caught)) return;
      setError(caught instanceof AstrologyApiError
        ? caught.message
        : 'Não foi possível calcular o mapa natal. Tente novamente.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void calculate(false, controller.signal);
    return () => controller.abort();
  }, [birthDataKey, enabled, calculate]);

  const recalculate = useCallback(() => calculate(true), [calculate]);
  return { data, loading, error, recalculate };
};
