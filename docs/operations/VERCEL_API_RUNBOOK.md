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

## Environment separation

The project has separate `preview` and `production` values for the six server variables defined in [`ENVIRONMENTS.md`](ENVIRONMENTS.md):

- `AUREA_ENVIRONMENT`
- `AUREA_SUPABASE_URL`
- `AUREA_JWT_AUDIENCE`
- `AUREA_DATABASE_URL` (sensitive)
- `AUREA_ALLOWED_ORIGINS`
- `AUREA_EPHEMERIS_PATH`

The database URL uses a dedicated `aurea_api` database role in each Supabase project. Its password is generated and stored only as a sensitive Vercel environment value. The role bypasses RLS because the trusted API enforces the authenticated owner ID; browser clients never receive this credential.

Preview uses the preview Supabase ref and API origin. Production uses the production Supabase ref and the canonical web origin `https://aurea-solaris.vercel.app`. Do not copy a production value into preview or vice versa.

## Deployment and smoke

Deploy from the exact mirror SHA with the Vercel CLI. Record only the deployment ID, URL, target, and exact SHA. Never record environment values or request bodies.

Run the smoke script with a short-lived preview JWT held in the process environment:

```bash
AUREA_SMOKE_JWT="$SHORT_LIVED_PREVIEW_JWT" bash scripts/smoke_api.sh https://aurea-solaris-api.vercel.app
```

For the certified Swiss Ephemeris check, use an isolated preview identity and synthetic birth profile only:

```bash
AUREA_SMOKE_JWT="$SHORT_LIVED_PREVIEW_JWT" AUREA_SMOKE_ASTROLOGY=1 bash scripts/smoke_api.sh https://aurea-solaris-api.vercel.app
```

The script checks `/health`, fail-closed `/ready`, safe unauthenticated `401`, authenticated `/v1/me`, and (when requested) the real astrology route. It prints status and engine metadata only. It never prints the JWT, response bodies, birth payload, or database credential. It does not run against production.

## Failure boundaries

- A `503 service_not_ready` response is a safe readiness result until concrete database and engine probes are enabled by the application contract.
- Do not deploy a candidate SHA that is not present on the verified mirror ref.
- Do not add a Vercel bypass secret to GitHub Actions.
- Do not add Railway configuration or a Docker runtime requirement.
