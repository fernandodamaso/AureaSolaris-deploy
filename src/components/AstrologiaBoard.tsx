import { useState } from 'react';
import { ArrowRight, BookOpen, FolderOpen, Plus } from 'lucide-react';
import { MandalaPage } from './MandalaPage';
import type { CadernoIntent } from './MesaCriacao';

type AstrologiaPageProps = {
  onOpenCaderno: (intent: CadernoIntent) => void;
};

type CadernoVivoPortalProps = {
  onOpenCaderno: (intent: CadernoIntent) => void;
};

/**
 * Esta não é uma segunda ferramenta de estudo. Ela deixa explícito que estudar
 * acontece no Caderno Vivo e só encaminha a pessoa para a mesma mesa persistida.
 */
const CadernoVivoPortal = ({ onOpenCaderno }: CadernoVivoPortalProps) => {
  const [topic, setTopic] = useState('');
  const normalizedTopic = topic.trim();

  const createStudy = () => {
    if (!normalizedTopic) return;
    onOpenCaderno({ type: 'create-study', topic: normalizedTopic });
  };

  return (
    <section className="flex-1 min-h-0 overflow-y-auto py-6" aria-labelledby="caderno-vivo-title">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-gold/20 bg-white px-7 py-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold">
              <BookOpen size={23} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-gold">Caderno Vivo</p>
              <h3 id="caderno-vivo-title" className="text-xl font-bold text-gray-900">O estudo acontece no seu caderno.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Um estudo é um espaço que você constrói: notas, conexões, imagens, perguntas e respostas do Hermes.
                A mesa e as páginas serão duas leituras desse mesmo material.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gold/15 bg-mystic-bg/40 p-5">
            <label htmlFor="study-topic" className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">
              O que você quer estudar agora?
            </label>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Ex.: Mercúrio na 8ª casa, Lua e rotina, uma fonte ou uma pergunta sua.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id="study-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createStudy();
                }}
                placeholder="Dê um nome ao seu estudo"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <button
                type="button"
                onClick={createStudy}
                disabled={!normalizedTopic}
                title={normalizedTopic ? 'Criar estudo no Caderno Vivo' : 'Escreva primeiro o tema do estudo'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171c31] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#252b49] focus:outline-none focus:ring-2 focus:ring-gold/60 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus size={16} aria-hidden="true" />
                Criar estudo
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-gray-400">
              Seus cadernos já existentes continuam intactos e podem ser abertos a qualquer momento.
            </p>
            <button
              type="button"
              onClick={() => onOpenCaderno({ type: 'browse' })}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gold/40 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2"
            >
              <FolderOpen size={16} aria-hidden="true" />
              Abrir meus cadernos
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export const AstrologiaPage = ({ onOpenCaderno }: AstrologiaPageProps) => {
  const [activeTab, setActiveTab] = useState<'mandala' | 'caderno'>('mandala');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4 border-b border-gold/10 pb-4">
        <div className="flex gap-6" role="tablist" aria-label="Ferramentas de astrologia">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mandala'}
            aria-controls="painel-mandala"
            onClick={() => setActiveTab('mandala')}
            className={`border-b-2 pb-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 ${activeTab === 'mandala' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
          >
            Mandala visual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'caderno'}
            aria-controls="painel-caderno-vivo"
            onClick={() => setActiveTab('caderno')}
            className={`border-b-2 pb-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 ${activeTab === 'caderno' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
          >
            Caderno Vivo
          </button>
        </div>
      </div>

      {activeTab === 'mandala' ? (
        <div id="painel-mandala" role="tabpanel" className="flex-1 overflow-hidden">
          <MandalaPage />
        </div>
      ) : (
        <div id="painel-caderno-vivo" role="tabpanel" className="flex min-h-0 flex-1 animate-in slide-in-from-right-4 duration-300">
          <CadernoVivoPortal onOpenCaderno={onOpenCaderno} />
        </div>
      )}
    </div>
  );
};
