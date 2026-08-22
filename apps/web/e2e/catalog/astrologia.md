# Astrologia

## astrologia-certified-natal

- feature: Astrologia
- steps: Open the natal provenance receipt.
- assert: The receipt shows UTC, IANA timezone, input hash, and declared ephemeris.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: `e2e/playbooks/mandala.md`
- seed: private Web V1 birth profile

## astrologia-retry

- feature: Astrologia
- steps: Force recalculation of the natal map.
- assert: The natal provenance remains visible and the input hash is declared.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: private Web V1 birth profile

## astrologia-certified-transit

- feature: Astrologia
- steps: Open the current-transits provenance receipt.
- assert: The transit receipt shows a declared input hash and ephemeris.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: private Web V1 birth profile
