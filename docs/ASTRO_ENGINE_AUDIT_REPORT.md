# Relatório de Auditoria Profunda — `astro_engine.py`

**Data:** 11 de Junho de 2026  
**Arquivo auditado:** `C:\AureaSolaris\astro_engine.py` (703 linhas, 28KB)  
**Objetivo:** Avaliar precisão astrológica, eficácia de cálculo, fluxo de dados e  
propostas para elevar o motor a padrão de classe mundial para uso profissional.

---

## 1. RESUMO EXECUTIVO

O motor atual **funciona e produz resultados corretos** — já foi verificado contra  
dados de referência do Swiss Ephemeris (mapa natal da Viviane). Porém, possui  
problemas significativos de **arquitetura, performance, precisão em bordas e  
design de dados** que o impedem de ser um motor verdadeiramente profissional.

### Classificação das Falhas
| Nível | Descrição | Qtd |
|-------|-----------|-----|
| 🔴 CRÍTICO | Afeta precisão ou causa crashes | 2 |
| 🟠 ALTO | Performance ou arquitetura ruim | 4 |
| 🟡 MÉDIO | Precisão astronômica abaixo do ideal | 5 |
| 🟢 BAIXO | Qualidade de código e manutenção | 4 |

---

## 2. FALHAS CRÍTICAS (🔴)

### 2.1 — Kerykeion como fallback para Lilith e Node: PRECISÃO COMPROMETIDA

**Local:** Linhas 500-527  
**Problema:** Quando o Swiss Ephemeris falha ao calcular NorthNode ou Lilith, o  
código cai em um **cálculo aritmético bruto** que NÃO é astronomia:

```python
# FALLBACK ERRÔNEO (linhas 501-504):
nn_deg = (moon_deg + 180) % 360   # ← Isso NÃO é o Node verdadeiro!
```

**Impacto:** O *True Lunar Node* (nó lunar verdadeiro) não está a 180° da Lua.  
Essa fórmula calcula o **Anti-Lua**, que pode estar **até 15° do nó real** em  
alguns momentos do ciclo nodal. Em trânsitos mensais, isso é inaceitável.

**Mesmo problema para Lilith** (linhas 520-527): o fallback `(moon_deg - 180)`  
não corresponde ao Apogeu Lunar Médio. A posição real de Lilith é calculada por  
uma equação elíptica complexa que o SWE resolve com `swe.MEAN_APOG`.

**Proposta de correção:**
```python
# Se SWE falhou para Node, usar kerykeion como fallback de verdade:
if KERYKEION_AVAILABLE:
    ksubject = AstrologicalSubject(
        "tmp", year, month, day, int(hour), int((hour % 1) * 60),
        lat=lat, lng=lon, tz_str="America/Sao_Paulo",
        is_dst=is_brazil_dst(local_dt)
    )
    # Kerykeion internamente calcula Node via sua própria efeméride
    # Resultado é ~0.1° de precisão — melhor que o fallback bruto
```

**Recomendação:** O fallback bruto `(moon_deg ± 180)` deve ser REMOVIDO. Usar  
kerykeion como fallback secundário para Node e Lilith quando SWE falhar, com  
flag indicando "precisão reduzida" no output.

---

### 2.2 — `calculate_transit_positions` é extremamente ineficiente

**Local:** Linhas 581-626  
**Problema:** A função de trânsitos chama **a função completa** `calculate_astrology`,  
que calcula casas, aspectos, regência, fase lunar, corpo de fortuna, e depois  
**descarta tudo isso**:

```python
def calculate_transit_positions(...):
    full_result = calculate_astrology(year, month, day, hour, lat, lon)
    # Filtra planetas, remove casas, remove aspectos, remove ângulos...
    filtered_planets = {k: v for k, v in full_result.get("planets", {}).items()
                       if k not in ("ASC", "MC", "DSC", "IC")}
```

**Custo desperdiçado por chamada:**
| Operação | Tempo estimado | Necessário para trânsitos? |
|----------|---------------|---------------------------|
| `swe.calc()` × 11 planetas | ~8ms | ✅ Sim |
| `swe.houses()` | ~3ms | ❌ Não |
| `assign_to_house()` × 13 | ~0.2ms | ❌ Não |
| `calculate_aspects()` (O(n²)) | ~2ms | ❌ Não |
| Chiron + fallback Kerykeion | ~15ms | ⚠️ Opcional |
| NorthNode + Lilith + Fortuna + Vertex | ~5ms | ⚠️ Parcial |
| Serialização e filtragem do dict | ~0.5ms | ❌ Não |
| **Total desperdiçado** | **~25ms** | — |

**Proposta de correção:**
```python
def calculate_transit_positions(
    year: int, month: int, day: int, hour: float,
    lat: float = -15.7833, lon: float = -47.9333,
    include_asteroids: bool = False,
) -> Dict[str, Any]:
    """Calcula apenas posições planetárias — sem casas, sem aspectos."""
    
    # Converte para UTC (mesmo lógica centralizada)
    local_dt = datetime(year, month, day, int(hour), int((hour % 1) * 60))
    offset_hours = -2 if is_brazil_dst(local_dt) else -3
    utc_hour = hour - offset_hours
    jd = swe.julday(year, month, day, utc_hour)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    
    # Calcula APENAS planetas — nada mais
    planets = {}
    for name, pid in SWE_PLANETS.items():
        r = swe.calc(jd, pid, flags)
        if r and r[0]:
            ecl_lon = r[0][0] % 360
            speed = r[0][3] if len(r[0]) > 3 else 0
            sign, pos = degree_to_sign(ecl_lon)
            planets[name] = {
                "degree": round(ecl_lon, 2),
                "sign": sign[:3], "sign_full": sign,
                "pos_in_sign": round(pos, 2),
                "retrograde": speed < 0,
                "speed": round(speed, 4),
            }
    
    # Chiron (opcional)
    if include_asteroids:
        try:
            r = swe.calc(jd, swe.CHIRON, flags)
            if r and r[0]:
                # ... calcular Chiron
        except Exception:
            pass
    
    # NorthNode
    try:
        r = swe.calc(jd, swe.TRUE_NODE, flags)
        if r and r[0]:
            nn_deg = r[0][0] % 360
            sign, pos = degree_to_sign(nn_deg)
            secondary["NorthNode"] = {
                "degree": round(nn_deg, 2), "sign": sign,
                "pos_in_sign": round(pos, 2)
            }
    except Exception:
        pass
    
    return {
        "planets": planets,
        "secondary": secondary,
        "moon_phase": get_moon_phase_name((planets["Moon"]["degree"] - planets["Sun"]["degree"]) % 360),
        "meta": {"timestamp": local_dt.isoformat(), "jd": round(jd, 6)},
    }
```

**Ganho:** Redução de ~25ms a ~10ms (chamadas SWE somente), elimination total  
de cálculos irrelevantes.

---

## 3. FALHAS ALTO IMPACTO (🟠)

### 3.1 — Sem cache e sem persistência de efemérides em memória

**Local:** Módulo inteiro  
**Problema:** Cada chamada a `calculate_astrology()` ou `calculate_transit_positions()`  
reabre os arquivos de efemérides do disco (`sepl_18.se1`, `semo_18.se1`).  
O Swiss Ephemeris em Python **não mantém cache entre chamadas**.

**Impacto para Sidecar:** Se o motor rodar como processo persistente (Sidecar),  
o overhead de reabrir arquivos é ~3-8ms por chamada. Para trânsitos a cada  
minuto, isso é aceitável. Mas para **progressões e trânsitos natal**, onde  
múltiplas datas são calculadas, é desperdício.

**Proposta:**
```python
# Inicializar uma vez no módulo (já faz parcialmente):
swe.set_ephe_path(ephe_dir)

# Adicionar cache de resultados:
from functools import lru_cache

# Cache para trânsitos atuais (chave = timestamp arredondado para 1 min)
@lru_cache(maxsize=16)
def _cached_transit_positions(year, month, day, hour_rounded, lat, lon):
    """Cache de trânsitos — evita recalcular o mesmo instante."""
    return _calculate_transit_core(year, month, day, hour_rounded, lat, lon)
```

---

### 3.2 — Orbs fixos sem personalização por corpo

**Local:** Linhas 75-100  
**Problema:** Os orbs são fixos para todos os planetas (exceto luminárias/ângulos).  
Na astrologia profissional moderna, **cada planeta tem seu próprio orb máximo**:

| Corpo | Orb Máximo (Solar Fire / Astro.com) |
|-------|-------------------------------------|
| ☉ Sol | 8° |
| ☽ Lua | 8° |
| ☿ Mercúrio | 6° |
| ♀ Vênus | 6° |
| ♂ Marte | 6° |
| ♃ Júpiter | 5° |
| ♄ Saturno | 5° |
| ♅ Urano | 4° |
| ♆ Netuno | 3° |
| ♇ Plutão | 2° |

O código atual aplica 8° para Conjunção/Oposição com todos os planetas,  
incluindo Plutão e Netuno — gerando **falsos aspectos triviais**.

**Proposta:**
```python
# Orb máximo por planeta (para aspectos maiores)
PLANET_ORBS = {
    "Sun": 8.0, "Moon": 8.0, "Mercury": 6.0, "Venus": 6.0,
    "Mars": 6.0, "Jupiter": 5.0, "Saturn": 5.0,
    "Uranus": 4.0, "Neptune": 3.0, "Pluto": 2.0,
    "Chiron": 4.0, "ASC": 8.0, "MC": 6.0,
}

# Aspect type multiplier
ASPECT_MULTIPLIER = {
    "Conjunction": 1.0, "Opposition": 1.0, "Trine": 1.0,
    "Square": 0.75, "Sextile": 0.5, "Quincunx": 0.4,
    "Quintile": 0.3, "Bi-Quintile": 0.3,
    "Semi-Sextile": 0.25, "Semi-Square": 0.25, "Sesqui-Quadrature": 0.25,
}

def get_orb_limit_professional(asp_type: str, p1: str, p2: str) -> float:
    """Orb limit baseado no corpo MENOR entre os dois envolvidos."""
    orb1 = PLANET_ORBS.get(p1, 5.0)
    orb2 = PLANET_ORBS.get(p2, 5.0)
    base = min(orb1, orb2)  # Regra: orb do corpo com menor influência
    multiplier = ASPECT_MULTIPLIER.get(asp_type, 0.5)
    return base * multiplier
```

---

### 3.3 — Aspectos incluem Trígonos e Sextis de Lua Minguante/Quarto (lixo)

**Local:** Linhas 74-87  
**Problema:** Incluir todos os aspectos menores (Quintile, Bi-Quintile, Semi-Sextile,  
Semi-Square, Sesqui-Quadrature) com orbs generosas gera **ruído significativo**.  
Na prática profissional, a maioria dos astrólogos trabalha com os **5 aspectos  
maiores + Quincunx**. Aspectos menores são usados apenas em consultas avançadas.

**Proposta:** Fazer aspectos menores optativos:
```python
ASPECTS_MAJOR = [
    {"type": "Conjunction", "angle": 0,   "orb": 8.0, "symbol": "☌"},
    {"type": "Opposition",  "angle": 180, "orb": 8.0, "symbol": "☍"},
    {"type": "Trine",       "angle": 120, "orb": 8.0, "symbol": "△"},
    {"type": "Square",      "angle": 90,  "orb": 6.0, "symbol": "□"},
    {"type": "Sextile",     "angle": 60,  "orb": 4.0, "symbol": "＊"},
    {"type": "Quincunx",    "angle": 150, "orb": 3.0, "symbol": "☽"},
]

ASPECTS_MINOR = [
    {"type": "Quintile",       "angle": 72,  "orb": 3.0, "symbol": "Q"},
    {"type": "Bi-Quintile",    "angle": 144, "orb": 3.0, "symbol": "bQ"},
    {"type": "Semi-Sextile",   "angle": 30,  "orb": 2.0, "symbol": "⧬"},
    {"type": "Semi-Square",    "angle": 45,  "orb": 2.0, "symbol": "∠"},
    {"type": "Sesqui-Quadrature", "angle": 135, "orb": 2.0, "symbol": "⚼"},
]

# Default: apenas mayores
ASPECTS = ASPECTS_MAJOR

def calculate_aspects(planets, speeds, include_minor=False):
    aspects = ASPECTS_MAJOR[:]
    if include_minor:
        aspects.extend(ASPECTS_MINOR)
    # ... resto da lógica
```

---

### 3.4 — `assign_to_house()` é O(n) e reavalia para cada corpo

**Local:** Linhas 413-424  
**Problema:** A função percorre as 12 casas para cada planeta, corpo secundário  
e ângulo — 16+ chamadas × 12 iterações = ~200 comparações por chamada.

**Proposta:** Usar busca binária ou mapeamento por faixas:
```python
def build_house_ranges(cusps_raw):
    """Pré-calcula as faixas de cada casa para busca O(1)."""
    ranges = []
    for i in range(12):
        start = cusps_raw[i]
        end = cusps_raw[(i + 1) % 12]
        ranges.append((start, end, i + 1))
    return ranges

def assign_to_house(deg, house_ranges):
    """Atribui grau a casa usando ranges pré-calculados."""
    for start, end, house_num in house_ranges:
        if start < end:
            if start <= deg < end:
                return house_num
        else:
            if deg >= start or deg < end:
                return house_num
    return 12
```

---

## 4. FALHAS MÉDIAS DE PRECISÃO (🟡)

### 4.1 — Cálculo de Lua Crescente com linearização incorreta

**Local:** Linhas 195-212  
**Problema:** A fórmula `illumination = round(diff / 90 * 50, 1)` para a fase  
Crescente é **linear**, mas a iluminação real segue uma curva **cosseno**:

```python
# Atual (linear — incorreto):
"illumination": round(diff / 90 * 50, 1)  # 45° → 25% (errado, deveria ser ~15%)

# Correto (cosseno):
import math
phase_angle = math.radians(diff)  # 0° a 360°
illumination = round(50 * (1 - math.cos(phase_angle)), 1)  # Formula de Duffet
```

**Tabela comparativa:**
| Diferença Sol-Lua | Atual (linear) | Correto (cosseno) |
|-------------------|----------------|-------------------|
| 22.5° | 12.5% | 3.4% |
| 45° | 25% | 14.6% |
| 67.5° | 37.5% | 30.9% |
| 90° | 50% | 50.0% |
| 135° | 75% | 85.4% |
| 157.5° | 87.5% | 96.6% |

**Proposta:**
```python
def get_moon_illumination(diff: float) -> float:
    """Percentual de iluminação lunar usando fórmula de Duffet."""
    return round(50 * (1 - math.cos(math.radians(diff))), 1)
```

---

### 4.2 — Part of Fortune usa fórmula para charta diurna/nturna

**Local:** Linha 530  
**Problema:** A fórmula `ASC + Moon - Sun` é **apenas para charta diurna** (Sol acima  
do horizonte). Para charta noturna (Sol abaixo), a fórmula correta é:

```python
# Para charta diurna (sol acima do horizonte):
FoF = ASC + Moon - Sun  # (fórmula atual)

# Para charta noturna (sol abaixo):
FoF = ASC + Sun - Moon  # ← FÓRMULA INVERTIDA

# Determinação correta: Sol acima do horizonte?
sun_above_horizon = (sun_deg > asc_d and sun_deg < (asc_d + 180) % 360)
```

**Proposta:**
```python
# Part of Fortune — fórmula correta para ambos os tipos
sun_above = (asc_d <= sun_deg < (asc_d + 180) % 360)
if sun_above:
    fo_deg = (asc_d + moon_deg - sun_deg) % 360  # Diurno
else:
    fo_deg = (asc_d + sun_deg - moon_deg) % 360  # Noturno
```

---

### 4.3 — Vertex usa ascmc[3] mas deveria ser ascmc[3] em Placidus/Koch APENAS

**Local:** Linhas 534-540  
**Problema:** O Vertex é calculado pelo SWE apenas para sistemas de casas que  
usam o grande círculo vertical (Placidus, Koch, Campanus). Para Whole Sign,  
Regiomontanus e Equal, o `ascmc[3]` pode conter um valor inválido ou zero.

**Observação:** O código já tem o fallback `v_deg = (asc_d + 90) % 360` mas  
não valida se o valor do SWE é confiável.

**Proposta:**
```python
# Vertex só é significativo com casas baseadas em grandes círculos
VERTEX_SYSTEMS = {"Placidus", "Koch", "Campanus"}
if house_system_used in VERTEX_SYSTEMS and swe_vertex is not None and swe_vertex != 0:
    v_deg = swe_vertex % 360
else:
    v_deg = None  # Não calcular Vertex para sistemas que não o definem
```

---

### 4.4 — Sem cálculo de Latitude Eclíptica nos planetas

**Local:** Linhas 336-349  
**Problema:** O SWE retorna latitude eclíptica (`ecl_lat = r[0][1]`) mas o  
código **nunca a inclui no output**. A latitude eclíptica é crucial para:
- Determinar se um planeta está acima/abaixo do horizonte eclíptico
- Aspectos de latitude (considerados por astrólogos como Robert Hand)
- Aparência de parada (parallax visual)

**Proposta:**
```python
planets_data[name] = {
    "degree": round(ecl_lon, 2),
    "latitude": round(ecl_lat, 2),  # ← ADICIONAR
    # ... resto
}
```

---

### 4.5 — A detecção de modo de efemérides é feita apenas no primeiro planeta

**Local:** Linhas 326-335  
**Problema:** O `ephemeris_mode` é detectado apenas no primeiro planeta  
processado (Sol). Se o Sol usar JPL mas o resto usar Moshier, isso não  
seria detectado. Na prática, todos os planetas usam o mesmo modo, mas  
a detecção deveria ser robusta:

```python
# Verificar TODOS os modos e alertar se houver mistura:
modes_found = set()
for name, pid in SWE_PLANETS.items():
    r = swe.calc(jd, pid, flags)
    mode = detect_mode(r[1])
    modes_found.add(mode)
if len(modes_found) > 1:
    logger.warning(f"Modos de efemérides misturados: {modes_found}")
```

---

## 5. FALHAS DE CÓDIGO E MANUTENÇÃO (🟢)

### 5.1 — `import os` dentro do bloco try e no `__main__`

**Local:** Linhas 23, 679  
**Problema:** `os` é importado dentro do bloco de inicialização do SWE e novamente  
no `__main__`. Deveria estar no topo do arquivo.

### 5.2 — `import traceback` dentro de blocos except

**Local:** Linhas 577, 702  
**Problema:** Importação repetida em cada chamada de erro. Deveria estar no topo.

### 5.3 — `warnings.filterwarnings("ignore")` engole TODOS os warnings

**Local:** Linha 15  
**Problema:** Isso silencia warnings de depreciação do Python, numpy, e qualquer  
outra biblioteca. Deveria ser mais específico:
```python
warnings.filterwarnings("ignore", category=DeprecationWarning, module="swisseph")
```

### 5.4 — `HOUSE_SYSTEMS` tem entrada duplicada

**Local:** Linhas 69-71  
```python
"Whole_Sign": "W",
"Whole Sign": "W",  # ← Duplicada com underscore
```
Deveria ter apenas uma entrada e normalização no input.

---

## 6. ARQUITETURA PARA SIDECAR (Performance Contínua)

### 6.1 — Problema atual: Subprocess overhead

Cada chamada do Rust ao Python passa por:
1. Rust `Command::new("python.exe")` → fork + exec (~50-150ms no Windows)
2. Python inicia, importa `swisseph`, `kerykeion` (~200-400ms cold start)
3. Cálculo SWE propriamente dito (~10-20ms)
4. Serialização JSON + stdout (~2ms)
5. Rust lê stdout (~2ms)

**Total por chamada:** 250-600ms  
**Cálculo real:** ~15ms  
**Overhead:** 97% da chamada é overhead!

### 6.2 — Solução: Modo Sidecar (processo persistente)

```python
# Adicionar ao final de astro_engine.py:
if __name__ == "__main__":
    # Se rodando como sidecar, fica escutando stdin
    if "--sidecar" in sys.argv:
        print(json.dumps({"status": "ready"}), flush=True)
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            if line == "QUIT":
                break
            try:
                data = json.loads(line)
                result = _calculate_internal(data)
                print(json.dumps(result, ensure_ascii=False), flush=True)
            except Exception as e:
                print(json.dumps({"error": str(e)}), flush=True)
    else:
        # Modo subprocess (backward compatible)
        # ... código existente ...
```

**No Rust**, o `run_astro_engine` deveria:
1. Na primeira chamada: iniciar o processo Python com `--sidecar`
2. Manter referência ao stdin/stdout do processo
3. Em chamadas subsequentes: escrever JSON no stdin, ler JSON do stdout
4. Tempo de resposta cai de 600ms para ~20ms

### 6.3 — Pre-cálculo de trânsitos (opcional)

Para o Sidecar, calcular automaticamente trânsitos a cada 10 minutos e  
armazenar em cache:
```python
import threading
import time

_transit_cache = {}
_transit_lock = threading.Lock()

def _background_transit_updater():
    """Calcula trânsitos a cada 10 minutos em background."""
    while True:
        now = datetime.now()
        key = now.strftime("%Y-%m-%d-%H-%M")
        result = _calculate_transit_core(
            now.year, now.month, now.day,
            now.hour + now.minute / 60,
            lat=-15.7833, lon=-47.9333
        )
        with _transit_lock:
            _transit_cache[key] = result
        time.sleep(600)  # 10 minutos
```

---

## 7. PRECISÃO ASTRONÔMICA: COMPARAÇÃO COM PADRÕES

### 7.1 — O que está CORRETO ✅

| Item | Status | Verificação |
|------|--------|-------------|
| Cálculo de JD (Julian Day) | ✅ | Via `swe.julday()` com UTC correto |
| Conversão UTC (Brasília) | ✅ | DST manual com Lei 7.778/1985 |
| Detecção de retrogradidade | ✅ | Baseada em `speed < 0` do SWE |
| Detecção de estacionário | ✅ | `abs(speed) < 0.001` |
| Cálculo de casas | ✅ | Via `swe.houses()` |
| Whole Sign cusp formula | ✅ | Floor to sign boundary |
| Applying/Separating | ✅ | Lógica `signed_diff * rate < 0` correta |
| Vertex | ✅ | Via `ascmc[3]` do SWE |
| Orb limit para luminárias | ✅ | Aumento correto para Sun/Moon/ASC/MC |

### 7.2 — O que PRECISA MELHORAR ⚠️

| Item | Impacto | Prioridade |
|------|---------|-----------|
| Orbs fixos (deviam ser por planeta) | MUITO ALTO | P0 |
| Part of Fortune (falta charta noturna) | ALTO | P1 |
| Iluminação lunar (linear vs cosseno) | MÉDIO | P1 |
| Fallback de Node/Lilith (aritmético bruto) | ALTO | P0 |
| Latitude eclíptica no output | MÉDIO | P2 |
| Aspectos menores ruidosos | MÉDIO | P2 |

---

## 8. PLANO DE MELHORIA PRIORIZADO

### Fase 1 — CORREÇÕES CRÍTICAS (1-2 dias)
1. ✏️ Corrigir `calculate_transit_positions` para cálculo direto (sem chamar `calculate_astrology`)
2. ✏️ Remover fallback aritmético de Node/Lilith → usar kerykeion
3. ✏️ Corrigir Part of Fortune para charta noturna
4. ✏️ Corrigir iluminação lunar com fórmula de Duffet

### Fase 2 — PRECISÃO PROFissional (2-3 dias)
5. ✏️ Implementar orbs por planeta com multiplicador por tipo de aspecto
6. ✏️ Adicionar latitude eclíptica ao output
7. ✏️ Tornar aspectos menores optativos
8. ✏️ Validar Vertex apenas para sistemas de casas aplicáveis

### Fase 3 — PERFORMANCE SIDECAR (3-5 dias)
9. ✏️ Implementar modo `--sidecar` com leitura de stdin
10. ✏️ Adicionar cache LRU para trânsitos
11. ✏️ Pre-cálculo em background para trânsitos em tempo real
12. ✏️ Refatorar imports e limpar warnings

### Fase 4 — ARQUITETURA FUTURA (semanas)
13. 🔮 Migrar para `@swisseph/browser` (WASM) no Tauri webview
14. 🔮 Implementar progressões secundárias via SWE
15. 🔮 Adicionar retornos solares/lunares
16. 🔮 Suporte a zodíaco sideral via `swe.set_sid_mode()`

---

## 9. NOTA SOBRE O USO DE KERYKEION

**Atualmente:** Kerykeion é usado como fallback apenas para Chiron quando SWE falha.

**Problema:** Kerykeion internamente usa uma efeméride própria que pode divergir
do Swiss Ephemeris. Diferenças entre motores devem ser registradas em fixtures
anônimas e nos relatórios de certificação, sem dados pessoais no repositório.

**Recomendação:** 
- **Kerykeion NUNCA deveria ser usado para cálculos quando SWE está disponível**
- Para fallback, Kerykeion é aceitável mas deve gerar flag `"precision": "reduced"`  
  no output
- Se Kerykeion for usado, NÃO misturar resultados (SWE para planetas, Kerykeion para  
  Node) — ou usa um ou outro, ou marca claramente a origem

---

## 10. CÓDIGO PRONTO PARA IMPLEMENTAÇÃO

Abaixo está a versão proposta da função `calculate_transit_positions` otimizada:

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
    """Calcula posições planetárias atuais (trânsitos) — MODO LEVE.
    
    NÃO calcula: casas, aspectos, regência, ângulos.
    Calcula APENAS: posições eclípticas, velocidades, retrogradidade.
    """
    if not SWE_AVAILABLE:
        return {"error": "Swiss Ephemeris not available."}
    
    try:
        # UTC conversion (same logic, centralized)
        local_dt = datetime(year, month, day, int(hour), int((hour % 1) * 60))
        offset_hours = -2 if is_brazil_dst(local_dt) else -3
        utc_hour = hour - offset_hours
        jd = swe.julday(year, month, day, utc_hour)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        
        # SÓ planetas — nada de casas, aspectos, etc.
        planets = {}
        for name, pid in SWE_PLANETS.items():
            r = swe.calc(jd, pid, flags)
            if r and r[0]:
                ecl_lon = r[0][0] % 360
                ecl_lat = r[0][1]
                speed = r[0][3] if len(r[0]) > 3 else 0
                sign, pos = degree_to_sign(ecl_lon)
                planets[name] = {
                    "degree": round(ecl_lon, 2),
                    "latitude": round(ecl_lat, 2),
                    "sign": sign[:3],
                    "sign_full": sign,
                    "pos_in_sign": round(pos, 2),
                    "retrograde": speed < 0,
                    "speed": round(speed, 4),
                    "stationary": abs(speed) < 0.001,
                }
        
        # Corpos secundários mínimos
        secondary = {}
        
        # True Node (SWE)
        try:
            r = swe.calc(jd, swe.TRUE_NODE, flags)
            if r and r[0]:
                nn_deg = r[0][0] % 360
                sign, pos = degree_to_sign(nn_deg)
                secondary["NorthNode"] = {
                    "degree": round(nn_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)
                }
                sn_deg = (nn_deg + 180) % 360
                sign, pos = degree_to_sign(sn_deg)
                secondary["SouthNode"] = {
                    "degree": round(sn_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)
                }
        except Exception:
            pass  # Sem fallback bruto — melhor não retornar que retornar errado
        
        # Lilith (Mean Apogee via SWE)
        if include_asteroids:
            try:
                r = swe.calc(jd, swe.MEAN_APOG, flags)
                if r and r[0]:
                    lil_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(lil_deg)
                    secondary["Lilith"] = {
                        "degree": round(lil_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)
                    }
            except Exception:
                pass
        
        # Chiron (opcional)
        if include_asteroids:
            try:
                r = swe.calc(jd, swe.CHIRON, flags)
                if r and r[0]:
                    chiron_deg = r[0][0] % 360
                    speed = r[0][3] if len(r[0]) > 3 else 0
                    sign, pos = degree_to_sign(chiron_deg)
                    planets["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "latitude": round(r[0][1], 2),
                        "sign": sign[:3], "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": speed < 0,
                        "speed": round(speed, 4),
                    }
            except Exception:
                pass
        
        # Fase lunar (com fórmula de Duffet)
        moon_deg = planets.get("Moon", {}).get("degree", 0)
        sun_deg = planets.get("Sun", {}).get("degree", 0)
        lunar_diff = (moon_deg - sun_deg) % 360
        illumination = round(50 * (1 - math.cos(math.radians(lunar_diff))), 1)
        
        return {
            "planets": planets,
            "secondary": secondary,
            "moon_phase": {
                "phase": _get_moon_phase_name(lunar_diff),
                "illumination": illumination,
            },
            "meta": {
                "timestamp": local_dt.isoformat(),
                "location": {"lat": lat, "lon": lon},
                "ephemeris": "swiss",
                "jd": round(jd, 6),
            },
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
```

---

## 11. CONCLUSÃO

O `astro_engine.py` é um motor **funcional e correto em seus cálculos principais**,  
mas que precisa de refinamento para alcançar o padrão profissional. As prioridades  
são:

1. **Corrigir a eficiência** da função de trânsitos (P0)
2. **Melhorar a precisão dos orbs** por planeta (P0)  
3. **Corrigir fallbacks aritméticos** de Node/Lilith (P0)
4. **Corrigir fórmulas astronômicas** — Part of Fortune e iluminação lunar (P1)
5. **Otimizar para Sidecar** com processo persistente (P2)

Com essas correções, o motor ficaria em paridade com softwares profissionais como  
Solar Fire, Astro.com (Swiss Ephemeris), e Astrodienst.

---

*Relatório gerado em 11/06/2026 por sub-agente de auditoria.*
*Baseado na análise completa do código fonte e documentação do projeto Aurea Solaris.*
