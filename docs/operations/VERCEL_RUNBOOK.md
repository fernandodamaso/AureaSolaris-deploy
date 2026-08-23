# Vercel web runbook

The Web V1 frontend is hosted by Vercel and sourced from the deployment-only mirror. Do not store provider tokens, protection bypasses, database credentials, or environment values in this repository.

## Project contract

| Setting | Required value |
| --- | --- |
| Project | `aurea-solaris` |
| Project ID | `prj_C1TUgYA4YskaBbxX27EYWoEV46Cr` |
| Git source | `fernandodamaso/AureaSolaris-deploy` |
| Root directory | `apps/web` |
| Production branch | `main` |
| Canonical domain | `https://aurea-solaris.vercel.app` |
| Build | `npm run build` |
| Output | `dist` |

`vivicabsb-eng/AureaSolaris` is the development source of truth. The deployment mirror is not a development checkout and must receive only an exact SHA already validated under an approved promotion issue.

Railway is not part of Web V1.

## Browser-safe variables

Preview and production contain only the browser-safe public configuration required by the frontend contract:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUREA_API_URL`

Preview points to the preview Supabase project and the matching API preview. Production points to the production Supabase project, canonical API domain, and canonical web origin. Never place a service-role key, database credential, private key, provider token, or protection bypass in a `VITE_` variable.

## Exact-SHA verification

Before accepting or promoting a web deployment:

1. Resolve the current upstream development SHA.
2. Resolve the exact deployment-mirror SHA/ref authorized by the issue.
3. Confirm any upstream/mirror difference is intentional; do not mutate the mirror merely to eliminate the difference.
4. Inspect the Vercel deployment metadata and require repository `fernandodamaso/AureaSolaris-deploy`, the expected ref, and exact 40-character Git SHA.
5. Require a `READY` deployment before browser acceptance.
6. Resolve the supplied preview/canonical alias to that inspected deployment rather than trusting the alias name.
7. Pair the web deployment with a compatible API deployment for the same candidate/contract.
8. Run the issue-required build, health, CORS, ownership, and browser checks.
9. Resolve aliases again after the gate; an alias moving during verification invalidates the evidence.

Production is whatever exact deployment is currently receiving the canonical alias. Upstream `main` may be newer than production when a newer commit has intentionally not been promoted.

## Hosted preview acceptance

`scripts/verify_preview.sh` and `scripts/verify_vercel_preview.py` are the repository verification entry points. The verifier binds preview aliases to unique READY deployments at the expected SHA and refuses the canonical production host for preview tests.

Protected preview credentials, synthetic identity credentials, and bypass values are process-only secrets. Load them from approved secure provider/secret-store paths without embedding their values in command strings, source, logs, screenshots, PRs, Linear, or chat.

On Windows, invoke Git Bash directly after the approved environment names have been loaded securely into the process:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' scripts/verify_preview.sh
if ($LASTEXITCODE -ne 0) { throw 'Hosted preview verification failed.' }
```

Do not weaken Deployment Protection just to make automation simpler.

## Production verification

For a production promotion/cutover issue, record only sanitized evidence:

- upstream SHA;
- deployment-mirror SHA;
- Vercel deployment ID/immutable URL and recorded Git SHA;
- canonical alias;
- web `/` HTTP status;
- matching API deployment/health evidence.

A branch name or successful build alone is insufficient proof.

## Rollback

Rollback is coordinated with the API project; do not roll the frontend to an arbitrary older deployment without confirming API/environment compatibility.

Use [`INCIDENT_AND_ROLLBACK.md`](INCIDENT_AND_ROLLBACK.md). Depending on plan/capability, Vercel can point production traffic to a previous deployment using the provider rollback function or by promoting a known-good existing deployment. Inspect the exact target deployment first and verify aliases/health afterward.

Application rollback must not perform destructive user-data actions.