import React, { useState, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';

interface DiarioEditorProps {
  entry: any; // Using any for now to avoid type issues, should be DiaryEntry | null
  updateEntry: (id: string, changes: { title?: string; content?: string; folderId?: string }) => Promise<void>;
  onSave?: (entry: any) => void;
}

const DiarioEditor: React.FC<DiarioEditorProps> = ({
  entry,
  updateEntry,
  onSave
}) => {
  const [wordCount, setWordCount] = useState(0);
  const [lastEdited, setLastEdited] = useState<string>('');

  // Initialize editor with extensions
  const editor = useCallback(() => {
    return useEditor({
      extensions: [
        StarterKit,
        TaskList,
        TaskItem,
        Placeholder.configure({
          placeholder: 'Deixe sua alma fluir nas palavras...',
          emptyEditorClass: 'is-empty',
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none',
        },
      },
      onUpdate: ({ editor }) => {
        // Update word count
        const textContent = editor.getText();
        setWordCount(textContent.trim().length > 0 ? textContent.trim().split(/\s+/).length : 0);
        
        // Update last edited timestamp
        setLastEdited(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // Auto-save content changes (debounced in context)
        if (entry) {
          const content = editor.getJSON();
          updateEntry(entry.id, { content: JSON.stringify(content) });
          
          // Call onSave callback if provided
          if (onSave) {
            onSave({
              ...entry,
              content: JSON.stringify(content)
            });
          }
        }
      },
    });
  }, [entry, updateEntry, onSave]);

  // Handle title changes (inline editing)
  const handleTitleChange = useCallback((e: React.SyntheticEvent<HTMLDivElement>) => {
    if (entry) {
      const newTitle = e.currentTarget.innerText || 'Sem Título';
      updateEntry(entry.id, { title: newTitle });
      
      // Call onSave callback if provided
      if (onSave) {
        onSave({
          ...entry,
          title: newTitle
        });
      }
    }
  }, [entry, updateEntry, onSave]);

  // Render empty state when no entry is selected
  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-2xl mb-4">
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s1-7 5-7 5 7 5 7M2 12s1 7 5 7 5-7 5-7" />
          </svg>
        </div>
        <p className="mb-6">Selecione uma nota na sidebar ou crie uma nova para começar a escrever</p>
        <button 
          onClick={() => {
            // This would typically be handled by the parent component
          }}
          className="px-4 py-2 bg-gold/10 hover:bg-gold/20 rounded transition-colors"
        >
          Nova Nota
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with inline title and metadata */}
      <div className="flex flex-col items-start px-6 py-4 border-b border-gold/10 bg-white">
        {/* Title - inline editable */}
        <div
          className="font-display uppercase tracking-wider text-xl cursor-pointer"
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleChange}
        >
          {entry.title || 'Sem Título'}
        </div>
        {/* Metadata line */}
        <div className="mt-1 flex items-center gap-4 text-[10px] text-gray-400 uppercase tracking-widest">
          <span className="whitespace-nowrap">
            {new Date(entry.createdAt).toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </span>
          <span className="whitespace-nowrap">.</span>
          {/* Folder name would come from context - placeholder for now */}
          <span className="whitespace-nowrap">Geral</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gold/10">
        {/* Bold */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Negrito (Ctrl+B)"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8m-4 4v8m4-4v0" />
          </svg>
        </button>
        
        {/* Italic */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Itálico (Ctrl+I)"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 6h14M5 12h10M5 18h12" />
          </svg>
        </button>
        
        {/* Strikethrough */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Riscado"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15l6-6" />
          </svg>
        </button>
        
        {/* Heading 1 */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Título 1"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Heading 2 */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Título 2"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h12M4 12h16M4 18h14" />
          </svg>
        </button>
        
        {/* Bullet List */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Lista com marcadores"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2-2h-3m0-6H5a2 2 0 012-2h14a2 2 0 012 2v2" />
          </svg>
        </button>
        
        {/* Ordered List */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Lista numerada"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Task List */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Lista de tarefas"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 002-2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        {/* Blockquote */}
        <button 
          className="p-1.5 rounded hover:bg-gold/10 transition-colors"
          title="Citação"
        >
          <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          </svg>
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent 
          editor={editor()} 
          className="min-h-[300px]"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] text-gray-400 uppercase tracking-widest border-t border-gold/10 bg-white">
        <span>{wordCount} palavras</span>
        <span>{lastEdited ? `editado as ${lastEdited}` : ''}</span>
      </div>
    </div>
  );
};

export default DiarioEditor;