# Histórico, Agenda, Saúde, Memórias

## diario-edit-reload

- feature: Diário
- steps: Open Histórico & Notas; edit Primeira anotacao de teste; reload.
- assert: Edited text survives reload.
- spec: none
- playbook: none
- seed: diary entry title `Primeira anotacao de teste`

## agenda-task-event

- feature: Agenda
- steps: Open Agenda; create and complete/delete a task; create and delete an event.
- assert: Seeded task visible; new task and event complete their explicit lifecycle and disappear when deleted.
- spec: none
- playbook: none
- seed: `Revisar mandala de teste`

## saude-preview-upload

- feature: Saúde
- steps: Open Saúde; confirm seeded preview; upload PDF explicitly.
- assert: Preview and upload history; no diagnosis/prescription copy.
- spec: none
- playbook: `e2e/playbooks/saude.md`
- seed: `preview-teste`; fixture `e2e/fixtures/health-e2e.pdf`

## memorias-review

- feature: Memórias
- steps: Open Memórias; use approve/revoke/forget controls.
- assert: Seeded memories visible; controls present.
- spec: none
- playbook: none
- seed: `Memoria proposta de teste` / `Memoria aprovada de teste`

## memorias-open-caderno

- feature: Memórias
- steps: Click Estudar no Caderno from a memory.
- assert: Caderno opens.
- spec: none
- playbook: none
- seed: approved/proposed memories
