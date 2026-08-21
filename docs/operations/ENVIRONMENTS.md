# Environment boundaries

The API validates deployment configuration before it starts serving requests.
Production uses HTTPS for remote provider URLs, exact browser origins, a TLS
PostgreSQL connection, and the repository-certified Swiss Ephemeris directory.
Preview may use a concrete hostname from the expected Aurea Solaris Vercel web
project. Wildcard origins are never valid.

## Server configuration

These variables are server-only. They must not be copied into browser bundles.

| Variable | Classification | Boundary |
| --- | --- | --- |
| `AUREA_ENVIRONMENT` | Public configuration | Selects development, preview, or production validation. |
| `AUREA_SUPABASE_URL` | Public configuration | Remote Supabase URL; production requires HTTPS and a non-loopback host. |
| `AUREA_JWT_AUDIENCE` | Public configuration | JWT audience identifier. |
| `AUREA_DATABASE_URL` | Secret | PostgreSQL connection string; production requires a remote TLS connection. |
| `AUREA_ALLOWED_ORIGINS` | Public configuration | Comma-separated exact browser origins. Wildcards are rejected. |
| `AUREA_EPHEMERIS_PATH` | Public configuration | Local packaged directory containing the certified Swiss Ephemeris assets. |

`AUREA_DATABASE_URL` is the only secret in this server inventory. Keep all
values in the deployment secret store or process environment, never in Git,
logs, issue comments, or browser configuration.

## Browser-safe configuration

These variables are public by design and are owned by the Web V1 browser
configuration contract. They may be present in the browser bundle, but they
must never contain a database credential, service-role key, private key, or
other privileged token.

| Variable | Classification |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser-safe public URL |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe public client key |
| `VITE_AUREA_API_URL` | Browser-safe public API URL |

Production browser URLs must use HTTPS and must not point to loopback hosts.
