# Supabase environment runbook

This runbook covers the approved Aurea Solaris Private Web V1 Supabase environments. Supabase owns Auth, Postgres, and Row Level Security (RLS); Vercel owns the web/API runtime. Railway is not part of Web V1.

Use authenticated Supabase tooling/provider APIs without storing or printing passwords, service-role keys, database connection strings, birth data, or access tokens.

## Projects

| Environment | Project | Ref | Region | Required state |
| --- | --- | --- | --- | --- |
| Preview | `aurea-solaris-preview` | `rosklqnnbmhowohoyboj` | `sa-east-1` | `ACTIVE_HEALTHY` |
| Production | `aurea-solaris-production` | `tgpcpxqqusehssaihvcp` | `sa-east-1` | `ACTIVE_HEALTHY` |

The inactive `buddy` project is unrelated. Do not create a duplicate project.

## Source and deployment ownership

The schema source of truth is committed under `supabase/` in `vivicabsb-eng/AureaSolaris`. `fernandodamaso/AureaSolaris-deploy` is an exact-SHA deployment mirror, not an alternate schema-development repository.

Schema/provider operations that are already approved by an issue may be performed autonomously by the agent, but the agent must stop for destructive user-data actions, ambiguous project identity, or any request that requires exposing/providing a secret value.

## Migration and schema

The committed Web V1 core migration is [`../../supabase/migrations/202608150001_web_v1_core.sql`](../../supabase/migrations/202608150001_web_v1_core.sql). Apply committed migrations to preview first, verify them, then apply the same reviewed migration set to production when the issue authorizes production mutation.

Do not repair or rewrite hosted migration history merely to make identifiers look prettier. Do not use ad-hoc destructive SQL to bypass a failed migration or application incident.

Required private tables/policies for Web V1 include:

- `profiles` with `profiles_owner_all`
- `birth_profiles` with `birth_profiles_owner_all`
- `calculation_receipts` with `calculation_receipts_owner_all`

All private tables have RLS enabled. The authenticated owner policy uses the authenticated Supabase identity for both visibility and writes; any broader role/predicate or missing write check is a security failure.

## Auth policy

- Email/password is enabled in both approved projects.
- Public self-sign-up remains disabled unless a separate product/security contract changes it.
- Preview may contain disposable E2E identities whose credentials live only in approved secret storage.
- Production identity operations use supported Supabase Auth APIs/provider controls; never insert into or edit Auth system tables directly.
- Passwords, reset links, service-role keys, JWTs, and private Auth metadata are never completion evidence.

## Owner isolation contract

Private application data is never selected by a trusted `owner_id` supplied by the browser.

1. Browser authenticates through Supabase Auth.
2. FastAPI validates the token and derives the owner identity.
3. API repositories scope private reads/writes to that owner.
4. RLS independently constrains each private table to the authenticated `user_id`.
5. Owner-aware relationships prevent cross-owner references.

Future multi-user expansion keeps these rules. Any owner-boundary change must be tested with at least two synthetic identities proving both allowed self-access and denied cross-owner access/modification/reference.

## Disposable schema/RLS validation

From the source-of-truth repository root, the repository quality gate starts a disposable local Supabase environment, resets the schema, runs database tests, and executes repository isolation checks:

```bash
npm run quality:schema
```

The complete gate is:

```bash
npm run quality:gate
```

Disposable validation must not use production data, production credentials, real person records, historical local databases, or backups.

## Hosted verification

The hosted environment verifier checks project health, committed migrations/history, Auth settings, and RLS/policy state while printing only sanitized identifiers, hashes/names, and counts.

For unattended checks that require privileged provider access, load service-role credentials through the approved secure execution environment. Do not place secret values in browser configuration, workflow source, process arguments, Git, Linear, logs, screenshots, or chat.

After a schema/security change, inspect Supabase security advisors for both approved refs and record only advisory names/status/remediation—not credentials or private data.

## Safe operating rules

1. Confirm preview/production project identity before provider mutation.
2. Run a sanitized preflight before each mutation.
3. Apply and verify preview before production unless the approved incident contract explicitly requires a safe production-only response.
4. Use committed migrations; do not improvise destructive schema repair.
5. Keep preview and production configuration separate.
6. Never disable RLS to make an application/test failure disappear.
7. Never delete users or private rows as part of an application rollback.
8. Record only sanitized evidence.

## Incident and secret rotation boundary

Application rollback is handled at the Vercel layer and does not roll Postgres data backward. If a secret may be compromised, rotate/revoke it in the owning provider, update dependent secure environment bindings, verify a candidate, and retire the old value without exposing either value.

If database integrity itself is suspected, stop application writes/public access as safely as provider controls allow and open a separate data-recovery incident contract. Do not restore or rewrite private data under a generic web/API rollback procedure.

See [`INCIDENT_AND_ROLLBACK.md`](INCIDENT_AND_ROLLBACK.md).