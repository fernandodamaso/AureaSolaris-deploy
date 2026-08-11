import React from 'react';
import { KnowledgeLibraryPanel } from './KnowledgeLibraryPanel';

export const BibliotecaView: React.FC = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6 overflow-y-auto no-scrollbar">
      <div className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 shadow-sm">
        <h2 className="text-xl font-bold">Biblioteca Astrológica</h2>
        <p className="mt-2 text-sm text-[var(--aurea-text-muted)]">
          Este é o acesso direto à enciclopédia editorial do Aurea Solaris: conceitos,
          técnicas, tradições, divergências e fontes do corpus astrológico instalado no sistema.
        </p>
      </div>

      <KnowledgeLibraryPanel />
    </div>
  );
};
