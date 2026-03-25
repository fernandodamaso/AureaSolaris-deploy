# Priority 3 — Quality of Life: CI Pipeline, Design System Alignment, AGENTS Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI pipeline for automated linting and type checking, align the design system documentation with the actual gold-themed CSS, and clean up duplicated content in AGENTS.md.

**Architecture:** Create a minimal GitHub Actions workflow that runs on push/PR. Update `styles.css` to make the gold theme the primary design system (not a secondary "legacy" theme). Trim AGENTS.md to quick-reference only, pointing to full docs.

**Tech Stack:** GitHub Actions (YAML), Tailwind CSS v4 `@theme`, Markdown

---

## Context & Discoveries

- **No CI exists.** No `.github/` directory at all. `npm run lint` and `npx tsc --noEmit` are the two checks available.
- **Design system mismatch:** `styles.css` defines `--color-primary: #2563EB` (blue) and `--color-secondary: #14B8A6` (teal) as "New Global Design System Tokens", but the actual UI uses `#B8860B` (gold) everywhere — inline in `UIComponents.tsx`, `App.tsx`, and via `--color-mystic-accent: #B8860B`. The blue/teal tokens are **never referenced** in any component.
- **styles.css** has two naming systems: "Legacy Mystic Theme" (`--color-mystic-*`) and "New Global Design System Tokens" (`--color-primary`, etc.). The "legacy" theme is the one actually used.
- **AGENTS.md** has 143 lines. Lines 103-143 duplicate the architecture/personas section that's already in `docs/arquitetura.md`. The first 100 lines (navigation tables + rules) are the unique, high-value content.
- **eslint.config.js** is well-configured with TypeScript + React + React Hooks rules. `npm run lint` works.
- **package.json** has `"lint": "eslint src/"` and `"lint:fix": "eslint src/ --fix"` scripts.

---

## File Structure

### Files to Create
| File | Responsibility |
|------|----------------|
| `.github/workflows/ci.yml` | GitHub Actions: lint + typecheck on push/PR |

### Files to Modify
| File | Change |
|------|--------|
| `src/styles.css` | Make gold the primary theme, demote blue/teal to optional accents |
| `docs/design-system.md` | Rewrite to match actual gold theme implementation |
| `AGENTS.md` | Remove duplicated architecture section, keep quick-reference only |

---

## Task 1: Create GitHub Actions CI Workflow

**Files:**
- Create: `C:\AureaSolaris\.github\workflows\ci.yml`

- [ ] **Step 1: Create .github/workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Run Tests
        run: npm test
```

- [ ] **Step 3: Verify workflow syntax**

```bash
cat .github/workflows/ci.yml | python -c "import sys,yaml; yaml.safe_load(sys.stdin)"
```
Expected: no output (valid YAML)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint, typecheck, and tests"
```

---

## Task 2: Align Design System — Make Gold the Primary Theme

**Files:**
- Modify: `C:\AureaSolaris\src\styles.css`

- [ ] **Step 1: Update styles.css @theme block**

Replace the `@theme` block to make gold the primary color system:

```css
@theme {
  /* Aurea Solaris — Gold Theme (Primary) */
  --color-primary: #B8860B;
  --color-primary-light: #D4A843;
  --color-secondary: #333333;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-surface: #FFFFFF;
  --color-background: #FCF9F1;
  --color-sidebar: #F5F1E6;
  --color-text-main: #333333;
  --color-text-muted: #4B5563;

  /* Accent palette */
  --color-gold: #B8860B;
  --color-duck-bg: #2C7A7B;

  /* Typography */
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --font-heading: "Montserrat", "Poppins", sans-serif;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 2.5rem;
  --radius-2xl: 3.5rem;
  --radius-3xl: 4rem;
}
```

- [ ] **Step 2: Update :root and body to use new tokens**

```css
:root {
  font-family: var(--font-sans);
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  color: var(--color-text-main);
  background-color: var(--color-background);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-text-main);
    font-family: var(--font-sans);
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-sans);
    color: var(--color-text-main);
  }
}
```

- [ ] **Step 3: Verify the app still renders**

```bash
npm run dev
```
Expected: app starts on localhost:1420, gold theme visible

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "refactor: align design system tokens with actual gold theme"
```

---

## Task 3: Update design-system.md to Match Reality

**Files:**
- Modify: `C:\AureaSolaris\docs\design-system.md`

- [ ] **Step 1: Rewrite the color palette table**

Replace the entire color palette section:

```markdown
## 🎨 Paleta de Cores — Tema Dourado (Aurea Solaris)

| Token | Nome | Hex | Descrição |
|-------|------|-----|-----------|
| `--color-primary` | Gold | `#B8860B` | Cor principal — ações, destaques, identidade visual |
| `--color-primary-light` | Gold Light | `#D4A843` | Variação clara do dourado para hover/estados |
| `--color-secondary` | Dark Text | `#333333` | Texto secundário e elementos de contraste |
| `--color-success` | Success Green | `#10B981` | Sucesso e confirmação (Módulo Finanças) |
| `--color-warning` | Warning Orange | `#F59E0B` | Alertas e avisos |
| `--color-danger` | Danger Red | `#EF4444` | Erros e ações críticas |
| `--color-surface` | Surface White | `#FFFFFF` | Fundos de cards e elementos de UI |
| `--color-background` | Warm Cream | `#FCF9F1` | Fundo principal da aplicação |
| `--color-sidebar` | Sidebar Beige | `#F5F1E6` | Fundo da barra lateral |
| `--color-text-main` | Primary Text | `#333333` | Texto principal |
| `--color-text-muted` | Muted Text | `#4B5563` | Texto secundário e legendas |
| `--color-gold` | Gold Alias | `#B8860B` | Alias para `--color-primary` (compatibilidade) |
| `--color-duck-bg` | Uncle Duck Teal | `#2C7A7B` | Cor temática do módulo Finanças |
```

- [ ] **Step 2: Update the Tailwind v4 implementation section**

Replace the `@theme` CSS block in the doc to match the actual `styles.css` (from Task 2).

- [ ] **Step 3: Commit**

```bash
git add docs/design-system.md
git commit -m "docs: rewrite design system to reflect actual gold theme"
```

---

## Task 4: Clean Up AGENTS.md Duplication

**Files:**
- Modify: `C:\AureaSolaris\AGENTS.md`

- [ ] **Step 1: Remove the duplicated architecture section**

Remove lines 103-143 (everything after the `---` separator at line 101). The content that starts with `# Aurea Solaris — Módulos Core` through the end of the file is already covered by `docs/arquitetura.md`.

Replace with a single reference:

```markdown
---

> **📖 Para visão completa da arquitetura, comandos Tauri, fluxos de dados e sistema de persistência, consulte [`docs/arquitetura.md`](docs/arquitetura.md).**
```

- [ ] **Step 2: Add testing rule to the global rules section**

Add after the existing documentation rule (around line 76):

```markdown
### 🧪 Regra de Testes — Valide antes de commitar
> **Execute `npm test` antes de qualquer commit.** Se os testes falharem, corrija antes de prosseguir. Não commite código com testes quebrados.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: remove duplicated architecture section from AGENTS.md, add testing rule"
```

---

## Verification

After all tasks:

```bash
npm run lint           # No lint errors
npx tsc --noEmit       # TypeScript compiles
npm test               # All tests pass
cat .github/workflows/ci.yml | python -c "import sys,yaml; yaml.safe_load(sys.stdin)"  # Valid YAML
```
