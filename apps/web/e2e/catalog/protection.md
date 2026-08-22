# Protection

## protection-boundary

- feature: Hosted preview protection
- steps: Visit the configured web, API, and unrelated origins with synthetic bypass headers.
- assert: Only the exact web and API origins receive their own bypass value; unrelated origins receive neither.
- spec: `e2e/specs/protection-boundary.spec.ts`
- playbook: none
- seed: isolated local HTTP origins
