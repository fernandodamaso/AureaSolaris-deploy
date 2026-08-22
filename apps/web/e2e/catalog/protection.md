# Protection

## protection-boundary

- feature: Hosted preview protection
- steps: Visit the configured web, API, and unrelated origins with synthetic bypass headers.
- assert: Only the exact web and API origins receive their own bypass value; unrelated origins receive neither.
- spec: `e2e/specs/protection-boundary.spec.ts`
- playbook: none
- seed: isolated local HTTP origins

## hosted-ownership-boundary

- feature: Hosted private Web V1
- steps: Open the hosted shell; observe natal and transit receipts; check unauthenticated and second-user receipt access; reload; log out.
- assert: Rendered receipts remain available after reload; unauthenticated access is rejected; another user's receipt is not disclosed; requests stay off local and production origins.
- spec: `e2e/specs/ownership.spec.ts`
- playbook: none
- seed: hosted Web V1 account and second-user credential

## deployed-smoke

- feature: Deployed web shell
- steps: Open the configured deployment and inject a same-origin missing stylesheet.
- assert: The shell loads without page errors or critical static failures; a real critical HTTP 404 is recorded.
- spec: `e2e/specs/deployed-smoke.spec.ts`
- playbook: none
- seed: configured deployment URL
