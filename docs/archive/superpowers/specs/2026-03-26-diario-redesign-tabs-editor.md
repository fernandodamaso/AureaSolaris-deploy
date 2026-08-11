# Design: Diario Redesign — Tabs + Editor

> Redesign da pagina Diario para editor estilo VS Code com abas, sidebar de pastas, editor rich text (TipTap) e persistencia Tauri nativa.

## Contexto

A pagina Diario atual e um editor em branco write-only: sem forma de ver/editar entradas anteriores, sem organizacao por temas, sem checklists. O header ocupa espaco desnecessario com titulo grande, avatar e campos de autor. A persistencia usa localStorage compartilho via AgendaContext, com bug de campo title que nao sobrevive ao save.

**Objetivo:** Transformar o Diario num editor organizado estilo VS Code/Evernote — sidebar com pastas, barra de abas para notas abertas, editor rich text com checklists, e persistencia nativa via Tauri.

---

## Layout

```
+--------------------------------------------------------------+
| [=]  P Reflexoes  |  P Projeto  |  P Saude  |  [+Nova]       | <- Sidebar (collapsible)
+--------------------------------------------------------------+
| P Reflexoes -------------------------------------------------| <- Folder name bar
| |- "Madrugada dourada" - 25 mar  X  |  "Lua cheia" - 24 X  | <- Tabs row
+--------------------------------------------------------------+
|                                                              |
|  MADRUGADA DOURADA                          [B] [I] [H] [O] | <- Title + toolbar
|  25 de marco de 2026 . Reflexoes                            | <- Date + folder
|                                                              |
|  ------------------------------------------------           |
|                                                              |
|  Hoje acordei antes do sol e senti uma paz...               | <- TipTap editor
|                                                              |
|  [v] Comprar flores para o altar                            | <- Checklist
|  [ ] Escrever carta para o futuro                           |
|                                                              |
+--------------------------------------------------------------+
| 523 palavras . editado as 14:32                             | <- Status bar
+--------------------------------------------------------------+
```

---

## Componentes

| Componente | Arquivo | Descricao |
|---|---|---|
| DiarioView | src/components/DiarioView.tsx | Container principal, orquestra sidebar + tabs + editor |
| DiarioSidebar | src/components/diario/DiarioSidebar.tsx | Arvore de pastas + lista de notas + busca |
| DiarioTabs | src/components/diario/DiarioTabs.tsx | Barra de abas abertas (estilo VS Code) |
| DiarioEditor | src/components/diario/DiarioEditor.tsx | Editor TipTap com toolbar inline |
| DiarioContext | src/context/DiarioContext.tsx | Estado global: notas, pastas, abas, acoes CRUD |

### DiarioSidebar

- Largura: ~240px, colapsavel para ~48px (so icones)
- Secao superior: pastas com emojis
- Secao inferior: notas da pasta selecionada (titulo + data)
- Botao "+Nova Nota" cria entrada na pasta selecionada
- Botao "+Nova Pasta" com input inline
- Campo de busca por titulo no topo
- Primeira visita: cria pasta "Geral" automaticamente

### DiarioTabs

- Cada nota aberta = uma aba
- Aba mostra: titulo truncado + X para fechar
- "+" ao final abre nova nota
- Maximo ~8 abas visiveis, scroll horizontal depois
- Auto-save a cada 30s ou ao trocar de aba
- Aba ativa destacada com underline dourado

### DiarioEditor

- **Header compacto** (2 linhas maximo):
  - Linha 1: Titulo inline editavel (font-display, uppercase, sem campo separado)
  - Linha 2: data . pasta — automatico
- **Toolbar fixa** no topo do editor:
  [B] [I] [S]  [H1] [H2]  [*] [1.] [O]  [">]
- **Editor TipTap** com pacotes:
  - `@tiptap/react` — wrapper React
  - `@tiptap/starter-kit` — bold, italic, strike, headings, bullet/ordered lists
  - `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — checklists
  - `@tiptap/extension-placeholder` — placeholder text
- Placeholder: "Deixe sua alma fluir nas palavras..."
- **Status bar** no rodape: word count + ultima edicao
- Tela vazia quando nenhuma nota esta selecionada

---

## Modelo de Dados

```typescript
interface DiaryEntry {
  id: string;            // crypto.randomUUID()
  title: string;
  content: string;       // TipTap JSON (stringified)
  folderId: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  wordCount: number;
}

interface DiaryFolder {
  id: string;
  name: string;
  icon: string;          // emoji
  order: number;
  createdAt: string;
}
```

---

## Persistencia (Tauri)

### Estrutura de arquivos

```
memory/diary/
  folders.json           # DiaryFolder[]
  entries/
    {uuid}.json          # DiaryEntry (um por arquivo)
  tabs.json              # { openTabIds: string[], activeTabId: string | null }
```

### Comandos Tauri

| Comando | Input | Output | Descricao |
|---|---|---|---|
| diary_create_entry | { title, folderId } | DiaryEntry | Cria nova entrada vazia |
| diary_update_entry | { id, title?, content?, folderId? } | DiaryEntry | Atualiza campos. updatedAt e setado pelo backend (system clock). |
| diary_delete_entry | { id } | void | Deleta arquivo JSON |
| diary_list_entries | { folderId? } | DiaryEntry[] | Lista todas ou por pasta |
| diary_get_entry | { id } | DiaryEntry | Busca por ID |
| diary_create_folder | { name, icon } | DiaryFolder | Cria pasta |
| diary_list_folders | - | DiaryFolder[] | Lista pastas |
| diary_delete_folder | { id } | void | Deleta pasta. Pasta "Geral" e in-deletavel (retorna erro se tentar). Notas da pasta deletada vao para "Geral". |
| diary_save_tabs | { openIds, activeId } | void | Persiste estado das abas |
| diary_load_tabs | - | { openIds, activeId } | Carrega estado das abas |

### Inicializacao

1. Ao abrir o Diario: chama diary_list_folders + diary_load_tabs
2. Se folders.json nao existe: cria pasta "Geral" default
3. Carrega entradas das abas abertas
4. Se nenhuma aba aberta: mostra tela vazia

### Auto-save

- Trigger: a cada 30s de inatividade OU ao trocar de aba OU ao fechar aba
- Chama diary_update_entry com { id, content }. O backend seta updatedAt do system clock.
- Debounce de 2s para digitacao continua

---

## Integracao com Projeto Existente

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| src/components/DiarioView.tsx | Reescrever: de editor standalone para container tabs+sidebar+editor |
| src/App.tsx | Rota permanece case 'diario', chat continua hidden |
| src-tauri/src/lib.rs | Adicionar 10 novos comandos Tauri (diary_*) |
| AGENTS.md | Atualizar referencia do Diario na tabela de modulos |

### Arquivos novos

| Arquivo | Descricao |
|---|---|
| src/components/diario/DiarioSidebar.tsx | Sidebar com pastas e notas |
| src/components/diario/DiarioTabs.tsx | Barra de abas |
| src/components/diario/DiarioEditor.tsx | Editor TipTap |
| src/context/DiarioContext.tsx | Context provider |
| src/types/diario.ts | Interfaces TypeScript |

### Remover

- Toolbar decorativa atual (Bold/Italic/Type/Align/List — nao funcionam)
- Header com avatar e "Camara de Escrita"
- Salvar via addDocument() do AgendaContext
- Export dropdown (pode voltar depois, nao no MVP)

### Dependencias novas (package.json)

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`
- `@tiptap/extension-placeholder`

---

## Estilizacao

- Tailwind CSS v4, tokens existentes do projeto
- Sidebar: bg-white border-r border-gold/10
- Tabs: bg-white border-b border-gold/10, tab ativa com border-b-2 border-gold
- Editor: bg-white com max-w-none (TipTap renderiza bloco)
- Titulo: font-display uppercase tracking-wider text-xl
- Status bar: text-[10px] text-gray-400 uppercase tracking-widest
- Toolbar: flex gap-1 items-center, botoes com p-1.5 rounded hover:bg-gold/10

---

## Escopo MVP vs Futuro

### MVP (esta iteracao)
- Sidebar com pastas fixas + lista de notas
- Tabs para notas abertas
- Editor TipTap com bold/italic/headings/lists/checklists
- Persistencia Tauri nativa
- Auto-save
- Header compacto (2 linhas)
- Status bar com word count

### Futuro (neste PR)
- Busca
