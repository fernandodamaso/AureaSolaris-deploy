# Plano de Melhorias Astrológicas — Fase 6

Baseado na Especializada Auditoria Astrológica (26 Mar 2026), este plano de ação visa refinar o Motor Astrológico e a Mandala Visual de acordo com o padrão de softwares profissionais de astrologia.

você é um orquestrador ---> delegue todas as tarefas delegáveis pra subagentes
SEMPRE REVISE, atualize a documentação, comite e crie um subagente auditor.
SEMPRE reveja a documentação do projeto.
Se tiver dúvidas, pergunte.

## 🔴 Fase 1 — Correções Críticas e Precisão
- [x] 1. **Regente do ASC:** Normalizar o nome do `"Asc"` vindo do motor Python para `"ASC"` em `MandalaChart.tsx` para exibição correta do regente.
- [x] 2. **Exaltações de Planetas Modernos:** Separar Urano, Netuno e Plutão das exaltações clássicas em `astro-dignity.ts` (evitar que sejam computados na pontuação tradicional).
- [x] 3. **Símbolos Incorretos (`astro_engine.py`):**
   - [x] Corrigir símbolo do Quincúncio (`⚻`).
   - [x] Corrigir símbolo da Parte da Fortuna (`⊗`).
- [x] 4. **Cálculo do Hyleg:** Passar o número da casa real de cada planeta para `planetsMap` no frontend, para que os cálculos de "Carta Diurna/Noturna" e casas aféticas do Hyleg funcionem corretamente.

## 🟡 Fase 2 — Legibilidade e Formatação na Mandala
- [x] 1. **Assinatura Astrológica:** Alterar o algoritmo em `astro-dignity.ts` para que a Assinatura Astrológica retorne um **Signo Dominante** (ex: Áries) correspondente à combinação de Elemento + Qualidade mais forte.
- [x] 2. **Coluna Casa na Tabela:** Adicionar a coluna "Casa" na tabela de planetas natais, indicando em qual casa cada planeta se encontra.
- [x] 3. **Nomes dos Planetas:** Traduzir os nomes dos planetas na tabela (Sun → Sol, etc.) usando o mapeamento existente.
- [x] 4. **Remover "Sep" da Tabela de Planetas:** A direção "Sep" (Separativo/Aplicativo) deve aparecer apenas em aspectos, não na lista de planetas estáticos.
- [x] 5. **Graus dos Pontos Médios:** Remover a exibição do grau absoluto (ex: 345°) do mostrador de Pontos Médios, deixando apenas a notação zodiacal.

## 🟢 Fase 3 — Novas Funcionalidades (Toggles)
Conforme atualizado na Arquitetura do Projeto, implementar botões de Toggle no `MandalaChart.tsx` para as seguintes visões estendidas:
- [x] 1. **Asteroides:** Alternar visor para exibir/esconder Ceres, Pallas, Juno, Vesta, Quíron, Lilith e Parte da Fortuna.
- [x] 2. **Decanatos:** Exibir em qual decanato (e seu respectivo regente) o planeta caiu.
- [x] 3. **Termos Egípcios:** Exibir a dignidade por Termos para detalhamento adicional.

---
**Status:** ✅ Concluído.

