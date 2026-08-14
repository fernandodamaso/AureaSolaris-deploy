# Playbook: hermes

Catalog: `study-loop` (default, mocked) and `hermes-live-provider` (only if person requested live)

## Mocked / default
1. Run study-loop visually after Playwright.
2. Pass if Hermes distinguishes answer as assistant text and "Propor memória" remains a proposal.
3. Fail if a memory/task/event appears without explicit approval.

## Live (only when requested)
1. Still test-user only.
2. Send one short study question; do not paste secrets.
3. Pass if reply is coherent and sources/uncertainty are not invented as certified calculation.
4. Never log API keys in the report.
