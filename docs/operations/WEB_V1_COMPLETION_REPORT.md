# Private Web V1 Completion Audit — FDM-736

Status: **AUDIT IN PROGRESS**

This report is the repository-local evidence map for Linear FDM-736, “P4.10 — Run the final security and Web V1 completion audit”. Linear’s current issue description is the acceptance contract. This document records only sanitized identifiers and test results; it must never contain credentials, JWTs, database URLs, provider tokens, protection bypasses, service-role keys, private user records, or secret values.

## Audit identity and evidence model

- Development/source of truth: `vivicabsb-eng/AureaSolaris`.
- Deployment-only exact-object mirror: `fernandodamaso/AureaSolaris-deploy`.
- Upstream baseline before FDM-736: `d8b8c844821ef1fea4c30744fbe6c46419d19c81`, tree `2b7c48b0722a8c59e7c06257f254fd9625a91b98`.
- Production baseline before FDM-736: deployment-mirror `main` at `19f272acace62403e21a83ddfe842759a83617c6`.
- Current remediated application-code candidate before this report-only commit: `e2a0df3f978a4500217f302641544012d85ba650`.
- FDM-736 PR: #24.

A Git commit cannot contain its own final SHA. Therefore the repository report identifies the exact application-code candidate immediately before report-only evidence updates. Final feature-head SHA/tree, merge SHA/tree, mirror SHA, and final Vercel deployment IDs are recorded in the FDM-736 Linear completion evidence after those immutable objects exist. Every final pass claim is still required to be bound to a fresh final feature head before merge.

## Provider baseline

### Vercel production before final promotion

- Web project: `aurea-solaris`.
- API project: `aurea-solaris-api`.
- Web deployment: `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` — `READY`.
- API deployment: `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf` — `READY`.
- Both deployments identify source `git`, repository `fernandodamaso/AureaSolaris-deploy`, ref `main`, SHA `19f272acace62403e21a83ddfe842759a83617c6`.
- Canonical web `/`: HTTP 200.
- Canonical API `/health`: HTTP 200 with status `ok`.
- Canonical API `/ready`: HTTP 503 `service_not_ready`, which is the documented accepted fail-closed contract while concrete readiness probes remain disabled.

The upstream/mirror SHA difference at this baseline is intentional. FDM-735 did not deploy.

### Supabase

Sanitized hosted-project metadata was inspected without querying private application rows.

- Preview project ref: `rosklqnnbmhowohoyboj` — `ACTIVE_HEALTHY`.
- Production project ref: `tgpcpxqqusehssaihvcp` — `ACTIVE_HEALTHY`.
- Both hosted projects contain the `web_v1_core` migration.
- Provider migration versions differ because the same migration was applied at different times:
  - preview: `20260821172829`;
  - production: `20260821172901`.
- Provider migration statement digest on both: MD5 `0b232e06aa286c65092b542c750b24e4`.
- Committed migration Git blob: `b0a2910d7e9476a9ab1ee61670e1da7bbb4d1f6c`.
- `profiles`, `birth_profiles`, and `calculation_receipts` have RLS enabled in both hosted projects.
- Each table has its authenticated owner policy with `auth.uid() = user_id` in both `USING` and `WITH CHECK`.
- Supabase security advisors report the known hosted warning `auth_leaked_password_protection` on both projects. This is an Auth hardening limitation, not a bypass of application JWT validation, owner-scoped SQL, or RLS. No provider setting was weakened to suppress the warning.

## Security audit findings

### Authentication trust boundary — PASS

The FastAPI boundary derives identity from the bearer token, not a browser-supplied owner ID. The JWT/JWKS implementation requires asymmetric algorithms, issuer, audience, expiry, subject, matching `kid`/algorithm, and fails closed on invalid or unavailable verification material. Regression tests cover malformed bearer values, bad signatures, expired tokens, wrong issuer/audience/subject, `alg=none`, unknown-key refresh/cooldown behavior, malformed JWKS, key rotation, concurrency, and JWKS outages. Authorization values are not logged.

### Ownership and RLS defense in depth — PASS

Application repositories require authenticated `user_id` for reads/writes. Calculation receipts preserve owner identity and use owner-aware references. Disposable repository tests prove a second user cannot read another user’s receipt and cross-owner receipt-to-birth references are rejected. The committed schema enables RLS, revokes anonymous table access, grants authenticated access, and applies owner predicates/checks. Disposable pgTAP/RLS verification is part of the Web V1 Quality Gate.

### Browser/server secret separation and origins — PASS

The web runtime consumes only the documented public `VITE_*` boundary. Privileged database/JWT/provider credentials remain server or provider variables. CORS and environment validation are explicit and fail closed rather than broadening origins on configuration failure. Preview verification rejects production API/Supabase traffic, localhost, mixed HTTP, and credential leakage.

### Error/log leakage — PASS

Request bodies and authorization material are excluded from structured request logs. Validation payloads are redacted to stable metadata and unexpected failures return a generic public 500 contract rather than exception text or private data.

### Certified astrology runtime — PASS at repository/deploy-contract layer

Swiss Ephemeris package/runtime integrity remains pinned by expected assets, sizes and SHA-256 digests with production trust checks. Certified engine, UTC-boundary, API adapter and deploy-contract regressions remain part of the permanent quality gates. Browser-side fallback is not accepted.

### Retired runtime/topology guard — PASS

`tests/test_legacy_runtime_retired.py` permanently scans active product/runtime/configuration targets for reintroduction of Railway, Tauri/local-sidecar, retired local-owner/SQLite runtime paths, product Docker runtime, stale launchers/ports, or deployment-mirror development instructions. `tools/run_e2e.py` remains disposable test infrastructure only.

## Concrete remediation

### Finding: Vite dev-server advisory floor

The audit found that the web manifest admitted Vite `^7.0.4` and the lockfile resolved Vite `7.3.1`. The affected Vite 7.0.0–7.3.4 range has a 2026 dev-server security advisory. Production is a static Vercel build rather than an exposed Vite dev server, but the repository includes a `vite --host` development path, so leaving the vulnerable lock state was not accepted.

TDD evidence:

1. Commit `af59bc889f121255edadf3cdf7dd94aee5995a08` added `tests/test_dependency_security_floor.py` and classified it in the permanent root Python regression suite.
2. CI #240 reproduced the failure: the new dependency-floor test was the only failing root regression; the other 42 root tests passed.
3. Minimal remediation updated only the Vite manifest/lock target within major 7.
4. Remediated application-code candidate `e2a0df3f978a4500217f302641544012d85ba650` uses manifest `vite: ^7.3.6` and lockfile Vite `7.3.6`.
5. The temporary lock-regeneration workflow removed itself and is not part of the final tree.

No React, API, database, astrology, authentication, ownership, or product behavior was changed for this remediation.

## Acceptance evidence matrix

| FDM-736 criterion | Evidence | Status |
| --- | --- | --- |
| Web quality / build / generated API types | `npm run quality:web`; Web V1 Quality Gate exact final head | PENDING FINAL HEAD |
| API lint/type/tests/contract | `npm run quality:api`; Web V1 Quality Gate exact final head | PENDING FINAL HEAD |
| API deploy contract / Swiss runtime | `npm run quality:api-deploy-contract`; deployed Swiss smoke | PENDING FINAL HEAD |
| Disposable Supabase schema/pgTAP/RLS | `npm run quality:schema`; hosted policy metadata | PENDING FINAL HEAD |
| Root Python regressions / retired-runtime guard | CI classified root suite, including dependency and retired-runtime tests | PENDING FINAL HEAD |
| Disposable full E2E orchestration | `python tools/run_e2e.py` / CI isolated Private Web V1 Playwright E2E | PENDING FINAL HEAD |
| JWT/JWKS negative/security coverage | API auth regressions | PASS SOURCE REVIEW; FINAL CI PENDING |
| Cross-owner denial and owner-aware FK | repository/RLS tests + hosted preview browser flow | PENDING HOSTED PREVIEW |
| Public sign-up disabled | approved hosted-preview verifier + fresh provider/HTTP proof | PENDING HOSTED PREVIEW |
| Preview credential/environment isolation | hosted verifier rejects production/localhost/mixed-content traffic | PENDING HOSTED PREVIEW |
| Zero browser/page errors | Playwright hosted preview console/page-error capture | PENDING HOSTED PREVIEW |
| Persisted birth/profile/Mandala/receipts | full hosted preview flow | PENDING HOSTED PREVIEW |
| Production authenticated owner flow | FDM-733 owner login → persisted profile/birth/dashboard → logout attestation; password/token never exported | ACCEPTED REUSED BOUNDARY; FINAL TECHNICAL GATES PENDING |
| Exact source → mirror → Vercel provenance | exact final SHA across upstream/mirror deployments and aliases | PENDING FINAL PROMOTION |
| Automatic production deploy proof | Vercel Git deployments from mirror `main` at promoted exact SHA | PENDING FINAL PROMOTION |
| Canonical production web/API smoke | web `/`, API `/health`, `/ready` documented interpretation | PENDING FINAL PROMOTION |
| Railway/Tauri/local product runtime absent | permanent regression + stale-runtime search | PASS SOURCE REVIEW; FINAL CI/SEARCH PENDING |
| Secret-pattern / private-data leakage review | PR diff, logs/evidence scan, provider metadata only | PENDING FINAL REVIEW |
| Incident/rollback safety | `docs/operations/INCIDENT_AND_ROLLBACK.md` + recorded rollback targets | PENDING FINAL PROMOTION IDS |

## Production-owner credential boundary

FDM-736 explicitly permits reuse of the final FDM-733 owner-authenticated production attestation when exact-SHA technical gates are green. That attestation proves owner login, persisted profile/birth/dashboard behavior and logout. The real owner password, access token and refresh token must not be copied into CI, Vercel output, Linear, Git, logs, or this report. FDM-736 does not create a new human password-sharing gate.

## Known limitations and accepted residual risks

- API `/ready` intentionally returns `503 service_not_ready` until concrete readiness probes are enabled. This is fail-closed and documented; it is not treated as a healthy-while-unknown success response.
- Supabase leaked-password protection currently produces a provider security-advisor warning on preview and production. No authentication, ownership or RLS boundary is weakened to remove it. Final FDM-736 disposition must remain consistent with the Linear acceptance contract.
- FDM-742 external human astrology reference/provenance assurance is explicitly a separate deferred assurance item and does not invalidate the Web V1 engineering completion audit.
- No speculative post-V1 modules are pulled into this audit.

## Rollback posture

Before final FDM-736 promotion, the known-good production deployment-mirror target is `19f272acace62403e21a83ddfe842759a83617c6`, with web deployment `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` and API deployment `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf`. The incident runbook requires rollback to a known exact Git object/provider deployment, application disablement where necessary, and credential rotation on suspected compromise without deleting private user data as an incident shortcut.

## Finalization checklist

- [ ] Fresh final-head complete CI matrix is green.
- [ ] Fresh hosted preview pair is `READY` at the exact authorized candidate.
- [ ] Full hosted preview browser/security/isolation flow passes with disposable identities only.
- [ ] PR full diff/scope/stale-runtime/secret-pattern/review-thread checks are clean.
- [ ] PR is merged only after fresh final-head verification.
- [ ] Final upstream `main` and merge tree are recorded.
- [ ] Deployment-mirror `main` is promoted only to the exact authorized upstream object.
- [ ] Automatic Vercel web/API production deployments prove mirror `main` and exact promoted SHA.
- [ ] Fresh canonical web `/`, API `/health`, and documented `/ready` checks pass.
- [ ] Sanitized immutable completion evidence is recorded in Linear and FDM-736 is marked Done only if every acceptance criterion passes.
- [ ] No subsequent Linear issue is started.
