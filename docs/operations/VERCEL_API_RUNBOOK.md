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

The database URL uses a dedicated `aurea_api` database role in each Supabase project through the regional Supavisor session-pooler host. The direct `db.<ref>.supabase.co` host is IPv6-only and is not suitable for this Vercel runtime. Its password is generated and stored only as a sensitive Vercel environment value. The role bypasses RLS because the trusted API enforces the authenticated owner ID; browser clients never receive this credential.

Preview uses the preview Supabase ref and API origin. Production uses the production Supabase ref and the canonical web origin `https://aurea-solaris.vercel.app`. Do not copy a production value into preview or vice versa.

## Deployment and smoke

Deploy from the exact mirror SHA with the Vercel CLI. Record only the deployment ID, URL, target, and exact SHA. Never record environment values or request bodies.

Before any authenticated smoke, bind the URL to the exact expected preview SHA. The
deployment list must show a READY `aurea-solaris-api` preview deployment with the
expected `githubCommitSha` metadata, and `vercel inspect` must identify that same URL
and SHA. Stop if either check differs.

```bash
: "${AUREA_PREVIEW_API_URL:?Set the protected preview API deployment URL or alias}"
: "${AUREA_EXPECTED_PREVIEW_SHA:?Set the full candidate SHA}"
: "${AUREA_VERCEL_SCOPE:?Set the verified Vercel team scope}"
vercel list aurea-solaris-api --scope "$AUREA_VERCEL_SCOPE" --status READY \
  --meta "githubCommitSha=$AUREA_EXPECTED_PREVIEW_SHA"
vercel inspect "$AUREA_PREVIEW_API_URL" --scope "$AUREA_VERCEL_SCOPE"
export AUREA_VERIFIED_PREVIEW_API_URL="$AUREA_PREVIEW_API_URL"
```

Only after that comparison succeeds, run the smoke script with a short-lived preview
JWT held in the process environment:

```bash
AUREA_SMOKE_JWT="$SHORT_LIVED_PREVIEW_JWT" \
AUREA_VERCEL_PROTECTION_BYPASS="$LOCAL_ONLY_BYPASS" \
bash scripts/smoke_api.sh "$AUREA_VERIFIED_PREVIEW_API_URL"
```

For the certified Swiss Ephemeris check, use an isolated preview identity and synthetic birth profile only:

```bash
AUREA_SMOKE_JWT="$SHORT_LIVED_PREVIEW_JWT" \
AUREA_SMOKE_ASTROLOGY=1 \
AUREA_VERCEL_PROTECTION_BYPASS="$LOCAL_ONLY_BYPASS" \
bash scripts/smoke_api.sh "$AUREA_VERIFIED_PREVIEW_API_URL"
```

The script checks `/health`, fail-closed `/ready`, safe unauthenticated `401`, authenticated `/v1/me`, and (when requested) the real astrology route. It prints status and engine metadata only. Sensitive headers and the synthetic birth body use a curl configuration stream on standard input, so those input values do not enter child-process arguments. Curl stores response JSON only in a private temporary directory; the exit trap removes those files. The script never prints the JWT, response bodies, birth payload, or database credential, and it retains no response file. It does not run against production.

`LOCAL_ONLY_BYPASS` is a short-lived Vercel deployment-protection value supplied by
the authenticated local CLI. Keep it in the local process environment only; do not
commit it, add it to GitHub Actions, or record it in an issue.

## Failure boundaries

- A `503 service_not_ready` response is a safe readiness result until concrete database and engine probes are enabled by the application contract.
- Do not deploy a candidate SHA that is not present on the verified mirror ref.
- Do not add a Vercel bypass secret to GitHub Actions.
- Do not add Railway configuration or a Docker runtime requirement.
