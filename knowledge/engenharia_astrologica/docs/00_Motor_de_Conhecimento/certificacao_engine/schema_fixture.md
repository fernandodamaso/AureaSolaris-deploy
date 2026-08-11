# Schema de Fixture de Certificação

Cada fixture é um documento JSON que representa uma **evidência de teste** de referência.

A implementação operacional, incluindo este schema, o runner e os relatórios, vive em `tests/engine_reference/`. Este arquivo explica a estrutura para fins de transparência editorial.

## Campos obrigatórios

```json
{
  "id": "string",
  "status": "pending_reference | approved | deprecated",
  "created_at": "ISO-8601",
  "certified_by": "string",

  "source": {
    "name": "string",
    "url": "string | null",
    "capture_date": "ISO-8601",
    "verified_by": "string",
    "role": "referencia_comparativa_calculo"
  },

  "input": {
    "year": 1900,
    "month": 1,
    "day": 1,
    "hour": 0.0,
    "timezone_name": "America/Sao_Paulo",
    "location": {
      "name": "string",
      "lat": 0.0,
      "lon": 0.0
    },
    "house_system": "Regiomontanus",
    "zodiac": "tropical",
    "frame": "geocêntrico | topocêntrico",
    "ayanamsa": null,
    "ephemeris": {
      "library": "pyswisseph",
      "version": "string",
      "mode": "swiss"
    },
    "nodes_lilith_policy": "string",
    "aspect_policy": {
      "include_minor": false,
      "orb_policy": "minimum-body-orb x aspect-multiplier"
    }
  },

  "reference": {
    "planets": {
      "Sun": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Moon": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Mercury": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Venus": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Mars": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Jupiter": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Saturn": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Uranus": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Neptune": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Pluto": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "Chiron": { "longitude": 0.0, "speed": 0.0, "retrograde": false }
    },
    "secondary": {
      "NorthNode": { "longitude": 0.0, "speed": 0.0, "retrograde": false },
      "SouthNode": { "longitude": 0.0 },
      "Lilith": { "longitude": 0.0 | null }
    },
    "houses": [
      { "house": 1, "longitude": 0.0 },
      { "house": 2, "longitude": 0.0 }
    ],
    "angles": {
      "ASC": 0.0,
      "MC": 0.0,
      "DSC": 0.0 | null,
      "IC": 0.0 | null
    },
    "aspects": [
      {
        "p1": "string",
        "p2": "string",
        "type": "string",
        "angle": 0.0,
        "orb": 0.0,
        "applying": true | false | null
      }
    ]
  },

  "tolerances": {
    "longitude": 0.0,
    "speed": 0.0,
    "house_cusp": 0.0,
    "angle": 0.0,
    "aspect_angle": 0.0,
    "editorial_preliminary": {
      "longitude": 0.1,
      "house_cusp": 0.2
    }
  },

  "notes": ["string"]
}
```

## Regras

1. **Nunca inventar dado de referência.** Se a fonte não fornece, usar `null` e documentar em `notes`.
2. **Captura deve ser fiel.** Copiar valores exatos da fonte; não arredondar antecipadamente.
3. **Se houver divergência entre fontes**, criar fixtures separadas com `source.name` diferente e `status: pending_reference`. A certificação trata cada uma como caso distinto.
4. **`ayanamsa` é `null`.** O projeto exclui Jyotisha e zodíaco sideral como padrão; para esta biblioteca, ayanamsa não é uma opção aberta.
5. **`frame` e `nodes_lilith_policy` são obrigatórios.** O certificado precisa saber se a referência é geocêntrica ou topocêntrica, e como trata nodos/Lilith.
6. **`status` inicial é sempre `pending_reference`.** Nenhuma fixture com valores inventados pode ser `approved`.
7. **Referências externas são `referencia_comparativa_calculo`.** Astro.com, Astro-Seek e Solar Fire são referências de cálculo, não fontes de verdade para técnicas ou interpretação.

## Formato do relatório de certificação

Toda certificação comparativa deve gerar um relatório com:

1. Entrada e configuração completas
2. Resultado esperado e obtido
3. Delta numérico
4. Classificação: `pass`, `warning`, `intentional_divergence`, `error`
5. Decisão rastreável: corrigir engine, ajustar regra declarada ou manter divergência intencional
