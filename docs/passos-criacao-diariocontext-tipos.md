# Passos para Criar DiarioContext e Tipos TypeScript

## Objetivo
Criar o contexto global para gerenciamento de estado do Diario e definir os tipos TypeScript necessários:
- DiarioContext.tsx: Provider e hooks para estado global
- src/types/diario.ts: Interfaces para DiaryEntry e DiaryFolder

## Passos para Tipos TypeScript (src/types/diario.ts)

### 1. Criar o Arquivo de Tipos
- [ ] Criar diretório `src/types/` se não existir
- [ ] Criar arquivo `src/types/diario.ts`

### 2. Definir Interface DiaryEntry
- [ ] Implementar exatamente como especificado no design:
  ```typescript
  export interface DiaryEntry {
    id: string;            // crypto.randomUUID()
    title: string;
    content: string;       // TipTap JSON (stringified)
    folderId: string;
    createdAt: string;     // ISO 8601
    updatedAt: string;     // ISO 8601
    wordCount: number;
  }
  ```

### 3. Definir Interface DiaryFolder
- [ ] Implementar exatamente como especificado no design:
  ```typescript
  export interface DiaryFolder {
    id: string;
    name: string;
    icon: string;          // emoji
    order: number;
    createdAt: string;
  }
  ```

### 4. Definir Tipos para Estado das Abas
- [ ] Adicionar tipo para o estado das abas (conforme especificado):
  ```typescript
  export interface DiaryTabsState {
    openTabIds: string[];  // IDs das entradas abertas em abas
    activeTabId: string | null; // ID da entrada atualmente ativa
  }
  ```

### 5. Exportar Todos os Tipos
- [ ] Garantir que todas as interfaces estejam disponíveis para importação:
  ```typescript
  export type { DiaryEntry, DiaryFolder, DiaryTabsState };
  ```

## Passos para DiarioContext.tsx

### 1. Criar Estrutura do Arquivo
- [ ] Criar arquivo `src/context/DiarioContext.tsx`
- [ ] Importar dependências necessárias:
  ```typescript
  import { createContext, useContext, useState, useEffect, useCallback } from 'react';
  import { DiaryEntry, DiaryFolder, DiaryTabsState } from '../types/diario';
  import { 
    diary_list_folders, diary_create_folder, diary_delete_folder,
    diary_list_entries, diary_create_entry, diary_get_entry,
    diary_update_entry, diary_delete_entry,
    diary_load_tabs, diary_save_tabs
  } from '../utils/tauri'; // Assumindo que vamos criar este wrapper
  ```

### 2. Definir Estrutura do Contexto
- [ ] Criar objeto de contexto com valor inicial:
  ```typescript
  interface DiarioContextType {
    // Estado
    folders: DiaryFolder[];
    entries: DiaryEntry[];
    tabsState: DiaryTabsState;
    isLoading: boolean;
    error: string | null;
    
    // Ações - Pastas
    loadFolders: () => Promise<void>;
    createFolder: (name: string, icon: string) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;
    
    // Ações - Entradas
    loadEntries: (folderId?: string) => Promise<void>;
    createEntry: (folderId: string) => Promise<void>;
    getEntry: (id: string) => Promise<DiaryEntry | null>;
    updateEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<void>;
    deleteEntry: (entryId: string) => Promise<void>;
    
    // Ações - Abas
    loadTabs: () => Promise<void>;
    saveTabs: (openIds: string[], activeId: string | null) => Promise<void>;
    setActiveEntry: (entryId: string | null) => void;
    addOpenEntry: (entryId: string) => void;
    removeOpenEntry: (entryId: string) => void;
  }
  
  const DiarioContext = createContext<DiarioContextType | undefined>(undefined);
  ```

### 3. Implementar o Provider
- [ ] Criar componente DiarioProvider:
  ```typescript
  export const DiarioProvider = ({ children }: { children: React.ReactNode }) => {
    const [folders, setFolders] = useState<DiaryFolder[]>([]);
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [tabsState, setTabsState] = useState<DiaryTabsState>({
      openTabIds: [],
      activeTabId: null
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Métodos serão implementados nos passos seguintes
    
    return (
      <DiarioContext.Provider value={contextValue}>
        {children}
      </DiarioContext.Provider>
    );
  };
  ```

### 4. Implementar Métodos de Carregamento Inicial
- [ ] Implementar efeito para carregamento inicial:
  ```typescript
  useEffect(() => {
    const initializeDiario = async () => {
      setIsLoading(true);
      try {
        // Carregar pastas
        await loadFolders();
        
        // Carregar estado das abas
        await loadTabs();
        
        // Se não houver pastas, criar pasta "Geral" padrão
        if (folders.length === 0) {
          await createFolder('Geral', '📓');
          await loadFolders(); // Recarregar pastas
        }
        
        // Carregar entradas da pasta ativa ou primeira pasta
        const initialFolderId = folders.length > 0 ? folders[0].id : undefined;
        await loadEntries(initialFolderId);
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    };
    
    initializeDiario();
  }, []); // Executar apenas uma vez na montagem
  ```

### 5. Implementar Métodos de Pastas
- [ ] loadFolders:
  ```typescript
  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const folderList = await diary_list_folders();
      setFolders(folderList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pastas');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] createFolder:
  ```typescript
  const createFolder = useCallback(async (name: string, icon: string) => {
    setIsLoading(true);
    try {
      const newFolder = await diary_create_folder({ name, icon });
      setFolders(prev => [...prev, newFolder]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pasta');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] deleteFolder:
  ```typescript
  const deleteFolder = useCallback(async (folderId: string) => {
    setIsLoading(true);
    try {
      await diary_delete_folder({ id: folderId });
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      // Mover entradas da pasta deletada para "Geral"
      const geralFolder = folders.find(f => f.name === 'Geral' && f.icon === '📓');
      if (geralFolder) {
        // Esta lógica seria melhor tratada no backend, mas podemos fazer aqui como fallback
        const entriesToMove = entries.filter(e => e.folderId === folderId);
        for (const entry of entriesToMove) {
          await diary_update_entry({ 
            id: entry.id, 
            folderId: geralFolder.id 
          });
        }
        setEntries(prev => prev.map(entry => 
          entry.folderId === folderId 
            ? { ...entry, folderId: geralFolder.id } 
            : entry
        ));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir pasta');
    } finally {
      setIsLoading(false);
    }
  }, [folders, entries]);
  ```

### 6. Implementar Métodos de Entradas
- [ ] loadEntries:
  ```typescript
  const loadEntries = useCallback(async (folderId?: string) => {
    setIsLoading(true);
    try {
      const entryList = await diary_list_entries({ folderId });
      setEntries(entryList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar entradas');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] createEntry:
  ```typescript
  const createEntry = useCallback(async (folderId: string) => {
    setIsLoading(true);
    try {
      const newEntry = await diary_create_entry({ 
        title: 'Nova Crônica', 
        folderId 
      });
      setEntries(prev => [...prev, newEntry]);
      // Abrir a nova entrada automaticamente
      addOpenEntry(newEntry.id);
      setActiveEntry(newEntry.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar entrada');
    } finally {
      setIsLoading(false);
    }
  }, [addOpenEntry, setActiveEntry]);
  ```
- [ ] getEntry:
  ```typescript
  const getEntry = useCallback(async (id: string) => {
    try {
      const entry = await diary_get_entry({ id });
      return entry;
    } catch (err) {
      console.error('Erro ao buscar entrada:', err);
      return null;
    }
  }, []);
  ```
- [ ] updateEntry:
  ```typescript
  const updateEntry = useCallback(async (id: string, updates: Partial<DiaryEntry>) => {
    setIsLoading(true);
    try {
      // Preparar dados para atualização
      const updateData: any = { ...updates };
      // Atualizar updatedAt para timestamp atual
      updateData.updatedAt = new Date().toISOString();
      // Atualizar wordCount se conteúdo foi modificado
      if (updates.content !== undefined) {
        // Contagem simples de palavras (pode ser melhorada)
        updateData.wordCount = updates.content.trim() 
          ? updates.content.split(/\s+/).filter(Boolean).length 
          : 0;
      }
      
      const updatedEntry = await diary_update_entry({ id, ...updateData });
      
      // Atualizar estado local
      setEntries(prev => prev.map(entry => 
        entry.id === id 
          ? { ...entry, ...updatedEntry } 
          : entry
      ));
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar entrada');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] deleteEntry:
  ```typescript
  const deleteEntry = useCallback(async (entryId: string) => {
    setIsLoading(true);
    try {
      await diary_delete_entry({ id: entryId });
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      // Limpar estado das abas se esta entrada estava aberta
      setTabsState(prev => {
        let newOpenTabIds = prev.openTabIds.filter(id => id !== entryId);
        let newActiveTabId = prev.activeTabId;
        if (prev.activeTabId === entryId) {
          // Se a aba ativa foi excluída, ativar outra ou definir como null
          newActiveTabId = newOpenTabIds.length > 0 
            ? newOpenTabIds[0] 
            : null;
        }
        return { 
          openTabIds: newOpenTabIds, 
          activeTabId: newActiveTabId 
        };
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir entrada');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```

### 7. Implementar Métodos de Abas
- [ ] loadTabs:
  ```typescript
  const loadTabs = useCallback(async () => {
    setIsLoading(true);
    try {
      const tabsState = await diary_load_tabs();
      setTabsState(tabsState);
      setError(null);
    } catch (err) {
      // Se não houver estado salvo, usar valores padrão
      setTabsState({
        openTabIds: [],
        activeTabId: null
      });
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] saveTabs:
  ```typescript
  const saveTabs = useCallback(async (openIds: string[], activeId: string | null) => {
    setIsLoading(true);
    try {
      await diary_save_tabs({ 
        openIds: openIds.filter(id => id !== null), // Filtrar nulos
        activeId 
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar estado das abas');
    } finally {
      setIsLoading(false);
    }
  }, []);
  ```
- [ ] setActiveEntry:
  ```typescript
  const setActiveEntry = useCallback((entryId: string | null) => {
    setTabsState(prev => ({ ...prev, activeTabId: entryId }));
  }, []);
  ```
- [ ] addOpenEntry:
  ```typescript
  const addOpenEntry = useCallback((entryId: string) => {
    setTabsState(prev => {
      // Evitar duplicatas
      if (!prev.openTabIds.includes(entryId)) {
        return {
          ...prev,
          openTabIds: [...prev.openTabIds, entryId]
        };
      }
      return prev;
    });
  }, []);
  ```
- [ ] removeOpenEntry:
  ```typescript
  const removeOpenEntry = useCallback((entryId: string) => {
    setTabsState(prev => {
      const newOpenTabIds = prev.openTabIds.filter(id => id !== entryId);
      let newActiveTabId = prev.activeTabId;
      if (prev.activeTabId === entryId) {
        // Se removemos a aba ativa, ativar outra ou definir como null
        newActiveTabId = newOpenTabIds.length > 0 
          ? newOpenTabIds[0] 
          : null;
      }
      return { 
        openTabIds: newOpenTabIds, 
        activeTabId: newActiveTabId 
      };
    });
  }, []);
  ```

### 8. Criar o Hook Customizado
- [ ] Implementar hook useDiarioContext:
  ```typescript
  export const useDiarioContext = () => {
    const context = useContext(DiarioContext);
    if (!context) {
      throw new Error('useDiarioContext deve ser usado dentro de DiarioProvider');
    }
    return context;
  };
  ```

### 9. Exportar Provider e Hook
- [ ] Exportar ambos para uso em outros componentes:
  ```typescript
  export { DiarioProvider, useDiarioContext };
  ```

### 10. Tratamento de Erros e Loading
- [ ] Implementar indicadores visuais de loading e erro nos componentes que usam o contexto
- [ ] Considerar implementar tentativas automáticas para operações que falharam

### 11. Integração com Persistencia Tauri
- [ ] Criar wrapper para comandos Tauri em `src/utils/tauri.ts` (será detalhado em outro documento)
- [ ] Este wrapper deve converter chamadas de função em invocações Tauri
- [ ] Exemplo de como o wrapper poderia parecer:
  ```typescript
  // src/utils/tauri.ts
  import { invoke } from '@tauri-apps/api/tauri';
  
  export const diary_list_folders = async () => {
    return await invoke<DiaryFolder[]>('diary_list_folders');
  };
  
  // ... outros comandos seguindo o mesmo padrão
  ```

### 12. Considerações de Performance
- [ ] Implementar memoização onde apropriado para evitar re-renders desnecessários
- [ ] Considerar usar useCallback para funções que são passadas como props
- [ ] Avaliar necessidade de paginação ou virtualização para grandes quantidades de entradas

### 13. Testes e Validação
- [ ] Testar criação e exclusão de pastas
- [ ] Testar criação, edição e exclusão de entradas
- [ ] Testar persistência de estado entre recarregamentos
- [ ] Testar comportamento das abas (abrir, fechar, mudar)
- [ ] Verificar tratamento de erros em casos de falha na comunicação com Tauri
- [ ] Testar cenários de primeira visita (sem dados existentes)

## Integração com Componentes

### Como os componentes vão usar o contexto:

#### DiarioSidebar
- [ ] Usar pastas e entries do contexto
- [ ] Usar createFolder, deleteFolder, createEntry, deleteEntry, setActiveEntry

#### DiarioTabs
- [ ] Usar entries, tabsState do contexto
- [ ] Usar setActiveEntry, addOpenEntry, removeOpenEntry, deleteEntry

#### DiarioEditor
- [ ] Usar entry (encontrado por activeEntryId) do contexto
- [ ] Usar updateEntry para salvar alterações
- [ ] Usar createEntry para criar novas entradas (via botão "+" na toolbar)

### Fluxo de Dados
1. Componentes leem estado do contexto via useDiarioContext()
2. Componentes disparam ações através das funções do contexto
3. Contexto atualiza seu estado local
4. Contexto persiste mudanças no storage Tauri via comandos
5. Componentes re-renderizam com o novo estado