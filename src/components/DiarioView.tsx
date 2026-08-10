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
      <div className="flex h-full items-center justify-center bg-[#F8F8F7]">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <span className="text-xs font-medium uppercase tracking-wider">Carregando registros locais…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F8F7] font-sans text-gray-800">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-[0.22em] text-gray-700">Histórico & registros</h1>
          <p className="mt-1 text-[11px] text-gray-400">Notas pessoais e estudos dos Cadernos Vivos</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1" aria-label="Modo do histórico">
            <button
              type="button"
              onClick={() => setMode('history')}
              aria-pressed={mode === 'history'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <History size={13} aria-hidden="true" />
              Histórico
            </button>
            <button
              type="button"
              onClick={() => setMode('notes')}
              aria-pressed={mode === 'notes'}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${mode === 'notes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <PenLine size={13} aria-hidden="true" />
              Notas pessoais
            </button>
          </div>
          <button
            type="button"
            onClick={createPersonalNote}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-gray-700"
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
            <div className="min-w-0 flex-1 bg-[#F8F8F7] p-4 lg:p-6">
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
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
      <PenLine size={22} className="text-gray-300" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-gray-700">Selecione uma nota pessoal</p>
    <p className="mb-4 mt-1 max-w-sm text-xs leading-5 text-gray-400">
      As notas pessoais ficam no Diário; os estudos ligados a cards permanecem no Caderno Vivo e aparecem no histórico.
    </p>
    <button
      type="button"
      onClick={() => void onCreate()}
      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-700 shadow-sm transition hover:bg-gray-50"
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
