import React, { useState } from 'react';
import { DiarioProvider, useDiario } from '../context/DiarioContext';
import { DiarioSidebar } from './diario/DiarioSidebar';
import DiarioEditor from './diario/DiarioEditor';
import { StudyArchive } from './diario/StudyArchive';
import { History, PenLine, Plus } from 'lucide-react';

type DiarioViewProps = {
  onOpenStudy?: (boardId: string, nodeId: number) => void;
};

const DiarioViewInner: React.FC<DiarioViewProps> = ({ onOpenStudy = () => undefined }) => {
  const { activeEntry, createEntry, isLoading } = useDiario();
  const [mode, setMode] = useState<'history' | 'notes'>('history');

  const createPersonalNote = async () => {
    setMode('notes');
    await createEntry();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center background: var(--aurea-surface)">
        <div className="flex items-center gap-3 color: var(--aurea-text-muted)">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-color: var(--aurea-gold-deep) border-top-color: transparent" />
          <span className="text-xs font-medium uppercase tracking-wider">Carregando registros locais…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden background: var(--aurea-surface) font-sans color: var(--aurea-text)">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-color: rgba(38,54,66,0.7) background: var(--aurea-surface-light) px-5 py-3">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-[0.22em] color: var(--aurea-text)">Histórico & registros</h1>
          <p className="mt-1 text-[11px] color: var(--aurea-text-muted)">Notas pessoais e estudos dos Cadernos Vivos</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg background: rgba(3,10,17,0.4) p-1" aria-label="Modo do histórico">
            <button
              type="button"
              onClick={() => setMode('history')}
              aria-pressed={mode === 'history'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'history' ? 'background: var(--aurea-surface-light) text-gray-900 box-shadow: 0 1px 2px rgba(0,0,0,0.25)' : 'color: var(--aurea-text-muted) hover:color: var(--aurea-text)'}`}
            >
              <History size={13} aria-hidden="true" />
              Histórico
            </button>
            <button
              type="button"
              onClick={() => setMode('notes')}
              aria-pressed={mode === 'notes'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'notes' ? 'background: var(--aurea-surface-light) text-gray-900 box-shadow: 0 1px 2px rgba(0,0,0,0.25)' : 'color: var(--aurea-text-muted) hover:color: var(--aurea-text)'}`}
            >
              <PenLine size={13} aria-hidden="true" />
              Notas pessoais
            </button>
          </div>
          <button
            type="button"
            onClick={createPersonalNote}
            className="flex items-center gap-1.5 rounded-lg background: var(--aurea-bg-deep) px-3 py-2 text-[11px] font-semibold color: var(--aurea-text) transition hover: background: var(--aurea-surface)"
          >
            <Plus size={13} aria-hidden="true" />
            Nova nota
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {mode === 'history' ? (
          <StudyArchive onOpenStudy={onOpenStudy} />
        ) : (
          <div className="flex h-full min-h-0 overflow-hidden">
            <DiarioSidebar />
            <div className="min-w-0 flex-1 background: var(--aurea-surface) p-4 lg:p-6">
              {activeEntry ? (
                <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
                  <DiarioEditor key={activeEntry.id} entry={activeEntry} />
                </div>
              ) : (
                <EmptyState onCreate={createPersonalNote} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => Promise<void> }) => (
  <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-color: rgba(38,54,66,0.6) background: var(--aurea-surface-light) box-shadow: 0 1px 2px rgba(0,0,0,0.25)">
      <PenLine size={22} className="text-gray-300" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold color: var(--aurea-text)">Selecione uma nota pessoal</p>
    <p className="mb-4 mt-1 max-w-sm text-xs leading-5 color: var(--aurea-text-muted)">
      As notas pessoais ficam no Diário; os estudos ligados a cards permanecem no Caderno Vivo e aparecem no histórico.
    </p>
    <button
      type="button"
      onClick={() => void onCreate()}
      className="rounded-lg border border-color: rgba(38,54,66,0.7) background: var(--aurea-surface-light) px-4 py-2 text-[11px] font-bold uppercase tracking-wider color: var(--aurea-text) box-shadow: 0 1px 2px rgba(0,0,0,0.25) transition hover:background: rgba(3,10,17,0.35)"
    >
      Escrever nota pessoal
    </button>
  </div>
);

export const DiarioView: React.FC<DiarioViewProps> = props => (
  <DiarioProvider>
    <DiarioViewInner {...props} />
  </DiarioProvider>
);
