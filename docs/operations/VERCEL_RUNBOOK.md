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

Keep deployment protection enabled. Use a short-lived local CLI bypass only for
verification; do not add it to GitHub Actions or commit it.
