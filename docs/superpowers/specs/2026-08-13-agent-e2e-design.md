# Agent E2E testing — design

Date: 2026-08-13  
Status: implemented on `feat/agent-e2e` (Playwright CI harness + aurea-e2e skill + catalog/playbooks)

## In plain language

Today, small tests check pieces of the app. They do not click through a full screen the way a person does.

This design adds two complementary checks:

1. **On every pull request:** a script opens the test person (Pessoa Teste), clicks the real flows, and fails the PR if something breaks. No judgment of “does this look right.”
2. **When you ask:** an agent starts the isolated test sandbox in Chrome, runs those same scripts, then looks at the screens a script cannot judge (mandala drawing, Hermes conversation, visual polish). It never opens your real Aurea data.

## Goal

Give AI agents a repeatable way to end-to-end test **each feature and each workflow**, without touching personal data.

Success looks like:

- Playwright specs cover every catalog row marked **CI**.
- GitHub Actions runs those specs on every PR and is a required check.
- A project skill can, on request, boot the test-user sandbox and run Playwright plus the agent playbooks.
- A new feature is not done until it has a catalog row (and a spec; and a playbook if the row marks **agent**).

## Non-goals

- Replacing Vitest, Python unit tests, or engine reference checks.
- Putting E2E inside `npm run check` (lint + unit + build stay fast).
- Live AI providers in CI.
- Driving the person’s real data directory.
- Tauri/installer E2E (Chrome local web app only).
- Visual screenshot regression as a CI gate (agents judge visuals on request).
- Rewriting the existing PowerShell smokes in this work; they remain until a catalog row supersedes them.

## Architecture

One catalog, two runners.

```
e2e/catalog/          source of truth for workflows
e2e/specs/            Playwright (CI + skill)
e2e/playbooks/        agent visual/Hermes checks (skill only)
tools/run_e2e.py      start seed + API + Playwright in an isolated temp dir
.cursor/skills/aurea-e2e/   on-request agent procedure
.github/workflows/e2e.yml   PR gate
```

| Layer | Where it runs | What it judges |
|---|---|---|
| Playwright | CI on every PR, and the skill | Clicks, visible text, navigation, persistence, calculation receipts |
| Agent playbooks | Skill, on request only | Mandala drawing, Hermes quality, visual polish |

CI uses Linux + Playwright Chromium against a temporary test-user data dir. The skill uses the existing Windows launcher and real Chrome: `.\launch_chrome.ps1 -TestUser`.

Hermes is **mocked** in CI and in the default skill run. A live provider is used only when the person explicitly asks for it in that session.

## Hard rules

- Never seed, reset, delete, or open `%LOCALAPPDATA%\Aurea Solaris\data` (the person’s real private Aurea).
- The seed script already refuses that path; the harness and skill must also refuse it before starting.
- Do not start Playwright or a playbook unless `GET /health` returns `"test_user": true`.
- Do not store API keys, tokens, or personal notes in catalog, specs, playbooks, logs, or CI.
- Do not invent natal values, coordinates, timezones, or engine results in fixtures. Seeded maps use the existing reference natal / test-user UI seed only.
- Saúde flows are study and document preview, never diagnosis or prescription.
- Hermes must not silently create memory, tasks, events, or interpretations. Specs assert the proposal/review path.

## Catalog

Path: `e2e/catalog/`.

`e2e/catalog/README.md` is the index. One markdown file per area (`boot.md`, `astrologia.md`, …). Each row has:

| Field | Meaning |
|---|---|
| `id` | Stable slug, e.g. `astrologia-recalculate` |
| `feature` | Screen or overlay |
| `steps` | What to do, in the UI |
| `assert` | What must be true |
| `spec` | Path to `e2e/specs/<file>.spec.ts` |
| `playbook` | Path to `e2e/playbooks/<file>.md`, or `none` |
| `seed` | What the dummy life must already contain |

A missing catalog row means the workflow is untested. Adding a screen without a row is incomplete work.

### Boot and shell

| id | Workflow | CI spec | Agent playbook |
|---|---|---|---|
| `boot-local-owner` | Opens as Pessoa Teste, no login | yes | none |
| `boot-health-test-user` | `/health` has `test_user: true` | yes | skill refuses if false |
| `shell-navigation` | Six nav items, Hermes FAB, profile | yes | none |

### Astrologia

| id | Workflow | CI spec | Agent playbook |
|---|---|---|---|
| `astrologia-seeded-natal` | Seeded natal draws; receipt shows UTC, IANA timezone, hash | yes | `e2e/playbooks/mandala.md` (drawing looks right) |
| `astrologia-recalculate` | Recalculate; switch maps | yes | none |
| `astrologia-incomplete-birth` | Incomplete birth: no map, no invented values | yes | none |
| `astrologia-open-caderno` | “Anotar no caderno” opens Caderno Vivo | yes | none |
| `astrologia-open-hermes` | “Perguntar ao Hermes” opens chat | yes | none |
| `astrologia-second-map` | Add/edit a second map | yes | none |

### Caderno Vivo

| id | Workflow | CI spec | Agent playbook |
|---|---|---|---|
| `caderno-seeded-board` | Open seeded board (two notes + link) | yes | `e2e/playbooks/caderno-visual.md` |
| `caderno-edit-undo` | Create note, link, undo | yes | none |
| `caderno-create-study` | Create study from the Astrologia portal | yes | none |
| `caderno-reload` | Reload: notes still there | yes | none |

### Histórico, Agenda, Saúde, Memórias

| id | Workflow | CI spec | Agent playbook |
|---|---|---|---|
| `diario-edit-reload` | Open/edit diary entry; survives reload | yes | none |
| `agenda-task-event` | Task + event: create, complete/delete | yes | none |
| `saude-preview-upload` | Health preview from seed; upload is explicit | yes | `e2e/playbooks/saude.md` (never treat as diagnosis) |
| `memorias-review` | List memories; approve / revoke / forget | yes | none |
| `memorias-open-caderno` | “Estudar isto” opens Caderno | yes | none |

### Hermes and the study loop

| id | Workflow | CI spec | Agent playbook |
|---|---|---|---|
| `hermes-mocked-proposal` | Open chat; mocked reply; memory stays a proposal | yes | none |
| `hermes-live-provider` | Live provider conversation | **no** | `e2e/playbooks/hermes.md` only if the person asks |
| `study-loop` | Map → planet → Hermes → note → Caderno → reopen | yes | `e2e/playbooks/hermes.md` (conversation quality) |

## Playwright

- Config: `e2e/playwright.config.ts`.
- Specs: `e2e/specs/*.spec.ts`.
- Command: `npm run test:e2e` (does not run as part of `npm run check`).
- `baseURL` comes from `AUREA_E2E_URL` (harness sets it).
- Selectors: Portuguese `getByRole` / `getByLabel` first. Add `data-testid` only when the accessible name is ambiguous.
- Hermes in CI: mock the provider/API so replies are deterministic. No network to OpenAI or other hosts.
- On failure: screenshot + trace, uploaded as CI artifacts.
- Fixtures: only the existing test-user seed (`tools/seed_test_user.py` + `src/fixtures/test-user-ui.json`). Do not invent a second dummy life.

Incomplete-birth coverage uses an explicit incomplete fixture or UI path that **omits** required fields. It must not fill coordinates, timezone, or time with defaults.

## Harness

A single entry point, `tools/run_e2e.py` (Windows and Linux):

1. Refuse if the target data dir is the personal Aurea path or inside it.
2. Create a temporary `AUREA_DATA_DIR`.
3. Set `AUREA_TEST_USER=1`.
4. Run `tools/seed_test_user.py`.
5. Build the frontend if `dist/index.html` is missing (`npm run build`).
6. Start `main_api.py` on a free loopback port.
7. Wait until `/health` is 200 and `test_user` is true.
8. Run Playwright with `AUREA_E2E_URL=http://127.0.0.1:<port>`.
9. Stop the API and delete the temp dir.

The skill may skip steps 2–6 when a live sandbox already matches the health contract on ports 9878–9899, and instead point Playwright at that URL. It still refuses a non-test runtime.

## CI

New workflow: `.github/workflows/e2e.yml`.

- Trigger: pull request and default-branch push.
- Job: install Node and Python, `npm ci`, then `python tools/run_e2e.py`.
- After the boot specs are green, mark this workflow as a required GitHub check in the repository settings (a person action; the YAML alone does not enforce it).
- `npm run check` is unchanged (lint, Vitest, production build).
- Secrets: none. Hermes mock only.
- Artifacts: Playwright report, traces, screenshots on failure.

There is no existing GitHub Actions workflow in this repo; this file is the first.

## Skill

Path: `.cursor/skills/aurea-e2e/`.

This is a **project** skill so every agent in this repo can use it. `disable-model-invocation` is omitted: the agent should load it when the person asks for E2E, the test-user sandbox, a visual check, or “run the full dummy life.”

`SKILL.md` stays short. Details live in:

| File | Role |
|---|---|
| `SKILL.md` | Procedure: catalog → sandbox → Playwright → playbooks → report |
| `rules.md` | Hard rules (personal data, health contract, mocked Hermes) |
| `report-template.md` | Pass/fail per catalog `id`, screenshots, skipped rows |

The skill links into `e2e/catalog/` and `e2e/playbooks/` (one level deep). It does not duplicate the catalog.

### Procedure

1. Read `e2e/catalog/README.md`. If the person named a feature, filter to those ids; otherwise run all CI specs plus playbooks marked **agent** except `hermes-live-provider`.
2. If no healthy test-user API: `.\launch_chrome.ps1 -TestUser`. Use `-Reset` only when the person asks or the sandbox is dirty (wrong seed version, failed health contract, leftover state blocking the workflow).
3. Confirm `GET /health` → `test_user: true`. If not, stop and say so. Do not continue against the default runtime on 9876.
4. Run `npm run test:e2e` against that URL (or `python tools/run_e2e.py` when no live sandbox should be reused).
5. For each in-scope playbook: follow it in the already-open Chrome test profile; take screenshots; record pass/fail with evidence.
6. Reply with the report template. List skipped rows (`hermes-live-provider` unless requested).

Live Hermes: only if the person says to use a live provider in that session. Still test-user only. Still no secrets in the report.

## How a new test is added

When a screen or workflow is added or changed:

1. Add or update a row in the matching `e2e/catalog/*.md` file and in the index.
2. Add or extend `e2e/specs/<area>.spec.ts`.
3. If the row marks **agent**, add or update `e2e/playbooks/<id>.md`.
4. Run `python tools/run_e2e.py` locally (or the skill).
5. Update `docs/AI_WORKING_GUIDE.md` only if the agent operating loop changes (new command, new sandbox rule).

No catalog row means the work is not done.

## File map

| Path | Responsibility |
|---|---|
| `e2e/catalog/README.md` | Index of all workflow ids |
| `e2e/catalog/*.md` | Per-area rows |
| `e2e/specs/*.spec.ts` | Playwright |
| `e2e/playbooks/*.md` | Agent-only checks |
| `e2e/playwright.config.ts` | Playwright config |
| `tools/run_e2e.py` | Isolated harness for CI and headless local runs |
| `.github/workflows/e2e.yml` | PR gate |
| `.cursor/skills/aurea-e2e/SKILL.md` | On-request agent procedure |
| `.cursor/skills/aurea-e2e/rules.md` | Privacy and fail-closed rules |
| `.cursor/skills/aurea-e2e/report-template.md` | Report shape |
| `package.json` | `test:e2e` script; Playwright as a **devDependency** (pin a current version; do not mass-upgrade other packages) |
| `docs/AI_WORKING_GUIDE.md` | Point agents at the skill and `python tools/run_e2e.py` |
| `docs/data-persistence.md` | Unchanged rules; E2E must follow them |

## Implementation order

Each step must leave the repo with a runnable check:

1. Harness + Playwright config + `boot-*` specs + CI workflow.
2. Catalog index + skill (procedure works even if later specs are still missing; report lists them as not yet implemented).
3. Shell + Astrologia CI specs, then Caderno, Diario, Agenda, Saúde, Memórias, Hermes mocked, study-loop.
4. Agent playbooks: mandala, caderno-visual, saude, hermes.
5. Guide update: `docs/AI_WORKING_GUIDE.md` test-user section points at the skill and harness.

Existing `tests/mandala_visual_smoke.ps1` stays until `astrologia-seeded-natal` plus `playbooks/mandala.md` are in place; then the guide can prefer the new path.

## Error handling

| Situation | Behavior |
|---|---|
| Health is not `test_user: true` | Fail closed. Do not click the default app. |
| Personal data dir would be used | Refuse. Print the forbidden path. |
| Playwright assertion fails | Non-zero exit; screenshot/trace; CI red. |
| Playbook cannot judge (UI missing) | Fail that `id`; do not skip silently. |
| Live provider not requested | Skip `hermes-live-provider` and say so. |
| Port 9878 busy with a non-test API | Do not reuse it. Start a test-user runtime or fail. |
| Seed version mismatch | Skill uses `-Reset` only with person consent or a clearly dirty sandbox; CI always uses a fresh temp dir. |

## Acceptance

- `python tools/run_e2e.py` on a clean checkout runs the CI specs and exits 0 when they pass.
- A PR that breaks `shell-navigation` or `boot-local-owner` is red in GitHub Actions.
- Asking an agent to “run E2E on the test user” loads the skill, uses only the sandbox, and returns a per-id report.
- Personal Aurea data is untouched after both CI and skill runs.
- Every row in this spec’s catalog exists as a catalog file row before the work is called complete. Specs and playbooks may land in the order above; the index must still list every id, marking unimplemented specs as pending until they exist.

## Spec self-review

- No TBD/TODO placeholders.
- CI never runs agent playbooks or live Hermes — consistent with the hybrid split.
- Skill reuses the Windows sandbox; CI uses a temp dir — both require `test_user: true`.
- Scope is Chrome local-first E2E plus agent skill; not engine certification and not Tauri.
- “Incomplete birth” means missing required fields, not silent defaults.
- Catalog ids are the join key across specs, playbooks, and reports.
