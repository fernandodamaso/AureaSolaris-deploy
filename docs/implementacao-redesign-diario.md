# Implementação: Redesign do Diario

## Visão Geral
Este documento descreve os passos para implementar o redesign do Diario conforme especificado em `docs/superpowers/specs/2026-03-26-diario-redesign-tabs-editor.md`.

## Etapas de Implementação

### 1. Preparação do Ambiente
- [ ] Instalar dependências necessárias:
  - `@tiptap/react`
  - `@tiptap/starter-kit`
  - `@tiptap/extension-task-list`
  - `@tiptap/extension-task-item`
  - `@tiptap/extension-placeholder`
- [ ] Criar estrutura de pastas para os novos componentes:
  - `src/components/diario/`

### 2. Criação dos Componentes

#### 2.1 DiarioSidebar.tsx
- [ ] Implementar sidebar colapsável (~240px expandida, ~48px colapsada)
- [ ] Criar seção superior com pastas (com emojis)
- [ ] Criar seção inferior com notas da pasta selecionada
- [ ] Adicionar botão "+Nova Nota" que cria entrada na pasta selecionada
- [ ] Adicionar botão "+Nova Pasta" com input inline
- [ ] Incluir campo de busca por título no topo
- [ ] Implementar lógica para criar pasta "Geral" automaticamente na primeira visita

#### 2.2 DiarioTabs.tsx
- [ ] Criar barra de abas para notas abertas (estilo VS Code)
- [ ] Cada aba mostrar: título truncado + X para fechar
- [ ] Adicionar "+" ao final para abrir nova nota
- [ ] Limitar a ~8 abas visíveis com scroll horizontal depois
- [ ] Destacar aba ativa com underline dourado
- [ ] Implementar auto-save a cada 30s ou ao trocar de aba

#### 2.3 DiarioEditor.tsx
- [ ] Implementar header compacto (2 linhas máximo):
  - Linha 1: Título inline editável (font-display, uppercase, sem campo separado)
  - Linha 2: data . pasta — automático
- [ ] Criar toolbar fixa no topo do editor com botões:
  - [B] [I] [S] [H1] [H2] [*] [1.] [O] [">]
- [ ] Integrar editor TipTap com pacotes:
  - `@tiptap/react` — wrapper React
  - `@tiptap/starter-kit` — bold, italic, strike, headings, bullet/ordered lists
  - `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — checklists
  - `@tiptap/extension-placeholder` — placeholder text
- [ ] Definir placeholder: "Deixe sua alma fluir nas palavras..."
- [ ] Adicionar status bar no rodapé: word count + última edição
- [ ] Implementar tela vazia quando nenhuma nota estiver selecionada

#### 2.4 DiarioView.tsx (Container Principal)
- [ ] Reescrever completamente para orquestrar sidebar + tabs + editor
- [ ] Manter compatibilidade com rota existente em App.tsx
- [ ] Remover toolbar decorativa atual e header com avatar
- [ ] Remover salvamento via addDocument() do AgendaContext
- [ ] Manter funcionalidade de exportação (opcional, pode ser adicionada depois)

#### 2.5 DiarioContext.tsx
- [ ] Criar context provider para estado global
- [ ] Gerenciar estado de: notas, pastas, abas abertas, ações CRUD
- [ ] Implementar métodos para:
  - Criar/atualizar/deletar entradas
  - Criar/atualizar/deletar pastas
  - Gerenciar estado das abas (abertas/ativa)
  - Carregar/salvar dados do storage Tauri

#### 2.6 Tipos TypeScript (src/types/diario.ts)
- [ ] Definir interface DiaryEntry com:
  - id: string (crypto.randomUUID())
  - title: string
  - content: string (TipTap JSON stringified)
  - folderId: string
  - createdAt: string (ISO 8601)
  - updatedAt: string (ISO 8601)
  - wordCount: number
- [ ] Definir interface DiaryFolder com:
  - id: string
  - name: string
  - icon: string (emoji)
  - order: number
  - createdAt: string

### 3. Persistencia Tauri
#### 3.1 Estrutura de Arquivos
- [ ] Confirmar/criar estrutura:
  ```
  memory/diary/
    folders.json           # DiaryFolder[]
    entries/
      {uuid}.json          # DiaryEntry (um por arquivo)
    tabs.json              # { openTabIds: string[], activeTabId: string | null }
  ```

#### 3.2 Comandos Tauri (src-tauri/src/lib.rs)
- [ ] Adicionar comando `diary_create_entry`
- [ ] Adicionar comando `diary_update_entry`
- [ ] Adicionar comando `diary_delete_entry`
- [ ] Adicionar comando `diary_list_entries`
- [ ] Adicionar comando `diary_get_entry`
- [ ] Adicionar comando `diary_create_folder`
- [ ] Adicionar comando `diary_list_folders`
- [ ] Adicionar comando `diary_delete_folder`
- [ ] Adicionar comando `diary_save_tabs`
- [ ] Adicionar comando `diary_load_tabs`

#### 3.3 Lógica de Inicialização
- [ ] Implementar sequência de inicialização:
  1. Ao abrir o Diario: chamar diary_list_folders + diary_load_tabs
  2. Se folders.json não existir: criar pasta "Geral" default
  3. Carregar entradas das abas abertas
  4. Se nenhuma aba aberta: mostrar tela vazia

#### 3.4 Auto-save
- [ ] Implementar trigger de auto-save:
  - A cada 30s de inatividade OU
  - Ao trocar de aba OU
  - Ao fechar aba
- [ ] Chamar diary_update_entry com { id, content }
- [ ] Implementar debounce de 2s para digitação contínua
- [ ] Backend deve setar updatedAt do system clock

### 4. Atualizações de Documentação
#### 4.1 AGENTS.md
- [ ] Atualizar referência do Diario na tabela de módulos
- [ ] Adicionar nova seção para componentes do diario se necessário

#### 4.2 Outros Documentos
- [ ] Atualizar docs/estrutura-do-projeto.md com novos componentes
- [ ] Atualizar docs/arquitetura.md se necessário

### 5. Testes e Validação
- [ ] Testar criação de notas e pastas
- [ ] Testar edição de conteúdo com formatação rich text
- [ ] Testar funcionalidade de checklists
- [ ] Testar persistência entre sessões
- [ ] Testar auto-save e recuperação
- [ ] Testar navegação entre abas
- [ ] Testar exclusão de notas e pastas
- [ ] Verificar comportamento da pasta "Geral" (não deletável)

## Dependências
- Necessário instalar pacotes TipTap via npm/yarn
- Possível necessidade de atualizar tauri.conf.json para permissoes de sistema de arquivo

## Riscos e Mitigações
- **Risco**: Conflito com estado existente do AgendaContext
  - **Mitigação**: Isolar completamente o estado do diario no novo DiarioContext
- **Risco**: Problemas de desempenho com TipTap em dispositivos menores
  - **Mitigação**: Implementar virtualização se necessário, otimizar re-renders
- **Risco**: Complexidade na sincronização entre frontend e storage Tauri
  - **Mitigação**: Implementar cuidadosamente o contexto com loaders/savers adequados

## Critérios de Aceitação
- [ ] Usuario pode criar, editar e excluir notas
- [ ] Usuario pode organizar notas em pastas
- [ ] Editor suporta rich text básico (negrito, itálico, títulos, listas)
- [ ] Editor suporta checklists funcionais
- [ ] Estado é persistente entre sessões da aplicação
- [ ] Abas funcionam como esperado (abrir, fechar, mudar)
- [ ] Sidebar é colapsável e funcional
- [ ] Auto-save funciona corretamente
- [ ] Layout responsivo em diferentes tamanhos de tela