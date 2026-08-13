# Limpeza segura de saídas geradas

Na raiz do repositório, execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\clean-generated.ps1
```

O modo padrão é somente inspeção. Para cada candidato o script imprime:

```text
PATH=<caminho canônico> EXISTS=True|False BYTES=<inteiro> ACTION=REPORT|DELETE
```

Sem `-Apply`, nenhum arquivo é removido (`ACTION=REPORT`).

Para deletar apenas os caminhos permitidos após revisar o relatório:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\clean-generated.ps1 -Apply
```

## Allowlist

Os únicos candidatos possíveis são:

- `dist/`, `build/` e `work/cargo-target-dev/`;
- `src-tauri/target/`;
- diretórios chamados `__pycache__`;
- diretórios chamados `.pytest_cache`.

O script não deriva candidatos de `.gitignore`.

## Proteções

Nunca são candidatos nem podem ser atravessados para descoberta:

- `.aurea-build-venv/`, `src-tauri/binaries/`, `knowledge/`, `natal_charts/`,
  `src-tauri/memory/`, `data/`, `backups/` e `tests/`;
- arquivos com extensões `.sqlite`, `.db`, `.stronghold` e `.vault`.

O script recusa a raiz do repositório, caminhos fora da raiz, symlinks/junctions
como candidatos e reparse points aninhados antes de calcular tamanho ou deletar.

## Validação

```powershell
& .\.aurea-build-venv\Scripts\python.exe -m unittest tests.test_clean_generated
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\clean-generated.ps1
```

Após `-Apply`, `npm run build` deve regenerar `dist/` normalmente.
