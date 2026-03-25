# Dicas de UI — AGM (AntiGravity Module) — Aurea Solaris

Este guia foca em melhoria de UI para Windows e prioriza clareza, usabilidade e velocidade. Ele serve como checklist para implementação incremental.

## 1. Princípios de Design

- **Consistência Visual**: Use um sistema de design único para todos os módulos (Astrologia, Rafik, Agenda, Finanças, AGM). Reutilize componentes comuns: `Button`, `Input`, `Card`, `Panel`, `Avatar`, `Tooltip`.
- **Legibilidade e Hierarquia**: Tipografia com contrastes claros entre títulos, subtítulos e corpo de texto. Espaçamento consistente (grid 4/8) para alinhamento entre painéis.
- **Propósito e Foco**: Cada tela deve ter foco claro: mapa, controles, outputs de Rafik, ou lista de tarefas.
- **Branding Simples**: Evite paleta excessivamente colorida; privilegie 2-3 cores primárias e tons neutros para fundos.
- **Responsividade**: Layout adaptável a diferentes tamanhos de janelas; mantenha componentes legíveis em telas menores.

## 2. Paleta de Cores e Tipografia

### Paleta Sugerida
- **Primary**: Azul Profundo (`#2563EB`)
- **Secondary**: Teal (`#14B8A6`)
- **Accent**: Verde-Aguamarinha (`#10B981`)
- **Surface**: Branco (`#FFFFFF`)
- **Background**: Cinza Muito Claro (`#F7F7FB`)
- **Textos**: `#1F2937` (Principal), `#4B5563` (Muted)
- **Alertas**: Laranja (`#F59E0B`), Vermelho (`#EF4444`)

### Tokens (Tailwind/CSS)
```css
:root {
  --color-primary: #2563EB;
  --color-secondary: #14B8A6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-surface: #FFFFFF;
  --color-bg: #F7F7FB;
  --color-text: #1F2937;

  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  --font-heading: "Montserrat", "Poppins", sans-serif;

  /* Spacing e Radii */
  --spacing-base: 8px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

## 3. Componentes Padrão (UI System)

- **Button**: Primary, Secondary, Ghost. Estados: normal, hover, active, disabled.
- **Input e Select**: Acessíveis, com focus outline visível e labels associadas.
- **Card e Panel**: Títulos, corpo, rodapé; áreas com sombras suaves.
- **Avatar e Chip**: Representação de agentes (Dr. Strange, Rafik, etc.).
- **Layout e Grid**: Grid de 12 colunas para desktop; adaptável para telas menores.

## 4. Fluxo de Usuário (UX) e Navegação

- **Onboarding Mínimo**: Guia rápido de 2 passos para abrir Astrologia e Rafik.
- **Navegação**: Menu lateral fixo com ícones representativos.
- **Feedback**: Animações sutis para cliques (0.15–0.25s) e barras de progresso para carregamento.
- **Confirmação**: Confirmação de ações críticas (salvar, reset).

## 5. Map Viewer (Astrologia) - Melhorias Específicas

- **Visualização**: Canvas 2D com zoom/panning; overlays com casas 1-12. Ferramentas de zoom (+/-).
- **Dados**: Carregamento assíncrono e cache de mapas recentes.
- **Interação Rafik**: Rafik interpreta outputs e gera ações práticas.
- **Performance**: Reduzir redraws; use `requestAnimationFrame`; debounce para atualizações de opções.

## 6. Rafik (IA Poética) - Melhorias UI/UX

- **Chat**: Fonte legível; balões com cores diferentes por agente; indicador visual de "processando".
- **Contexto**: Exibir o prompt atual usado para gerar a saída.
- **Ações**: Sugestões clicáveis ("criar tarefa", "agendar evento").

## 7. Agenda e Finanças

- **Agenda**: Cartões com estado, prioridade e prazo; filtros e drag-and-drop.
- **Finanças**: Tabela com filtros; gráficos simples de totais; exportação CSV.

## 8. Acessibilidade (AC)

- Contraste adequado.
- Navegação por teclado completa (`tab-index`, foco visível).
- ARIA labels para botões, inputs e controles de mapa.
- Alvos de clique mínimos de 44x44 px.

## 9. Desempenho e Responsividade

- Lazy loading de módulos pesados.
- Memoização (React.memo, useCallback).
- Monitoramento de latência IPC e tempo de renderização.

## 10. Implementação (Próximos Passos)

1. **Design System**: Criar `docs/design-system.md` com tokens e componentes.
2. **Tema e Tokens**: Configurar Tailwind com os novos tokens.
3. **Padronização**: Implementar componentes base (`Button`, `Card`, `Panel`).
4. **Refatoração UI**: Aplicar o novo design nos módulos existentes.
