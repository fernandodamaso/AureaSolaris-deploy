# Vercel API runbook

The authenticated Web V1 API is hosted by Vercel and sourced from the deployment-only mirror. No Vercel token, database credential, JWT, password, protection bypass, or provider secret is stored in this repository or printed by these steps.

## Project contract

| Setting | Required value |
| --- | --- |
| Project | `aurea-solaris-api` |
| Project ID | `prj_3H3DPEhPoX19GYyew7w1UkVgxRsS` |
| Git source | `fernandodamaso/AureaSolaris-deploy` |
| Root directory | `services/api` |
| Production branch | `main` |
| Runtime | Python `>=3.12,<3.13` |

`vivicabsb-eng/AureaSolaris` is the development source of truth. The deployment mirror is not a development checkout. Deploy only an exact mirror object that was already validated and explicitly authorized for promotion.

Do not pin a volatile “current production SHA” in this runbook. Resolve and verify the live upstream, mirror, and Vercel metadata immediately before every deployment or rollback. An upstream/mirror difference can be intentional when no promotion was authorized.

Railway is not part of Web V1.

## Certified bundle boundary

The API bundle contains the certified astrology engine/assets and the governed editorial snapshot required by the service contract. Keep generated/packaged editorial artifacts byte-consistent with their governed source checks and preserve the existing certification tests. Do not change astrology behavior as part of deployment operations.

## Environment separation

Preview and production use separate values for the server variables defined in [`ENVIRONMENTS.md`](ENVIRONMENTS.md):

- `AUREA_ENVIRONMENT`
- `AUREA_SUPABASE_URL`
- `AUREA_JWT_AUDIENCE`
- `AUREA_DATABASE_URL` (secret)
- `AUREA_ALLOWED_ORIGINS`
- `AUREA_EPHEMERIS_PATH`

The database connection value belongs only in the secure Vercel environment. Preview uses the approved preview Supabase project and an exact preview web origin. Production uses the approved production Supabase project and the canonical web origin `https://aurea-solaris.vercel.app`. Do not copy production secrets into preview or vice versa.

The trusted API performs explicit owner-scoped database operations using the authenticated Supabase identity. Browser clients never receive the server database credential. Supabase RLS remains a separate defense-in-depth boundary for private tables.

## Exact-SHA deployment verification

Before any network or browser check, bind both hosted preview URLs to the exact expected candidate.

`scripts/verify_preview.sh` calls `scripts/verify_vercel_preview.py --project aurea-solaris` and the same verifier with `--project aurea-solaris-api`. Each call requires exactly one READY deployment for the expected project/ref with the expected 40-character Git SHA, then verifies that the supplied preview alias resolves to that deployment. The verifier rejects the canonical production host.

The wrapper requires the expected candidate and provider scope through the process-only names `AUREA_EXPECTED_PREVIEW_SHA` and `AUREA_VERCEL_SCOPE`. Load their values from the approved execution environment; do not hard-code them in this runbook.

The verification sequence is:

1. Resolve current `vivicabsb-eng/AureaSolaris:main`.
2. Resolve the exact mirror ref/SHA authorized for the candidate.
3. Inspect the Vercel API deployment and require `fernandodamaso/AureaSolaris-deploy`, expected ref, exact SHA, and `READY` state.
4. Bind the supplied API alias/URL to that inspected deployment.
5. Bind the web candidate independently and require a compatible candidate/environment.
6. Run API health/deployment-contract checks and the ownership browser gate required by the issue.
7. Resolve both aliases again after validation; alias movement during the gate invalidates the result.

## Secure hosted acceptance

The wrapper may require additional process-only names for synthetic preview identity credentials, Vercel protection bypasses, Supabase preview public configuration, and the production Supabase public origin used by the isolation guard. Load values from approved secure storage and keep them out of command arguments, source, logs, screenshots, PRs, Linear, and chat.

Only after both deployments have been bound to the exact expected candidate should the hosted wrapper run:

```bash
bash scripts/verify_preview.sh
```

The script is for non-destructive preview verification and must not be repointed to production private data.

## Production smoke

After an authorized production promotion, verify:

- deployment metadata repository/ref/SHA;
- canonical API alias;
- `/health` according to the current health contract;
- `/ready` according to the current readiness contract;
- canonical web health against the compatible frontend deployment.

A `503 service_not_ready` readiness response is a deliberate fail-closed state while concrete readiness probes are disabled by the application contract; do not misreport it as deployment provenance failure.

## Rollback

Coordinate rollback with the web project. Select a known-good API/web pair whose exact Git provenance and environment compatibility are known, then use the provider-supported traffic rollback/promotion mechanism described in [`INCIDENT_AND_ROLLBACK.md`](INCIDENT_AND_ROLLBACK.md).

Do not use rollback as an excuse to rewrite schema history, delete Auth users, restore a private database destructively, or expose credentials. Application rollback and user-data recovery are separate operations with separate contracts.