# Boot and shell

## boot-local-owner

- feature: Boot
- steps: Open `/`. Do not log in.
- assert: Heading Aurea Solaris; profile shows Pessoa Teste; no login screen.
- spec: none
- playbook: none
- seed: test-user account `aurea-test`

## boot-health-test-user

- feature: Health
- steps: `GET /health`
- assert: `test_user === true`, `browser_contract_version === 2`
- spec: none
- playbook: none (skill refuses if false)
- seed: `AUREA_TEST_USER=1`

## shell-navigation

- feature: Shell
- steps: Click each sidebar item; open Hermes FAB; open profile button.
- assert: Each page title/landmark appears; Hermes panel opens; profile editor opens.
- spec: none
- playbook: none
- seed: test-user UI seed

## boot-private-web-v1

- feature: Boot
- steps: Check disposable API health; open `/` and complete the private Web V1 shell bootstrap.
- assert: Health status is `ok`; Astrologia is visible; Entrar and Agenda Preditiva are absent.
- spec: `e2e/specs/boot.spec.ts`
- playbook: none
- seed: disposable Web V1 account

## profile-onboarding

- feature: Profile
- steps: Log in; save a profile without birth data; add birth data; reload; log out.
- assert: Profile and birth-profile forms advance; the saved profile remains after reload; Entrar is visible after logout.
- spec: `e2e/specs/a_profile.spec.ts`
- playbook: none
- seed: disposable Web V1 account

## degraded-service

- feature: Account service
- steps: Mock `/v1/me` as unavailable; log in; retry; log out.
- assert: The account outage alert and retry control are visible; logout returns to Entrar.
- spec: `e2e/specs/degraded-service.spec.ts`
- playbook: none
- seed: disposable Web V1 account
