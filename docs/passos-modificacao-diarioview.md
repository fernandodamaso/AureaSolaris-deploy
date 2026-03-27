# Passos para Modificar DiarioView.tsx

## Objetivo
Transformar o DiarioView atual de um editor standalone em um container que orquestra:
- DiarioSidebar (sidebar com pastas e notas)
- DiarioTabs (barra de abas para notas abertas)
- DiarioEditor (editor rich text com TipTap)

## Passos Detalhados

### 1. Backup do Arquivo Original (Opcional, mas recomendado)
- [ ] Criar backup do DiarioView.tsx atual antes de modificar

### 2. Reestruturação Completa do Componente
- [ ] Substituir todo o conteúdo do arquivo por uma nova implementação
- [ ] Manter apenas as importações essenciais e adicionar novas necessárias

### 3. Importações Necessárias
- [ ] Manter: `import { useState } from 'react';`
- [ ] Manter: `import { useAgendaContext } from '../context/AgendaContext';` (por enquanto, para migração gradual)
- [ ] Adicionar: Importar os novos componentes:
  ```typescript
  import { DiarioSidebar } from './diario/DiarioSidebar';
  import { DiarioTabs } from './diario/DiarioTabs';
  import { DiarioEditor } from './diario/DiarioEditor';
  ```
- [ ] Adicionar: Importar o novo contexto:
  ```typescript
  import { useDiarioContext } from '../context/DiarioContext';
  ```
- [ ] Manter ícones necessários do lucide-react (pode reavaliar quais são realmente necessários)
- [ ] Remover importações não utilizadas das funções de exportação (por enquanto)

### 4. Estrutura do Componente Principal
- [ ] Remover todo o estado local atual (title, content, isSaving, showExportMenu)
- [ ] Substituir pelo uso do DiarioContext:
  ```typescript
  const { 
    entries, folders, activeEntryId, openEntryIds,
    createEntry, updateEntry, deleteEntry,
    createFolder, deleteFolder,
    setActiveEntryId, addOpenEntryId, removeOpenEntryId,
    isLoading, error
  } = useDiarioContext();
  ```
- [ ] Manter a estrutura básica de divs com classes Tailwind
- [ ] Implementar layout flex horizontal:
  - Sidebar (largura fixa ou colapsável)
  - Área principal (tabs + editor)

### 5. Implementação do Layout
- [ ] Criar container principal flex:
  ```tsx
  <div className="flex flex-1 bg-[#FCF9F1]">
    {/* Sidebar */}
    <DiarioSidebar 
      folders={folders}
      entries={entries}
      activeEntryId={activeEntryId}
      onCreateFolder={createFolder}
      onDeleteFolder={deleteFolder}
      onCreateEntry={createEntry}
      onDeleteEntry={deleteEntry}
      onSetActiveEntry={setActiveEntryId}
    />
    
    {/* Área Principal */}
    <div className="flex flex-col flex-1 border-l border-gold/10">
      {/* Tabs */}
      <DiarioTabs 
        entries={entries}
        activeEntryId={activeEntryId}
        openEntryIds={openEntryIds}
        onSetActiveEntry={setActiveEntryId}
        onAddOpenEntry={addOpenEntryId}
        onRemoveOpenEntry={removeOpenEntryId}
        onDeleteEntry={deleteEntry}
      />
      
      {/* Editor */}
      <DiarioEditor 
        entryId={activeEntryId}
        entry={entries.find(e => e.id === activeEntryId) || null}
        onUpdate={(entry) => updateEntry(entry.id, entry)}
        onCreateEntry={createEntry}
      />
    </div>
  </div>
  ```

### 6. Tratamento de Estados de Loading e Error
- [ ] Adicionar indicadores de loading quando apropriado
- [ ] Adicionar tratamento de erro para mostrar mensagens ao usuário
- [ ] Considerar tela vazia quando nenhuma entrada está selecionada

### 7. Remoção de Funcionalidades Antigas
- [ ] Remover completamente o header atual com botão de voltar e título
- [ ] Remover toolbar de formatação atual (Bold, Italic, etc.)
- [ ] Remover campos de input de título e textarea separados
- [ ] Remover botão de salvar atual
- [ ] Remover menu de exportação (pode ser reimplementado depois no editor ou como funcionalidade separada)

### 8. Integração com AgendaContext (Transição Gradual)
- [ ] Manter uso temporário do AgendaContext para compatibilidade durante a transição
- [ ] Planejar remover completamente essa dependência em uma fase posterior
- [ ] Implementar lógica para sincronizar mudanças do diario com o AgendaContext se necessário

### 9. Estilos e Responsividade
- [ ] Utilizar classes Tailwind existentes do projeto para manter consistência visual
- [ ] Implementar comportamento colapsável para a sidebar (em telas menores ou via botão)
- [ ] Garantir que o layout funcione em diferentes tamanhos de tela
- [ ] Manter a paleta de cores existente do projeto (golds, grays, etc.)

### 10. Limpeza Final
- [ ] Remover todos os comentários e código morto
- [ ] Garantir que não haja variáveis ou funções não utilizadas
- [ ] Verificar se o componente compila sem erros de TypeScript
- [ ] Testar funcionalidades básicas: criar entrada, selecionar entrada, editar conteúdo

## Considerações de Integração

### Com o App.tsx
- [ ] Verificar que a rota case 'diario' continua funcionando
- [ ] Manter o chat dos agentes escondido como antes
- [ ] Não modificar a estrutura de rotas existente

### Com o AgendaContext (Durante Transição)
- [ ] Avaliar se é necessário manter alguma integração temporária
- [ ] Se sim, implementar listeners para sincronizar mudanças
- [ ] Planejar remoção completa em fase subsequente

## Checklist de Verificação
- [ ] Componente compila sem erros
- [ ] Sidebar renderiza corretamente com pastas e notas
- [ ] Tabs renderizam corretamente e respondem a cliques
- [ ] Editor renderiza e permite edição de conteúdo
- [ ] Estado é mantido entre interações
- [ ] Layout é responsivo
- [ ] Nenhum erro de tempo de execução ao usar o componente