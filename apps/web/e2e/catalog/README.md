# E2E catalog

Source of truth for agent and CI workflows. Spec: `docs/superpowers/specs/2026-08-13-agent-e2e-design.md`.

| id | area | CI | playbook | status |
|---|---|---|---|---|
| boot-local-owner | boot | no | none | excluded-web-v1 |
| boot-health-test-user | boot | no | none | excluded-web-v1 |
| shell-navigation | boot | no | none | excluded-web-v1 |
| boot-private-web-v1 | boot | yes | none | implemented |
| profile-onboarding | profile | yes | none | implemented |
| degraded-service | account-service | yes | none | implemented |
| astrologia-certified-natal | astrologia | yes | e2e/playbooks/mandala.md | implemented |
| astrologia-retry | astrologia | yes | none | implemented |
| astrologia-certified-transit | astrologia | yes | none | implemented |
| caderno-seeded-board | caderno | no | e2e/playbooks/caderno-visual.md | excluded-web-v1 |
| caderno-edit-undo | caderno | no | none | excluded-web-v1 |
| caderno-create-study | caderno | no | none | excluded-web-v1 |
| caderno-reload | caderno | no | none | excluded-web-v1 |
| diario-edit-reload | diario | no | none | excluded-web-v1 |
| agenda-task-event | agenda | no | none | excluded-web-v1 |
| saude-preview-upload | saude | no | e2e/playbooks/saude.md | excluded-web-v1 |
| memorias-review | memorias | no | none | excluded-web-v1 |
| memorias-open-caderno | memorias | no | none | excluded-web-v1 |
| hermes-mocked-proposal | hermes | no | none | excluded-web-v1 |
| hermes-live-provider | hermes | no | e2e/playbooks/hermes.md | pending |
| study-loop | hermes | no | e2e/playbooks/hermes.md | excluded-web-v1 |
| protection-boundary | protection | no | none | implemented |
| hosted-ownership-boundary | protection | no | none | implemented |
| deployed-smoke | deployment | yes | none | implemented |

`excluded-web-v1` rows are historical local-product scenarios with no active spec or CI coverage in the private Web V1. Playbooks are under `e2e/playbooks/`.
