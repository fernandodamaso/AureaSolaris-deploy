# Environment boundaries

Aurea Solaris Private Web V1 has two hosted application environments, preview and production. Vercel hosts the web/API projects; Supabase owns Auth/Postgres/RLS. Railway is not part of Web V1.

The API validates deployment configuration before serving requests. Production requires HTTPS for remote provider URLs, exact browser origins, a TLS PostgreSQL connection, and the repository-certified Swiss Ephemeris directory. Preview uses concrete Vercel preview origins; wildcard origins are never valid.

## Repository/deployment boundary

- Development source of truth: `vivicabsb-eng/AureaSolaris`.
- Deployment-only exact-SHA mirror: `fernandodamaso/AureaSolaris-deploy`.
- Vercel Git Integration reads the deployment mirror, not the development repository.
- A production/preview candidate is identified by its exact Git SHA. Branch names and aliases are routing metadata, not sufficient provenance.
- Upstream `main` may legitimately be ahead of deployment-mirror `main` when a newer development commit has not been promoted.

Never move the deployment mirror merely to make the two repositories look synchronized. Promotion requires an explicit deployment contract and prior validation of the exact candidate.

## Approved deployment bindings

The two hosted environments are separate trust boundaries. Bind each deployment to its approved Supabase project and browser origin:

| Environment | Supabase project | API allowed browser origin |
| --- | --- | --- |
| Preview | `aurea-solaris-preview` (`rosklqnnbmhowohoyboj`) | One exact Aurea Solaris Vercel web preview origin |
| Production | `aurea-solaris-production` (`tgpcpxqqusehssaihvcp`) | `https://aurea-solaris.vercel.app` |

Preview browser configuration uses the preview Supabase URL, the matching same-candidate API preview deployment, and the exact Vercel web preview origin. Production browser configuration uses the production Supabase project, the canonical production API domain, and the canonical web origin. Do not mix preview and production refs/origins.

Both API environments use their assigned Supabase session-pooler role. The full database connection string is secret and must remain only in the server/provider environment; never print or copy it into Git, logs, PRs, tickets, Linear, or chat.

## Server configuration

These variables are server-only unless explicitly marked public configuration. Their **values** are read from the provider environment; this document records names and contracts only.

| Variable | Classification | Boundary |
| --- | --- | --- |
| `AUREA_ENVIRONMENT` | Public configuration | Selects development, preview, or production validation. |
| `AUREA_SUPABASE_URL` | Public configuration | Supabase project URL for the selected environment. |
| `AUREA_JWT_AUDIENCE` | Public configuration | JWT audience identifier. |
| `AUREA_DATABASE_URL` | Secret | PostgreSQL connection string; remote TLS in hosted environments. |
| `AUREA_ALLOWED_ORIGINS` | Public configuration | Exact browser origins; wildcards are rejected. |
| `AUREA_EPHEMERIS_PATH` | Public configuration | Packaged certified Swiss Ephemeris assets. |

## Browser-safe configuration

These variables are public by design and may be bundled into the browser. They must never contain database credentials, service-role keys, private keys, provider tokens, or protection-bypass secrets.

| Variable | Classification |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser-safe public URL |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe public client key |
| `VITE_AUREA_API_URL` | Browser-safe public API URL |

Production browser URLs use HTTPS and must not point at a developer host.

## Safe verification chain

Before accepting a hosted state, capture only sanitized identifiers and prove:

1. current SHA of `vivicabsb-eng/AureaSolaris:main`;
2. SHA intentionally authorized on `fernandodamaso/AureaSolaris-deploy:main` (or the explicit preview ref for preview work);
3. Vercel web deployment metadata references the deployment mirror and expected SHA;
4. Vercel API deployment metadata references the same authorized candidate/compatible SHA;
5. canonical/preview aliases resolve to the deployments inspected;
6. web `/` and API `/health` satisfy the issue contract;
7. API `/ready` is interpreted according to the current readiness contract, including an intentional fail-closed `503 service_not_ready` while concrete probes are disabled.

An upstream/mirror SHA difference is not itself an incident when no promotion was authorized.

## Secret rotation boundary

Rotate/revoke secrets only through the owning provider's secure controls. Update all dependent environment bindings, create/reuse a candidate deployment as required, verify it, and then retire the old credential. Never expose the old or new value as completion evidence.

See [`INCIDENT_AND_ROLLBACK.md`](INCIDENT_AND_ROLLBACK.md) for incident sequencing and application disablement.