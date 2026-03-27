# Plano de Redesign Visual — Aurea Solaris

**Data:** 25/03/2026
**Versão:** 2.0 (revisada com dupla verificação)
**Status:** Aguardando aprovação
**Inspiration:** Rafiki Dashboard (`C:/SegundoCerebro/rafiki_dashboard.html`)

> **Nota de versão:** Esta é a versão corrigida após análise sênior + dupla verificação automatizada. Contém contagens exatas de linhas, valores reais de border-radius e todos os 21 arquivos mapeados. Um agente pode implementar o plano sem ambiguidade.

---

## 🎯 Objetivos

Modernizar a identidade visual do Aurea Solaris com elementos cósmicos sutis, mantendo **intocados** UX, funcionalidades e backend.

---

## 📌 Preferências do Usuário (CONSTRAINTS)

| Desejo | Implementação |
|--------|---------------|
| Fundo papel com detalhes cósmicos sutis | Background `#FCF9F1`, elementos cósmicos como bordas/decoradores |
| Fontes **sans-serif** elegantes | Montserrat, Poppins, Raleway (sem serifadas) |
| Logotipo Sol personalizado | SVG inline na sidebar |
| Border-radius menor | 4-12px para componentes internos (não 28-40px) |
| Bordas arredondadas reduzidas na sidebar e modais | Sidebar `rounded-[1.5rem]`, modais `rounded-2xl` |
| Inspiração cósmica sem excesso | Símbolos Unicode (☉ ☽ ✦), bordas douradas sutis |

---

## 🔒 INSTRUÇÕES DE SEGURANÇA PARA AGENTE FRONT-END

### O QUE **PODE** SER MODIFICADO:
- `src/styles.css` — CSS global e tokens (**merge, nunca replace**)
- `src/App.tsx` — `globalStyles`, SVG do logo, cores gold, border-radius da sidebar, flag `hasChat`
- `src/components/common/UIComponents.tsx` — Estilos inline Tailwind apenas
- Componentes de view listados na seção "Arquivos de View" — **apenas** cores gold, border-radius, espaçamentos

### O QUE **NÃO PODE SER MODIFICADO:**
- Lógica de estado (`useState`, `useEffect`, etc.)
- Props de componentes
- Funções de negócio (agenda, astrologia, finanças)
- Chamadas `safeInvoke` e integrações Tauri
- Estrutura de renderização de páginas (switch case em `renderPage`)
- Hooks em `src/hooks/`
- Contextos em `src/context/`
- **Classes CSS já em uso e necessárias:** `panel-light`, `glass-panel`, `text-gold`, `bg-gold`, `font-sans`, `no-scrollbar`

---

## ⚠️ IMPACT ANALYSIS — Antes de começar

### Tokens que NÃO podem ser removidos de `styles.css`

| Token/Classe | Uso atual | Onde |
|---|---|---|
| `--color-primary`, `--color-secondary`, etc. | Sistema de cores (futuro) | `styles.css` |
| `--color-duck-bg` | Módulo Uncle Duck | `styles.css` |
| `--font-sans` | Tailwind utility `font-sans` — **19+ componentes** | Todos os `.tsx` |
| `--radius-xl: 2.5rem` | Sidebar (hardcoded `rounded-[2.5rem]`) | `App.tsx:221` |
| `--radius-2xl: 3.5rem` | Strange FAB container (hardcoded `rounded-[3.5rem]`) | `App.tsx:303` |
| `panel-light` | Classe CSS usada em `Card`, `TodoRow`, `StatBox`, `FamilyItem` | `UIComponents.tsx` + views |
| `glass-panel` | Header principal | `App.tsx` |
| `text-gold`, `bg-gold` | **230+ ocorrências** em todo o código | Todos os componentes |

### Classes novas que SERÃO adicionadas

| Classe | Propósito |
|---|---|
| `.font-display` | Montserrat — títulos principais |
| `.font-heading` | Poppins — headings secundários |
| `.font-label` | Raleway — labels e microtextos |
| `.cosmic-border` | Borda gold sutil com sombra |
| `.section-title` | Título de seção estilizado (inspirado no Rafiki) |
| `.pill-cosmic` | Pill decorativa angular (inspirado no Rafiki) |

### Arquivos que usam `#B8860B` — Total: 66 ocorrências em 13 arquivos

**Após mudar `.text-gold` / `.bg-gold` para `#c5a059` no `globalStyles`, substituir `#B8860B` → `#c5a059` nos seguintes arquivos (contagens EXATAS):**

| Arquivo | Ocorrências | Linhas |
|---|---|---|
| `src/App.tsx` | 12 | 41, 42, 47, 223, 228, 242, 257, 308, 309, 315, 324, 329 |
| `src/components/common/UIComponents.tsx` | 14 | 5, 6, 12, 13, 26, 27, 28, 31, 41, 61, 63, 77, 83, 92 |
| `src/components/MandalaChart.tsx` | 12 | 192, 195, 196, 197, 198, 199, 211, 212, 227, 251, 256, 270 |
| `src/components/common/Mandala.tsx` | 6 | 6, 7, 10, 11, 23, 28 |
| `src/components/MandalaView.tsx` | 6 | 39, 192, 193, 196, 213, 254 |
| `src/components/MesaCriacao.tsx` | 3 | 383, 431, 435 |
| `src/components/MandalaPage.tsx` | 3 | 76, 81, 101 |
| `src/components/LoginView.tsx` | 3 | 61, 102, 160 |
| `src/components/SaudeView.tsx` | 2 | 48, 99 |
| `src/components/FinancasView.tsx` | 2 | 28, 52 |
| `src/context/FinancasContext.tsx` | 1 | 51 |
| `src/components/ControlePanel.tsx` | 1 | 11 |
| **`src/components/AstrologiaBoard.tsx`** | **1** | **109** *(não estava no plano original — adicionado)* |
| `src/components/AgendaView.tsx` | **0** | ✅ Já está limpo |

> **Dica de execução:** Executar `grep -r "#B8860B" src/` antes de começar para confirmar as linhas, e após cada batch de substituições para validar.

---

## 📐 PADRÃO DE ESPAÇAMENTO E ALINHAMENTO

### Regra: Layout A — Com Chat (3 colunas do grid)

Usado quando a página tem agente de IA ativo. O grid aloca 360px para o painel de chat.

```tsx
// App.tsx: hasChat = true → grid: '260px | 1fr | 360px'
// Container externo do componente de view:
<div className="space-y-8 pb-24 animate-in fade-in max-w-5xl mx-auto px-4">
```

| Propriedade | Valor | Classe Tailwind | Nota |
|---|---|---|---|
| gap entre seções | 32px | `space-y-8` | Container externo |
| padding-bottom | 96px | `pb-24` | Espaço para scroll |
| max-width | 1024px (5xl) | `max-w-5xl` | Com chat, não precisa de 1280px |
| centralização | horizontal | `mx-auto` | Centraliza na área disponível |
| padding-x interno | 16px | `px-4` | Evita colar nas bordas |

**Páginas que usam Layout A:** Astrologia, Saúde, Agenda, Finanças, Hub, Controle

### Regra: Layout B — Sem Chat (2 colunas do grid)

Usado quando a página NÃO tem agente de IA. O grid aloca 0px para a 3ª coluna.

```tsx
// App.tsx: hasChat = false → grid: '260px | 1fr | 0px'
// Container externo do componente de view:
<div className="space-y-8 pb-24 animate-in fade-in max-w-7xl mx-auto px-4">
```

| Propriedade | Valor | Classe Tailwind | Nota |
|---|---|---|---|
| gap entre seções | 32px | `space-y-8` | Container externo |
| padding-bottom | 96px | `pb-24` | Espaço para scroll |
| max-width | 1280px (7xl) | `max-w-7xl` | Sem chat — usa toda a largura |
| centralização | horizontal | `mx-auto` | Centraliza na área disponível |
| padding-x interno | 16px | `px-4` | Evita colar nas bordas |

**Páginas que usam Layout B:** Memórias, Diário, Mesa de Criação

> **Exceção:** Mesa de Criação usa canvas full-screen — sem padding wrapper, sem header, sem max-width. É o único componente que ignora o padrão de layout.

### Tabela de max-width por página

| Página | Layout | max-width | Justificativa |
|---|---|---|---|
| Astrologia | A (com chat) | `max-w-5xl` (1024px) | Tem chat — 1280px seria largo demais |
| Saúde | A (com chat) | `max-w-5xl` (1024px) | Tem chat |
| Agenda | A (com chat) | `max-w-6xl` (1152px) | Tem chat, calendário precisa de espaço |
| Finanças | A (com chat) | `max-w-7xl` (1280px) | Tem chat, gráficos precisam de largura |
| Controle | A (com chat) | `max-w-5xl` (1024px) | Tem chat |
| Hub | A (com chat) | `max-w-6xl` (1152px) | Tem chat, layout de 2 colunas internas |
| Memórias | B (sem chat) | `max-w-7xl` (1280px) | Sem chat — usa toda a largura |
| **Diário** | **B (sem chat)** | `max-w-5xl` (1024px)` | **Sem chat — mas é editor de texto, 1024px é ideal** |
| Mesa de Criação | Full width | Nenhum | Canvas — sem restrição |

### Regra: Tipografia Hierárquica

| Nível | Classe | Fonte | Tamanho | Uso |
|---|---|---|---|---|
| H1 — Título da página | `font-display` | Montserrat | 18-20px | Header principal da página |
| H2 — Seção | `font-display` | Montserrat | 14-16px | Títulos de bloco/card |
| H3 — Subseção | `font-heading` | Poppins | 12-13px | Labels dentro de card |
| Label — Rótulo | `font-label` | Raleway | 10-11px | HardwareRow, métricas |
| Body — Texto | `font-sans` | Inter | 13-14px | Conteúdo geral, parágrafos |
| Small — Auxiliar | `font-label` | Raleway | 9px | Datas, metadados |
| Micro — Pill/tag | `font-label` | Raleway | 8px | Badges, indicadores |

### Regra: Espaçamento entre Elementos

| Contexto | Classe | Valor | Nota |
|---|---|---|---|
| Entre seções principais (container) | `space-y-8` | 32px | **Padrão — não usar space-y-10 ou space-y-12** |
| Entre cards em grid | `gap-6` | 24px | Grid de métricas/cards |
| Entre elementos em lista | `gap-3` | 12px | Listas verticais |
| Padding interno de card | `p-6` | 24px | Cards padrão |
| Padding interno compacto | `p-4` | 16px | List items, rows, buttons |
| margin-bottom de SectionTitle | `mb-4` | 16px | Após título de seção (não mb-6) |
| Padding-bottom do header/seção | `pb-4` | 16px | Abaixo de tabs ou título |
| Container externo (view) | `pb-24` | 96px | **Padrão — não usar pb-32 ou pb-40** |

### Regra: Border-Radius

| Elemento | Classe | Valor | Prioridade |
|---|---|---|---|
| Componentes internos (cards, rows) | `rounded-md` | 6px | Padrão para tudo interno |
| Elementos pequenos (dots, badges) | `rounded` | 4px | Mínimo |
| Botões e actions | `rounded-lg` | 8px | Ações |
| Sidebar | `rounded-[1.5rem]` | 24px | Reduzido de 40px |
| Modais e overlays | `rounded-2xl` | 16px | Reduzido de 40-56px |
| Strange FAB (botão circular) | `rounded-full` | 9999px | É um círculo — manter full |
| Chat bubbles (Strange chat) | `rounded-xl` | 12px | Reduzido de 24px |
| Strange chat container | `rounded-2xl` | 16px | Reduzido de 56px |
| Header pills (moon, date, hour) | `rounded-full` | 9999px | Manter — são pills |

### Checklist de Verificação de Espaçamento (para qualquer página nova ou editada)

```
[ ] Layout A (com chat) ou Layout B (sem chat) aplicado corretamente
[ ] space-y-8 no container externo (NÃO space-y-10, space-y-12)
[ ] pb-24 no container externo (NÃO pb-32, pb-40)
[ ] max-width correto conforme tabela acima
[ ] SectionTitle com mb-4 (NÃO mb-6)
[ ] Cards com p-6 interno
[ ] Grids com gap-6
[ ] Border-radius seguindo tabela acima
[ ] Font hierarchy seguindo tabela acima
[ ] Nenhum h-full como container externo (exceto Mesa de Criação)
[ ] Nenhum px-12 ou padding-x excessivo no container da view
[ ] zero '#B8860B' hardcoded (usar 'text-gold' ou '#c5a059')
```

---

## 📁 Arquivos a Alterar

### 1. `src/styles.css` — Tokens Globais (MERGE, nunca substituir)

**Manter TODO o conteúdo atual e ADICIONAR os novos tokens. Nunca substituir o arquivo inteiro.**

Encontrar o bloco `@theme { ... }` existente e adicionar os novos tokens dentro dele, preservando os existentes. O arquivo atual já possui alguns tokens parcialmente — a ação é MERGE.

```css
@import "tailwindcss";

@theme {
  /* ═══ TOKENS EXISTENTES — NÃO REMOVER, NÃO SUBSTITUIR ═══ */
  --color-mystic-bg: #FCF9F1;
  --color-mystic-sidebar: #F5F1E6;
  --color-mystic-accent: #B8860B;       /* Será substituído via globalStyles .text-gold */
  --color-mystic-text: #333333;
  --color-duck-bg: #2C7A7B;

  --color-primary: #2563EB;
  --color-secondary: #14B8A6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-surface: #FFFFFF;
  --color-background: #F7F7FB;
  --color-text-main: #1F2937;
  --color-text-muted: #4B5563;
  --color-gold: #B8860B;                 /* Sobrescrever no passo 2.4 */

  --font-sans: "Inter", system-ui, ...;  /* MANTER — 19+ componentes usam font-sans */
  --font-heading: "Montserrat", "Poppins", sans-serif; /* Sobrescrever no merge */

  --radius-sm: 6px;                       /* ALTERAR para 4px */
  --radius-md: 8px;                       /* MANTER */
  --radius-lg: 12px;                      /* MANTER */
  --radius-xl: 2.5rem;                    /* MANTER — sidebar/modais usam hardcoded */
  --radius-2xl: 3.5rem;                   /* MANTER — FAB usa hardcoded */
  --radius-3xl: 4rem;                     /* MANTER */

  /* ═══ ADICIONAR (não existem no arquivo atual) ═══ */
  --color-gold: #c5a059;                    /* Sobrescreve token existente */
  --color-gold-light: rgba(197, 160, 89, 0.15);
  --color-gold-border: rgba(197, 160, 89, 0.25);
  --color-paper: #fdfbf0;
  --color-cosmic-dark: #0e1120;
  --font-display: "Montserrat", "Poppins", sans-serif;
  --font-heading: "Poppins", sans-serif;     /* Sobrescreve token existente */
  --font-body: "Inter", system-ui, sans-serif;
  --font-label: "Raleway", sans-serif;
  --radius-sm: 4px;                          /* Sobrescreve 6px → 4px */
}
```

> **Nota sobre `--font-sans`:** A classe Tailwind `font-sans` é usada em 19+ componentes. **Não alterar** seu valor — mantém Inter como fonte body.

> **Nota sobre tokens já existentes:** O arquivo atual já tem `--font-heading: "Montserrat", "Poppins", sans-serif`. Após o merge, sobrescrever com `--font-heading: "Poppins", sans-serif` (sem Montserrat — Montserrat vai para `--font-display`).

> **Nota sobre `src/App.css`:** Este arquivo é boilerplate do Vite/Tauri e não contém estilos do app. Pode ser ignorado.

---

### 2. `src/App.tsx` — globalStyles, Logo SVG, Cores Gold, Border-Radius

#### PASSO 2.1: Atualizar importação de fontes

**Linha 34 — encontrar e substituir:**

```tsx
// DE:
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

// PARA:
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&family=Raleway:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
```

#### PASSO 2.2: Adicionar classes de fonte após `.font-sans`

**Após a linha 35** (`.font-sans { font-family: 'Inter', sans-serif; }`), **adicionar** as novas classes — não remover as existentes:

```tsx
  .font-display { font-family: 'Montserrat', sans-serif; }
  .font-heading { font-family: 'Poppins', sans-serif; }
  .font-label { font-family: 'Raleway', sans-serif; }
```

#### PASSO 2.3: Adicionar classes cosmicas no final do globalStyles

**Após a definição de `.hook-dot`** (final do globalStyles), **adicionar**:

```tsx
  /* Moldura Cósmica Sutil */
  .cosmic-border {
    border: 1px solid rgba(197, 160, 89, 0.25);
    box-shadow: 0 4px 24px rgba(14, 17, 32, 0.08);
  }
  
  .section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #c5a059;
    border-bottom: 1px solid rgba(197, 160, 89, 0.3);
    padding-bottom: 8px;
    margin-bottom: 15px;
  }
  
  .pill-cosmic {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #c5a059;
    border: 1px solid #c5a059;
    padding: 4px 12px;
    border-radius: 2px;
  }
```

#### PASSO 2.4: Atualizar `.text-gold` e `.bg-gold`

**Linhas 40-41 — substituir:**

```tsx
// DE:
  .text-gold { color: #B8860B; }
  .bg-gold { background-color: #B8860B; }

// PARA:
  .text-gold { color: #c5a059; }
  .bg-gold { background-color: #c5a059; }
```

> **Impacto:** Esta mudança atualiza **automaticamente** ~230 ocorrências de `text-gold`/`bg-gold` em todo o código.

#### PASSO 2.5: Corrigir flag `hasChat` para Diário

**Linha 74 — localizar e modificar:**

```tsx
// DE:
const hasChat = !['mesa-criacao', 'memorias'].includes(currentPage);

// PARA:
const hasChat = !['mesa-criacao', 'memorias', 'diario'].includes(currentPage);
```

> **Problema resolvido:** Diário tinha 360px de área vazia alocada para chat, mas nenhum chat era renderizado. Agora o grid usa 2 colunas para Diário.

#### PASSO 2.6: SVG do logo na sidebar (visível sempre — colapsado ou não)

**Bloco do header da sidebar (linhas ~222-228) — substituir TODO o bloco:**

```tsx
// DE:
<div className="flex items-center gap-4 p-8 pb-4 shrink-0">
  <div className="cursor-pointer hover:rotate-12 transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
    {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
  </div>
  {!isSidebarCollapsed && <h1 className="text-[13px] font-bold tracking-widest text-[#B8860B] uppercase">Aurea Solaris</h1>}
</div>

// PARA:
<div className="flex items-center gap-4 p-8 pb-4 shrink-0">
  <div className="cursor-pointer hover:rotate-12 transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
    {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
  </div>
  {/* SVG sempre visível — texto condicional */}
  <svg width="28" height="28" viewBox="0 0 130 130" fill="none">
    <circle cx="65" cy="65" r="18" stroke="#c5a059" strokeWidth="1.5"/>
    <circle cx="65" cy="65" r="24" stroke="#c5a059" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.5"/>
    <circle cx="65" cy="65" r="6" fill="#c5a059" opacity="0.25"/>
    <circle cx="65" cy="65" r="3" fill="#c5a059"/>
    <line x1="65" y1="6" x2="65" y2="20" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="65" y1="110" x2="65" y2="124" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="6" y1="65" x2="20" y2="65" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="110" y1="65" x2="124" y2="65" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="22" x2="32" y2="32" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    <line x1="98" y1="98" x2="108" y2="108" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    <line x1="108" y1="22" x2="98" y2="32" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    <line x1="22" y1="108" x2="32" y2="98" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  </svg>
  {!isSidebarCollapsed && <h1 className="text-[11px] font-black tracking-[0.2em] text-[#c5a059] uppercase">Aurea Solaris</h1>}
</div>
```

> **Melhoria:** O SVG do Sol fica visível mesmo quando a sidebar está colapsada (80px). Apenas o texto "AUREA SOLARIS" desaparece.

#### PASSO 2.7: Reduzir border-radius da sidebar

**Linha 221 — localizar e substituir:**

```tsx
// DE:
<aside className="bg-white rounded-[2.5rem] border border-[#B8860B]/10 ...>

// PARA:
<aside className="bg-white rounded-[1.5rem] border border-[#c5a059]/10 ...>
```

> Também substituir `border-[#B8860B]/10` por `border-[#c5a059]/10` nesta mesma linha.

#### PASSO 2.8: Reduzir border-radius do Strange chat container

**Linha 303 — localizar e substituir:**

```tsx
// DE:
<div className="...rounded-[3.5rem] shadow-2xl border border-gold/30 ...>

// PARA:
<div className="...rounded-2xl shadow-2xl border border-gold/30 ...>
```

#### PASSO 2.9: Reduzir border-radius das Strange chat bubbles

**Linha 313 — localizar e substituir:**

```tsx
// DE:
<div className={`...rounded-3xl border border-gray-100 ...}>

// PARA:
<div className={`...rounded-xl border border-gray-100 ...}>
```

#### PASSO 2.10: Substituir hardcoded `#B8860B` restantes no JSX

Substituir `#B8860B` → `#c5a059` no arquivo `src/App.tsx` nas seguintes linhas:

| Linha | Contexto |
|---|---|
| 47 | `.hook-dot { background: #B8860B }` |
| 223 | `border-[#B8860B]/10` na sidebar |
| 228 | `text-[#B8860B]` no título "Aurea Solaris" |
| 242 | `text-[#B8860B]` no avatar do perfil |
| 257 | `text-[#B8860B]` no Moon phase label |
| 308 | `text-[#B8860B]` no ícone do Strange |
| 309 | `text-[#B8860B]` no label "Supervisor Macro" |
| 315 | `border-[#B8860B]/20` na bubble do usuário |
| 324 | `hover:bg-[#B8860B]` no botão Sparkles |
| 329 | `border-[#B8860B]/30` na FAB button + `text-[#B8860B]` |

> **Linhas 41-42** (`.text-gold` e `.bg-gold`) são substituídas no Passo 2.4 e **NÃO** precisam de substituição manual adicional.

---

### 3. `src/components/common/UIComponents.tsx` — Border-Radius e Cores Gold

#### PASSO 3.1: Ajustes de Border-Radius

| Componente | Linha | De | Para | Resultado |
|---|---|---|---|---|
| `NavItem` | 5 | `rounded-lg` | `rounded-md` | 8px → 6px |
| `Card` | 19 | `panel-light` (sem rounded) | Adicionar `rounded-md` | 6px |
| `Advice` | 26 | `rounded-xl` | `rounded-md` | 12px → 6px |
| `Advice` (icon div) | 28 | `rounded-xl` | `rounded-md` | 12px → 6px |
| `FileItem` | 50 | `rounded-xl` | `rounded-md` | 12px → 6px |
| `RoutineItem` | 63 | `rounded-lg` | `rounded` | 8px → 4px |
| `TodoRow` | 83 | `rounded-lg` | `rounded-md` | 8px → 6px |
| `AspectRow` | 68 | `rounded-xl` | `rounded-md` | 12px → 6px |

#### PASSO 3.2: Substituir cores gold hardcoded

Substituir `#B8860B` → `#c5a059` em `src/components/common/UIComponents.tsx`:

| Linha | Contexto | De | Para |
|---|---|---|---|
| 5 | `NavItem` | `text-[#B8860B]` | `text-[#c5a059]` |
| 6 | `NavItem` icon | `text-[#B8860B]` | `text-[#c5a059]` |
| 12 | `SectionTitle` | `border-[#B8860B]/10` | `border-[#c5a059]/10` |
| 13 | `SectionTitle` h4 | `text-[#B8860B]` | `text-[#c5a059]` |
| 26 | `Advice` card | `border-[#B8860B]/20` | `border-[#c5a059]/20` |
| 27 | `Advice` bar | `bg-[#B8860B]` | `bg-[#c5a059]` |
| 28 | `Advice` icon | `text-[#B8860B]` | `text-[#c5a059]` |
| 31 | `Advice` label | `text-[#B8860B]` | `text-[#c5a059]` |
| 41 | `StarRow` icon | `text-[#B8860B]` | `text-[#c5a059]` |
| 61 | `RoutineItem` dot | `bg-[#B8860B]` | `bg-[#c5a059]` |
| 63 | `RoutineItem` badge | `text-[#B8860B]` | `text-[#c5a059]` |
| 77 | `FamilyItem` badge | `text-[#B8860B]` | `text-[#c5a059]` |
| 83 | `TodoRow` check | `bg-[#B8860B]`, `border-[#B8860B]` | `bg-[#c5a059]`, `border-[#c5a059]` |
| 83 | `TodoRow` hover | `border-[#B8860B]/50` | `border-[#c5a059]/50` |
| 92 | `StatBox` label | `text-[#B8860B]` | `text-[#c5a059]` |

---

### 4. Arquivos de View — Border-Radius e Cores Gold

Estes arquivos podem ter hardcoded `#B8860B` e `rounded-[2.5rem]` que precisam ser corrigidos.

#### PASSO 4.1: `src/components/DiarioView.tsx`

**Objetivos:** Remover `h-full` que causa espaço vazio embaixo, aumentar `max-w-3xl` para `max-w-5xl`, adicionar `max-w-5xl mx-auto`.

| O que | Linha aprox. | De | Para |
|---|---|---|---|
| Container externo | ~82 | `h-full flex flex-col` | `flex flex-col` (remover h-full) |
| Container externo | ~82 | (sem max-width) | Adicionar `max-w-5xl mx-auto px-4` |
| Editor surface | ~155 | `max-w-3xl` | `max-w-3xl` (manter — o editor em si é estreito intencionalmente) |

> **Nota:** Com `hasChat` corrigido no Passo 2.5, Diário agora ocupa 2 colunas (sem a 3ª coluna fantasma). O `max-w-5xl` centraliza o conteúdo na largura disponível.

#### PASSO 4.2: `src/components/MesaCriacao.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 383 | `backgroundImage: radial-gradient(circle, #B8860B ...)` |
| 431 | `stroke="#B8860B"` |
| 435 | `stroke="#B8860B"` |

#### PASSO 4.3: `src/components/MandalaChart.tsx`

Substituir `#B8860B` → `#c5a059` em todos os strokes/fills SVG:

| Linha | Contexto |
|---|---|
| 192, 195, 196, 197, 198, 199 | Círculos SVG (strokes) |
| 211, 212 | Linhas e textos SVG |
| 227, 251, 256, 270 | Strokes e fills SVG |

#### PASSO 4.4: `src/components/MandalaView.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 39 | `default: return '#B8860B'` |
| 192, 193, 196 | SVG strokes |
| 213, 254 | SVG strokes |

#### PASSO 4.5: `src/components/MandalaPage.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 76 | `text-[#B8860B]` no ícone |
| 81 | `text-[#B8860B]` no label |
| 101 | `text-[#B8860B]` no botão hover |

#### PASSO 4.6 ADD: `src/components/AstrologiaBoard.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 109 | `text-[#B8860B]` no h5 |

> **Este arquivo não estava na seção 4 original — adicionado após dupla verificação.**

#### PASSO 4.6: `src/components/common/Mandala.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 6, 7 | Círculos SVG |
| 10, 11, 23 | Linhas e textos SVG |
| 28 | `bg-[#B8860B]` dot |

#### PASSO 4.7: `src/components/SaudeView.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 48 | `border-[#B8860B]/20` no botão dashed |
| 99 | `text-[#B8860B]` no título |

#### PASSO 4.8: `src/components/FinancasView.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 28, 52 | `color: '#B8860B'` no default de newGoal |

#### PASSO 4.9: `src/context/FinancasContext.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 51 | `color: '#B8860B'` na meta "Reserva Master" |

#### PASSO 4.10: `src/components/LoginView.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 61, 102, 160 | `text-[#B8860B]/60`, `text-[#B8860B]/50`, `text-[#B8860B]/60` |

#### PASSO 4.11: `src/components/ControlePanel.tsx`

Substituir `#B8860B` → `#c5a059`:

| Linha | Contexto |
|---|---|
| 11 | `text-[#B8860B]` no HardwareRow |

#### PASSO 4.12: `src/components/AgendaView.tsx`

✅ **AgendaView NÃO tem `#B8860B`** — verificado. Nenhuma ação necessária.

---

### 5. Arquivos de View — Border-Radius de Modais

Estes arquivos contêm `rounded-[2.5rem]` que deve ser reduzido para `rounded-2xl`.

#### PASSO 5.1: `src/components/ProfileEditor.tsx`

| Linha | De | Para |
|---|---|---|
| 112 | `rounded-[2.5rem]` | `rounded-2xl` |
| 117, 123, 146, 214, 227, 251, 263, 273, 279 | `rounded-2xl` | `rounded-lg` |
| 164, 173, 183, 194 | `rounded-xl` | `rounded-lg` |

#### PASSO 5.2: `src/components/FinancasView.tsx`

| Linha | De | Para |
|---|---|---|
| 347 | `rounded-[2.5rem]` | `rounded-2xl` |

#### PASSO 5.3: `src/components/ControlePanel.tsx`

| Linha | De | Para |
|---|---|---|
| 186 | `rounded-[2.5rem]` | `rounded-2xl` |
| 158, 238, 249, 264, 276, 291 | `rounded-2xl` | `rounded-lg` |
| 322 | `rounded-3xl` | `rounded-xl` |

#### PASSO 5.4: `src/components/AlfredHubView.tsx`

| Linha | De | Para |
|---|---|---|
| 145, 150 | `rounded-[2.5rem]` | `rounded-2xl` |
| 67, 69, 199 | `rounded-2xl` | `rounded-lg` |

#### PASSO 5.5: `src/components/common/BirthForm.tsx`

| Linha | De | Para |
|---|---|---|
| 26 | `rounded-[2.5rem]` | `rounded-2xl` |

> Os inputs e botões do BirthForm usam `rounded-2xl` por padrão — verificar se devem ser reduzidos para `rounded-lg` durante a implementação.

#### PASSO 5.6: `src/components/common/PdfViewer.tsx`

| Linha | De | Para |
|---|---|---|
| 16 | `rounded-[2.5rem]` | `rounded-2xl` |

#### PASSO 5.7: `src/components/SaudeView.tsx`

| Linha | De | Para |
|---|---|---|
| 97 | `rounded-3xl` | `rounded-xl` |

#### PASSO 5.8: `src/components/RafikiEscola.tsx`

| Linha | De | Para |
|---|---|---|
| 401 | `rounded-3xl` | `rounded-xl` |

> Verificar também `rounded-2xl` restantes (linhas ~311, 359, 374, 436) — reduzir para `rounded-lg`.

#### PASSO 5.9: `src/components/AgentChat.tsx`

| Linha | De | Para |
|---|---|---|
| 274 | `rounded-2xl` | `rounded-xl` |
| 303 | `rounded-xl` | `rounded-lg` |
| 348, 359 | `rounded-2xl` | `rounded-lg` |

#### PASSO 5.10: `src/components/LoginView.tsx`

| Linha | De | Para |
|---|---|---|
| 91, 128, 140, 176 | `rounded-2xl` | `rounded-lg` |
| 93 | `rounded-xl` | `rounded-lg` |

---

### 6. Arquivos de View — Layout e Espaçamento

#### PASSO 6.1: `src/components/DiarioView.tsx` — Layout (CRÍTICO)

**Estrutura atual do container (confirmada por análise):**
```
Linha ~82: <div className="h-full flex flex-col ...">      ← PROBLEMA: h-full
Linha ~84: <header className="px-12 py-8">                ← EXCESSIVO: px-12
Linha ~155: <div className="p-12 lg:p-24 ...">            ← EXCESSIVO: p-12, lg:p-24
Linha ~156: <div className="max-w-3xl ...">                ← ESTREITO: max-w-3xl
Linha ~183: <footer className="px-12 py-4 ...">            ← EXCESSIVO: px-12
```

**Container externo (linha ~82):**

```tsx
// DE:
<div className="h-full flex flex-col bg-[#FCF9F1] animate-in fade-in slide-in-from-bottom-4">

// PARA:
<div className="flex flex-col bg-[#FCF9F1] animate-in fade-in slide-in-from-bottom-4 max-w-5xl mx-auto px-4">
```

> **Motivo:** Remover `h-full` elimina espaço vazio embaixo. Adicionar `max-w-5xl mx-auto px-4` centraliza e limita a largura.

**Header (linha ~84):**

```tsx
// DE:
<header className="px-12 py-8">

// PARA:
<header className="px-4 py-6">
```

**Editor surface (linha ~155):**

```tsx
// DE:
<div className="flex-1 overflow-y-auto no-scrollbar p-12 lg:p-24 bg-white/30">

// PARA:
<div className="flex-1 overflow-y-auto no-scrollbar p-8 lg:p-12 bg-white/30">
```

**Footer (linha ~183):**

```tsx
// DE:
<footer className="px-12 py-4 border-t border-gold/5 flex justify-between">

// PARA:
<footer className="px-4 py-4 border-t border-gold/5 flex justify-between">
```

#### PASSO 6.2: `src/components/AstrologiaBoard.tsx` — Espaçamento e Tabs

**Outer container (linha ~29):**

```tsx
// DE:
<div className="space-y-12 pb-32 animate-in fade-in">

// PARA:
<div className="space-y-8 pb-24 animate-in fade-in">
```

**Tabs container (linha ~30):**

```tsx
// DE:
<div className="flex items-center justify-between border-b border-gold/10 pb-6 mb-8">

// PARA:
<div className="flex items-center justify-between border-b border-gold/10 pb-4 mb-4 gap-4">
```

**Tabs buttons (linha ~31):**

```tsx
// DE:
<div className="flex gap-8">

// PARA:
<div className="flex gap-6">
```

**Card grid (linha ~70):**

```tsx
// DE:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">

// PARA:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
```

#### PASSO 6.3: `src/components/ControlePanel.tsx` — Espaçamento

**Outer container (linha ~55):**

```tsx
// DE:
<div className="space-y-12 animate-in fade-in pb-20 max-w-7xl mx-auto">

// PARA:
<div className="space-y-8 animate-in fade-in pb-20 max-w-5xl mx-auto">
```

**Main grid (linha ~58):**

```tsx
// DE:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

// PARA:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

**Metrics grid (linha ~63):**

```tsx
// DE:
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// PARA:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

#### PASSO 6.4: `src/components/common/UIComponents.tsx` — SectionTitle margin

**SectionTitle (linha ~12):**

```tsx
// DE:
<div className="flex justify-between items-center border-b border-[#B8860B]/10 pb-2 mb-6">

// PARA:
<div className="flex justify-between items-center border-b border-[#c5a059]/10 pb-2 mb-4">
```

> **Melhoria:** `mb-6` → `mb-4` + cor gold atualizada.

---

## 🗺️ Checklist de Implementação

```
[ ] 1. MERGE de novos tokens em src/styles.css (adicionar, não substituir)
[ ] 2. styles.css: sobrescrever --font-heading, --radius-sm, --color-gold, --color-duck-bg
[ ] 3. styles.css: adicionar --font-display, --font-body, --font-label, --color-gold-light, 
       --color-gold-border, --color-paper, --color-cosmic-dark
[ ] 4. App.tsx: atualizar Google Fonts import (linha 34) — adicionar Montserrat, Poppins, Raleway
[ ] 5. App.tsx: adicionar .font-display, .font-heading, .font-label no globalStyles
[ ] 6. App.tsx: adicionar .cosmic-border, .section-title, .pill-cosmic no globalStyles
[ ] 7. App.tsx: atualizar .text-gold e .bg-gold para #c5a059 (linhas 41-42)
[ ] 8. App.tsx: CORRIGIR hasChat — adicionar 'diario' à exclusão (linha 74)
[ ] 9. App.tsx: SVG do logo na sidebar visível (não dentro de !isSidebarCollapsed) — linhas ~222-228
[ ] 10. App.tsx: substituir texto "Aurea Solaris" por logo SVG + texto
[ ] 11. App.tsx: sidebar rounded-[2.5rem] → rounded-[1.5rem] (linha 223)
[ ] 12. App.tsx: sidebar border-[#B8860B]/10 → border-[#c5a059]/10 (linha 223)
[ ] 13. App.tsx: #B8860B → #c5a059 em todo o JSX (linhas 47, 223, 228, 242, 257, 308, 309, 315, 324, 329)
[ ] 14. App.tsx: Strange container rounded-[3.5rem] → rounded-2xl (linha 305)
[ ] 15. App.tsx: Strange bubble rounded-3xl → rounded-xl (linha 315)
[ ] 16. UIComponents.tsx: border-radius — Advice, AspectRow, NavItem, FileItem, RoutineItem, TodoRow
[ ] 17. UIComponents.tsx: #B8860B → #c5a059 em todos os 14 hardcoded
[ ] 18. UIComponents.tsx: SectionTitle mb-6 → mb-4
[ ] 19. DiarioView.tsx: container externo (linha ~82) — sem h-full, max-w-5xl mx-auto px-4
[ ] 20. DiarioView.tsx: header px-12 py-8 → px-4 py-6 (linha ~84)
[ ] 21. DiarioView.tsx: editor p-12 lg:p-24 → p-8 lg:p-12 (linha ~155)
[ ] 22. DiarioView.tsx: footer px-12 → px-4 (linha ~183)
[ ] 23. AstrologiaBoard.tsx: space-y-12 → space-y-8, pb-32 → pb-24 (linha ~29)
[ ] 24. AstrologiaBoard.tsx: tabs pb-6 mb-8 → pb-4 mb-4 gap-4 (linha ~30)
[ ] 25. AstrologiaBoard.tsx: tabs gap-8 → gap-6 (linha ~31)
[ ] 26. AstrologiaBoard.tsx: grid gap-10 → gap-6, mt-8 → mt-6 (linha ~70)
[ ] 27. AstrologiaBoard.tsx: #B8860B → #c5a059 (linha 109)
[ ] 28. ControlePanel.tsx: space-y-12 → space-y-8, max-w-7xl → max-w-5xl (linha ~55)
[ ] 29. ControlePanel.tsx: main grid gap-10 → gap-6, metrics gap-6 → gap-4
[ ] 30. ControlePanel.tsx: rounded-[2.5rem] → rounded-2xl (linha 186)
[ ] 31. ControlePanel.tsx: rounded-2xl → rounded-lg (linhas 158, 238, 249, 264, 276, 291)
[ ] 32. ControlePanel.tsx: rounded-3xl → rounded-xl (linha 322)
[ ] 33. ControlePanel.tsx: #B8860B → #c5a059 (linha 11)
[ ] 34. MesaCriacao.tsx: #B8860B → #c5a059 (linhas 383, 431, 435)
[ ] 35. MandalaChart.tsx: #B8860B → #c5a059 (linhas 192, 195-199, 211-212, 227, 251, 256, 270)
[ ] 36. MandalaView.tsx: #B8860B → #c5a059 (linhas 39, 192, 193, 196, 213, 254)
[ ] 37. MandalaPage.tsx: #B8860B → #c5a059 (linhas 76, 81, 101)
[ ] 38. common/Mandala.tsx: #B8860B → #c5a059 (linhas 6, 7, 10, 11, 23, 28)
[ ] 39. SaudeView.tsx: #B8860B → #c5a059 (linhas 48, 99)
[ ] 40. SaudeView.tsx: rounded-3xl → rounded-xl (linha 97)
[ ] 41. FinancasView.tsx: #B8860B → #c5a059 (linhas 28, 52)
[ ] 42. FinancasView.tsx: rounded-[2.5rem] → rounded-2xl (linha 347)
[ ] 43. FinancasContext.tsx: #B8860B → #c5a059 (linha 51)
[ ] 44. LoginView.tsx: #B8860B → #c5a059 (linhas 61, 102, 160)
[ ] 45. LoginView.tsx: rounded-2xl → rounded-lg (linhas 91, 128, 140, 176), rounded-xl → rounded-lg (linha 93)
[ ] 46. ProfileEditor.tsx: rounded-[2.5rem] → rounded-2xl (linha 112)
[ ] 47. ProfileEditor.tsx: rounded-2xl → rounded-lg (linhas 117, 123, 146, 214, 227, 251, 263, 273, 279)
[ ] 48. ProfileEditor.tsx: rounded-xl → rounded-lg (linhas 164, 173, 183, 194)
[ ] 49. AlfredHubView.tsx: rounded-[2.5rem] → rounded-2xl (linhas 145, 150)
[ ] 50. AlfredHubView.tsx: rounded-2xl → rounded-lg (linhas 67, 69, 199)
[ ] 51. BirthForm.tsx: rounded-[2.5rem] → rounded-2xl (linha 26)
[ ] 52. PdfViewer.tsx: rounded-[2.5rem] → rounded-2xl (linha 16)
[ ] 53. RafikiEscola.tsx: rounded-3xl → rounded-xl (linha 401)
[ ] 54. RafikiEscola.tsx: verificar rounded-2xl restantes (linhas ~311, 359, 374, 436) → rounded-lg
[ ] 55. AgentChat.tsx: rounded-2xl → rounded-xl (linha 274)
[ ] 56. AgentChat.tsx: rounded-xl → rounded-lg (linha 303)
[ ] 57. AgentChat.tsx: rounded-2xl → rounded-lg (linhas 348, 359)
[ ] 58. AgendaView.tsx: verificar #B8860B — ✅ já está limpo (nenhuma ocorrência)
[ ] 59. VERIFICAÇÃO FINAL: grep -r "#B8860B" src/ — deve retornar ZERO resultados
[ ] 60. npm run lint
[ ] 61. npm run typecheck
[ ] 62. Testar manualmente todas as 9 páginas
[ ] 63. Verificar Diário: sem espaço vazio à direita, sem espaço vazio embaixo
[ ] 64. Verificar sidebar colapsado: SVG do Sol visível
[ ] 65. Verificar responsividade em 1280px+
[ ] 66. Commit: "feat: redesign visual — identidade cósmica refinada"
```

---

## 🎨 Mapa de Referência Visual

```
┌─────────────────────────────────────────────────────────┐
│  ✦                                                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  [☉ SVG] AUREA SOLARIS                          │    │
│  │  ─────────────────────────────────────────────  │    │
│  │  ✦ Mesa de Criação                              │    │
│  │  ☆ Astrologia  ← pill com gold border sutil    │    │
│  │  ⚕ Saúde                                          │    │
│  │  📅 Agenda                                       │    │
│  │  ─────────────────────────────────────────────  │    │
│  │  [Avatar] Viviane                               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────┬──────────────────┐    │
│  │                             │                   │    │
│  │   CONTEÚDO PRINCIPAL        │   CHAT PANEL     │    │
│  │   ═══════════════           │   (Layout A)     │    │
│  │   ☽ ❂ ☾                     │                   │    │
│  │                             │   ┌───────────┐  │    │
│  │   ┌─────────────────────┐   │   │ Mensagem  │  │    │
│  │   │  Card: border: 1px  │   │   └───────────┘  │    │
│  │   │  solid gold/0.25    │   │                   │    │
│  │   │  rounded-md (6px)  │   │   ┌───────────┐  │    │
│  │   └─────────────────────┘   │   │ Mensagem  │  │    │
│  │                             │   └───────────┘  │    │
│  └─────────────────────────────┴──────────────────┘    │
│                                                         │
│  PÁGINA SEM CHAT (Diário, Memórias, Mesa):            │
│  ┌─────────────────────────────────────────────────┐    │
│  │   CONTEÚDO PRINCIPAL (max-w-7xl, Layout B)      │    │
│  │   space-y-8, gap-6, rounded-2xl containers      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Critérios de Validação

### Funcionalidade
- [ ] Nenhum comportamento de botão/input alterado
- [ ] Nenhuma chamada de API modificada
- [ ] Navegação funciona idêntico
- [ ] Todas as 9 páginas renderizam corretamente

### Visual
- [ ] Gold accent `#c5a059` consistente em TODO o código — `grep -r "#B8860B" src/` retorna **ZERO** resultados
- [ ] Border-radius seguindo tabela: componentes 4-8px, containers 16-24px
- [ ] Fontes Montserrat/Poppins/Inter/Raleway carregando
- [ ] SVG do logo visível na sidebar (expandida E colapsada)
- [ ] Sidebar com `rounded-[1.5rem]` (não mais `rounded-[2.5rem]`)
- [ ] Modais com `rounded-2xl` (não mais `rounded-[2.5rem]`)
- [ ] Strange chat container com `rounded-2xl`
- [ ] Strange chat bubbles com `rounded-xl`

### Layout (Padrões de Espaçamento)
- [ ] Diário ocupa 2 colunas do grid (hasChat=false)
- [ ] Diário com max-w-5xl, conteúdo centralizado, sem h-full
- [ ] Layout A (com chat) usa max-w-5xl: Astrologia, Saúde, Agenda, Finanças, Controle, Hub
- [ ] Layout B (sem chat) usa max-w-7xl: Memórias, Diário
- [ ] space-y-8 em todos os containers externos de view (não space-y-10, space-y-12)
- [ ] SectionTitle com mb-4 (não mb-6)
- [ ] pb-24 nos containers externos (não pb-32, pb-40)
- [ ] gap-6 nos grids internos de cards
- [ ] Nenhum h-full como container de view (exceto Mesa de Criação)
- [ ] Astrologia: tabs sem double border, gap-6, mb-4
- [ ] Astrologia: card grid com gap-6, mt-6

### Código
- [ ] `npm run lint` passa
- [ ] `npm run typecheck` passa
- [ ] Responsivo em 1280px+
- [ ] `grep -r "#B8860B" src/` retorna zero resultados
- [ ] `grep -r "rounded-\[2\.5rem\]" src/` retorna zero resultados

---

## 📋 Comparativo Visual

| Elemento | Antes | Depois |
|----------|-------|--------|
| Background | `#F5F1E6` | `#FCF9F1` (mantido) |
| Gold accent | `#B8860B` | `#c5a059` (mais suave, do Rafiki) |
| Border-radius (componentes) | `rounded-xl` (12px) | `rounded-md` (6px) |
| Border-radius (sidebar) | `rounded-[2.5rem]` (40px) | `rounded-[1.5rem]` (24px) |
| Border-radius (modais) | `rounded-[2.5rem]` (40px) | `rounded-2xl` (16px) |
| Border-radius (chat bubbles) | `rounded-3xl` (24px) | `rounded-xl` (12px) |
| Border-radius (ProfileEditor, etc.) | `rounded-2xl` (16px) | `rounded-lg` (8px) |
| Border-radius (ProfileEditor inputs) | `rounded-xl` (12px) | `rounded-lg` (8px) |
| Fontes body | Inter (via `--font-sans`) | Inter (mantido) |
| Fontes títulos H1/H2 | Inter | Montserrat (`font-display`) |
| Fontes headings | — | Poppins (`font-heading`) |
| Fontes labels/micro | Inter | Raleway (`font-label`) |
| Logo | Texto apenas | SVG Sol + texto (visível colapsado) |
| Pills decorativas | `rounded-full` | `border-radius: 2px` + borda gold (`.pill-cosmic`) |
| Diário: espaço vazio direito | 360px fantasma (hasChat=true, sem chat) | Corrigido (hasChat=false) |
| Diário: max-width | `max-w-3xl` (576px) | `max-w-5xl` (1024px) |
| Diário: espaço vazio embaixo | `h-full` causing overflow | `flex-col` natural |
| Diário: padding | `px-12`, `p-12`, `lg:p-24` | `px-4`, `p-8`, `lg:p-12` |
| Astrologia: gap entre seções | `space-y-12` (48px) | `space-y-8` (32px) |
| Astrologia: tabs gap | `gap-8` | `gap-6` |
| Astrologia: card grid | `gap-10 mt-8` | `gap-6 mt-6` |
| Controle: max-width | `max-w-7xl` (1280px) | `max-w-5xl` (1024px) |
| Controle: grids | `gap-10`, `gap-6` | `gap-6`, `gap-4` |
| SectionTitle margin | `mb-6` | `mb-4` |

---

## 🔗 Referências

- Arquivo de inspiração: `C:/SegundoCerebro/rafiki_dashboard.html`
- Design system atual: `docs/design-system.md`
- Estrutura do projeto: `docs/estrutura-do-projeto.md`
- Arquitetura técnica: `docs/arquitetura.md`
- AGENTS.md (navegação): `AGENTS.md`

---

## 📊 Resumo Quantitativo

| Métrica | Valor |
|---|---|
| Total de arquivos a modificar | 21 |
| Total de ocorrências de `#B8860B` | 66 |
| Total de arquivos com `#B8860B` | 13 |
| Total de `rounded-[2.5rem]` (40px) | 8 |
| Total de `rounded-3xl` (24px) | 4 |
| Total de `rounded-[3.5rem]` (56px) | 1 |
| Total de itens no checklist | 66 |
| Total de páginas afetadas | 9 |
