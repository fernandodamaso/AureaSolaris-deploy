---
name: aurea-e2e
description: Runs Aurea Solaris end-to-end checks on the isolated test-user sandbox (Playwright plus optional visual playbooks). Use when the user asks for E2E, test-user sandbox QA, full dummy life validation, mandala visual check, or Hermes playbook testing.
---

# Aurea E2E (test-user)

## When to use

Person asks to run E2E, validate a feature in the dummy life, or visually check mandala/Hermes/Caderno.

## Procedure

1. Read [e2e/catalog/README.md](../../../e2e/catalog/README.md). If the person named a feature, filter to those ids; otherwise all CI rows plus agent playbooks except `hermes-live-provider`.
2. Read [rules.md](rules.md). Obey fail-closed rules.
3. If no healthy test-user API on 9878–9899: from repo root run `.\launch_chrome.ps1 -TestUser`. Use `-Reset` only if the person asked or the sandbox is dirty.
4. Confirm `GET http://127.0.0.1:<port>/health` → `test_user: true`. If not, stop. Never continue on port 9876 default runtime.
5. Run Playwright: set `AUREA_E2E_URL` to that URL and `npm run test:e2e`, **or** `python tools/run_e2e.py` when a fresh temp runtime is preferred.
6. For each in-scope playbook under [e2e/playbooks/](../../../e2e/playbooks/), follow it in the test-user Chrome profile; screenshot; record pass/fail.
7. Reply using [report-template.md](report-template.md). List skipped ids.

Live Hermes only if the person explicitly requests a live provider in this session.
