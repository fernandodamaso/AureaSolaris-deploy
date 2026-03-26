# Astrology Transits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar camada opcional de trânsitos planetários atuais na mandala astrológica, mostrando planetas, Chiron e Nodo Norte em anillo exterior, com aspectos maiores + quincúncio.

**Architecture:** Extensão do sistema existente de astrologia, reutilizando `astro_engine.py` para cálculos, com novo hook frontend e integração visual no componente MandalaChart.

**Tech Stack:** React + TypeScript, Tauri (Rust), Python (astro_engine), D3.js (mandala).

---

## Mapeamento de Arquivos

### Criar
- `src/hooks/useTransitData.ts` — Hook para buscar posições atuais dos planetas.
- `src/utils/transitAspects.ts` — Função para calcular aspectos entre trânsitos e natais.

### Modificar
- `astro_engine.py` — Adicionar função `calculate_transit_positions()`.
- `src-tauri/src/lib.rs` — Adicionar comando Tauri `get_transit_positions`.
- `src/components/MandalaChart.tsx` — Adicionar estados, renderização de trânsitos e aspectos.
- `src/components/MandalaPage.tsx` — Integrar hook `useTransitData` e passar props.
- `docs/estrutura-do-projeto.md` — Documentar novos arquivos e alterações.
- `docs/arquitetura.md` — Atualizar seção de comandos Tauri e fluxo de trânsitos.

---

### Task 1: Função Python de Trânsitos

**Files:**
- Modify: `astro_engine.py`

- [ ] **Step 1: Adicionar função `calculate_transit_positions`**

Abra `astro_engine.py` e adicione a função após `calculate_astrology` (aprox. linha 575):

```python
def calculate_transit_positions(
    year: int,
    month: int,
    day: int,
    hour: float,
    lat: float = -15.7833,
    lon: float = -47.9333,
    include_asteroids: bool = False,
) -> Dict[str, Any]:
    """Calcula posições planetárias atuais (trânsitos) para data/hora fornecida.
    
    Retorna apenas planetas e corpos secundários (sem casas, aspectos, ângulos).
    """
    # Chama a função principal mas filtra a saída
    full_result = calculate_astrology(year, month, day, hour, lat, lon)
    if "error" in full_result:
        return full_result
    
    transit_data = {
        "planets": full_result.get("planets", {}),
        "secondary": full_result.get("secondary", {}),
        "moon_phase": full_result.get("moon_phase", {}),
        "meta": full_result.get("meta", {}),
    }
    
    # Filtrar corpos secundários: manter apenas NorthNode (se não quiser asteroides)
    if not include_asteroids:
        allowed = {"NorthNode"}
        transit_data["secondary"] = {
            k: v for k, v in transit_data["secondary"].items() if k in allowed
        }
    
    return transit_data
```

- [ ] **Step 2: Atualizar bloco `if __name__ == "__main__"` para suportar chamada de trânsitos**

Adicione lógica para detectar se o JSON de entrada tem `transit: true`:

```python
if __name__ == "__main__":
    # ... existing code ...
    
    if data:
        # Existing: calculo normal
        if data.get("transit"):
            # Cálculo de trânsitos
            result = calculate_transit_positions(
                y, m, d, time_val, lat, lon,
                include_asteroids=data.get("include_asteroids", False)
            )
        else:
            result = calculate_astrology(y, m, d, time_val, lat, lon, house_system)
    # ... resto igual ...
```

- [ ] **Step 3: Testar a função**

Execute no terminal:
```bash
python astro_engine.py '{"year": 2026, "month": 3, "day": 26, "hour": 15.5, "transit": true}'
```
Esperado: JSON com `planets` (Sun, Moon, etc.) e `secondary` (NorthNode), sem `houses` ou `aspects`.

- [ ] **Step 4: Commit**

```bash
git add astro_engine.py
git commit -t -m "feat: add transit position calculation function"
```

---

### Task 2: Comando Tauri para Trânsitos

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Adicionar comando `get_transit_positions`**

Abra `src-tauri/src/lib.rs` e adicione novo comando após os existentes (procure por `#[tauri::command]`):

```rust
#[tauri::command]
fn get_transit_positions(payload: String) -> Result<String, String> {
    // Parse do JSON
    let data: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| format!("JSON inválido: {}", e))?;
    
    // Extrair parâmetros
    let now = chrono::Local::now();
    let year = data["year"].as_i64().unwrap_or(now.year() as i64) as i32;
    let month = data["month"].as_i64().unwrap_or(now.month() as i64) as u32;
    let day = data["day"].as_i64().unwrap_or(now.day() as u64) as u32;
    let hour = data["hour"].as_f64().unwrap_or(now.hour() as f64 + now.minute() as f64 / 60.0);
    let lat = data["lat"].as_f64().unwrap_or(-15.7833);
    let lon = data["lon"].as_f64().unwrap_or(-47.9333);
    let include_asteroids = data["include_asteroids"].as_bool().unwrap_or(false);
    
    // Construir payload para Python
    let python_payload = serde_json::json!({
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "lat": lat,
        "lon": lon,
        "include_asteroids": include_asteroids,
        "transit": true
    });
    
    // Chamar motor Python (usando invoke_python existente)
    let result = invoke_python(&python_payload.to_string())?;
    
    Ok(result)
}
```

- [ ] **Step 2: Registrar comando no `invoke_handler`**

No array de comandos em `tauri::generate_handler![...]`, adicione `get_transit_positions`.

- [ ] **Step 3: Testar via frontend (log)**

Após compilar, teste com:
```javascript
import { safeInvoke } from '../utils/tauri';
const result = await safeInvoke('get_transit_positions', { payload: JSON.stringify({}) });
console.log(result);
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add Tauri command for transit positions"
```

---

### Task 3: Hook Frontend `useTransitData`

**Files:**
- Create: `src/hooks/useTransitData.ts`

- [ ] **Step 1: Criar arquivo com estrutura similar a `useAstroData`**

Copie `src/hooks/useAstroData.ts` como referência. Adapte para:

```typescript
import { useState, useEffect, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';
import { calculateFallback } from '../utils/astro-calc';

export const useTransitData = (birthData?: any, includeAsteroids = false) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const CACHE_DURATION = 60 * 1000; // 60 segundos

  const calculate = async () => {
    const now = Date.now();
    if (now - lastUpdate < CACHE_DURATION && data) {
      return; // Usar cache
    }

    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours() + (now.getMinutes() / 60),
        lat: birthData?.lat || -15.7833,
        lon: birthData?.lon || -47.9333,
        include_asteroids: includeAsteroids,
        transit: true,
      };

      const payloadStr = JSON.stringify(payload);
      const result = await safeInvoke<string | null>('get_transit_positions', { payload: payloadStr });

      if (result === null) {
        // Fallback JavaScript
        const fallback = await calculateFallback(
          payload.year, payload.month, payload.day,
          Math.floor(payload.hour), Math.floor((payload.hour % 1) * 60),
          payload.lat, payload.lon, 'Regiomontanus'
        );
        // Extrair apenas planetas
        setData({
          planets: fallback.planets,
          secondary: fallback.secondary,
          moon_phase: fallback.moon_phase,
        });
      } else {
        const parsed = JSON.parse(result);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          setData(parsed);
          setLastUpdate(now.getTime());
        }
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [birthData, includeAsteroids]);

  return { data, loading, error, recalculate: calculate };
};
```

- [ ] **Step 2: Testar o hook**

Crie um teste rápido em `MandalaPage.tsx`:
```typescript
import { useTransitData } from '../hooks/useTransitData';
const { data: transitData, loading: transitLoading } = useTransitData(birthData);
console.log('Transit data:', transitData);
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTransitData.ts
git commit -m "feat: add useTransitData hook for fetching current planetary positions"
```

---

### Task 4: Função de Cálculo de Aspectos de Trânsitos

**Files:**
- Create: `src/utils/transitAspects.ts`

- [ ] **Step 1: Criar função para calcular aspectos entre trânsitos e natais**

```typescript
import { Planet, Aspect } from '../components/MandalaChart';

const ASPECT_CONFIG = [
  { type: 'Conjunção', angle: 0, orb: 8.0 },
  { type: 'Oposição', angle: 180, orb: 8.0 },
  { type: 'Trígono', angle: 120, orb: 8.0 },
  { type: 'Quadratura', angle: 90, orb: 6.0 },
  { type: 'Sextil', angle: 60, orb: 4.0 },
  { type: 'Quincúncio', angle: 150, orb: 3.0 },
];

export const calculateTransitAspects = (
  transitPlanets: Planet[],
  natalPlanets: Planet[]
): Aspect[] => {
  const aspects: Aspect[] = [];

  for (const t of transitPlanets) {
    for (const n of natalPlanets) {
      if (t.name === 'ASC' || t.name === 'MC' || n.name === 'ASC' || n.name === 'MC') continue;
      
      const diff = Math.abs(t.degree - n.degree) % 360;
      const dist = diff > 180 ? 360 - diff : diff;

      for (const asp of ASPECT_CONFIG) {
        const distFromAngle = Math.abs(dist - asp.angle);
        if (distFromAngle < asp.orb) {
          aspects.push({
            p1: t.name,
            p2: n.name,
            type: asp.type,
            symbol: getAspectSymbol(asp.type),
            orb: distFromAngle,
          });
          break; // Uma vez que encontra o aspecto, para
        }
      }
    }
  }

  return aspects;
};

function getAspectSymbol(type: string): string {
  const symbols: Record<string, string> = {
    'Conjunção': '☌',
    'Oposição': '☍',
    'Trígono': '△',
    'Quadratura': '□',
    'Sextil': '＊',
    'Quincúncio': '⚹',
  };
  return symbols[type] || '?';
}
```

- [ ] **Step 2: Exportar função e integrar (será usada na Task 5)**

- [ ] **Step 3: Commit**

```bash
git add src/utils/transitAspects.ts
git commit -m "feat: add transit-natal aspects calculation"
```

---

### Task 5: Atualizar MandalaChart para Renderizar Trânsitos

**Files:**
- Modify: `src/components/MandalaChart.tsx`

- [ ] **Step 1: Adicionar novos estados e props**

No início do componente, adicione:

```typescript
// Novos estados
const [showTransits, setShowTransits] = useState(false);
const [showTransitAspects, setShowTransitAspects] = useState(false);

// Novas props
interface MandalaChartProps {
  // ... existentes ...
  transitPlanets?: Planet[];
  transitAspects?: Aspect[];
}
```

- [ ] **Step 2: Atualizar menu de configurações**

No menu existente (onde tem `showDecanates`, `showTerms`), adicione:

```typescript
{[
  // ... existentes ...
  { label: 'Trânsitos Atuais', state: showTransits, setter: setShowTransits },
  { label: 'Aspectos de Trânsitos', state: showTransitAspects, setter: setShowTransitAspects },
].map(item => ( ... ))}
```

- [ ] **Step 3: Adicionar cálculo de `transitR`**

No início do componente, adicione:

```typescript
const transitR = R * 0.95; // Anillo exterior para trânsitos
```

- [ ] **Step 4: Renderizar planetas de trânsitos (após renderizar planetas natais)**

Adicione após o bloco de planetas natais:

```typescript
if (showTransits && transitPlanets && transitPlanets.length > 0) {
  // Anti-overlap para trânsitos
  const sortedTransits = [...transitPlanets].sort((a, b) => normDeg(a.degree) - normDeg(b.degree));
  const placedTransits: { x: number; y: number; r: number }[] = [];
  const MIN_DIST_TRANSIT = 22;

  sortedTransits.forEach((p) => {
    const d = p.degree;
    const color = '#87CEEB'; // Azul claro para trânsitos
    const symbol = p.symbol || PLANET_SYMBOLS[p.name] || '●';
    const isAngle = p.isAngle || ['ASC','MC','DSC','IC'].includes(p.name);
    
    let px = polarX(transitR, d);
    let py = polarY(transitR, d);
    
    // Nudge anti-overlap
    for (let attempt = 0; attempt < 8; attempt++) {
      const tooClose = placedTransits.some(pl => Math.hypot(pl.x - px, pl.y - py) < MIN_DIST_TRANSIT);
      if (!tooClose) break;
      const nudge = (attempt + 1) * 4;
      px = polarX(transitR + nudge, d);
      py = polarY(transitR + nudge, d);
    }
    placedTransits.push({ x: px, y: py, r: 12 });
    
    // Linha do centro ao planeta
    g.append('line')
      .attr('x1', polarX(aspectR + 5, d)).attr('y1', polarY(aspectR + 5, d))
      .attr('x2', px).attr('y2', py)
      .attr('stroke', color).attr('stroke-width', 0.3).attr('opacity', 0.15);
    
    // Grupo do planeta de trânsito
    const pg = g.append('g')
      .attr('class', 'transit-node')
      .style('cursor', 'pointer');
    
    // Círculo com borda pontilhada
    pg.append('circle')
      .attr('cx', px).attr('cy', py).attr('r', 10)
      .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2'); // Pontilhado para diferenciação
    
    // Símbolo
    pg.append('text')
      .attr('x', px).attr('y', py + 1)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', isAngle ? 8 : 10).attr('fill', color)
      .attr('font-weight', 'bold')
      .text(symbol);
    
    // Tooltip similar ao dos natais, mas com badge "Trânsito"
  });
}
```

- [ ] **Step 5: Renderizar aspectos de trânsitos (após aspectos natais)**

```typescript
if (showTransitAspects && transitAspects && transitAspects.length > 0) {
  transitAspects.forEach((asp) => {
    const p1 = filteredPlanets.find(p => p.name === asp.p1) || 
               (transitPlanets || []).find(p => p.name === asp.p1);
    const p2 = filteredPlanets.find(p => p.name === asp.p2) || 
               (transitPlanets || []).find(p => p.name === asp.p2);
    if (!p1 || !p2) return;
    
    const col = ASPECT_COLORS[asp.type] || '#ccc';
    g.append('line')
      .attr('x1', polarX(p1.isAngle ? planetR : transitR, p1.degree))
      .attr('y1', polarY(p1.isAngle ? planetR : transitR, p1.degree))
      .attr('x2', polarX(p2.isAngle ? planetR : transitR, p2.degree))
      .attr('y2', polarY(p2.isAngle ? planetR : transitR, p2.degree))
      .attr('stroke', col).attr('stroke-width', 0.8).attr('opacity', 0.3)
      .attr('stroke-dasharray', '4,4'); // Linha pontilhada para aspectos de trânsito
  });
}
```

- [ ] **Step 6: Testar visualmente**

Execute a mandala e ative as camadas de trânsitos e aspectos.

- [ ] **Step 7: Commit**

```bash
git add src/components/MandalaChart.tsx
git commit -m "feat: add transit visualization and aspect lines to mandala"
```

---

### Task 6: Integrar useTransitData na MandalaPage

**Files:**
- Modify: `src/components/MandalaPage.tsx`

- [ ] **Step 1: Importar hook e estados**

```typescript
import { useTransitData } from '../hooks/useTransitData';
import { calculateTransitAspects } from '../utils/transitAspects';
```

- [ ] **Step 2: Adicionar lógica para buscar trânsitos**

Dentro do componente:

```typescript
// Estados para controlar trânsitos (devem vir do MandalaChart via props drilling ou contexto)
const [showTransits, setShowTransits] = useState(false);
const [showTransitAspects, setShowTransitAspects] = useState(false);

// Hook de trânsitos (só busca quando showTransits é true)
const { data: transitData, loading: transitLoading } = useTransitData(
  selectedTarget === 'current' ? null : birthData,
  showAsteroids // Mesma configuração de asteroides do mapa natal
);

// Calcular aspectos de trânsitos
const transitAspects = useMemo(() => {
  if (!showTransitAspects || !transitData?.planets || !chartPlanets) return [];
  const transitPlanets = Object.entries(transitData.planets).map(([name, info]: [string, any]) => ({
    name,
    degree: info.degree || 0,
    sign: info.sign || '',
    retrograde: info.retrograde || false,
  }));
  return calculateTransitAspects(transitPlanets, chartPlanets);
}, [showTransitAspects, transitData, chartPlanets]);
```

- [ ] **Step 3: Passar props para MandalaChart**

```typescript
<MandalaChart
  size={580}
  planets={chartPlanets}
  houses={chartHouses}
  aspects={chartAspects}
  transitPlanets={transitData?.planets ? Object.entries(transitData.planets).map(...) : []}
  transitAspects={transitAspects}
  // ... outros props se necessário
/>
```

*Nota: Talvez seja necessário ajustar a interface de props do MandalaChart para aceitar `transitPlanets` e `transitAspects`.*

- [ ] **Step 4: Adicionar indicador de carregamento para trânsitos**

```typescript
{transitLoading && showTransits && (
  <div className="absolute top-4 right-4 text-[9px] text-blue-400 animate-pulse">
    Sincronizando trânsitos...
  </div>
)}
```

- [ ] **Step 5: Testar integração**

Ative a camada de trânsitos e verifique se os planetas aparecem.

- [ ] **Step 6: Commit**

```bash
git add src/components/MandalaPage.tsx
git commit -m "feat: integrate useTransitData hook and transit aspects into MandalaPage"
```

---

### Task 7: Atualizar Documentação

**Files:**
- Modify: `docs/estrutura-do-projeto.md`
- Modify: `docs/arquitetura.md`

- [ ] **Step 1: Atualizar estrutura do projeto**

Adicione em `docs/estrutura-do-projeto.md`:
- `src/hooks/useTransitData.ts` — Hook para dados de trânsitos atuais.
- `src/utils/transitAspects.ts` — Cálculo de aspectos trânsito-natal.

- [ ] **Step 2: Atualizar arquitetura**

Em `docs/arquitetura.md`:
- Seção "Motor de Astrologia": adicionar função `calculate_transit_positions`.
- Seção "Comandos Tauri": adicionar `get_transit_positions`.
- Seção "Sistema de Agentes de IA": notar que a camada de trânsitos é acionada pelo usuário, não por agente.

- [ ] **Step 3: Commit**

```bash
git add docs/estrutura-do-projeto.md docs/arquitetura.md
git commit -m "docs: update project structure and architecture with transit features"
```

---

### Task 8: Testes Finais e Validação

**Files:**
- Nenhum arquivo novo.

- [ ] **Step 1: Testar fluxo completo**

1. Iniciar app com `npm run dev`.
2. Abrir mandala em `AstrologiaBoard` > "Mandala Visual".
3. Ativar "Trânsitos Atuais" no menu de configurações.
4. Verificar se planetas azuis aparecem no anillo exterior.
5. Ativar "Aspectos de Trânsitos".
6. Verificar se linhas pontilhadas conectam trânsitos com natais.

- [ ] **Step 2: Verificar performance**

- Tempo de carregamento da mandala com trânsitos < 1 segundo.
- UI não travar ao ativar/desativar camadas.

- [ ] **Step 3: Testar fallback sem Python**

- Desativar motor Python (renomear `astro_engine.py` temporariamente).
- Verificar se o cálculo JavaScript fallback funciona.

- [ ] **Step 4: Testar cache**

- Ativar trânsitos, aguardar 1 minuto, clicar "recalcular".
- Verificar se novas posições são calculadas.

- [ ] **Step 5: Commit final (se necessário)**

```bash
git add .
git commit -m "test: validate transit feature end-to-end"
```

---

## Ordem de Execução

1. Task 1 (Python) → Task 2 (Tauri) → Task 3 (Hook) → Task 4 (Aspectos) → Task 5 (MandalaChart) → Task 6 (MandalaPage) → Task 7 (Docs) → Task 8 (Testes).

Cada tarefa é independente e pode ser executada por um subagente separado.

---

## Notas Importantes

- **Cores:** Natal = `#FFD700` (dourado), Trânsito = `#87CEEB` (azul claro).
- **Símbolos:** Trânsitos usam mesma forma que natais, mas com borda pontilhada.
- **Aspectos:** Apenas maiores + quincúncio (Conjunção, Oposição, Trígono, Quadratura, Sextil, Quincúncio).
- **Cache:** 60 segundos para evitar loops pesados.
- **Fallback:** JavaScript sempre disponível se Python falhar.
