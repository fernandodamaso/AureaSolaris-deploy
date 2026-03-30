import React, { useState, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CodeBlock from '@tiptap/extension-code-block';
import { Table } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';

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
  const [characterCount, setCharacterCount] = useState(0);
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
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        CharacterCount,
        HorizontalRule,
        CodeBlock,
        Table,
        Image,
        Link,
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
        
        // Update character count
        setCharacterCount(textContent.length);
        
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
       <div className="flex items-center gap-[var(--spacing-xs)] px-[var(--spacing-sm)] py-[var(--spacing-sm)] bg-[var(--color-bg-secondary)] border-b border-[var(--color-accent)]/10">
         {/* Text Style Group */}
         <div className="flex items-center gap-1">
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
         </div>
         
         {/* Text Structure Group */}
         <div className="flex items-center gap-1">
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
           
           {/* Blockquote */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Citação"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
             </svg>
           </button>
           
           {/* Code Block */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Bloco de código"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6a2 2 0 00-2-2v6a2 2 0 002 2v6h12a2 2 0 002 2v-6a2 2 0 002-2v-6z" />
             </svg>
           </button>
           
           {/* Horizontal Rule */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Linha horizontal"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18" />
             </svg>
           </button>
         </div>
         
         {/* Lists Group */}
         <div className="flex items-center gap-1">
           {/* Bullet List */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Lista com marcadores"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012-2h14a2 2 0 01-2-2h-3m0-6H5a2 2 0 012-2h14a2 2 0 012 2v2" />
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
         </div>
         
         {/* Alignment Group */}
         <div className="flex items-center gap-1">
           {/* Text Alignment */}
           <div className="relative">
             <button 
               className="p-1.5 rounded hover:bg-gold/10 transition-colors"
               title="Alinhamento do texto"
               onClick={() => {
                 // Toggle alignment menu
               }}
             >
               <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 00-2-2V6z" />
               </svg>
             </button>
             {/* Alignment dropdown would go here in a full implementation */}
           </div>
         </div>
         
         {/* Insert Group */}
         <div className="flex items-center gap-1">
           {/* Table */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Tabela"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18M5 9h14M5 15h14" />
             </svg>
           </button>
           
           {/* Image */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Imagem"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16v10a2 2 0 012 2v2H6a2 2 0 01-2-2v-2zM10 11a2 2 0 10-4 0 2 2 0 004 0z" />
             </svg>
           </button>
           
           {/* Link */}
           <button 
             className="p-1.5 rounded hover:bg-gold/10 transition-colors"
             title="Link"
           >
             <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2v-11z" />
             </svg>
           </button>
         </div>
         
         {/* Tools Group */}
         <div className="flex items-center gap-1 ml-auto">
           {/* Undo/Redo would go here in a full implementation */}
           {/* Word count is in status bar */}
         </div>
       </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent 
          editor={editor()} 
          className="min-h-[300px]"
        />
      </div>

       {/* Status Bar */}
       <div className="flex items-center justify-between px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[var(--font-size-xs)] text-[var(--color-text-secondary)] uppercase tracking-widest border-t border-[var(--color-accent)]/10 bg-[var(--color-bg-secondary)]">
         <span>{wordCount} palavras</span>
         <span className="mx-[var(--spacing-sm)]">|</span>
         <span>{characterCount} caracteres</span>
         <span className="mx-[var(--spacing-sm)]">|</span>
         <span>{lastEdited ? `editado as ${lastEdited}` : ''}</span>
       </div>
    </div>
  );
};

export default DiarioEditor;