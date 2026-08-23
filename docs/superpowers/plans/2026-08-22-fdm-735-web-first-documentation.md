# FDM-735 Web-First Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all active Aurea Solaris product and operations documentation describe the released private Web V1 architecture and provide safe, non-destructive incident/rollback procedures.

**Architecture:** Treat `vivicabsb-eng/AureaSolaris` as the development source of truth and `fernandodamaso/AureaSolaris-deploy` as an exact-SHA deployment mirror only. Document Vercel web/API hosting, Supabase Auth/Postgres/RLS ownership, private owner isolation, certified astrology boundaries, and the retirement of the desktop/local product runtime without changing application behavior or production state.

**Tech Stack:** Markdown documentation, Python `unittest` regression guard, React/Vite Web V1, FastAPI, Supabase Auth/Postgres/RLS, Vercel, GitHub Actions.

**Spec:** Linear FDM-735 — `P4.9 — Update product and operations documentation to web-first truth`.

## Global Constraints

- Update `docs/CONSTITUICAO.md` before any other active product/operations documentation.
- Do not change application behavior, certified astrology behavior, Supabase schema/RLS, or dependencies.
- Do not move `fernandodamaso/AureaSolaris-deploy` or deploy FDM-735 to production.
- Do not inspect or modify real local Aurea data, SQLite databases, backups, or user directories.
- Never expose credentials, JWTs, passwords, database URLs, bypass secrets, provider tokens, or private request bodies.
- Preserve clearly historical/archive evidence; active/current documentation must not route users or agents to retired runtime paths.
- Railway is not part of Web V1.
- `tools/run_e2e.py` is disposable local test infrastructure, not a user-facing local product runtime.
- Routine provider configuration, exact-SHA mirror operations, deployments, migrations, PR review/fix loops, and clean merges remain agent-autonomous within an already approved issue contract unless a destructive/user-data/credential boundary is crossed.

---

### Task 1: Establish the normative web-first contract

**Files:**
- Modify: `docs/CONSTITUICAO.md`

**Interfaces:**
- Consumes: FDM-735 acceptance contract and the verified FDM-734/FDM-733 release state.
- Produces: the normative product/data/deployment policy that every later documentation edit must follow.

- [ ] **Step 1: Replace the local-first product scale with the released Web V1 scope**

Document authentication, profile/onboarding, persisted birth profile, Mandala/dashboard, certified natal/transit calculations, and persisted calculation receipts as the current private Web V1 scope.

- [ ] **Step 2: Define the released hosting and data ownership boundaries**

State that Vercel owns the Web V1 web/API runtime, Supabase owns Auth/Postgres/RLS, Railway is not part of Web V1, and private product records are owner-scoped with RLS defense in depth.

- [ ] **Step 3: Define repository/deployment topology and autonomy**

State that `vivicabsb-eng/AureaSolaris` is the development source of truth and `fernandodamaso/AureaSolaris-deploy` is an exact-SHA deployment-only mirror; record the FDM-695 autonomy rule without removing destructive/data/credential safety gates.

- [ ] **Step 4: Preserve editorial provenance and retired-runtime history boundaries**

Keep editorial astrology knowledge/provenance separate from private per-user application data, and explicitly identify desktop/local/Tauri/SQLite product runtime paths as retired rather than active.

- [ ] **Step 5: Commit the Constitution as the first active documentation change**

```bash
git add docs/CONSTITUICAO.md
git commit -m "docs(fdm-735): make Constitution web-first"
```

### Task 2: Normalize active product, architecture, data, and setup documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/AI_WORKING_GUIDE.md`
- Modify: `README.md`
- Modify: `docs/arquitetura.md`
- Modify: `docs/data-persistence.md`
- Modify: `docs/data/DOMINIOS_DE_DADOS.md`
- Modify: `docs/setup-guide.md`
- Modify: `docs/CONFIGURACAO_DE_TRABALHO.md`
- Modify: `docs/index.md`
- Review/update only if needed: `docs/data/WEB_V1_SCHEMA.md`

**Interfaces:**
- Consumes: the updated Constitution.
- Produces: one consistent current-runtime map for humans and agents.

- [ ] **Step 1: Align agent and README entry points**

Describe the source-of-truth/mirror topology, Vercel/Supabase ownership, exact current Web V1 scope, disposable E2E boundary, and FDM-695 autonomy policy.

- [ ] **Step 2: Replace the retired architecture description**

Rewrite `docs/arquitetura.md` around browser → Vercel web → authenticated Vercel FastAPI → Supabase/Postgres/RLS → certified astrology engine/assets, with editorial knowledge/provenance as a separate domain.

- [ ] **Step 3: Replace local SQLite persistence instructions**

Rewrite `docs/data-persistence.md` and `docs/data/DOMINIOS_DE_DADOS.md` so Web V1 private state is Supabase/Postgres owner-scoped data, while editorial provenance remains separately governed; do not create a migration path from real historical local data in this issue.

- [ ] **Step 4: Make setup/development guidance web-first**

Keep Node 22, Python 3.12, Docker/Supabase CLI, `npm run dev:web`, API environment guidance, `npm run quality:gate`, and `python tools/run_e2e.py`; remove desktop/Tauri/launcher/local-owner setup guidance.

- [ ] **Step 5: Update the documentation index**

Route architecture, data, setup, operations, incident/rollback, and historical/archive evidence distinctly so current readers do not enter retired paths.

- [ ] **Step 6: Commit the active product documentation normalization**

```bash
git add AGENTS.md README.md docs/AI_WORKING_GUIDE.md docs/arquitetura.md docs/data-persistence.md docs/data/DOMINIOS_DE_DADOS.md docs/setup-guide.md docs/CONFIGURACAO_DE_TRABALHO.md docs/index.md docs/data/WEB_V1_SCHEMA.md
git commit -m "docs(fdm-735): align active docs with Web V1"
```

### Task 3: Complete operations truth and safe recovery documentation

**Files:**
- Modify: `docs/operations/ENVIRONMENTS.md`
- Modify: `docs/operations/VERCEL_RUNBOOK.md`
- Modify: `docs/operations/VERCEL_API_RUNBOOK.md`
- Modify: `docs/operations/SUPABASE_RUNBOOK.md`
- Create: `docs/operations/INCIDENT_AND_ROLLBACK.md`

**Interfaces:**
- Consumes: exact-SHA repository topology and Vercel/Supabase ownership boundaries.
- Produces: deployment verification, incident response, rollback, disablement, and recovery procedures that avoid destructive user-data actions.

- [ ] **Step 1: Normalize environment ownership**

State Vercel web/API + Supabase Auth/Postgres/RLS boundaries and explicitly state Railway is not part of Web V1.

- [ ] **Step 2: Replace stale fixed deployment baselines with exact-current-SHA verification**

Document the verification chain: upstream `main` SHA → deployment mirror `main` SHA when intentionally promoted → Vercel deployment metadata SHA → web/API canonical alias → health checks. Explain that an intentional upstream/mirror difference is not drift when no promotion is authorized.

- [ ] **Step 3: Document safe web/API rollback**

In `INCIDENT_AND_ROLLBACK.md`, identify the last-known-good exact mirror SHA and/or READY Vercel deployments before mutation, roll both web and API to a mutually compatible last-known-good deployment/candidate, verify aliases and health, and never roll back application data destructively as part of an app rollback.

- [ ] **Step 4: Document secret rotation and application disablement**

Describe provider-side rotation/revocation with values kept out of Git/logs/tickets, coordinated web/API environment updates where needed, temporary application disablement through provider controls, and post-recovery verification.

- [ ] **Step 5: Document future multi-user expansion**

Preserve identity from authenticated tokens, explicit owner-scoped repository queries, RLS on every private table, cross-owner FK protections, two-identity isolation tests, and separation from editorial data.

- [ ] **Step 6: Commit operations documentation**

```bash
git add docs/operations/ENVIRONMENTS.md docs/operations/VERCEL_RUNBOOK.md docs/operations/VERCEL_API_RUNBOOK.md docs/operations/SUPABASE_RUNBOOK.md docs/operations/INCIDENT_AND_ROLLBACK.md
git commit -m "docs(fdm-735): add Web V1 incident and deployment runbooks"
```

### Task 4: Strengthen permanent documentation regression checks

**Files:**
- Modify: `tests/test_legacy_runtime_retired.py`

**Interfaces:**
- Consumes: the set of active/current documentation paths.
- Produces: a permanent guard that fails when current docs reintroduce retired runtime contracts or Railway deployment commands, plus local-link validation for the maintained active docs.

- [ ] **Step 1: Expand current-text coverage**

Add the Constitution, architecture, persistence, data-domain, working-configuration, and operations runbooks to the current-target scan while leaving historical/archive/evidence/deployment-record paths outside the active scan.

- [ ] **Step 2: Add Railway command regression markers**

Reject command-shaped active instructions such as `railway up`, `railway deploy`, `railway run`, and `railway link` while allowing explicit text that Railway is not part of Web V1.

- [ ] **Step 3: Add local Markdown-link validation for active docs**

Parse inline Markdown links in the maintained active Markdown targets, ignore external URLs/mailto/anchors, strip fragments/query strings from repository-relative links, and fail when the referenced repository file/directory does not exist.

- [ ] **Step 4: Run the focused permanent guard**

```bash
python -m pytest tests/test_legacy_runtime_retired.py -q
```

Expected: PASS with no retired runtime markers, Railway deployment commands, or broken local links in active documentation.

- [ ] **Step 5: Commit the regression guard**

```bash
git add tests/test_legacy_runtime_retired.py
git commit -m "test(fdm-735): guard active Web V1 documentation"
```

### Task 5: Run the complete FDM-735 validation matrix

**Files:**
- Validate only; no application behavior changes.

**Interfaces:**
- Consumes: final feature-branch head.
- Produces: merge evidence for documentation truth, Web/API quality, schema/RLS isolation, E2E, hosted baseline health, secret safety, and focused diff scope.

- [ ] **Step 1: Run documentation/search checks**

```bash
git diff --check main...HEAD
python -m pytest tests/test_legacy_runtime_retired.py -q
git grep -n -i -E 'launch_chrome\.bat|launch_chrome\.ps1|127\.0\.0\.1:9876|127\.0\.0\.1:9878|main_api\.py|local-owner|npm run tauri|src-tauri' -- README.md AGENTS.md docs/CONSTITUICAO.md docs/AI_WORKING_GUIDE.md docs/arquitetura.md docs/data-persistence.md docs/data/DOMINIOS_DE_DADOS.md docs/setup-guide.md docs/CONFIGURACAO_DE_TRABALHO.md docs/index.md docs/operations || true
git grep -n -i -E 'railway (up|deploy|run|link)' -- README.md AGENTS.md docs || true
```

Expected: no current retired-runtime or Railway deployment instruction matches.

- [ ] **Step 2: Run the full repository quality gate**

```bash
npm run quality:gate
```

Expected: Web quality/API contracts, API tests/lint/typecheck, disposable Supabase schema/RLS tests, repository tests, and API deployment-contract checks pass.

- [ ] **Step 3: Run isolated Web V1 E2E where the environment supports it**

```bash
python tools/run_e2e.py
```

Expected: disposable Supabase + synthetic identities + API + Vite preview + Playwright pass without touching real personal data.

- [ ] **Step 4: Review the complete branch diff and secret patterns**

Confirm only the plan, active documentation, incident runbook, and necessary regression-guard changes are present. Scan changed text for credential-shaped values and ensure no secret values, JWTs, passwords, database URLs, bypass tokens, or provider tokens were introduced.

- [ ] **Step 5: Verify the unchanged production baseline**

Confirm deployment mirror `main` still points to the intentionally unchanged baseline, Vercel web/API production deployment metadata still points at that mirror SHA, canonical web `/` returns `200`, canonical API `/health` returns `200`, and `/ready` remains the documented fail-closed result if concrete readiness probes are still disabled.

### Task 6: PR review, clean merge, and completion evidence

**Files:**
- No new scope; only fixes required by review/CI.

**Interfaces:**
- Consumes: validated final feature-branch head.
- Produces: merged upstream main, unchanged production/mirror state, sanitized Linear completion evidence, and FDM-735 Done.

- [ ] **Step 1: Open the focused PR**

Target `vivicabsb-eng/AureaSolaris:main` from `fernandoyarrum/fdm-735-p49-update-product-and-operations-documentation-to-web-first`, summarize scope/risks/validation, and explicitly state that the deployment mirror and production are intentionally unchanged.

- [ ] **Step 2: Fix CI and review findings**

Inspect all required workflow jobs and review threads; make focused branch commits for real findings and rerun failed checks instead of merely reporting them.

- [ ] **Step 3: Perform fresh final-head verification**

Re-run/reconfirm the focused guard, full CI matrix, exact changed-file diff, secret scan, and fresh canonical production smoke against the unchanged FDM-733 baseline.

- [ ] **Step 4: Merge only the verified final head**

Merge with an expected-head-SHA guard after all checks are green and review findings are resolved.

- [ ] **Step 5: Verify post-merge state**

Confirm upstream `main` advanced to the merge result, while `fernandodamaso/AureaSolaris-deploy:main` and both Vercel production deployments/aliases remain on the pre-FDM-735 baseline because this issue does not deploy.

- [ ] **Step 6: Record sanitized completion evidence in Linear and mark Done**

Record the PR/merge SHA, changed documentation areas, passing CI/validation summaries, production smoke statuses, and explicit confirmation that no mirror/production movement or secret/user-data action occurred. Mark FDM-735 Done only after all acceptance criteria pass. Do not begin FDM-736.
