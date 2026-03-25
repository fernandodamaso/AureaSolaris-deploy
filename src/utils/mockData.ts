/**
 * Mock data para desenvolvimento no browser (sem Tauri).
 * Quando rodando em localhost:1420, os comandos Tauri não existem.
 * Estes mocks simulam as respostas para que a UI funcione.
 */

// Mock de dados astrológicos (posições reais aproximadas para março 2026)
export const MOCK_ASTRO_DATA = {
  planets: {
    Sun: { degree: 3.2, pos_in_sign: 3.2, sign: "Áries", retrograde: false },
    Moon: { degree: 187.5, pos_in_sign: 7.5, sign: "Libra", retrograde: false },
    Mercury: { degree: 350.1, pos_in_sign: 20.1, sign: "Peixes", retrograde: true },
    Venus: { degree: 25.8, pos_in_sign: 25.8, sign: "Áries", retrograde: false },
    Mars: { degree: 280.3, pos_in_sign: 10.3, sign: "Capricórnio", retrograde: false },
    Jupiter: { degree: 75.2, pos_in_sign: 15.2, sign: "Gêmeos", retrograde: false },
    Saturn: { degree: 340.8, pos_in_sign: 10.8, sign: "Peixes", retrograde: false },
    Uranus: { degree: 55.1, pos_in_sign: 25.1, sign: "Touro", retrograde: false },
    Neptune: { degree: 358.9, pos_in_sign: 28.9, sign: "Peixes", retrograde: false },
    Pluto: { degree: 305.4, pos_in_sign: 5.4, sign: "Aquário", retrograde: false }
  },
  aspects: [
    { p1: "Sun", p2: "Moon", type: "Trígono", symbol: "△", orb: 3.2 },
    { p1: "Mercury", p2: "Saturn", type: "Conjunção", symbol: "☌", orb: 1.5 },
    { p1: "Venus", p2: "Mars", type: "Sextil", symbol: "⚹", orb: 2.8 },
    { p1: "Jupiter", p2: "Uranus", type: "Quadratura", symbol: "□", orb: 4.1 },
    { p1: "Sun", p2: "Pluto", type: "Sextil", symbol: "⚹", orb: 1.9 }
  ],
  houses: [
    { house: 1, degree: 321.8, sign: "Aquário" },
    { house: 2, degree: 355.0, sign: "Peixes" },
    { house: 3, degree: 28.0, sign: "Áries" },
    { house: 4, degree: 69.6, sign: "Gêmeos" },
    { house: 5, degree: 105.0, sign: "Câncer" },
    { house: 6, degree: 138.0, sign: "Leão" },
    { house: 7, degree: 141.8, sign: "Virgem" },
    { house: 8, degree: 175.0, sign: "Libra" },
    { house: 9, degree: 208.0, sign: "Escorpião" },
    { house: 10, degree: 249.6, sign: "Sagitário" },
    { house: 11, degree: 285.0, sign: "Capricórnio" },
    { house: 12, degree: 318.0, sign: "Aquário" }
  ],
  regence: {
    day_regent: "Saturno",
    hour_regent: "Sol"
  },
  meta: {
    date: new Date().toISOString(),
    location: "São Paulo, BR",
    house_system: "Placidus"
  }
};

// Mock de respostas dos agentes
export const MOCK_AGENT_RESPONSES: Record<string, string[]> = {
  Rafiki: [
    "☉ Sol em Áries acende seu fogo criativo neste momento. Use essa energia para iniciar projetos que estão no coração. Marte em Capricórnio dá a estrutura que você precisa.",
    "☽ Lua em Libra busca equilíbrio emocional. Hoje, priorize relações harmoniosas. Evite decisões impulsivas — a quadratura de Júpiter com Urano pede cautela.",
    "Mercúrio retrógrado em Peixes até o final do mês: reveja contratos, reescreva comunicações importantes. Não assine nada definitivo agora.",
    "Trígono Sol-Lua indica um dia de fluxo natural entre razão e emoção. Aproveite para meditar e alinhar intenções com ações."
  ],
  Alfred: [
    "Senhora, organizei suas prioridades: 3 tarefas pendentes para hoje. A regência de Saturno favorece trabalho disciplinado. Sugiro começar pela mais complexa.",
    "Verifico que suas tarefas estão 62% completas esta semana. Excelente progresso. Recomendo focar nos itens de maior impacto agora.",
    "Horário planetário de Sol: momento ideal para decisões estratégicas. A agenda está limpa para os próximos 2 horas — janela perfeita para foco profundo."
  ],
  "Uncle Duck": [
    "Saldo atual positivo. Suas metas de reserva estão no caminho certo. Recomendo manter a disciplina de aportes mensais.",
    "Vênus em Áries pode indicar gastos impulsivos. Minha sugestão: antes de comprar, espere 24h. O ouro agradece.",
    "Análise do mês: entradas superaram saídas em 15%. Continue assim. Lembre que Júpiter em Gêmeos favorece diversificação de renda."
  ],
  Stark: [
    "Sistema operacional estável. IPC latency nominal, engine Python respondendo em 42ms. Todos os 5 agentes online.",
    "Detectei que o cache do motor astrológico atingiu 80% da capacidade. Vou limpar entradas antigas. Sem impacto na performance.",
    "Log de segurança: última autenticação bem-sucedida há 2h. Nenhuma anomalia detectada. O protocolo Stark está ativo."
  ],
  "Dr. Strange": [
    "Visão macro: Sol em Áries na 10ª casa indica protagonismo público. Lua em Libra na 4ª pede equilíbrio entre carreira e lar. A hora planetária de Mercúrio favorece comunicação estratégica.",
    "Padrão detectado: com 3 tarefas pendentes e Mercúrio retrógrado, sugiro adiar decisões de comunicação. Foque em tarefas de execução — Marte em Capricórnio reforça isso.",
    "Conexão cósmica: o trígono Sol-Lua hoje harmoniza suas finanças com seu propósito. Uncle Duck aprova — é um bom dia para revisar investimentos."
  ]
};

export function getMockResponse(agent: string): string {
  const responses = MOCK_AGENT_RESPONSES[agent] || MOCK_AGENT_RESPONSES["Rafiki"];
  return responses[Math.floor(Math.random() * responses.length)];
}
