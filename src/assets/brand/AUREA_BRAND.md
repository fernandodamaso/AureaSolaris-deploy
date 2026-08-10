# Aurea Solaris — Bíblia Visual e Sistema de Marca
> Este documento é a fonte de verdade para identidade visual, uso dos assets e regras de front-end. Se houver conflito entre este arquivo e implementações espalhadas, prevalece este.

## 1. Essência
**Nome:** Aurea Solaris  
**Descriptor:** Assistente de Engenharia Astrológica

União de: astrologia + precisão + conhecimento + tecnologia + organização pessoal.  
Conceito central: *o símbolo antigo organizado por uma inteligência moderna*.

## 2. Símbolo principal
Símbolo astrológico do Sol (☉): círculo externo, ponto central, raios solares finos, órbitas, eixos e pequenas marcas celestes.  
Pode sugerir discretamente um olho, mas não deve ser desenhado literalmente como um olho.

## 3. Geometria
Elementos permitidos: círculos concêntricos, órbitas, eixos, pontos, estrelas pequenas, losangos, linhas radiais, divisões geométricas, pequenos elementos de cartografia celeste.  
Evitar ornamentos excessivos.

## 4. Paleta
```css
--aurea-bg-deep: #030A11;
--aurea-bg: #06101A;
--aurea-surface: #0B1722;
--aurea-surface-light: #122331;

--aurea-gold-light: #F2D18A;
--aurea-gold: #D9A653;
--aurea-gold-deep: #A96D2D;
--aurea-bronze: #8B572A;

--aurea-text: #F1E9DC;
--aurea-text-muted: #AFA89D;
--aurea-line: #263642;
```

## 5. Tipografia
- **Marca:** Cinzel / Cormorant Garamond / serif editorial.
- **Interface:** Inter, "Noto Sans", sans-serif.

## 6. Variações oficiais
1. `aurea-primary.svg` — vertical completa.
2. `aurea-horizontal.svg` — horizontal com descriptor.
3. `aurea-compact.svg` — símbolo + AUREA SOLARIS.
4. `aurea-symbol.svg` — apenas o astrolábio solar.
5. `aurea-glyph.svg` — glifo ☉ simplificado.
6. Monocromáticas: `aurea-gold.svg`, `aurea-white.svg`, `aurea-black.svg`.

## 7. Assets obrigatórios
Usar apenas arquivos de `src/assets/brand/`. Não recriar a marca por tela.

## 8. Responsividade
- >1000px: logo completa.
- 500–1000px: logo + nome.
- 200–500px: símbolo + AUREA SOLARIS.
- 64–200px: símbolo.
- <64px: glifo ☉.

## 9. Espaço de proteção
Mínimo: 3X ao redor do logotipo. Preferencial: 5X.

## 10. Movimento
Animações lentas e mecânicas. Duração 1.8–2.8s.

## 11. Regra da Lua
Não colocar Lua no Ascendente/esquerda do símbolo na marca essencial.

## 12. Tokens
```css
:root {
  --aurea-bg-deep: #030A11;
  --aurea-bg: #06101A;
  --aurea-surface: #0B1722;
  --aurea-surface-light: #122331;
  --aurea-gold-light: #F2D18A;
  --aurea-gold: #D9A653;
  --aurea-gold-deep: #A96D2D;
  --aurea-bronze: #8B572A;
  --aurea-text: #F1E9DC;
  --aurea-text-muted: #AFA89D;
  --aurea-line: #263642;
}
```
