/**
 * Mock data para desenvolvimento no browser (sem Tauri).
 * Quando rodando em localhost:1420, os comandos Tauri não existem.
 * Estes mocks simulam as respostas para que a UI funcione.
 */

// Mock de dados astrológicos (posições reais aproximadas para 25 de março de 2026)
export const MOCK_ASTRO_DATA = {
  planets: {
    Sun: { degree: 4.5, pos_in_sign: 4.5, sign: "Áries", retrograde: false },
    Moon: { degree: 86.5, pos_in_sign: 26.5, sign: "Gêmeos", retrograde: false },
    Mercury: { degree: 340.0, pos_in_sign: 10.0, sign: "Peixes", retrograde: false },
    Venus: { degree: 23.2, pos_in_sign: 23.2, sign: "Áries", retrograde: false },
    Mars: { degree: 348.5, pos_in_sign: 18.5, sign: "Peixes", retrograde: false },
    Jupiter: { degree: 106.0, pos_in_sign: 16.0, sign: "Câncer", retrograde: false },
    Saturn: { degree: 5.2, pos_in_sign: 5.2, sign: "Áries", retrograde: false },
    Uranus: { degree: 59.0, pos_in_sign: 29.0, sign: "Touro", retrograde: false },
    Neptune: { degree: 2.5, pos_in_sign: 2.5, sign: "Áries", retrograde: false },
    Pluto: { degree: 305.5, pos_in_sign: 5.5, sign: "Aquário", retrograde: false }
  },
  aspects: [
    { p1: "Sun", p2: "Saturn", type: "Conjunção", symbol: "☌", orb: 0.7 },
    { p1: "Sun", p2: "Neptune", type: "Conjunção", symbol: "☌", orb: 2.0 },
    { p1: "Sun", p2: "Pluto", type: "Sextil", symbol: "⚹", orb: 1.0 },
    { p1: "Moon", p2: "Venus", type: "Sextil", symbol: "⚹", orb: 3.3 },
    { p1: "Moon", p2: "Mars", type: "Quadratura", symbol: "□", orb: 2.0 },
    { p1: "Mercury", p2: "Jupiter", type: "Trígono", symbol: "△", orb: 6.0 },
    { p1: "Venus", p2: "Mars", type: "Trígono", symbol: "△", orb: 4.7 },
    { p1: "Mars", p2: "Jupiter", type: "Trígono", symbol: "△", orb: 2.5 },
    { p1: "Saturn", p2: "Neptune", type: "Conjunção", symbol: "☌", orb: 2.7 },
    { p1: "Uranus", p2: "Neptune", type: "Sextil", symbol: "⚹", orb: 3.5 }
  ],
  houses: [
    { house: 1, degree: 285.0, sign: "Capricórnio" },
    { house: 2, degree: 315.0, sign: "Aquário" },
    { house: 3, degree: 345.0, sign: "Peixes" },
    { house: 4, degree: 15.0, sign: "Áries" },
    { house: 5, degree: 45.0, sign: "Touro" },
    { house: 6, degree: 75.0, sign: "Gêmeos" },
    { house: 7, degree: 105.0, sign: "Câncer" },
    { house: 8, degree: 135.0, sign: "Leão" },
    { house: 9, degree: 165.0, sign: "Virgem" },
    { house: 10, degree: 195.0, sign: "Libra" },
    { house: 11, degree: 225.0, sign: "Escorpião" },
    { house: 12, degree: 255.0, sign: "Sagitário" }
  ],
  regence: {
    day_regent: "Marte",
    hour_regent: "Mercúrio"
  },
  meta: {
    timestamp: new Date().toISOString(),
    location: { lat: -23.5505, lon: -46.6333 }
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
