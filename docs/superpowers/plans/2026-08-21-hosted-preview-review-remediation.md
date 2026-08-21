# Hosted Preview Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the independent review findings, recertify the complete hosted private preview flow from an upstream-owned candidate commit, reconcile provider evidence, and leave FDM-733 ready for its explicit upstream-main promotion gate.

**Architecture:** The React application, not the Playwright request fixture, will create and render both natal and transit receipts. The hosted ownership test will observe those browser-generated responses, verify the rendered evidence and reload persistence, and use direct API requests only for security-negative checks. Preview secrets will remain inherited process environment values; the verifier will never copy them into `cmd.exe` or another process argument.

**Tech Stack:** React 19, TypeScript 5.8, Vitest, Testing Library, Playwright 1.55, Bash, PowerShell/Git Bash on Windows, FastAPI, Supabase Auth/Postgres, Vercel CLI, Git, Linear.

**Spec:** Live Linear FDM-729, FDM-730, FDM-732, FDM-733, and FDM-748; [`docs/operations/deployments/2026-08-21-fdm-732.md`](../../operations/deployments/2026-08-21-fdm-732.md); independent review findings recorded in the originating Codex task.

## Global Constraints

- Development source of truth is `vivicabsb-eng/AureaSolaris`; deployment mirror is `fernandodamaso/AureaSolaris-deploy`.
- Do not push or merge upstream `main` until Fernando gives the explicit approval required by `AGENTS.md`.
- A repaired FDM-732 candidate must exist in the upstream repository on a non-main `codex/` branch before mirror `preview` moves to the same object.
- Do not create a production automation user or learn, log, store, or request the production owner's password.
- Never place passwords, JWTs, database credentials, Supabase secret keys, or Vercel protection values in Git, Linear, logs, screenshots, traces, chat, or process command arguments.
- Keep Vercel deployment protection enabled. Use only the local authenticated restricted access path.
- Preview uses Supabase `rosklqnnbmhowohoyboj`; production uses `tgpcpxqqusehssaihvcp`.
- Keep the committed migration SHA256 `42d3b1f57a52ae3fff45a0086075518a18d8924f6deb5cf7d5b1143aef46dcb2` identical in both projects.
- Do not enable Supabase leaked-password protection on the free plan; retain the verified provider warning and its billing limitation as evidence.
- Preserve historical Linear comments. Add one clearly dated superseding record instead of deleting audit history.
- Keep screenshots, video, and traces disabled for the credentialed ownership test.
- Every implementation task ends with a focused commit and a clean `git status --short --branch`.

## File map

| File | Responsibility after remediation |
| --- | --- |
| `scripts/verify_preview.sh` | Provider and hosted ownership wrapper; secrets remain environment-only. |
| `tests/test_preview_verification_script.py` | Regression guard against command-line secret interpolation. |
| `docs/operations/VERCEL_RUNBOOK.md` | Exact safe Windows/Git Bash execution route. |
| `apps/web/src/hooks/useLiveTransitData.ts` | Certified transit loading with an explicit disabled state. |
| `apps/web/src/__tests__/hooks/useLiveTransitData.test.ts` | Disabled-state and certified-transit hook coverage. |
| `apps/web/src/components/common/CalculationEvidence.tsx` | Reusable, distinctly named natal/transit receipt evidence region. |
| `apps/web/src/__tests__/components/CalculationEvidence.test.tsx` | Accessible evidence-region naming coverage. |
| `apps/web/src/components/MandalaPage.tsx` | Rendered natal and current-transit evidence in the private V1 dashboard. |
| `apps/web/e2e/helpers/app.ts` | Shared login/onboarding and protected API routing only. |
| `apps/web/e2e/specs/astrologia.spec.ts` | Focused rendered natal/transit receipt checks. |
| `apps/web/e2e/specs/ownership.spec.ts` | Complete hosted private flow plus receipt-ownership negatives. |
| `docs/operations/deployments/2026-08-21-fdm-732.md` | Sanitized final candidate/deployment evidence and supersession notice. |
| `README.md` | Canonical production state only after FDM-733 promotion. |

---

### Task 1: Reopen the acceptance gate and freeze the current evidence

**Files:**
- Inspect: `docs/operations/deployments/2026-08-21-fdm-732.md`
- External record: Linear FDM-732

**Interfaces:**
- Consumes: independent review findings and live FDM-732 acceptance criteria.
- Produces: an explicit In Progress remediation state; no provider or Git ref mutation.

- [ ] **Step 1: Record the clean baseline**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
git ls-remote https://github.com/fernandodamaso/AureaSolaris-deploy.git refs/heads/main refs/heads/preview
```

Expected: clean worktree; upstream and mirror `main` remain `6ddda7627e9634e91fa303e296dec79fd93b9340`; mirror `preview` remains the previously tested candidate until replacement.

- [ ] **Step 2: Reopen FDM-732**

Move FDM-732 from Done to In Progress and add one sanitized comment:

```markdown
Independent review found two acceptance gaps: the candidate exists only in the deployment mirror, and the hosted test creates receipts through the request fixture instead of proving both rendered receipt paths. FDM-732 is reopened while those gaps and the command-line secret exposure are repaired. No production ref or provider configuration changed.
```

Expected: FDM-732 is In Progress. FDM-733 remains Backlog and blocked by FDM-732.

- [ ] **Step 3: Confirm the stop boundary**

Do not change upstream `main`, mirror `main`, Vercel production, Supabase production identities, or any production password flow during Tasks 1-6.

---

### Task 2: Remove secrets from the Windows command line

**Files:**
- Create: `tests/test_preview_verification_script.py`
- Modify: `scripts/verify_preview.sh:58-66`
- Modify: `docs/operations/VERCEL_RUNBOOK.md:35-45`

**Interfaces:**
- Consumes: the existing `AUREA_E2E_*`, `AUREA_VERCEL_*`, and `SUPABASE_PREVIEW_*` environment names.
- Produces: `scripts/verify_preview.sh` invoking Playwright with inherited environment only.

- [ ] **Step 1: Write the failing security regression**

Create `tests/test_preview_verification_script.py`:

```python
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PreviewVerificationScriptTests(unittest.TestCase):
    def test_playwright_secrets_are_not_copied_into_a_command_line(self) -> None:
        script = (ROOT / "scripts" / "verify_preview.sh").read_text(encoding="utf-8")

        self.assertNotIn("cmd.exe /d /s /c", script)
        self.assertNotIn("set AUREA_E2E_PASSWORD=", script)
        self.assertNotIn("set AUREA_E2E_SECOND_JWT=", script)
        self.assertNotIn("set AUREA_VERCEL_API_PROTECTION_BYPASS=", script)
        self.assertIn('"${NPX[@]}" playwright test', script)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the regression and verify it fails**

Run:

```powershell
python -m unittest discover -s tests -p test_preview_verification_script.py -v
```

Expected: FAIL because `scripts/verify_preview.sh` still contains `cmd.exe /d /s /c` and inline `set` commands.

- [ ] **Step 3: Replace the command-line bridge with inherited environment execution**

In `scripts/verify_preview.sh`, keep the existing required-variable checks and exports. Replace the `cmd.exe` command with:

```bash
if command -v npx.cmd >/dev/null 2>&1; then
  NPX=(npx.cmd)
elif command -v npx >/dev/null 2>&1; then
  NPX=(npx)
else
  printf 'npx is required.\n' >&2
  exit 1
fi

"${NPX[@]}" playwright test apps/web/e2e/specs/ownership.spec.ts \
  --config=apps/web/e2e/playwright.config.ts --project=chromium --workers=1
```

Do not add a file-based secret handoff. The parent process must supply secrets through its environment.

- [ ] **Step 4: Document the safe Windows invocation**

Add this section to `docs/operations/VERCEL_RUNBOOK.md`:

````markdown
## Protected hosted acceptance on Windows

Load the approved short-lived values into the current PowerShell process through the secure provider/secret-store path. Do not place their values in a command string. Then invoke Git Bash directly so it inherits the environment:

```powershell
$requiredNames = @(
  'AUREA_E2E_URL', 'AUREA_E2E_API_URL', 'AUREA_E2E_EMAIL',
  'AUREA_E2E_PASSWORD', 'AUREA_E2E_SECOND_JWT',
  'AUREA_VERCEL_WEB_PROTECTION_BYPASS',
  'AUREA_VERCEL_API_PROTECTION_BYPASS',
  'SUPABASE_PREVIEW_URL', 'SUPABASE_PREVIEW_ANON_KEY'
)
$missingNames = $requiredNames | Where-Object { -not (Test-Path "Env:$_") }
if ($missingNames) { throw "Missing secure environment names: $($missingNames -join ', ')" }
& 'C:\Program Files\Git\bin\bash.exe' scripts/verify_preview.sh
if ($LASTEXITCODE -ne 0) { throw 'Hosted preview verification failed.' }
```

Use Git Bash on Windows. Do not use WSL to launch Windows Node because WSL does not forward arbitrary Linux environment variables to Windows child processes.
````

- [ ] **Step 5: Run focused validation**

Run:

```powershell
python -m unittest discover -s tests -p test_preview_verification_script.py -v
& 'C:\Program Files\Git\bin\bash.exe' -n scripts/verify_preview.sh
```

Expected: both commands pass. No secret value appears in output or process arguments.

- [ ] **Step 6: Commit the security fix**

```powershell
git add tests/test_preview_verification_script.py scripts/verify_preview.sh docs/operations/VERCEL_RUNBOOK.md
git diff --cached --check
git commit -m "fix: keep preview credentials out of command lines"
git status --short --branch
```

Expected: focused commit; clean worktree.

---

### Task 3: Render distinct natal and transit receipt evidence

**Files:**
- Create: `apps/web/src/__tests__/components/CalculationEvidence.test.tsx`
- Modify: `apps/web/src/__tests__/hooks/useLiveTransitData.test.ts:58-159`
- Modify: `apps/web/src/components/common/CalculationEvidence.tsx:18-75`
- Modify: `apps/web/src/hooks/useLiveTransitData.ts:71-126`
- Modify: `apps/web/src/components/MandalaPage.tsx:115-320`

**Interfaces:**
- Consumes: `readCertifiedCalculation(result, 'natal' | 'transit')`, `useLiveTransitData(natalData, enabled)`, and `CalculationEvidence` receipt metadata.
- Produces: `CalculationEvidence({ ariaLabel, meta, loading, error })` and a dashboard with accessible regions `Proveniência do mapa natal` and `Proveniência dos trânsitos atuais`.

- [ ] **Step 1: Write the failing accessible-region test**

Create `apps/web/src/__tests__/components/CalculationEvidence.test.tsx` with a certified receipt fixture and this assertion:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalculationEvidence } from '../../components/common/CalculationEvidence';

const meta = {
  receipt: {
    input_hash: 'verified-hash',
    engine: { name: 'aurea-solaris-astro-engine', version: '2026.08' },
    resolved_time: { utc: '2026-08-21T18:00:00Z', iana_timezone: 'UTC' },
    ephemeris: { library: 'pyswisseph', library_version: '2.10.03', mode: 'swiss' },
    zodiac: 'tropical',
  },
};

describe('CalculationEvidence', () => {
  it('uses the supplied accessible name for a receipt region', () => {
    render(
      <CalculationEvidence
        ariaLabel="Proveniência dos trânsitos atuais"
        meta={meta}
        loading={false}
      />,
    );

    expect(screen.getByRole('region', { name: 'Proveniência dos trânsitos atuais' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the failing disabled-transit test**

Add to `apps/web/src/__tests__/hooks/useLiveTransitData.test.ts`:

```tsx
it('does not request a transit before a certified natal result is available', async () => {
  const calculateTransits = vi.fn();
  const api = { calculateTransits } as unknown as ApiClient;
  const { result } = renderHook(() => useLiveTransitData(undefined, false), {
    wrapper: wrapperFor(api),
  });

  expect(result.current.loading).toBe(false);
  expect(calculateTransits).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the two focused tests and verify they fail**

Run:

```powershell
npm.cmd --workspace @aurea/web run test -- src/__tests__/components/CalculationEvidence.test.tsx src/__tests__/hooks/useLiveTransitData.test.ts
```

Expected: FAIL because `ariaLabel` and the `enabled` parameter do not exist.

- [ ] **Step 4: Add the evidence-region name**

Extend `CalculationEvidenceProps`:

```tsx
interface CalculationEvidenceProps {
  ariaLabel?: string;
  meta?: CalculationMeta;
  loading: boolean;
  error?: string | null;
}
```

Destructure `ariaLabel` with the current default, then apply these three exact JSX changes so loading, error, and success remain discoverable:

```diff
-export const CalculationEvidence = ({ meta, loading, error }: CalculationEvidenceProps) => {
+export const CalculationEvidence = ({ ariaLabel = 'Proveniência do cálculo', meta, loading, error }: CalculationEvidenceProps) => {
@@
-    return <div role="status" className="flex items-center gap-2 rounded-xl border border-gold/20 bg-[#FCF9F1] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8b7344]">
+    return <div role="status" aria-label={ariaLabel} className="flex items-center gap-2 rounded-xl border border-gold/20 bg-[#FCF9F1] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8b7344]">
@@
-    return <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
+    return <div role="status" aria-label={ariaLabel} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
@@
-    <section aria-label="Proveniência do cálculo" className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
+    <section aria-label={ariaLabel} className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
```

Keep the existing CSS classes and technical fields unchanged.

- [ ] **Step 5: Add the explicit disabled state to `useLiveTransitData`**

Change the signature and initial loading state:

```tsx
export const useLiveTransitData = (natalData?: NatalPositions, enabled = true) => {
  const [loading, setLoading] = useState(enabled);
```

At the start of `fetchAstro`, return safely while disabled:

```tsx
if (!enabled) {
  setLoading(false);
  return;
}
```

Include `enabled` in the callback dependencies. At the start of the effect, abort and clear transient state while disabled:

```tsx
if (!enabled) {
  activeRequest.current?.abort();
  setLiveData(null);
  setError(null);
  setLoading(false);
  return;
}
```

Existing callers keep current behavior because `enabled` defaults to `true`.

- [ ] **Step 6: Render both receipt regions in `MandalaPage`**

Import `useLiveTransitData`. Derive personal transit input only from the certified natal result:

```tsx
const certifiedNatal = useMemo(() => readCertifiedCalculation(data, 'natal'), [data]);
const natalPositions = useMemo(() => {
  const planets = certifiedNatal?.planets;
  const Sun = planets?.Sun?.degree;
  const Moon = planets?.Moon?.degree;
  const ASC = planets?.ASC?.degree;
  if (![Sun, Moon, ASC].every(Number.isFinite)) return undefined;
  return {
    Sun: Sun as number,
    Moon: Moon as number,
    ASC: ASC as number,
    Mercury: planets?.Mercury?.degree,
    Venus: planets?.Venus?.degree,
    Mars: planets?.Mars?.degree,
  };
}, [certifiedNatal]);
const {
  liveData: transitData,
  loading: transitLoading,
  error: transitError,
} = useLiveTransitData(natalPositions, Boolean(natalPositions));
```

Replace the single evidence block with two clearly headed regions:

```tsx
<div className="grid w-full max-w-3xl gap-3 lg:grid-cols-2">
  <div>
    <h2 className="sr-only">Mapa natal</h2>
    <CalculationEvidence
      ariaLabel="Proveniência do mapa natal"
      meta={data?.meta}
      loading={loading}
      error={error}
    />
  </div>
  <div>
    <h2 className="sr-only">Trânsitos atuais</h2>
    <CalculationEvidence
      ariaLabel="Proveniência dos trânsitos atuais"
      meta={transitData?.meta}
      loading={transitLoading}
      error={transitError}
    />
  </div>
</div>
```

- [ ] **Step 7: Run focused tests and the web build**

Run:

```powershell
npm.cmd --workspace @aurea/web run test -- src/__tests__/components/CalculationEvidence.test.tsx src/__tests__/hooks/useLiveTransitData.test.ts
npm.cmd --workspace @aurea/web run build
```

Expected: tests and build pass; no transit request occurs before a certified natal result exists.

- [ ] **Step 8: Commit the rendered receipt path**

```powershell
git add apps/web/src/components/common/CalculationEvidence.tsx apps/web/src/components/MandalaPage.tsx apps/web/src/hooks/useLiveTransitData.ts apps/web/src/__tests__/components/CalculationEvidence.test.tsx apps/web/src/__tests__/hooks/useLiveTransitData.test.ts
git diff --cached --check
git commit -m "feat: render certified transit evidence"
git status --short --branch
```

---

### Task 4: Make the hosted test observe the real browser flow

**Files:**
- Modify: `apps/web/e2e/specs/ownership.spec.ts:1-65`
- Modify: `apps/web/e2e/specs/astrologia.spec.ts:1-59`
- Modify: `apps/web/e2e/helpers/app.ts:48-66`

**Interfaces:**
- Consumes: browser-generated `POST /v1/astrology/natal` and `POST /v1/astrology/transits` responses and the two named receipt regions from Task 3.
- Produces: a hosted test that uses the natal receipt ID only for 401/404 security negatives and proves rendered persistence after reload.

- [ ] **Step 1: Replace request-fixture receipt creation with response observation**

In `ownership.spec.ts`, define the response shape:

```tsx
type ReceiptBody = {
  id: string;
  kind: 'natal' | 'transit';
  result_payload: {
    meta?: { receipt?: { schema_version?: string; input_hash?: string } };
  };
};
```

Before `waitForShell(page)`, register browser-response waits:

```tsx
const natalResponsePromise = page.waitForResponse(
  (response) => response.request().method() === 'POST'
    && response.url().startsWith(apiUrl)
    && response.url().endsWith('/v1/astrology/natal'),
  { timeout: 60_000 },
);
const transitResponsePromise = page.waitForResponse(
  (response) => response.request().method() === 'POST'
    && response.url().startsWith(apiUrl)
    && response.url().endsWith('/v1/astrology/transits'),
  { timeout: 60_000 },
);

await waitForShell(page);
const [natalResponse, transitResponse] = await Promise.all([
  natalResponsePromise,
  transitResponsePromise,
]);
expect(natalResponse.status()).toBe(200);
expect(transitResponse.status()).toBe(200);
const natalBody = await natalResponse.json() as ReceiptBody;
const transitBody = await transitResponse.json() as ReceiptBody;
expect(natalBody.kind).toBe('natal');
expect(transitBody.kind).toBe('transit');
expect(natalBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');
expect(transitBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');
```

Delete the direct authenticated natal/transit `request.post` calls. Keep `request.get` only for no-token and user-B ownership checks.

- [ ] **Step 2: Assert rendered technical evidence**

Add:

```tsx
const natalEvidence = page.getByRole('region', { name: 'Proveniência do mapa natal' });
const transitEvidence = page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' });
await expect(natalEvidence).toBeVisible({ timeout: 60_000 });
await expect(transitEvidence).toBeVisible({ timeout: 60_000 });
await natalEvidence.getByText('Ver recibo técnico').click();
await transitEvidence.getByText('Ver recibo técnico').click();
await expect(natalEvidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
await expect(transitEvidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
await expect(page.getByRole('heading', { name: 'Mandala Astrológica' })).toBeVisible();
await expect(page.locator('.mandala-chart-shell svg')).toBeVisible();
```

- [ ] **Step 3: Prove persistence after reload**

Register new natal/transit response waits before reload, reload, then assert the private dashboard and both evidence regions again:

```tsx
const reloadedNatal = page.waitForResponse((response) =>
  response.request().method() === 'POST' && response.url().endsWith('/v1/astrology/natal'));
const reloadedTransit = page.waitForResponse((response) =>
  response.request().method() === 'POST' && response.url().endsWith('/v1/astrology/transits'));
await page.reload();
await Promise.all([reloadedNatal, reloadedTransit]);
await expect(page.getByRole('button', { name: 'E2E Test User' })).toBeVisible({ timeout: 60_000 });
await expect(page.getByRole('region', { name: 'Proveniência do mapa natal' })).toBeVisible();
await expect(page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' })).toBeVisible();
```

Then execute the existing logout assertion. Keep URL-policy and console/page-error assertions unchanged.

- [ ] **Step 4: Update the focused astrology E2E spec**

In `astrologia.spec.ts`:

- Change natal queries from `Proveniência do cálculo` to `Proveniência do mapa natal`.
- Replace the direct transit API test with:

```tsx
test('astrologia-certified-transit: rendered transit receipt is available', async ({ page }) => {
  await openAstrologia(page);
  const evidence = page.getByRole('region', { name: 'Proveniência dos trânsitos atuais' });
  await expect(evidence).toBeVisible({ timeout: 60_000 });
  await evidence.getByText('Ver recibo técnico').click();
  await expect(evidence.getByText(/Hash da entrada:/).locator('..')).not.toContainText('não declarado');
  await expect(evidence.getByText(/Efeméride:/)).not.toContainText('não declarada');
});
```

- Remove its duplicate `readAccessToken` helper and unused `request` fixture.

- [ ] **Step 5: Remove the no-longer-used access-token helper**

Delete `readAccessToken` from `apps/web/e2e/helpers/app.ts` after `rg -n "readAccessToken" apps/web/e2e` confirms no caller remains.

- [ ] **Step 6: Run static and focused checks**

Run:

```powershell
rg -n "request\.post.*astrology/(natal|transits)|readAccessToken" apps/web/e2e
npm.cmd --workspace @aurea/web run build
```

Expected: no direct natal/transit creation remains in the ownership or astrology specs; build passes.

- [ ] **Step 7: Commit the acceptance repair**

```powershell
git add apps/web/e2e/helpers/app.ts apps/web/e2e/specs/astrologia.spec.ts apps/web/e2e/specs/ownership.spec.ts
git diff --cached --check
git commit -m "test: prove rendered hosted receipt flow"
git status --short --branch
```

---

### Task 5: Publish one upstream-owned candidate and recertify preview

**Files:**
- Modify after provider verification: `docs/operations/deployments/2026-08-21-fdm-732.md`

**Interfaces:**
- Consumes: clean commits from Tasks 2-4 and existing authenticated Vercel/Supabase tooling.
- Produces: one `candidate_sha` present on upstream `codex/fdm-732-remediation`, mirror `preview`, and both READY Vercel preview deployments.

- [ ] **Step 1: Run the full local gate**

Run:

```powershell
npm.cmd run quality:gate
python -m unittest discover -s tests -p test_preview_verification_script.py -v
git status --short --branch
git diff
```

Expected: all checks pass and the worktree is clean.

- [ ] **Step 2: Freeze the candidate SHA**

```powershell
$candidateSha = git rev-parse HEAD
git merge-base --is-ancestor 6ddda7627e9634e91fa303e296dec79fd93b9340 $candidateSha
if ($LASTEXITCODE -ne 0) { throw 'Candidate is not a fast-forward of the verified baseline.' }
```

Expected: `$candidateSha` is the exact immutable application candidate.

- [ ] **Step 3: Push the candidate to an upstream non-main branch**

```powershell
git push origin "${candidateSha}:refs/heads/codex/fdm-732-remediation"
$upstreamCandidate = (git ls-remote origin refs/heads/codex/fdm-732-remediation).Split()[0]
if ($upstreamCandidate -ne $candidateSha) { throw 'Upstream candidate SHA mismatch.' }
```

This does not authorize or modify upstream `main`.

- [ ] **Step 4: Move mirror preview to the exact upstream-owned object**

```powershell
git push https://github.com/fernandodamaso/AureaSolaris-deploy.git "${candidateSha}:refs/heads/preview"
$mirrorPreview = (git ls-remote https://github.com/fernandodamaso/AureaSolaris-deploy.git refs/heads/preview).Split()[0]
if ($mirrorPreview -ne $candidateSha) { throw 'Mirror preview SHA mismatch.' }
```

Expected: upstream candidate branch and mirror preview are equal. Upstream and mirror `main` remain unchanged.

- [ ] **Step 5: Verify Vercel exact-SHA deployments**

Run:

```powershell
$webDeployments = vercel ls aurea-solaris --scope fernando-damasos-projects --json | ConvertFrom-Json
$apiDeployments = vercel ls aurea-solaris-api --scope fernando-damasos-projects --json | ConvertFrom-Json
$webCandidate = $webDeployments.deployments | Where-Object { $_.meta.githubCommitSha -eq $candidateSha } | Select-Object -First 1
$apiCandidate = $apiDeployments.deployments | Where-Object { $_.meta.githubCommitSha -eq $candidateSha } | Select-Object -First 1
if ($webCandidate.state -ne 'READY' -or $apiCandidate.state -ne 'READY') { throw 'Matching preview deployments are not READY.' }
$webInspection = vercel inspect "https://$($webCandidate.url)" --scope fernando-damasos-projects --json | ConvertFrom-Json
$apiInspection = vercel inspect "https://$($apiCandidate.url)" --scope fernando-damasos-projects --json | ConvertFrom-Json
```

Record only:

- project ID/name;
- deployment ID and URL;
- `READY` state;
- Git branch `preview`;
- exact `$candidateSha`.

Expected: both preview deployments are READY and report `$candidateSha`.

- [ ] **Step 6: Run the secure hosted wrapper**

After the approved local secret/provider tooling has loaded the required values into the current PowerShell process, run:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' scripts/verify_preview.sh
if ($LASTEXITCODE -ne 0) { throw 'Hosted ownership gate failed.' }
```

Expected status-only output:

```text
api_health=200
api_unauthenticated_me=401
public_signup=disabled
1 passed
PASS: hosted preview ownership gate completed without printing credentials or payloads
```

Also run `scripts/smoke_api.sh` with the short-lived preview JWT inherited through the environment and `AUREA_SMOKE_ASTROLOGY=1`. Require health 200, expected fail-closed readiness, unauthenticated 401, authenticated route acceptance, and Swiss Ephemeris metadata.

```powershell
$env:AUREA_VERCEL_PROTECTION_BYPASS = $env:AUREA_VERCEL_API_PROTECTION_BYPASS
$env:AUREA_SMOKE_ASTROLOGY = '1'
& 'C:\Program Files\Git\bin\bash.exe' scripts/smoke_api.sh $env:AUREA_E2E_API_URL
if ($LASTEXITCODE -ne 0) { throw 'Preview API smoke failed.' }
```

`AUREA_SMOKE_JWT` must already exist in the inherited secure environment. Do not put its value in this command.

- [ ] **Step 7: Update the sanitized deployment record**

Replace the old candidate/deployment facts in `docs/operations/deployments/2026-08-21-fdm-732.md` with:

- `$candidateSha`;
- new web/API deployment IDs and URLs;
- both Supabase refs and migration hash;
- browser-created natal/transit receipt results;
- rendered evidence and reload-persistence results;
- 401/404 ownership results;
- public-sign-up-disabled result;
- the secret-safe Git Bash command using environment names only;
- a note that prior `d924411` evidence is superseded by this remediation.

Do not include emails, passwords, JWTs, birth values, bypass values, or response bodies.

- [ ] **Step 8: Commit the evidence without changing the tested candidate**

```powershell
git add docs/operations/deployments/2026-08-21-fdm-732.md
git diff --cached --check
git commit -m "docs: record repaired hosted preview acceptance"
$evidenceCommit = git rev-parse HEAD
git status --short --branch
```

Expected: `$evidenceCommit` is a documentation-only child of `$candidateSha`. Do not move mirror `preview` from `$candidateSha`. Keep this documentation commit local until the FDM-733 promotion sequence uses it or replaces it with its final production record.

---

### Task 6: Reconcile Linear evidence and issue status

**Files:**
- External records: Linear FDM-729, FDM-730, FDM-732, FDM-733, FDM-748

**Interfaces:**
- Consumes: final sanitized provider/deployment facts from Task 5.
- Produces: one current status record per affected issue, with historical comments preserved.

- [ ] **Step 1: Supersede stale Supabase snapshots**

Add one dated comment to FDM-729 and FDM-748 that starts with:

```markdown
Current verified provider state; this supersedes earlier timestamped bootstrap snapshots without deleting audit history.
```

Record only current project refs/health, migration name/hash, RLS/policies, public-sign-up-disabled state, identity counts, advisor warning, and secure secret names. State that older zero-identity/empty-migration comments were correct only at their original timestamps.

- [ ] **Step 2: Clarify the FDM-730/FDM-733 boundary**

Add one comment to FDM-730:

```markdown
FDM-730 is complete for provider project creation, environment isolation, exact-SHA preview build, and preview API smoke. The baseline production API 404 is not claimed as acceptance; exact production workload promotion and canonical production health remain owned by FDM-733.
```

Leave FDM-730 Done because its live acceptance criteria require preview build/smoke and production configuration isolation, while FDM-733 explicitly owns production promotion.

- [ ] **Step 3: Close FDM-732 only with repaired evidence**

Add a final sanitized FDM-732 comment with `$candidateSha`, upstream candidate branch, mirror preview SHA, both Vercel deployment IDs, migration hash, secure wrapper result, rendered natal/transit evidence, reload persistence, and 401/404/sign-up-disabled results. Then move FDM-732 to Done.

- [ ] **Step 4: Update FDM-733 without starting production**

Add a comment that `$candidateSha` is ready, `$evidenceCommit` is local documentation only, and upstream-main promotion is waiting at the explicit repository approval gate. Keep FDM-733 open.

---

### Task 7: Execute FDM-733 only after explicit upstream-main approval

**Files:**
- Modify: `README.md`
- Amend or replace: `docs/operations/deployments/2026-08-21-fdm-732.md`
- External records: upstream `main`, mirror `main`, Vercel production deployments, Linear FDM-733

**Interfaces:**
- Consumes: approved immutable `$candidateSha`, green FDM-732 evidence, and explicit Fernando approval for upstream `main`.
- Produces: exact production promotion plus one documentation-only automatic-deploy proof.

- [ ] **Step 1: Stop for the explicit approval**

Request approval for this exact action:

```text
Push the verified candidate SHA to vivicabsb-eng/AureaSolaris:main, fast-forward fernandodamaso/AureaSolaris-deploy:main to the same object, and allow both Vercel production projects to deploy it.
```

Do not treat approval for a feature branch or mirror preview as approval for upstream `main`.

- [ ] **Step 2: Re-run the immutable promotion preflight**

Require:

- clean worktree;
- FDM-732 Done with fresh evidence;
- upstream candidate branch and mirror preview equal `$candidateSha`;
- upstream and mirror `main` equal the recorded rollback SHA;
- production Supabase migration/auth/RLS state green;
- production Vercel environment-name scopes correct;
- no unexpected production identity.

- [ ] **Step 3: Fast-forward upstream and mirror main**

After approval:

```powershell
git push origin "${candidateSha}:refs/heads/main"
$upstreamMain = (git ls-remote origin refs/heads/main).Split()[0]
if ($upstreamMain -ne $candidateSha) { throw 'Upstream main promotion mismatch.' }
git push https://github.com/fernandodamaso/AureaSolaris-deploy.git "${candidateSha}:refs/heads/main"
$mirrorMain = (git ls-remote https://github.com/fernandodamaso/AureaSolaris-deploy.git refs/heads/main).Split()[0]
if ($mirrorMain -ne $candidateSha) { throw 'Mirror main promotion mismatch.' }
```

Never use force push.

- [ ] **Step 4: Verify production API before canonical web acceptance**

Require the production API deployment to report `$candidateSha`, `/health` 200 with `status=ok`, no-token `/v1/me` 401, production Supabase identity, disabled public sign-up, migration/RLS checks, and certified Swiss assets. Accept `/ready` only as either HTTP 200 with `status=ok` or the existing fail-closed HTTP 503 with `code=service_not_ready`; reject every other status/payload. Run an authenticated production smoke only through an already authorized owner session. If no secure session exists, request the one FDM-733 owner-login attestation without asking for a password or token.

- [ ] **Step 5: Verify the canonical web deployment**

Require `https://aurea-solaris.vercel.app` to report `$candidateSha`, return 200, render the login screen, use only production API/Supabase endpoints, and emit no localhost, loopback, HTTP mixed-content, Tauri, or preview requests.

- [ ] **Step 6: Create the documentation-only auto-deploy proof**

Update `README.md` with the canonical web/API deployment contract and update the deployment record with production deployment IDs, `$candidateSha`, rollback SHA, checks, and the owner-attestation boundary. Keep all values sanitized.

Amend the unpushed documentation-only child from Task 5 so there is one final documentation-only commit directly on `$candidateSha`:

```powershell
git add README.md docs/operations/deployments/2026-08-21-fdm-732.md
git diff --cached --check
git commit --amend -m "docs: record Web V1 production promotion"
$documentationSha = git rev-parse HEAD
```

Push `$documentationSha` to upstream `main`, then mirror `main`, without force. Verify both Vercel projects detect the commit. If a project intentionally skips because its root path did not change, record that provider event as the required path-filter evidence instead of forcing a code change.

- [ ] **Step 7: Complete FDM-733**

Add one sanitized Linear comment containing candidate/documentation SHAs, production deployment IDs, exact-SHA equality, automated checks, rollback target, auto-deploy or intentional-skip evidence, and the production owner-attestation result or remaining human-only attestation. Mark FDM-733 Done only when its live acceptance criteria are satisfied.

- [ ] **Step 8: Final repository check**

```powershell
git status --short --branch
git diff
git log -3 --oneline
```

Expected: clean worktree, no unexplained untracked files, focused commit history, and no pending push except one explicitly reported human-only attestation if required.

---

## Self-review

- Spec coverage: all five review findings map to Tasks 2, 4-7; FDM-748 independence remains unchanged.
- Secret safety: no step contains or requests a secret value; provider values remain inherited environment data.
- Dependency order: FDM-733 cannot start production promotion until repaired FDM-732 is Done.
- Git topology: upstream non-main candidate and mirror preview are exact before hosted acceptance; upstream/mirror main remain protected until explicit approval.
- Evidence consistency: historical comments remain intact and one current superseding record removes ambiguity.
- Product scope: the only product addition is the minimum missing rendered transit receipt evidence required to prove the live acceptance flow.
