# Data Persistence — Private Web V1

## Current source of truth

Private Web V1 persistence is hosted in **Supabase Postgres** and accessed through the authenticated FastAPI service. Supabase Auth establishes identity and Row Level Security (RLS) provides defense in depth around person-owned rows.

The retired desktop/local product databases are not current sources of truth and are not migration inputs for routine development, testing, deployment, or incident recovery.

## Storage and ownership matrix

| Data type | Current source of truth | Ownership/access |
| --- | --- | --- |
| Authentication identity | Supabase Auth | Authenticated Supabase user |
| Application profile | Postgres `profiles` | `user_id`; API owner scope + RLS |
| Birth profile | Postgres `birth_profiles` | `user_id`; API owner scope + RLS |
| Certified calculation receipts | Postgres `calculation_receipts` | `user_id`; API owner scope + RLS |
| Editorial astrology knowledge | Governed repository corpus and packaged editorial snapshot | Impersonal provenance domain; never a user profile store |
| Development/E2E state | Disposable local test infrastructure | Synthetic identities only; not product data |

The schema contract is documented in [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md).

## Browser, API, and database responsibilities

The browser uses Supabase directly for authentication. Private product operations go through FastAPI rather than trusting browser-supplied ownership fields.

1. Supabase Auth establishes the authenticated identity.
2. The browser sends the authenticated request to the API.
3. The API validates the token and derives the owner identity.
4. Repository queries are explicitly scoped to that owner.
5. Postgres RLS independently constrains access to rows whose `user_id` matches `auth.uid()`.
6. Owner-aware relationships prevent a receipt from referring to another account's birth profile.

Browser storage may support normal client/session mechanics, but it is not the source of truth for private application records and must never define a trusted owner or contain server-only credentials.

## Web V1 private records

### `profiles`

One application profile per authenticated user. It stores the current Web V1 profile/onboarding fields such as display name, timezone, and locale.

### `birth_profiles`

Person-owned normalized birth inputs. Web V1 supports a persisted active birth profile used by the Mandala/dashboard and certified calculations.

### `calculation_receipts`

Immutable owner-scoped evidence for certified natal/transit calculations. Receipts preserve canonical input/result payloads plus engine, ephemeris, resolved timezone/time and input-hash metadata needed to reproduce or audit the calculation.

A calculation receipt is evidence, not a second calculation engine. Certified engine behavior remains owned by the API's astrology domain.

## Editorial knowledge is a separate domain

The Engenharia Astrológica corpus preserves sources, claims, schools/traditions, divergences, citations, import provenance, hashes, and review decisions. It is impersonal reference knowledge.

Private application data must never be imported into the editorial corpus. Editorial knowledge may inform calculations or explanations, but that does not transfer ownership of a person's profile, birth data, receipts, notes, or future private records into the editorial domain.

## Disposable test persistence

`python tools/run_e2e.py` creates an isolated local test environment using disposable Supabase infrastructure and synthetic identities. It is explicitly test infrastructure, not a user-facing local Aurea runtime.

Automated validation must never be redirected to real user directories, retained historical databases, backups, production credentials, or production private records in order to make a test pass.

## Future multi-user expansion

Web V1 already uses the boundaries required for more than one user. Expansion preserves them:

- every private record has a Supabase-authenticated owner;
- API repositories scope all reads/writes to the authenticated owner;
- RLS remains enabled on every private table;
- cross-table relationships include ownership where needed to reject cross-owner references;
- anonymous clients receive no private-table authority;
- isolation changes are verified with at least two synthetic identities exercising both positive and negative cases.

Adding users is therefore a capacity/product-access change, not a reason to weaken ownership semantics.

## Migration of historical local data

Migration of any real historical local Aurea data is **outside the Web V1 persistence path and outside routine operations**. No developer, CI job, deployment, rollback, or E2E harness may inspect or import a person's historical databases/backups implicitly.

If such a migration is ever approved, it requires a separate explicit contract covering consent, source identification, backups, validation, rollback, secret handling, owner mapping, and non-destructive verification.

## Backup, rollback, and recovery boundary

Application deployment rollback never means destructive database rollback. During an application incident:

- restore a compatible last-known-good web/API deployment;
- rotate/revoke affected secrets through provider controls if required;
- temporarily disable application access when necessary;
- verify identity, schema compatibility, aliases, and health;
- leave user data intact unless a separate, explicit data-recovery procedure has been approved.

Schema/RLS changes follow committed migrations and the Supabase runbook. Do not use ad-hoc destructive SQL as an application recovery shortcut.

## Related references

- [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md)
- [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md)
- [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md)
- [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md)