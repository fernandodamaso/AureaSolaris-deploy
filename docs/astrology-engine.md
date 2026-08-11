# Motor Astrológico — Aurea Solaris

## Visão Geral

O motor astrológico é o coração do Aurea Solaris. Ele calcula mapas natais, trânsitos, aspectos, casas e posições planetárias com precisão profissional. Refatorado em 2026-06-11 para máxima performance e precisão.

## Arquitetura

```
Frontend (React)
  → safeInvoke('run_astro_engine', { type: 'natal', ... })
    → Tauri IPC → lib.rs
      → HTTP POST localhost:9876/natal (ou /transit)
        → main_api.py (FastAPI)
          → astro_engine.py (motor)
            → Swiss Ephemeris (precisão)
            → Kerykeion (fallback)
```

## Motor Python (astro_engine.py)

### Dependências
- **swisseph (swe)** — cálculo astronômico de precisão profissional
- **kerykeion** — fallback quando swisseph não está disponível
- **fastapi + uvicorn** — servidor HTTP

### Funções Principais

| Função | Descrição |
|--------|-----------|
| `calculate_natal(data)` | Mapa natal completo: planetas, casas, aspectos |
| `calculate_transits(data)` | Trânsitos atuais vs mapa natal |
| `get_moon_phase(date)` | Fase lunar |
| `get_day_regent(date)` | Regente do dia |
| `get_planetary_hour(date)` | Hora planetária |

### Precisão e Otimizações (Refatoração 2026-06-11)

1. **Cálculo direto de trânsitos** — sem loops de interpolação; cálculo planetário por posição
2. **Orbs dinâmicos por planeta** — cada planeta tem orb próprio, com multiplicadores por tipo de aspecto
3. **Part of Fortune noturno** — fórmula diferente para mapa diurno vs noturno
4. **Iluminação cosseno (Duffet)** — em vez de média aritmética, usa cálculo de iluminação real
5. **LRU cache** — cacheia cálculos repetidos para performance
6. **Pre-calculated house ranges** — busca binária em vez de linear

### Corpo Celeste

O motor calcula posição para:

- ☉ Sol, ☽ Lua, ☿ Mercúrio, ♀ Vênus, ♂ Marte
- ♃ Júpiter, ♄ Saturno, ♅ Urano, ♆ Netuno, ♇ Plutão
- ☊ Nó Lunar, ⊕ Part of Fortune
- ⚸ Quíron

### Sistemas de Casas

Suporta todos os sistemas clássicos:
- Placidus (padrão)
- Koch
- Whole Sign
- Equal House
- Regiomontanus

### Aspectos

| Aspecto | Ângulo | Orb Padrão |
|---------|--------|------------|
| Conjunção | 0° | 8° |
| Sextil | 60° | 6° |
| Quadratura | 90° | 8° |
| Trígono | 120° | 8° |
| Oposição | 180° | 8° |

Orbs são ajustados por planeta (ex: Lua usa orbs maiores, Plutão usa menores).

## Sidecar FastAPI (main_api.py)

### Endpoints

```
GET  /health     → {"status": "ok", "engine": "swisseph", "port": 9876}
POST /natal      → Mapa natal completo
POST /transit    → Trânsitos atuais
```

### Exemplo de Request (natal)

```json
{
  "date": "1990-05-15",
  "time": "14:30",
  "lat": -15.78,
  "lon": -47.93,
  "houses": "placidus"
}
```

### Exemplo de Response

```json
{
  "planets": [
    {"name": "Sun", "sign": "Taurus", "degree": 24.5, "house": 10},
    {"name": "Moon", "sign": "Scorpio", "degree": 12.3, "house": 4}
  ],
  "houses": [...],
  "aspects": [...],
  "mc": {"sign": "Aquarius", "degree": 15.2},
  "asc": {"sign": "Leo", "degree": 8.7}
}
```
