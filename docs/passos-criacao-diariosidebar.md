# Passos para Criar DiarioSidebar.tsx

## Objetivo
Implementar a sidebar colapsável para o Diario que contém:
- Navegação de pastas com emojis
- Lista de notas da pasta selecionada
- Controles para criar novas pastas e notas
- Campo de busca por título

## Passos Detalhados

### 1. Estrutura Básica do Componente
- [ ] Criar arquivo `src/components/diario/DiarioSidebar.tsx`
- [ ] Implementar componente funcional React
- [ ] Importar dependências necessárias:
  ```typescript
  import { useState } from 'react';
  import { 
    Folder, ChevronRight, Plus, X, Search, 
    Menu, ChevronDown, ChevronUp
  } from 'lucide-react';
  ```

### 2. Props e Interface
- [ ] Definir interface de props:
  ```typescript
  interface DiarioSidebarProps {
    folders: DiaryFolder[];
    entries: DiaryEntry[];
    activeEntryId: string | null;
    onCreateFolder: (name: string, icon: string) => void;
    onDeleteFolder: (folderId: string) => void;
    onCreateEntry: (folderId: string) => void;
    onDeleteEntry: (entryId: string) => void;
    onSetActiveEntry: (entryId: string | null) => void;
  }
  ```
- [ ] Aceitar essas props no componente

### 3. Estado Local
- [ ] Implementar estado para sidebar colapsável:
  ```typescript
  const [isCollapsed, setIsCollapsed] = useState(false);
  ```
- [ ] Implementar estado para campo de busca:
  ```typescript
  const [searchTerm, setSearchTerm] = useState('');
  ```
- [ ] Implementar estado para modo de criação de pasta:
  ```typescript
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📝');
  ```

### 4. Lógica de Pastas e Notas
- [ ] Implementar lógica para determinar pasta selecionada:
  ```typescript
  // Se nenhuma entrada ativa, selecionar primeira pasta ou "Geral"
  const getSelectedFolderId = () => {
    if (!activeEntryId) return folders[0]?.id || null;
    
    const activeEntry = entries.find(e => e.id === activeEntryId);
    return activeEntry?.folderId || folders[0]?.id || null;
  };
  ```
- [ ] Filtrar notas pela pasta selecionada e termo de busca:
  ```typescript
  const selectedFolderId = getSelectedFolderId();
  const filteredEntries = entries.filter(
    entry => entry.folderId === selectedFolderId &&
             entry.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  ```

### 5. Renderização da Sidebar
- [ ] Container principal com largura condicional:
  ```tsx
  <div className={`flex flex-col w-[240px] ${isCollapsed ? 'w-[48px]' : ''} 
                  bg-white border-r border-gold/10 transition-all`}>
  ```
- [ ] Cabeçalho com título e botão de colapsar:
  ```tsx
  <div className="flex items-center justify-between px-4 py-4 border-b border-gold/10">
    <h3 className={isCollapsed ? 'hidden' : 'text-[12px] font-black uppercase tracking-wider text-gray-800'}>
      Pastas
    </h3>
    <button 
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="p-2 hover:bg-gold/10 rounded-lg text-gray-400 hover:text-gold transition-colors"
    >
      {isCollapsed ? <ChevronRight size={18} /> : <X size={18} />}
    </button>
  </div>
  ```

### 6. Campo de Busca (visível apenas quando expandido)
- [ ] Renderizar condicionalmente:
  ```tsx
  {!isCollapsed && (
    <div className="px-4 py-3">
      <input
        type="text"
        placeholder="Buscar notas..."
        className="w-full px-3 py-2 border border-gray-200 rounded-md text-[11px] font-medium 
                   focus:outline-none focus:ring-2 focus:ring-gold/20"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  )}
  ```

### 7. Lista de Pastas
- [ ] Renderizar lista de pastas:
  ```tsx
  <div className="flex-1 overflow-y-auto px-2">
    {folders.map(folder => (
      <div 
        key={folder.id}
        className={`flex items-center px-3 py-2 mb-1 rounded-md cursor-pointer 
                   ${selectedFolderId === folder.id ? 'bg-gold/20' : 'hover:bg-gray-50'}`}
        onClick={() => {
          // Selecionar primeira nota da pasta ou criar nova se vazia
          const folderEntries = filteredEntries.filter(e => e.folderId === folder.id);
          if (folderEntries.length > 0) {
            onSetActiveEntry(folderEntries[0].id);
          } else {
            onCreateEntry(folder.id);
          }
        }}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 flex items-center justify-center text-[12px]">
            {folder.icon}
          </div>
          <span className={isCollapsed ? 'hidden' : 'text-[11px] font-medium truncate max-w-xs'}>
            {folder.name}
          </span>
        </div>
      </div>
    ))}
  </div>
  ```

### 8. Botão "+ Nova Pasta"
- [ ] Implementar área de criação de pasta:
  ```tsx
  <div className="px-4 py-3 border-t border-gold/10">
    {isCreatingFolder ? (
      <>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Nome da pasta"
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-[11px] font-medium 
                     focus:outline-none focus:ring-2 focus:ring-gold/20 mb-2"
        />
        <input
          type="text"
          value={newFolderIcon}
          onChange={(e) => setNewFolderIcon(e.target.value)}
          placeholder="Ícone (emoji)"
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-[11px] font-medium 
                     focus:outline-none focus:ring-2 focus:ring-gold/20 mb-2"
          maxLength="2"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setIsCreatingFolder(false);
              setNewFolderName('');
              setNewFolderIcon('📝');
            }}
            className="px-3 py-1.5 text-[10px] font-medium text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (newFolderName.trim()) {
                onCreateFolder(newFolderName.trim(), newFolderIcon);
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderIcon('📝');
              }
            }}
            className="px-3 py-1.5 bg-gold text-white text-[10px] font-medium rounded-hover"
          >
            Criar
          </button>
        </div>
      </>
    ) : (
      <button
        onClick={() => setIsCreatingFolder(true)}
        className="w-full flex items-center justify-start px-3 py-2 text-left text-[11px] 
                   font-medium hover:bg-gray-50 transition-colors"
      >
        <Plus size={14} className="mr-2" />
        Nova Pasta
      </button>
    )}
  </div>
  ```

### 9. Lista de Notas da Pasta Selecionada
- [ ] Renderizar notas da pasta selecionada:
  ```tsx
  <div className="flex-1 overflow-y-auto px-2">
    <h4 className={isCollapsed ? 'hidden' : 'px-3 py-2 text-[10px] font-black uppercase 
                                 tracking-wider text-gray-600'}>
      Notas
    </h4>
    {filteredEntries
      .filter(entry => entry.folderId === selectedFolderId)
      .map(entry => (
        <div
          key={entry.id}
          className={`flex items-center px-3 py-2 mb-1 rounded-md cursor-pointer 
                     ${activeEntryId === entry.id ? 'bg-gold/20' : 'hover:bg-gray-50'}`}
          onClick={() => onSetActiveEntry(entry.id)}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 flex items-center justify-center text-[10px]">
              📄
            </div>
            <div className={isCollapsed ? 'hidden' : 'flex-1'}>
              <p className="text-[10px] font-medium line-clamp-1 truncate max-w-xs">
                {entry.title}
              </p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEntry(entry.id);
                }}
                className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
              >
                <X size={12} className="text-red-400" />
              </button>
            )}
          </div>
        </div>
      ))}
    {filteredEntries
      .filter(entry => entry.folderId === selectedFolderId)
      .length === 0 && (
        <div className={isCollapsed ? 'hidden' : 'px-3 py-4 text-center text-[10px] 
                                 text-gray-400 italic'}>
          Nenhuma nota nesta pasta
        </div>
      )}
  </div>
  ```

### 10. Botão "+ Nova Nota"
- [ ] Adicionar botão para criar nova nota:
  ```tsx
  <div className="px-4 py-3 border-t border-gold/10">
    <button
      onClick={() => {
        if (selectedFolderId) {
          onCreateEntry(selectedFolderId);
        }
      }}
      className="w-full flex items-center justify-start px-3 py-2 text-left text-[11px] 
                 font-medium hover:bg-gray-50 transition-colors"
    >
      <Plus size={14} className="mr-2" />
      Nova Nota
    </button>
  </div>
  ```

### 11. Lógica de Primeira Visita
- [ ] Esta lógica deve ser tratada no contexto ou no componente principal, mas podemos adicionar um efeito colateral:
  ```typescript
  useEffect(() => {
    if (folders.length === 0) {
      // Criar pasta "Geral" padrão
      onCreateFolder('Geral', '📓');
    }
  }, [folders, onCreateFolder]);
  ```

### 12. Estilos e Responsividade
- [ ] Utilizar classes Tailwind existentes do projeto
- [ ] Garantir que a sidebar seja colapsável corretamente
- [ ] Implementar transições suaves para expandir/recolher
- [ ] Garantir legibilidade em ambos os estados (expandido e colapsado)

### 13. Acessibilidade
- [ ] Adicionar atributos aria-label apropriados para botões
- [ ] Garantir navegação por teclado
- [ ] Fornecer feedback visual adequado para interações

### 14. Limpeza e Validação
- [ ] Remover comentários e código não utilizado
- [ ] Verificar se não há variáveis ou funções não utilizadas
- [ ] Testar funcionalidades: criar pasta, criar nota, buscar, selecionar itens