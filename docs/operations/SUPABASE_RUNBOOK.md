# Supabase environment runbook

This runbook is for the two approved Aurea Solaris Web V1 environments. It uses the authenticated Supabase CLI and supported Supabase APIs. It never stores or prints passwords, service-role keys, birth data, or access tokens.

## Projects

| Environment | Project | Ref | Region | Required state |
| --- | --- | --- | --- | --- |
| Preview | `aurea-solaris-preview` | `rosklqnnbmhowohoyboj` | `sa-east-1` | `ACTIVE_HEALTHY` |
| Production | `aurea-solaris-production` | `tgpcpxqqusehssaihvcp` | `sa-east-1` | `ACTIVE_HEALTHY` |

The inactive `buddy` project is unrelated. Do not create a duplicate project.

## Migration and schema

The committed migration is [`supabase/migrations/202608150001_web_v1_core.sql`](../../supabase/migrations/202608150001_web_v1_core.sql). Its SHA-256 is:

`42d3b1f57a52ae3fff45a0086075518a18d8924f6deb5cf7d5b1143aef46dcb2`

Apply the exact file to preview first, verify it, then apply the same file to production. The hosted migration history records the execution name `web_v1_core` and provider execution versions. Do not repair or rewrite hosted history to force the committed timestamp.

Required tables and policies:

- `profiles` with `profiles_owner_all`
- `birth_profiles` with `birth_profiles_owner_all`
- `calculation_receipts` with `calculation_receipts_owner_all`

All three tables must have RLS enabled. Each owner policy is for `authenticated` and checks `auth.uid()` for both reads/writes.

## Auth policy

- Email/password is enabled in both projects.
- Public self-sign-up is disabled in both projects.
- Email confirmation remains provider-controlled (`mailer_autoconfirm` is not enabled).
- Preview may have the disposable E2E identity. Its credentials are stored only under the existing secure secret names `AUREA_PREVIEW_E2E_EMAIL` and `AUREA_PREVIEW_E2E_PASSWORD`.
- Production keeps only the approved human identity. The production password is created or reset by the owner through the normal Supabase Auth flow. It is never a CI, Vercel, Git, Linear, log, or chat secret.

Auth user creation, deletion, and reset use the supported Auth Admin API from a trusted process. Never insert into or edit `auth.users` directly.

## Verification

Run from the repository root:

```bash
bash scripts/verify_supabase_environment.sh
```

The command checks the committed migration hash, project health, hosted migration history, Auth settings, and RLS/policy state. It prints only project refs, migration versions and hashes, table/policy names, and counts. It does not print API keys.

All repository verifier scripts probe each Python launcher by executing
`--version` before selection. This avoids the disabled Windows Store alias
and falls back to the next working launcher. Supabase Auth headers use standard
input and do not place publishable or service-role values in process arguments.

For an unattended identity-count check, provide service-role credentials through the secure execution environment only. The variable names are `SUPABASE_SERVICE_ROLE_KEY_PREVIEW` and `SUPABASE_SERVICE_ROLE_KEY_PRODUCTION`; do not commit them or put them in a browser, workflow file, Linear, logs, or chat. The production check fails unless exactly one Auth user exists.

After a schema change, run the Supabase security advisors for both refs and record only the advisory names and remediation state. The current remaining advisory is the provider's leaked-password-protection recommendation; enabling it is a separate Auth security decision and does not change this migration.

## Safe operating rules

1. Run a sanitized preflight before each provider mutation.
2. Apply and verify preview before production.
3. Use the committed migration only. Do not use ad-hoc SQL for product schema.
4. Keep preview and production refs separate in every command.
5. Never copy a secret into source, logs, screenshots, tickets, or chat.
