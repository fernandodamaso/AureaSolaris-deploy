# Limpeza segura de saídas geradas

Na raiz do repositório, execute:

```powershell
python tools/dry_run_cleanup.py
```

O comando é somente relatório (`DRY-RUN ONLY`). Ele lista os caminhos
existentes e a ação planejada (`report only; no deletion`). Não existe opção
`--apply`, e o script não remove, move ou sobrescreve arquivos.

## Allowlist

Os únicos candidatos possíveis são:

- `dist/`, `dist-ssr/` e `build/`;
- `src-tauri/target/` e `src-tauri/errors.txt`;
- `__pycache__/` nos diretórios de código conhecidos: raiz, `tests/`,
  `tools/` e `knowledge/engenharia_astrologica/tools/`.

`node_modules/`, ambientes Python, `work/`, dados privados, fontes editoriais
e qualquer outro caminho não estão na allowlist. O acervo editorial,
incluindo `knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite`,
é sempre reportado como protegido.

Cada caminho é resolvido e aceito apenas quando permanece dentro da raiz do
repositório e de uma entrada explícita da allowlist. Qualquer limpeza
destrutiva futura exige uma tarefa separada, revisão e opt-in explícito; ela
não faz parte deste comando.
