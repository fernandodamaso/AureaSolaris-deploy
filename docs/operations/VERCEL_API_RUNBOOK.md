# Vercel API runbook

The API project is managed with the authenticated Vercel CLI. No Vercel token is stored in the repository or printed by these steps.

## Project contract

| Setting | Required value |
| --- | --- |
| Project | `aurea-solaris-api` |
| Project ID | `prj_3H3DPEhPoX19GYyew7w1UkVgxRsS` |
| Git source | `fernandodamaso/AureaSolaris-deploy` |
| Root directory | `services/api` |
| Production branch | `main` |
| Runtime | Python `>=3.12,<3.13` |

The deployment mirror is not a development checkout. Deploy only an exact verified mirror object. The current verified baseline is `6ddda7627e9634e91fa303e296dec79fd93b9340`; confirm the upstream and mirror refs again before every deployment.

The API bundle includes the canonical editorial governance snapshot at
`services/api/knowledge/editorial_current.sqlite`. Its SHA-256 is
`91cf0d23d0fb8869fd802eac1567ff3e22563fcca563e60b9f74f490f6efbcbd`; keep it
byte-identical to `knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite`.

## Environment separation

The project has separate `preview` and `production` values for the six server variables defined in [`ENVIRONMENTS.md`](ENVIRONMENTS.md):

- `AUREA_ENVIRONMENT`
- `AUREA_SUPABASE_URL`
- `AUREA_JWT_AUDIENCE`
- `AUREA_DATABASE_URL` (sensitive)
- `AUREA_ALLOWED_ORIGINS`
- `AUREA_EPHEMERIS_PATH`

The database URL uses the dedicated environment role through the assigned
Supavisor session pooler `aws-0-sa-east-1.pooler.supabase.com`, port `5432`,
database `postgres`. The direct `db.<ref>.supabase.co` host is IPv6-only and is
not valid for this Vercel runtime. Its password is generated and stored only as
a sensitive Vercel environment value. The role bypasses RLS because the trusted
API enforces the authenticated owner ID; browser clients never receive this
credential.

Preview uses the approved preview Supabase ref and an approved Vercel web preview
origin. Production uses the approved production Supabase ref and the canonical
web origin `https://aurea-solaris.vercel.app`. Do not copy a production value
into preview or vice versa.

## Deployment and smoke

Deploy from the exact mirror SHA with the Vercel CLI. Record only the deployment ID, URL, target, and exact SHA. Never record environment values or request bodies.

Before any network or browser check, bind both preview URLs to the exact expected
SHA. `scripts/verify_preview.sh` calls
`scripts/verify_vercel_preview.py --project aurea-solaris` and
`--project aurea-solaris-api`. Each call requires exactly one READY deployment for
that project with the expected 40-character Git SHA and `preview` target, then
inspects the supplied URL or alias and requires the same resolved deployment URL.
The verifier rejects the canonical production host. The wrapper exports the URLs
only after both project checks pass; stop on any mismatch.

```bash
: "${AUREA_E2E_URL:?required}"
: "${AUREA_E2E_API_URL:?required}"
: "${AUREA_EXPECTED_PREVIEW_SHA:?required}"
: "${AUREA_VERCEL_SCOPE:?required}"
```

The wrapper also requires these process-only names: `AUREA_E2E_EMAIL`,
`AUREA_E2E_PASSWORD`, `AUREA_E2E_SECOND_JWT`,
`AUREA_VERCEL_WEB_PROTECTION_BYPASS`, `AUREA_VERCEL_API_PROTECTION_BYPASS`,
`SUPABASE_PREVIEW_URL`, `SUPABASE_PREVIEW_ANON_KEY`, and
`AUREA_PRODUCTION_SUPABASE_URL`. Keep their values in the secure execution
environment. Never place them in command arguments, source, logs, or this runbook.

Only after both deployment comparisons succeed, run the wrapper. It performs API
health and ownership checks, confirms disabled public sign-up against the approved
preview Supabase project, and then starts the non-destructive browser ownership test:

```bash
bash scripts/verify_preview.sh
```

The script prints status only. It does not run against production.

## Failure boundaries

- A `503 service_not_ready` response is a safe readiness result until concrete database and engine probes are enabled by the application contract.
- Do not deploy a candidate SHA that is not present on the verified mirror ref.
- Do not add a Vercel bypass secret to GitHub Actions.
- Do not add Railway configuration or a Docker runtime requirement.
