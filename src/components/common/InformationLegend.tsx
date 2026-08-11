interface InformationLegendProps {
  sourceSelected?: boolean;
  hasPersonalNote?: boolean;
}

/** Torna visíveis os limites entre cálculo, leitura editorial e experiência pessoal. */
export const InformationLegend = ({ sourceSelected = false, hasPersonalNote = false }: InformationLegendProps) => {
  const items = [
    { label: 'Calculado', description: 'vem do Motor Astrológico', tone: 'bg-emerald-100 text-emerald-800' },
    { label: 'Regra interpretativa', description: 'precisa de escola declarada', tone: 'bg-amber-100 text-amber-800' },
    { label: 'Fonte', description: sourceSelected ? 'selecionada para este estudo' : 'ainda não selecionada', tone: 'bg-sky-100 text-sky-800' },
    { label: 'Inferência Hermes', description: 'é hipótese, nunca cálculo', tone: 'bg-violet-100 text-violet-800' },
    { label: 'Anotação pessoal', description: hasPersonalNote ? 'salva no seu Diário' : 'nasce ao escrever no Caderno', tone: 'bg-stone-200 text-stone-700' },
  ];

  return (
    <section aria-labelledby="information-legend-title" className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <h3 id="information-legend-title" className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Como ler esta área</h3>
      <ul className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-baseline gap-2 text-[10px] leading-tight text-gray-500">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${item.tone}`}>{item.label}</span>
            <span>{item.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
