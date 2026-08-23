# Incident and Rollback — Private Web V1

This runbook covers application/runtime incidents for Aurea Solaris Private Web V1. It is deliberately **non-destructive to user data**.

Vercel owns the web/API runtime. Supabase owns Auth/Postgres/RLS. `vivicabsb-eng/AureaSolaris` is the development source of truth; `fernandodamaso/AureaSolaris-deploy` is the deployment-only exact-SHA mirror. Railway is not part of Web V1.

## Safety boundary

An application incident does **not** authorize:

- deleting or rewriting private rows;
- deleting Auth users;
- restoring a database backup over current data;
- rewriting hosted migration history;
- disabling RLS;
- inspecting historical local Aurea databases/backups/user directories;
- exposing credentials, JWTs, passwords, database connection strings, bypass secrets, or provider tokens in logs/tickets/chat.

If private-data integrity itself may be compromised, first contain application access/writes and create a separate data-recovery incident contract. Do not improvise destructive data recovery under this runbook.

## 1. Capture the incident state before mutation

Record only sanitized identifiers/statuses:

- current `vivicabsb-eng/AureaSolaris:main` SHA;
- current `fernandodamaso/AureaSolaris-deploy:main` SHA;
- active Vercel web deployment ID/immutable URL, Git repository/ref/SHA, target, and state;
- active Vercel API deployment ID/immutable URL, Git repository/ref/SHA, target, and state;
- canonical web/API aliases;
- web `/`, API `/health`, and API `/ready` status/body class required by the current contract;
- relevant Supabase project ref/state, migration names/versions, policy names, and non-sensitive counts if needed.

Do not assume all three Git/deployment SHAs must always equal:

- **normal promotion:** the Vercel deployment SHA must equal the exact authorized deployment-mirror candidate; at promotion time that object must have been verified from the upstream source of truth;
- **upstream advanced without promotion:** upstream may be newer while mirror + production remain intentionally on the last promoted SHA;
- **emergency Vercel rollback:** production may temporarily serve an older known-good deployment while mirror `main` still records the more recent promoted candidate. Record this explicitly; do not disguise it as equality.

A canonical alias alone is not provenance.

## 2. Decide whether to disable application traffic

Disable or restrict the affected project when continued traffic risks more incorrect writes, privacy exposure, authentication failure loops, or user-visible corruption.

Preferred reversible containment is a provider-native Vercel control:

- pause the affected Vercel project, which blocks its active Production Deployment; or
- use an already-approved project/deployment protection control when that is the established incident mechanism.

Do **not** delete the Vercel project, deployment history, domains, Supabase project, Auth users, or database.

If only one project is clearly unsafe, contain that project. If web/API compatibility is uncertain, contain both before changing traffic so users cannot interact with a mismatched pair.

Record only that containment was enabled/disabled, never protection secrets.

## 3. Select a known-good rollback pair

Choose web and API deployments from evidence, not from memory.

For each candidate require:

1. `READY` Vercel state;
2. known Git repository/ref/SHA metadata;
3. correct environment binding (production vs preview);
4. known compatibility between web and API;
5. successful historical or reproducible quality/health evidence;
6. no known security/data-integrity reason that disqualifies the candidate.

Prefer a web/API pair built from the same exact source candidate. If they differ, the incident record must contain the concrete compatibility evidence that makes the pair safe.

Do not rebuild an old working tree just to approximate the candidate when an immutable known-good deployment still exists.

## 4. Roll back Vercel web and API

Vercel supports routing production back to a previous deployment. The CLI form is:

```bash
vercel rollback <deployment-id-or-url>
```

Provider availability can depend on the current plan/capability. When targeted rollback is not available but promotion of an existing deployment is available, point production traffic to the inspected known-good deployment with:

```bash
vercel promote <deployment-id-or-url>
```

Use authenticated provider tooling without placing tokens or environment values in command arguments or evidence.

### Coordinated sequence

When traffic is contained:

1. roll back/promote the API to the selected known-good API deployment;
2. verify the immutable API deployment metadata and direct health response;
3. roll back/promote the web project to the selected known-good web deployment;
4. verify the immutable web deployment metadata and direct root response;
5. verify both canonical aliases resolve to the selected deployments;
6. run the production smoke/compatibility checks required below;
7. only then resume/unpause public traffic.

When traffic cannot be contained and compatibility risk exists, prefer the shortest safe provider sequence and verify after each routing change. Do not leave a known-incompatible web/API pair active while investigating.

A Vercel rollback changes traffic; it does not require a destructive database rollback.

## 5. Verify rollback before resuming traffic

Require fresh evidence:

- web deployment is `READY` and its Git metadata matches the selected candidate;
- API deployment is `READY` and its Git metadata matches the selected candidate;
- canonical web alias resolves to the selected web deployment;
- canonical API alias resolves to the selected API deployment;
- canonical web `/` returns the expected success status;
- canonical API `/health` returns the expected success status;
- `/ready` matches the current readiness contract (including accepted fail-closed `503 service_not_ready` while concrete probes are disabled);
- authenticated owner isolation checks needed by the incident pass without using production private data as test fixtures.

If containment was enabled, resume/unpause only after these checks pass.

## 6. Rotate or revoke secrets safely

Rotate a credential when it may have been exposed, lost, reused outside its boundary, or rendered invalid by provider recovery.

1. Identify the owning provider and dependent components **by secret name/purpose only**.
2. Generate/rotate/revoke through the provider's secure control plane.
3. Update dependent Vercel/Supabase secure environment bindings without copying values into Git, shell history, tickets, screenshots, Linear, or chat.
4. Redeploy or rebind only the components whose provider contract requires it.
5. Verify health/auth/ownership with non-sensitive evidence.
6. Revoke the old credential after the replacement path is proven, unless the provider's rotation operation already invalidated it atomically.

Never paste a secret value into completion evidence. “Rotated `<secret-name>`; dependent deployment healthy” is enough.

Browser-safe public configuration is not a place to hide server secrets. Database credentials, service-role credentials, protection bypasses, and private tokens remain server/provider-only.

## 7. Supabase/application-data recovery boundary

For a pure application deployment incident, leave Supabase data and migration history intact.

Safe application recovery may include:

- restoring a compatible Vercel deployment;
- correcting/rotating provider environment configuration;
- restarting/redeploying a serverless application candidate;
- pausing/resuming application traffic;
- verifying Auth/project health and RLS policy state.

It does not include destructive SQL, schema history rewrites, bulk user deletion, or restoring old private data over current rows.

If the application candidate expects a schema newer than the known-good deployment supports, select another compatible deployment or create a forward fix under a reviewed incident issue. Do not force the database backward merely to match old application code.

## 8. Recover to the normal exact-SHA deployment topology

An emergency Vercel rollback may temporarily make the production deployment SHA differ from deployment-mirror `main`. That temporary state is acceptable only when explicitly recorded as incident recovery.

Normal forward recovery is:

1. fix/validate in `vivicabsb-eng/AureaSolaris`;
2. pass required CI, schema/RLS, E2E, and hosted preview checks;
3. promote the exact validated source object to `fernandodamaso/AureaSolaris-deploy` under an approved deployment issue;
4. require Vercel web/API production metadata to reference that exact mirror SHA;
5. verify canonical aliases and health;
6. close the incident with the previous rollback state preserved as evidence, not erased from history.

Do not force Git history backward merely to make the mirror look identical to an emergency rolled-back Vercel deployment.

## 9. Multi-user isolation during incidents

Incident pressure does not relax owner boundaries. Any recovery change touching authentication/repositories/RLS must preserve:

- identity derived from validated Supabase authentication;
- explicit owner-scoped application queries;
- RLS on every private table;
- owner-aware relationships that reject cross-owner references;
- no privileged database credential in the browser;
- two-identity synthetic tests proving denied cross-owner access.

Never troubleshoot one user's problem by reading another user's private rows or by creating a shared/global owner shortcut.

## 10. Sanitized incident evidence checklist

Record:

- incident start/end timestamps;
- upstream SHA, mirror SHA, selected web/API deployment IDs and Git SHAs;
- whether project containment was enabled and later disabled;
- HTTP status summaries for canonical web/API health/readiness;
- names/statuses of rotated secrets, never values;
- CI/E2E/schema/RLS check names and pass/fail results;
- any intentional temporary SHA divergence and how normal topology was restored;
- confirmation that no destructive user-data action was taken.

## Related runbooks

- [`ENVIRONMENTS.md`](ENVIRONMENTS.md)
- [`VERCEL_RUNBOOK.md`](VERCEL_RUNBOOK.md)
- [`VERCEL_API_RUNBOOK.md`](VERCEL_API_RUNBOOK.md)
- [`SUPABASE_RUNBOOK.md`](SUPABASE_RUNBOOK.md)
- [`../data-persistence.md`](../data-persistence.md)