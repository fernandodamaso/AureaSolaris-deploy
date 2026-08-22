# Vercel web runbook

The web project is managed with the authenticated Vercel CLI and the
deployment mirror. Do not store provider tokens or environment values in this
repository.

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

The current hosted candidate uses mirror `preview` and must match the API
preview SHA before browser checks. Production `main` remains the verified
upstream object until the normal merge gate advances it.

## Browser-safe variables

Preview and production each contain only these public variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUREA_API_URL`

Preview points to the preview Supabase project, preview API branch alias, and
the preview web origin. Production points to the production Supabase project,
the production API domain, and the canonical web origin. The anon key is a
browser-safe public key; never place a service-role key or database URL in a
`VITE_` variable.

## Verification

1. Compare upstream `main`, mirror `main`, and the selected mirror `preview`
   object before deployment.
2. Confirm the Vercel deployment metadata has the expected mirror repository,
   branch, and exact SHA.
3. Run the local Web V1 quality gate and hosted build.
4. Fetch the protected preview with the authenticated local Vercel CLI.
5. Check the API CORS preflight from the exact preview web origin and run the
   API smoke against the matching preview deployment.

The hosted ownership test also requires the canonical production Supabase origin
`https://tgpcpxqqusehssaihvcp.supabase.co`. The wrapper rejects any other value
before browser startup; one trailing slash is normalized. The browser test then
asserts that no request reached that origin. The public sign-up assertion reads
`/auth/v1/settings`; it does not submit a sign-up request or create an Auth user.

Keep deployment protection enabled. Use a short-lived local CLI bypass only for
verification; do not add it to GitHub Actions or commit it.

## Protected hosted acceptance on Windows

Load the approved short-lived values into the current PowerShell process through the secure provider/secret-store path. Do not place their values in a command string. Then invoke Git Bash directly so it inherits the environment:

```powershell
$requiredNames = @(
  'AUREA_E2E_URL', 'AUREA_E2E_API_URL', 'AUREA_E2E_EMAIL',
  'AUREA_E2E_PASSWORD', 'AUREA_E2E_SECOND_JWT',
  'AUREA_VERCEL_WEB_PROTECTION_BYPASS',
  'AUREA_VERCEL_API_PROTECTION_BYPASS',
  'AUREA_EXPECTED_PREVIEW_SHA', 'AUREA_VERCEL_SCOPE',
  'SUPABASE_PREVIEW_URL', 'SUPABASE_PREVIEW_ANON_KEY',
  'AUREA_PRODUCTION_SUPABASE_URL'
)
$missingNames = $requiredNames | Where-Object { -not (Test-Path "Env:$_") }
if ($missingNames) { throw "Missing secure environment names: $($missingNames -join ', ')" }
& 'C:\Program Files\Git\bin\bash.exe' scripts/verify_preview.sh
if ($LASTEXITCODE -ne 0) { throw 'Hosted preview verification failed.' }
```

Use Git Bash on Windows. Do not use WSL to launch Windows Node because WSL does not forward arbitrary Linux environment variables to Windows child processes.
