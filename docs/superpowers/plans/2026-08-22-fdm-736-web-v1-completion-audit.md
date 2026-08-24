# FDM-736 Web V1 Completion Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certify every FDM-736 Web V1 completion criterion with fresh, sanitized evidence, repair only concrete audit failures, and promote the final validated exact Git object without weakening security boundaries.

**Architecture:** Treat the existing Private Web V1 as the system under audit. Establish immutable Git/provider baselines first; reuse the repository's security, schema/RLS, isolated E2E, hosted-preview, and deployment-provenance gates; add only narrowly scoped regression coverage or corrections when a criterion actually fails. Keep development in `vivicabsb-eng/AureaSolaris` and use `fernandodamaso/AureaSolaris-deploy` only as an exact-object deployment mirror.

**Tech Stack:** React 19/Vite, FastAPI/Python 3.12, Supabase Auth/Postgres/RLS, Playwright, Swiss Ephemeris, GitHub Actions, Vercel.

**Spec:** Linear FDM-736 current description (2026-08-22) plus `AGENTS.md`, `docs/CONSTITUICAO.md`, `docs/AI_WORKING_GUIDE.md`, and current Web V1 data/operations runbooks.

## Global Constraints

- Never inspect, seed, migrate, alter, or delete real Aurea user data, historical SQLite databases, backups, or user directories.
- Never expose passwords, JWTs, database URLs, service-role keys, provider tokens, protection bypasses, or secret values in Git, CI output, Linear, logs, or chat.
- Preserve certified astrology behavior unless a reproduced FDM-736 failure requires the smallest contract-permitted correction.
- Preserve API-derived ownership, RLS, CORS/origin restrictions, preview/production separation, server/browser secret separation, deployment provenance, and fail-closed health/readiness behavior.
- Use synthetic/disposable identities and infrastructure for isolation/security tests.
- Do not treat intentional upstream/deployment-mirror SHA differences as drift before FDM-736 authorizes final promotion.
- Routine provider configuration, exact-SHA mirror operations, deployment, review/fix loops, approved migrations, and clean merge/promotion are agent-autonomous under FDM-695.
- Stop only for a genuine paid/legal gate, unavailable credential/permission boundary, destructive production-user-data action, unresolved scope decision, or required external human attestation.

---

### Task 1: Freeze and map the audit baseline

**Files:**
- Read: `AGENTS.md`
- Read: `docs/CONSTITUICAO.md`
- Read: `docs/AI_WORKING_GUIDE.md`
- Read: `README.md`
- Read: `docs/arquitetura.md`
- Read: `docs/data-persistence.md`
- Read: `docs/data/WEB_V1_SCHEMA.md`
- Read: `docs/data/DOMINIOS_DE_DADOS.md`
- Read: `docs/operations/ENVIRONMENTS.md`
- Read: `docs/operations/SUPABASE_RUNBOOK.md`
- Read: `docs/operations/VERCEL_RUNBOOK.md`
- Read: `docs/operations/VERCEL_API_RUNBOOK.md`
- Read: `docs/operations/INCIDENT_AND_ROLLBACK.md`
- Read: FDM-733/FDM-735/FDM-695 Linear evidence

**Interfaces:**
- Consumes: current Linear FDM-736 acceptance contract and provider metadata.
- Produces: exact upstream/mirror/Vercel/Supabase baseline and a criterion-to-evidence checklist for the final report.

- [ ] **Step 1: Re-read exact Git refs and prerequisite state**

Require FDM-735 `Done`, FDM-736 unblocked in fact, upstream `main` at the expected starting SHA, and the deployment mirror/prod state to match the recorded intentional pre-audit baseline.

- [ ] **Step 2: Re-read production deployment metadata and canonical smoke**

Capture sanitized Vercel project/deployment IDs, Git repository/ref/SHA, `READY` state, aliases, web `/`, API `/health`, and API `/ready`. Treat documented `503 service_not_ready` as fail-closed success while concrete probes remain disabled.

- [ ] **Step 3: Capture the allowed production-auth boundary**

Use the FDM-733 owner-authenticated login → persisted profile/birth/dashboard → logout attestation as the production owner-flow evidence if no authorized secure production session is available. Never request or copy the owner's password/token.

- [ ] **Step 4: Capture Supabase migration/Auth/RLS identifiers without private rows**

Record only project refs/states, committed/hosted migration identifiers or hashes, public-sign-up state, required RLS policy names/state, security-advisor names/status, and non-sensitive counts when needed.

- [ ] **Step 5: Map every FDM-736 criterion to a fresh or explicitly reusable evidence source**

The map must distinguish fresh final-head evidence from the narrow FDM-733 production-owner attestation and the explicitly deferred FDM-742 external astrology-reference assurance item.

### Task 2: Audit security, dependencies, runtime boundaries, and certified engine integrity

**Files:**
- Read/modify only if a failure is reproduced: `services/api/src/aurea_api/**`
- Read/modify only if a failure is reproduced: `services/api/tests/**`
- Read/modify only if a failure is reproduced: `supabase/migrations/**`, `supabase/tests/**`
- Read/modify only if a failure is reproduced: `apps/web/src/**`, `apps/web/e2e/**`
- Read: `.env.example`, `package.json`, `package-lock.json`, `services/api/pyproject.toml`
- Read: `scripts/quality-gate.sh`, `scripts/verify_preview.sh`, `scripts/verify_vercel_preview.py`
- Read: `tests/test_legacy_runtime_retired.py` and all root Python tests classified by CI

**Interfaces:**
- Consumes: current implementation and existing regression/security suite.
- Produces: a finding ledger; for each real failure, a minimal test-first correction and refreshed affected evidence.

- [ ] **Step 1: Review authentication/JWT/JWKS trust boundaries**

Verify issuer/audience/signature/algorithm/key-selection/expiry negatives, cooldown/failure behavior, unauthenticated `401`, API-derived owner identity, and absence of browser-supplied trusted owner IDs.

- [ ] **Step 2: Review owner scoping and RLS defense in depth**

Verify owner-scoped repositories, cross-user `404`/denial behavior, owner-aware foreign keys, authenticated-only RLS predicates/checks, and anonymous privilege denial using disposable identities/infrastructure only.

- [ ] **Step 3: Review environment, CORS, and secret separation**

Verify exact allowed origins, preview/production separation, HTTPS/TLS boundaries, public `VITE_*` variables only, privileged server variables excluded from browser bundles, and fail-closed configuration validation.

- [ ] **Step 4: Review error/log leakage and dependency integrity**

Inspect application error contracts/logging tests for accidental authorization/private-data/secret echoing; review locked Node/Python dependencies and CI install behavior without mass upgrades or `audit fix --force`.

- [ ] **Step 5: Review certified astrology/package integrity**

Verify Swiss Ephemeris runtime/package/assets, certified engine parity/regressions, receipt provenance/ownership, no browser-side fallback, and deployed Swiss runtime smoke evidence.

- [ ] **Step 6: Review retired-runtime and deployment-topology guards**

Search active instructions/configuration/code for Railway, product Docker runtime, Tauri/local sidecar, retired local-owner/SQLite runtime, direct deployment-mirror development, stale ports/runtime launchers, and development-only divergence in mirror refs.

- [ ] **Step 7: Repair only reproduced failures using TDD**

For each repair: add or strengthen the smallest regression/security test first, verify the test fails for the reproduced defect, implement the smallest safe correction, rerun the focused test, then rerun all affected gates. Do not refactor unrelated code.

### Task 3: Run fresh repository certification gates on the final feature head

**Files:**
- No intended product changes unless Task 2 finds a concrete failure.
- Evidence source: GitHub Actions runs bound to the exact feature-head SHA.

**Interfaces:**
- Consumes: final branch head after any remediation.
- Produces: exact-head CI evidence for all repository gates.

- [ ] **Step 1: Run/require the complete repository matrix**

Equivalent commands/CI coverage must prove:

```bash
npm run quality:gate
npm run quality:web
npm run quality:api
npm run quality:schema
npm run quality:api-deploy-contract
python tools/run_e2e.py
```

- [ ] **Step 2: Require permanent retired-runtime and root Python regression coverage**

The CI classification check must cover every surviving `tests/test_*.py` exactly once and the complete classified root Python suite must pass, including `tests/test_legacy_runtime_retired.py`.

- [ ] **Step 3: Inspect failures rather than rerunning blindly**

Use job steps/logs to identify root cause, apply only scoped self-healing repairs, and rerun the failed focused gate plus the full affected matrix.

- [ ] **Step 4: Bind every pass claim to the final feature-head SHA**

If the head moves for any fix/report update, discard stale CI evidence and require fresh final-head success.

### Task 4: Re-certify hosted preview isolation and exact deployment provenance

**Files:**
- Read/use: `scripts/verify_preview.sh`
- Read/use: `scripts/verify_vercel_preview.py`
- Read/use: `apps/web/e2e/**`
- No production private data.

**Interfaces:**
- Consumes: exact final feature-head Git object and approved preview-only secure credentials/access path.
- Produces: READY web/API preview pair at the exact candidate plus full browser/security/isolation evidence.

- [ ] **Step 1: Move deployment-mirror `preview` only to the exact validated upstream candidate object**

Use the existing exact-object mirror mechanism; never reconstruct commits and never develop in the mirror.

- [ ] **Step 2: Require automatic Vercel preview deployments at that exact SHA**

Verify both projects report source `git`, repository `fernandodamaso/AureaSolaris-deploy`, ref `preview`, exact candidate SHA, compatible environment binding, and `READY` state.

- [ ] **Step 3: Execute the approved full hosted preview flow**

Using only approved secure preview credentials/session access, prove login/onboarding, persisted profile and birth reload, Mandala/dashboard, certified natal/transit receipts, unauthenticated `401`, cross-owner denial/`404`, public sign-up disabled, preview-only Supabase/API traffic, zero browser/page errors, and logout.

- [ ] **Step 4: Prove credential/environment isolation and cleanup**

Verify no production Supabase/API traffic, no localhost/mixed content, no secret values in logs/evidence, temporary identities/access removed, and provider state returned to the approved preview posture.

- [ ] **Step 5: If secure preview execution capability is unavailable, exhaust approved tool-native paths before declaring a boundary**

Do not weaken Deployment Protection, expose credentials, or substitute production data. Only a genuinely unavailable credential/permission path qualifies as a blocker under FDM-695.

### Task 5: Publish completion report, review, merge, promote, and close FDM-736

**Files:**
- Create: `docs/operations/WEB_V1_COMPLETION_REPORT.md`
- Modify only if needed for truthful evidence links: existing deployment evidence under `docs/operations/deployments/`

**Interfaces:**
- Consumes: Tasks 1–4 final-head evidence.
- Produces: focused certification commit/PR, merged upstream state, exact mirror/Vercel production state, sanitized Linear completion evidence.

- [ ] **Step 1: Write the completion report**

Map every FDM-736 criterion to evidence. Include audited upstream candidate SHA, deployment-mirror SHA, Vercel web/API deployment IDs, Supabase migration identifiers/hashes, commands/checks and outcomes, rollback targets, known limitations, deferred modules, FDM-742 deferred assurance status, accepted readiness behavior, production-owner attestation boundary, findings, and remediations. Explain any unavoidable post-merge SHA distinction without claiming self-referential report metadata as the audited application candidate.

- [ ] **Step 2: Perform final source review before PR merge**

Review full PR diff, changed-file scope, stale Railway/runtime search, secret-pattern scan, provider/environment references, open PR review threads, and exact final-head CI.

- [ ] **Step 3: Merge only with fresh final-head evidence**

Merge the PR with the expected head SHA. Immediately re-read upstream `main` and record merge SHA/tree; verify the merge tree matches the validated feature tree when GitHub creates a merge commit.

- [ ] **Step 4: Promote the exact authorized upstream object to deployment-mirror `main` and prove auto-deploy**

Use a non-force exact-object mirror operation after merge. Require both Vercel projects to automatically create healthy production deployments reporting mirror repository, ref `main`, and the promoted exact SHA. Do not use a manual deployment of a different Git object as auto-deploy proof.

- [ ] **Step 5: Run fresh canonical production verification**

Verify canonical web `/`, API `/health`, documented `/ready`, deployment IDs/aliases/source/ref/SHA, public-sign-up state and other automatable production negatives that do not require exporting the owner password. Reuse only the FDM-733 owner-authenticated attestation for the permitted human-password boundary.

- [ ] **Step 6: Record sanitized Linear evidence and mark Done**

Record final status, PR, validated feature SHA/tree, merge/current-main SHA/tree, mirror SHA, Vercel IDs, full validation matrix, findings/remediations, accepted residual risks, rollback targets, and confirmations that no real user data/secrets were exposed or touched and no subsequent issue was started. Mark FDM-736 `Done` only after every criterion is actually satisfied.
