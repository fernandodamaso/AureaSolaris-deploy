# Design: Trânsitos Astrológicos na Mandala

**Data:** 2026-03-26  
**Escopo:** Adicionar camada opcional de trânsitos planetários atuais na mandala astrológica.  

## 🎯 Objetivo

Permitir que o usuário visualize as posições atuais dos planetas (trânsitos) sobrepostas ao mapa natal na mandala astrológica, oferecendo uma perspectiva dinâmica das influências celestes em tempo real.

## 📋 Requisitos

### Funcionais
1. **Camada de Trânsitos:** Toggle para mostrar/ocultar posições planetárias atuais.
2. **Anillo Exterior:** Planetas de trânsitos devem aparecer em um anillo mais externo que os planetas natais.
3. **Diferenciação Visual:** Cores distintas (sugerido: azul claro) para trânsitos vs natais (dourado).
4. **Aspectos de Trânsitos:** Toggle opcional para mostrar aspectos entre trânsitos e planetas natais (linhas pontilhadas).
5. **Atualização:** Trânsitos devem ser calculados com data/hora atual; podem ser atualizados ao recarregar ou em intervalo configurável (ex: a cada minuto).
6. **Planetas Inclusos:** 10 planetas, Chiron e Nodo Norte (excluir Lilith, Part of Fortune, Vertex). Corpos secundários extras só se a camada "Corpos Secundários" estiver ativa.
   - **Aspectos:** Apenas aspectos maiores (Conjunção, Oposição, Trígono, Quadratura, Sextil) + Quincúncio.

### Não-Funcionais
- **Performance:** Cache de trânsitos por 60 segundos para evitar cálculos repetidos.
- **Compatibilidade:** Funcionar nos modos offline (fallback JavaScript) e com motor Python.
- **UI Limpa:** Não poluir a mandala; trânsitos só aparecem quando a camada está ativa.

## 🏗️ Arquitetura Técnica

### 1. Camada de Dados (Backend/Python)
- **Função:** `calculate_transit_positions(year, month, day, hour, lat, lon)` em `astro_engine.py`.
  - Reutiliza `calculate_astrology()` mas retorna apenas `planets` e `secondary` (sem casas, aspectos natais, ângulos).
  - Mantém mesma precisão (Swiss Ephemeris) e sistema de casas (para consistência, mas não usado).
- **Localização:** Por padrão, usar a latitude/longitude do mapa natal (.birthData.lat, birthData.lon). Futuramente, permitir opção de usar localização atual (GPS) – fora do escopo atual.
- **Comando Tauri:** Adicionar comando `get_transit_positions` que invoca a função acima com data/hora atual.

### 2. Hook Frontend (`useTransitData.ts`)
- Similar a `useAstroData`, mas:
  - Envia payload com data/hora atual (obtida de `new Date()`).
  - Retorna apenas `planets` e `secondary` (se `showAsteroids` ativo).
  - Cache de 60 segundos (usando `useMemo` com timestamp).
- Se `safeInvoke` retornar null (fallback browser), usar `calculateFallback()` do `astro-calc.ts`.

### 3. Componente MandalaChart (`MandalaChart.tsx`)
- **Novos Estados:**
  - `showTransits: boolean` (toggle camada de trânsitos).
  - `showTransitAspects: boolean` (toggle aspectos de trânsitos).
- **Props Adicionais:**
  - `transitPlanets: Planet[]` (posições atuais).
  - `transitAspects: Aspect[]` (aspectos entre trânsitos e natales).
- **Renderização:**
  - **Anillo de Trânsitos:** Novo raio `transitR = R * 0.95` (entre signos e decanatos, se ativos).
  - **Planetas de Trânsitos:** Círculos com cor `#87CEEB` (azul claro), símbolo igual a natal, porém com borda pontilhada (stroke-dasharray) para diferenciação.
  - **Aspectos de Trânsitos:** Se `showTransitAspects` ativo, desenhar linhas pontilhadas entre trânsitos e natales que formem **apenas aspectos maiores + Quincúncio** (Conjunção, Oposição, Trígono, Quadratura, Sextil, Quincúncio). Usar cores de aspectos existentes, mas com opacidade 0.3.
- **Menu de Configurações:** Adicionar checkboxes:
  - "Trânsitos Atuais"
  - "Aspectos de Trânsitos"

### 4. Integração na MandalaPage (`MandalaPage.tsx`)
- Carregar `transitPlanets` via `useTransitData` (só quando `showTransits` for true).
- Passar `transitPlanets` e `transitAspects` para `MandalaChart`.
- `transitAspects` pode ser calculado no frontend (similar a `calculateAspects` em `astro-calc.ts`) ou no backend (mais preciso).

## 🎨 UI/UX

### Controles na Mandala
```
[Menu Configurações ▼]
☑ Corpos Secundários
☑ Decanatos  
☑ Termos (Egípcios)
━━━━━━━━━━━━━━━━━━━━
☑ Trânsitos Atuais
  └─ ☐ Aspectos de Trânsitos
```

### Visualização
- **Natal:** Planetas em anillo interno (`planetR = R * 0.52`), cor dourada.
- **Trânsitos:** Planetas em anillo externo (`transitR = R * 0.95`), cor azul claro.
- **Aspectos de Trânsitos:** Linhas pontilhadas com opacidade baixa (0.3).

### Tooltip
- Ao passar mouse sobre planeta de trânsito, mostrar:
  - Nome, signo, grau.
  - Indicador "Trânsito" em badge.
  - Velocidade (direto/retrogrado) se disponível.

## 🔄 Fluxo de Dados

```
1. Usuário ativa "Trânsitos" no menu da mandala.
2. MandalaChart → useEffect → chama hook useTransitData.
3. useTransitData → safeInvoke('get_transit_positions', { data/hora atual }) → backend.
4. Backend → astro_engine.calculate_transit_positions() → retorna planetas atuais.
5. Frontend recebe transitPlanets → renderiza anillo externo.
6. Se "Aspectos de Trânsitos" ativo → calcular aspectos entre transitPlanets e chartPlanets → renderizar linhas.
```

## 🧪 Testes e Validação

### Cenários
1. **Ativar Trânsitos:** Verificar se planetas aparecem no anillo externo com cor azul.
2. **Comparação:** Trânsitos devem coincidir com efemérides atuais (ex: site de astrologia).
3. **Toggle:** Ativar/desativar deve mostrar/ocultar instantaneamente.
4. **Aspectos:** Quando ativo, linhas devem conectar trânsitos com natales corretamente.
5. **Fallback:** Sem Python, fallback JavaScript deve funcionar.

### Métricas
- Tempo de cálculo de trânsitos < 500ms.
- Atualização de UI < 16ms (60fps).

## 🚀 Roadmap (Futuro)
- **Trânsitos por Data:** Input de data/hora para trânsitos históricos/futuros.
- **Aspectos de Trânsito a Trânsito:** Linhas entre próprios planetas de trânsitos.
- **Revolução Solar:** Cálculo de mapa anual (trânsitos no dia do retorno solar).

## ⚠️ Riscos e Mitigações
- **Risco:** Performance com muitas linhas de aspecto.  
  **Mitigação:** Limitar aspectos a conjunções, oposições, trinos, quadraturas, sextis e quincúncio (aspectos maiores + quincúncio).
- **Risco:** Confusão visual com muitos elementos.  
  **Mitigação:** Cores contrastantes e opacidade ajustável.
- **Risco:** Dados de trânsitos desatualizados.  
  **Mitigação:** Cache de 60 segundos e opção de "recalcular" manual.
- **Risco:** Falha no cálculo de trânsitos (ex: timeout, erro de Python).  
  **Mitigação:** Tratar erros no hook `useTransitData` – exibir mensagem discreta e desativar toggle automaticamente. Fallback para cálculo JavaScript se backend indisponível.
- **Risco:** Loop contínuo de atualização (ex: `setInterval` sem limite) que sobrecarrega o sistema.  
  **Mitigação:** Nunca usar loops infinitos; atualizar apenas no carregamento da mandala ou ao clicar em "recalcular". Cache de 60 segundos evita recálculos desnecessários.
- **Risco:** Resposta não responsiva (travamento da UI durante cálculos demorados).  
  **Mitigação:** Mostrar indicador de carregamento ("Sincronizando trânsitos...") e, se o cálculo demorar >3 segundos, mudar a lógica para usar fallback JavaScript imediatamente.

---

**Próximo Passo:** Revisão da spec por subagente, ajustes, e então criação do plano de implementação via `writing-plans`.